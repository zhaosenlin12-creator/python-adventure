"""
简化版聊天表初始化脚本 - 不依赖 app.core.config
"""
import sqlite3
import os

# 数据库路径（与 app/core/database.py 保持一致）
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "code_adventure.db")

# 如果在 backend 目录下运行，调整路径
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "code_adventure.db")
if not os.path.exists(DB_PATH):
    DB_PATH = "code_adventure.db"
if not os.path.exists(DB_PATH):
    DB_PATH = "../code_adventure.db"

print(f"数据库路径: {DB_PATH}")

# 创建表的 SQL
CREATE_CHAT_MESSAGES = """
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'global',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
"""

CREATE_USER_CHAT_LIMITS = """
CREATE TABLE IF NOT EXISTS user_chat_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date VARCHAR(10) NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message_time TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
);
"""

CREATE_INDEX_1 = """
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
"""

CREATE_INDEX_2 = """
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
"""

CREATE_INDEX_3 = """
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);
"""

CREATE_INDEX_4 = """
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
"""

def init_tables():
    print("正在创建聊天相关数据库表...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute(CREATE_CHAT_MESSAGES)
        print("  ✓ chat_messages 表创建成功")
        
        cursor.execute(CREATE_USER_CHAT_LIMITS)
        print("  ✓ user_chat_limits 表创建成功")
        
        cursor.execute(CREATE_INDEX_1)
        cursor.execute(CREATE_INDEX_2)
        cursor.execute(CREATE_INDEX_3)
        cursor.execute(CREATE_INDEX_4)
        print("  ✓ 索引创建成功")
        
        conn.commit()
        print("\n聊天表创建完成!")
        
        # 验证表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('chat_messages', 'user_chat_limits')")
        tables = cursor.fetchall()
        print(f"已创建的表: {[t[0] for t in tables]}")
        
    except Exception as e:
        print(f"错误: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    init_tables()
