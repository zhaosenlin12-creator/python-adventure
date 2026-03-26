"""
后台管理API - 教师端
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.time import utc_now

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.teacher import Teacher
from app.models.dynamic_task import DynamicTask, DynamicTaskSubmission
from app.core.security import verify_password, get_password_hash, create_access_token
from pydantic import BaseModel

router = APIRouter()

# ==================== Schemas ====================

class TeacherLogin(BaseModel):
    username: str
    password: str

class TeacherCreate(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    class_name: str = ""

class DynamicTaskCreate(BaseModel):
    title: str
    description: str
    difficulty: int = 1
    category: str = "Python基础"
    task_type: str = "code"
    requirements: str
    test_cases: list = []
    starter_code: str = ""
    experience_reward: int = 50
    coins_reward: int = 30
    time_limit: int = 60
    target_class: str = ""
    target_level_min: int = 1
    target_level_max: int = 100

class DynamicTaskUpdate(BaseModel):
    title: str = None
    description: str = None
    difficulty: int = None
    requirements: str = None
    experience_reward: int = None
    coins_reward: int = None
    is_active: bool = None

class TaskPublish(BaseModel):
    task_id: int

# ==================== 教师认证 ====================

def get_current_teacher(
    token: str = Depends(lambda: ""),  # 暂时简化
    db: Session = Depends(get_db)
) -> Teacher:
    """获取当前登录的教师（暂时简化实现）"""
    # TODO: 实现完整的教师JWT认证
    # 暂时返回第一个教师账号
    teacher = db.query(Teacher).first()
    if not teacher:
        raise HTTPException(status_code=401, detail="教师未登录")
    return teacher

# ==================== 教师账号管理 ====================

@router.post("/teacher/register")
async def register_teacher(
    teacher_data: TeacherCreate,
    db: Session = Depends(get_db)
):
    """注册教师账号"""
    
    # 检查用户名是否已存在
    existing = db.query(Teacher).filter(Teacher.username == teacher_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 创建教师账号
    teacher = Teacher(
        username=teacher_data.username,
        email=teacher_data.email,
        hashed_password=get_password_hash(teacher_data.password),
        full_name=teacher_data.full_name,
        class_name=teacher_data.class_name
    )
    
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    
    return {
        "success": True,
        "message": "教师账号创建成功",
        "teacher_id": teacher.id
    }

@router.post("/teacher/login")
async def teacher_login(
    login_data: TeacherLogin,
    db: Session = Depends(get_db)
):
    """教师登录"""
    
    teacher = db.query(Teacher).filter(Teacher.username == login_data.username).first()
    
    if not teacher or not verify_password(login_data.password, teacher.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    if not teacher.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")
    
    # 创建访问令牌
    access_token = create_access_token(data={"sub": str(teacher.id), "type": "teacher"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "teacher": {
            "id": teacher.id,
            "username": teacher.username,
            "full_name": teacher.full_name,
            "class_name": teacher.class_name,
            "is_admin": teacher.is_admin
        }
    }

# ==================== 动态任务管理 ====================

@router.post("/tasks/create")
async def create_dynamic_task(
    task_data: DynamicTaskCreate,
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """创建动态任务"""
    
    task = DynamicTask(
        teacher_id=teacher.id,
        title=task_data.title,
        description=task_data.description,
        difficulty=task_data.difficulty,
        category=task_data.category,
        task_type=task_data.task_type,
        requirements=task_data.requirements,
        test_cases=task_data.test_cases,
        starter_code=task_data.starter_code,
        experience_reward=task_data.experience_reward,
        coins_reward=task_data.coins_reward,
        time_limit=task_data.time_limit,
        target_class=task_data.target_class or teacher.class_name,
        target_level_min=task_data.target_level_min,
        target_level_max=task_data.target_level_max
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return {
        "success": True,
        "message": "任务创建成功",
        "task_id": task.id,
        "task": {
            "id": task.id,
            "title": task.title,
            "difficulty": task.difficulty,
            "experience_reward": task.experience_reward,
            "is_published": task.is_published
        }
    }

@router.get("/tasks/list")
async def list_teacher_tasks(
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """获取教师创建的任务列表"""
    
    tasks = db.query(DynamicTask).filter(
        DynamicTask.teacher_id == teacher.id
    ).order_by(DynamicTask.created_at.desc()).all()
    
    result = []
    for task in tasks:
        result.append({
            "id": task.id,
            "title": task.title,
            "difficulty": task.difficulty,
            "category": task.category,
            "experience_reward": task.experience_reward,
            "is_published": task.is_published,
            "is_active": task.is_active,
            "total_submissions": task.total_submissions,
            "success_submissions": task.success_submissions,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "published_at": task.published_at.isoformat() if task.published_at else None
        })
    
    return {"tasks": result}

@router.post("/tasks/publish")
async def publish_task(
    publish_data: TaskPublish,
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """发布任务（学生立即可见）"""
    
    task = db.query(DynamicTask).filter(
        DynamicTask.id == publish_data.task_id,
        DynamicTask.teacher_id == teacher.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task.is_published = True
    task.published_at = utc_now()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"任务《{task.title}》已发布！学生现在可以看到了",
        "published_at": task.published_at.isoformat()
    }

@router.put("/tasks/{task_id}")
async def update_task(
    task_id: int,
    task_data: DynamicTaskUpdate,
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """更新任务"""
    
    task = db.query(DynamicTask).filter(
        DynamicTask.id == task_id,
        DynamicTask.teacher_id == teacher.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 更新字段
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.difficulty is not None:
        task.difficulty = task_data.difficulty
    if task_data.requirements is not None:
        task.requirements = task_data.requirements
    if task_data.experience_reward is not None:
        task.experience_reward = task_data.experience_reward
    if task_data.coins_reward is not None:
        task.coins_reward = task_data.coins_reward
    if task_data.is_active is not None:
        task.is_active = task_data.is_active
    
    db.commit()
    
    return {
        "success": True,
        "message": "任务更新成功"
    }

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """删除任务"""
    
    task = db.query(DynamicTask).filter(
        DynamicTask.id == task_id,
        DynamicTask.teacher_id == teacher.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    db.delete(task)
    db.commit()
    
    return {
        "success": True,
        "message": "任务已删除"
    }

@router.get("/tasks/{task_id}/submissions")
async def get_task_submissions(
    task_id: int,
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """查看任务提交情况"""
    
    task = db.query(DynamicTask).filter(
        DynamicTask.id == task_id,
        DynamicTask.teacher_id == teacher.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    submissions = db.query(DynamicTaskSubmission).filter(
        DynamicTaskSubmission.task_id == task_id
    ).order_by(DynamicTaskSubmission.submitted_at.desc()).all()
    
    result = []
    for sub in submissions:
        user = db.query(User).filter(User.id == sub.user_id).first()
        result.append({
            "id": sub.id,
            "user_id": sub.user_id,
            "username": user.username if user else "未知",
            "status": sub.status,
            "score": sub.score,
            "experience_earned": sub.experience_earned,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None
        })
    
    return {
        "task": {
            "id": task.id,
            "title": task.title,
            "total_submissions": task.total_submissions,
            "success_submissions": task.success_submissions
        },
        "submissions": result
    }

# ==================== 学生管理 ====================

@router.get("/students/list")
async def list_students(
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """查看学生列表"""
    
    # 获取所有学生（可以根据班级筛选）
    students = db.query(User).order_by(User.level.desc()).limit(100).all()
    
    result = []
    for student in students:
        result.append({
            "id": student.id,
            "username": student.username,
            "level": student.level,
            "experience": student.experience,
            "rank_title": student.get_rank_title(),
            "created_at": student.created_at.isoformat() if student.created_at else None
        })
    
    return {"students": result}

@router.get("/statistics")
async def get_statistics(
    db: Session = Depends(get_db),
    teacher: Teacher = Depends(get_current_teacher)
):
    """获取统计数据"""
    
    # 学生总数
    total_students = db.query(User).count()
    
    # 任务总数
    total_tasks = db.query(DynamicTask).filter(
        DynamicTask.teacher_id == teacher.id
    ).count()
    
    # 已发布任务
    published_tasks = db.query(DynamicTask).filter(
        DynamicTask.teacher_id == teacher.id,
        DynamicTask.is_published == True
    ).count()
    
    # 总提交数
    total_submissions = db.query(DynamicTaskSubmission).join(
        DynamicTask
    ).filter(
        DynamicTask.teacher_id == teacher.id
    ).count()
    
    return {
        "total_students": total_students,
        "total_tasks": total_tasks,
        "published_tasks": published_tasks,
        "total_submissions": total_submissions
    }






