from __future__ import annotations

import time

from fastapi.testclient import TestClient
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


def test_public_password_reset_is_disabled_and_preserves_credentials():
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
    assert reset.status_code == 403, reset.text
    assert "联系教师或管理员" in reset.json()["detail"]

    login_with_old_password = login_user(user["username"], user["password"])
    assert login_with_old_password["status_code"] == 200, login_with_old_password["text"]

    profile_with_old_token = client.get(
        "/api/v1/users/profile",
        headers={"Authorization": f"Bearer {old_token}"},
    )
    assert profile_with_old_token.status_code == 200, profile_with_old_token.text


def test_public_password_reset_does_not_reveal_account_existence():
    existing_username = unique_username("existing_reset_user")
    missing_username = unique_username("missing_reset_user")
    register_user(existing_username)

    existing_response = client.post(
        "/api/v1/auth/reset-password",
        json={"username": existing_username},
    )
    missing_response = client.post(
        "/api/v1/auth/reset-password",
        json={"username": missing_username},
    )

    assert existing_response.status_code == 403, existing_response.text
    assert missing_response.status_code == 403, missing_response.text
    assert existing_response.json()["detail"] == missing_response.json()["detail"]
    assert existing_response.json()["success"] is False
    assert missing_response.json()["success"] is False
