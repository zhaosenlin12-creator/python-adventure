"""
初始化技能和宠物系统
基于教案内容设计
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.skill import Skill, Pet

def init_skills():
    """初始化技能系统"""
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(Skill).delete()
        
        # 技能数据（基于教案内容）
        skills = [
            # Turtle画图系列
            Skill(
                name="海龟冲刺",
                category="turtle",
                description="使用turtle的速度画出快速线条，对敌人造成伤害",
                icon="🐢",
                power=15,
                accuracy=85,
                cooldown=2,
                unlock_level=1,
                effects={"type": "damage", "value": 15}
            ),
            Skill(
                name="彩虹护盾",
                category="turtle",
                description="用turtle画出彩虹圆圈保护自己",
                icon="🌈",
                power=0,
                accuracy=100,
                cooldown=4,
                unlock_level=3,
                effects={"type": "buff", "defense": 20, "duration": 2}
            ),
            Skill(
                name="几何陷阱",
                category="turtle",
                description="画出复杂几何图形困住对手",
                icon="📐",
                power=20,
                accuracy=75,
                cooldown=3,
                unlock_level=5,
                effects={"type": "damage", "value": 20, "debuff": "stun"}
            ),
            
            # Random随机系列
            Skill(
                name="随机爆发",
                category="random",
                description="使用random生成随机伤害，可能暴击！",
                icon="🎲",
                power=25,
                accuracy=70,
                cooldown=3,
                unlock_level=4,
                effects={"type": "damage", "value_range": [10, 40], "crit_chance": 30}
            ),
            Skill(
                name="幸运转盘",
                category="random",
                description="随机获得增益效果",
                icon="🍀",
                power=0,
                accuracy=100,
                cooldown=5,
                unlock_level=6,
                effects={"type": "random_buff", "options": ["heal", "attack", "defense"]}
            ),
            
            # 循环系列
            Skill(
                name="循环打击",
                category="loop",
                description="使用for循环连续攻击3次",
                icon="🔄",
                power=30,
                accuracy=80,
                cooldown=4,
                unlock_level=5,
                effects={"type": "damage", "value": 10, "hits": 3}
            ),
            Skill(
                name="无限守护",
                category="loop",
                description="while循环持续回复生命值",
                icon="♾️",
                power=0,
                accuracy=100,
                cooldown=6,
                unlock_level=8,
                effects={"type": "heal", "value": 15, "duration": 3}
            ),
            
            # 面向对象系列
            Skill(
                name="类的力量",
                category="oop",
                description="创建强大的对象实例攻击敌人",
                icon="🏛️",
                power=35,
                accuracy=85,
                cooldown=4,
                unlock_level=10,
                effects={"type": "damage", "value": 35}
            ),
            Skill(
                name="继承之术",
                category="oop",
                description="继承上一个技能的效果",
                icon="🧬",
                power=0,
                accuracy=100,
                cooldown=5,
                unlock_level=12,
                effects={"type": "copy_last_skill"}
            ),
            
            # Pillow图像处理
            Skill(
                name="像素风暴",
                category="pillow",
                description="使用PIL处理图像，造成范围伤害",
                icon="🖼️",
                power=30,
                accuracy=80,
                cooldown=4,
                unlock_level=14,
                effects={"type": "damage", "value": 30, "area": True}
            ),
            Skill(
                name="滤镜防护",
                category="pillow",
                description="应用图像滤镜提升防御",
                icon="🎨",
                power=0,
                accuracy=100,
                cooldown=5,
                unlock_level=15,
                effects={"type": "buff", "defense": 30, "duration": 3}
            ),
            
            # 游戏开发系列
            Skill(
                name="Arcade爆炸",
                category="game",
                description="使用arcade库的特效造成爆炸伤害",
                icon="💥",
                power=40,
                accuracy=85,
                cooldown=5,
                unlock_level=16,
                effects={"type": "damage", "value": 40, "area": True}
            ),
            Skill(
                name="Pygame加速",
                category="game",
                description="游戏引擎的加速效果",
                icon="⚡",
                power=0,
                accuracy=100,
                cooldown=4,
                unlock_level=17,
                effects={"type": "buff", "speed": 50, "duration": 2}
            ),
            
            # 密码学系列
            Skill(
                name="加密术",
                category="crypto",
                description="加密数据保护自己",
                icon="🔒",
                power=0,
                accuracy=100,
                cooldown=6,
                unlock_level=18,
                effects={"type": "buff", "defense": 40, "reflect": 10, "duration": 2}
            ),
            Skill(
                name="解密攻击",
                category="crypto",
                description="破解对手防御造成巨额伤害",
                icon="🔓",
                power=45,
                accuracy=75,
                cooldown=5,
                unlock_level=19,
                effects={"type": "damage", "value": 45, "ignore_defense": 50}
            ),
            
            # 网络编程
            Skill(
                name="数据流",
                category="network",
                description="发送大量数据包攻击对手",
                icon="📡",
                power=35,
                accuracy=80,
                cooldown=4,
                unlock_level=20,
                effects={"type": "damage", "value": 35, "duration": 2}
            ),
            Skill(
                name="防火墙",
                category="network",
                description="建立网络防护墙",
                icon="🛡️",
                power=0,
                accuracy=100,
                cooldown=6,
                unlock_level=21,
                effects={"type": "buff", "defense": 50, "duration": 3}
            ),
        ]
        
        db.add_all(skills)
        db.commit()
        
        print(f"✅ 成功初始化 {len(skills)} 个技能")
        
        # 按分类统计
        categories = {}
        for skill in skills:
            categories[skill.category] = categories.get(skill.category, 0) + 1
        
        print("\n技能分类统计:")
        for cat, count in categories.items():
            print(f"  📚 {cat}: {count} 个技能")
        
    except Exception as e:
        print(f"❌ 初始化技能失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def init_pets():
    """初始化宠物系统"""
    
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(Pet).delete()
        
        # 宠物数据
        pets = [
            Pet(
                name="代码精灵",
                description="可爱的小精灵，帮助你编写代码",
                icon="🧚",
                pet_type="助手",
                base_stats={"hp": 50, "attack": 5, "defense": 5, "support": 20},
                unlock_level=3,
                unlock_price=500
            ),
            Pet(
                name="算法狼",
                description="敏捷的狼，擅长算法战斗",
                icon="🐺",
                pet_type="战斗",
                base_stats={"hp": 80, "attack": 25, "defense": 10, "speed": 30},
                unlock_level=5,
                unlock_price=1000
            ),
            Pet(
                name="数据龙",
                description="强大的龙，掌控数据结构",
                icon="🐉",
                pet_type="战斗",
                base_stats={"hp": 120, "attack": 35, "defense": 20, "special": 30},
                unlock_level=10,
                unlock_price=2000
            ),
            Pet(
                name="Bug猎手",
                description="专门捕捉Bug的猫咪",
                icon="🐱",
                pet_type="采集",
                base_stats={"hp": 60, "attack": 10, "defense": 10, "luck": 40},
                unlock_level=7,
                unlock_price=1500
            ),
            Pet(
                name="AI机器鸟",
                description="智能机器鸟，提供战术建议",
                icon="🤖🦅",
                pet_type="助手",
                base_stats={"hp": 70, "attack": 15, "defense": 15, "intelligence": 50},
                unlock_level=15,
                unlock_price=3000
            ),
            Pet(
                name="Python蟒蛇",
                description="Python的化身，强力战斗宠物",
                icon="🐍",
                pet_type="战斗",
                base_stats={"hp": 100, "attack": 40, "defense": 25, "power": 40},
                unlock_level=12,
                unlock_price=2500
            ),
        ]
        
        db.add_all(pets)
        db.commit()
        
        print(f"\n✅ 成功初始化 {len(pets)} 个宠物")
        for pet in pets:
            print(f"  {pet.icon} {pet.name} (Lv.{pet.unlock_level}, {pet.unlock_price}金币)")
        
    except Exception as e:
        print(f"❌ 初始化宠物失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎮 初始化技能和宠物系统...")
    print("=" * 60)
    init_skills()
    init_pets()
    print("=" * 60)
    print("\n✅ 完成！")







