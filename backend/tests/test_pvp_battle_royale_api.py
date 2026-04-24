from __future__ import annotations

import asyncio
import time
from contextlib import ExitStack
from queue import Empty, Queue
from threading import Thread

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.api.v1 import pvp as pvp_api
from app.api.v1 import pvp_battle_royale as br_api
from app.api.v1.pvp_battle_royale import (
    active_rooms,
    disconnect_cleanup_tasks,
    room_runtime_tasks,
    ws_connection_locks,
    ws_connections,
)

client = TestClient(app)


def receive_json_with_timeout(socket, timeout: float = 0.6):
    payload_queue: Queue[tuple[bool, object]] = Queue(maxsize=1)

    def worker():
        try:
            payload_queue.put((True, socket.receive_json()))
        except BaseException as exc:  # pragma: no cover - surfaced to caller
            payload_queue.put((False, exc))

    thread = Thread(target=worker, daemon=True)
    thread.start()

    try:
        ok, payload = payload_queue.get(timeout=timeout)
    except Empty as exc:  # pragma: no cover - timeout path is assertion failure
        raise AssertionError("Timed out waiting for websocket message") from exc

    if ok:
        return payload
    raise payload  # type: ignore[misc]


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
    pvp_api.active_rooms.clear()
    pvp_api.ws_connections.clear()
    for task in disconnect_cleanup_tasks.values():
        task.cancel()
    for task in room_runtime_tasks.values():
        task.cancel()
    active_rooms.clear()
    ws_connections.clear()
    ws_connection_locks.clear()
    disconnect_cleanup_tasks.clear()
    room_runtime_tasks.clear()
    yield
    pvp_api.active_rooms.clear()
    pvp_api.ws_connections.clear()
    for task in disconnect_cleanup_tasks.values():
        task.cancel()
    for task in room_runtime_tasks.values():
        task.cancel()
    active_rooms.clear()
    ws_connections.clear()
    ws_connection_locks.clear()
    disconnect_cleanup_tasks.clear()
    room_runtime_tasks.clear()


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
            "max_players": 6,
        },
    )
    assert response.status_code == 401


def test_duel_room_preserves_pet_payload():
    base_user_id = int(time.time() * 1000) % 1_000_000
    host_name = f"duel_host_{base_user_id}"
    guest_name = f"duel_guest_{base_user_id}"

    create_response = client.post(
        "/api/v1/pvp/rooms/create",
        params={
            "user_id": base_user_id,
            "username": host_name,
            "pet_type": "silver_lynx",
            "pet_stage": 4,
            "pet_name": "HostPet",
        },
    )
    assert create_response.status_code == 200, create_response.text
    room_id = create_response.json()["room_id"]

    join_response = client.post(
        f"/api/v1/pvp/rooms/{room_id}/join",
        params={
            "user_id": base_user_id + 1,
            "username": guest_name,
            "pet_type": "code_dragon",
            "pet_stage": 5,
            "pet_name": "GuestPet",
        },
    )
    assert join_response.status_code == 200, join_response.text
    join_payload = join_response.json()
    assert join_payload["host_pet_type"] == "silver_lynx"
    assert join_payload["host_pet_stage"] == 4
    assert join_payload["host_pet_name"] == "HostPet"

    room_response = client.get(f"/api/v1/pvp/rooms/{room_id}")
    assert room_response.status_code == 200, room_response.text
    room_payload = room_response.json()
    assert room_payload["host_name"] == host_name
    assert room_payload["host_pet_type"] == "silver_lynx"
    assert room_payload["host_pet_stage"] == 4
    assert room_payload["host_pet_name"] == "HostPet"
    assert room_payload["guest_name"] == guest_name
    assert room_payload["guest_pet_type"] == "code_dragon"
    assert room_payload["guest_pet_stage"] == 5
    assert room_payload["guest_pet_name"] == "GuestPet"


def test_create_and_list_battle_royale_room():
    host_token = make_token("br_host_a")
    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-a"),
            "room_name": "twilight-den",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    assert room["room_name"] == "twilight-den"
    assert room["sync_mode"] == "local_coop"
    assert room["participant_count"] == 5
    assert room["bot_count"] == 4
    assert [bot["difficulty"] for bot in room["bots"]] == ["easy", "medium", "medium", "hard"]
    assert room["humans"][0]["pet_stage"] == 5
    assert room["humans"][0]["movement_skills"] == ["double_jump", "dash"]

    listing = client.get("/api/v1/pvp-br/rooms", headers=auth_headers(host_token))
    assert listing.status_code == 200, listing.text
    rooms = listing.json()["rooms"]
    assert len(rooms) == 1
    assert rooms[0]["id"] == room["id"]
    assert listing.json()["cap"] == 8


def test_join_add_bot_remove_bot_and_start():
    host_token = make_token("br_host_b")
    guest_token = make_token("br_guest_b")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-b", "shiba_debugger"),
            "room_name": "arena-br",
            "max_players": 8,
        },
    )
    room_id = create.json()["room"]["id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("guest-b", "silver_lynx"),
    )
    assert join.status_code == 200, join.text
    assert join.json()["room"]["participant_count"] == 6
    assert join.json()["room"]["bot_count"] == 4

    add_bot = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/bots",
        headers=auth_headers(host_token),
        json={"difficulty": "hard"},
    )
    assert add_bot.status_code == 200, add_bot.text
    bot_id = add_bot.json()["bot"]["id"]
    assert add_bot.json()["bot"]["difficulty"] == "hard"
    assert add_bot.json()["room"]["bot_count"] == 5

    remove_bot = client.delete(
        f"/api/v1/pvp-br/rooms/{room_id}/bots/{bot_id}",
        headers=auth_headers(host_token),
    )
    assert remove_bot.status_code == 200, remove_bot.text
    assert remove_bot.json()["room"]["bot_count"] == 4

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["status"] == "in_progress"
    assert start.json()["room"]["sync_mode"] == "local_coop"
    assert isinstance(start.json()["room"]["match_seed"], int)
    assert room_id not in room_runtime_tasks


def test_room_only_allows_four_human_players():
    host_token = make_token("br_four_host")
    guest_token_a = make_token("br_four_guest_a")
    guest_token_b = make_token("br_four_guest_b")
    guest_token_c = make_token("br_four_guest_c")
    overflow_token = make_token("br_four_overflow")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("four-host"),
            "room_name": "four-human-room",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room_id = create.json()["room"]["id"]

    join_guest_a = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token_a),
        json=participant_payload("four-guest-a"),
    )
    assert join_guest_a.status_code == 200, join_guest_a.text

    join_guest_b = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token_b),
        json=participant_payload("four-guest-b"),
    )
    assert join_guest_b.status_code == 200, join_guest_b.text

    join_guest_c = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token_c),
        json=participant_payload("four-guest-c"),
    )
    assert join_guest_c.status_code == 200, join_guest_c.text
    assert join_guest_c.json()["room"]["human_count"] == 4
    assert join_guest_c.json()["room"]["participant_count"] == 8

    join_overflow = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(overflow_token),
        json=participant_payload("four-overflow"),
    )
    assert join_overflow.status_code == 400, join_overflow.text
    assert join_overflow.json()["detail"] == "Battle Royale only supports four human players"


def test_room_capacity_is_limited_to_8():
    host_token = make_token("br_host_c")

    response = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-c"),
            "room_name": "too-big",
            "max_players": 9,
        },
    )
    assert response.status_code == 422


def test_only_four_active_rooms_can_exist_at_a_time():
    room_ids = []
    for index in range(4):
        token = make_token(f"br_waiting_host_{index}")
        create = client.post(
            "/api/v1/pvp-br/rooms/create",
            headers=auth_headers(token),
            json={
                **participant_payload(f"waiting-host-{index}"),
                "room_name": f"waiting-{index}",
                "max_players": 8,
            },
        )
        assert create.status_code == 200, create.text
        room_ids.append(create.json()["room"]["id"])

    assert len(room_ids) == 4

    overflow_host = make_token("br_waiting_host_overflow")
    overflow = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(overflow_host),
        json={
            **participant_payload("overflow"),
            "room_name": "waiting-overflow",
            "max_players": 8,
        },
    )
    assert overflow.status_code == 503
    assert overflow.json()["detail"] == "Battle Royale room slot is occupied"


def test_cannot_start_a_third_room_while_two_matches_are_in_progress():
    first_host = make_token("br_progress_host_a")
    second_host = make_token("br_progress_host_b")
    third_host = make_token("br_progress_host_c")

    first_create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(first_host),
        json={
            **participant_payload("progress-host-a"),
            "room_name": "progress-a",
            "max_players": 8,
        },
    )
    second_create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(second_host),
        json={
            **participant_payload("progress-host-b"),
            "room_name": "progress-b",
            "max_players": 8,
        },
    )
    third_create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(third_host),
        json={
            **participant_payload("progress-host-c"),
            "room_name": "progress-c",
            "max_players": 8,
        },
    )

    assert first_create.status_code == 200, first_create.text
    assert second_create.status_code == 200, second_create.text
    assert third_create.status_code == 200, third_create.text

    first_room_id = first_create.json()["room"]["id"]
    second_room_id = second_create.json()["room"]["id"]
    third_room_id = third_create.json()["room"]["id"]

    first_start = client.post(
        f"/api/v1/pvp-br/rooms/{first_room_id}/start",
        headers=auth_headers(first_host),
    )
    second_start = client.post(
        f"/api/v1/pvp-br/rooms/{second_room_id}/start",
        headers=auth_headers(second_host),
    )
    blocked_start = client.post(
        f"/api/v1/pvp-br/rooms/{third_room_id}/start",
        headers=auth_headers(third_host),
    )

    assert first_start.status_code == 200, first_start.text
    assert second_start.status_code == 200, second_start.text
    assert blocked_start.status_code == 503
    assert blocked_start.json()["detail"] == "Battle Royale server is busy"


def test_two_human_room_broadcasts_shared_bot_states_to_guest():
    host_token = make_token("br_load_host")
    guest_token = make_token("br_load_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("load-host"),
            "room_name": "load-room",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("load-guest"),
    )
    assert join.status_code == 200, join.text
    guest_user_id = join.json()["room"]["humans"][-1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["sync_mode"] == "local_coop"
    assert room_id not in room_runtime_tasks

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with ExitStack() as stack:
        host_socket = stack.enter_context(client.websocket_connect(host_ws_url))
        host_connected = host_socket.receive_json()
        assert host_connected["type"] == "connected"
        assert host_connected["room"]["sync_mode"] == "local_coop"
        assert len(host_connected["shared_bot_states"]) == 4

        guest_socket = stack.enter_context(client.websocket_connect(guest_ws_url))
        guest_connected = guest_socket.receive_json()
        assert guest_connected["type"] == "connected"
        assert guest_connected["room"]["sync_mode"] == "local_coop"
        assert len(guest_connected["shared_bot_states"]) == 4

        target_bot_id = host_connected["shared_bot_states"][0]["id"]
        guest_socket.send_json(
            {
                "type": "br_bot_damage",
                "payload": {
                    "target_id": target_bot_id,
                    "damage": 18,
                    "event_id": "evt-bot-hit-1",
                },
            }
        )

        host_update = receive_json_with_timeout(host_socket, timeout=0.35)
        guest_update = receive_json_with_timeout(guest_socket, timeout=0.35)
        assert host_update["type"] == "br_shared_bot_states"
        assert guest_update["type"] == "br_shared_bot_states"

        host_bot = next(bot for bot in host_update["payload"]["bots"] if bot["id"] == target_bot_id)
        guest_bot = next(bot for bot in guest_update["payload"]["bots"] if bot["id"] == target_bot_id)
        assert host_bot["hp"] == 102
        assert guest_bot["hp"] == 102


def test_duplicate_websocket_session_does_not_close_room():
    host_token = make_token("br_host_dup")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-dup"),
            "room_name": "duplicate-guard",
            "max_players": 8,
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


def test_websocket_invalid_json_is_ignored_and_connection_stays_alive():
    host_token = make_token("br_invalid_json_host")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("invalid-json-host"),
            "room_name": "json-guard",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    with client.websocket_connect(ws_url) as socket:
        connected = socket.receive_json()
        assert connected["type"] == "connected"

        socket.send_text("{not-valid-json")
        socket.send_json({"type": "ping"})

        pong = receive_json_with_timeout(socket)
        assert pong["type"] == "pong"
        assert room_id in active_rooms
        assert ws_connections.get(f"{room_id}:{host_user_id}") is not None


def test_my_active_room_returns_waiting_or_active_room():
    host_token = make_token("br_active_host")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
          **participant_payload("active-host"),
          "room_name": "active-room",
          "max_players": 6,
        },
    )
    assert create.status_code == 200, create.text

    response = client.get("/api/v1/pvp-br/rooms/my-active", headers=auth_headers(host_token))
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["room"]["room_name"] == "active-room"
    assert payload["recoverable"] is True


def test_only_host_can_finish_room():
    host_token = make_token("br_finish_host")
    guest_token = make_token("br_finish_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("finish-host"),
            "room_name": "finish-room",
            "max_players": 8,
        },
    )
    room_id = create.json()["room"]["id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("finish-guest"),
    )
    assert join.status_code == 200, join.text

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    guest_finish = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/finish",
        headers=auth_headers(guest_token),
    )
    assert guest_finish.status_code == 403, guest_finish.text


def test_websocket_reconnect_receives_latest_snapshot_and_match_payload():
    host_token = make_token("br_reconnect_host")
    guest_token = make_token("br_reconnect_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("reconnect-host"),
            "room_name": "reconnect-room",
            "max_players": 6,
        },
    )
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    guest_join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("reconnect-guest", "silver_lynx"),
    )
    assert guest_join.status_code == 200, guest_join.text
    guest_user_id = guest_join.json()["room"]["humans"][1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["sync_mode"] == "local_coop"

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(host_ws_url) as host_socket:
        host_connected = host_socket.receive_json()
        assert host_connected["type"] == "connected"
        bot_ids = [bot["id"] for bot in host_connected["shared_bot_states"]]

        with client.websocket_connect(guest_ws_url) as guest_socket:
            guest_connected = guest_socket.receive_json()
            assert guest_connected["type"] == "connected"
            assert len(guest_connected["shared_bot_states"]) == 4

            host_socket.send_json(
                {
                    "type": "br_presence_state",
                    "payload": {
                        "fighter": {
                            "id": f"human-{host_user_id}",
                            "userId": host_user_id,
                            "name": "reconnect-host",
                            "petType": "code_kitty",
                            "petStage": 3,
                            "x": 1200,
                            "y": 880,
                            "vx": 0,
                            "vy": 0,
                            "hp": 110,
                            "maxHp": 120,
                            "shield": 12,
                            "armor": 6,
                            "kills": 1,
                            "alive": True,
                            "facing": 1,
                            "isBot": False,
                            "hasRevived": False,
                            "reviveUsed": False,
                            "quizPending": False,
                            "specialCharges": 1,
                            "buffs": {},
                            "weaponReady": True,
                            "swingMs": 0,
                            "hitFlashMs": 0,
                        },
                        "local_bot_alive_count": 4,
                        "cleared": False,
                        "alive": True,
                        "quiz_pending": False,
                        "kills": 1,
                        "damage_dealt": 30,
                        "updated_at": 1001,
                    },
                }
            )
            guest_socket.send_json(
                {
                    "type": "br_presence_state",
                    "payload": {
                        "fighter": {
                            "id": f"human-{guest_user_id}",
                            "userId": guest_user_id,
                            "name": "reconnect-guest",
                            "petType": "silver_lynx",
                            "petStage": 3,
                            "x": 1820,
                            "y": 920,
                            "vx": 0,
                            "vy": 0,
                            "hp": 48,
                            "maxHp": 120,
                            "shield": 0,
                            "armor": 0,
                            "kills": 0,
                            "alive": True,
                            "facing": -1,
                            "isBot": False,
                            "hasRevived": False,
                            "reviveUsed": False,
                            "quizPending": False,
                            "specialCharges": 0,
                            "buffs": {},
                            "weaponReady": False,
                            "swingMs": 0,
                            "hitFlashMs": 0,
                        },
                        "local_bot_alive_count": 4,
                        "cleared": False,
                        "alive": True,
                        "quiz_pending": False,
                        "kills": 0,
                        "damage_dealt": 0,
                        "updated_at": 1002,
                    },
                }
            )

            for index, bot_id in enumerate(bot_ids):
                host_socket.send_json(
                    {
                        "type": "br_bot_damage",
                        "payload": {
                            "target_id": bot_id,
                            "damage": 120,
                            "event_id": f"evt-reconnect-{index}",
                        },
                    }
                )

            match_end = None
            for _ in range(12):
                message = receive_json_with_timeout(host_socket, timeout=0.35)
                if message["type"] == "br_match_end":
                    match_end = message
                    break

            assert match_end is not None
            assert match_end["payload"]["humanSideWon"] is True

        time.sleep(0.15)

        with client.websocket_connect(guest_ws_url) as guest_socket:
            recovered = guest_socket.receive_json()
            assert recovered["type"] == "connected"
            assert recovered["latest_snapshot"] is None
            assert all(bot["alive"] is False for bot in recovered["shared_bot_states"])
            assert recovered["latest_match_payload"]["humanSideWon"] is True


def test_local_coop_presence_state_finishes_room_and_broadcasts_match_end():
    host_token = make_token("br_local_coop_host")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("local-coop-host"),
            "room_name": "local-coop-room",
            "max_players": 6,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    with client.websocket_connect(host_ws_url) as host_socket:
        connected = host_socket.receive_json()
        assert connected["type"] == "connected"
        assert connected["room"]["sync_mode"] == "local_coop"
        assert connected["presence_states"] == []

        host_socket.send_json(
            {
                "type": "br_presence_state",
                "payload": {
                    "fighter": {
                        "id": f"human-{host_user_id}",
                        "userId": host_user_id,
                        "name": "local-coop-host",
                        "petType": "code_kitty",
                        "petStage": 5,
                        "x": 1200,
                        "y": 820,
                        "vx": 0,
                        "vy": 0,
                        "hp": 98,
                        "maxHp": 120,
                        "shield": 8,
                        "armor": 4,
                        "kills": 3,
                        "alive": True,
                        "facing": 1,
                        "isBot": False,
                        "hasRevived": False,
                        "reviveUsed": False,
                        "quizPending": False,
                        "damageDealt": 72,
                        "specialCharges": 1,
                        "buffs": {},
                        "weaponReady": True,
                        "swingMs": 0,
                        "hitFlashMs": 0,
                    },
                    "local_bot_alive_count": 0,
                    "cleared": True,
                    "alive": True,
                    "quiz_pending": False,
                    "kills": 3,
                    "damage_dealt": 72,
                    "updated_at": 123456,
                },
            }
        )

        match_end = None
        for _ in range(6):
            message = receive_json_with_timeout(host_socket, timeout=1.0)
            if message["type"] == "br_match_end":
                match_end = message
                break

        assert match_end is not None
        assert match_end["payload"]["humanSideWon"] is True
        assert match_end["payload"]["mode"] == "local_coop"

    assert active_rooms[room_id]["status"] == "finished"
    assert active_rooms[room_id]["latest_match_payload"]["mode"] == "local_coop"


def test_local_coop_start_does_not_spawn_runtime_loop():
    host_token = make_token("br_local_coop_runtime")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("local-coop-runtime"),
            "room_name": "local-coop-runtime-room",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room_id = create.json()["room"]["id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    runtime_task = room_runtime_tasks.get(room_id)
    assert runtime_task is None or runtime_task.done()


def test_guest_disconnect_keeps_human_recoverable_while_host_stays_connected(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(br_api, "DISCONNECT_GRACE_SECONDS", 0.05)

    host_token = make_token("br_disc_host")
    guest_token = make_token("br_disc_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("disc-host"),
            "room_name": "disconnect-room",
            "max_players": 8,
        },
    )
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("disc-guest"),
    )
    assert join.status_code == 200, join.text
    guest_user_id = join.json()["room"]["humans"][1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(host_ws_url) as host_socket:
        assert host_socket.receive_json()["type"] == "connected"

        with client.websocket_connect(guest_ws_url) as guest_socket:
            assert guest_socket.receive_json()["type"] == "connected"

        time.sleep(0.2)
        room_state = active_rooms[room_id]
        assert guest_user_id in room_state["humans"]
        assert room_state["humans"][guest_user_id]["connected"] is False

        response = client.get("/api/v1/pvp-br/rooms/my-active", headers=auth_headers(guest_token))
        assert response.status_code == 200, response.text
        assert response.json()["recoverable"] is True


def test_host_disconnect_promotes_remaining_human_and_keeps_room_active(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(br_api, "DISCONNECT_GRACE_SECONDS", 0.05)

    host_token = make_token("br_host_drop_host")
    guest_token = make_token("br_host_drop_guest")
    next_host_token = make_token("br_host_drop_next")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("host-drop-host"),
            "room_name": "host-drop-room",
            "max_players": 8,
        },
    )
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("host-drop-guest"),
    )
    assert join.status_code == 200, join.text
    guest_user_id = join.json()["room"]["humans"][1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(guest_ws_url) as guest_socket:
        assert guest_socket.receive_json()["type"] == "connected"

        with client.websocket_connect(host_ws_url) as host_socket:
            assert host_socket.receive_json()["type"] == "connected"

        time.sleep(0.2)
        room_state_response = client.get(
            f"/api/v1/pvp-br/rooms/{room_id}",
            headers=auth_headers(guest_token),
        )
        assert room_state_response.status_code == 200, room_state_response.text

        assert room_id in active_rooms
        assert active_rooms[room_id]["host_user_id"] == guest_user_id
        assert guest_user_id in active_rooms[room_id]["humans"]

    next_create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(next_host_token),
        json={
            **participant_payload("host-drop-next"),
            "room_name": "fresh-room",
            "max_players": 8,
        },
    )
    assert next_create.status_code == 200, next_create.text
    assert next_create.json()["room"]["room_name"] == "fresh-room"


class TimedSocket:
    def __init__(self, delay: float):
        self.delay = delay
        self.messages: list[dict] = []

    async def send_json(self, message: dict) -> None:
        await asyncio.sleep(self.delay)
        self.messages.append(message)


def test_broadcast_to_room_sends_to_connections_concurrently():
    room_id = "ROOM42"
    socket_a = TimedSocket(0.05)
    socket_b = TimedSocket(0.05)
    socket_c = TimedSocket(0.05)
    ws_connections[br_api.connection_key(room_id, 1)] = socket_a  # type: ignore[assignment]
    ws_connections[br_api.connection_key(room_id, 2)] = socket_b  # type: ignore[assignment]
    ws_connections[br_api.connection_key(room_id, 3)] = socket_c  # type: ignore[assignment]

    started_at = time.perf_counter()
    asyncio.run(br_api.broadcast_to_room(room_id, {"type": "br_snapshot", "payload": {"tick": 1}}))
    elapsed = time.perf_counter() - started_at

    assert elapsed < 0.1
    assert socket_a.messages[0]["payload"]["tick"] == 1
    assert socket_b.messages[0]["payload"]["tick"] == 1
    assert socket_c.messages[0]["payload"]["tick"] == 1


def test_guest_bot_damage_is_deduplicated_in_local_coop():
    host_token = make_token("br_batch_host")
    guest_token = make_token("br_batch_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("batch-host"),
            "room_name": "batch-room",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    guest_join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("batch-guest"),
    )
    assert guest_join.status_code == 200, guest_join.text
    guest_user_id = guest_join.json()["room"]["humans"][1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["sync_mode"] == "local_coop"
    assert room_id not in room_runtime_tasks

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(host_ws_url) as host_socket:
        host_connected = host_socket.receive_json()
        assert host_connected["type"] == "connected"

        with client.websocket_connect(guest_ws_url) as guest_socket:
            guest_connected = guest_socket.receive_json()
            assert guest_connected["type"] == "connected"
            target_bot_id = guest_connected["shared_bot_states"][0]["id"]

            damage_payload = {
                "type": "br_bot_damage",
                "payload": {
                    "target_id": target_bot_id,
                    "damage": 18,
                    "event_id": "evt-dedup-1",
                },
            }
            guest_socket.send_json(damage_payload)
            guest_socket.send_json(damage_payload)

            first_update = receive_json_with_timeout(host_socket, timeout=0.35)
            assert first_update["type"] == "br_shared_bot_states"
            assert active_rooms[room_id]["sync_state"]["shared_bots"][target_bot_id]["hp"] == 102


def test_local_coop_match_uses_shared_bot_states_instead_of_local_bot_alive_count():
    host_token = make_token("br_snapshot_host")
    guest_token = make_token("br_snapshot_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("snapshot-host"),
            "room_name": "snapshot-room",
            "max_players": 8,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    guest_join = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/join",
        headers=auth_headers(guest_token),
        json=participant_payload("snapshot-guest"),
    )
    assert guest_join.status_code == 200, guest_join.text
    guest_user_id = guest_join.json()["room"]["humans"][1]["user_id"]

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert start.json()["room"]["sync_mode"] == "local_coop"

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(host_ws_url) as host_socket:
        host_connected = host_socket.receive_json()
        assert host_connected["type"] == "connected"
        bot_ids = [bot["id"] for bot in host_connected["shared_bot_states"]]

        with client.websocket_connect(guest_ws_url) as guest_socket:
            guest_connected = guest_socket.receive_json()
            assert guest_connected["type"] == "connected"

            host_socket.send_json(
                {
                    "type": "br_presence_state",
                    "payload": {
                        "fighter": {
                            "id": f"human-{host_user_id}",
                            "userId": host_user_id,
                            "name": "snapshot-host",
                            "petType": "code_kitty",
                            "petStage": 5,
                            "x": 900,
                            "y": 820,
                            "vx": 0,
                            "vy": 0,
                            "hp": 120,
                            "maxHp": 120,
                            "shield": 0,
                            "armor": 0,
                            "kills": 0,
                            "alive": True,
                            "facing": 1,
                            "isBot": False,
                            "hasRevived": False,
                            "reviveUsed": False,
                            "quizPending": False,
                            "specialCharges": 0,
                            "buffs": {},
                            "weaponReady": True,
                            "swingMs": 0,
                            "hitFlashMs": 0,
                        },
                        "local_bot_alive_count": 4,
                        "cleared": False,
                        "alive": True,
                        "quiz_pending": False,
                        "kills": 0,
                        "damage_dealt": 0,
                        "updated_at": 2001,
                    },
                }
            )
            guest_socket.send_json(
                {
                    "type": "br_presence_state",
                    "payload": {
                        "fighter": {
                            "id": f"human-{guest_user_id}",
                            "userId": guest_user_id,
                            "name": "snapshot-guest",
                            "petType": "silver_lynx",
                            "petStage": 5,
                            "x": 1480,
                            "y": 870,
                            "vx": 0,
                            "vy": 0,
                            "hp": 120,
                            "maxHp": 120,
                            "shield": 0,
                            "armor": 0,
                            "kills": 0,
                            "alive": True,
                            "facing": -1,
                            "isBot": False,
                            "hasRevived": False,
                            "reviveUsed": False,
                            "quizPending": False,
                            "specialCharges": 0,
                            "buffs": {},
                            "weaponReady": True,
                            "swingMs": 0,
                            "hitFlashMs": 0,
                        },
                        "local_bot_alive_count": 4,
                        "cleared": False,
                        "alive": True,
                        "quiz_pending": False,
                        "kills": 0,
                        "damage_dealt": 0,
                        "updated_at": 2002,
                    },
                }
            )

            for index, bot_id in enumerate(bot_ids):
                host_socket.send_json(
                    {
                        "type": "br_bot_damage",
                        "payload": {
                            "target_id": bot_id,
                            "damage": 120,
                            "event_id": f"evt-clear-{index}",
                        },
                    }
                )

            match_end = None
            for _ in range(12):
                message = receive_json_with_timeout(host_socket, timeout=0.35)
                if message["type"] == "br_match_end":
                    match_end = message
                    break

            assert match_end is not None
            assert match_end["payload"]["humanSideWon"] is True
            assert all(fighter["alive"] is False for fighter in match_end["payload"]["fighters"] if fighter["isBot"])
