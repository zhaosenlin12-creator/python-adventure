"""
完整的数据库初始化脚本
创建所有表并填充初始数据
"""
import sys
import os

# 设置编码
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, Base, get_db
from app.models import *
from app.core.security import get_password_hash
from datetime import datetime

def init_database():
    """初始化数据库"""
    print("=" * 60)
    print("[启动] 开始初始化数据库...")
    print("=" * 60)
    
    # 删除所有表
    print("\n[步骤1] 删除旧表...")
    Base.metadata.drop_all(bind=engine)
    
    # 创建所有表
    print("[步骤2] 创建新表...")
    Base.metadata.create_all(bind=engine)
    print("[完成] 数据库表创建完成！")
    
    # 获取数据库会话
    db = next(get_db())
    
    try:
        # 1. 创建测试用户
        print("\n[步骤3] 创建测试用户...")
        demo_user = User(
            username="demo",
            email="demo@example.com",
            password_hash=get_password_hash("123456"),
            level=1,
            experience=0
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print(f"[完成] 创建用户: {demo_user.username} (ID: {demo_user.id})")
        
        # 2. 创建基础任务
        print("\n[步骤4] 创建基础任务...")
        tasks = [
            Task(
                title="Python基础：变量与数据类型",
                description="学习Python中的变量定义和基本数据类型",
                task_type="main",
                difficulty=1,
                map_area="新手村",
                rewards={"experience": 100, "points": 10},
                prerequisites=[]
            ),
            Task(
                title="Turtle绘图入门",
                description="使用Turtle库绘制基本图形",
                task_type="main",
                difficulty=1,
                map_area="新手村",
                rewards={"experience": 150, "points": 15},
                prerequisites=[]
            ),
            Task(
                title="循环与判断",
                description="掌握for、while循环和if-else判断",
                task_type="main",
                difficulty=2,
                map_area="猇亭广场",
                rewards={"experience": 200, "points": 20},
                prerequisites=[1]
            )
        ]
        db.add_all(tasks)
        db.commit()
        print(f"[完成] 创建 {len(tasks)} 个任务")
        
        # 3. 创建物品模板
        print("\n[步骤5] 创建物品模板...")
        items = [
            Item(
                name="经验药水",
                description="使用后立即获得100点经验值",
                icon="🧪",
                item_type="consumable",
                rarity="common",
                effects={"experience": 100},
                max_stack=99,
                sell_price=50
            ),
            Item(
                name="技能书",
                description="学习新技能的必备道具",
                icon="📘",
                item_type="skill_book",
                rarity="uncommon",
                effects={"unlock_skill": True},
                max_stack=10,
                sell_price=200
            ),
            Item(
                name="宠物蛋",
                description="孵化后可获得随机宠物",
                icon="🥚",
                item_type="consumable",
                rarity="rare",
                effects={"hatch_pet": True},
                max_stack=5,
                sell_price=500
            )
        ]
        db.add_all(items)
        db.commit()
        print(f"[完成] 创建 {len(items)} 个物品")
        
        # 4. 创建宠物模板
        print("\n[步骤6] 创建宠物模板...")
        pets = [
            PetTemplate(
                name="编程小龙",
                description="传说中的代码守护神",
                icon="🐉",
                pet_type="dragon",
                rarity="legendary",
                base_stats={"attack": 20, "defense": 15, "speed": 10},
                max_level=50,
                experience_bonus=0.15
            ),
            PetTemplate(
                name="代码猫咪",
                description="可爱的编程伙伴",
                icon="🐱",
                pet_type="cat",
                rarity="common",
                base_stats={"attack": 8, "defense": 5, "speed": 15},
                max_level=30,
                experience_bonus=0.05
            ),
            PetTemplate(
                name="机器人助手",
                description="智能编程机器人",
                icon="🤖",
                pet_type="robot",
                rarity="rare",
                base_stats={"attack": 15, "defense": 20, "speed": 8},
                max_level=40,
                experience_bonus=0.10
            )
        ]
        db.add_all(pets)
        db.commit()
        print(f"[完成] 创建 {len(pets)} 个宠物模板")
        
        # 5. 给测试用户赠送新手礼包
        print("\n[步骤7] 赠送新手礼包...")
        starter_items = [
            UserInventory(user_id=demo_user.id, item_id=1, quantity=5),  # 5个经验药水
            UserInventory(user_id=demo_user.id, item_id=2, quantity=3),  # 3个技能书
            UserInventory(user_id=demo_user.id, item_id=3, quantity=1),  # 1个宠物蛋
        ]
        db.add_all(starter_items)
        
        # 给测试用户一个宠物
        starter_pet = UserPet(
            user_id=demo_user.id,
            template_id=2,  # 代码猫咪
            name="小喵",
            level=1,
            experience=0,
            current_stats={"attack": 8, "defense": 5, "speed": 15},
            is_active=True,
            friendship=50
        )
        db.add(starter_pet)
        db.commit()
        print("[完成] 新手礼包发放完成")
        
        # 6. 创建技能
        print("\n[步骤8] 创建技能...")
        skills = [
            Skill(
                name="闪电攻击",
                description="发动强力的闪电攻击",
                icon="⚡",
                skill_type="attack",
                level_required=1,
                damage_multiplier=1.5,
                cooldown=3
            ),
            Skill(
                name="防御护盾",
                description="生成保护护盾",
                icon="🛡️",
                skill_type="defense",
                level_required=3,
                damage_reduction=0.3,
                cooldown=5
            ),
            Skill(
                name="快速冲刺",
                description="大幅提升移动速度",
                icon="💨",
                skill_type="buff",
                level_required=5,
                speed_boost=2.0,
                cooldown=4
            )
        ]
        db.add_all(skills)
        db.commit()
        print(f"[完成] 创建 {len(skills)} 个技能")
        
        # 7. 给用户添加一个技能
        user_skill = UserSkill(
            user_id=demo_user.id,
            skill_id=1,
            skill_level=1,
            is_equipped=True
        )
        db.add(user_skill)
        db.commit()
        print("[完成] 给用户添加初始技能")
        
        # 8. 创建地图对象
        print("\n[步骤9] 创建地图对象...")
        map_objects = [
            MapObject(
                title="新手宝箱",
                description="打开可获得丰富奖励",
                object_type="chest",
                map_area="新手村",
                x=100,
                y=100,
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 50, "item_id": 1, "item_quantity": 2},
                requirements={}
            ),
            MapObject(
                title="智慧老人",
                description="村里最有智慧的老人",
                object_type="npc",
                map_area="新手村",
                x=200,
                y=150,
                icon="👴",
                interaction_type="talk",
                rewards={},
                requirements={}
            ),
            MapObject(
                title="编程谜题",
                description="解开谜题获得奖励",
                object_type="puzzle",
                map_area="新手村",
                x=300,
                y=200,
                icon="🧩",
                interaction_type="solve",
                rewards={"experience": 100},
                requirements={}
            )
        ]
        db.add_all(map_objects)
        db.commit()
        print(f"[完成] 创建 {len(map_objects)} 个地图对象")
        
        # 9. 创建角色模板
        print("\n[步骤10] 创建角色模板...")
        characters = [
            CharacterTemplate(
                name="程序猿",
                description="热爱编程的技术宅",
                sprite_url="👨‍💻",
                unlock_level=1,
                attributes={"type": "coder", "hp": 100, "attack": 12, "defense": 8, "speed": 10}
            ),
            CharacterTemplate(
                name="编程少女",
                description="充满活力的代码天才",
                sprite_url="👩‍💻",
                unlock_level=1,
                attributes={"type": "hacker", "hp": 90, "attack": 15, "defense": 6, "speed": 12}
            )
        ]
        db.add_all(characters)
        db.commit()
        print(f"[完成] 创建 {len(characters)} 个角色模板")
        
        # 10. 创建AI机器人
        print("\n[步骤11] 创建AI机器人...")
        ai_robots = [
            AIRobot(
                name="新手机器人",
                description="适合新手练习的AI对手",
                avatar="🤖",
                level=1,
                personality="friendly",
                difficulty=1,
                win_rate=30,
                specialties=["python_basics"]
            ),
            AIRobot(
                name="中级机器人",
                description="有一定挑战性的AI对手",
                avatar="🦾",
                level=5,
                personality="balanced",
                difficulty=2,
                win_rate=50,
                specialties=["python_basics", "turtle", "random"]
            )
        ]
        db.add_all(ai_robots)
        db.commit()
        print(f"[完成] 创建 {len(ai_robots)} 个AI机器人")
        
        # 11. 创建测验问题
        print("\n[步骤12] 创建测验问题...")
        questions = [
            QuizQuestion(
                category="python_basics",
                question="Python中用于输出的函数是？",
                options=["A. print()", "B. echo()", "C. write()", "D. console.log()"],
                correct_answer="A",
                difficulty=1,
                explanation="print()是Python的标准输出函数",
                points=10
            ),
            QuizQuestion(
                category="python_basics",
                question="Python中的注释符号是？",
                options=["A. //", "B. #", "C. /**/", "D. --"],
                correct_answer="B",
                difficulty=1,
                explanation="#是Python的单行注释符号",
                points=10
            )
        ]
        db.add_all(questions)
        db.commit()
        print(f"[完成] 创建 {len(questions)} 个测验问题")
        
        print("\n" + "=" * 60)
        print("[成功] 数据库初始化完成！")
        print("=" * 60)
        print("\n测试账号信息：")
        print(f"  用户名: demo")
        print(f"  密码: 123456")
        print(f"  等级: {demo_user.level}")
        print(f"  经验: {demo_user.experience}")
        print("\n[提示] 现在可以启动后端服务了!")
        
    except Exception as e:
        print(f"\n[错误] 初始化过程中出错: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()

