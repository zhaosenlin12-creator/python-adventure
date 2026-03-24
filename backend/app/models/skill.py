from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Skill(Base):
    """技能模板（基于教案内容）"""
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # 技能名称
    description = Column(Text)  # 技能描述
    icon = Column(String(10))  # 技能图标emoji
    skill_type = Column(String(20))  # attack, defense, buff, special
    
    # 技能等级要求
    level_required = Column(Integer, default=1)
    
    # 技能效果
    damage_multiplier = Column(Float, default=1.0)  # 伤害倍数
    damage_reduction = Column(Float, default=0.0)  # 伤害减免
    speed_boost = Column(Float, default=1.0)  # 速度提升
    cooldown = Column(Integer, default=3)  # 冷却时间
    
    # 额外效果
    effects = Column(JSON, default={})  # 其他效果
    
    created_at = Column(DateTime, default=datetime.utcnow)




