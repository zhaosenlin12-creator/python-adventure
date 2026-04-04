#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game-backend}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
DEFAULT_DB_FILE="${DEFAULT_DB_FILE:-$APP_DIR/code_adventure.db}"

if [ ! -f "$ENV_FILE" ]; then
    printf '%s\n' "$DEFAULT_DB_FILE"
    exit 0
fi

DATABASE_URL="$(awk -F= '/^DATABASE_URL=/{sub(/^DATABASE_URL=/,""); print; exit}' "$ENV_FILE" | tr -d '\r')"

if [ -z "$DATABASE_URL" ]; then
    printf '%s\n' "$DEFAULT_DB_FILE"
    exit 0
fi

case "$DATABASE_URL" in
    sqlite:///*)
        DB_PATH="${DATABASE_URL#sqlite:///}"
        if [ "$DB_PATH" = ":memory:" ]; then
            printf '%s\n' "$DEFAULT_DB_FILE"
            exit 0
        fi

        case "$DB_PATH" in
            /*)
                printf '%s\n' "$DB_PATH"
                ;;
            *)
                printf '%s\n' "$APP_DIR/${DB_PATH#./}"
                ;;
        esac
        ;;
    *)
        printf '%s\n' "$DEFAULT_DB_FILE"
        ;;
esac
