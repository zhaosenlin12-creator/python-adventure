from __future__ import annotations

import asyncio
import json
import random
import string
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator

from app.api.dependencies import get_current_user
from app.core.security import decode_access_token
from app.models.user import User

router = APIRouter()


Difficulty = Literal["easy", "medium", "hard"]
RoomStatus = Literal["waiting", "in_progress", "finished"]

MAX_ROOM_CAPACITY = 6
MAX_ACTIVE_ROOM_COUNT = 1
MAX_IN_PROGRESS_ROOM_COUNT = 1
ROOM_EXPIRY_MINUTES = 30
FINISHED_ROOM_TTL_MINUTES = 5
DISCONNECT_GRACE_SECONDS = 12.0
ROOM_RUNTIME_TICK_SECONDS = 0.05
SERVER_SNAPSHOT_INTERVAL_SECONDS = 0.05
SERVER_INPUT_BATCH_INTERVAL_SECONDS = 0.016
HOST_SNAPSHOT_STALE_SECONDS = 2.4
INPUT_FORWARD_MIN_INTERVAL_SECONDS = 0.016
INPUT_DUPLICATE_INTERVAL_SECONDS = 0.025
SEND_JSON_TIMEOUT_SECONDS = 0.2

AI_NAME_POOL = [
    "Scout Byte",
    "Cloud Fang",
    "Alpha Paw",
    "Nova Tail",
    "Echo Claw",
    "Pixel Dash",
    "Storm Whisker",
    "Copper Fang",
    "Zen Paw",
    "Rune Hopper",
]

AI_PET_POOL = [
    "code_kitty",
    "shiba_debugger",
    "silver_lynx",
    "forest_maine",
    "coffee_shadow",
    "husky_rider",
    "pom_angel",
    "mini_civet",
    "dutch_whisker",
    "bit_bot",
    "data_sprite",
    "ava_ai",
    "neon_hound",
    "code_dragon",
    "giraffe_oracle",
    "snow_cat",
    "qiongqi_howl",
    "taowu_flare",
    "golden_roc",
]

LEGACY_PET_TYPE_ALIASES = {
    "algo_bunny": "silver_lynx",
    "cute_rabbit": "silver_lynx",
}

room_lock = asyncio.Lock()
active_rooms: Dict[str, Dict[str, Any]] = {}
ws_connections: Dict[str, WebSocket] = {}
ws_connection_locks: Dict[str, asyncio.Lock] = {}
disconnect_cleanup_tasks: Dict[str, asyncio.Task] = {}
room_runtime_tasks: Dict[str, asyncio.Task] = {}

INPUT_EDGE_FIELDS = (
    "jumpPressed",
    "dashPressed",
    "attackPressed",
    "throwPressed",
    "skillPressed",
)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return now_utc().isoformat()


def monotonic_time() -> float:
    return time.perf_counter()


def normalize_text(value: str, *, fallback: str, max_length: int) -> str:
    normalized = " ".join(value.strip().split())
    if not normalized:
        normalized = fallback
    return normalized[:max_length]


def normalize_pet_type(value: str) -> str:
    normalized = normalize_text(value, fallback="code_kitty", max_length=64)
    return LEGACY_PET_TYPE_ALIASES.get(normalized, normalized)


def generate_room_id() -> str:
    chars = string.ascii_uppercase + string.digits
    while True:
        room_id = "".join(random.choice(chars) for _ in range(6))
        if room_id not in active_rooms:
            return room_id


def connection_key(room_id: str, user_id: int) -> str:
    return f"{room_id}:{user_id}"


def room_participant_count(room: Dict[str, Any]) -> int:
    return len(room["humans"]) + len(room["bots"])


def build_sync_state() -> Dict[str, Any]:
    return {
        "pending_snapshot": None,
        "pending_snapshot_version": 0,
        "broadcast_snapshot_version": 0,
        "last_snapshot_broadcast_monotonic": 0.0,
        "last_host_snapshot_monotonic": 0.0,
        "host_stale": False,
        "input_state": {},
        "pending_guest_inputs": {},
        "last_input_batch_monotonic": 0.0,
    }


def merge_input_payload(previous_payload: Dict[str, Any], incoming_payload: Dict[str, Any]) -> Dict[str, Any]:
    previous_input = previous_payload.get("input", {}) if isinstance(previous_payload, dict) else {}
    incoming_input = incoming_payload.get("input", {}) if isinstance(incoming_payload, dict) else {}

    merged_input = {
        **previous_input,
        **incoming_input,
    }
    for field in INPUT_EDGE_FIELDS:
        if bool(previous_input.get(field)) or bool(incoming_input.get(field)):
            merged_input[field] = True
        else:
            merged_input.pop(field, None)

    merged_payload = {
        **previous_payload,
        **incoming_payload,
    }
    merged_payload["input"] = merged_input
    return merged_payload


def sorted_humans(room: Dict[str, Any]) -> list[Dict[str, Any]]:
    humans = list(room["humans"].values())
    return sorted(humans, key=lambda item: (not item["is_host"], item["joined_at"]))


def serialize_room(room: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": room["id"],
        "room_name": room["room_name"],
        "status": room["status"],
        "host_user_id": room["host_user_id"],
        "host_username": room["host_username"],
        "max_players": room["max_players"],
        "participant_count": room_participant_count(room),
        "human_count": len(room["humans"]),
        "bot_count": len(room["bots"]),
        "created_at": room["created_at"],
        "started_at": room["started_at"],
        "match_seed": room.get("match_seed"),
        "humans": sorted_humans(room),
        "bots": list(room["bots"]),
    }


def cleanup_rooms() -> None:
    current_time = now_utc()
    stale_ids: list[str] = []

    for room_id, room in active_rooms.items():
        created_at = datetime.fromisoformat(room["created_at"])
        started_at = datetime.fromisoformat(room["started_at"]) if room["started_at"] else None

        if room["status"] == "finished":
            if started_at and current_time - started_at > timedelta(minutes=FINISHED_ROOM_TTL_MINUTES):
                stale_ids.append(room_id)
            elif current_time - created_at > timedelta(minutes=ROOM_EXPIRY_MINUTES):
                stale_ids.append(room_id)
            continue

        if current_time - created_at > timedelta(minutes=ROOM_EXPIRY_MINUTES):
            stale_ids.append(room_id)

    for room_id in stale_ids:
        active_rooms.pop(room_id, None)


def count_rooms_with_status(status: RoomStatus) -> int:
    return sum(1 for room in active_rooms.values() if room["status"] == status)


def find_user_room(user_id: int) -> Optional[Dict[str, Any]]:
    cleanup_rooms()
    for room in active_rooms.values():
        if user_id in room["humans"]:
            return room
    return None


def build_human_entry(user: User, payload: "RoomParticipantPayload", *, is_host: bool) -> Dict[str, Any]:
    allowed_movement_skills = {"double_jump", "glide", "dash", "wall_jump"}
    return {
        "user_id": user.id,
        "username": normalize_text(payload.username or user.username or "Player", fallback="Player", max_length=24),
        "pet_type": normalize_pet_type(payload.pet_type),
        "pet_name": normalize_text(payload.pet_name, fallback="Pet", max_length=24),
        "pet_stage": payload.pet_stage,
        "movement_skills": [skill for skill in payload.movement_skills if skill in allowed_movement_skills],
        "age_group": payload.age_group,
        "is_host": is_host,
        "connected": True,
        "disconnected_at": None,
        "joined_at": iso_now(),
    }


def build_bot_entry(difficulty: Difficulty) -> Dict[str, Any]:
    return {
        "id": f"bot-{''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))}",
        "name": random.choice(AI_NAME_POOL),
        "difficulty": difficulty,
        "pet_type": random.choice(AI_PET_POOL),
        "pet_name": random.choice(["Blitz", "Miso", "Rex", "Nova", "Rune", "Puff", "Gale", "Quartz"]),
        "pet_stage": random.choice([2, 3, 4]),
        "joined_at": iso_now(),
    }


def verify_ws_token(token: Optional[str], expected_user_id: int) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="Missing websocket token")

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid websocket token")

    token_user_id = payload.get("sub")
    try:
        token_user_id = int(token_user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid websocket token subject") from exc

    if token_user_id != expected_user_id:
        raise HTTPException(status_code=403, detail="Websocket token does not match user")


def drop_ws_connection(key: str) -> None:
    ws_connections.pop(key, None)
    ws_connection_locks.pop(key, None)


async def send_json_to_connection(key: str, websocket: WebSocket, message: Dict[str, Any]) -> bool:
    lock = ws_connection_locks.setdefault(key, asyncio.Lock())
    try:
        async with lock:
            await asyncio.wait_for(websocket.send_json(message), timeout=SEND_JSON_TIMEOUT_SECONDS)
        return True
    except Exception:
        drop_ws_connection(key)
        return False


async def send_to_user(room_id: str, user_id: int, message: Dict[str, Any]) -> bool:
    key = connection_key(room_id, user_id)
    ws = ws_connections.get(key)
    if not ws:
        return False
    return await send_json_to_connection(key, ws, message)


async def broadcast_to_room(room_id: str, message: Dict[str, Any], exclude_user: Optional[int] = None) -> None:
    targets: list[tuple[str, WebSocket]] = []
    for key, websocket in list(ws_connections.items()):
        current_room_id, _, current_user_id = key.partition(":")
        if current_room_id != room_id:
            continue
        if exclude_user is not None and int(current_user_id) == exclude_user:
            continue
        targets.append((key, websocket))

    if not targets:
        return

    await asyncio.gather(
        *(send_json_to_connection(key, websocket, message) for key, websocket in targets),
        return_exceptions=True,
    )


async def broadcast_host_snapshot_if_due(room: Dict[str, Any], sync_state: Dict[str, Any]) -> bool:
    pending_version = sync_state.get("pending_snapshot_version", 0)
    if not pending_version or pending_version == sync_state.get("broadcast_snapshot_version", 0):
        return False

    now_monotonic = monotonic_time()
    if now_monotonic - sync_state.get("last_snapshot_broadcast_monotonic", 0.0) < SERVER_SNAPSHOT_INTERVAL_SECONDS:
        return False

    snapshot_payload = sync_state.get("pending_snapshot")
    if snapshot_payload is None:
        return False

    room["latest_snapshot"] = snapshot_payload
    sync_state["broadcast_snapshot_version"] = pending_version
    sync_state["last_snapshot_broadcast_monotonic"] = now_monotonic
    await broadcast_to_room(
        room["id"],
        {
            "type": "br_snapshot",
            "payload": snapshot_payload,
            "server_seq": pending_version,
            "timestamp": now_utc().timestamp(),
        },
        exclude_user=room["host_user_id"],
    )
    return True


async def broadcast_room_snapshot(room: Dict[str, Any]) -> None:
    await broadcast_to_room(
        room["id"],
        {
            "type": "br_room_update",
            "room": serialize_room(room),
            "timestamp": now_utc().timestamp(),
        },
    )


def cancel_room_runtime(room_id: str) -> None:
    task = room_runtime_tasks.pop(room_id, None)
    if task and not task.done():
        task.cancel()


async def run_room_runtime(room_id: str) -> None:
    try:
        while True:
            await asyncio.sleep(ROOM_RUNTIME_TICK_SECONDS)

            room = active_rooms.get(room_id)
            if not room or room.get("status") != "in_progress":
                return

            sync_state = room.setdefault("sync_state", build_sync_state())
            now_monotonic = monotonic_time()

            pending_guest_inputs = sync_state.setdefault("pending_guest_inputs", {})
            if (
                pending_guest_inputs
                and now_monotonic - sync_state.get("last_input_batch_monotonic", 0.0)
                >= SERVER_INPUT_BATCH_INTERVAL_SECONDS
            ):
                input_batch = [
                    {
                        "user_id": queued_user_id,
                        "payload": queued_entry["payload"],
                    }
                    for queued_user_id, queued_entry in sorted(pending_guest_inputs.items(), key=lambda item: item[0])
                ]
                if await send_to_user(
                    room_id,
                    room["host_user_id"],
                    {
                        "type": "br_input_batch",
                        "inputs": input_batch,
                        "timestamp": now_utc().timestamp(),
                    },
                ):
                    input_state = sync_state.setdefault("input_state", {})
                    for queued_user_id in pending_guest_inputs:
                        previous_state = input_state.get(queued_user_id, {})
                        input_state[queued_user_id] = {
                            **previous_state,
                            "forwarded_at": now_monotonic,
                        }
                    sync_state["pending_guest_inputs"] = {}
                    sync_state["last_input_batch_monotonic"] = now_monotonic

            await broadcast_host_snapshot_if_due(room, sync_state)

            last_host_snapshot = sync_state.get("last_host_snapshot_monotonic", 0.0)
            host_snapshot_stale = bool(last_host_snapshot) and (now_monotonic - last_host_snapshot > HOST_SNAPSHOT_STALE_SECONDS)
            was_host_stale = bool(sync_state.get("host_stale"))

            if host_snapshot_stale and not was_host_stale:
                sync_state["host_stale"] = True
                await broadcast_to_room(
                    room_id,
                    {
                        "type": "br_room_notice",
                        "payload": {
                            "kind": "sync_warning",
                            "message": "战场同步出现波动，服务器正在等待最新状态，请稍候。",
                            "lock_ms": 3600,
                        },
                        "timestamp": now_utc().timestamp(),
                    },
                )
            elif not host_snapshot_stale and was_host_stale:
                sync_state["host_stale"] = False
                await broadcast_to_room(
                    room_id,
                    {
                        "type": "br_room_notice",
                        "payload": {
                            "kind": "sync_restored",
                            "message": "战场同步已恢复，可以继续战斗。",
                            "lock_ms": 2200,
                        },
                        "timestamp": now_utc().timestamp(),
                    },
                )
    except asyncio.CancelledError:
        return


def ensure_room_runtime(room_id: str) -> None:
    existing = room_runtime_tasks.get(room_id)
    if existing and not existing.done():
        return
    room_runtime_tasks[room_id] = asyncio.create_task(run_room_runtime(room_id))


async def close_room(room_id: str, *, reason: str) -> None:
    cancel_room_runtime(room_id)
    room = active_rooms.pop(room_id, None)
    if not room:
        return
    await broadcast_to_room(
        room_id,
        {
            "type": "br_room_closed",
            "reason": reason,
            "timestamp": now_utc().timestamp(),
        },
    )


def cancel_disconnect_cleanup(key: str) -> None:
    task = disconnect_cleanup_tasks.pop(key, None)
    if task and not task.done():
        task.cancel()


async def finalize_disconnect_after_grace(room_id: str, user_id: int, key: str) -> None:
    try:
        await asyncio.sleep(DISCONNECT_GRACE_SECONDS)
    except asyncio.CancelledError:
        return

    room: Optional[Dict[str, Any]] = None
    should_close_room = False
    close_reason = ""
    should_emit_disconnect = False

    async with room_lock:
        if ws_connections.get(key):
            return

        room = active_rooms.get(room_id)
        if not room or user_id not in room["humans"]:
            return

        human = room["humans"][user_id]
        human["connected"] = False
        human["disconnected_at"] = human.get("disconnected_at") or iso_now()
        is_host = room["host_user_id"] == user_id
        if room["status"] == "waiting":
            room["humans"].pop(user_id, None)

            if is_host or not room["humans"]:
                should_close_room = True
                close_reason = "Host disconnected" if is_host else "All players disconnected"
        else:
            should_emit_disconnect = True

    if should_close_room:
        await close_room(room_id, reason=close_reason)
        return

    if room and should_emit_disconnect:
        await broadcast_to_room(
            room_id,
            {
                "type": "br_player_disconnected",
                "user_id": user_id,
                "timestamp": now_utc().timestamp(),
            },
        )

    if room:
        await broadcast_room_snapshot(room)


class RoomParticipantPayload(BaseModel):
    username: Optional[str] = Field(default=None, max_length=24)
    pet_type: str = Field(min_length=1, max_length=64)
    pet_name: str = Field(min_length=1, max_length=24)
    pet_stage: int = Field(default=3, ge=1, le=9)
    movement_skills: list[str] = Field(default_factory=list)
    age_group: str = Field(default="primary-upper", max_length=32)

    @field_validator("age_group")
    @classmethod
    def validate_age_group(cls, value: str) -> str:
        allowed = {"primary-lower", "primary-upper", "junior-high"}
        return value if value in allowed else "primary-upper"


class CreateRoomPayload(RoomParticipantPayload):
    room_name: str = Field(default="宠物生存乱斗", min_length=1, max_length=48)
    max_players: int = Field(default=MAX_ROOM_CAPACITY, ge=2, le=MAX_ROOM_CAPACITY)


class AddBotPayload(BaseModel):
    difficulty: Difficulty = "easy"


@router.get("/rooms")
async def list_rooms(current_user: User = Depends(get_current_user)):
    del current_user
    cleanup_rooms()
    rooms = [serialize_room(room) for room in active_rooms.values() if room["status"] == "waiting"]
    rooms.sort(key=lambda room: room["created_at"])
    return {"rooms": rooms, "cap": MAX_ROOM_CAPACITY}


@router.post("/rooms/create")
async def create_room(payload: CreateRoomPayload, current_user: User = Depends(get_current_user)):
    async with room_lock:
        cleanup_rooms()
        existing = find_user_room(current_user.id)
        if existing and existing["status"] != "finished":
            return {"room": serialize_room(existing), "reused": True, "cap": MAX_ROOM_CAPACITY}
        active_room_count = sum(1 for room in active_rooms.values() if room["status"] in {"waiting", "in_progress"})
        if active_room_count >= MAX_ACTIVE_ROOM_COUNT:
            raise HTTPException(
                status_code=503,
                detail="Battle Royale room slot is occupied",
            )

        room_id = generate_room_id()
        host_entry = build_human_entry(current_user, payload, is_host=True)
        room = {
            "id": room_id,
            "room_name": normalize_text(payload.room_name, fallback="宠物生存乱斗", max_length=48),
            "status": "waiting",
            "host_user_id": current_user.id,
            "host_username": host_entry["username"],
            "max_players": min(payload.max_players, MAX_ROOM_CAPACITY),
            "created_at": iso_now(),
            "started_at": None,
            "match_seed": None,
            "humans": {current_user.id: host_entry},
            "bots": [],
            "latest_snapshot": None,
            "latest_match_payload": None,
            "sync_state": build_sync_state(),
        }
        active_rooms[room_id] = room

    return {"room": serialize_room(room), "reused": False, "cap": MAX_ROOM_CAPACITY}


@router.get("/rooms/my-active")
async def get_my_active_room(current_user: User = Depends(get_current_user)):
    room = find_user_room(current_user.id)
    if not room or room["status"] == "finished":
        raise HTTPException(status_code=404, detail="No active room")

    human = room["humans"].get(current_user.id) or {}
    recoverable = room["status"] in {"waiting", "in_progress"} and (
        human.get("connected", True) or human.get("disconnected_at") is not None
    )
    return {"room": serialize_room(room), "cap": MAX_ROOM_CAPACITY, "recoverable": recoverable}


@router.get("/rooms/{room_id}")
async def get_room(room_id: str, current_user: User = Depends(get_current_user)):
    del current_user
    cleanup_rooms()
    room = active_rooms.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"room": serialize_room(room), "cap": MAX_ROOM_CAPACITY}


@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, payload: RoomParticipantPayload, current_user: User = Depends(get_current_user)):
    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["status"] != "waiting":
            raise HTTPException(status_code=400, detail="Room already started")

        existing = find_user_room(current_user.id)
        if existing and existing["id"] != room_id and existing["status"] != "finished":
            raise HTTPException(status_code=409, detail="You are already in another active room")

        if current_user.id in room["humans"]:
            return {"room": serialize_room(room), "joined": True}

        if room_participant_count(room) >= room["max_players"]:
            raise HTTPException(status_code=400, detail="Room is full")

        room["humans"][current_user.id] = build_human_entry(current_user, payload, is_host=False)

    await broadcast_room_snapshot(room)
    return {"room": serialize_room(room), "joined": True}


@router.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, current_user: User = Depends(get_current_user)):
    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            return {"success": True}

        if current_user.id not in room["humans"]:
            return {"success": True}

        cancel_disconnect_cleanup(connection_key(room_id, current_user.id))
        is_host = room["host_user_id"] == current_user.id
        room["humans"].pop(current_user.id, None)

        if is_host or not room["humans"]:
            await close_room(room_id, reason="Host left the room" if is_host else "All players left")
            return {"success": True}

    await broadcast_room_snapshot(room)
    return {"success": True}


@router.post("/rooms/{room_id}/bots")
async def add_bot(room_id: str, payload: AddBotPayload, current_user: User = Depends(get_current_user)):
    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["status"] != "waiting":
            raise HTTPException(status_code=400, detail="Cannot modify bots after the match starts")
        if room["host_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the host can manage bots")
        if room_participant_count(room) >= room["max_players"]:
            raise HTTPException(status_code=400, detail="Room is full")

        bot = build_bot_entry(payload.difficulty)
        room["bots"].append(bot)

    await broadcast_room_snapshot(room)
    return {"room": serialize_room(room), "bot": bot}


@router.delete("/rooms/{room_id}/bots/{bot_id}")
async def remove_bot(room_id: str, bot_id: str, current_user: User = Depends(get_current_user)):
    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["status"] != "waiting":
            raise HTTPException(status_code=400, detail="Cannot modify bots after the match starts")
        if room["host_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the host can manage bots")

        original_count = len(room["bots"])
        room["bots"] = [bot for bot in room["bots"] if bot["id"] != bot_id]
        if len(room["bots"]) == original_count:
            raise HTTPException(status_code=404, detail="Bot not found")

    await broadcast_room_snapshot(room)
    return {"room": serialize_room(room), "removed_bot_id": bot_id}


@router.post("/rooms/{room_id}/start")
async def start_room(room_id: str, current_user: User = Depends(get_current_user)):
    async with room_lock:
        cleanup_rooms()
        room = active_rooms.get(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["host_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the host can start the room")
        if room["status"] != "waiting":
            raise HTTPException(status_code=400, detail="Room already started")
        if room_participant_count(room) < 2:
            raise HTTPException(status_code=400, detail="At least two fighters are required")
        active_in_progress_rooms = sum(
            1
            for active_room in active_rooms.values()
            if active_room["status"] == "in_progress" and active_room["id"] != room_id
        )
        if active_in_progress_rooms >= MAX_IN_PROGRESS_ROOM_COUNT:
            raise HTTPException(
                status_code=503,
                detail="Battle Royale server is busy",
            )

        room["status"] = "in_progress"
        room["started_at"] = iso_now()
        room["match_seed"] = random.randint(100_000, 999_999_999)
        room["latest_snapshot"] = None
        room["latest_match_payload"] = None
        room["sync_state"] = build_sync_state()

    ensure_room_runtime(room_id)

    await broadcast_to_room(
        room_id,
        {
            "type": "br_room_started",
            "room": serialize_room(room),
            "timestamp": now_utc().timestamp(),
        },
    )
    return {"room": serialize_room(room), "started": True}


@router.post("/rooms/{room_id}/finish")
async def finish_room(
    room_id: str,
    winner_user_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            return {"success": True}
        if room["host_user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the host can finish the room")

        room["status"] = "finished"
        if room["started_at"] is None:
            room["started_at"] = iso_now()

    cancel_room_runtime(room_id)

    await broadcast_to_room(
        room_id,
        {
            "type": "br_room_finished",
            "winner_user_id": winner_user_id,
            "timestamp": now_utc().timestamp(),
        },
    )
    return {"success": True}


@router.websocket("/ws/{room_id}/{user_id}")
async def battle_royale_ws(
    websocket: WebSocket,
    room_id: str,
    user_id: int,
    token: Optional[str] = Query(default=None),
):
    try:
        verify_ws_token(token, user_id)
    except HTTPException as exc:
        await websocket.close(code=4401, reason=exc.detail)
        return

    await websocket.accept()
    key = connection_key(room_id, user_id)

    room = active_rooms.get(room_id)
    if not room or user_id not in room["humans"]:
        await websocket.send_json({"type": "br_room_closed", "reason": "Room not found"})
        await websocket.close(code=4404, reason="Room not found")
        return

    room["humans"][user_id]["connected"] = True
    room["humans"][user_id]["disconnected_at"] = None
    cancel_disconnect_cleanup(key)
    if room.get("status") == "in_progress":
        ensure_room_runtime(room_id)
    previous_websocket = ws_connections.get(key)
    ws_connections[key] = websocket
    ws_connection_locks.setdefault(key, asyncio.Lock())
    if previous_websocket and previous_websocket is not websocket:
        try:
            await previous_websocket.close(code=4001, reason="Superseded by a newer session")
        except Exception:
            pass

    await websocket.send_json(
        {
            "type": "connected",
            "room": serialize_room(room),
            "latest_snapshot": room.get("latest_snapshot"),
            "latest_match_payload": room.get("latest_match_payload"),
            "recoverable": room["status"] in {"waiting", "in_progress"},
            "timestamp": now_utc().timestamp(),
        }
    )

    try:
        while True:
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)
            message_type = message.get("type")

            if message_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": now_utc().timestamp()})
                continue

            current_room = active_rooms.get(room_id)
            if not current_room:
                await websocket.send_json({"type": "br_room_closed", "reason": "Room closed"})
                continue

            if message_type == "br_input":
                sync_state = current_room.setdefault("sync_state", build_sync_state())
                input_state = sync_state.setdefault("input_state", {})
                pending_guest_inputs = sync_state.setdefault("pending_guest_inputs", {})
                payload = message.get("payload", {})
                payload_signature = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
                previous_input_state = input_state.get(user_id, {})
                now_monotonic = monotonic_time()
                if (
                    payload_signature == previous_input_state.get("signature")
                    and now_monotonic - previous_input_state.get("seen_at", 0.0) < INPUT_DUPLICATE_INTERVAL_SECONDS
                ):
                    continue
                previous_pending_payload = pending_guest_inputs.get(user_id, {}).get("payload", {})
                merged_payload = merge_input_payload(previous_pending_payload, payload)
                pending_guest_inputs[user_id] = {
                    "payload": merged_payload,
                    "queued_at": now_monotonic,
                }
                input_state[user_id] = {
                    **previous_input_state,
                    "signature": payload_signature,
                    "seen_at": now_monotonic,
                }

                can_forward_immediately = (
                    current_room["host_user_id"] != user_id
                    and now_monotonic - previous_input_state.get("forwarded_at", 0.0) >= INPUT_FORWARD_MIN_INTERVAL_SECONDS
                )
                if can_forward_immediately:
                    sent = await send_to_user(
                        room_id,
                        current_room["host_user_id"],
                        {
                            "type": "br_input",
                            "user_id": user_id,
                            "payload": merged_payload,
                            "timestamp": now_utc().timestamp(),
                        },
                    )
                    if sent:
                        input_state[user_id] = {
                            **input_state[user_id],
                            "forwarded_at": now_monotonic,
                        }
                        pending_guest_inputs.pop(user_id, None)
            elif message_type == "br_snapshot":
                if current_room["host_user_id"] != user_id:
                    continue
                sync_state = current_room.setdefault("sync_state", build_sync_state())
                payload = message.get("payload", {})
                sync_state["pending_snapshot"] = payload
                sync_state["pending_snapshot_version"] = sync_state.get("pending_snapshot_version", 0) + 1
                sync_state["last_host_snapshot_monotonic"] = monotonic_time()
                sync_state["host_stale"] = False
                current_room["latest_snapshot"] = payload
                await broadcast_host_snapshot_if_due(current_room, sync_state)
            elif message_type == "br_quiz_offer":
                if current_room["host_user_id"] != user_id:
                    continue
                target_user_id = int(message.get("target_user_id", 0))
                await send_to_user(
                    room_id,
                    target_user_id,
                    {
                        "type": "br_quiz_offer",
                        "payload": message.get("payload", {}),
                        "timestamp": now_utc().timestamp(),
                    },
                )
            elif message_type == "br_quiz_submit":
                await send_to_user(
                    room_id,
                    current_room["host_user_id"],
                    {
                        "type": "br_quiz_submit",
                        "user_id": user_id,
                        "payload": message.get("payload", {}),
                        "timestamp": now_utc().timestamp(),
                    },
                )
            elif message_type == "br_quiz_result":
                if current_room["host_user_id"] != user_id:
                    continue
                target_user_id = int(message.get("target_user_id", 0))
                await send_to_user(
                    room_id,
                    target_user_id,
                    {
                        "type": "br_quiz_result",
                        "payload": message.get("payload", {}),
                        "timestamp": now_utc().timestamp(),
                    },
                )
            elif message_type == "br_room_notice":
                await broadcast_to_room(
                    room_id,
                    {
                        "type": "br_room_notice",
                        "payload": message.get("payload", {}),
                        "timestamp": now_utc().timestamp(),
                    },
                    exclude_user=None,
                )
            elif message_type == "br_match_end":
                if current_room["host_user_id"] != user_id:
                    continue
                current_room["latest_match_payload"] = message.get("payload", {})
                await broadcast_to_room(
                    room_id,
                    {
                        "type": "br_match_end",
                        "payload": message.get("payload", {}),
                        "timestamp": now_utc().timestamp(),
                    },
                )

    except WebSocketDisconnect:
        if ws_connections.get(key) is not websocket:
            return

        drop_ws_connection(key)
        cancel_disconnect_cleanup(key)
        room = active_rooms.get(room_id)
        if room and user_id in room["humans"]:
            room["humans"][user_id]["connected"] = False
            room["humans"][user_id]["disconnected_at"] = iso_now()
            await broadcast_room_snapshot(room)
        disconnect_cleanup_tasks[key] = asyncio.create_task(
            finalize_disconnect_after_grace(room_id, user_id, key)
        )
