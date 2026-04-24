"""
开放世界管理器 - 处理地图、位置、实时同步等
"""
import logging
from typing import Any, Dict, List, Optional, Set
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.time import utc_now
from app.models.user_location import UserLocation
from app.models.map_object import MapObject, UserMapProgress
from app.models.user import User
from app.models.pet import Pet
import asyncio

logger = logging.getLogger(__name__)

class WorldManager:
    """世界管理器 - 处理实时世界状态"""
    
    def __init__(self):
        # 在线用户的WebSocket连接
        self.active_connections: Dict[int, any] = {}  # user_id -> websocket
        # 地图区域中的用户
        self.map_areas: Dict[str, Set[int]] = {}  # map_area -> set of user_ids
        
    def get_or_create_location(self, db: Session, user: User) -> UserLocation:
        """获取或创建用户位置"""
        location = db.query(UserLocation).filter(UserLocation.user_id == user.id).first()
        
        if not location:
            location = UserLocation(
                user_id=user.id,
                map_area="新手村",
                x=100.0,
                y=100.0,
                direction="down"
            )
            db.add(location)
            db.commit()
            db.refresh(location)
        
        return location
    
    def update_location(self, db: Session, user: User, x: float, y: float, 
                       direction: Optional[str] = None, map_area: Optional[str] = None) -> UserLocation:
        """更新用户位置"""
        location = self.get_or_create_location(db, user)
        
        old_area = location.map_area
        
        location.x = x
        location.y = y
        location.last_move = utc_now()
        
        if direction:
            location.direction = direction
        
        if map_area and map_area != old_area:
            # 切换地图区域
            location.map_area = map_area
            
            # 更新区域追踪
            if old_area in self.map_areas:
                self.map_areas[old_area].discard(user.id)
            
            if map_area not in self.map_areas:
                self.map_areas[map_area] = set()
            self.map_areas[map_area].add(user.id)
        
        db.commit()
        db.refresh(location)
        
        return location
    
    def _build_pet_snapshot(self, pet: Pet) -> Dict[str, Any]:
        """将宠物模型转换为世界同步所需快照"""
        return {
            "pet_id": pet.id,
            "pet_type": pet.pet_type,
            "pet_name": pet.name,
            "pet_status": pet.status,
            "pet_is_egg": bool(pet.is_egg),
            "pet_evolution_stage": pet.evolution_stage,
            "pet_hatch_progress": pet.hatch_progress,
            "pet_level": pet.level,
        }
    
    def _get_active_pet_snapshot_map(
        self,
        db: Session,
        user_ids: Set[int],
        persist_fallback: bool = False
    ) -> Dict[int, Dict[str, Any]]:
        """
        批量获取用户当前跟随宠物快照：
        1) 优先 users.current_pet_id
        2) 兜底为该用户第一只“非蛋”宠物
        3) 若全是蛋，再回退第一只宠物
        """
        if not user_ids:
            return {}
        
        users = db.query(User).filter(User.id.in_(list(user_ids))).all()
        if not users:
            return {}
        
        user_map = {u.id: u for u in users}
        result: Dict[int, Dict[str, Any]] = {}
        
        # 1) 先按 users.current_pet_id 命中
        selected_pet_ids = {u.current_pet_id for u in users if u.current_pet_id}
        selected_pet_map: Dict[tuple[int, int], Pet] = {}
        if selected_pet_ids:
            selected_pets = db.query(Pet).filter(
                Pet.id.in_(list(selected_pet_ids)),
                Pet.user_id.in_(list(user_ids))
            ).all()
            selected_pet_map = {(p.user_id, p.id): p for p in selected_pets}
        
        for u in users:
            if not u.current_pet_id:
                continue
            matched = selected_pet_map.get((u.id, u.current_pet_id))
            if matched:
                result[u.id] = self._build_pet_snapshot(matched)
        
        # 2) 对未命中的用户，按规则兜底
        unresolved_user_ids = set(user_ids) - set(result.keys())
        if unresolved_user_ids:
            pets = db.query(Pet).filter(
                Pet.user_id.in_(list(unresolved_user_ids))
            ).order_by(Pet.user_id.asc(), Pet.id.asc()).all()
            
            first_pet: Dict[int, Pet] = {}
            first_non_egg_pet: Dict[int, Pet] = {}
            for pet in pets:
                uid = pet.user_id
                if uid not in first_pet:
                    first_pet[uid] = pet
                if uid not in first_non_egg_pet and not bool(pet.is_egg) and pet.pet_type != "egg":
                    first_non_egg_pet[uid] = pet
            
            has_user_update = False
            for uid in unresolved_user_ids:
                fallback_pet = first_non_egg_pet.get(uid) or first_pet.get(uid)
                if not fallback_pet:
                    continue
                result[uid] = self._build_pet_snapshot(fallback_pet)
                
                # 可选：将兜底结果回填为权威 current_pet_id，便于后续稳定同步
                if persist_fallback:
                    user = user_map.get(uid)
                    if user and user.current_pet_id != fallback_pet.id:
                        user.current_pet_id = fallback_pet.id
                        has_user_update = True
            
            if persist_fallback and has_user_update:
                db.commit()
        
        return result
    
    def get_active_pet_snapshot(self, db: Session, user_id: int, persist_fallback: bool = False) -> Optional[Dict[str, Any]]:
        """获取单个用户当前跟随宠物快照"""
        snapshots = self._get_active_pet_snapshot_map(db, {user_id}, persist_fallback=persist_fallback)
        return snapshots.get(user_id)
    
    def set_active_pet_for_user(self, db: Session, user_id: int, pet_id: int) -> Optional[Dict[str, Any]]:
        """设置并返回用户当前跟随宠物（带归属校验）"""
        pet = db.query(Pet).filter(
            Pet.id == pet_id,
            Pet.user_id == user_id
        ).first()
        if not pet:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        if user.current_pet_id != pet_id:
            user.current_pet_id = pet_id
            db.commit()
        
        return self._build_pet_snapshot(pet)
    
    def get_nearby_players(self, db: Session, user_id: int, map_area: str, radius: float = 500.0) -> List[Dict]:
        """获取附近的玩家"""
        # 获取当前用户位置
        current_location = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
        if not current_location:
            return []
        
        # 🔥 优化：放宽时间限制到30分钟，确保能找到更多玩家
        # 同时也查询当前有 WebSocket 连接的玩家
        time_threshold = utc_now() - timedelta(minutes=30)
        
        # 🔥 方案1：基于数据库查询（时间阈值）
        nearby = db.query(UserLocation, User).join(User).filter(
            UserLocation.map_area == map_area,
            UserLocation.user_id != user_id,
            UserLocation.last_move >= time_threshold
        ).all()
        
        result = []
        found_user_ids = set()
        active_connection_user_ids = set(self.active_connections.keys())
        candidate_user_ids = {u.id for _, u in nearby}
        candidate_user_ids.update(uid for uid in active_connection_user_ids if uid != user_id)
        pet_snapshot_map = self._get_active_pet_snapshot_map(db, candidate_user_ids, persist_fallback=False)
        
        for location, user in nearby:
            # 计算距离（放宽距离限制，开放世界地图较大）
            distance = ((location.x - current_location.x) ** 2 + 
                       (location.y - current_location.y) ** 2) ** 0.5
            
            # 🔥 放宽距离限制，或者如果玩家有活跃的 WebSocket 连接则直接包含
            if distance <= radius or user.id in active_connection_user_ids:
                result.append({
                    "user_id": user.id,
                    "username": user.username,
                    "map_area": location.map_area,
                    "x": location.x,
                    "y": location.y,
                    "direction": location.direction,
                    "level": user.level,
                    "rank_title": user.get_rank_title(),
                    **(pet_snapshot_map.get(user.id) or {})
                })
                found_user_ids.add(user.id)
        
        # 🔥 方案2：补充当前有 WebSocket 连接但可能不在数据库查询结果中的玩家
        for connected_user_id in list(self.active_connections.keys()):
            if connected_user_id != user_id and connected_user_id not in found_user_ids:
                # 查询这个用户的信息
                connected_location = db.query(UserLocation, User).join(User).filter(
                    UserLocation.user_id == connected_user_id
                ).first()
                
                if connected_location:
                    loc, usr = connected_location
                    # 只添加同一地图区域的玩家
                    if loc.map_area == map_area:
                        result.append({
                            "user_id": usr.id,
                            "username": usr.username,
                            "map_area": loc.map_area,
                            "x": loc.x,
                            "y": loc.y,
                            "direction": loc.direction,
                            "level": usr.level,
                            "rank_title": usr.get_rank_title(),
                            **(pet_snapshot_map.get(usr.id) or {})
                        })
        
        return result
    
    def get_map_objects(self, db: Session, map_area: str, user_id: Optional[int] = None) -> List[Dict]:
        """获取地图对象（根据用户等级过滤）"""
        # 获取用户等级
        user_level = 1
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user_level = user.level
        
        objects = db.query(MapObject).filter(
            MapObject.map_area == map_area,
            MapObject.is_active == True
        ).all()
        
        result = []
        for obj in objects:
            # 检查等级要求
            if obj.requirements and "level" in obj.requirements:
                required_level = obj.requirements["level"]
                if user_level < required_level:
                    continue  # 跳过等级不够的对象
            
            obj_data = {
                "id": obj.id,
                "map_area": obj.map_area,
                "object_type": obj.object_type,
                "x": obj.x,
                "y": obj.y,
                "title": obj.title,
                "description": obj.description,
                "icon": obj.icon,
                "interaction_type": obj.interaction_type,
                "rewards": obj.rewards,
                "requirements": obj.requirements,
                "is_active": obj.is_active
            }
            
            # 如果提供了用户ID，查询用户进度
            if user_id:
                progress = db.query(UserMapProgress).filter(
                    UserMapProgress.user_id == user_id,
                    UserMapProgress.map_object_id == obj.id
                ).first()
                
                if progress:
                    obj_data["status"] = progress.status
                else:
                    obj_data["status"] = None
            
            result.append(obj_data)
        
        return result
    
    def interact_with_object(self, db: Session, user: User, object_id: int, 
                            action: str, data: Optional[Dict] = None) -> Dict:
        """与地图对象交互"""
        from app.services.reward import reward_service
        
        # 获取地图对象
        map_object = db.query(MapObject).filter(MapObject.id == object_id).first()
        if not map_object or not map_object.is_active:
            return {
                "success": False,
                "message": "该对象不存在或已失效"
            }
        
        # 检查用户是否满足要求
        if map_object.requirements:
            if "level" in map_object.requirements and user.level < map_object.requirements["level"]:
                return {
                    "success": False,
                    "message": f"需要等级 {map_object.requirements['level']}"
                }
        
        # 获取或创建进度记录
        progress = db.query(UserMapProgress).filter(
            UserMapProgress.user_id == user.id,
            UserMapProgress.map_object_id == object_id
        ).first()
        
        if not progress:
            progress = UserMapProgress(
                user_id=user.id,
                map_object_id=object_id,
                status="discovered"
            )
            db.add(progress)
        
        # 检查是否已完成
        if progress.status == "completed":
            return {
                "success": False,
                "message": "你已经完成过这个任务了"
            }
        
        # 根据交互类型处理
        if action == "collect" and map_object.interaction_type == "collect":
            # 收集类型（宝箱、资源等）
            progress.status = "collected"
            progress.collected_at = utc_now()
            
            # 发放奖励
            if map_object.rewards:
                reward_service.grant_rewards(db, user, map_object.rewards)
            
            db.commit()
            
            return {
                "success": True,
                "message": f"成功收集 {map_object.title}！",
                "rewards": map_object.rewards,
                "object_status": "collected"
            }
        
        elif action == "solve" and map_object.interaction_type == "solve":
            # 解谜类型
            if not data or "answer" not in data:
                return {
                    "success": False,
                    "message": "请提供答案"
                }
            
            # 这里简化处理，实际应该验证答案
            # 可以在map_object.requirements中存储正确答案
            correct_answer = map_object.requirements.get("answer", "")
            user_answer = data.get("answer", "")
            
            if user_answer.lower().strip() == correct_answer.lower().strip():
                progress.status = "completed"
                progress.collected_at = utc_now()
                progress.data = {"answer": user_answer}
                
                if map_object.rewards:
                    reward_service.grant_rewards(db, user, map_object.rewards)
                
                db.commit()
                
                return {
                    "success": True,
                    "message": "🎉 解谜成功！",
                    "rewards": map_object.rewards,
                    "object_status": "completed"
                }
            else:
                return {
                    "success": False,
                    "message": "答案不正确，再想想看..."
                }
        
        elif action == "talk" and map_object.interaction_type == "talk":
            # 对话类型（NPC）
            progress.status = "completed"
            progress.collected_at = utc_now()
            
            if map_object.rewards:
                reward_service.grant_rewards(db, user, map_object.rewards)
            
            db.commit()
            
            return {
                "success": True,
                "message": map_object.description or "对话完成",
                "rewards": map_object.rewards,
                "object_status": "completed"
            }
        
        return {
            "success": False,
            "message": "无效的交互类型"
        }
    
    async def broadcast_to_area(self, map_area: str, message: Dict, exclude_user: Optional[int] = None):
        """向地图区域广播消息"""
        if map_area not in self.map_areas:
            return
        
        for user_id in self.map_areas[map_area]:
            if exclude_user and user_id == exclude_user:
                continue
            
            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_json(message)
                except:
                    # 连接失败，移除
                    del self.active_connections[user_id]

# 全局实例
world_manager = WorldManager()






