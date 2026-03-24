"""
区块管理器 - 处理地图区块的加载和管理
"""
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.map_region import MapRegion, MapChunk
from app.models.map_object import MapObject
import math

class ChunkManager:
    """区块管理器"""
    
    # 区块大小（像素）
    CHUNK_SIZE = 1000
    
    def __init__(self):
        pass
    
    def get_chunk_coords(self, x: float, y: float) -> Tuple[int, int]:
        """根据世界坐标获取区块坐标"""
        chunk_x = int(math.floor(x / self.CHUNK_SIZE))
        chunk_y = int(math.floor(y / self.CHUNK_SIZE))
        return chunk_x, chunk_y
    
    def get_chunk_bounds(self, chunk_x: int, chunk_y: int) -> Tuple[int, int, int, int]:
        """获取区块的边界坐标"""
        min_x = chunk_x * self.CHUNK_SIZE
        min_y = chunk_y * self.CHUNK_SIZE
        max_x = min_x + self.CHUNK_SIZE
        max_y = min_y + self.CHUNK_SIZE
        return min_x, min_y, max_x, max_y
    
    def get_chunks_in_range(self, center_x: float, center_y: float, 
                            radius: float) -> List[Tuple[int, int]]:
        """获取范围内的区块坐标列表"""
        center_chunk_x, center_chunk_y = self.get_chunk_coords(center_x, center_y)
        
        # 计算需要加载的区块范围
        chunk_radius = int(math.ceil(radius / self.CHUNK_SIZE)) + 1
        
        chunks = []
        for dx in range(-chunk_radius, chunk_radius + 1):
            for dy in range(-chunk_radius, chunk_radius + 1):
                chunk_x = center_chunk_x + dx
                chunk_y = center_chunk_y + dy
                
                # 计算区块中心到查询点的距离
                chunk_center_x = (chunk_x + 0.5) * self.CHUNK_SIZE
                chunk_center_y = (chunk_y + 0.5) * self.CHUNK_SIZE
                distance = math.sqrt(
                    (chunk_center_x - center_x) ** 2 + 
                    (chunk_center_y - center_y) ** 2
                )
                
                if distance <= radius + (self.CHUNK_SIZE * 0.707):  # 对角线长度
                    chunks.append((chunk_x, chunk_y))
        
        return chunks
    
    def get_or_create_chunk(self, db: Session, region_id: int, 
                           chunk_x: int, chunk_y: int) -> MapChunk:
        """获取或创建区块"""
        chunk = db.query(MapChunk).filter(
            MapChunk.region_id == region_id,
            MapChunk.chunk_x == chunk_x,
            MapChunk.chunk_y == chunk_y
        ).first()
        
        if not chunk:
            # 获取此区块内的地图对象
            min_x, min_y, max_x, max_y = self.get_chunk_bounds(chunk_x, chunk_y)
            
            objects = db.query(MapObject).filter(
                MapObject.map_area == db.query(MapRegion).filter(
                    MapRegion.id == region_id
                ).first().name,
                MapObject.x >= min_x,
                MapObject.x < max_x,
                MapObject.y >= min_y,
                MapObject.y < max_y
            ).all()
            
            object_ids = [obj.id for obj in objects]
            
            chunk = MapChunk(
                region_id=region_id,
                chunk_x=chunk_x,
                chunk_y=chunk_y,
                chunk_size=self.CHUNK_SIZE,
                object_ids=object_ids,
                terrain_data={}  # 地形数据可以后续扩展
            )
            db.add(chunk)
            db.commit()
            db.refresh(chunk)
        
        return chunk
    
    def get_chunk_objects(self, db: Session, region_id: int, 
                         chunk_x: int, chunk_y: int) -> List[MapObject]:
        """获取区块内的地图对象"""
        chunk = self.get_or_create_chunk(db, region_id, chunk_x, chunk_y)
        
        if not chunk.object_ids:
            return []
        
        objects = db.query(MapObject).filter(
            MapObject.id.in_(chunk.object_ids)
        ).all()
        
        return objects
    
    def get_region_by_name(self, db: Session, region_name: str) -> Optional[MapRegion]:
        """根据名称获取区域"""
        return db.query(MapRegion).filter(MapRegion.name == region_name).first()
    
    def get_region_by_id(self, db: Session, region_id: int) -> Optional[MapRegion]:
        """根据ID获取区域"""
        return db.query(MapRegion).filter(MapRegion.id == region_id).first()
    
    def get_all_regions(self, db: Session) -> List[MapRegion]:
        """获取所有区域"""
        return db.query(MapRegion).filter(MapRegion.is_active == True).all()
    
    def get_accessible_regions(self, db: Session, user_level: int, 
                              completed_tasks: List[int] = None) -> List[MapRegion]:
        """获取用户可访问的区域"""
        if completed_tasks is None:
            completed_tasks = []
        
        all_regions = self.get_all_regions(db)
        accessible = []
        
        for region in all_regions:
            # 检查等级要求
            if user_level < region.required_level:
                continue
            
            # 检查区域要求
            if region.required_regions:
                # 这里简化处理，实际应该检查用户是否解锁了这些区域
                pass
            
            # 检查任务要求
            if region.required_tasks:
                if not all(task_id in completed_tasks for task_id in region.required_tasks):
                    continue
            
            accessible.append(region)
        
        return accessible

# 全局实例
chunk_manager = ChunkManager()

