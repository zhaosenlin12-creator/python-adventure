from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, Token, TokenWithUser, UserResponse
from app.api.dependencies import oauth2_scheme

router = APIRouter()

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
        access_token = create_access_token(data={"sub": str(user.id)})
        
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
        # 🔥 捕获数据库错误，返回友好提示
        print(f"[Auth] 登录错误: {e}")
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

