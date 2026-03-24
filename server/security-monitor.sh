#!/bin/bash
#===============================================================================
# 增强版服务器安全监控脚本
# 版本: 2.0.0
# 更新日期: 2026-02-02
# 功能: 实时检测挖矿木马、可疑连接、自动封锁、告警通知
#===============================================================================

set -o pipefail

#-------------------------------------------------------------------------------
# 配置区域 - 请根据实际情况修改
#-------------------------------------------------------------------------------
# 告警配置 (支持企业微信/钉钉/Telegram)
ALERT_ENABLED=true
WEBHOOK_URL=""  # 企业微信机器人 webhook 或钉钉 webhook
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# 日志配置
LOG_DIR="/var/log/security-monitor"
LOG_FILE="$LOG_DIR/monitor.log"
ALERT_LOG="$LOG_DIR/alerts.log"
BLOCKED_IPS_FILE="$LOG_DIR/blocked_ips.txt"

# 自动封锁配置
AUTO_BLOCK_ENABLED=true
AUTO_KILL_ENABLED=true

# 检测间隔 (秒)
CHECK_INTERVAL=60

# 白名单配置
WHITELIST_PROCESSES="nginx|mysql|php-fpm|node|python|pm2|docker|sshd|crond|rsyslogd|systemd"
WHITELIST_IPS="127.0.0.1|100.100.|172.26.|10.0."
WHITELIST_PORTS="22|80|443|3306|8080|8081|19980"

#-------------------------------------------------------------------------------
# 已知恶意特征库
#-------------------------------------------------------------------------------
# 挖矿进程关键词
MINER_KEYWORDS="xmrig|xmr-stak|minerd|cpuminer|cgminer|bfgminer|ethminer|claymore|phoenixminer|t-rex|nbminer|gminer|lolminer|teamredminer|cryptonight|monero|stratum|nicehash|f2pool|antpool|poolin|viabtc|systemwatcher|kworkerds|kdevtmpfsi|solrd|dbused|sysupdate|networkservice|watchdogs"

# 已知矿池 IP 和域名
KNOWN_MINING_POOLS=(
    "144.168.36.74"
    "178.128.242.134"
    "pool.minexmr.com"
    "pool.supportxmr.com"
    "xmr.pool.minergate.com"
    "monerohash.com"
    "xmrpool.eu"
    "gulf.moneroocean.stream"
    "stratum+tcp://"
    "stratum+ssl://"
)

# 可疑端口 (常见矿池端口)
SUSPICIOUS_PORTS="3333|4444|5555|7777|8888|9999|14433|14444|45700"

# 可疑目录
SUSPICIOUS_DIRS="/tmp/.* /var/tmp/.* /dev/shm/.* /root/.* /home/.*/.cache /home/.*/.local/share"

#-------------------------------------------------------------------------------
# 工具函数
#-------------------------------------------------------------------------------
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_alert() {
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [ALERT] $message" | tee -a "$ALERT_LOG"
}

send_alert() {
    local title="$1"
    local content="$2"
    local level="${3:-warning}"  # info, warning, critical
    
    if [ "$ALERT_ENABLED" != "true" ]; then
        return
    fi
    
    local hostname=$(hostname)
    local ip=$(hostname -I | awk '{print $1}')
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 记录告警日志
    log_alert "$title: $content"
    
    # 企业微信/钉钉 Webhook
    if [ -n "$WEBHOOK_URL" ]; then
        local color="warning"
        [ "$level" = "critical" ] && color="red"
        [ "$level" = "info" ] && color="info"
        
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"msgtype\": \"markdown\",
                \"markdown\": {
                    \"content\": \"## 🚨 服务器安全告警\n> **级别**: <font color=\\\"$color\\\">$level</font>\n> **主机**: $hostname ($ip)\n> **时间**: $timestamp\n> **事件**: $title\n> **详情**: $content\"
                }
            }" > /dev/null 2>&1
    fi
    
    # Telegram
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        local message="🚨 *服务器安全告警*%0A级别: $level%0A主机: $hostname ($ip)%0A时间: $timestamp%0A事件: $title%0A详情: $content"
        curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage?chat_id=$TELEGRAM_CHAT_ID&text=$message&parse_mode=Markdown" > /dev/null 2>&1
    fi
}

block_ip() {
    local ip=$1
    local reason="$2"
    
    # 检查是否已封锁
    if iptables -L OUTPUT -n | grep -q "$ip"; then
        log "INFO" "IP $ip 已在封锁列表中"
        return
    fi
    
    # 检查白名单
    if echo "$ip" | grep -qE "$WHITELIST_IPS"; then
        log "INFO" "IP $ip 在白名单中，跳过封锁"
        return
    fi
    
    if [ "$AUTO_BLOCK_ENABLED" = "true" ]; then
        iptables -I OUTPUT -d "$ip" -j DROP
        iptables -I INPUT -s "$ip" -j DROP
        echo "$(date '+%Y-%m-%d %H:%M:%S') $ip $reason" >> "$BLOCKED_IPS_FILE"
        log "WARN" "已封锁 IP: $ip (原因: $reason)"
        send_alert "IP 已封锁" "已自动封锁 IP $ip，原因: $reason" "warning"
    else
        log "WARN" "检测到可疑 IP: $ip (原因: $reason)，自动封锁已禁用"
        send_alert "可疑 IP" "检测到可疑 IP $ip，原因: $reason，请手动处理" "warning"
    fi
}

kill_process() {
    local pid=$1
    local reason="$2"
    
    if [ "$AUTO_KILL_ENABLED" = "true" ]; then
        local proc_info=$(ps -p $pid -o pid,user,cmd --no-headers 2>/dev/null)
        if [ -n "$proc_info" ]; then
            kill -9 $pid 2>/dev/null
            log "WARN" "已终止进程: $proc_info (原因: $reason)"
            send_alert "进程已终止" "已自动终止进程 PID=$pid，原因: $reason\n进程信息: $proc_info" "critical"
        fi
    else
        log "WARN" "检测到可疑进程 PID=$pid (原因: $reason)，自动终止已禁用"
        send_alert "可疑进程" "检测到可疑进程 PID=$pid，原因: $reason，请手动处理" "warning"
    fi
}

#-------------------------------------------------------------------------------
# 检测函数
#-------------------------------------------------------------------------------

# 检测挖矿进程
check_mining_processes() {
    log "INFO" "检查挖矿进程..."
    
    local found=0
    
    # 方法1: 通过进程名检测
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local pid=$(echo "$line" | awk '{print $2}')
            local cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
            
            # 跳过白名单进程
            if echo "$cmd" | grep -qE "$WHITELIST_PROCESSES"; then
                continue
            fi
            
            # 检测挖矿关键词
            if echo "$cmd" | grep -qiE "$MINER_KEYWORDS"; then
                log "ALERT" "发现可疑挖矿进程: PID=$pid CMD=$cmd"
                kill_process $pid "匹配挖矿进程特征"
                found=1
            fi
        fi
    done < <(ps aux 2>/dev/null)
    
    # 方法2: 通过 CPU 使用率检测 (高 CPU 且非白名单)
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local pid=$(echo "$line" | awk '{print $1}')
            local cpu=$(echo "$line" | awk '{print $2}' | cut -d. -f1)
            local cmd=$(echo "$line" | awk '{for(i=3;i<=NF;i++) printf $i" "; print ""}')
            
            # CPU > 80% 且不在白名单中
            if [ "$cpu" -gt 80 ] && ! echo "$cmd" | grep -qE "$WHITELIST_PROCESSES"; then
                # 检查是否是合法进程
                local exe_path=$(readlink -f /proc/$pid/exe 2>/dev/null)
                if [ -n "$exe_path" ]; then
                    # 检查是否在可疑目录
                    if echo "$exe_path" | grep -qE "^/tmp|^/var/tmp|^/dev/shm|/\."; then
                        log "ALERT" "发现高 CPU 可疑进程: PID=$pid CPU=$cpu% CMD=$cmd EXE=$exe_path"
                        kill_process $pid "高CPU+可疑路径"
                        found=1
                    fi
                fi
            fi
        fi
    done < <(ps -eo pid,%cpu,cmd --sort=-%cpu 2>/dev/null | head -20)
    
    if [ $found -eq 0 ]; then
        log "INFO" "未发现挖矿进程"
    fi
    
    return $found
}

# 检测可疑网络连接
check_network_connections() {
    log "INFO" "检查网络连接..."
    
    local found=0
    
    # 检查出站连接
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local state=$(echo "$line" | awk '{print $1}')
            local remote=$(echo "$line" | awk '{print $5}')
            local process=$(echo "$line" | awk '{print $6}')
            local remote_ip=$(echo "$remote" | cut -d: -f1)
            local remote_port=$(echo "$remote" | cut -d: -f2)
            
            # 跳过白名单 IP
            if echo "$remote_ip" | grep -qE "$WHITELIST_IPS"; then
                continue
            fi
            
            # 检查是否连接到已知矿池
            for pool in "${KNOWN_MINING_POOLS[@]}"; do
                if echo "$remote_ip" | grep -q "$pool"; then
                    log "ALERT" "发现连接到已知矿池: $remote ($process)"
                    block_ip "$remote_ip" "连接到已知矿池"
                    found=1
                fi
            done
            
            # 检查可疑端口
            if echo "$remote_port" | grep -qE "$SUSPICIOUS_PORTS"; then
                log "WARN" "发现连接到可疑端口: $remote ($process)"
                # 获取进程详情再决定是否封锁
                local pid=$(echo "$process" | grep -oP 'pid=\K\d+')
                if [ -n "$pid" ]; then
                    local exe=$(readlink -f /proc/$pid/exe 2>/dev/null)
                    if echo "$exe" | grep -qE "^/tmp|^/var/tmp|/\."; then
                        block_ip "$remote_ip" "可疑端口+可疑进程"
                        found=1
                    fi
                fi
            fi
        fi
    done < <(ss -tnp 2>/dev/null | grep -v "127.0.0.1")
    
    if [ $found -eq 0 ]; then
        log "INFO" "未发现可疑网络连接"
    fi
    
    return $found
}

# 检测可疑文件
check_suspicious_files() {
    log "INFO" "检查可疑文件..."
    
    local found=0
    
    # 检查 /tmp 等目录下的隐藏可执行文件
    while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            local basename=$(basename "$file")
            
            # 检查是否匹配挖矿关键词
            if echo "$basename" | grep -qiE "$MINER_KEYWORDS"; then
                log "ALERT" "发现可疑文件: $file"
                send_alert "可疑文件" "发现可疑文件: $file" "warning"
                
                # 删除恶意文件
                if [ "$AUTO_KILL_ENABLED" = "true" ]; then
                    rm -f "$file" 2>/dev/null
                    log "WARN" "已删除可疑文件: $file"
                fi
                found=1
            fi
            
            # 检查隐藏目录中的可执行文件
            if echo "$file" | grep -qE "/\.[^/]+/" && [ -x "$file" ]; then
                local file_type=$(file -b "$file" 2>/dev/null)
                if echo "$file_type" | grep -qiE "executable|ELF"; then
                    log "ALERT" "发现隐藏目录中的可执行文件: $file ($file_type)"
                    send_alert "可疑文件" "发现隐藏目录中的可执行文件: $file" "warning"
                    found=1
                fi
            fi
        fi
    done < <(find /tmp /var/tmp /dev/shm -type f 2>/dev/null)
    
    # 检查最近修改的可疑配置文件
    while IFS= read -r file; do
        if [ -n "$file" ] && echo "$file" | grep -qE "config\.json|\.conf$"; then
            if grep -qiE "pool|stratum|wallet|mining" "$file" 2>/dev/null; then
                log "ALERT" "发现可疑配置文件: $file"
                send_alert "可疑配置" "发现可疑配置文件: $file，可能包含挖矿配置" "warning"
                found=1
            fi
        fi
    done < <(find /tmp /var/tmp /dev/shm /root -name "*.json" -o -name "*.conf" -mtime -1 2>/dev/null)
    
    if [ $found -eq 0 ]; then
        log "INFO" "未发现可疑文件"
    fi
    
    return $found
}

# 检测 crontab 变化
check_crontab() {
    log "INFO" "检查 crontab..."
    
    local found=0
    local cron_backup="$LOG_DIR/crontab_backup.txt"
    local current_cron=$(mktemp)
    
    # 获取当前 crontab
    {
        crontab -l 2>/dev/null
        for user in $(cut -d: -f1 /etc/passwd); do
            crontab -u $user -l 2>/dev/null
        done
        cat /etc/crontab 2>/dev/null
        cat /etc/cron.d/* 2>/dev/null
    } > "$current_cron"
    
    # 检查可疑内容
    if grep -qiE "$MINER_KEYWORDS|curl.*\|.*sh|wget.*\|.*sh|/tmp/|/var/tmp/" "$current_cron"; then
        log "ALERT" "crontab 中发现可疑内容"
        send_alert "可疑定时任务" "crontab 中发现可疑内容，请检查" "warning"
        found=1
    fi
    
    # 检查是否有变化
    if [ -f "$cron_backup" ]; then
        if ! diff -q "$cron_backup" "$current_cron" > /dev/null 2>&1; then
            log "WARN" "crontab 内容已变化"
            diff "$cron_backup" "$current_cron" >> "$LOG_FILE"
            send_alert "Crontab 变化" "crontab 内容已变化，请检查" "info"
        fi
    fi
    
    # 更新备份
    cp "$current_cron" "$cron_backup"
    rm -f "$current_cron"
    
    return $found
}

# 检测宝塔面板插件
check_bt_plugins() {
    log "INFO" "检查宝塔面板插件..."
    
    local bt_plugin_dir="/www/server/panel/plugin"
    local found=0
    
    if [ -d "$bt_plugin_dir" ]; then
        # 检查可疑插件
        local suspicious_plugins="jumpserver webssh terminal"
        for plugin in $suspicious_plugins; do
            if [ -d "$bt_plugin_dir/$plugin" ]; then
                local mtime=$(stat -c %Y "$bt_plugin_dir/$plugin" 2>/dev/null)
                local mtime_human=$(date -d @$mtime '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
                log "WARN" "发现高风险插件: $plugin (最后修改: $mtime_human)"
                send_alert "高风险插件" "发现高风险宝塔插件: $plugin，建议删除" "warning"
                found=1
            fi
        done
        
        # 检查最近修改的插件
        while IFS= read -r plugin_dir; do
            if [ -n "$plugin_dir" ]; then
                local plugin_name=$(basename "$plugin_dir")
                log "WARN" "插件最近被修改: $plugin_name"
            fi
        done < <(find "$bt_plugin_dir" -maxdepth 1 -type d -mtime -1 2>/dev/null | tail -n +2)
    fi
    
    return $found
}

# 检测系统登录
check_logins() {
    log "INFO" "检查系统登录..."
    
    local found=0
    
    # 检查失败登录
    local failed_count=$(lastb 2>/dev/null | wc -l)
    if [ "$failed_count" -gt 100 ]; then
        log "WARN" "检测到大量失败登录尝试: $failed_count 次"
        send_alert "暴力破解" "检测到 $failed_count 次失败登录尝试，可能正在遭受暴力破解" "warning"
        found=1
    fi
    
    # 检查异常登录来源
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            local ip=$(echo "$line" | awk '{print $3}')
            # 检查是否是异常 IP（不是本地或内网）
            if [ -n "$ip" ] && ! echo "$ip" | grep -qE "^127\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\."; then
                log "INFO" "登录记录: $line"
            fi
        fi
    done < <(last -n 20 2>/dev/null)
    
    return $found
}

#-------------------------------------------------------------------------------
# 主函数
#-------------------------------------------------------------------------------

init() {
    # 创建日志目录
    mkdir -p "$LOG_DIR"
    touch "$LOG_FILE" "$ALERT_LOG" "$BLOCKED_IPS_FILE"
    
    log "INFO" "安全监控脚本启动 (版本 2.0.0)"
    log "INFO" "自动封锁: $AUTO_BLOCK_ENABLED, 自动终止: $AUTO_KILL_ENABLED"
}

run_checks() {
    local total_issues=0
    
    check_mining_processes && ((total_issues++))
    check_network_connections && ((total_issues++))
    check_suspicious_files && ((total_issues++))
    check_crontab && ((total_issues++))
    check_bt_plugins && ((total_issues++))
    check_logins && ((total_issues++))
    
    if [ $total_issues -gt 0 ]; then
        log "WARN" "本次检查发现 $total_issues 类问题"
    else
        log "INFO" "本次检查未发现安全问题"
    fi
}

# 守护模式运行
daemon_mode() {
    log "INFO" "进入守护模式，检测间隔: ${CHECK_INTERVAL}秒"
    
    while true; do
        run_checks
        sleep $CHECK_INTERVAL
    done
}

# 单次运行
single_run() {
    run_checks
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -d, --daemon     守护模式运行（持续监控）"
    echo "  -s, --single     单次运行检查"
    echo "  -c, --config     显示当前配置"
    echo "  -h, --help       显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 -s            # 单次安全检查"
    echo "  $0 -d            # 后台持续监控"
    echo "  nohup $0 -d &    # 后台运行"
}

show_config() {
    echo "当前配置:"
    echo "  告警启用: $ALERT_ENABLED"
    echo "  自动封锁: $AUTO_BLOCK_ENABLED"
    echo "  自动终止: $AUTO_KILL_ENABLED"
    echo "  检测间隔: ${CHECK_INTERVAL}秒"
    echo "  日志目录: $LOG_DIR"
    echo "  Webhook: ${WEBHOOK_URL:-未配置}"
}

# 入口
main() {
    init
    
    case "${1:-}" in
        -d|--daemon)
            daemon_mode
            ;;
        -s|--single|"")
            single_run
            ;;
        -c|--config)
            show_config
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
