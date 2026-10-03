#!/bin/bash
# Run after game-deploy.zip has been uploaded and extracted on the server.
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/game}"
OWNER_USER="${OWNER_USER:-game}"
OWNER_GROUP="${OWNER_GROUP:-game}"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"
PORT="${PORT:-3003}"

IS_ROOT=0
if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    IS_ROOT=1
fi

run_as_owner() {
    local cmd="$1"
    if [ "$IS_ROOT" -eq 1 ]; then
        su -s /bin/bash - "$OWNER_USER" -c "export PATH=$PM2_PATH:\$PATH && $cmd"
    else
        export PATH="$PM2_PATH:$PATH"
        eval "$cmd"
    fi
}

cd "$APP_DIR"
export PATH="$PM2_PATH:$PATH"

echo "========================================="
echo "Post-upload frontend deploy"
echo "App dir: $APP_DIR"
echo "User:    $(whoami)"
echo "Port:    $PORT"
echo "========================================="

RELEASE_MARKER_FILE="$APP_DIR/deploy/FRONTEND_RELEASE.txt"
if [ ! -f "$RELEASE_MARKER_FILE" ]; then
    echo "ERROR: missing $RELEASE_MARKER_FILE"
    echo "Upload the latest game-deploy.zip before running this script."
    exit 1
fi
RELEASE_MARKER="$(tr -d '\r\n' < "$RELEASE_MARKER_FILE")"
echo "Release: $RELEASE_MARKER"

RUNTIME_SIGNATURE_FILE="$APP_DIR/deploy/FRONTEND_RUNTIME_SIGNATURE.txt"
if [ ! -f "$RUNTIME_SIGNATURE_FILE" ]; then
    echo "ERROR: missing $RUNTIME_SIGNATURE_FILE"
    echo "Upload the latest game-deploy.zip before running this script."
    exit 1
fi
RUNTIME_SIGNATURE="$(tr -d '\r\n' < "$RUNTIME_SIGNATURE_FILE")"
if [ -z "$RUNTIME_SIGNATURE" ]; then
    echo "ERROR: runtime signature is empty"
    exit 1
fi
echo "Runtime signature: $RUNTIME_SIGNATURE"

if [ ! -f package.json ]; then
    echo "ERROR: missing package.json in $APP_DIR"
    exit 1
fi

if [ "$IS_ROOT" -eq 1 ]; then
    mkdir -p /www/wwwlogs /www/server/nginx/proxy_cache_dir
    chown -R "$OWNER_USER:$OWNER_GROUP" "$APP_DIR"
    chmod -R u+rwX,go+rX "$APP_DIR/.next"
fi

run_as_owner "cd '$APP_DIR' && npm ci --omit=dev --no-audit --no-fund"
run_as_owner "cd '$APP_DIR' && rm -f public/sounds/bgm_battle.wav public/sounds/bgm_boss.wav public/sounds/bgm_victory.wav"
run_as_owner "cd '$APP_DIR' && rm -rf .next/cache .next/dev 2>/dev/null || true"

if ! run_as_owner "cd '$APP_DIR' && test -r .next/BUILD_ID && test -x .next && test -x .next/static"; then
    echo "ERROR: the game user cannot read or enter the extracted .next runtime."
    echo "Run this script as root so it can repair ownership and permissions, then start the app as game."
    exit 1
fi

run_as_owner "pm2 delete game >/dev/null 2>&1 || true"
run_as_owner "cd '$APP_DIR' && pm2 start npm --name game --max-memory-restart 512M -- start -- -p $PORT"
run_as_owner "pm2 save"

release_info=""
for attempt in $(seq 1 45); do
    release_info="$(curl -fsS --max-time 5 "http://127.0.0.1:$PORT/build-info.json?release=$RELEASE_MARKER" 2>/dev/null || true)"
    if printf '%s' "$release_info" | grep -Fq "\"release\":\"$RELEASE_MARKER\""; then
        break
    fi
    sleep 1
done

if ! printf '%s' "$release_info" | grep -Fq "\"release\":\"$RELEASE_MARKER\""; then
    echo "ERROR: local app did not serve the expected release marker"
    echo "Last local response:"
    printf '%s\n' "${release_info:-<empty>}"
    echo "PM2 describe:"
    run_as_owner "pm2 describe game || true"
    echo "PM2 logs:"
    run_as_owner "pm2 logs game --lines 80 --nostream || true"
    exit 1
fi

extract_chunk_names() {
    printf '%s' "$1" |
        grep -oE '(/_next/)?static/chunks/[A-Za-z0-9_-]+\.js' |
        sed 's#^.*/##' |
        sort -u
}

verify_runtime_signature() {
    local page_html=""
    local chunk_queue=""
    local next_queue=""
    local seen_chunks=""
    local chunk=""
    local chunk_body=""
    local nested_chunk=""
    local nested_chunks=""
    local pass=0

    page_html="$(curl -fsS --max-time 10 "http://127.0.0.1:$PORT/world?release=$RELEASE_MARKER")"
    chunk_queue="$(extract_chunk_names "$page_html")"

    for pass in 1 2 3; do
        next_queue=""
        for chunk in $chunk_queue; do
            case " $seen_chunks " in
                *" $chunk "*) continue ;;
            esac

            seen_chunks="$seen_chunks $chunk"
            chunk_body="$(curl -fsS --max-time 10 "http://127.0.0.1:$PORT/_next/static/chunks/$chunk")"
            if printf '%s' "$chunk_body" | grep -Fq "$RUNTIME_SIGNATURE"; then
                return 0
            fi

            nested_chunks="$(extract_chunk_names "$chunk_body")"
            for nested_chunk in $nested_chunks; do
                case " $seen_chunks $next_queue " in
                    *" $nested_chunk "*) continue ;;
                esac
                next_queue="$next_queue $nested_chunk"
            done
        done
        chunk_queue="$next_queue"
    done

    echo "ERROR: active /world runtime does not contain $RUNTIME_SIGNATURE"
    echo "The release marker is current, but the served Next.js chunk graph is stale or mixed."
    echo "As root, remove the old .next directory, extract the package again, chown it to game, then rerun this script."
    return 1
}

if ! verify_runtime_signature; then
    echo "PM2 describe:"
    run_as_owner "pm2 describe game || true"
    echo "PM2 logs:"
    run_as_owner "pm2 logs game --lines 80 --nostream || true"
    exit 1
fi

if [ "$IS_ROOT" -eq 1 ]; then
    rm -f "$APP_DIR/deploy.sh" "$APP_DIR/deploy-secure-frontend.sh" "$APP_DIR/ecosystem.config.js" 2>/dev/null || true

    if [ -d /www/server/nginx/proxy_cache_dir ]; then
        rm -rf /www/server/nginx/proxy_cache_dir/*
    fi

    if command -v /etc/init.d/nginx >/dev/null 2>&1; then
        /etc/init.d/nginx reload || true
    elif command -v systemctl >/dev/null 2>&1; then
        systemctl reload nginx || true
    fi
else
    echo "WARNING: running as $(whoami); Nginx cache cleanup and reload were not available"
fi

echo "========================================="
echo "DONE: frontend post-upload deploy finished"
echo "========================================="
