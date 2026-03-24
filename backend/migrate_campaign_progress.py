"""
迁移脚本：为 user_progress 表添加战役进度字段
"""
import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'code_adventure.db')
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'")
    if not cursor.fetchone():
        print("user_progress 表不存在，跳过迁移")
        conn.close()
        return
    
    # 获取现有列
    cursor.execute("PRAGMA table_info(user_progress)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # 添加新列（如果不存在）
    new_columns = [
        ("completed_campaigns", "TEXT DEFAULT '[]'"),
        ("completed_campaign_levels", "TEXT DEFAULT '[]'"),
        ("campaign_progress", "TEXT DEFAULT '{}'")
    ]
    
    for col_name, col_def in new_columns:
        if col_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE user_progress ADD COLUMN {col_name} {col_def}")
                print(f"✅ 添加列: {col_name}")
            except sqlite3.OperationalError as e:
                print(f"⚠️ 添加列 {col_name} 失败: {e}")
        else:
            print(f"ℹ️ 列已存在: {col_name}")
    
    conn.commit()
    conn.close()
    print("✅ 迁移完成！")

if __name__ == "__main__":
    migrate()
