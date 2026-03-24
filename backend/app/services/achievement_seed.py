"""
成就初始化/补充（进化与孵化扩展）
"""
from typing import List, Dict, Any
from app.models.achievement import Achievement


EVOLUTION_ACHIEVEMENTS: List[Dict[str, Any]] = [
    {
        "title": "初次孵化",
        "description": "成功孵化第 1 只宠物",
        "icon": "🥚",
        "condition_type": "hatch_count",
        "condition_value": 1,
        "reward_exp": 50,
        "reward_eggs": 0
    },
    {
        "title": "少年形态",
        "description": "将任意宠物进化到 少年期",
        "icon": "🌱",
        "condition_type": "evolution_stage",
        "condition_value": 2,
        "reward_exp": 120,
        "reward_eggs": 1
    },
    {
        "title": "成年形态",
        "description": "将任意宠物进化到 成年期",
        "icon": "⭐",
        "condition_type": "evolution_stage",
        "condition_value": 3,
        "reward_exp": 220,
        "reward_eggs": 1
    },
    {
        "title": "进化达人",
        "description": "累计完成 3 次进化",
        "icon": "🔥",
        "condition_type": "evolution_count",
        "condition_value": 3,
        "reward_exp": 300,
        "reward_eggs": 2
    },
    {
        "title": "终极形态",
        "description": "将任意宠物进化到 传说形态",
        "icon": "👑",
        "condition_type": "evolution_stage",
        "condition_value": 5,
        "reward_exp": 800,
        "reward_eggs": 3
    }
]


def ensure_evolution_achievements(db) -> None:
    """
    确保进化/孵化相关成就存在（幂等）
    """
    created = False
    for item in EVOLUTION_ACHIEVEMENTS:
        exists = db.query(Achievement).filter(
            Achievement.title == item["title"]
        ).first()
        if exists:
            continue
        db.add(Achievement(**item))
        created = True

    if created:
        db.commit()

