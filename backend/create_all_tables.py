"""
创建所有数据库表
"""
import sys
import io
# 修复Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append('.')

# 导入所有模型以确保表被创建
from app.models import *  # 这会导入所有模型
from app.core.database import Base, engine

print("创建所有数据库表...")
Base.metadata.create_all(bind=engine)
print("✅ 所有数据库表创建成功！")






