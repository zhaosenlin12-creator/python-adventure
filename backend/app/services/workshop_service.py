"""
创意工坊收益服务
处理创意工坊关卡的金币奖励逻辑
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.coin import WorkshopEarning, CoinTransaction
from app.models.user import User
from app.services.coin_service import CoinService
from app.utils.transaction_id import generate_workshop_transaction_id


class WorkshopEarningsService:
    """创意工坊收益服务"""
    
    # 奖励规则
    PLAY_REWARD = 5  # 每次游玩奖励
    LIKE_REWARD = 20  # 每次点赞奖励
    DAILY_LIMIT = 500  # 每日每关卡上限
    
    @staticmethod
    def get_or_create_earning(db: Session, level_id: str, creator_id: int) -> WorkshopEarning:
        """
        获取或创建工坊收益记录
        
        Args:
            db: 数据库会话
            level_id: 关卡ID
            creator_id: 创作者ID
            
        Returns:
            WorkshopEarning: 收益记录
        """
        earning = db.query(WorkshopEarning).filter(
            and_(
                WorkshopEarning.level_id == level_id,
                WorkshopEarning.creator_id == creator_id
            )
        ).first()
        
        if not earning:
            earning = WorkshopEarning(
                level_id=level_id,
                creator_id=creator_id,
                play_count=0,
                like_count=0,
                total_coins=0,
                daily_coins=0,
                last_reset_date=datetime.utcnow()
            )
            db.add(earning)
            db.commit()
            db.refresh(earning)
        
        return earning
    
    @staticmethod
    def check_and_reset_daily_limit(earning: WorkshopEarning, db: Session) -> None:
        """
        检查并重置每日限额
        
        Args:
            earning: 收益记录
            db: 数据库会话
        """
        now = datetime.utcnow()
        last_reset = earning.last_reset_date
        
        # 如果是新的一天，重置每日金币
        if last_reset.date() < now.date():
            earning.daily_coins = 0
            earning.last_reset_date = now
            db.commit()
    
    @staticmethod
    def can_earn_more(earning: WorkshopEarning) -> bool:
        """
        检查是否还能获得更多金币
        
        Args:
            earning: 收益记录
            
        Returns:
            bool: 是否还能获得金币
        """
        return earning.daily_coins < WorkshopEarningsService.DAILY_LIMIT
    
    @staticmethod
    def record_play(
        db: Session,
        level_id: str,
        creator_id: int,
        player_id: int
    ) -> dict:
        """
        记录关卡游玩，发放金币
        
        Args:
            db: 数据库会话
            level_id: 关卡ID
            creator_id: 创作者ID
            player_id: 玩家ID
            
        Returns:
            dict: 包含是否成功和金币数量的字典
        """
        # 创作者不能从自己的关卡获得金币
        if creator_id == player_id:
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'creator_self_play',
                'message': '创作者不能从自己的关卡获得金币'
            }
        
        # 获取或创建收益记录
        earning = WorkshopEarningsService.get_or_create_earning(db, level_id, creator_id)
        
        # 检查并重置每日限额
        WorkshopEarningsService.check_and_reset_daily_limit(earning, db)
        
        # 检查是否达到每日上限
        if not WorkshopEarningsService.can_earn_more(earning):
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'daily_limit_reached',
                'message': f'今日已达到上限({WorkshopEarningsService.DAILY_LIMIT}金币)'
            }
        
        # 计算可以获得的金币（不超过每日上限）
        coins_to_earn = min(
            WorkshopEarningsService.PLAY_REWARD,
            WorkshopEarningsService.DAILY_LIMIT - earning.daily_coins
        )
        
        # 生成唯一交易ID（基于日期和玩家ID，确保同一天同一玩家只能触发一次）
        # 不使用时间戳哈希，确保相同输入产生相同ID
        today = datetime.utcnow().strftime('%Y-%m-%d')
        transaction_id = f"workshop_earning_{creator_id}_level_{level_id}_play_{today}_{player_id}"
        
        # 发放金币
        coin_awarded = CoinService.add_coins(
            db=db,
            user_id=creator_id,
            amount=coins_to_earn,
            type='workshop_earning',
            source='workshop_play',
            description=f'创意工坊关卡被玩: Level {level_id}',
            transaction_id=transaction_id
        )
        
        if coin_awarded:
            # 更新收益记录
            earning.play_count += 1
            earning.total_coins += coins_to_earn
            earning.daily_coins += coins_to_earn
            db.commit()
            
            return {
                'success': True,
                'coins_earned': coins_to_earn,
                'daily_coins': earning.daily_coins,
                'daily_limit': WorkshopEarningsService.DAILY_LIMIT,
                'message': '金币发放成功'
            }
        else:
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'duplicate_transaction',
                'message': '重复的交易'
            }
    
    @staticmethod
    def record_like(
        db: Session,
        level_id: str,
        creator_id: int,
        player_id: int
    ) -> dict:
        """
        记录关卡点赞，发放金币
        
        Args:
            db: 数据库会话
            level_id: 关卡ID
            creator_id: 创作者ID
            player_id: 玩家ID
            
        Returns:
            dict: 包含是否成功和金币数量的字典
        """
        # 创作者不能给自己的关卡点赞获得金币
        if creator_id == player_id:
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'creator_self_like',
                'message': '创作者不能从自己的点赞获得金币'
            }
        
        # 获取或创建收益记录
        earning = WorkshopEarningsService.get_or_create_earning(db, level_id, creator_id)
        
        # 检查并重置每日限额
        WorkshopEarningsService.check_and_reset_daily_limit(earning, db)
        
        # 检查是否达到每日上限
        if not WorkshopEarningsService.can_earn_more(earning):
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'daily_limit_reached',
                'message': f'今日已达到上限({WorkshopEarningsService.DAILY_LIMIT}金币)'
            }
        
        # 计算可以获得的金币（不超过每日上限）
        coins_to_earn = min(
            WorkshopEarningsService.LIKE_REWARD,
            WorkshopEarningsService.DAILY_LIMIT - earning.daily_coins
        )
        
        # 生成唯一交易ID（基于日期和玩家ID，确保同一天同一玩家只能触发一次）
        # 不使用时间戳哈希，确保相同输入产生相同ID
        today = datetime.utcnow().strftime('%Y-%m-%d')
        transaction_id = f"workshop_earning_{creator_id}_level_{level_id}_like_{today}_{player_id}"
        
        # 发放金币
        coin_awarded = CoinService.add_coins(
            db=db,
            user_id=creator_id,
            amount=coins_to_earn,
            type='workshop_earning',
            source='workshop_like',
            description=f'创意工坊关卡被点赞: Level {level_id}',
            transaction_id=transaction_id
        )
        
        if coin_awarded:
            # 更新收益记录
            earning.like_count += 1
            earning.total_coins += coins_to_earn
            earning.daily_coins += coins_to_earn
            db.commit()
            
            return {
                'success': True,
                'coins_earned': coins_to_earn,
                'daily_coins': earning.daily_coins,
                'daily_limit': WorkshopEarningsService.DAILY_LIMIT,
                'message': '金币发放成功'
            }
        else:
            return {
                'success': False,
                'coins_earned': 0,
                'reason': 'duplicate_transaction',
                'message': '重复的交易'
            }
    
    @staticmethod
    def get_earnings(db: Session, creator_id: int) -> list:
        """
        获取创作者的所有收益记录
        
        Args:
            db: 数据库会话
            creator_id: 创作者ID
            
        Returns:
            list: 收益记录列表
        """
        earnings = db.query(WorkshopEarning).filter(
            WorkshopEarning.creator_id == creator_id
        ).order_by(WorkshopEarning.total_coins.desc()).all()
        
        result = []
        for earning in earnings:
            # 检查并重置每日限额（用于显示准确的今日收益）
            WorkshopEarningsService.check_and_reset_daily_limit(earning, db)
            
            result.append({
                'level_id': earning.level_id,
                'play_count': earning.play_count,
                'like_count': earning.like_count,
                'total_coins': earning.total_coins,
                'daily_coins': earning.daily_coins,
                'daily_limit': WorkshopEarningsService.DAILY_LIMIT,
                'can_earn_more': WorkshopEarningsService.can_earn_more(earning),
                'created_at': earning.created_at.isoformat() if earning.created_at else None,
                'updated_at': earning.updated_at.isoformat() if earning.updated_at else None
            })
        
        return result
    
    @staticmethod
    def get_level_earning(db: Session, level_id: str, creator_id: int) -> dict:
        """
        获取特定关卡的收益信息
        
        Args:
            db: 数据库会话
            level_id: 关卡ID
            creator_id: 创作者ID
            
        Returns:
            dict: 收益信息
        """
        earning = db.query(WorkshopEarning).filter(
            and_(
                WorkshopEarning.level_id == level_id,
                WorkshopEarning.creator_id == creator_id
            )
        ).first()
        
        if not earning:
            return {
                'level_id': level_id,
                'play_count': 0,
                'like_count': 0,
                'total_coins': 0,
                'daily_coins': 0,
                'daily_limit': WorkshopEarningsService.DAILY_LIMIT,
                'can_earn_more': True
            }
        
        # 检查并重置每日限额
        WorkshopEarningsService.check_and_reset_daily_limit(earning, db)
        
        return {
            'level_id': earning.level_id,
            'play_count': earning.play_count,
            'like_count': earning.like_count,
            'total_coins': earning.total_coins,
            'daily_coins': earning.daily_coins,
            'daily_limit': WorkshopEarningsService.DAILY_LIMIT,
            'can_earn_more': WorkshopEarningsService.can_earn_more(earning),
            'created_at': earning.created_at.isoformat() if earning.created_at else None,
            'updated_at': earning.updated_at.isoformat() if earning.updated_at else None
        }

