"""
PvP 对战服务 - 匹配和房间管理
"""
from typing import Dict, List, Optional
import uuid
import time
from app.models.battle import UserRank
from sqlalchemy.orm import Session

class BattleService:
    def __init__(self):
        # 等待匹配的玩家队列
        self.waiting_queue: List[Dict] = []
        # 活跃的对战房间 {room_id: room_data}
        self.active_rooms: Dict[str, Dict] = {}
    
    def join_queue(self, user_id: int, username: str, level: int, db: Session) -> Dict:
        """加入匹配队列"""
        # 检查是否已在队列中
        if any(p['user_id'] == user_id for p in self.waiting_queue):
            return {"status": "already_in_queue"}
        
        # 尝试匹配
        opponent = self._find_opponent(level)
        
        if opponent:
            # 匹配成功，创建房间
            room_id = str(uuid.uuid4())[:8]
            
            # 从队列中移除对手
            self.waiting_queue = [p for p in self.waiting_queue if p['user_id'] != opponent['user_id']]
            
            # 创建房间数据
            room_data = {
                'room_id': room_id,
                'player1': {'user_id': opponent['user_id'], 'username': opponent['username']},
                'player2': {'user_id': user_id, 'username': username},
                'status': 'waiting',
                'created_at': time.time()
            }
            
            self.active_rooms[room_id] = room_data
            
            return {
                "status": "matched",
                "room_id": room_id,
                "opponent_id": opponent['user_id'],
                "opponent_username": opponent['username']
            }
        else:
            # 加入队列等待
            self.waiting_queue.append({
                'user_id': user_id,
                'username': username,
                'level': level,
                'joined_at': time.time()
            })
            
            return {"status": "queued"}
    
    def leave_queue(self, user_id: int):
        """离开匹配队列"""
        self.waiting_queue = [p for p in self.waiting_queue if p['user_id'] != user_id]
    
    def get_room(self, room_id: str) -> Optional[Dict]:
        """获取房间信息"""
        return self.active_rooms.get(room_id)
    
    def update_room_status(self, room_id: str, status: str):
        """更新房间状态"""
        if room_id in self.active_rooms:
            self.active_rooms[room_id]['status'] = status
    
    def record_submission(self, room_id: str, user_id: int, score: int, execution_time: int) -> bool:
        """记录玩家提交，返回是否对战结束"""
        room = self.active_rooms.get(room_id)
        if not room:
            return False
        
        # 记录分数和时间
        if room['player1']['user_id'] == user_id:
            room['player1_score'] = score
            room['player1_time'] = execution_time
        elif room['player2']['user_id'] == user_id:
            room['player2_score'] = score
            room['player2_time'] = execution_time
        
        # 检查是否双方都已提交
        if 'player1_score' in room and 'player2_score' in room:
            room['status'] = 'finished'
            return True
        
        return False
    
    def calculate_winner(self, room_id: str) -> Optional[int]:
        """计算获胜者"""
        room = self.active_rooms.get(room_id)
        if not room or room['status'] != 'finished':
            return None
        
        p1_score = room.get('player1_score', 0)
        p2_score = room.get('player2_score', 0)
        p1_time = room.get('player1_time', float('inf'))
        p2_time = room.get('player2_time', float('inf'))
        
        # 分数高者胜
        if p1_score != p2_score:
            return room['player1']['user_id'] if p1_score > p2_score else room['player2']['user_id']
        
        # 分数相同，时间短者胜
        if p1_time != p2_time:
            return room['player1']['user_id'] if p1_time < p2_time else room['player2']['user_id']
        
        # 平局
        return None
    
    def _find_opponent(self, user_level: int) -> Optional[Dict]:
        """查找匹配的对手（等级相近）"""
        # 优先匹配等级相近的玩家（±2级）
        for player in self.waiting_queue:
            if abs(player['level'] - user_level) <= 2:
                return player
        
        # 如果没有相近等级，匹配任意玩家
        if self.waiting_queue:
            return self.waiting_queue[0]
        
        return None
    
    def calculate_rank_change(self, winner_points: int, loser_points: int) -> tuple:
        """
        ELO 积分计算
        返回: (winner_gain, loser_loss)
        """
        K = 32  # K因子
        
        # 期望胜率
        expected_winner = 1 / (1 + 10 ** ((loser_points - winner_points) / 400))
        expected_loser = 1 - expected_winner
        
        # 积分变化
        winner_gain = int(K * (1 - expected_winner))
        loser_loss = int(K * (0 - expected_loser))
        
        return (winner_gain, loser_loss)
    
    def update_ranks(self, winner_id: int, loser_id: int, db: Session) -> tuple:
        """更新双方段位"""
        # 获取或创建段位记录
        winner_rank = db.query(UserRank).filter(UserRank.user_id == winner_id).first()
        if not winner_rank:
            winner_rank = UserRank(user_id=winner_id)
            db.add(winner_rank)
        
        loser_rank = db.query(UserRank).filter(UserRank.user_id == loser_id).first()
        if not loser_rank:
            loser_rank = UserRank(user_id=loser_id)
            db.add(loser_rank)
        
        # 计算积分变化
        winner_gain, loser_loss = self.calculate_rank_change(
            winner_rank.rank_points,
            loser_rank.rank_points
        )
        
        # 更新积分
        winner_rank.rank_points += winner_gain
        loser_rank.rank_points += loser_loss
        
        # 更新战绩
        winner_rank.wins += 1
        winner_rank.total_battles += 1
        winner_rank.win_streak += 1
        winner_rank.max_win_streak = max(winner_rank.max_win_streak, winner_rank.win_streak)
        
        loser_rank.losses += 1
        loser_rank.total_battles += 1
        loser_rank.win_streak = 0
        
        # 更新段位
        winner_rank.update_tier()
        loser_rank.update_tier()
        
        db.commit()
        
        return (winner_gain, loser_loss)

# 全局单例
battle_service = BattleService()
