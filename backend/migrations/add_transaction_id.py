"""
添加 transaction_id 字段到 coin_transactions 表
用于防止重复发放金币
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from app.core.config import settings

def run_migration():
    """执行迁移"""
    print("🔄 开始添加 transaction_id 字段...")
    
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
            # 1. 检查 coin_transactions 表是否已有 transaction_id 字段
            print("\n📋 步骤1: 检查 coin_transactions 表...")
            result = conn.execute(text("PRAGMA table_info(coin_transactions)"))
            columns = [row[1] for row in result]
            
            if 'transaction_id' not in columns:
                print("  ➕ 添加 transaction_id 字段...")
                conn.execute(text(
                    "ALTER TABLE coin_transactions ADD COLUMN transaction_id VARCHAR(100)"
                ))
                conn.commit()
                print("  ✅ transaction_id 字段添加成功")
                
                # 2. 创建唯一索引
                print("\n📋 步骤2: 创建唯一索引...")
                try:
                    conn.execute(text(
                        "CREATE UNIQUE INDEX idx_transaction_id ON coin_transactions(transaction_id) WHERE transaction_id IS NOT NULL"
                    ))
                    conn.commit()
                    print("  ✅ 唯一索引创建成功")
                except Exception as e:
                    print(f"  ⚠️  索引创建失败(可能已存在): {e}")
            else:
                print("  ℹ️  transaction_id 字段已存在,跳过")
            
            # 3. 验证迁移
            print("\n📋 步骤3: 验证迁移...")
            result = conn.execute(text("PRAGMA table_info(coin_transactions)"))
            columns = [row[1] for row in result]
            
            if 'transaction_id' in columns:
                print("  ✅ 验证通过: transaction_id 字段已存在")
            else:
                print("  ❌ 验证失败: transaction_id 字段不存在")
                return False
            
        print("\n✅ transaction_id 字段迁移完成!")
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
    print("🔄 开始回滚 transaction_id 字段...")
    print("  ⚠️  警告: SQLite 不支持删除列")
    print("  ℹ️  如需完全回滚,请删除整个 coin_transactions 表并重新创建")
    return True

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='添加 transaction_id 字段迁移')
    parser.add_argument('--rollback', action='store_true', help='回滚迁移')
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
