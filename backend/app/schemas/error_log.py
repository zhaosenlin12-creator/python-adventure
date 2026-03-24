"""
错误日志Schema
定义API请求和响应的数据结构
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any
from datetime import datetime


class ErrorLogCreate(BaseModel):
    """创建错误日志的请求体"""
    error_message: str = Field(..., max_length=1000, description="错误信息")
    error_stack: Optional[str] = Field(None, description="错误堆栈")
    error_type: str = Field(
        default="js_error", 
        pattern="^(js_error|promise_rejection|react_error|api_error)$",
        description="错误类型"
    )
    page_url: str = Field(..., max_length=500, description="发生页面URL")
    user_agent: Optional[str] = Field(None, max_length=500, description="浏览器User-Agent")
    user_id: Optional[int] = Field(None, description="用户ID")
    extra_data: Optional[dict[str, Any]] = Field(None, description="额外信息")


class ErrorLogResponse(BaseModel):
    """错误日志响应"""
    id: int
    error_message: str
    error_stack: Optional[str]
    error_type: str
    page_url: str
    user_agent: Optional[str]
    user_id: Optional[int]
    extra_data: Optional[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ErrorLogListResponse(BaseModel):
    """错误日志列表响应"""
    total: int
    items: list[ErrorLogResponse]


class ErrorLogStats(BaseModel):
    """错误统计信息"""
    total_errors: int
    errors_today: int
    errors_by_type: dict[str, int]
    top_errors: list[dict[str, Any]]
