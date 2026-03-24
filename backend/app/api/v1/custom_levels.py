"""
CustomLevel API路由
提供自定义关卡的CRUD操作端点

Requirements: 11.3, 12.1
Security: 关卡数量限制、用户权限验证、API速率限制
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from datetime import datetime, timedelta
import threading

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.custom_level import CustomLevel
from app.schemas.custom_level import (
    CustomLevelCreate,
    CustomLevelUpdate,
    CustomLevelResponse,
    CustomLevelSummary,
    MAX_LEVELS_PER_USER
)

router = APIRouter()

# ==================== 🔒 API速率限制 ====================
# 内存存储，服务重启后重置（对于100人规模足够）

# 速率限制配置（宽松设置，保证正常使用）
RATE_LIMIT_CONFIG = {
    "create": {"max_requests": 10, "window_seconds": 60},    # 每分钟最多创建10个关卡
    "update": {"max_requests": 30, "window_seconds": 60},    # 每分钟最多更新30次（自动保存）
    "delete": {"max_requests": 20, "window_seconds": 60},    # 每分钟最多删除20个
    "list": {"max_requests": 60, "window_seconds": 60},      # 每分钟最多查询60次
    "get": {"max_requests": 120, "window_seconds": 60},      # 每分钟最多获取120次
}

# 用户请求历史 {user_id: {action: [timestamp, ...]}}
_rate_limit_history: Dict[int, Dict[str, List[datetime]]] = {}
_rate_limit_lock = threading.Lock()


def check_rate_limit(user_id: int, action: str) -> bool:
    """
    检查用户是否超过速率限制
    返回 True 表示允许请求，False 表示被限制
    """
    config = RATE_LIMIT_CONFIG.get(action)
    if not config:
        return True
    
    now = datetime.now()
    window = timedelta(seconds=config["window_seconds"])
    max_requests = config["max_requests"]
    
    with _rate_limit_lock:
        # 初始化用户记录
        if user_id not in _rate_limit_history:
            _rate_limit_history[user_id] = {}
        if action not in _rate_limit_history[user_id]:
            _rate_limit_history[user_id][action] = []
        
        # 清理过期记录
        _rate_limit_history[user_id][action] = [
            t for t in _rate_limit_history[user_id][action]
            if now - t < window
        ]
        
        # 检查是否超限
        if len(_rate_limit_history[user_id][action]) >= max_requests:
            return False
        
        # 记录本次请求
        _rate_limit_history[user_id][action].append(now)
        return True


def get_rate_limit_reset_time(user_id: int, action: str) -> int:
    """获取速率限制重置剩余秒数"""
    config = RATE_LIMIT_CONFIG.get(action)
    if not config:
        return 0
    
    with _rate_limit_lock:
        if user_id not in _rate_limit_history:
            return 0
        if action not in _rate_limit_history[user_id]:
            return 0
        
        history = _rate_limit_history[user_id][action]
        if not history:
            return 0
        
        oldest = min(history)
        reset_time = oldest + timedelta(seconds=config["window_seconds"])
        remaining = (reset_time - datetime.now()).total_seconds()
        return max(0, int(remaining))


# ==================== API端点 ====================


@router.post("/custom-levels", response_model=CustomLevelResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_level(
    level_data: CustomLevelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新的自定义关卡
    
    Requirements: 11.1, 11.2, 11.3
    Security: 检查用户关卡数量限制、API速率限制
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "create"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "create")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"创建关卡过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 🔒 安全检查：用户关卡数量限制
    user_level_count = db.query(func.count(CustomLevel.id)).filter(
        CustomLevel.user_id == current_user.id
    ).scalar()
    
    if user_level_count >= MAX_LEVELS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"已达到关卡数量上限 ({MAX_LEVELS_PER_USER} 个)，请删除一些旧关卡后再创建新关卡"
        )
    
    # 创建新关卡
    new_level = CustomLevel(
        user_id=current_user.id,
        name=level_data.name,
        description=level_data.description,
        difficulty=level_data.difficulty,
        map_width=level_data.map_width,
        map_height=level_data.map_height,
        level_data=level_data.level_data
    )
    
    db.add(new_level)
    db.commit()
    db.refresh(new_level)
    
    return new_level


@router.get("/custom-levels", response_model=List[CustomLevelSummary])
async def list_custom_levels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有自定义关卡列表
    
    Requirements: 12.1
    Security: API速率限制
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "list"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "list")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    levels = db.query(CustomLevel).filter(
        CustomLevel.user_id == current_user.id
    ).order_by(CustomLevel.updated_at.desc()).all()
    
    return levels


@router.get("/custom-levels/{level_id}", response_model=CustomLevelResponse)
async def get_custom_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定关卡的完整数据
    
    Requirements: 12.2, 12.3
    Security: API速率限制
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "get"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "get")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.user_id == current_user.id
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在或无权访问"
        )
    
    return level


@router.put("/custom-levels/{level_id}", response_model=CustomLevelResponse)
async def update_custom_level(
    level_id: str,
    level_data: CustomLevelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新自定义关卡
    
    Requirements: 11.3
    Security: API速率限制
    """
    # 🔒 速率限制检查（更新操作限制宽松，支持自动保存）
    if not check_rate_limit(current_user.id, "update"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "update")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"保存过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.user_id == current_user.id
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在或无权访问"
        )
    
    # 更新非空字段
    update_data = level_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(level, field, value)
    
    db.commit()
    db.refresh(level)
    
    return level


@router.delete("/custom-levels/{level_id}")
async def delete_custom_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除自定义关卡
    
    Requirements: 11.3
    Security: API速率限制
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "delete"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "delete")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"删除过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.user_id == current_user.id
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在或无权访问"
        )
    
    db.delete(level)
    db.commit()
    
    return {"success": True, "message": "关卡已删除"}
