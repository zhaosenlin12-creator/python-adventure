"""
宠物系统后端性能测试（与当前 API 契约对齐）
"""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_sqlite_db_path
from app.main import app

client = TestClient(app)

TEST_USER = {
    "username": "perf_test_user",
    "email": "perf_test_user@example.com",
    "password": "test123456",
}

DB_PATH = Path(get_sqlite_db_path() or (Path(__file__).resolve().parents[1] / "code_adventure.db"))


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _exec_sql(sql: str, params: tuple = ()) -> None:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    conn.close()


def _create_pet(token: str, name: str = "小柴"):
    return client.post(
        "/api/v1/pets/create",
        headers=_headers(token),
        json={"name": name, "pet_type": "dog_shiba", "pet_style": "cute"},
    )


@pytest.fixture
def auth_token():
    register = client.post("/api/v1/auth/register", json=TEST_USER)
    assert register.status_code in (201, 400), register.text

    login = client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USER["username"], "password": TEST_USER["password"]},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


@pytest.fixture
def clean_pets(auth_token):
    _exec_sql(
        "DELETE FROM pets WHERE user_id IN (SELECT id FROM users WHERE username = ?)",
        (TEST_USER["username"],),
    )
    yield
    _exec_sql(
        "DELETE FROM pets WHERE user_id IN (SELECT id FROM users WHERE username = ?)",
        (TEST_USER["username"],),
    )


class TestAPIResponseTime:
    def test_create_pet_performance(self, auth_token, clean_pets):
        start = time.perf_counter()
        response = _create_pet(auth_token)
        duration_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200, response.text
        assert duration_ms < 300, f"Create pet took {duration_ms:.2f}ms, expected < 300ms"

    def test_get_pets_performance(self, auth_token, clean_pets):
        for i in range(5):
            response = _create_pet(auth_token, name=f"Pet {i}")
            assert response.status_code == 200

        start = time.perf_counter()
        response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        duration_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 300, f"Get pets took {duration_ms:.2f}ms, expected < 300ms"

    def test_feed_pet_performance(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        start = time.perf_counter()
        response = client.put(
            f"/api/v1/pets/{pet_id}/feed",
            headers=_headers(auth_token),
            json={},
        )
        duration_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 300, f"Feed pet took {duration_ms:.2f}ms, expected < 300ms"

    def test_get_status_performance(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        start = time.perf_counter()
        response = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        duration_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200
        assert duration_ms < 300, f"Get status took {duration_ms:.2f}ms, expected < 300ms"


class TestBatchAndStability:
    def test_bulk_create_average_latency(self, auth_token, clean_pets):
        start = time.perf_counter()

        for i in range(10):
            response = _create_pet(auth_token, name=f"Pet {i}")
            assert response.status_code == 200

        duration_ms = (time.perf_counter() - start) * 1000
        avg_ms = duration_ms / 10
        assert avg_ms < 300, f"Average create latency {avg_ms:.2f}ms, expected < 300ms"

    def test_rapid_feed_average_latency(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        start = time.perf_counter()
        for _ in range(10):
            response = client.put(
                f"/api/v1/pets/{pet_id}/feed",
                headers=_headers(auth_token),
                json={},
            )
            assert response.status_code == 200

        duration_ms = (time.perf_counter() - start) * 1000
        avg_ms = duration_ms / 10
        assert avg_ms < 300, f"Average feed latency {avg_ms:.2f}ms, expected < 300ms"

    def test_consecutive_reads_stability(self, auth_token, clean_pets):
        for i in range(5):
            response = _create_pet(auth_token, name=f"Pet {i}")
            assert response.status_code == 200

        start = time.perf_counter()
        for _ in range(20):
            response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
            assert response.status_code == 200
        duration_ms = (time.perf_counter() - start) * 1000
        avg_ms = duration_ms / 20

        assert avg_ms < 200, f"Average read latency {avg_ms:.2f}ms, expected < 200ms"

    def test_long_run_feed_stability(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        for _ in range(100):
            response = client.put(
                f"/api/v1/pets/{pet_id}/feed",
                headers=_headers(auth_token),
                json={},
            )
            assert response.status_code == 200

        status = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        assert status.status_code == 200
        pet = status.json()["pet"]
        assert pet["level"] == 11
        assert pet["exp"] == 0
