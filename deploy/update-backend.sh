#!/bin/bash
# ========================================
# 后端安全更新脚本
# 用途：发布前校验 + 数据备份 + 更新 + 健康检查
# 执行：bash deploy/update-backend.sh
# ========================================

set -euo pipefail

PM2_PATH="/www/server/nodejs/v20.19.6/bin"
APP_DIR="/www/wwwroot/game-backend"
OWNER_USER="${OWNER_USER:-game}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
echo "🔄 后端安全更新"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

cd "$APP_DIR"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$CURRENT_BRANCH}"
if [ -z "$DEPLOY_BRANCH" ] || [ "$DEPLOY_BRANCH" = "HEAD" ]; then
    echo "❌ 无法识别发布分支，请手动指定 DEPLOY_BRANCH 后重试"
    exit 1
fi

echo "1️⃣ 发布前配置校验..."
if [ ! -f ".env" ]; then
    echo "❌ 缺少 .env 文件，终止发布"
    exit 1
fi
if ! grep -Eq '^ENVIRONMENT=production[[:space:]]*$' .env; then
    echo "❌ .env 未设置 ENVIRONMENT=production，终止发布"
    exit 1
fi
SECRET_VALUE="$(awk -F= '/^SECRET_KEY=/{sub(/^SECRET_KEY=/,""); print; exit}' .env | tr -d '\r')"
if [ -z "$SECRET_VALUE" ]; then
    echo "❌ .env 缺少 SECRET_KEY，终止发布"
    exit 1
fi
if [ "${#SECRET_VALUE}" -lt 32 ]; then
    echo "❌ SECRET_KEY 长度不足（至少 32），终止发布"
    exit 1
fi

echo "2️⃣ 备份数据库..."
bash "$SCRIPT_DIR/backup-database.sh"

echo "3️⃣ 拉取最新代码（分支: $DEPLOY_BRANCH）..."
git fetch origin "$DEPLOY_BRANCH"
git pull origin "$DEPLOY_BRANCH"

echo "4️⃣ 更新依赖..."
if [ ! -x "venv/bin/python" ]; then
    echo "❌ 未找到 venv/bin/python，请先创建虚拟环境"
    exit 1
fi
./venv/bin/python -m pip install --upgrade pip setuptools wheel
./venv/bin/pip install -r requirements.txt

echo "5️⃣ 后端启动前检查..."
./venv/bin/python -c "from app.main import app; print('✅ BACKEND_CHECK_OK')"

echo "6️⃣ 重启后端..."
run_pm2_command "pm2 restart game-backend"
run_pm2_command "pm2 save"

echo "7️⃣ 健康检查..."
sleep 3
curl -fsS http://localhost:8000/health >/dev/null
echo "✅ /health 检查通过"

echo ""
echo "✅ 后端更新完成"
echo "可查看日志：pm2 logs game-backend --lines 100"
