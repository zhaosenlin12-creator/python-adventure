from __future__ import annotations

import time

from fastapi.testclient import TestClient
import pytest

from app.api.v1.auth import _password_reset_cooldowns
from app.main import app

client = TestClient(app)


def unique_username(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}"


def register_user(username: str, password: str = "test123456") -> dict[str, str]:
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": password,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return payload


def login_user(username: str, password: str) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    return {
        "status_code": response.status_code,
        "json": response.json() if response.headers.get("content-type", "").startswith("application/json") else {},
        "text": response.text,
    }


@pytest.fixture(autouse=True)
def clear_reset_cooldowns():
    _password_reset_cooldowns.clear()
    yield
    _password_reset_cooldowns.clear()


def test_reset_password_replaces_old_password_and_invalidates_old_token():
    user = register_user(unique_username("reset_user"))

    login_before = login_user(user["username"], user["password"])
    assert login_before["status_code"] == 200, login_before["text"]
    old_token = login_before["json"]["access_token"]

    profile_before = client.get(
        "/api/v1/users/profile",
        headers={"Authorization": f"Bearer {old_token}"},
    )
    assert profile_before.status_code == 200, profile_before.text

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"username": user["username"]},
    )
    assert reset.status_code == 200, reset.text
    assert reset.json()["default_password"] == "123456"

    login_with_old_password = login_user(user["username"], user["password"])
    assert login_with_old_password["status_code"] == 401, login_with_old_password["text"]

    profile_with_old_token = client.get(
        "/api/v1/users/profile",
        headers={"Authorization": f"Bearer {old_token}"},
    )
    assert profile_with_old_token.status_code == 401, profile_with_old_token.text

    login_with_new_password = login_user(user["username"], "123456")
    assert login_with_new_password["status_code"] == 200, login_with_new_password["text"]

    new_token = login_with_new_password["json"]["access_token"]
    profile_with_new_token = client.get(
        "/api/v1/users/profile",
        headers={"Authorization": f"Bearer {new_token}"},
    )
    assert profile_with_new_token.status_code == 200, profile_with_new_token.text


def test_reset_password_has_cooldown_and_rejects_unknown_user():
    username = unique_username("cooldown_user")
    register_user(username)

    first_reset = client.post("/api/v1/auth/reset-password", json={"username": username})
    assert first_reset.status_code == 200, first_reset.text

    second_reset = client.post("/api/v1/auth/reset-password", json={"username": username})
    assert second_reset.status_code == 429, second_reset.text

    missing_user_reset = client.post("/api/v1/auth/reset-password", json={"username": unique_username("missing_user")})
    assert missing_user_reset.status_code == 404, missing_user_reset.text
