"""
添加成就奖励蛋字段
Migration: add_achievement_reward_eggs
Date: 2026-01-29
"""
import sqlite3
import os

def migrate():
    """添加 reward_eggs 字段到 achievements 表，并回填关键成就奖励"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("🏆 开始添加成就奖励蛋字段...")

        cursor.execute("PRAGMA table_info(achievements)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'reward_eggs' not in columns:
            cursor.execute("""
                ALTER TABLE achievements
                ADD COLUMN reward_eggs INTEGER DEFAULT 0
            """)
            print("✅ 添加 reward_eggs 字段")
        else:
            print("⏭️  reward_eggs 字段已存在")

        # 回填关键成就的奖励蛋（按标题匹配，避免影响自定义成就）
        reward_map = {
            "崭露头角": 1,
            "小有成就": 1,
            "大师之路": 1,
            "任务能手": 1,
            "完美主义者": 1,
            "坚持不懈": 1
        }

        for title, eggs in reward_map.items():
            cursor.execute(
                "UPDATE achievements SET reward_eggs = ? WHERE title = ?",
                (eggs, title)
            )

        conn.commit()
        print("✅ 成就奖励蛋字段迁移完成！")
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
