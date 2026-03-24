#!/bin/bash
# 游戏项目一键重启脚本
# 根据 MAINTENANCE.md v2.4.7 编写

echo "🎮 开始重启游戏项目..."
echo "================================================"

# ===== 第一步：设置Node环境（必须！）=====
echo "🔧 设置Node.js环境..."
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
node --version
npm --version
pm2 --version

# ===== 第二步：停止旧进程 =====
echo ""
echo "⏹️  停止旧进程..."
pm2 stop 3 2>/dev/null  # 前端
pm2 stop 4 2>/dev/null  # 后端

# ===== 第三步：启动后端（PM2 id=4）=====
echo ""
echo "🐍 启动后端服务..."
cd /www/wwwroot/game-backend

# 检查后端代码是否正常
echo "   检查后端代码..."
./venv/bin/python -c "from app.main import app; print('✅ 后端代码检查通过')" || {
  echo "❌ 后端代码有错误，请检查！"
  exit 1
}

# 检查PM2进程4是否存在
if pm2 describe 4 > /dev/null 2>&1; then
  echo "   重启现有PM2进程 (id=4)..."
  pm2 restart 4
else
  echo "   创建新的PM2进程 (id=4)..."
  pm2 start "./venv/bin/python run_prod.py" \
    --name game-backend \
    --cwd /www/wwwroot/game-backend \
    --max-memory-restart 300M
fi

# 等待后端启动
echo "   等待后端启动..."
sleep 5

# 验证后端
echo "   验证后端健康状态..."
if curl -s http://localhost:8000/health > /dev/null; then
  echo "   ✅ 后端启动成功"
else
  echo "   ⚠️  后端健康检查失败，请查看日志: pm2 logs 4"
fi

# ===== 第四步：启动前端（PM2 id=3）=====
echo ""
echo "⚛️  启动前端服务..."
cd /www/wwwroot/game

# 检查PM2进程3是否存在
if pm2 describe 3 > /dev/null 2>&1; then
  echo "   重启现有PM2进程 (id=3)..."
  pm2 restart 3
else
  echo "   创建新的PM2进程 (id=3)..."
  pm2 start npm \
    --name "game-frontend" \
    -- start -- -p 3003 \
    --max-memory-restart 500M
fi

# 等待前端启动
echo "   等待前端启动..."
sleep 3

# 验证前端
echo "   验证前端..."
if curl -s http://localhost:3003 > /dev/null; then
  echo "   ✅ 前端启动成功"
else
  echo "   ⚠️  前端启动失败，请查看日志: pm2 logs 3"
fi

# ===== 第五步：清除Nginx缓存 =====
echo ""
echo "🗑️  清除Nginx缓存..."
rm -rf /www/server/nginx/proxy_cache_dir/* 2>/dev/null
/etc/init.d/nginx reload 2>/dev/null
echo "   ✅ Nginx缓存已清除"

# ===== 第六步：保存PM2配置 =====
echo ""
echo "💾 保存PM2配置..."
pm2 save

# ===== 第七步：显示状态 =====
echo ""
echo "================================================"
echo "✅ 游戏项目重启完成！"
echo "================================================"
echo ""
pm2 list
echo ""
echo "📊 查看日志："
echo "  前端: pm2 logs 3"
echo "  后端: pm2 logs 4"
echo ""
echo "🌐 访问地址："
echo "  游戏: https://game.codebn.cn"
echo "  API: https://game.codebn.cn/api/v1/health"
echo ""
echo "🔍 验证命令："
echo "  curl http://localhost:8000/health"
echo "  curl http://localhost:3003"
