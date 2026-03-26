from __future__ import annotations

import time

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.api.v1.pvp_battle_royale import active_rooms, disconnect_cleanup_tasks, ws_connections

client = TestClient(app)


def make_token(username: str) -> str:
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": "test123456",
    }
    register = client.post("/api/v1/auth/register", json=payload)
    assert register.status_code in (201, 400), register.text

    login = client.post(
        "/api/v1/auth/login",
        json={"username": payload["username"], "password": payload["password"]},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def clear_rooms():
    for task in disconnect_cleanup_tasks.values():
        task.cancel()
    active_rooms.clear()
    ws_connections.clear()
    disconnect_cleanup_tasks.clear()
    yield
    for task in disconnect_cleanup_tasks.values():
        task.cancel()
    active_rooms.clear()
    ws_connections.clear()
    disconnect_cleanup_tasks.clear()


def participant_payload(name: str, pet_type: str = "code_kitty") -> dict:
    return {
        "username": name,
        "pet_type": pet_type,
        "pet_name": f"{name}-pet",
        "pet_stage": 5,
        "movement_skills": ["double_jump", "dash"],
        "age_group": "primary-upper",
    }


def test_create_room_requires_auth():
    response = client.post(
        "/api/v1/pvp-br/rooms/create",
        json={
            **participant_payload("anon"),
            "room_name": "anonymous",
            "max_players": 8,
        },
    )
    assert response.status_code == 401


def test_create_and_list_battle_royale_room():
    host_token = make_token("br_host_a")
    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-a"),
            "room_name": "twilight-den",
            "max_players": 12,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    assert room["room_name"] == "twilight-den"
    assert room["participant_count"] == 1
    assert room["humans"][0]["pet_stage"] == 5
    assert room["humans"][0]["movement_skills"] == ["double_jump", "dash"]

    listing = client.get("/api/v1/pvp-br/rooms", headers=auth_headers(host_token))
    assert listing.status_code == 200, listing.text
    rooms = listing.json()["rooms"]
    assert len(rooms) == 1
    assert rooms[0]["id"] == room["id"]
    assert listing.json()["cap"] == 25


def test_join_add_bot_remove_bot_and_start():
    host_token = make_token("br_host_b")
    guest_token = make_token("br_guest_b")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-b", "shiba_debugger"),
            "room_name": "arena-br",
            "max_players": 6,
        },
    )
    room_id = create.json()["room"]["id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("guest-b", "silver_lynx"),
    )
    assert join.status_code == 200, join.text
    assert join.json()["room"]["participant_count"] == 2

    add_bot = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/bots",
        headers=auth_headers(host_token),
        json={"difficulty": "hard"},
    )
    assert add_bot.status_code == 200, add_bot.text
    bot_id = add_bot.json()["bot"]["id"]
    assert add_bot.json()["bot"]["difficulty"] == "hard"

    remove_bot = client.delete(
        f"/api/v1/pvp-br/rooms/{room_id}/bots/{bot_id}",
        headers=auth_headers(host_token),
    )
    assert remove_bot.status_code == 200, remove_bot.text
    assert remove_bot.json()["room"]["bot_count"] == 0

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["status"] == "in_progress"


def test_room_capacity_is_limited_to_25():
    host_token = make_token("br_host_c")

    response = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-c"),
            "room_name": "too-big",
            "max_players": 30,
        },
    )
    assert response.status_code == 422


def test_duplicate_websocket_session_does_not_close_room():
    host_token = make_token("br_host_dup")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-dup"),
            "room_name": "duplicate-guard",
            "max_players": 4,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    add_bot = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/bots",
        headers=auth_headers(host_token),
        json={"difficulty": "easy"},
    )
    assert add_bot.status_code == 200, add_bot.text

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"

    with client.websocket_connect(ws_url) as first_socket:
        first_connected = first_socket.receive_json()
        assert first_connected["type"] == "connected"

        with client.websocket_connect(ws_url) as second_socket:
            second_connected = second_socket.receive_json()
            assert second_connected["type"] == "connected"

            time.sleep(0.1)
            second_socket.send_json({"type": "ping"})
            pong = second_socket.receive_json()
            assert pong["type"] == "pong"

            assert room_id in active_rooms
            assert host_user_id in active_rooms[room_id]["humans"]
