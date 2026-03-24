"""
用户全局题库API
- 获取用户题库
- 添加题目
- 更新题目
- 删除题目（单个/批量）
- 批量导入（AI生成）
- 随机获取题目（用于测试关卡）
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json
import random

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.user_question import UserQuestion
from app.schemas.user_question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionBankResponse,
    BatchDeleteRequest,
    BatchImportRequest,
)

router = APIRouter()

# 全局题库限制
MAX_QUESTIONS_PER_USER = 300

# 默认题目（新用户初始化）
DEFAULT_QUESTIONS = [
    # 选择题
    {"type": "choice", "question": "1 + 1 等于多少？", "options": ["1", "2", "3", "4"], "answer": "2", "explanation": "1加1等于2，这是最基础的加法运算。", "difficulty": 1},
    {"type": "choice", "question": "太阳从哪个方向升起？", "options": ["东方", "西方", "南方", "北方"], "answer": "东方", "explanation": "太阳每天从东方升起，从西方落下。", "difficulty": 1},
    {"type": "choice", "question": "一年有多少个月？", "options": ["10个月", "11个月", "12个月", "13个月"], "answer": "12个月", "explanation": "一年有12个月，从1月到12月。", "difficulty": 1},
    {"type": "choice", "question": "水的化学式是什么？", "options": ["H2O", "CO2", "O2", "N2"], "answer": "H2O", "explanation": "水由两个氢原子和一个氧原子组成，化学式为H2O。", "difficulty": 2},
    {"type": "choice", "question": "中国的首都是哪里？", "options": ["上海", "北京", "广州", "深圳"], "answer": "北京", "explanation": "北京是中华人民共和国的首都。", "difficulty": 1},
    # 填空题
    {"type": "fill", "question": "2 × 3 = ___", "options": None, "answer": "6", "explanation": "2乘以3等于6。", "difficulty": 1},
    {"type": "fill", "question": "一周有___天", "options": None, "answer": "7", "explanation": "一周有7天，从周一到周日。", "difficulty": 1},
    {"type": "fill", "question": "地球绕太阳转一圈需要___年", "options": None, "answer": "1", "explanation": "地球绕太阳公转一周需要一年时间。", "difficulty": 2},
    {"type": "fill", "question": "三角形有___条边", "options": None, "answer": "3", "explanation": "三角形由三条边组成。", "difficulty": 1},
    {"type": "fill", "question": "100 ÷ 10 = ___", "options": None, "answer": "10", "explanation": "100除以10等于10。", "difficulty": 1},
]


def init_default_questions(db: Session, user_id: int):
    """为新用户初始化默认题目"""
    for q in DEFAULT_QUESTIONS:
        db_question = UserQuestion(
            user_id=user_id,
            type=q["type"],
            question=q["question"],
            options=json.dumps(q["options"]) if q["options"] else None,
            answer=q["answer"],
            explanation=q["explanation"],
            difficulty=q["difficulty"],
        )
        db.add(db_question)
    db.commit()


@router.get("", response_model=QuestionBankResponse)
async def get_question_bank(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的全局题库"""
    questions = db.query(UserQuestion).filter(
        UserQuestion.user_id == current_user.id
    ).order_by(UserQuestion.created_at.desc()).all()
    
    # 🔥 新用户自动初始化默认题目
    if len(questions) == 0:
        init_default_questions(db, current_user.id)
        # 重新查询
        questions = db.query(UserQuestion).filter(
            UserQuestion.user_id == current_user.id
        ).order_by(UserQuestion.created_at.desc()).all()
    
    # 转换options字段
    result = []
    for q in questions:
        q_dict = {
            "id": q.id,
            "type": q.type,
            "question": q.question,
            "options": json.loads(q.options) if q.options else None,
            "answer": q.answer,
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "created_at": q.created_at,
            "updated_at": q.updated_at,
        }
        result.append(QuestionResponse(**q_dict))
    
    return QuestionBankResponse(
        questions=result,
        total=len(result),
        limit=MAX_QUESTIONS_PER_USER,
    )


@router.get("/random", response_model=List[QuestionResponse])
async def get_random_questions(
    count: int = Query(10, ge=1, le=50),
    difficulty: Optional[int] = Query(None, ge=1, le=3),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """随机获取题目（用于测试关卡）"""
    query = db.query(UserQuestion).filter(UserQuestion.user_id == current_user.id)
    
    if difficulty:
        query = query.filter(UserQuestion.difficulty == difficulty)
    
    questions = query.all()
    
    if not questions:
        return []
    
    # 随机选择
    selected = random.sample(questions, min(count, len(questions)))
    
    result = []
    for q in selected:
        q_dict = {
            "id": q.id,
            "type": q.type,
            "question": q.question,
            "options": json.loads(q.options) if q.options else None,
            "answer": q.answer,
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "created_at": q.created_at,
            "updated_at": q.updated_at,
        }
        result.append(QuestionResponse(**q_dict))
    
    return result


@router.post("", response_model=QuestionResponse)
async def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """添加题目到题库"""
    # 检查数量限制
    count = db.query(func.count(UserQuestion.id)).filter(
        UserQuestion.user_id == current_user.id
    ).scalar()
    
    if count >= MAX_QUESTIONS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"题库已达上限（{MAX_QUESTIONS_PER_USER}道），请删除一些题目后再添加"
        )
    
    # 验证选择题必须有选项
    if question.type == "choice" and (not question.options or len(question.options) < 2):
        raise HTTPException(status_code=400, detail="选择题至少需要2个选项")
    
    db_question = UserQuestion(
        user_id=current_user.id,
        type=question.type,
        question=question.question,
        options=json.dumps(question.options) if question.options else None,
        answer=question.answer,
        explanation=question.explanation,
        difficulty=question.difficulty,
    )
    
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    return QuestionResponse(
        id=db_question.id,
        type=db_question.type,
        question=db_question.question,
        options=json.loads(db_question.options) if db_question.options else None,
        answer=db_question.answer,
        explanation=db_question.explanation,
        difficulty=db_question.difficulty,
        created_at=db_question.created_at,
        updated_at=db_question.updated_at,
    )


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    question: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新题目"""
    db_question = db.query(UserQuestion).filter(
        UserQuestion.id == question_id,
        UserQuestion.user_id == current_user.id
    ).first()
    
    if not db_question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    # 更新字段
    update_data = question.model_dump(exclude_unset=True)
    
    if "options" in update_data:
        update_data["options"] = json.dumps(update_data["options"]) if update_data["options"] else None
    
    for key, value in update_data.items():
        setattr(db_question, key, value)
    
    db.commit()
    db.refresh(db_question)
    
    return QuestionResponse(
        id=db_question.id,
        type=db_question.type,
        question=db_question.question,
        options=json.loads(db_question.options) if db_question.options else None,
        answer=db_question.answer,
        explanation=db_question.explanation,
        difficulty=db_question.difficulty,
        created_at=db_question.created_at,
        updated_at=db_question.updated_at,
    )


@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除单个题目"""
    db_question = db.query(UserQuestion).filter(
        UserQuestion.id == question_id,
        UserQuestion.user_id == current_user.id
    ).first()
    
    if not db_question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    db.delete(db_question)
    db.commit()
    
    return {"success": True, "message": "题目已删除"}


@router.post("/batch-delete")
async def batch_delete_questions(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量删除题目"""
    deleted_count = db.query(UserQuestion).filter(
        UserQuestion.id.in_(request.ids),
        UserQuestion.user_id == current_user.id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"success": True, "deleted_count": deleted_count}


@router.post("/batch-import")
async def batch_import_questions(
    request: BatchImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量导入题目（AI生成）"""
    # 检查数量限制
    current_count = db.query(func.count(UserQuestion.id)).filter(
        UserQuestion.user_id == current_user.id
    ).scalar()
    
    remaining = MAX_QUESTIONS_PER_USER - current_count
    
    if remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"题库已达上限（{MAX_QUESTIONS_PER_USER}道），请删除一些题目后再导入"
        )
    
    # 只导入不超过剩余空间的题目
    questions_to_import = request.questions[:remaining]
    imported_count = 0
    
    for q in questions_to_import:
        # 验证选择题
        if q.type == "choice" and (not q.options or len(q.options) < 2):
            continue
        
        db_question = UserQuestion(
            user_id=current_user.id,
            type=q.type,
            question=q.question,
            options=json.dumps(q.options) if q.options else None,
            answer=q.answer,
            explanation=q.explanation,
            difficulty=q.difficulty,
        )
        db.add(db_question)
        imported_count += 1
    
    db.commit()
    
    skipped = len(request.questions) - imported_count
    message = f"成功导入 {imported_count} 道题目"
    if skipped > 0:
        message += f"，跳过 {skipped} 道（题库已满或格式无效）"
    
    return {
        "success": True,
        "imported_count": imported_count,
        "skipped_count": skipped,
        "message": message,
        "current_total": current_count + imported_count,
        "limit": MAX_QUESTIONS_PER_USER,
    }
