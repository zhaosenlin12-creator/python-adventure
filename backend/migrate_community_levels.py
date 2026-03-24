"""
迁移脚本：为社区关卡功能添加数据库支持
- 为 custom_levels 表添加社区相关字段
- 创建 level_likes 表

Requirements: 1.1, 4.1

使用方法：
    python migrate_community_levels.py
    python migrate_community_levels.py --info
    python migrate_community_levels.py --rollback
"""
import sqlite3
import os
import sys

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "code_adventure.db")


def migrate_community_levels():
    """执行社区关卡迁移"""
    print(f"🔄 开始社区关卡迁移: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        print("💡 提示: 请先运行 init_database.py 初始化数据库")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. 检查 custom_levels 表是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='custom_levels'
        """)
        
        if not cursor.fetchone():
            print("❌ custom_levels 表不存在!")
            print("💡 提示: 请先运行 migrate_custom_levels.py")
            return False
        
        # 2. 为 custom_levels 表添加社区字段
        print("\n📝 检查 custom_levels 表社区字段...")
        cursor.execute("PRAGMA table_info(custom_levels)")
        existing_columns = {col[1] for col in cursor.fetchall()}
        
        community_columns = [
            ('is_published', 'BOOLEAN DEFAULT 0'),
            ('play_count', 'INTEGER DEFAULT 0'),
            ('like_count', 'INTEGER DEFAULT 0'),
            ('published_at', 'DATETIME')
        ]
        
        for col_name, col_def in community_columns:
            if col_name not in existing_columns:
                print(f"   添加列: {col_name}")
                cursor.execute(f"ALTER TABLE custom_levels ADD COLUMN {col_name} {col_def}")
            else:
                print(f"   列已存在: {col_name}")
        
        # 3. 创建社区相关索引
        print("\n📝 创建社区相关索引...")
        
        # 检查索引是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND tbl_name='custom_levels'
        """)
        existing_indexes = {idx[0] for idx in cursor.fetchall()}
        
        if 'idx_custom_levels_is_published' not in existing_indexes:
            cursor.execute("""
                CREATE INDEX idx_custom_levels_is_published 
                ON custom_levels(is_published)
            """)
            print("   ✅ 创建索引: idx_custom_levels_is_published")
        else:
            print("   索引已存在: idx_custom_levels_is_published")
        
        if 'idx_custom_levels_published_at' not in existing_indexes:
            cursor.execute("""
                CREATE INDEX idx_custom_levels_published_at 
                ON custom_levels(is_published, published_at DESC)
            """)
            print("   ✅ 创建索引: idx_custom_levels_published_at")
        else:
            print("   索引已存在: idx_custom_levels_published_at")
        
        # 4. 创建 level_likes 表
        print("\n📝 检查 level_likes 表...")
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='level_likes'
        """)
        
        if not cursor.fetchone():
            print("   创建 level_likes 表...")
            cursor.execute("""
                CREATE TABLE level_likes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    level_id VARCHAR(36) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (level_id) REFERENCES custom_levels(id) ON DELETE CASCADE,
                    UNIQUE (user_id, level_id)
                )
            """)
            print("   ✅ level_likes 表创建成功")
            
            # 创建索引
            cursor.execute("""
                CREATE INDEX idx_level_likes_user_id 
                ON level_likes(user_id)
            """)
            print("   ✅ 创建索引: idx_level_likes_user_id")
            
            cursor.execute("""
                CREATE INDEX idx_level_likes_level_id 
                ON level_likes(level_id)
            """)
            print("   ✅ 创建索引: idx_level_likes_level_id")
        else:
            print("   level_likes 表已存在")
        
        conn.commit()
        print("\n✅ 社区关卡迁移完成!")
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def show_info():
    """显示社区关卡相关表信息"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 显示 custom_levels 表社区字段
    print("\n📋 custom_levels 表结构:")
    cursor.execute("PRAGMA table_info(custom_levels)")
    columns = cursor.fetchall()
    print(f"{'列名':<20} {'类型':<20} {'非空':<5} {'默认值':<20}")
    print("-" * 70)
    for col in columns:
        cid, name, col_type, notnull, default, pk = col
        print(f"{name:<20} {col_type:<20} {bool(notnull):<5} {str(default):<20}")
    
    # 显示 custom_levels 索引
    print("\n📋 custom_levels 索引:")
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='custom_levels'
    """)
    for idx in cursor.fetchall():
        print(f"  - {idx[0]}")
    
    # 检查 level_likes 表
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='level_likes'
    """)
    
    if cursor.fetchone():
        print("\n📋 level_likes 表结构:")
        cursor.execute("PRAGMA table_info(level_likes)")
        columns = cursor.fetchall()
        print(f"{'列名':<20} {'类型':<20} {'非空':<5} {'默认值':<20}")
        print("-" * 70)
        for col in columns:
            cid, name, col_type, notnull, default, pk = col
            print(f"{name:<20} {col_type:<20} {bool(notnull):<5} {str(default):<20}")
        
        # 显示 level_likes 索引
        print("\n📋 level_likes 索引:")
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND tbl_name='level_likes'
        """)
        for idx in cursor.fetchall():
            print(f"  - {idx[0]}")
        
        # 显示记录数
        cursor.execute("SELECT COUNT(*) FROM level_likes")
        count = cursor.fetchone()[0]
        print(f"\n📊 level_likes 记录数: {count}")
    else:
        print("\n❌ level_likes 表不存在")
    
    # 显示已发布关卡数
    cursor.execute("""
        SELECT COUNT(*) FROM custom_levels WHERE is_published = 1
    """)
    published_count = cursor.fetchone()[0]
    print(f"\n📊 已发布关卡数: {published_count}")
    
    conn.close()


def rollback():
    """回滚社区关卡迁移（危险操作）"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return False
    
    confirm = input("⚠️ 确定要回滚社区关卡迁移吗？level_likes 表将被删除！(输入 'yes' 确认): ")
    if confirm.lower() != 'yes':
        print("❌ 操作已取消")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 删除 level_likes 表
        cursor.execute("DROP TABLE IF EXISTS level_likes")
        print("✅ level_likes 表已删除")
        
        # 注意：SQLite 不支持 DROP COLUMN，所以社区字段无法删除
        # 这些字段会保留但不会影响现有功能
        print("⚠️ 注意: custom_levels 表的社区字段无法删除（SQLite 限制）")
        print("   这些字段会保留但不会影响现有功能")
        
        conn.commit()
        print("\n✅ 回滚完成!")
        return True
    except Exception as e:
        print(f"❌ 回滚失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--info":
            show_info()
        elif sys.argv[1] == "--rollback":
            rollback()
        elif sys.argv[1] == "--help":
            print("用法:")
            print("  python migrate_community_levels.py            # 执行迁移")
            print("  python migrate_community_levels.py --info     # 显示表信息")
            print("  python migrate_community_levels.py --rollback # 回滚迁移（危险）")
            print("  python migrate_community_levels.py --help     # 显示帮助")
        else:
            print(f"未知参数: {sys.argv[1]}")
            print("使用 --help 查看帮助")
    else:
        success = migrate_community_levels()
        sys.exit(0 if success else 1)
