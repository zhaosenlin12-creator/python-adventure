"""
添加渐进式解锁的教学内容到地图
"""
import sys
sys.path.append('.')

from app.core.database import SessionLocal, engine
from app.models.map_object import MapObject
from app.core.database import Base

# 创建表
Base.metadata.create_all(bind=engine)

def init_progressive_content():
    db = SessionLocal()
    
    try:
        # 清除现有的puzzle和task类型的对象
        db.query(MapObject).filter(MapObject.object_type.in_(['puzzle', 'task'])).delete()
        
        # ===================
        # 编程基础系列（1-5级）
        # ===================
        
        # 第1课：Python入门
        puzzle_1 = MapObject(
            map_area="新手村",
            object_type="puzzle",
            title="Python之门",
            description="回答Python基础问题，开启编程之旅！",
            icon="🐍",
            x=300,
            y=200,
            interaction_type="solve",
            rewards={"experience": 20, "coins": 10},
            requirements={"level": 1}
        )
        
        # 第2课：变量与数据类型
        puzzle_2 = MapObject(
            map_area="新手村",
            object_type="puzzle",
            title="数据魔法师",
            description="理解Python的数据类型",
            icon="🎲",
            x=500,
            y=200,
            interaction_type="solve",
            rewards={"experience": 25, "coins": 15},
            requirements={"level": 1}
        )
        
        # 第3课：条件语句
        puzzle_3 = MapObject(
            map_area="新手村",
            object_type="puzzle",
            title="决策之树",
            description="掌握if-else条件判断",
            icon="🌲",
            x=700,
            y=300,
            interaction_type="solve",
            rewards={"experience": 30, "coins": 15},
            requirements={"level": 2}
        )
        
        # 第4课：循环结构
        puzzle_4 = MapObject(
            map_area="新手村",
            object_type="puzzle",
            title="循环秘境",
            description="理解for和while循环",
            icon="🔄",
            x=400,
            y=400,
            interaction_type="solve",
            rewards={"experience": 35, "coins": 20},
            requirements={"level": 3}
        )
        
        # 第5课：函数定义
        puzzle_5 = MapObject(
            map_area="新手村",
            object_type="puzzle",
            title="函数工坊",
            description="学会创建和使用函数",
            icon="⚙️",
            x=600,
            y=500,
            interaction_type="solve",
            rewards={"experience": 40, "coins": 25},
            requirements={"level": 3}
        )
        
        # ===================
        # 数据结构系列（5-10级）
        # ===================
        
        # 第6课：列表操作
        puzzle_6 = MapObject(
            map_area="盛世天下",
            object_type="puzzle",
            title="列表魔法阵",
            description="掌握列表的增删改查",
            icon="📜",
            x=200,
            y=300,
            interaction_type="solve",
            rewards={"experience": 45, "coins": 30},
            requirements={"level": 5}
        )
        
        # 第7课：字典操作
        puzzle_7 = MapObject(
            map_area="盛世天下",
            object_type="puzzle",
            title="键值宝典",
            description="理解字典的键值对存储",
            icon="📖",
            x=400,
            y=300,
            interaction_type="solve",
            rewards={"experience": 50, "coins": 35},
            requirements={"level": 6}
        )
        
        # 第8课：字符串处理
        puzzle_8 = MapObject(
            map_area="盛世天下",
            object_type="puzzle",
            title="文字炼金术",
            description="精通字符串操作",
            icon="✍️",
            x=600,
            y=400,
            interaction_type="solve",
            rewards={"experience": 55, "coins": 40},
            requirements={"level": 7}
        )
        
        # ===================
        # 高级编程（10-15级）
        # ===================
        
        # 第9课：面向对象
        puzzle_9 = MapObject(
            map_area="猇亭广场",
            object_type="puzzle",
            title="类的神殿",
            description="学习面向对象编程",
            icon="🏛️",
            x=800,
            y=400,
            interaction_type="solve",
            rewards={"experience": 60, "coins": 45},
            requirements={"level": 10}
        )
        
        # 第10课：异常处理
        puzzle_10 = MapObject(
            map_area="猇亭广场",
            object_type="puzzle",
            title="异常守卫",
            description="掌握错误处理机制",
            icon="🛡️",
            x=1000,
            y=500,
            interaction_type="solve",
            rewards={"experience": 65, "coins": 50},
            requirements={"level": 12}
        )
        
        # ===================
        # 实战项目（15+级）
        # ===================
        
        # 第11课：文件操作
        puzzle_11 = MapObject(
            map_area="CBD商务区",
            object_type="puzzle",
            title="文件管理员",
            description="学会读写文件",
            icon="📁",
            x=300,
            y=600,
            interaction_type="solve",
            rewards={"experience": 70, "coins": 55},
            requirements={"level": 15}
        )
        
        # 第12课：模块导入
        puzzle_12 = MapObject(
            map_area="CBD商务区",
            object_type="puzzle",
            title="模块图书馆",
            description="理解模块和包的概念",
            icon="📚",
            x=500,
            y=700,
            interaction_type="solve",
            rewards={"experience": 75, "coins": 60},
            requirements={"level": 18}
        )
        
        # ===================
        # 任务NPC（提供编程挑战）
        # ===================
        
        # 初级任务发布者
        task_npc_1 = MapObject(
            map_area="新手村",
            object_type="npc",
            title="代码导师小明",
            description="为新手提供编程入门任务",
            icon="👨‍🏫",
            x=150,
            y=150,
            interaction_type="talk",
            rewards={"experience": 10},
            requirements={"level": 1}
        )
        
        # 中级任务发布者
        task_npc_2 = MapObject(
            map_area="盛世天下",
            object_type="npc",
            title="算法大师李华",
            description="提供算法和数据结构挑战",
            icon="👨‍💼",
            x=300,
            y=200,
            interaction_type="talk",
            rewards={"experience": 50},
            requirements={"level": 8}
        )
        
        # 高级任务发布者
        task_npc_3 = MapObject(
            map_area="CBD商务区",
            object_type="npc",
            title="项目经理张伟",
            description="提供实战项目任务",
            icon="👔",
            x=400,
            y=500,
            interaction_type="talk",
            rewards={"experience": 100},
            requirements={"level": 15}
        )
        
        # ===================
        # 知识点宝箱（随机出现）
        # ===================
        
        chest_1 = MapObject(
            map_area="新手村",
            object_type="chest",
            title="知识宝箱",
            description="打开获得随机编程知识和奖励",
            icon="📦",
            x=250,
            y=450,
            interaction_type="collect",
            rewards={"experience": 30, "coins": 20},
            respawn_time=300,
            requirements={"level": 1}
        )
        
        chest_2 = MapObject(
            map_area="盛世天下",
            object_type="chest",
            title="经验宝箱",
            description="打开获得大量经验值",
            icon="💎",
            x=550,
            y=550,
            interaction_type="collect",
            rewards={"experience": 60, "coins": 40},
            respawn_time=600,
            requirements={"level": 5}
        )
        
        chest_3 = MapObject(
            map_area="猇亭广场",
            object_type="chest",
            title="高级宝箱",
            description="打开获得珍贵的编程资源",
            icon="🎁",
            x=900,
            y=300,
            interaction_type="collect",
            rewards={"experience": 100, "coins": 80},
            respawn_time=900,
            requirements={"level": 10}
        )
        
        # 添加所有对象
        objects = [
            puzzle_1, puzzle_2, puzzle_3, puzzle_4, puzzle_5,
            puzzle_6, puzzle_7, puzzle_8, puzzle_9, puzzle_10,
            puzzle_11, puzzle_12,
            task_npc_1, task_npc_2, task_npc_3,
            chest_1, chest_2, chest_3
        ]
        
        for obj in objects:
            db.add(obj)
        
        db.commit()
        
        print(f"✅ 成功添加 {len(objects)} 个渐进式教学内容！")
        print("\n📚 内容分布:")
        print("  - Python基础系列（1-5级）: 5个")
        print("  - 数据结构系列（5-10级）: 3个")
        print("  - 高级编程（10-15级）: 2个")
        print("  - 实战项目（15+级）: 2个")
        print("  - 任务NPC: 3个")
        print("  - 知识宝箱: 3个")
        print("\n🎯 学生可以按等级逐步解锁学习内容！")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*50)
    print("   添加渐进式教学内容")
    print("="*50)
    init_progressive_content()
    print("="*50)

