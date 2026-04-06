from __future__ import annotations

from datetime import timedelta
import time

from fastapi.testclient import TestClient

from app.api.v1.users import (
    SYSTEM_UPDATE_COMPENSATION_COINS,
    SYSTEM_UPDATE_COMPENSATION_SOURCE,
    SYSTEM_UPDATE_EXISTING_USER_CUTOFF_UTC,
)
from app.core.database import SessionLocal
from app.main import app
from app.models.user import User

client = TestClient(app)


def unique_username(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}"


def register_and_login(username: str, password: str = "test123456") -> dict:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": password,
        },
    )
    assert register_response.status_code == 201, register_response.text

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert login_response.status_code == 200, login_response.text
    return login_response.json()


def set_user_created_at(user_id: int, created_at) -> None:
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        assert user is not None
        user.created_at = created_at
        session.add(user)
        session.commit()
    finally:
        session.close()


def test_existing_user_receives_system_update_compensation_once():
    login = register_and_login(unique_username("system_notice_existing"))
    user_id = login["user"]["id"]
    token = login["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    set_user_created_at(user_id, SYSTEM_UPDATE_EXISTING_USER_CUTOFF_UTC - timedelta(days=3))

    first_response = client.get("/api/v1/users/system-announcements", headers=headers)
    assert first_response.status_code == 200, first_response.text
    first_data = first_response.json()
    assert len(first_data["announcements"]) == 1

    first_notice = first_data["announcements"][0]
    assert first_notice["reward_coins"] == SYSTEM_UPDATE_COMPENSATION_COINS
    assert first_notice["granted_now"] is True

    balance_response = client.get("/api/v1/coins/balance", headers=headers)
    assert balance_response.status_code == 200, balance_response.text
    assert balance_response.json()["coins"] == 100 + SYSTEM_UPDATE_COMPENSATION_COINS

    history_response = client.get("/api/v1/coins/history?limit=10", headers=headers)
    assert history_response.status_code == 200, history_response.text
    system_transactions = [
        transaction
        for transaction in history_response.json()["transactions"]
        if transaction["source"] == SYSTEM_UPDATE_COMPENSATION_SOURCE
    ]
    assert len(system_transactions) == 1
    assert system_transactions[0]["amount"] == SYSTEM_UPDATE_COMPENSATION_COINS

    second_response = client.get("/api/v1/users/system-announcements", headers=headers)
    assert second_response.status_code == 200, second_response.text
    second_notice = second_response.json()["announcements"][0]
    assert second_notice["granted_now"] is False

    second_balance_response = client.get("/api/v1/coins/balance", headers=headers)
    assert second_balance_response.status_code == 200, second_balance_response.text
    assert second_balance_response.json()["coins"] == 100 + SYSTEM_UPDATE_COMPENSATION_COINS


def test_new_user_does_not_receive_system_update_compensation():
    login = register_and_login(unique_username("system_notice_new"))
    token = login["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/users/system-announcements", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["announcements"] == []

    balance_response = client.get("/api/v1/coins/balance", headers=headers)
    assert balance_response.status_code == 200, balance_response.text
    assert balance_response.json()["coins"] == 100
