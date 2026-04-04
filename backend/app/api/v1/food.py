"""
🍖 食物系统API - 修复版
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import sqlite3
from datetime import datetime

from app.models.food import (
    FoodInventoryItem,
    FoodReward,
    FOOD_TYPES,
    get_food_type,
    get_food_reward
)
from app.api.dependencies import get_current_user
from app.core.database import ensure_database_ready, get_sqlite_db_path

router = APIRouter(tags=["food"])
logger = logging.getLogger(__name__)


def get_db():
    """获取数据库连接 - 带超时配置防止锁竞争"""
    ensure_database_ready()
    sqlite_path = get_sqlite_db_path()
    if not sqlite_path:
        raise RuntimeError("Food API requires a SQLite database path")
    conn = sqlite3.connect(sqlite_path, timeout=30.0)  # 30秒超时
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # 确保WAL模式
    conn.execute("PRAGMA busy_timeout=30000")  # 30秒忙等待
    return conn


# ==================== Pydantic 模型 ====================

class AddFoodRequest(BaseModel):
    food_id: str
    quantity: int = 1


class ConsumeFoodRequest(BaseModel):
    food_id: str
    quantity: int = 1


class GrantRewardRequest(BaseModel):
    reward_type: str


# ==================== API 端点 ====================

@router.get("/types")
async def get_food_types():
    """
    获取所有食物类型（无需认证）
    """
    return {
        'success': True,
        'food_types': [food.dict() for food in FOOD_TYPES.values()]
    }


@router.get("/inventory")
async def get_food_inventory(current_user = Depends(get_current_user)):
    """
    获取用户的食物背包
    """
    try:
        # current_user 是 User 对象，不是字典
        user_id = current_user.id if hasattr(current_user, 'id') else current_user['id']
        
        conn = get_db()
        cursor = conn.cursor()
        
        # 确保表存在
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                food_id TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, food_id)
            )
        """)
        conn.commit()
        
        # 查询用户的食物背包
        cursor.execute("""
            SELECT food_id, quantity, created_at, updated_at
            FROM food_inventory
            WHERE user_id = ? AND quantity > 0
            ORDER BY food_id
        """, (user_id,))
        
        rows = cursor.fetchall()
        
        # 构建返回数据
        inventory = []
        for row in rows:
            food_type = get_food_type(row['food_id'])
            if food_type:
                inventory.append({
                    'food_id': row['food_id'],
                    'food_type': food_type.dict(),
                    'quantity': row['quantity'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                })
        
        conn.close()
        
        return {
            'success': True,
            'inventory': inventory,
            'total_items': len(inventory)
        }
        
    except Exception as e:
        logger.exception("Failed to get food inventory")
        raise HTTPException(status_code=500, detail=f"Failed to get inventory: {str(e)}")


@router.post("/purchase")
async def purchase_food(
    request: AddFoodRequest,
    current_user = Depends(get_current_user)
):
    """
    购买食物（用金币）- 优化版：完全使用SQLAlchemy避免锁竞争
    """
    from app.services.coin_service import CoinService
    from app.core.database import SessionLocal
    from sqlalchemy import text
    
    # 创建数据库会话
    db = SessionLocal()
    
    try:
        user_id = current_user.id if hasattr(current_user, 'id') else current_user['id']
        food_id = request.food_id
        quantity = request.quantity
        
        
        # 验证食物类型
        food_type = get_food_type(food_id)
        if not food_type:
            raise HTTPException(status_code=400, detail=f"Invalid food_id: {food_id}")
        
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be positive")
        
        # 计算总价
        total_price = food_type.price * quantity
        
        # 检查用户金币是否足够
        user_balance = CoinService.get_balance(db, user_id)
        
        if user_balance < total_price:
            raise HTTPException(
                status_code=400,
                detail=f"金币不足。需要 {total_price} 金币，当前余额 {user_balance} 金币"
            )
        
        coin_deducted = False
        
        try:
            # 确保表存在（使用SQLAlchemy执行）
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
            
            # 1. 扣除金币
            success = CoinService.add_coins(
                db=db,
                user_id=user_id,
                amount=-total_price,
                type="purchase",
                source="food_shop",
                description=f"购买食物: {food_type.name} x{quantity}"
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="金币扣除失败")
            
            coin_deducted = True
            
            # 2. 查询现有食物（使用SQLAlchemy）
            result = db.execute(text("""
                SELECT quantity FROM food_inventory
                WHERE user_id = :user_id AND food_id = :food_id
            """), {"user_id": user_id, "food_id": food_id})
            row = result.fetchone()
            
            now = datetime.now().isoformat()
            
            if row:
                # 更新数量
                new_quantity = row[0] + quantity
                db.execute(text("""
                    UPDATE food_inventory
                    SET quantity = :quantity, updated_at = :updated_at
                    WHERE user_id = :user_id AND food_id = :food_id
                """), {"quantity": new_quantity, "updated_at": now, "user_id": user_id, "food_id": food_id})
            else:
                # 插入新记录
                db.execute(text("""
                    INSERT INTO food_inventory (user_id, food_id, quantity, created_at, updated_at)
                    VALUES (:user_id, :food_id, :quantity, :created_at, :updated_at)
                """), {"user_id": user_id, "food_id": food_id, "quantity": quantity, "created_at": now, "updated_at": now})
            
            db.commit()
            
            # 3. 获取更新后的数量
            result = db.execute(text("""
                SELECT quantity FROM food_inventory
                WHERE user_id = :user_id AND food_id = :food_id
            """), {"user_id": user_id, "food_id": food_id})
            row = result.fetchone()
            new_total = row[0] if row else 0
            
            # 4. 获取最新金币余额
            final_balance = CoinService.get_balance(db, user_id)
            
            return {
                'success': True,
                'message': f'购买成功！获得 {food_type.name} x{quantity}',
                'food_id': food_id,
                'food_name': food_type.name,
                'quantity_purchased': quantity,
                'new_quantity': new_total,
                'coins_spent': total_price,
                'remaining_coins': final_balance
            }
            
        except HTTPException:
            db.rollback()
            
            # 如果金币已扣除，回滚
            if coin_deducted:
                try:
                    CoinService.add_coins(
                        db=db,
                        user_id=user_id,
                        amount=total_price,
                        type="refund",
                        source="food_shop",
                        description=f"购买失败退款: {food_type.name} x{quantity}"
                    )
                    logger.warning("Rolled back food purchase coin deduction for user %s", user_id)
                except Exception as refund_error:
                    logger.exception("Food purchase refund failed for user %s", user_id)
            
            raise
            
        except Exception as e:
            db.rollback()
            
            # 如果金币已扣除，回滚
            if coin_deducted:
                try:
                    CoinService.add_coins(
                        db=db,
                        user_id=user_id,
                        amount=total_price,
                        type="refund",
                        source="food_shop",
                        description=f"购买失败退款: {food_type.name} x{quantity}"
                    )
                    logger.warning("Rolled back food purchase coin deduction after exception for user %s", user_id)
                except Exception as refund_error:
                    logger.exception("Food purchase refund failed after exception for user %s", user_id)
            
            logger.exception("Food purchase failed for user %s", user_id)
            raise HTTPException(status_code=500, detail=f"购买失败: {str(e)}")
    
    finally:
        db.close()



@router.post("/add")
async def add_food(
    request: AddFoodRequest,
    current_user = Depends(get_current_user)
):
    """
    添加食物到背包
    """
    user_id = current_user.id if hasattr(current_user, 'id') else current_user['id']
    food_id = request.food_id
    quantity = request.quantity
    
    # 验证食物类型
    food_type = get_food_type(food_id)
    if not food_type:
        raise HTTPException(status_code=400, detail=f"Invalid food_id: {food_id}")
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 检查是否已存在
        cursor.execute("""
            SELECT quantity FROM food_inventory
            WHERE user_id = ? AND food_id = ?
        """, (user_id, food_id))
        
        row = cursor.fetchone()
        
        if row:
            # 更新数量
            new_quantity = row['quantity'] + quantity
            cursor.execute("""
                UPDATE food_inventory
                SET quantity = ?, updated_at = ?
                WHERE user_id = ? AND food_id = ?
            """, (new_quantity, datetime.now().isoformat(), user_id, food_id))
        else:
            # 插入新记录
            cursor.execute("""
                INSERT INTO food_inventory (user_id, food_id, quantity, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, food_id, quantity, datetime.now().isoformat(), datetime.now().isoformat()))
        
        conn.commit()
        
        # 获取更新后的数量
        cursor.execute("""
            SELECT quantity FROM food_inventory
            WHERE user_id = ? AND food_id = ?
        """, (user_id, food_id))
        
        result = cursor.fetchone()
        
        return {
            'success': True,
            'message': f'Added {quantity} {food_type.name}',
            'food_id': food_id,
            'new_quantity': result['quantity'] if result else 0
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add food: {str(e)}")
    finally:
        conn.close()


@router.post("/consume")
async def consume_food(
    request: ConsumeFoodRequest,
    current_user = Depends(get_current_user)
):
    """
    消耗食物
    """
    user_id = current_user.id if hasattr(current_user, 'id') else current_user['id']
    food_id = request.food_id
    quantity = request.quantity
    
    # 验证食物类型
    food_type = get_food_type(food_id)
    if not food_type:
        raise HTTPException(status_code=400, detail=f"Invalid food_id: {food_id}")
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 检查是否有足够的食物
        cursor.execute("""
            SELECT quantity FROM food_inventory
            WHERE user_id = ? AND food_id = ?
        """, (user_id, food_id))
        
        row = cursor.fetchone()
        
        if not row or row['quantity'] < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough {food_type.name}. Available: {row['quantity'] if row else 0}, Required: {quantity}"
            )
        
        # 扣除数量
        new_quantity = row['quantity'] - quantity
        
        cursor.execute("""
            UPDATE food_inventory
            SET quantity = ?, updated_at = ?
            WHERE user_id = ? AND food_id = ?
        """, (new_quantity, datetime.now().isoformat(), user_id, food_id))
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Consumed {quantity} {food_type.name}',
            'food_id': food_id,
            'effects': food_type.effects,
            'remaining_quantity': new_quantity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to consume food: {str(e)}")
    finally:
        conn.close()


@router.post("/reward")
async def grant_food_reward(
    request: GrantRewardRequest,
    current_user = Depends(get_current_user)
):
    """
    发放食物奖励
    """
    user_id = current_user.id if hasattr(current_user, 'id') else current_user['id']
    reward_type = request.reward_type
    
    # 获取奖励配置
    rewards = get_food_reward(reward_type)
    if not rewards:
        raise HTTPException(status_code=400, detail=f"Invalid reward_type: {reward_type}")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        granted_items = []
        
        # 发放每种食物
        for food_id, quantity in rewards.items():
            food_type = get_food_type(food_id)
            if not food_type:
                continue
            
            # 检查是否已存在
            cursor.execute("""
                SELECT quantity FROM food_inventory
                WHERE user_id = ? AND food_id = ?
            """, (user_id, food_id))
            
            row = cursor.fetchone()
            
            if row:
                # 更新数量
                new_quantity = row['quantity'] + quantity
                cursor.execute("""
                    UPDATE food_inventory
                    SET quantity = ?, updated_at = ?
                    WHERE user_id = ? AND food_id = ?
                """, (new_quantity, datetime.now().isoformat(), user_id, food_id))
            else:
                # 插入新记录
                cursor.execute("""
                    INSERT INTO food_inventory (user_id, food_id, quantity, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, food_id, quantity, datetime.now().isoformat(), datetime.now().isoformat()))
            
            granted_items.append({
                'food_id': food_id,
                'food_name': food_type.name,
                'food_icon': food_type.icon,
                'quantity': quantity
            })
        
        conn.commit()
        
        return {
            'success': True,
            'message': f'Granted reward: {reward_type}',
            'reward_type': reward_type,
            'items': granted_items
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to grant reward: {str(e)}")
    finally:
        conn.close()
