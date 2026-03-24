"""
聊天相关的 Pydantic Schema
"""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List


class ChatMessageCreate(BaseModel):
    """发送消息请求"""
    receiver_id: Optional[int] = None  # None表示全局消息
    content: str = Field(..., min_length=1, max_length=100)
    message_type: str = Field(default="global", pattern="^(global|private)$")


class ChatMessageResponse(BaseModel):
    """消息响应"""
    id: int
    sender_id: int
    sender_username: str
    sender_level: int
    receiver_id: Optional[int] = None
    receiver_username: Optional[str] = None
    content: str
    message_type: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ChatHistoryResponse(BaseModel):
    """聊天历史响应"""
    messages: List[ChatMessageResponse]
    total: int


class SendMessageResponse(BaseModel):
    """发送消息响应"""
    success: bool
    message: Optional[str] = None
    data: Optional[ChatMessageResponse] = None
    remaining_today: int  # 今日剩余发言次数
    cooldown_seconds: int = 0  # 冷却剩余秒数


class OnlineUser(BaseModel):
    """在线用户"""
    user_id: int
    username: str
    level: int
    rank_title: str


class OnlineUsersResponse(BaseModel):
    """在线用户列表响应"""
    users: List[OnlineUser]
    total: int
