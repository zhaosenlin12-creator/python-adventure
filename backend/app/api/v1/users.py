from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.user_task import UserTask
from app.schemas.user import UserProfile
from app.services.coin_service import CoinService

router = APIRouter()

SYSTEM_UPDATE_SLUG = "system-update-20260406"
SYSTEM_UPDATE_TITLE = "乐启享系统焕新"
SYSTEM_UPDATE_MESSAGE = "近期乐启享整个系统大更新给大家带来不便，额外赠送大家 1000 金币作为补偿~"
SYSTEM_UPDATE_HIGHLIGHTS = [
    "生存乱斗匹配与同步更稳，联机体验更顺。",
    "战役提示、技能提示和交互文案统一成更短更清晰的表达。",
    "宠物孵化、创意工坊与部分界面细节完成新一轮优化。",
]
SYSTEM_UPDATE_COMPENSATION_COINS = 1000
SYSTEM_UPDATE_COMPENSATION_SOURCE = "system_update_compensation_20260406"
SYSTEM_UPDATE_COMPENSATION_LABEL = "系统更新补给"
SYSTEM_UPDATE_EXISTING_USER_CUTOFF_UTC = datetime(2026, 4, 5, 17, 7, 44, tzinfo=timezone.utc)


class SystemAnnouncement(BaseModel):
    slug: str
    title: str
    message: str
    highlights: List[str] = Field(default_factory=list)
    reward_coins: int
    source_label: str
    dismiss_key: str
    granted_now: bool
    current_balance: int

    model_config = ConfigDict(from_attributes=True)


class SystemAnnouncementsResponse(BaseModel):
    announcements: List[SystemAnnouncement] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


def _normalize_datetime_to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_existing_user_for_system_update(user: User) -> bool:
    created_at = _normalize_datetime_to_utc(getattr(user, "created_at", None))
    if created_at is None:
        return False
    return created_at <= SYSTEM_UPDATE_EXISTING_USER_CUTOFF_UTC


def _build_system_update_transaction_id(user_id: int) -> str:
    return f"{SYSTEM_UPDATE_SLUG}:coins:{user_id}"


def _get_system_update_announcement(db: Session, current_user: User) -> SystemAnnouncement | None:
    if not _is_existing_user_for_system_update(current_user):
        return None

    granted_now = CoinService.add_coins(
        db=db,
        user_id=current_user.id,
        amount=SYSTEM_UPDATE_COMPENSATION_COINS,
        type="reward",
        source=SYSTEM_UPDATE_COMPENSATION_SOURCE,
        description="乐启享系统焕新补偿礼包",
        transaction_id=_build_system_update_transaction_id(current_user.id),
    )

    current_balance = CoinService.get_balance(db, current_user.id)

    return SystemAnnouncement(
        slug=SYSTEM_UPDATE_SLUG,
        title=SYSTEM_UPDATE_TITLE,
        message=SYSTEM_UPDATE_MESSAGE,
        highlights=SYSTEM_UPDATE_HIGHLIGHTS,
        reward_coins=SYSTEM_UPDATE_COMPENSATION_COINS,
        source_label=SYSTEM_UPDATE_COMPENSATION_LABEL,
        dismiss_key=f"{SYSTEM_UPDATE_SLUG}:{current_user.id}",
        granted_now=granted_now,
        current_balance=current_balance,
    )


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's profile."""
    next_level_exp = current_user.level * 100

    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        level=current_user.level,
        experience=current_user.experience,
        rank_title=current_user.get_rank_title(),
        next_level_exp=next_level_exp,
    )


@router.get("/progress")
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's progress summary."""
    completed_tasks = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.status == "completed",
    ).all()

    return {
        "user_id": current_user.id,
        "level": current_user.level,
        "experience": current_user.experience,
        "rank_title": current_user.get_rank_title(),
        "completed_tasks_count": len(completed_tasks),
        "unlocked_areas": get_unlocked_areas(current_user.level),
    }


@router.get("/system-announcements", response_model=SystemAnnouncementsResponse)
async def get_system_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return active system announcements for the current user."""
    announcement = _get_system_update_announcement(db, current_user)
    return SystemAnnouncementsResponse(
        announcements=[announcement] if announcement else [],
    )


def get_unlocked_areas(level: int) -> list:
    """Return unlocked map areas based on the user's level."""
    areas = ["新手村"]
    if level >= 5:
        areas.append("基础镇")
    if level >= 15:
        areas.append("算法谷")
    if level >= 25:
        areas.append("数据湖")
    if level >= 35:
        areas.append("进阶峰")
    return areas
