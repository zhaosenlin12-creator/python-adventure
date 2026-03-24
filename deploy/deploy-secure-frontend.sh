#!/bin/bash
# ========================================
# 前端安全部署脚本（推荐）
# 用途：首次部署或全量重建前端服务
# 执行：bash deploy/deploy-secure-frontend.sh
# ========================================

set -euo pipefail

PM2_PATH="/www/server/nodejs/v20.19.6/bin"
APP_DIR="/www/wwwroot/game"
OWNER_USER="${OWNER_USER:-game}"

run_pm2_command() {
    local cmd="$1"
    if [ "${EUID:-$(id -u)}" -eq 0 ]; then
        su - "$OWNER_USER" -c "export PATH=$PM2_PATH:\$PATH && $cmd"
    else
        export PATH="$PM2_PATH:$PATH"
        eval "$cmd"
    fi
}

echo "========================================="
echo "🚀 前端安全部署"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "目录: $APP_DIR"
echo "========================================="

cd "$APP_DIR"
export PATH="$PM2_PATH:$PATH"

echo "1️⃣ 安装依赖..."
npm install --no-audit --no-fund

echo "2️⃣ 构建前端..."
npm run build

echo "3️⃣ 启动/重启 PM2..."
run_pm2_command "pm2 delete game 2>/dev/null || true"
run_pm2_command "pm2 start 'npm start -- -p 3003' --name game --max-memory-restart 500M"
run_pm2_command "pm2 save"

echo "4️⃣ 健康检查..."
sleep 3
curl -fsS http://localhost:3003 >/dev/null
echo "✅ 前端服务可用"

echo ""
echo "✅ 部署完成：game (3003)"
