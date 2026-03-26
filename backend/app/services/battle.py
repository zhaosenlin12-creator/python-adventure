"""
PK对战服务
处理匹配、对战逻辑
"""
from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import json
from app.core.time import utc_now

class BattleRoom:
    """对战房间"""
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: List[Dict] = []  # 最多2个玩家
        self.task_id: Optional[int] = None
        self.status = "waiting"  # waiting, in_progress, finished
        self.winner_id: Optional[int] = None
        self.start_time: Optional[datetime] = None
        self.submissions: Dict[int, Dict] = {}  # user_id -> submission info
        
    def add_player(self, user_id: int, username: str, level: int):
        """添加玩家"""
        if len(self.players) >= 2:
            return False
        
        self.players.append({
            "user_id": user_id,
            "username": username,
            "level": level,
            "ready": False
        })
        return True
    
    def remove_player(self, user_id: int):
        """移除玩家"""
        self.players = [p for p in self.players if p["user_id"] != user_id]
        if len(self.players) == 0:
            self.status = "finished"
    
    def is_full(self) -> bool:
        """房间是否已满"""
        return len(self.players) >= 2
    
    def start_battle(self, task_id: int):
        """开始对战"""
        if not self.is_full():
            return False
        
        self.task_id = task_id
        self.status = "in_progress"
        self.start_time = utc_now()
        return True
    
    def submit_code(self, user_id: int, code: str, score: int):
        """提交代码"""
        self.submissions[user_id] = {
            "code": code,
            "score": score,
            "time": utc_now()
        }
        
        # 如果有玩家获得满分，结束对战
        if score == 100:
            self.winner_id = user_id
            self.status = "finished"
            return True
        
        return False
    
    def get_result(self) -> Dict:
        """获取对战结果"""
        if self.status != "finished":
            return {"status": "in_progress"}
        
        if self.winner_id:
            winner = next((p for p in self.players if p["user_id"] == self.winner_id), None)
            loser = next((p for p in self.players if p["user_id"] != self.winner_id), None)
            
            return {
                "status": "finished",
                "winner": winner,
                "loser": loser,
                "winner_score": self.submissions.get(self.winner_id, {}).get("score", 0)
            }
        
        # 如果两人都提交了，比较分数
        if len(self.submissions) == 2:
            scores = [(uid, info["score"]) for uid, info in self.submissions.items()]
            scores.sort(key=lambda x: x[1], reverse=True)
            
            winner_id = scores[0][0]
            winner = next((p for p in self.players if p["user_id"] == winner_id), None)
            loser = next((p for p in self.players if p["user_id"] != winner_id), None)
            
            return {
                "status": "finished",
                "winner": winner,
                "loser": loser,
                "winner_score": scores[0][1],
                "loser_score": scores[1][1]
            }
        
        return {"status": "no_result"}


class BattleService:
    """对战服务"""
    
    def __init__(self):
        self.waiting_queue: List[Dict] = []  # 等待匹配的玩家队列
        self.active_rooms: Dict[str, BattleRoom] = {}  # room_id -> BattleRoom
        self.user_rooms: Dict[int, str] = {}  # user_id -> room_id
        
    def join_queue(self, user_id: int, username: str, level: int) -> Dict:
        """加入匹配队列"""
        # 检查是否已在队列中
        if any(p["user_id"] == user_id for p in self.waiting_queue):
            return {"status": "already_in_queue"}
        
        # 检查是否已在房间中
        if user_id in self.user_rooms:
            return {"status": "already_in_room", "room_id": self.user_rooms[user_id]}
        
        # 添加到队列
        player = {
            "user_id": user_id,
            "username": username,
            "level": level,
            "join_time": utc_now()
        }
        self.waiting_queue.append(player)
        
        # 尝试匹配
        match_result = self._try_match()
        if match_result:
            return match_result
        
        return {"status": "waiting"}
    
    def leave_queue(self, user_id: int):
        """离开匹配队列"""
        self.waiting_queue = [p for p in self.waiting_queue if p["user_id"] != user_id]
    
    def _try_match(self) -> Optional[Dict]:
        """尝试匹配玩家"""
        if len(self.waiting_queue) < 2:
            return None
        
        # 简单匹配：取前两个玩家
        player1 = self.waiting_queue.pop(0)
        player2 = self.waiting_queue.pop(0)
        
        # 创建房间
        room_id = f"room_{utc_now().timestamp()}"
        room = BattleRoom(room_id)
        
        room.add_player(player1["user_id"], player1["username"], player1["level"])
        room.add_player(player2["user_id"], player2["username"], player2["level"])
        
        self.active_rooms[room_id] = room
        self.user_rooms[player1["user_id"]] = room_id
        self.user_rooms[player2["user_id"]] = room_id
        
        return {
            "status": "matched",
            "room_id": room_id,
            "players": room.players
        }
    
    def get_room(self, room_id: str) -> Optional[BattleRoom]:
        """获取房间"""
        return self.active_rooms.get(room_id)
    
    def get_user_room(self, user_id: int) -> Optional[BattleRoom]:
        """获取用户所在房间"""
        room_id = self.user_rooms.get(user_id)
        if room_id:
            return self.active_rooms.get(room_id)
        return None
    
    def leave_room(self, user_id: int):
        """离开房间"""
        room_id = self.user_rooms.pop(user_id, None)
        if room_id:
            room = self.active_rooms.get(room_id)
            if room:
                room.remove_player(user_id)
                
                # 如果房间空了，删除房间
                if len(room.players) == 0:
                    del self.active_rooms[room_id]

# 全局服务实例
battle_service = BattleService()









