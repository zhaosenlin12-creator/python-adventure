import base64
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.typing import TypingContestRoom, TypingScore, TypingSession, TypingSetting


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
SPEED_TEST_MODE = "speed-test"
SPEED_TEST_TITLE = "\u901f\u5ea6\u6d4b\u8bd5"

_json_migration_checked = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value or _now())


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return _now_dt()


def _json_response(payload: dict[str, Any], cache_control: str) -> JSONResponse:
    return JSONResponse(content=payload, headers={"Cache-Control": cache_control})


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


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def _redact_secrets(value: Any) -> Any:
    if isinstance(value, list):
        return [_redact_secrets(item) for item in value]
    if not isinstance(value, dict):
        return value
    return {
        key: _redact_secrets(item)
        for key, item in value.items()
        if key not in {"token", "owner_token", "authorization"}
    }


def _json_loads(value: str | None, fallback: Any = None) -> Any:
    if not value:
        return {} if fallback is None else fallback
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {} if fallback is None else fallback


def _score_to_dict(score: TypingScore) -> dict[str, Any]:
    # Session tokens are credentials, not leaderboard data. Never expose them in API payloads.
    return {
        "id": score.id,
        "user_id": score.user_id or "",
        "username": score.username or LEARNER_NAME,
        "mode": score.mode or "lesson",
        "title": score.title or PRACTICE_TITLE,
        "speed": _score_number({"speed": score.speed}, "speed"),
        "accuracy": _score_number({"accuracy": score.accuracy}, "accuracy"),
        "chars": int(score.chars or 0),
        "seconds": _score_number({"seconds": score.seconds}, "seconds"),
        "created_at": _iso(score.created_at),
        "date": _iso(score.created_at),
    }


def _room_to_dict(room: TypingContestRoom) -> dict[str, Any]:
    return {
        "id": room.id,
        "owner_name": room.owner_name or LEARNER_NAME,
        "title": room.title or CONTEST_TITLE,
        "lesson_id": room.lesson_id or "",
        "status": room.status or "waiting",
        "payload": _redact_secrets(_json_loads(room.payload, {})),
        "created_at": _iso(room.created_at),
        "updated_at": _iso(room.updated_at),
    }


def _list_scores_from_db(db: Session, limit: int = 50, mode: str = "") -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit or 50), 200))
    query = db.query(TypingScore)
    if mode:
        query = query.filter(TypingScore.mode == mode)
    scores = (
        query.order_by(TypingScore.speed.desc(), TypingScore.accuracy.desc(), TypingScore.seconds.asc())
        .limit(safe_limit)
        .all()
    )
    return [_score_to_dict(score) for score in scores]


def _history_filters(query, token: str = "", user_id: str = "", username: str = ""):
    filters = []
    if token:
        filters.append(TypingScore.token == token)
    if user_id:
        filters.append(TypingScore.user_id == user_id)
    if username and username != LEARNER_NAME:
        filters.append(TypingScore.username == username)
    if not filters:
        return query.filter(TypingScore.id < 0)
    return query.filter(or_(*filters))


def _list_history_from_db(
    db: Session,
    *,
    token: str = "",
    user_id: str = "",
    username: str = "",
    limit: int = 80,
) -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit or 80), 300))
    query = _history_filters(db.query(TypingScore), token, user_id, username)
    scores = query.order_by(TypingScore.created_at.desc(), TypingScore.id.desc()).limit(safe_limit).all()
    return [_score_to_dict(score) for score in scores]


def _upsert_session(db: Session, payload: dict[str, Any]) -> TypingSession:
    user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
    username = _username_from(payload, user)
    token = str(payload.get("token") or f"school-{username}-{int(datetime.now().timestamp() * 1000)}")
    session = db.get(TypingSession, token)
    if session is None:
        session = TypingSession(token=token, created_at=_now_dt())
    session.source = str(payload.get("source") or "school")[:80]
    session.user_id = _user_id_from(payload, user)
    session.username = username[:100] or LEARNER_NAME
    session.raw_user = _json_dumps(user)
    session.updated_at = _now_dt()
    db.add(session)
    return session


def _migrate_json_db_once(db: Session) -> None:
    global _json_migration_checked
    if _json_migration_checked:
        return
    _json_migration_checked = True
    if settings.ENVIRONMENT.lower() == "test":
        return
    legacy = _load_db()
    if not legacy.get("sessions") and not legacy.get("settings") and not legacy.get("scores") and not legacy.get("rooms"):
        return

    changed = False
    for token, item in (legacy.get("sessions") or {}).items():
        if not token or not isinstance(item, dict):
            continue
        session = db.get(TypingSession, str(token)) or TypingSession(token=str(token))
        session.user_id = str(item.get("user_id") or "")
        session.username = str(item.get("username") or LEARNER_NAME)[:100] or LEARNER_NAME
        session.raw_user = _json_dumps(item.get("raw_user") or {})
        session.source = str(item.get("source") or "school")[:80]
        session.created_at = _parse_datetime(item.get("created_at"))
        session.updated_at = _parse_datetime(item.get("updated_at"))
        db.add(session)
        changed = True

    for token, item in (legacy.get("settings") or {}).items():
        if not token or not isinstance(item, dict):
            continue
        setting = db.get(TypingSetting, str(token)) or TypingSetting(token=str(token))
        setting.payload = _json_dumps(item.get("payload") if isinstance(item.get("payload"), dict) else {})
        setting.updated_at = _parse_datetime(item.get("updated_at"))
        db.add(setting)
        changed = True

    for item in legacy.get("scores") or []:
        if not isinstance(item, dict):
            continue
        created_at = _parse_datetime(item.get("created_at") or item.get("date"))
        duplicate = (
            db.query(TypingScore)
            .filter(
                TypingScore.token == str(item.get("token") or ""),
                TypingScore.mode == str(item.get("mode") or "lesson"),
                TypingScore.title == str(item.get("title") or PRACTICE_TITLE),
                TypingScore.speed == _score_number(item, "speed"),
                TypingScore.accuracy == _score_number(item, "accuracy"),
                TypingScore.chars == _score_int(item, "chars"),
                TypingScore.seconds == _score_number(item, "seconds"),
                TypingScore.created_at == created_at,
            )
            .first()
        )
        if duplicate:
            continue
        db.add(
            TypingScore(
                token=str(item.get("token") or ""),
                user_id=str(item.get("user_id") or ""),
                username=str(item.get("username") or LEARNER_NAME)[:100] or LEARNER_NAME,
                mode=str(item.get("mode") or "lesson")[:40],
                title=str(item.get("title") or PRACTICE_TITLE)[:255],
                speed=_score_number(item, "speed"),
                accuracy=_score_number(item, "accuracy"),
                chars=_score_int(item, "chars"),
                seconds=_score_number(item, "seconds"),
                created_at=created_at,
            )
        )
        changed = True

    for item in legacy.get("rooms") or []:
        if not isinstance(item, dict):
            continue
        room_id = str(item.get("id") or "")
        if not room_id:
            continue
        room = db.get(TypingContestRoom, room_id) or TypingContestRoom(id=room_id)
        room.owner_token = str(item.get("owner_token") or "")
        room.owner_name = str(item.get("owner_name") or LEARNER_NAME)[:100] or LEARNER_NAME
        room.title = str(item.get("title") or CONTEST_TITLE)[:255]
        room.lesson_id = str(item.get("lesson_id") or item.get("lessonId") or "")
        room.status = str(item.get("status") or "waiting")[:40]
        room.payload = _json_dumps(item.get("payload") if isinstance(item.get("payload"), dict) else item)
        room.created_at = _parse_datetime(item.get("created_at"))
        room.updated_at = _parse_datetime(item.get("updated_at"))
        db.add(room)
        changed = True

    if changed:
        db.commit()


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


def _external_word_audio_fallback_enabled() -> bool:
    return bool(settings.TYPING_EXTERNAL_WORD_AUDIO_FALLBACK)


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

    if not _external_word_audio_fallback_enabled():
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


def _secure_audio_url(url: str) -> str:
    value = str(url or "").strip()
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme != "http":
        return value
    if not parsed.netloc.endswith("aliyuncs.com"):
        return value
    return urlunparse(parsed._replace(scheme="https"))


async def _fetch_audio_url(client: httpx.AsyncClient, url: str) -> tuple[bytes, str] | None:
    candidates = []
    secure = _secure_audio_url(url)
    if secure:
        candidates.append(secure)
    original = str(url or "").strip()
    if original and original not in candidates:
        candidates.append(original)
    for candidate in candidates:
        try:
            response = await client.get(candidate)
        except Exception:
            continue
        if response.status_code >= 400:
            continue
        content_type = response.headers.get("content-type") or "audio/mpeg"
        if not _looks_like_audio(response.content, content_type):
            continue
        return response.content, content_type
    return None


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
            fetched = await _fetch_audio_url(client, audio_payload["url"])
            if fetched:
                return fetched
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
    return _json_response({"ok": True, "time": _now(), "tts": _tts_configured()}, "no-store")


@router.get("/me")
async def me(token: str = "", db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    session = db.get(TypingSession, token) if token else None
    user = None
    if session:
        user = {"id": session.user_id or "", "username": session.username or "", "raw": _json_loads(session.raw_user, {})}
    return _json_response({"ok": True, "user": user}, "private, no-store")


@router.get("/rankings")
async def rankings(limit: int = Query(50, ge=1, le=200), mode: str = "", db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    return _json_response(
        {"ok": True, "rankings": _list_scores_from_db(db, limit, mode)},
        "public, max-age=15, stale-while-revalidate=60",
    )


@router.get("/history")
async def history(
    token: str = "",
    user_id: str = "",
    username: str = "",
    limit: int = Query(80, ge=1, le=300),
    db: Session = Depends(get_db),
):
    _migrate_json_db_once(db)
    session = db.get(TypingSession, token) if token else None
    if session is None:
        return _json_response({"ok": True, "history": []}, "private, no-store")
    user_id = session.user_id or ""
    username = session.username or ""
    return _json_response(
        {"ok": True, "history": _list_history_from_db(db, token=token, user_id=user_id, username=username, limit=limit)},
        "private, no-store",
    )
@router.get("/settings")
async def get_settings(token: str = "", db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    item = db.get(TypingSetting, token) if token else None
    return _json_response(
        {"ok": True, "settings": _json_loads(item.payload, {}) if item else None},
        "private, no-store",
    )


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
async def create_session(payload: dict[str, Any], db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    session = _upsert_session(db, payload)
    db.commit()
    db.refresh(session)
    return {"ok": True, "token": session.token, "user": {"id": session.user_id or "", "username": session.username}}


@router.post("/scores")
async def create_score(payload: dict[str, Any], db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    token = str(payload.get("token") or "")
    session = db.get(TypingSession, token) if token else None
    user_id = str((session.user_id if session else "") or payload.get("user_id") or "")
    username = str(payload.get("username") or (session.username if session else "") or LEARNER_NAME)[:100] or LEARNER_NAME
    score = TypingScore(
        token=token,
        user_id=user_id,
        username=username,
        mode=str(payload.get("mode") or "lesson")[:40],
        title=str(payload.get("title") or PRACTICE_TITLE)[:255],
        speed=_score_number(payload, "speed"),
        accuracy=_score_number(payload, "accuracy"),
        chars=_score_int(payload, "chars"),
        seconds=_score_number(payload, "seconds"),
        created_at=_parse_datetime(payload.get("date") or payload.get("created_at")),
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return {
        "ok": True,
        "score": _score_to_dict(score),
        "rankings": _list_scores_from_db(db, 50),
        "history": _list_history_from_db(db, token=token, user_id=user_id, username=username, limit=80),
    }


@router.post("/settings")
async def save_settings(payload: dict[str, Any], db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    token = str(payload.get("token") or "")
    if token:
        setting = db.get(TypingSetting, token) or TypingSetting(token=token)
        setting.payload = _json_dumps(payload.get("settings") if isinstance(payload.get("settings"), dict) else {})
        setting.updated_at = _now_dt()
        db.add(setting)
        db.commit()
    return {"ok": True}


@router.post("/contest/rooms")
async def create_contest_room(payload: dict[str, Any], db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    token = str(payload.get("token") or "")
    session = db.get(TypingSession, token) if token else None
    room = TypingContestRoom(
        id=f"ROOM-{int(datetime.now().timestamp() * 1000)}",
        owner_token=token,
        owner_name=str((session.username if session else "") or payload.get("username") or LEARNER_NAME)[:100],
        title=str(payload.get("title") or CONTEST_TITLE)[:255],
        lesson_id=str(payload.get("lessonId") or ""),
        status="waiting",
        payload=_json_dumps(_redact_secrets(payload)),
        created_at=_now_dt(),
        updated_at=_now_dt(),
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return {"ok": True, "room": _room_to_dict(room)}

@router.post("/lesson/speed-test")
async def create_speed_test(payload: dict[str, Any], db: Session = Depends(get_db)):
    _migrate_json_db_once(db)
    token = str(payload.get("token") or "")
    session = db.get(TypingSession, token) if token else None
    user_id = str((session.user_id if session else "") or payload.get("user_id") or "")
    username = str(payload.get("username") or (session.username if session else "") or LEARNER_NAME)[:100] or LEARNER_NAME
    speed = _score_number(payload, "speed")
    if speed <= 0:
        chars = _score_int(payload, "chars")
        seconds = _score_number(payload, "seconds") or _score_number(payload, "duration_seconds")
        if chars > 0 and seconds > 0:
            speed = round(chars / max(seconds, 1) * 60.0, 2)
    score = TypingScore(
        token=token,
        user_id=user_id,
        username=username,
        mode=SPEED_TEST_MODE,
        title=str(payload.get("title") or SPEED_TEST_TITLE)[:255],
        speed=speed,
        accuracy=_score_number(payload, "accuracy"),
        chars=_score_int(payload, "chars"),
        seconds=_score_number(payload, "seconds") or _score_number(payload, "duration_seconds"),
        created_at=_parse_datetime(payload.get("date") or payload.get("created_at")),
    )
    db.add(score)
    db.commit()
    db.refresh(score)

    global_rank = (
        db.query(TypingScore)
        .filter(TypingScore.mode == SPEED_TEST_MODE, TypingScore.speed > speed)
        .count()
        + 1
    )

    user_best_query = db.query(TypingScore).filter(TypingScore.mode == SPEED_TEST_MODE)
    if user_id:
        user_best_query = user_best_query.filter(TypingScore.user_id == user_id)
    else:
        user_best_query = user_best_query.filter(TypingScore.username == username)
    user_best = user_best_query.order_by(TypingScore.speed.desc(), TypingScore.accuracy.desc()).first()
    personal_best_speed = float(user_best.speed) if user_best else speed
    total_speed_tests = user_best_query.count()

    extra: dict[str, Any] = {}
    wpm_raw = payload.get("wpm")
    if wpm_raw is not None:
        try:
            extra["wpm"] = float(wpm_raw)
        except (TypeError, ValueError):
            pass

    return {
        "ok": True,
        "score": _score_to_dict(score),
        "extra": extra,
        "global_rank": global_rank,
        "personal_best_speed": personal_best_speed,
        "total_speed_tests": total_speed_tests,
        "rankings": _list_scores_from_db(db, 50, SPEED_TEST_MODE),
        "history": _list_history_from_db(db, token=token, user_id=user_id, username=username, limit=20),
    }


@router.get("/user/speed-test-rank")
async def user_speed_test_rank(
    token: str = "",
    user_id: str = "",
    username: str = "",
    db: Session = Depends(get_db),
):
    _migrate_json_db_once(db)
    session = db.get(TypingSession, token) if token else None
    if session is None:
        return _json_response(
            {"ok": True, "user": None, "rank": None, "best_speed": 0.0, "best_accuracy": 0.0, "total": 0},
            "private, no-store",
        )
    user_id = session.user_id or ""
    username = session.username or LEARNER_NAME

    query = db.query(TypingScore).filter(TypingScore.mode == SPEED_TEST_MODE)
    if user_id:
        query = query.filter(TypingScore.user_id == user_id)
    elif username and username != LEARNER_NAME:
        query = query.filter(TypingScore.username == username)
    best = query.order_by(TypingScore.speed.desc(), TypingScore.accuracy.desc()).first()
    total = query.count()

    rank = None
    if best is not None:
        rank_query = db.query(TypingScore).filter(
            TypingScore.mode == SPEED_TEST_MODE,
            TypingScore.speed > float(best.speed),
        )
        rank = rank_query.count() + 1

    return _json_response(
        {
            "ok": True,
            "user": {
                "user_id": user_id,
                "username": username or (best.username if best else LEARNER_NAME),
            },
            "rank": rank,
            "best_speed": float(best.speed) if best else 0.0,
            "best_accuracy": float(best.accuracy) if best else 0.0,
            "best_title": best.title if best else "",
            "best_date": _iso(best.created_at) if best else None,
            "total": total,
        },
        "private, no-store",
    )
