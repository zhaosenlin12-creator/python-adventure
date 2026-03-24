"""
🔧 缓存服务 - Redis缓存层（带内存降级）
支持热点数据缓存，减少数据库查询压力

特性：
- 有Redis时使用Redis缓存
- 无Redis时自动降级到内存缓存
- 支持TTL过期
- 线程安全
"""
from typing import Optional, Any, Dict
from datetime import datetime, timedelta
import json
import threading

from app.core.config import settings

# Redis客户端（可选）
_redis_client = None
_redis_available = False

# 内存缓存（降级方案）
_memory_cache: Dict[str, tuple] = {}  # {key: (value, expire_time)}
_cache_lock = threading.Lock()

# 缓存配置
CACHE_TTL_USER = 300  # 用户信息缓存5分钟
CACHE_TTL_LEADERBOARD = 60  # 排行榜缓存1分钟
CACHE_TTL_SHORT = 30  # 短期缓存30秒


def init_redis():
    """
    初始化Redis连接
    如果Redis不可用，自动降级到内存缓存
    """
    global _redis_client, _redis_available
    
    try:
        import redis
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        # 测试连接
        _redis_client.ping()
        _redis_available = True
        print("[Cache] ✅ Redis连接成功")
    except Exception as e:
        _redis_available = False
        _redis_client = None
        print(f"[Cache] ⚠️ Redis不可用，降级到内存缓存: {e}")


def _cleanup_memory_cache():
    """清理过期的内存缓存（内部调用，已持有锁）"""
    now = datetime.utcnow()
    expired = [k for k, (_, exp) in _memory_cache.items() if exp and exp < now]
    for k in expired:
        del _memory_cache[k]


def cache_get(key: str) -> Optional[Any]:
    """
    获取缓存值
    
    Args:
        key: 缓存键
        
    Returns:
        缓存值，不存在或过期返回None
    """
    if _redis_available and _redis_client:
        try:
            value = _redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"[Cache] Redis读取失败: {e}")
            # 降级到内存缓存
    
    # 内存缓存
    with _cache_lock:
        _cleanup_memory_cache()
        if key in _memory_cache:
            value, expire_time = _memory_cache[key]
            if expire_time is None or expire_time > datetime.utcnow():
                return value
            else:
                del _memory_cache[key]
        return None


def cache_set(key: str, value: Any, ttl: int = CACHE_TTL_SHORT) -> bool:
    """
    设置缓存值
    
    Args:
        key: 缓存键
        value: 缓存值（会被JSON序列化）
        ttl: 过期时间（秒）
        
    Returns:
        是否成功
    """
    if _redis_available and _redis_client:
        try:
            _redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False, default=str))
            return True
        except Exception as e:
            print(f"[Cache] Redis写入失败: {e}")
            # 降级到内存缓存
    
    # 内存缓存
    with _cache_lock:
        _cleanup_memory_cache()
        expire_time = datetime.utcnow() + timedelta(seconds=ttl) if ttl > 0 else None
        _memory_cache[key] = (value, expire_time)
        return True


def cache_delete(key: str) -> bool:
    """
    删除缓存
    
    Args:
        key: 缓存键
        
    Returns:
        是否成功
    """
    if _redis_available and _redis_client:
        try:
            _redis_client.delete(key)
        except Exception as e:
            print(f"[Cache] Redis删除失败: {e}")
    
    # 同时清理内存缓存
    with _cache_lock:
        if key in _memory_cache:
            del _memory_cache[key]
    
    return True


def cache_delete_pattern(pattern: str) -> int:
    """
    按模式删除缓存（如 user:* 删除所有用户缓存）
    
    Args:
        pattern: 键模式（支持*通配符）
        
    Returns:
        删除的键数量
    """
    count = 0
    
    if _redis_available and _redis_client:
        try:
            keys = _redis_client.keys(pattern)
            if keys:
                count = _redis_client.delete(*keys)
        except Exception as e:
            print(f"[Cache] Redis批量删除失败: {e}")
    
    # 同时清理内存缓存
    with _cache_lock:
        import fnmatch
        to_delete = [k for k in _memory_cache.keys() if fnmatch.fnmatch(k, pattern)]
        for k in to_delete:
            del _memory_cache[k]
            count += 1
    
    return count


# ==================== 便捷缓存函数 ====================

def cache_user(user_id: int, user_data: dict) -> bool:
    """缓存用户信息"""
    return cache_set(f"user:{user_id}", user_data, CACHE_TTL_USER)


def get_cached_user(user_id: int) -> Optional[dict]:
    """获取缓存的用户信息"""
    return cache_get(f"user:{user_id}")


def invalidate_user_cache(user_id: int) -> bool:
    """使用户缓存失效"""
    return cache_delete(f"user:{user_id}")


def cache_leaderboard(board_type: str, data: list) -> bool:
    """缓存排行榜"""
    return cache_set(f"leaderboard:{board_type}", data, CACHE_TTL_LEADERBOARD)


def get_cached_leaderboard(board_type: str) -> Optional[list]:
    """获取缓存的排行榜"""
    return cache_get(f"leaderboard:{board_type}")


def invalidate_leaderboard_cache(board_type: str = None) -> int:
    """使排行榜缓存失效"""
    if board_type:
        cache_delete(f"leaderboard:{board_type}")
        return 1
    return cache_delete_pattern("leaderboard:*")


# 启动时初始化Redis
init_redis()
