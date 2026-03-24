"""
Cache helpers with Redis support and an in-memory fallback.
"""

from datetime import datetime, timedelta
import fnmatch
import json
import threading
from typing import Any, Optional

from app.core.config import settings


_redis_client = None
_redis_available = False

_memory_cache: dict[str, tuple[Any, datetime | None]] = {}
_cache_lock = threading.Lock()

CACHE_TTL_USER = 300
CACHE_TTL_LEADERBOARD = 60
CACHE_TTL_SHORT = 30


def init_redis() -> None:
    """
    Initialize the Redis client.
    If Redis is unavailable, automatically fall back to in-memory cache.
    """
    global _redis_client, _redis_available

    try:
        import redis

        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        _redis_client.ping()
        _redis_available = True
        print("[Cache] redis connected")
    except Exception as e:
        _redis_available = False
        _redis_client = None
        print(f"[Cache] redis unavailable, falling back to memory cache: {e}")


def _cleanup_memory_cache() -> None:
    """Remove expired entries while holding the cache lock."""
    now = datetime.utcnow()
    expired_keys = [key for key, (_, expiry) in _memory_cache.items() if expiry and expiry < now]
    for key in expired_keys:
        del _memory_cache[key]


def cache_get(key: str) -> Optional[Any]:
    """Get a cached value, returning None when missing or expired."""
    if _redis_available and _redis_client:
        try:
            value = _redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"[Cache] redis read failed: {e}")

    with _cache_lock:
        _cleanup_memory_cache()
        if key not in _memory_cache:
            return None

        value, expiry = _memory_cache[key]
        if expiry is None or expiry > datetime.utcnow():
            return value

        del _memory_cache[key]
        return None


def cache_set(key: str, value: Any, ttl: int = CACHE_TTL_SHORT) -> bool:
    """Set a cached value using Redis or the in-memory fallback."""
    if _redis_available and _redis_client:
        try:
            _redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False, default=str))
            return True
        except Exception as e:
            print(f"[Cache] redis write failed: {e}")

    with _cache_lock:
        _cleanup_memory_cache()
        expiry = datetime.utcnow() + timedelta(seconds=ttl) if ttl > 0 else None
        _memory_cache[key] = (value, expiry)
        return True


def cache_delete(key: str) -> bool:
    """Delete a cache key from both Redis and the fallback store."""
    if _redis_available and _redis_client:
        try:
            _redis_client.delete(key)
        except Exception as e:
            print(f"[Cache] redis delete failed: {e}")

    with _cache_lock:
        _memory_cache.pop(key, None)

    return True


def cache_delete_pattern(pattern: str) -> int:
    """Delete cache keys that match a wildcard pattern."""
    deleted_count = 0

    if _redis_available and _redis_client:
        try:
            keys = _redis_client.keys(pattern)
            if keys:
                deleted_count = _redis_client.delete(*keys)
        except Exception as e:
            print(f"[Cache] redis bulk delete failed: {e}")

    with _cache_lock:
        matching_keys = [key for key in _memory_cache.keys() if fnmatch.fnmatch(key, pattern)]
        for key in matching_keys:
            del _memory_cache[key]
            deleted_count += 1

    return deleted_count


def cache_user(user_id: int, user_data: dict) -> bool:
    """Cache user data."""
    return cache_set(f"user:{user_id}", user_data, CACHE_TTL_USER)


def get_cached_user(user_id: int) -> Optional[dict]:
    """Read cached user data."""
    return cache_get(f"user:{user_id}")


def invalidate_user_cache(user_id: int) -> bool:
    """Invalidate cached user data."""
    return cache_delete(f"user:{user_id}")


def cache_leaderboard(board_type: str, data: list) -> bool:
    """Cache leaderboard data."""
    return cache_set(f"leaderboard:{board_type}", data, CACHE_TTL_LEADERBOARD)


def get_cached_leaderboard(board_type: str) -> Optional[list]:
    """Read cached leaderboard data."""
    return cache_get(f"leaderboard:{board_type}")


def invalidate_leaderboard_cache(board_type: str | None = None) -> int:
    """Invalidate leaderboard cache for one board or all boards."""
    if board_type:
        cache_delete(f"leaderboard:{board_type}")
        return 1
    return cache_delete_pattern("leaderboard:*")


init_redis()
