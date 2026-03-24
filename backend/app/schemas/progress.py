from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Literal, Any
from datetime import datetime

# 年龄组类型
AgeGroupType = Literal['primary-lower', 'primary-upper', 'junior-high']

class AgeGroupProgress(BaseModel):
    """单个年龄组的战役进度"""
    completedLevels: List[str] = []
    completedCampaigns: List[str] = []

class ProgressBase(BaseModel):
    level: int = 1
    experience: int = 0
    coins: int = 0
    completed_levels: List[str] = []
    skills: List[str] = []
    inventory: List[str] = []
    has_key: bool = False
    arena_score: int = 0
    arena_high_score: int = 0
    completed_challenges: List[str] = []
    # 战役进度 (旧版兼容)
    completed_campaigns: List[str] = []
    completed_campaign_levels: List[str] = []
    campaign_progress: Optional[dict] = {}
    # 年龄分组战役进度 (v2.2.0新增)
    age_group_campaign_progress: Optional[Dict[str, AgeGroupProgress]] = {}

class ProgressSave(ProgressBase):
    """保存进度请求"""
    pass

class ProgressResponse(ProgressBase):
    """进度响应"""
    user_id: int
    updated_at: Optional[datetime] = None
    new_achievements: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)

class LevelCompletionCreate(BaseModel):
    """关卡完成请求"""
    level_id: str
    score: int
    code: str
    time_used: Optional[int] = None
    difficulty: Optional[int] = 5  # 关卡难度(1-10)
    quality_score: Optional[float] = 0  # 代码质量分数(0-100)
    standard_time: Optional[int] = None  # 标准完成时间(秒)

class LevelCompletionResponse(BaseModel):
    """关卡完成响应"""
    id: int
    user_id: int
    level_id: str
    score: int
    time_used: Optional[int]
    completed_at: datetime
    coins_earned: Optional[int] = 0  # 获得的金币数量
    coin_awarded: Optional[bool] = False  # 是否成功发放金币
    new_achievements: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)


# ========== 年龄分组战役进度 API Schema (v2.2.0) ==========

class AgeGroupProgressRequest(BaseModel):
    """年龄组进度保存请求"""
    age_group: AgeGroupType
    completed_levels: List[str] = []
    completed_campaigns: List[str] = []

class AgeGroupProgressResponse(BaseModel):
    """年龄组进度响应"""
    age_group: str
    completed_levels: List[str] = []
    completed_campaigns: List[str] = []

class AllAgeGroupProgressResponse(BaseModel):
    """所有年龄组进度响应"""
    primary_lower: AgeGroupProgress = AgeGroupProgress()
    primary_upper: AgeGroupProgress = AgeGroupProgress()
    junior_high: AgeGroupProgress = AgeGroupProgress()

class CompleteCampaignLevelRequest(BaseModel):
    """完成战役关卡请求"""
    age_group: AgeGroupType
    campaign_id: str
    level_id: str
    difficulty: Optional[int] = 5  # 战役难度(1-10)
    performance_score: Optional[float] = 0  # 表现评分(0-100)

class CompleteCampaignRequest(BaseModel):
    """完成战役请求"""
    age_group: AgeGroupType
    campaign_id: str
