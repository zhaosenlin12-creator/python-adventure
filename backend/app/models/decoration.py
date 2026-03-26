"""
装饰品系统数据模型
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.core.database import Base


class UserDecoration(Base):
    """用户拥有的装饰品"""
    __tablename__ = "user_decorations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decoration_id = Column(String(50), nullable=False)  # 装饰品ID（如 'sofa_red'）
    quantity = Column(Integer, default=1)  # 拥有数量
    purchased_at = Column(DateTime, default=utc_now)
    
    # 关系
    user = relationship("User", back_populates="decorations")


class PlacedDecoration(Base):
    """已放置的装饰品"""
    __tablename__ = "placed_decorations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decoration_id = Column(String(50), nullable=False)  # 装饰品ID
    scene = Column(String(20), nullable=False)  # 'living' 或 'garden'
    x = Column(Float, nullable=False)  # X坐标
    y = Column(Float, nullable=False)  # Y坐标
    rotation = Column(Float, default=0)  # 旋转角度
    placed_at = Column(DateTime, default=utc_now)
    
    # 关系
    user = relationship("User", back_populates="placed_decorations")
