#!/bin/bash
# ========================================
# 前端安全更新脚本
# 用途：发布前检查 + 更新 + 构建 + 健康检查
# 执行：bash deploy/update-frontend.sh
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
echo "🔄 前端安全更新"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

cd "$APP_DIR"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$CURRENT_BRANCH}"
if [ -z "$DEPLOY_BRANCH" ] || [ "$DEPLOY_BRANCH" = "HEAD" ]; then
    echo "❌ 无法识别发布分支，请手动指定 DEPLOY_BRANCH 后重试"
    exit 1
fi

echo "1️⃣ 拉取最新代码（分支: $DEPLOY_BRANCH）..."
git fetch origin "$DEPLOY_BRANCH"
git pull origin "$DEPLOY_BRANCH"

echo "2️⃣ 安装依赖..."
npm install --no-audit --no-fund

echo "3️⃣ 构建前端..."
npm run build

echo "4️⃣ 重启前端（端口 3003）..."
run_pm2_command "pm2 restart game || pm2 start 'npm start -- -p 3003' --name game --max-memory-restart 500M"
run_pm2_command "pm2 save"

echo "5️⃣ 健康检查..."
sleep 3
curl -fsS http://localhost:3003 >/dev/null
echo "✅ 前端本地健康检查通过"

echo ""
echo "✅ 前端更新完成"
echo "可查看日志：pm2 logs game --lines 100"
