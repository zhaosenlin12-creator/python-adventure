"""
用户全局题库模型
每个用户有一个全局题库，所有创意工坊关卡共享
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class QuestionType(str, enum.Enum):
    """题目类型"""
    CHOICE = "choice"
    FILL = "fill"


class UserQuestion(Base):
    """用户自定义题目"""
    __tablename__ = "user_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 题目内容
    type = Column(String(20), nullable=False, default="choice")  # choice/fill
    question = Column(Text, nullable=False)
    options = Column(Text, nullable=True)  # JSON数组，选择题选项
    answer = Column(String(500), nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(Integer, nullable=False, default=1)  # 1-3
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
