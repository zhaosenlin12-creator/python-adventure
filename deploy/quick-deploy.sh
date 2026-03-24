#!/bin/bash
# ========================================
# 快速部署脚本
# 用途：重装服务器后快速恢复游戏
# 执行：bash quick-deploy.sh
# ========================================

echo "========================================="
echo "🚀 游戏快速部署脚本"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

# 检查是否为root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用root用户运行此脚本"
    exit 1
fi

# 设置Node.js路径
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

echo "📋 部署步骤："
echo "1. 安装依赖"
echo "2. 配置环境变量"
echo "3. 启动前端"
echo "4. 启动后端"
echo "5. 配置PM2开机自启"
echo ""
read -p "按Enter继续..."

# 1. 前端部署
echo ""
echo "========================================="
echo "1️⃣ 部署前端"
echo "========================================="
cd /www/wwwroot/game

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "构建前端..."
npm run build

echo "启动前端..."
pm2 delete game 2>/dev/null
pm2 start npm --name "game" -- start
echo "✅ 前端部署完成"

# 2. 后端部署
echo ""
echo "========================================="
echo "2️⃣ 部署后端"
echo "========================================="
cd /www/wwwroot/game-backend

if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -r requirements.txt

echo "启动后端..."
pm2 delete game-backend 2>/dev/null
pm2 start "venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "game-backend"
echo "✅ 后端部署完成"

# 3. 配置PM2开机自启
echo ""
echo "========================================="
echo "3️⃣ 配置PM2开机自启"
echo "========================================="
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "⚠️  请复制上面输出的命令并执行，然后运行："
echo "   systemctl daemon-reload"
echo "   systemctl enable pm2-root"
echo "   systemctl start pm2-root"
echo ""

# 4. 显示状态
echo ""
echo "========================================="
echo "4️⃣ 应用状态"
echo "========================================="
pm2 list

echo ""
echo "========================================="
echo "✅ 部署完成"
echo "========================================="
echo ""
echo "📝 后续操作："
echo "1. 检查应用状态：pm2 list"
echo "2. 查看日志：pm2 logs"
echo "3. 访问游戏：https://你的域名"
echo ""
