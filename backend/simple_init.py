"""
最简单的数据库初始化
"""
import sqlite3
import hashlib

print("=" * 60)
print("   创建最简单的数据库")
print("=" * 60)

# 创建数据库连接
conn = sqlite3.connect('backend/code_adventure.db')
cursor = conn.cursor()

# 创建users表
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# 创建tasks表
cursor.execute('''
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty INTEGER DEFAULT 1,
    experience_reward INTEGER DEFAULT 0,
    starter_code TEXT,
    test_cases TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# 创建演示用户（密码是 bcrypt hash of "123456"）
try:
    cursor.execute('''
    INSERT INTO users (username, email, password_hash, level, experience)
    VALUES (?, ?, ?, ?, ?)
    ''', ('zhaosenlin', 'demo@example.com', 
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lE7UGxRpm.Ky',
          1, 0))
    print("✅ 演示用户创建成功")
except sqlite3.IntegrityError:
    print("✅ 演示用户已存在")

conn.commit()
conn.close()

print()
print("=" * 60)
print("   🎉 数据库创建完成！")
print("=" * 60)
print()
print("账号: zhaosenlin / 123456")
print()
print("现在启动后端：")
print("  cd backend")
print("  python run.py")





