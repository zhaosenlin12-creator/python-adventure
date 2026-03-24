"""
交易ID生成工具
用于生成唯一的交易ID,防止重复发放金币
"""
import hashlib
from datetime import datetime, timezone
from typing import Optional

def generate_transaction_id(
    user_id: int,
    source: str,
    reference_id: Optional[str] = None,
    timestamp: Optional[datetime] = None
) -> str:
    """
    生成唯一的交易ID
    
    格式: {source}_{user_id}_{reference_id}_{timestamp_hash}
    
    Args:
        user_id: 用户ID
        source: 来源(level_complete, arena_win, etc.)
        reference_id: 参考ID(如关卡ID、战役ID等)
        timestamp: 时间戳(可选,默认当前时间)
        
    Returns:
        str: 唯一交易ID
        
    Examples:
        >>> generate_transaction_id(1, "level_complete", "level_1_1")
        'level_complete_1_level_1_1_a3f5b2c1'
        
        >>> generate_transaction_id(2, "arena_win", "match_12345")
        'arena_win_2_match_12345_d8e9f1a2'
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    
    # 构建基础字符串
    base_str = f"{source}_{user_id}"
    
    if reference_id:
        base_str += f"_{reference_id}"
    
    # 添加时间戳哈希(取前8位)
    timestamp_str = timestamp.isoformat()
    hash_obj = hashlib.sha256(timestamp_str.encode())
    timestamp_hash = hash_obj.hexdigest()[:8]
    
    transaction_id = f"{base_str}_{timestamp_hash}"
    
    return transaction_id


def generate_level_transaction_id(user_id: int, level_id: str) -> str:
    """
    生成关卡完成的交易ID
    
    Args:
        user_id: 用户ID
        level_id: 关卡ID
        
    Returns:
        str: 交易ID
    """
    return generate_transaction_id(user_id, "level_complete", level_id)


def generate_campaign_transaction_id(user_id: int, campaign_id: str) -> str:
    """
    生成战役完成的交易ID
    
    Args:
        user_id: 用户ID
        campaign_id: 战役ID
        
    Returns:
        str: 交易ID
    """
    return generate_transaction_id(user_id, "campaign_complete", campaign_id)


def generate_arena_transaction_id(
    user_id: int,
    match_id: str,
    score: int | None = None,
    time_used: int | None = None,
    code_length: int | None = None
) -> str:
    """
    生成竞技场的交易ID
    
    Args:
        user_id: 用户ID
        match_id: 比赛ID
        
    Returns:
        str: 交易ID
    """
    # 使用稳定ID，防止同一次提交重复发放
    base = f"arena_match_{user_id}_{match_id}"
    if score is not None:
        base += f"_{score}"
    if time_used is not None:
        base += f"_{time_used}"
    if code_length is not None:
        base += f"_{code_length}"
    return base


def generate_pvp_transaction_id(user_id: int, match_id: str) -> str:
    """
    生成PVP对战的交易ID
    
    Args:
        user_id: 用户ID
        match_id: 比赛ID
        
    Returns:
        str: 交易ID
    """
    return generate_transaction_id(user_id, "pvp_match", match_id)


def generate_workshop_transaction_id(creator_id: int, level_id: str, date: str) -> str:
    """
    生成工坊收益的交易ID
    
    Args:
        creator_id: 创作者ID
        level_id: 关卡ID
        date: 日期(YYYY-MM-DD)
        
    Returns:
        str: 交易ID
    """
    reference_id = f"{level_id}_{date}"
    return generate_transaction_id(creator_id, "workshop_earning", reference_id)
