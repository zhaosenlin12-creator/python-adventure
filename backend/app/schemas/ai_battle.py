from pydantic import BaseModel
from typing import Optional, List

class AIBattleStart(BaseModel):
    robot_id: Optional[int] = None  # 如果为空，自动匹配

class AIBattleAnswer(BaseModel):
    battle_id: str
    answer: str

class RobotInfo(BaseModel):
    id: int
    name: str
    level: int
    avatar: str
    personality: str
    difficulty: int
    description: str
    is_recommended: bool = False

class AIRobotListResponse(BaseModel):
    robots: List[RobotInfo]

class AIBattleResponse(BaseModel):
    success: bool
    message: str
    battle_data: Optional[dict] = None
    battle_complete: Optional[bool] = False
    winner: Optional[str] = None
    correct_answer: Optional[str] = None
    user_answer: Optional[str] = None
    robot_answer: Optional[str] = None
    rewards: Optional[dict] = None
    explanation: Optional[str] = None
    robot_comment: Optional[str] = None
    timeout: Optional[bool] = False






