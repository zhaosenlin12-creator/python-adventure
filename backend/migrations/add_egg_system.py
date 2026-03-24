"""
添加宠物蛋系统字段
Migration: add_egg_system
Date: 2026-01-22
"""
import sqlite3
import os

def migrate():
    """添加孵化系统字段到pets表"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🥚 开始添加宠物蛋系统字段...")
        
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(pets)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # 添加 is_egg 字段
        if 'is_egg' not in columns:
            cursor.execute("""
                ALTER TABLE pets 
                ADD COLUMN is_egg INTEGER DEFAULT 0
            """)
            print("✅ 添加 is_egg 字段")
        else:
            print("⏭️  is_egg 字段已存在")
        
        # 添加 hatch_progress 字段
        if 'hatch_progress' not in columns:
            cursor.execute("""
                ALTER TABLE pets 
                ADD COLUMN hatch_progress INTEGER DEFAULT 0
            """)
            print("✅ 添加 hatch_progress 字段")
        else:
            print("⏭️  hatch_progress 字段已存在")
        
        conn.commit()
        print("✅ 宠物蛋系统迁移完成！")
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
