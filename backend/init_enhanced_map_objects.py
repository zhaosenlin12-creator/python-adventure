"""
初始化增强的地图对象系统
为所有10个区域添加丰富的地图对象（NPC、宝箱、资源点、解谜点等）
"""
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.map_object import MapObject
from app.models.map_region import MapRegion
import random

def create_objects_for_region(db: Session, region: MapRegion):
    """为指定区域创建地图对象"""
    
    region_name = region.name
    width = region.width
    height = region.height
    
    objects = []
    
    # 根据区域主题创建不同的对象
    if region.theme == 'village':
        # 新手村：友好NPC、教学对象、基础宝箱
        npcs = [
            {"title": "村长", "icon": "👴", "description": "友好的村长，欢迎新人", "level": 1},
            {"title": "新手导师", "icon": "👨‍🏫", "description": "教你Python基础", "level": 1},
            {"title": "武器商人", "icon": "🛡️", "description": "出售新手装备", "level": 1},
            {"title": "药剂师", "icon": "⚗️", "description": "出售恢复药水", "level": 1},
            {"title": "铁匠", "icon": "🔨", "description": "升级装备", "level": 1},
            {"title": "任务发布员", "icon": "📜", "description": "发布每日任务", "level": 1},
            {"title": "宠物训练师", "icon": "🐕", "description": "教你如何养宠物", "level": 1},
            {"title": "冒险家", "icon": "🧭", "description": "分享探索经验", "level": 1},
        ]
        
        for i, npc in enumerate(npcs):
            x = random.randint(100, width - 100)
            y = random.randint(100, height - 100)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 10, "coins": 20},
                requirements={"level": npc["level"]}
            ))
        
        # 宝箱
        chest_types = [
            {"title": "新手宝箱", "icon": "📦", "rewards": {"experience": 50, "coins": 100}, "respawn": 300},
            {"title": "银色宝箱", "icon": "💼", "rewards": {"experience": 100, "coins": 200}, "respawn": 600},
            {"title": "金色宝箱", "icon": "🎁", "rewards": {"experience": 200, "coins": 500}, "respawn": 1200},
        ]
        
        for chest_type in chest_types:
            for _ in range(5):
                x = random.randint(100, width - 100)
                y = random.randint(100, height - 100)
                objects.append(MapObject(
                    map_area=region_name,
                    object_type="chest",
                    x=x, y=y,
                    title=chest_type["title"],
                    description=f"可以获得{chest_type['rewards']['experience']}经验",
                    icon=chest_type["icon"],
                    interaction_type="collect",
                    rewards=chest_type["rewards"],
                    respawn_time=chest_type.get("respawn")
                ))
        
        # 资源点
        resources = [
            {"title": "经验水晶", "icon": "💎", "rewards": {"experience": 30}},
            {"title": "金币堆", "icon": "💰", "rewards": {"coins": 50}},
            {"title": "知识书籍", "icon": "📚", "rewards": {"experience": 20}},
        ]
        
        for resource in resources:
            for _ in range(8):
                x = random.randint(100, width - 100)
                y = random.randint(100, height - 100)
                objects.append(MapObject(
                    map_area=region_name,
                    object_type="resource",
                    x=x, y=y,
                    title=resource["title"],
                    description="可采集的资源",
                    icon=resource["icon"],
                    interaction_type="collect",
                    rewards=resource["rewards"],
                    respawn_time=180
                ))
    
    elif region.theme == 'forest':
        # 编程森林：探索、隐藏内容、野生怪物
        npcs = [
            {"title": "森林守护者", "icon": "🧙", "description": "守护森林的智者", "level": 15},
            {"title": "精灵", "icon": "🧚", "description": "神秘的森林精灵", "level": 15},
            {"title": "采药人", "icon": "🌿", "description": "采集草药的老人", "level": 15},
        ]
        
        for npc in npcs:
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 50, "coins": 100},
                requirements={"level": npc["level"]}
            ))
        
        # 隐藏宝箱
        for _ in range(10):
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="chest",
                x=x, y=y,
                title="隐藏宝箱",
                description="森林深处的神秘宝箱",
                icon="🗝️",
                interaction_type="collect",
                rewards={"experience": 300, "coins": 600},
                requirements={"level": 15},
                respawn_time=1800
            ))
        
        # 资源点（森林特有）
        forest_resources = [
            {"title": "魔法蘑菇", "icon": "🍄", "rewards": {"experience": 50}},
            {"title": "晶莹露水", "icon": "💧", "rewards": {"experience": 40}},
            {"title": "古老树根", "icon": "🌳", "rewards": {"coins": 100}},
        ]
        
        for resource in forest_resources:
            for _ in range(15):
                x = random.randint(100, width - 100)
                y = random.randint(100, height - 100)
                objects.append(MapObject(
                    map_area=region_name,
                    object_type="resource",
                    x=x, y=y,
                    title=resource["title"],
                    description="森林中的珍贵资源",
                    icon=resource["icon"],
                    interaction_type="collect",
                    rewards=resource["rewards"],
                    respawn_time=300
                ))
    
    elif region.theme == 'maze':
        # 算法迷宫：解谜、挑战
        puzzles = [
            {"title": "逻辑门谜题", "icon": "🔐", "answer": "AND"},
            {"title": "排序挑战", "icon": "🔢", "answer": "bubble"},
            {"title": "递归之谜", "icon": "🌀", "answer": "recursion"},
            {"title": "二叉树谜题", "icon": "🌲", "answer": "tree"},
            {"title": "哈希谜题", "icon": "🔑", "answer": "hash"},
        ]
        
        for puzzle in puzzles:
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="puzzle",
                x=x, y=y,
                title=puzzle["title"],
                description="解开谜题获得奖励",
                icon=puzzle["icon"],
                interaction_type="solve",
                rewards={"experience": 500, "coins": 1000},
                requirements={"level": 20, "answer": puzzle["answer"]}
            ))
        
        # NPC
        npcs = [
            {"title": "迷宫守卫", "icon": "🛡️", "description": "守卫迷宫的战士", "level": 20},
            {"title": "谜题大师", "icon": "🧩", "description": "创造谜题的大师", "level": 20},
        ]
        
        for npc in npcs:
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 100, "coins": 200},
                requirements={"level": npc["level"]}
            ))
    
    elif region.theme == 'mountain':
        # 数据结构山脉：高难度挑战
        npcs = [
            {"title": "山顶隐者", "icon": "🧘", "description": "掌握高级算法的隐者", "level": 25},
            {"title": "攀登者", "icon": "🧗", "description": "挑战极限的攀登者", "level": 25},
        ]
        
        for npc in npcs:
            x = random.randint(300, width - 300)
            y = random.randint(300, height - 300)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 200, "coins": 400},
                requirements={"level": npc["level"]}
            ))
        
        # 稀有宝箱
        for _ in range(15):
            x = random.randint(300, width - 300)
            y = random.randint(300, height - 300)
            objects.append(MapObject(
                map_area=region_name,
                object_type="chest",
                x=x, y=y,
                title="史诗宝箱",
                description="山脉中的珍贵宝箱",
                icon="⚱️",
                interaction_type="collect",
                rewards={"experience": 800, "coins": 1500},
                requirements={"level": 25},
                respawn_time=3600
            ))
    
    elif region.theme == 'ocean':
        # 代码海洋：水下探索
        npcs = [
            {"title": "海洋之王", "icon": "🧜", "description": "统治海洋的王者", "level": 30},
            {"title": "潜水员", "icon": "🤿", "description": "深海探险家", "level": 30},
            {"title": "渔夫", "icon": "🎣", "description": "海边的渔夫", "level": 30},
        ]
        
        for npc in npcs:
            x = random.randint(300, width - 300)
            y = random.randint(300, height - 300)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 300, "coins": 600},
                requirements={"level": npc["level"]}
            ))
        
        # 珍珠和贝壳
        treasures = [
            {"title": "巨型珍珠", "icon": "🦪", "rewards": {"experience": 500, "coins": 1000}},
            {"title": "彩色贝壳", "icon": "🐚", "rewards": {"experience": 300, "coins": 500}},
        ]
        
        for treasure in treasures:
            for _ in range(12):
                x = random.randint(200, width - 200)
                y = random.randint(200, height - 200)
                objects.append(MapObject(
                    map_area=region_name,
                    object_type="resource",
                    x=x, y=y,
                    title=treasure["title"],
                    description="海洋的珍宝",
                    icon=treasure["icon"],
                    interaction_type="collect",
                    rewards=treasure["rewards"],
                    requirements={"level": 30},
                    respawn_time=600
                ))
    
    elif region.theme == 'cloud':
        # 云端之城：天空城市
        npcs = [
            {"title": "云端守护者", "icon": "👼", "description": "守护天空之城", "level": 35},
            {"title": "风之精灵", "icon": "🌪️", "description": "掌控风的精灵", "level": 35},
        ]
        
        for npc in npcs:
            x = random.randint(300, width - 300)
            y = random.randint(300, height - 300)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 400, "coins": 800},
                requirements={"level": npc["level"]}
            ))
        
        # 天空宝箱
        for _ in range(10):
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="chest",
                x=x, y=y,
                title="天空宝箱",
                description="漂浮在云端的宝箱",
                icon="💫",
                interaction_type="collect",
                rewards={"experience": 1000, "coins": 2000},
                requirements={"level": 35},
                respawn_time=7200
            ))
    
    elif region.theme == 'sanctuary':
        # 编程圣地：终极挑战
        npcs = [
            {"title": "代码之神", "icon": "🎖️", "description": "掌握一切编程知识的神", "level": 50},
            {"title": "传说导师", "icon": "👑", "description": "传说中的编程大师", "level": 50},
        ]
        
        for npc in npcs:
            x = random.randint(400, width - 400)
            y = random.randint(400, height - 400)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=npc["title"],
                description=npc["description"],
                icon=npc["icon"],
                interaction_type="talk",
                rewards={"experience": 1000, "coins": 2000},
                requirements={"level": npc["level"]}
            ))
        
        # 传说宝箱
        for _ in range(8):
            x = random.randint(400, width - 400)
            y = random.randint(400, height - 400)
            objects.append(MapObject(
                map_area=region_name,
                object_type="chest",
                x=x, y=y,
                title="传说宝箱",
                description="传说中的终极宝箱",
                icon="👑",
                interaction_type="collect",
                rewards={"experience": 5000, "coins": 10000},
                requirements={"level": 50},
                respawn_time=86400  # 24小时
            ))
    
    else:
        # 其他区域：通用对象
        required_level = region.required_level
        
        # NPC
        for i in range(5):
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="npc",
                x=x, y=y,
                title=f"{region.display_name}居民{i+1}",
                description=f"居住在{region.display_name}的居民",
                icon=random.choice(["👨", "👩", "🧑", "👴", "👵"]),
                interaction_type="talk",
                rewards={"experience": required_level * 10, "coins": required_level * 20},
                requirements={"level": required_level}
            ))
        
        # 宝箱
        for _ in range(8):
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="chest",
                x=x, y=y,
                title=f"{region.display_name}宝箱",
                description=f"藏在{region.display_name}的宝箱",
                icon="🎁",
                interaction_type="collect",
                rewards={"experience": required_level * 30, "coins": required_level * 50},
                requirements={"level": required_level},
                respawn_time=600
            ))
        
        # 资源点
        for _ in range(15):
            x = random.randint(100, width - 100)
            y = random.randint(100, height - 100)
            objects.append(MapObject(
                map_area=region_name,
                object_type="resource",
                x=x, y=y,
                title="资源点",
                description="可采集的资源",
                icon=random.choice(["💎", "💰", "📚", "⚡", "🔮"]),
                interaction_type="collect",
                rewards={"experience": required_level * 5, "coins": required_level * 10},
                requirements={"level": required_level},
                respawn_time=300
            ))
        
        # 解谜点
        for i in range(3):
            x = random.randint(200, width - 200)
            y = random.randint(200, height - 200)
            objects.append(MapObject(
                map_area=region_name,
                object_type="puzzle",
                x=x, y=y,
                title=f"谜题{i+1}",
                description="解开谜题获得丰厚奖励",
                icon="🧩",
                interaction_type="solve",
                rewards={"experience": required_level * 40, "coins": required_level * 80},
                requirements={"level": required_level, "answer": f"answer{i+1}"}
            ))
    
    return objects


def init_enhanced_objects():
    """初始化增强的地图对象"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("🎨 开始创建增强地图对象...\n")
        
        # 获取所有区域
        regions = db.query(MapRegion).all()
        
        if not regions:
            print("❌ 未找到区域，请先运行 init_map_regions.py")
            return
        
        total_objects = 0
        
        for region in regions:
            # 检查是否已有对象
            existing_count = db.query(MapObject).filter(
                MapObject.map_area == region.name
            ).count()
            
            if existing_count > 0:
                print(f"  ⏭️  {region.display_name} 已有 {existing_count} 个对象，跳过")
                continue
            
            # 创建对象
            objects = create_objects_for_region(db, region)
            
            for obj in objects:
                db.add(obj)
            
            db.commit()
            total_objects += len(objects)
            
            print(f"  ✅ {region.display_name}: 创建 {len(objects)} 个对象")
        
        print(f"\n🎉 成功创建 {total_objects} 个地图对象！")
        
        # 显示统计
        for region in regions:
            count = db.query(MapObject).filter(
                MapObject.map_area == region.name
            ).count()
            print(f"  📍 {region.display_name}: {count} 个对象")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    init_enhanced_objects()
