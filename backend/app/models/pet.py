"""
宠物数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Pet(Base):
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pet_type = Column(String(50), nullable=False)  # 'cute_cat', 'tech_bot', etc.
    pet_style = Column(String(20), nullable=False)  # 'cute' or 'tech'
    name = Column(String(50))
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    hp = Column(Integer, default=100)
    
    # 三维属性
    intelligence = Column(Integer, default=0)
    creativity = Column(Integer, default=0)
    persistence = Column(Integer, default=0)
    
    # 亲密度与进化
    intimacy = Column(Integer, default=0)
    evolution_stage = Column(Integer, default=1)
    
    # 特殊属性
    code_quality = Column(Integer, default=0)
    creator_value = Column(Integer, default=0)
    battle_power = Column(Integer, default=0)
    
    # 状态
    status = Column(String(20), default='normal')  # 'normal', 'tired', 'coma', 'egg'
    last_feed_time = Column(DateTime, default=datetime.utcnow)
    coma_start_time = Column(DateTime, nullable=True)
    
    # 孵化系统
    is_egg = Column(Integer, default=1)  # 1=蛋状态, 0=已孵化
    hatch_progress = Column(Integer, default=0)  # 孵化进度 (0-3, 完成3个关卡后孵化)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="pets")
    skins = relationship("PetSkin", back_populates="pet", cascade="all, delete-orphan")
    growth_logs = relationship("PetGrowthLog", back_populates="pet", cascade="all, delete-orphan")
    
    def calculate_battle_power(self):
        """计算战斗力"""
        return int((self.intelligence + self.creativity + self.persistence) / 3 + self.level * 2)
    
    def can_evolve(self):
        """检查是否可以进化"""
        level_thresholds = {5: 100, 15: 500, 30: 1500, 50: 5000}
        next_level = None
        for lvl, exp_required in level_thresholds.items():
            if self.level < lvl and self.exp >= exp_required:
                next_level = lvl
                break
        
        if next_level:
            return (
                self.intelligence >= 50 and
                self.creativity >= 30 and
                self.persistence >= 40
            )
        return False
    
    def check_status(self):
        """检查宠物状态"""
        if not self.last_feed_time:
            return 'normal'
        
        days_since_feed = (datetime.utcnow() - self.last_feed_time).days
        
        if days_since_feed >= 7:
            return 'coma'
        elif days_since_feed >= 3:
            return 'tired'
        return 'normal'
    
    def to_dict(self):
        """转换为字典"""
        evolution_stage = self.evolution_stage
        if evolution_stage is None:
            evolution_stage = 0 if self.is_egg else 1
        return {
            'id': self.id,
            'userId': self.user_id,
            'petType': self.pet_type,
            'petStyle': self.pet_style,
            'name': self.name,
            'level': self.level,
            'exp': self.exp,
            'hp': self.hp,
            'attributes': {
                'intelligence': self.intelligence,
                'creativity': self.creativity,
                'persistence': self.persistence
            },
            # 进化与亲密度
            'intimacy': self.intimacy,
            'evolution_stage': evolution_stage,
            # 前端兼容字段
            'perseverance': self.persistence,
            'codeQuality': self.code_quality,
            'creatorValue': self.creator_value,
            'battlePower': self.calculate_battle_power(),
            'status': self.status,
            'lastFeedTime': self.last_feed_time.isoformat() if self.last_feed_time else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'isEgg': bool(self.is_egg),
            'hatchProgress': self.hatch_progress
        }


class PetSkin(Base):
    __tablename__ = "pet_skins"
    
    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    skin_id = Column(String(50), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    
    pet = relationship("Pet", back_populates="skins")


class PetGrowthLog(Base):
    __tablename__ = "pet_growth_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # 'level_up', 'evolve', 'rescue', etc.
    event_data = Column(String)  # JSON格式
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pet = relationship("Pet", back_populates="growth_logs")
