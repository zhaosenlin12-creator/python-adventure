"""
排行榜接口安全回归测试
"""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

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
        "challenge_id": f"unauth-{uuid4().hex[:8]}",
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
        "challenge_id": f"forbid-{uuid4().hex[:8]}",
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


def test_leaderboard_submit_accepts_current_user():
    token, current_user_id = _create_user_and_login()
    payload = {
        "user_id": current_user_id,
        "challenge_id": f"ok-{uuid4().hex[:8]}",
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
    assert resp.json().get("success") is True
