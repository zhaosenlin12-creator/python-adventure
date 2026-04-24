from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Literal
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.progress import UserProgress, LevelCompletion
from app.schemas.progress import (
    ProgressSave, ProgressResponse, LevelCompletionCreate, LevelCompletionResponse,
    AgeGroupProgressRequest, AgeGroupProgressResponse, AllAgeGroupProgressResponse,
    CompleteCampaignLevelRequest, CompleteCampaignRequest, AgeGroupProgress
)
from app.services.coin_service import CoinService, CoinRewardCalculator
from app.services.achievement_checker import achievement_checker
from app.utils.transaction_id import generate_level_transaction_id, generate_campaign_transaction_id
import json

router = APIRouter()
ARENA_REWARD_MARKER_PREFIX = "arena_reward_claim:"


def _is_system_completed_challenge(entry: str) -> bool:
    return isinstance(entry, str) and entry.startswith(ARENA_REWARD_MARKER_PREFIX)


def _merge_completed_challenges(existing: list[str], incoming: list[str]) -> list[str]:
    merged: list[str] = []

    for entry in incoming:
        if entry and entry not in merged:
            merged.append(entry)

    for entry in existing:
        if _is_system_completed_challenge(entry) and entry not in merged:
            merged.append(entry)

    return merged

@router.post("/save", response_model=ProgressResponse)
async def save_progress(
    progress: ProgressSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    保存用户游戏进度到云端
    """
    # 查找或创建用户进度记录
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        user_progress = UserProgress(user_id=current_user.id)
        db.add(user_progress)
        existing_completed_challenges: list[str] = []
    else:
        existing_completed_challenges = user_progress.get_completed_challenges()
    
    # 更新进度数据
    user_progress.level = progress.level
    user_progress.experience = progress.experience
    user_progress.coins = progress.coins
    user_progress.set_completed_levels(progress.completed_levels)
    user_progress.set_skills(progress.skills)
    user_progress.set_inventory(progress.inventory)
    user_progress.has_key = 1 if progress.has_key else 0
    user_progress.arena_score = progress.arena_score
    user_progress.arena_high_score = progress.arena_high_score
    user_progress.set_completed_challenges(
        _merge_completed_challenges(existing_completed_challenges, progress.completed_challenges)
    )
    # 更新战役进度
    user_progress.set_completed_campaigns(progress.completed_campaigns)
    user_progress.set_completed_campaign_levels(progress.completed_campaign_levels)
    user_progress.set_campaign_progress(progress.campaign_progress or {})
    
    # 🔥 同步更新User表，确保排行榜显示正确
    current_user.level = progress.level
    current_user.experience = progress.experience
    
    # 更新年龄分组战役进度 (必须在commit之前)
    if progress.age_group_campaign_progress:
        age_progress_dict = {}
        for key, val in progress.age_group_campaign_progress.items():
            if isinstance(val, dict):
                age_progress_dict[key] = val
            else:
                age_progress_dict[key] = val.model_dump() if hasattr(val, 'model_dump') else {"completedLevels": [], "completedCampaigns": []}
        user_progress.set_age_group_campaign_progress(age_progress_dict)
    
    db.commit()
    # 检查成就（等级/任务/满分等）
    newly_unlocked = achievement_checker.check_and_unlock(db, current_user, event_type="check_all")
    db.refresh(user_progress)
    
    # 转换响应
    response = ProgressResponse(
        user_id=user_progress.user_id,
        level=user_progress.level,
        experience=user_progress.experience,
        coins=user_progress.coins,
        completed_levels=user_progress.get_completed_levels(),
        skills=user_progress.get_skills(),
        inventory=user_progress.get_inventory(),
        has_key=bool(user_progress.has_key),
        arena_score=user_progress.arena_score,
        arena_high_score=user_progress.arena_high_score,
        completed_challenges=user_progress.get_completed_challenges(),
        completed_campaigns=user_progress.get_completed_campaigns(),
        completed_campaign_levels=user_progress.get_completed_campaign_levels(),
        campaign_progress=user_progress.get_campaign_progress(),
        age_group_campaign_progress=user_progress.get_age_group_campaign_progress(),
        updated_at=user_progress.updated_at
    )
    response.new_achievements = [
        {
            "id": a.id,
            "title": a.title,
            "icon": a.icon,
            "reward_exp": a.reward_exp,
            "reward_eggs": getattr(a, "reward_eggs", 0) or 0
        } for a in (newly_unlocked or [])
    ]

    return response

@router.get("/load", response_model=ProgressResponse)
async def load_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    从云端加载用户游戏进度
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        # 如果没有进度记录，创建默认进度
        user_progress = UserProgress(user_id=current_user.id)
        db.add(user_progress)
        db.commit()
        db.refresh(user_progress)
    
    # 转换响应
    return ProgressResponse(
        user_id=user_progress.user_id,
        level=user_progress.level,
        experience=user_progress.experience,
        coins=user_progress.coins,
        completed_levels=user_progress.get_completed_levels(),
        skills=user_progress.get_skills(),
        inventory=user_progress.get_inventory(),
        has_key=bool(user_progress.has_key),
        arena_score=user_progress.arena_score,
        arena_high_score=user_progress.arena_high_score,
        completed_challenges=user_progress.get_completed_challenges(),
        completed_campaigns=user_progress.get_completed_campaigns(),
        completed_campaign_levels=user_progress.get_completed_campaign_levels(),
        campaign_progress=user_progress.get_campaign_progress(),
        age_group_campaign_progress=user_progress.get_age_group_campaign_progress(),
        updated_at=user_progress.updated_at
    )

@router.post("/level/complete", response_model=LevelCompletionResponse)
async def complete_level(
    completion: LevelCompletionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    记录关卡完成并发放金币奖励
    """
    # 记录关卡完成
    level_completion = LevelCompletion(
        user_id=current_user.id,
        level_id=completion.level_id,
        score=completion.score,
        code=completion.code,
        time_used=completion.time_used
    )
    
    db.add(level_completion)
    
    # 计算金币奖励
    time_ratio = 0
    if completion.time_used and completion.standard_time and completion.standard_time > 0:
        time_ratio = (completion.standard_time - completion.time_used) / completion.standard_time
    
    coins_earned = CoinRewardCalculator.calculate_level_reward(
        difficulty=completion.difficulty or 5,
        quality_score=completion.quality_score or 0,
        time_ratio=time_ratio
    )
    
    # 生成唯一交易ID防止重复发放
    transaction_id = generate_level_transaction_id(current_user.id, completion.level_id)
    
    # 发放金币
    coin_success = CoinService.add_coins(
        db=db,
        user_id=current_user.id,
        amount=coins_earned,
        type="reward",
        source="level_complete",
        description=f"完成关卡 {completion.level_id}",
        transaction_id=transaction_id
    )
    
    db.commit()
    # 关卡完成后检查成就（任务数量/满分/等级）
    newly_unlocked = achievement_checker.check_and_unlock(db, current_user, event_type="check_all")
    db.refresh(level_completion)
    
    # 在响应中添加金币信息
    response = LevelCompletionResponse.model_validate(level_completion)
    response.coins_earned = coins_earned if coin_success else 0
    response.coin_awarded = coin_success
    response.new_achievements = [
        {
            "id": a.id,
            "title": a.title,
            "icon": a.icon,
            "reward_exp": a.reward_exp,
            "reward_eggs": getattr(a, "reward_eggs", 0) or 0
        } for a in (newly_unlocked or [])
    ]
    
    return response

@router.get("/level/history")
async def get_level_history(
    level_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取关卡完成历史
    """
    query = db.query(LevelCompletion).filter(
        LevelCompletion.user_id == current_user.id
    )
    
    if level_id:
        query = query.filter(LevelCompletion.level_id == level_id)
    
    completions = query.order_by(LevelCompletion.completed_at.desc()).all()
    
    return completions


# ========== 年龄分组战役进度 API (v2.2.0) ==========

@router.get("/campaign/age-group/{age_group}", response_model=AgeGroupProgressResponse)
async def get_age_group_progress(
    age_group: Literal['primary-lower', 'primary-upper', 'junior-high'],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取指定年龄组的战役进度
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        return AgeGroupProgressResponse(
            age_group=age_group,
            completed_levels=[],
            completed_campaigns=[]
        )
    
    progress = user_progress.get_age_group_progress(age_group)
    return AgeGroupProgressResponse(
        age_group=age_group,
        completed_levels=progress.get("completedLevels", []),
        completed_campaigns=progress.get("completedCampaigns", [])
    )

@router.get("/campaign/age-group", response_model=AllAgeGroupProgressResponse)
async def get_all_age_group_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取所有年龄组的战役进度
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        return AllAgeGroupProgressResponse()
    
    all_progress = user_progress.get_age_group_campaign_progress()
    
    def get_progress(key):
        p = all_progress.get(key, {})
        return AgeGroupProgress(
            completedLevels=p.get("completedLevels", []),
            completedCampaigns=p.get("completedCampaigns", [])
        )
    
    return AllAgeGroupProgressResponse(
        primary_lower=get_progress("primary-lower"),
        primary_upper=get_progress("primary-upper"),
        junior_high=get_progress("junior-high")
    )

@router.post("/campaign/age-group/save", response_model=AgeGroupProgressResponse)
async def save_age_group_progress(
    request: AgeGroupProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    保存指定年龄组的战役进度
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        user_progress = UserProgress(user_id=current_user.id)
        db.add(user_progress)
    
    user_progress.update_age_group_progress(
        request.age_group,
        completed_levels=request.completed_levels,
        completed_campaigns=request.completed_campaigns
    )
    
    db.commit()
    db.refresh(user_progress)
    
    progress = user_progress.get_age_group_progress(request.age_group)
    return AgeGroupProgressResponse(
        age_group=request.age_group,
        completed_levels=progress.get("completedLevels", []),
        completed_campaigns=progress.get("completedCampaigns", [])
    )

@router.post("/campaign/age-group/complete-level")
async def complete_campaign_level(
    request: CompleteCampaignLevelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    完成战役关卡 - 将关卡添加到已完成列表并发放金币奖励
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        user_progress = UserProgress(user_id=current_user.id)
        db.add(user_progress)
    
    # 获取当前进度
    progress = user_progress.get_age_group_progress(request.age_group)
    completed_levels = progress.get("completedLevels", [])
    
    # 添加关卡ID (格式: campaign_id-level_id)
    level_key = f"{request.campaign_id}-{request.level_id}"
    coins_earned = 0
    coin_awarded = False
    
    if level_key not in completed_levels:
        completed_levels.append(level_key)
        user_progress.update_age_group_progress(
            request.age_group,
            completed_levels=completed_levels
        )
        
        # 计算金币奖励
        difficulty = request.difficulty or 5
        performance_score = request.performance_score or 0
        coins_earned = CoinRewardCalculator.calculate_campaign_reward(
            difficulty=difficulty,
            performance_score=performance_score
        )
        
        # 生成唯一交易ID防止重复发放
        transaction_id = generate_campaign_transaction_id(
            current_user.id, 
            level_key
        )
        
        # 发放金币
        coin_awarded = CoinService.add_coins(
            db=db,
            user_id=current_user.id,
            amount=coins_earned,
            type="reward",
            source="campaign_level_complete",
            description=f"完成战役关卡 {level_key}",
            transaction_id=transaction_id
        )
        
        db.commit()
    
    return {
        "success": True, 
        "level_key": level_key, 
        "completed_levels": completed_levels,
        "coins_earned": coins_earned,
        "coin_awarded": coin_awarded
    }

@router.post("/campaign/age-group/complete-campaign")
async def complete_campaign(
    request: CompleteCampaignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    完成战役 - 将战役添加到已完成列表
    """
    user_progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id
    ).first()
    
    if not user_progress:
        user_progress = UserProgress(user_id=current_user.id)
        db.add(user_progress)
    
    # 获取当前进度
    progress = user_progress.get_age_group_progress(request.age_group)
    completed_campaigns = progress.get("completedCampaigns", [])
    
    # 添加战役ID
    if request.campaign_id not in completed_campaigns:
        completed_campaigns.append(request.campaign_id)
        user_progress.update_age_group_progress(
            request.age_group,
            completed_campaigns=completed_campaigns
        )
        db.commit()
    
    return {"success": True, "campaign_id": request.campaign_id, "completed_campaigns": completed_campaigns}
