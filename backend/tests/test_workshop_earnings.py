from datetime import datetime, timedelta

import pytest

from app.core.database import Base, SessionLocal, engine
from app.core.time import utc_now
from app.core.security import get_password_hash
from app.models.coin import CoinTransaction, WorkshopEarning
from app.models.user import User
from app.services.workshop_service import WorkshopEarningsService


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    session.add_all(
        [
            User(
                id=1,
                username="creator",
                email="creator@example.com",
                password_hash=get_password_hash("password123"),
                coins=100,
            ),
            User(
                id=2,
                username="player_one",
                email="player-one@example.com",
                password_hash=get_password_hash("password123"),
                coins=100,
            ),
            User(
                id=3,
                username="player_two",
                email="player-two@example.com",
                password_hash=get_password_hash("password123"),
                coins=100,
            ),
        ]
    )
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


def test_record_play_is_idempotent_per_player_per_day(db):
    first = WorkshopEarningsService.record_play(db, "level-001", creator_id=1, player_id=2)
    second = WorkshopEarningsService.record_play(db, "level-001", creator_id=1, player_id=2)

    creator = db.query(User).filter(User.id == 1).first()
    earning = db.query(WorkshopEarning).filter(WorkshopEarning.level_id == "level-001").one()
    transactions = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == 1, CoinTransaction.source == "workshop_play")
        .all()
    )

    assert first["success"] is True
    assert first["coins_earned"] == WorkshopEarningsService.PLAY_REWARD
    assert second["success"] is False
    assert second["reason"] == "duplicate_transaction"
    assert creator.coins == 100 + WorkshopEarningsService.PLAY_REWARD
    assert earning.play_count == 1
    assert len(transactions) == 1


def test_record_play_and_like_reward_independently(db):
    play_result = WorkshopEarningsService.record_play(db, "level-002", creator_id=1, player_id=2)
    like_result = WorkshopEarningsService.record_like(db, "level-002", creator_id=1, player_id=2)

    creator = db.query(User).filter(User.id == 1).first()
    earning = db.query(WorkshopEarning).filter(WorkshopEarning.level_id == "level-002").one()
    transactions = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == 1, CoinTransaction.type == "workshop_earning")
        .order_by(CoinTransaction.id.asc())
        .all()
    )

    assert play_result["success"] is True
    assert like_result["success"] is True
    assert creator.coins == 100 + WorkshopEarningsService.PLAY_REWARD + WorkshopEarningsService.LIKE_REWARD
    assert earning.play_count == 1
    assert earning.like_count == 1
    assert [transaction.source for transaction in transactions] == ["workshop_play", "workshop_like"]


def test_daily_limit_caps_last_reward_and_blocks_follow_up(db):
    earning = WorkshopEarningsService.get_or_create_earning(db, "level-003", creator_id=1)
    earning.daily_coins = WorkshopEarningsService.DAILY_LIMIT - 3
    db.commit()

    capped = WorkshopEarningsService.record_play(db, "level-003", creator_id=1, player_id=2)
    blocked = WorkshopEarningsService.record_play(db, "level-003", creator_id=1, player_id=3)

    creator = db.query(User).filter(User.id == 1).first()
    refreshed = db.query(WorkshopEarning).filter(WorkshopEarning.level_id == "level-003").one()

    assert capped["success"] is True
    assert capped["coins_earned"] == 3
    assert blocked["success"] is False
    assert blocked["reason"] == "daily_limit_reached"
    assert creator.coins == 103
    assert refreshed.daily_coins == WorkshopEarningsService.DAILY_LIMIT


def test_daily_limit_resets_on_new_day(db):
    earning = WorkshopEarningsService.get_or_create_earning(db, "level-004", creator_id=1)
    earning.daily_coins = WorkshopEarningsService.DAILY_LIMIT
    earning.last_reset_date = utc_now() - timedelta(days=1)
    db.commit()

    result = WorkshopEarningsService.record_play(db, "level-004", creator_id=1, player_id=2)

    refreshed = db.query(WorkshopEarning).filter(WorkshopEarning.level_id == "level-004").one()
    creator = db.query(User).filter(User.id == 1).first()

    assert result["success"] is True
    assert result["coins_earned"] == WorkshopEarningsService.PLAY_REWARD
    assert refreshed.daily_coins == WorkshopEarningsService.PLAY_REWARD
    assert creator.coins == 100 + WorkshopEarningsService.PLAY_REWARD


def test_creator_cannot_farm_own_level(db):
    result = WorkshopEarningsService.record_play(db, "level-005", creator_id=1, player_id=1)

    creator = db.query(User).filter(User.id == 1).first()
    transactions = db.query(CoinTransaction).filter(CoinTransaction.user_id == 1).all()

    assert result["success"] is False
    assert result["reason"] == "creator_self_play"
    assert creator.coins == 100
    assert transactions == []
