#!/bin/bash
# Consistent SQLite backup for the production backend.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
DATE="$(date '+%Y%m%d_%H%M%S')"
DB_FILE="${DB_FILE:-$(bash "$SCRIPT_DIR/resolve-db-path.sh")}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TMP_BACKUP="$BACKUP_DIR/code_adventure_${DATE}.db"
ARCHIVE_FILE="${TMP_BACKUP}.gz"
CHECKSUM_FILE="${ARCHIVE_FILE}.sha256"

echo "========================================="
echo "Start database backup"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Database: $DB_FILE"
echo "Backup dir: $BACKUP_DIR"
echo "========================================="

if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

PYTHON_BIN="/www/wwwroot/game-backend/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ]; then
    echo "❌ No usable Python interpreter found"
    exit 1
fi

echo "1️⃣ Create a consistent SQLite backup..."
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

echo "2️⃣ Compress backup..."
gzip -f "$TMP_BACKUP"

echo "3️⃣ Generate checksum..."
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$ARCHIVE_FILE" > "$CHECKSUM_FILE"
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$ARCHIVE_FILE" > "$CHECKSUM_FILE"
else
    echo "⚠️ sha256 tool not found, checksum skipped"
fi

echo "4️⃣ Clean expired backups (older than ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "code_adventure_*.db.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "code_adventure_*.db.gz.sha256" -mtime +"$RETENTION_DAYS" -delete

SIZE="$(du -h "$ARCHIVE_FILE" | cut -f1)"
echo "✅ Backup created: $ARCHIVE_FILE"
echo "Size: $SIZE"
