"""
宠物互动API
处理宠物互动逻辑（抚摸、玩耍、读书、画画、聊天、洗澡）
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.core.time import utc_now
from app.models.pet import Pet, PetGrowthLog
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

# 互动配置
INTERACTIONS = {
    'pat': {
        'name': '抚摸',
        'cooldown': 30,  # 秒
        'effects': {
            'happiness': 5,
            'intimacy': 3,
        }
    },
    'play': {
        'name': '玩耍',
        'cooldown': 300,
        'effects': {
            'happiness': 15,
            'intimacy': 5,
            'exp': 10,
            'persistence': 2,
        }
    },
    'talk': {
        'name': '交流',
        'cooldown': 60,
        'effects': {
            'happiness': 8,
            'intimacy': 5,
        }
    },
    'train': {
        'name': '训练',
        'cooldown': 600,
        'effects': {
            'happiness': 10,
            'intimacy': 8,
            'exp': 20,
            'intelligence': 3,
            'creativity': 2,
            'persistence': 3,
        }
    },
    'read': {
        'name': '读书',
        'cooldown': 600,
        'effects': {
            'happiness': 10,
            'intimacy': 8,
            'exp': 20,
            'intelligence': 5,
        }
    },
    'paint': {
        'name': '画画',
        'cooldown': 600,
        'effects': {
            'happiness': 12,
            'intimacy': 8,
            'exp': 20,
            'creativity': 5,
        }
    },
    'chat': {
        'name': '聊天',
        'cooldown': 60,
        'effects': {
            'happiness': 8,
            'intimacy': 5,
        }
    },
    'bath': {
        'name': '洗澡',
        'cooldown': 3600,
        'effects': {
            'happiness': 20,
            'intimacy': 10,
            'exp': 15,
        }
    }
}

# 每日互动收益上限（企业级规则，防止刷数值）
DAILY_CAPS = {
    'happiness': 80,
    'intimacy': 50,
    'exp': 60,
    'intelligence': 10,
    'creativity': 10,
    'persistence': 10
}

def _get_today_totals(db: Session, pet_id: int) -> Dict[str, int]:
    start = utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    logs = db.query(PetGrowthLog).filter(
        PetGrowthLog.pet_id == pet_id,
        PetGrowthLog.event_type == 'interaction',
        PetGrowthLog.created_at >= start
    ).all()
    totals = {k: 0 for k in DAILY_CAPS.keys()}
    for log in logs:
        try:
            data = json.loads(log.event_data or '{}')
        except Exception:
            data = {}
        for key in totals.keys():
            totals[key] += int(data.get(key, 0) or 0)
    return totals

def _apply_cap(key: str, value: int, totals: Dict[str, int]) -> int:
    cap = DAILY_CAPS.get(key)
    if cap is None:
        return value
    remaining = max(0, cap - totals.get(key, 0))
    return max(0, min(value, remaining))


@router.post("/{pet_id}/interact")
async def interact_with_pet(
    pet_id: int,
    interaction_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    与宠物互动
    
    参数:
    - pet_id: 宠物ID
    - interaction_data: { "interactionId": "pat" | "play" | "read" | "paint" | "chat" | "bath" }
    
    返回:
    - success: 是否成功
    - message: 消息
    - effects: 应用的效果
    - pet: 更新后的宠物数据
    """
    # 获取宠物
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # 检查宠物状态
    if pet.status == 'coma':
        raise HTTPException(status_code=400, detail="Pet is in coma, cannot interact")
    
    # 获取互动类型
    interaction_id = interaction_data.get('interactionId')
    if not interaction_id or interaction_id not in INTERACTIONS:
        raise HTTPException(status_code=400, detail="Invalid interaction type")
    
    interaction = INTERACTIONS[interaction_id]
    effects = interaction['effects']
    totals = _get_today_totals(db, pet.id)
    applied_effects: Dict[str, int] = {}
    
    # 应用效果
    # 更新经验值
    if 'exp' in effects:
        exp_gain = _apply_cap('exp', effects['exp'], totals)
        if exp_gain > 0:
            pet.exp = min(100, pet.exp + exp_gain)
        applied_effects['exp'] = exp_gain
        
        # 检查升级
        if pet.exp >= 100:
            pet.level += 1
            pet.exp = 0
    
    # 更新属性（直接更新数据库字段）
    if 'intelligence' in effects:
        gain = _apply_cap('intelligence', effects['intelligence'], totals)
        if gain > 0:
            pet.intelligence = min(100, pet.intelligence + gain)
        applied_effects['intelligence'] = gain
    
    if 'creativity' in effects:
        gain = _apply_cap('creativity', effects['creativity'], totals)
        if gain > 0:
            pet.creativity = min(100, pet.creativity + gain)
        applied_effects['creativity'] = gain
    
    if 'persistence' in effects:
        gain = _apply_cap('persistence', effects['persistence'], totals)
        if gain > 0:
            pet.persistence = min(100, pet.persistence + gain)
        applied_effects['persistence'] = gain
    
    # 更新HP（用happiness代替）
    if 'happiness' in effects:
        gain = _apply_cap('happiness', effects['happiness'], totals)
        if gain > 0:
            pet.hp = min(100, pet.hp + gain)
        applied_effects['happiness'] = gain
    # 更新亲密度
    if 'intimacy' in effects:
        gain = _apply_cap('intimacy', effects['intimacy'], totals)
        if gain > 0:
            pet.intimacy = min(999, pet.intimacy + gain)
        applied_effects['intimacy'] = gain
    
    # 更新状态
    if pet.hp >= 70:
        pet.status = 'normal'
    elif pet.hp >= 30:
        pet.status = 'tired'
    
    # 保存
    pet.battle_power = pet.calculate_battle_power()
    # 记录成长日志（用于日上限统计）
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='interaction',
        event_data=json.dumps(applied_effects)
    )
    db.add(log)
    db.commit()
    db.refresh(pet)
    
    return {
        "success": True,
        "message": f"{interaction['name']}成功！" if any(v > 0 for v in applied_effects.values()) else "今日互动收益已达上限，宠物依然很开心！",
        "effects": applied_effects,
        "pet": {
            "id": pet.id,
            "name": pet.name,
            "level": pet.level,
            "exp": pet.exp,
            "hp": pet.hp,
            "status": pet.status,
            "attributes": {
                "intelligence": pet.intelligence,
                "creativity": pet.creativity,
                "persistence": pet.persistence
            },
        }
    }


@router.get("/{pet_id}/interaction-cooldowns")
async def get_interaction_cooldowns(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取互动冷却状态
    
    注意：冷却时间由前端管理，这个接口暂时返回空数组
    后续可以改为服务端管理冷却时间
    """
    # 验证宠物所有权
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user['id']
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # 返回空数组，冷却由前端管理
    return {
        "cooldowns": []
    }
