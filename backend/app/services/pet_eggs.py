from typing import List
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.pet import Pet


def grant_pet_eggs(
    db: Session,
    user_id: int,
    count: int = 1,
    name: str = "神秘的蛋"
) -> List[Pet]:
    """为用户创建指定数量的宠物蛋（不提交事务，由调用方提交）"""
    if count <= 0:
        return []

    eggs: List[Pet] = []
    for _ in range(count):
        egg = Pet(
            user_id=user_id,
            pet_type='egg',
            pet_style='unknown',
            name=name,
            level=1,
            exp=0,
            hp=100,
            intelligence=0,
            creativity=0,
            persistence=0,
            code_quality=0,
            creator_value=0,
            battle_power=0,
            status='egg',
            is_egg=1,
            hatch_progress=0,
            intimacy=0,
            evolution_stage=0,
            last_feed_time=utc_now()
        )
        db.add(egg)
        eggs.append(egg)

    # 刷新以获得ID（由调用方提交）
    db.flush()
    return eggs
