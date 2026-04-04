#!/bin/bash
# Restore a SQLite backup with integrity checks and rollback protection.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
DB_FILE="${DB_FILE:-$(bash "$SCRIPT_DIR/resolve-db-path.sh")}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
DB_DIR="$(dirname "$DB_FILE")"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
TMP_RESTORE="$DB_DIR/code_adventure.restore.$TIMESTAMP.db"
ROLLBACK_SNAPSHOT="$DB_DIR/code_adventure.before_restore.$TIMESTAMP.db"

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
    echo "Usage: bash deploy/restore-database.sh <backup-file>"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/code_adventure_*.db.gz 2>/dev/null || true
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "========================================="
echo "Restore database"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Backup file: $BACKUP_FILE"
echo "Target DB: $DB_FILE"
echo "========================================="

if [ -f "$CHECKSUM_FILE" ]; then
    echo "1️⃣ Verify checksum..."
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c "$CHECKSUM_FILE"
    elif command -v shasum >/dev/null 2>&1; then
        (cd "$(dirname "$CHECKSUM_FILE")" && shasum -a 256 -c "$(basename "$CHECKSUM_FILE")")
    else
        echo "⚠️ sha256 tool not found, checksum skipped"
    fi
fi

echo "2️⃣ Stop backend service..."
run_pm2_command "pm2 stop game-backend 2>/dev/null || true"

if [ -f "$DB_FILE" ]; then
    echo "3️⃣ Create rollback snapshot..."
    cp "$DB_FILE" "$ROLLBACK_SNAPSHOT"
fi

echo "4️⃣ Decompress backup..."
gunzip -c "$BACKUP_FILE" > "$TMP_RESTORE"

PYTHON_BIN="/www/wwwroot/game-backend/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ]; then
    echo "❌ No usable Python interpreter found"
    exit 1
fi

echo "5️⃣ Validate restored database..."
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

echo "6️⃣ Replace database..."
mv -f "$TMP_RESTORE" "$DB_FILE"
rm -f "${DB_FILE}-wal" "${DB_FILE}-shm"

if getent passwd "$OWNER_USER" >/dev/null 2>&1; then
    chown "$OWNER_USER:$OWNER_GROUP" "$DB_FILE"
fi
chmod 600 "$DB_FILE"

echo "7️⃣ Restart backend service..."
run_pm2_command "pm2 restart game-backend"
run_pm2_command "pm2 save"

echo "✅ Restore completed"
echo "Rollback snapshot: $ROLLBACK_SNAPSHOT"
