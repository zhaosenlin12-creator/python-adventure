"""
数据库迁移脚本 - 添加 PvP 对战系统表
"""
from app.core.database import Base, engine
from app.models.battle import BattleRoom, BattleSubmission, UserRank

print("=" * 60)
print("   添加 PvP 对战系统数据库表")
print("=" * 60)

# 创建所有表
Base.metadata.create_all(bind=engine)

print("✅ 数据库表创建/更新成功！")
print()
print("新增表:")
print("  - battle_rooms: 对战房间")
print("  - battle_submissions: 对战提交记录")
print("  - user_ranks: 用户段位")
print()
print("=" * 60)
