from sqlalchemy import Column, Integer, String, Text, JSON
from app.core.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    difficulty = Column(Integer, default=1)  # 1-5难度等级
    task_type = Column(String(20), nullable=False)  # main, daily, side
    code_template = Column(Text)
    test_cases = Column(JSON)  # 存储测试用例
    rewards = Column(JSON)  # 存储奖励信息
    prerequisites = Column(JSON)  # 前置任务ID列表（SQLite用JSON代替ARRAY）
    map_area = Column(String(50))  # 所属地图区域

