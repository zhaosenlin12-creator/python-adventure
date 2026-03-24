#!/bin/bash
# ========================================
# 数据库恢复脚本（带校验与回滚保护）
# 用途：从备份恢复数据库
# 执行：bash deploy/restore-database.sh [备份文件]
# ========================================

set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
DB_FILE="${DB_FILE:-/www/wwwroot/game-backend/code_adventure.db}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
DB_DIR="$(dirname "$DB_FILE")"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
TMP_RESTORE="$DB_DIR/code_adventure.restore.${TIMESTAMP}.db"
ROLLBACK_SNAPSHOT="$DB_DIR/code_adventure.before_restore.${TIMESTAMP}.db"

run_pm2_command() {
    local cmd="$1"
    if [ "${EUID:-$(id -u)}" -eq 0 ]; then
        su - "$OWNER_USER" -c "export PATH=$PM2_PATH:\$PATH && $cmd"
    else
        export PATH="$PM2_PATH:$PATH"
        eval "$cmd"
    fi
}

if [ -z "${1:-}" ]; then
    echo "========================================="
    echo "数据库恢复脚本"
    echo "========================================="
    echo ""
    echo "用法: bash deploy/restore-database.sh <备份文件>"
    echo ""
    echo "可用的备份文件："
    ls -lh "$BACKUP_DIR"/code_adventure_*.db.gz 2>/dev/null || true
    echo ""
    echo "示例："
    echo "  bash deploy/restore-database.sh code_adventure_20260124_120000.db.gz"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "========================================="
echo "开始恢复数据库"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "备份文件: $BACKUP_FILE"
echo "目标数据库: $DB_FILE"
echo "========================================="

if [ -f "$CHECKSUM_FILE" ]; then
    echo "1️⃣ 验证备份校验和..."
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c "$CHECKSUM_FILE"
    elif command -v shasum >/dev/null 2>&1; then
        (cd "$(dirname "$CHECKSUM_FILE")" && shasum -a 256 -c "$(basename "$CHECKSUM_FILE")")
    else
        echo "⚠️ 未找到校验工具，跳过 checksum 校验"
    fi
else
    echo "⚠️ 未找到校验文件，继续恢复但请确认备份来源可信"
fi

echo "2️⃣ 停止后端服务..."
run_pm2_command "pm2 stop game-backend 2>/dev/null || true"

echo "3️⃣ 备份当前数据库（回滚保护）..."
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$ROLLBACK_SNAPSHOT"
    echo "✅ 当前数据库快照: $ROLLBACK_SNAPSHOT"
fi

echo "4️⃣ 解压到临时文件..."
gunzip -c "$BACKUP_FILE" > "$TMP_RESTORE"

echo "5️⃣ 校验恢复文件完整性..."
PYTHON_BIN="/www/wwwroot/game-backend/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ]; then
    echo "❌ 未找到 Python，无法执行 SQLite 完整性校验"
    exit 1
fi

"$PYTHON_BIN" - "$TMP_RESTORE" <<'PY'
import sqlite3
import sys

db_file = sys.argv[1]
conn = sqlite3.connect(db_file)
try:
    result = conn.execute("PRAGMA integrity_check;").fetchone()
    if not result or str(result[0]).lower() != "ok":
        raise RuntimeError(f"integrity_check failed: {result}")
finally:
    conn.close()
PY

echo "6️⃣ 替换线上数据库..."
mv -f "$TMP_RESTORE" "$DB_FILE"

echo "7️⃣ 修复权限..."
if getent passwd "$OWNER_USER" >/dev/null 2>&1; then
    chown "$OWNER_USER:$OWNER_GROUP" "$DB_FILE"
fi
chmod 600 "$DB_FILE"

echo "8️⃣ 启动后端服务..."
run_pm2_command "pm2 restart game-backend"
run_pm2_command "pm2 save"

echo ""
echo "========================================="
echo "恢复完成"
echo "========================================="
echo "✅ 数据库已恢复: $DB_FILE"
echo "📁 使用备份: $BACKUP_FILE"
echo "🛟 回滚快照: $ROLLBACK_SNAPSHOT"
