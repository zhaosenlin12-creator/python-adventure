"""
初始化开放世界地图数据
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.map_object import MapObject, UserMapProgress
from app.models.user_location import UserLocation

def init_world_data():
    """初始化世界地图数据"""
    
    # 创建表
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(MapObject).delete()
        
        # 地图对象数据
        map_objects = [
            # ===== 新手村 =====
            MapObject(
                map_area="新手村",
                object_type="chest",
                x=150, y=200,
                title="新手宝箱",
                description="一个看起来很普通的宝箱",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 50, "coins": 100},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="npc",
                x=100, y=150,
                title="村长老李",
                description="欢迎来到编程冒险岛！这里是学习编程的好地方。",
                icon="👴",
                interaction_type="talk",
                rewards={"experience": 20},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="puzzle",
                x=250, y=180,
                title="神秘石碑",
                description="石碑上刻着：Python之父的名字是？",
                icon="🗿",
                interaction_type="solve",
                rewards={"experience": 100, "coins": 200},
                requirements={"answer": "Guido van Rossum"}
            ),
            MapObject(
                map_area="新手村",
                object_type="resource",
                x=300, y=250,
                title="经验果树",
                description="一棵结满经验果实的神奇树木",
                icon="🌳",
                interaction_type="collect",
                rewards={"experience": 80},
                requirements={},
                respawn_time=3600  # 1小时重生
            ),
            
            # ===== 算法森林 =====
            MapObject(
                map_area="算法森林",
                object_type="chest",
                x=400, y=300,
                title="算法宝箱",
                description="隐藏在森林深处的宝箱",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 150, "coins": 300},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="puzzle",
                x=450, y=400,
                title="智慧树",
                description="树上有个谜题：数组排序最快的平均时间复杂度是？",
                icon="🌲",
                interaction_type="solve",
                rewards={"experience": 200, "coins": 400},
                requirements={"answer": "O(nlogn)", "level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="npc",
                x=380, y=350,
                title="算法导师",
                description="我可以教你如何高效地解决问题！",
                icon="🧙‍♂️",
                interaction_type="talk",
                rewards={"experience": 100},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="resource",
                x=500, y=450,
                title="灵感泉水",
                description="喝一口就能提升经验",
                icon="⛲",
                interaction_type="collect",
                rewards={"experience": 120},
                requirements={"level": 3},
                respawn_time=1800  # 30分钟重生
            ),
            
            # ===== 数据结构山 =====
            MapObject(
                map_area="数据结构山",
                object_type="chest",
                x=600, y=200,
                title="结构宝箱",
                description="蕴含数据结构奥秘的宝箱",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 250, "coins": 500},
                requirements={"level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="puzzle",
                x=650, y=250,
                title="堆栈之门",
                description="谜题：栈是什么数据结构？（LIFO/FIFO）",
                icon="🚪",
                interaction_type="solve",
                rewards={"experience": 300, "coins": 600},
                requirements={"answer": "LIFO", "level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="npc",
                x=580, y=280,
                title="数据守护者",
                description="掌握数据结构，就能掌控世界！",
                icon="🦸",
                interaction_type="talk",
                rewards={"experience": 150},
                requirements={"level": 5}
            ),
            
            # ===== Web开发海岸 =====
            MapObject(
                map_area="Web开发海岸",
                object_type="chest",
                x=200, y=500,
                title="前端宝箱",
                description="装满前端知识的宝箱",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 300, "coins": 600},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="puzzle",
                x=250, y=550,
                title="API灯塔",
                description="谜题：RESTful API中，获取资源用什么HTTP方法？",
                icon="🗼",
                interaction_type="solve",
                rewards={"experience": 350, "coins": 700},
                requirements={"answer": "GET", "level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="npc",
                x=300, y=480,
                title="全栈大师",
                description="前端后端我都精通！",
                icon="👨‍💻",
                interaction_type="talk",
                rewards={"experience": 200},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="resource",
                x=180, y=530,
                title="代码沙滩",
                description="在沙滩上捡到一些经验值",
                icon="🏖️",
                interaction_type="collect",
                rewards={"experience": 150},
                requirements={"level": 7},
                respawn_time=2400  # 40分钟重生
            ),
            
            # ===== AI研究所 =====
            MapObject(
                map_area="AI研究所",
                object_type="chest",
                x=700, y=600,
                title="AI核心宝箱",
                description="蕴含人工智能精华的宝箱",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 500, "coins": 1000},
                requirements={"level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="puzzle",
                x=750, y=650,
                title="神经网络迷宫",
                description="谜题：深度学习的基本单元是？",
                icon="🧠",
                interaction_type="solve",
                rewards={"experience": 600, "coins": 1200},
                requirements={"answer": "神经元", "level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="npc",
                x=680, y=620,
                title="AI教授",
                description="人工智能将改变世界！",
                icon="👨‍🔬",
                interaction_type="talk",
                rewards={"experience": 300},
                requirements={"level": 10}
            ),
        ]
        
        db.add_all(map_objects)
        db.commit()
        
        print(f"✅ 成功初始化 {len(map_objects)} 个地图对象")
        print("\n地图区域分布:")
        areas = {}
        for obj in map_objects:
            areas[obj.map_area] = areas.get(obj.map_area, 0) + 1
        
        for area, count in areas.items():
            print(f"  📍 {area}: {count} 个对象")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🗺️  初始化开放世界地图数据...")
    init_world_data()
    print("\n✅ 完成！")









