from sqlalchemy import Column, Integer, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CharacterTemplate(Base):
    """角色模板（可选的角色外观）"""
    __tablename__ = "character_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # 角色名称
    description = Column(String(200))  # 角色描述
    sprite_url = Column(String(200))  # 角色精灵图URL
    unlock_level = Column(Integer, default=1)  # 解锁等级
    attributes = Column(JSON)  # 特殊属性（速度、颜色等）

class UserCharacter(Base):
    """用户角色配置"""
    __tablename__ = "user_characters"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    template_id = Column(Integer, ForeignKey("character_templates.id"), nullable=False)
    
    # 自定义属性
    nickname = Column(String(50))  # 角色昵称
    color_scheme = Column(String(20), default="blue")  # 配色方案
    accessories = Column(JSON)  # 配件（帽子、眼镜等）
    
    # 关系
    user = relationship("User", backref="character")
    template = relationship("CharacterTemplate")







