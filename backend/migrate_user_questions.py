"""
用户题库表迁移脚本
创建 user_questions 表用于存储用户的全局题库
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def migrate():
    """创建 user_questions 表"""
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    # 检查表是否已存在
    existing_tables = inspector.get_table_names()
    
    if 'user_questions' in existing_tables:
        print("✅ user_questions 表已存在，跳过创建")
        return
    
    # 创建表
    create_table_sql = """
    CREATE TABLE user_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'choice',
        question TEXT NOT NULL,
        options TEXT,
        answer VARCHAR(500) NOT NULL,
        explanation TEXT,
        difficulty INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
    
    # 创建索引
    create_index_sql = """
    CREATE INDEX ix_user_questions_user_id ON user_questions(user_id)
    """
    
    with engine.connect() as conn:
        conn.execute(text(create_table_sql))
        conn.execute(text(create_index_sql))
        conn.commit()
    
    print("✅ user_questions 表创建成功")

if __name__ == "__main__":
    migrate()
