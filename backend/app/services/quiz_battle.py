"""
答题对战系统
"""
import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.quiz_battle import QuizQuestion
from app.services.reward import reward_service
from datetime import datetime, timedelta
from app.core.time import utc_now

class QuizBattleManager:
    def __init__(self):
        self.active_battles: Dict[int, Dict[str, Any]] = {}  # user_id -> battle_data
        
    def start_quiz_battle(
        self, 
        db: Session, 
        challenger: User, 
        target: User,
        difficulty: Optional[int] = None
    ) -> Dict[str, Any]:
        """发起答题对战"""
        
        # 根据双方等级决定题目难度
        if difficulty is None:
            avg_level = (challenger.level + target.level) / 2
            if avg_level < 3:
                difficulty = 1
            elif avg_level < 5:
                difficulty = 2
            elif avg_level < 8:
                difficulty = 3
            elif avg_level < 12:
                difficulty = 4
            else:
                difficulty = 5
        
        # 随机选择题目
        questions = db.query(QuizQuestion).filter(
            QuizQuestion.difficulty == difficulty
        ).all()
        
        if not questions:
            # 如果没有对应难度的题目，选择所有题目
            questions = db.query(QuizQuestion).all()
        
        if not questions:
            return {
                "success": False,
                "message": "题库为空，请联系管理员添加题目"
            }
        
        # 随机选择一道题
        question = random.choice(questions)
        
        # 创建对战数据
        battle_id = f"{challenger.id}_{target.id}_{int(utc_now().timestamp())}"
        battle_data = {
            "battle_id": battle_id,
            "challenger_id": challenger.id,
            "target_id": target.id,
            "question_id": question.id,
            "question": question.question,
            "options": question.options,
            "correct_answer": question.answer,
            "hint": question.hint,
            "category": question.category,
            "difficulty": question.difficulty,
            "challenger_answer": None,
            "target_answer": None,
            "start_time": utc_now(),
            "timeout_seconds": 60,
            "status": "waiting"
        }
        
        self.active_battles[challenger.id] = battle_data
        self.active_battles[target.id] = battle_data
        
        return {
            "success": True,
            "message": f"向 {target.username} 发起答题挑战！",
            "battle_data": {
                "battle_id": battle_id,
                "question": question.question,
                "options": question.options,
                "hint": question.hint,
                "category": question.category,
                "difficulty": question.difficulty,
                "timeout": 60,
                "opponent": {
                    "id": target.id,
                    "username": target.username,
                    "level": target.level
                }
            }
        }
    
    def submit_answer(
        self,
        db: Session,
        user_id: int,
        battle_id: str,
        answer: str
    ) -> Dict[str, Any]:
        """提交答案"""
        
        if user_id not in self.active_battles:
            return {
                "success": False,
                "message": "你当前没有进行中的对战"
            }
        
        battle = self.active_battles[user_id]
        
        if battle["battle_id"] != battle_id:
            return {
                "success": False,
                "message": "对战ID不匹配"
            }
        
        # 检查是否超时
        elapsed = (utc_now() - battle["start_time"]).total_seconds()
        if elapsed > battle["timeout_seconds"]:
            return self._timeout_battle(db, battle)
        
        # 记录答案
        if user_id == battle["challenger_id"]:
            battle["challenger_answer"] = answer
        else:
            battle["target_answer"] = answer
        
        # 如果双方都已作答，计算结果
        if battle["challenger_answer"] and battle["target_answer"]:
            return self._calculate_result(db, battle)
        
        # 否则等待对方
        return {
            "success": True,
            "message": "答案已提交，等待对方作答...",
            "waiting": True
        }
    
    def _calculate_result(self, db: Session, battle: Dict[str, Any]) -> Dict[str, Any]:
        """计算对战结果"""
        
        correct_answer = battle["correct_answer"]
        challenger_correct = battle["challenger_answer"] == correct_answer
        target_correct = battle["target_answer"] == correct_answer
        
        challenger = db.query(User).filter(User.id == battle["challenger_id"]).first()
        target = db.query(User).filter(User.id == battle["target_id"]).first()
        
        # 计算答题时间（暂时不记录，简化处理）
        
        # 判定胜负
        if challenger_correct and not target_correct:
            winner = challenger
            loser = target
            result_message = f"🎉 {challenger.username} 答对了！{target.username} 答错了！"
        elif target_correct and not challenger_correct:
            winner = target
            loser = challenger
            result_message = f"🎉 {target.username} 答对了！{challenger.username} 答错了！"
        elif challenger_correct and target_correct:
            # 都答对，平局
            winner = None
            loser = None
            result_message = "🤝 双方都答对了，平局！"
        else:
            # 都答错，平局
            winner = None
            loser = None
            result_message = "😅 双方都答错了，平局！"
        
        # 给予奖励
        if winner:
            # 胜者奖励
            exp_reward = 30 + battle["difficulty"] * 10
            coins_reward = 20 + battle["difficulty"] * 5
            reward_service.give_reward(
                db,
                winner,
                experience=exp_reward,
                coins=coins_reward
            )
            
            # 失败者也有少量经验
            reward_service.give_reward(
                db,
                loser,
                experience=5,
                coins=0
            )
            
            reward_text = f"获得 {exp_reward} 经验, {coins_reward} 金币"
        else:
            # 平局双方都有奖励
            exp_reward = 10 + battle["difficulty"] * 3
            reward_service.give_reward(db, challenger, experience=exp_reward, coins=5)
            reward_service.give_reward(db, target, experience=exp_reward, coins=5)
            reward_text = f"双方各获得 {exp_reward} 经验, 5 金币"
        
        db.commit()
        
        # 清除对战数据
        if battle["challenger_id"] in self.active_battles:
            del self.active_battles[battle["challenger_id"]]
        if battle["target_id"] in self.active_battles:
            del self.active_battles[battle["target_id"]]
        
        return {
            "success": True,
            "message": result_message,
            "battle_complete": True,
            "winner_id": winner.id if winner else None,
            "winner_name": winner.username if winner else "平局",
            "correct_answer": correct_answer,
            "challenger_answer": battle["challenger_answer"],
            "target_answer": battle["target_answer"],
            "rewards": reward_text,
            "explanation": f"正确答案是: {correct_answer}"
        }
    
    def _timeout_battle(self, db: Session, battle: Dict[str, Any]) -> Dict[str, Any]:
        """对战超时"""
        
        # 清除对战数据
        if battle["challenger_id"] in self.active_battles:
            del self.active_battles[battle["challenger_id"]]
        if battle["target_id"] in self.active_battles:
            del self.active_battles[battle["target_id"]]
        
        return {
            "success": False,
            "message": "对战超时，自动取消",
            "timeout": True
        }
    
    def get_battle_status(self, user_id: int) -> Optional[Dict[str, Any]]:
        """获取对战状态"""
        
        if user_id not in self.active_battles:
            return None
        
        battle = self.active_battles[user_id]
        
        # 检查是否超时
        elapsed = (utc_now() - battle["start_time"]).total_seconds()
        if elapsed > battle["timeout_seconds"]:
            return None
        
        return {
            "battle_id": battle["battle_id"],
            "question": battle["question"],
            "options": battle["options"],
            "hint": battle["hint"],
            "category": battle["category"],
            "difficulty": battle["difficulty"],
            "time_remaining": int(battle["timeout_seconds"] - elapsed),
            "waiting_for_opponent": battle["challenger_answer"] is not None or battle["target_answer"] is not None
        }

# 全局实例
quiz_battle_manager = QuizBattleManager()






