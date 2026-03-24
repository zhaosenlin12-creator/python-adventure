from sqlalchemy import Column, Integer, String, DateTime, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import date

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    coins = Column(Integer, default=100)  # 金币余额,新用户初始100金币
    arena_score = Column(Integer, default=0)  # 竞技场当前积分
    arena_high_score = Column(Integer, default=0)  # 竞技场最高积分
    # 当前跟随宠物（多宠物场景下用于服务端权威同步）
    current_pet_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 🎁 每日登录奖励系统
    last_login_date = Column(Date, nullable=True)  # 上次登录日期
    login_streak = Column(Integer, default=0)  # 连续登录天数
    total_login_days = Column(Integer, default=0)  # 总登录天数
    
    # 关系
    inventory = relationship("UserInventory", back_populates="user", lazy="dynamic")
    pets = relationship("Pet", back_populates="user", lazy="dynamic")
    learned_skills = relationship("UserSkill", back_populates="user", lazy="dynamic")
    decorations = relationship("UserDecoration", back_populates="user", lazy="dynamic")
    placed_decorations = relationship("PlacedDecoration", back_populates="user", lazy="dynamic")
    
    def get_rank_title(self) -> str:
        """根据等级返回段位称号"""
        if self.level <= 10:
            return "编程萌新"
        elif self.level <= 20:
            return "代码学徒"
        elif self.level <= 30:
            return "程序能手"
        elif self.level <= 40:
            return "算法达人"
        else:
            return "代码大师"

    def get_arena_rank_title(self) -> str:
        """根据竞技场积分返回段位称号"""
        score = self.arena_score or 0
        if score < 0:
            score = 0

        tiers = [
            {"name": "倔强青铜", "min": 0, "max": 999, "divisions": 3},
            {"name": "秩序白银", "min": 1000, "max": 2999, "divisions": 3},
            {"name": "荣耀黄金", "min": 3000, "max": 5999, "divisions": 4},
            {"name": "尊贵铂金", "min": 6000, "max": 9999, "divisions": 4},
            {"name": "永恒钻石", "min": 10000, "max": 19999, "divisions": 5},
            {"name": "至尊星耀", "min": 20000, "max": 39999, "divisions": 5},
            {"name": "最强王者", "min": 40000, "max": 79999, "divisions": 1},
            {"name": "荣耀王者", "min": 80000, "max": 149999, "divisions": 1},
            {"name": "传奇王者", "min": 150000, "max": float("inf"), "divisions": 1},
        ]

        tier = tiers[0]
        for t in tiers:
            if score >= t["min"] and score <= t["max"]:
                tier = t
                break
            if score > t["max"]:
                tier = t

        if tier["divisions"] > 1:
            tier_range = tier["max"] - tier["min"] + 1
            division_range = tier_range / tier["divisions"]
            score_in_tier = score - tier["min"]
            division = tier["divisions"] - int(score_in_tier // division_range)
            division = max(1, min(tier["divisions"], division))

            roman = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V"}
            return f"{tier['name']} {roman.get(division, '')}".strip()

        # 王者及以上显示星数
        if tier["name"] in ("最强王者", "荣耀王者", "传奇王者"):
            stars = int((score - tier["min"]) // 50) + 1
            return f"{tier['name']} {stars}星"

        return tier["name"]
    
    def add_experience(self, exp: int) -> bool:
        """添加经验值并自动升级"""
        self.experience += exp
        leveled_up = False
        
        # 简单的升级公式：每级需要 level * 100 经验
        while self.experience >= self.level * 100:
            self.experience -= self.level * 100
            self.level += 1
            leveled_up = True
            
        return leveled_up




