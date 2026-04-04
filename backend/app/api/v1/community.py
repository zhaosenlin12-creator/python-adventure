"""
Community Level API路由
提供社区关卡的浏览、发布、游玩、点赞功能

Requirements: 1.1, 1.2, 1.5, 2.1, 2.3, 3.3, 4.1, 4.3, 5.1, 5.2
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
import logging
import threading

from app.core.database import get_db
from app.api.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.custom_level import CustomLevel
from app.models.level_like import LevelLike
from app.services.workshop_service import WorkshopEarningsService
from app.schemas.community import (
    CommunityLevelSummary,
    CommunityLevelDetail,
    CommunityLevelListResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ==================== 🔒 发布数量限制 ====================
MAX_PUBLISHED_LEVELS_PER_USER = 10  # 每用户最多发布10个关卡到社区

# ==================== 🔒 API速率限制 ====================

RATE_LIMIT_CONFIG = {
    "list": {"max_requests": 60, "window_seconds": 60},      # 每分钟最多查询60次
    "get": {"max_requests": 120, "window_seconds": 60},      # 每分钟最多获取120次
    "publish": {"max_requests": 10, "window_seconds": 60},   # 每分钟最多发布10次
    "play": {"max_requests": 60, "window_seconds": 60},      # 每分钟最多记录60次游玩
    "like": {"max_requests": 30, "window_seconds": 60},      # 每分钟最多点赞30次
}

_rate_limit_history: Dict[int, Dict[str, List[datetime]]] = {}
_rate_limit_lock = threading.Lock()


def check_rate_limit(user_id: int, action: str) -> bool:
    """检查用户是否超过速率限制"""
    config = RATE_LIMIT_CONFIG.get(action)
    if not config:
        return True
    
    now = datetime.now()
    window = timedelta(seconds=config["window_seconds"])
    max_requests = config["max_requests"]
    
    with _rate_limit_lock:
        if user_id not in _rate_limit_history:
            _rate_limit_history[user_id] = {}
        if action not in _rate_limit_history[user_id]:
            _rate_limit_history[user_id][action] = []
        
        _rate_limit_history[user_id][action] = [
            t for t in _rate_limit_history[user_id][action]
            if now - t < window
        ]
        
        if len(_rate_limit_history[user_id][action]) >= max_requests:
            return False
        
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


# ==================== 社区关卡浏览 API ====================


@router.get("/community/levels", response_model=CommunityLevelListResponse)
async def list_community_levels(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=20, description="每页数量，最大20"),
    sort: str = Query("newest", description="排序方式: newest, most_played, difficulty"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    获取社区关卡列表（分页）
    
    Requirements: 2.1, 2.3, 5.1, 5.2
    """
    # 🔒 速率限制检查（匿名用户使用ID 0）
    user_id = current_user.id if current_user else 0
    if not check_rate_limit(user_id, "list"):
        reset_seconds = get_rate_limit_reset_time(user_id, "list")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 基础查询：只查询已发布的关卡
    query = db.query(CustomLevel).filter(CustomLevel.is_published == True)
    
    # 获取总数
    total = query.count()
    
    # 排序
    if sort == "newest":
        query = query.order_by(desc(CustomLevel.published_at))
    elif sort == "most_played":
        query = query.order_by(desc(CustomLevel.play_count))
    elif sort == "difficulty":
        query = query.order_by(asc(CustomLevel.difficulty))
    else:
        query = query.order_by(desc(CustomLevel.published_at))
    
    # 分页
    offset = (page - 1) * limit
    levels = query.offset(offset).limit(limit).all()
    
    # 获取当前用户的点赞记录
    liked_level_ids = set()
    if current_user:
        likes = db.query(LevelLike.level_id).filter(
            LevelLike.user_id == current_user.id,
            LevelLike.level_id.in_([l.id for l in levels])
        ).all()
        liked_level_ids = {like.level_id for like in likes}
    
    # 构建响应
    level_summaries = []
    for level in levels:
        summary = CommunityLevelSummary(
            id=level.id,
            name=level.name,
            description=level.description,
            difficulty=level.difficulty,
            author_name=level.user.username if level.user else "未知用户",
            author_id=level.user_id,
            play_count=level.play_count,
            like_count=level.like_count,
            published_at=level.published_at,
            is_liked=level.id in liked_level_ids
        )
        level_summaries.append(summary)
    
    has_more = (page * limit) < total
    
    return CommunityLevelListResponse(
        levels=level_summaries,
        total=total,
        page=page,
        limit=limit,
        has_more=has_more
    )


@router.get("/community/publish-status")
async def get_publish_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的发布状态
    
    返回已发布数量和最大限制，用于前端显示友好提示
    """
    published_count = db.query(func.count(CustomLevel.id)).filter(
        CustomLevel.user_id == current_user.id,
        CustomLevel.is_published == True
    ).scalar()
    
    return {
        "published_count": published_count,
        "max_published": MAX_PUBLISHED_LEVELS_PER_USER,
        "can_publish": published_count < MAX_PUBLISHED_LEVELS_PER_USER,
        "remaining": MAX_PUBLISHED_LEVELS_PER_USER - published_count
    }


@router.get("/community/levels/{level_id}", response_model=CommunityLevelDetail)
async def get_community_level(
    level_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    获取社区关卡详情
    
    Requirements: 2.1, 5.2
    """
    # 🔒 速率限制检查
    user_id = current_user.id if current_user else 0
    if not check_rate_limit(user_id, "get"):
        reset_seconds = get_rate_limit_reset_time(user_id, "get")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 查询已发布的关卡
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.is_published == True
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在"
        )
    
    # 检查当前用户是否已点赞
    is_liked = False
    if current_user:
        like = db.query(LevelLike).filter(
            LevelLike.user_id == current_user.id,
            LevelLike.level_id == level_id
        ).first()
        is_liked = like is not None
    
    return CommunityLevelDetail(
        id=level.id,
        name=level.name,
        description=level.description,
        difficulty=level.difficulty,
        author_name=level.user.username if level.user else "未知用户",
        author_id=level.user_id,
        play_count=level.play_count,
        like_count=level.like_count,
        published_at=level.published_at,
        is_liked=is_liked,
        map_width=level.map_width,
        map_height=level.map_height,
        level_data=level.level_data
    )



# ==================== 发布/取消发布 API ====================


@router.post("/custom-levels/{level_id}/publish")
async def publish_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    发布关卡到社区
    
    Requirements: 1.1, 1.2
    Security: 发布数量限制、速率限制
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "publish"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "publish")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"发布过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 🔒 检查用户已发布关卡数量
    published_count = db.query(func.count(CustomLevel.id)).filter(
        CustomLevel.user_id == current_user.id,
        CustomLevel.is_published == True
    ).scalar()
    
    if published_count >= MAX_PUBLISHED_LEVELS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"已达到发布上限（最多 {MAX_PUBLISHED_LEVELS_PER_USER} 个），请先取消发布一些旧关卡或删除不需要的关卡"
        )
    
    # 查询关卡并验证所有权
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.user_id == current_user.id
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在或无权操作此关卡"
        )
    
    if level.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="关卡已发布"
        )
    
    # 发布关卡
    level.is_published = True
    level.published_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(level)
    
    return {
        "success": True,
        "message": "关卡已发布到社区",
        "published_at": level.published_at.isoformat(),
        "published_count": published_count + 1,
        "max_published": MAX_PUBLISHED_LEVELS_PER_USER
    }


@router.post("/custom-levels/{level_id}/unpublish")
async def unpublish_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    取消发布关卡
    
    Requirements: 1.5
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "publish"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "publish")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"操作过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 查询关卡并验证所有权
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.user_id == current_user.id
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在或无权操作此关卡"
        )
    
    if not level.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="关卡未发布"
        )
    
    # 取消发布（保留关卡数据）
    level.is_published = False
    # 保留 published_at 以便追踪历史
    
    db.commit()
    
    return {
        "success": True,
        "message": "关卡已从社区移除"
    }


# ==================== 游玩记录 API ====================


@router.post("/community/levels/{level_id}/play")
async def record_play(
    level_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    记录关卡游玩（原子递增 play_count）
    
    Requirements: 3.3
    """
    # 🔒 速率限制检查
    user_id = current_user.id if current_user else 0
    if not check_rate_limit(user_id, "play"):
        reset_seconds = get_rate_limit_reset_time(user_id, "play")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 查询已发布的关卡
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.is_published == True
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在"
        )
    
    # 原子递增 play_count
    db.query(CustomLevel).filter(
        CustomLevel.id == level_id
    ).update(
        {CustomLevel.play_count: CustomLevel.play_count + 1},
        synchronize_session=False
    )
    db.commit()
    
    # 获取更新后的值
    db.refresh(level)
    
    # 🪙 发放创作者金币奖励（仅登录用户触发）
    if current_user and level.user_id:
        try:
            WorkshopEarningsService.record_play(
                db=db,
                level_id=level.id,
                creator_id=level.user_id,
                player_id=current_user.id
            )
        except Exception as e:
            logger.warning("Community play reward failed for level %s: %s", level.id, e)
    
    return {
        "success": True,
        "play_count": level.play_count
    }


# ==================== 点赞/取消点赞 API ====================


@router.post("/community/levels/{level_id}/like")
async def like_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    点赞关卡
    
    Requirements: 4.1
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "like"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "like")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"操作过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 查询已发布的关卡
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.is_published == True
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在"
        )
    
    # 检查是否已点赞
    existing_like = db.query(LevelLike).filter(
        LevelLike.user_id == current_user.id,
        LevelLike.level_id == level_id
    ).first()
    
    if existing_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已点赞"
        )
    
    # 创建点赞记录
    new_like = LevelLike(
        user_id=current_user.id,
        level_id=level_id
    )
    db.add(new_like)
    
    # 原子递增 like_count
    db.query(CustomLevel).filter(
        CustomLevel.id == level_id
    ).update(
        {CustomLevel.like_count: CustomLevel.like_count + 1},
        synchronize_session=False
    )
    
    db.commit()
    db.refresh(level)
    
    # 🪙 发放创作者金币奖励
    if level.user_id:
        try:
            WorkshopEarningsService.record_like(
                db=db,
                level_id=level.id,
                creator_id=level.user_id,
                player_id=current_user.id
            )
        except Exception as e:
            logger.warning("Community like reward failed for level %s: %s", level.id, e)
    
    return {
        "success": True,
        "like_count": level.like_count
    }


@router.delete("/community/levels/{level_id}/like")
async def unlike_level(
    level_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    取消点赞关卡
    
    Requirements: 4.3
    """
    # 🔒 速率限制检查
    if not check_rate_limit(current_user.id, "like"):
        reset_seconds = get_rate_limit_reset_time(current_user.id, "like")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"操作过于频繁，请 {reset_seconds} 秒后再试"
        )
    
    # 查询已发布的关卡
    level = db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.is_published == True
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="关卡不存在"
        )
    
    # 查找点赞记录
    existing_like = db.query(LevelLike).filter(
        LevelLike.user_id == current_user.id,
        LevelLike.level_id == level_id
    ).first()
    
    if not existing_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未点赞"
        )
    
    # 删除点赞记录
    db.delete(existing_like)
    
    # 原子递减 like_count（确保不小于0）
    db.query(CustomLevel).filter(
        CustomLevel.id == level_id,
        CustomLevel.like_count > 0
    ).update(
        {CustomLevel.like_count: CustomLevel.like_count - 1},
        synchronize_session=False
    )
    
    db.commit()
    db.refresh(level)
    
    return {
        "success": True,
        "like_count": level.like_count
    }
