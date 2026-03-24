"""
SQLite 数据库初始化脚本
用于快速测试，不需要 PostgreSQL
"""

from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.achievement import Achievement

print("正在创建数据库表...")
Base.metadata.create_all(bind=engine)
print("✅ 表创建完成")

db = SessionLocal()

try:
    # 检查是否已有数据
    if db.query(Task).count() > 0:
        print("⚠️ 数据库已有数据，跳过初始化")
        exit(0)
    
    print("正在添加初始任务...")
    
    # 添加初始任务
    tasks = [
        Task(
            title="你好，世界！",
            description="编写你的第一个Python程序，打印\"Hello, World!\"",
            difficulty=1,
            task_type="main",
            code_template='# 在这里编写你的代码\nprint("Hello, World!")',
            test_cases=[{"input": "", "expected_output": "Hello, World!"}],
            rewards={"experience": 100, "coins": 10},
            prerequisites=[],
            map_area="新手村"
        ),
        Task(
            title="变量初体验",
            description="创建一个变量name，存储你的名字，然后打印出来",
            difficulty=1,
            task_type="main",
            code_template='# 创建一个变量name\nname = "你的名字"\n# 打印这个变量\nprint(name)',
            test_cases=[{"input": "", "expected_output": ".*"}],
            rewards={"experience": 120, "coins": 15},
            prerequisites=[1],
            map_area="新手村"
        ),
        Task(
            title="简单计算",
            description="计算两个数字的和并打印结果",
            difficulty=2,
            task_type="main",
            code_template='# 定义两个数字\na = 10\nb = 20\n# 计算并打印它们的和\nresult = a + b\nprint(result)',
            test_cases=[{"input": "", "expected_output": "30"}],
            rewards={"experience": 150, "coins": 20},
            prerequisites=[2],
            map_area="新手村"
        ),
        Task(
            title="条件判断",
            description="判断一个数字是否大于10",
            difficulty=2,
            task_type="main",
            code_template='# 获取输入的数字\nnum = int(input())\n# 判断并打印结果\nif num > 10:\n    print("大于10")\nelse:\n    print("不大于10")',
            test_cases=[
                {"input": "15", "expected_output": "大于10"},
                {"input": "5", "expected_output": "不大于10"}
            ],
            rewards={"experience": 180, "coins": 25},
            prerequisites=[3],
            map_area="基础镇"
        )
    ]
    
    for task in tasks:
        db.add(task)
    
    print(f"✅ 添加了 {len(tasks)} 个任务")
    
    # 添加成就
    print("正在添加成就...")
    achievements = [
        Achievement(
            name="初次登陆",
            description="第一次登录游戏",
            conditions={"type": "first_login"},
            rewards={"experience": 50},
            icon="first_login.png"
        ),
        Achievement(
            name="代码新手",
            description="完成第一个任务",
            conditions={"type": "complete_tasks", "count": 1},
            rewards={"experience": 100},
            icon="first_task.png"
        ),
        Achievement(
            name="编程学徒",
            description="完成10个任务",
            conditions={"type": "complete_tasks", "count": 10},
            rewards={"experience": 500},
            icon="ten_tasks.png"
        ),
        Achievement(
            name="升级达人",
            description="达到10级",
            conditions={"type": "reach_level", "level": 10},
            rewards={"experience": 300},
            icon="level_10.png"
        )
    ]
    
    for achievement in achievements:
        db.add(achievement)
    
    print(f"✅ 添加了 {len(achievements)} 个成就")
    
    db.commit()
    print("\n" + "="*50)
    print("🎉 数据库初始化完成！")
    print("="*50)
    
except Exception as e:
    print(f"❌ 错误: {e}")
    db.rollback()
    raise
finally:
    db.close()









