"""UTC time helpers shared across the backend."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return a naive UTC datetime for storage and comparisons."""
    return datetime.now(UTC).replace(tzinfo=None)


def utc_now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return utc_now().isoformat()
