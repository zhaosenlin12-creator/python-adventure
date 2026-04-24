import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import logging
from app.core.time import utc_now
from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.core.security import decode_access_token
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.map_object import MapObject
from app.schemas.world import (
    UserLocationUpdate, UserLocationResponse, NearbyPlayersResponse,
    MapDataResponse, MapInteraction, InteractionResult,
    ResourceChallenge, ChallengeResult,
    MapRegionResponse, MapRegionListResponse,
    MapChunkResponse, ChunkDataResponse, ExtendedMapDataResponse
)
from app.services.world_manager import world_manager
from app.services.chunk_manager import chunk_manager
from app.services.world_pvp import world_pvp_manager
from app.services.quiz_battle import quiz_battle_manager
from app.schemas.quiz_battle import QuizBattleStart, QuizAnswerSubmit, QuizBattleResponse, QuizBattleStatusResponse
from app.services.ai_battle import ai_battle_manager
from app.schemas.ai_battle import AIBattleStart, AIBattleAnswer, AIBattleResponse, AIRobotListResponse
import json

router = APIRouter()
logger = logging.getLogger(__name__)
IS_PRODUCTION = settings.ENVIRONMENT.lower() == "production"
WORLD_SEND_TIMEOUT_SECONDS = 0.6


def _drop_world_connection(
    user_id: int,
    *,
    websocket: Optional[WebSocket] = None,
    map_area: Optional[str] = None,
) -> None:
    active_socket = world_manager.active_connections.get(user_id)
    if websocket is not None and active_socket is not None and active_socket is not websocket:
        return

    world_manager.active_connections.pop(user_id, None)
    if map_area is not None:
        area_users = world_manager.map_areas.get(map_area)
        if area_users is not None:
            area_users.discard(user_id)
        return

    for area_users in list(world_manager.map_areas.values()):
        area_users.discard(user_id)


async def _send_world_message(
    user_id: int,
    websocket: WebSocket,
    message: dict,
    *,
    map_area: Optional[str] = None,
) -> bool:
    try:
        await asyncio.wait_for(websocket.send_json(message), timeout=WORLD_SEND_TIMEOUT_SECONDS)
        return True
    except WebSocketDisconnect:
        error = "websocket_disconnect"
    except Exception as exc:
        error = exc

    _drop_world_connection(user_id, websocket=websocket, map_area=map_area)
    logger.debug(
        "World send dropped stale connection user_id=%s map_area=%s error=%s",
        user_id,
        map_area or "-",
        error,
    )
    return False


async def _broadcast_world_event(map_area: str, message: dict, exclude_user: Optional[int] = None) -> None:
    recipients = tuple(world_manager.map_areas.get(map_area, ()))
    if not recipients:
        return

    targets: list[tuple[int, WebSocket]] = []
    for target_user_id in recipients:
        if exclude_user and target_user_id == exclude_user:
            continue

        websocket = world_manager.active_connections.get(target_user_id)
        if websocket is None:
            continue

        targets.append((target_user_id, websocket))

    if not targets:
        return

    await asyncio.gather(
        *(
            _send_world_message(target_user_id, websocket, message, map_area=map_area)
            for target_user_id, websocket in targets
        ),
        return_exceptions=True,
    )


# ==================== 🔒 安全：Token验证辅助函数 ====================

def verify_ws_token(token: Optional[str], expected_user_id: int) -> tuple:
    """
    验证WebSocket Token
    返回: (是否验证成功, 用户ID, 错误信息)
    
    🔒 安全策略：
    - 如果提供了token，必须验证通过且user_id匹配
    - 如果没有token，记录警告但允许连接（兼容旧客户端）
    """
    if not token:
        if not IS_PRODUCTION:
            logger.info("World websocket connected without token for user %s", expected_user_id)
        return True, expected_user_id, None
    
    # 验证token
    payload = decode_access_token(token)
    if payload is None:
        return False, None, "Token无效或已过期"
    
    # 获取token中的用户ID
    token_user_id = payload.get("sub")
    if token_user_id is None:
        return False, None, "Token中缺少用户信息"
    
    # 转换为整数
    try:
        token_user_id = int(token_user_id)
    except (ValueError, TypeError):
        return False, None, "Token用户ID格式错误"
    
    # 验证user_id匹配
    if token_user_id != expected_user_id:
        return False, None, f"用户ID不匹配: token={token_user_id}, url={expected_user_id}"
    
    return True, token_user_id, None

@router.get("/location", response_model=UserLocationResponse)
async def get_my_location(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取我的位置"""
    location = world_manager.get_or_create_location(db, current_user)
    
    return UserLocationResponse(
        user_id=current_user.id,
        username=current_user.username,
        map_area=location.map_area,
        x=location.x,
        y=location.y,
        direction=location.direction,
        level=current_user.level,
        rank_title=current_user.get_rank_title()
    )

@router.post("/location", response_model=UserLocationResponse)
async def update_my_location(
    update: UserLocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新我的位置"""
    location = world_manager.update_location(
        db, current_user, 
        update.x, update.y, 
        update.direction, 
        update.map_area
    )
    
    # 广播位置更新给附近玩家
    await _broadcast_world_event(
        location.map_area,
        {
            "type": "player_move",
            "data": {
                "user_id": current_user.id,
                "username": current_user.username,
                "x": location.x,
                "y": location.y,
                "direction": location.direction,
                "level": current_user.level
            }
        },
        exclude_user=current_user.id
    )
    
    return UserLocationResponse(
        user_id=current_user.id,
        username=current_user.username,
        map_area=location.map_area,
        x=location.x,
        y=location.y,
        direction=location.direction,
        level=current_user.level,
        rank_title=current_user.get_rank_title()
    )

@router.get("/nearby", response_model=NearbyPlayersResponse)
async def get_nearby_players(
    map_area: str,
    radius: Optional[float] = 500.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取附近的玩家"""
    players = world_manager.get_nearby_players(db, current_user.id, map_area, radius)
    
    return NearbyPlayersResponse(
        players=[UserLocationResponse(**p) for p in players],
        count=len(players)
    )

@router.get("/map/{map_area}", response_model=MapDataResponse)
async def get_map_data(
    map_area: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取地图数据（对象+玩家）"""
    objects = world_manager.get_map_objects(db, map_area, current_user.id)
    players = world_manager.get_nearby_players(db, current_user.id, map_area)
    
    return MapDataResponse(
        area=map_area,
        objects=objects,
        nearby_players=[UserLocationResponse(**p) for p in players]
    )

@router.get("/regions", response_model=MapRegionListResponse)
async def get_all_regions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取所有可访问的地图区域"""
    # 获取用户已完成的任务ID列表（简化版，实际应该从数据库查询）
    completed_tasks = []  # TODO: 从数据库查询
    
    regions = chunk_manager.get_accessible_regions(
        db, current_user.level, completed_tasks
    )
    
    return MapRegionListResponse(
        regions=[MapRegionResponse.model_validate(r) for r in regions],
        count=len(regions)
    )

@router.get("/regions/{region_name}", response_model=MapRegionResponse)
async def get_region_info(
    region_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取区域信息"""
    region = chunk_manager.get_region_by_name(db, region_name)
    if not region:
        raise HTTPException(status_code=404, detail="区域不存在")
    
    # 检查访问权限
    if current_user.level < region.required_level:
        raise HTTPException(
            status_code=403, 
            detail=f"需要等级 {region.required_level} 才能访问此区域"
        )
    
    return MapRegionResponse.model_validate(region)

@router.get("/chunks/{region_name}", response_model=ChunkDataResponse)
async def get_chunks(
    region_name: str,
    x: float,
    y: float,
    radius: float = 2000.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定位置周围的区块数据"""
    region = chunk_manager.get_region_by_name(db, region_name)
    if not region:
        raise HTTPException(status_code=404, detail="区域不存在")
    
    # 检查访问权限
    if current_user.level < region.required_level:
        raise HTTPException(
            status_code=403,
            detail=f"需要等级 {region.required_level} 才能访问此区域"
        )
    
    # 计算需要加载的区块
    chunk_coords = chunk_manager.get_chunks_in_range(x, y, radius)
    
    chunks = []
    all_objects = []
    object_ids_set = set()
    
    for chunk_x, chunk_y in chunk_coords:
        chunk = chunk_manager.get_or_create_chunk(db, region.id, chunk_x, chunk_y)
        chunks.append(MapChunkResponse.model_validate(chunk))
        
        # 收集对象ID（去重）
        if chunk.object_ids:
            for obj_id in chunk.object_ids:
                if obj_id not in object_ids_set:
                    object_ids_set.add(obj_id)
    
    # 获取所有对象
    if object_ids_set:
        objects = db.query(MapObject).filter(
            MapObject.id.in_(list(object_ids_set)),
            MapObject.map_area == region_name
        ).all()
        
        # 转换为响应格式
        for obj in objects:
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
                "is_active": obj.is_active,
                "status": None
            }
            
            # 查询用户进度
            from app.models.map_object import UserMapProgress
            progress = db.query(UserMapProgress).filter(
                UserMapProgress.user_id == current_user.id,
                UserMapProgress.map_object_id == obj.id
            ).first()
            
            if progress:
                obj_data["status"] = progress.status
            
            all_objects.append(obj_data)
    
    return ChunkDataResponse(
        region_id=region.id,
        region_name=region_name,
        chunks=chunks,
        objects=all_objects
    )

@router.get("/map/{map_area}/extended", response_model=ExtendedMapDataResponse)
async def get_extended_map_data(
    map_area: str,
    x: Optional[float] = None,
    y: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取扩展地图数据（包含区域信息和区块）"""
    region = chunk_manager.get_region_by_name(db, map_area)
    if not region:
        raise HTTPException(status_code=404, detail="区域不存在")
    
    # 获取用户位置
    location = world_manager.get_or_create_location(db, current_user)
    if x is None:
        x = location.x
    if y is None:
        y = location.y
    
    # 获取区块数据
    chunk_coords = chunk_manager.get_chunks_in_range(x, y, 2000.0)
    chunks = []
    object_ids_set = set()
    
    for chunk_x, chunk_y in chunk_coords:
        chunk = chunk_manager.get_or_create_chunk(db, region.id, chunk_x, chunk_y)
        chunks.append(MapChunkResponse.model_validate(chunk))
        if chunk.object_ids:
            object_ids_set.update(chunk.object_ids)
    
    # 获取地图对象
    objects = []
    if object_ids_set:
        map_objects = db.query(MapObject).filter(
            MapObject.id.in_(list(object_ids_set)),
            MapObject.map_area == map_area
        ).all()
        
        for obj in map_objects:
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
                "is_active": obj.is_active,
                "status": None
            }
            
            from app.models.map_object import UserMapProgress
            progress = db.query(UserMapProgress).filter(
                UserMapProgress.user_id == current_user.id,
                UserMapProgress.map_object_id == obj.id
            ).first()
            
            if progress:
                obj_data["status"] = progress.status
            
            objects.append(obj_data)
    
    # 获取附近玩家
    players = world_manager.get_nearby_players(db, current_user.id, map_area)
    
    return ExtendedMapDataResponse(
        region=MapRegionResponse.model_validate(region),
        objects=objects,
        nearby_players=[UserLocationResponse(**p) for p in players],
        chunks=chunks
    )

@router.post("/interact", response_model=InteractionResult)
async def interact_with_object(
    interaction: MapInteraction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """与地图对象交互"""
    result = world_manager.interact_with_object(
        db, current_user, 
        interaction.object_id, 
        interaction.action, 
        interaction.data
    )
    
    return InteractionResult(**result)

@router.post("/challenge/resource", response_model=ChallengeResult)
async def challenge_for_resource(
    challenge: ResourceChallenge,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发起资源抢夺挑战"""
    result = world_pvp_manager.challenge_for_resource(
        db, current_user, 
        challenge.target_user_id, 
        int(challenge.resource_type)  # resource_type实际存储的是object_id
    )
    
    return ChallengeResult(**result)

@router.post("/challenge/player/{target_user_id}", response_model=ChallengeResult)
async def challenge_player(
    target_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发起玩家对战"""
    result = world_pvp_manager.challenge_player(
        db, current_user, target_user_id
    )
    
    return ChallengeResult(**result)

@router.post("/quiz_battle/start", response_model=QuizBattleResponse)
async def start_quiz_battle(
    battle_request: QuizBattleStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发起答题对战"""
    
    target_user = db.query(User).filter(User.id == battle_request.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="目标用户不存在")
    
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能挑战自己")
    
    result = quiz_battle_manager.start_quiz_battle(
        db,
        current_user,
        target_user,
        battle_request.difficulty
    )
    
    return result

@router.post("/quiz_battle/answer", response_model=QuizBattleResponse)
async def submit_quiz_answer(
    answer_data: QuizAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交答题答案"""
    
    result = quiz_battle_manager.submit_answer(
        db,
        current_user.id,
        answer_data.battle_id,
        answer_data.answer
    )
    
    return result

@router.get("/quiz_battle/status", response_model=QuizBattleStatusResponse)
async def get_quiz_battle_status(
    current_user: User = Depends(get_current_user)
):
    """获取当前对战状态"""
    
    status = quiz_battle_manager.get_battle_status(current_user.id)
    
    if not status:
        return QuizBattleStatusResponse()
    
    return status

@router.get("/ai_robots", response_model=AIRobotListResponse)
async def get_ai_robots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取可用的AI机器人列表"""
    
    robots = ai_battle_manager.get_available_robots(db, current_user.level)
    
    return AIRobotListResponse(robots=robots)

@router.post("/ai_battle/start", response_model=AIBattleResponse)
async def start_ai_battle(
    battle_request: AIBattleStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发起与AI机器人的对战"""
    
    result = ai_battle_manager.start_ai_battle(
        db,
        current_user,
        battle_request.robot_id
    )
    
    return result

@router.post("/ai_battle/answer", response_model=AIBattleResponse)
async def submit_ai_battle_answer(
    answer_data: AIBattleAnswer,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交AI对战答案"""
    
    result = ai_battle_manager.submit_ai_battle_answer(
        db,
        current_user.id,
        answer_data.battle_id,
        answer_data.answer
    )
    
    return result

@router.post("/update-location")
async def update_player_location(
    location_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    HTTP API - 更新玩家位置
    🔒 安全增强：添加认证，只能更新自己的位置
    """
    try:
        from app.models.user_location import UserLocation
        
        # 🔒 安全：使用认证用户的ID，忽略请求中的user_id
        user_id = current_user.id
        x = location_data.get("x", 100.0)
        y = location_data.get("y", 100.0)
        map_area = location_data.get("map_area", "开放世界")
        
        # 查找或创建位置记录
        location = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
        
        if location:
            location.x = x
            location.y = y
            location.map_area = map_area
            location.last_move = utc_now()
        else:
            location = UserLocation(
                user_id=user_id,
                x=x,
                y=y,
                map_area=map_area,
                last_move=utc_now()
            )
            db.add(location)
        
        db.commit()
        
        return {"success": True, "message": "位置已更新"}
    except Exception as e:
        logger.error("World location update failed for user %s: %s", current_user.id, e)
        db.rollback()
        return {"success": False, "message": str(e)}

@router.get("/nearby-players/{user_id}")
async def get_nearby_players_http(
    user_id: int,
    map_area: str = "开放世界",
    radius: float = 2000.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    HTTP API - 获取附近玩家列表（WebSocket后备方案）
    🔒 安全增强：添加认证，只能查询自己的附近玩家
    """
    # 🔒 安全：验证只能查询自己的附近玩家
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能查询自己的附近玩家")
    
    try:
        nearby = world_manager.get_nearby_players(db, user_id, map_area, radius)
        # 🔥 减少日志输出
        # print(f"获取附近玩家: user_id={user_id}, map_area={map_area}, 找到{len(nearby)}个玩家")
        return {
            "players": nearby,
            "count": len(nearby)
        }
    except Exception as e:
        logger.error("Nearby player lookup failed for user %s: %s", user_id, e)
        return {
            "players": [],
            "count": 0
        }

# WebSocket端点 - 实时位置同步
@router.websocket("/ws/{user_id}")
async def websocket_world(
    websocket: WebSocket, 
    user_id: int,
    token: Optional[str] = Query(None, description="JWT认证Token")
):
    """
    WebSocket - 实时世界同步
    🔒 安全增强：支持Token验证
    
    连接URL格式：
    - 带Token: /ws/{user_id}?token=xxx
    - 无Token: /ws/{user_id} (兼容旧客户端，但会记录警告)
    """
    # 🔒 验证Token
    is_valid, verified_user_id, error_msg = verify_ws_token(token, user_id)
    
    if not is_valid:
        logger.warning("World websocket rejected for user %s: %s", user_id, error_msg)
        await websocket.close(code=4001, reason=error_msg or "认证失败")
        return
    
    try:
        await websocket.accept()
    except Exception as e:
        logger.error("World websocket accept failed for user %s: %s", user_id, e)
        return
    
    # 创建独立的数据库会话
    db = SessionLocal()
    
    # 注册连接
    world_manager.active_connections[user_id] = websocket
    
    location = None
    
    try:
        # 获取用户位置
        from app.models.user_location import UserLocation
        from app.models.user import User
        
        location = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        active_pet_snapshot = world_manager.get_active_pet_snapshot(db, user_id, persist_fallback=True) or {}
        
        if not location:
            # 如果没有位置记录，创建一个（使用"开放世界"作为默认区域）
            location = UserLocation(
                user_id=user_id,
                map_area="开放世界",
                x=100.0,
                y=100.0
            )
            db.add(location)
            db.commit()
            db.refresh(location)
        else:
            # 🔥 确保位置记录的 map_area 与当前区域一致
            # 并更新 last_move 时间，确保玩家被视为"活跃"
            if location.map_area != "开放世界":
                location.map_area = "开放世界"
            location.last_move = utc_now()
            db.commit()
            db.refresh(location)
        
        if location:
            # 加入地图区域
            if location.map_area not in world_manager.map_areas:
                world_manager.map_areas[location.map_area] = set()
            world_manager.map_areas[location.map_area].add(user_id)
            
            # 通知其他玩家有新玩家进入
            await _broadcast_world_event(
                location.map_area,
                {
                    "type": "player_join",
                    "data": {
                        "user_id": user_id,
                        "username": user.username if user else f"User{user_id}",
                        "x": location.x,
                        "y": location.y,
                        "level": user.level if user else 1,
                        "rank_title": user.get_rank_title() if user else "新手",
                        **active_pet_snapshot
                    }
                },
                exclude_user=user_id
            )
        
        # 接收并处理消息
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                logger.debug("World websocket ignored invalid JSON for user %s", user_id)
                continue
            
            # 根据消息类型处理
            msg_type = message.get("type")
            
            # 🔥 处理心跳ping
            if msg_type == "ping":
                pong_sent = await _send_world_message(
                    user_id,
                    websocket,
                    {
                        "type": "pong",
                        "timestamp": datetime.now().timestamp() if 'datetime' in dir() else 0,
                    },
                    map_area=location.map_area if location else None,
                )
                if not pong_sent:
                    break
                continue
            
            if msg_type in ("move", "pet_change"):
                move_data = dict(message.get("data") or {})
                target_map_area = message.get("map_area", location.map_area if location else "开放世界")
                
                # 更新内存中的位置快照（不强制每帧落库）
                if location:
                    if target_map_area and target_map_area != location.map_area:
                        old_area = location.map_area
                        location.map_area = target_map_area
                        if old_area in world_manager.map_areas:
                            world_manager.map_areas[old_area].discard(user_id)
                        if target_map_area not in world_manager.map_areas:
                            world_manager.map_areas[target_map_area] = set()
                        world_manager.map_areas[target_map_area].add(user_id)
                    
                    if isinstance(move_data.get("x"), (int, float)):
                        location.x = float(move_data["x"])
                    if isinstance(move_data.get("y"), (int, float)):
                        location.y = float(move_data["y"])
                    if isinstance(move_data.get("direction"), str) and move_data["direction"]:
                        location.direction = move_data["direction"]
                    location.last_move = utc_now()
                
                # 若客户端显式上报 pet_id，则先做归属校验再更新权威 current_pet_id
                selected_pet_id_raw = move_data.get("pet_id")
                selected_pet_id = None
                if selected_pet_id_raw is not None:
                    try:
                        selected_pet_id = int(selected_pet_id_raw)
                    except (TypeError, ValueError):
                        selected_pet_id = None
                
                if selected_pet_id and active_pet_snapshot.get("pet_id") != selected_pet_id:
                    validated_snapshot = world_manager.set_active_pet_for_user(db, user_id, selected_pet_id)
                    if validated_snapshot:
                        active_pet_snapshot = validated_snapshot
                elif not active_pet_snapshot:
                    active_pet_snapshot = world_manager.get_active_pet_snapshot(db, user_id, persist_fallback=True) or {}
                
                # 🔒 防止伪造身份字段 + 合并服务端权威宠物快照
                move_data["user_id"] = user_id
                if user:
                    move_data.setdefault("username", user.username)
                    move_data.setdefault("level", user.level)
                    move_data.setdefault("rank_title", user.get_rank_title())
                if location:
                    move_data.setdefault("x", location.x)
                    move_data.setdefault("y", location.y)
                    move_data.setdefault("direction", location.direction)
                move_data.update(active_pet_snapshot)
                
                await _broadcast_world_event(
                    target_map_area,
                    {
                        "type": "player_move",
                        "data": move_data
                    },
                    exclude_user=user_id
                )
            elif msg_type == "request_players":
                # 请求当前在线玩家列表
                map_area = message.get("map_area", "开放世界")
                nearby = world_manager.get_nearby_players(db, user_id, map_area, radius=5000.0)
                players_sent = await _send_world_message(
                    user_id,
                    websocket,
                    {
                        "type": "players_list",
                        "data": {
                            "players": nearby
                        }
                    },
                    map_area=location.map_area if location else None,
                )
                if not players_sent:
                    break
            
    except WebSocketDisconnect:
        pass  # 正常断开，无需日志
    except Exception as e:
        logger.error("World websocket runtime error for user %s: %s", user_id, e)
    finally:
        _drop_world_connection(user_id, websocket=websocket)

        # 通知其他玩家
        if location:
            try:
                await _broadcast_world_event(
                    location.map_area,
                    {
                        "type": "player_leave",
                        "data": {"user_id": user_id}
                    },
                    exclude_user=user_id
                )
            except:
                pass
        
        db.close()
