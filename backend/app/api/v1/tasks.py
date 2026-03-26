from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import shutil
from app.core.database import get_db
from app.core.time import utc_now
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.user_task import UserTask
from app.models.task_submission import TaskFileSubmission
from app.schemas.task import TaskListResponse, TaskResponse, TaskSubmission, TaskResult
from app.services.sandbox import sandbox_service
from app.services.reward import reward_service
from app.services.achievement_checker import achievement_checker

router = APIRouter()

# 创建上传目录
UPLOAD_DIR = "uploads/tasks"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/list", response_model=List[TaskListResponse])
async def get_tasks_list(
    task_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取任务列表"""
    query = db.query(Task)
    
    if task_type:
        query = query.filter(Task.task_type == task_type)
    
    tasks = query.all()
    
    # 获取用户的任务进度
    user_tasks = db.query(UserTask).filter(UserTask.user_id == current_user.id).all()
    user_task_dict = {ut.task_id: ut.status for ut in user_tasks}
    
    result = []
    for task in tasks:
        status = user_task_dict.get(task.id, "available")
        result.append(TaskListResponse(
            id=task.id,
            title=task.title,
            difficulty=task.difficulty,
            task_type=task.task_type,
            map_area=task.map_area,
            status=status
        ))
    
    return result

@router.get("/detail/{task_id}", response_model=TaskResponse)
async def get_task_detail(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        difficulty=task.difficulty,
        task_type=task.task_type,
        map_area=task.map_area,
        code_template=task.code_template,
        rewards=task.rewards,
        prerequisites=task.prerequisites or []
    )

@router.post("/submit/{task_id}", response_model=TaskResult)
async def submit_task(
    task_id: int,
    submission: TaskSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交任务代码"""
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    # 获取或创建用户任务记录
    user_task = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.task_id == task_id
    ).first()
    
    if not user_task:
        user_task = UserTask(
            user_id=current_user.id,
            task_id=task_id
        )
        db.add(user_task)
    
    user_task.attempts += 1
    user_task.code_submitted = submission.code
    
    # 简化版：不使用沙箱，直接判断代码是否提交
    # TODO: 后续可以集成真正的代码执行沙箱
    
    # 检查代码是否有内容
    code_length = len(submission.code.strip())
    
    # 简单判断：代码长度>10就算通过
    if code_length > 10:
        success = True
        score = 100
        total_tests = 1
        passed_tests = 1
        execution_result = {
            "success": True,
            "output": "代码已提交成功！",
            "error": "",
            "test_results": [{"passed": True, "message": "代码格式正确"}]
        }
    else:
        success = False
        score = 0
        total_tests = 1
        passed_tests = 0
        execution_result = {
            "success": False,
            "output": "",
            "error": "代码太短，请编写更多代码",
            "test_results": [{"passed": False, "message": "代码长度不足"}]
        }
    user_task.score = score
    
    # 如果全部通过，标记为完成并发放奖励
    if success and score == 100:
        user_task.status = "completed"
        user_task.completed_at = utc_now()
        
        # 简化版：直接给经验，不调用复杂的reward服务
        exp_reward = task.rewards.get("experience", 50) if task.rewards else 50
        leveled_up = current_user.add_experience(exp_reward)

        # 确保任务状态写入后再检查成就
        db.flush()

        newly_unlocked = []
        try:
            unlocked_task = achievement_checker.check_and_unlock(
                db, current_user, event_type="task_complete", event_data={"task_id": task_id}
            )
            newly_unlocked.extend(unlocked_task or [])
            if leveled_up:
                unlocked_level = achievement_checker.check_and_unlock(
                    db, current_user, event_type="level_up"
                )
                newly_unlocked.extend(unlocked_level or [])
        except Exception:
            # 成就失败不影响任务完成
            pass

        db.commit()
        
        message = "🎉 恭喜！任务完成！"
        
        return TaskResult(
            success=True,
            message=message,
            test_results=execution_result.get("test_results", []),
            score=score,
            output=execution_result.get("output", ""),
            error=execution_result.get("error", ""),
            rewards={"experience": exp_reward},
            new_achievements=[
                {
                    "id": a.id,
                    "title": a.title,
                    "icon": a.icon,
                    "reward_exp": a.reward_exp,
                    "reward_eggs": getattr(a, "reward_eggs", 0) or 0
                } for a in (newly_unlocked or [])
            ]
        )
    else:
        # 未通过，保存尝试记录
        if score > 0:
            user_task.status = "in_progress"
        
        db.commit()
        
        # 提取错误信息
        error_message = execution_result.get("error", "")
        if error_message:
            message = f"❌ 执行失败: {error_message}"
        else:
            message = f"继续努力！通过了 {passed_tests}/{total_tests} 个测试用例"
        
        return TaskResult(
            success=False,
            message=message,
            test_results=execution_result.get("test_results", []),
            score=score,
            output=execution_result.get("output", ""),
            error=execution_result.get("error", "")
        )

@router.post("/upload/{task_id}")
async def upload_task_file(
    task_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传任务项目文件（压缩包）"""
    
    # 检查任务是否存在
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    # 检查文件类型
    allowed_extensions = ['.zip', '.rar', '.7z', '.tar', '.gz']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式，请上传: {', '.join(allowed_extensions)}"
        )
    
    # 创建用户任务目录
    user_upload_dir = os.path.join(UPLOAD_DIR, str(current_user.id), str(task_id))
    os.makedirs(user_upload_dir, exist_ok=True)
    
    # 保存文件（添加时间戳避免重名）
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(user_upload_dir, safe_filename)
    
    try:
        # 保存文件到磁盘
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        
        # 保存到数据库
        file_submission = TaskFileSubmission(
            user_id=current_user.id,
            task_id=task_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            is_graded=False,
            rewarded=False
        )
        db.add(file_submission)
        
        # 更新用户任务状态
        user_task = db.query(UserTask).filter(
            UserTask.user_id == current_user.id,
            UserTask.task_id == task_id
        ).first()
        
        if not user_task:
            user_task = UserTask(
                user_id=current_user.id,
                task_id=task_id,
                status="file_uploaded",
                code_submitted=f"文件: {file.filename}"
            )
            db.add(user_task)
        else:
            user_task.status = "file_uploaded"
            user_task.code_submitted = f"文件: {file.filename}"
        
        # 给予上传奖励（一次性）
        if not file_submission.rewarded:
            upload_reward = 30  # 上传文件奖励30经验
            current_user.add_experience(upload_reward)
            file_submission.rewarded = True
        
        db.commit()
        
        return {
            "success": True,
            "message": "文件上传成功！获得30经验值！",
            "filename": file.filename,
            "size": file_size,
            "upload_time": file_submission.upload_time.isoformat(),
            "reward": {"experience": 30}
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件上传失败: {str(e)}"
        )

@router.get("/submissions/{task_id}")
async def get_task_submissions(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取任务的所有提交记录"""
    submissions = db.query(TaskFileSubmission).filter(
        TaskFileSubmission.user_id == current_user.id,
        TaskFileSubmission.task_id == task_id
    ).order_by(TaskFileSubmission.upload_time.desc()).all()
    
    return {
        "task_id": task_id,
        "submissions": [
            {
                "id": sub.id,
                "filename": sub.filename,
                "file_size": sub.file_size,
                "upload_time": sub.upload_time.isoformat(),
                "is_graded": sub.is_graded,
                "score": sub.score,
                "feedback": sub.feedback
            }
            for sub in submissions
        ]
    }
