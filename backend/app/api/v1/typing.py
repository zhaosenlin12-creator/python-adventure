import asyncio
import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.core.config import settings


router = APIRouter()

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_PRODUCTION_DATA_DIR = Path("/www/data/game-backend/typing")
DEFAULT_LOCAL_DATA_DIR = PROJECT_ROOT / ".typing-data"
DATA_DIR = Path(
    settings.TYPING_DATA_DIR
    or str(DEFAULT_PRODUCTION_DATA_DIR if settings.ENVIRONMENT.lower() == "production" else DEFAULT_LOCAL_DATA_DIR)
).expanduser()
DB_PATH = DATA_DIR / "typing-db.json"
WORD_AUDIO_DIR = DATA_DIR / "audio" / "words"

LEARNER_NAME = "\u5b66\u4e60\u8005"
PRACTICE_TITLE = "\u7ec3\u4e60"
CONTEST_TITLE = "\u6253\u5b57\u6bd4\u8d5b"

_db_lock = asyncio.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _empty_db() -> dict[str, Any]:
    return {"sessions": {}, "settings": {}, "scores": [], "rooms": []}


def _load_db() -> dict[str, Any]:
    try:
        raw = DB_PATH.read_text(encoding="utf-8")
        loaded = json.loads(raw)
        if not isinstance(loaded, dict):
            return _empty_db()
        db = _empty_db()
        db.update(loaded)
        if not isinstance(db.get("sessions"), dict):
            db["sessions"] = {}
        if not isinstance(db.get("settings"), dict):
            db["settings"] = {}
        if not isinstance(db.get("scores"), list):
            db["scores"] = []
        if not isinstance(db.get("rooms"), list):
            db["rooms"] = []
        return db
    except FileNotFoundError:
        return _empty_db()
    except (OSError, json.JSONDecodeError):
        return _empty_db()


def _save_db(db: dict[str, Any]) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = DB_PATH.with_suffix(f".{os.getpid()}.{int(datetime.now().timestamp() * 1000)}.tmp")
    temp_path.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
    temp_path.replace(DB_PATH)


async def _mutate_db(mutator):
    async with _db_lock:
        db = _load_db()
        result = mutator(db)
        if asyncio.iscoroutine(result):
            result = await result
        _save_db(db)
        return result


def _clamp_number(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    if number != number:
        return fallback
    return max(minimum, min(maximum, number))


def _score_number(item: dict[str, Any], key: str, fallback: float = 0) -> float:
    try:
        return float(item.get(key, fallback) or fallback)
    except (TypeError, ValueError):
        return fallback


def _score_int(item: dict[str, Any], key: str, fallback: int = 0) -> int:
    return int(_score_number(item, key, fallback))


def _list_scores(db: dict[str, Any], limit: int = 50, mode: str = "") -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit or 50), 200))
    scores = [item for item in db.get("scores", []) if isinstance(item, dict)]
    if mode:
        scores = [item for item in scores if item.get("mode") == mode]
    scores.sort(
        key=lambda item: (
            -_score_number(item, "speed"),
            -_score_number(item, "accuracy"),
            _score_number(item, "seconds", 999999),
        )
    )
    return scores[:safe_limit]


def _normalize_word(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _word_audio_path(word: str) -> Path:
    slug = "".join(char if char.isalnum() else "-" for char in word)
    slug = "-".join(filter(None, slug.split("-")))[:48] or "word"
    digest = hashlib.sha1(word.encode("utf-8")).hexdigest()[:10]
    return WORD_AUDIO_DIR / f"{slug}-{digest}.mp3"


def _word_audio_urls(word: str) -> list[str]:
    from urllib.parse import quote

    encoded = quote(word)
    return [
        f"https://dict.youdao.com/dictvoice?audio={encoded}&type=2",
        f"https://dict.youdao.com/dictvoice?audio={encoded}&type=1",
        f"https://fanyi.baidu.com/gettts?lan=en&text={encoded}&spd=3&source=web",
    ]


def _looks_like_audio(audio: bytes, content_type: str | None) -> bool:
    lower = (content_type or "").lower()
    return bool(
        audio
        and (
            "audio" in lower
            or audio.startswith(b"ID3")
            or audio[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}
        )
    )


async def _get_word_audio(word: str) -> tuple[bytes, str] | None:
    normalized = _normalize_word(word)
    if not normalized or any("\u3400" <= char <= "\u9fff" for char in normalized):
        return None

    target = _word_audio_path(normalized)
    try:
        return target.read_bytes(), "audio/mpeg"
    except FileNotFoundError:
        pass
    except OSError:
        return None

    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0)) as client:
        for url in _word_audio_urls(normalized):
            try:
                response = await client.get(url, headers={"User-Agent": "LeQiXiangTyping/1.0"})
            except httpx.HTTPError:
                continue
            if response.status_code >= 400:
                continue
            content_type = response.headers.get("content-type") or "audio/mpeg"
            if not _looks_like_audio(response.content, content_type):
                continue
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(response.content)
            except OSError:
                pass
            return response.content, content_type
    return None


def _decode_audio_value(value: Any) -> bytes | None:
    if not isinstance(value, str) or not value:
        return None
    candidate = value.split(",", 1)[1] if value.startswith("data:") and "," in value else value
    if len(candidate) % 2 == 0 and all(char in "0123456789abcdefABCDEF" for char in candidate):
        try:
            return bytes.fromhex(candidate)
        except ValueError:
            pass
    try:
        return base64.b64decode(candidate, validate=False)
    except (ValueError, TypeError):
        return None


def _qwen_language_type(lang: str, text: str) -> str:
    return "Chinese" if lang.lower().startswith("zh") or any("\u3400" <= char <= "\u9fff" for char in text) else "English"


def _tts_configured() -> bool:
    return bool(
        settings.MINIMAX_API_KEY.strip()
        or settings.QWEN_API_KEY.strip()
        or settings.DASHSCOPE_API_KEY.strip()
    )


async def _synthesize_minimax(text: str, lang: str, rate: float) -> tuple[bytes, str] | None:
    api_key = settings.MINIMAX_API_KEY.strip()
    if not api_key:
        return None

    endpoint = settings.MINIMAX_TTS_ENDPOINT.strip() or "https://api.minimax.io/v1/t2a_v2"
    group_id = settings.MINIMAX_GROUP_ID.strip()
    if group_id and "GroupId=" not in endpoint:
        separator = "&" if "?" in endpoint else "?"
        endpoint = f"{endpoint}{separator}GroupId={group_id}"

    payload = {
        "model": settings.MINIMAX_TTS_MODEL or "speech-2.8-hd",
        "text": text,
        "stream": False,
        "language_boost": "Chinese" if lang.lower().startswith("zh") else "auto",
        "output_format": "hex",
        "voice_setting": {
            "voice_id": settings.MINIMAX_TTS_VOICE or "female-shaonv",
            "speed": rate,
            "vol": 1,
            "pitch": 0,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=6.0)) as client:
        response = await client.post(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if response.status_code >= 400:
        return None
    try:
        data = response.json()
    except ValueError:
        return None
    base_resp = data.get("base_resp") if isinstance(data, dict) else None
    if isinstance(base_resp, dict) and base_resp.get("status_code") is not None and int(base_resp.get("status_code") or 0) != 0:
        return None
    audio_data = data.get("audio") if isinstance(data, dict) else None
    nested = data.get("data") if isinstance(data, dict) else None
    if isinstance(nested, dict):
        audio_data = nested.get("audio") or audio_data
    audio = _decode_audio_value(audio_data)
    return (audio, "audio/mpeg") if audio else None


async def _synthesize_qwen(text: str, lang: str, rate: float) -> tuple[bytes, str] | None:
    api_key = (settings.QWEN_API_KEY or settings.DASHSCOPE_API_KEY or "").strip()
    if not api_key:
        return None

    endpoint = settings.QWEN_TTS_ENDPOINT.strip() or "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    payload = {
        "model": settings.QWEN_TTS_MODEL or "qwen3-tts-flash",
        "input": {
            "text": text,
            "voice": settings.QWEN_TTS_VOICE or "Cherry",
            "language_type": _qwen_language_type(lang, text),
        },
        "parameters": {"speed": rate},
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=6.0)) as client:
        response = await client.post(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if response.status_code >= 400:
            return None
        try:
            data = response.json()
        except ValueError:
            return None
        output = data.get("output") if isinstance(data, dict) else None
        audio_payload = output.get("audio") if isinstance(output, dict) else None
        if isinstance(audio_payload, dict) and isinstance(audio_payload.get("url"), str):
            audio_response = await client.get(audio_payload["url"])
            if audio_response.status_code >= 400:
                return None
            return audio_response.content, audio_response.headers.get("content-type") or "audio/mpeg"
        audio = _decode_audio_value(audio_payload.get("data") if isinstance(audio_payload, dict) else audio_payload)
        return (audio, "audio/mpeg") if audio else None


async def _synthesize_speech(payload: dict[str, Any]) -> tuple[bytes, str] | None:
    text = str(payload.get("text") or "").strip()[:900]
    if not text:
        raise HTTPException(status_code=400, detail="empty text")
    lang = str(payload.get("lang") or "auto")
    rate = _clamp_number(payload.get("rate"), 0.5, 1.5, 0.9)
    for provider in (_synthesize_minimax, _synthesize_qwen):
        try:
            result = await provider(text, lang, rate)
        except Exception:
            result = None
        if result:
            return result
    return None


def _username_from(payload: dict[str, Any], user: dict[str, Any]) -> str:
    return str(user.get("username") or user.get("nickname") or payload.get("username") or LEARNER_NAME).strip()


def _user_id_from(payload: dict[str, Any], user: dict[str, Any]) -> str:
    return str(user.get("id") or user.get("user_id") or payload.get("user_id") or "")


@router.get("/health")
async def health():
    return {"ok": True, "time": _now(), "tts": _tts_configured()}


@router.get("/me")
async def me(token: str = ""):
    db = _load_db()
    session = db.get("sessions", {}).get(token) if token else None
    user = None
    if isinstance(session, dict):
        user = {"id": session.get("user_id", ""), "username": session.get("username", ""), "raw": session.get("raw_user")}
    return {"ok": True, "user": user}


@router.get("/rankings")
async def rankings(limit: int = Query(50, ge=1, le=200), mode: str = ""):
    db = _load_db()
    return {"ok": True, "rankings": _list_scores(db, limit, mode)}


@router.get("/settings")
async def get_settings(token: str = ""):
    db = _load_db()
    item = db.get("settings", {}).get(token) if token else None
    return {"ok": True, "settings": item.get("payload") if isinstance(item, dict) else None}


@router.get("/word-audio")
async def word_audio(word: str = ""):
    result = await _get_word_audio(word)
    if not result:
        raise HTTPException(status_code=404, detail="audio not found")
    audio, content_type = result
    return Response(
        content=audio,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.post("/tts")
async def tts(payload: dict[str, Any]):
    result = await _synthesize_speech(payload)
    if not result:
        raise HTTPException(status_code=503, detail="tts service is not configured")
    audio, content_type = result
    return Response(content=audio, media_type=content_type, headers={"Cache-Control": "no-store"})


@router.post("/session")
async def create_session(payload: dict[str, Any]):
    def mutator(db: dict[str, Any]) -> dict[str, Any]:
        user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
        username = _username_from(payload, user)
        token = str(payload.get("token") or f"school-{username}-{int(datetime.now().timestamp() * 1000)}")
        previous = db["sessions"].get(token) if isinstance(db["sessions"], dict) else None
        db["sessions"][token] = {
            "token": token,
            "user_id": _user_id_from(payload, user),
            "username": username,
            "raw_user": user,
            "created_at": previous.get("created_at") if isinstance(previous, dict) else _now(),
            "updated_at": _now(),
        }
        return {"token": token, "user": {"id": db["sessions"][token]["user_id"], "username": username}}

    result = await _mutate_db(mutator)
    return {"ok": True, **result}


@router.post("/scores")
async def create_score(payload: dict[str, Any]):
    def mutator(db: dict[str, Any]) -> dict[str, Any]:
        token = str(payload.get("token") or "")
        session = db.get("sessions", {}).get(token) if token else None
        if not isinstance(session, dict):
            session = {}
        record = {
            "id": len(db.get("scores", [])) + 1,
            "token": token,
            "user_id": str(session.get("user_id") or payload.get("user_id") or ""),
            "username": str(payload.get("username") or session.get("username") or LEARNER_NAME),
            "mode": str(payload.get("mode") or "lesson"),
            "title": str(payload.get("title") or PRACTICE_TITLE),
            "speed": _score_number(payload, "speed"),
            "accuracy": _score_number(payload, "accuracy"),
            "chars": _score_int(payload, "chars"),
            "seconds": _score_number(payload, "seconds"),
            "created_at": str(payload.get("date") or _now()),
        }
        db["scores"].append(record)
        db["scores"] = db["scores"][-1000:]
        return {"score": record, "rankings": _list_scores(db, 50)}

    result = await _mutate_db(mutator)
    return {"ok": True, **result}


@router.post("/settings")
async def save_settings(payload: dict[str, Any]):
    def mutator(db: dict[str, Any]) -> None:
        token = str(payload.get("token") or "")
        settings_payload = payload.get("settings") if isinstance(payload.get("settings"), dict) else {}
        if token:
            db["settings"][token] = {"payload": settings_payload, "updated_at": _now()}

    await _mutate_db(mutator)
    return {"ok": True}


@router.post("/contest/rooms")
async def create_contest_room(payload: dict[str, Any]):
    def mutator(db: dict[str, Any]) -> dict[str, Any]:
        token = str(payload.get("token") or "")
        session = db.get("sessions", {}).get(token) if token else None
        if not isinstance(session, dict):
            session = {}
        room = {
            "id": f"ROOM-{int(datetime.now().timestamp() * 1000)}",
            "owner_token": token,
            "owner_name": str(session.get("username") or payload.get("username") or LEARNER_NAME),
            "title": str(payload.get("title") or CONTEST_TITLE),
            "lesson_id": str(payload.get("lessonId") or ""),
            "status": "waiting",
            "payload": payload,
            "created_at": _now(),
            "updated_at": _now(),
        }
        db["rooms"].append(room)
        db["rooms"] = db["rooms"][-300:]
        return room

    room = await _mutate_db(mutator)
    return {"ok": True, "room": room}
