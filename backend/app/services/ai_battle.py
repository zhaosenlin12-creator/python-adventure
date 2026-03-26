"""
AI机器人对战服务
"""
import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.ai_robot import AIRobot
from app.models.quiz_battle import QuizQuestion
from app.services.reward import reward_service
from datetime import datetime
from app.core.time import utc_now

class AIBattleManager:
    def __init__(self):
        self.active_ai_battles: Dict[int, Dict[str, Any]] = {}  # user_id -> battle_data
        
    def find_suitable_robot(self, db: Session, user_level: int) -> Optional[AIRobot]:
        """根据用户等级匹配合适的AI机器人"""
        
        # 查找等级接近的机器人（±2级范围）
        robots = db.query(AIRobot).filter(
            AIRobot.level >= user_level - 2,
            AIRobot.level <= user_level + 2
        ).all()
        
        if not robots:
            # 如果没有找到，就找所有机器人
            robots = db.query(AIRobot).all()
        
        if not robots:
            return None
        
        # 随机选择一个机器人
        return random.choice(robots)
    
    def start_ai_battle(
        self,
        db: Session,
        user: User,
        robot_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """发起与AI机器人的对战"""
        
        # 如果指定了机器人ID，使用指定的；否则自动匹配
        if robot_id:
            robot = db.query(AIRobot).filter(AIRobot.id == robot_id).first()
            if not robot:
                return {
                    "success": False,
                    "message": "机器人不存在"
                }
        else:
            robot = self.find_suitable_robot(db, user.level)
            if not robot:
                return {
                    "success": False,
                    "message": "没有可用的AI机器人"
                }
        
        # 根据机器人等级和用户等级决定题目难度
        avg_level = (user.level + robot.level) / 2
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
        
        # 如果机器人有擅长领域，优先选择该领域的题目
        questions = db.query(QuizQuestion).filter(
            QuizQuestion.difficulty == difficulty
        ).all()
        
        if robot.specialties and robot.specialties != ["全部"]:
            specialty_questions = [
                q for q in questions 
                if q.category in robot.specialties
            ]
            if specialty_questions:
                questions = specialty_questions
        
        if not questions:
            questions = db.query(QuizQuestion).all()
        
        if not questions:
            return {
                "success": False,
                "message": "题库为空"
            }
        
        question = random.choice(questions)
        
        # 创建对战数据
        battle_id = f"ai_{user.id}_{robot.id}_{int(utc_now().timestamp())}"
        battle_data = {
            "battle_id": battle_id,
            "user_id": user.id,
            "robot_id": robot.id,
            "robot": {
                "id": robot.id,
                "name": robot.name,
                "level": robot.level,
                "avatar": robot.avatar,
                "personality": robot.personality,
                "description": robot.description
            },
            "question_id": question.id,
            "question": question.question,
            "options": question.options,
            "correct_answer": question.answer,
            "hint": question.hint,
            "category": question.category,
            "difficulty": question.difficulty,
            "user_answer": None,
            "robot_answer": None,
            "start_time": utc_now(),
            "timeout_seconds": 60,
            "robot_win_rate": robot.win_rate
        }
        
        self.active_ai_battles[user.id] = battle_data
        
        return {
            "success": True,
            "message": f"与 {robot.name} 的对战开始！",
            "battle_data": {
                "battle_id": battle_id,
                "question": question.question,
                "options": question.options,
                "hint": question.hint,
                "category": question.category,
                "difficulty": question.difficulty,
                "timeout": 60,
                "opponent": {
                    "id": robot.id,
                    "name": robot.name,
                    "level": robot.level,
                    "avatar": robot.avatar,
                    "description": robot.description,
                    "is_ai": True
                }
            }
        }
    
    def _simulate_robot_answer(self, battle: Dict[str, Any]) -> str:
        """模拟AI机器人答题"""
        
        correct_answer = battle["correct_answer"]
        options = battle["options"]
        win_rate = battle["robot_win_rate"]
        
        # 根据胜率决定机器人是否答对
        # 胜率越高，答对的概率越大
        will_answer_correct = random.randint(0, 100) < win_rate
        
        if will_answer_correct:
            return correct_answer
        else:
            # 随机选择一个错误答案
            wrong_options = [opt for opt in options if opt != correct_answer]
            return random.choice(wrong_options) if wrong_options else options[0]
    
    def submit_ai_battle_answer(
        self,
        db: Session,
        user_id: int,
        battle_id: str,
        answer: str
    ) -> Dict[str, Any]:
        """提交对AI机器人对战的答案"""
        
        if user_id not in self.active_ai_battles:
            return {
                "success": False,
                "message": "你当前没有进行中的AI对战"
            }
        
        battle = self.active_ai_battles[user_id]
        
        if battle["battle_id"] != battle_id:
            return {
                "success": False,
                "message": "对战ID不匹配"
            }
        
        # 检查是否超时
        elapsed = (utc_now() - battle["start_time"]).total_seconds()
        if elapsed > battle["timeout_seconds"]:
            del self.active_ai_battles[user_id]
            return {
                "success": False,
                "message": "对战超时",
                "timeout": True
            }
        
        # 记录用户答案
        battle["user_answer"] = answer
        
        # 模拟机器人答题（加入一点延迟效果）
        robot_answer = self._simulate_robot_answer(battle)
        battle["robot_answer"] = robot_answer
        
        # 计算结果
        return self._calculate_ai_battle_result(db, battle)
    
    def _calculate_ai_battle_result(self, db: Session, battle: Dict[str, Any]) -> Dict[str, Any]:
        """计算AI对战结果"""
        
        correct_answer = battle["correct_answer"]
        user_correct = battle["user_answer"] == correct_answer
        robot_correct = battle["robot_answer"] == correct_answer
        
        user = db.query(User).filter(User.id == battle["user_id"]).first()
        robot_name = battle["robot"]["name"]
        
        # 判定胜负
        if user_correct and not robot_correct:
            winner = "user"
            result_message = f"🎉 恭喜你战胜了 {robot_name}！"
            exp_reward = 25 + battle["difficulty"] * 8
            coins_reward = 15 + battle["difficulty"] * 3
        elif robot_correct and not user_correct:
            winner = "robot"
            result_message = f"😅 {robot_name} 答对了，你答错了！继续加油！"
            exp_reward = 5
            coins_reward = 2
        elif user_correct and robot_correct:
            winner = "draw"
            result_message = f"🤝 你和 {robot_name} 都答对了，平局！"
            exp_reward = 15 + battle["difficulty"] * 5
            coins_reward = 8 + battle["difficulty"] * 2
        else:
            winner = "draw"
            result_message = f"😅 你和 {robot_name} 都答错了！"
            exp_reward = 3
            coins_reward = 1
        
        # 给予奖励
        reward_service.give_reward(
            db,
            user,
            experience=exp_reward,
            coins=coins_reward
        )
        
        db.commit()
        
        # 清除对战数据
        if battle["user_id"] in self.active_ai_battles:
            del self.active_ai_battles[battle["user_id"]]
        
        return {
            "success": True,
            "message": result_message,
            "battle_complete": True,
            "winner": winner,
            "correct_answer": correct_answer,
            "user_answer": battle["user_answer"],
            "robot_answer": battle["robot_answer"],
            "rewards": {
                "experience": exp_reward,
                "coins": coins_reward
            },
            "explanation": f"正确答案是: {correct_answer}",
            "robot_comment": self._get_robot_comment(winner, battle["robot"]["personality"])
        }
    
    def _get_robot_comment(self, winner: str, personality: str) -> str:
        """获取机器人评论"""
        
        comments = {
            "友善": {
                "user": ["太棒了！你真聪明！", "你做得很好！", "继续保持！"],
                "robot": ["没关系，下次你一定能赢！", "别灰心，你已经很努力了！", "我相信你会越来越好！"],
                "draw": ["我们都很厉害！", "势均力敌呢！", "下次再来较量吧！"]
            },
            "挑战": {
                "user": ["不错，但还不够！", "有进步，继续努力！", "你还能做得更好！"],
                "robot": ["哈哈，我赢了！", "再练练吧！", "下次小心点！"],
                "draw": ["有点意思！", "势均力敌！", "下次见真章！"]
            },
            "严格": {
                "user": ["合格。", "还行。", "继续努力。"],
                "robot": ["基础不牢，地动山摇。", "需要加强学习。", "多看书，多练习。"],
                "draw": ["平局。", "旗鼓相当。", "继续学习。"]
            }
        }
        
        personality_comments = comments.get(personality, comments["友善"])
        return random.choice(personality_comments[winner])
    
    def get_available_robots(self, db: Session, user_level: int) -> list:
        """获取可用的AI机器人列表"""
        
        # 返回所有机器人，但标记推荐的
        all_robots = db.query(AIRobot).order_by(AIRobot.level).all()
        
        result = []
        for robot in all_robots:
            is_recommended = abs(robot.level - user_level) <= 2
            result.append({
                "id": robot.id,
                "name": robot.name,
                "level": robot.level,
                "avatar": robot.avatar,
                "personality": robot.personality,
                "difficulty": robot.difficulty,
                "description": robot.description,
                "is_recommended": is_recommended
            })
        
        return result

# 全局实例
ai_battle_manager = AIBattleManager()






