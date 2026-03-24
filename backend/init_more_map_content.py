"""
丰富地图内容 - 添加更多NPC和交互对象
"""
import sys
sys.path.append('.')

from app.core.database import SessionLocal, engine
from app.models.map_object import MapObject
from app.core.database import Base

Base.metadata.create_all(bind=engine)

def init_more_content():
    db = SessionLocal()
    
    try:
        # 新手村 - 更多NPC和对象
        new_objects = [
            # 友善NPC
            MapObject(
                map_area="新手村",
                object_type="npc",
                title="热心的学长",
                description="刚刚从新手村毕业的学长，可以给你一些建议",
                icon="👦",
                x=200,
                y=250,
                interaction_type="talk",
                rewards={"experience": 5},
                requirements={"level": 1}
            ),
            
            MapObject(
                map_area="新手村",
                object_type="npc",
                title="图书管理员",
                description="管理着编程书籍的NPC，可以学到很多知识",
                icon="👩‍💼",
                x=450,
                y=350,
                interaction_type="talk",
                rewards={"experience": 10},
                requirements={"level": 2}
            ),
            
            # 练习场
            MapObject(
                map_area="新手村",
                object_type="resource",
                title="编程练习场",
                description="在这里可以练习编程基础",
                icon="🎯",
                x=550,
                y=450,
                interaction_type="collect",
                rewards={"experience": 15, "coins": 5},
                respawn_time=180,
                requirements={"level": 1}
            ),
            
            # 商店
            MapObject(
                map_area="新手村",
                object_type="npc",
                title="道具商人",
                description="出售各种编程学习道具",
                icon="🛒",
                x=350,
                y=550,
                interaction_type="talk",
                rewards={"coins": 0},
                requirements={"level": 1}
            ),
            
            # 盛世天下 - 城镇NPC
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="数据结构专家",
                description="精通各种数据结构的专家",
                icon="👨‍🔬",
                x=350,
                y=450,
                interaction_type="talk",
                rewards={"experience": 30},
                requirements={"level": 5}
            ),
            
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="调试大师",
                description="可以帮你找出代码中的bug",
                icon="🔧",
                x=500,
                y=350,
                interaction_type="talk",
                rewards={"experience": 25},
                requirements={"level": 6}
            ),
            
            # 竞技场
            MapObject(
                map_area="盛世天下",
                object_type="resource",
                title="编程竞技场",
                description="在这里可以和其他玩家切磋",
                icon="⚔️",
                x=650,
                y=500,
                interaction_type="collect",
                rewards={"experience": 40, "coins": 25},
                respawn_time=300,
                requirements={"level": 7}
            ),
            
            # 猇亭广场 - 高级区域
            MapObject(
                map_area="猇亭广场",
                object_type="npc",
                title="架构师导师",
                description="系统架构方面的专家",
                icon="👨‍🏫",
                x=950,
                y=600,
                interaction_type="talk",
                rewards={"experience": 50},
                requirements={"level": 10}
            ),
            
            MapObject(
                map_area="猇亭广场",
                object_type="npc",
                title="代码审查员",
                description="帮你review代码，提升代码质量",
                icon="👓",
                x=750,
                y=550,
                interaction_type="talk",
                rewards={"experience": 45},
                requirements={"level": 11}
            ),
            
            # 图书馆
            MapObject(
                map_area="猇亭广场",
                object_type="resource",
                title="高级图书馆",
                description="收藏着大量高级编程书籍",
                icon="📚",
                x=1100,
                y=450,
                interaction_type="collect",
                rewards={"experience": 60, "coins": 40},
                respawn_time=400,
                requirements={"level": 12}
            ),
            
            # CBD商务区 - 实战区域
            MapObject(
                map_area="CBD商务区",
                object_type="npc",
                title="CTO",
                description="大型科技公司的技术总监",
                icon="👔",
                x=650,
                y=750,
                interaction_type="talk",
                rewards={"experience": 70},
                requirements={"level": 15}
            ),
            
            MapObject(
                map_area="CBD商务区",
                object_type="npc",
                title="全栈工程师",
                description="精通前后端的全栈开发者",
                icon="💻",
                x=350,
                y=700,
                interaction_type="talk",
                rewards={"experience": 65},
                requirements={"level": 16}
            ),
            
            # 创业孵化器
            MapObject(
                map_area="CBD商务区",
                object_type="resource",
                title="创业孵化器",
                description="可以在这里实践创业项目",
                icon="🚀",
                x=550,
                y=800,
                interaction_type="collect",
                rewards={"experience": 100, "coins": 80},
                respawn_time=600,
                requirements={"level": 18}
            ),
            
            # 神秘NPC（所有地图）
            MapObject(
                map_area="新手村",
                object_type="npc",
                title="神秘旅人",
                description="来自远方的神秘人物，似乎知道很多秘密",
                icon="🧙",
                x=100,
                y=600,
                interaction_type="talk",
                rewards={"experience": 20, "coins": 10},
                requirements={"level": 1}
            ),
            
            MapObject(
                map_area="盛世天下",
                object_type="npc",
                title="占卜师",
                description="可以预测你的编程未来",
                icon="🔮",
                x=750,
                y=200,
                interaction_type="talk",
                rewards={"experience": 35},
                requirements={"level": 8}
            ),
            
            MapObject(
                map_area="猇亭广场",
                object_type="npc",
                title="时间管理大师",
                description="教你如何高效学习编程",
                icon="⏰",
                x=650,
                y=350,
                interaction_type="talk",
                rewards={"experience": 55},
                requirements={"level": 13}
            ),
            
            MapObject(
                map_area="CBD商务区",
                object_type="npc",
                title="技术布道师",
                description="分享最新的技术趋势",
                icon="📢",
                x=450,
                y=850,
                interaction_type="talk",
                rewards={"experience": 75},
                requirements={"level": 17}
            ),
        ]
        
        for obj in new_objects:
            db.add(obj)
        
        db.commit()
        
        print(f"✅ 成功添加 {len(new_objects)} 个地图内容！")
        print("\n🗺️ 地图分布:")
        print("  - 新手村: 5个新增内容")
        print("  - 盛世天下: 4个新增内容")
        print("  - 猇亭广场: 4个新增内容")
        print("  - CBD商务区: 4个新增内容")
        print("  - 神秘NPC: 4个")
        print("\n🎮 地图内容更加丰富了！")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*50)
    print("   丰富地图内容")
    print("="*50)
    init_more_content()
    print("="*50)






