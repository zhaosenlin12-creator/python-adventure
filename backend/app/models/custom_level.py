"""
CustomLevel 数据库模型
用于存储玩家创建的自定义关卡数据

Requirements: 11.2, 12.3, 16.1
Community Level Requirements: 1.1, 1.2
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class CustomLevel(Base):
    """自定义关卡模型"""
    __tablename__ = "custom_levels"
    
    # 主键 - 使用UUID字符串
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键 - 关联用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 关卡元数据
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(Integer, default=1)  # 1-3 难度等级
    
    # 地图尺寸
    map_width = Column(Integer, default=800)   # 800-4000
    map_height = Column(Integer, default=600)  # 600-2000
    
    # 关卡数据 (JSON格式存储完整关卡信息)
    level_data = Column(JSON, nullable=False)
    
    # 社区关卡字段 (Community Level Requirements: 1.1, 1.2)
    is_published = Column(Boolean, default=False, index=True)  # 是否已发布到社区
    play_count = Column(Integer, default=0)  # 游玩次数
    like_count = Column(Integer, default=0)  # 点赞数
    published_at = Column(DateTime(timezone=True), nullable=True)  # 发布时间
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系 - 关联到User模型（单向关系，不需要back_populates）
    user = relationship("User")
    
    # 复合索引 - 用于社区关卡查询优化
    __table_args__ = (
        Index('ix_custom_levels_published_at', 'is_published', 'published_at'),
    )
    
    def __repr__(self):
        return f"<CustomLevel(id={self.id}, name={self.name}, user_id={self.user_id}, is_published={self.is_published})>"
