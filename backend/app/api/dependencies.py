from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import build_password_token_version, decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # 确保 user_id 是整数类型
    if isinstance(user_id, str):
        try:
            user_id = int(user_id)
        except ValueError:
            raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    token_password_version = payload.get("pwdv")
    if token_password_version != build_password_token_version(user.password_hash):
        raise credentials_exception
    
    return user



async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """获取当前登录用户（可选，未登录返回None）"""
    if token is None:
        return None
    
    payload = decode_access_token(token)
    if payload is None:
        return None
    
    user_id = payload.get("sub")
    if user_id is None:
        return None
    
    # 确保 user_id 是整数类型
    if isinstance(user_id, str):
        try:
            user_id = int(user_id)
        except ValueError:
            return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None

    token_password_version = payload.get("pwdv")
    if token_password_version != build_password_token_version(user.password_hash):
        return None

    return user
