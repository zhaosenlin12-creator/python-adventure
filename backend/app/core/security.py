from datetime import datetime, timedelta
import threading
from typing import Optional, Set

import bcrypt as bcrypt_lib
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


_bcrypt_available = False
try:
    _test_hash = bcrypt_lib.hashpw(b"test", bcrypt_lib.gensalt())
    _bcrypt_available = bcrypt_lib.checkpw(b"test", _test_hash)
    if _bcrypt_available:
        print("[Security] bcrypt available")
except Exception as e:
    print(f"[Security] bcrypt unavailable: {type(e).__name__}")


pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
)
print("[Security] using pbkdf2_sha256 as default password hash")


_token_blacklist: Set[str] = set()
_blacklist_lock = threading.Lock()
_blacklist_expiry: dict[str, datetime] = {}


def add_token_to_blacklist(token: str, expiry_time: datetime | None = None) -> None:
    """Add a token to the in-memory blacklist."""
    with _blacklist_lock:
        _token_blacklist.add(token)
        if expiry_time:
            _blacklist_expiry[token] = expiry_time
        _cleanup_expired_tokens()


def is_token_blacklisted(token: str) -> bool:
    """Return whether the token has been blacklisted."""
    with _blacklist_lock:
        return token in _token_blacklist


def _cleanup_expired_tokens() -> None:
    """Remove expired blacklist entries while holding the lock."""
    now = datetime.utcnow()
    expired_tokens = [token for token, expiry in _blacklist_expiry.items() if expiry < now]
    for token in expired_tokens:
        _token_blacklist.discard(token)
        del _blacklist_expiry[token]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify either legacy bcrypt hashes or the current pbkdf2_sha256 hashes.
    """
    try:
        if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
            if not _bcrypt_available:
                print("[Security] bcrypt hash detected but bcrypt library is unavailable")
                return False
            try:
                return bcrypt_lib.checkpw(
                    plain_password.encode("utf-8"),
                    hashed_password.encode("utf-8"),
                )
            except Exception as e:
                print(f"[Security] bcrypt verification error: {e}")
                return False

        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"[Security] password verification error: {e}")
        return False


def needs_password_rehash(hashed_password: str) -> bool:
    """Return whether the password should be migrated to the current scheme."""
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        return True
    return pwd_context.needs_update(hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using the current scheme."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode a JWT access token, rejecting blacklisted tokens."""
    if is_token_blacklisted(token):
        print("[JWT] token rejected because it is blacklisted")
        return None

    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        print(f"[JWT] decode failed: {type(e).__name__}: {e}")
        return None
