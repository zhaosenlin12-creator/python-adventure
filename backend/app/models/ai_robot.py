"""
AI机器人模型
"""
from sqlalchemy import Column, Integer, String, JSON
from app.core.database import Base

class AIRobot(Base):
    """AI机器人（用于人机对战）"""
    __tablename__ = "ai_robots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    level = Column(Integer, default=1)
    avatar = Column(String, default="🤖")
    personality = Column(String)  # 机器人性格：友善、挑战、严格等
    difficulty = Column(Integer, default=1)  # 难度系数 1-5
    win_rate = Column(Integer, default=50)  # 基础胜率 0-100
    specialties = Column(JSON)  # 擅长的知识领域
    description = Column(String)






