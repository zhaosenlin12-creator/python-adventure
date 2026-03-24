"""
创建演示教师账号
"""
import sys
sys.path.append('.')

from app.core.database import SessionLocal, engine
from app.models.teacher import Teacher
from app.core.security import get_password_hash
from app.core.database import Base

Base.metadata.create_all(bind=engine)

def init_demo_teacher():
    db = SessionLocal()
    
    try:
        # 检查是否已存在
        existing = db.query(Teacher).filter(Teacher.username == "teacher").first()
        if existing:
            print("✅ 演示教师账号已存在")
            print(f"   用户名: teacher")
            print(f"   密码: teacher123")
            return
        
        # 创建演示教师账号
        teacher = Teacher(
            username="teacher",
            email="teacher@example.com",
            hashed_password=get_password_hash("teacher123"),
            full_name="演示教师",
            class_name="编程冒险一班",
            is_admin=True
        )
        
        db.add(teacher)
        db.commit()
        
        print("="*50)
        print("✅ 演示教师账号创建成功！")
        print("="*50)
        print(f"👨‍🏫 用户名: teacher")
        print(f"🔑 密码: teacher123")
        print(f"📧 邮箱: teacher@example.com")
        print(f"👥 班级: 编程冒险一班")
        print("\n🌐 访问地址: http://localhost:3000/teacher")
        print("="*50)
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_demo_teacher()






