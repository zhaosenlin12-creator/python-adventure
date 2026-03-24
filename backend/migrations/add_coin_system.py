"""
金币系统数据库迁移脚本
添加金币字段、金币交易记录表和工坊收益表
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from app.core.database import Base
from app.core.config import settings
from app.models.user import User
from app.models.coin import CoinTransaction, WorkshopEarning

def run_migration():
    """执行迁移"""
    print("🔄 开始金币系统数据库迁移...")
    
    # 创建数据库引擎
    db_url = settings.DATABASE_URL
    try:
        url = make_url(db_url)
        if url.drivername.startswith("sqlite"):
            db_path = Path(__file__).parent.parent / "code_adventure.db"
            db_url = f"sqlite:///{db_path}"
    except Exception:
        db_url = settings.DATABASE_URL
    engine = create_engine(db_url)
    
    try:
        with engine.connect() as conn:
            # 1. 检查users表是否已有coins字段
            print("\n📋 步骤1: 检查users表...")
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if 'coins' not in columns:
                print("  ➕ 添加coins字段到users表...")
                conn.execute(text("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 100"))
                conn.commit()
                print("  ✅ coins字段添加成功")
            else:
                print("  ℹ️  coins字段已存在,跳过")
            
            # 2. 创建coin_transactions表
            print("\n📋 步骤2: 创建coin_transactions表...")
            CoinTransaction.__table__.create(engine, checkfirst=True)
            print("  ✅ coin_transactions表创建成功")
            
            # 3. 创建workshop_earnings表
            print("\n📋 步骤3: 创建workshop_earnings表...")
            WorkshopEarning.__table__.create(engine, checkfirst=True)
            print("  ✅ workshop_earnings表创建成功")
            
            # 4. 为所有现有用户初始化coins=100(如果为NULL)
            print("\n📋 步骤4: 初始化现有用户金币...")
            result = conn.execute(text("UPDATE users SET coins = 100 WHERE coins IS NULL"))
            conn.commit()
            updated_count = result.rowcount
            print(f"  ✅ 已为 {updated_count} 个用户初始化金币")
            
            # 5. 验证迁移
            print("\n📋 步骤5: 验证迁移...")
            result = conn.execute(text("SELECT COUNT(*) FROM users WHERE coins IS NOT NULL"))
            user_count = result.scalar()
            print(f"  ✅ 验证通过: {user_count} 个用户拥有金币字段")
            
        print("\n✅ 金币系统数据库迁移完成!")
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

def rollback_migration():
    """回滚迁移"""
    print("🔄 开始回滚金币系统迁移...")
    
    db_url = settings.DATABASE_URL
    try:
        url = make_url(db_url)
        if url.drivername.startswith("sqlite"):
            db_path = Path(__file__).parent.parent / "code_adventure.db"
            db_url = f"sqlite:///{db_path}"
    except Exception:
        db_url = settings.DATABASE_URL
    engine = create_engine(db_url)
    
    try:
        with engine.connect() as conn:
            # 注意: SQLite不支持DROP COLUMN,所以只能删除表
            print("  ⚠️  警告: SQLite不支持删除列,只能删除表")
            
            # 删除表
            print("  🗑️  删除workshop_earnings表...")
            conn.execute(text("DROP TABLE IF EXISTS workshop_earnings"))
            
            print("  🗑️  删除coin_transactions表...")
            conn.execute(text("DROP TABLE IF EXISTS coin_transactions"))
            
            conn.commit()
            print("  ✅ 表删除成功")
            print("  ℹ️  注意: users表的coins字段无法删除(SQLite限制)")
            
        print("\n✅ 回滚完成!")
        return True
        
    except Exception as e:
        print(f"\n❌ 回滚失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='金币系统数据库迁移')
    parser.add_argument('--rollback', action='store_true', help='回滚迁移')
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
