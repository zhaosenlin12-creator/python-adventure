"""
错误日志API
提供错误上报和查询接口
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional
import logging

from app.core.database import get_db
from app.models.error_log import ErrorLog
from app.schemas.error_log import (
    ErrorLogCreate, 
    ErrorLogResponse, 
    ErrorLogListResponse,
    ErrorLogStats
)
from app.api.dependencies import get_optional_current_user
from app.models.user import User

router = APIRouter(prefix="/error-logs", tags=["错误日志"])
logger = logging.getLogger(__name__)

# 速率限制：每个IP每分钟最多上报10条错误
_rate_limit_cache: dict[str, list[datetime]] = {}
RATE_LIMIT_WINDOW = 60  # 秒
RATE_LIMIT_MAX = 10  # 最大请求数


def check_rate_limit(client_ip: str) -> bool:
    """检查速率限制"""
    now = datetime.now()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    if client_ip not in _rate_limit_cache:
        _rate_limit_cache[client_ip] = []
    
    # 清理过期记录
    _rate_limit_cache[client_ip] = [
        t for t in _rate_limit_cache[client_ip] if t > window_start
    ]
    
    if len(_rate_limit_cache[client_ip]) >= RATE_LIMIT_MAX:
        return False
    
    _rate_limit_cache[client_ip].append(now)
    return True


@router.post("/report", response_model=dict)
async def report_error(
    error_data: ErrorLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    上报前端错误
    - 无需认证，但有速率限制
    - 自动记录客户端IP
    """
    # 获取客户端IP
    client_ip = request.client.host if request.client else "unknown"
    
    # 速率限制检查
    if not check_rate_limit(client_ip):
        return {"success": False, "message": "请求过于频繁，请稍后再试"}
    
    try:
        # 创建错误日志
        error_log = ErrorLog(
            error_message=error_data.error_message[:1000],  # 截断过长信息
            error_stack=error_data.error_stack[:5000] if error_data.error_stack else None,
            error_type=error_data.error_type,
            page_url=error_data.page_url[:500],
            user_agent=error_data.user_agent[:500] if error_data.user_agent else None,
            user_id=current_user.id if current_user else error_data.user_id,
            extra_data=error_data.extra_data
        )
        
        db.add(error_log)
        db.commit()
        
        # 记录到服务器日志（WARNING级别，便于排查）
        logger.warning(
            f"[ErrorReport] type={error_data.error_type} "
            f"url={error_data.page_url} "
            f"msg={error_data.error_message[:100]}"
        )
        
        return {"success": True, "id": error_log.id}
        
    except Exception as e:
        logger.error(f"保存错误日志失败: {e}")
        db.rollback()
        return {"success": False, "message": "保存失败"}


@router.get("/list", response_model=ErrorLogListResponse)
async def list_errors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    error_type: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=30, description="查询最近N天的数据")
):
    """
    查询错误日志列表（需要管理员权限，暂时开放）
    """
    # 基础查询
    query = db.query(ErrorLog)
    
    # 时间范围过滤
    start_date = datetime.now() - timedelta(days=days)
    query = query.filter(ErrorLog.created_at >= start_date)
    
    # 错误类型过滤
    if error_type:
        query = query.filter(ErrorLog.error_type == error_type)
    
    # 总数
    total = query.count()
    
    # 分页
    items = query.order_by(desc(ErrorLog.created_at)) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    return ErrorLogListResponse(total=total, items=items)


@router.get("/stats", response_model=ErrorLogStats)
async def get_error_stats(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=30)
):
    """
    获取错误统计信息
    """
    start_date = datetime.now() - timedelta(days=days)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 总错误数
    total_errors = db.query(ErrorLog).filter(
        ErrorLog.created_at >= start_date
    ).count()
    
    # 今日错误数
    errors_today = db.query(ErrorLog).filter(
        ErrorLog.created_at >= today_start
    ).count()
    
    # 按类型统计
    type_stats = db.query(
        ErrorLog.error_type,
        func.count(ErrorLog.id).label('count')
    ).filter(
        ErrorLog.created_at >= start_date
    ).group_by(ErrorLog.error_type).all()
    
    errors_by_type = {stat.error_type: stat.count for stat in type_stats}
    
    # Top错误（按错误信息分组）
    top_errors_query = db.query(
        ErrorLog.error_message,
        ErrorLog.error_type,
        func.count(ErrorLog.id).label('count')
    ).filter(
        ErrorLog.created_at >= start_date
    ).group_by(
        ErrorLog.error_message, ErrorLog.error_type
    ).order_by(desc('count')).limit(10).all()
    
    top_errors = [
        {
            "message": err.error_message[:100],
            "type": err.error_type,
            "count": err.count
        }
        for err in top_errors_query
    ]
    
    return ErrorLogStats(
        total_errors=total_errors,
        errors_today=errors_today,
        errors_by_type=errors_by_type,
        top_errors=top_errors
    )


@router.delete("/cleanup")
async def cleanup_old_logs(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=90, description="删除N天前的日志")
):
    """
    清理旧日志（保留最近N天）
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    deleted_count = db.query(ErrorLog).filter(
        ErrorLog.created_at < cutoff_date
    ).delete()
    
    db.commit()
    
    logger.info(f"清理了 {deleted_count} 条旧错误日志")
    
    return {"success": True, "deleted_count": deleted_count}
