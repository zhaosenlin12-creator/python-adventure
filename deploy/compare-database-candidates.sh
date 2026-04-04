#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
DATA_DB_FILE="${DATA_DB_FILE:-/www/data/game-backend/code_adventure.db}"
BACKUP_DIR="${BACKUP_DIR:-/www/backups/game-backend}"
TMP_DIR="$(mktemp -d /tmp/game-db-compare.XXXXXX)"

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

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

declare -a CANDIDATES=()

add_candidate() {
    local path="$1"
    [ -f "$path" ] || return 0

    local existing
    for existing in "${CANDIDATES[@]:-}"; do
        if [ "$existing" = "$path" ]; then
            return 0
        fi
    done
    CANDIDATES+=("$path")
}

add_candidate "$DATA_DB_FILE"
add_candidate "$APP_DIR/code_adventure.db"

shopt -s nullglob
for file in "$APP_DIR"/code_adventure.db.backup.*; do
    add_candidate "$file"
done
for file in "$BACKUP_DIR"/code_adventure_*.db.gz; do
    add_candidate "$file"
done
shopt -u nullglob

if [ "${#CANDIDATES[@]}" -eq 0 ]; then
    echo "ERROR: no database candidates found"
    exit 1
fi

echo "========================================="
echo "Game database candidate comparison"
echo "App dir:     $APP_DIR"
echo "Data DB:     $DATA_DB_FILE"
echo "Backup dir:  $BACKUP_DIR"
echo "Python:      $PYTHON_BIN"
echo "Candidates:  ${#CANDIDATES[@]}"
echo "========================================="

for source_path in "${CANDIDATES[@]}"; do
    inspect_path="$source_path"
    if [[ "$source_path" == *.gz ]]; then
        inspect_path="$TMP_DIR/$(basename "${source_path%.gz}")"
        gzip -dc "$source_path" > "$inspect_path"
    fi

    echo
    echo "-----------------------------------------"
    echo "SOURCE: $source_path"
    if [ "$inspect_path" != "$source_path" ]; then
        echo "INSPECTING_EXTRACTED_COPY: $inspect_path"
    fi
    ls -lh --time-style=long-iso "$source_path"

    "$PYTHON_BIN" - "$source_path" "$inspect_path" <<'PY'
import sqlite3
import sys
from pathlib import Path

source_path = Path(sys.argv[1])
db_path = Path(sys.argv[2])

conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
conn.row_factory = sqlite3.Row

def table_exists(name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None

def scalar(sql: str):
    try:
        row = conn.execute(sql).fetchone()
        return None if row is None else row[0]
    except Exception as exc:
        return f"ERR: {exc}"

def print_metric(name: str, value):
    print(f"{name} = {value}")

try:
    integrity = scalar("PRAGMA integrity_check;")
    quick = scalar("PRAGMA quick_check;")
    page_count = scalar("PRAGMA page_count;")
    freelist_count = scalar("PRAGMA freelist_count;")
    journal_mode = scalar("PRAGMA journal_mode;")

    print_metric("file_size_bytes", source_path.stat().st_size)
    print_metric("file_mtime", source_path.stat().st_mtime)
    print_metric("integrity_check", integrity)
    print_metric("quick_check", quick)
    print_metric("page_count", page_count)
    print_metric("freelist_count", freelist_count)
    print_metric("journal_mode", journal_mode)

    tables = [
        "users",
        "pets",
        "user_progress",
        "coin_transactions",
        "custom_levels",
        "chat_messages",
        "food_inventory",
    ]
    existing_tables = [name for name in tables if table_exists(name)]
    print_metric("tables_present", ",".join(existing_tables) if existing_tables else "NONE")

    if table_exists("users"):
        print_metric("users_count", scalar("SELECT COUNT(*) FROM users"))
        print_metric("max_user_id", scalar("SELECT MAX(id) FROM users"))
        print_metric("latest_user_created_at", scalar("SELECT MAX(created_at) FROM users"))
        print_metric("latest_last_login_date", scalar("SELECT MAX(last_login_date) FROM users"))
    else:
        print_metric("users_count", "NO_TABLE")

    if table_exists("pets"):
        print_metric("pets_count", scalar("SELECT COUNT(*) FROM pets"))
        print_metric("users_with_pets", scalar("SELECT COUNT(DISTINCT user_id) FROM pets"))
        print_metric("max_pet_id", scalar("SELECT MAX(id) FROM pets"))
        print_metric("latest_pet_created_at", scalar("SELECT MAX(created_at) FROM pets"))
        print_metric("latest_pet_updated_at", scalar("SELECT MAX(updated_at) FROM pets"))
        print_metric("eggs_count", scalar("SELECT COUNT(*) FROM pets WHERE is_egg = 1"))
    else:
        print_metric("pets_count", "NO_TABLE")

    if table_exists("user_progress"):
        print_metric("user_progress_count", scalar("SELECT COUNT(*) FROM user_progress"))
        print_metric("latest_user_progress_updated_at", scalar("SELECT MAX(updated_at) FROM user_progress"))
        print_metric("max_coins", scalar("SELECT MAX(coins) FROM user_progress"))
        print_metric("max_experience", scalar("SELECT MAX(experience) FROM user_progress"))
    else:
        print_metric("user_progress_count", "NO_TABLE")

    if table_exists("coin_transactions"):
        print_metric("coin_transactions_count", scalar("SELECT COUNT(*) FROM coin_transactions"))
        print_metric("latest_coin_transaction_at", scalar("SELECT MAX(created_at) FROM coin_transactions"))

    if table_exists("custom_levels"):
        print_metric("custom_levels_count", scalar("SELECT COUNT(*) FROM custom_levels"))
        print_metric("latest_custom_level_updated_at", scalar("SELECT MAX(updated_at) FROM custom_levels"))

    if table_exists("chat_messages"):
        print_metric("chat_messages_count", scalar("SELECT COUNT(*) FROM chat_messages"))
        print_metric("latest_chat_message_at", scalar("SELECT MAX(created_at) FROM chat_messages"))

    if table_exists("food_inventory"):
        print_metric("food_inventory_count", scalar("SELECT COUNT(*) FROM food_inventory"))
        print_metric("latest_food_inventory_updated_at", scalar("SELECT MAX(updated_at) FROM food_inventory"))
finally:
    conn.close()
PY
done

echo
echo "========================================="
echo "DONE: comparison finished"
echo "Rule of thumb:"
echo "1. Prefer integrity_check = ok"
echo "2. Prefer the DB with the newest real business timestamps"
echo "3. Compare users_count / pets_count / users_with_pets together"
echo "4. Do not restore anything until these metrics clearly point to one winner"
echo "========================================="
