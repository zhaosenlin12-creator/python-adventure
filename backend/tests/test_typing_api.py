from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app


client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function():
    Base.metadata.drop_all(bind=engine)


def test_typing_scores_are_database_backed_and_user_history_is_synced():
    session_response = client.post(
        "/api/typing/session",
        json={
            "token": "typing-test-token",
            "source": "school",
            "username": "student-a",
            "user": {"id": 42, "username": "student-a"},
        },
    )
    assert session_response.status_code == 200, session_response.text
    assert session_response.json()["token"] == "typing-test-token"

    score_response = client.post(
        "/api/typing/scores",
        json={
            "token": "typing-test-token",
            "user_id": "42",
            "username": "student-a",
            "mode": "lesson",
            "title": "home row",
            "speed": 86,
            "accuracy": 98,
            "chars": 120,
            "seconds": 84,
            "date": "2026-05-04T08:00:00Z",
        },
    )
    assert score_response.status_code == 200, score_response.text
    payload = score_response.json()
    assert payload["score"]["username"] == "student-a"
    assert "token" not in payload["score"]
    assert payload["rankings"][0]["title"] == "home row"
    assert "token" not in payload["rankings"][0]
    assert payload["history"][0]["title"] == "home row"
    assert "token" not in payload["history"][0]

    history_response = client.get("/api/typing/history?token=typing-test-token&limit=20")
    assert history_response.status_code == 200, history_response.text
    history = history_response.json()["history"]
    assert len(history) == 1
    assert history[0]["user_id"] == "42"
    assert history[0]["speed"] == 86

    rankings_response = client.get("/api/typing/rankings?limit=10")
    assert rankings_response.status_code == 200, rankings_response.text
    assert rankings_response.json()["rankings"][0]["username"] == "student-a"

    assert client.get("/api/typing/history", params={"user_id": "42"}).json()["history"] == []


def test_typing_settings_are_saved_to_database_by_token():
    client.post(
        "/api/typing/session",
        json={"token": "settings-token", "username": "student-b", "user": {"id": 7, "username": "student-b"}},
    )

    save_response = client.post(
        "/api/typing/settings",
        json={"token": "settings-token", "settings": {"showKeyboard": False, "speechRate": 1.05}},
    )
    assert save_response.status_code == 200, save_response.text

    load_response = client.get("/api/typing/settings?token=settings-token")
    assert load_response.status_code == 200, load_response.text
    assert load_response.json()["settings"] == {"showKeyboard": False, "speechRate": 1.05}



def test_typing_speed_test_endpoint_records_global_rank_and_personal_best():
    client.post(
        "/api/typing/session",
        json={
            "token": "speed-test-token-1",
            "username": "runner-1",
            "user": {"id": 1001, "username": "runner-1"},
        },
    )

    first = client.post(
        "/api/typing/lesson/speed-test",
        json={
            "token": "speed-test-token-1",
            "user_id": "1001",
            "username": "runner-1",
            "title": "60s 中文测速",
            "speed": 220,
            "accuracy": 96.5,
            "chars": 180,
            "seconds": 60,
            "wpm": 38,
            "date": "2026-05-12T10:00:00Z",
        },
    )
    assert first.status_code == 200, first.text
    payload = first.json()
    assert payload["ok"] is True
    assert payload["score"]["mode"] == "speed-test"
    assert payload["score"]["speed"] == 220
    assert payload["global_rank"] == 1
    assert payload["personal_best_speed"] == 220
    assert payload["total_speed_tests"] == 1
    assert payload["extra"]["wpm"] == 38

    second = client.post(
        "/api/typing/lesson/speed-test",
        json={
            "token": "speed-test-token-1",
            "user_id": "1001",
            "username": "runner-1",
            "title": "60s 中文测速",
            "speed": 260,
            "accuracy": 95.0,
            "chars": 220,
            "seconds": 60,
            "wpm": 45,
        },
    )
    payload = second.json()
    assert payload["score"]["speed"] == 260
    assert payload["global_rank"] == 1
    assert payload["personal_best_speed"] == 260
    assert payload["total_speed_tests"] == 2

    client.post(
        "/api/typing/session",
        json={
            "token": "speed-test-token-2",
            "username": "runner-2",
            "user": {"id": 1002, "username": "runner-2"},
        },
    )
    third = client.post(
        "/api/typing/lesson/speed-test",
        json={
            "token": "speed-test-token-2",
            "user_id": "1002",
            "username": "runner-2",
            "title": "60s 中文测速",
            "speed": 300,
            "accuracy": 99.0,
            "chars": 300,
            "seconds": 60,
            "wpm": 52,
        },
    )
    payload = third.json()
    assert payload["global_rank"] == 1
    assert payload["personal_best_speed"] == 300

    rank_response = client.get(
        "/api/typing/user/speed-test-rank",
        params={"token": "speed-test-token-1", "limit": 5},
    )
    assert rank_response.status_code == 200, rank_response.text
    rank_payload = rank_response.json()
    assert rank_payload["ok"] is True
    assert rank_payload["user"]["user_id"] == "1001"
    assert rank_payload["best_speed"] == 260
    assert rank_payload["best_accuracy"] == 95.0
    assert rank_payload["best_title"] == "60s 中文测速"
    assert rank_payload["total"] == 2
    assert rank_payload["rank"] == 2

    fallback = client.post(
        "/api/typing/lesson/speed-test",
        json={
            "token": "speed-test-token-1",
            "user_id": "1001",
            "username": "runner-1",
            "title": "120s 中文测速",
            "chars": 240,
            "seconds": 120,
            "accuracy": 92,
            "wpm": 20,
        },
    )
    assert fallback.status_code == 200, fallback.text
    payload = fallback.json()
    assert payload["score"]["speed"] == 120.0
