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
    assert payload["rankings"][0]["title"] == "home row"
    assert payload["history"][0]["title"] == "home row"

    history_response = client.get("/api/typing/history?token=typing-test-token&limit=20")
    assert history_response.status_code == 200, history_response.text
    history = history_response.json()["history"]
    assert len(history) == 1
    assert history[0]["user_id"] == "42"
    assert history[0]["speed"] == 86

    rankings_response = client.get("/api/typing/rankings?limit=10")
    assert rankings_response.status_code == 200, rankings_response.text
    assert rankings_response.json()["rankings"][0]["username"] == "student-a"


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
