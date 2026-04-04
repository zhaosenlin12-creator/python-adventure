#!/bin/bash
set -euo pipefail

KEEP_DEPLOY_ZIPS="${KEEP_DEPLOY_ZIPS:-2}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-7}"
TMP_RETENTION_DAYS="${TMP_RETENTION_DAYS:-3}"
JOURNAL_LIMIT="${JOURNAL_LIMIT:-200M}"
WITH_PACKAGE_CACHES=0

if [ "${1:-}" = "--with-package-caches" ]; then
  WITH_PACKAGE_CACHES=1
fi

section() {
  printf '\n== %s ==\n' "$1"
}

prune_archives() {
  local dir="$1"
  [ -d "$dir" ] || return 0

  mapfile -t files < <(find "$dir" -maxdepth 1 -type f \( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \) \
    -printf '%T@\t%p\n' 2>/dev/null | sort -nr | awk -F '\t' '{print $2}')

  if [ "${#files[@]}" -le "$KEEP_DEPLOY_ZIPS" ]; then
    return 0
  fi

  for file in "${files[@]:$KEEP_DEPLOY_ZIPS}"; do
    echo "remove archive: $file"
    rm -f -- "$file"
  done
}

section "before"
df -h /

section "pm2 logs"
if command -v pm2 >/dev/null 2>&1; then
  pm2 flush || true
  find ~/.pm2/logs -type f -mtime +"$LOG_RETENTION_DAYS" -print -delete 2>/dev/null || true
else
  echo "pm2 not installed"
fi

section "site logs"
find /www/wwwlogs -type f -mtime +"$LOG_RETENTION_DAYS" -print -delete 2>/dev/null || true
find /var/log -type f \( -name '*.log.*' -o -name '*.gz' -o -name '*.old' \) -mtime +"$LOG_RETENTION_DAYS" -print -delete 2>/dev/null || true

section "journald"
journalctl --vacuum-size="$JOURNAL_LIMIT" 2>/dev/null || echo "journalctl not available"

section "frontend cache"
rm -rf /www/wwwroot/game/.next/cache 2>/dev/null || true
rm -rf /www/wwwroot/game/.next/dev 2>/dev/null || true

section "python cache"
find /www/wwwroot/game-backend -type d -name '__pycache__' -prune -print -exec rm -rf {} + 2>/dev/null || true
find /www/wwwroot/game-backend -type f -name '*.pyc' -print -delete 2>/dev/null || true

section "tmp"
find /tmp /var/tmp -xdev -type f -mtime +"$TMP_RETENTION_DAYS" -print -delete 2>/dev/null || true

section "old deployment archives"
prune_archives /www/wwwroot/game
prune_archives /www/wwwroot/game-backend

section "optional package caches"
if [ "$WITH_PACKAGE_CACHES" -eq 1 ]; then
  dnf clean all 2>/dev/null || yum clean all 2>/dev/null || true
  pip cache purge 2>/dev/null || true
  npm cache clean --force 2>/dev/null || true
else
  echo "skip package caches (pass --with-package-caches to enable)"
fi

section "after"
df -h /
