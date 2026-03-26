"""
用户技能系统模型
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.core.database import Base

class UserSkill(Base):
    """用户学习的技能"""
    __tablename__ = "user_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    skill_level = Column(Integer, default=1)  # 技能等级
    experience = Column(Integer, default=0)  # 技能经验
    is_equipped = Column(Boolean, default=False)  # 是否装备
    learned_at = Column(DateTime, default=utc_now)
    last_used = Column(DateTime, nullable=True)
    
    # 关系
    user = relationship("User", back_populates="learned_skills")
    skill = relationship("Skill")






