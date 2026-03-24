"""
创意工坊金币奖励API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.custom_level import CustomLevel
from app.services.workshop_service import WorkshopEarningsService


router = APIRouter()


class WorkshopPlayRequest(BaseModel):
    """关卡游玩请求"""
    level_id: str
    creator_id: int | None = None
    player_id: int | None = None


class WorkshopLikeRequest(BaseModel):
    """关卡点赞请求"""
    level_id: str
    creator_id: int | None = None
    player_id: int | None = None


@router.post("/play")
async def record_workshop_play(
    request: WorkshopPlayRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🪙 记录创意工坊关卡游玩，发放金币
    
    Args:
        request: 游玩请求
        db: 数据库会话
        
    Returns:
        dict: 包含金币奖励信息
    """
    # 验证关卡存在且已发布
    level = db.query(CustomLevel).filter(
        CustomLevel.id == request.level_id,
        CustomLevel.is_published == True
    ).first()
    if not level:
        raise HTTPException(status_code=404, detail="关卡不存在")
    if not level.user_id:
        raise HTTPException(status_code=400, detail="关卡创作者信息缺失")
    
    creator_id = level.user_id
    player_id = current_user.id
    # 忽略客户端传入的creator_id/player_id，防止伪造
    
    # 记录游玩并发放金币
    result = WorkshopEarningsService.record_play(
        db=db,
        level_id=request.level_id,
        creator_id=creator_id,
        player_id=player_id
    )
    
    return result


@router.post("/like")
async def record_workshop_like(
    request: WorkshopLikeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🪙 记录创意工坊关卡点赞，发放金币
    
    Args:
        request: 点赞请求
        db: 数据库会话
        
    Returns:
        dict: 包含金币奖励信息
    """
    # 验证关卡存在且已发布
    level = db.query(CustomLevel).filter(
        CustomLevel.id == request.level_id,
        CustomLevel.is_published == True
    ).first()
    if not level:
        raise HTTPException(status_code=404, detail="关卡不存在")
    if not level.user_id:
        raise HTTPException(status_code=400, detail="关卡创作者信息缺失")
    
    creator_id = level.user_id
    player_id = current_user.id
    # 忽略客户端传入的creator_id/player_id，防止伪造
    
    # 记录点赞并发放金币
    result = WorkshopEarningsService.record_like(
        db=db,
        level_id=request.level_id,
        creator_id=creator_id,
        player_id=player_id
    )
    
    return result


@router.get("/earnings/{creator_id}")
async def get_workshop_earnings(
    creator_id: int,
    db: Session = Depends(get_db)
):
    """
    📊 获取创作者的工坊收益列表
    
    Args:
        creator_id: 创作者ID
        db: 数据库会话
        
    Returns:
        dict: 收益列表
    """
    # 验证创作者存在
    creator = db.query(User).filter(User.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="创作者不存在")
    
    earnings = WorkshopEarningsService.get_earnings(db, creator_id)
    
    return {
        'success': True,
        'creator_id': creator_id,
        'earnings': earnings,
        'total_levels': len(earnings),
        'total_coins': sum(e['total_coins'] for e in earnings)
    }


@router.get("/earnings/{creator_id}/level/{level_id}")
async def get_level_earning(
    creator_id: int,
    level_id: str,
    db: Session = Depends(get_db)
):
    """
    📊 获取特定关卡的收益信息
    
    Args:
        creator_id: 创作者ID
        level_id: 关卡ID
        db: 数据库会话
        
    Returns:
        dict: 关卡收益信息
    """
    # 验证创作者存在
    creator = db.query(User).filter(User.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="创作者不存在")
    
    earning = WorkshopEarningsService.get_level_earning(db, level_id, creator_id)
    
    return {
        'success': True,
        'creator_id': creator_id,
        **earning
    }

