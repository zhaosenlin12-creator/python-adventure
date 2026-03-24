from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.battle import BattleRoom, BattleSubmission as BattleSubmissionModel, UserRank
from app.schemas.battle import (
    BattleSubmissionCreate,
    BattleResultResponse,
    UserRankResponse,
    MatchmakingResponse
)
from app.services.battle_service import battle_service
from app.services.sandbox import sandbox_service
import random
import time
from datetime import datetime

router = APIRouter()

@router.post("/queue", response_model=MatchmakingResponse)
async def join_battle_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """加入对战匹配队列"""
    result = battle_service.join_queue(
        user_id=current_user.id,
        username=current_user.username,
        level=current_user.level,
        db=db
    )
    
    # 如果匹配成功，分配任务并创建数据库记录
    if result.get("status") == "matched":
        room_id = result["room_id"]
        room = battle_service.get_room(room_id)
        
        # 随机选择一个适合等级的任务
        tasks = db.query(Task).filter(
            Task.difficulty <= current_user.level
        ).all()
        
        if tasks:
            selected_task = random.choice(tasks)
            
            # 创建数据库记录
            db_room = BattleRoom(
                room_id=room_id,
                player1_id=room['player1']['user_id'],
                player2_id=room['player2']['user_id'],
                task_id=selected_task.id,
                status='in_progress'
            )
            db.add(db_room)
            db.commit()
            
            result["task_id"] = selected_task.id
    
    return MatchmakingResponse(**result)

@router.post("/leave")
async def leave_battle(current_user: User = Depends(get_current_user)):
    """离开匹配队列"""
    battle_service.leave_queue(current_user.id)
    return {"message": "已离开队列"}

@router.get("/status")
async def get_battle_status(current_user: User = Depends(get_current_user)):
    """获取对战状态"""
    # 检查是否在队列中
    in_queue = any(p['user_id'] == current_user.id for p in battle_service.waiting_queue)
    
    if in_queue:
        return {"status": "in_queue"}
    
    # 检查是否在房间中
    for room_id, room in battle_service.active_rooms.items():
        if (room['player1']['user_id'] == current_user.id or 
            room['player2']['user_id'] == current_user.id):
            return {
                "status": "in_room",
                "room_id": room_id,
                "room_status": room['status']
            }
    
    return {"status": "idle"}

@router.post("/submit", response_model=BattleResultResponse)
async def submit_battle_code(
    submission: BattleSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交对战代码"""
    room = battle_service.get_room(submission.room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="房间不存在")
    
    # 获取数据库中的房间记录
    db_room = db.query(BattleRoom).filter(
        BattleRoom.room_id == submission.room_id
    ).first()
    
    if not db_room:
        raise HTTPException(status_code=404, detail="房间记录不存在")
    
    # 获取任务
    task = db.query(Task).filter(Task.id == db_room.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 执行代码
    start_time = time.time()
    execution_result = await sandbox_service.execute_code(
        code=submission.code,
        test_cases=task.test_cases or []
    )
    execution_time = int((time.time() - start_time) * 1000)  # 毫秒
    
    score = sandbox_service.calculate_score(
        execution_result.get("total_tests", 0),
        execution_result.get("passed_tests", 0)
    )
    
    # 保存提交记录
    db_submission = BattleSubmissionModel(
        room_id=submission.room_id,
        user_id=current_user.id,
        code=submission.code,
        score=score,
        execution_time=execution_time,
        passed_tests=execution_result.get("passed_tests", 0),
        total_tests=execution_result.get("total_tests", 0)
    )
    db.add(db_submission)
    
    # 记录到内存中的房间
    is_finished = battle_service.record_submission(
        submission.room_id,
        current_user.id,
        score,
        execution_time
    )
    
    # 更新数据库中的房间记录
    if db_room.player1_id == current_user.id:
        db_room.player1_score = score
        db_room.player1_time = execution_time
    elif db_room.player2_id == current_user.id:
        db_room.player2_score = score
        db_room.player2_time = execution_time
    
    # 如果对战结束，计算结果
    if is_finished:
        winner_id = battle_service.calculate_winner(submission.room_id)
        
        db_room.status = 'finished'
        db_room.winner_id = winner_id
        db_room.finished_at = datetime.utcnow()
        
        # 更新段位
        if winner_id:
            loser_id = db_room.player1_id if winner_id == db_room.player2_id else db_room.player2_id
            winner_gain, loser_loss = battle_service.update_ranks(winner_id, loser_id, db)
        else:
            winner_gain, loser_loss = 0, 0
        
        db.commit()
        
        return BattleResultResponse(
            room_id=submission.room_id,
            winner_id=winner_id,
            player1_id=db_room.player1_id,
            player2_id=db_room.player2_id,
            player1_score=db_room.player1_score,
            player2_score=db_room.player2_score,
            player1_time=db_room.player1_time,
            player2_time=db_room.player2_time,
            player1_rank_change=winner_gain if winner_id == db_room.player1_id else loser_loss,
            player2_rank_change=winner_gain if winner_id == db_room.player2_id else loser_loss
        )
    
    db.commit()
    
    # 返回等待对手的响应
    raise HTTPException(status_code=202, detail="等待对手提交")

@router.get("/rank", response_model=UserRankResponse)
async def get_user_rank(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户段位信息"""
    rank = db.query(UserRank).filter(UserRank.user_id == current_user.id).first()
    
    if not rank:
        # 创建默认段位
        rank = UserRank(user_id=current_user.id)
        db.add(rank)
        db.commit()
        db.refresh(rank)
    
    win_rate = (rank.wins / rank.total_battles * 100) if rank.total_battles > 0 else 0
    
    return UserRankResponse(
        user_id=rank.user_id,
        rank_points=rank.rank_points,
        rank_tier=rank.rank_tier,
        rank_tier_name=rank.get_rank_tier_name(),
        wins=rank.wins,
        losses=rank.losses,
        win_streak=rank.win_streak,
        max_win_streak=rank.max_win_streak,
        total_battles=rank.total_battles,
        win_rate=round(win_rate, 1),
        updated_at=rank.updated_at
    )

@router.get("/leaderboard")
async def get_battle_leaderboard(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取对战排行榜"""
    ranks = db.query(UserRank, User).join(
        User, UserRank.user_id == User.id
    ).order_by(
        UserRank.rank_points.desc()
    ).limit(limit).all()
    
    leaderboard = []
    for rank, user in ranks:
        win_rate = (rank.wins / rank.total_battles * 100) if rank.total_battles > 0 else 0
        leaderboard.append({
            "user_id": user.id,
            "username": user.username,
            "rank_points": rank.rank_points,
            "rank_tier": rank.rank_tier,
            "rank_tier_name": rank.get_rank_tier_name(),
            "wins": rank.wins,
            "losses": rank.losses,
            "win_rate": round(win_rate, 1)
        })
    
    return leaderboard
