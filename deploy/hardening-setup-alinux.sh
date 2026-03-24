#!/bin/bash
# ============================================================
# Alibaba Cloud Linux 3 (OpenAnolis) 一键基础加固脚本
# 适配：宝塔 + Nginx + 本项目端口
# 用法：bash hardening-setup-alinux.sh
# ============================================================

# ====== 请按实际修改 ======
ADMIN_IP="223.77.131.65"   # 你的管理端公网IP（动态IP变更后要改）
PANEL_PORT="19980"         # 宝塔端口
ENABLE_SSH="0"             # 不用SSH就填0，用SSH填1
SSH_PORT="22"              # 你的SSH端口（如启用）

# ====== 固定配置 ======
LOG_DIR="/www/wwwlogs"
ACCESS_LOG="/www/wwwlogs/game.codebn.cn.log"
ERROR_LOG="/www/wwwlogs/game.codebn.cn.error.log"

set -u

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 执行"
  exit 1
fi

echo "========================================="
echo "🔒 基础安全加固开始"
echo "时间: $(date)"
echo "管理IP: $ADMIN_IP"
echo "宝塔端口: $PANEL_PORT"
echo "========================================="

# 1) 启用防火墙
echo "[1/6] 启用 firewalld ..."

# firewalld 可能未预装：没有 firewall-cmd 就先安装
if ! command -v firewall-cmd >/dev/null 2>&1; then
  echo "firewalld 未安装，正在安装..."
  dnf install -y firewalld || yum install -y firewalld
fi

systemctl enable --now firewalld

# 说明：这里的 http/https 不是网址！
# --add-service=http  = 放行 80 端口
# --add-service=https = 放行 443 端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$ADMIN_IP\" port port=\"$PANEL_PORT\" protocol=\"tcp\" accept"

if [ "$ENABLE_SSH" = "1" ]; then
  firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$ADMIN_IP\" port port=\"$SSH_PORT\" protocol=\"tcp\" accept"
else
  # 不用 SSH 就移除 ssh 服务放行（如果不存在会报错，忽略即可）
  firewall-cmd --permanent --remove-service=ssh 2>/dev/null || true
fi

firewall-cmd --reload
firewall-cmd --list-all

# 2) /dev/shm 禁止执行
echo "[2/6] 禁止 /dev/shm 执行 ..."
mount -o remount,noexec,nosuid /dev/shm || true

if ! grep -q "tmpfs /dev/shm tmpfs defaults,noexec,nosuid" /etc/fstab; then
  cp /etc/fstab /etc/fstab.backup.$(date +%Y%m%d%H%M)
  if grep -q "/dev/shm" /etc/fstab; then
    sed -i 's|tmpfs.*/dev/shm.*|tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0|' /etc/fstab
  else
    echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
  fi
fi

# 3) sysctl 基础加固
echo "[3/6] 写入 sysctl 加固配置 ..."
cat > /etc/sysctl.d/99-hardening.conf << 'EOF'
net.ipv4.tcp_syncookies = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
EOF
sysctl --system

# 4) 安装 fail2ban 并配置 Nginx 规则
echo "[4/6] 安装 fail2ban ..."
dnf install -y fail2ban || yum install -y fail2ban

mkdir -p /etc/fail2ban/jail.d /etc/fail2ban/filter.d

# nginx-limit-req 过滤器（如系统不存在则写入）
if [ ! -f /etc/fail2ban/filter.d/nginx-limit-req.conf ]; then
  cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF
fi

cat > /etc/fail2ban/jail.d/nginx-game.local << EOF
[nginx-botsearch]
enabled = true
port = http,https
logpath = ${ACCESS_LOG}
maxretry = 10
findtime = 600
bantime = 86400

[nginx-limit-req]
enabled = true
port = http,https
logpath = ${ERROR_LOG}
maxretry = 20
findtime = 600
bantime = 86400
EOF

systemctl enable --now fail2ban
fail2ban-client status

# 5) 日志目录
echo "[5/6] 初始化日志目录 ..."
mkdir -p "$LOG_DIR"
touch "$LOG_DIR/runtime-guard.log" "$LOG_DIR/runtime-guard-ban.log"

# 6) 提示下一步
echo "[6/6] 完成"
echo "-----------------------------------------"
echo "✅ 基础加固完成"
echo "📌 请继续："
echo "1) 上传并执行 deploy/runtime-guard.sh"
echo "2) Nginx 配置加入限流/安全头（见 SECURITY_HARDENING.md）"
echo "3) 每5分钟运行防护脚本（crontab）"
echo "-----------------------------------------"
