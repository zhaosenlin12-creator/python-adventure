import logging
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.cache import cache_leaderboard, get_cached_leaderboard, invalidate_leaderboard_cache
from app.models.user import User
from app.models.user_task import UserTask
from app.api.dependencies import get_current_user
from app.services.coin_service import CoinService, CoinRewardCalculator
from app.utils.transaction_id import generate_arena_transaction_id

router = APIRouter()
logger = logging.getLogger(__name__)

class ScoreSubmission(BaseModel):
    user_id: int | None = None
    username: str | None = None
    challenge_id: str
    score: int
    time_used: int
    code_length: int

@router.get("/global")
async def get_global_leaderboard(
    limit: int = Query(50, le=100),
    sort_by: str = Query("level", pattern="^(level|experience|tasks)$"),
    db: Session = Depends(get_db)
):
    """获取全球排行榜（带缓存）
    
    Args:
        limit: 返回数量，最大100
        sort_by: 排序方式 (level=等级, experience=经验, tasks=完成任务数)
    """
    
    # 🔧 优化：先检查缓存
    cache_key = f"global_{sort_by}_{limit}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return cached
    
    if sort_by == "tasks":
        # 按完成任务数排序
        users_with_tasks = db.query(
            User,
            func.count(UserTask.id).label('task_count')
        ).outerjoin(
            UserTask, 
            (User.id == UserTask.user_id) & (UserTask.status == 'completed')
        ).group_by(User.id).order_by(
            desc('task_count'),
            desc(User.level)
        ).limit(limit).all()
        
        leaderboard = []
        for rank, (user, task_count) in enumerate(users_with_tasks, 1):
            leaderboard.append({
                "rank": rank,
                "user_id": user.id,
                "username": user.username,
                "level": user.level,
                "experience": user.experience,
                "completed_tasks": task_count,
                "rank_title": user.get_rank_title()
            })
    else:
        # 按等级或经验排序
        order_field = User.experience if sort_by == "experience" else User.level
        users = db.query(User).order_by(
            desc(order_field),
            desc(User.experience) if sort_by != "experience" else desc(User.level)
        ).limit(limit).all()
        
        leaderboard = []
        for rank, user in enumerate(users, 1):
            # 获取完成的任务数
            task_count = db.query(UserTask).filter(
                UserTask.user_id == user.id,
                UserTask.status == "completed"
            ).count()
            
            leaderboard.append({
                "rank": rank,
                "user_id": user.id,
                "username": user.username,
                "level": user.level,
                "experience": user.experience,
                "completed_tasks": task_count,
                "rank_title": user.get_rank_title()
            })
    
    # 🔧 优化：缓存结果
    cache_leaderboard(cache_key, leaderboard)
    
    return leaderboard


@router.post("/submit")
async def submit_arena_score(
    submission: ScoreSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交竞技场积分并发放金币奖励"""

    if submission.user_id is not None and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="禁止为其他用户提交积分"
        )
    try:
        # 获取用户
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 记录旧积分
        old_score = user.arena_score or 0
        
        # 更新竞技场积分
        user.arena_score = old_score + submission.score
        
        # 判断是否胜利（积分增加为正）
        is_win = submission.score > 0
        
        # 更新最高积分
        if user.arena_score > (user.arena_high_score or 0):
            user.arena_high_score = user.arena_score
        
        # 🪙 计算金币奖励
        coins_earned = CoinRewardCalculator.calculate_arena_reward(
            is_win=is_win,
            challenge_score=submission.score,
            time_used=submission.time_used
        )
        
        # 🪙 发放金币（使用transaction_id防重复）
        transaction_id = generate_arena_transaction_id(
            user.id,
            submission.challenge_id,
            score=submission.score,
            time_used=submission.time_used,
            code_length=submission.code_length
        )
        
        coin_awarded = False
        if coins_earned > 0:
            coin_awarded = CoinService.add_coins(
                db=db,
                user_id=user.id,
                amount=coins_earned,
                type='reward',
                source='arena_complete',
                description=f'竞技场挑战: {submission.challenge_id}',
                transaction_id=transaction_id
            )
        
        db.commit()
        
        # 🔧 优化：使排行榜缓存失效
        invalidate_leaderboard_cache()
        
        return {
            "success": True,
            "arena_score": user.arena_score,
            "arena_high_score": user.arena_high_score,
            "coins_earned": coins_earned,
            "coin_awarded": coin_awarded,
            "message": "Score submitted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(
            "[Leaderboard] 提交分数错误 user_id=%s challenge_id=%s",
            current_user.id,
            submission.challenge_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="提交失败，请稍后重试"
        ) from e


@router.get("/arena")
async def get_arena_leaderboard(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """获取竞技场排行榜（带缓存）
    
    Args:
        limit: 返回数量，最大100
    """
    
    # 🔧 优化：先检查缓存
    cache_key = f"arena_{limit}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return cached
    
    # 按竞技场积分排序
    users = db.query(User).order_by(
        desc(User.arena_score),
        desc(User.arena_high_score)
    ).limit(limit).all()
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
            "arena_score": user.arena_score or 0,
            "arena_high_score": user.arena_high_score or 0,
            "level": user.level,
            # 🔥 使用竞技场专用段位计算方法
            "rank_title": user.get_arena_rank_title()
        })
    
    # 🔧 优化：缓存结果
    cache_leaderboard(cache_key, leaderboard)
    
    return leaderboard
