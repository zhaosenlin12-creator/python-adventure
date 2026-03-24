from datetime import datetime, timedelta
from typing import Optional, Set
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
import threading

# 🔧 优化：支持多种密码哈希算法，包括bcrypt和pbkdf2_sha256
# 这解决了某些Python版本（如3.14）的bcrypt兼容性问题
# 同时支持验证旧的bcrypt密码哈希

import hashlib
import bcrypt as bcrypt_lib

_bcrypt_available = False
try:
    # 测试直接使用bcrypt库
    _test_hash = bcrypt_lib.hashpw(b"test", bcrypt_lib.gensalt())
    _bcrypt_available = bcrypt_lib.checkpw(b"test", _test_hash)
    if _bcrypt_available:
        print("[Security] ✅ bcrypt库可用")
except Exception as e:
    print(f"[Security] ⚠️ bcrypt库不可用: {type(e).__name__}")

# 使用pbkdf2_sha256作为默认新密码哈希算法
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    default="pbkdf2_sha256"
)
print("[Security] 使用pbkdf2_sha256作为新密码哈希算法")

# 🔒 安全：Token黑名单（内存实现，生产环境建议使用Redis）
_token_blacklist: Set[str] = set()
_blacklist_lock = threading.Lock()
_blacklist_expiry: dict = {}  # {token: expiry_time}


def add_token_to_blacklist(token: str, expiry_time: datetime = None):
    """
    将Token加入黑名单
    🔒 安全：登出时调用，使Token失效
    """
    with _blacklist_lock:
        _token_blacklist.add(token)
        if expiry_time:
            _blacklist_expiry[token] = expiry_time
        # 清理过期的黑名单条目（避免内存泄漏）
        _cleanup_expired_tokens()


def is_token_blacklisted(token: str) -> bool:
    """检查Token是否在黑名单中"""
    with _blacklist_lock:
        return token in _token_blacklist


def _cleanup_expired_tokens():
    """清理过期的黑名单Token（内部调用，已持有锁）"""
    now = datetime.utcnow()
    expired = [t for t, exp in _blacklist_expiry.items() if exp < now]
    for t in expired:
        _token_blacklist.discard(t)
        del _blacklist_expiry[t]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码
    🔧 优化：支持bcrypt和pbkdf2_sha256两种哈希格式
    """
    try:
        # 先检测是否是bcrypt哈希（以$2b$或$2a$开头）
        if hashed_password.startswith(('$2b$', '$2a$', '$2y$')):
            # 使用bcrypt库直接验证
            if _bcrypt_available:
                try:
                    result = bcrypt_lib.checkpw(
                        plain_password.encode('utf-8'), 
                        hashed_password.encode('utf-8')
                    )
                    return result
                except Exception as e:
                    print(f"[Security] bcrypt验证异常: {e}")
                    return False
            else:
                print("[Security] ⚠️ 密码是bcrypt格式但bcrypt库不可用")
                return False
        else:
            # 使用passlib验证pbkdf2_sha256等其他格式
            return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"[Security] 密码验证异常: {e}")
        return False


def needs_password_rehash(hashed_password: str) -> bool:
    """
    检查密码是否需要重新哈希（使用旧算法）
    🔧 用于登录时自动升级密码哈希
    """
    return pwd_context.needs_update(hashed_password)

def get_password_hash(password: str) -> str:
    """哈希密码"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建JWT访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """
    解码JWT令牌
    🔒 安全：检查Token是否在黑名单中
    """
    # 🔒 先检查黑名单
    if is_token_blacklisted(token):
        print(f"❌ [JWT] Token已被撤销（在黑名单中）")
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        print(f"❌ [JWT] 解析失败: {type(e).__name__}: {str(e)}")
        return None

