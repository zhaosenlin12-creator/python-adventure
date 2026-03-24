# -*- coding: utf-8 -*-
"""
将demo用户升级到最高等级
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

# 找到demo用户
demo_user = db.query(User).filter(User.username == "demo").first()

if demo_user:
    # 升级到最高等级
    demo_user.level = 30
    demo_user.experience = 3000
    
    db.commit()
    
    print(f"[完成] demo用户已升级到最高等级！")
    print(f"  等级: {demo_user.level}")
    print(f"  经验: {demo_user.experience}")
    print(f"  称号: {demo_user.get_rank_title()}")
    print("\n[提示] 重新登录即可看到变化")
else:
    print("[错误] 找不到demo用户")

db.close()



