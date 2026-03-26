"""
背包/物品系统模型
"""
from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.core.database import Base

class Item(Base):
    """物品模板"""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(String(500))
    icon = Column(String(10))  # emoji
    item_type = Column(String(20))  # consumable, equipment, material, skill_book
    rarity = Column(String(20), default="common")  # common, uncommon, rare, epic, legendary
    effects = Column(JSON, default={})  # {"experience": 100, "hp": 50}
    requirements = Column(JSON, default={})  # {"level": 5}
    max_stack = Column(Integer, default=99)
    can_trade = Column(Boolean, default=True)
    can_sell = Column(Boolean, default=True)
    sell_price = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

class UserInventory(Base):
    """用户背包"""
    __tablename__ = "user_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, default=1)
    is_equipped = Column(Boolean, default=False)
    acquired_at = Column(DateTime, default=utc_now)
    
    # 关系
    user = relationship("User", back_populates="inventory")
    item = relationship("Item")






