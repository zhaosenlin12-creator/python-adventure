"""
金币API接口
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.coin_service import CoinService
from app.core.config import settings

router = APIRouter(prefix="/coins", tags=["coins"])

# 客户端可触发的金币奖励来源与上限（用于防刷）
CLIENT_COIN_LIMITS = {
    "level_complete": 50,
    "wheel_spin": 100,
    "campaign_level_complete": 300,
}
MAX_DESCRIPTION_LENGTH = 255


# ============ Pydantic模型 ============

class CoinBalanceResponse(BaseModel):
    """金币余额响应"""
    user_id: int
    username: str
    coins: int
    
    model_config = ConfigDict(from_attributes=True)


class CoinTransactionResponse(BaseModel):
    """金币交易记录响应"""
    id: int
    amount: int
    type: str
    source: str
    description: str | None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CoinHistoryResponse(BaseModel):
    """金币历史响应"""
    transactions: List[CoinTransactionResponse]
    total_count: int


class CoinRewardRequest(BaseModel):
    """金币奖励请求(内部接口)"""
    user_id: int
    amount: int
    type: str
    source: str
    description: str | None = None
    transaction_id: str | None = None  # 唯一交易ID,防止重复发放


class CoinAddClientRequest(BaseModel):
    """客户端请求增加金币"""
    amount: int
    type: str = "earn"
    source: str
    description: str | None = None
    transaction_id: str | None = None


# ============ API端点 ============

@router.post("/add", status_code=status.HTTP_200_OK)
async def add_coins_client(
    request: CoinAddClientRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    客户端请求增加金币 (例如游戏胜利)
    自动关联到当前用户
    """
    source = request.source.strip()
    if not source or source not in CLIENT_COIN_LIMITS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的金币来源"
        )

    if request.type != "earn":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 earn 类型的客户端奖励"
        )

    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="金币数量必须为正数"
        )

    max_amount = CLIENT_COIN_LIMITS[source]
    if request.amount > max_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"金币数量超出限制(最大{max_amount})"
        )

    description = request.description
    if description and len(description) > MAX_DESCRIPTION_LENGTH:
        description = description[:MAX_DESCRIPTION_LENGTH]
    success = CoinService.add_coins(
        db=db,
        user_id=current_user.id,  # 强制使用当前用户ID
        amount=request.amount,
        type=request.type,
        source=source,
        description=description,
        transaction_id=request.transaction_id
    )
    
    if not success:
        if request.transaction_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="金币已发放或发放失败"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="金币发放失败"
            )
    
    # 获取更新后的余额
    balance = CoinService.get_balance(db, current_user.id)
    
    return {
        "success": True,
        "message": "金币获取成功",
        "balance": balance,
        "coins": balance  # 兼容前端可能使用的字段
    }

@router.get("/balance", response_model=CoinBalanceResponse)
async def get_coin_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的金币余额
    """
    # 刷新用户数据以获取最新金币
    db.refresh(current_user)
    
    return CoinBalanceResponse(
        user_id=current_user.id,
        username=current_user.username,
        coins=current_user.coins if current_user.coins is not None else 0
    )


@router.get("/history", response_model=CoinHistoryResponse)
async def get_coin_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的金币交易历史
    
    Args:
        limit: 返回数量限制(默认50)
    """
    transactions = CoinService.get_transaction_history(
        db=db,
        user_id=current_user.id,
        limit=limit
    )
    
    return CoinHistoryResponse(
        transactions=[
            CoinTransactionResponse(
                id=t.id,
                amount=t.amount,
                type=t.type,
                source=t.source,
                description=t.description,
                created_at=t.created_at
            )
            for t in transactions
        ],
        total_count=len(transactions)
    )


@router.post("/reward", status_code=status.HTTP_200_OK)
async def reward_coins(
    request: CoinRewardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    internal_token: str | None = Header(None, alias="X-Internal-Token")
):
    """
    发放金币奖励(内部接口)
    
    注意: 这个接口应该只被服务端内部调用,不应该暴露给客户端
    在生产环境中应该添加额外的权限验证
    
    支持幂等性: 提供 transaction_id 可防止重复发放
    """
    # 生产环境限制内部接口访问（使用内部Token或关闭）
    if settings.ENVIRONMENT.lower() == "production":
        if not settings.INTERNAL_REWARD_TOKEN:
            raise HTTPException(status_code=403, detail="奖励接口已禁用")
        if internal_token != settings.INTERNAL_REWARD_TOKEN:
            raise HTTPException(status_code=403, detail="权限不足")
    
    success = CoinService.add_coins(
        db=db,
        user_id=request.user_id,
        amount=request.amount,
        type=request.type,
        source=request.source,
        description=request.description,
        transaction_id=request.transaction_id
    )
    
    if not success:
        # 如果提供了transaction_id且失败,可能是重复发放
        if request.transaction_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="金币已发放或发放失败(可能是重复请求)"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="金币发放失败"
            )
    
    # 获取更新后的余额
    balance = CoinService.get_balance(db, request.user_id)
    
    return {
        "success": True,
        "message": "金币发放成功",
        "new_balance": balance
    }
