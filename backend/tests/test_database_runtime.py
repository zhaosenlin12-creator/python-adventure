import sqlite3
from pathlib import Path

from sqlalchemy.pool import NullPool

from app.core.database import engine, repair_local_sqlite_if_needed


def test_file_sqlite_uses_null_pool():
    assert isinstance(engine.pool, NullPool)


def test_repair_local_sqlite_if_needed_restores_from_project_root(tmp_path: Path):
    project_root = tmp_path / "project"
    backend_dir = project_root / "backend"
    project_root.mkdir()
    backend_dir.mkdir()

    healthy_db = project_root / "code_adventure.db"
    broken_db = backend_dir / "code_adventure.db"
    shm_file = backend_dir / "code_adventure.db-shm"
    wal_file = backend_dir / "code_adventure.db-wal"

    connection = sqlite3.connect(healthy_db)
    connection.execute("CREATE TABLE demo (id INTEGER PRIMARY KEY, value TEXT)")
    connection.execute("INSERT INTO demo (value) VALUES ('ok')")
    connection.commit()
    connection.close()

    broken_db.write_bytes(b"not-a-real-sqlite-db")
    shm_file.write_text("stale")
    wal_file.write_text("stale")

    repair_local_sqlite_if_needed(
        broken_db,
        project_root=project_root,
        environment="development",
    )

    backup_files = list(backend_dir.glob("code_adventure.db.malformed-*.bak"))
    assert len(backup_files) == 1
    assert not shm_file.exists()
    assert not wal_file.exists()

    recovered = sqlite3.connect(broken_db)
    try:
        value = recovered.execute("SELECT value FROM demo").fetchone()[0]
    finally:
        recovered.close()

    assert value == "ok"
