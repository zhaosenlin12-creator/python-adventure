"""
任务提交记录模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base

class TaskFileSubmission(Base):
    """任务文件提交记录"""
    __tablename__ = "task_file_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # 文件大小（字节）
    upload_time = Column(DateTime, default=datetime.utcnow)
    is_graded = Column(Boolean, default=False)  # 是否已评分
    score = Column(Integer)  # 评分
    feedback = Column(Text)  # 教师反馈
    rewarded = Column(Boolean, default=False)  # 是否已发放奖励



