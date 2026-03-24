"""
聊天记录清理脚本
每天运行一次，清理前一天的聊天记录

使用方法：
1. 手动运行: python cleanup_chat.py
2. 定时任务 (crontab): 0 2 * * * cd /www/wwwroot/game-backend && /path/to/python cleanup_chat.py
"""

import sys
import os
from datetime import datetime, timedelta

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.chat import ChatMessage, UserChatLimit

def cleanup_old_messages():
    """清理超过1天的聊天记录"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # 计算截止时间（1天前）
        cutoff_time = datetime.now() - timedelta(days=1)
        
        # 删除旧消息
        deleted_messages = db.query(ChatMessage).filter(
            ChatMessage.created_at < cutoff_time
        ).delete(synchronize_session=False)
        
        # 删除旧的发言限制记录（保留今天的）
        today = datetime.now().date().isoformat()
        deleted_limits = db.query(UserChatLimit).filter(
            UserChatLimit.date != today
        ).delete(synchronize_session=False)
        
        db.commit()
        
        print(f"[{datetime.now()}] 清理完成:")
        print(f"  - 删除聊天消息: {deleted_messages} 条")
        print(f"  - 删除发言限制记录: {deleted_limits} 条")
        
    except Exception as e:
        print(f"[{datetime.now()}] 清理失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_old_messages()
