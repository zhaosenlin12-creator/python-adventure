"""
为所有地图区域创建丰富的地图对象
每个区域至少50个对象，包括NPC、宝箱、资源点、解谜等
"""
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.models.map_object import MapObject
import random

def create_map_objects():
    """创建所有区域的地图对象"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 清空现有地图对象（自动模式）
        existing_count = db.query(MapObject).count()
        if existing_count > 0:
            print(f"⚠️  已存在 {existing_count} 个地图对象，保留现有对象并添加新对象")
        
        print("\n📝 开始创建地图对象...\n")
        
        # ========== 1. 新手村 (2000x2000) ==========
        print("1️⃣ 创建新手村对象...")
        novice_objects = []
        
        # NPC (20个)
        npcs = [
            {"name": "村长", "icon": "👴", "desc": "新手村的村长，为你指引方向", "x": 200, "y": 200},
            {"name": "编程老师", "icon": "👨‍🏫", "desc": "教你Python基础知识", "x": 400, "y": 300},
            {"name": "任务发布员", "icon": "📋", "desc": "提供新手任务", "x": 600, "y": 400},
            {"name": "商店老板", "icon": "🏪", "desc": "出售基础道具", "x": 800, "y": 300},
            {"name": "铁匠", "icon": "⚒️", "desc": "修理和强化装备", "x": 1000, "y": 500},
            {"name": "图书管理员", "icon": "📚", "desc": "提供学习资料", "x": 1200, "y": 200},
            {"name": "宠物训练师", "icon": "🐾", "desc": "教你如何养宠物", "x": 1400, "y": 400},
            {"name": "冒险家", "icon": "🎒", "desc": "分享探索经验", "x": 300, "y": 700},
            {"name": "魔法师", "icon": "🧙", "desc": "教授编程魔法", "x": 700, "y": 800},
            {"name": "导游", "icon": "🗺️", "desc": "介绍各个区域", "x": 1100, "y": 900},
            {"name": "医生", "icon": "⚕️", "desc": "恢复体力", "x": 500, "y": 1200},
            {"name": "音乐家", "icon": "🎵", "desc": "播放美妙音乐", "x": 900, "y": 1300},
            {"name": "厨师", "icon": "👨‍🍳", "desc": "制作美食", "x": 1300, "y": 1400},
            {"name": "渔夫", "icon": "🎣", "desc": "教你捕鱼", "x": 1600, "y": 1600},
            {"name": "农夫", "icon": "👨‍🌾", "desc": "种植作物", "x": 200, "y": 1500},
            {"name": "守卫", "icon": "🛡️", "desc": "保护村庄安全", "x": 1800, "y": 300},
            {"name": "信使", "icon": "📨", "desc": "传递消息", "x": 1500, "y": 1000},
            {"name": "诗人", "icon": "📖", "desc": "讲述传说故事", "x": 100, "y": 1000},
            {"name": "工程师", "icon": "👷", "desc": "建造设施", "x": 1700, "y": 800},
            {"name": "科学家", "icon": "🔬", "desc": "研究新技术", "x": 400, "y": 1600},
        ]
        
        for npc in npcs:
            obj = MapObject(
                map_area="新手村",
                object_type="npc",
                x=npc["x"],
                y=npc["y"],
                title=npc["name"],
                description=npc["desc"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": random.randint(20, 50)},
                requirements={"level": 1}
            )
            novice_objects.append(obj)
        
        # 宝箱 (15个 - 不同品质)
        chest_types = [
            ("普通宝箱", "📦", {"experience": 30, "coins": 10}, 1),
            ("稀有宝箱", "🎁", {"experience": 50, "coins": 20}, 1),
            ("史诗宝箱", "💎", {"experience": 100, "coins": 50}, 3),
        ]
        
        for i in range(15):
            chest_type = random.choice(chest_types)
            obj = MapObject(
                map_area="新手村",
                object_type="chest",
                x=random.randint(100, 1900),
                y=random.randint(100, 1900),
                title=chest_type[0],
                description=f"发现一个{chest_type[0]}！",
                icon=chest_type[1],
                interaction_type="collect",
                rewards=chest_type[2],
                requirements={"level": chest_type[3]},
                respawn_time=3600  # 1小时重生
            )
            novice_objects.append(obj)
        
        # 资源点 (15个)
        resources = [
            ("经验球", "⭐", {"experience": 15}),
            ("金币堆", "💰", {"coins": 20}),
            ("代码碎片", "📜", {"experience": 25}),
            ("能量水晶", "💠", {"experience": 20, "coins": 5}),
        ]
        
        for i in range(15):
            resource = random.choice(resources)
            obj = MapObject(
                map_area="新手村",
                object_type="resource",
                x=random.randint(100, 1900),
                y=random.randint(100, 1900),
                title=resource[0],
                description=f"可以收集{resource[0]}",
                icon=resource[1],
                interaction_type="collect",
                rewards=resource[2],
                respawn_time=600  # 10分钟重生
            )
            novice_objects.append(obj)
        
        db.add_all(novice_objects)
        db.commit()
        print(f"   ✅ 新手村: {len(novice_objects)} 个对象")
        
        # ========== 2. 猇亭广场 (3000x3000) ==========
        print("2️⃣ 创建猇亭广场对象...")
        xiaoting_objects = []
        
        # 真实地标
        landmarks = [
            {"name": "盛世天下", "icon": "🏢", "desc": "高档住宅区", "x": 500, "y": 500},
            {"name": "乐博士", "icon": "🎓", "desc": "教育培训机构", "x": 1000, "y": 800},
            {"name": "购物中心", "icon": "🛍️", "desc": "大型商场", "x": 1500, "y": 1200},
            {"name": "公园", "icon": "🌳", "desc": "休闲公园", "x": 2000, "y": 1500},
            {"name": "图书馆", "icon": "📖", "desc": "知识的殿堂", "x": 2500, "y": 2000},
        ]
        
        for landmark in landmarks:
            obj = MapObject(
                map_area="猇亭广场",
                object_type="npc",
                x=landmark["x"],
                y=landmark["y"],
                title=landmark["name"],
                description=landmark["desc"],
                icon=landmark["icon"],
                interaction_type="talk",
                rewards={"experience": 80},
                requirements={"level": 10}
            )
            xiaoting_objects.append(obj)
        
        # 添加更多NPC、宝箱、资源 (45个)
        for i in range(45):
            obj_type = random.choice(["npc", "chest", "resource", "puzzle"])
            
            if obj_type == "npc":
                obj = MapObject(
                    map_area="猇亭广场",
                    object_type="npc",
                    x=random.randint(100, 2900),
                    y=random.randint(100, 2900),
                    title=random.choice(["程序员", "设计师", "架构师", "测试工程师"]),
                    description="提供编程相关的建议和任务",
                    icon=random.choice(["👨‍💻", "👩‍💻", "🧑‍💼", "👔"]),
                    interaction_type="talk",
                    rewards={"experience": random.randint(50, 100)},
                    requirements={"level": 10}
                )
            elif obj_type == "chest":
                obj = MapObject(
                    map_area="猇亭广场",
                    object_type="chest",
                    x=random.randint(100, 2900),
                    y=random.randint(100, 2900),
                    title=random.choice(["宝箱", "礼物盒", "藏宝箱"]),
                    description="打开看看里面有什么",
                    icon=random.choice(["📦", "🎁", "💎"]),
                    interaction_type="collect",
                    rewards={"experience": random.randint(60, 120), "coins": random.randint(20, 50)},
                    requirements={"level": 10},
                    respawn_time=1800
                )
            elif obj_type == "resource":
                obj = MapObject(
                    map_area="猇亭广场",
                    object_type="resource",
                    x=random.randint(100, 2900),
                    y=random.randint(100, 2900),
                    title=random.choice(["高级经验球", "金币袋", "技能书碎片"]),
                    description="珍贵的资源",
                    icon=random.choice(["⭐", "💰", "📜", "💠"]),
                    interaction_type="collect",
                    rewards={"experience": random.randint(40, 80)},
                    respawn_time=900
                )
            else:  # puzzle
                obj = MapObject(
                    map_area="猇亭广场",
                    object_type="puzzle",
                    x=random.randint(100, 2900),
                    y=random.randint(100, 2900),
                    title="编程谜题",
                    description="解答这个Python问题",
                    icon="🧩",
                    interaction_type="solve",
                    rewards={"experience": random.randint(80, 150)},
                    requirements={"level": 10, "answer": "python"}
                )
            
            xiaoting_objects.append(obj)
        
        db.add_all(xiaoting_objects)
        db.commit()
        print(f"   ✅ 猇亭广场: {len(xiaoting_objects)} 个对象")
        
        # ========== 3. CBD商务区 (4000x4000) ==========
        print("3️⃣ 创建CBD商务区对象...")
        cbd_objects = []
        
        for i in range(60):
            obj_type = random.choice(["npc", "chest", "resource", "puzzle"])
            
            if obj_type == "npc":
                obj = MapObject(
                    map_area="CBD商务区",
                    object_type="npc",
                    x=random.randint(100, 3900),
                    y=random.randint(100, 3900),
                    title=random.choice(["技术总监", "项目经理", "算法专家", "数据科学家"]),
                    description="高级编程挑战",
                    icon=random.choice(["👨‍💼", "👩‍💼", "🧑‍🔬", "💼"]),
                    interaction_type="talk",
                    rewards={"experience": random.randint(100, 200)},
                    requirements={"level": 20}
                )
            elif obj_type == "chest":
                obj = MapObject(
                    map_area="CBD商务区",
                    object_type="chest",
                    x=random.randint(100, 3900),
                    y=random.randint(100, 3900),
                    title=random.choice(["高级宝箱", "史诗宝箱", "传说宝箱"]),
                    description="珍贵的奖励",
                    icon=random.choice(["💎", "👑", "🏆"]),
                    interaction_type="collect",
                    rewards={"experience": random.randint(150, 300), "coins": random.randint(50, 100)},
                    requirements={"level": 20},
                    respawn_time=3600
                )
            elif obj_type == "resource":
                obj = MapObject(
                    map_area="CBD商务区",
                    object_type="resource",
                    x=random.randint(100, 3900),
                    y=random.randint(100, 3900),
                    title=random.choice(["稀有材料", "高级技能书", "传说碎片"]),
                    description="稀有资源",
                    icon=random.choice(["💎", "📘", "✨"]),
                    interaction_type="collect",
                    rewards={"experience": random.randint(80, 150)},
                    respawn_time=1800
                )
            else:
                obj = MapObject(
                    map_area="CBD商务区",
                    object_type="puzzle",
                    x=random.randint(100, 3900),
                    y=random.randint(100, 3900),
                    title="算法挑战",
                    description="解决这个算法问题",
                    icon="🧩",
                    interaction_type="solve",
                    rewards={"experience": random.randint(150, 250)},
                    requirements={"level": 20, "answer": "algorithm"}
                )
            
            cbd_objects.append(obj)
        
        db.add_all(cbd_objects)
        db.commit()
        print(f"   ✅ CBD商务区: {len(cbd_objects)} 个对象")
        
        # ========== 4. 编程森林 (5000x5000) ==========
        print("4️⃣ 创建编程森林对象...")
        forest_objects = []
        
        # 森林特色对象
        forest_features = [
            {"name": "古老的树", "icon": "🌳", "type": "npc", "desc": "智慧之树，教授递归"},
            {"name": "神秘洞穴", "icon": "🕳️", "type": "puzzle", "desc": "需要解谜才能进入"},
            {"name": "精灵", "icon": "🧚", "type": "npc", "desc": "森林精灵，提供任务"},
            {"name": "宝藏", "icon": "💰", "type": "chest", "desc": "隐藏的宝藏"},
            {"name": "魔法蘑菇", "icon": "🍄", "type": "resource", "desc": "增强能力的蘑菇"},
        ]
        
        # 添加70个对象
        for i in range(70):
            if i < 10:
                # 前10个是特色对象
                feature = forest_features[i % len(forest_features)]
                obj = MapObject(
                    map_area="编程森林",
                    object_type=feature["type"],
                    x=random.randint(200, 4800),
                    y=random.randint(200, 4800),
                    title=feature["name"],
                    description=feature["desc"],
                    icon=feature["icon"],
                    interaction_type="talk" if feature["type"] == "npc" else ("solve" if feature["type"] == "puzzle" else "collect"),
                    rewards={"experience": random.randint(100, 200), "coins": random.randint(30, 60)},
                    requirements={"level": 15}
                )
            else:
                # 随机对象
                obj_type = random.choice(["npc", "chest", "resource", "puzzle"])
                obj = MapObject(
                    map_area="编程森林",
                    object_type=obj_type,
                    x=random.randint(200, 4800),
                    y=random.randint(200, 4800),
                    title=random.choice(["森林守护者", "野生宝箱", "魔法水晶", "谜题石碑"]),
                    description="森林中的神秘对象",
                    icon=random.choice(["🌲", "🎁", "💎", "🗿", "🧩"]),
                    interaction_type=random.choice(["talk", "collect", "solve"]),
                    rewards={"experience": random.randint(80, 150)},
                    requirements={"level": 15},
                    respawn_time=random.choice([None, 1800, 3600])
                )
            
            forest_objects.append(obj)
        
        db.add_all(forest_objects)
        db.commit()
        print(f"   ✅ 编程森林: {len(forest_objects)} 个对象")
        
        # ========== 5. 算法迷宫 (4000x4000) ==========
        print("5️⃣ 创建算法迷宫对象...")
        maze_objects = []
        
        for i in range(60):
            obj = MapObject(
                map_area="算法迷宫",
                object_type=random.choice(["puzzle", "chest", "npc"]),
                x=random.randint(200, 3800),
                y=random.randint(200, 3800),
                title=random.choice(["迷宫守卫", "谜题石碑", "隐藏宝箱", "算法大师"]),
                description="迷宫中的挑战",
                icon=random.choice(["🧩", "🗿", "💎", "👨‍🏫", "🔮"]),
                interaction_type=random.choice(["solve", "talk", "collect"]),
                rewards={"experience": random.randint(120, 250)},
                requirements={"level": 20},
                respawn_time=random.choice([None, 2400])
            )
            maze_objects.append(obj)
        
        db.add_all(maze_objects)
        db.commit()
        print(f"   ✅ 算法迷宫: {len(maze_objects)} 个对象")
        
        # ========== 6. 数据结构山脉 (6000x6000) ==========
        print("6️⃣ 创建数据结构山脉对象...")
        mountain_objects = []
        
        for i in range(80):
            obj = MapObject(
                map_area="数据结构山脉",
                object_type=random.choice(["npc", "chest", "resource", "puzzle"]),
                x=random.randint(300, 5700),
                y=random.randint(300, 5700),
                title=random.choice(["山峰守护者", "雪山宝箱", "稀有矿石", "山顶谜题"]),
                description="高山上的挑战",
                icon=random.choice(["⛰️", "🏔️", "💎", "🧊", "🗿"]),
                interaction_type=random.choice(["talk", "collect", "solve"]),
                rewards={"experience": random.randint(150, 300), "coins": random.randint(50, 100)},
                requirements={"level": 25},
                respawn_time=random.choice([None, 3600])
            )
            mountain_objects.append(obj)
        
        db.add_all(mountain_objects)
        db.commit()
        print(f"   ✅ 数据结构山脉: {len(mountain_objects)} 个对象")
        
        # ========== 7. 代码海洋 (5000x5000) ==========
        print("7️⃣ 创建代码海洋对象...")
        ocean_objects = []
        
        for i in range(70):
            obj = MapObject(
                map_area="代码海洋",
                object_type=random.choice(["npc", "chest", "resource"]),
                x=random.randint(200, 4800),
                y=random.randint(200, 4800),
                title=random.choice(["海洋守护者", "沉船宝藏", "珍珠", "海底遗迹"]),
                description="海洋中的奥秘",
                icon=random.choice(["🌊", "🐚", "🐠", "⚓", "🏴‍☠️"]),
                interaction_type=random.choice(["talk", "collect"]),
                rewards={"experience": random.randint(180, 350)},
                requirements={"level": 30},
                respawn_time=random.choice([None, 2400, 3600])
            )
            ocean_objects.append(obj)
        
        db.add_all(ocean_objects)
        db.commit()
        print(f"   ✅ 代码海洋: {len(ocean_objects)} 个对象")
        
        # ========== 8. 云端之城 (4000x4000) ==========
        print("8️⃣ 创建云端之城对象...")
        cloud_objects = []
        
        for i in range(60):
            obj = MapObject(
                map_area="云端之城",
                object_type=random.choice(["npc", "chest", "puzzle"]),
                x=random.randint(200, 3800),
                y=random.randint(200, 3800),
                title=random.choice(["天使守护", "云端宝箱", "天空谜题", "云中智者"]),
                description="云端的挑战",
                icon=random.choice(["☁️", "🌤️", "⛅", "🌈", "✨"]),
                interaction_type=random.choice(["talk", "collect", "solve"]),
                rewards={"experience": random.randint(200, 400), "coins": random.randint(80, 150)},
                requirements={"level": 35}
            )
            cloud_objects.append(obj)
        
        db.add_all(cloud_objects)
        db.commit()
        print(f"   ✅ 云端之城: {len(cloud_objects)} 个对象")
        
        # ========== 9. 时空裂隙 (3000x3000) ==========
        print("9️⃣ 创建时空裂隙对象...")
        void_objects = []
        
        for i in range(50):
            obj = MapObject(
                map_area="时空裂隙",
                object_type=random.choice(["npc", "chest", "puzzle"]),
                x=random.randint(200, 2800),
                y=random.randint(200, 2800),
                title=random.choice(["时空守护者", "次元宝箱", "时空谜题", "虚空之眼"]),
                description="时空的秘密",
                icon=random.choice(["🌀", "⏰", "🔮", "🌌"]),
                interaction_type=random.choice(["talk", "collect", "solve"]),
                rewards={"experience": random.randint(250, 450)},
                requirements={"level": 40}
            )
            void_objects.append(obj)
        
        db.add_all(void_objects)
        db.commit()
        print(f"   ✅ 时空裂隙: {len(void_objects)} 个对象")
        
        # ========== 10. 编程圣地 (8000x8000) ==========
        print("🔟 创建编程圣地对象...")
        sanctuary_objects = []
        
        for i in range(100):
            obj = MapObject(
                map_area="编程圣地",
                object_type=random.choice(["npc", "chest", "puzzle", "resource"]),
                x=random.randint(500, 7500),
                y=random.randint(500, 7500),
                title=random.choice(["圣地守护者", "传说宝箱", "终极挑战", "神圣水晶"]),
                description="编程的终极考验",
                icon=random.choice(["✨", "👑", "🏆", "⚡", "🔱"]),
                interaction_type=random.choice(["talk", "collect", "solve"]),
                rewards={"experience": random.randint(300, 600), "coins": random.randint(100, 200)},
                requirements={"level": 50}
            )
            sanctuary_objects.append(obj)
        
        db.add_all(sanctuary_objects)
        db.commit()
        print(f"   ✅ 编程圣地: {len(sanctuary_objects)} 个对象")
        
        # ========== 统计 ==========
        total = len(novice_objects) + len(xiaoting_objects) + len(cbd_objects) + \
                len(forest_objects) + len(maze_objects) + len(mountain_objects) + \
                len(ocean_objects) + len(cloud_objects) + len(void_objects) + \
                len(sanctuary_objects)
        
        print(f"\n🎉 成功创建 {total} 个地图对象！")
        
        # 按区域统计
        regions_stats = db.query(MapObject.map_area).distinct().all()
        print("\n📊 各区域对象统计:")
        for (region,) in regions_stats:
            count = db.query(MapObject).filter(MapObject.map_area == region).count()
            print(f"   {region}: {count} 个")
        
        # 按类型统计
        print("\n📊 对象类型统计:")
        for obj_type in ["npc", "chest", "resource", "puzzle"]:
            count = db.query(MapObject).filter(MapObject.object_type == obj_type).count()
            print(f"   {obj_type}: {count} 个")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 创建失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_map_objects()

