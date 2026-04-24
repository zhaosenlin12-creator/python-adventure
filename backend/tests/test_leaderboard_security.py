"""Leaderboard and arena reward regression tests."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.v1.leaderboard import ARENA_DAILY_DIAMOND_LIMIT, ARENA_DIAMOND_REWARDS
from app.core.database import SessionLocal
from app.main import app
from app.models.progress import UserProgress

client = TestClient(app)


def _create_user_and_login():
    suffix = uuid4().hex[:10]
    user = {
        "username": f"lb_sec_{suffix}",
        "email": f"lb_sec_{suffix}@example.com",
        "password": "test123456",
    }
    register_resp = client.post("/api/v1/auth/register", json=user)
    assert register_resp.status_code == 201, register_resp.text

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": user["username"], "password": user["password"]},
    )
    assert login_resp.status_code == 200, login_resp.text
    body = login_resp.json()
    return body["access_token"], body["user"]["id"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_leaderboard_submit_requires_authentication():
    payload = {
        "user_id": 1,
        "challenge_id": "arena_easy_print_greeting",
        "score": 20,
        "time_used": 40,
        "code_length": 120,
    }
    resp = client.post("/api/v1/leaderboard/submit", json=payload)
    assert resp.status_code == 401


def test_leaderboard_submit_forbids_other_user_submission():
    token, current_user_id = _create_user_and_login()
    payload = {
        "user_id": current_user_id + 99999,
        "challenge_id": "arena_easy_print_greeting",
        "score": 30,
        "time_used": 50,
        "code_length": 130,
    }
    resp = client.post(
        "/api/v1/leaderboard/submit",
        headers=_auth_headers(token),
        json=payload,
    )
    assert resp.status_code == 403


def test_leaderboard_submit_accepts_current_user_and_returns_diamonds():
    token, current_user_id = _create_user_and_login()
    easy_min, easy_max = ARENA_DIAMOND_REWARDS["easy"]
    payload = {
        "user_id": current_user_id,
        "challenge_id": "arena_easy_print_greeting",
        "score": 35,
        "time_used": 45,
        "code_length": 140,
    }
    resp = client.post(
        "/api/v1/leaderboard/submit",
        headers=_auth_headers(token),
        json=payload,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True
    assert easy_min <= body["diamonds_earned"] <= easy_max
    assert body["diamond_awarded"] is True
    assert body["daily_reward_claims_used"] == 1
    assert body["daily_reward_remaining"] == ARENA_DAILY_DIAMOND_LIMIT - 1


def test_leaderboard_submit_caps_daily_diamond_rewards_at_one_hundred():
    token, current_user_id = _create_user_and_login()
    medium_min, medium_max = ARENA_DIAMOND_REWARDS["medium"]
    total_diamonds = 0

    for index in range(ARENA_DAILY_DIAMOND_LIMIT):
        resp = client.post(
            "/api/v1/leaderboard/submit",
            headers=_auth_headers(token),
            json={
                "user_id": current_user_id,
                "challenge_id": "arena_medium_sum_range",
                "score": 180 + index,
                "time_used": 35,
                "code_length": 120 + index,
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["diamond_awarded"] is True
        assert medium_min <= body["diamonds_earned"] <= medium_max
        assert body["reward_marker"] is not None
        total_diamonds += body["diamonds_earned"]

    capped_resp = client.post(
        "/api/v1/leaderboard/submit",
        headers=_auth_headers(token),
        json={
            "user_id": current_user_id,
            "challenge_id": "arena_hard_factorial",
            "score": 320,
            "time_used": 25,
            "code_length": 999,
        },
    )
    assert capped_resp.status_code == 200, capped_resp.text
    capped_body = capped_resp.json()
    assert capped_body["diamonds_earned"] == 0
    assert capped_body["diamond_awarded"] is False
    assert capped_body["reward_marker"] is None
    assert capped_body["daily_reward_claims_used"] == ARENA_DAILY_DIAMOND_LIMIT
    assert capped_body["daily_reward_remaining"] == 0

    session = SessionLocal()
    try:
        user_progress = session.query(UserProgress).filter(UserProgress.user_id == current_user_id).one()
        assert user_progress.coins == total_diamonds
        reward_markers = [
            entry
            for entry in user_progress.get_completed_challenges()
            if entry.startswith("arena_reward_claim:")
        ]
        assert len(reward_markers) == ARENA_DAILY_DIAMOND_LIMIT
    finally:
        session.close()


def test_progress_save_preserves_arena_reward_markers():
    token, current_user_id = _create_user_and_login()
    submit_resp = client.post(
        "/api/v1/leaderboard/submit",
        headers=_auth_headers(token),
        json={
            "user_id": current_user_id,
            "challenge_id": "arena_easy_print_greeting",
            "score": 40,
            "time_used": 30,
            "code_length": 123,
        },
    )
    assert submit_resp.status_code == 200, submit_resp.text
    reward_marker = submit_resp.json()["reward_marker"]
    assert reward_marker

    session = SessionLocal()
    try:
        user_progress = session.query(UserProgress).filter(UserProgress.user_id == current_user_id).one()
        current_diamonds = user_progress.coins
        arena_score = user_progress.arena_score
        arena_high_score = user_progress.arena_high_score
    finally:
        session.close()

    save_resp = client.post(
        "/api/v1/progress/save",
        headers=_auth_headers(token),
        json={
            "level": 1,
            "experience": 0,
            "coins": current_diamonds,
            "completed_levels": [],
            "skills": [],
            "inventory": [],
            "has_key": False,
            "arena_score": arena_score,
            "arena_high_score": arena_high_score,
            "completed_challenges": ["arena_manual_marker"],
            "completed_campaigns": [],
            "completed_campaign_levels": [],
            "campaign_progress": {},
            "age_group_campaign_progress": {},
        },
    )
    assert save_resp.status_code == 200, save_resp.text
    body = save_resp.json()
    assert "arena_manual_marker" in body["completed_challenges"]
    assert reward_marker in body["completed_challenges"]
