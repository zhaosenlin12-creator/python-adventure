"""
完整内容初始化脚本
- 基于Python教学知识点的完整任务系统
- 盛世天下附近的真实地图内容
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
from app.models import Task, MapObject
from datetime import datetime

def init_python_tasks():
    """初始化基于Python教学内容的完整任务系统"""
    print("\n[任务系统] 创建Python知识点任务...")
    
    db = next(get_db())
    
    # 删除旧任务
    db.query(Task).delete()
    
    tasks = [
        # === 1-10课：艺术编程 ===
        # 第1课：Turtle基础
        Task(
            title="第1课：认识海龟Turtle",
            description="学习使用turtle库绘制基本图形，画出你的第一个正方形！",
            task_type="main",
            difficulty=1,
            map_area="新手村",
            code_template="import turtle\nt = turtle.Turtle()\n# 在这里写代码",
            test_cases=[],
            rewards={"experience": 50, "points": 10},
            prerequisites=[]
        ),
        Task(
            title="第2课：画彩色圆形",
            description="学习使用turtle的颜色功能，画出彩虹般的圆圈！",
            task_type="main",
            difficulty=1,
            map_area="新手村",
            rewards={"experience": 60, "points": 12},
            prerequisites=[1]
        ),
        Task(
            title="第3课：Random随机数",
            description="学习random库，创建随机颜色和随机大小的图形",
            task_type="main",
            difficulty=2,
            map_area="新手村",
            rewards={"experience": 80, "points": 15},
            prerequisites=[2]
        ),
        
        # 第4-5课：程序结构
        Task(
            title="第4课：变量与数据类型",
            description="学习变量的定义和使用，理解字符串、数字、列表等数据类型",
            task_type="main",
            difficulty=2,
            map_area="新手村",
            rewards={"experience": 100, "points": 20},
            prerequisites=[3]
        ),
        Task(
            title="第5课：输入与输出",
            description="掌握input()和print()函数，创建交互式程序",
            task_type="main",
            difficulty=2,
            map_area="新手村",
            rewards={"experience": 100, "points": 20},
            prerequisites=[4]
        ),
        
        # 第6-7课：循环结构
        Task(
            title="第6课：For循环绘图",
            description="使用for循环画出重复的图案，创作美丽的花朵！",
            task_type="main",
            difficulty=2,
            map_area="猇亭广场",
            rewards={"experience": 120, "points": 25},
            prerequisites=[5]
        ),
        Task(
            title="第7课：While循环控制",
            description="学习while循环，创建动态变化的图案",
            task_type="main",
            difficulty=3,
            map_area="猇亭广场",
            rewards={"experience": 150, "points": 30},
            prerequisites=[6]
        ),
        
        # 第8课：跳出循环
        Task(
            title="第8课：Break和Continue",
            description="掌握循环控制语句，优化你的程序逻辑",
            task_type="main",
            difficulty=3,
            map_area="猇亭广场",
            rewards={"experience": 150, "points": 30},
            prerequisites=[7]
        ),
        
        # 第9-10课：面向对象
        Task(
            title="第9课：类与对象基础",
            description="认识面向对象编程，创建你的第一个类",
            task_type="main",
            difficulty=4,
            map_area="猇亭广场",
            rewards={"experience": 200, "points": 40},
            prerequisites=[8]
        ),
        Task(
            title="第10课：继承与多态",
            description="学习类的继承，创建更复杂的程序结构",
            task_type="main",
            difficulty=4,
            map_area="CBD商务区",
            rewards={"experience": 250, "points": 50},
            prerequisites=[9]
        ),
        
        # === 11-20课：人机对话与高级应用 ===
        # 第11课：3D编程
        Task(
            title="第11课：3D图形入门",
            description="探索三维图形编程，创建立体世界",
            task_type="main",
            difficulty=4,
            map_area="CBD商务区",
            rewards={"experience": 250, "points": 50},
            prerequisites=[10]
        ),
        
        # 第12-13课：图像处理
        Task(
            title="第12课：Pillow图像处理基础",
            description="学习使用Pillow库打开、编辑和保存图片",
            task_type="main",
            difficulty=3,
            map_area="CBD商务区",
            rewards={"experience": 180, "points": 35},
            prerequisites=[11]
        ),
        Task(
            title="第13课：图像滤镜与特效",
            description="为图片添加滤镜、调整颜色、创建艺术效果",
            task_type="main",
            difficulty=4,
            map_area="CBD商务区",
            rewards={"experience": 200, "points": 40},
            prerequisites=[12]
        ),
        
        # 第14-15课：音频处理
        Task(
            title="第14课：音频文件处理",
            description="学习读取和播放音频文件",
            task_type="main",
            difficulty=4,
            map_area="CBD商务区",
            rewards={"experience": 220, "points": 45},
            prerequisites=[13]
        ),
        Task(
            title="第15课：音频效果与混音",
            description="为音频添加效果，创作音乐作品",
            task_type="main",
            difficulty=4,
            map_area="CBD商务区",
            rewards={"experience": 220, "points": 45},
            prerequisites=[14]
        ),
        
        # 第16-17课：游戏开发
        Task(
            title="第16课：Arcade游戏基础",
            description="使用Arcade库创建你的第一个游戏",
            task_type="main",
            difficulty=5,
            map_area="CBD商务区",
            rewards={"experience": 300, "points": 60},
            prerequisites=[15]
        ),
        Task(
            title="第17课：Pygame Zero入门",
            description="学习Pygame Zero，制作更复杂的游戏",
            task_type="main",
            difficulty=5,
            map_area="CBD商务区",
            rewards={"experience": 300, "points": 60},
            prerequisites=[16]
        ),
        
        # 第18课：密码学
        Task(
            title="第18课：密码学基础",
            description="学习加密解密，保护你的数据安全",
            task_type="main",
            difficulty=5,
            map_area="CBD商务区",
            rewards={"experience": 280, "points": 55},
            prerequisites=[17]
        ),
        
        # 第19课：网络编程
        Task(
            title="第19课：网络请求与API",
            description="学习发送HTTP请求，获取网络数据",
            task_type="main",
            difficulty=5,
            map_area="CBD商务区",
            rewards={"experience": 320, "points": 65},
            prerequisites=[18]
        ),
        
        # 第20课：爬虫
        Task(
            title="第20课：网络爬虫入门",
            description="学习爬取网页数据，分析信息",
            task_type="main",
            difficulty=5,
            map_area="CBD商务区",
            rewards={"experience": 350, "points": 70},
            prerequisites=[19]
        ),
        
        # 额外的每日任务
        Task(
            title="每日练习：代码调试",
            description="找出代码中的5个错误并修复",
            task_type="daily",
            difficulty=2,
            map_area="新手村",
            rewards={"experience": 50, "points": 10},
            prerequisites=[]
        ),
        Task(
            title="每日练习：算法挑战",
            description="完成今日的算法题目",
            task_type="daily",
            difficulty=3,
            map_area="猇亭广场",
            rewards={"experience": 80, "points": 15},
            prerequisites=[]
        ),
        Task(
            title="每日练习：创意编程",
            description="用今天学到的知识创作一个作品",
            task_type="daily",
            difficulty=3,
            map_area="CBD商务区",
            rewards={"experience": 100, "points": 20},
            prerequisites=[]
        ),
    ]
    
    db.add_all(tasks)
    db.commit()
    print(f"[完成] 创建了 {len(tasks)} 个任务")
    db.close()

def init_shengshi_map_content():
    """初始化盛世天下附近的真实地图内容"""
    print("\n[地图内容] 创建盛世天下附近的真实地点...")
    
    db = next(get_db())
    
    # 删除旧的地图对象
    db.query(MapObject).delete()
    
    map_objects = [
        # === 新手村区域（基础学习区）===
        MapObject(
            title="编程入门指导",
            description="柯德老师的编程课堂",
            object_type="npc",
            map_area="新手村",
            x=150,
            y=150,
            icon="👨‍🏫",
            interaction_type="talk",
            rewards={"experience": 20},
            requirements={}
        ),
        MapObject(
            title="新手宝箱",
            description="打开获得学习资料",
            object_type="chest",
            map_area="新手村",
            x=200,
            y=100,
            icon="📦",
            interaction_type="collect",
            rewards={"experience": 50, "points": 10},
            requirements={}
        ),
        MapObject(
            title="Python基础图书馆",
            description="学习Python基础知识",
            object_type="npc",
            map_area="新手村",
            x=300,
            y=150,
            icon="📚",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
        MapObject(
            title="Turtle画板",
            description="练习turtle绘图的地方",
            object_type="puzzle",
            map_area="新手村",
            x=250,
            y=250,
            icon="🐢",
            interaction_type="solve",
            rewards={"experience": 80},
            requirements={}
        ),
        MapObject(
            title="变量储藏室",
            description="学习如何存储数据",
            object_type="resource",
            map_area="新手村",
            x=400,
            y=200,
            icon="💾",
            interaction_type="collect",
            rewards={"experience": 60},
            requirements={}
        ),
        
        # === 猇亭广场区域（盛世天下附近）===
        # 真实地标
        MapObject(
            title="盛世天下小区",
            description="乐博士机器人教育中心所在地",
            object_type="npc",
            map_area="猇亭广场",
            x=500,
            y=300,
            icon="🏢",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
        MapObject(
            title="乐博士机器人",
            description="学习编程和机器人的好地方",
            object_type="npc",
            map_area="猇亭广场",
            x=520,
            y=320,
            icon="🤖",
            interaction_type="talk",
            rewards={"experience": 100},
            requirements={}
        ),
        MapObject(
            title="猇亭区政府",
            description="附近的重要地标",
            object_type="npc",
            map_area="猇亭广场",
            x=450,
            y=250,
            icon="🏛️",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
        MapObject(
            title="万达广场",
            description="附近的商业中心",
            object_type="npc",
            map_area="猇亭广场",
            x=600,
            y=280,
            icon="🏬",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
        MapObject(
            title="宜昌东站",
            description="高铁站，连接外面的世界",
            object_type="npc",
            map_area="猇亭广场",
            x=700,
            y=200,
            icon="🚄",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
        MapObject(
            title="长江边公园",
            description="风景优美的江边",
            object_type="resource",
            map_area="猇亭广场",
            x=400,
            y=400,
            icon="🌳",
            interaction_type="collect",
            rewards={"experience": 30},
            requirements={}
        ),
        MapObject(
            title="循环训练场",
            description="练习for和while循环的地方",
            object_type="puzzle",
            map_area="猇亭广场",
            x=550,
            y=400,
            icon="🔄",
            interaction_type="solve",
            rewards={"experience": 120},
            requirements={"min_level": 3}
        ),
        MapObject(
            title="函数研究所",
            description="学习函数的定义和调用",
            object_type="npc",
            map_area="猇亭广场",
            x=650,
            y=350,
            icon="⚙️",
            interaction_type="talk",
            rewards={"experience": 100},
            requirements={"min_level": 4}
        ),
        MapObject(
            title="列表实验室",
            description="掌握列表、元组、字典的使用",
            object_type="puzzle",
            map_area="猇亭广场",
            x=500,
            y=450,
            icon="📋",
            interaction_type="solve",
            rewards={"experience": 150},
            requirements={"min_level": 5}
        ),
        
        # === CBD商务区（高级区域）===
        MapObject(
            title="面向对象大厦",
            description="学习类和对象的高级编程",
            object_type="npc",
            map_area="CBD商务区",
            x=800,
            y=300,
            icon="🏢",
            interaction_type="talk",
            rewards={"experience": 200},
            requirements={"min_level": 8}
        ),
        MapObject(
            title="Pillow图像处理中心",
            description="学习图像处理技术",
            object_type="puzzle",
            map_area="CBD商务区",
            x=850,
            y=250,
            icon="🖼️",
            interaction_type="solve",
            rewards={"experience": 180},
            requirements={"min_level": 10}
        ),
        MapObject(
            title="音频工作室",
            description="处理音频文件，创作音乐",
            object_type="puzzle",
            map_area="CBD商务区",
            x=900,
            y=300,
            icon="🎵",
            interaction_type="solve",
            rewards={"experience": 220},
            requirements={"min_level": 12}
        ),
        MapObject(
            title="Arcade游戏工厂",
            description="使用Arcade库制作游戏",
            object_type="npc",
            map_area="CBD商务区",
            x=950,
            y=350,
            icon="🎮",
            interaction_type="talk",
            rewards={"experience": 300},
            requirements={"min_level": 15}
        ),
        MapObject(
            title="Pygame游戏基地",
            description="用Pygame Zero创作大型游戏",
            object_type="puzzle",
            map_area="CBD商务区",
            x=1000,
            y=300,
            icon="🕹️",
            interaction_type="solve",
            rewards={"experience": 300},
            requirements={"min_level": 16}
        ),
        MapObject(
            title="密码学研究院",
            description="学习加密解密技术",
            object_type="npc",
            map_area="CBD商务区",
            x=850,
            y=400,
            icon="🔐",
            interaction_type="talk",
            rewards={"experience": 280},
            requirements={"min_level": 17}
        ),
        MapObject(
            title="网络编程中心",
            description="掌握HTTP请求和API使用",
            object_type="puzzle",
            map_area="CBD商务区",
            x=900,
            y=450,
            icon="🌐",
            interaction_type="solve",
            rewards={"experience": 320},
            requirements={"min_level": 18}
        ),
        MapObject(
            title="爬虫实验室",
            description="学习网络爬虫技术",
            object_type="npc",
            map_area="CBD商务区",
            x=950,
            y=450,
            icon="🕷️",
            interaction_type="talk",
            rewards={"experience": 350},
            requirements={"min_level": 19}
        ),
        
        # === 额外的探索点 ===
        # 新手村
        MapObject(
            title="代码花园",
            description="用代码种花的神奇地方",
            object_type="resource",
            map_area="新手村",
            x=350,
            y=300,
            icon="🌺",
            interaction_type="collect",
            rewards={"experience": 40},
            requirements={}
        ),
        MapObject(
            title="Bug修复站",
            description="帮助其他人修复代码错误",
            object_type="puzzle",
            map_area="新手村",
            x=150,
            y=250,
            icon="🐛",
            interaction_type="solve",
            rewards={"experience": 70},
            requirements={}
        ),
        
        # 猇亭广场
        MapObject(
            title="智慧树",
            description="传说中能提升智慧的神树",
            object_type="resource",
            map_area="猇亭广场",
            x=450,
            y=350,
            icon="🌲",
            interaction_type="collect",
            rewards={"experience": 100},
            requirements={}
        ),
        MapObject(
            title="数据宝库",
            description="存储着各种有用的数据",
            object_type="chest",
            map_area="猇亭广场",
            x=700,
            y=450,
            icon="💎",
            interaction_type="collect",
            rewards={"experience": 150, "points": 30},
            requirements={"min_level": 5}
        ),
        MapObject(
            title="算法竞技场",
            description="与其他编程者切磋算法",
            object_type="npc",
            map_area="猇亭广场",
            x=600,
            y=500,
            icon="⚔️",
            interaction_type="talk",
            rewards={},
            requirements={"min_level": 6}
        ),
        
        # CBD商务区
        MapObject(
            title="AI研究中心",
            description="探索人工智能的奥秘",
            object_type="npc",
            map_area="CBD商务区",
            x=1050,
            y=250,
            icon="🧠",
            interaction_type="talk",
            rewards={"experience": 400},
            requirements={"min_level": 20}
        ),
        MapObject(
            title="开源宝藏",
            description="发现有用的开源项目",
            object_type="chest",
            map_area="CBD商务区",
            x=1100,
            y=350,
            icon="📦",
            interaction_type="collect",
            rewards={"experience": 300, "points": 60},
            requirements={"min_level": 15}
        ),
        MapObject(
            title="代码博物馆",
            description="欣赏历史上伟大的程序",
            object_type="npc",
            map_area="CBD商务区",
            x=800,
            y=350,
            icon="🏛️",
            interaction_type="talk",
            rewards={},
            requirements={}
        ),
    ]
    
    db.add_all(map_objects)
    db.commit()
    print(f"[完成] 创建了 {len(map_objects)} 个地图对象")
    db.close()

if __name__ == "__main__":
    print("="*60)
    print("[启动] 初始化完整内容...")
    print("="*60)
    
    init_python_tasks()
    init_shengshi_map_content()
    
    print("\n" + "="*60)
    print("[成功] 内容初始化完成！")
    print("="*60)
    print("\n包含内容：")
    print("  - 23个Python知识点任务")
    print("  - 30个地图探索点")
    print("  - 覆盖新手村、猇亭广场、CBD商务区")
    print("\n[提示] 重启后端服务即可生效！")




