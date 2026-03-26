from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean
from app.core.time import utc_now
from app.core.database import Base

class QuizQuestion(Base):
    """答题对战题库"""
    __tablename__ = "quiz_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)  # 分类：Python基础、算法、Web等
    difficulty = Column(Integer, default=1)  # 难度：1-5
    question = Column(String(500), nullable=False)  # 题目
    options = Column(JSON)  # 选项 ["A. xxx", "B. xxx", "C. xxx", "D. xxx"]
    correct_answer = Column(String(1), nullable=False)  # 正确答案：A/B/C/D
    explanation = Column(String(500))  # 解释
    points = Column(Integer, default=10)  # 分值

class QuizBattle(Base):
    """答题对战房间"""
    __tablename__ = "quiz_battles"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), unique=True, nullable=False)
    
    # 参战双方
    player1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("users.id"))
    
    # 对战状态
    status = Column(String(20), default="waiting")  # waiting, in_progress, finished
    current_round = Column(Integer, default=1)  # 当前轮次
    total_rounds = Column(Integer, default=5)  # 总轮次
    
    # 当前题目
    current_question_id = Column(Integer, ForeignKey("quiz_questions.id"))
    
    # 得分
    player1_score = Column(Integer, default=0)
    player2_score = Column(Integer, default=0)
    
    # 答题记录
    battle_log = Column(JSON)  # 每轮的答题情况
    
    # 时间
    created_at = Column(DateTime, default=utc_now)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    
    # 胜者
    winner_id = Column(Integer)

class QuizAnswer(Base):
    """答题记录"""
    __tablename__ = "quiz_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    battle_id = Column(Integer, ForeignKey("quiz_battles.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    
    round_number = Column(Integer, nullable=False)  # 轮次
    answer = Column(String(1), nullable=False)  # 用户答案
    is_correct = Column(Boolean, nullable=False)  # 是否正确
    answer_time = Column(Integer)  # 答题用时（毫秒）
    points_earned = Column(Integer, default=0)  # 获得分数
    
    created_at = Column(DateTime, default=utc_now)







