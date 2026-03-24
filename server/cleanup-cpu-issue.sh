#!/bin/bash
#===============================================================================
# CPU高负载一键清理脚本
# 用途: 清理jumpserver插件和挖矿病毒
#===============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo "=========================================="
echo "  CPU高负载一键清理"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. 终止jumpserver进程
log_info "步骤1: 终止jumpserver进程..."
if ps aux | grep -i jumpserver | grep -v grep > /dev/null; then
    pkill -9 -f jumpserver 2>/dev/null && log_info "已终止jumpserver进程" || log_warn "未找到jumpserver进程"
else
    log_info "未发现jumpserver进程"
fi
echo ""

# 2. 删除jumpserver插件
log_info "步骤2: 删除jumpserver插件..."
if [ -d "/www/server/panel/plugin/jumpserver" ]; then
    rm -rf /www/server/panel/plugin/jumpserver
    log_info "已删除jumpserver插件"
else
    log_info "jumpserver插件不存在"
fi
echo ""

# 3. 删除其他高风险插件
log_info "步骤3: 删除其他高风险插件..."
for plugin in webssh terminal; do
    if [ -d "/www/server/panel/plugin/$plugin" ]; then
        rm -rf "/www/server/panel/plugin/$plugin"
        log_info "已删除 $plugin 插件"
    fi
done
echo ""

# 4. 终止挖矿进程
log_info "步骤4: 终止挖矿进程..."
MINER_PIDS=$(ps aux | grep -iE "xmrig|minerd|cpuminer|stratum|monero" | grep -v grep | awk '{print $2}')
if [ -n "$MINER_PIDS" ]; then
    for pid in $MINER_PIDS; do
        kill -9 $pid 2>/dev/null && log_info "已终止挖矿进程: PID=$pid"
    done
else
    log_info "未发现挖矿进程"
fi
echo ""

# 5. 清理可疑文件
log_info "步骤5: 清理/tmp目录可疑文件..."
SUSPICIOUS_COUNT=0
while IFS= read -r file; do
    if [ -n "$file" ]; then
        rm -f "$file" 2>/dev/null && log_info "已删除: $file"
        ((SUSPICIOUS_COUNT++))
    fi
done < <(find /tmp /var/tmp /dev/shm -type f -executable 2>/dev/null | grep -E "xmrig|miner|kworker")

if [ $SUSPICIOUS_COUNT -eq 0 ]; then
    log_info "未发现可疑文件"
fi
echo ""

# 6. 封锁已知矿池IP
log_info "步骤6: 封锁已知矿池IP..."
MINING_IPS="144.168.36.74 178.128.242.134"
for ip in $MINING_IPS; do
    if ! iptables -L OUTPUT -n | grep -q "$ip"; then
        iptables -I OUTPUT -d "$ip" -j DROP 2>/dev/null && log_info "已封锁: $ip"
    fi
done
echo ""

# 7. 重启宝塔面板
log_info "步骤7: 重启宝塔面板..."
if command -v bt &> /dev/null; then
    bt restart
    log_info "宝塔面板已重启"
else
    log_warn "未找到bt命令，跳过重启"
fi
echo ""

# 8. 检查CPU占用
log_info "步骤8: 检查当前CPU占用..."
echo ""
ps aux --sort=-%cpu | head -6
echo ""

# 9. 系统负载
log_info "步骤9: 当前系统负载..."
uptime
echo ""

echo "=========================================="
echo "  清理完成"
echo "=========================================="
echo ""
echo "后续建议:"
echo "  1. 等待2-3分钟，观察CPU是否恢复正常"
echo "  2. 运行: top 或 htop 实时监控CPU"
echo "  3. 修改所有密码（SSH、数据库、宝塔面板）"
echo "  4. 部署持续监控: bash scripts/server/install-security-monitor.sh"
echo "  5. 检查防火墙规则，只开放必要端口"
echo ""
echo "如果CPU仍然很高，请运行:"
echo "  bash diagnose-cpu-issue.sh"
echo ""
