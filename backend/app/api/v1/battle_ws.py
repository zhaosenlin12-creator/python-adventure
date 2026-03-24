"""
PvP 对战 WebSocket 通信
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json

router = APIRouter()

# 活跃的 WebSocket 连接 {room_id:user_id: websocket}
active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/battle/{room_id}/{user_id}")
async def websocket_battle(websocket: WebSocket, room_id: str, user_id: int):
    """WebSocket - 实时对战通信"""
    await websocket.accept()
    connection_key = f"{room_id}:{user_id}"
    active_connections[connection_key] = websocket
    
    try:
        # 发送欢迎消息
        await websocket.send_json({
            "type": "connected",
            "room_id": room_id,
            "user_id": user_id
        })
        
        # 通知对手有人加入
        await broadcast_to_room(room_id, {
            "type": "opponent_joined",
            "user_id": user_id
        }, exclude_user=user_id)
        
        while True:
            # 接收消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 🔥 减少日志输出
            
            # 处理不同类型的消息
            if message['type'] == 'code_update':
                # 实时代码更新（可选功能）
                await broadcast_to_room(room_id, {
                    "type": "opponent_code_update",
                    "user_id": user_id,
                    "code_length": len(message.get('code', ''))
                }, exclude_user=user_id)
            
            elif message['type'] == 'submission':
                # 代码提交通知
                await broadcast_to_room(room_id, {
                    "type": "opponent_submitted",
                    "user_id": user_id,
                    "score": message.get('score', 0)
                }, exclude_user=user_id)
            
            elif message['type'] == 'ready':
                # 玩家准备就绪
                await broadcast_to_room(room_id, {
                    "type": "opponent_ready",
                    "user_id": user_id
                }, exclude_user=user_id)
    
    except WebSocketDisconnect:
        # 正常断开，无需日志
        if connection_key in active_connections:
            del active_connections[connection_key]
        
        # 通知对手离开
        await broadcast_to_room(room_id, {
            "type": "opponent_left",
            "user_id": user_id
        }, exclude_user=user_id)
    
    except Exception as e:
        # 🔥 只记录错误日志
        print(f"[Battle WS] 连接错误: room={room_id}, user={user_id}, error={e}")
        if connection_key in active_connections:
            del active_connections[connection_key]

async def broadcast_to_room(room_id: str, message: dict, exclude_user: int = None):
    """向房间内的所有玩家广播消息（可排除某个用户）"""
    disconnected = []
    
    for key, connection in active_connections.items():
        if key.startswith(f"{room_id}:"):
            user_id = int(key.split(":")[1])
            if user_id != exclude_user:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(key)
    
    # 清理断开的连接
    for key in disconnected:
        del active_connections[key]

async def send_to_user(room_id: str, user_id: int, message: dict):
    """向特定用户发送消息"""
    connection_key = f"{room_id}:{user_id}"
    if connection_key in active_connections:
        try:
            await active_connections[connection_key].send_json(message)
        except:
            del active_connections[connection_key]
