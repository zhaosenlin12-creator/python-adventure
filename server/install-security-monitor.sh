#!/bin/bash
#===============================================================================
# 安全监控脚本安装程序
# 用法: curl -sSL <url> | bash
# 或者: bash install-security-monitor.sh
#===============================================================================

set -e

echo "=========================================="
echo "  安全监控脚本安装程序 v2.0"
echo "=========================================="

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 root 用户运行此脚本"
    exit 1
fi

# 配置
INSTALL_DIR="/usr/local/security-monitor"
SCRIPT_NAME="security-monitor.sh"
SERVICE_NAME="security-monitor"
LOG_DIR="/var/log/security-monitor"

echo "[1/6] 创建目录..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"

echo "[2/6] 安装脚本..."
# 如果脚本在当前目录
if [ -f "./$SCRIPT_NAME" ]; then
    cp "./$SCRIPT_NAME" "$INSTALL_DIR/"
elif [ -f "./scripts/server/$SCRIPT_NAME" ]; then
    cp "./scripts/server/$SCRIPT_NAME" "$INSTALL_DIR/"
else
    echo "错误: 找不到 $SCRIPT_NAME"
    echo "请确保在正确的目录下运行此脚本"
    exit 1
fi

chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

echo "[3/6] 创建 systemd 服务..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << 'EOF'
[Unit]
Description=Security Monitor Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/security-monitor/security-monitor.sh -d
Restart=always
RestartSec=10
StandardOutput=append:/var/log/security-monitor/service.log
StandardError=append:/var/log/security-monitor/service.log

[Install]
WantedBy=multi-user.target
EOF

echo "[4/6] 创建定时任务..."
# 每5分钟运行一次快速检查
cat > /etc/cron.d/security-monitor << 'EOF'
# 安全监控定时任务
# 每5分钟运行一次快速检查
*/5 * * * * root /usr/local/security-monitor/security-monitor.sh -s >> /var/log/security-monitor/cron.log 2>&1
EOF

echo "[5/6] 创建命令别名..."
cat > /etc/profile.d/security-monitor.sh << 'EOF'
# 安全监控命令别名
alias sec-check='/usr/local/security-monitor/security-monitor.sh -s'
alias sec-status='systemctl status security-monitor'
alias sec-log='tail -f /var/log/security-monitor/monitor.log'
alias sec-alerts='cat /var/log/security-monitor/alerts.log'
EOF

# 创建软链接
ln -sf "$INSTALL_DIR/$SCRIPT_NAME" /usr/local/bin/security-monitor

echo "[6/6] 启动服务..."
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

echo ""
echo "=========================================="
echo "  安装完成!"
echo "=========================================="
echo ""
echo "使用方法:"
echo "  security-monitor -s     # 单次检查"
echo "  security-monitor -d     # 守护模式"
echo "  security-monitor -h     # 查看帮助"
echo ""
echo "快捷命令 (重新登录后生效):"
echo "  sec-check    # 运行安全检查"
echo "  sec-status   # 查看服务状态"
echo "  sec-log      # 实时查看日志"
echo "  sec-alerts   # 查看告警记录"
echo ""
echo "服务管理:"
echo "  systemctl status security-monitor   # 查看状态"
echo "  systemctl restart security-monitor  # 重启服务"
echo "  systemctl stop security-monitor     # 停止服务"
echo ""
echo "日志位置: $LOG_DIR"
echo ""
echo "配置告警 (可选):"
echo "  编辑 $INSTALL_DIR/$SCRIPT_NAME"
echo "  设置 WEBHOOK_URL 为企业微信/钉钉机器人地址"
echo ""
