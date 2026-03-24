from pydantic import BaseModel
from typing import List, Optional

class QuizBattleStart(BaseModel):
    target_user_id: int
    difficulty: Optional[int] = None

class QuizAnswerSubmit(BaseModel):
    battle_id: str
    answer: str

class QuizBattleResponse(BaseModel):
    success: bool
    message: str
    battle_data: Optional[dict] = None
    battle_complete: Optional[bool] = False
    winner_id: Optional[int] = None
    winner_name: Optional[str] = None
    correct_answer: Optional[str] = None
    rewards: Optional[str] = None
    explanation: Optional[str] = None
    waiting: Optional[bool] = False
    timeout: Optional[bool] = False

class QuizBattleStatusResponse(BaseModel):
    battle_id: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    hint: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[int] = None
    time_remaining: Optional[int] = None
    waiting_for_opponent: Optional[bool] = False






