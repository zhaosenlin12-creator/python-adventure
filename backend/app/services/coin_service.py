"""
金币服务
处理金币的发放、消费和查询
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.user import User
from app.models.coin import CoinTransaction
from typing import Optional, List
from datetime import datetime

class CoinService:
    """金币服务类"""
    
    @staticmethod
    def add_coins(
        db: Session,
        user_id: int,
        amount: int,
        type: str,
        source: str,
        description: Optional[str] = None,
        transaction_id: Optional[str] = None
    ) -> bool:
        """
        添加金币
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            amount: 金币数量(正数为获得,负数为消费)
            type: 交易类型(reward, purchase, workshop_earning)
            source: 来源(level_complete, arena_win, etc.)
            description: 描述信息
            transaction_id: 唯一交易ID(可选,用于防重复)
            
        Returns:
            bool: 是否成功
        """
        import logging
        from sqlalchemy import update as sa_update
        logger = logging.getLogger(__name__)
        
        try:
            # 如果提供了transaction_id,检查是否已存在
            if transaction_id:
                existing = db.query(CoinTransaction).filter(
                    CoinTransaction.transaction_id == transaction_id
                ).first()
                
                if existing:
                    logger.info(f"交易ID {transaction_id} 已存在,防止重复发放")
                    return False  # 已发放过,防止重复
            
            if amount < 0:
                # 🔒 原子扣减：UPDATE ... WHERE coins >= abs(amount)
                # 避免 TOCTOU 竞态条件，保证余额检查与扣减在同一条SQL中完成
                result = db.execute(
                    sa_update(User)
                    .where(User.id == user_id)
                    .where(User.coins >= abs(amount))
                    .values(coins=User.coins + amount)
                )
                if result.rowcount == 0:
                    return False  # 余额不足或用户不存在
            else:
                # 充值/奖励：直接加
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    return False
                user.coins += amount
            
            # 创建交易记录
            transaction = CoinTransaction(
                user_id=user_id,
                amount=amount,
                type=type,
                source=source,
                description=description,
                transaction_id=transaction_id
            )
            db.add(transaction)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"添加金币失败: {e}")
            return False
    
    @staticmethod
    def get_balance(db: Session, user_id: int) -> int:
        """
        获取金币余额
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            int: 金币余额
        """
        user = db.query(User).filter(User.id == user_id).first()
        return user.coins if user else 0
    
    @staticmethod
    def get_transaction_history(
        db: Session,
        user_id: int,
        limit: int = 50
    ) -> List[CoinTransaction]:
        """
        获取交易历史
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            limit: 返回数量限制
            
        Returns:
            List[CoinTransaction]: 交易记录列表
        """
        return db.query(CoinTransaction)\
            .filter(CoinTransaction.user_id == user_id)\
            .order_by(desc(CoinTransaction.created_at))\
            .limit(limit)\
            .all()


class CoinRewardCalculator:
    """金币奖励计算器"""
    
    @staticmethod
    def calculate_level_reward(
        difficulty: int,
        quality_score: float = 0,
        time_ratio: float = 0
    ) -> int:
        """
        计算关卡完成金币奖励
        
        公式:
        基础金币 = 难度系数 × 10
        质量加成 = 代码质量分数 × 0.5
        时间加成 = (标准时间 - 实际时间) / 标准时间 × 5 (最高5金币)
        总金币 = 基础金币 + 质量加成 + 时间加成
        
        Args:
            difficulty: 关卡难度(1-10)
            quality_score: 代码质量分数(0-100)
            time_ratio: 时间比率((标准时间-实际时间)/标准时间, -1到1)
            
        Returns:
            int: 金币数量
        """
        # 基础金币
        base_coins = difficulty * 10
        
        # 质量加成
        quality_bonus = int(quality_score * 0.5)
        
        # 时间加成(最高5金币)
        time_bonus = max(0, min(5, int(time_ratio * 5)))
        
        total = base_coins + quality_bonus + time_bonus
        return max(5, total)  # 最少5金币
    
    @staticmethod
    def calculate_campaign_reward(
        difficulty: int,
        performance_score: float = 0
    ) -> int:
        """
        计算战役模式金币奖励
        
        公式:
        基础金币 = 战役难度 × 15
        表现加成 = 战役评分 × 0.3
        总金币 = 基础金币 + 表现加成
        
        Args:
            difficulty: 战役难度(1-10)
            performance_score: 表现评分(0-100)
            
        Returns:
            int: 金币数量
        """
        base_coins = difficulty * 15
        performance_bonus = int(performance_score * 0.3)
        
        total = base_coins + performance_bonus
        return max(10, total)  # 最少10金币
    
    @staticmethod
    def calculate_arena_reward(
        is_win: bool,
        challenge_score: int,
        time_used: int | None = None
    ) -> int:
        """
        计算竞技场金币奖励（小额、可控）
        
        公式:
        基础金币 = 胜利 6 / 失败 3
        分数加成 = min(18, challenge_score // 25)
        时间加成 = <=20s +4, <=40s +2, <=60s +1
        总金币范围：4 - 30
        
        Args:
            is_win: 是否胜利
            challenge_score: 本次挑战得分
            time_used: 用时（秒）
            
        Returns:
            int: 金币数量
        """
        base = 6 if is_win else 3
        score_bonus = max(0, min(18, challenge_score // 25))
        time_bonus = 0
        if time_used is not None:
            if time_used <= 20:
                time_bonus = 4
            elif time_used <= 40:
                time_bonus = 2
            elif time_used <= 60:
                time_bonus = 1
        total = base + score_bonus + time_bonus
        return max(4, min(30, int(total)))
    
    @staticmethod
    def calculate_pvp_reward(
        is_win: bool,
        exp_gained: int,
        score_gained: int = 0,
        win_streak: int = 0
    ) -> int:
        """
        计算PVP对战金币奖励
        
        公式:
        胜利金币 = 15 + 获得经验 × 0.2 + 获得积分 × 0.1
        失败金币 = 5 + 获得经验 × 0.1
        连胜加成 = 连胜次数 × 2 (最高10金币)
        
        Args:
            is_win: 是否胜利
            exp_gained: 获得的经验
            score_gained: 获得的积分
            win_streak: 连胜次数
            
        Returns:
            int: 金币数量
        """
        if is_win:
            base = 15
            exp_bonus = int(exp_gained * 0.2)
            score_bonus = int(score_gained * 0.1)
            streak_bonus = min(10, win_streak * 2)  # 最高10金币
            return base + exp_bonus + score_bonus + streak_bonus
        else:
            base = 5
            exp_bonus = int(exp_gained * 0.1)
            return base + exp_bonus
