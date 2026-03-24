"""
Leaderboard data verification script
Usage: python scripts/verify_leaderboard_data.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        total_users = db.query(User.id).count()
        arena_users = db.query(User.id).filter(User.arena_score > 0).count()

        top_arena = (
            db.query(User.username, User.arena_score, User.arena_high_score)
            .order_by(User.arena_score.desc(), User.arena_high_score.desc())
            .limit(5)
            .all()
        )
        top_global = (
            db.query(User.username, User.level, User.experience)
            .order_by(User.experience.desc(), User.level.desc())
            .limit(5)
            .all()
        )

        print("=== Leaderboard Data Check ===")
        print(f"Total users: {total_users}")
        print(f"Arena score > 0 users: {arena_users}")
        print("\nTop 5 Arena:")
        for i, (username, arena_score, arena_high_score) in enumerate(top_arena, 1):
            print(f"{i}. {username} | score={arena_score} | high={arena_high_score}")
        print("\nTop 5 Global (Experience):")
        for i, (username, level, experience) in enumerate(top_global, 1):
            print(f"{i}. {username} | lvl={level} | exp={experience}")
        print("==============================")
    finally:
        db.close()


if __name__ == "__main__":
    main()
