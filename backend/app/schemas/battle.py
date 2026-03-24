from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class BattleRoomCreate(BaseModel):
    """创建对战房间请求"""
    player1_id: int
    player2_id: int
    task_id: int

class BattleRoomResponse(BaseModel):
    """对战房间响应"""
    id: int
    room_id: str
    player1_id: int
    player2_id: int
    task_id: int
    status: str
    winner_id: Optional[int]
    player1_score: int
    player2_score: int
    player1_time: Optional[int]
    player2_time: Optional[int]
    created_at: datetime
    finished_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class BattleSubmissionCreate(BaseModel):
    """提交对战代码请求"""
    room_id: str
    code: str

class BattleSubmissionResponse(BaseModel):
    """对战提交响应"""
    id: int
    room_id: str
    user_id: int
    score: int
    execution_time: Optional[int]
    passed_tests: int
    total_tests: int
    submitted_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserRankResponse(BaseModel):
    """用户段位响应"""
    user_id: int
    rank_points: int
    rank_tier: str
    rank_tier_name: str
    wins: int
    losses: int
    win_streak: int
    max_win_streak: int
    total_battles: int
    win_rate: float
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BattleResultResponse(BaseModel):
    """对战结果响应"""
    room_id: str
    winner_id: Optional[int]
    player1_id: int
    player2_id: int
    player1_score: int
    player2_score: int
    player1_time: Optional[int]
    player2_time: Optional[int]
    player1_rank_change: int
    player2_rank_change: int

class MatchmakingRequest(BaseModel):
    """匹配请求"""
    pass  # 从token获取用户信息

class MatchmakingResponse(BaseModel):
    """匹配响应"""
    status: str  # queued, matched
    room_id: Optional[str] = None
    opponent_id: Optional[int] = None
    opponent_username: Optional[str] = None
    task_id: Optional[int] = None
