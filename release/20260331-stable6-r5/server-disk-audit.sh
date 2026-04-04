#!/bin/bash
set -euo pipefail

section() {
  printf '\n== %s ==\n' "$1"
}

human_top_files() {
  local target="$1"
  local limit="${2:-20}"
  [ -d "$target" ] || return 0

  printf '\n-- largest files under %s --\n' "$target"
  find "$target" -xdev -type f -printf '%s\t%TY-%Tm-%Td %TH:%TM\t%p\n' 2>/dev/null \
    | sort -nr \
    | head -n "$limit" \
    | awk '{
        size=$1;
        units[0]="B"; units[1]="K"; units[2]="M"; units[3]="G"; units[4]="T";
        idx=0;
        while (size >= 1024 && idx < 4) { size=size/1024; idx++ }
        printf "%8.1f%s  %s  %s\n", size, units[idx], $2, $3
      }'
}

section "filesystem"
df -hT

section "inode usage"
df -ih

section "top-level size summary"
for dir in / /www /www/server /var/log /tmp /var/tmp /root; do
  [ -d "$dir" ] || continue
  printf '\n-- %s --\n' "$dir"
  du -xh --max-depth=1 "$dir" 2>/dev/null | sort -h
done

section "journald"
journalctl --disk-usage 2>/dev/null || echo "journalctl not available"

section "pm2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list || true
  du -sh ~/.pm2 ~/.pm2/logs 2>/dev/null || true
else
  echo "pm2 not installed"
fi

section "application hot spots"
human_top_files /www/wwwroot/game 20
human_top_files /www/wwwroot/game-backend 20
human_top_files /www/wwwlogs 20
human_top_files /var/log 20

section "deployment archives"
find /www/wwwroot/game /www/wwwroot/game-backend -maxdepth 1 -type f \
  \( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \) -printf '%TY-%Tm-%Td %TH:%TM\t%s\t%p\n' 2>/dev/null \
  | sort -r || true

section "docker"
if command -v docker >/dev/null 2>&1; then
  docker system df || true
else
  echo "docker not installed"
fi

section "recommended next step"
if command -v ncdu >/dev/null 2>&1; then
  echo "Run: ncdu -x /www"
else
  echo "Install ncdu, then run: ncdu -x /www"
fi
