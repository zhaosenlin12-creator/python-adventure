from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class UserTask(Base):
    __tablename__ = "user_tasks"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), primary_key=True)
    status = Column(String(20), default="pending")  # pending, completed, failed
    completed_at = Column(DateTime(timezone=True))
    code_submitted = Column(Text)
    score = Column(Integer)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())









