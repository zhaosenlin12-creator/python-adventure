"""
成就触发检查服务
"""
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement
from app.models.user_task import UserTask
from app.models.progress import LevelCompletion
from app.models.pet import Pet, PetGrowthLog
from sqlalchemy import func
from typing import List, Dict

class AchievementChecker:
    """成就检查器"""
    
    @staticmethod
    def check_and_unlock(
        db: Session,
        user: User,
        event_type: str,
        event_data: Dict = None
    ) -> List[Achievement]:
        """
        检查并解锁成就
        
        Args:
            db: 数据库会话
            user: 用户对象
            event_type: 事件类型 (level_up, task_complete, perfect_score等)
            event_data: 事件数据
        
        Returns:
            新解锁的成就列表
        """
        newly_unlocked = []
        
        # 获取所有成就
        all_achievements = db.query(Achievement).all()
        
        # 获取用户已解锁的成就
        unlocked_ids = {
            ua.achievement_id 
            for ua in db.query(UserAchievement).filter(
                UserAchievement.user_id == user.id
            ).all()
        }
        
        # 检查每个未解锁的成就
        for achievement in all_achievements:
            if achievement.id in unlocked_ids:
                continue
            
            # 检查是否满足条件
            if AchievementChecker._check_condition(
                db, user, achievement, event_type, event_data
            ):
                # 解锁成就
                user_achievement = UserAchievement(
                    user_id=user.id,
                    achievement_id=achievement.id,
                    is_claimed=False
                )
                db.add(user_achievement)
                newly_unlocked.append(achievement)
        
        if newly_unlocked:
            db.commit()
        
        return newly_unlocked
    
    @staticmethod
    def _check_condition(
        db: Session,
        user: User,
        achievement: Achievement,
        event_type: str,
        event_data: Dict
    ) -> bool:
        """检查成就条件是否满足"""
        
        # 等级成就
        if achievement.condition_type == "level":
            if event_type == "level_up" or event_type == "check_all":
                return user.level >= achievement.condition_value
        
        # 任务数量成就
        elif achievement.condition_type == "task_count":
            if event_type == "task_complete" or event_type == "check_all":
                completed_count = db.query(UserTask).filter(
                    UserTask.user_id == user.id,
                    UserTask.status == "completed"
                ).count()
                # 关卡完成记录也计入任务量（兼容主流程）
                level_completed_count = db.query(LevelCompletion).filter(
                    LevelCompletion.user_id == user.id
                ).count()
                total_count = completed_count + level_completed_count
                return total_count >= achievement.condition_value
        
        # 满分次数成就
        elif achievement.condition_type == "perfect_score":
            if event_type == "task_complete" or event_type == "check_all":
                perfect_count = db.query(UserTask).filter(
                    UserTask.user_id == user.id,
                    UserTask.score == 100,
                    UserTask.status == "completed"
                ).count()
                level_perfect_count = db.query(LevelCompletion).filter(
                    LevelCompletion.user_id == user.id,
                    LevelCompletion.score == 100
                ).count()
                total_perfect = perfect_count + level_perfect_count
                return total_perfect >= achievement.condition_value
        
        # 一次通过成就
        elif achievement.condition_type == "first_try":
            if event_type == "task_complete":
                # 检查是否是第一次尝试就通过
                task_id = event_data.get("task_id") if event_data else None
                if task_id:
                    user_task = db.query(UserTask).filter(
                        UserTask.user_id == user.id,
                        UserTask.task_id == task_id
                    ).first()
                    
                    if user_task and user_task.attempts == 1 and user_task.score == 100:
                        return True
        
        # 连续登录成就 (暂未实现登录记录)
        elif achievement.condition_type == "login_streak":
            if event_type in ("daily_check_in", "login", "check_all"):
                return (user.login_streak or 0) >= achievement.condition_value

        # 进化阶段成就
        elif achievement.condition_type == "evolution_stage":
            if event_type in ("pet_evolve", "check_all"):
                max_stage = db.query(func.max(Pet.evolution_stage)).filter(
                    Pet.user_id == user.id
                ).scalar() or 0
                return max_stage >= achievement.condition_value

        # 进化次数成就
        elif achievement.condition_type == "evolution_count":
            if event_type in ("pet_evolve", "check_all"):
                evolve_count = db.query(PetGrowthLog).join(
                    Pet, PetGrowthLog.pet_id == Pet.id
                ).filter(
                    Pet.user_id == user.id,
                    PetGrowthLog.event_type == "evolved"
                ).count()
                return evolve_count >= achievement.condition_value

        # 孵化次数成就
        elif achievement.condition_type == "hatch_count":
            if event_type in ("pet_hatch", "check_all"):
                hatch_count = db.query(PetGrowthLog).join(
                    Pet, PetGrowthLog.pet_id == Pet.id
                ).filter(
                    Pet.user_id == user.id,
                    PetGrowthLog.event_type == "hatched"
                ).count()
                return hatch_count >= achievement.condition_value
        
        return False

achievement_checker = AchievementChecker()









