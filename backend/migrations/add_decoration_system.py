"""
装饰品系统数据库迁移脚本
"""

import sqlite3
import os
from pathlib import Path

def migrate():
    """执行装饰品系统迁移"""
    
    # 数据库路径
    db_path = Path(__file__).parent.parent / "code_adventure.db"
    
    if not db_path.exists():
        print(f"❌ 数据库文件不存在: {db_path}")
        return False
    
    print(f"📂 连接数据库: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 创建用户装饰品表
        print("📦 创建 user_decorations 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_decorations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                decoration_id VARCHAR(50) NOT NULL,
                quantity INTEGER DEFAULT 1,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_decorations_user_id 
            ON user_decorations(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_decorations_decoration_id 
            ON user_decorations(decoration_id)
        """)
        
        # 2. 创建已放置装饰品表
        print("📦 创建 placed_decorations 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS placed_decorations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                decoration_id VARCHAR(50) NOT NULL,
                scene VARCHAR(20) NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                rotation REAL DEFAULT 0,
                placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_placed_decorations_user_id 
            ON placed_decorations(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_placed_decorations_scene 
            ON placed_decorations(scene)
        """)
        
        conn.commit()
        print("✅ 装饰品系统表创建成功！")
        
        # 验证表是否创建成功
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('user_decorations', 'placed_decorations')
        """)
        tables = cursor.fetchall()
        print(f"✅ 已创建表: {[t[0] for t in tables]}")
        
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    print("🚀 开始装饰品系统数据库迁移...")
    success = migrate()
    
    if success:
        print("✅ 迁移完成！")
    else:
        print("❌ 迁移失败！")
