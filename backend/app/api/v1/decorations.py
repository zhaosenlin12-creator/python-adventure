"""
装饰品系统API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict, field_validator
import re
import time
import logging
from collections import defaultdict

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.decoration import UserDecoration, PlacedDecoration

logger = logging.getLogger(__name__)


router = APIRouter()
# 与前端 DECORATIONS 保持一致的装饰品目录
DECORATION_CATALOG = {
    "sofa_red": {
        "name": "红色沙发",
        "description": "舒适的红色沙发，宠物最爱",
        "category": "furniture",
        "price": 100,
        "icon": "🛋️",
        "unlockLevel": 1
    },
    "table_wood": {
        "name": "木质桌子",
        "description": "简约的木质桌子",
        "category": "furniture",
        "price": 80,
        "icon": "🪑",
        "unlockLevel": 1
    },
    "bookshelf": {
        "name": "书架",
        "description": "装满书的书架，增加智力",
        "category": "furniture",
        "price": 200,
        "icon": "📚",
        "unlockLevel": 5
    },
    "plant_small": {
        "name": "小盆栽",
        "description": "可爱的小盆栽",
        "category": "plant",
        "price": 50,
        "icon": "🌱",
        "unlockLevel": 1
    },
    "plant_flower": {
        "name": "花盆",
        "description": "美丽的花朵",
        "category": "plant",
        "price": 60,
        "icon": "🌸",
        "unlockLevel": 1
    },
    "plant_tree": {
        "name": "小树",
        "description": "茁壮成长的小树",
        "category": "plant",
        "price": 150,
        "icon": "🌳",
        "unlockLevel": 3
    },
    "toy_ball": {
        "name": "小球",
        "description": "宠物最爱的玩具球",
        "category": "toy",
        "price": 30,
        "icon": "⚽",
        "unlockLevel": 1
    },
    "toy_robot": {
        "name": "机器人玩具",
        "description": "科技感十足的机器人",
        "category": "toy",
        "price": 120,
        "icon": "🤖",
        "unlockLevel": 5
    },
    "toy_teddy": {
        "name": "泰迪熊",
        "description": "超级可爱的泰迪熊",
        "category": "toy",
        "price": 250,
        "icon": "🧸",
        "unlockLevel": 10
    },
    # ─── 新增 12 种装饰品 ───
    "lamp_floor": {
        "name": "落地灯",
        "description": "暖色灯光点亮小屋",
        "category": "furniture",
        "price": 90,
        "icon": "💡",
        "unlockLevel": 2
    },
    "rug_round": {
        "name": "圆形地毯",
        "description": "柔软温暖的圆形地毯",
        "category": "furniture",
        "price": 70,
        "icon": "🧶",
        "unlockLevel": 2
    },
    "clock_wall": {
        "name": "挂钟",
        "description": "复古圆形挂钟，追寻时光",
        "category": "furniture",
        "price": 120,
        "icon": "🕰️",
        "unlockLevel": 4
    },
    "bed_cozy": {
        "name": "温馨小床",
        "description": "蓝色被子和软枕子，宝贝的梦乡",
        "category": "furniture",
        "price": 180,
        "icon": "🛏️",
        "unlockLevel": 6
    },
    "fish_tank": {
        "name": "观赏鱼缸",
        "description": "热带鱼在水草中游动，治愈力满分",
        "category": "nature",
        "price": 300,
        "icon": "🐠",
        "unlockLevel": 8
    },
    "cactus": {
        "name": "开花仙人掌",
        "description": "顶上开着粉色小花的可爱仙人掌",
        "category": "nature",
        "price": 55,
        "icon": "🌵",
        "unlockLevel": 1
    },
    "flower_vase": {
        "name": "花瓶花束",
        "description": "紫色花瓶配五彩花束，美不胜收",
        "category": "nature",
        "price": 140,
        "icon": "🌺",
        "unlockLevel": 3
    },
    "cat_tower": {
        "name": "猫爪架",
        "description": "多层猫爪架带洞穴和吊球，宠物的乐园",
        "category": "fun",
        "price": 280,
        "icon": "🐱",
        "unlockLevel": 7
    },
    "music_box": {
        "name": "音乐盒",
        "description": "打开盒盖，流淌出柔和旋律",
        "category": "fun",
        "price": 160,
        "icon": "🎵",
        "unlockLevel": 5
    },
    "tv_retro": {
        "name": "复古电视机",
        "description": "带天线和旋钮的复古CRT电视",
        "category": "fun",
        "price": 200,
        "icon": "📺",
        "unlockLevel": 6
    },
    "fairy_lights": {
        "name": "彩色串灯",
        "description": "七彩灯泡营造梦幻氛围",
        "category": "decor",
        "price": 130,
        "icon": "✨",
        "unlockLevel": 4
    },
    "picture_frame": {
        "name": "山水画框",
        "description": "精美木框裱着山水绿意，挂在墙上赏心悦目",
        "category": "decor",
        "price": 220,
        "icon": "🖼️",
        "unlockLevel": 8
    }
}


# ── 购买频率限制（内存级，每用户每分钟最多5次） ──
_purchase_ts: dict[int, list[float]] = defaultdict(list)
_RATE_LIMIT = 5
_RATE_WINDOW = 60  # seconds

def _check_purchase_rate(user_id: int) -> bool:
    now = time.time()
    ts = _purchase_ts[user_id]
    ts[:] = [t for t in ts if now - t < _RATE_WINDOW]
    if len(ts) >= _RATE_LIMIT:
        return False
    ts.append(now)
    return True

# 装饰品ID格式：小写字母开头，只含字母数字下划线，最长50字符
_DECO_ID_RE = re.compile(r'^[a-z][a-z0-9_]{0,49}$')

# 每个场景最多放置装饰品数量
MAX_PLACED_PER_SCENE = 50


# ==================== Pydantic 模型 ====================

class DecorationPurchaseRequest(BaseModel):
    decoration_id: str

    @field_validator('decoration_id')
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not _DECO_ID_RE.match(v):
            raise ValueError('无效的装饰品ID格式')
        return v


class DecorationPlaceRequest(BaseModel):
    decoration_id: str
    scene: str  # 'living' or 'garden'
    x: float
    y: float
    rotation: float = 0

    @field_validator('decoration_id')
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not _DECO_ID_RE.match(v):
            raise ValueError('无效的装饰品ID格式')
        return v

    @field_validator('scene')
    @classmethod
    def validate_scene(cls, v: str) -> str:
        if v not in ('living', 'garden'):
            raise ValueError('无效的场景')
        return v

    @field_validator('x', 'y')
    @classmethod
    def clamp_coord(cls, v: float) -> float:
        return max(0.0, min(100.0, float(v)))

    @field_validator('rotation')
    @classmethod
    def clamp_rotation(cls, v: float) -> float:
        return float(v) % 360


class DecorationUpdateRequest(BaseModel):
    x: float | None = None
    y: float | None = None
    rotation: float | None = None
    scene: str | None = None

    @field_validator('scene')
    @classmethod
    def validate_scene(cls, v):
        if v is not None and v not in ('living', 'garden'):
            raise ValueError('无效的场景')
        return v

    @field_validator('x', 'y')
    @classmethod
    def clamp_coord(cls, v):
        if v is not None:
            return max(0.0, min(100.0, float(v)))
        return v

    @field_validator('rotation')
    @classmethod
    def clamp_rotation(cls, v):
        if v is not None:
            return float(v) % 360
        return v


class UserDecorationResponse(BaseModel):
    decoration_id: str
    quantity: int
    purchased_at: str
    
    model_config = ConfigDict(from_attributes=True)


class PlacedDecorationResponse(BaseModel):
    id: int
    decoration_id: str
    scene: str
    x: float
    y: float
    rotation: float
    placed_at: str
    
    model_config = ConfigDict(from_attributes=True)


# ==================== API 端点 ====================

@router.get("/", response_model=List[dict])
async def get_all_decorations():
    """获取所有可用的装饰品（商店列表）"""
    return [
        {
            "id": decoration_id,
            "name": info["name"],
            "description": info["description"],
            "category": info["category"],
            "price": info["price"],
            "icon": info["icon"],
            "unlockLevel": info["unlockLevel"]
        }
        for decoration_id, info in DECORATION_CATALOG.items()
    ]


@router.get("/my", response_model=List[UserDecorationResponse])
async def get_my_decorations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户拥有的装饰品"""
    decorations = db.query(UserDecoration).filter(
        UserDecoration.user_id == current_user.id
    ).all()
    
    return [
        UserDecorationResponse(
            decoration_id=d.decoration_id,
            quantity=d.quantity,
            purchased_at=d.purchased_at.isoformat()
        )
        for d in decorations
    ]


@router.get("/placed", response_model=List[PlacedDecorationResponse])
async def get_placed_decorations(
    scene: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取已放置的装饰品"""
    query = db.query(PlacedDecoration).filter(
        PlacedDecoration.user_id == current_user.id
    )
    
    if scene:
        query = query.filter(PlacedDecoration.scene == scene)
    
    placed = query.all()
    
    return [
        PlacedDecorationResponse(
            id=p.id,
            decoration_id=p.decoration_id,
            scene=p.scene,
            x=p.x,
            y=p.y,
            rotation=p.rotation,
            placed_at=p.placed_at.isoformat()
        )
        for p in placed
    ]


@router.post("/purchase")
async def purchase_decoration(
    request: DecorationPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """购买装饰品 - 带频率限制、等级校验、原子扣款"""
    from app.services.coin_service import CoinService
    
    # 🔒 频率限制
    if not _check_purchase_rate(current_user.id):
        raise HTTPException(status_code=429, detail="操作过于频繁，请稍后再试")
    
    # 验证装饰品是否存在
    if request.decoration_id not in DECORATION_CATALOG:
        raise HTTPException(status_code=400, detail="装饰品不存在")
    
    catalog_item = DECORATION_CATALOG[request.decoration_id]
    price = catalog_item["price"]
    
    # 🔒 等级限制
    if current_user.level < catalog_item["unlockLevel"]:
        raise HTTPException(
            status_code=400,
            detail=f"需要等级 {catalog_item['unlockLevel']} 才能购买"
        )
    
    coin_deducted = False
    
    try:
        # 🔒 原子扣款（CoinService 内部使用 UPDATE WHERE 保证原子性）
        success = CoinService.add_coins(
            db=db,
            user_id=current_user.id,
            amount=-price,
            type="purchase",
            source="decoration_shop",
            description=f"购买装饰品: {request.decoration_id}"
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="金币不足")
        
        coin_deducted = True
        
        # 更新或创建装饰品拥有记录
        existing = db.query(UserDecoration).filter(
            UserDecoration.user_id == current_user.id,
            UserDecoration.decoration_id == request.decoration_id
        ).first()
        
        if existing:
            existing.quantity += 1
        else:
            existing = UserDecoration(
                user_id=current_user.id,
                decoration_id=request.decoration_id,
                quantity=1
            )
            db.add(existing)
        
        db.commit()
        db.refresh(existing)
        
        remaining = CoinService.get_balance(db, current_user.id)
        
        return {
            "success": True,
            "message": "购买成功",
            "coins_spent": price,
            "remaining_coins": remaining,
            "decoration": UserDecorationResponse(
                decoration_id=existing.decoration_id,
                quantity=existing.quantity,
                purchased_at=existing.purchased_at.isoformat()
            )
        }
    
    except HTTPException:
        db.rollback()
        if coin_deducted:
            try:
                CoinService.add_coins(
                    db=db, user_id=current_user.id, amount=price,
                    type="refund", source="decoration_shop",
                    description=f"购买失败退款: {request.decoration_id}"
                )
            except Exception:
                logger.error(f"Refund failed for user {current_user.id}, amount {price}")
        raise
    
    except Exception as e:
        db.rollback()
        if coin_deducted:
            try:
                CoinService.add_coins(
                    db=db, user_id=current_user.id, amount=price,
                    type="refund", source="decoration_shop",
                    description=f"购买失败退款: {request.decoration_id}"
                )
            except Exception:
                logger.error(f"Refund failed for user {current_user.id}, amount {price}")
        logger.exception(f"Purchase failed for user {current_user.id}")
        # 🔒 不泄露内部异常信息
        raise HTTPException(status_code=500, detail="购买失败，请稍后再试")


@router.post("/place")
async def place_decoration(
    request: DecorationPlaceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """放置装饰品"""
    
    # 检查是否拥有该装饰品
    owned = db.query(UserDecoration).filter(
        UserDecoration.user_id == current_user.id,
        UserDecoration.decoration_id == request.decoration_id
    ).first()
    
    if not owned or owned.quantity <= 0:
        raise HTTPException(status_code=400, detail="没有该装饰品或数量不足")
    
    # 🔒 场景放置数量限制
    placed_count = db.query(PlacedDecoration).filter(
        PlacedDecoration.user_id == current_user.id,
        PlacedDecoration.scene == request.scene
    ).count()
    
    if placed_count >= MAX_PLACED_PER_SCENE:
        raise HTTPException(
            status_code=400,
            detail=f"每个场景最多放置 {MAX_PLACED_PER_SCENE} 个装饰品"
        )
    
    # 创建放置记录
    placed = PlacedDecoration(
        user_id=current_user.id,
        decoration_id=request.decoration_id,
        scene=request.scene,
        x=request.x,
        y=request.y,
        rotation=request.rotation
    )
    db.add(placed)
    
    # 减少拥有数量
    owned.quantity -= 1
    
    db.commit()
    db.refresh(placed)
    
    return {
        "success": True,
        "message": "放置成功",
        "placed": PlacedDecorationResponse(
            id=placed.id,
            decoration_id=placed.decoration_id,
            scene=placed.scene,
            x=placed.x,
            y=placed.y,
            rotation=placed.rotation,
            placed_at=placed.placed_at.isoformat()
        )
    }


@router.delete("/placed/{placed_id}")
async def remove_decoration(
    placed_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """移除已放置的装饰品"""
    
    # 查找放置记录
    placed = db.query(PlacedDecoration).filter(
        PlacedDecoration.id == placed_id,
        PlacedDecoration.user_id == current_user.id
    ).first()
    
    if not placed:
        raise HTTPException(status_code=404, detail="未找到该装饰品")
    
    decoration_id = placed.decoration_id
    
    # 删除放置记录
    db.delete(placed)
    
    # 增加拥有数量
    owned = db.query(UserDecoration).filter(
        UserDecoration.user_id == current_user.id,
        UserDecoration.decoration_id == decoration_id
    ).first()
    
    if owned:
        owned.quantity += 1
    else:
        # 如果不存在，创建新记录
        new_decoration = UserDecoration(
            user_id=current_user.id,
            decoration_id=decoration_id,
            quantity=1
        )
        db.add(new_decoration)
    
    db.commit()
    
    return {
        "success": True,
        "message": "移除成功"
    }


@router.patch("/placed/{placed_id}")
async def update_decoration_position(
    placed_id: int,
    request: DecorationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新已放置装饰品的位置/旋转/场景"""
    placed = db.query(PlacedDecoration).filter(
        PlacedDecoration.id == placed_id,
        PlacedDecoration.user_id == current_user.id
    ).first()

    if not placed:
        raise HTTPException(status_code=404, detail="未找到该装饰品")

    if request.scene and request.scene not in ['living', 'garden']:
        raise HTTPException(status_code=400, detail="无效的场景")

    if request.x is not None:
        placed.x = request.x
    if request.y is not None:
        placed.y = request.y
    if request.rotation is not None:
        placed.rotation = request.rotation
    if request.scene is not None:
        placed.scene = request.scene

    db.commit()
    db.refresh(placed)

    return {
        "success": True,
        "message": "更新成功",
        "placed": PlacedDecorationResponse(
            id=placed.id,
            decoration_id=placed.decoration_id,
            scene=placed.scene,
            x=placed.x,
            y=placed.y,
            rotation=placed.rotation,
            placed_at=placed.placed_at.isoformat()
        )
    }
