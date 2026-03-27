"""UTC time helpers shared across the backend."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return a naive UTC datetime for storage and comparisons."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return utc_now().isoformat()
