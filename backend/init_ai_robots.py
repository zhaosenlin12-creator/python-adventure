"""
初始化AI机器人
"""
import sys
sys.path.append('.')

from app.core.database import SessionLocal, engine
from app.models.ai_robot import AIRobot
from app.core.database import Base

Base.metadata.create_all(bind=engine)

def init_ai_robots():
    db = SessionLocal()
    
    try:
        # 清除现有机器人
        db.query(AIRobot).delete()
        
        robots = [
            # 新手机器人（1-3级）
            AIRobot(
                name="小白助手",
                level=1,
                avatar="🤖",
                personality="友善",
                difficulty=1,
                win_rate=30,
                specialties=["Python基础", "变量"],
                description="刚学编程的小机器人，和你一起成长"
            ),
            AIRobot(
                name="编程小助手",
                level=2,
                avatar="🦾",
                personality="友善",
                difficulty=1,
                win_rate=40,
                specialties=["Python基础", "条件语句"],
                description="热心的学习伙伴，喜欢帮助新手"
            ),
            AIRobot(
                name="代码新手",
                level=3,
                avatar="🤖",
                personality="友善",
                difficulty=2,
                win_rate=45,
                specialties=["Python基础", "循环"],
                description="和你一样的初学者"
            ),
            
            # 中级机器人（4-7级）
            AIRobot(
                name="Python学徒",
                level=4,
                avatar="🦿",
                personality="挑战",
                difficulty=2,
                win_rate=50,
                specialties=["函数", "列表"],
                description="有一定基础的练习伙伴"
            ),
            AIRobot(
                name="算法学习者",
                level=5,
                avatar="🤖",
                personality="挑战",
                difficulty=3,
                win_rate=55,
                specialties=["列表", "字典"],
                description="喜欢钻研算法的机器人"
            ),
            AIRobot(
                name="代码挑战者",
                level=6,
                avatar="🦾",
                personality="挑战",
                difficulty=3,
                win_rate=60,
                specialties=["字典", "字符串"],
                description="会给你带来一定挑战"
            ),
            AIRobot(
                name="编程高手",
                level=7,
                avatar="🤖",
                personality="严格",
                difficulty=3,
                win_rate=65,
                specialties=["字符串", "函数"],
                description="经验丰富的编程者"
            ),
            
            # 高级机器人（8-12级）
            AIRobot(
                name="Python专家",
                level=8,
                avatar="🦿",
                personality="严格",
                difficulty=4,
                win_rate=70,
                specialties=["面向对象", "算法"],
                description="掌握了高级编程技巧"
            ),
            AIRobot(
                name="算法大师",
                level=10,
                avatar="🤖",
                personality="严格",
                difficulty=4,
                win_rate=75,
                specialties=["面向对象", "算法", "异常处理"],
                description="精通各种算法和数据结构"
            ),
            AIRobot(
                name="代码导师",
                level=12,
                avatar="👨‍💻",
                personality="严格",
                difficulty=4,
                win_rate=80,
                specialties=["面向对象", "异常处理", "文件操作"],
                description="可以教你很多高级知识"
            ),
            
            # 专家级机器人（15+级）
            AIRobot(
                name="编程宗师",
                level=15,
                avatar="🧙‍♂️",
                personality="严格",
                difficulty=5,
                win_rate=85,
                specialties=["面向对象", "文件操作", "模块", "高级特性"],
                description="Python编程的终极挑战"
            ),
            AIRobot(
                name="终极BOSS",
                level=20,
                avatar="👾",
                personality="挑战",
                difficulty=5,
                win_rate=90,
                specialties=["全部"],
                description="只有真正的高手才能战胜"
            ),
        ]
        
        for robot in robots:
            db.add(robot)
        
        db.commit()
        
        print(f"✅ 成功添加 {len(robots)} 个AI机器人！")
        print("\n🤖 机器人分布:")
        print("  - 新手机器人（1-3级）: 3个")
        print("  - 中级机器人（4-7级）: 4个")
        print("  - 高级机器人（8-12级）: 3个")
        print("  - 专家级机器人（15+级）: 2个")
        print("\n💡 玩家可以随时找AI机器人练习！")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*50)
    print("   初始化AI机器人")
    print("="*50)
    init_ai_robots()
    print("="*50)






