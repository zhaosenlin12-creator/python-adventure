#!/bin/bash
# ========================================
# 快速安全加固脚本
# 执行方式：bash quick-security-setup.sh
# ========================================

echo "========================================="
echo "🔒 服务器安全快速加固"
echo "时间: $(date)"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== 第一步：MySQL安全配置 =====
echo -e "${YELLOW}📋 第一步：MySQL安全配置${NC}"
echo ""

# 检查MySQL配置文件
if [ -f /etc/my.cnf ]; then
    MYSQL_CONF="/etc/my.cnf"
elif [ -f /etc/mysql/my.cnf ]; then
    MYSQL_CONF="/etc/mysql/my.cnf"
else
    echo -e "${RED}❌ 找不到MySQL配置文件${NC}"
    MYSQL_CONF=""
fi

if [ -n "$MYSQL_CONF" ]; then
    # 备份配置
    cp $MYSQL_CONF ${MYSQL_CONF}.backup.$(date +%Y%m%d%H%M)
    echo -e "${GREEN}✅ MySQL配置已备份${NC}"
    
    # 配置bind-address
    if grep -q "^bind-address" $MYSQL_CONF; then
        sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' $MYSQL_CONF
    else
        sed -i '/\[mysqld\]/a bind-address = 127.0.0.1' $MYSQL_CONF
    fi
    echo -e "${GREEN}✅ MySQL已配置为只监听本地${NC}"
    
    # 重启MySQL
    systemctl restart mysqld 2>/dev/null || systemctl restart mysql 2>/dev/null
    echo -e "${GREEN}✅ MySQL已重启${NC}"
    
    # 验证
    echo ""
    echo "验证MySQL监听地址："
    netstat -tlnp | grep 3306
    echo ""
fi

# ===== 第二步：禁止/dev/shm执行 =====
echo -e "${YELLOW}📋 第二步：禁止/dev/shm执行程序${NC}"
echo ""

# 立即生效
mount -o remount,noexec,nosuid /dev/shm
echo -e "${GREEN}✅ /dev/shm已禁止执行（立即生效）${NC}"

# 永久生效
if ! grep -q "tmpfs /dev/shm tmpfs defaults,noexec,nosuid" /etc/fstab; then
    # 备份fstab
    cp /etc/fstab /etc/fstab.backup.$(date +%Y%m%d%H%M)
    
    # 修改或添加配置
    if grep -q "/dev/shm" /etc/fstab; then
        sed -i 's|tmpfs.*/dev/shm.*|tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0|' /etc/fstab
    else
        echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
    fi
    echo -e "${GREEN}✅ /dev/shm已配置为永久禁止执行${NC}"
fi

# 验证
echo ""
echo "验证/dev/shm挂载选项："
mount | grep /dev/shm
echo ""

# ===== 第三步：修改SSH端口 =====
echo -e "${YELLOW}📋 第三步：修改SSH端口${NC}"
echo ""

# 备份SSH配置
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d%H%M)

# 修改端口
if grep -q "^Port 22" /etc/ssh/sshd_config; then
    sed -i 's/^Port 22/Port 8081/' /etc/ssh/sshd_config
    echo -e "${GREEN}✅ SSH端口已改为8081${NC}"
elif grep -q "^#Port 22" /etc/ssh/sshd_config; then
    sed -i 's/^#Port 22/Port 8081/' /etc/ssh/sshd_config
    echo -e "${GREEN}✅ SSH端口已改为8081${NC}"
else
    echo "Port 8081" >> /etc/ssh/sshd_config
    echo -e "${GREEN}✅ SSH端口已添加为8081${NC}"
fi

# 重启SSH
systemctl restart sshd
echo -e "${GREEN}✅ SSH服务已重启${NC}"
echo ""

# ===== 第四步：安装fail2ban =====
echo -e "${YELLOW}📋 第四步：安装fail2ban${NC}"
echo ""

if ! command -v fail2ban-client &> /dev/null; then
    yum install -y fail2ban
    
    # 配置fail2ban
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 8081
logpath = /var/log/secure
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    echo -e "${GREEN}✅ fail2ban已安装并启动${NC}"
else
    echo -e "${GREEN}✅ fail2ban已安装${NC}"
fi
echo ""

# ===== 第五步：安装rootkit检测工具 =====
echo -e "${YELLOW}📋 第五步：安装rootkit检测工具${NC}"
echo ""

if ! command -v chkrootkit &> /dev/null; then
    yum install -y chkrootkit
    echo -e "${GREEN}✅ chkrootkit已安装${NC}"
else
    echo -e "${GREEN}✅ chkrootkit已安装${NC}"
fi

if ! command -v rkhunter &> /dev/null; then
    yum install -y rkhunter
    echo -e "${GREEN}✅ rkhunter已安装${NC}"
else
    echo -e "${GREEN}✅ rkhunter已安装${NC}"
fi
echo ""

# ===== 第六步：配置PM2开机自启 =====
echo -e "${YELLOW}📋 第六步：配置PM2开机自启${NC}"
echo ""

export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

if command -v pm2 &> /dev/null; then
    # 保存PM2进程列表
    pm2 save
    echo -e "${GREEN}✅ PM2进程列表已保存${NC}"
    
    # 配置开机自启
    pm2 unstartup 2>/dev/null
    pm2 startup systemd -u root --hp /root
    
    echo ""
    echo -e "${YELLOW}⚠️  请复制上面输出的 sudo 命令并执行${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  PM2未安装或未在PATH中${NC}"
fi

# ===== 完成总结 =====
echo ""
echo "========================================="
echo -e "${GREEN}✅ 安全加固完成！${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}📋 请手动完成以下步骤：${NC}"
echo ""
echo "1. 修改MySQL root密码为强密码："
echo "   mysql -u root -p"
echo "   ALTER USER 'root'@'localhost' IDENTIFIED BY '你的超强密码';"
echo "   FLUSH PRIVILEGES;"
echo ""
echo "2. 阿里云安全组配置："
echo "   - 删除 3306 端口规则（MySQL）"
echo "   - 删除 6379 端口规则（Redis，如果有）"
echo "   - 添加 8081 端口规则（SSH，限制你的IP）"
echo "   - 只保留: 80, 443, 8081, 宝塔端口"
echo ""
echo "3. 重新连接SSH（使用新端口）："
echo "   ssh -p 8081 root@120.26.114.244"
echo ""
echo "4. 配置PM2开机自启："
echo "   - 复制上面输出的 sudo 命令并执行"
echo "   - systemctl daemon-reload"
echo "   - systemctl enable pm2-root"
echo "   - systemctl start pm2-root"
echo "   - pm2 save"
echo ""
echo "5. 运行安全检测："
echo "   chkrootkit"
echo "   rkhunter --check --skip-keypress"
echo ""
echo "6. 配置安全检测定时任务："
echo "   crontab -e"
echo "   添加: 0 * * * * /www/wwwroot/security_check.sh"
echo ""
echo "========================================="
echo ""
echo -e "${GREEN}📚 详细文档：game-google/deploy/SECURITY-GUIDE.md${NC}"
echo ""
