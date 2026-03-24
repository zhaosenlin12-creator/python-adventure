"""
LevelLike 数据库模型
用于存储用户对社区关卡的点赞记录

Requirements: 4.1
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LevelLike(Base):
    """关卡点赞模型"""
    __tablename__ = "level_likes"
    
    # 主键
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 外键 - 关联用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 外键 - 关联关卡 (使用String因为CustomLevel的id是UUID字符串)
    level_id = Column(String(36), ForeignKey("custom_levels.id"), nullable=False, index=True)
    
    # 点赞时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User")
    level = relationship("CustomLevel")
    
    # 唯一约束 - 每个用户对每个关卡只能点赞一次
    __table_args__ = (
        UniqueConstraint('user_id', 'level_id', name='uq_user_level_like'),
    )
    
    def __repr__(self):
        return f"<LevelLike(id={self.id}, user_id={self.user_id}, level_id={self.level_id})>"
