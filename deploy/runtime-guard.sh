#!/bin/bash
# ==========================================
# Runtime Intrusion Guard
# - 检测挖矿/可疑文件/暴力扫描
# - 自动杀进程 + 防火墙封禁 IP
# - 适配 game.codebn.cn / 宝塔 / Alibaba Cloud Linux
# ==========================================

# ===== 可改配置（请按实际修改）=====
ADMIN_IPS=("223.77.131.65")     # 你的管理端公网IP（可添加多个）
PANEL_PORT="19980"              # 宝塔面板端口
ACCESS_LOG="/www/wwwlogs/game.codebn.cn.log"
ERROR_LOG="/www/wwwlogs/game.codebn.cn.error.log"

TAIL_LINES=5000                 # 读取最近日志行数
BAN_404_THRESHOLD=120           # 404/403 次数超过该值封禁
BAN_SUS_PATH_THRESHOLD=20       # 命中可疑路径次数超过该值封禁
BAN_LIMIT_REQ_THRESHOLD=50      # 触发限流次数超过该值封禁

LOG_DIR="/www/wwwlogs"
LOG_FILE="$LOG_DIR/runtime-guard.log"
BAN_LOG="$LOG_DIR/runtime-guard-ban.log"

# ===== 内部配置 =====
MINER_REGEX="xmrig|minerd|kdevtmpfsi|kinsing|cryptonight|monero|gulf|cpuminer"
SUS_PATH_REGEX="wp-admin|wp-login|\\.php|\\.env|\\.git|phpmyadmin|cgi-bin|/actuator|\\.sql|\\.bak|\\.zip|\\.tar\\.gz|\\.rar|\\.7z"

RELOAD_FIREWALL=0

mkdir -p "$LOG_DIR"
touch "$LOG_FILE" "$BAN_LOG"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

is_whitelisted() {
  local ip="$1"
  for w in "${ADMIN_IPS[@]}" "127.0.0.1" "::1"; do
    [ "$ip" = "$w" ] && return 0
  done
  return 1
}

is_private_ip() {
  local ip="$1"
  [[ "$ip" =~ ^127\. ]] && return 0
  [[ "$ip" =~ ^10\. ]] && return 0
  [[ "$ip" =~ ^192\.168\. ]] && return 0
  [[ "$ip" =~ ^172\.(1[6-9]|2[0-9]|3[0-1])\. ]] && return 0
  [[ "$ip" =~ ^0\. ]] && return 0
  [[ "$ip" =~ ^::1$ ]] && return 0
  [[ "$ip" =~ ^fe80: ]] && return 0
  [[ "$ip" =~ ^fc00: ]] && return 0
  return 1
}

ban_ip() {
  local ip="$1"
  local reason="$2"
  [ -z "$ip" ] && return 0
  is_whitelisted "$ip" && return 0
  is_private_ip "$ip" && return 0

  if ! command -v firewall-cmd >/dev/null 2>&1; then
    log "⚠️ firewall-cmd 未找到，无法封禁 $ip"
    return 1
  fi

  if firewall-cmd --list-rich-rules | grep -q "source address=\"$ip\""; then
    return 0
  fi

  firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$ip\" reject" >/dev/null 2>&1
  RELOAD_FIREWALL=1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] BAN $ip ($reason)" >> "$BAN_LOG"
  log "🚫 封禁IP: $ip （$reason）"
}

get_remote_ips_by_pid() {
  local pid="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tnp 2>/dev/null | grep "pid=$pid," | awk '{print $5}' | \
      sed 's/\\[//;s/\\]//' | awk -F':' '{print $1}' | sed 's/::ffff://' | sort -u
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tnp 2>/dev/null | grep "/$pid" | awk '{print $5}' | awk -F':' '{print $1}' | sort -u
  fi
}

log "===== Runtime Guard Start ====="

# 1) 挖矿进程检测与清理
MINERS=$(ps aux | grep -iE "$MINER_REGEX" | grep -v grep || true)
if [ -n "$MINERS" ]; then
  log "⚠️ 发现疑似挖矿进程"
  echo "$MINERS" | tee -a "$LOG_FILE"
  echo "$MINERS" | awk '{print $2}' | while read -r pid; do
    [ -z "$pid" ] && continue
    for ip in $(get_remote_ips_by_pid "$pid"); do
      ban_ip "$ip" "miner-pid-$pid"
    done
    kill -9 "$pid" 2>/dev/null
  done
  log "✅ 已尝试清理挖矿进程"
else
  log "✅ 未发现挖矿进程"
fi

# 2) /dev/shm 和 /tmp 可疑可执行文件
SUS_SHM=$(find /dev/shm -maxdepth 2 -type f -executable 2>/dev/null)
SUS_TMP=$(find /tmp -maxdepth 2 -type f -executable 2>/dev/null)

if [ -n "$SUS_SHM" ] || [ -n "$SUS_TMP" ]; then
  log "⚠️ 发现可疑可执行文件，已清理"
  if [ -n "$SUS_SHM" ]; then
    echo "$SUS_SHM" | tee -a "$LOG_FILE"
    echo "$SUS_SHM" | while read -r f; do [ -f "$f" ] && rm -f "$f"; done
  fi
  if [ -n "$SUS_TMP" ]; then
    echo "$SUS_TMP" | tee -a "$LOG_FILE"
    echo "$SUS_TMP" | while read -r f; do [ -f "$f" ] && rm -f "$f"; done
  fi
else
  log "✅ /dev/shm 与 /tmp 正常"
fi

# 3) 可疑计划任务
SUS_CRON=$(crontab -l 2>/dev/null | grep -iE "curl|wget|/tmp|/dev/shm|kdevtmpfsi|kinsing|xmrig" || true)
if [ -n "$SUS_CRON" ]; then
  log "⚠️ 发现可疑 crontab，已清理"
  echo "$SUS_CRON" | tee -a "$LOG_FILE"
  crontab -l 2>/dev/null | grep -viE "curl|wget|/tmp|/dev/shm|kdevtmpfsi|kinsing|xmrig" | crontab -
else
  log "✅ crontab 正常"
fi

# 4) 访问日志扫描（暴力扫描/探测）
if [ -f "$ACCESS_LOG" ]; then
  tail -n "$TAIL_LINES" "$ACCESS_LOG" | \
  awk -v err_th="$BAN_404_THRESHOLD" -v sus_th="$BAN_SUS_PATH_THRESHOLD" -v re="$SUS_PATH_REGEX" '
    {
      ip=$1; status=$9; path=$7;
      if (status==404 || status==403) err[ip]++;
      if (path ~ re) sus[ip]++;
    }
    END {
      for (i in err) if (err[i] >= err_th) print "ERR", err[i], i;
      for (i in sus) if (sus[i] >= sus_th) print "SUS", sus[i], i;
    }' | \
  while read -r type cnt ip; do
    [ -z "$ip" ] && continue
    ban_ip "$ip" "nginx-$type-$cnt"
  done
else
  log "⚠️ 未找到访问日志: $ACCESS_LOG"
fi

# 5) 限流日志扫描（可选）
if [ -f "$ERROR_LOG" ]; then
  tail -n 2000 "$ERROR_LOG" | grep "limiting requests" | \
    awk -F'client: ' '{print $2}' | awk -F',' '{print $1}' | \
    sort | uniq -c | awk -v th="$BAN_LIMIT_REQ_THRESHOLD" '$1>=th {print $2, $1}' | \
    while read -r ip cnt; do
      ban_ip "$ip" "limit-req-$cnt"
    done
fi

# 6) 应用端口监听异常提示（只记录）
if command -v ss >/dev/null 2>&1; then
  LISTEN=$(ss -tlnp | grep -vE "127\\.0\\.0\\.1|::1" | awk '{print $4,$7}')
  log "🔎 监听端口摘要："
  echo "$LISTEN" | tee -a "$LOG_FILE"
fi

# 防火墙重载
if [ "$RELOAD_FIREWALL" -eq 1 ]; then
  firewall-cmd --reload >/dev/null 2>&1
  log "✅ 防火墙已重载"
fi

log "===== Runtime Guard End ====="
exit 0
