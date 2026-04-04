#!/bin/bash
# Move the production SQLite database out of the deploy directory and update .env.
set -euo pipefail
umask 077

APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
TARGET_DB_FILE="${TARGET_DB_FILE:-/www/data/game-backend/code_adventure.db}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURRENT_DB_FILE="${CURRENT_DB_FILE:-$(bash "$SCRIPT_DIR/resolve-db-path.sh")}"
TARGET_DIR="$(dirname "$TARGET_DB_FILE")"
TARGET_DB_URL="sqlite:///$TARGET_DB_FILE"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
TMP_TARGET="$TARGET_DB_FILE.migrating.$TIMESTAMP"
ENV_BACKUP="$ENV_FILE.db-migration.$TIMESTAMP.bak"

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
echo "Production database migration"
echo "Current database: $CURRENT_DB_FILE"
echo "Target database:  $TARGET_DB_FILE"
echo "========================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Missing .env file: $ENV_FILE"
    exit 1
fi

if [ ! -f "$CURRENT_DB_FILE" ]; then
    echo "❌ Current database not found: $CURRENT_DB_FILE"
    exit 1
fi

if [ "$CURRENT_DB_FILE" = "$TARGET_DB_FILE" ]; then
    echo "✅ Database is already stored outside the deploy directory"
    exit 0
fi

bash "$SCRIPT_DIR/backup-database.sh"

mkdir -p "$TARGET_DIR"
chmod 700 "$TARGET_DIR"

PYTHON_BIN="/www/wwwroot/game-backend/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi
if [ -z "${PYTHON_BIN:-}" ]; then
    echo "❌ No usable Python interpreter found"
    exit 1
fi

echo "1️⃣ Stop backend service..."
run_pm2_command "pm2 stop game-backend 2>/dev/null || true"

echo "2️⃣ Copy database into the safe directory..."
"$PYTHON_BIN" - "$CURRENT_DB_FILE" "$TMP_TARGET" <<'PY'
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

echo "3️⃣ Validate copied database..."
"$PYTHON_BIN" - "$TMP_TARGET" <<'PY'
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

echo "4️⃣ Update DATABASE_URL in .env..."
cp "$ENV_FILE" "$ENV_BACKUP"
if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
    sed -i "s|^DATABASE_URL=.*$|DATABASE_URL=$TARGET_DB_URL|" "$ENV_FILE"
else
    printf '\nDATABASE_URL=%s\n' "$TARGET_DB_URL" >> "$ENV_FILE"
fi

mv -f "$TMP_TARGET" "$TARGET_DB_FILE"
rm -f "${CURRENT_DB_FILE}-wal" "${CURRENT_DB_FILE}-shm"
rm -f "${TARGET_DB_FILE}-wal" "${TARGET_DB_FILE}-shm"

if getent passwd "$OWNER_USER" >/dev/null 2>&1; then
    chown -R "$OWNER_USER:$OWNER_GROUP" "$TARGET_DIR"
fi
chmod 700 "$TARGET_DIR"
chmod 600 "$TARGET_DB_FILE"

echo "5️⃣ Restart backend service..."
run_pm2_command "pm2 restart game-backend"
run_pm2_command "pm2 save"
sleep 3
curl -fsS http://localhost:8000/health >/dev/null

echo ""
echo "✅ Migration completed"
echo "New database: $TARGET_DB_FILE"
echo "Backup env:    $ENV_BACKUP"
