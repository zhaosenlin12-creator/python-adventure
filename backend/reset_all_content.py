# -*- coding: utf-8 -*-
"""
重置并添加所有内容
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.task import Task
from app.models.map_object import MapObject
import random

def reset_tasks():
    """重置任务系统"""
    db = SessionLocal()
    
    print("[1/2] 删除旧任务...")
    db.query(Task).delete()
    db.commit()
    
    print("[2/2] 创建23个Python任务...")
    
    tasks = [
        # 新手村 - 基础课程
        Task(id=1, title="第1课：认识Turtle海龟", description="学习turtle库，画出你的第一个正方形！包含forward、right等基础命令", task_type="main", difficulty=1, map_area="新手村", code_template="import turtle\nt = turtle.Turtle()\n# 写代码画正方形\n", rewards={"experience": 50, "points": 10}, prerequisites=[]),
        Task(id=2, title="第2课：彩色圆形世界", description="学习turtle的颜色功能，用circle()画彩虹圆！", task_type="main", difficulty=1, map_area="新手村", code_template="import turtle\nt = turtle.Turtle()\n# 画彩色圆形\n", rewards={"experience": 60, "points": 12}, prerequisites=[1]),
        Task(id=3, title="第3课：Random随机魔法", description="学习random.randint()和random.choice()，创建随机图案", task_type="main", difficulty=2, map_area="新手村", code_template="import turtle\nimport random\n# 随机颜色和大小\n", rewards={"experience": 80, "points": 15}, prerequisites=[2]),
        Task(id=4, title="第4课：变量的秘密", description="学习变量定义：数字、字符串、列表。理解变量命名规则", task_type="main", difficulty=2, map_area="新手村", code_template="# 定义变量\nname = ''\nage = 0\n", rewards={"experience": 100, "points": 20}, prerequisites=[3]),
        Task(id=5, title="第5课：输入输出大师", description="掌握input()获取用户输入，print()格式化输出", task_type="main", difficulty=2, map_area="新手村", code_template="name = input('你叫什么名字？')\nprint('你好，' + name)\n", rewards={"experience": 100, "points": 20}, prerequisites=[4]),
        
        # 猇亭广场 - 进阶课程
        Task(id=6, title="第6课：For循环绘图师", description="用for循环画重复图案，理解range()函数的用法", task_type="main", difficulty=2, map_area="猇亭广场", code_template="import turtle\nfor i in range(4):\n    # 画正方形\n    pass\n", rewards={"experience": 120, "points": 25}, prerequisites=[5]),
        Task(id=7, title="第7课：While循环控制", description="学习while循环，创建动态变化的程序", task_type="main", difficulty=3, map_area="猇亭广场", code_template="count = 0\nwhile count < 10:\n    # 你的代码\n    count += 1\n", rewards={"experience": 150, "points": 30}, prerequisites=[6]),
        Task(id=8, title="第8课：Break跳出循环", description="掌握break和continue，优化循环逻辑", task_type="main", difficulty=3, map_area="猇亭广场", code_template="for i in range(100):\n    if i == 10:\n        break\n", rewards={"experience": 150, "points": 30}, prerequisites=[7]),
        Task(id=9, title="第9课：创建你的类", description="面向对象入门：定义类、创建对象、__init__方法", task_type="main", difficulty=4, map_area="猇亭广场", code_template="class Dog:\n    def __init__(self, name):\n        self.name = name\n", rewards={"experience": 200, "points": 40}, prerequisites=[8]),
        
        # CBD商务区 - 高级课程
        Task(id=10, title="第10课：类的继承", description="学习继承和多态，创建类的家族", task_type="main", difficulty=4, map_area="CBD商务区", code_template="class Animal:\n    pass\n\nclass Dog(Animal):\n    pass\n", rewards={"experience": 250, "points": 50}, prerequisites=[9]),
        Task(id=11, title="第11课：3D图形世界", description="探索三维编程，创建立体图形", task_type="main", difficulty=4, map_area="CBD商务区", rewards={"experience": 250, "points": 50}, prerequisites=[10]),
        Task(id=12, title="第12课：Pillow图片魔法", description="学习PIL/Pillow：打开图片、调整大小、裁剪", task_type="main", difficulty=3, map_area="CBD商务区", code_template="from PIL import Image\n# 打开并处理图片\n", rewards={"experience": 180, "points": 35}, prerequisites=[11]),
        Task(id=13, title="第13课：图像滤镜大师", description="添加滤镜、调色、创建艺术效果", task_type="main", difficulty=4, map_area="CBD商务区", rewards={"experience": 200, "points": 40}, prerequisites=[12]),
        Task(id=14, title="第14课：音频文件处理", description="学习读取和播放音频文件", task_type="main", difficulty=4, map_area="CBD商务区", rewards={"experience": 220, "points": 45}, prerequisites=[13]),
        Task(id=15, title="第15课：音乐创作家", description="混音、添加效果，创作音乐", task_type="main", difficulty=4, map_area="CBD商务区", rewards={"experience": 220, "points": 45}, prerequisites=[14]),
        Task(id=16, title="第16课：Arcade游戏", description="用Arcade库创建第一个游戏", task_type="main", difficulty=5, map_area="CBD商务区", code_template="import arcade\n# 创建游戏\n", rewards={"experience": 300, "points": 60}, prerequisites=[15]),
        Task(id=17, title="第17课：Pygame冒险", description="Pygame Zero制作复杂游戏", task_type="main", difficulty=5, map_area="CBD商务区", rewards={"experience": 300, "points": 60}, prerequisites=[16]),
        Task(id=18, title="第18课：密码学基础", description="学习加密解密，保护数据安全", task_type="main", difficulty=5, map_area="CBD商务区", rewards={"experience": 280, "points": 55}, prerequisites=[17]),
        Task(id=19, title="第19课：网络请求API", description="学习requests库，发送HTTP请求", task_type="main", difficulty=5, map_area="CBD商务区", code_template="import requests\n# 发送网络请求\n", rewards={"experience": 320, "points": 65}, prerequisites=[18]),
        Task(id=20, title="第20课：网络爬虫", description="爬取网页数据，分析信息", task_type="main", difficulty=5, map_area="CBD商务区", rewards={"experience": 350, "points": 70}, prerequisites=[19]),
        
        # 每日任务
        Task(id=21, title="每日：代码调试", description="找出并修复5个常见错误", task_type="daily", difficulty=2, map_area="新手村", rewards={"experience": 50, "points": 10}, prerequisites=[]),
        Task(id=22, title="每日：算法挑战", description="完成今日算法题", task_type="daily", difficulty=3, map_area="猇亭广场", rewards={"experience": 80, "points": 15}, prerequisites=[]),
        Task(id=23, title="每日：创意作品", description="用学到的知识创作", task_type="daily", difficulty=3, map_area="CBD商务区", rewards={"experience": 100, "points": 20}, prerequisites=[]),
    ]
    
    db.add_all(tasks)
    db.commit()
    print(f"[完成] 创建了 {len(tasks)} 个任务")
    db.close()

def reset_map_objects():
    """重置地图对象"""
    db = SessionLocal()
    
    print("[1/2] 删除旧地图对象...")
    db.query(MapObject).delete()
    db.commit()
    
    print("[2/2] 创建200+地图对象...")
    
    objects = []
    
    # 新手村基础对象
    base_novice = [
        ("柯德老师", "编程导师", "npc", "👨‍🏫", "talk", 150, 150, {"experience": 30}),
        ("Python图书馆", "学习资料", "npc", "📚", "talk", 300, 150, {}),
        ("Turtle画板", "绘图练习", "puzzle", "🐢", "solve", 250, 250, {"experience": 60}),
        ("新手宝箱", "奖励箱", "chest", "📦", "collect", 200, 100, {"experience": 50, "points": 10}),
        ("变量储藏室", "数据存储", "resource", "💾", "collect", 350, 200, {"experience": 40}),
    ]
    
    for title, desc, otype, icon, itype, x, y, rewards in base_novice:
        objects.append(MapObject(
            title=title, description=desc, object_type=otype,
            map_area="新手村", x=x, y=y, icon=icon,
            interaction_type=itype, rewards=rewards, requirements={}
        ))
    
    # 新手村随机对象（55个）
    for i in range(55):
        icons = ["🌺", "🌳", "💡", "📝", "🎯", "🎨", "🔖", "📌", "🎁", "⭐"]
        objects.append(MapObject(
            title=f"探索点{i+1}",
            description="发现新知识",
            object_type=random.choice(["resource", "puzzle", "chest"]),
            map_area="新手村",
            x=random.randint(80, 380),
            y=random.randint(80, 380),
            icon=random.choice(icons),
            interaction_type=random.choice(["collect", "solve"]),
            rewards={"experience": random.randint(20, 60)},
            requirements={}
        ))
    
    # 猇亭广场 - 真实地标+学习点
    xiaoting_landmarks = [
        ("盛世天下小区", "乐博士机器人教育中心所在地", "npc", "🏢", "talk", 500, 300, {"experience": 100}),
        ("乐博士机器人", "学编程的好地方", "npc", "🤖", "talk", 520, 320, {"experience": 120}),
        ("猇亭区政府", "政府大楼", "npc", "🏛️", "talk", 450, 250, {}),
        ("万达广场", "购物中心", "npc", "🏬", "talk", 600, 280, {}),
        ("宜昌东站", "高铁站", "npc", "🚄", "talk", 700, 200, {}),
        ("长江公园", "江边风景", "resource", "🌳", "collect", 400, 400, {"experience": 50}),
        ("循环训练场", "练习循环", "puzzle", "🔄", "solve", 550, 400, {"experience": 120}),
        ("函数研究所", "学习函数", "npc", "⚙️", "talk", 650, 350, {"experience": 100}),
        ("列表实验室", "列表字典", "puzzle", "📋", "solve", 500, 450, {"experience": 150}),
    ]
    
    for title, desc, otype, icon, itype, x, y, rewards in xiaoting_landmarks:
        objects.append(MapObject(
            title=title, description=desc, object_type=otype,
            map_area="猇亭广场", x=x, y=y, icon=icon,
            interaction_type=itype, rewards=rewards,
            requirements={"min_level": 1} if "盛世" in title or "乐博士" in title else {}
        ))
    
    # 猇亭广场随机对象（71个）
    for i in range(71):
        icons = ["💎", "🎪", "🏆", "🎯", "📚", "🔬", "💡", "⚡", "🌟", "🎁", "🎨", "🎭"]
        objects.append(MapObject(
            title=f"猇亭探索{i+1}",
            description="发现有趣的内容",
            object_type=random.choice(["resource", "puzzle", "chest", "npc"]),
            map_area="猇亭广场",
            x=random.randint(420, 880),
            y=random.randint(170, 530),
            icon=random.choice(icons),
            interaction_type=random.choice(["collect", "solve", "talk"]),
            rewards={"experience": random.randint(40, 120), "points": random.randint(5, 25)},
            requirements={}
        ))
    
    # CBD商务区 - 高级区域
    cbd_landmarks = [
        ("OOP编程大厦", "面向对象", "npc", "🏢", "talk", 850, 300, {"experience": 200}),
        ("图像处理中心", "Pillow应用", "puzzle", "🖼️", "solve", 900, 250, {"experience": 180}),
        ("音频工作室", "音乐创作", "puzzle", "🎵", "solve", 950, 300, {"experience": 220}),
        ("Arcade游戏厂", "游戏制作", "npc", "🎮", "talk", 1000, 350, {"experience": 300}),
        ("Pygame基地", "大型游戏", "puzzle", "🕹️", "solve", 1050, 300, {"experience": 300}),
        ("密码研究院", "加密技术", "npc", "🔐", "talk", 900, 400, {"experience": 280}),
        ("网络编程中心", "HTTP和API", "puzzle", "🌐", "solve", 950, 450, {"experience": 320}),
        ("爬虫实验室", "网络爬虫", "npc", "🕷️", "talk", 1000, 450, {"experience": 350}),
        ("AI研究院", "人工智能", "npc", "🧠", "talk", 1100, 250, {"experience": 400}),
    ]
    
    for title, desc, otype, icon, itype, x, y, rewards in cbd_landmarks:
        objects.append(MapObject(
            title=title, description=desc, object_type=otype,
            map_area="CBD商务区", x=x, y=y, icon=icon,
            interaction_type=itype, rewards=rewards,
            requirements={"min_level": 10}
        ))
    
    # CBD随机对象（51个）
    for i in range(51):
        icons = ["🏆", "💼", "🎓", "🔬", "🚀", "💻", "⚡", "🌟", "💡", "🎯"]
        objects.append(MapObject(
            title=f"CBD探索{i+1}",
            description="高级内容",
            object_type=random.choice(["resource", "puzzle", "chest", "npc"]),
            map_area="CBD商务区",
            x=random.randint(820, 1180),
            y=random.randint(220, 580),
            icon=random.choice(icons),
            interaction_type=random.choice(["collect", "solve", "talk"]),
            rewards={"experience": random.randint(100, 300), "points": random.randint(20, 60)},
            requirements={"min_level": random.randint(10, 15)}
        ))
    
    db.add_all(objects)
    db.commit()
    
    print(f"[完成] 创建了 {len(objects)} 个地图对象")
    print(f"  - 新手村: 60个（已铺满）")
    print(f"  - 猇亭广场: 80个（含盛世天下、乐博士）")
    print(f"  - CBD商务区: 60个（高级区域）")
    
    db.close()

if __name__ == "__main__":
    print("="*60)
    print("[启动] 重置所有内容...")
    print("="*60)
    reset_tasks()
    reset_map_objects()
    print("\n" + "="*60)
    print("[成功] 全部完成！")
    print("="*60)
    print("\n[提示] 现在重启后端，然后刷新浏览器！")




