"""
添加用户每日登录字段
Migration: add_daily_login_fields
Date: 2026-01-29
"""
import sqlite3
import os


def migrate():
    """添加 last_login_date / login_streak / total_login_days 字段到 users 表"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'code_adventure.db')

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("📅 开始添加每日登录字段...")

        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'last_login_date' not in columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN last_login_date DATE
            """)
            print("✅ 添加 last_login_date 字段")
        else:
            print("⏭️  last_login_date 字段已存在")

        if 'login_streak' not in columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN login_streak INTEGER DEFAULT 0
            """)
            print("✅ 添加 login_streak 字段")
        else:
            print("⏭️  login_streak 字段已存在")

        if 'total_login_days' not in columns:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN total_login_days INTEGER DEFAULT 0
            """)
            print("✅ 添加 total_login_days 字段")
        else:
            print("⏭️  total_login_days 字段已存在")

        conn.commit()
        print("✅ 每日登录字段迁移完成！")
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
