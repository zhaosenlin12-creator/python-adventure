# 部署步骤

## 交付文件

- `game-deploy.zip`：前端部署包，上传到 `/www/wwwroot/game/`
- `backend-deploy.zip`：后端部署包，上传到 `/www/wwwroot/game-backend/`

## 当前推荐架构

- 继续沿用当前稳定方案：`Nginx -> PM2(game) -> Next.js :3003`
- 后端保持：`Nginx -> PM2(game-backend) -> FastAPI/Uvicorn :8000`
- 这次不要改成 Docker、多 worker Gunicorn、多实例后端或 K8s
- 原因：当前 Battle Royale、WebSocket、SQLite、单房间同步逻辑都是按单实例后端收口设计的，轻量服务器先保证稳定比扩容更重要

## 更新前准备

- 压缩包可以通过宝塔上传
- 前端和后端的解压、覆盖、启动，统一在 SSH 里执行
- 后端目录务必用 `game` 用户执行，不要在宝塔文件管理器里直接覆盖解压后端
- 后端虚拟环境必须固定使用这个 Python：

```bash
/www/server/python_manager/versions/3.10.0/bin/python3.10
```

## 如果之前报过 readonly database，先修权限

下面这段在 root 或宝塔终端执行一次：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

su - game -c 'export PATH=/www/server/nodejs/v20.19.6/bin:$PATH && pm2 stop game-backend'
chown -R game:game /www/wwwroot/game-backend
chown -R game:game /www/wwwroot/game
chmod 775 /www/wwwroot/game-backend
chmod 664 /www/wwwroot/game-backend/code_adventure.db 2>/dev/null || true
chmod 664 /www/wwwroot/game-backend/code_adventure.db-wal 2>/dev/null || true
chmod 664 /www/wwwroot/game-backend/code_adventure.db-shm 2>/dev/null || true
rm -f /www/wwwroot/game-backend/code_adventure.db-wal
rm -f /www/wwwroot/game-backend/code_adventure.db-shm
su - game -c 'cd /www/wwwroot/game-backend && touch .perm_test && rm -f .perm_test'
```

## 更新前端

```bash
su - game
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game

pm2 stop game

rm -rf .next
rm -rf app components hooks lib public store types
rm -f package.json package-lock.json next.config.ts tsconfig.json proxy.ts
rm -f deploy.sh deploy-secure-frontend.sh ecosystem.config.js

unzip -oq game-deploy.zip

pm2 start game || pm2 restart game
pm2 save
```

## 更新后端

```bash
su - game
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game-backend

PY310=/www/server/python_manager/versions/3.10.0/bin/python3.10
[ -x "$PY310" ] || { echo "未找到 Python 3.10: $PY310"; exit 1; }

cp code_adventure.db code_adventure.db.backup.$(date +%Y%m%d%H%M)

pm2 stop game-backend

find . -mindepth 1 -maxdepth 1 \
  ! -name '.env' \
  ! -name 'venv' \
  ! -name 'code_adventure.db' \
  ! -name 'code_adventure.db.backup*' \
  ! -name 'backend-deploy.zip' \
  -exec rm -rf {} +

unzip -oq backend-deploy.zip

if [ ! -x venv/bin/python ] || ! ./venv/bin/python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 10) else 1)"; then
  rm -rf venv
  $PY310 -m venv venv
fi

./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/pip install -r requirements.txt
rm -f code_adventure.db-wal code_adventure.db-shm
./venv/bin/python -c "from app.main import app; print('BACKEND_CHECK_OK')"

pm2 delete game-backend 2>/dev/null || true
pm2 start /www/wwwroot/game-backend/run_prod.py --name game-backend --interpreter /www/wwwroot/game-backend/venv/bin/python --cwd /www/wwwroot/game-backend --max-memory-restart 400M
pm2 save

curl --max-time 5 http://localhost:8000/health
```

## 清理缓存

下面两条建议在 root 或宝塔终端执行：

```bash
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
```

## 更新后检查

```bash
su - game
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

pm2 status
pm2 logs game --lines 60 --nostream
pm2 logs game-backend --lines 60 --nostream

curl -I --max-time 5 https://game.codebn.cn
curl -I --max-time 5 https://game.codebn.cn/world
curl --max-time 5 http://localhost:8000/health
```

## 重点提醒

- 前端一定要先清掉旧 `.next` 再覆盖，否则容易命中旧缓存
- 后端不要覆盖 `code_adventure.db`、`.env`
- 后端 `venv` 如果不是 Python 3.10，就删除后重建，不要继续混用旧环境
- Battle Royale 当前正式上线建议硬上限 `6` 人，`2C4G` 轻量服务器建议真人 `4-5` 人，其余用 AI 补位
- 正式上线 key 在 `/www/wwwroot/game-backend/.env`，重点检查 `SECRET_KEY`
