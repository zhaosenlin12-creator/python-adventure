#!/usr/bin/env python
"""
服务器数据迁移脚本 v1.0
功能：将服务器备份数据库安全迁移到新系统
作者：企业级游戏工程师
日期：2026-01-28

⚠️ 重要：运行前请确保已备份所有数据！
"""

import sqlite3
import os
import shutil
from datetime import datetime
import json

# 路径配置
SERVER_DB = r'C:\kaifa\Obsidian\senlin-kaifa\服务器备份包\game-backend\code_adventure.db'
LOCAL_DB = r'C:\kaifa\Obsidian\senlin-kaifa\game-google\backend\code_adventure.db'
BACKUP_DIR = r'C:\kaifa\Obsidian\senlin-kaifa\game-google\backend\db_backups'

def create_backup():
    """创建数据库备份"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 备份本地数据库
    if os.path.exists(LOCAL_DB):
        backup_path = os.path.join(BACKUP_DIR, f'local_backup_{timestamp}.db')
        shutil.copy2(LOCAL_DB, backup_path)
        print(f"✅ 本地数据库已备份: {backup_path}")
    
    # 复制服务器数据库作为备份
    server_backup = os.path.join(BACKUP_DIR, f'server_backup_{timestamp}.db')
    shutil.copy2(SERVER_DB, server_backup)
    print(f"✅ 服务器数据库已备份: {server_backup}")
    
    return timestamp

def migrate_users(server_conn, local_conn):
    """迁移用户数据（保留原有字段，添加新字段默认值）"""
    print("\n📦 迁移用户数据...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    # 获取服务器用户数据
    server_cursor.execute("""
        SELECT id, username, email, password_hash, level, experience, 
               arena_score, arena_high_score, created_at 
        FROM users
    """)
    server_users = server_cursor.fetchall()
    print(f"  服务器用户数: {len(server_users)}")
    
    # 检查本地users表结构，确保有新字段
    local_cursor.execute("PRAGMA table_info(users)")
    local_columns = [col[1] for col in local_cursor.fetchall()]
    
    # 添加缺失的列
    new_columns = {
        'coins': 'INTEGER DEFAULT 100',
        'last_login_date': 'DATE',
        'login_streak': 'INTEGER DEFAULT 0',
        'total_login_days': 'INTEGER DEFAULT 0'
    }
    
    for col_name, col_def in new_columns.items():
        if col_name not in local_columns:
            try:
                local_cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                print(f"  ✅ 添加新列: {col_name}")
            except sqlite3.OperationalError as e:
                if 'duplicate column' not in str(e).lower():
                    print(f"  ⚠️ 添加列失败 {col_name}: {e}")
    
    # 清空本地用户表（谨慎操作！）
    local_cursor.execute("DELETE FROM users")
    
    # 插入服务器用户数据
    migrated = 0
    for user in server_users:
        try:
            local_cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, level, experience,
                                   arena_score, arena_high_score, created_at, coins,
                                   login_streak, total_login_days)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100, 0, 0)
            """, user)
            migrated += 1
        except sqlite3.IntegrityError as e:
            print(f"  ⚠️ 跳过用户 {user[1]}: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(server_users)} 用户")
    return migrated

def migrate_user_progress(server_conn, local_conn):
    """迁移用户进度数据"""
    print("\n📦 迁移用户进度...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    # 检查表是否存在
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无user_progress表，跳过")
        return 0
    
    server_cursor.execute("SELECT * FROM user_progress")
    progress_data = server_cursor.fetchall()
    print(f"  服务器进度记录数: {len(progress_data)}")
    
    # 获取列名
    server_cursor.execute("PRAGMA table_info(user_progress)")
    columns = [col[1] for col in server_cursor.fetchall()]
    
    # 清空并重新插入
    local_cursor.execute("DELETE FROM user_progress")
    
    migrated = 0
    for row in progress_data:
        try:
            placeholders = ','.join(['?' for _ in row])
            cols = ','.join(columns)
            local_cursor.execute(f"INSERT INTO user_progress ({cols}) VALUES ({placeholders})", row)
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 进度迁移失败: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(progress_data)} 进度记录")
    return migrated

def migrate_custom_levels(server_conn, local_conn):
    """迁移自定义关卡"""
    print("\n📦 迁移自定义关卡...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_levels'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无custom_levels表，跳过")
        return 0
    
    server_cursor.execute("SELECT * FROM custom_levels")
    levels = server_cursor.fetchall()
    print(f"  服务器关卡数: {len(levels)}")
    
    server_cursor.execute("PRAGMA table_info(custom_levels)")
    columns = [col[1] for col in server_cursor.fetchall()]
    
    local_cursor.execute("DELETE FROM custom_levels")
    
    migrated = 0
    for row in levels:
        try:
            placeholders = ','.join(['?' for _ in row])
            cols = ','.join(columns)
            local_cursor.execute(f"INSERT INTO custom_levels ({cols}) VALUES ({placeholders})", row)
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 关卡迁移失败: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(levels)} 关卡")
    return migrated

def migrate_chat_messages(server_conn, local_conn):
    """迁移聊天消息"""
    print("\n📦 迁移聊天消息...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无chat_messages表，跳过")
        return 0
    
    server_cursor.execute("SELECT * FROM chat_messages")
    messages = server_cursor.fetchall()
    print(f"  服务器消息数: {len(messages)}")
    
    server_cursor.execute("PRAGMA table_info(chat_messages)")
    columns = [col[1] for col in server_cursor.fetchall()]
    
    local_cursor.execute("DELETE FROM chat_messages")
    
    migrated = 0
    for row in messages:
        try:
            placeholders = ','.join(['?' for _ in row])
            cols = ','.join(columns)
            local_cursor.execute(f"INSERT INTO chat_messages ({cols}) VALUES ({placeholders})", row)
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 消息迁移失败: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(messages)} 消息")
    return migrated

def migrate_level_likes(server_conn, local_conn):
    """迁移关卡点赞"""
    print("\n📦 迁移关卡点赞...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='level_likes'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无level_likes表，跳过")
        return 0
    
    server_cursor.execute("SELECT * FROM level_likes")
    likes = server_cursor.fetchall()
    print(f"  服务器点赞数: {len(likes)}")
    
    server_cursor.execute("PRAGMA table_info(level_likes)")
    columns = [col[1] for col in server_cursor.fetchall()]
    
    local_cursor.execute("DELETE FROM level_likes")
    
    migrated = 0
    for row in likes:
        try:
            placeholders = ','.join(['?' for _ in row])
            cols = ','.join(columns)
            local_cursor.execute(f"INSERT INTO level_likes ({cols}) VALUES ({placeholders})", row)
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 点赞迁移失败: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(likes)} 点赞")
    return migrated

def migrate_leaderboard(server_conn, local_conn):
    """迁移排行榜"""
    print("\n📦 迁移排行榜...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='leaderboard'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无leaderboard表，跳过")
        return 0
    
    server_cursor.execute("SELECT * FROM leaderboard")
    records = server_cursor.fetchall()
    print(f"  服务器排行榜记录数: {len(records)}")
    
    server_cursor.execute("PRAGMA table_info(leaderboard)")
    columns = [col[1] for col in server_cursor.fetchall()]
    
    local_cursor.execute("DELETE FROM leaderboard")
    
    migrated = 0
    for row in records:
        try:
            placeholders = ','.join(['?' for _ in row])
            cols = ','.join(columns)
            local_cursor.execute(f"INSERT INTO leaderboard ({cols}) VALUES ({placeholders})", row)
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 排行榜迁移失败: {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(records)} 排行榜记录")
    return migrated

def migrate_pets_from_old_format(server_conn, local_conn):
    """将旧版user_pets数据转换为新版pets格式"""
    print("\n📦 迁移宠物数据 (user_pets → pets)...")
    
    server_cursor = server_conn.cursor()
    local_cursor = local_conn.cursor()
    
    # 检查服务器是否有user_pets表
    server_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_pets'")
    if not server_cursor.fetchone():
        print("  ⚠️ 服务器无user_pets表，跳过宠物迁移")
        return 0
    
    # 获取旧版宠物数据
    server_cursor.execute("""
        SELECT up.id, up.user_id, up.name, up.level, up.experience, up.current_stats,
               up.is_active, up.friendship, up.acquired_at, up.last_fed,
               pt.pet_type, pt.name as template_name
        FROM user_pets up
        LEFT JOIN pet_templates pt ON up.template_id = pt.id
    """)
    old_pets = server_cursor.fetchall()
    print(f"  服务器宠物数: {len(old_pets)}")
    
    if not old_pets:
        print("  ⚠️ 服务器无宠物数据，跳过")
        return 0
    
    # 清空新版宠物表（保留本地测试数据可选）
    # local_cursor.execute("DELETE FROM pets")
    
    migrated = 0
    for pet in old_pets:
        try:
            pet_id, user_id, name, level, exp, current_stats, is_active, friendship, acquired_at, last_fed, pet_type, template_name = pet
            
            # 解析current_stats JSON
            stats = {}
            if current_stats:
                try:
                    stats = json.loads(current_stats) if isinstance(current_stats, str) else current_stats
                except:
                    stats = {}
            
            # 映射宠物类型
            type_mapping = {
                'dragon': 'cute_dragon',
                'cat': 'cute_cat',
                'dog': 'cute_dog',
                'robot': 'tech_bot',
            }
            new_pet_type = type_mapping.get(pet_type, 'cute_cat')
            pet_style = 'tech' if 'robot' in str(pet_type).lower() else 'cute'
            
            # 插入新格式
            local_cursor.execute("""
                INSERT OR REPLACE INTO pets (
                    user_id, pet_type, pet_style, name, level, exp, hp,
                    intelligence, creativity, persistence,
                    code_quality, creator_value, battle_power,
                    status, last_feed_time, created_at, updated_at, is_egg, hatch_progress
                ) VALUES (?, ?, ?, ?, ?, ?, 100, ?, ?, ?, 0, 0, ?, 'normal', ?, ?, ?, 0, 3)
            """, (
                user_id,
                new_pet_type,
                pet_style,
                name or template_name or '小宠物',
                level or 1,
                exp or 0,
                stats.get('intelligence', friendship // 10 if friendship else 10),
                stats.get('creativity', 10),
                stats.get('persistence', 10),
                stats.get('attack', 0) + stats.get('defense', 0),
                last_fed or acquired_at,
                acquired_at or datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            migrated += 1
        except Exception as e:
            print(f"  ⚠️ 宠物迁移失败 (ID:{pet_id}): {e}")
    
    local_conn.commit()
    print(f"  ✅ 迁移完成: {migrated}/{len(old_pets)} 宠物")
    return migrated

def verify_migration(local_conn):
    """验证迁移结果"""
    print("\n🔍 验证迁移结果...")
    
    cursor = local_conn.cursor()
    
    # 验证用户数
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"  用户总数: {user_count}")
    
    # 验证进度数
    cursor.execute("SELECT COUNT(*) FROM user_progress")
    progress_count = cursor.fetchone()[0]
    print(f"  进度记录: {progress_count}")
    
    # 验证宠物数
    cursor.execute("SELECT COUNT(*) FROM pets")
    pet_count = cursor.fetchone()[0]
    print(f"  宠物数量: {pet_count}")
    
    # 验证关卡数
    cursor.execute("SELECT COUNT(*) FROM custom_levels")
    level_count = cursor.fetchone()[0]
    print(f"  自定义关卡: {level_count}")
    
    # 检查用户新字段
    cursor.execute("SELECT id, username, coins, login_streak FROM users LIMIT 3")
    print("  用户新字段验证:")
    for row in cursor.fetchall():
        print(f"    - {row[1]}: coins={row[2]}, streak={row[3]}")
    
    return True

def main():
    print("=" * 60)
    print("🚀 服务器数据迁移工具 v1.0")
    print("=" * 60)
    print(f"服务器数据库: {SERVER_DB}")
    print(f"本地数据库: {LOCAL_DB}")
    print("-" * 60)
    
    # 确认执行
    confirm = input("\n⚠️ 此操作将覆盖本地数据库！确认执行？(yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ 操作已取消")
        return
    
    # 创建备份
    print("\n📁 创建备份...")
    timestamp = create_backup()
    
    # 连接数据库
    server_conn = sqlite3.connect(SERVER_DB)
    local_conn = sqlite3.connect(LOCAL_DB)
    
    try:
        # 执行迁移
        migrate_users(server_conn, local_conn)
        migrate_user_progress(server_conn, local_conn)
        migrate_custom_levels(server_conn, local_conn)
        migrate_chat_messages(server_conn, local_conn)
        migrate_level_likes(server_conn, local_conn)
        migrate_leaderboard(server_conn, local_conn)
        migrate_pets_from_old_format(server_conn, local_conn)
        
        # 验证
        verify_migration(local_conn)
        
        print("\n" + "=" * 60)
        print("✅ 迁移完成！")
        print("=" * 60)
        print(f"备份目录: {BACKUP_DIR}")
        print("如需回滚，请使用备份文件恢复")
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        print("请检查错误并重试，或使用备份恢复")
        raise
    finally:
        server_conn.close()
        local_conn.close()

if __name__ == '__main__':
    main()
