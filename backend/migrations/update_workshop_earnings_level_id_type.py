"""
迁移脚本：将 workshop_earnings.level_id 从 INTEGER 改为 UUID 字符串
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine.url import make_url
from app.core.config import settings
from app.models.coin import WorkshopEarning


def get_engine():
    db_url = settings.DATABASE_URL
    is_sqlite = False
    try:
        url = make_url(db_url)
        if url.drivername.startswith("sqlite"):
            is_sqlite = True
            db_path = Path(__file__).parent.parent / "code_adventure.db"
            db_url = f"sqlite:///{db_path}"
    except Exception:
        pass
    return create_engine(db_url), is_sqlite


INDEX_NAMES = [
    "ix_workshop_earnings_creator_id",
    "ix_workshop_earnings_level_id",
    "ix_workshop_earnings_id",
]


def get_sqlite_column_type(conn, table: str, column: str) -> str | None:
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    for row in result:
        if row[1] == column:
            return row[2]
    return None

def sqlite_has_table(conn, table: str) -> bool:
    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"), {"name": table})
    return result.fetchone() is not None


def sqlite_drop_indexes(conn, index_names: list[str]) -> None:
    for name in index_names:
        conn.execute(text(f"DROP INDEX IF EXISTS {name}"))


def sqlite_create_indexes(conn) -> None:
    # Use IF NOT EXISTS to keep idempotent
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_workshop_earnings_creator_id ON workshop_earnings (creator_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_workshop_earnings_level_id ON workshop_earnings (level_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_workshop_earnings_id ON workshop_earnings (id)"))


def sqlite_copy_data(conn) -> None:
    conn.execute(text("""
        INSERT OR IGNORE INTO workshop_earnings (
            id, level_id, creator_id, play_count, like_count,
            total_coins, daily_coins, last_reset_date, created_at, updated_at
        )
        SELECT
            id,
            CAST(level_id AS TEXT),
            creator_id, play_count, like_count,
            total_coins, daily_coins, last_reset_date, created_at, updated_at
        FROM workshop_earnings_old
    """))


def run_migration() -> bool:
    print("🔄 开始迁移 workshop_earnings.level_id 类型...")
    engine, is_sqlite = get_engine()

    try:
        inspector = inspect(engine)
        if "workshop_earnings" not in inspector.get_table_names():
            print("ℹ️  workshop_earnings 表不存在，创建新表...")
            WorkshopEarning.__table__.create(engine, checkfirst=True)
            print("✅ 创建完成")
            return True

        with engine.connect() as conn:
            if is_sqlite:
                # Handle partial state where both new and old tables exist
                if sqlite_has_table(conn, "workshop_earnings_old"):
                    print("🧩 检测到 workshop_earnings_old，继续完成迁移...")
                    if not sqlite_has_table(conn, "workshop_earnings"):
                        WorkshopEarning.__table__.create(engine, checkfirst=True)
                    sqlite_copy_data(conn)
                    conn.execute(text("DROP TABLE workshop_earnings_old"))
                    sqlite_create_indexes(conn)
                    conn.commit()
                    print("✅ SQLite 迁移完成（从旧表恢复）")
                    return True

                col_type = get_sqlite_column_type(conn, "workshop_earnings", "level_id")
                if col_type and ("CHAR" in col_type.upper() or "TEXT" in col_type.upper()):
                    print("ℹ️  level_id 已是字符串类型，确保索引存在...")
                    sqlite_create_indexes(conn)
                    conn.commit()
                    return True

                print("🔧 SQLite 检测到 level_id 不是字符串类型，开始迁移...")
                conn.execute(text("ALTER TABLE workshop_earnings RENAME TO workshop_earnings_old"))
                # Old indexes retain the same names; drop to avoid conflicts
                sqlite_drop_indexes(conn, INDEX_NAMES)
                WorkshopEarning.__table__.create(engine, checkfirst=True)

                sqlite_copy_data(conn)
                conn.execute(text("DROP TABLE workshop_earnings_old"))
                sqlite_create_indexes(conn)
                conn.commit()
                print("✅ SQLite 迁移完成")
                return True

            # 非 SQLite（如 Postgres/MySQL）
            try:
                conn.execute(text("ALTER TABLE workshop_earnings ALTER COLUMN level_id TYPE VARCHAR(36)"))
                conn.commit()
                print("✅ 迁移完成")
                return True
            except Exception as exc:
                print(f"⚠️  无法自动迁移: {exc}")
                return False
    finally:
        engine.dispose()


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
