"""
快速初始化数据库
"""
from app.core.database import Base, engine
from app.models.user import User
from app.models.task import Task
from app.models.achievement import Achievement

print("=" * 60)
print("   初始化数据库表")
print("=" * 60)

# 创建所有表
Base.metadata.create_all(bind=engine)

print("✅ 数据库表创建成功！")
print()
print("现在可以注册新用户了！")
print("=" * 60)
