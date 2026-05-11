from __future__ import annotations

import time

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _register_and_login() -> tuple[str, str]:
    username = f"coin_cr_{int(time.time() * 1000)}"
    password = "test123456"
    register_payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": password,
    }
    register = client.post("/api/v1/auth/register", json=register_payload)
    assert register.status_code == 201, register.text

    login = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return token, username


def test_code_research_coin_source_is_allowed_and_idempotent():
    token, _ = _register_and_login()
    headers = {"Authorization": f"Bearer {token}"}

    initial_balance = client.get("/api/v1/coins/balance", headers=headers)
    assert initial_balance.status_code == 200, initial_balance.text
    initial_coins = initial_balance.json()["coins"]

    payload = {
        "amount": 128,
        "type": "earn",
        "source": "code_research",
        "description": "Code Research: terminal omega",
        "transaction_id": "code_research_first_clear_1_terminal_omega_28",
    }
    first_reward = client.post("/api/v1/coins/add", json=payload, headers=headers)
    assert first_reward.status_code == 200, first_reward.text
    first_body = first_reward.json()
    assert first_body["success"] is True
    assert first_body["balance"] == initial_coins + payload["amount"]

    duplicate_reward = client.post("/api/v1/coins/add", json=payload, headers=headers)
    assert duplicate_reward.status_code == 409, duplicate_reward.text

    final_balance = client.get("/api/v1/coins/balance", headers=headers)
    assert final_balance.status_code == 200, final_balance.text
    assert final_balance.json()["coins"] == initial_coins + payload["amount"]
