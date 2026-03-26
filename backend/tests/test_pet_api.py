"""
宠物系统 API 功能测试（与当前后端契约对齐）
"""
from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_sqlite_db_path
from app.core.time import utc_now
from app.main import app

client = TestClient(app)

TEST_USER = {
    "username": "test_pet_user",
    "email": "test_pet_user@example.com",
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


def _query_one(sql: str, params: tuple = ()):
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute(sql, params)
    row = cursor.fetchone()
    conn.close()
    return row


def _set_food_inventory(username: str, food_id: str, quantity: int) -> None:
    user_row = _query_one("SELECT id FROM users WHERE username = ?", (username,))
    assert user_row is not None
    user_id = user_row[0]
    now = utc_now().isoformat()

    _exec_sql(
        """
        CREATE TABLE IF NOT EXISTS food_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            food_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, food_id)
        )
        """
    )
    _exec_sql(
        """
        INSERT INTO food_inventory (user_id, food_id, quantity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, food_id) DO UPDATE
        SET quantity = excluded.quantity,
            updated_at = excluded.updated_at
        """,
        (user_id, food_id, quantity, now, now),
    )


def _create_pet(
    token: str,
    *,
    name: str = "小柴",
    pet_type: str = "dog_shiba",
    pet_style: str = "cute",
):
    return client.post(
        "/api/v1/pets/create",
        headers=_headers(token),
        json={"name": name, "pet_type": pet_type, "pet_style": pet_style},
    )


def _set_pet_fields(pet_id: int, **kwargs) -> None:
    if not kwargs:
        return
    assignments = ", ".join(f"{k} = ?" for k in kwargs.keys())
    values = tuple(kwargs.values()) + (pet_id,)
    _exec_sql(f"UPDATE pets SET {assignments} WHERE id = ?", values)


@pytest.fixture
def auth_token():
    """获取测试用户认证 token"""
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
    """清理测试用户宠物数据"""
    _exec_sql(
        "UPDATE users SET current_pet_id = NULL WHERE username = ?",
        (TEST_USER["username"],),
    )
    _exec_sql(
        "DELETE FROM pets WHERE user_id IN (SELECT id FROM users WHERE username = ?)",
        (TEST_USER["username"],),
    )
    yield
    _exec_sql(
        "UPDATE users SET current_pet_id = NULL WHERE username = ?",
        (TEST_USER["username"],),
    )
    _exec_sql(
        "DELETE FROM pets WHERE user_id IN (SELECT id FROM users WHERE username = ?)",
        (TEST_USER["username"],),
    )


class TestPetCreation:
    def test_create_first_pet(self, auth_token, clean_pets):
        response = _create_pet(auth_token, name="小柴", pet_type="dog_shiba", pet_style="cute")
        assert response.status_code == 200, response.text

        pet = response.json()["pet"]
        assert pet["name"] == "小柴"
        assert pet["petType"] == "dog_shiba"
        assert pet["petStyle"] == "cute"
        assert pet["level"] == 1
        assert pet["exp"] == 0
        assert pet["status"] == "normal"
        assert pet["isEgg"] is False

    def test_create_first_pet_sets_current_pet_id(self, auth_token, clean_pets):
        response = _create_pet(auth_token, name="棣栧彧", pet_type="dog_shiba", pet_style="cute")
        assert response.status_code == 200, response.text

        created_pet = response.json()["pet"]
        row = _query_one(
            "SELECT current_pet_id FROM users WHERE username = ?",
            (TEST_USER["username"],),
        )
        assert row is not None
        assert row[0] == created_pet["id"]

    def test_create_multiple_pets(self, auth_token, clean_pets):
        r1 = _create_pet(auth_token, name="小柴", pet_type="dog_shiba", pet_style="cute")
        r2 = _create_pet(auth_token, name="小机", pet_type="tech_bot", pet_style="tech")
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, r2.text

        response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        assert response.status_code == 200, response.text
        pets = response.json()["pets"]
        assert len(pets) == 2
        assert {p["petType"] for p in pets} == {"dog_shiba", "tech_bot"}

    def test_create_pet_without_auth(self):
        response = client.post(
            "/api/v1/pets/create",
            json={"name": "小柴", "pet_type": "dog_shiba", "pet_style": "cute"},
        )
        assert response.status_code == 401


class TestPetRetrieval:
    def test_get_my_pets_auto_egg_when_empty(self, auth_token, clean_pets):
        response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        assert response.status_code == 200, response.text
        pets = response.json()["pets"]
        assert len(pets) == 1
        assert pets[0]["isEgg"] is True

    def test_get_my_pets_with_data(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小柴")
        assert create_response.status_code == 200, create_response.text

        response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        assert response.status_code == 200
        pets = response.json()["pets"]
        assert len(pets) == 1
        assert pets[0]["name"] == "小柴"


class TestPetFeeding:
    def test_feed_pet_success(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        response = client.put(
            f"/api/v1/pets/{pet_id}/feed",
            headers=_headers(auth_token),
            json={},
        )
        assert response.status_code == 200, response.text
        pet = response.json()["pet"]
        assert pet["exp"] == 10
        assert pet["lastFeedTime"] is not None

    def test_feed_nonexistent_pet(self, auth_token, clean_pets):
        response = client.put(
            "/api/v1/pets/99999/feed",
            headers=_headers(auth_token),
            json={},
        )
        assert response.status_code == 404

    def test_feed_pet_multiple_times(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        r1 = client.put(f"/api/v1/pets/{pet_id}/feed", headers=_headers(auth_token), json={})
        r2 = client.put(f"/api/v1/pets/{pet_id}/feed", headers=_headers(auth_token), json={})
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.json()["pet"]["exp"] == r1.json()["pet"]["exp"] + 10

    def test_feed_food_inventory_is_atomic_under_concurrency(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]
        _set_food_inventory(TEST_USER["username"], "apple", 1)

        def _feed_once():
            with TestClient(app) as thread_client:
                return thread_client.put(
                    f"/api/v1/pets/{pet_id}/feed",
                    headers=_headers(auth_token),
                    json={"food_id": "apple", "quantity": 1},
                )

        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = [future.result() for future in [executor.submit(_feed_once), executor.submit(_feed_once)]]

        assert sorted(response.status_code for response in responses) == [200, 400]

        remaining = _query_one(
            "SELECT quantity FROM food_inventory WHERE user_id IN (SELECT id FROM users WHERE username = ?) AND food_id = ?",
            (TEST_USER["username"], "apple"),
        )
        assert remaining is not None
        assert remaining[0] == 0

        pet_state = _query_one("SELECT exp, intimacy FROM pets WHERE id = ?", (pet_id,))
        assert pet_state is not None
        assert pet_state[0] == 10
        assert pet_state[1] == 1


class TestPetStatus:
    def test_normal_status(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        response = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        assert response.status_code == 200
        assert response.json()["pet"]["status"] == "normal"

    def test_tired_status(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        three_days_ago = (utc_now() - timedelta(days=3)).isoformat()
        _set_pet_fields(pet_id, last_feed_time=three_days_ago)

        response = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        assert response.status_code == 200
        assert response.json()["status"] == "tired"

    def test_coma_status(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        seven_days_ago = (utc_now() - timedelta(days=7)).isoformat()
        _set_pet_fields(pet_id, last_feed_time=seven_days_ago)

        response = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        assert response.status_code == 200
        assert response.json()["status"] == "coma"


class TestPetLevelUp:
    def test_level_up_at_100_exp(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token)
        pet_id = create_response.json()["pet"]["id"]

        for _ in range(10):
            response = client.put(
                f"/api/v1/pets/{pet_id}/feed",
                headers=_headers(auth_token),
                json={},
            )
            assert response.status_code == 200

        status = client.get(f"/api/v1/pets/{pet_id}/status", headers=_headers(auth_token))
        pet = status.json()["pet"]
        assert pet["level"] == 2
        assert pet["exp"] == 0


class TestPetEvolution:
    def test_cannot_evolve_at_level_1(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小猫", pet_type="cute_cat", pet_style="cute")
        pet_id = create_response.json()["pet"]["id"]

        response = client.post(f"/api/v1/pets/{pet_id}/evolve", headers=_headers(auth_token))
        assert response.status_code == 400
        assert "level" in response.json()["detail"].lower()

    def test_evolve_to_stage_2_at_level_5(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小猫", pet_type="cute_cat", pet_style="cute")
        pet_id = create_response.json()["pet"]["id"]

        _set_pet_fields(
            pet_id,
            level=5,
            intimacy=30,
            intelligence=10,
            creativity=10,
            persistence=10,
            evolution_stage=1,
        )

        response = client.post(f"/api/v1/pets/{pet_id}/evolve", headers=_headers(auth_token))
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["pet"]["evolution_stage"] == 2
        assert data["rewards"]["coins"] == 100
        assert data["rewards"]["attribute_bonus"] == 5

    def test_cannot_evolve_without_intimacy(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小猫", pet_type="cute_cat", pet_style="cute")
        pet_id = create_response.json()["pet"]["id"]

        _set_pet_fields(pet_id, level=5, intimacy=20, evolution_stage=1)

        response = client.post(f"/api/v1/pets/{pet_id}/evolve", headers=_headers(auth_token))
        assert response.status_code == 400
        assert "intimacy" in response.json()["detail"].lower()

    def test_evolve_to_stage_3_at_level_15(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小猫", pet_type="cute_cat", pet_style="cute")
        pet_id = create_response.json()["pet"]["id"]

        _set_pet_fields(
            pet_id,
            level=15,
            intimacy=80,
            intelligence=20,
            creativity=15,
            persistence=15,
            evolution_stage=2,
        )

        response = client.post(f"/api/v1/pets/{pet_id}/evolve", headers=_headers(auth_token))
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["pet"]["evolution_stage"] == 3
        assert data["rewards"]["coins"] == 300
        assert data["rewards"]["attribute_bonus"] == 10

    def test_evolution_creates_growth_log(self, auth_token, clean_pets):
        create_response = _create_pet(auth_token, name="小猫", pet_type="cute_cat", pet_style="cute")
        pet_id = create_response.json()["pet"]["id"]

        _set_pet_fields(
            pet_id,
            level=5,
            intimacy=30,
            intelligence=10,
            creativity=10,
            persistence=10,
            evolution_stage=1,
        )

        response = client.post(f"/api/v1/pets/{pet_id}/evolve", headers=_headers(auth_token))
        assert response.status_code == 200

        log = _query_one(
            "SELECT id FROM pet_growth_logs WHERE pet_id = ? AND event_type = 'evolved'",
            (pet_id,),
        )
        assert log is not None


class TestPetSelectionContracts:
    def test_create_new_mythic_pet(self, auth_token, clean_pets):
        response = _create_pet(
            auth_token,
            name="白云",
            pet_type="snow_cat",
            pet_style="mythic",
        )
        assert response.status_code == 200, response.text

        pet = response.json()["pet"]
        assert pet["petType"] == "snow_cat"
        assert pet["petStyle"] == "mythic"
        assert pet["isEgg"] is False

    def test_reject_mismatched_style_for_pet_type(self, auth_token, clean_pets):
        response = _create_pet(
            auth_token,
            name="错配",
            pet_type="snow_cat",
            pet_style="cute",
        )
        assert response.status_code == 400, response.text
        assert "style" in response.json()["detail"].lower()

    def test_hatch_new_mythic_pet(self, auth_token, clean_pets):
        egg_response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        assert egg_response.status_code == 200, egg_response.text
        egg_pet = egg_response.json()["pets"][0]
        assert egg_pet["isEgg"] is True

        _set_pet_fields(egg_pet["id"], hatch_progress=3)

        hatch_response = client.post(
            f"/api/v1/pets/{egg_pet['id']}/hatch",
            headers=_headers(auth_token),
            json={
                "petType": "giraffe_oracle",
                "petStyle": "mythic",
                "name": "长颈队长",
            },
        )
        assert hatch_response.status_code == 200, hatch_response.text

        pet = hatch_response.json()["pet"]
        assert pet["petType"] == "giraffe_oracle"
        assert pet["petStyle"] == "mythic"
        assert pet["isEgg"] is False

    def test_set_active_pet_updates_server_authority(self, auth_token, clean_pets):
        first = _create_pet(auth_token, name="绗竴鍙?", pet_type="dog_shiba", pet_style="cute")
        second = _create_pet(auth_token, name="绗簩鍙?", pet_type="tech_bot", pet_style="tech")
        assert first.status_code == 200, first.text
        assert second.status_code == 200, second.text

        second_pet = second.json()["pet"]
        set_active = client.post(
            f"/api/v1/pets/{second_pet['id']}/set-active",
            headers=_headers(auth_token),
        )
        assert set_active.status_code == 200, set_active.text
        assert set_active.json()["current_pet_id"] == second_pet["id"]

        pets_response = client.get("/api/v1/pets/my", headers=_headers(auth_token))
        assert pets_response.status_code == 200, pets_response.text
        payload = pets_response.json()
        assert payload["current_pet_id"] == second_pet["id"]
        assert payload["pet"]["id"] == second_pet["id"]
