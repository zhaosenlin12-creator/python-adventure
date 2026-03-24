import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from threading import Lock

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

from app.core.config import settings


def _is_sqlite_url(database_url: str) -> bool:
    return database_url.lower().startswith("sqlite:")


def _get_sqlite_path(database_url: str) -> Path | None:
    if not database_url.lower().startswith("sqlite:///"):
        return None

    sqlite_path = database_url[len("sqlite:///") :]
    if sqlite_path == ":memory:":
        return None

    return Path(sqlite_path)


def _check_sqlite_integrity(db_path: Path) -> tuple[bool, str]:
    try:
        connection = sqlite3.connect(db_path)
        try:
            row = connection.execute("PRAGMA integrity_check;").fetchone()
        finally:
            connection.close()
    except Exception as exc:
        return False, str(exc)

    status = row[0] if row else "integrity_check returned no result"
    return status == "ok", status


def _delete_sqlite_sidecars(db_path: Path) -> None:
    for suffix in ("-shm", "-wal"):
        sidecar = Path(f"{db_path}{suffix}")
        if sidecar.exists():
            sidecar.unlink()


def _get_local_recovery_source(db_path: Path, project_root: Path | None = None) -> Path | None:
    resolved_root = project_root or Path(__file__).resolve().parents[3]
    candidate = resolved_root / db_path.name
    if candidate.resolve() == db_path.resolve():
        return None
    if candidate.exists():
        return candidate
    return None


def repair_local_sqlite_if_needed(
    db_path: Path,
    *,
    project_root: Path | None = None,
    environment: str | None = None,
) -> None:
    current_environment = (environment or settings.ENVIRONMENT).lower()
    if current_environment == "production" or not db_path.exists():
        return

    is_healthy, details = _check_sqlite_integrity(db_path)
    if is_healthy:
        return

    recovery_source = _get_local_recovery_source(db_path, project_root)
    if recovery_source is None:
        print(f"[DB] SQLite integrity check failed for {db_path}: {details}")
        return

    source_healthy, source_details = _check_sqlite_integrity(recovery_source)
    if not source_healthy:
        print(
            f"[DB] SQLite integrity check failed for {db_path}: {details}. "
            f"Recovery source {recovery_source} is also unhealthy: {source_details}"
        )
        return

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = db_path.with_name(f"{db_path.name}.malformed-{timestamp}.bak")
    _delete_sqlite_sidecars(db_path)
    shutil.move(str(db_path), str(backup_path))
    shutil.copy2(recovery_source, db_path)
    _delete_sqlite_sidecars(db_path)
    print(
        f"[DB] Recovered malformed SQLite database: {db_path} "
        f"-> backup {backup_path} from source {recovery_source}"
    )


def _build_engine():
    if not _is_sqlite_url(settings.DATABASE_URL):
        return create_engine(settings.DATABASE_URL)

    sqlite_path = _get_sqlite_path(settings.DATABASE_URL)
    if sqlite_path is not None:
        repair_local_sqlite_if_needed(sqlite_path)

    poolclass = StaticPool if sqlite_path is None else NullPool
    return create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=poolclass,
        echo=False,
    )


engine = _build_engine()


if _is_sqlite_url(settings.DATABASE_URL):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=10000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_schema_ready = False
_schema_lock = Lock()


def get_sqlite_db_path() -> str | None:
    if "sqlite" not in settings.DATABASE_URL.lower():
        return None
    return engine.url.database


def ensure_sqlite_schema_compatibility():
    """
    Lightweight SQLite compatibility repair:
    - Create missing tables so partially initialized local databases can still boot.
    - Backfill fields expected by newer code paths when old local databases are reused.
    """
    if "sqlite" not in settings.DATABASE_URL.lower():
        return

    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        user_columns = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        if not user_columns:
            return

        existing = {col[1] for col in user_columns}
        alter_statements = []
        if "last_login_date" not in existing:
            alter_statements.append("ALTER TABLE users ADD COLUMN last_login_date DATE")
        if "login_streak" not in existing:
            alter_statements.append("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0")
        if "total_login_days" not in existing:
            alter_statements.append("ALTER TABLE users ADD COLUMN total_login_days INTEGER DEFAULT 0")
        if "current_pet_id" not in existing:
            alter_statements.append("ALTER TABLE users ADD COLUMN current_pet_id INTEGER")

        for stmt in alter_statements:
            try:
                conn.exec_driver_sql(stmt)
            except Exception as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise

        achievement_columns = conn.exec_driver_sql("PRAGMA table_info(achievements)").fetchall()
        if achievement_columns:
            ach_existing = {col[1] for col in achievement_columns}
            if "reward_eggs" not in ach_existing:
                try:
                    conn.exec_driver_sql(
                        "ALTER TABLE achievements ADD COLUMN reward_eggs INTEGER DEFAULT 0"
                    )
                except Exception as exc:
                    if "duplicate column name" not in str(exc).lower():
                        raise


def ensure_database_ready() -> None:
    global _schema_ready

    if _schema_ready:
        return

    with _schema_lock:
        if _schema_ready:
            return
        ensure_sqlite_schema_compatibility()
        _schema_ready = True


def get_db():
    """Yield a database session for each request."""
    ensure_database_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
