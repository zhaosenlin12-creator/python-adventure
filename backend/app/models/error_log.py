"""
错误日志数据模型
用于存储前端上报的错误信息，便于监控和排查问题
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class ErrorLog(Base):
    """错误日志表"""
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # 错误基本信息
    error_message = Column(String(1000), nullable=False, comment="错误信息")
    error_stack = Column(Text, nullable=True, comment="错误堆栈")
    error_type = Column(String(50), nullable=False, default="js_error", comment="错误类型: js_error, promise_rejection, react_error, api_error")
    
    # 发生环境
    page_url = Column(String(500), nullable=False, comment="发生页面URL")
    user_agent = Column(String(500), nullable=True, comment="浏览器User-Agent")
    
    # 用户信息（可选）
    user_id = Column(Integer, nullable=True, index=True, comment="用户ID")
    
    # 额外数据（JSON格式，存储组件名、props等）
    extra_data = Column(JSON, nullable=True, comment="额外信息")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, type={self.error_type}, message={self.error_message[:50]}...)>"
