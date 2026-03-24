"""
🍖 食物系统数据库迁移脚本
"""

import sqlite3
import os

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), 'game.db')

def migrate():
    """执行迁移"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("🍖 开始迁移食物系统...")
    
    try:
        # 1. 创建食物背包表
        print("📦 创建 food_inventory 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                food_id VARCHAR(50) NOT NULL,
                quantity INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, food_id)
            )
        """)
        
        # 2. 更新宠物表（添加新字段）
        print("🐕 更新 pets 表...")
        
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(pets)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'hunger' not in columns:
            cursor.execute("ALTER TABLE pets ADD COLUMN hunger INTEGER DEFAULT 100")
            print("  ✅ 添加 hunger 字段")
        
        if 'happiness' not in columns:
            cursor.execute("ALTER TABLE pets ADD COLUMN happiness INTEGER DEFAULT 100")
            print("  ✅ 添加 happiness 字段")
        
        if 'intimacy' not in columns:
            cursor.execute("ALTER TABLE pets ADD COLUMN intimacy INTEGER DEFAULT 0")
            print("  ✅ 添加 intimacy 字段")
        
        if 'current_form' not in columns:
            cursor.execute("ALTER TABLE pets ADD COLUMN current_form VARCHAR(50)")
            print("  ✅ 添加 current_form 字段")
        
        if 'evolution_stage' not in columns:
            cursor.execute("ALTER TABLE pets ADD COLUMN evolution_stage INTEGER DEFAULT 0")
            print("  ✅ 添加 evolution_stage 字段")
        
        # 提交更改
        conn.commit()
        print("✅ 迁移完成！")
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
