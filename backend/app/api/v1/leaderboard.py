import logging
import random
from datetime import datetime
from typing import List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.cache import (
    cache_leaderboard,
    get_cached_leaderboard,
    invalidate_leaderboard_cache,
)
from app.core.database import get_db
from app.models.progress import UserProgress
from app.models.user import User
from app.models.user_task import UserTask
from app.utils.transaction_id import generate_arena_transaction_id

router = APIRouter()
logger = logging.getLogger(__name__)

ARENA_DAILY_DIAMOND_LIMIT = 100
ARENA_REWARD_MARKER_PREFIX = "arena_reward_claim"
ARENA_REWARD_TIMEZONE = ZoneInfo("Asia/Shanghai")
ARENA_DIAMOND_REWARDS = {
    "easy": (10, 18),
    "medium": (16, 24),
    "hard": (22, 30),
}


class ScoreSubmission(BaseModel):
    user_id: int | None = None
    username: str | None = None
    challenge_id: str
    score: int
    time_used: int
    code_length: int


def _get_arena_reward_day_key(now: datetime | None = None) -> str:
    current = now.astimezone(ARENA_REWARD_TIMEZONE) if now else datetime.now(ARENA_REWARD_TIMEZONE)
    return current.strftime("%Y-%m-%d")


def _get_arena_reward_marker(day_key: str, transaction_id: str) -> str:
    return f"{ARENA_REWARD_MARKER_PREFIX}:{day_key}:{transaction_id}"


def _get_arena_difficulty(challenge_id: str) -> str:
    if challenge_id.startswith("arena_hard_"):
        return "hard"
    if challenge_id.startswith("arena_medium_"):
        return "medium"
    return "easy"


def _calculate_arena_diamond_reward(challenge_id: str, challenge_score: int, time_used: int) -> int:
    min_reward, max_reward = ARENA_DIAMOND_REWARDS[_get_arena_difficulty(challenge_id)]
    return random.randint(min_reward, max_reward)


@router.get("/global")
async def get_global_leaderboard(
    limit: int = Query(50, le=100),
    sort_by: str = Query("level", pattern="^(level|experience|tasks)$"),
    db: Session = Depends(get_db),
):
    """获取全局排行榜。"""
    cache_key = f"global_{sort_by}_{limit}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return cached

    if sort_by == "tasks":
        users_with_tasks = (
            db.query(
                User,
                func.count(UserTask.id).label("task_count"),
            )
            .outerjoin(
                UserTask,
                (User.id == UserTask.user_id) & (UserTask.status == "completed"),
            )
            .group_by(User.id)
            .order_by(desc("task_count"), desc(User.level))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for rank, (user, task_count) in enumerate(users_with_tasks, 1):
            leaderboard.append(
                {
                    "rank": rank,
                    "user_id": user.id,
                    "username": user.username,
                    "level": user.level,
                    "experience": user.experience,
                    "completed_tasks": task_count,
                    "rank_title": user.get_rank_title(),
                }
            )
    else:
        order_field = User.experience if sort_by == "experience" else User.level
        users = (
            db.query(User)
            .order_by(
                desc(order_field),
                desc(User.experience) if sort_by != "experience" else desc(User.level),
            )
            .limit(limit)
            .all()
        )

        leaderboard = []
        for rank, user in enumerate(users, 1):
            task_count = (
                db.query(UserTask)
                .filter(
                    UserTask.user_id == user.id,
                    UserTask.status == "completed",
                )
                .count()
            )
            leaderboard.append(
                {
                    "rank": rank,
                    "user_id": user.id,
                    "username": user.username,
                    "level": user.level,
                    "experience": user.experience,
                    "completed_tasks": task_count,
                    "rank_title": user.get_rank_title(),
                }
            )

    cache_leaderboard(cache_key, leaderboard)
    return leaderboard


@router.post("/submit")
async def submit_arena_score(
    submission: ScoreSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交竞技场积分，并按每日上限发放钻石奖励。"""
    if submission.user_id is not None and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="禁止替其他用户提交分数",
        )

    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在",
            )

        user_progress = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).first()
        if not user_progress:
            user_progress = UserProgress(user_id=current_user.id)
            db.add(user_progress)
        if user_progress.coins is None:
            user_progress.coins = 0

        user.arena_score = (user.arena_score or 0) + submission.score
        if user.arena_score > (user.arena_high_score or 0):
            user.arena_high_score = user.arena_score

        user_progress.arena_score = user.arena_score
        user_progress.arena_high_score = user.arena_high_score

        transaction_id = generate_arena_transaction_id(
            user.id,
            submission.challenge_id,
            score=submission.score,
            time_used=submission.time_used,
            code_length=submission.code_length,
        )
        day_key = _get_arena_reward_day_key()
        day_prefix = f"{ARENA_REWARD_MARKER_PREFIX}:{day_key}:"
        reward_marker = _get_arena_reward_marker(day_key, transaction_id)

        completed_challenges = user_progress.get_completed_challenges()
        reward_claims_used = sum(
            1
            for entry in completed_challenges
            if isinstance(entry, str) and entry.startswith(day_prefix)
        )
        reward_marker_exists = reward_marker in completed_challenges

        diamonds_earned = 0
        diamond_awarded = False
        if submission.score > 0 and not reward_marker_exists and reward_claims_used < ARENA_DAILY_DIAMOND_LIMIT:
            diamonds_earned = _calculate_arena_diamond_reward(
                challenge_id=submission.challenge_id,
                challenge_score=submission.score,
                time_used=submission.time_used,
            )
            user_progress.coins += diamonds_earned
            completed_challenges.append(reward_marker)
            user_progress.set_completed_challenges(completed_challenges)
            diamond_awarded = True
            reward_claims_used += 1

        db.commit()
        invalidate_leaderboard_cache()

        return {
            "success": True,
            "arena_score": user.arena_score,
            "arena_high_score": user.arena_high_score,
            "diamonds_earned": diamonds_earned,
            "diamond_awarded": diamond_awarded,
            "reward_marker": reward_marker if diamond_awarded else None,
            "daily_reward_claims_used": reward_claims_used,
            "daily_reward_claim_limit": ARENA_DAILY_DIAMOND_LIMIT,
            "daily_reward_remaining": max(0, ARENA_DAILY_DIAMOND_LIMIT - reward_claims_used),
            "message": "挑战完成" if diamond_awarded else "挑战完成，今日钻石已领满",
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception(
            "[Leaderboard] submit failed user_id=%s challenge_id=%s",
            current_user.id,
            submission.challenge_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="提交失败，请稍后重试",
        ) from exc


@router.get("/arena")
async def get_arena_leaderboard(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """获取竞技场排行榜。"""
    cache_key = f"arena_{limit}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return cached

    users = (
        db.query(User)
        .order_by(desc(User.arena_score), desc(User.arena_high_score))
        .limit(limit)
        .all()
    )

    leaderboard = []
    for rank, user in enumerate(users, 1):
        leaderboard.append(
            {
                "rank": rank,
                "user_id": user.id,
                "username": user.username,
                "arena_score": user.arena_score or 0,
                "arena_high_score": user.arena_high_score or 0,
                "level": user.level,
                "rank_title": user.get_arena_rank_title(),
            }
        )

    cache_leaderboard(cache_key, leaderboard)
    return leaderboard
