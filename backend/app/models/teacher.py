"""
教师模型
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.time import utc_now
from app.core.database import Base

class Teacher(Base):
    """教师账号"""
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    
    # 权限
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # 是否是管理员
    
    # 所教班级/学生组
    class_name = Column(String)
    
    created_at = Column(DateTime, default=utc_now)






