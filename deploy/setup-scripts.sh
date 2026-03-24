#!/bin/bash
# ========================================
# 一键设置所有运维脚本
# 用途: 首次部署时运行,设置所有脚本权限
# 使用: bash setup-scripts.sh
# ========================================

SCRIPT_DIR="/www/wwwroot/game/deploy"

echo "========================================="
echo "🔧 设置运维脚本"
echo "时间: $(date)"
echo "========================================="
echo ""

# 检查目录
if [ ! -d "$SCRIPT_DIR" ]; then
    echo "❌ 目录不存在: $SCRIPT_DIR"
    exit 1
fi

cd $SCRIPT_DIR

# 设置所有脚本为可执行
echo "1️⃣ 设置脚本执行权限..."
chmod +x *.sh
echo "✅ 权限已设置"
echo ""

# 列出所有脚本
echo "2️⃣ 可用脚本列表:"
ls -lh *.sh
echo ""

# 创建备份目录
echo "3️⃣ 创建备份目录..."
mkdir -p /www/backups/game-backend
mkdir -p /www/backup/frontend
mkdir -p /www/backup/backend
echo "✅ 备份目录已创建"
echo ""

# 创建日志目录
echo "4️⃣ 创建日志目录..."
mkdir -p /www/wwwlogs
touch /www/wwwlogs/security-check.log
touch /www/wwwlogs/security-alert.log
echo "✅ 日志目录已创建"
echo ""

echo "========================================="
echo "✅ 设置完成!"
echo "========================================="
echo ""
echo "📋 可用命令:"
echo "每日安全检查: bash $SCRIPT_DIR/daily-security-check.sh"
echo "运行时防护:   bash $SCRIPT_DIR/runtime-guard.sh"
echo "应急清理:     bash $SCRIPT_DIR/emergency-cleanup.sh"
echo "安全部署前端: bash $SCRIPT_DIR/deploy-secure-frontend.sh"
echo "快速部署:     bash $SCRIPT_DIR/quick-deploy.sh"
echo "更新前端:     bash $SCRIPT_DIR/update-frontend.sh"
echo "更新后端:     bash $SCRIPT_DIR/update-backend.sh"
echo "备份数据库:   bash $SCRIPT_DIR/backup-database.sh"
echo "基础加固:     bash $SCRIPT_DIR/hardening-setup-alinux.sh"
echo ""
echo "📖 详细文档: $SCRIPT_DIR/DAILY-MAINTENANCE-GUIDE.md"
echo ""
