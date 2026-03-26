"""
聊天 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Dict, Set
import json
import asyncio

from app.core.database import get_db
from app.models.chat import ChatMessage, UserChatLimit
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse, ChatHistoryResponse,
    SendMessageResponse, OnlineUser, OnlineUsersResponse
)

router = APIRouter()

# 聊天配置
CHAT_CONFIG = {
    "MAX_MESSAGE_LENGTH": 100,
    "SEND_COOLDOWN_SECONDS": 3,
    "DAILY_MESSAGE_LIMIT": 100,
    "HISTORY_LIMIT": 50,
}

# WebSocket 连接管理
class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}  # user_id -> websocket
        self.user_info: Dict[int, dict] = {}  # user_id -> user info
    
    async def connect(self, websocket: WebSocket, user_id: int, user_info: dict):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_info[user_id] = user_info
        # 广播用户上线
        await self.broadcast_user_join(user_id, user_info)
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_info:
            del self.user_info[user_id]
    
    async def send_personal(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                self.disconnect(user_id)
    
    async def broadcast(self, message: dict, exclude_user: int = None):
        disconnected = []
        for user_id, ws in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except:
                disconnected.append(user_id)
        for user_id in disconnected:
            self.disconnect(user_id)
    
    async def broadcast_user_join(self, user_id: int, user_info: dict):
        await self.broadcast({
            "type": "user_join",
            "data": {
                "user_id": user_id,
                **user_info
            }
        }, exclude_user=user_id)
    
    async def broadcast_user_leave(self, user_id: int):
        await self.broadcast({
            "type": "user_leave",
            "data": {"user_id": user_id}
        })
    
    def get_online_users(self) -> list:
        return [
            {"user_id": uid, **info}
            for uid, info in self.user_info.items()
        ]

manager = ChatConnectionManager()


def check_rate_limit(db: Session, user_id: int) -> tuple[bool, int, int]:
    """
    检查发言频率限制
    返回: (是否可以发送, 今日剩余次数, 冷却剩余秒数)
    """
    today = date.today().isoformat()
    
    limit = db.query(UserChatLimit).filter(
        UserChatLimit.user_id == user_id,
        UserChatLimit.date == today
    ).first()
    
    if not limit:
        limit = UserChatLimit(user_id=user_id, date=today, message_count=0)
        db.add(limit)
        db.commit()
        db.refresh(limit)
    
    # 检查每日限制
    remaining = CHAT_CONFIG["DAILY_MESSAGE_LIMIT"] - limit.message_count
    if remaining <= 0:
        return False, 0, 0
    
    # 检查冷却时间
    cooldown = 0
    if limit.last_message_time:
        elapsed = (datetime.now() - limit.last_message_time).total_seconds()
        if elapsed < CHAT_CONFIG["SEND_COOLDOWN_SECONDS"]:
            cooldown = int(CHAT_CONFIG["SEND_COOLDOWN_SECONDS"] - elapsed)
            return False, remaining, cooldown
    
    return True, remaining, 0


def update_rate_limit(db: Session, user_id: int):
    """更新发言计数"""
    today = date.today().isoformat()
    limit = db.query(UserChatLimit).filter(
        UserChatLimit.user_id == user_id,
        UserChatLimit.date == today
    ).first()
    
    if limit:
        limit.message_count += 1
        limit.last_message_time = datetime.now()
        db.commit()


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    message_type: str = "global",
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取全局聊天历史"""
    query = db.query(ChatMessage).filter(
        ChatMessage.message_type == "global"
    ).order_by(desc(ChatMessage.created_at)).limit(min(limit, CHAT_CONFIG["HISTORY_LIMIT"]))
    
    messages = query.all()
    
    result = []
    for msg in reversed(messages):  # 按时间正序返回
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        if sender:
            result.append(ChatMessageResponse(
                id=msg.id,
                sender_id=msg.sender_id,
                sender_username=sender.username,
                sender_level=sender.level,
                receiver_id=msg.receiver_id,
                receiver_username=None,
                content=msg.content,
                message_type=msg.message_type,
                created_at=msg.created_at
            ))
    
    return ChatHistoryResponse(messages=result, total=len(result))


@router.get("/private/{user_id}", response_model=ChatHistoryResponse)
async def get_private_history(
    user_id: int,
    current_user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取与某用户的私聊记录"""
    query = db.query(ChatMessage).filter(
        ChatMessage.message_type == "private",
        or_(
            and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == user_id),
            and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == current_user_id)
        )
    ).order_by(desc(ChatMessage.created_at)).limit(min(limit, CHAT_CONFIG["HISTORY_LIMIT"]))
    
    messages = query.all()
    
    result = []
    for msg in reversed(messages):
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        receiver = db.query(User).filter(User.id == msg.receiver_id).first() if msg.receiver_id else None
        if sender:
            result.append(ChatMessageResponse(
                id=msg.id,
                sender_id=msg.sender_id,
                sender_username=sender.username,
                sender_level=sender.level,
                receiver_id=msg.receiver_id,
                receiver_username=receiver.username if receiver else None,
                content=msg.content,
                message_type=msg.message_type,
                created_at=msg.created_at
            ))
    
    return ChatHistoryResponse(messages=result, total=len(result))


@router.get("/online-users", response_model=OnlineUsersResponse)
async def get_online_users():
    """获取在线用户列表"""
    users = manager.get_online_users()
    return OnlineUsersResponse(
        users=[OnlineUser(**u) for u in users],
        total=len(users)
    )


@router.websocket("/ws/{user_id}")
async def chat_websocket(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    """聊天 WebSocket 端点"""
    # 获取用户信息
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=4001, reason="User not found")
        return
    
    user_info = {
        "username": user.username,
        "level": user.level,
        "rank_title": user.get_rank_title()
    }

    try:
        await manager.connect(websocket, user_id, user_info)
    
    # 发送在线用户列表
        await websocket.send_json({
            "type": "online_users",
            "data": {"users": manager.get_online_users()}
        })
    
        while True:
            data = await websocket.receive_json()
            await handle_chat_message(websocket, user_id, user_info, data, db)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast_user_leave(user_id)
    except Exception as e:
        # 🔥 只记录错误日志
        print(f"[Chat WS] 连接错误: user_id={user_id}, error={e}")
        manager.disconnect(user_id)
        await manager.broadcast_user_leave(user_id)


async def handle_chat_message(websocket: WebSocket, user_id: int, user_info: dict, data: dict, db: Session):
    """处理聊天消息"""
    msg_type = data.get("type")
    
    # 🔥 处理心跳ping
    if msg_type == "ping":
        await websocket.send_json({
            "type": "pong",
            "timestamp": datetime.now().timestamp()
        })
        return
    
    if msg_type == "send_message":
        content = data.get("content", "").strip()
        receiver_id = data.get("receiver_id")
        message_type = "private" if receiver_id else "global"
        
        # 验证消息长度
        if not content or len(content) > CHAT_CONFIG["MAX_MESSAGE_LENGTH"]:
            await websocket.send_json({
                "type": "error",
                "data": {"message": "消息长度无效（1-100字）"}
            })
            return
        
        # 检查频率限制
        can_send, remaining, cooldown = check_rate_limit(db, user_id)
        if not can_send:
            if cooldown > 0:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": f"发送太快，请等待{cooldown}秒", "cooldown": cooldown}
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "data": {"message": "今日发言次数已用完"}
                })
            return
        
        # 保存消息到数据库
        chat_msg = ChatMessage(
            sender_id=user_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type
        )
        db.add(chat_msg)
        db.commit()
        db.refresh(chat_msg)
        
        # 更新频率限制
        update_rate_limit(db, user_id)
        
        # 构建消息响应
        receiver = db.query(User).filter(User.id == receiver_id).first() if receiver_id else None
        msg_response = {
            "type": "new_message",
            "data": {
                "id": chat_msg.id,
                "sender_id": user_id,
                "sender_username": user_info["username"],
                "sender_level": user_info["level"],
                "receiver_id": receiver_id,
                "receiver_username": receiver.username if receiver else None,
                "content": content,
                "message_type": message_type,
                "created_at": chat_msg.created_at.isoformat()
            }
        }
        
        if message_type == "global":
            # 广播全局消息
            await manager.broadcast(msg_response)
        else:
            # 私聊消息只发给发送者和接收者
            await manager.send_personal(user_id, msg_response)
            if receiver_id and receiver_id != user_id:
                await manager.send_personal(receiver_id, msg_response)
    
    elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})
    
    elif msg_type == "get_online_users":
        await websocket.send_json({
            "type": "online_users",
            "data": {"users": manager.get_online_users()}
        })
