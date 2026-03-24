"""
初始化成就数据
"""
import sys
sys.path.insert(0, '.')

from app.core.database import Base, engine, SessionLocal
from app.models.achievement import Achievement

def init_achievements():
    """初始化成就数据"""
    
    # 创建表
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 检查是否已有数据
    existing = db.query(Achievement).first()
    if existing:
        print("成就数据已存在，跳过初始化")
        db.close()
        return
    
    # 成就列表
    achievements = [
        # 等级成就
        Achievement(
            title="初出茅庐",
            description="达到 5 级",
            icon="🌱",
            condition_type="level",
            condition_value=5,
            reward_exp=50
        ),
        Achievement(
            title="崭露头角",
            description="达到 10 级",
            icon="⭐",
            condition_type="level",
            condition_value=10,
            reward_exp=100,
            reward_eggs=1
        ),
        Achievement(
            title="小有成就",
            description="达到 20 级",
            icon="🌟",
            condition_type="level",
            condition_value=20,
            reward_exp=200,
            reward_eggs=1
        ),
        Achievement(
            title="大师之路",
            description="达到 30 级",
            icon="💫",
            condition_type="level",
            condition_value=30,
            reward_exp=500,
            reward_eggs=1
        ),
        
        # 任务成就
        Achievement(
            title="任务新手",
            description="完成 5 个任务",
            icon="📝",
            condition_type="task_count",
            condition_value=5,
            reward_exp=30
        ),
        Achievement(
            title="任务能手",
            description="完成 20 个任务",
            icon="📚",
            condition_type="task_count",
            condition_value=20,
            reward_exp=150,
            reward_eggs=1
        ),
        Achievement(
            title="任务大师",
            description="完成 50 个任务",
            icon="📖",
            condition_type="task_count",
            condition_value=50,
            reward_exp=500
        ),
        
        # 特殊成就
        Achievement(
            title="完美主义者",
            description="获得 10 次满分",
            icon="💯",
            condition_type="perfect_score",
            condition_value=10,
            reward_exp=300,
            reward_eggs=1
        ),
        Achievement(
            title="一击必杀",
            description="首次提交就通过任务",
            icon="⚡",
            condition_type="first_try",
            condition_value=1,
            reward_exp=100
        ),
        Achievement(
            title="坚持不懈",
            description="连续 7 天登录",
            icon="🔥",
            condition_type="login_streak",
            condition_value=7,
            reward_exp=200,
            reward_eggs=1
        ),
    ]
    
    # 添加到数据库
    for achievement in achievements:
        db.add(achievement)
    
    db.commit()
    print(f"✅ 成功初始化 {len(achievements)} 个成就")
    db.close()

if __name__ == "__main__":
    init_achievements()









