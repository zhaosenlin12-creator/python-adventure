from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class Achievement(Base):
    """成就表"""
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(10))  # emoji图标
    condition_type = Column(String(50))  # 成就类型：task_count, level, perfect_score等
    condition_value = Column(Integer)  # 达成条件数值
    reward_exp = Column(Integer, default=0)  # 奖励经验
    reward_eggs = Column(Integer, default=0)  # 奖励宠物蛋数量
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserAchievement(Base):
    """用户成就表"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    achievement_id = Column(Integer, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
    is_claimed = Column(Boolean, default=False)  # 是否已领取奖励
