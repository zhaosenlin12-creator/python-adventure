from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import time

router = APIRouter(tags=["leaderboard"])

# Database connection helper
def get_db_connection():
    conn = sqlite3.connect('../game.db')
    conn.row_factory = sqlite3.Row
    return conn

# Models
class ScoreSubmission(BaseModel):
    user_id: str
    username: str
    challenge_id: str
    score: int
    time_used: int
    code_length: int

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_score: int
    rank: int

# Initialize table if not exists
def init_leaderboard_table():
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS leaderboard (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        total_score INTEGER DEFAULT 0,
        last_updated INTEGER
    )
    ''')
    conn.execute('''
    CREATE TABLE IF NOT EXISTS challenge_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        challenge_id TEXT,
        score INTEGER,
        time_used INTEGER,
        code_length INTEGER,
        timestamp INTEGER,
        FOREIGN KEY(user_id) REFERENCES leaderboard(user_id)
    )
    ''')
    conn.commit()
    conn.close()

# Run initialization
init_leaderboard_table()

@router.get("/global", response_model=List[LeaderboardEntry])
async def get_global_leaderboard(limit: int = 100):
    conn = get_db_connection()
    cursor = conn.execute('''
        SELECT user_id, username, total_score, 
        RANK() OVER (ORDER BY total_score DESC) as rank
        FROM leaderboard
        ORDER BY total_score DESC
        LIMIT ?
    ''', (limit,))
    
    results = []
    for row in cursor.fetchall():
        results.append(dict(row))
    
    conn.close()
    return results

@router.post("/submit")
async def submit_score(submission: ScoreSubmission):
    conn = get_db_connection()
    try:
        current_time = int(time.time())
        
        # 1. Record the individual challenge score
        conn.execute('''
            INSERT INTO challenge_scores 
            (user_id, challenge_id, score, time_used, code_length, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (submission.user_id, submission.challenge_id, submission.score, 
              submission.time_used, submission.code_length, current_time))
        
        # 2. Update or Insert user total score
        # First check if user exists
        user = conn.execute('SELECT total_score FROM leaderboard WHERE user_id = ?', 
                          (submission.user_id,)).fetchone()
        
        if user:
            # Update existing user
            new_total = user['total_score'] + submission.score
            conn.execute('''
                UPDATE leaderboard 
                SET total_score = ?, last_updated = ?
                WHERE user_id = ?
            ''', (new_total, current_time, submission.user_id))
        else:
            # Create new user
            conn.execute('''
                INSERT INTO leaderboard (user_id, username, total_score, last_updated)
                VALUES (?, ?, ?, ?)
            ''', (submission.user_id, submission.username, submission.score, current_time))
            
        conn.commit()
        return {"status": "success", "message": "Score submitted"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/user/{user_id}")
async def get_user_rank(user_id: str):
    conn = get_db_connection()
    # Get rank by counting users with higher scores
    user = conn.execute('SELECT * FROM leaderboard WHERE user_id = ?', (user_id,)).fetchone()
    
    if not user:
        conn.close()
        return {"rank": -1, "total_score": 0}
        
    rank = conn.execute('SELECT COUNT(*) + 1 FROM leaderboard WHERE total_score > ?', 
                       (user['total_score'],)).fetchone()[0]
    
    conn.close()
    return {
        "user_id": user_id,
        "username": user['username'],
        "total_score": user['total_score'],
        "rank": rank
    }
