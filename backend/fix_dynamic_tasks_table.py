"""
创建缺失的动态任务表
"""
import sys
sys.path.append('.')

from app.core.database import engine
from app.models.dynamic_task import DynamicTask, DynamicTaskSubmission
from app.core.database import Base

print("创建动态任务表...")
Base.metadata.create_all(bind=engine, tables=[
    DynamicTask.__table__,
    DynamicTaskSubmission.__table__
])
print("✅ 动态任务表创建成功！")






