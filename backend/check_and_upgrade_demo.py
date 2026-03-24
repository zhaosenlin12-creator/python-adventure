# -*- coding: utf-8 -*-
"""
检查并升级demo用户
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()

print("="*60)
print("  检查demo用户状态")
print("="*60)

# 找到demo用户
demo_user = db.query(User).filter(User.username == "demo").first()

if demo_user:
    print(f"\n[当前状态]")
    print(f"  用户名: {demo_user.username}")
    print(f"  等级: {demo_user.level}")
    print(f"  经验: {demo_user.experience}")
    
    # 升级到最高等级
    print(f"\n[开始升级]")
    demo_user.level = 30
    demo_user.experience = 3000
    
    db.commit()
    
    print(f"\n[升级完成]")
    print(f"  新等级: {demo_user.level}")
    print(f"  新经验: {demo_user.experience}")
    print(f"  称号: {demo_user.get_rank_title()}")
    
    print("\n" + "="*60)
    print("  ✅ 升级成功！重新登录后生效")
    print("="*60)
else:
    print("[错误] 找不到demo用户")
    print("请先运行初始化脚本")

db.close()



