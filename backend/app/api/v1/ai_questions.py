"""
AI智能题目生成API
使用DeepSeek API为创意工坊生成题目
🔥 v2.4.1: 添加用户级速率限制，防止API滥用
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
import httpx
import json
import re
import time
from app.core.config import settings
from app.core.security import decode_access_token

router = APIRouter()

# ==================== 速率限制 ====================

# 🔥 用户级速率限制：每个用户每分钟最多3次请求
USER_RATE_LIMIT: Dict[str, List[float]] = {}  # user_id -> [timestamp1, timestamp2, ...]
RATE_LIMIT_WINDOW = 60  # 60秒窗口
RATE_LIMIT_MAX_REQUESTS = 3  # 每窗口最多3次请求

def check_rate_limit(user_id: str) -> bool:
    """检查用户是否超过速率限制"""
    now = time.time()
    
    # 清理过期记录
    if user_id in USER_RATE_LIMIT:
        USER_RATE_LIMIT[user_id] = [
            ts for ts in USER_RATE_LIMIT[user_id] 
            if now - ts < RATE_LIMIT_WINDOW
        ]
    else:
        USER_RATE_LIMIT[user_id] = []
    
    # 检查是否超限
    if len(USER_RATE_LIMIT[user_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    # 记录本次请求
    USER_RATE_LIMIT[user_id].append(now)
    return True

def get_rate_limit_reset_time(user_id: str) -> int:
    """获取速率限制重置时间（秒）"""
    if user_id not in USER_RATE_LIMIT or not USER_RATE_LIMIT[user_id]:
        return 0
    oldest = min(USER_RATE_LIMIT[user_id])
    return max(0, int(RATE_LIMIT_WINDOW - (time.time() - oldest)))

# ==================== 类型定义 ====================

GradeGroup = Literal["primary_lower", "primary_upper", "junior_high"]
SubjectType = Literal["math", "chinese", "english", "physics", "chemistry", 
                      "python", "scratch", "logic", "history", "science"]
DifficultyLevel = Literal[1, 2, 3]

class GenerateQuestionsRequest(BaseModel):
    grade: GradeGroup
    subjects: List[SubjectType] = Field(..., min_length=1, max_length=5)
    difficulty: DifficultyLevel = 1
    count: int = Field(default=10, ge=1, le=20)
    extra_prompt: Optional[str] = Field(default="", max_length=200)

class GeneratedQuestion(BaseModel):
    type: Literal["choice", "fill"]
    subject: str
    question: str
    options: Optional[List[str]] = None
    answer: str
    explanation: str
    difficulty: int

class GenerateQuestionsResponse(BaseModel):
    success: bool
    questions: List[GeneratedQuestion]
    message: Optional[str] = None

# ==================== Prompt配置 ====================

GRADE_CONTEXT = {
    "primary_lower": "小学1-3年级学生，使用简单词汇和小数字，题目要生动有趣",
    "primary_upper": "小学4-6年级学生，可以有一定难度，涉及基础知识点",
    "junior_high": "初中7-9年级学生，可以涉及学科专业知识点",
}

SUBJECT_PROMPTS = {
    "math": "数学题目，包括计算、应用题、几何等",
    "chinese": "语文题目，包括字词、成语、古诗、阅读理解等",
    "english": "英语题目，包括单词、语法、翻译、阅读等",
    "physics": "物理题目，包括力学、电学、光学等基础概念",
    "chemistry": "化学题目，包括元素、化学反应、实验等",
    "python": "Python编程题，包括语法、逻辑、简单算法",
    "scratch": "Scratch编程思维题，包括积木逻辑、流程控制、循环等",
    "logic": "趣味推理题，包括逻辑推理、脑筋急转弯、智力题",
    "history": "趣味历史题，包括历史故事、人物、事件、朝代等",
    "science": "科学常识题，包括自然现象、生活科学、动植物等",
}

DIFFICULTY_DESC = {1: "简单", 2: "中等", 3: "困难"}

def build_system_prompt() -> str:
    return """你是一个专业的中小学教育题目生成器，专门为学生创建高质量的练习题。

输出要求：
1. 必须输出有效的JSON数组格式
2. 每道题必须包含完整的字段
3. 选择题必须有4个选项，答案必须是选项之一
4. 填空题不需要options字段
5. 每道题都要有简短的解释帮助学生理解
6. 题目内容要准确、清晰、适合目标年龄段
7. 避免使用生僻字词和复杂表述

JSON格式示例：
[
  {
    "type": "choice",
    "subject": "math",
    "question": "25 + 37 = ?",
    "options": ["52", "62", "72", "42"],
    "answer": "62",
    "explanation": "25加37，先算5+7=12，进位1，再算2+3+1=6，所以答案是62",
    "difficulty": 1
  },
  {
    "type": "fill",
    "subject": "chinese",
    "question": "春眠不觉晓，处处闻____。",
    "answer": "啼鸟",
    "explanation": "这是唐代诗人孟浩然《春晓》中的名句",
    "difficulty": 1
  }
]

只输出JSON数组，不要输出任何其他内容。"""

def build_user_prompt(grade: str, subjects: List[str], difficulty: int, count: int, extra: str) -> str:
    grade_desc = GRADE_CONTEXT.get(grade, "中小学生")
    subject_desc = "、".join([SUBJECT_PROMPTS.get(s, s) for s in subjects])
    difficulty_desc = DIFFICULTY_DESC.get(difficulty, "中等")
    
    prompt = f"""请为以下要求生成{count}道题目：

目标学生：{grade_desc}
科目范围：{subject_desc}
难度要求：{difficulty_desc}
生成数量：{count}道题"""
    
    if extra and extra.strip():
        prompt += f"\n额外要求：{extra}"
    
    prompt += "\n\n请生成符合要求的题目，直接输出JSON数组。"
    return prompt

# ==================== API端点 ====================

@router.post("/generate", response_model=GenerateQuestionsResponse)
async def generate_questions(
    request: GenerateQuestionsRequest,
    authorization: Optional[str] = Header(None)
):
    """
    AI智能生成题目
    需要登录认证
    🔥 v2.4.1: 添加速率限制（每用户每分钟3次）
    """
    # 验证用户登录
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="需要登录才能使用AI出题功能")
    
    token = authorization[7:]  # 去掉 "Bearer " 前缀
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的登录凭证")
    
    # 🔥 v2.4.1: 检查速率限制
    if not check_rate_limit(str(user_id)):
        reset_time = get_rate_limit_reset_time(str(user_id))
        raise HTTPException(
            status_code=429,
            detail=f"请求过于频繁，请等待 {reset_time} 秒后重试（每分钟最多3次）"
        )
    
    # 检查API密钥配置
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(
            status_code=503, 
            detail="AI服务未配置，请在 /www/wwwroot/game-backend/.env 设置 DEEPSEEK_API_KEY 后重启后端"
        )
    
    # 构建Prompt
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        request.grade,
        request.subjects,
        request.difficulty,
        request.count,
        request.extra_prompt or ""
    )
    
    try:
        # 调用DeepSeek API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
            )
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"[AI] DeepSeek API错误: {response.status_code} - {error_detail}")
                raise HTTPException(
                    status_code=503,
                    detail="AI服务暂时不可用，请稍后重试"
                )
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # 解析JSON响应
            questions = parse_ai_response(content)
            
            if not questions:
                raise HTTPException(
                    status_code=500,
                    detail="AI生成的题目格式无效，请重试"
                )
            
            return GenerateQuestionsResponse(
                success=True,
                questions=questions,
                message=f"成功生成{len(questions)}道题目"
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI服务响应超时，请重试")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AI] 生成题目错误: {e}")
        raise HTTPException(status_code=500, detail="生成题目失败，请重试")

def parse_ai_response(content: str) -> List[GeneratedQuestion]:
    """解析AI返回的JSON内容"""
    try:
        # 尝试直接解析
        questions_data = json.loads(content)
    except json.JSONDecodeError:
        # 尝试提取JSON数组
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            try:
                questions_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                return []
        else:
            return []
    
    if not isinstance(questions_data, list):
        return []
    
    questions = []
    for q in questions_data:
        try:
            # 验证必需字段
            if not all(k in q for k in ['type', 'question', 'answer']):
                continue
            
            # 选择题必须有options
            if q['type'] == 'choice' and (not q.get('options') or len(q['options']) < 2):
                continue
            
            question = GeneratedQuestion(
                type=q.get('type', 'choice'),
                subject=q.get('subject', 'math'),
                question=str(q['question']).strip(),
                options=q.get('options') if q['type'] == 'choice' else None,
                answer=str(q['answer']).strip(),
                explanation=str(q.get('explanation', '')).strip(),
                difficulty=int(q.get('difficulty', 1))
            )
            questions.append(question)
        except Exception as e:
            print(f"[AI] 解析题目失败: {e}")
            continue
    
    return questions

@router.get("/status")
async def check_ai_status():
    """检查AI服务状态"""
    return {
        "available": bool(settings.DEEPSEEK_API_KEY),
        "model": settings.DEEPSEEK_MODEL if settings.DEEPSEEK_API_KEY else None,
        "config_path": "/www/wwwroot/game-backend/.env",
        "required_env": ["DEEPSEEK_API_KEY"],
        "message": None if settings.DEEPSEEK_API_KEY else "AI服务未配置，请在 /www/wwwroot/game-backend/.env 设置 DEEPSEEK_API_KEY 后重启后端"
    }
