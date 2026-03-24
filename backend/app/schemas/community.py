"""
Community Level Pydantic Schemas
用于社区关卡浏览、发布功能的数据验证和序列化

Requirements: 2.2 - 显示关卡名称、作者名、难度、游玩次数、发布日期
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class CommunityLevelSummary(BaseModel):
    """
    社区关卡摘要Schema (用于列表展示)
    
    Requirements: 2.2 - 显示 level name, author name, difficulty, play count, publish date
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="关卡唯一标识")
    name: str = Field(..., description="关卡名称")
    description: Optional[str] = Field(None, description="关卡描述")
    difficulty: int = Field(..., ge=1, le=3, description="难度等级 1-3")
    author_name: str = Field(..., description="作者用户名")
    author_id: int = Field(..., description="作者用户ID")
    play_count: int = Field(..., ge=0, description="游玩次数")
    like_count: int = Field(..., ge=0, description="点赞数")
    published_at: datetime = Field(..., description="发布时间")
    is_liked: bool = Field(default=False, description="当前用户是否已点赞")


class CommunityLevelDetail(CommunityLevelSummary):
    """
    社区关卡详情Schema (包含完整关卡数据)
    
    继承自 CommunityLevelSummary，添加完整关卡数据用于游玩
    """
    map_width: int = Field(..., ge=800, le=20000, description="地图宽度")
    map_height: int = Field(..., ge=600, le=5000, description="地图高度")
    level_data: Dict[str, Any] = Field(..., description="完整关卡数据")


class CommunityLevelListResponse(BaseModel):
    """
    社区关卡列表分页响应Schema
    
    Requirements: 2.1, 5.1 - 分页列表，每页最多20个关卡
    """
    model_config = ConfigDict(from_attributes=True)
    
    levels: List[CommunityLevelSummary] = Field(..., description="关卡列表")
    total: int = Field(..., ge=0, description="总关卡数")
    page: int = Field(..., ge=1, description="当前页码")
    limit: int = Field(..., ge=1, le=20, description="每页数量")
    has_more: bool = Field(..., description="是否有更多数据")


# 用于验证必需字段的常量
REQUIRED_SUMMARY_FIELDS = frozenset([
    'id', 'name', 'difficulty', 'author_name', 
    'play_count', 'like_count', 'published_at'
])


def has_required_fields(data: dict) -> bool:
    """
    检查数据是否包含所有必需字段
    
    用于 Property 4: Community Level Response Fields 验证
    **Validates: Requirements 2.2**
    """
    return REQUIRED_SUMMARY_FIELDS.issubset(data.keys())
