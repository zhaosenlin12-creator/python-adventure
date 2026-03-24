"""
错误日志表迁移脚本
创建 error_logs 表用于存储前端上报的错误信息
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import inspect
from app.core.database import engine, Base
from app.models.error_log import ErrorLog

def migrate():
    """创建错误日志表"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if 'error_logs' in existing_tables:
        print("✅ error_logs 表已存在，跳过创建")
        return
    
    print("📦 正在创建 error_logs 表...")
    
    # 只创建 ErrorLog 表
    ErrorLog.__table__.create(engine, checkfirst=True)
    
    print("✅ error_logs 表创建成功！")
    print("\n表结构：")
    print("  - id: 主键")
    print("  - error_message: 错误信息")
    print("  - error_stack: 错误堆栈")
    print("  - error_type: 错误类型 (js_error, promise_rejection, react_error, api_error)")
    print("  - page_url: 发生页面URL")
    print("  - user_agent: 浏览器信息")
    print("  - user_id: 用户ID（可选）")
    print("  - extra_data: 额外信息（JSON）")
    print("  - created_at: 创建时间")

if __name__ == "__main__":
    migrate()
