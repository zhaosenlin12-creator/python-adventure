# -*- coding: utf-8 -*-
"""
添加大量地图内容，铺满整个可见区域
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, SessionLocal
from app.models.map_object import MapObject
import random

def add_massive_content():
    db = SessionLocal()
    
    print("[1/3] 删除旧的地图对象...")
    db.query(MapObject).delete()
    db.commit()
    
    print("[2/3] 创建大量地图内容...")
    
    map_objects = []
    object_id = 1
    
    # === 新手村 (0-400, 0-400) - 铺满60个对象 ===
    novice_items = [
        ("编程入门课堂", "跟柯德老师学习", "npc", "👨‍🏫", "talk", {"experience": 30}),
        ("Python图书馆", "海量编程书籍", "npc", "📚", "talk", {"experience": 20}),
        ("新手宝箱", "打开获得奖励", "chest", "📦", "collect", {"experience": 50, "points": 10}),
        ("Turtle画板", "练习绘图", "puzzle", "🐢", "solve", {"experience": 60}),
        ("变量储藏室", "学习存储数据", "resource", "💾", "collect", {"experience": 40}),
        ("代码花园", "种植代码之花", "resource", "🌺", "collect", {"experience": 40}),
        ("Bug修复站", "帮助修复错误", "puzzle", "🐛", "solve", {"experience": 70}),
        ("智慧喷泉", "增加智慧", "resource", "⛲", "collect", {"experience": 35}),
        ("练习场", "代码练习", "puzzle", "🎯", "solve", {"experience": 50}),
        ("知识之树", "学习新知识", "npc", "🌳", "talk", {"experience": 25}),
    ]
    
    # 新手村铺满60个对象（10种类型×6个）
    for i in range(6):
        for idx, (title, desc, obj_type, icon, inter_type, rewards) in enumerate(novice_items):
            x = random.randint(80, 380)
            y = random.randint(80, 380)
            map_objects.append(MapObject(
                title=f"{title}{i+1}" if i > 0 else title,
                description=desc,
                object_type=obj_type,
                map_area="新手村",
                x=x,
                y=y,
                icon=icon,
                interaction_type=inter_type,
                rewards=rewards,
                requirements={}
            ))
    
    # === 猇亭广场 (400-900, 150-550) - 铺满80个对象 ===
    xiaoting_items = [
        ("盛世天下小区", "乐博士机器人所在地", "npc", "🏢", "talk", {"experience": 80}),
        ("乐博士机器人", "编程教育中心", "npc", "🤖", "talk", {"experience": 100}),
        ("猇亭区政府", "政府大楼", "npc", "🏛️", "talk", {}),
        ("万达广场", "购物中心", "npc", "🏬", "talk", {}),
        ("宜昌东站", "高铁站", "npc", "🚄", "talk", {}),
        ("长江公园", "江边风景", "resource", "🌳", "collect", {"experience": 50}),
        ("循环训练场", "练习循环", "puzzle", "🔄", "solve", {"experience": 120}),
        ("函数研究所", "学习函数", "npc", "⚙️", "talk", {"experience": 100}),
        ("列表实验室", "列表和字典", "puzzle", "📋", "solve", {"experience": 150}),
        ("智慧树", "古老智慧", "resource", "🌲", "collect", {"experience": 100}),
        ("数据宝库", "珍贵数据", "chest", "💎", "collect", {"experience": 150, "points": 30}),
        ("算法竞技场", "算法对决", "npc", "⚔️", "talk", {}),
        ("代码咖啡馆", "休息聊天", "npc", "☕", "talk", {}),
        ("学习图书室", "安静学习", "npc", "📖", "talk", {"experience": 60}),
        ("编程健身房", "锻炼编程能力", "puzzle", "💪", "solve", {"experience": 90}),
        ("创意工作坊", "发挥创造力", "puzzle", "🎨", "solve", {"experience": 110}),
    ]
    
    # 猇亭广场铺满80个对象
    for i in range(5):
        for idx, (title, desc, obj_type, icon, inter_type, rewards) in enumerate(xiaoting_items):
            x = random.randint(420, 880)
            y = random.randint(170, 530)
            map_objects.append(MapObject(
                title=f"{title}{i+1}" if i > 0 and idx > 5 else title,
                description=desc,
                object_type=obj_type,
                map_area="猇亭广场",
                x=x,
                y=y,
                icon=icon,
                interaction_type=inter_type,
                rewards=rewards,
                requirements={"min_level": max(1, idx // 2)}
            ))
    
    # === CBD商务区 (800-1200, 200-600) - 铺满60个对象 ===
    cbd_items = [
        ("OOP大厦", "面向对象编程", "npc", "🏢", "talk", {"experience": 200}),
        ("图像处理中心", "Pillow应用", "puzzle", "🖼️", "solve", {"experience": 180}),
        ("音频工作室", "音乐创作", "puzzle", "🎵", "solve", {"experience": 220}),
        ("Arcade工厂", "游戏制作", "npc", "🎮", "talk", {"experience": 300}),
        ("Pygame基地", "大型游戏", "puzzle", "🕹️", "solve", {"experience": 300}),
        ("密码研究院", "加密技术", "npc", "🔐", "talk", {"experience": 280}),
        ("网络中心", "HTTP和API", "puzzle", "🌐", "solve", {"experience": 320}),
        ("爬虫实验室", "网络爬虫", "npc", "🕷️", "talk", {"experience": 350}),
        ("AI研究院", "人工智能", "npc", "🧠", "talk", {"experience": 400}),
        ("开源宝藏", "开源项目", "chest", "📦", "collect", {"experience": 300, "points": 60}),
        ("代码博物馆", "历史程序", "npc", "🏛️", "talk", {}),
        ("创新实验室", "前沿技术", "puzzle", "🔬", "solve", {"experience": 350}),
    ]
    
    # CBD商务区铺满60个对象
    for i in range(5):
        for idx, (title, desc, obj_type, icon, inter_type, rewards) in enumerate(cbd_items):
            x = random.randint(820, 1180)
            y = random.randint(220, 580)
            map_objects.append(MapObject(
                title=f"{title}{i+1}" if i > 0 and idx > 4 else title,
                description=desc,
                object_type=obj_type,
                map_area="CBD商务区",
                x=x,
                y=y,
                icon=icon,
                interaction_type=inter_type,
                rewards=rewards,
                requirements={"min_level": 10 + idx}
            ))
    
    # 批量添加
    db.add_all(map_objects)
    db.commit()
    
    print(f"[3/3] 完成！创建了 {len(map_objects)} 个地图对象")
    print(f"  - 新手村: 60个")
    print(f"  - 猇亭广场: 80个") 
    print(f"  - CBD商务区: 60个")
    print(f"  - 总计: {len(map_objects)} 个")
    print("\n[提示] 刷新浏览器即可看到！")
    
    db.close()

if __name__ == "__main__":
    print("="*60)
    print("[启动] 添加大量地图内容...")
    print("="*60)
    add_massive_content()




