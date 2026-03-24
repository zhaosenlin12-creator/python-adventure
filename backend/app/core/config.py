from pathlib import Path
import warnings
import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(database_url: str) -> str:
    """Resolve relative SQLite URLs against the backend directory."""
    if not database_url.lower().startswith("sqlite:///"):
        return database_url

    sqlite_path = database_url[len("sqlite:///") :]
    if sqlite_path == ":memory:":
        return database_url

    if sqlite_path.startswith("/") or (len(sqlite_path) > 1 and sqlite_path[1] == ":"):
        return database_url

    backend_dir = Path(__file__).resolve().parents[2]
    resolved_path = (backend_dir / sqlite_path).resolve()
    return f"sqlite:///{resolved_path.as_posix()}"

class Settings(BaseSettings):
    # 运行环境
    ENVIRONMENT: str = "development"
    # 数据库配置
    # PostgreSQL: postgresql://postgres:password@localhost:5432/code_adventure
    # SQLite (本地测试): sqlite:///./code_adventure.db
    DATABASE_URL: str = "sqlite:///./code_adventure.db"
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 🔥 v2.1.12: 延长到24小时（原30分钟太短）
    
    # CORS 允许来源（逗号分隔，空则允许所有 — 仅限开发）
    CORS_ORIGINS: str = ""
    
    # 沙箱服务
    SANDBOX_URL: str = "http://localhost:5000"
    
    # DeepSeek AI配置 (用于AI智能出题)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    
    # 应用配置（生产默认关闭调试）
    DEBUG: bool = False

    # 内部接口安全Token（生产环境用于保护内部奖励接口）
    INTERNAL_REWARD_TOKEN: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
settings.DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)

# 🔒 安全：启动时检查默认密钥
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
