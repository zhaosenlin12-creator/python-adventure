#!/bin/bash
# Restore the active production database from any verified SQLite candidate.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
TARGET_DB_FILE="${TARGET_DB_FILE:-$(bash "$SCRIPT_DIR/resolve-db-path.sh")}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
TMP_DIR="$(mktemp -d /tmp/game-db-restore.XXXXXX)"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
ROLLBACK_SNAPSHOT="${TARGET_DB_FILE}.before_candidate_restore.${TIMESTAMP}"
TMP_CANDIDATE_DB="$TMP_DIR/candidate.db"
TMP_TARGET_DB="$TMP_DIR/target.db"

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

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
    echo "Usage: bash deploy/restore-from-db-candidate.sh <candidate-db-or-db.gz>"
    echo "Example:"
    echo "  bash deploy/restore-from-db-candidate.sh /www/wwwroot/game-backend/code_adventure.db.backup.202603311834"
    exit 1
fi

SOURCE_INPUT="$1"
if [[ "$SOURCE_INPUT" != /* ]]; then
    SOURCE_INPUT="$(cd "$(dirname "$SOURCE_INPUT")" && pwd)/$(basename "$SOURCE_INPUT")"
fi

if [ ! -f "$SOURCE_INPUT" ]; then
    echo "ERROR: candidate file not found: $SOURCE_INPUT"
    exit 1
fi

if [ "$SOURCE_INPUT" = "$TARGET_DB_FILE" ]; then
    echo "ERROR: candidate file is already the active production database"
    exit 1
fi

PYTHON_BIN="${PYTHON_BIN:-$APP_DIR/venv/bin/python}"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="/www/server/python_manager/versions/3.10.0/bin/python3.10"
fi
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ] || [ ! -x "$PYTHON_BIN" ]; then
    echo "ERROR: no usable Python interpreter found"
    exit 1
fi

echo "========================================="
echo "Restore production DB from candidate"
echo "Source candidate: $SOURCE_INPUT"
echo "Target database:  $TARGET_DB_FILE"
echo "Python:           $PYTHON_BIN"
echo "========================================="

if [[ "$SOURCE_INPUT" == *.gz ]]; then
    echo "1. Extract compressed candidate..."
    gzip -dc "$SOURCE_INPUT" > "$TMP_CANDIDATE_DB"
else
    cp "$SOURCE_INPUT" "$TMP_CANDIDATE_DB"
fi

echo "2. Validate candidate integrity..."
"$PYTHON_BIN" - "$TMP_CANDIDATE_DB" <<'PY'
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

echo "3. Create a fresh backup of current production DB..."
bash "$SCRIPT_DIR/backup-database.sh"

if [ -f "$TARGET_DB_FILE" ]; then
    cp "$TARGET_DB_FILE" "$ROLLBACK_SNAPSHOT"
    chmod 600 "$ROLLBACK_SNAPSHOT"
fi

echo "4. Build a clean target copy from the candidate..."
"$PYTHON_BIN" - "$TMP_CANDIDATE_DB" "$TMP_TARGET_DB" <<'PY'
import sqlite3
import sys

source_path, target_path = sys.argv[1], sys.argv[2]
source_conn = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
target_conn = sqlite3.connect(target_path)
try:
    with target_conn:
        source_conn.backup(target_conn)
finally:
    target_conn.close()
    source_conn.close()
PY

echo "5. Stop backend..."
run_pm2_command "pm2 stop game-backend 2>/dev/null || true"

echo "6. Replace production DB..."
mv -f "$TMP_TARGET_DB" "$TARGET_DB_FILE"
rm -f "${TARGET_DB_FILE}-wal" "${TARGET_DB_FILE}-shm"

if getent passwd "$OWNER_USER" >/dev/null 2>&1; then
    chown "$OWNER_USER:$OWNER_GROUP" "$TARGET_DB_FILE"
fi
chmod 600 "$TARGET_DB_FILE"

echo "7. Restart backend and verify health..."
run_pm2_command "pm2 restart game-backend"
run_pm2_command "pm2 save"
sleep 3
curl -fsS http://127.0.0.1:8000/health >/dev/null

echo "========================================="
echo "DONE: candidate promoted to production"
echo "Rollback snapshot: $ROLLBACK_SNAPSHOT"
echo "Active database:   $TARGET_DB_FILE"
echo "========================================="
