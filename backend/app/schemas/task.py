from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: str
    difficulty: int
    task_type: str
    map_area: Optional[str] = None

class TaskCreate(TaskBase):
    code_template: str
    test_cases: List[Dict[str, Any]]
    rewards: Dict[str, Any]
    prerequisites: Optional[List[int]] = []

class TaskResponse(TaskBase):
    id: int
    code_template: str
    rewards: Dict[str, Any]
    prerequisites: List[int]
    
    model_config = ConfigDict(from_attributes=True)

class TaskListResponse(BaseModel):
    id: int
    title: str
    difficulty: int
    task_type: str
    map_area: Optional[str] = None
    status: Optional[str] = "locked"  # locked, available, completed
    
    model_config = ConfigDict(from_attributes=True)

class TaskSubmission(BaseModel):
    code: str

class TaskResult(BaseModel):
    success: bool
    message: str
    test_results: List[Dict[str, Any]]
    score: Optional[int] = None
    output: Optional[str] = ""
    error: Optional[str] = ""
    rewards: Optional[Dict[str, Any]] = None
    new_achievements: Optional[List[Dict[str, Any]]] = None

