#!/bin/bash
# Run after game-deploy.zip has been uploaded and extracted on the server.
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
PORT="${PORT:-3003}"

IS_ROOT=0
if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    IS_ROOT=1
fi

run_as_owner() {
    local cmd="$1"
    if [ "$IS_ROOT" -eq 1 ]; then
        su -s /bin/bash - "$OWNER_USER" -c "export PATH=$PM2_PATH:\$PATH && $cmd"
    else
        export PATH="$PM2_PATH:$PATH"
        eval "$cmd"
    fi
}

cd "$APP_DIR"
export PATH="$PM2_PATH:$PATH"

echo "========================================="
echo "Post-upload frontend deploy"
echo "App dir: $APP_DIR"
echo "User:    $(whoami)"
echo "Port:    $PORT"
echo "========================================="

RELEASE_MARKER_FILE="$APP_DIR/deploy/FRONTEND_RELEASE.txt"
if [ ! -f "$RELEASE_MARKER_FILE" ]; then
    echo "ERROR: missing $RELEASE_MARKER_FILE"
    echo "Upload the latest game-deploy.zip before running this script."
    exit 1
fi
RELEASE_MARKER="$(tr -d '\r\n' < "$RELEASE_MARKER_FILE")"
echo "Release: $RELEASE_MARKER"

if [ ! -f package.json ]; then
    echo "ERROR: missing package.json in $APP_DIR"
    exit 1
fi

if [ "$IS_ROOT" -eq 1 ]; then
    mkdir -p /www/wwwlogs /www/server/nginx/proxy_cache_dir
    chown -R "$OWNER_USER:$OWNER_GROUP" "$APP_DIR"
fi

run_as_owner "cd '$APP_DIR' && npm ci --omit=dev --no-audit --no-fund"
run_as_owner "cd '$APP_DIR' && rm -f public/sounds/bgm_battle.wav public/sounds/bgm_boss.wav public/sounds/bgm_victory.wav"
run_as_owner "cd '$APP_DIR' && rm -rf .next/cache .next/dev 2>/dev/null || true"
run_as_owner "cd '$APP_DIR' && if pm2 describe game >/dev/null 2>&1; then pm2 restart game; else pm2 start \"npm start -- -p $PORT\" --name game --max-memory-restart 500M; fi"
run_as_owner "pm2 save"

if [ "$IS_ROOT" -eq 1 ]; then
    rm -f "$APP_DIR/deploy.sh" "$APP_DIR/deploy-secure-frontend.sh" "$APP_DIR/ecosystem.config.js" 2>/dev/null || true

    if [ -d /www/server/nginx/proxy_cache_dir ]; then
        rm -rf /www/server/nginx/proxy_cache_dir/*
    fi

    if command -v /etc/init.d/nginx >/dev/null 2>&1; then
        /etc/init.d/nginx reload || true
    elif command -v systemctl >/dev/null 2>&1; then
        systemctl reload nginx || true
    fi
else
    echo "WARNING: running as $(whoami); Nginx cache cleanup and reload were not available"
fi

sleep 3
release_info="$(curl -fsS --max-time 10 "http://127.0.0.1:$PORT/build-info.json?release=$RELEASE_MARKER")"
if ! printf '%s' "$release_info" | grep -Fq "\"release\":\"$RELEASE_MARKER\""; then
    echo "ERROR: local app did not serve the expected release marker"
    printf '%s\n' "$release_info"
    exit 1
fi

echo "========================================="
echo "DONE: frontend post-upload deploy finished"
echo "========================================="
