import logging
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    build_password_token_version,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import (
    PasswordResetRequest,
    PasswordResetResponse,
    Token,
    TokenWithUser,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.api.dependencies import oauth2_scheme

router = APIRouter()
logger = logging.getLogger(__name__)

DEFAULT_RESET_PASSWORD = "123456"
PASSWORD_RESET_COOLDOWN_SECONDS = 30
_password_reset_cooldowns: dict[str, float] = {}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被注册"
        )
    
    # 检查邮箱是否已存在
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 创建新用户
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 🥚 创建宠物蛋（而非直接给宠物）
    from app.models.pet import Pet
    pet_egg = Pet(
        user_id=new_user.id,
        pet_type='egg',  # 蛋状态，尚未选择类型
        pet_style='unknown',  # 尚未选择风格
        name='神秘的蛋',
        level=1,
        exp=0,
        hp=100,
        intelligence=0,
        creativity=0,
        persistence=0,
        code_quality=0,
        creator_value=0,
        battle_power=0,
        status='egg',  # 蛋状态
        is_egg=1,  # 标记为蛋
        hatch_progress=0,  # 孵化进度为0
        intimacy=0,
        evolution_stage=0
    )
    
    db.add(pet_egg)
    db.commit()
    
    # 返回用户信息（包含段位称号）
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        level=new_user.level,
        experience=new_user.experience,
        rank_title=new_user.get_rank_title(),
        created_at=new_user.created_at
    )

@router.post("/login", response_model=TokenWithUser)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    try:
        # 🔥 使用索引查询优化
        user = db.query(User).filter(User.username == user_data.username).first()
        
        # 验证用户名和密码
        if not user or not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 创建访问令牌（sub 必须是字符串）
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "pwdv": build_password_token_version(user.password_hash),
            }
        )
        
        # 🔥 缓存用户信息，减少数据库查询
        user_response = UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            level=user.level,
            experience=user.experience,
            rank_title=user.get_rank_title(),
            created_at=user.created_at
        )
        
        return TokenWithUser(
            access_token=access_token,
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="服务器繁忙，请稍后重试"
        )

@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """用户登出 — 将Token加入黑名单使其立即失效"""
    from app.core.security import add_token_to_blacklist, decode_access_token
    from datetime import datetime

    payload = decode_access_token(token)
    expiry = None
    if payload and "exp" in payload:
        try:
            expiry = datetime.utcfromtimestamp(payload["exp"])
        except (ValueError, OSError):
            pass

    add_token_to_blacklist(token, expiry)
    return {"message": "登出成功"}


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """按用户名将密码重置为学生默认密码。"""
    normalized_username = payload.username.strip()
    cooldown_key = normalized_username.lower()
    now = time.monotonic()

    expired_keys = [
        key
        for key, last_reset in _password_reset_cooldowns.items()
        if now - last_reset >= PASSWORD_RESET_COOLDOWN_SECONDS
    ]
    for key in expired_keys:
        _password_reset_cooldowns.pop(key, None)

    last_reset = _password_reset_cooldowns.get(cooldown_key)
    if last_reset is not None and now - last_reset < PASSWORD_RESET_COOLDOWN_SECONDS:
        wait_seconds = max(1, int(PASSWORD_RESET_COOLDOWN_SECONDS - (now - last_reset)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"刚刚已经重置过一次，请 {wait_seconds} 秒后再试",
        )

    user = db.query(User).filter(User.username == normalized_username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到这个用户名，请检查后重试",
        )

    user.password_hash = get_password_hash(DEFAULT_RESET_PASSWORD)
    db.add(user)
    db.commit()

    _password_reset_cooldowns[cooldown_key] = now

    return PasswordResetResponse(
        message="密码已重置为 123456，请登录后尽快修改。",
        default_password=DEFAULT_RESET_PASSWORD,
    )

