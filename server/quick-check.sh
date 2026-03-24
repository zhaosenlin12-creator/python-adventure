#!/bin/bash
#===============================================================================
# 快速安全检查脚本
# 用途: 快速查看服务器安全状态
#===============================================================================

echo "=========================================="
echo "  服务器安全快速检查"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. 检查 CPU/内存占用
echo "【1】CPU/内存 TOP 5:"
ps aux --sort=-%cpu | head -6
echo ""

# 2. 检查可疑进程
echo "【2】检查挖矿进程:"
MINER_COUNT=$(ps aux | grep -iE "xmrig|minerd|cpuminer|stratum|monero" | grep -v grep | wc -l)
if [ $MINER_COUNT -gt 0 ]; then
    echo "⚠️  发现 $MINER_COUNT 个可疑进程:"
    ps aux | grep -iE "xmrig|minerd|cpuminer|stratum|monero" | grep -v grep
else
    echo "✅ 未发现挖矿进程"
fi
echo ""

# 3. 检查网络连接
echo "【3】外部网络连接:"
ss -tnp | grep -v "127.0.0.1" | grep ESTAB | awk '{print $4, $5}' | sort -u
echo ""

# 4. 检查可疑端口
echo "【4】检查矿池端口连接:"
POOL_COUNT=$(ss -tnp | grep -E "3333|4444|5555|7777|8888" | wc -l)
if [ $POOL_COUNT -gt 0 ]; then
    echo "⚠️  发现 $POOL_COUNT 个可疑端口连接:"
    ss -tnp | grep -E "3333|4444|5555|7777|8888"
else
    echo "✅ 未发现矿池端口连接"
fi
echo ""

# 5. 检查最近的安全日志
echo "【5】最近 5 条安全告警:"
if [ -f /var/log/security-monitor/alerts.log ]; then
    tail -5 /var/log/security-monitor/alerts.log
else
    echo "暂无告警日志"
fi
echo ""

# 6. 检查已封锁的 IP
echo "【6】已封锁的 IP 数量:"
if [ -f /var/log/security-monitor/blocked_ips.txt ]; then
    BLOCKED_COUNT=$(wc -l < /var/log/security-monitor/blocked_ips.txt)
    echo "已封锁 $BLOCKED_COUNT 个 IP"
    if [ $BLOCKED_COUNT -gt 0 ]; then
        echo "最近封锁的 5 个 IP:"
        tail -5 /var/log/security-monitor/blocked_ips.txt
    fi
else
    echo "暂无封锁记录"
fi
echo ""

# 7. 检查监控脚本状态
echo "【7】安全监控脚本状态:"
if ps aux | grep -q "[s]ecurity-monitor.sh -d"; then
    echo "✅ 安全监控正在运行"
    ps aux | grep "[s]ecurity-monitor.sh -d"
else
    echo "⚠️  安全监控未运行，建议启动"
fi
echo ""

echo "=========================================="
echo "  检查完成"
echo "=========================================="
