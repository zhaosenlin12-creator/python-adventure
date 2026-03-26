from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from app.core.time import utc_now
from app.core.database import Base

class MapObject(Base):
    """地图对象（宝箱、NPC、线索、资源点等）"""
    __tablename__ = "map_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    map_area = Column(String(50), nullable=False)  # 所属地图区域
    object_type = Column(String(20), nullable=False)  # 类型: chest, npc, clue, resource, puzzle
    x = Column(Integer, nullable=False)  # X坐标（格子坐标）
    y = Column(Integer, nullable=False)  # Y坐标（格子坐标）
    
    # 对象属性
    title = Column(String(100))  # 标题
    description = Column(Text)  # 描述
    icon = Column(String(10))  # 图标emoji
    
    # 交互相关
    interaction_type = Column(String(20))  # 交互类型: collect, talk, solve, fight
    rewards = Column(JSON)  # 奖励
    requirements = Column(JSON)  # 解锁要求
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    respawn_time = Column(Integer)  # 重生时间（秒），为空表示不重生
    created_at = Column(DateTime, default=utc_now)


class UserMapProgress(Base):
    """用户地图探索进度"""
    __tablename__ = "user_map_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    map_object_id = Column(Integer, ForeignKey("map_objects.id"), nullable=False)
    
    # 进度状态
    status = Column(String(20), default="discovered")  # discovered, collected, completed
    collected_at = Column(DateTime)  # 收集/完成时间
    data = Column(JSON)  # 额外数据（例如解谜答案、对话记录等）









