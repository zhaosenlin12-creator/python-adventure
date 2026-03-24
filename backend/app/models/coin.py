from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class CoinTransaction(Base):
    """金币交易记录表"""
    __tablename__ = "coin_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # 金币数量(正数为获得,负数为消费)
    type = Column(String(50), nullable=False)  # 交易类型: reward, purchase, workshop_earning
    source = Column(String(100), nullable=False)  # 来源: level_complete, arena_win, pvp_win, workshop_play, etc.
    description = Column(String(255))  # 描述信息
    transaction_id = Column(String(100), unique=True, index=True)  # 唯一交易ID,防止重复发放
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 关系
    user = relationship("User", backref="coin_transactions")


class WorkshopEarning(Base):
    """创意工坊收益表"""
    __tablename__ = "workshop_earnings"
    
    id = Column(Integer, primary_key=True, index=True)
    level_id = Column(String(36), nullable=False, index=True)  # 关卡ID (UUID字符串)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # 创作者ID
    play_count = Column(Integer, default=0)  # 游玩次数
    like_count = Column(Integer, default=0)  # 点赞次数
    total_coins = Column(Integer, default=0)  # 累计获得金币
    daily_coins = Column(Integer, default=0)  # 今日获得金币
    last_reset_date = Column(DateTime(timezone=True), server_default=func.now())  # 上次重置日期
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    creator = relationship("User", backref="workshop_earnings")
