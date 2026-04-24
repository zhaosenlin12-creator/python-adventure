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
SyncMode = Literal["host_authoritative", "local_coop"]

MAX_ROOM_CAPACITY = 8
MAX_HUMAN_PLAYERS = 4
MAX_ACTIVE_ROOM_COUNT = 4
MAX_IN_PROGRESS_ROOM_COUNT = 2
ROOM_EXPIRY_MINUTES = 30
FINISHED_ROOM_TTL_MINUTES = 5
DISCONNECT_GRACE_SECONDS = 12.0
IN_PROGRESS_HOST_DISCONNECT_GRACE_SECONDS = 2.8
ROOM_RUNTIME_TICK_SECONDS = 0.016
SERVER_SNAPSHOT_INTERVAL_SECONDS = 0.033
SERVER_INPUT_BATCH_INTERVAL_SECONDS = 0.016
HOST_SNAPSHOT_STALE_SECONDS = 3.0
INPUT_FORWARD_MIN_INTERVAL_SECONDS = 0.016
INPUT_DUPLICATE_INTERVAL_SECONDS = 0.022
SEND_JSON_TIMEOUT_SECONDS = 0.2
DEFAULT_SYNC_MODE: SyncMode = "local_coop"
FIGHTER_HP = 120
MATCH_MAX_MS = 360000
LOCAL_COOP_SHARED_BOT_BROADCAST_INTERVAL_SECONDS = 0.15
BOT_DAMAGE_EVENT_TTL_SECONDS = 30.0

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

DEFAULT_ENEMY_SQUAD: tuple[Difficulty, ...] = ("easy", "medium", "medium", "hard")

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


def fighter_id_for_user(user_id: int) -> str:
    return f"human-{user_id}"


def room_participant_count(room: Dict[str, Any]) -> int:
    return len(room["humans"]) + len(room["bots"])


def room_human_count(room: Dict[str, Any]) -> int:
    return len(room["humans"])


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
        "presence_states": {},
        "shared_bots": {},
        "shared_bot_version": 0,
        "broadcast_shared_bot_version": 0,
        "last_shared_bot_broadcast_monotonic": 0.0,
        "processed_bot_damage_events": {},
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


def read_int_value(value: Any, fallback: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def room_elapsed_ms(room: Dict[str, Any]) -> int:
    started_at_raw = room.get("started_at")
    if not started_at_raw:
        return 0
    try:
        started_at = datetime.fromisoformat(str(started_at_raw))
    except (TypeError, ValueError):
        return 0
    elapsed = now_utc() - started_at
    return max(0, int(elapsed.total_seconds() * 1000))


def sanitize_presence_payload(user_id: int, room: Dict[str, Any], payload: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return None

    fighter_payload = payload.get("fighter")
    if not isinstance(fighter_payload, dict):
        return None

    human = room.get("humans", {}).get(user_id, {})
    server_updated_at = int(time.time() * 1000)
    client_updated_at = read_int_value(payload.get("updated_at"), server_updated_at)
    kills = max(0, read_int_value(payload.get("kills", fighter_payload.get("kills")), 0))
    damage_dealt = max(0, read_int_value(payload.get("damage_dealt", fighter_payload.get("damage_dealt")), 0))
    quiz_pending = bool(payload.get("quiz_pending", fighter_payload.get("quiz_pending", False)))

    return {
        "fighter": {
            "id": normalize_text(
                str(fighter_payload.get("id") or f"fighter-{user_id}"),
                fallback=f"fighter-{user_id}",
                max_length=40,
            ),
            "name": normalize_text(
                str(fighter_payload.get("name") or human.get("username") or f"player-{user_id}"),
                fallback=f"player-{user_id}",
                max_length=24,
            ),
            "pet_type": normalize_pet_type(str(fighter_payload.get("pet_type") or fighter_payload.get("petType") or human.get("pet_type") or "code_kitty")),
            "pet_stage": max(1, read_int_value(fighter_payload.get("pet_stage", fighter_payload.get("petStage", human.get("pet_stage", 3))), 3)),
            "x": read_int_value(fighter_payload.get("x"), 0),
            "y": read_int_value(fighter_payload.get("y"), 0),
            "vx": read_int_value(fighter_payload.get("vx"), 0),
            "vy": read_int_value(fighter_payload.get("vy"), 0),
            "hp": max(0, read_int_value(fighter_payload.get("hp"), 0)),
            "shield": max(0, read_int_value(fighter_payload.get("shield"), 0)),
            "armor": max(0, read_int_value(fighter_payload.get("armor"), 0)),
            "kills": kills,
            "alive": bool(fighter_payload.get("alive", payload.get("alive", True))),
            "facing": -1 if fighter_payload.get("facing") == -1 else 1,
            "quiz_pending": quiz_pending,
            "damage_dealt": damage_dealt,
            "special_charges": max(0, read_int_value(fighter_payload.get("special_charges"), 0)),
            "weapon_ready": bool(fighter_payload.get("weapon_ready", True)),
            "swing_ms": max(0, read_int_value(fighter_payload.get("swing_ms"), 0)),
            "hit_flash_ms": max(0, read_int_value(fighter_payload.get("hit_flash_ms"), 0)),
        },
        "local_bot_alive_count": max(0, read_int_value(payload.get("local_bot_alive_count"), 0)),
        "cleared": bool(payload.get("cleared")),
        "alive": bool(payload.get("alive", fighter_payload.get("alive", True))),
        "quiz_pending": quiz_pending,
        "kills": kills,
        "damage_dealt": damage_dealt,
        "updated_at": client_updated_at,
        "server_updated_at": server_updated_at,
    }


def build_shared_bot_state(bot: Dict[str, Any]) -> Dict[str, Any]:
    updated_at = int(time.time() * 1000)
    return {
        "id": bot["id"],
        "name": bot["name"],
        "difficulty": bot["difficulty"],
        "pet_type": bot["pet_type"],
        "pet_stage": bot.get("pet_stage", 3),
        "hp": FIGHTER_HP,
        "max_hp": FIGHTER_HP,
        "shield": 0,
        "armor": 0,
        "alive": True,
        "last_attacker_id": None,
        "updated_at": updated_at,
    }


def ensure_shared_bot_states(room: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    sync_state = room.setdefault("sync_state", build_sync_state())
    shared_bots = sync_state.setdefault("shared_bots", {})
    bot_ids = {bot["id"] for bot in room["bots"]}

    for bot in room["bots"]:
        if not isinstance(shared_bots.get(bot["id"]), dict):
            shared_bots[bot["id"]] = build_shared_bot_state(bot)

    for bot_id in list(shared_bots.keys()):
        if bot_id not in bot_ids:
            shared_bots.pop(bot_id, None)

    return shared_bots


def serialize_shared_bot_states(room: Dict[str, Any]) -> list[Dict[str, Any]]:
    shared_bots = ensure_shared_bot_states(room)
    return [
        {
            **state,
            "hp": max(0, read_int_value(state.get("hp"), FIGHTER_HP)),
            "max_hp": max(FIGHTER_HP, read_int_value(state.get("max_hp"), FIGHTER_HP)),
            "shield": max(0, read_int_value(state.get("shield"), 0)),
            "armor": max(0, read_int_value(state.get("armor"), 0)),
            "alive": bool(state.get("alive", True)),
        }
        for _, state in sorted(shared_bots.items(), key=lambda item: item[0])
        if isinstance(state, dict)
    ]


def get_shared_bot_version(room: Dict[str, Any]) -> int:
    sync_state = room.setdefault("sync_state", build_sync_state())
    return read_int_value(sync_state.get("shared_bot_version"), 0)


def sanitize_bot_damage_payload(user_id: int, room: Dict[str, Any], payload: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(payload, dict):
        return None

    target_id = normalize_text(str(payload.get("target_id") or ""), fallback="", max_length=64)
    if not target_id:
        return None

    if target_id not in {bot["id"] for bot in room["bots"]}:
        return None

    damage = max(1, min(120, read_int_value(payload.get("damage"), 0)))
    event_id = normalize_text(
        str(payload.get("event_id") or f"{user_id}-{int(time.time() * 1000)}"),
        fallback=f"{user_id}-{int(time.time() * 1000)}",
        max_length=96,
    )

    return {
        "target_id": target_id,
        "damage": damage,
        "event_id": event_id,
        "source_id": fighter_id_for_user(user_id),
    }


def apply_shared_bot_damage(room: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    sync_state = room.setdefault("sync_state", build_sync_state())
    processed_events = sync_state.setdefault("processed_bot_damage_events", {})
    now_monotonic = monotonic_time()

    for event_id, seen_at in list(processed_events.items()):
        if now_monotonic - float(seen_at) > BOT_DAMAGE_EVENT_TTL_SECONDS:
            processed_events.pop(event_id, None)

    event_id = payload["event_id"]
    if event_id in processed_events:
        return False
    processed_events[event_id] = now_monotonic

    shared_bots = ensure_shared_bot_states(room)
    bot_state = shared_bots.get(payload["target_id"])
    if not isinstance(bot_state, dict):
        return False

    current_hp = max(0, read_int_value(bot_state.get("hp"), FIGHTER_HP))
    if current_hp <= 0 or not bool(bot_state.get("alive", True)):
        bot_state["hp"] = 0
        bot_state["alive"] = False
        return False

    next_hp = max(0, current_hp - max(1, read_int_value(payload.get("damage"), 0)))
    if next_hp == current_hp:
        return False

    bot_state["hp"] = next_hp
    bot_state["shield"] = 0
    bot_state["armor"] = 0
    bot_state["alive"] = next_hp > 0
    bot_state["last_attacker_id"] = payload.get("source_id")
    bot_state["updated_at"] = int(time.time() * 1000)
    sync_state["shared_bot_version"] = read_int_value(sync_state.get("shared_bot_version"), 0) + 1
    return True


def build_local_coop_human_fighter_view(human: Dict[str, Any], state: Dict[str, Any], elapsed_ms: int) -> Dict[str, Any]:
    fighter = state.get("fighter", {}) if isinstance(state.get("fighter"), dict) else {}
    quiz_pending = bool(state.get("quiz_pending", fighter.get("quiz_pending", False)))
    alive = bool(state.get("alive", fighter.get("alive", True)))
    return {
        "id": fighter.get("id") or fighter_id_for_user(human["user_id"]),
        "userId": human["user_id"],
        "name": fighter.get("name") or human["username"],
        "petType": fighter.get("pet_type") or human.get("pet_type", "code_kitty"),
        "petStage": max(1, read_int_value(fighter.get("pet_stage", human.get("pet_stage", 3)), 3)),
        "x": read_int_value(fighter.get("x"), 0),
        "y": read_int_value(fighter.get("y"), 0),
        "vx": read_int_value(fighter.get("vx"), 0),
        "vy": read_int_value(fighter.get("vy"), 0),
        "hp": max(0, read_int_value(fighter.get("hp"), FIGHTER_HP)),
        "maxHp": max(FIGHTER_HP, read_int_value(fighter.get("max_hp"), FIGHTER_HP)),
        "shield": max(0, read_int_value(fighter.get("shield"), 0)),
        "armor": max(0, read_int_value(fighter.get("armor"), 0)),
        "kills": max(0, read_int_value(state.get("kills", fighter.get("kills")), 0)),
        "alive": alive,
        "facing": -1 if read_int_value(fighter.get("facing"), 1) == -1 else 1,
        "isBot": False,
        "hasRevived": bool(fighter.get("has_revived", fighter.get("hasRevived", False))),
        "reviveUsed": bool(fighter.get("revive_used", fighter.get("reviveUsed", False))),
        "quizPending": quiz_pending,
        "damageDealt": max(0, read_int_value(state.get("damage_dealt", fighter.get("damage_dealt")), 0)),
        "survivedMs": elapsed_ms,
        "specialCharges": max(0, read_int_value(fighter.get("special_charges"), 0)),
        "buffs": fighter.get("buffs", {}) if isinstance(fighter.get("buffs"), dict) else {},
        "weaponReady": bool(fighter.get("weapon_ready", True)),
        "swingMs": max(0, read_int_value(fighter.get("swing_ms"), 0)),
        "hitFlashMs": max(0, read_int_value(fighter.get("hit_flash_ms"), 0)),
    }


def build_local_coop_bot_fighter_view(bot: Dict[str, Any], state: Dict[str, Any], elapsed_ms: int) -> Dict[str, Any]:
    return {
        "id": bot["id"],
        "name": bot["name"],
        "petType": bot["pet_type"],
        "petStage": max(1, read_int_value(bot.get("pet_stage"), 3)),
        "x": 0,
        "y": 0,
        "vx": 0,
        "vy": 0,
        "hp": max(0, read_int_value(state.get("hp"), FIGHTER_HP)),
        "maxHp": max(FIGHTER_HP, read_int_value(state.get("max_hp"), FIGHTER_HP)),
        "shield": max(0, read_int_value(state.get("shield"), 0)),
        "armor": max(0, read_int_value(state.get("armor"), 0)),
        "kills": 0,
        "alive": bool(state.get("alive", True)),
        "facing": 1,
        "isBot": True,
        "difficulty": bot["difficulty"],
        "hasRevived": False,
        "reviveUsed": True,
        "quizPending": False,
        "damageDealt": 0,
        "survivedMs": elapsed_ms,
        "specialCharges": 0,
        "buffs": {},
        "weaponReady": True,
        "swingMs": 0,
        "hitFlashMs": 0,
    }


def fighter_remaining_power(fighter: Dict[str, Any]) -> int:
    return (
        max(0, read_int_value(fighter.get("hp"), 0))
        + max(0, read_int_value(fighter.get("shield"), 0))
        + max(0, read_int_value(fighter.get("armor"), 0))
    )


def build_local_coop_fighter_views(room: Dict[str, Any]) -> list[Dict[str, Any]]:
    elapsed_ms = room_elapsed_ms(room)
    sync_state = room.setdefault("sync_state", build_sync_state())
    presence_states = sync_state.setdefault("presence_states", {})
    shared_bots = ensure_shared_bot_states(room)

    fighters: list[Dict[str, Any]] = []
    for human in sorted_humans(room):
        state = presence_states.get(human["user_id"])
        if isinstance(state, dict):
            fighters.append(build_local_coop_human_fighter_view(human, state, elapsed_ms))

    for bot in room["bots"]:
        bot_state = shared_bots.get(bot["id"])
        if isinstance(bot_state, dict):
            fighters.append(build_local_coop_bot_fighter_view(bot, bot_state, elapsed_ms))

    return fighters


def payload_has_edge_input(payload: Dict[str, Any]) -> bool:
    input_payload = payload.get("input", {}) if isinstance(payload, dict) else {}
    if not isinstance(input_payload, dict):
        return False
    return any(bool(input_payload.get(field)) for field in INPUT_EDGE_FIELDS)


def sorted_humans(room: Dict[str, Any]) -> list[Dict[str, Any]]:
    humans = list(room["humans"].values())
    return sorted(humans, key=lambda item: (not item["is_host"], item["joined_at"]))


def serialize_room(room: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": room["id"],
        "room_name": room["room_name"],
        "status": room["status"],
        "sync_mode": room.get("sync_mode", DEFAULT_SYNC_MODE),
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


def serialize_presence_states(room: Dict[str, Any]) -> list[Dict[str, Any]]:
    sync_state = room.setdefault("sync_state", build_sync_state())
    presence_states = sync_state.setdefault("presence_states", {})
    return [
        {
            **payload,
            "user_id": user_id,
        }
        for user_id, payload in sorted(presence_states.items(), key=lambda item: item[0])
        if isinstance(payload, dict)
    ]


def build_local_coop_match_payload(room: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if room.get("sync_mode", DEFAULT_SYNC_MODE) != "local_coop":
        return None

    sync_state = room.setdefault("sync_state", build_sync_state())
    presence_states = sync_state.setdefault("presence_states", {})
    shared_bots = ensure_shared_bot_states(room)
    active_humans = [
        human
        for human in sorted_humans(room)
        if human.get("connected", True)
    ]
    if not active_humans:
        return None

    active_states = [presence_states.get(human["user_id"]) for human in active_humans]
    if any(not isinstance(state, dict) for state in active_states):
        return None

    typed_states = [state for state in active_states if isinstance(state, dict)]
    if len(typed_states) != len(active_humans):
        return None

    if room_human_count(room) <= 1:
        if all(bool(state.get("cleared")) for state in typed_states):
            winner_state = max(
                typed_states,
                key=lambda state: (
                    int(state.get("kills", 0)),
                    float(state.get("damage_dealt", 0)),
                    -float(state.get("local_bot_alive_count", 0)),
                ),
            )
            return {
                "winnerId": winner_state.get("fighter", {}).get("id"),
                "humanSideWon": True,
                "humansWon": True,
                "reason": "clear",
                "mode": "local_coop",
                "fighters": [
                    state.get("fighter", {})
                    for state in typed_states
                    if isinstance(state.get("fighter"), dict)
                ],
            }

        any_human_alive = any(bool(state.get("alive")) or bool(state.get("quiz_pending")) for state in typed_states)
        if not any_human_alive:
            return {
                "winnerId": None,
                "humanSideWon": False,
                "humansWon": False,
                "reason": "clear",
                "mode": "local_coop",
                "fighters": [
                    state.get("fighter", {})
                    for state in typed_states
                    if isinstance(state.get("fighter"), dict)
                ],
            }

        return None

    human_views = [
        build_local_coop_human_fighter_view(human, state, room_elapsed_ms(room))
        for human, state in zip(active_humans, typed_states)
    ]
    bot_views = [
        build_local_coop_bot_fighter_view(bot, shared_bots[bot["id"]], room_elapsed_ms(room))
        for bot in room["bots"]
        if isinstance(shared_bots.get(bot["id"]), dict)
    ]
    alive_bots = [fighter for fighter in bot_views if fighter["alive"]]
    alive_humans = [
        fighter
        for fighter in human_views
        if fighter["alive"] or fighter["quizPending"]
    ]

    if not alive_bots and alive_humans:
        winner_state = max(
            human_views,
            key=lambda fighter: (
                int(fighter.get("kills", 0)),
                float(fighter.get("damageDealt", 0)),
                float(fighter_remaining_power(fighter)),
            ),
        )
        return {
            "winnerId": winner_state.get("id"),
            "humanSideWon": True,
            "humansWon": True,
            "reason": "clear",
            "mode": "local_coop",
            "fighters": human_views + bot_views,
        }

    if not alive_humans:
        return {
            "winnerId": alive_bots[0]["id"] if alive_bots else None,
            "humanSideWon": False,
            "humansWon": False,
            "reason": "clear",
            "mode": "local_coop",
            "fighters": human_views + bot_views,
        }

    elapsed_ms = room_elapsed_ms(room)
    if elapsed_ms < MATCH_MAX_MS:
        return None

    if len(alive_humans) != len(alive_bots):
        human_side_won = len(alive_humans) > len(alive_bots)
        return {
            "winnerId": (alive_humans[0]["id"] if human_side_won else alive_bots[0]["id"]) if (alive_humans or alive_bots) else None,
            "humanSideWon": human_side_won,
            "humansWon": human_side_won,
            "reason": "timeout",
            "mode": "local_coop",
            "fighters": human_views + bot_views,
        }

    human_power = sum(fighter_remaining_power(fighter) for fighter in alive_humans)
    bot_power = sum(fighter_remaining_power(fighter) for fighter in alive_bots)
    if human_power != bot_power:
        human_side_won = human_power > bot_power
        return {
            "winnerId": (alive_humans[0]["id"] if human_side_won else alive_bots[0]["id"]) if (alive_humans or alive_bots) else None,
            "humanSideWon": human_side_won,
            "humansWon": human_side_won,
            "reason": "timeout",
            "mode": "local_coop",
            "fighters": human_views + bot_views,
        }

    human_kills = sum(max(0, read_int_value(fighter.get("kills"), 0)) for fighter in human_views)
    defeated_bots = len([fighter for fighter in bot_views if not fighter["alive"]])
    human_side_won = human_kills >= defeated_bots
    return {
        "winnerId": (alive_humans[0]["id"] if human_side_won else alive_bots[0]["id"]) if (alive_humans or alive_bots) else None,
        "humanSideWon": human_side_won,
        "humansWon": human_side_won,
        "reason": "timeout",
        "mode": "local_coop",
        "fighters": human_views + bot_views,
    }


async def broadcast_shared_bot_states(room: Dict[str, Any], *, force: bool = False) -> bool:
    if room.get("sync_mode", DEFAULT_SYNC_MODE) != "local_coop":
        return False

    sync_state = room.setdefault("sync_state", build_sync_state())
    now_monotonic = monotonic_time()
    if (
        not force
        and now_monotonic - sync_state.get("last_shared_bot_broadcast_monotonic", 0.0)
        < LOCAL_COOP_SHARED_BOT_BROADCAST_INTERVAL_SECONDS
    ):
        return False

    payload = {
        "bots": serialize_shared_bot_states(room),
        "version": read_int_value(sync_state.get("shared_bot_version"), 0),
    }
    sync_state["broadcast_shared_bot_version"] = payload["version"]
    sync_state["last_shared_bot_broadcast_monotonic"] = now_monotonic
    await broadcast_to_room(
        room["id"],
        {
            "type": "br_shared_bot_states",
            "payload": payload,
            "timestamp": now_utc().timestamp(),
        },
    )
    return True


def cleanup_rooms() -> None:
    current_time = now_utc()
    stale_ids: list[str] = []

    def disconnected_beyond_grace(human: Dict[str, Any]) -> bool:
        if human.get("connected", True):
            return False
        disconnected_at_raw = human.get("disconnected_at")
        if not disconnected_at_raw:
            return True
        try:
            disconnected_at = datetime.fromisoformat(disconnected_at_raw)
        except ValueError:
            return True
        return current_time - disconnected_at > timedelta(seconds=DISCONNECT_GRACE_SECONDS)

    for room_id, room in active_rooms.items():
        created_at = datetime.fromisoformat(room["created_at"])
        started_at = datetime.fromisoformat(room["started_at"]) if room["started_at"] else None
        humans = room.get("humans", {})
        host_entry = humans.get(room.get("host_user_id"))

        if room["status"] == "finished":
            if started_at and current_time - started_at > timedelta(minutes=FINISHED_ROOM_TTL_MINUTES):
                stale_ids.append(room_id)
            elif current_time - created_at > timedelta(minutes=ROOM_EXPIRY_MINUTES):
                stale_ids.append(room_id)
            continue

        if room["status"] == "in_progress":
            if not humans:
                stale_ids.append(room_id)
                continue
            if host_entry is None:
                next_host_user_id = promote_room_host(room, connected_only=True)
                if next_host_user_id is None:
                    stale_ids.append(room_id)
                continue
            if disconnected_beyond_grace(host_entry):
                humans.pop(room["host_user_id"], None)
                if not humans:
                    stale_ids.append(room_id)
                    continue
                next_host_user_id = promote_room_host(room, connected_only=True)
                if next_host_user_id is None:
                    stale_ids.append(room_id)
                continue
            if all(disconnected_beyond_grace(human) for human in humans.values()):
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


def build_default_enemy_squad(max_players: int) -> list[Dict[str, Any]]:
    available_slots = max(0, min(max_players, MAX_ROOM_CAPACITY) - 1)
    default_bot_count = min(len(DEFAULT_ENEMY_SQUAD), available_slots)
    return [build_bot_entry(DEFAULT_ENEMY_SQUAD[index]) for index in range(default_bot_count)]


def resolve_sync_mode_for_start(room: Dict[str, Any]) -> SyncMode:
    return DEFAULT_SYNC_MODE


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
    await broadcast_room_update(room)


async def broadcast_room_update(
    room: Dict[str, Any],
    *,
    host_changed: bool = False,
    previous_host_user_id: Optional[int] = None,
    latest_snapshot: Optional[Dict[str, Any]] = None,
) -> None:
    await broadcast_to_room(
        room["id"],
        {
            "type": "br_room_update",
            "room": serialize_room(room),
            "presence_states": serialize_presence_states(room),
            "shared_bot_states": serialize_shared_bot_states(room),
            "shared_bot_version": get_shared_bot_version(room),
            "host_changed": host_changed,
            "previous_host_user_id": previous_host_user_id,
            "latest_snapshot": latest_snapshot if host_changed else None,
            "timestamp": now_utc().timestamp(),
        },
    )


def cancel_room_runtime(room_id: str) -> None:
    task = room_runtime_tasks.pop(room_id, None)
    if task and not task.done():
        task.cancel()


def assign_room_host(room: Dict[str, Any], new_host_user_id: int) -> None:
    if new_host_user_id not in room["humans"]:
        raise KeyError(f"Host user {new_host_user_id} not found in room {room['id']}")
    room["host_user_id"] = new_host_user_id
    room["host_username"] = room["humans"][new_host_user_id]["username"]
    for human_user_id, human in room["humans"].items():
        human["is_host"] = human_user_id == new_host_user_id


def promote_room_host(room: Dict[str, Any], *, connected_only: bool) -> Optional[int]:
    candidates = sorted(
        (
            (human_user_id, human)
            for human_user_id, human in room["humans"].items()
            if not connected_only or human.get("connected", True)
        ),
        key=lambda item: item[1].get("joined_at", ""),
    )
    if not candidates:
        return None

    next_host_user_id, _ = candidates[0]
    assign_room_host(room, next_host_user_id)
    room["sync_state"] = build_sync_state()
    return next_host_user_id


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
    room = active_rooms.get(room_id)
    if room and room.get("sync_mode", DEFAULT_SYNC_MODE) == "local_coop":
        cancel_room_runtime(room_id)
        return

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


def disconnect_grace_for_room(room: Optional[Dict[str, Any]], user_id: int) -> float:
    if not room:
        return DISCONNECT_GRACE_SECONDS

    if room.get("status") != "in_progress":
        return DISCONNECT_GRACE_SECONDS

    if room.get("host_user_id") == user_id:
        return min(DISCONNECT_GRACE_SECONDS, IN_PROGRESS_HOST_DISCONNECT_GRACE_SECONDS)

    return DISCONNECT_GRACE_SECONDS


async def handle_live_disconnect(
    room_id: str,
    user_id: int,
    key: str,
    websocket: WebSocket,
) -> None:
    if ws_connections.get(key) is not websocket:
        return

    drop_ws_connection(key)
    cancel_disconnect_cleanup(key)
    room = active_rooms.get(room_id)
    if room and user_id in room["humans"]:
        room["humans"][user_id]["connected"] = False
        room["humans"][user_id]["disconnected_at"] = iso_now()
        await broadcast_room_update(room)
    grace_seconds = disconnect_grace_for_room(room, user_id)
    disconnect_cleanup_tasks[key] = asyncio.create_task(
        finalize_disconnect_after_grace(
            room_id,
            user_id,
            key,
            grace_seconds=grace_seconds,
        )
    )


async def finalize_disconnect_after_grace(
    room_id: str,
    user_id: int,
    key: str,
    *,
    grace_seconds: float,
) -> None:
    try:
        await asyncio.sleep(grace_seconds)
    except asyncio.CancelledError:
        return

    room: Optional[Dict[str, Any]] = None
    should_close_room = False
    close_reason = ""
    should_emit_disconnect = False
    should_broadcast = False
    host_changed = False
    previous_host_user_id: Optional[int] = None
    latest_snapshot: Optional[Dict[str, Any]] = None

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

            if not room["humans"]:
                should_close_room = True
                close_reason = "Host disconnected" if is_host else "All players disconnected"
            elif is_host:
                previous_host_user_id = user_id
                next_host_user_id = promote_room_host(room, connected_only=False)
                if next_host_user_id is None:
                    should_close_room = True
                    close_reason = "Host disconnected"
                else:
                    host_changed = True
                    should_broadcast = True
            else:
                should_broadcast = True
        else:
            connected_humans = [
                human
                for human in room["humans"].values()
                if human.get("connected", True)
            ]
            if is_host:
                room["humans"].pop(user_id, None)
                previous_host_user_id = user_id
                next_host_user_id = promote_room_host(room, connected_only=True)
                if next_host_user_id is None:
                    should_close_room = True
                    close_reason = "Host disconnected"
                else:
                    host_changed = True
                    should_broadcast = True
                    latest_snapshot = room.get("latest_snapshot")
            elif not connected_humans:
                should_close_room = True
                close_reason = "All players disconnected"
            else:
                should_emit_disconnect = True
                should_broadcast = True

    if should_close_room:
        await close_room(room_id, reason=close_reason)
        return

    if room and should_broadcast:
        await broadcast_room_update(
            room,
            host_changed=host_changed,
            previous_host_user_id=previous_host_user_id,
            latest_snapshot=latest_snapshot,
        )

    if room and should_emit_disconnect:
        await broadcast_to_room(
            room_id,
            {
                "type": "br_player_disconnected",
                "user_id": user_id,
                "timestamp": now_utc().timestamp(),
            },
        )


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
        max_players = min(payload.max_players, MAX_ROOM_CAPACITY)
        room = {
            "id": room_id,
            "room_name": normalize_text(payload.room_name, fallback="宠物生存乱斗", max_length=48),
            "status": "waiting",
            "sync_mode": DEFAULT_SYNC_MODE,
            "host_user_id": current_user.id,
            "host_username": host_entry["username"],
            "max_players": max_players,
            "created_at": iso_now(),
            "started_at": None,
            "match_seed": None,
            "humans": {current_user.id: host_entry},
            "bots": build_default_enemy_squad(max_players),
            "latest_snapshot": None,
            "latest_match_payload": None,
            "sync_state": build_sync_state(),
        }
        ensure_shared_bot_states(room)
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

        if room_human_count(room) >= MAX_HUMAN_PLAYERS:
            raise HTTPException(status_code=400, detail="Battle Royale only supports four human players")

        if room_participant_count(room) >= room["max_players"]:
            raise HTTPException(status_code=400, detail="Room is full")

        room["humans"][current_user.id] = build_human_entry(current_user, payload, is_host=False)

    await broadcast_room_snapshot(room)
    return {"room": serialize_room(room), "joined": True}


@router.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, current_user: User = Depends(get_current_user)):
    should_close_room = False
    close_reason = ""
    should_broadcast = False
    host_changed = False
    previous_host_user_id: Optional[int] = None
    latest_snapshot: Optional[Dict[str, Any]] = None

    async with room_lock:
        room = active_rooms.get(room_id)
        if not room:
            return {"success": True}

        if current_user.id not in room["humans"]:
            return {"success": True}

        cancel_disconnect_cleanup(connection_key(room_id, current_user.id))
        is_host = room["host_user_id"] == current_user.id
        room["humans"].pop(current_user.id, None)

        if not room["humans"]:
            should_close_room = True
            close_reason = "Host left the room" if is_host else "All players left"
        elif is_host:
            previous_host_user_id = current_user.id
            next_host_user_id = promote_room_host(room, connected_only=room["status"] == "in_progress")
            if next_host_user_id is None:
                should_close_room = True
                close_reason = "Host left the room"
            else:
                host_changed = True
                should_broadcast = True
                latest_snapshot = room.get("latest_snapshot") if room["status"] == "in_progress" else None
        else:
            should_broadcast = True

    if should_close_room:
        await close_room(room_id, reason=close_reason)
        return {"success": True}

    if should_broadcast:
        await broadcast_room_update(
            room,
            host_changed=host_changed,
            previous_host_user_id=previous_host_user_id,
            latest_snapshot=latest_snapshot,
        )
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
        ensure_shared_bot_states(room)

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
        ensure_shared_bot_states(room)

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

        room["sync_mode"] = resolve_sync_mode_for_start(room)
        room["status"] = "in_progress"
        room["started_at"] = iso_now()
        room["match_seed"] = random.randint(100_000, 999_999_999)
        room["latest_snapshot"] = None
        room["latest_match_payload"] = None
        room["sync_state"] = build_sync_state()
        ensure_shared_bot_states(room)

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

    try:
        await websocket.send_json(
            {
                "type": "connected",
                "room": serialize_room(room),
                "latest_snapshot": room.get("latest_snapshot"),
                "presence_states": serialize_presence_states(room),
                "shared_bot_states": serialize_shared_bot_states(room),
                "shared_bot_version": get_shared_bot_version(room),
                "latest_match_payload": room.get("latest_match_payload"),
                "recoverable": room["status"] in {"waiting", "in_progress"},
                "timestamp": now_utc().timestamp(),
            }
        )
    except Exception:
        await handle_live_disconnect(room_id, user_id, key, websocket)
        return

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                continue
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
                    and payload_has_edge_input(merged_payload)
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
            elif message_type == "br_presence_state":
                sync_state = current_room.setdefault("sync_state", build_sync_state())
                payload = sanitize_presence_payload(user_id, current_room, message.get("payload", {}))
                if payload is None:
                    continue
                sync_state.setdefault("presence_states", {})[user_id] = payload
                await broadcast_to_room(
                    room_id,
                    {
                        "type": "br_presence_state",
                        "user_id": user_id,
                        "payload": payload,
                        "timestamp": now_utc().timestamp(),
                    },
                    exclude_user=user_id,
                )
                await broadcast_shared_bot_states(current_room)
                if current_room.get("latest_match_payload") is None:
                    local_coop_payload = build_local_coop_match_payload(current_room)
                    if local_coop_payload is not None:
                        current_room["latest_match_payload"] = local_coop_payload
                        current_room["status"] = "finished"
                        if current_room.get("started_at") is None:
                            current_room["started_at"] = iso_now()
                        cancel_room_runtime(room_id)
                        await broadcast_to_room(
                            room_id,
                            {
                                "type": "br_match_end",
                                "payload": local_coop_payload,
                                "timestamp": now_utc().timestamp(),
                            },
                        )
            elif message_type == "br_bot_damage":
                if current_room.get("sync_mode", DEFAULT_SYNC_MODE) != "local_coop":
                    continue
                payload = sanitize_bot_damage_payload(user_id, current_room, message.get("payload", {}))
                if payload is None:
                    continue
                changed = apply_shared_bot_damage(current_room, payload)
                if changed:
                    await broadcast_shared_bot_states(current_room, force=True)
                if current_room.get("latest_match_payload") is None:
                    local_coop_payload = build_local_coop_match_payload(current_room)
                    if local_coop_payload is not None:
                        current_room["latest_match_payload"] = local_coop_payload
                        current_room["status"] = "finished"
                        if current_room.get("started_at") is None:
                            current_room["started_at"] = iso_now()
                        cancel_room_runtime(room_id)
                        await broadcast_to_room(
                            room_id,
                            {
                                "type": "br_match_end",
                                "payload": local_coop_payload,
                                "timestamp": now_utc().timestamp(),
                            },
                        )
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
        await handle_live_disconnect(room_id, user_id, key, websocket)
    except Exception as exc:
        logger.warning("Battle Royale websocket runtime error room=%s user=%s error=%s", room_id, user_id, exc)
        await handle_live_disconnect(room_id, user_id, key, websocket)
