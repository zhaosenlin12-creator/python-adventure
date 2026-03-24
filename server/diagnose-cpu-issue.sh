#!/bin/bash
#===============================================================================
# CPU高负载快速诊断脚本
# 用途: 快速定位CPU占用高的原因
#===============================================================================

echo "=========================================="
echo "  CPU高负载快速诊断"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. 查看CPU占用TOP 10
echo "【1】CPU占用TOP 10进程:"
ps aux --sort=-%cpu | head -11
echo ""

# 2. 检查jumpserver进程
echo "【2】检查jumpserver进程:"
JUMPSERVER_COUNT=$(ps aux | grep -i jumpserver | grep -v grep | wc -l)
if [ $JUMPSERVER_COUNT -gt 0 ]; then
    echo "⚠️  发现 $JUMPSERVER_COUNT 个jumpserver进程:"
    ps aux | grep -i jumpserver | grep -v grep
    echo ""
    echo "建议立即执行:"
    echo "  pkill -9 -f jumpserver"
    echo "  rm -rf /www/server/panel/plugin/jumpserver"
else
    echo "✅ 未发现jumpserver进程"
fi
echo ""

# 3. 检查挖矿进程
echo "【3】检查挖矿进程:"
MINER_COUNT=$(ps aux | grep -iE "xmrig|minerd|cpuminer|stratum|monero|kworker|systemd-" | grep -v grep | wc -l)
if [ $MINER_COUNT -gt 0 ]; then
    echo "⚠️  发现 $MINER_COUNT 个可疑挖矿进程:"
    ps aux | grep -iE "xmrig|minerd|cpuminer|stratum|monero|kworker|systemd-" | grep -v grep
else
    echo "✅ 未发现挖矿进程"
fi
echo ""

# 4. 检查宝塔插件
echo "【4】检查宝塔高风险插件:"
BT_PLUGIN_DIR="/www/server/panel/plugin"
if [ -d "$BT_PLUGIN_DIR" ]; then
    for plugin in jumpserver webssh terminal; do
        if [ -d "$BT_PLUGIN_DIR/$plugin" ]; then
            echo "⚠️  发现高风险插件: $plugin"
            echo "    路径: $BT_PLUGIN_DIR/$plugin"
        fi
    done
else
    echo "✅ 宝塔插件目录不存在"
fi
echo ""

# 5. 检查可疑网络连接
echo "【5】检查可疑网络连接（矿池端口3333,4444,5555,7777,8888）:"
POOL_CONN=$(ss -tnp | grep -E ":3333|:4444|:5555|:7777|:8888" | wc -l)
if [ $POOL_CONN -gt 0 ]; then
    echo "⚠️  发现 $POOL_CONN 个可疑矿池连接:"
    ss -tnp | grep -E ":3333|:4444|:5555|:7777|:8888"
else
    echo "✅ 未发现矿池连接"
fi
echo ""

# 6. 检查/tmp目录可疑文件
echo "【6】检查/tmp目录可疑文件:"
SUSPICIOUS_FILES=$(find /tmp /var/tmp /dev/shm -type f -executable 2>/dev/null | wc -l)
if [ $SUSPICIOUS_FILES -gt 0 ]; then
    echo "⚠️  发现 $SUSPICIOUS_FILES 个可执行文件:"
    find /tmp /var/tmp /dev/shm -type f -executable -ls 2>/dev/null | head -10
else
    echo "✅ 未发现可疑文件"
fi
echo ""

# 7. 系统负载
echo "【7】系统负载:"
uptime
echo ""

# 8. 内存使用
echo "【8】内存使用:"
free -h
echo ""

echo "=========================================="
echo "  诊断完成"
echo "=========================================="
echo ""
echo "如果发现jumpserver或挖矿进程，请立即执行清理脚本:"
echo "  bash cleanup-cpu-issue.sh"
echo ""
