from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import ensure_database_ready
from app.api.v1 import auth, users, tasks, battles, leaderboard, achievements, world, admin, progress, battle_ws, pvp, chat, pets, food, interactions, decorations, coins, workshop, daily, custom_levels, community, pet_chat, user_questions, ai_questions
# 临时禁用新API以修复导入错误
# from app.api.v1 import inventory, skills

IS_PRODUCTION = settings.ENVIRONMENT.lower() == "production"
ensure_database_ready()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_database_ready()
    yield

app = FastAPI(
    title="编程冒险岛 API",
    description="Code Adventure Island Game API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# CORS配置 — 通过 CORS_ORIGINS 环境变量配置白名单
_configured_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
_dev_local_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if _configured_origins:
    _cors_origins: list[str] = list(
        dict.fromkeys(
            _configured_origins + ([] if IS_PRODUCTION else _dev_local_origins)
        )
    )
else:
    # 仅开发环境允许所有来源；生产环境默认拒绝跨域，防止误暴露
    _cors_origins = ["*"] if not IS_PRODUCTION else []

_allow_all_origins = len(_cors_origins) == 1 and _cors_origins[0] == "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # 通配符来源与凭据不能同时开启，且生产环境应尽量最小化授权
    allow_credentials=not _allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from fastapi import Request
import logging
import uuid

# 配置日志 - 生产环境只输出警告和错误
log_level = logging.WARNING if IS_PRODUCTION else logging.INFO
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 请求日志中间件 - 只在开发环境输出详细日志
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        # 只在开发环境或错误时输出日志
        if not IS_PRODUCTION:
            logger.info(f"{request.method} {request.url.path} - {response.status_code} - {request_id}")
        elif response.status_code >= 400:
            logger.warning(f"{request.method} {request.url.path} - {response.status_code} - {request_id}")
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {request.url.path} - {request_id} - {str(e)}")
        raise


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "detail": exc.detail,
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    # 🔒 只返回友好消息，不泄露 Pydantic 内部字段路径和类型信息
    friendly_errors = []
    for err in exc.errors():
        msg = err.get("msg", "参数有误")
        # 只取 Value error 后面的中文提示（Pydantic 格式: "Value error, xxx"）
        if "Value error," in msg:
            msg = msg.split("Value error,", 1)[-1].strip()
        friendly_errors.append(msg)
    logger.warning(f"Validation error {request.url.path} - {request_id}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": friendly_errors[0] if len(friendly_errors) == 1 else "请求参数不正确，请检查输入",
            "detail": "请求参数不正确，请检查输入",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.exception(f"Unhandled error {request.method} {request.url.path} - {request_id}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "服务器繁忙，请稍后再试",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )

app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用户"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["任务"])
app.include_router(battles.router, prefix="/api/v1/battles", tags=["对战"])
app.include_router(battle_ws.router, prefix="/api/v1/battles", tags=["对战WebSocket"])
app.include_router(leaderboard.router, prefix="/api/v1/leaderboard", tags=["排行榜"])
app.include_router(achievements.router, prefix="/api/v1/achievements", tags=["成就"])
app.include_router(world.router, prefix="/api/v1/world", tags=["开放世界"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["后台管理"])
app.include_router(progress.router, prefix="/api/v1/progress", tags=["游戏进度"])
app.include_router(pvp.router, prefix="/api/v1/pvp", tags=["PVP三轮制对战"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["聊天系统"])
app.include_router(pets.router, prefix="/api/v1/pets", tags=["宠物系统"])
app.include_router(interactions.router, prefix="/api/v1/pets", tags=["宠物互动"])
app.include_router(food.router, prefix="/api/v1/food", tags=["食物系统"])
app.include_router(decorations.router, prefix="/api/v1/decorations", tags=["装饰品系统"])
app.include_router(coins.router, prefix="/api/v1", tags=["金币系统"])
app.include_router(workshop.router, prefix="/api/v1/workshop", tags=["创意工坊金币"])
app.include_router(daily.router, prefix="/api/v1/daily", tags=["每日签到"])
app.include_router(custom_levels.router, prefix="/api/v1", tags=["自定义关卡"])
app.include_router(community.router, prefix="/api/v1", tags=["社区关卡"])
app.include_router(pet_chat.router, prefix="/api/v1/ai", tags=["宠物AI聊天"])
app.include_router(user_questions.router, prefix="/api/v1/user-questions", tags=["用户题库"])
app.include_router(ai_questions.router, prefix="/api/v1/ai/questions", tags=["AI出题"])
# 临时禁用新API路由
# app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["背包系统"])
# app.include_router(skills.router, prefix="/api/v1/skills", tags=["技能系统"])

@app.get("/")
async def root():
    payload = {
        "message": "欢迎来到编程冒险岛！",
        "version": "1.0.0",
    }
    if not IS_PRODUCTION:
        payload["docs"] = "/docs"
    return payload

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

