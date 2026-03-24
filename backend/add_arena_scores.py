"""
添加竞技场积分字段到用户表
运行此脚本来更新数据库：python add_arena_scores.py
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text, inspect
from app.core.database import engine

def add_arena_score_columns():
    """添加 arena_score 和 arena_high_score 列到 users 表"""
    
    with engine.connect() as conn:
        try:
            # 使用 SQLAlchemy 的 inspect 来检查列是否存在（兼容所有数据库）
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('users')]
            
            # 检查并添加 arena_score 列
            if 'arena_score' not in columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN arena_score INTEGER DEFAULT 0
                """))
                conn.commit()
                print("✅ 已添加 arena_score 列")
            else:
                print("ℹ️  arena_score 列已存在")
            
            # 检查并添加 arena_high_score 列
            if 'arena_high_score' not in columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN arena_high_score INTEGER DEFAULT 0
                """))
                conn.commit()
                print("✅ 已添加 arena_high_score 列")
            else:
                print("ℹ️  arena_high_score 列已存在")
            
            # 为现有用户设置默认值
            conn.execute(text("""
                UPDATE users 
                SET arena_score = 0, arena_high_score = 0 
                WHERE arena_score IS NULL OR arena_high_score IS NULL
            """))
            conn.commit()
            
            print("\n✅ 数据库迁移完成！")
            print("📊 所有用户的竞技场积分已初始化为 0")
            
        except Exception as e:
            print(f"❌ 迁移失败: {e}")
            import traceback
            traceback.print_exc()
            conn.rollback()
            raise

if __name__ == "__main__":
    print("开始添加竞技场积分字段...")
    print("数据库类型: SQLite")
    add_arena_score_columns()
