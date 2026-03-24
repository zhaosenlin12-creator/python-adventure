"""
添加宠物进化相关字段
Migration: add_pet_evolution_fields
Date: 2026-01-29
"""
import sqlite3
import os

def migrate():
    """添加 intimacy 与 evolution_stage 字段到 pets 表"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("🐾 开始添加宠物进化字段...")

        cursor.execute("PRAGMA table_info(pets)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'intimacy' not in columns:
            cursor.execute("""
                ALTER TABLE pets
                ADD COLUMN intimacy INTEGER DEFAULT 0
            """)
            print("✅ 添加 intimacy 字段")
        else:
            print("⏭️  intimacy 字段已存在")

        if 'evolution_stage' not in columns:
            cursor.execute("""
                ALTER TABLE pets
                ADD COLUMN evolution_stage INTEGER DEFAULT 0
            """)
            print("✅ 添加 evolution_stage 字段")
        else:
            print("⏭️  evolution_stage 字段已存在")

        # 回填进化阶段：蛋=0，已孵化=1
        try:
            cursor.execute("""
                UPDATE pets
                SET evolution_stage = CASE
                    WHEN (is_egg = 1 OR pet_type = 'egg') THEN 0
                    ELSE 1
                END
                WHERE evolution_stage IS NULL
            """)
        except Exception:
            # 兼容老表无 is_egg 字段的情况
            cursor.execute("""
                UPDATE pets
                SET evolution_stage = CASE
                    WHEN pet_type = 'egg' THEN 0
                    ELSE 1
                END
                WHERE evolution_stage IS NULL
            """)

        conn.commit()
        print("✅ 宠物进化字段迁移完成！")
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
