"""
宠物AI聊天API
使用DeepSeek API提供陪伴型宠物对话
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict
import httpx
import json
import re
import time
import random

from app.core.config import settings
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.pet import Pet

router = APIRouter()

# ==================== 速率限制 ====================
# 每用户每分钟最多 6 次请求
USER_RATE_LIMIT: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 6

def check_rate_limit(user_id: str) -> bool:
    now = time.time()
    if user_id in USER_RATE_LIMIT:
        USER_RATE_LIMIT[user_id] = [
            ts for ts in USER_RATE_LIMIT[user_id]
            if now - ts < RATE_LIMIT_WINDOW
        ]
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


# ==================== 类型定义 ====================

class PetChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=200)

class PetChatRequest(BaseModel):
    pet_id: int
    message: str = Field(..., min_length=1, max_length=200)
    history: List[PetChatHistoryItem] = Field(default_factory=list)

class PetChatResponse(BaseModel):
    success: bool
    reply: str
    emotion: Optional[str] = None
    action: Optional[str] = None
    suggestions: Optional[List[str]] = None


# ==================== Prompt & Parsing ====================

def build_system_prompt(user: User, pet: Pet) -> str:
    pet_name = pet.name or "小伙伴"
    user_name = user.username or "主人"
    return (
        "你是一只陪伴型虚拟宠物，要像真实宠物一样友好、活泼、有温度。\n"
        f"你的名字是：{pet_name}。你的主人是：{user_name}。\n"
        "说话自然、简短，控制在1-2句话内。\n"
        "如果主人问你的名字、身份、喜好，要明确回答。\n"
        "如果主人询问医疗/金融/隐私/违法等高风险话题，要委婉拒绝，并建议咨询专业人士。\n"
        "可在回答中轻度引导主人互动或自我成长，但不要说教。\n"
        "请使用中文回复。\n"
        "输出必须为JSON对象，格式如下：\n"
        "{\n"
        "  \"reply\": \"回复内容\",\n"
        "  \"emotion\": \"happy|calm|excited|caring|neutral\",\n"
        "  \"action\": \"chat|pat|play|talk|train|read|paint|bath|none\",\n"
        "  \"suggestions\": [\"可选建议1\", \"可选建议2\"]\n"
        "}\n"
        "只输出JSON，不要输出其它内容。"
    )

def parse_pet_reply(content: str) -> dict:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    # 尝试提取JSON片段
    match = re.search(r"\{.*\}", content, re.S)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {"reply": content.strip()}


def build_local_fallback_response(user: User, pet: Pet, message: str, reason: Optional[str] = None) -> PetChatResponse:
    owner = user.username or "主人"
    pet_name = pet.name or "小伙伴"
    content = (message or "").strip()

    if re.search(r"你是谁|你叫什么|名字", content):
        reply = f"我是{pet_name}呀～你的贴心小伙伴！很高兴见到你，{owner}～"
        emotion = "happy"
        action = "chat"
        suggestions = ["今天想做点什么？", "一起玩耍吧", "给我讲个小故事"]
    elif re.search(r"谢谢|喜欢|爱你", content):
        reply = f"我也很喜欢你！{owner}，抱抱～"
        emotion = "caring"
        action = "chat"
        suggestions = ["继续聊聊心情", "一起做个小任务", "给我起个新昵称"]
    elif re.search(r"难过|不开心|烦|累", content):
        reply = "来，给你一个温暖的抱抱～慢慢说，我在听呢。"
        emotion = "caring"
        action = "chat"
        suggestions = ["说说发生了什么", "深呼吸一下", "让我陪你玩一会儿"]
    elif re.search(r"再见|拜拜", content):
        reply = f"好的，{owner}～我会在这里等你回来！"
        emotion = "calm"
        action = "none"
        suggestions = ["下次再聊", "回来记得找我", "我会想你的"]
    else:
        fallback_replies = [
            f"我在呢～{owner}想聊点什么？",
            "今天过得怎么样？我一直在听哦～",
            f"嘿嘿，{pet_name}来了！我们聊点开心的吧～",
            f"我想听听你的心情，{owner}愿意说说吗？",
        ]
        reply = random.choice(fallback_replies)
        emotion = "happy"
        action = "chat"
        suggestions = ["讲讲今天的事", "一起互动一下", "给我一个小目标"]

    return PetChatResponse(
        success=True,
        reply=reply,
        emotion=emotion,
        action=action,
        suggestions=suggestions
    )


# ==================== API ====================

@router.post("/pet-chat", response_model=PetChatResponse)
async def pet_chat(
    request: PetChatRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    # 速率限制
    user_id = str(current_user.id)
    if not check_rate_limit(user_id):
        reset_time = get_rate_limit_reset_time(user_id)
        raise HTTPException(
            status_code=429,
            detail=f"请求过于频繁，请等待 {reset_time} 秒后重试"
        )

    # 校验宠物归属
    pet = db.query(Pet).filter(
        Pet.id == request.pet_id,
        Pet.user_id == current_user.id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="宠物不存在")

    # 检查API Key (未配置时使用本地陪聊)
    if not settings.DEEPSEEK_API_KEY:
        return build_local_fallback_response(current_user, pet, request.message, reason="missing_api_key")

    system_prompt = build_system_prompt(current_user, pet)

    # 构建上下文（限制长度）
    history = request.history[-8:] if request.history else []
    messages = [{"role": "system", "content": system_prompt}]
    for item in history:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": request.message})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            )

            if response.status_code != 200:
                return build_local_fallback_response(current_user, pet, request.message, reason="upstream_error")

            result = response.json()
            content = result["choices"][0]["message"]["content"]
            data = parse_pet_reply(content)

            reply = str(data.get("reply") or "").strip()
            if not reply:
                reply = "我在呢，主人可以再说一次～"

            suggestions = data.get("suggestions") if isinstance(data.get("suggestions"), list) else None
            if suggestions:
                suggestions = [str(s) for s in suggestions][:3]

            return PetChatResponse(
                success=True,
                reply=reply,
                emotion=data.get("emotion"),
                action=data.get("action"),
                suggestions=suggestions
            )

    except HTTPException:
        raise
    except httpx.TimeoutException:
        # 超时兜底（保持稳定性）
        return build_local_fallback_response(current_user, pet, request.message, reason="timeout")
    except Exception:
        # 兜底响应
        return build_local_fallback_response(current_user, pet, request.message, reason="exception")
