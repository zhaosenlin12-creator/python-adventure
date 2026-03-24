"""
初始化角色模板数据
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.models.character import CharacterTemplate

def init_character_templates():
    """初始化角色模板"""
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 清空现有数据
        db.query(CharacterTemplate).delete()
        
        # 角色模板数据
        templates = [
            CharacterTemplate(
                id=1,
                name="程序猿",
                description="经典的程序员形象，戴着眼镜，充满智慧",
                sprite_url="/characters/programmer.png",
                unlock_level=1,
                attributes={"speed": 3, "color": "blue", "icon": "👨‍💻"}
            ),
            CharacterTemplate(
                id=2,
                name="编程少女",
                description="活泼可爱的编程爱好者",
                sprite_url="/characters/girl_coder.png",
                unlock_level=1,
                attributes={"speed": 3.5, "color": "pink", "icon": "👩‍💻"}
            ),
            CharacterTemplate(
                id=3,
                name="机器人",
                description="来自未来的AI助手",
                sprite_url="/characters/robot.png",
                unlock_level=5,
                attributes={"speed": 4, "color": "silver", "icon": "🤖"}
            ),
            CharacterTemplate(
                id=4,
                name="黑客",
                description="神秘的代码高手",
                sprite_url="/characters/hacker.png",
                unlock_level=10,
                attributes={"speed": 4.5, "color": "black", "icon": "🕵️"}
            ),
            CharacterTemplate(
                id=5,
                name="算法大师",
                description="精通各种算法的专家",
                sprite_url="/characters/algorithm_master.png",
                unlock_level=15,
                attributes={"speed": 3, "color": "purple", "icon": "🧙‍♂️"}
            ),
            CharacterTemplate(
                id=6,
                name="全栈工程师",
                description="前后端通吃的全能型选手",
                sprite_url="/characters/fullstack.png",
                unlock_level=20,
                attributes={"speed": 3.5, "color": "green", "icon": "🦸"}
            ),
        ]
        
        db.add_all(templates)
        db.commit()
        
        print(f"✅ 成功初始化 {len(templates)} 个角色模板")
        for template in templates:
            print(f"  {template.attributes['icon']} {template.name} (Lv.{template.unlock_level})")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎮 初始化角色模板...")
    init_character_templates()
    print("\n✅ 完成！")







