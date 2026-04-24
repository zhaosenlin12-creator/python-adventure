import json
import logging
import re
import time
from typing import Dict, List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

USER_RATE_LIMIT: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 8


def check_rate_limit(user_id: str) -> bool:
    now = time.time()
    if user_id in USER_RATE_LIMIT:
        USER_RATE_LIMIT[user_id] = [stamp for stamp in USER_RATE_LIMIT[user_id] if now - stamp < RATE_LIMIT_WINDOW]
    else:
        USER_RATE_LIMIT[user_id] = []

    if len(USER_RATE_LIMIT[user_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return False

    USER_RATE_LIMIT[user_id].append(now)
    return True


def get_rate_limit_reset_time(user_id: str) -> int:
    if user_id not in USER_RATE_LIMIT or not USER_RATE_LIMIT[user_id]:
        return 0
    oldest = min(USER_RATE_LIMIT[user_id])
    return max(0, int(RATE_LIMIT_WINDOW - (time.time() - oldest)))


class LearningAssistantHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=400)


class LearningAssistantContext(BaseModel):
    levelId: str = Field(..., min_length=1, max_length=120)
    levelTitle: str = Field(..., min_length=1, max_length=120)
    chapterTitle: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=240)
    runtime: str = Field(..., min_length=1, max_length=32)
    editorLanguage: str = Field(..., min_length=1, max_length=32)
    validationMode: Literal["live-run", "pattern-check"]
    knowledgeHint: Optional[str] = Field(default=None, max_length=240)
    guideHints: List[str] = Field(default_factory=list)
    code: str = Field(..., min_length=1, max_length=4000)
    consoleOutput: List[str] = Field(default_factory=list)
    interfaceLanguage: Literal["cn", "en"] = "cn"


class LearningAssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=400)
    history: List[LearningAssistantHistoryItem] = Field(default_factory=list)
    context: LearningAssistantContext


class LearningAssistantResponse(BaseModel):
    success: bool
    reply: str
    suggestions: List[str] = Field(default_factory=list)
    mode: Literal["live", "fallback"] = "live"


class LearningAssistantStatusResponse(BaseModel):
    available: bool
    mode: Literal["live", "fallback"]
    message: Optional[str] = None


def build_system_prompt(language: str) -> str:
    response_language = "中文" if language == "cn" else "English"
    return (
        "你是乐启享编程游戏里的学习助手，要像有耐心的老师一样帮助学生。"
        "先帮学生理解思路，再考虑给答案。"
        "默认只给下一步、关键写法、或排错方向，不要直接把整题完整答案一次性端出来。"
        "如果学生明确要求完整答案，也只给最小可用片段，并解释为什么。"
        "语气简洁、友好、专业，适合中小学生阅读。"
        f"请使用{response_language}作答。"
        "输出必须是 JSON 对象，格式如下："
        '{"reply":"回答内容","suggestions":["建议1","建议2","建议3"]}'
    )


def build_user_prompt(request: LearningAssistantRequest, current_user: User) -> str:
    context = request.context
    history_lines = [
        f"{item.role}: {item.content.strip()}"
        for item in request.history[-6:]
        if item.content.strip()
    ]
    console_output = context.consoleOutput[-3:] if context.consoleOutput else []
    guide_hints = context.guideHints[:3]

    return "\n".join(
        [
            f"Student: {current_user.username or 'player'}",
            f"Level: {context.levelTitle}",
            f"Chapter: {context.chapterTitle}",
            f"Description: {context.description}",
            f"Runtime: {context.runtime}",
            f"Editor Language: {context.editorLanguage}",
            f"Validation Mode: {context.validationMode}",
            f"Knowledge Hint: {context.knowledgeHint or 'None'}",
            f"Code Clues: {json.dumps(guide_hints, ensure_ascii=False)}",
            f"Terminal Output: {json.dumps(console_output, ensure_ascii=False)}",
            "Current Code:",
            context.code[:2400],
            "Recent Conversation:",
            "\n".join(history_lines) if history_lines else "None",
            f"Student Question: {request.message}",
            "Answer in JSON. Keep it short, actionable, and hints-first.",
        ]
    )


def parse_ai_reply(content: str) -> dict:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    match = re.search(r"\{.*\}", content, re.S)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    return {"reply": content.strip()}


def build_local_fallback_response(request: LearningAssistantRequest) -> LearningAssistantResponse:
    context = request.context
    question = request.message.lower().strip()
    first_hint = context.guideHints[0] if context.guideHints else None
    last_output = context.consoleOutput[-1] if context.consoleOutput else None

    if context.interfaceLanguage == "en":
        if "error" in question and last_output:
            reply = f"Start from the last terminal line: {last_output}. Check the blank you changed most recently."
            suggestions = ["Explain the key idea again.", "Tell me the next step only."]
        elif "knowledge" in question or "idea" in question:
            reply = (
                f"This level focuses on: {context.knowledgeHint}. Understand that structure first, then fill the blanks."
                if context.knowledgeHint
                else "Figure out which code structure this level is training first, then fill the blanks."
            )
            suggestions = ["Show the syntax shape.", "Give me one next step."]
        else:
            reply = (
                f"Try this first: {first_hint}. Then run the level again and compare the output."
                if first_hint
                else "Fill the most important blank first, then run once and compare the terminal output."
            )
            suggestions = ["Explain the syntax shape.", "Help me read the output."]
    else:
        if "报错" in question and last_output:
            reply = f"先看终端最后一行：{last_output}。先检查你刚改过的那一处空白。"
            suggestions = ["帮我解释知识点。", "只给我下一步。"]
        elif "知识点" in question or "原理" in question:
            reply = (
                f"这关核心是：{context.knowledgeHint}。先把这个结构想明白，再去补空白。"
                if context.knowledgeHint
                else "先判断这关在练哪一种结构，再补空白，不要一上来就乱试。"
            )
            suggestions = ["帮我看关键写法。", "只告诉我下一步。"]
        else:
            reply = (
                f"你可以先做这一步：{first_hint}。做完先运行一次，再看终端变化。"
                if first_hint
                else "先补最关键的那一处空白，再运行一次，根据终端结果继续修。"
            )
            suggestions = ["帮我看关键写法。", "帮我解释终端输出。"]

    return LearningAssistantResponse(success=True, reply=reply, suggestions=suggestions, mode="fallback")


@router.post("/chat", response_model=LearningAssistantResponse)
async def learning_assistant_chat(
    request: LearningAssistantRequest,
    current_user: User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    if not check_rate_limit(user_id):
        reset_time = get_rate_limit_reset_time(user_id)
        raise HTTPException(status_code=429, detail=f"提问太快了，请等待 {reset_time} 秒后再试。")

    if not settings.DEEPSEEK_API_KEY:
        return build_local_fallback_response(request)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": build_system_prompt(request.context.interfaceLanguage)},
                        {"role": "user", "content": build_user_prompt(request, current_user)},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 900,
                },
            )

        if response.status_code != 200:
            logger.warning(
                "Learning assistant upstream failed with status %s: %s",
                response.status_code,
                response.text[:300],
            )
            return build_local_fallback_response(request)

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = parse_ai_reply(content)

        reply = str(parsed.get("reply") or "").strip()
        if not reply:
            return build_local_fallback_response(request)

        suggestions = parsed.get("suggestions")
        if not isinstance(suggestions, list):
            suggestions = []

        return LearningAssistantResponse(
            success=True,
            reply=reply[:800],
            suggestions=[str(item).strip() for item in suggestions if str(item).strip()][:3],
            mode="live",
        )
    except httpx.TimeoutException:
        logger.warning("Learning assistant request timed out for user %s", current_user.id)
        return build_local_fallback_response(request)
    except Exception:
        logger.exception("Learning assistant failed for user %s", current_user.id)
        return build_local_fallback_response(request)


@router.get("/status", response_model=LearningAssistantStatusResponse)
async def learning_assistant_status(
    current_user: User = Depends(get_current_user),
):
    del current_user

    if not settings.DEEPSEEK_API_KEY:
        return LearningAssistantStatusResponse(
            available=False,
            mode="fallback",
            message="当前使用备用提示模式。",
        )

    return LearningAssistantStatusResponse(
        available=True,
        mode="live",
        message="模型已连接。",
    )
