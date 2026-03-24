"""
开放世界PVP和资源抢夺系统
"""
from typing import Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.user import User
from app.models.map_object import MapObject, UserMapProgress
from app.services.reward import reward_service
import random

class WorldPVPManager:
    """世界PVP管理器"""
    
    def __init__(self):
        # 正在进行的挑战
        self.active_challenges: Dict[str, Dict] = {}
    
    def challenge_for_resource(
        self, 
        db: Session, 
        challenger: User, 
        target_user_id: int,
        resource_object_id: int
    ) -> Dict:
        """发起资源抢夺挑战"""
        
        # 获取目标用户
        target = db.query(User).filter(User.id == target_user_id).first()
        if not target:
            return {
                "success": False,
                "message": "目标用户不存在"
            }
        
        # 检查是否是自己
        if challenger.id == target_user_id:
            return {
                "success": False,
                "message": "不能挑战自己"
            }
        
        # 获取资源对象
        resource = db.query(MapObject).filter(MapObject.id == resource_object_id).first()
        if not resource or resource.object_type != "resource":
            return {
                "success": False,
                "message": "无效的资源点"
            }
        
        # 检查冷却时间（防止频繁挑战）
        cooldown_key = f"{challenger.id}_{target_user_id}"
        if cooldown_key in self.active_challenges:
            last_challenge = self.active_challenges[cooldown_key].get("time")
            if last_challenge and datetime.now() - last_challenge < timedelta(minutes=5):
                return {
                    "success": False,
                    "message": "挑战冷却中，请稍后再试"
                }
        
        # 创建挑战
        challenge_id = f"challenge_{challenger.id}_{target_user_id}_{int(datetime.now().timestamp())}"
        
        # 进行战斗计算（基于等级、经验等）
        challenger_power = self._calculate_power(challenger)
        target_power = self._calculate_power(target)
        
        # 添加随机因素（±20%）
        challenger_power *= random.uniform(0.8, 1.2)
        target_power *= random.uniform(0.8, 1.2)
        
        winner = challenger if challenger_power > target_power else target
        loser = target if winner == challenger else challenger
        
        # 计算奖励
        rewards = self._calculate_pvp_rewards(winner, loser, resource)
        
        # 记录挑战
        self.active_challenges[cooldown_key] = {
            "time": datetime.now(),
            "winner_id": winner.id,
            "loser_id": loser.id
        }
        
        # 发放奖励给胜者
        reward_service.grant_rewards(db, winner, rewards)
        
        # 如果挑战者胜利，允许收集资源
        if winner.id == challenger.id:
            # 标记资源为已收集
            progress = db.query(UserMapProgress).filter(
                UserMapProgress.user_id == challenger.id,
                UserMapProgress.map_object_id == resource_object_id
            ).first()
            
            if not progress:
                progress = UserMapProgress(
                    user_id=challenger.id,
                    map_object_id=resource_object_id,
                    status="collected",
                    collected_at=datetime.utcnow()
                )
                db.add(progress)
            else:
                progress.status = "collected"
                progress.collected_at = datetime.utcnow()
            
            db.commit()
        
        return {
            "success": True,
            "message": f"{'🎉 胜利！' if winner.id == challenger.id else '😢 失败了...'}",
            "winner_id": winner.id,
            "winner_name": winner.username,
            "loser_id": loser.id,
            "loser_name": loser.username,
            "rewards": rewards if winner.id == challenger.id else None,
            "challenger_power": int(challenger_power),
            "target_power": int(target_power)
        }
    
    def challenge_player(
        self,
        db: Session,
        challenger: User,
        target_user_id: int
    ) -> Dict:
        """发起玩家对战（纯PK，不涉及资源）"""
        
        # 获取目标用户
        target = db.query(User).filter(User.id == target_user_id).first()
        if not target:
            return {
                "success": False,
                "message": "目标用户不存在"
            }
        
        # 检查是否是自己
        if challenger.id == target_user_id:
            return {
                "success": False,
                "message": "不能挑战自己"
            }
        
        # 等级差距限制（防止高等级欺负低等级）
        level_diff = abs(challenger.level - target.level)
        if level_diff > 5:
            return {
                "success": False,
                "message": f"等级差距过大（{level_diff}级），无法发起挑战"
            }
        
        # 检查冷却
        cooldown_key = f"{challenger.id}_{target_user_id}"
        if cooldown_key in self.active_challenges:
            last_challenge = self.active_challenges[cooldown_key].get("time")
            if last_challenge and datetime.now() - last_challenge < timedelta(minutes=3):
                remaining = 180 - (datetime.now() - last_challenge).seconds
                return {
                    "success": False,
                    "message": f"挑战冷却中，还需等待 {remaining} 秒"
                }
        
        # 战斗计算
        challenger_power = self._calculate_power(challenger)
        target_power = self._calculate_power(target)
        
        # 随机因素
        challenger_power *= random.uniform(0.8, 1.2)
        target_power *= random.uniform(0.8, 1.2)
        
        winner = challenger if challenger_power > target_power else target
        loser = target if winner == challenger else challenger
        
        # PK奖励（较小）
        rewards = {
            "experience": 50 + winner.level * 10,
            "coins": 100 + winner.level * 20
        }
        
        # 失败者扣除少量经验（不低于0）
        loser_penalty = 30 + loser.level * 5
        if loser.experience >= loser_penalty:
            loser.experience -= loser_penalty
        
        # 记录
        self.active_challenges[cooldown_key] = {
            "time": datetime.now(),
            "winner_id": winner.id,
            "loser_id": loser.id
        }
        
        # 发放奖励
        reward_service.grant_rewards(db, winner, rewards)
        db.commit()
        
        return {
            "success": True,
            "message": f"{'🎉 你赢了！' if winner.id == challenger.id else '😢 你输了...'}",
            "winner_id": winner.id,
            "winner_name": winner.username,
            "loser_id": loser.id,
            "loser_name": loser.username,
            "rewards": rewards if winner.id == challenger.id else None,
            "penalty": loser_penalty if winner.id == challenger.id else None,
            "challenger_power": int(challenger_power),
            "target_power": int(target_power)
        }
    
    def _calculate_power(self, user: User) -> float:
        """计算玩家战斗力"""
        # 基础战力 = 等级 * 100 + 经验值 * 0.5
        base_power = user.level * 100 + user.experience * 0.5
        return base_power
    
    def _calculate_pvp_rewards(self, winner: User, loser: User, resource: MapObject) -> Dict:
        """计算PVP奖励"""
        # 基础奖励
        base_exp = 100 + winner.level * 20
        base_coins = 200 + winner.level * 50
        
        # 加上资源点的奖励
        if resource.rewards:
            resource_exp = resource.rewards.get("experience", 0)
            resource_coins = resource.rewards.get("coins", 0)
            base_exp += resource_exp
            base_coins += resource_coins
        
        return {
            "experience": base_exp,
            "coins": base_coins
        }

# 全局实例
world_pvp_manager = WorldPVPManager()








