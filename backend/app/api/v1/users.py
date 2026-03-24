from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.user_task import UserTask
from app.schemas.user import UserProfile

router = APIRouter()

@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户个人资料"""
    # 计算下一级所需经验
    next_level_exp = current_user.level * 100
    
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        level=current_user.level,
        experience=current_user.experience,
        rank_title=current_user.get_rank_title(),
        next_level_exp=next_level_exp
    )

@router.get("/progress")
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户进度"""
    # 获取已完成的任务
    completed_tasks = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.status == "completed"
    ).all()
    
    return {
        "user_id": current_user.id,
        "level": current_user.level,
        "experience": current_user.experience,
        "rank_title": current_user.get_rank_title(),
        "completed_tasks_count": len(completed_tasks),
        "unlocked_areas": get_unlocked_areas(current_user.level)
    }

def get_unlocked_areas(level: int) -> list:
    """根据等级返回已解锁的地图区域"""
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









