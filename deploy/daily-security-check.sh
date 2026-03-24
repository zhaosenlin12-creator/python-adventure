#!/bin/bash
# ========================================
# 每日安全检查脚本
# 用途: 检测入侵、自动拉黑、记录日志
# 使用: bash daily-security-check.sh
# ========================================

LOG_FILE="/www/wwwlogs/security-check.log"
ALERT_FILE="/www/wwwlogs/security-alert.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=========================================" | tee -a $LOG_FILE
echo "🔍 安全检查开始: $DATE" | tee -a $LOG_FILE
echo "=========================================" | tee -a $LOG_FILE

# 检测结果标志
INTRUSION_DETECTED=0

# 网络命令兼容：优先使用 ss（大多数系统默认有），没有再用 netstat
net_listen() {
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null
    else
        netstat -tlnp 2>/dev/null
    fi
}

net_established() {
    if command -v ss >/dev/null 2>&1; then
        ss -antp state established 2>/dev/null
    else
        netstat -antp 2>/dev/null | grep ESTABLISHED
    fi
}

# 允许的常见端口（你的宝塔端口是 19980，加入白名单避免误报）
SAFE_CONN_REGEX=":80|:443|:8000|:3003|:19980"

# ===== 1. 检查挖矿进程 =====
echo "" | tee -a $LOG_FILE
echo "1️⃣ 检查挖矿进程..." | tee -a $LOG_FILE
MINING_PROCESSES=$(ps aux | grep -iE "xmrig|minerd|kdevtmpfsi|kinsing|cryptonight|monero|gulf" | grep -v grep)

if [ -n "$MINING_PROCESSES" ]; then
    echo "⚠️  发现挖矿进程!" | tee -a $LOG_FILE $ALERT_FILE
    echo "$MINING_PROCESSES" | tee -a $LOG_FILE $ALERT_FILE
    INTRUSION_DETECTED=1
    
    # 立即杀死进程
    echo "🔪 正在杀死挖矿进程..." | tee -a $LOG_FILE
    ps aux | grep -iE "xmrig|minerd|kdevtmpfsi|kinsing" | grep -v grep | awk '{print $2}' | xargs -r kill -9
    echo "✅ 挖矿进程已杀死" | tee -a $LOG_FILE
else
    echo "✅ 未发现挖矿进程" | tee -a $LOG_FILE
fi

# ===== 2. 检查CPU使用率 =====
echo "" | tee -a $LOG_FILE
echo "2️⃣ 检查CPU使用率..." | tee -a $LOG_FILE
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CPU_INT=${CPU_USAGE%.*}

if [ $CPU_INT -gt 80 ]; then
    echo "⚠️  CPU使用率异常: ${CPU_USAGE}%" | tee -a $LOG_FILE $ALERT_FILE
    echo "高CPU进程:" | tee -a $LOG_FILE
    ps aux --sort=-%cpu | head -10 | tee -a $LOG_FILE
    INTRUSION_DETECTED=1
else
    echo "✅ CPU使用率正常: ${CPU_USAGE}%" | tee -a $LOG_FILE
fi

# ===== 3. 检查内存使用率 =====
echo "" | tee -a $LOG_FILE
echo "3️⃣ 检查内存使用率..." | tee -a $LOG_FILE
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

if [ $MEM_USAGE -gt 85 ]; then
    echo "⚠️  内存使用率异常: ${MEM_USAGE}%" | tee -a $LOG_FILE $ALERT_FILE
    echo "高内存进程:" | tee -a $LOG_FILE
    ps aux --sort=-%mem | head -10 | tee -a $LOG_FILE
else
    echo "✅ 内存使用率正常: ${MEM_USAGE}%" | tee -a $LOG_FILE
fi

# ===== 4. 检查/dev/shm目录 =====
echo "" | tee -a $LOG_FILE
echo "4️⃣ 检查/dev/shm目录..." | tee -a $LOG_FILE
SHM_FILES=$(ls -la /dev/shm/ 2>/dev/null | grep -v "^total" | grep -v "^d" | wc -l)

if [ $SHM_FILES -gt 0 ]; then
    echo "⚠️  /dev/shm中发现可疑文件!" | tee -a $LOG_FILE $ALERT_FILE
    ls -la /dev/shm/ | tee -a $LOG_FILE
    INTRUSION_DETECTED=1
    
    # 清理/dev/shm
    echo "🧹 正在清理/dev/shm..." | tee -a $LOG_FILE
    rm -rf /dev/shm/* 2>/dev/null
    echo "✅ /dev/shm已清理" | tee -a $LOG_FILE
else
    echo "✅ /dev/shm目录正常" | tee -a $LOG_FILE
fi

# ===== 5. 检查定时任务 =====
echo "" | tee -a $LOG_FILE
echo "5️⃣ 检查定时任务..." | tee -a $LOG_FILE
SUSPICIOUS_CRON=$(crontab -l 2>/dev/null | grep -iE "curl|wget|/tmp|/dev/shm|sys-update")

if [ -n "$SUSPICIOUS_CRON" ]; then
    echo "⚠️  发现可疑定时任务!" | tee -a $LOG_FILE $ALERT_FILE
    echo "$SUSPICIOUS_CRON" | tee -a $LOG_FILE $ALERT_FILE
    INTRUSION_DETECTED=1
    
    # 清理可疑定时任务
    echo "🧹 正在清理可疑定时任务..." | tee -a $LOG_FILE
    crontab -l 2>/dev/null | grep -viE "curl.*tmp|wget.*tmp|sys-update" | crontab -
    echo "✅ 可疑定时任务已清理" | tee -a $LOG_FILE
else
    echo "✅ 定时任务正常" | tee -a $LOG_FILE
fi

# ===== 6. 检查MySQL监听地址 =====
echo "" | tee -a $LOG_FILE
echo "6️⃣ 检查MySQL监听地址..." | tee -a $LOG_FILE

MYSQL_ANY=$(net_listen | grep ":3306" || true)

if [ -z "$MYSQL_ANY" ]; then
    echo "✅ 未发现 MySQL 3306 监听（未安装或未启用）" | tee -a $LOG_FILE
elif echo "$MYSQL_ANY" | grep -qE "127\\.0\\.0\\.1:3306|\\[::1\\]:3306|::1:3306"; then
    echo "✅ MySQL 只监听本地（安全）" | tee -a $LOG_FILE
else
    echo "⚠️  MySQL 监听在公网!" | tee -a $LOG_FILE $ALERT_FILE
    echo "$MYSQL_ANY" | tee -a $LOG_FILE $ALERT_FILE
    INTRUSION_DETECTED=1
fi

# ===== 7. 检查异常网络连接 =====
echo "" | tee -a $LOG_FILE
echo "7️⃣ 检查异常网络连接..." | tee -a $LOG_FILE

SUSPICIOUS_CONN=$(net_established | grep -vE "$SAFE_CONN_REGEX" | wc -l)

if [ $SUSPICIOUS_CONN -gt 5 ]; then
    echo "⚠️  发现异常网络连接: $SUSPICIOUS_CONN 个" | tee -a $LOG_FILE $ALERT_FILE
    net_established | grep -vE "$SAFE_CONN_REGEX" | tee -a $LOG_FILE
else
    echo "✅ 网络连接正常" | tee -a $LOG_FILE
fi

# ===== 8. 检查应用状态 =====
echo "" | tee -a $LOG_FILE
echo "8️⃣ 检查应用状态..." | tee -a $LOG_FILE

export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep -E "game|game-backend" | grep -c "online")
    if [ $PM2_STATUS -eq 2 ]; then
        echo "✅ 前后端应用运行正常" | tee -a $LOG_FILE
    else
        echo "⚠️  应用状态异常!" | tee -a $LOG_FILE $ALERT_FILE
        pm2 list | tee -a $LOG_FILE
    fi
else
    echo "⚠️  PM2未找到" | tee -a $LOG_FILE
fi

# ===== 9. 检查磁盘空间 =====
echo "" | tee -a $LOG_FILE
echo "9️⃣ 检查磁盘空间..." | tee -a $LOG_FILE
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $DISK_USAGE -gt 85 ]; then
    echo "⚠️  磁盘空间不足: ${DISK_USAGE}%" | tee -a $LOG_FILE $ALERT_FILE
else
    echo "✅ 磁盘空间充足: ${DISK_USAGE}%" | tee -a $LOG_FILE
fi

# ===== 10. 检查最近登录 =====
echo "" | tee -a $LOG_FILE
echo "🔟 检查最近登录..." | tee -a $LOG_FILE
echo "最近5次登录:" | tee -a $LOG_FILE
last -5 | tee -a $LOG_FILE

# ===== 总结 =====
echo "" | tee -a $LOG_FILE
echo "=========================================" | tee -a $LOG_FILE
if [ $INTRUSION_DETECTED -eq 1 ]; then
    echo "🚨 检测到入侵迹象! 已执行自动清理" | tee -a $LOG_FILE $ALERT_FILE
    echo "📧 请立即检查 $ALERT_FILE" | tee -a $LOG_FILE
    
    # 发送告警(可选 - 需要配置邮件)
    # echo "检测到服务器入侵! 时间: $DATE" | mail -s "安全告警" your@email.com
else
    echo "✅ 系统安全,未发现异常" | tee -a $LOG_FILE
fi
echo "=========================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

exit 0
