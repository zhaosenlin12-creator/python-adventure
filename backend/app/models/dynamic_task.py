"""
动态任务模型（教师发布的实时任务）
"""
from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.core.time import utc_now
from app.core.database import Base

class DynamicTask(Base):
    """动态任务（教师实时发布）"""
    __tablename__ = "dynamic_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    
    # 任务信息
    title = Column(String, nullable=False)
    description = Column(Text)
    difficulty = Column(Integer, default=1)  # 1-5星难度
    category = Column(String)  # Python基础、算法、数据结构等
    
    # 任务内容
    task_type = Column(String, default="code")  # code, quiz, challenge
    requirements = Column(Text)  # 任务要求
    test_cases = Column(JSON)  # 测试用例
    starter_code = Column(Text)  # 初始代码
    
    # 奖励设置
    experience_reward = Column(Integer, default=50)
    coins_reward = Column(Integer, default=30)
    bonus_reward = Column(JSON)  # 额外奖励（道具、称号等）
    
    # 时间限制
    time_limit = Column(Integer)  # 完成时间限制（分钟）
    deadline = Column(DateTime)  # 截止时间
    
    # 发布设置
    is_published = Column(Boolean, default=False)  # 是否已发布
    target_class = Column(String)  # 目标班级
    target_level_min = Column(Integer)  # 最低等级要求
    target_level_max = Column(Integer)  # 最高等级要求
    
    # 状态
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    published_at = Column(DateTime)  # 发布时间
    
    # 统计
    total_submissions = Column(Integer, default=0)
    success_submissions = Column(Integer, default=0)


class DynamicTaskSubmission(Base):
    """动态任务提交记录"""
    __tablename__ = "dynamic_task_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("dynamic_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 提交内容
    code = Column(Text)
    output = Column(Text)
    
    # 评判结果
    status = Column(String)  # pending, success, failed, partial
    score = Column(Integer, default=0)  # 得分 0-100
    test_results = Column(JSON)  # 测试结果
    feedback = Column(Text)  # 反馈信息
    
    # 奖励
    experience_earned = Column(Integer, default=0)
    coins_earned = Column(Integer, default=0)
    
    # 时间
    submitted_at = Column(DateTime, default=utc_now)
    judged_at = Column(DateTime)






