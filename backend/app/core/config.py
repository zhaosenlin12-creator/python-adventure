from pathlib import Path
import secrets
import warnings

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _normalize_database_url(database_url: str) -> str:
    """Resolve relative SQLite URLs against the backend directory."""
    if not database_url.lower().startswith("sqlite:///"):
        return database_url

    sqlite_path = database_url[len("sqlite:///") :]
    if sqlite_path == ":memory:":
        return database_url

    if sqlite_path.startswith("/") or (len(sqlite_path) > 1 and sqlite_path[1] == ":"):
        return database_url

    resolved_path = (BACKEND_DIR / sqlite_path).resolve()
    return f"sqlite:///{resolved_path.as_posix()}"


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

# Security: never run with the placeholder secret in production.
if settings.SECRET_KEY == "your-secret-key-change-in-production":
    if settings.ENVIRONMENT.lower() == "production":
        raise RuntimeError(
            "SECURITY: 生产环境禁止使用默认 JWT SECRET_KEY，请在 backend/.env 配置强随机密钥。"
        )
    warnings.warn(
        "\n⚠️  [SECURITY] 正在使用默认 JWT SECRET_KEY，已自动生成仅本进程有效的临时密钥。"
        "\n   请在 backend/.env 中设置: SECRET_KEY=<随机强密钥>"
        '\n   生成命令: python -c "import secrets; print(secrets.token_urlsafe(32))"',
        RuntimeWarning,
        stacklevel=1,
    )
    settings.SECRET_KEY = secrets.token_urlsafe(32)

if settings.ENVIRONMENT.lower() == "production":
    if settings.DEBUG:
        raise RuntimeError(
            "SECURITY: 生产环境禁止启用 DEBUG，请在 backend/.env 中设置 DEBUG=false。"
        )
    if len(settings.SECRET_KEY) < 32:
        raise RuntimeError(
            "SECURITY: SECRET_KEY 长度不足，生产环境请至少使用 32 字符随机密钥。"
        )
