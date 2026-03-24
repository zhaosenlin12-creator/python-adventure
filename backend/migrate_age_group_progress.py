"""
数据库迁移脚本 - 添加年龄分组战役进度字段
版本: v2.2.0
日期: 2024-12
"""

import sqlite3
import os
import sys

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "code_adventure.db")

def check_column_exists(cursor, table_name, column_name):
    """检查列是否存在"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def migrate():
    """执行迁移"""
    print(f"🔄 开始迁移数据库: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查 user_progress 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'")
        if not cursor.fetchone():
            print("❌ user_progress 表不存在!")
            return False
        
        # 检查 age_group_campaign_progress 列是否已存在
        if check_column_exists(cursor, "user_progress", "age_group_campaign_progress"):
            print("✅ age_group_campaign_progress 列已存在，无需迁移")
            return True
        
        # 添加新列
        print("📝 添加 age_group_campaign_progress 列...")
        cursor.execute("""
            ALTER TABLE user_progress 
            ADD COLUMN age_group_campaign_progress TEXT DEFAULT '{}'
        """)
        
        conn.commit()
        print("✅ 迁移成功!")
        
        # 验证
        if check_column_exists(cursor, "user_progress", "age_group_campaign_progress"):
            print("✅ 验证通过: age_group_campaign_progress 列已添加")
        else:
            print("❌ 验证失败: 列未添加")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def show_table_info():
    """显示表结构"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n📋 user_progress 表结构:")
    cursor.execute("PRAGMA table_info(user_progress)")
    for row in cursor.fetchall():
        print(f"  - {row[1]} ({row[2]})")
    
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--info":
        show_table_info()
    else:
        success = migrate()
        show_table_info()
        sys.exit(0 if success else 1)
