#!/bin/bash
# Production database safety preflight.
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
ZIP_FILE="${ZIP_FILE:-$APP_DIR/backend-deploy.zip}"
ACTIVE_DB_FILE="${ACTIVE_DB_FILE:-$(bash "$SCRIPT_DIR/resolve-db-path.sh")}"
RECENT_BACKUP_HOURS="${RECENT_BACKUP_HOURS:-24}"
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
echo "Production DB safety preflight"
echo "App dir:         $APP_DIR"
echo "Env file:        $ENV_FILE"
echo "Active DB:       $ACTIVE_DB_FILE"
echo "Backup dir:      $BACKUP_DIR"
echo "Backend package: $ZIP_FILE"
echo "Python:          $PYTHON_BIN"
echo "========================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: missing .env file: $ENV_FILE"
    exit 1
fi

if [ ! -f "$ACTIVE_DB_FILE" ]; then
    echo "ERROR: active database file not found: $ACTIVE_DB_FILE"
    exit 1
fi

DATABASE_URL="$(awk -F= '/^DATABASE_URL=/{sub(/^DATABASE_URL=/,""); print; exit}' "$ENV_FILE" | tr -d '\r')"
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is missing in $ENV_FILE"
    exit 1
fi

if [[ "$DATABASE_URL" != sqlite:////* ]]; then
    echo "ERROR: DATABASE_URL must be an absolute SQLite path in production"
    echo "Current: $DATABASE_URL"
    exit 1
fi

case "$ACTIVE_DB_FILE" in
    "$APP_DIR"/*)
        echo "ERROR: active database is still inside backend deploy directory"
        echo "Active DB: $ACTIVE_DB_FILE"
        exit 1
        ;;
esac

echo "1. Verify active database integrity..."
"$PYTHON_BIN" - "$ACTIVE_DB_FILE" <<'PY'
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
echo "OK: integrity_check = ok"

echo "2. Verify recent compressed backup exists..."
LATEST_BACKUP="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'code_adventure_*.db.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2-)"
if [ -z "${LATEST_BACKUP:-}" ]; then
    echo "ERROR: no compressed database backup found in $BACKUP_DIR"
    echo "Run: bash $SCRIPT_DIR/backup-database.sh"
    exit 1
fi

BACKUP_AGE_HOURS="$(
    LATEST_BACKUP="$LATEST_BACKUP" "$PYTHON_BIN" - <<'PY'
import os
import time

path = os.environ["LATEST_BACKUP"]
age_hours = (time.time() - os.path.getmtime(path)) / 3600
print(f"{age_hours:.2f}")
PY
)"
echo "Latest backup:   $LATEST_BACKUP"
echo "Backup age:      ${BACKUP_AGE_HOURS}h"

BACKUP_TOO_OLD="$(
    BACKUP_AGE_HOURS="$BACKUP_AGE_HOURS" RECENT_BACKUP_HOURS="$RECENT_BACKUP_HOURS" "$PYTHON_BIN" - <<'PY'
import os

age = float(os.environ["BACKUP_AGE_HOURS"])
limit = float(os.environ["RECENT_BACKUP_HOURS"])
print("1" if age > limit else "0")
PY
)"
if [ "$BACKUP_TOO_OLD" = "1" ]; then
    echo "ERROR: latest backup is older than ${RECENT_BACKUP_HOURS} hours"
    echo "Run: bash $SCRIPT_DIR/backup-database.sh"
    exit 1
fi

echo "3. Verify backend package does not contain DB artifacts..."
if [ -f "$ZIP_FILE" ]; then
    DB_HITS="$("$PYTHON_BIN" - "$ZIP_FILE" <<'PY'
import sys
import zipfile

zip_file = sys.argv[1]
hits = []
with zipfile.ZipFile(zip_file) as zf:
    for name in zf.namelist():
        low = name.lower()
        if (
            "code_adventure" in low
            or low.endswith(".db")
            or ".db." in low
            or low.endswith("-wal")
            or low.endswith("-shm")
            or "db_backups" in low
            or "_archive_" in low
        ):
            hits.append(name)

print("\n".join(hits))
PY
)"
    if [ -n "$DB_HITS" ]; then
        echo "ERROR: backend package still contains DB-related files"
        echo "$DB_HITS"
        exit 1
    fi
    echo "OK: backend package contains no DB artifacts"
else
    echo "WARN: backend package not found, zip inspection skipped"
fi

echo "4. Surface stale DB files still sitting in the deploy directory..."
find "$APP_DIR" -maxdepth 1 -type f \( -name 'code_adventure.db' -o -name 'code_adventure.db-*' -o -name 'code_adventure.db.backup*' \) -print 2>/dev/null || true

echo "========================================="
echo "PASS: database safety preflight completed"
echo "========================================="
