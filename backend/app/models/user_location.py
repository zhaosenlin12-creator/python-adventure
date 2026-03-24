from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class UserLocation(Base):
    """用户在地图上的位置"""
    __tablename__ = "user_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    map_area = Column(String(50), nullable=False, default="新手村")  # 当前所在地图区域
    x = Column(Float, nullable=False, default=100.0)  # X坐标
    y = Column(Float, nullable=False, default=100.0)  # Y坐标
    direction = Column(String(10), default="down")  # 面朝方向: up, down, left, right
    last_move = Column(DateTime, default=datetime.utcnow)  # 最后移动时间
    
    # 关系
    user = relationship("User", backref="location")









