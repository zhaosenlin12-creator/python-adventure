"""
技能系统API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.skill import Skill
from app.models.user_skill import UserSkill
from pydantic import BaseModel

router = APIRouter()

class SkillInfo(BaseModel):
    """技能信息"""
    id: int
    name: str
    description: str
    icon: str
    skill_type: str
    level_required: int
    user_skill_level: int = 0
    is_learned: bool = False
    is_equipped: bool = False
    damage_multiplier: float
    damage_reduction: float
    speed_boost: float
    cooldown: int

    class Config:
        from_attributes = True

class EquipSkillRequest(BaseModel):
    """装备技能请求"""
    skill_id: int

@router.get("/list", response_model=List[SkillInfo])
async def get_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取所有技能列表"""
    all_skills = db.query(Skill).all()
    user_skills = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id
    ).all()
    
    # 创建用户技能字典
    user_skill_dict = {us.skill_id: us for us in user_skills}
    
    result = []
    for skill in all_skills:
        user_skill = user_skill_dict.get(skill.id)
        result.append({
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "icon": skill.icon,
            "skill_type": skill.skill_type,
            "level_required": skill.level_required,
            "user_skill_level": user_skill.skill_level if user_skill else 0,
            "is_learned": user_skill is not None,
            "is_equipped": user_skill.is_equipped if user_skill else False,
            "damage_multiplier": skill.damage_multiplier,
            "damage_reduction": skill.damage_reduction,
            "speed_boost": skill.speed_boost,
            "cooldown": skill.cooldown
        })
    
    return result

@router.get("/equipped")
async def get_equipped_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取已装备的技能"""
    equipped = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.is_equipped == True
    ).all()
    
    result = []
    for user_skill in equipped:
        skill = db.query(Skill).filter(Skill.id == user_skill.skill_id).first()
        if skill:
            result.append({
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "icon": skill.icon,
                "skill_type": skill.skill_type,
                "level": user_skill.skill_level,
                "damage_multiplier": skill.damage_multiplier,
                "damage_reduction": skill.damage_reduction,
                "speed_boost": skill.speed_boost,
                "cooldown": skill.cooldown
            })
    
    return result

@router.post("/equip")
async def equip_skill(
    request: EquipSkillRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """装备/卸下技能"""
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == request.skill_id
    ).first()
    
    if not user_skill:
        raise HTTPException(status_code=404, detail="未学习该技能")
    
    # 切换装备状态
    user_skill.is_equipped = not user_skill.is_equipped
    db.commit()
    
    return {
        "success": True,
        "is_equipped": user_skill.is_equipped,
        "message": f"{'装备' if user_skill.is_equipped else '卸下'}了技能"
    }

@router.post("/learn/{skill_id}")
async def learn_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """学习新技能"""
    # 检查技能是否存在
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="技能不存在")
    
    # 检查等级要求
    if current_user.level < skill.level_required:
        raise HTTPException(
            status_code=400, 
            detail=f"需要等级 {skill.level_required} 才能学习该技能"
        )
    
    # 检查是否已学习
    existing = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == skill_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="已经学习过该技能")
    
    # 学习技能
    new_user_skill = UserSkill(
        user_id=current_user.id,
        skill_id=skill_id,
        skill_level=1,
        experience=0,
        is_equipped=False
    )
    db.add(new_user_skill)
    db.commit()
    
    return {
        "success": True,
        "message": f"成功学习技能：{skill.name}"
    }

@router.post("/upgrade/{skill_id}")
async def upgrade_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """升级技能"""
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == skill_id
    ).first()
    
    if not user_skill:
        raise HTTPException(status_code=404, detail="未学习该技能")
    
    # 简单升级逻辑：每级需要100经验
    if user_skill.experience >= user_skill.skill_level * 100:
        user_skill.experience -= user_skill.skill_level * 100
        user_skill.skill_level += 1
        db.commit()
        
        return {
            "success": True,
            "new_level": user_skill.skill_level,
            "message": "技能升级成功！"
        }
    else:
        raise HTTPException(status_code=400, detail="经验不足")




