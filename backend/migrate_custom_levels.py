"""
迁移脚本：创建 custom_levels 表
用于存储玩家创建的自定义关卡数据

Requirements: 11.2

使用方法：
    python migrate_custom_levels.py
"""
import sqlite3
import os
import sys

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "code_adventure.db")


def create_custom_levels_table():
    """创建 custom_levels 表"""
    print(f"🔄 开始创建 custom_levels 表: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        print("💡 提示: 请先运行 init_database.py 初始化数据库")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查表是否已存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='custom_levels'
        """)
        
        if cursor.fetchone():
            print("ℹ️ custom_levels 表已存在，检查是否需要更新...")
            # 检查现有列
            cursor.execute("PRAGMA table_info(custom_levels)")
            columns = {col[1]: col[2] for col in cursor.fetchall()}
            print(f"   现有列: {list(columns.keys())}")
            
            # 检查是否缺少必要的列
            required_columns = {
                'id': 'VARCHAR(36)',
                'user_id': 'INTEGER',
                'name': 'VARCHAR(100)',
                'description': 'TEXT',
                'difficulty': 'INTEGER',
                'map_width': 'INTEGER',
                'map_height': 'INTEGER',
                'level_data': 'JSON',
                'created_at': 'DATETIME',
                'updated_at': 'DATETIME'
            }
            
            missing_columns = set(required_columns.keys()) - set(columns.keys())
            if missing_columns:
                print(f"⚠️ 缺少列: {missing_columns}")
                print("💡 建议: 删除表后重新创建，或手动添加缺少的列")
            else:
                print("✅ 表结构完整，无需更新")
            
            return True
        
        # 创建 custom_levels 表
        print("📝 创建 custom_levels 表...")
        cursor.execute("""
            CREATE TABLE custom_levels (
                id VARCHAR(36) PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                difficulty INTEGER DEFAULT 1,
                map_width INTEGER DEFAULT 800,
                map_height INTEGER DEFAULT 600,
                level_data JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("✅ custom_levels 表创建成功")
        
        # 创建索引以提高查询性能
        print("📝 创建索引...")
        cursor.execute("""
            CREATE INDEX idx_custom_levels_user_id 
            ON custom_levels(user_id)
        """)
        print("✅ 索引 idx_custom_levels_user_id 创建成功")
        
        cursor.execute("""
            CREATE INDEX idx_custom_levels_created_at 
            ON custom_levels(created_at DESC)
        """)
        print("✅ 索引 idx_custom_levels_created_at 创建成功")
        
        conn.commit()
        print("\n✅ 迁移完成!")
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def show_table_info():
    """显示 custom_levels 表信息（调试用）"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查表是否存在
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='custom_levels'
    """)
    
    if not cursor.fetchone():
        print("❌ custom_levels 表不存在")
        conn.close()
        return
    
    # 显示表结构
    print("\n📋 custom_levels 表结构:")
    cursor.execute("PRAGMA table_info(custom_levels)")
    columns = cursor.fetchall()
    print(f"{'列名':<20} {'类型':<15} {'非空':<5} {'默认值':<20} {'主键':<5}")
    print("-" * 70)
    for col in columns:
        cid, name, col_type, notnull, default, pk = col
        print(f"{name:<20} {col_type:<15} {bool(notnull):<5} {str(default):<20} {bool(pk):<5}")
    
    # 显示索引
    print("\n📋 索引:")
    cursor.execute("""
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND tbl_name='custom_levels'
    """)
    indexes = cursor.fetchall()
    for idx_name, idx_sql in indexes:
        print(f"  - {idx_name}")
    
    # 显示记录数
    cursor.execute("SELECT COUNT(*) FROM custom_levels")
    count = cursor.fetchone()[0]
    print(f"\n📊 记录数: {count}")
    
    conn.close()


def drop_table():
    """删除 custom_levels 表（危险操作，仅用于开发）"""
    if not os.path.exists(DB_PATH):
        print("❌ 数据库文件不存在!")
        return False
    
    confirm = input("⚠️ 确定要删除 custom_levels 表吗？所有数据将丢失！(输入 'yes' 确认): ")
    if confirm.lower() != 'yes':
        print("❌ 操作已取消")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS custom_levels")
        conn.commit()
        print("✅ custom_levels 表已删除")
        return True
    except Exception as e:
        print(f"❌ 删除失败: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--info":
            show_table_info()
        elif sys.argv[1] == "--drop":
            drop_table()
        elif sys.argv[1] == "--help":
            print("用法:")
            print("  python migrate_custom_levels.py          # 创建表")
            print("  python migrate_custom_levels.py --info   # 显示表信息")
            print("  python migrate_custom_levels.py --drop   # 删除表（危险）")
            print("  python migrate_custom_levels.py --help   # 显示帮助")
        else:
            print(f"未知参数: {sys.argv[1]}")
            print("使用 --help 查看帮助")
    else:
        success = create_custom_levels_table()
        sys.exit(0 if success else 1)
