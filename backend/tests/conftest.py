import os
from pathlib import Path


_DEFAULT_TEST_DB_PATH = Path(__file__).resolve().parents[1] / f"test_backend_{os.getpid()}.db"
TEST_DB_PATH = Path(os.environ.get("TEST_DB_PATH", _DEFAULT_TEST_DB_PATH)).resolve()


def _delete_sqlite_sidecars(db_path: Path) -> None:
    for suffix in ("", "-shm", "-wal"):
        candidate = Path(f"{db_path}{suffix}")
        if candidate.exists():
            candidate.unlink()


# Point the FastAPI app at a clean test database before test modules import it.
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-backend-suite-0123456789")
_delete_sqlite_sidecars(TEST_DB_PATH)
