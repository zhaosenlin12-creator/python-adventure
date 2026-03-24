"""
数据库迁移脚本 - 添加云端存档功能
"""
from app.core.database import Base, engine
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime

print("=" * 60)
print("   添加云端存档数据库表")
print("=" * 60)

# 创建所有表
Base.metadata.create_all(bind=engine)

print("✅ 数据库表创建/更新成功！")
print()
print("新增表:")
print("  - user_progress: 用户游戏进度")
print("  - level_completions: 关卡完成记录")
print()
print("=" * 60)
