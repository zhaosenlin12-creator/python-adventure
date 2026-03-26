from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from app.models.progress import UserProgress
from app.services.achievement_checker import achievement_checker
from app.services.achievement_seed import ensure_evolution_achievements
from app.services.pet_eggs import grant_pet_eggs
from pydantic import BaseModel, ConfigDict
from datetime import datetime

router = APIRouter()

class AchievementResponse(BaseModel):
    id: int
    title: str
    description: str
    icon: str
    condition_type: str
    condition_value: int
    reward_exp: int
    reward_eggs: int = 0
    unlocked: bool = False
    unlocked_at: datetime | None = None
    is_claimed: bool = False
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/list", response_model=List[AchievementResponse])
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取成就列表"""
    # 确保进化/孵化成就存在
    ensure_evolution_achievements(db)
    # 自动检查并解锁符合条件的成就
    achievement_checker.check_and_unlock(db, current_user, event_type="check_all")
    # 获取所有成就
    achievements = db.query(Achievement).all()
    
    # 获取用户已解锁的成就
    user_achievements = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).all()
    user_achievement_dict = {ua.achievement_id: ua for ua in user_achievements}
    
    # 组合数据
    result = []
    for ach in achievements:
        user_ach = user_achievement_dict.get(ach.id)
        result.append(AchievementResponse(
            id=ach.id,
            title=ach.title,
            description=ach.description,
            icon=ach.icon,
            condition_type=ach.condition_type,
            condition_value=ach.condition_value,
            reward_exp=ach.reward_exp,
            reward_eggs=getattr(ach, "reward_eggs", 0) or 0,
            unlocked=user_ach is not None,
            unlocked_at=user_ach.unlocked_at if user_ach else None,
            is_claimed=user_ach.is_claimed if user_ach else False
        ))
    
    return result

@router.post("/claim/{achievement_id}")
async def claim_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """领取成就奖励"""
    user_achievement = db.query(UserAchievement).filter(
        UserAchievement.user_id == current_user.id,
        UserAchievement.achievement_id == achievement_id
    ).first()
    
    if not user_achievement:
        raise HTTPException(status_code=404, detail="成就未解锁")
    
    if user_achievement.is_claimed:
        raise HTTPException(status_code=400, detail="奖励已领取")
    
    # 获取成就信息
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="成就不存在")
    
    # 发放奖励（玩家经验）
    leveled_up = False
    if achievement.reward_exp > 0:
        leveled_up = current_user.add_experience(achievement.reward_exp)

        # 同步进度表，避免前端进度覆盖
        user_progress = db.query(UserProgress).filter(
            UserProgress.user_id == current_user.id
        ).first()
        if not user_progress:
            user_progress = UserProgress(user_id=current_user.id)
            db.add(user_progress)
        user_progress.level = current_user.level
        user_progress.experience = current_user.experience

    reward_eggs = getattr(achievement, "reward_eggs", 0) or 0
    if reward_eggs > 0:
        grant_pet_eggs(db, current_user.id, reward_eggs)
    user_achievement.is_claimed = True
    db.commit()
    
    return {
        "success": True,
        "message": "成就奖励已领取",
        "reward_exp": achievement.reward_exp,
        "reward_eggs": reward_eggs,
        "leveled_up": leveled_up,
        "current_level": current_user.level,
        "current_experience": current_user.experience
    }









