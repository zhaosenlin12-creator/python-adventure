from pathlib import Path
import secrets
import warnings

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _resolve_sqlite_path(database_url: str, *, base_dir: Path = BACKEND_DIR) -> Path | None:
    """Resolve a SQLite URL to an absolute filesystem path when applicable."""
    if not database_url.lower().startswith("sqlite:///"):
        return None

    sqlite_path = database_url[len("sqlite:///") :]
    if sqlite_path == ":memory:":
        return None

    path = Path(sqlite_path)
    if not path.is_absolute():
        path = base_dir / path

    return path.resolve()


def _normalize_database_url(database_url: str, *, base_dir: Path = BACKEND_DIR) -> str:
    """Resolve SQLite URLs to stable absolute paths."""
    resolved_path = _resolve_sqlite_path(database_url, base_dir=base_dir)
    if resolved_path is None:
        return database_url
    return f"sqlite:///{resolved_path.as_posix()}"


def _validate_production_database_url(
    database_url: str,
    environment: str,
    *,
    backend_dir: Path = BACKEND_DIR,
) -> None:
    if environment.lower() != "production":
        return

    sqlite_path = _resolve_sqlite_path(database_url, base_dir=backend_dir)
    if sqlite_path is None:
        return

    backend_root = backend_dir.resolve()
    try:
        sqlite_path.relative_to(backend_root)
    except ValueError:
        return

    raise RuntimeError(
        "SECURITY: Production SQLite database must live outside the backend deploy directory. "
        "Set DATABASE_URL to an absolute path such as "
        "sqlite:////www/data/game-backend/code_adventure.db."
    )


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"

    # Database
    # PostgreSQL: postgresql://postgres:password@localhost:5432/code_adventure
    # SQLite: sqlite:///./code_adventure.db
    DATABASE_URL: str = "sqlite:///./code_adventure.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = ""

    # Sandbox
    SANDBOX_URL: str = "http://localhost:5000"

    # DeepSeek AI
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Application
    DEBUG: bool = False
    INTERNAL_REWARD_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
    )


settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
_validate_production_database_url(settings.DATABASE_URL, settings.ENVIRONMENT)

if settings.SECRET_KEY == "your-secret-key-change-in-production":
    if settings.ENVIRONMENT.lower() == "production":
        raise RuntimeError(
            "SECURITY: JWT SECRET_KEY is still using the placeholder value. "
            "Set a strong SECRET_KEY in backend/.env before starting production."
        )
    warnings.warn(
        "\n[SECURITY] JWT SECRET_KEY is still using the placeholder value."
        "\nSet backend/.env with SECRET_KEY=<strong random string>."
        '\nExample: python -c "import secrets; print(secrets.token_urlsafe(32))"',
        RuntimeWarning,
        stacklevel=1,
    )
    settings.SECRET_KEY = secrets.token_urlsafe(32)

if settings.ENVIRONMENT.lower() == "production":
    if settings.DEBUG:
        raise RuntimeError(
            "SECURITY: DEBUG must be false in production. Set DEBUG=false in backend/.env."
        )
    if len(settings.SECRET_KEY) < 32:
        raise RuntimeError(
            "SECURITY: SECRET_KEY must be at least 32 characters long in production."
        )
