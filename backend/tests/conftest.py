import os
from pathlib import Path


TEST_DB_PATH = Path(__file__).resolve().parents[1] / "test_backend.db"


def _delete_sqlite_sidecars(db_path: Path) -> None:
    for suffix in ("", "-shm", "-wal"):
        candidate = Path(f"{db_path}{suffix}")
        if candidate.exists():
            candidate.unlink()


# Point the FastAPI app at a clean test database before test modules import it.
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
_delete_sqlite_sidecars(TEST_DB_PATH)
