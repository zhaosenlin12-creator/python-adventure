"""
每日登录奖励系统API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.coin_service import CoinService
from app.services.food_rewards import grant_food_items
from app.services.pet_eggs import grant_pet_eggs
from app.services.achievement_checker import achievement_checker

router = APIRouter()

# 签到奖励配置（根据连续登录天数）
DAILY_REWARDS = {
    1: {"coins": 10, "food": [{"id": "apple", "quantity": 1}]},
    2: {"coins": 15, "food": [{"id": "apple", "quantity": 2}]},
    3: {"coins": 20, "food": [{"id": "cookie", "quantity": 1}]},
    4: {"coins": 25, "food": [{"id": "cookie", "quantity": 1}, {"id": "apple", "quantity": 1}]},
    5: {"coins": 30, "food": [{"id": "cake", "quantity": 1}]},
    6: {"coins": 40, "food": [{"id": "cake", "quantity": 1}, {"id": "cookie", "quantity": 1}]},
    7: {"coins": 50, "food": [{"id": "star_cookie", "quantity": 1}], "eggs": 1},  # 第7天大奖
}

# 超过7天后循环使用7天奖励
def get_reward_for_streak(streak: int) -> dict:
    """根据连续登录天数获取奖励"""
    day = ((streak - 1) % 7) + 1  # 1-7循环
    return DAILY_REWARDS.get(day, DAILY_REWARDS[1])


@router.get("/status")
async def get_daily_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取每日签到状态
    返回今天是否已签到、连续签到天数、下次奖励预览
    """
    today = date.today()
    
    # 检查今天是否已签到
    has_checked_in = current_user.last_login_date == today
    
    # 计算连续登录天数
    current_streak = current_user.login_streak or 0
    
    # 如果昨天没有登录，连续天数会被重置
    if current_user.last_login_date:
        days_diff = (today - current_user.last_login_date).days
        if days_diff > 1:
            current_streak = 0
    
    # 获取今天的奖励预览
    next_streak = current_streak + 1 if not has_checked_in else current_streak
    today_reward = get_reward_for_streak(next_streak if not has_checked_in else current_streak)
    
    # 获取7天奖励预览
    rewards_preview = []
    for i in range(1, 8):
        reward = DAILY_REWARDS[i]
        rewards_preview.append({
            "day": i,
            "coins": reward["coins"],
            "food": reward["food"],
            "eggs": reward.get("eggs", 0),
            "is_current": (next_streak % 7 == i) or (next_streak % 7 == 0 and i == 7),
            "is_claimed": has_checked_in and ((current_streak % 7 == i) or (current_streak % 7 == 0 and i == 7))
        })
    
    return {
        "has_checked_in": has_checked_in,
        "current_streak": current_streak,
        "total_login_days": current_user.total_login_days or 0,
        "today_reward": today_reward if not has_checked_in else None,
        "rewards_preview": rewards_preview
    }


@router.post("/check-in")
async def daily_check_in(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    每日签到，领取奖励
    """
    today = date.today()
    
    # 检查今天是否已签到
    if current_user.last_login_date == today:
        raise HTTPException(status_code=400, detail="今日已签到")
    
    # 计算新的连续登录天数
    if current_user.last_login_date:
        days_diff = (today - current_user.last_login_date).days
        if days_diff == 1:
            # 连续登录
            new_streak = (current_user.login_streak or 0) + 1
        else:
            # 中断了，重新开始
            new_streak = 1
    else:
        # 第一次登录
        new_streak = 1
    
    # 获取奖励
    reward = get_reward_for_streak(new_streak)
    
    # 发放金币奖励（写入交易记录）
    coin_amount = int(reward.get("coins", 0) or 0)
    if coin_amount > 0:
        transaction_id = f"daily_check_in:{current_user.id}:{today.isoformat()}"
        success = CoinService.add_coins(
            db=db,
            user_id=current_user.id,
            amount=coin_amount,
            type="reward",
            source="daily_check_in",
            description=f"每日签到奖励（连续{new_streak}天）",
            transaction_id=transaction_id
        )
        if not success:
            raise HTTPException(status_code=500, detail="金币发放失败")
    
    # 发放食物奖励（写入食物背包）
    reward_food_list = reward.get("food", []) or []
    reward_food_dict = {}
    for food_item in reward_food_list:
        try:
            food_id = str(food_item.get("id"))
            quantity = int(food_item.get("quantity", 0) or 0)
        except Exception:
            continue
        if not food_id or quantity <= 0:
            continue
        reward_food_dict[food_id] = reward_food_dict.get(food_id, 0) + quantity

    granted_food = grant_food_items(db, current_user.id, reward_food_dict)
    # 前端展示需要 name/icon 字段
    food_rewards = [
        {
            "name": item.get("food_name"),
            "quantity": item.get("quantity"),
            "icon": item.get("food_icon")
        }
        for item in (granted_food or [])
    ]
    
    # 发放宠物蛋奖励
    egg_count = int(reward.get("eggs", 0) or 0)
    if egg_count > 0:
        grant_pet_eggs(db, current_user.id, egg_count)

    # 更新用户签到信息
    current_user.last_login_date = today
    current_user.login_streak = new_streak
    current_user.total_login_days = (current_user.total_login_days or 0) + 1

    # 检查并解锁登录相关成就
    newly_unlocked = achievement_checker.check_and_unlock(
        db, current_user, event_type="daily_check_in"
    )

    db.commit()
    
    return {
        "success": True,
        "message": f"签到成功！连续签到 {new_streak} 天",
        "rewards": {
            "coins": reward["coins"],
            "food": food_rewards,
            "eggs": egg_count
        },
        "new_achievements": [
            {
                "id": a.id,
                "title": a.title,
                "icon": a.icon,
                "reward_exp": a.reward_exp,
                "reward_eggs": getattr(a, "reward_eggs", 0) or 0
            } for a in (newly_unlocked or [])
        ],
        "new_streak": new_streak,
        "total_login_days": current_user.total_login_days
    }
