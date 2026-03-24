"""
聊天消息模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.database import Base


class ChatMessage(Base):
    """聊天消息表"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # NULL表示全局消息
    content = Column(String(100), nullable=False)  # 最多100字
    message_type = Column(String(20), nullable=False, default="global")  # global/private
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 复合索引优化查询
    __table_args__ = (
        Index('idx_chat_type_created', 'message_type', 'created_at'),
        Index('idx_chat_private', 'sender_id', 'receiver_id', 'created_at'),
    )


class UserChatLimit(Base):
    """用户每日发言限制"""
    __tablename__ = "user_chat_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    message_count = Column(Integer, default=0)
    last_message_time = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date', unique=True),
    )
