from threading import Lock

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

from app.core.config import settings

# 🔥 SQLite 优化配置
# check_same_thread=False 允许多线程访问
# StaticPool 使用单一连接，避免SQLite并发问题
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 🔥 使用静态连接池
        echo=False,  # 关闭SQL日志
    )
    
    # 🔥 启用WAL模式，提高并发性能
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=10000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()
else:
    engine = create_engine(settings.DATABASE_URL)

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
    轻量级SQLite兼容修复：
    - 自动创建缺失表，降低初始化遗漏导致的运行期故障
    - 为旧版 users 表补齐每日登录字段，避免运行期查询报错
    """
    if "sqlite" not in settings.DATABASE_URL.lower():
        return
    # 先确保当前已加载模型对应的表存在
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
            except Exception as e:
                # 并发启动场景下，列可能已被其他进程添加
                if "duplicate column name" not in str(e).lower():
                    raise

        achievement_columns = conn.exec_driver_sql("PRAGMA table_info(achievements)").fetchall()
        if achievement_columns:
            ach_existing = {col[1] for col in achievement_columns}
            if "reward_eggs" not in ach_existing:
                try:
                    conn.exec_driver_sql(
                        "ALTER TABLE achievements ADD COLUMN reward_eggs INTEGER DEFAULT 0"
                    )
                except Exception as e:
                    if "duplicate column name" not in str(e).lower():
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
    """获取数据库会话"""
    ensure_database_ready()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()









