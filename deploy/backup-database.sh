#!/bin/bash
# ========================================
# 数据库备份脚本（SQLite 一致性备份）
# 用途：备份用户数据并生成校验文件
# 执行：bash deploy/backup-database.sh
# ========================================

set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
DATE="$(date '+%Y%m%d_%H%M%S')"
DB_FILE="${DB_FILE:-/www/wwwroot/game-backend/code_adventure.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TMP_BACKUP="$BACKUP_DIR/code_adventure_${DATE}.db"
ARCHIVE_FILE="${TMP_BACKUP}.gz"
CHECKSUM_FILE="${ARCHIVE_FILE}.sha256"

echo "========================================="
echo "开始备份数据库"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "数据库: $DB_FILE"
echo "备份目录: $BACKUP_DIR"
echo "========================================="

if [ ! -f "$DB_FILE" ]; then
    echo "❌ 数据库文件不存在: $DB_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# 选择可用 Python（优先使用项目 venv）
PYTHON_BIN="/www/wwwroot/game-backend/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ]; then
    echo "❌ 未找到可用 Python 解释器，无法执行 SQLite 一致性备份"
    exit 1
fi

echo "1️⃣ 执行 SQLite 一致性备份..."
"$PYTHON_BIN" - "$DB_FILE" "$TMP_BACKUP" <<'PY'
import sqlite3
import sys

source_path, backup_path = sys.argv[1], sys.argv[2]

source_conn = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
backup_conn = sqlite3.connect(backup_path)
try:
    with backup_conn:
        source_conn.backup(backup_conn)
finally:
    backup_conn.close()
    source_conn.close()
PY

echo "2️⃣ 压缩备份..."
gzip -f "$TMP_BACKUP"

echo "3️⃣ 生成校验文件..."
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$ARCHIVE_FILE" > "$CHECKSUM_FILE"
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$ARCHIVE_FILE" > "$CHECKSUM_FILE"
else
    echo "⚠️ 未找到 sha256 工具，跳过校验文件生成"
fi

echo "4️⃣ 清理过期备份（>${RETENTION_DAYS}天）..."
find "$BACKUP_DIR" -name "code_adventure_*.db.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "code_adventure_*.db.gz.sha256" -mtime +"$RETENTION_DAYS" -delete

SIZE="$(du -h "$ARCHIVE_FILE" | cut -f1)"
echo "✅ 数据库备份完成: $ARCHIVE_FILE"
echo "📦 备份大小: $SIZE"

echo ""
echo "📋 最近10个备份："
ls -lh "$BACKUP_DIR"/code_adventure_*.db.gz 2>/dev/null | tail -10 || true

echo ""
echo "========================================="
echo "备份完成"
echo "========================================="
