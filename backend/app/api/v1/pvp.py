"""
PVP 三轮制对战系统 API 和 WebSocket
Requirements: 1.1, 1.2, 5.5, 7.1, 7.2
🔒 安全增强：WebSocket Token验证
🪙 金币系统集成
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime
import json
import asyncio

from app.core.database import get_db, SessionLocal
from app.core.security import decode_access_token
from app.models.user import User
from app.services.coin_service import CoinService, CoinRewardCalculator
from app.utils.transaction_id import generate_pvp_transaction_id

router = APIRouter()

# 🔥 添加异步锁，防止并发问题
room_lock = asyncio.Lock()


# ==================== 🔒 安全：Token验证辅助函数 ====================

def verify_ws_token(token: Optional[str], expected_user_id: int) -> tuple[bool, Optional[int], Optional[str]]:
    """
    验证WebSocket Token
    返回: (是否验证成功, 用户ID, 错误信息)
    
    🔒 安全策略：
    - 如果提供了token，必须验证通过且user_id匹配
    - 如果没有token，记录警告但允许连接（兼容旧客户端）
    """
    if not token:
        # 没有token - 开发环境或旧客户端，允许但记录警告
        print(f"[PVP WS] ⚠️ 警告：用户 {expected_user_id} 未提供Token连接")
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

# ==================== 房间管理 ====================

class PvpRoom:
    """PVP 房间"""
    def __init__(self, room_id: str, host_id: int, host_name: str):
        self.id = room_id
        self.host_id = host_id
        self.host_name = host_name
        self.guest_id: Optional[int] = None
        self.guest_name: Optional[str] = None
        self.status = "waiting"  # waiting, ready, in_progress, finished
        self.created_at = datetime.now()
        self.finished_at: Optional[datetime] = None  # 🔧 新增：游戏结束时间
        self.current_round = 0  # 0=未开始, 1=对战, 2=答题, 3=编程
        self.scores = {
            "battle": {"host": 0, "guest": 0},
            "quiz": {"host": 0, "guest": 0},
            "coding": {"host": 0, "guest": 0},
        }
        self.host_ready = False
        self.guest_ready = False
        # 🤖 AI接管方案：断线玩家由AI接管
        self.ai_controlled: Optional[str] = None  # 'host' | 'guest' | None - 哪个玩家被AI接管
        self.disconnected_player_id: Optional[int] = None  # 断线玩家的ID（用于阻止重连）

# 活跃房间 {room_id: PvpRoom}
active_rooms: Dict[str, PvpRoom] = {}

# WebSocket 连接 {room_id:user_id: websocket}
ws_connections: Dict[str, WebSocket] = {}

# 🔒 安全：房间创建速率限制 {user_id: [创建时间列表]}
room_creation_history: Dict[int, List[datetime]] = {}
RATE_LIMIT_WINDOW_SECONDS = 60  # 速率限制窗口：60秒
RATE_LIMIT_MAX_ROOMS = 3  # 窗口内最多创建3个房间
ROOM_CLEANUP_AFTER_FINISH_SECONDS = 10  # 🔧 游戏结束后10秒自动清理房间


# ==================== 🔧 房间清理辅助函数 ====================

def cleanup_finished_rooms():
    """
    清理已结束的房间
    🔧 优化：游戏结束后自动清理，让玩家可以立即创建新房间
    """
    now = datetime.now()
    to_delete = []
    
    for rid, room in active_rooms.items():
        # 清理超过30分钟的房间
        if (now - room.created_at).seconds > 1800:
            to_delete.append(rid)
            continue
        
        # 🔧 清理已结束且超过10秒的房间
        if room.status == "finished" and room.finished_at:
            if (now - room.finished_at).seconds > ROOM_CLEANUP_AFTER_FINISH_SECONDS:
                to_delete.append(rid)
                continue
    
    for rid in to_delete:
        if rid in active_rooms:
            del active_rooms[rid]
    
    return len(to_delete)


def get_user_active_room(user_id: int) -> Optional[tuple]:
    """
    获取用户当前活跃的房间
    🤖 AI接管方案：断线玩家不再返回房间信息
    返回: (room_id, room, role) 或 None
    role: 'host' | 'guest'
    """
    cleanup_finished_rooms()  # 先清理已结束的房间
    
    for rid, room in active_rooms.items():
        # 跳过已结束的房间
        if room.status == "finished":
            continue
        
        # 🤖 如果该玩家已被AI接管（断线），不返回房间信息
        if room.disconnected_player_id == user_id:
            continue
        
        if room.host_id == user_id:
            return (rid, room, 'host')
        if room.guest_id == user_id:
            return (rid, room, 'guest')
    
    return None

# ==================== REST API ====================

@router.get("/rooms")
async def get_available_rooms():
    """获取可加入的房间列表"""
    # 🔧 优化：使用统一的清理函数
    cleanup_finished_rooms()
    
    rooms = []
    for room_id, room in active_rooms.items():
        if room.status == "waiting":
            rooms.append({
                "id": room.id,
                "host_name": room.host_name,
                "created_at": room.created_at.isoformat(),
            })
    return {"rooms": rooms}

@router.post("/rooms/create")
async def create_room(user_id: int, username: str):
    """创建新房间"""
    import random
    import string
    
    # 🔒 安全：速率限制检查
    now = datetime.now()
    if user_id in room_creation_history:
        # 清理过期记录
        room_creation_history[user_id] = [
            t for t in room_creation_history[user_id]
            if (now - t).seconds < RATE_LIMIT_WINDOW_SECONDS
        ]
        # 检查是否超过限制
        if len(room_creation_history[user_id]) >= RATE_LIMIT_MAX_ROOMS:
            return {
                "success": False,
                "room_id": None,
                "message": f"创建房间过于频繁，请{RATE_LIMIT_WINDOW_SECONDS}秒后再试"
            }
    else:
        room_creation_history[user_id] = []
    
    # 🔥 使用锁防止并发创建冲突
    async with room_lock:
        # 🔧 优化：使用辅助函数检查用户是否在活跃房间中
        active_room = get_user_active_room(user_id)
        if active_room:
            rid, room, role = active_room
            # 🔧 友好提示：告知用户当前房间状态
            status_msg = {
                "waiting": "等待对手加入",
                "ready": "等待开始",
                "in_progress": "对战进行中"
            }.get(room.status, room.status)
            
            return {
                "success": False,
                "room_id": rid,
                "message": f"您已在房间 {rid} 中（{status_msg}），请先离开当前房间"
            }
        
        # 生成 6 位房间 ID
        room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # 确保唯一性
        attempts = 0
        while room_id in active_rooms and attempts < 10:
            room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            attempts += 1
        
        room = PvpRoom(room_id, user_id, username)
        active_rooms[room_id] = room
        
        # 🔒 安全：记录创建时间用于速率限制
        room_creation_history[user_id].append(datetime.now())
    
    return {
        "success": True,
        "room_id": room_id,
        "message": f"房间 {room_id} 创建成功"
    }

@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, user_id: int, username: str):
    """加入房间"""
    # 🔥 减少日志输出，提高性能
    # print(f"[PVP API] 加入房间: room_id={room_id}, user_id={user_id}")
    
    # 🔥 验证 user_id 必须大于 0
    if user_id <= 0:
        raise HTTPException(status_code=400, detail=f"无效的用户ID: {user_id}")
    
    # 🔥 使用锁防止并发加入冲突
    async with room_lock:
        if room_id not in active_rooms:
            raise HTTPException(status_code=404, detail="房间不存在")
        
        room = active_rooms[room_id]
        
        if room.status != "waiting":
            raise HTTPException(status_code=400, detail="房间不可加入")
        
        if room.guest_id is not None:
            raise HTTPException(status_code=400, detail="房间已满")
        
        if room.host_id == user_id:
            raise HTTPException(status_code=400, detail="不能加入自己的房间")
        
        room.guest_id = user_id
        room.guest_name = username
        room.status = "ready"
    
    # 🔥 减少日志输出
    
    # 通知房主（使用 payload 包装，与前端期望格式一致）
    await broadcast_to_room(room_id, {
        "type": "player_joined",
        "payload": {
            "user_id": user_id,
            "username": username
        }
    })
    
    return {
        "success": True,
        "message": f"成功加入房间 {room_id}",
        "host_id": room.host_id,
        "host_name": room.host_name
    }

@router.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, user_id: int):
    """离开房间"""
    if room_id not in active_rooms:
        return {"success": True, "message": "房间已不存在"}
    
    room = active_rooms[room_id]
    
    if room.host_id == user_id:
        # 房主离开，解散房间
        await broadcast_to_room(room_id, {
            "type": "room_closed",
            "reason": "房主离开"
        })
        del active_rooms[room_id]
    elif room.guest_id == user_id:
        # 客人离开
        room.guest_id = None
        room.guest_name = None
        room.status = "waiting"
        room.guest_ready = False
        
        await broadcast_to_room(room_id, {
            "type": "player_left",
            "user_id": user_id
        })
    
    return {"success": True, "message": "已离开房间"}

@router.get("/rooms/{room_id}")
async def get_room_info(room_id: str):
    """获取房间信息"""
    if room_id not in active_rooms:
        raise HTTPException(status_code=404, detail="房间不存在")
    
    room = active_rooms[room_id]
    
    return {
        "id": room.id,
        "host_id": room.host_id,
        "host_name": room.host_name,
        "guest_id": room.guest_id,
        "guest_name": room.guest_name,
        "status": room.status,
        "current_round": room.current_round,
        "scores": room.scores,
        "host_ready": room.host_ready,
        "guest_ready": room.guest_ready,
    }


@router.post("/rooms/{room_id}/finish")
async def finish_room(room_id: str, user_id: int, db: Session = Depends(get_db)):
    """
    🔧 结束房间 - 游戏结束后调用
    🪙 发放PVP金币奖励
    将房间标记为已结束，10秒后自动清理
    """
    if room_id not in active_rooms:
        return {"success": True, "message": "房间已不存在"}
    
    room = active_rooms[room_id]
    
    # 验证用户是房间成员
    if room.host_id != user_id and room.guest_id != user_id:
        return {"success": False, "message": "您不是该房间的成员"}
    
    # 标记房间为已结束
    room.status = "finished"
    room.finished_at = datetime.now()
    
    # 通知双方房间已结束
    await broadcast_to_room(room_id, {
        "type": "room_finished",
        "message": "对战已结束，房间将在10秒后关闭"
    })
    
    return {
        "success": True,
        "message": "房间已标记为结束，将在10秒后自动清理"
    }


@router.post("/battle/complete")
async def complete_pvp_battle(
    user_id: int,
    room_id: str,
    is_winner: bool,
    exp_gained: int = 0,
    score_gained: int = 0,
    win_streak: int = 0,
    db: Session = Depends(get_db)
):
    """
    🪙 PVP对战完成 - 发放金币奖励
    
    Args:
        user_id: 用户ID
        room_id: 房间ID
        is_winner: 是否胜利
        exp_gained: 获得的经验值
        score_gained: 获得的积分
        win_streak: 连胜次数
    
    Returns:
        金币奖励信息
    """
    try:
        # 验证用户存在
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "success": False,
                "message": "用户不存在",
                "coins_earned": 0,
                "coin_awarded": False
            }
        
        # 🪙 计算金币奖励
        coins_earned = CoinRewardCalculator.calculate_pvp_reward(
            is_win=is_winner,
            exp_gained=exp_gained,
            score_gained=score_gained,
            win_streak=win_streak
        )
        
        # 🪙 生成transaction_id防重复
        transaction_id = generate_pvp_transaction_id(user_id, room_id)
        
        # 🪙 发放金币
        coin_awarded = False
        if coins_earned > 0:
            coin_awarded = CoinService.add_coins(
                db=db,
                user_id=user_id,
                amount=coins_earned,
                type='reward',
                source='pvp_complete',
                description=f'PVP对战: {room_id} ({"胜利" if is_winner else "失败"})',
                transaction_id=transaction_id
            )
        
        db.commit()
        
        return {
            "success": True,
            "coins_earned": coins_earned,
            "coin_awarded": coin_awarded,
            "message": "PVP对战完成" if coin_awarded else "金币已发放过"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[PVP] 发放金币错误: {e}")
        return {
            "success": False,
            "message": str(e),
            "coins_earned": 0,
            "coin_awarded": False
        }


@router.get("/stats/{user_id}")
async def get_pvp_stats(user_id: int, db: Session = Depends(get_db)):
    """获取玩家 PVP 战绩"""
    # TODO: 从数据库获取战绩
    return {
        "user_id": user_id,
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "total_matches": 0,
        "win_rate": 0.0
    }


@router.get("/my-room/{user_id}")
async def get_my_room(user_id: int):
    """
    🤖 获取用户当前所在的房间
    AI接管方案：断线后不返回房间信息，玩家可以直接创建新房间
    """
    cleanup_finished_rooms()
    
    active_room = get_user_active_room(user_id)
    
    if not active_room:
        return {
            "has_room": False,
            "room": None,
            "message": "您当前没有进行中的对战"
        }
    
    rid, room, role = active_room
    
    return {
        "has_room": True,
        "room": {
            "id": room.id,
            "status": room.status,
            "current_round": room.current_round,
            "host_id": room.host_id,
            "host_name": room.host_name,
            "guest_id": room.guest_id,
            "guest_name": room.guest_name,
            "scores": room.scores,
            "role": role,
            "ai_controlled": room.ai_controlled,  # 🤖 告知前端是否有AI接管
        },
        "message": f"您在房间 {rid} 中，状态: {room.status}"
    }


@router.post("/rooms/{room_id}/forfeit")
async def forfeit_room(room_id: str, user_id: int):
    """
    🤖 放弃对战 - 主动认输
    玩家可以选择放弃当前对战，对方获胜
    """
    if room_id not in active_rooms:
        return {"success": True, "message": "房间已不存在"}
    
    room = active_rooms[room_id]
    
    # 验证用户是房间成员
    if room.host_id != user_id and room.guest_id != user_id:
        return {"success": False, "message": "您不是该房间的成员"}
    
    # 确定胜者
    is_host = room.host_id == user_id
    winner_id = room.guest_id if is_host else room.host_id
    winner_name = room.guest_name if is_host else room.host_name
    loser_name = room.host_name if is_host else room.guest_name
    
    # 标记房间为已结束
    room.status = "finished"
    room.finished_at = datetime.now()
    
    # 通知双方
    await broadcast_to_room(room_id, {
        "type": "player_forfeit",
        "user_id": user_id,
        "winner_id": winner_id,
        "winner_name": winner_name,
        "message": f"{loser_name} 放弃了对战，{winner_name} 获胜！"
    })
    
    return {
        "success": True,
        "message": "您已放弃对战",
        "winner_id": winner_id
    }

# ==================== WebSocket ====================

@router.websocket("/ws/{room_id}/{user_id}")
async def pvp_websocket(
    websocket: WebSocket, 
    room_id: str, 
    user_id: int,
    token: Optional[str] = Query(None, description="JWT认证Token")
):
    """
    PVP 三轮制对战 WebSocket
    🔒 安全增强：支持Token验证
    
    连接URL格式：
    - 带Token: /ws/{room_id}/{user_id}?token=xxx
    - 无Token: /ws/{room_id}/{user_id} (兼容旧客户端，但会记录警告)
    """
    # 🔒 验证Token
    is_valid, verified_user_id, error_msg = verify_ws_token(token, user_id)
    
    if not is_valid:
        # Token验证失败，拒绝连接
        print(f"[PVP WS] 🔒 拒绝连接: room={room_id}, user={user_id}, 原因={error_msg}")
        await websocket.close(code=4001, reason=error_msg or "认证失败")
        return
    
    await websocket.accept()
    connection_key = f"{room_id}:{user_id}"
    
    # 🤖 AI接管方案：检查是否是被AI接管的断线玩家尝试重连
    if room_id in active_rooms:
        room = active_rooms[room_id]
        if room.disconnected_player_id == user_id:
            # 断线玩家不能重连，直接关闭连接
            print(f"[PVP WS] 🚫 拒绝断线玩家重连: room={room_id}, user={user_id}")
            await websocket.send_json({
                "type": "reconnect_rejected",
                "reason": "您已断线，本局对战由AI接管。请创建新房间开始新对战。",
                "can_create_new": True
            })
            await websocket.close(code=4002, reason="断线玩家不能重连")
            return
    
    ws_connections[connection_key] = websocket
    
    # 🔥 减少日志输出，提高性能
    # print(f"[PVP WS] 用户 {user_id} 连接到房间 {room_id}")
    
    # 🔥 检查房间信息，判断是房主还是客人
    is_host = False
    is_guest = False
    if room_id in active_rooms:
        room = active_rooms[room_id]
        is_host = (room.host_id == user_id)
        is_guest = (room.guest_id is not None and room.guest_id == user_id)
    
    try:
        # 发送连接确认
        await websocket.send_json({
            "type": "connected",
            "room_id": room_id,
            "user_id": user_id,
            "is_host": is_host,
            "is_guest": is_guest,
            "timestamp": datetime.now().timestamp()
        })
        
        # 🔥 如果是客人连接，通知房主
        if is_guest and room_id in active_rooms:
            await broadcast_to_room(room_id, {
                "type": "guest_ws_connected",
                "user_id": user_id,
            }, exclude_user=user_id)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            # 🔥 减少日志输出，只记录关键事件
            
            if msg_type == "ping":
                # 心跳响应
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().timestamp()
                })
            
            elif msg_type == "player_ready":
                await handle_player_ready(room_id, user_id)
            
            elif msg_type == "player_state":
                # 转发玩家状态（第一轮对战）
                # 前端发送的 payload 直接转发，保持字段名一致
                await broadcast_to_room(room_id, {
                    "type": "player_state",
                    "user_id": user_id,
                    "payload": message.get("payload", {})
                }, exclude_user=user_id)
            
            elif msg_type == "player_damage":
                # 转发伤害消息给对方
                await broadcast_to_room(room_id, {
                    "type": "player_damage",
                    "user_id": user_id,
                    "payload": message.get("payload", {})
                }, exclude_user=user_id)
            
            elif msg_type == "projectile":
                # 转发投射物消息给对方（显示对方的技能）
                await broadcast_to_room(room_id, {
                    "type": "projectile",
                    "user_id": user_id,
                    "payload": message.get("payload", {})
                }, exclude_user=user_id)
            
            elif msg_type == "round_end":
                # 🔥 转发轮次结束消息给对方（同步进入下一轮）
                await broadcast_to_room(room_id, {
                    "type": "round_end",
                    "user_id": user_id,
                    "payload": message.get("payload", {})
                }, exclude_user=user_id)
            
            elif msg_type == "quiz_answer":
                # 答题提交
                await handle_quiz_answer(room_id, user_id, message)
            
            elif msg_type == "code_submit":
                # 代码提交
                await handle_code_submit(room_id, user_id, message)
            
            elif msg_type == "round_score":
                # 轮次分数更新
                await handle_round_score(room_id, user_id, message)
            
            elif msg_type == "game_end":
                # 🔧 游戏结束 - 自动关闭房间
                await handle_game_end(room_id, user_id, message)
    
    except WebSocketDisconnect:
        # 正常断开
        if connection_key in ws_connections:
            del ws_connections[connection_key]
        
        # 🤖 AI接管方案：断线立即AI接管，断线玩家判负
        if room_id in active_rooms:
            room = active_rooms[room_id]
            now = datetime.now()
            
            is_host = room.host_id == user_id
            is_guest = room.guest_id == user_id
            
            # 🤖 如果房间在进行中，立即AI接管断线玩家
            if room.status == "in_progress" and (is_host or is_guest):
                disconnected_role = 'host' if is_host else 'guest'
                room.ai_controlled = disconnected_role
                room.disconnected_player_id = user_id
                
                # 确定在线玩家信息
                online_player_id = room.guest_id if is_host else room.host_id
                online_player_name = room.guest_name if is_host else room.host_name
                disconnected_name = room.host_name if is_host else room.guest_name
                
                print(f"[PVP] 🤖 房间 {room_id}: {disconnected_name} 断线，AI接管继续对战")
                
                # 通知在线玩家：对方断线，AI接管
                await broadcast_to_room(room_id, {
                    "type": "player_replaced_by_ai",
                    "disconnected_user_id": user_id,
                    "disconnected_role": disconnected_role,
                    "disconnected_name": disconnected_name,
                    "message": f"{disconnected_name} 已断线，AI接管继续对战"
                }, exclude_user=user_id)
            
            elif room.status == "waiting":
                # 等待中房主断线，直接关闭房间
                if is_host:
                    del active_rooms[room_id]
            
            elif room.status == "ready":
                # 准备中有人断线，通知对方并重置房间状态
                if is_guest:
                    room.guest_id = None
                    room.guest_name = None
                    room.status = "waiting"
                    room.guest_ready = False
                    await broadcast_to_room(room_id, {
                        "type": "player_left",
                        "user_id": user_id,
                        "message": "对方已离开房间"
                    }, exclude_user=user_id)
                elif is_host:
                    # 房主断线，关闭房间
                    await broadcast_to_room(room_id, {
                        "type": "room_closed",
                        "reason": "房主已离开"
                    }, exclude_user=user_id)
                    del active_rooms[room_id]
    
    except Exception as e:
        # 🔥 只记录错误日志
        print(f"[PVP WS] 连接错误: room={room_id}, user={user_id}, error={e}")
        if connection_key in ws_connections:
            del ws_connections[connection_key]

# ==================== 消息处理函数 ====================

async def handle_player_ready(room_id: str, user_id: int):
    """处理玩家准备 - 房主点击开始时触发"""
    if room_id not in active_rooms:
        return
    
    room = active_rooms[room_id]
    
    # 只有房主可以开始对战，且必须有客人
    if user_id == room.host_id and (room.guest_id is not None or room.guest_name is not None):
        room.host_ready = True
        room.status = "in_progress"
        room.current_round = 1
        
        # 🔥 广播开始对战给双方
        await broadcast_to_room(room_id, {
            "type": "battle_start",
            "round": 1,
            "round_name": "battle"
        })
        return
    
    # 客人准备（备用逻辑）
    if user_id == room.guest_id:
        room.guest_ready = True
    
    # 广播准备状态
    await broadcast_to_room(room_id, {
        "type": "player_ready",
        "user_id": user_id,
        "host_ready": room.host_ready,
        "guest_ready": room.guest_ready
    })
    if room.host_ready and room.guest_ready:
        room.status = "in_progress"
        room.current_round = 1
        
        await broadcast_to_room(room_id, {
            "type": "battle_start",
            "round": 1,
            "round_name": "battle"
        })

async def handle_quiz_answer(room_id: str, user_id: int, message: dict):
    """处理答题提交"""
    await broadcast_to_room(room_id, {
        "type": "quiz_answer",
        "user_id": user_id,
        "question_index": message.get("question_index"),
        "is_correct": message.get("is_correct"),
        "time_used": message.get("time_used")
    }, exclude_user=user_id)

async def handle_code_submit(room_id: str, user_id: int, message: dict):
    """处理代码提交"""
    await broadcast_to_room(room_id, {
        "type": "code_submit",
        "user_id": user_id,
        "completed": message.get("completed"),
        "time_used": message.get("time_used")
    }, exclude_user=user_id)

async def handle_round_score(room_id: str, user_id: int, message: dict):
    """处理轮次分数"""
    if room_id not in active_rooms:
        return
    
    room = active_rooms[room_id]
    round_name = message.get("round")
    score = message.get("score", 0)
    
    if round_name in room.scores:
        if user_id == room.host_id:
            room.scores[round_name]["host"] = score
        elif user_id == room.guest_id:
            room.scores[round_name]["guest"] = score
    
    # 广播分数更新
    await broadcast_to_room(room_id, {
        "type": "score_update",
        "round": round_name,
        "scores": room.scores
    })


async def handle_game_end(room_id: str, user_id: int, message: dict):
    """
    🔧 处理游戏结束 - 自动关闭房间
    当任一玩家发送 game_end 消息时，标记房间为已结束
    """
    if room_id not in active_rooms:
        return
    
    room = active_rooms[room_id]
    
    # 验证用户是房间成员
    if room.host_id != user_id and room.guest_id != user_id:
        return
    
    # 如果房间已经结束，不重复处理
    if room.status == "finished":
        return
    
    # 标记房间为已结束
    room.status = "finished"
    room.finished_at = datetime.now()
    
    print(f"[PVP] 🏁 房间 {room_id} 游戏结束，由用户 {user_id} 触发")
    
    # 广播游戏结束给双方
    await broadcast_to_room(room_id, {
        "type": "game_end",
        "user_id": user_id,
        "payload": message.get("payload", {}),
        "message": "对战已结束，房间将在10秒后关闭"
    })

# ==================== 工具函数 ====================

async def broadcast_to_room(room_id: str, message: dict, exclude_user: int = None):
    """向房间内广播消息 - 🔥 优化：减少日志，提高性能"""
    disconnected = []
    msg_type = message.get('type', '')
    
    # 🔥 只在非高频消息时打印日志
    is_high_freq = msg_type in ('player_state', 'player_damage', 'projectile', 'pong')
    
    for key, ws in ws_connections.items():
        if key.startswith(f"{room_id}:"):
            uid = int(key.split(":")[1])
            if uid != exclude_user:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    if not is_high_freq:
                        print(f"[PVP] 发送失败: {e}")
                    disconnected.append(key)
    
    for key in disconnected:
        if key in ws_connections:
            del ws_connections[key]

async def send_to_user(room_id: str, user_id: int, message: dict):
    """向特定用户发送消息"""
    key = f"{room_id}:{user_id}"
    if key in ws_connections:
        try:
            await ws_connections[key].send_json(message)
        except:
            del ws_connections[key]
