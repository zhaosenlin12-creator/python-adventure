"""
地图区域和区块模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, Float, UniqueConstraint
from app.core.time import utc_now
from app.core.database import Base

class MapRegion(Base):
    """地图区域"""
    __tablename__ = "map_regions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # 区域名称
    display_name = Column(String(100), nullable=False)  # 显示名称
    description = Column(Text)  # 区域描述
    
    # 地图尺寸和坐标
    width = Column(Integer, nullable=False, default=2000)  # 区域宽度
    height = Column(Integer, nullable=False, default=2000)  # 区域高度
    start_x = Column(Integer, default=0)  # 起始X坐标（全局坐标）
    start_y = Column(Integer, default=0)  # 起始Y坐标（全局坐标）
    
    # 解锁条件
    required_level = Column(Integer, default=1)  # 需要等级
    required_regions = Column(JSON)  # 需要解锁的区域列表
    required_tasks = Column(JSON)  # 需要完成的任务列表
    
    # 区域属性
    theme = Column(String(50))  # 主题（森林、城市、海洋等）
    background_color = Column(String(20), default="#87CEEB")  # 背景颜色
    icon = Column(String(10))  # 图标emoji
    
    # 状态
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)


class MapChunk(Base):
    """地图区块（用于分块加载）"""
    __tablename__ = "map_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, nullable=False)  # 所属区域ID
    chunk_x = Column(Integer, nullable=False)  # 区块X坐标
    chunk_y = Column(Integer, nullable=False)  # 区块Y坐标
    
    # 区块尺寸（固定，例如1000x1000）
    chunk_size = Column(Integer, default=1000)  # 区块大小
    
    # 区块内容（JSON格式存储，可以包含地形、资源等）
    terrain_data = Column(JSON)  # 地形数据
    object_ids = Column(JSON)  # 此区块中的对象ID列表
    
    # 元数据
    last_updated = Column(DateTime, default=utc_now)
    
    # 唯一约束：同一区域同一坐标只能有一个区块
    __table_args__ = (
        UniqueConstraint('region_id', 'chunk_x', 'chunk_y', name='uq_region_chunk'),
    )
