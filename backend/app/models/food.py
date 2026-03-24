"""
🍖 食物系统数据模型
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class FoodType(BaseModel):
    """食物类型定义"""
    id: str
    name: str
    icon: str
    rarity: str  # common, rare, epic, legendary
    price: int = 0  # 金币价格
    effects: Dict[str, int]  # hunger, happiness, intelligence, etc.
    description: str


class FoodInventoryItem(BaseModel):
    """食物背包物品"""
    user_id: int
    food_id: str
    quantity: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FoodReward(BaseModel):
    """食物奖励"""
    food_id: str
    quantity: int


# 食物类型配置
FOOD_TYPES: Dict[str, FoodType] = {
    'apple': FoodType(
        id='apple',
        name='苹果',
        icon='🍎',
        rarity='common',
        price=5,
        effects={'hunger': 10, 'happiness': 3},
        description='新鲜水果，恢复少量饱食度'
    ),
    'bread': FoodType(
        id='bread',
        name='面包',
        icon='🍞',
        rarity='common',
        price=8,
        effects={'hunger': 15, 'happiness': 2},
        description='基础食物，恢复饱食度'
    ),
    'fish': FoodType(
        id='fish',
        name='鱼',
        icon='🐟',
        rarity='common',
        price=12,
        effects={'hunger': 18, 'happiness': 5, 'intelligence': 2},
        description='营养食物，略微增加智力'
    ),
    'meat': FoodType(
        id='meat',
        name='肉',
        icon='🥩',
        rarity='rare',
        price=20,
        effects={'hunger': 25, 'happiness': 8, 'persistence': 2},
        description='高级食物，增加毅力'
    ),
    'milk': FoodType(
        id='milk',
        name='牛奶',
        icon='🥛',
        rarity='common',
        price=10,
        effects={'hunger': 12, 'happiness': 5},
        description='营养饮品，恢复饱食度和快乐值'
    ),
    'bone': FoodType(
        id='bone',
        name='肉骨头',
        icon='🍖',
        rarity='common',
        price=10,
        effects={'hunger': 20, 'happiness': 5},
        description='基础食物，恢复饱食度'
    ),
    'cake': FoodType(
        id='cake',
        name='蛋糕',
        icon='🍰',
        rarity='rare',
        price=30,
        effects={'hunger': 40, 'happiness': 15},
        description='高级食物，大幅恢复饱食度和快乐值'
    ),
    'star_cookie': FoodType(
        id='star_cookie',
        name='星星饼干',
        icon='🌟',
        rarity='epic',
        price=50,
        effects={'hunger': 30, 'happiness': 10, 'intelligence': 5},
        description='特殊食物，增加智力属性'
    ),
    'energy_drink': FoodType(
        id='energy_drink',
        name='能量饮料',
        icon='🥤',
        rarity='rare',
        price=40,
        effects={'hunger': 15, 'happiness': 20, 'persistence': 3},
        description='特殊饮料，增加毅力属性'
    ),
    'rainbow_candy': FoodType(
        id='rainbow_candy',
        name='彩虹糖果',
        icon='🍬',
        rarity='epic',
        price=60,
        effects={'hunger': 25, 'happiness': 25, 'creativity': 5},
        description='创意食物，增加创造力属性'
    ),
    'mystery_box': FoodType(
        id='mystery_box',
        name='神秘礼盒',
        icon='🎁',
        rarity='legendary',
        price=100,
        effects={'hunger': 50, 'happiness': 30, 'intelligence': 10, 'creativity': 10, 'persistence': 10},
        description='传说食物，全属性大幅提升'
    )
}


# 食物奖励配置
FOOD_REWARDS: Dict[str, Dict[str, int]] = {
    # 章节模式
    'level_easy': {'bone': 1},
    'level_medium': {'bone': 2},
    'level_hard': {'bone': 3, 'cake': 1},
    'code_quality_a': {'star_cookie': 1},
    'code_quality_b': {'bone': 1},
    
    # 战役模式
    'campaign_level': {'bone': 2},
    'boss_defeat': {'cake': 2, 'star_cookie': 1},
    
    # PvP对战
    'pvp_win': {'bone': 1, 'energy_drink': 1},
    'pvp_lose': {'bone': 1},  # 安慰奖
    
    # 创意工坊
    'workshop_publish': {'cake': 1},
    'workshop_10_plays': {'bone': 5},
    'workshop_5_likes': {'star_cookie': 2},
    'workshop_featured': {'mystery_box': 1},
    
    # 每日任务
    'daily_login': {'bone': 2},
    'daily_quest': {'cake': 1},
    
    # 排行榜
    'leaderboard_top10': {'mystery_box': 3},
    'leaderboard_top100': {'cake': 2}
}


def get_food_type(food_id: str) -> Optional[FoodType]:
    """获取食物类型"""
    return FOOD_TYPES.get(food_id)


def get_food_reward(reward_type: str) -> Dict[str, int]:
    """获取食物奖励配置"""
    return FOOD_REWARDS.get(reward_type, {})
