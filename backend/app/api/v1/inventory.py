"""
背包系统API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.inventory import Item, UserInventory
from pydantic import BaseModel, ConfigDict

router = APIRouter()

class ItemInfo(BaseModel):
    """物品信息"""
    id: int
    name: str
    description: str
    icon: str
    item_type: str
    rarity: str
    effects: dict
    quantity: int
    is_equipped: bool

    model_config = ConfigDict(from_attributes=True)

class UseItemRequest(BaseModel):
    """使用物品请求"""
    item_id: int
    quantity: int = 1

@router.get("/items", response_model=List[ItemInfo])
async def get_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取背包物品列表"""
    inventory_items = db.query(UserInventory).filter(
        UserInventory.user_id == current_user.id
    ).all()
    
    result = []
    for inv_item in inventory_items:
        item = db.query(Item).filter(Item.id == inv_item.item_id).first()
        if item:
            result.append({
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "icon": item.icon,
                "item_type": item.item_type,
                "rarity": item.rarity,
                "effects": item.effects,
                "quantity": inv_item.quantity,
                "is_equipped": inv_item.is_equipped
            })
    
    return result

@router.post("/use")
async def use_item(
    request: UseItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """使用物品"""
    # 查找物品
    inv_item = db.query(UserInventory).filter(
        UserInventory.user_id == current_user.id,
        UserInventory.item_id == request.item_id
    ).first()
    
    if not inv_item:
        raise HTTPException(status_code=404, detail="物品不存在")
    
    if inv_item.quantity < request.quantity:
        raise HTTPException(status_code=400, detail="物品数量不足")
    
    # 获取物品详情
    item = db.query(Item).filter(Item.id == request.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="物品模板不存在")
    
    # 应用物品效果
    rewards = {}
    if item.item_type == "consumable":
        if "experience" in item.effects:
            exp_gained = item.effects["experience"] * request.quantity
            leveled_up = current_user.add_experience(exp_gained)
            rewards["experience"] = exp_gained
            rewards["leveled_up"] = leveled_up
        
        # 扣除物品数量
        inv_item.quantity -= request.quantity
        if inv_item.quantity <= 0:
            db.delete(inv_item)
        
        db.commit()
    
    elif item.item_type == "equipment":
        # 装备/卸下
        inv_item.is_equipped = not inv_item.is_equipped
        db.commit()
        rewards["equipped"] = inv_item.is_equipped
    
    return {
        "success": True,
        "message": f"使用了 {item.name} x{request.quantity}",
        "rewards": rewards,
        "user": {
            "level": current_user.level,
            "experience": current_user.experience
        }
    }

@router.get("/all-items")
async def get_all_items(db: Session = Depends(get_db)):
    """获取所有物品模板（商店用）"""
    items = db.query(Item).all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "icon": item.icon,
            "item_type": item.item_type,
            "rarity": item.rarity,
            "effects": item.effects,
            "sell_price": item.sell_price,
            "can_trade": item.can_trade
        }
        for item in items
    ]




