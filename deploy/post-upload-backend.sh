#!/bin/bash
# Run after backend-deploy.zip has been uploaded and extracted on the server.
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
PYTHON_BIN="${PYTHON_BIN:-/www/server/python_manager/versions/3.10.0/bin/python3.10}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_pm2_command() {
    local cmd="$1"
    if [ "${EUID:-$(id -u)}" -eq 0 ]; then
        su -s /bin/bash - "$OWNER_USER" -c "export PATH=$PM2_PATH:\$PATH && $cmd"
    else
        export PATH="$PM2_PATH:$PATH"
        eval "$cmd"
    fi
}

if [ "${1:-}" != "--as-game" ] && [ "${EUID:-$(id -u)}" -eq 0 ]; then
    mkdir -p /www/data/game-backend /www/backups/game-backend /www/wwwlogs
    chown -R "$OWNER_USER:$OWNER_GROUP" "$APP_DIR" /www/data/game-backend /www/backups/game-backend
    exec su -s /bin/bash - "$OWNER_USER" -c "cd '$APP_DIR' && bash deploy/post-upload-backend.sh --as-game"
fi

if [ ! -f "$APP_DIR/.env" ]; then
    echo "ERROR: missing $APP_DIR/.env"
    exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
    echo "ERROR: Python 3.10 not found: $PYTHON_BIN"
    exit 1
fi

cd "$APP_DIR"
export PATH="$PM2_PATH:$PATH"

echo "========================================="
echo "Post-upload backend deploy"
echo "App dir:   $APP_DIR"
echo "User:      $(whoami)"
echo "========================================="

if [ -x "deploy/backup-database.sh" ]; then
    bash deploy/backup-database.sh
fi

if [ -x "deploy/database-safety-preflight.sh" ]; then
    bash deploy/database-safety-preflight.sh
fi

if [ ! -x "venv/bin/python" ] || ! ./venv/bin/python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 10) else 1)" >/dev/null 2>&1; then
    rm -rf venv
    "$PYTHON_BIN" -m venv venv
fi

./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/pip install -r requirements.txt

DB_FILE="$(
    if [ -x "deploy/resolve-db-path.sh" ]; then
        bash deploy/resolve-db-path.sh
    else
        printf '%s\n' "/www/data/game-backend/code_adventure.db"
    fi
)"
rm -f "${DB_FILE}-wal" "${DB_FILE}-shm"

./venv/bin/python -c "from app.main import app; print('BACKEND_CHECK_OK')"

run_pm2_command "cd '$APP_DIR' && pm2 delete game-backend 2>/dev/null || true"
run_pm2_command "cd '$APP_DIR' && pm2 start /www/wwwroot/game-backend/run_prod.py --name game-backend --interpreter /www/wwwroot/game-backend/venv/bin/python --cwd /www/wwwroot/game-backend --max-memory-restart 400M"
run_pm2_command "pm2 save"

sleep 3
curl --max-time 5 http://127.0.0.1:8000/health
curl --max-time 5 http://127.0.0.1:8000/api/typing/health

echo "========================================="
echo "DONE: backend post-upload deploy finished"
echo "========================================="
