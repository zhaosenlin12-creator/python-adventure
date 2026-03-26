"""
食物奖励发放工具
"""
from typing import Dict, List, Any
from sqlalchemy import text

from app.core.time import utc_now_iso
from app.models.food import get_food_type


def grant_food_items(db, user_id: int, food_rewards: Dict[str, int]) -> List[Dict[str, Any]]:
    """
    发放食物奖励到 food_inventory

    Args:
        db: SQLAlchemy Session
        user_id: 用户ID
        food_rewards: {food_id: quantity}

    Returns:
        granted_items: [{food_id, food_name, food_icon, quantity}]
    """
    if not food_rewards:
        return []

    # 确保表存在
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

    granted_items: List[Dict[str, Any]] = []
    now = utc_now_iso()

    for food_id, qty in food_rewards.items():
        try:
            quantity = int(qty)
        except Exception:
            continue
        if quantity <= 0:
            continue

        food_type = get_food_type(food_id)
        if not food_type:
            continue

        row = db.execute(
            text("""
                SELECT quantity FROM food_inventory
                WHERE user_id = :user_id AND food_id = :food_id
            """),
            {"user_id": user_id, "food_id": food_id}
        ).fetchone()

        if row:
            new_quantity = row[0] + quantity
            db.execute(
                text("""
                    UPDATE food_inventory
                    SET quantity = :quantity, updated_at = :updated_at
                    WHERE user_id = :user_id AND food_id = :food_id
                """),
                {
                    "quantity": new_quantity,
                    "updated_at": now,
                    "user_id": user_id,
                    "food_id": food_id
                }
            )
        else:
            db.execute(
                text("""
                    INSERT INTO food_inventory (user_id, food_id, quantity, created_at, updated_at)
                    VALUES (:user_id, :food_id, :quantity, :created_at, :updated_at)
                """),
                {
                    "user_id": user_id,
                    "food_id": food_id,
                    "quantity": quantity,
                    "created_at": now,
                    "updated_at": now
                }
            )

        granted_items.append({
            "food_id": food_id,
            "food_name": food_type.name,
            "food_icon": food_type.icon,
            "quantity": quantity
        })

    return granted_items

