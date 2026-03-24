#!/bin/bash
#===============================================================================
# 应急响应脚本
# 用途: 发现入侵时快速执行清理和加固操作
# 用法: bash emergency-response.sh [--auto]
#===============================================================================

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

REPORT_FILE="/tmp/emergency-response-$(date +%Y%m%d_%H%M%S).log"
AUTO_MODE=false

# 解析参数
if [ "$1" = "--auto" ]; then
    AUTO_MODE=true
fi

confirm() {
    if [ "$AUTO_MODE" = "true" ]; then
        return 0
    fi
    read -p "$1 [y/N]: " response
    [[ "$response" =~ ^[Yy]$ ]]
}

echo "=========================================="
echo "  服务器应急响应脚本"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. 信息收集
log_info "正在收集系统信息..."
{
    echo "=== 系统信息 ==="
    echo "主机名: $(hostname)"
    echo "内核: $(uname -r)"
    echo "时间: $(date)"
    echo ""
    
    echo "=== 当前登录用户 ==="
    who
    echo ""
    
    echo "=== 最近登录 ==="
    last -n 20
    echo ""
    
    echo "=== CPU 占用 TOP 20 ==="
    ps aux --sort=-%cpu | head -20
    echo ""
    
    echo "=== 网络连接 ==="
    ss -tnp
    echo ""
    
    echo "=== 监听端口 ==="
    ss -tlnp
    echo ""
    
    echo "=== crontab (root) ==="
    crontab -l 2>/dev/null || echo "无"
    echo ""
    
    echo "=== /tmp 目录 ==="
    ls -la /tmp/
    echo ""
    
    echo "=== 隐藏文件 ==="
    find /tmp /var/tmp /dev/shm -name ".*" -type f 2>/dev/null
    echo ""
    
} >> "$REPORT_FILE" 2>&1

log_info "信息已保存到: $REPORT_FILE"
echo ""

# 2. 检测恶意进程
log_info "检测恶意进程..."
MINER_KEYWORDS="xmrig|xmr-stak|minerd|cpuminer|cgminer|ethminer|cryptonight|monero|stratum|systemwatcher|kworkerds|kdevtmpfsi"

SUSPICIOUS_PIDS=""
while IFS= read -r line; do
    pid=$(echo "$line" | awk '{print $2}')
    cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
    if echo "$cmd" | grep -qiE "$MINER_KEYWORDS"; then
        log_warn "发现可疑进程: PID=$pid CMD=$cmd"
        SUSPICIOUS_PIDS="$SUSPICIOUS_PIDS $pid"
    fi
done < <(ps aux 2>/dev/null)

if [ -n "$SUSPICIOUS_PIDS" ]; then
    if confirm "是否终止这些可疑进程?"; then
        for pid in $SUSPICIOUS_PIDS; do
            kill -9 $pid 2>/dev/null && log_info "已终止进程: $pid"
        done
    fi
else
    log_info "未发现可疑进程"
fi
echo ""

# 3. 检测恶意网络连接
log_info "检测恶意网络连接..."
KNOWN_BAD_IPS="144.168.36.74 178.128.242.134"
SUSPICIOUS_IPS=""

while IFS= read -r line; do
    remote_ip=$(echo "$line" | awk '{print $5}' | cut -d: -f1)
    for bad_ip in $KNOWN_BAD_IPS; do
        if [ "$remote_ip" = "$bad_ip" ]; then
            log_warn "发现连接到已知恶意 IP: $remote_ip"
            SUSPICIOUS_IPS="$SUSPICIOUS_IPS $remote_ip"
        fi
    done
done < <(ss -tnp 2>/dev/null)

if [ -n "$SUSPICIOUS_IPS" ]; then
    if confirm "是否封锁这些恶意 IP?"; then
        for ip in $SUSPICIOUS_IPS; do
            iptables -I OUTPUT -d "$ip" -j DROP 2>/dev/null && log_info "已封锁出站: $ip"
            iptables -I INPUT -s "$ip" -j DROP 2>/dev/null && log_info "已封锁入站: $ip"
        done
    fi
else
    log_info "未发现已知恶意连接"
fi
echo ""

# 4. 清理恶意文件
log_info "检测恶意文件..."
SUSPICIOUS_FILES=""

# 检查常见恶意目录
for dir in /tmp /var/tmp /dev/shm; do
    while IFS= read -r file; do
        if [ -n "$file" ] && echo "$file" | grep -qE "/\.[^/]+/"; then
            if [ -x "$file" ] || file "$file" 2>/dev/null | grep -q "executable"; then
                log_warn "发现可疑文件: $file"
                SUSPICIOUS_FILES="$SUSPICIOUS_FILES $file"
            fi
        fi
    done < <(find "$dir" -type f 2>/dev/null)
done

# 检查挖矿配置
while IFS= read -r file; do
    if grep -qiE "pool|stratum|wallet|mining" "$file" 2>/dev/null; then
        log_warn "发现可疑配置: $file"
        SUSPICIOUS_FILES="$SUSPICIOUS_FILES $file"
    fi
done < <(find /tmp /var/tmp -name "*.json" -o -name "*.conf" 2>/dev/null)

if [ -n "$SUSPICIOUS_FILES" ]; then
    if confirm "是否删除这些可疑文件?"; then
        for file in $SUSPICIOUS_FILES; do
            rm -rf "$file" 2>/dev/null && log_info "已删除: $file"
        done
    fi
else
    log_info "未发现可疑文件"
fi
echo ""

# 5. 检查宝塔插件
log_info "检查宝塔面板插件..."
BT_PLUGIN_DIR="/www/server/panel/plugin"
RISKY_PLUGINS="jumpserver webssh terminal"

if [ -d "$BT_PLUGIN_DIR" ]; then
    for plugin in $RISKY_PLUGINS; do
        if [ -d "$BT_PLUGIN_DIR/$plugin" ]; then
            log_warn "发现高风险插件: $plugin"
            if confirm "是否删除插件 $plugin?"; then
                rm -rf "$BT_PLUGIN_DIR/$plugin" && log_info "已删除: $plugin"
            fi
        fi
    done
fi
echo ""

# 6. 快速加固
log_info "执行快速加固..."

# 更新 iptables 规则
if confirm "是否添加常见矿池 IP 封锁规则?"; then
    MINING_POOLS="
        144.168.36.74
        178.128.242.134
        pool.minexmr.com
        pool.supportxmr.com
    "
    for pool in $MINING_POOLS; do
        if ! iptables -L OUTPUT -n | grep -q "$pool"; then
            iptables -A OUTPUT -d "$pool" -j DROP 2>/dev/null && log_info "已封锁: $pool"
        fi
    done
fi

# 保存 iptables 规则
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/sysconfig/iptables 2>/dev/null && log_info "iptables 规则已保存"
fi

echo ""
echo "=========================================="
echo "  应急响应完成"
echo "=========================================="
echo ""
echo "报告文件: $REPORT_FILE"
echo ""
echo "后续建议:"
echo "  1. 修改所有密码（SSH、数据库、面板）"
echo "  2. 检查 authorized_keys 是否被篡改"
echo "  3. 升级系统和软件到最新版本"
echo "  4. 检查并加固安全组/防火墙规则"
echo "  5. 部署持续监控脚本"
echo ""
