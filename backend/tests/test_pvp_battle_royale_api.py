from __future__ import annotations

import asyncio
import time
from contextlib import ExitStack
from queue import Empty, Queue
from threading import Thread

from fastapi.testclient import TestClient
import pytest

from app.main import app
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
    assert listing.json()["cap"] == 20


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


def test_room_capacity_is_limited_to_20():
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


def test_twenty_player_room_coalesces_snapshots_and_broadcasts_to_all_guests(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(br_api, "SERVER_SNAPSHOT_INTERVAL_SECONDS", 0.02)

    player_tokens = [make_token(f"br_load_{index}") for index in range(20)]
    host_token = player_tokens[0]

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("load-host"),
            "room_name": "load-room",
            "max_players": 20,
        },
    )
    assert create.status_code == 200, create.text
    room = create.json()["room"]
    room_id = room["id"]
    host_user_id = room["host_user_id"]

    guest_user_ids: list[int] = []
    for index, token in enumerate(player_tokens[1:], start=1):
        join = client.post(
            f"/api/v1/pvp-br/rooms/{room_id}/join",
            headers=auth_headers(token),
            json=participant_payload(f"load-guest-{index}"),
        )
        assert join.status_code == 200, join.text
        guest_user_ids.append(join.json()["room"]["humans"][-1]["user_id"])

    start = client.post(
        f"/api/v1/pvp-br/rooms/{room_id}/start",
        headers=auth_headers(host_token),
    )
    assert start.status_code == 200, start.text
    assert room_id in room_runtime_tasks

    def snapshot_payload(tick: int) -> dict:
        fighters = [
            {
                "id": f"human-{host_user_id}",
                "userId": host_user_id,
                "name": "load-host",
                "petType": "code_kitty",
                "petStage": 3,
                "x": 1200 + tick,
                "y": 880,
                "vx": 15,
                "vy": 0,
                "hp": 120,
                "maxHp": 120,
                "shield": 16,
                "armor": 8,
                "kills": 0,
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
            }
        ]
        fighters.extend(
            {
                "id": f"human-{guest_user_id}",
                "userId": guest_user_id,
                "name": f"load-guest-{offset}",
                "petType": "silver_lynx",
                "petStage": 3,
                "x": 1800 + offset * 20 + tick,
                "y": 920,
                "vx": 12,
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
            }
            for offset, guest_user_id in enumerate(guest_user_ids, start=1)
        )
        return {
            "tick": tick,
            "elapsedMs": tick * 80,
            "zone": {
                "centerX": 3200,
                "centerY": 1700,
                "radius": 2100,
                "phase": 2,
                "nextShrinkAtMs": 14000,
            },
            "fighters": fighters,
            "pickups": [],
            "killFeed": [],
            "winnerId": None,
            "projectiles": [],
            "weapons": [],
            "effects": [],
        }

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_urls = [
        f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={token}"
        for guest_user_id, token in zip(guest_user_ids, player_tokens[1:])
    ]

    with ExitStack() as stack:
        host_socket = stack.enter_context(client.websocket_connect(host_ws_url))
        assert host_socket.receive_json()["type"] == "connected"

        guest_sockets = [stack.enter_context(client.websocket_connect(url)) for url in guest_ws_urls]
        for guest_socket in guest_sockets:
            assert guest_socket.receive_json()["type"] == "connected"

        for tick in range(1, 6):
            host_socket.send_json({"type": "br_snapshot", "payload": snapshot_payload(tick)})

        time.sleep(0.08)
        host_socket.send_json({"type": "br_snapshot", "payload": snapshot_payload(99)})
        time.sleep(0.12)

        observed_ticks: list[int] = []
        for guest_socket in guest_sockets:
            latest_tick = 0
            for _ in range(8):
                try:
                    message = receive_json_with_timeout(guest_socket, timeout=0.3)
                except AssertionError:
                    break
                if message["type"] != "br_snapshot":
                    continue
                latest_tick = message["payload"]["tick"]
                if latest_tick == 99:
                    break
            observed_ticks.append(latest_tick)

    assert len(observed_ticks) == 19
    assert all(tick == 99 for tick in observed_ticks)
    assert active_rooms[room_id]["latest_snapshot"]["tick"] == 99


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
            "max_players": 4,
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

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"
    snapshot_payload = {
        "tick": 18,
        "elapsedMs": 9300,
        "zone": {
            "centerX": 3200,
            "centerY": 1700,
            "radius": 2100,
            "phase": 2,
            "nextShrinkAtMs": 14000,
        },
        "fighters": [
            {
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
            {
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
                "alive": False,
                "facing": -1,
                "isBot": False,
                "hasRevived": False,
                "reviveUsed": True,
                "quizPending": True,
                "specialCharges": 0,
                "buffs": {},
                "weaponReady": False,
                "swingMs": 0,
                "hitFlashMs": 0,
            },
        ],
        "pickups": [],
        "killFeed": [{"id": "kf-1", "text": "host downed guest", "createdAt": 1}],
        "winnerId": None,
        "platforms": [],
        "projectiles": [],
        "weapons": [],
        "effects": [],
    }
    match_payload = {
        "winnerId": f"human-{host_user_id}",
        "fighters": snapshot_payload["fighters"],
    }

    with client.websocket_connect(host_ws_url) as host_socket:
        host_connected = host_socket.receive_json()
        assert host_connected["type"] == "connected"

        with client.websocket_connect(guest_ws_url) as guest_socket:
            guest_connected = guest_socket.receive_json()
            assert guest_connected["type"] == "connected"

            host_socket.send_json({"type": "br_snapshot", "payload": snapshot_payload})
            host_socket.send_json({"type": "br_match_end", "payload": match_payload})

        time.sleep(0.15)

        with client.websocket_connect(guest_ws_url) as guest_socket:
            recovered = guest_socket.receive_json()
            assert recovered["type"] == "connected"
            assert recovered["latest_snapshot"]["tick"] == 18
            assert recovered["latest_snapshot"]["fighters"][1]["quizPending"] is True
            assert recovered["latest_match_payload"]["winnerId"] == f"human-{host_user_id}"


def test_in_progress_disconnect_keeps_human_recoverable(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(br_api, "DISCONNECT_GRACE_SECONDS", 0.05)

    host_token = make_token("br_disc_host")
    guest_token = make_token("br_disc_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("disc-host"),
            "room_name": "disconnect-room",
            "max_players": 4,
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


def test_guest_inputs_are_batched_before_forwarding_to_host(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(br_api, "ROOM_RUNTIME_TICK_SECONDS", 0.005)
    monkeypatch.setattr(br_api, "SERVER_INPUT_BATCH_INTERVAL_SECONDS", 0.015)
    monkeypatch.setattr(br_api, "INPUT_FORWARD_MIN_INTERVAL_SECONDS", 0.0)
    monkeypatch.setattr(br_api, "INPUT_DUPLICATE_INTERVAL_SECONDS", 0.0)

    host_token = make_token("br_batch_host")
    guest_token = make_token("br_batch_guest")

    create = client.post(
        "/api/v1/pvp-br/rooms/create",
        headers=auth_headers(host_token),
        json={
            **participant_payload("batch-host"),
            "room_name": "batch-room",
            "max_players": 4,
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

    host_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{host_user_id}?token={host_token}"
    guest_ws_url = f"/api/v1/pvp-br/ws/{room_id}/{guest_user_id}?token={guest_token}"

    with client.websocket_connect(host_ws_url) as host_socket:
        assert host_socket.receive_json()["type"] == "connected"

        with client.websocket_connect(guest_ws_url) as guest_socket:
            assert guest_socket.receive_json()["type"] == "connected"

            guest_socket.send_json({"type": "br_input", "payload": {"input": {"right": True}}})
            guest_socket.send_json({"type": "br_input", "payload": {"input": {"attack": True, "attackPressed": True}}})
            guest_socket.send_json({"type": "br_input", "payload": {"input": {"attack": False}}})

            time.sleep(0.08)
            batch_message = host_socket.receive_json()
            assert batch_message["type"] == "br_input_batch"
            assert batch_message["inputs"] == [
                {
                    "user_id": guest_user_id,
                    "payload": {"input": {"right": True, "attack": False, "attackPressed": True}},
                }
            ]
