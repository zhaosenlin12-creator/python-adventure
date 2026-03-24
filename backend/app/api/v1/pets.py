"""
宠物系统API接口
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import json
from pydantic import BaseModel

from app.core.database import get_db
from app.models.pet import Pet, PetGrowthLog
from app.models.food import get_food_type
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.food_rewards import grant_food_items
from app.services.pet_eggs import grant_pet_eggs
from app.services.achievement_checker import achievement_checker
from app.services.world_manager import world_manager

router = APIRouter()


class PetCreateRequest(BaseModel):
    pet_type: str
    pet_style: str
    name: Optional[str] = None


PET_TYPES_BY_STYLE = {
    "cute": {
        "code_kitty",
        "algo_bunny",
        "shiba_debugger",
        "dog_shiba",
        "cute_cat",
        "cute_rabbit",
        "cute_dog",
    },
    "tech": {
        "bit_bot",
        "data_sprite",
        "ava_ai",
        "tech_bot",
        "tech_drone",
        "tech_ai",
    },
    "mythic": {
        "code_dragon",
        "giraffe_oracle",
        "snow_cat",
    },
}

PET_TYPE_TO_STYLE = {
    pet_type: pet_style
    for pet_style, pet_types in PET_TYPES_BY_STYLE.items()
    for pet_type in pet_types
}

VALID_PET_TYPES = set(PET_TYPE_TO_STYLE.keys())
VALID_PET_STYLES = set(PET_TYPES_BY_STYLE.keys())


def validate_pet_selection(pet_type: Optional[str], pet_style: Optional[str]) -> str:
    if not pet_type:
        raise HTTPException(status_code=400, detail="pet_type is required")
    if not pet_style:
        raise HTTPException(status_code=400, detail="pet_style is required")
    if pet_type not in VALID_PET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid pet type")
    if pet_style not in VALID_PET_STYLES:
        raise HTTPException(status_code=400, detail="Invalid pet style")

    expected_style = PET_TYPE_TO_STYLE[pet_type]
    if pet_style != expected_style:
        raise HTTPException(
            status_code=400,
            detail=f"Pet type {pet_type} must use style {expected_style}",
        )

    return expected_style


@router.get("/my")
async def get_my_pet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的宠物列表"""
    pets = db.query(Pet).filter(Pet.user_id == current_user.id).all()
    
    if not pets:
        # 🔥 自动发放宠物蛋，保证孵化仪式流程
        eggs = grant_pet_eggs(db, current_user.id, count=1)
        db.commit()
        pets = eggs
    
    # 检查并更新每只宠物状态
    changed = False
    for pet in pets:
        current_status = pet.check_status()
        if current_status != pet.status:
            pet.status = current_status
            if current_status == 'coma' and not pet.coma_start_time:
                pet.coma_start_time = datetime.utcnow()
            changed = True
    if changed:
        db.commit()
    
    pet_dicts = [p.to_dict() for p in pets]
    active_snapshot = world_manager.get_active_pet_snapshot(
        db, current_user.id, persist_fallback=True
    ) or {}
    current_pet_id = active_snapshot.get("pet_id")
    active_pet_dict = None
    if current_pet_id is not None:
        active_pet_dict = next((p for p in pet_dicts if p.get("id") == current_pet_id), None)
    if active_pet_dict is None and pet_dicts:
        active_pet_dict = pet_dicts[0]
    return {
        "success": True,
        "pets": pet_dicts,
        "current_pet_id": current_pet_id,
        # 兼容旧前端：提供 pet 字段
        "pet": active_pet_dict
    }


@router.post("/{pet_id}/set-active")
async def set_active_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """设置当前跟随宠物（服务端权威）"""
    active_snapshot = world_manager.set_active_pet_for_user(db, current_user.id, pet_id)
    if not active_snapshot:
        raise HTTPException(status_code=404, detail="Pet not found")

    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()

    return {
        "success": True,
        "message": "Active pet updated",
        "current_pet_id": active_snapshot.get("pet_id"),
        "pet_snapshot": active_snapshot,
        "pet": pet.to_dict() if pet else None
    }


@router.post("/create")
async def create_pet(
    request: Optional[PetCreateRequest] = Body(None),
    pet_type: Optional[str] = None,
    pet_style: Optional[str] = None,
    name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建宠物"""
    if request:
        pet_type = request.pet_type
        pet_style = request.pet_style
        name = request.name

    if not pet_type or not pet_style:
        raise HTTPException(status_code=400, detail="pet_type and pet_style are required")
    # 验证宠物类型
    pet_style = validate_pet_selection(pet_type, pet_style)
    
    # 创建宠物
    new_pet = Pet(
        user_id=current_user.id,
        pet_type=pet_type,
        pet_style=pet_style,
        name=name or f"{pet_type.replace('_', ' ').title()}",
        level=1,
        exp=0,
        hp=100,
        intelligence=0,
        creativity=0,
        persistence=0,
        intimacy=0,
        evolution_stage=1,
        status='normal',
        last_feed_time=datetime.utcnow(),
        is_egg=0,
        hatch_progress=0
    )
    
    db.add(new_pet)
    db.commit()
    db.refresh(new_pet)

    if current_user.current_pet_id is None:
        current_user.current_pet_id = new_pet.id
        db.commit()
        db.refresh(current_user)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=new_pet.id,
        event_type='created',
        event_data=json.dumps({'pet_type': pet_type, 'pet_style': pet_style})
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "message": "Pet created successfully",
        "pet": new_pet.to_dict()
    }


@router.put("/{pet_id}/feed")
async def feed_pet(
    pet_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """喂食宠物（使用食物时调用）"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    try:
        # 支持两种喂食方式：
        # 1) 前端传 food_id/quantity：后端原子性扣减库存并计算效果
        # 2) 兼容旧逻辑：前端直接传 effects
        food_id = request.get('food_id')
        quantity = int(request.get('quantity', 1) or 1)

        if food_id:
            if quantity <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be positive")

            food_type = get_food_type(food_id)
            if not food_type:
                raise HTTPException(status_code=400, detail=f"Invalid food_id: {food_id}")

            effects = food_type.effects or {}

            # 确保背包表存在
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS food_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    food_id TEXT NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(user_id, food_id)
                )
            """))

            # 查询库存
            row = db.execute(
                text("""
                    SELECT quantity FROM food_inventory
                    WHERE user_id = :user_id AND food_id = :food_id
                """),
                {"user_id": current_user.id, "food_id": food_id}
            ).fetchone()

            if not row or row[0] < quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough {food_type.name}. Available: {row[0] if row else 0}, Required: {quantity}"
                )

            new_quantity = row[0] - quantity
            db.execute(
                text("""
                    UPDATE food_inventory
                    SET quantity = :quantity, updated_at = :updated_at
                    WHERE user_id = :user_id AND food_id = :food_id
                """),
                {
                    "quantity": new_quantity,
                    "updated_at": datetime.utcnow().isoformat(),
                    "user_id": current_user.id,
                    "food_id": food_id
                }
            )
        else:
            effects = request.get('effects', {}) or {}
            new_quantity = None

        # 更新喂食时间
        pet.last_feed_time = datetime.utcnow()

        # 如果宠物昏迷，恢复为疲惫状态
        if pet.status == 'coma':
            pet.status = 'tired'
            pet.coma_start_time = None
        elif pet.status == 'tired':
            pet.status = 'normal'

        # 应用食物效果
        exp_gain = effects.get('hunger', 10)  # 饱食度转换为经验值
        happiness_gain = effects.get('happiness', 0)
        intimacy_gain = max(1, int(happiness_gain / 5)) if (food_id or effects) else 0

        # 增加经验值
        pet.exp += exp_gain

        # 增加属性（如果食物有属性加成）
        if 'intelligence' in effects:
            pet.intelligence = min(100, pet.intelligence + effects['intelligence'])
        if 'creativity' in effects:
            pet.creativity = min(100, pet.creativity + effects['creativity'])
        if 'persistence' in effects:
            pet.persistence = min(100, pet.persistence + effects['persistence'])

        # 增加亲密度（喂食基础收益）
        if intimacy_gain > 0:
            pet.intimacy = min(999, (pet.intimacy or 0) + intimacy_gain)

        # 检查是否升级（每100经验升1级）
        level_up = False
        while pet.exp >= 100:
            pet.exp -= 100  # 扣除升级所需经验
            pet.level += 1
            level_up = True

        # 更新战斗力
        pet.battle_power = pet.calculate_battle_power()

        db.commit()
        db.refresh(pet)

        # 记录成长日志
        if level_up:
            log = PetGrowthLog(
                pet_id=pet.id,
                event_type='level_up',
                event_data=json.dumps({'new_level': pet.level})
            )
            db.add(log)
            db.commit()

        return {
            "success": True,
            "message": "Pet fed successfully",
            "level_up": level_up,
            "pet": pet.to_dict(),
            "remaining_quantity": new_quantity
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to feed pet: {str(e)}")


@router.post("/{pet_id}/rescue")
async def rescue_pet(
    pet_id: int,
    answers_correct: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """营救昏迷的宠物"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    if pet.status != 'coma':
        raise HTTPException(status_code=400, detail="Pet is not in coma")
    
    # 检查答题数量（至少答对3道）
    if answers_correct < 3:
        return {
            "success": False,
            "message": "Need to answer at least 3 questions correctly"
        }
    
    # 营救成功
    pet.status = 'normal'
    pet.last_feed_time = datetime.utcnow()
    pet.coma_start_time = None
    pet.exp += 50  # 营救奖励
    
    db.commit()
    db.refresh(pet)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='rescued',
        event_data=json.dumps({'answers_correct': answers_correct})
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "message": "Pet rescued successfully!",
        "pet": pet.to_dict()
    }


@router.get("/{pet_id}/status")
async def check_pet_status(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """检查宠物状态"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    current_status = pet.check_status()
    
    return {
        "success": True,
        "status": current_status,
        "needsRescue": current_status == 'coma',
        "pet": pet.to_dict()
    }


@router.put("/{pet_id}/attributes")
async def update_pet_attributes(
    pet_id: int,
    intelligence: Optional[int] = None,
    creativity: Optional[int] = None,
    persistence: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新宠物属性（游戏行为触发）"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    if intelligence is not None:
        pet.intelligence = min(100, pet.intelligence + intelligence)
    if creativity is not None:
        pet.creativity = min(100, pet.creativity + creativity)
    if persistence is not None:
        pet.persistence = min(100, pet.persistence + persistence)
    
    pet.battle_power = pet.calculate_battle_power()
    
    db.commit()
    db.refresh(pet)
    
    return {
        "success": True,
        "pet": pet.to_dict()
    }


@router.put("/{pet_id}/name")
async def update_pet_name(
    pet_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新宠物名字"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    new_name = request.get('name', '').strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    if len(new_name) > 12:
        raise HTTPException(status_code=400, detail="Name too long (max 12 characters)")
    
    old_name = pet.name
    pet.name = new_name
    
    db.commit()
    db.refresh(pet)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='renamed',
        event_data=json.dumps({'old_name': old_name, 'new_name': new_name})
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "message": "Pet name updated successfully",
        "pet": pet.to_dict()
    }


@router.post("/{pet_id}/evolve")
async def evolve_pet(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """进化宠物"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # 获取当前进化阶段
    current_stage = pet.evolution_stage or 0
    
    # 定义进化条件（与前端阶段保持一致：2=少年期、3=成年期、4=完全体、5=传说）
    evolution_requirements = {
        2: {'level': 5, 'intimacy': 30},
        3: {'level': 15, 'intimacy': 80, 'intelligence': 20},
        4: {'level': 30, 'intimacy': 150, 'intelligence': 40, 'creativity': 40, 'persistence': 40},
        5: {'level': 50, 'intimacy': 300, 'intelligence': 80, 'creativity': 80, 'persistence': 80}
    }
    
    next_stage = current_stage + 1
    
    # 检查是否已达到最高阶段
    if next_stage > 5:
        raise HTTPException(status_code=400, detail="Already at maximum evolution stage")
    
    # 检查进化条件
    if next_stage in evolution_requirements:
        req = evolution_requirements[next_stage]
        
        if pet.level < req.get('level', 0):
            raise HTTPException(status_code=400, detail=f"Need level {req['level']}")
        
        if pet.intimacy < req.get('intimacy', 0):
            raise HTTPException(status_code=400, detail=f"Need intimacy {req['intimacy']}")
        
        if 'intelligence' in req and pet.intelligence < req['intelligence']:
            raise HTTPException(status_code=400, detail=f"Need intelligence {req['intelligence']}")
        
        if 'creativity' in req and pet.creativity < req['creativity']:
            raise HTTPException(status_code=400, detail=f"Need creativity {req['creativity']}")
        
        if 'persistence' in req and pet.persistence < req['persistence']:
            raise HTTPException(status_code=400, detail=f"Need perseverance {req['persistence']}")
    
    # 进化奖励（对齐阶段）
    evolution_rewards = {
        2: {'coins': 100, 'attribute_bonus': 5, 'food_rewards': {'cake': 2}},
        3: {'coins': 300, 'attribute_bonus': 10, 'food_rewards': {'star_cookie': 3}},
        4: {'coins': 800, 'attribute_bonus': 20, 'food_rewards': {'mystery_box': 1}},
        5: {'coins': 2000, 'attribute_bonus': 50, 'food_rewards': {'mystery_box': 3}}
    }
    
    reward_config = evolution_rewards.get(next_stage, {'coins': 0, 'attribute_bonus': 0, 'food_rewards': {}})
    reward = {'coins': reward_config.get('coins', 0), 'attribute_bonus': reward_config.get('attribute_bonus', 0)}
    food_rewards = reward_config.get('food_rewards', {}) or {}
    
    # 执行进化
    pet.evolution_stage = next_stage
    pet.intelligence += reward['attribute_bonus']
    pet.creativity += reward['attribute_bonus']
    pet.persistence += reward['attribute_bonus']
    
    # 给用户加金币
    if reward.get('coins'):
        current_user.coins = (current_user.coins or 0) + reward['coins']

    # 发放食物奖励
    granted_food = grant_food_items(db, current_user.id, food_rewards)

    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='evolved',
        event_data=json.dumps({
            'from_stage': current_stage,
            'to_stage': next_stage,
            'rewards': reward
        })
    )
    db.add(log)
    db.commit()
    

    # 进化后检查成就
    newly_unlocked = achievement_checker.check_and_unlock(
        db, current_user, event_type="pet_evolve", event_data={"stage": next_stage}
    )
    return {
        "success": True,
        "message": f"Pet evolved to stage {next_stage}!",
        "pet": pet.to_dict(),
        "rewards": reward,
        "food_rewards": granted_food,
        "new_achievements": [
            {
                "id": a.id,
                "title": a.title,
                "icon": a.icon,
                "reward_exp": a.reward_exp,
                "reward_eggs": getattr(a, "reward_eggs", 0) or 0
            } for a in (newly_unlocked or [])
        ]
    }


@router.put("/__legacy__/{pet_id}/name")
async def update_pet_name_legacy(
    pet_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新宠物名字"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    new_name = request.get('name', '').strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    if len(new_name) > 12:
        raise HTTPException(status_code=400, detail="Name too long (max 12 characters)")
    
    # 更新名字
    pet.name = new_name
    
    db.commit()
    db.refresh(pet)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='renamed',
        event_data=json.dumps({'new_name': new_name})
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "message": "Pet name updated successfully",
        "pet": pet.to_dict()
    }


@router.post("/{pet_id}/hatch-progress")
async def update_hatch_progress(
    pet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新孵化进度（完成关卡时调用）"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # 检查是否是蛋状态
    if not pet.is_egg:
        return {
            "success": False,
            "message": "Pet is already hatched"
        }
    
    # 增加孵化进度
    pet.hatch_progress += 1
    
    # 检查是否可以孵化（完成3个关卡）
    ready_to_hatch = pet.hatch_progress >= 3
    
    db.commit()
    db.refresh(pet)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='hatch_progress',
        event_data=json.dumps({
            'progress': pet.hatch_progress,
            'ready_to_hatch': ready_to_hatch
        })
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "message": "Hatch progress updated",
        "hatch_progress": pet.hatch_progress,
        "ready_to_hatch": ready_to_hatch,
        "pet": pet.to_dict()
    }


@router.post("/{pet_id}/hatch")
async def hatch_pet(
    pet_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """孵化宠物（选择宠物类型）"""
    pet = db.query(Pet).filter(
        Pet.id == pet_id,
        Pet.user_id == current_user.id
    ).first()
    
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # 检查是否是蛋状态
    if not pet.is_egg:
        raise HTTPException(status_code=400, detail="Pet is already hatched")
    
    # 检查孵化进度
    if pet.hatch_progress < 3:
        raise HTTPException(
            status_code=400, 
            detail=f"Need to complete {3 - pet.hatch_progress} more levels to hatch"
        )
    
    # 获取选择的宠物类型和风格
    pet_type = request.get('petType')
    pet_style = request.get('petStyle')
    pet_name = request.get('name', '')
    pet_style = validate_pet_selection(pet_type, pet_style)
    
    # 验证宠物类型
    valid_types = [
        # 新版宠物
        'code_kitty', 'algo_bunny', 'shiba_debugger',
        'bit_bot', 'data_sprite', 'ava_ai',
        'code_dragon', 'giraffe_oracle', 'snow_cat',
        # 旧版兼容
        'dog_shiba', 'cute_cat', 'cute_rabbit', 'cute_dog',
        'tech_bot', 'tech_drone', 'tech_ai'
    ]
    if pet_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid pet type")
    
    # 验证宠物风格
    valid_styles = ['cute', 'tech', 'mythic']
    if pet_style not in valid_styles:
        raise HTTPException(status_code=400, detail="Invalid pet style")
    
    # 孵化宠物
    pet.is_egg = 0
    pet.pet_type = pet_type
    pet.pet_style = pet_style
    pet.name = pet_name or f"{pet_type.replace('_', ' ').title()}"
    pet.status = 'normal'
    pet.last_feed_time = datetime.utcnow()
    pet.intimacy = 0
    pet.evolution_stage = 1
    
    db.commit()
    db.refresh(pet)
    
    # 记录成长日志
    log = PetGrowthLog(
        pet_id=pet.id,
        event_type='hatched',
        event_data=json.dumps({
            'pet_type': pet_type,
            'pet_style': pet_style,
            'name': pet.name
        })
    )
    db.add(log)
    db.commit()

    # 孵化后检查成就
    newly_unlocked = achievement_checker.check_and_unlock(
        db, current_user, event_type="pet_hatch", event_data={"pet_id": pet.id}
    )
    
    return {
        "success": True,
        "message": "Pet hatched successfully!",
        "pet": pet.to_dict(),
        "new_achievements": [
            {
                "id": a.id,
                "title": a.title,
                "icon": a.icon,
                "reward_exp": a.reward_exp,
                "reward_eggs": getattr(a, "reward_eggs", 0) or 0
            } for a in (newly_unlocked or [])
        ]
    }

