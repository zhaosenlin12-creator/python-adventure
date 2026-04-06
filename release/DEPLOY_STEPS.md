# 发布部署步骤

本文件是面向这台服务器的简版执行清单。唯一标准说明仍然是 [`deploy/DEPLOY_SERVER_EXACT.md`](../deploy/DEPLOY_SERVER_EXACT.md)。

## 服务器固定信息

- 前端目录：`/www/wwwroot/game`
- 后端目录：`/www/wwwroot/game-backend`
- PM2 用户：`game`
- 前端 PM2 应用：`game`
- 后端 PM2 应用：`game-backend`
- 前端端口：`3003`
- 后端健康检查：`http://127.0.0.1:8000/health`
- 生产数据库：`/www/data/game-backend/code_adventure.db`

## 本地打包

前端：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build.ps1
```

后端：

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\build-backend.ps1
```

## 上传后端包

把 `backend-deploy.zip` 上传到 `/www/wwwroot/game-backend/`，然后在服务器 `root` 终端执行：

```bash
cd /www/wwwroot/game-backend
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/usr/bin/unzip -oq backend-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/bash deploy/post-upload-backend.sh
```

## 上传前端包

把 `game-deploy.zip` 上传到 `/www/wwwroot/game/`，然后在服务器 `root` 终端执行：

```bash
cd /www/wwwroot/game
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/www/server/nodejs/v20.19.6/bin

/usr/bin/unzip -oq game-deploy.zip
/bin/chmod +x deploy/*.sh
/bin/bash deploy/post-upload-frontend.sh
```

## 部署后检查

后端：

```bash
curl -fsS http://127.0.0.1:8000/health
```

前端：

```bash
curl -fsS http://127.0.0.1:3003
```

数据库路径确认：

```bash
cd /www/wwwroot/game-backend
./venv/bin/python - <<'PY'
from app.core.config import settings
print(settings.DATABASE_URL)
PY
```

预期输出：

```text
sqlite:////www/data/game-backend/code_adventure.db
```

## 硬规则

- 不要把生产数据库放回 `/www/wwwroot/game-backend`
- 不要把历史旧包直接覆盖到生产目录
- 不要在服务器上用 `git pull` 代替正式发布
- 只运行 `deploy/post-upload-frontend.sh` 和 `deploy/post-upload-backend.sh`
- 如果解压时出现 `appears to use backslashes as path separators`，只要解压成功即可忽略
