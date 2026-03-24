"""
扩展版世界地图数据 - 基于猇亭区真实地点
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.map_object import MapObject

def init_extended_world_data():
    """初始化扩展版世界地图数据（基于真实地点）"""
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(MapObject).delete()
        
        # 扩展的地图对象数据（基于猇亭区真实地点）
        map_objects = [
            # ===== 新手村（猇亭乐博士广场区域）=====
            # 核心地标
            MapObject(
                map_area="新手村",
                object_type="npc",
                x=400, y=300,
                title="乐博士机器人",
                description="欢迎来到编程冒险岛！我是你的编程导师，让我们一起开始这段奇妙的旅程吧！",
                icon="🤖",
                interaction_type="talk",
                rewards={"experience": 100, "coins": 200},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="chest",
                x=500, y=300,
                title="乐博士的礼物",
                description="乐博士为新手准备的启动礼包",
                icon="🎁",
                interaction_type="collect",
                rewards={"experience": 150, "coins": 300},
                requirements={}
            ),
            
            # 长江中学区域
            MapObject(
                map_area="新手村",
                object_type="npc",
                x=600, y=250,
                title="长江中学老师",
                description="这里是长江中学，学习要循序渐进，打好基础最重要！",
                icon="👨‍🏫",
                interaction_type="talk",
                rewards={"experience": 80},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="chest",
                x=650, y=280,
                title="教学楼宝箱",
                description="隐藏在长江中学教学楼的知识宝库",
                icon="📚",
                interaction_type="collect",
                rewards={"experience": 120, "coins": 250},
                requirements={}
            ),
            
            # 实验小学区域
            MapObject(
                map_area="新手村",
                object_type="npc",
                x=350, y=400,
                title="实验小学校长",
                description="实验精神是编程的核心！多尝试，多实践，才能进步。",
                icon="👩‍🏫",
                interaction_type="talk",
                rewards={"experience": 90},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="puzzle",
                x=320, y=450,
                title="实验室谜题",
                description="谜题：Python中用什么关键字定义函数？",
                icon="🔬",
                interaction_type="solve",
                rewards={"experience": 150, "coins": 300},
                requirements={"answer": "def"}
            ),
            
            # 六眼冲小学区域
            MapObject(
                map_area="新手村",
                object_type="resource",
                x=200, y=350,
                title="六眼冲知识泉",
                description="这里是六眼冲小学，知识如泉水般涌出",
                icon="⛲",
                interaction_type="collect",
                rewards={"experience": 100},
                requirements={},
                respawn_time=1800
            ),
            
            # 盛世天下小区
            MapObject(
                map_area="新手村",
                object_type="npc",
                x=700, y=400,
                title="盛世天下居民",
                description="我住在盛世天下，每天都在这里学编程，进步可快了！",
                icon="👨‍💼",
                interaction_type="talk",
                rewards={"experience": 60},
                requirements={}
            ),
            MapObject(
                map_area="新手村",
                object_type="chest",
                x=750, y=380,
                title="小区公告栏",
                description="发现了编程学习的优惠活动公告",
                icon="📋",
                interaction_type="collect",
                rewards={"experience": 80, "coins": 150},
                requirements={}
            ),
            
            # 周边商业区
            MapObject(
                map_area="新手村",
                object_type="resource",
                x=550, y=450,
                title="便利店编程书",
                description="便利店里发现了编程入门书籍",
                icon="📖",
                interaction_type="collect",
                rewards={"experience": 70},
                requirements={},
                respawn_time=2400
            ),
            
            # 公园绿地
            MapObject(
                map_area="新手村",
                object_type="puzzle",
                x=450, y=500,
                title="公园智慧石",
                description="谜题：在Python中，哪个数据类型是有序且可变的？",
                icon="🗿",
                interaction_type="solve",
                rewards={"experience": 130, "coins": 260},
                requirements={"answer": "list"}
            ),
            
            # ===== 算法森林（进阶区域）=====
            MapObject(
                map_area="算法森林",
                object_type="npc",
                x=100, y=100,
                title="算法大师",
                description="欢迎来到算法森林！这里将教你如何高效解决问题。",
                icon="🧙‍♂️",
                interaction_type="talk",
                rewards={"experience": 150},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="chest",
                x=200, y=150,
                title="排序宝箱",
                description="掌握排序算法的关键",
                icon="📦",
                interaction_type="collect",
                rewards={"experience": 200, "coins": 400},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="chest",
                x=300, y=100,
                title="搜索宝箱",
                description="二分搜索的秘密",
                icon="🔍",
                interaction_type="collect",
                rewards={"experience": 220, "coins": 440},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="puzzle",
                x=150, y=200,
                title="时间复杂度谜题",
                description="谜题：快速排序的平均时间复杂度是？（格式：O(...)）",
                icon="⏱️",
                interaction_type="solve",
                rewards={"experience": 250, "coins": 500},
                requirements={"answer": "O(nlogn)", "level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="resource",
                x=250, y=180,
                title="算法灵感树",
                description="从大自然中领悟算法的智慧",
                icon="🌳",
                interaction_type="collect",
                rewards={"experience": 150},
                requirements={"level": 3},
                respawn_time=2400
            ),
            MapObject(
                map_area="算法森林",
                object_type="puzzle",
                x=350, y=150,
                title="递归之门",
                description="谜题：递归的两个基本要素是什么？（答案1和答案2，用逗号分隔）",
                icon="🚪",
                interaction_type="solve",
                rewards={"experience": 280, "coins": 560},
                requirements={"answer": "基线条件,递归条件", "level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="npc",
                x=400, y=200,
                title="贪心导师",
                description="贪心算法：每一步都做出当前最优的选择！",
                icon="🎯",
                interaction_type="talk",
                rewards={"experience": 120},
                requirements={"level": 3}
            ),
            MapObject(
                map_area="算法森林",
                object_type="resource",
                x=180, y=280,
                title="动态规划宝石",
                description="闪耀着智慧光芒的DP宝石",
                icon="💎",
                interaction_type="collect",
                rewards={"experience": 180},
                requirements={"level": 3},
                respawn_time=3000
            ),
            
            # ===== 数据结构山 =====
            MapObject(
                map_area="数据结构山",
                object_type="npc",
                x=500, y=100,
                title="数据结构守护者",
                description="数据结构是编程的基石，掌握它们，你将无所不能！",
                icon="🦸",
                interaction_type="talk",
                rewards={"experience": 200},
                requirements={"level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="chest",
                x=600, y=150,
                title="链表宝箱",
                description="链表的奥秘尽在其中",
                icon="🔗",
                interaction_type="collect",
                rewards={"experience": 300, "coins": 600},
                requirements={"level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="puzzle",
                x=550, y=200,
                title="栈与队列之谜",
                description="谜题：栈的特性是LIFO，那么队列的特性是？",
                icon="📚",
                interaction_type="solve",
                rewards={"experience": 350, "coins": 700},
                requirements={"answer": "FIFO", "level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="chest",
                x=650, y=120,
                title="树结构宝箱",
                description="二叉树、红黑树、B树的知识宝库",
                icon="🌲",
                interaction_type="collect",
                rewards={"experience": 320, "coins": 640},
                requirements={"level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="resource",
                x=580, y=250,
                title="哈希表魔石",
                description="O(1)时间复杂度的秘密",
                icon="💠",
                interaction_type="collect",
                rewards={"experience": 200},
                requirements={"level": 5},
                respawn_time=2400
            ),
            MapObject(
                map_area="数据结构山",
                object_type="puzzle",
                x=700, y=180,
                title="图论挑战",
                description="谜题：最短路径算法中最著名的是？（英文名）",
                icon="🗺️",
                interaction_type="solve",
                rewards={"experience": 400, "coins": 800},
                requirements={"answer": "Dijkstra", "level": 5}
            ),
            MapObject(
                map_area="数据结构山",
                object_type="npc",
                x=620, y=280,
                title="图灵老师",
                description="计算机科学的先驱，向你传授数据结构的精髓",
                icon="👨‍🔬",
                interaction_type="talk",
                rewards={"experience": 180},
                requirements={"level": 5}
            ),
            
            # ===== Web开发海岸 =====
            MapObject(
                map_area="Web开发海岸",
                object_type="npc",
                x=100, y=500,
                title="全栈工程师",
                description="从前端到后端，我都精通！让我教你Web开发的艺术。",
                icon="👨‍💻",
                interaction_type="talk",
                rewards={"experience": 250},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="chest",
                x=200, y=550,
                title="HTML宝箱",
                description="网页结构的基石",
                icon="🏗️",
                interaction_type="collect",
                rewards={"experience": 350, "coins": 700},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="chest",
                x=300, y=500,
                title="CSS魔盒",
                description="美化网页的魔法",
                icon="🎨",
                interaction_type="collect",
                rewards={"experience": 370, "coins": 740},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="puzzle",
                x=250, y=600,
                title="JavaScript灯塔",
                description="谜题：JavaScript中用于异步操作的新语法是？",
                icon="🗼",
                interaction_type="solve",
                rewards={"experience": 400, "coins": 800},
                requirements={"answer": "async/await", "level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="resource",
                x=150, y=650,
                title="API码头",
                description="连接前后端的桥梁",
                icon="⚓",
                interaction_type="collect",
                rewards={"experience": 220},
                requirements={"level": 7},
                respawn_time=2400
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="puzzle",
                x=350, y=580,
                title="RESTful谜题",
                description="谜题：创建新资源应该使用哪个HTTP方法？",
                icon="🌐",
                interaction_type="solve",
                rewards={"experience": 380, "coins": 760},
                requirements={"answer": "POST", "level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="npc",
                x=280, y=680,
                title="React大师",
                description="React是现代前端开发的利器！",
                icon="⚛️",
                interaction_type="talk",
                rewards={"experience": 200},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="chest",
                x=400, y=620,
                title="数据库宝箱",
                description="SQL和NoSQL的知识宝库",
                icon="🗄️",
                interaction_type="collect",
                rewards={"experience": 390, "coins": 780},
                requirements={"level": 7}
            ),
            MapObject(
                map_area="Web开发海岸",
                object_type="resource",
                x=180, y=580,
                title="代码沙滩",
                description="在沙滩上捡到了一些经验值和灵感",
                icon="🏖️",
                interaction_type="collect",
                rewards={"experience": 180},
                requirements={"level": 7},
                respawn_time=1800
            ),
            
            # ===== AI研究所 =====
            MapObject(
                map_area="AI研究所",
                object_type="npc",
                x=700, y=600,
                title="AI研究院院长",
                description="欢迎来到人工智能的殿堂！这里是未来的起点。",
                icon="🧠",
                interaction_type="talk",
                rewards={"experience": 300},
                requirements={"level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="chest",
                x=800, y=650,
                title="机器学习宝箱",
                description="监督学习、无监督学习、强化学习的精华",
                icon="🤖",
                interaction_type="collect",
                rewards={"experience": 500, "coins": 1000},
                requirements={"level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="puzzle",
                x=750, y=700,
                title="神经网络谜题",
                description="谜题：深度学习的基本单元叫什么？",
                icon="🧬",
                interaction_type="solve",
                rewards={"experience": 600, "coins": 1200},
                requirements={"answer": "神经元", "level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="chest",
                x=850, y=600,
                title="深度学习核心",
                description="CNN、RNN、Transformer的奥秘",
                icon="🔮",
                interaction_type="collect",
                rewards={"experience": 550, "coins": 1100},
                requirements={"level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="resource",
                x=780, y=750,
                title="GPU算力池",
                description="强大的计算资源",
                icon="⚡",
                interaction_type="collect",
                rewards={"experience": 280},
                requirements={"level": 10},
                respawn_time=3600
            ),
            MapObject(
                map_area="AI研究所",
                object_type="puzzle",
                x=900, y=680,
                title="自然语言处理",
                description="谜题：GPT代表什么？（英文全称）",
                icon="💬",
                interaction_type="solve",
                rewards={"experience": 650, "coins": 1300},
                requirements={"answer": "Generative Pre-trained Transformer", "level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="npc",
                x=820, y=780,
                title="深度学习导师",
                description="让我带你探索神经网络的奥秘！",
                icon="👨‍🔬",
                interaction_type="talk",
                rewards={"experience": 250},
                requirements={"level": 10}
            ),
            MapObject(
                map_area="AI研究所",
                object_type="chest",
                x=950, y=720,
                title="强化学习宝箱",
                description="AlphaGo的核心技术",
                icon="🎮",
                interaction_type="collect",
                rewards={"experience": 580, "coins": 1160},
                requirements={"level": 10}
            ),
        ]
        
        db.add_all(map_objects)
        db.commit()
        
        print(f"✅ 成功初始化 {len(map_objects)} 个扩展地图对象")
        print("\n地图区域分布:")
        areas = {}
        for obj in map_objects:
            areas[obj.map_area] = areas.get(obj.map_area, 0) + 1
        
        for area, count in areas.items():
            print(f"  📍 {area}: {count} 个对象")
        
        print("\n对象类型统计:")
        types = {}
        for obj in map_objects:
            types[obj.object_type] = types.get(obj.object_type, 0) + 1
        
        for obj_type, count in types.items():
            icons = {"chest": "📦", "npc": "👥", "puzzle": "🧩", "resource": "🌟"}
            print(f"  {icons.get(obj_type, '❓')} {obj_type}: {count} 个")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🗺️  初始化扩展版世界地图数据（基于真实地点）...")
    print("=" * 60)
    init_extended_world_data()
    print("=" * 60)
    print("\n✅ 完成！地图内容已大幅扩充！")
    print("💡 提示：重启后端服务以加载新数据")








