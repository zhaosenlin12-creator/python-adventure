#!/bin/bash

# ============================================
# 快速安全检查脚本
# ============================================
# 用途：每天快速检查服务器安全状态
# 使用：./quick-security-check.sh
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "服务器安全快速检查"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

ISSUES=0

# ============================================
# 1. 检查MySQL端口
# ============================================
echo -e "\n${YELLOW}[1/7] 检查MySQL端口...${NC}"
MYSQL_LISTEN=$(netstat -tlnp | grep 3306 | grep -v "127.0.0.1" || true)

if [ -n "$MYSQL_LISTEN" ]; then
    echo -e "${RED}✗ 危险！MySQL正在监听外网！${NC}"
    echo "$MYSQL_LISTEN"
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ MySQL只监听本地（安全）${NC}"
fi

# ============================================
# 2. 检查可疑进程
# ============================================
echo -e "\n${YELLOW}[2/7] 检查可疑进程...${NC}"
SUSPICIOUS=$(ps aux | grep -E "xmrig|minerd|cpuminer|kdevtmpfsi|kinsing|/tmp/\." | grep -v grep || true)

if [ -n "$SUSPICIOUS" ]; then
    echo -e "${RED}✗ 发现可疑进程！${NC}"
    echo "$SUSPICIOUS"
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ 未发现可疑进程${NC}"
fi

# ============================================
# 3. 检查CPU使用率
# ============================================
echo -e "\n${YELLOW}[3/7] 检查CPU使用率...${NC}"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CPU_INT=${CPU_USAGE%.*}

if [ $CPU_INT -gt 80 ]; then
    echo -e "${RED}✗ CPU使用率过高：${CPU_USAGE}%${NC}"
    echo "前5个CPU占用进程："
    ps aux --sort=-%cpu | head -6
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ CPU使用率正常：${CPU_USAGE}%${NC}"
fi

# ============================================
# 4. 检查内存使用率
# ============================================
echo -e "\n${YELLOW}[4/7] 检查内存使用率...${NC}"
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

if [ $MEM_USAGE -gt 90 ]; then
    echo -e "${RED}✗ 内存使用率过高：${MEM_USAGE}%${NC}"
    echo "前5个内存占用进程："
    ps aux --sort=-%mem | head -6
    ISSUES=$((ISSUES+1))
else
    echo -e "${GREEN}✓ 内存使用率正常：${MEM_USAGE}%${NC}"
fi

# ============================================
# 5. 检查fail2ban状态
# ============================================
echo -e "\n${YELLOW}[5/7] 检查fail2ban状态...${NC}"
if systemctl is-active --quiet fail2ban; then
    echo -e "${GREEN}✓ fail2ban正在运行${NC}"
    
    # 显示封禁的IP
    BANNED=$(fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" | cut -d':' -f2 | xargs)
    if [ -n "$BANNED" ] && [ "$BANNED" != "" ]; then
        echo -e "  已封禁IP: ${YELLOW}$BANNED${NC}"
    else
        echo "  当前无封禁IP"
    fi
else
    echo -e "${RED}✗ fail2ban未运行！${NC}"
    ISSUES=$((ISSUES+1))
fi

# ============================================
# 6. 检查防火墙状态
# ============================================
echo -e "\n${YELLOW}[6/7] 检查防火墙状态...${NC}"
if systemctl is-active --quiet firewalld; then
    echo -e "${GREEN}✓ 防火墙正在运行${NC}"
    echo "  开放端口: $(firewall-cmd --list-ports)"
else
    echo -e "${RED}✗ 防火墙未运行！${NC}"
    ISSUES=$((ISSUES+1))
fi

# ============================================
# 7. 检查PM2服务
# ============================================
echo -e "\n${YELLOW}[7/7] 检查PM2服务...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null)
    RUNNING_COUNT=$(echo "$PM2_STATUS" | grep -o '"status":"online"' | wc -l)
    STOPPED_COUNT=$(echo "$PM2_STATUS" | grep -o '"status":"stopped"' | wc -l)
    
    if [ $STOPPED_COUNT -gt 0 ]; then
        echo -e "${YELLOW}⚠ 有${STOPPED_COUNT}个服务已停止${NC}"
        pm2 list
        ISSUES=$((ISSUES+1))
    else
        echo -e "${GREEN}✓ 所有PM2服务运行正常（${RUNNING_COUNT}个）${NC}"
    fi
else
    echo -e "${YELLOW}⚠ PM2未安装${NC}"
fi

# ============================================
# 总结
# ============================================
echo -e "\n=========================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ 安全检查通过！未发现问题。${NC}"
else
    echo -e "${RED}✗ 发现 ${ISSUES} 个安全问题，请立即处理！${NC}"
fi
echo "=========================================="

# ============================================
# 额外信息
# ============================================
echo -e "\n${YELLOW}系统信息：${NC}"
echo "  运行时间: $(uptime -p)"
echo "  磁盘使用: $(df -h / | tail -1 | awk '{print $5}')"
echo "  当前用户: $(who | wc -l) 个"

echo -e "\n${YELLOW}快速命令：${NC}"
echo "  查看详细日志: tail -f /var/log/security-check.log"
echo "  查看fail2ban: fail2ban-client status sshd"
echo "  查看PM2服务: pm2 list"
echo "  查看系统日志: journalctl -xe"

exit $ISSUES
