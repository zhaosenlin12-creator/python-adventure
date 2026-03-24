"""
用户题库Schema定义
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal
from datetime import datetime


class QuestionBase(BaseModel):
    """题目基础字段"""
    type: Literal["choice", "fill"] = "choice"
    question: str = Field(..., min_length=1, max_length=1000)
    options: Optional[List[str]] = None  # 选择题选项
    answer: str = Field(..., min_length=1, max_length=500)
    explanation: Optional[str] = Field(None, max_length=1000)
    difficulty: int = Field(1, ge=1, le=3)


class QuestionCreate(QuestionBase):
    """创建题目"""
    pass


class QuestionUpdate(BaseModel):
    """更新题目"""
    type: Optional[Literal["choice", "fill"]] = None
    question: Optional[str] = Field(None, min_length=1, max_length=1000)
    options: Optional[List[str]] = None
    answer: Optional[str] = Field(None, min_length=1, max_length=500)
    explanation: Optional[str] = Field(None, max_length=1000)
    difficulty: Optional[int] = Field(None, ge=1, le=3)


class QuestionResponse(QuestionBase):
    """题目响应"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class QuestionBankResponse(BaseModel):
    """题库响应"""
    questions: List[QuestionResponse]
    total: int
    limit: int = 300  # 全局限制


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    ids: List[int] = Field(..., min_length=1, max_length=100)


class BatchImportRequest(BaseModel):
    """批量导入请求（AI生成的题目）"""
    questions: List[QuestionCreate] = Field(..., min_length=1, max_length=50)
