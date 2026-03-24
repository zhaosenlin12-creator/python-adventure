"""
数据迁移脚本 - 将旧版战役进度迁移到年龄分组格式
版本: v2.1.18
日期: 2024-12-19

问题：v2.1.16 引入年龄段系统后，旧用户的战役进度没有迁移到新格式
解决：将 completed_campaigns 和 completed_campaign_levels 迁移到 age_group_campaign_progress

使用方法：
    python migrate_user_progress.py
"""

import sqlite3
import os
import json
import sys

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "code_adventure.db")

def migrate_user_progress():
    """迁移用户战役进度到年龄分组格式"""
    print(f"🔄 开始迁移用户进度: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. 首先确保 age_group_campaign_progress 列存在
        cursor.execute("PRAGMA table_info(user_progress)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "age_group_campaign_progress" not in columns:
            print("📝 添加 age_group_campaign_progress 列...")
            cursor.execute("""
                ALTER TABLE user_progress 
                ADD COLUMN age_group_campaign_progress TEXT DEFAULT '{}'
            """)
            conn.commit()
            print("✅ 列添加成功")
        
        # 2. 获取所有用户进度
        cursor.execute("""
            SELECT user_id, completed_campaigns, completed_campaign_levels, age_group_campaign_progress
            FROM user_progress
        """)
        users = cursor.fetchall()
        
        print(f"📊 找到 {len(users)} 个用户进度记录")
        
        migrated_count = 0
        for user_id, completed_campaigns_json, completed_levels_json, age_progress_json in users:
            try:
                # 解析旧数据
                completed_campaigns = json.loads(completed_campaigns_json) if completed_campaigns_json else []
                completed_levels = json.loads(completed_levels_json) if completed_levels_json else []
                age_progress = json.loads(age_progress_json) if age_progress_json else {}
                
                # 如果旧数据为空，跳过
                if not completed_campaigns and not completed_levels:
                    continue
                
                # 如果年龄分组进度已经有数据，检查是否需要合并
                has_age_data = any(
                    age_progress.get(ag, {}).get("completedCampaigns") or 
                    age_progress.get(ag, {}).get("completedLevels")
                    for ag in ["primary-lower", "primary-upper", "junior-high"]
                )
                
                # 过滤出不带年龄前缀的旧数据（纯战役ID）
                old_campaigns = [c for c in completed_campaigns if ":" not in c]
                old_levels = [l for l in completed_levels if ":" not in l]
                
                if not old_campaigns and not old_levels:
                    continue
                
                print(f"\n👤 用户 {user_id}:")
                print(f"   旧战役: {old_campaigns}")
                print(f"   旧关卡: {old_levels}")
                
                # 将旧数据迁移到所有三个年龄段（因为不知道用户之前用的是哪个年龄段）
                # 这样用户无论选择哪个年龄段都能看到之前的进度
                for age_group in ["primary-lower", "primary-upper", "junior-high"]:
                    if age_group not in age_progress:
                        age_progress[age_group] = {"completedLevels": [], "completedCampaigns": []}
                    
                    # 合并旧数据（去重）
                    existing_campaigns = set(age_progress[age_group].get("completedCampaigns", []))
                    existing_levels = set(age_progress[age_group].get("completedLevels", []))
                    
                    existing_campaigns.update(old_campaigns)
                    existing_levels.update(old_levels)
                    
                    age_progress[age_group]["completedCampaigns"] = list(existing_campaigns)
                    age_progress[age_group]["completedLevels"] = list(existing_levels)
                
                # 更新数据库
                cursor.execute("""
                    UPDATE user_progress 
                    SET age_group_campaign_progress = ?
                    WHERE user_id = ?
                """, (json.dumps(age_progress), user_id))
                
                migrated_count += 1
                print(f"   ✅ 迁移成功")
                
            except Exception as e:
                print(f"   ❌ 用户 {user_id} 迁移失败: {e}")
        
        conn.commit()
        print(f"\n✅ 迁移完成! 共迁移 {migrated_count} 个用户")
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def show_user_progress(user_id=None):
    """显示用户进度（调试用）"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute("""
            SELECT user_id, completed_campaigns, completed_campaign_levels, age_group_campaign_progress
            FROM user_progress WHERE user_id = ?
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT user_id, completed_campaigns, completed_campaign_levels, age_group_campaign_progress
            FROM user_progress LIMIT 10
        """)
    
    users = cursor.fetchall()
    
    print("\n📋 用户进度:")
    for user_id, campaigns, levels, age_progress in users:
        print(f"\n👤 用户 {user_id}:")
        print(f"   completed_campaigns: {campaigns}")
        print(f"   completed_campaign_levels: {levels}")
        print(f"   age_group_campaign_progress: {age_progress}")
    
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--show":
            user_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
            show_user_progress(user_id)
        elif sys.argv[1] == "--help":
            print("用法:")
            print("  python migrate_user_progress.py          # 执行迁移")
            print("  python migrate_user_progress.py --show   # 显示所有用户进度")
            print("  python migrate_user_progress.py --show 1 # 显示用户1的进度")
    else:
        success = migrate_user_progress()
        sys.exit(0 if success else 1)
