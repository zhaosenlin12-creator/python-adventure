#!/bin/bash
# 游戏服务器部署脚本
# 用法: chmod +x deploy.sh && ./deploy.sh

echo "========================================"
echo "  游戏部署脚本 - game.codebn.cn"
echo "========================================"
echo ""

# 配置
APP_NAME="game"
APP_DIR="/www/wwwroot/game"
PM2_PATH="/www/server/nodejs/v20.19.6/bin"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目目录运行此脚本${NC}"
    exit 1
fi

# 步骤1: 检查Node.js
echo -e "${YELLOW}[1/4] 检查Node.js环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js未安装，请先在宝塔面板安装PM2管理器${NC}"
    exit 1
fi
echo "Node.js版本: $(node -v)"
echo "npm版本: $(npm -v)"

# 步骤2: 安装依赖
echo -e "${YELLOW}[2/4] 安装依赖...${NC}"
export PATH=$PM2_PATH:$PATH
npm install

# 步骤3: 停止旧进程
echo -e "${YELLOW}[3/4] 管理PM2进程...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 delete $APP_NAME 2>/dev/null || true
fi

# 步骤4: 启动应用
echo -e "${YELLOW}[4/4] 启动应用...${NC}"
pm2 start "npm start -- -p 3003" --name "$APP_NAME" --max-memory-restart 500M

# 保存PM2配置
pm2 save

echo ""
echo -e "${GREEN}========================================"
echo "  部署完成!"
echo "========================================${NC}"
echo ""
echo "应用状态:"
pm2 status
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "1. 在宝塔面板配置Nginx反向代理到 http://127.0.0.1:3003"
echo "2. 使用 game 用户配置 pm2-game 开机自启"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  pm2 logs $APP_NAME    # 查看日志"
echo "  pm2 restart $APP_NAME # 重启应用"
echo "  pm2 stop $APP_NAME    # 停止应用"
echo ""
