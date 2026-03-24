#!/usr/bin/env python
"""分析服务器备份数据库结构和数据"""
import sqlite3
import os

# 服务器备份数据库路径
SERVER_DB = r'C:\kaifa\Obsidian\senlin-kaifa\服务器备份包\game-backend\code_adventure.db'
LOCAL_DB = r'C:\kaifa\Obsidian\senlin-kaifa\game-google\backend\code_adventure.db'

def analyze_database(db_path, name):
    print(f"\n{'='*60}")
    print(f"分析数据库: {name}")
    print(f"路径: {db_path}")
    print(f"大小: {os.path.getsize(db_path) / 1024:.1f} KB")
    print(f"{'='*60}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"\n📋 表列表 ({len(tables)} 个):")
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        count = cursor.fetchone()[0]
        print(f"  - {t}: {count} 条记录")
    
    # 分析users表结构
    print("\n📊 users表结构:")
    cursor.execute("PRAGMA table_info(users)")
    for col in cursor.fetchall():
        print(f"  - {col[1]}: {col[2]} {'(PK)' if col[5] else ''}")
    
    # 分析宠物相关表
    pet_tables = [t for t in tables if 'pet' in t.lower()]
    for pet_table in pet_tables:
        print(f"\n🐾 {pet_table}表结构:")
        cursor.execute(f"PRAGMA table_info({pet_table})")
        for col in cursor.fetchall():
            print(f"  - {col[1]}: {col[2]} {'(PK)' if col[5] else ''}")
        
        # 显示示例数据
        cursor.execute(f"SELECT * FROM {pet_table} LIMIT 3")
        rows = cursor.fetchall()
        if rows:
            print(f"  示例数据 ({len(rows)} 条):")
            cursor.execute(f"PRAGMA table_info({pet_table})")
            col_names = [c[1] for c in cursor.fetchall()]
            for row in rows:
                print(f"    {dict(zip(col_names, row))}")
    
    # 显示用户数据示例
    print("\n👤 用户数据示例 (前5个):")
    cursor.execute("SELECT id, username, level, experience, created_at FROM users LIMIT 5")
    for row in cursor.fetchall():
        print(f"  - ID:{row[0]}, 用户:{row[1]}, 等级:{row[2]}, 经验:{row[3]}")
    
    conn.close()

if __name__ == '__main__':
    analyze_database(SERVER_DB, "服务器备份")
    analyze_database(LOCAL_DB, "本地开发")
