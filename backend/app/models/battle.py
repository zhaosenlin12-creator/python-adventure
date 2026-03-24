from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class BattleRoom(Base):
    """对战房间表"""
    __tablename__ = "battle_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), unique=True, nullable=False, index=True)
    player1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    status = Column(String(20), default="waiting")  # waiting, in_progress, finished
    winner_id = Column(Integer)
    player1_score = Column(Integer, default=0)
    player2_score = Column(Integer, default=0)
    player1_time = Column(Integer)  # 完成时间（毫秒）
    player2_time = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    
    # 关系
    player1 = relationship("User", foreign_keys=[player1_id], backref="battles_as_player1")
    player2 = relationship("User", foreign_keys=[player2_id], backref="battles_as_player2")
    task = relationship("Task", backref="battle_rooms")


class BattleSubmission(Base):
    """对战提交记录表"""
    __tablename__ = "battle_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(Text, nullable=False)
    score = Column(Integer, default=0)
    execution_time = Column(Integer)  # 代码执行时间（毫秒）
    passed_tests = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", backref="battle_submissions")


class UserRank(Base):
    """用户段位表"""
    __tablename__ = "user_ranks"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    rank_points = Column(Integer, default=1000)  # ELO积分
    rank_tier = Column(String(20), default="bronze")  # bronze, silver, gold, platinum, diamond
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    win_streak = Column(Integer, default=0)
    max_win_streak = Column(Integer, default=0)
    total_battles = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", backref="rank", uselist=False)
    
    def get_rank_tier_name(self) -> str:
        """获取段位名称"""
        tier_names = {
            "bronze": "青铜",
            "silver": "白银",
            "gold": "黄金",
            "platinum": "铂金",
            "diamond": "钻石"
        }
        return tier_names.get(self.rank_tier, "未知")
    
    def update_tier(self):
        """根据积分更新段位"""
        if self.rank_points < 1200:
            self.rank_tier = "bronze"
        elif self.rank_points < 1400:
            self.rank_tier = "silver"
        elif self.rank_points < 1600:
            self.rank_tier = "gold"
        elif self.rank_points < 1800:
            self.rank_tier = "platinum"
        else:
            self.rank_tier = "diamond"
