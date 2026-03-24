"""
初始化聊天相关数据库表

运行方法: python init_chat_tables.py
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
from app.models.chat import ChatMessage, UserChatLimit

def init_chat_tables():
    """创建聊天相关表"""
    print("正在创建聊天相关数据库表...")
    
    # 只创建聊天相关的表
    ChatMessage.__table__.create(engine, checkfirst=True)
    UserChatLimit.__table__.create(engine, checkfirst=True)
    
    print("聊天表创建完成!")
    print("  - chat_messages")
    print("  - user_chat_limits")

if __name__ == "__main__":
    init_chat_tables()
