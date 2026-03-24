"""
数据库迁移：添加食物背包表
"""

import sqlite3
from datetime import datetime
import os


def migrate():
    """执行迁移"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("[Migration] Creating food_inventory table...")
        
        # 创建食物背包表
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
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_food_inventory_user_id 
            ON food_inventory(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_food_inventory_food_id 
            ON food_inventory(food_id)
        """)
        
        conn.commit()
        print("[Migration] ✅ food_inventory table created successfully")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"[Migration] ❌ Failed to create table: {e}")
        return False
        
    finally:
        conn.close()


def rollback():
    """回滚迁移"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("[Migration] Rolling back food_inventory table...")
        
        cursor.execute("DROP TABLE IF EXISTS food_inventory")
        
        conn.commit()
        print("[Migration] ✅ Rollback successful")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"[Migration] ❌ Rollback failed: {e}")
        return False
        
    finally:
        conn.close()


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback()
    else:
        migrate()
