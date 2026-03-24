from sqlalchemy.orm import Session
from app.models.user import User
from typing import Dict, Any

class RewardService:
    """奖励发放服务"""
    
    @staticmethod
    def grant_rewards(
        db: Session,
        user: User,
        rewards: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        发放奖励给用户
        
        Args:
            db: 数据库会话
            user: 用户对象
            rewards: 奖励配置
        
        Returns:
            发放结果
        """
        granted = {}
        leveled_up = False
        old_level = user.level
        
        # 经验值奖励
        if "experience" in rewards:
            exp = rewards["experience"]
            leveled_up = user.add_experience(exp)
            granted["experience"] = exp
            
            if leveled_up:
                granted["level_up"] = True
                granted["new_level"] = user.level
                granted["old_level"] = old_level
        
        # 金币奖励（暂未实现金币系统）
        if "coins" in rewards:
            granted["coins"] = rewards["coins"]
        
        # 提交更改到数据库
        db.commit()
        
        return {
            "granted": granted,
            "leveled_up": leveled_up,
            "current_level": user.level,
            "current_experience": user.experience
        }

reward_service = RewardService()









