from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# ========== 用户位置 ==========
class UserLocationUpdate(BaseModel):
    x: float
    y: float
    direction: Optional[str] = None
    map_area: Optional[str] = None

class UserLocationResponse(BaseModel):
    user_id: int
    username: str
    map_area: str
    x: float
    y: float
    direction: str
    level: int
    rank_title: str
    
    model_config = ConfigDict(from_attributes=True)

class NearbyPlayersResponse(BaseModel):
    players: List[UserLocationResponse]
    count: int

# ========== 地图对象 ==========
class MapObjectResponse(BaseModel):
    id: int
    map_area: str
    object_type: str
    x: int
    y: int
    title: Optional[str]
    description: Optional[str]
    icon: Optional[str]
    interaction_type: Optional[str]
    rewards: Optional[Dict[str, Any]]
    requirements: Optional[Dict[str, Any]]
    is_active: bool
    
    # 用户相关状态
    status: Optional[str] = None  # 用户对这个对象的进度状态
    
    model_config = ConfigDict(from_attributes=True)

class MapDataResponse(BaseModel):
    area: str
    objects: List[MapObjectResponse]
    nearby_players: List[UserLocationResponse]

# ========== 地图交互 ==========
class MapInteraction(BaseModel):
    object_id: int
    action: str  # collect, talk, solve, fight
    data: Optional[Dict[str, Any]] = None  # 例如解谜答案

class InteractionResult(BaseModel):
    success: bool
    message: str
    rewards: Optional[Dict[str, Any]] = None
    object_status: Optional[str] = None

# ========== 资源抢夺 ==========
class ResourceChallenge(BaseModel):
    target_user_id: int
    resource_type: str  # 资源点类型

class ChallengeResult(BaseModel):
    success: bool
    message: str
    winner_id: int
    loser_id: int
    rewards: Optional[Dict[str, Any]] = None

# ========== 地图区域 ==========
class MapRegionResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    width: int
    height: int
    start_x: int
    start_y: int
    required_level: int
    theme: Optional[str]
    background_color: str
    icon: Optional[str]
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class MapRegionListResponse(BaseModel):
    regions: List[MapRegionResponse]
    count: int

# ========== 地图区块 ==========
class MapChunkResponse(BaseModel):
    chunk_x: int
    chunk_y: int
    chunk_size: int
    object_ids: List[int]
    
    model_config = ConfigDict(from_attributes=True)

class ChunkDataResponse(BaseModel):
    region_id: int
    region_name: str
    chunks: List[MapChunkResponse]
    objects: List[MapObjectResponse]

# ========== 扩展的地图数据 ==========
class ExtendedMapDataResponse(BaseModel):
    region: MapRegionResponse
    objects: List[MapObjectResponse]
    nearby_players: List[UserLocationResponse]
    chunks: List[MapChunkResponse]  # 当前加载的区块
