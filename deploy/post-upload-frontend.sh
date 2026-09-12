#!/bin/bash
# Run after game-deploy.zip has been uploaded and extracted on the server.
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
PORT="${PORT:-3003}"
NGINX_SITE_CONF="${NGINX_SITE_CONF:-/www/server/panel/vhost/nginx/game.codebn.cn.conf}"
NGINX_BIN="${NGINX_BIN:-/www/server/nginx/sbin/nginx}"
NGINX_TEMPLATE="$APP_DIR/deploy/nginx.conf"

test_nginx_config() {
    if [ -x "$NGINX_BIN" ]; then
        "$NGINX_BIN" -t
        return
    fi
    if command -v nginx >/dev/null 2>&1; then
        nginx -t
        return
    fi
    echo "WARN: nginx binary not found, skip syntax test"
}

run_as_owner() {
    local cmd="$1"
    if [ "${EUID:-$(id -u)}" -eq 0 ]; then
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

if [ ! -f package.json ]; then
    echo "ERROR: missing package.json in $APP_DIR"
    exit 1
fi

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    mkdir -p /www/wwwlogs /www/server/nginx/proxy_cache_dir
    chown -R "$OWNER_USER:$OWNER_GROUP" "$APP_DIR"
fi

run_as_owner "cd '$APP_DIR' && npm install --no-audit --no-fund"
run_as_owner "cd '$APP_DIR' && rm -rf .next/cache .next/dev 2>/dev/null || true"
run_as_owner "cd '$APP_DIR' && if pm2 describe game >/dev/null 2>&1; then pm2 restart game; else pm2 start \"npm start -- -p $PORT\" --name game --max-memory-restart 500M; fi"
run_as_owner "pm2 save"

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    nginx_backup=""
    if [ -f "$NGINX_TEMPLATE" ]; then
        mkdir -p "$(dirname "$NGINX_SITE_CONF")"
        if [ -f "$NGINX_SITE_CONF" ]; then
            nginx_backup="${NGINX_SITE_CONF}.bak.$(date +%Y%m%d%H%M%S)"
            cp -f "$NGINX_SITE_CONF" "$nginx_backup"
        fi
        cp -f "$NGINX_TEMPLATE" "$NGINX_SITE_CONF"
    fi

    if ! test_nginx_config; then
        if [ -n "$nginx_backup" ] && [ -f "$nginx_backup" ]; then
            cp -f "$nginx_backup" "$NGINX_SITE_CONF"
        fi
        echo "ERROR: nginx configuration test failed"
        exit 1
    fi

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
    echo "INFO: not running as root, skip nginx cache cleanup and reload"
fi

sleep 3
curl -fsS --max-time 10 "http://127.0.0.1:$PORT" >/dev/null

echo "========================================="
echo "DONE: frontend post-upload deploy finished"
echo "========================================="
