# 🛠️ Python 冒险岛 - 运维手册 v2.4.8

> 本文档包含服务器部署、日常维护、故障排查的完整指南

---

## 🚀 快速运维指南

### 📋 每日必做 (5分钟)

```bash
# 运行每日安全检查
cd /www/wwwroot/game/deploy
bash daily-security-check.sh

# 查看检查结果
tail -50 /www/wwwlogs/security-check.log
```

### 🚨 发现入侵时

```bash
# 立即运行应急清理
cd /www/wwwroot/game/deploy
bash emergency-cleanup.sh
```

### 🔄 服务器重启后

```bash
# 快速恢复应用
cd /www/wwwroot/game/deploy
bash quick-deploy.sh
```

### 📦 更新代码

```bash
cd /www/wwwroot/game/deploy

# 更新前端
bash update-frontend.sh

# 更新后端
bash update-backend.sh
```

### 💾 备份数据

```bash
# 备份数据库
bash /www/wwwroot/game/deploy/backup-database.sh

# 查看备份
ls -lh /www/backup/database/
```

### 🔧 首次设置

```bash
# 一键设置所有脚本
cd /www/wwwroot/game/deploy
bash setup-scripts.sh
```

**📖 详细运维文档**: [每日运维指南](deploy/DAILY-MAINTENANCE-GUIDE.md)

---

## 🆕 v2.4.8 新增功能

### 💰 金币奖励系统
- ✅ 完成关卡获得金币奖励
- ✅ 竞技场挑战获得金币
- ✅ PVP对战获得金币（支持连胜加成）
- ✅ 创意工坊创作者收益（游玩+5💰，点赞+20💰）
- ✅ 金币历史记录查询
- ✅ 防重复发放机制（Transaction ID）

**相关文档**：
- 📖 [用户使用指南](.kiro/specs/coin-reward-system/USER-GUIDE.md)
- 🔌 [API文档](.kiro/specs/coin-reward-system/API-DOCUMENTATION.md)
- 🚀 [部署指南](.kiro/specs/coin-reward-system/DEPLOYMENT-GUIDE.md)

---

## ⚠️ 重要警告

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 更新后端时，绝对不要覆盖服务器的 code_adventure.db 文件！  │
│     这是玩家数据，覆盖后无法恢复！                              │
│     打包前务必删除本地的 .db 文件                               │
│                                                                 │
│  🚨 不要执行 pkill -9 -f "python" 会杀掉宝塔面板！             │
│     只杀端口8000: kill $(lsof -t -i:8000)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器IP | `120.26.114.244` |
| 域名 | `game.codebn.cn` |
| 前端端口 | `3003` (PM2 id=3) |
| 后端端口 | `8000` (PM2 id=4) |
| 当前版本 | v2.4.6 |

### 关键路径

```bash
# ===== Node.js 环境（必须指定版本！）=====
/www/server/nodejs/v20.19.6/bin/node
/www/server/nodejs/v20.19.6/bin/npm
/www/server/nodejs/v20.19.6/bin/pm2

# ===== Python 环境（使用项目虚拟环境！）=====
/www/wwwroot/game-backend/venv/bin/python

# ===== 项目目录 =====
/www/wwwroot/game           # 前端项目
/www/wwwroot/game-backend   # 后端项目

# ===== 数据文件（重要！）=====
/www/wwwroot/game-backend/code_adventure.db  # 玩家数据库
```

---

## 🚀 前端部署（完整步骤）

### 本地打包
```powershell
# Windows PowerShell
npm run build
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
Compress-Archive -Path ".next", "public", "package.json", "next.config.ts" -DestinationPath "game-v2.3.0-$timestamp-full.zip" -Force
```

### 服务器部署
```bash
# ===== 第一步：设置Node环境（必须！）=====
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# ===== 第二步：进入前端目录 =====
cd /www/wwwroot/game

# ===== 第三步：停止PM2进程 =====
pm2 stop game

# ===== 第四步：清理旧文件 =====
rm -rf .next
rm -f package.json package-lock.json next.config.ts

# ===== 第五步：上传并解压新版本 =====
# 先通过宝塔面板上传zip文件到 /www/wwwroot/game/
unzip -o game-v2.4.7-20260119-frontend.zip

# ===== 第六步：重启PM2（必须指定端口3003！）=====
pm2 delete game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M

# ===== 第七步：保存PM2配置 =====
pm2 save

# ===== 第八步：清除Nginx缓存（重要！）=====
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload

# ===== 第九步：验证 =====
sleep 3
curl -s http://localhost:3003 | head -20
netstat -tlnp | grep 3003

# ===== 第十步：清理zip文件 =====
rm -f game-v2.4.7-20260119-frontend.zip
```

### 前端部署检查清单
- [ ] `npm run build` 构建成功
- [ ] 打包文件包含：`.next`, `public`, `package.json`, `next.config.ts`
- [ ] 使用指定Node版本 `export PATH=/www/server/nodejs/v20.19.6/bin:$PATH`
- [ ] 清理旧的 `.next` 目录
- [ ] **启动时必须指定端口3003**：`pm2 start "npm start -- -p 3003" --name game`
- [ ] `pm2 save` 保存配置
- [ ] **清除 Nginx 缓存**（必须！）
- [ ] 验证端口监听：`netstat -tlnp | grep 3003`
- [ ] 验证页面正常加载

---

## 🐍 后端部署（完整步骤）

### 服务器部署
```bash
cd /www/wwwroot/game-backend

# ===== 第一步：备份数据库（重要！）=====
cp code_adventure.db code_adventure.db.backup.$(date +%Y%m%d%H%M)

# ===== 第二步：上传后端文件 =====
# 通过宝塔面板上传修改的文件到对应目录

# ===== 第三步：验证代码无语法错误（重要！）=====
./venv/bin/python -c "from app.main import app; print('✅ 代码检查通过')"

# ===== 第四步：如有数据库迁移脚本，先运行 =====
# ./venv/bin/python migrate_xxx.py

# ===== 第五步：查看PM2后端日志（可选，排查问题用）=====
pm2 logs game-backend --lines 20

# ===== 第六步：重启后端 =====
pm2 restart game-backend

# ===== 第七步：保存PM2配置 =====
pm2 save

# ===== 第八步：等待启动完成并验证 =====
sleep 5
curl http://localhost:8000/health

# ===== 如果PM2重启失败，手动启动 =====
# pm2 stop game-backend
# pm2 delete game-backend
# ./venv/bin/python run_prod.py &
# 或者重新用PM2管理：
# pm2 start "./venv/bin/python run_prod.py" --name game-backend --max-memory-restart 300M
# pm2 save
```

### 后端部署检查清单
- [ ] **删除本地 `backend/code_adventure.db`**（打包前）
- [ ] **备份服务器数据库**
- [ ] 上传代码文件到对应目录
- [ ] **运行代码检查** `./venv/bin/python -c "from app.main import app; print('OK')"`
- [ ] 如有迁移脚本，先运行迁移
- [ ] `pm2 restart game-backend` 重启后端
- [ ] `pm2 save` 保存配置
- [ ] `curl http://localhost:8000/health` 验证健康检查
- [ ] 测试关键API（登录、进度同步等）
- [ ] `pm2 restart 4` 重启后端
- [ ] `curl http://localhost:8000/health` 验证健康检查
- [ ] 测试关键API（登录、进度同步等）

### 后端启动失败排查
```bash
# 1. 查看PM2日志
pm2 logs 4 --lines 50

# 2. 检查代码是否有语法错误
cd /www/wwwroot/game-backend
./venv/bin/python -c "from app.main import app; print('OK')"

# 3. 检查端口是否被占用
lsof -i:8000

# 4. 如果端口被占用，杀掉进程
kill $(lsof -t -i:8000)

# 5. 手动启动测试（看详细错误）
./venv/bin/python run_prod.py

# 6. 确认启动成功后，用PM2管理
pm2 restart 4
# 或重新添加
pm2 delete 4
pm2 start "./venv/bin/python run_prod.py" --name game-backend --cwd /www/wwwroot/game-backend
pm2 save
```

---

## 🔧 日常运维

### PM2 进程管理
```bash
# 设置环境（每次SSH登录后执行）
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 查看所有进程
pm2 list

# 重启前端（使用名称）
pm2 restart game

# 重启后端（使用名称）
pm2 restart game-backend

# 查看前端日志
pm2 logs game --lines 100

# 查看后端日志
pm2 logs game-backend --lines 100

# 保存PM2配置（重要！修改后必须执行）
pm2 save

# 设置开机自启（首次部署时执行一次）
pm2 startup
# 复制输出的命令并执行，类似：
# sudo env PATH=$PATH:/www/server/nodejs/v20.19.6/bin pm2 startup systemd -u root --hp /root
```

### Nginx 缓存管理
```bash
# 清除缓存（更新后必做！）
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
```

### 数据库备份
```bash
cd /www/wwwroot/game-backend
cp code_adventure.db code_adventure.db.backup.$(date +%Y%m%d)
```

---

## 📊 服务器资源监控与优化

> 当 CPU/内存占用异常高时，按以下步骤排查

### 快速诊断命令
```bash
# ===== 1. 查看整体资源使用 =====
top -bn1 | head -20

# ===== 2. 查看内存使用详情 =====
free -h

# ===== 3. 查看磁盘使用 =====
df -h

# ===== 4. 查看PM2进程资源占用 =====
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 monit

# ===== 5. 查看所有进程按内存排序（前20） =====
ps aux --sort=-%mem | head -20

# ===== 6. 查看所有进程按CPU排序（前20） =====
ps aux --sort=-%cpu | head -20

# ===== 7. 查看Node.js进程 =====
ps aux | grep node

# ===== 8. 查看Python进程 =====
ps aux | grep python
```

### PM2 内存泄漏检查与修复
```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# ===== 查看PM2进程详细信息 =====
pm2 show 3  # 前端
pm2 show 4  # 后端

# ===== 查看PM2内存使用历史 =====
pm2 monit

# ===== 如果内存持续增长，重启进程 =====
pm2 restart 3  # 重启前端
pm2 restart 4  # 重启后端

# ===== 设置PM2自动重启（内存超过阈值） =====
# 前端：内存超过500MB自动重启
pm2 delete 3
pm2 start npm --name "game-frontend" -- start -- -p 3003 --max-memory-restart 500M
pm2 save

# 后端：内存超过300MB自动重启
pm2 delete 4
pm2 start "./venv/bin/python run_prod.py" --name "game-backend" --cwd /www/wwwroot/game-backend --max-memory-restart 300M
pm2 save
```

### 清理系统缓存
```bash
# ===== 清理Linux系统缓存（释放内存） =====
sync && echo 3 > /proc/sys/vm/drop_caches

# ===== 清理Nginx缓存 =====
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload

# ===== 清理PM2日志（可能占用大量磁盘） =====
pm2 flush

# ===== 清理旧的日志文件 =====
find /www/wwwlogs -name "*.log" -mtime +7 -delete
```

### 数据库优化
```bash
cd /www/wwwroot/game-backend

# ===== 查看数据库大小 =====
ls -lh code_adventure.db

# ===== SQLite 数据库优化（压缩空间） =====
./venv/bin/python -c "
import sqlite3
conn = sqlite3.connect('code_adventure.db')
conn.execute('VACUUM')
conn.close()
print('✅ 数据库优化完成')
"

# ===== 查看各表数据量 =====
./venv/bin/python -c "
import sqlite3
conn = sqlite3.connect('code_adventure.db')
cursor = conn.cursor()
cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")
tables = cursor.fetchall()
for table in tables:
    cursor.execute(f'SELECT COUNT(*) FROM {table[0]}')
    count = cursor.fetchone()[0]
    print(f'{table[0]}: {count} 条记录')
conn.close()
"

# ===== 清理过期的聊天记录（可选，保留7天） =====
./venv/bin/python cleanup_chat.py
```

### 检查僵尸进程
```bash
# ===== 查找僵尸进程 =====
ps aux | grep -w Z

# ===== 查找孤儿Python进程 =====
ps aux | grep python | grep -v grep | grep -v venv

# ===== 杀掉多余的Python进程（保留PM2管理的） =====
# 先查看哪些需要杀
ps aux | grep "python run_prod.py" | grep -v grep

# 如果有多个，只保留一个
# kill <多余的PID>
```

### WebSocket 连接检查
```bash
# ===== 查看当前WebSocket连接数 =====
netstat -an | grep :8000 | grep ESTABLISHED | wc -l

# ===== 查看所有8000端口连接 =====
netstat -an | grep :8000

# ===== 如果连接数异常多，可能有连接泄漏 =====
# 重启后端释放连接
pm2 restart 4
```

### 定期维护脚本
```bash
#!/bin/bash
# 保存为 /www/wwwroot/maintenance.sh
# 每周运行一次: crontab -e 添加 0 3 * * 0 /www/wwwroot/maintenance.sh

export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

echo "===== $(date) 开始维护 ====="

# 1. 清理PM2日志
pm2 flush
echo "✅ PM2日志已清理"

# 2. 清理Nginx缓存
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
echo "✅ Nginx缓存已清理"

# 3. 清理旧日志
find /www/wwwlogs -name "*.log" -mtime +7 -delete
echo "✅ 旧日志已清理"

# 4. 数据库优化
cd /www/wwwroot/game-backend
./venv/bin/python -c "import sqlite3; conn = sqlite3.connect('code_adventure.db'); conn.execute('VACUUM'); conn.close()"
echo "✅ 数据库已优化"

# 5. 重启服务（释放内存）
pm2 restart all
echo "✅ 服务已重启"

# 6. 清理系统缓存
sync && echo 3 > /proc/sys/vm/drop_caches
echo "✅ 系统缓存已清理"

echo "===== 维护完成 ====="
```

### 资源占用异常高的常见原因

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| CPU 持续高 | 死循环/无限递归 | 查看日志，重启服务 |
| 内存持续增长 | 内存泄漏 | 设置 `--max-memory-restart` |
| 内存突然飙高 | 大量并发请求 | 检查是否被攻击，限流 |
| 磁盘占用高 | 日志文件过大 | `pm2 flush` + 清理旧日志 |
| 连接数过多 | WebSocket泄漏 | 重启后端 |
| 数据库慢 | 表数据过多 | VACUUM + 清理旧数据 |

---

## � 紧障急故障恢复

### 场景1：PM2进程全部丢失（服务器重启后）

**症状**：`pm2 list` 显示为空，网站无法访问

**快速恢复步骤**：

```bash
# ===== 第一步：设置环境 =====
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# ===== 第二步：清理端口占用 =====
kill $(lsof -t -i:3003) 2>/dev/null  # 前端端口
kill $(lsof -t -i:8000) 2>/dev/null  # 后端端口

# ===== 第三步：启动后端 =====
cd /www/wwwroot/game-backend
pm2 start "./venv/bin/python run_prod.py" \
  --name game-backend \
  --max-memory-restart 300M

# 等待后端启动
sleep 5
curl http://localhost:8000/health

# ===== 第四步：启动前端（必须指定端口3003！）=====
cd /www/wwwroot/game
pm2 start "npm start -- -p 3003" \
  --name game \
  --max-memory-restart 500M

# 等待前端启动
sleep 5
curl http://localhost:3003

# ===== 第五步：保存配置并设置开机自启 =====
pm2 save
pm2 startup
# 复制输出的命令并执行

# ===== 第六步：清除Nginx缓存 =====
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx restart

# ===== 第七步：验证 =====
pm2 list
netstat -tlnp | grep -E "3003|8000"
```

### 场景2：前端502错误

**症状**：访问网站显示 `502 Bad Gateway`

**排查步骤**：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 1. 检查PM2进程状态
pm2 list

# 2. 检查前端是否在正确端口（必须是3003）
netstat -tlnp | grep 3003

# 3. 如果前端在3000端口，需要重启并指定3003
pm2 delete game
cd /www/wwwroot/game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M
pm2 save

# 4. 重启Nginx
/etc/init.d/nginx restart
```

### 场景3：前端进程反复重启（errored状态）

**症状**：`pm2 list` 显示前端 `errored`，重启次数不断增加

**解决步骤**：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 1. 查看错误日志
pm2 logs game --lines 50 --err

# 2. 常见错误：端口被占用
lsof -i:3003
kill $(lsof -t -i:3003) 2>/dev/null

# 3. 常见错误：.next目录缺失或损坏
cd /www/wwwroot/game
ls -la .next  # 检查是否存在
# 如果不存在，需要重新部署前端

# 4. 删除错误进程并重启
pm2 delete game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M
pm2 save
```

### 场景4：多个重复进程

**症状**：`pm2 list` 显示多个 game 或 game-backend 进程

**清理步骤**：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 方式1：按名称删除所有重复进程
pm2 delete game game-backend game-frontend 2>/dev/null

# 方式2：按ID删除（如果名称不同）
pm2 delete 3 4 5 6 7 8 9 10 11 2>/dev/null

# 清理端口
kill $(lsof -t -i:3003) 2>/dev/null
kill $(lsof -t -i:8000) 2>/dev/null

# 重新启动（参考场景1）
```

---

### 前端白屏/404
```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list                                    # 检查进程状态
pm2 logs 3 --lines 50                       # 查看错误日志
rm -rf /www/server/nginx/proxy_cache_dir/*  # 清缓存
/etc/init.d/nginx reload
pm2 restart 3
```

### 后端API无响应 (503/502)
```bash
# 检查端口占用
lsof -i:8000

# 测试本地连接
curl http://localhost:8000/health

# 如果端口被占用或进程异常，重启
pm2 restart 4

# 如果PM2不工作，手动启动
kill $(lsof -t -i:8000) 2>/dev/null
cd /www/wwwroot/game-backend
nohup ./venv/bin/python run_prod.py > /dev/null 2>&1 &
```

### 版本号没更新
```bash
# Nginx缓存问题
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
```

### 创意工坊加载失败
```bash
# 检查custom_levels表是否存在
cd /www/wwwroot/game-backend
./venv/bin/python -c "
from app.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print('Tables:', tables)
print('custom_levels exists:', 'custom_levels' in tables)
"

# 如果表不存在，运行迁移脚本
./venv/bin/python migrate_custom_levels.py
```

---

## 🔄 回滚方法

### 前端回滚
```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game
# 如果有备份
rm -rf .next && mv .next.bak .next
pm2 restart 3
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
```

### 后端回滚
```bash
cd /www/wwwroot/game-backend
# 恢复数据库
cp code_adventure.db.backup.YYYYMMDDHHMM code_adventure.db
pm2 restart 4
```

---

## 📝 本地开发

### 启动开发环境
```bash
# 终端1 - 后端
cd backend
pip install -r requirements.txt
python init_db_quick.py  # 首次运行
python run.py

# 终端2 - 前端
npm install
npm run dev
```

### 开发环境地址
| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |

### 代码检查（发布前必做）
```powershell
# 前端诊断
# 使用 getDiagnostics 工具检查修改的文件

# 前端构建测试
npm run build

# 后端模块测试
cd backend
python -c "from app.main import app; print('OK')"
```

---

## 📋 版本发布检查清单

### 前端发布
- [ ] `npm run build` 构建成功，无错误
- [ ] 打包文件：`.next`, `public`, `package.json`, `next.config.ts`
- [ ] 上传到服务器 `/www/wwwroot/game/`
- [ ] 使用指定Node版本执行命令
- [ ] `pm2 restart 3`
- [ ] **清除 Nginx 缓存**
- [ ] 验证页面正常

### 后端发布
- [ ] **删除本地 `backend/code_adventure.db`**
- [ ] **备份服务器数据库**
- [ ] 上传代码文件
- [ ] `pm2 restart 4`
- [ ] `curl http://localhost:8000/health` 验证
- [ ] 测试关键功能（登录、进度同步、PVP等）

---

## 🔒 服务器安全防护

> 2026-01-24 更新：服务器被入侵3次后的完整安全加固方案

### 🚨 安全现状检查

**已完成的安全措施**：
- ✅ MySQL 密码已修改为强密码
- ✅ 宝塔面板已限制 IP 访问
- ✅ 阿里云安全组只开放 80, 443, 8888 端口
- ⚠️ **MySQL 仍监听公网** - 需要立即修复！

### 🔧 关键安全修复：MySQL 只监听本地

**⚠️ 这是最重要的安全措施！MySQL 监听公网是被入侵的主要原因！**

#### 方法1：通过宝塔面板修改（推荐 ⭐）

1. **登录宝塔面板**
   ```
   访问：http://120.26.114.244:8888
   输入用户名密码
   ```

2. **找到 MySQL 设置**
   ```
   左侧菜单 → 软件商店 → 已安装
   → 找到 MySQL → 点击"设置"
   ```

3. **修改配置文件**
   ```
   设置 → 配置修改 → 找到 [mysqld] 部分
   ```

4. **添加或修改这一行**
   ```ini
   [mysqld]
   bind-address = 127.0.0.1
   ```

5. **保存并重启 MySQL**
   ```
   点击"保存" → 点击"重启"
   ```

6. **验证修复（在宝塔终端）**
   ```bash
   netstat -tlnp | grep 3306
   # 应该显示: 127.0.0.1:3306 (而不是 :::3306)
   ```

#### 方法2：命令行修改

```bash
# 检查当前监听状态
netstat -tlnp | grep 3306

# 如果显示 :::3306 或 0.0.0.0:3306，需要修改配置
vi /etc/my.cnf

# 在 [mysqld] 部分添加
bind-address = 127.0.0.1

# 重启 MySQL
systemctl restart mysqld

# 验证
netstat -tlnp | grep 3306
# 应该显示: 127.0.0.1:3306
```

#### 修复后更新后端配置

```bash
# 编辑后端 .env 文件
vi /www/wwwroot/game-backend/.env

# 更新 MySQL 密码为新密码
DB_PASSWORD=你的新密码

# 重启后端
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 restart game-backend
pm2 save
```

### 📋 每日安全检查（5分钟）

**新增的安全脚本**（位于 `deploy/` 目录）：
- `daily-security-check.sh` - 每日安全检查（自动检测入侵）
- `emergency-cleanup.sh` - 应急清理（发现入侵时执行）
- `quick-deploy.sh` - 快速部署（服务器重启后恢复）
- `update-frontend.sh` - 更新前端代码
- `update-backend.sh` - 更新后端代码
- `backup-database.sh` - 备份数据库

**每日检查命令**：

```bash
# 运行安全检查
bash /www/wwwroot/game/deploy/daily-security-check.sh

# 查看结果
tail -50 /www/wwwlogs/security-check.log

# 如果发现入侵，立即清理
bash /www/wwwroot/game/deploy/emergency-cleanup.sh
```

**检查项目**：
1. ✅ 挖矿进程检测
2. ✅ CPU 使用率检测
3. ✅ 内存使用率检测
4. ✅ /dev/shm 可疑文件检测（自动清理）
5. ✅ 定时任务检测
6. ✅ MySQL 监听地址检测
7. ✅ 异常网络连接检测
8. ✅ 应用状态检测
9. ✅ 磁盘空间检测
10. ✅ 最近登录记录检测

### 🚨 发现入侵时的应急处理

```bash
# 1. 立即运行应急清理
bash /www/wwwroot/game/deploy/emergency-cleanup.sh

# 2. 查看清理结果
tail -50 /www/wwwlogs/security-alert.log

# 3. 修改所有密码
# - MySQL 密码（通过宝塔面板）
# - 宝塔面板密码
# - 阿里云控制台密码

# 4. 重新运行安全检查
bash /www/wwwroot/game/deploy/daily-security-check.sh
```

### 🔄 服务器重启后快速恢复

```bash
# 一键恢复所有服务
bash /www/wwwroot/game/deploy/quick-deploy.sh

# 或手动恢复
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 resurrect
pm2 list
```

### 🛡️ 首次安全设置（一次性）

```bash
# 运行一键设置脚本
bash /www/wwwroot/game/deploy/setup-scripts.sh

# 这会自动：
# 1. 设置所有脚本的执行权限
# 2. 创建日志目录
# 3. 配置 PM2 开机自启
# 4. 运行首次安全检查
```

### 安全脚本部署（旧版，已被上面的新脚本替代）

项目已包含两个安全脚本，位于 `deploy/` 目录：
- `deploy/security_check.sh` - 自动检测挖矿程序、可疑文件、异常进程
- `deploy/kill_miner.sh` - 发现入侵后一键清理

**部署步骤：**

```bash
# ===== 第一步：上传脚本到服务器 =====
# 通过宝塔面板上传以下文件到 /www/wwwroot/
# - deploy/security_check.sh  /www/wwwroot/security_check.sh
# - deploy/kill_miner.sh  /www/wwwroot/kill_miner.sh

# ===== 第二步：设置执行权限 =====
chmod +x /www/wwwroot/security_check.sh
chmod +x /www/wwwroot/kill_miner.sh

# ===== 第三步：配置定时任务（每小时自动检测） =====
crontab -e
# 添加以下行：
0 * * * * /www/wwwroot/security_check.sh

# ===== 第四步：验证脚本可用 =====
/www/wwwroot/security_check.sh
cat /www/wwwlogs/security_check.log
```

### 发现入侵后快速清理（旧版）

```bash
# 一键清理挖矿程序
/www/wwwroot/kill_miner.sh

# 手动清理恶意cron任务（重要！）
crontab -l | grep -v "sys-update-daemon" | crontab -

# 验证cron任务已清理
crontab -l

# 清理后检查 CPU 是否恢复正常
top -bn1 | head -5
```

### 手动检测命令（日常巡检）

```bash
# 检查挖矿进程
ps aux | grep -iE "monero|xmr|gulf|mine|cryptonight|kdevtmpfsi|kinsing" | grep -v grep

# 检查 /dev/shm 可疑文件
ls -la /dev/shm/

# 检查 CPU 占用最高的进程
ps aux --sort=-%cpu | head -10

# 检查可疑网络连接
netstat -an | grep -E ":3333|:4444|:5555|:7777|:14444" | grep ESTABLISHED

# 查看安全检测日志
tail -50 /www/wwwlogs/security-check.log
```

### 关于 /dev/shm 中的宝塔文件

**正常文件（不用担心）**：
- `.panelTask.pl` - 宝塔面板任务文件
- `.start_task.pl` - 宝塔面板启动任务

这些文件是宝塔面板的正常文件，安全检查脚本会自动识别并清理，不会影响宝塔面板运行。

### 宝塔面板安全设置

**通过宝塔面板 GUI 设置**：

1. **开启安全入口（随机路径）**
   ```
   宝塔面板 → 安全 → 面板设置 → 安全入口
   ```

2. **绑定授权IP（只允许你的IP访问面板）**
   ```
   宝塔面板 → 安全 → 面板设置 → 授权IP
   ```

3. **修改面板端口（不要用默认8888）**
   ```
   宝塔面板 → 安全 → 面板设置 → 面板端口
   ```

4. **开启面板SSL**
   ```
   宝塔面板 → 安全 → 面板设置 → 面板SSL
   ```

5. **开启BasicAuth认证（双重验证）**
   ```
   宝塔面板 → 安全 → 面板设置 → BasicAuth认证
   ```

**命令行方式**：

```bash
# 1. 开启宝塔安全入口（随机路径）
bt default

# 2. 绑定授权IP（只允许你的IP访问面板）
# 宝塔面板 -> 安全 -> 面板设置 -> 授权IP

# 3. 修改面板端口（不要用默认8888）
# 宝塔面板 -> 安全 -> 面板设置 -> 面板端口

# 4. 开启面板SSL
# 宝塔面板 -> 安全 -> 面板设置 -> 面板SSL

# 5. 开启BasicAuth认证（双重验证）
# 宝塔面板 -> 安全 -> 面板设置 -> BasicAuth认证
```

### 阿里云安全组配置

只开放必要端口，其他全部关闭：

| 端口 | 用途 | 建议 |
|------|------|------|
| 80 | HTTP | ✅ 开放 |
| 443 | HTTPS | ✅ 开放 |
| 8081 | SSH（已改端口） | ⚠️ 限制IP |
| 宝塔端口 | 宝塔面板 | ⚠️ 限制IP |
| 3306 | MySQL | ❌ 关闭公网 |
| 6379 | Redis | ❌ 关闭公网 |

### 文件权限加固

```bash
# 1. 禁止 /dev/shm 执行（防止挖矿程序）
mount -o remount,noexec /dev/shm

# 2. 永久生效（编辑 /etc/fstab）
# tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0

# 3. 设置网站目录权限
chown -R www:www /www/wwwroot
chmod -R 755 /www/wwwroot
```

### 定期安全检查清单

每周执行一次：

```bash
# 1. 检查异常进程
ps aux --sort=-%cpu | head -10

# 2. 检查异常连接
netstat -tlnp
netstat -an | grep ESTABLISHED | wc -l

# 3. 检查最近修改的文件
find /www/wwwroot -name "*.php" -mtime -7
find /www/wwwroot -name "*.sh" -mtime -7

# 4. 检查 crontab
crontab -l

# 5. 查看安全检测日志
tail -100 /www/wwwlogs/security_check.log
```

---
## 📜 版本历史

### v2.4.7 (2026-01-14) - 当前版本
**错误监控系统**
- 🔍 自建前端错误监控，自动收集JS错误、Promise rejection、React组件崩溃
- 🎨 友好错误提示UI，用户遇到崩溃时显示刷新按钮而非白屏
- 📊 错误统计API，可查看错误趋势和Top错误
- 🛡️ 速率限制（每IP每分钟10条），防止错误风暴

**查看错误日志**
```bash
# 查看最近7天错误统计
curl https://game.codebn.cn/api/v1/error-logs/stats

# 查看错误列表
curl "https://game.codebn.cn/api/v1/error-logs/list?page=1&page_size=20"

# 清理30天前的旧日志
curl -X DELETE "https://game.codebn.cn/api/v1/error-logs/cleanup?days=30"
```

**新增文件**
- `backend/app/models/error_log.py` - 错误日志模型
- `backend/app/schemas/error_log.py` - 错误日志Schema
- `backend/app/api/v1/error_logs.py` - 错误日志API
- `lib/services/errorMonitor.ts` - 前端错误监控服务
- `components/common/ErrorBoundary.tsx` - React错误边界
- `components/common/ErrorFallback.tsx` - 友好错误提示UI

### v2.4.6 (2026-01-07)
**稳定性增强**
- � 增强加关卡加载的错误处理和重试机制（3次重试，20秒超时）
- � 修优化错误提示，过滤技术性错误信息（如 cannot read property）
- � 社区关e卡分页加载防重复数据
- 🔧 网络请求增加离线检测和超时控制

**用户体验**
- 📝 所有加载失败提示都引导用户刷新页面
- 📝 错误信息更友好，不再显示技术性错误

**本次更新无需数据库迁移**

### v2.4.5 (2026-01-02)
**Bug修复**
- 🐛 修复加载关卡时偶发的 `setBounds null` 错误
- 🐛 修复加载关卡时偶发的 `add null` 错误
- 🔒 为 LevelEditorScene 所有关键方法添加安全检查

**运维增强**
- 📊 新增服务器资源监控指令
- 📊 新增 PM2 内存泄漏检查与修复指南
- 📊 新增定期维护脚本模板
- 📊 新增资源占用异常排查表

### v2.4.4 (2026-01-02)
**Bug修复**
- 🐛 完全重写 `handleExitTest` 函数，修复退出测试模式黑屏问题
- 🔄 通过销毁并重新创建 Phaser 游戏实例解决场景状态污染

**用户体验**
- 🔄 编辑器头部添加刷新按钮（非测试模式也可用）
- 🔄 测试模式工具栏保留刷新按钮

### v2.4.0 (2026-01-02)
**新功能**
- 📚 全局云端题库系统（所有创意工坊关卡共享）
- 🗑️ 批量选中删除题目功能
- 🔄 测试模式退出卡住检测+恢复机制

**用户体验优化**
- 🎯 AI出题超时/失败友好提示
- 🔄 创意工坊加载失败友好提示+刷新按钮
- 🐛 修复魔法学校关卡题目设定Bug

**后端新增**
- `app/models/user_question.py` - 用户题库模型
- `app/schemas/user_question.py` - 题库Schema
- `app/api/v1/user_questions.py` - 题库API
- `migrate_user_questions.py` - 数据库迁移脚本

**部署后运行**
```bash
cd /www/wwwroot/game-backend
./venv/bin/python migrate_user_questions.py
```

### v2.3.0 (2024-12-30)
**新功能**
- 🤖 AI智能出题（DeepSeek API集成）
- 🎨 AI出题UI优化（新年主题配色）
- 🎮 PVP答题题库扩充（80→160道）

**安全增强**
- 🔒 JWT Token黑名单机制
- 🔒 Token过期主动验证
- 🔒 WebSocket身份验证

**性能优化**
- 后端日志级别优化（WARNING）
- 只记录错误响应，减少I/O

### v2.2.0
- 创意工坊关卡编辑器
- 年龄分组战役系统
- 移动端适配优化

### v2.1.x
- PVP三轮制对战
- 开放世界聊天
- 排行榜系统

---

<p align="center">📅 最后更新：2026-01-14 | 版本：v2.4.7</p>


----------------
服务器检测入侵脚本的指令

# 设置执行权限
chmod +x /www/wwwroot/security_check.sh
chmod +x /www/wwwroot/kill_miner.sh

# 测试检测脚本
/www/wwwroot/security_check.sh

# 查看检测结果
cat /www/wwwlogs/security_check.log

# 配置定时任务（每小时自动检测）
crontab -e



查看检测日志：

tail -50 /www/wwwlogs/security_check.log
发现入侵时一键清理：

/www/wwwroot/kill_miner.sh



清理指令

# 1. 杀掉挖矿进程
pkill -9 -f "/dev/shm"
pkill -9 -f "monero"
pkill -9 -f "xmr"
pkill -9 -f "gulf"
pkill -9 -f "mine"

# 2. 删除挖矿文件
rm -rf /dev/shm/.x
rm -rf /dev/shm/.*

# 3. 验证
ls -la /dev/shm/
top -bn1 | head -5


 防止入侵的关键措施
# 立即生效
mount -o remount,noexec,nosuid /dev/shm

# 永久生效（编辑 /etc/fstab，添加或修改这行）
echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab




# 查看当前内存
free -h

# 查看各进程内存占用
ps aux --sort=-%mem | head -15





如果PM2进程完全丢失
# 设置环境
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 重新创建后端进程
cd /www/wwwroot/game-backend
pm2 start "./venv/bin/python run_prod.py" \
  --name game-backend \
  --cwd /www/wwwroot/game-backend \
  --max-memory-restart 300M

# 重新创建前端进程
cd /www/wwwroot/game
pm2 start npm \
  --name "game-frontend" \
  -- start -- -p 3003 \
  --max-memory-restart 500M

# 保存并设置开机自启
pm2 save
pm2 startup
# 复制输出的命令并执行







###清理之前进程重启

export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 清理
pm2 delete game game-backend 2>/dev/null
kill $(lsof -t -i:3000) 2>/dev/null
kill $(lsof -t -i:3003) 2>/dev/null
kill $(lsof -t -i:8000) 2>/dev/null

sleep 2

# 启动后端
cd /www/wwwroot/game-backend
pm2 start "./venv/bin/python run_prod.py" --name game-backend --max-memory-restart 300M

sleep 3

# 启动前端（使用 -p 参数指定端口）
cd /www/wwwroot/game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M

sleep 3

# 验证
curl http://localhost:8000/health
curl http://localhost:3003

# 保存
pm2 save

# 重启Nginx
/etc/init.d/nginx restart

# 查看
pm2 list
netstat -tlnp | grep -E "3003|8000"


---

## 🔄 PM2 开机自启配置

### 首次配置（只需执行一次）

**⚠️ 重要：必须按照以下步骤操作，否则可能失败**

```bash
# ===== 第一步：设置环境 =====
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# ===== 第二步：确保PM2进程正常运行 =====
pm2 list
# 应该看到 game、game-backend、camp-pk-system 三个进程

# ===== 第三步：保存当前PM2进程列表 =====
pm2 save
# 输出：Successfully saved in /root/.pm2/dump.pm2

# ===== 第四步：清理旧的启动配置（如果有）=====
pm2 unstartup 2>/dev/null
systemctl disable pm2-root 2>/dev/null
rm -f /etc/systemd/system/pm2-root.service

# ===== 第五步：生成新的systemd服务 =====
pm2 startup systemd -u root --hp /root

# 会输出类似这样的命令：
# [PM2] You have to run this command as root. Execute the following command:
# sudo env PATH=$PATH:/www/server/nodejs/v20.19.6/bin /www/server/nodejs/v20.19.6/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# ===== 第六步：复制上面输出的 sudo 命令并执行 =====
# 直接复制粘贴执行即可

# ===== 第七步：重新加载systemd =====
systemctl daemon-reload

# ===== 第八步：启用服务 =====
systemctl enable pm2-root

# ===== 第九步：启动服务（测试）=====
systemctl start pm2-root

# ===== 第十步：验证配置 =====
systemctl status pm2-root
# 应该看到：Active: active (running)

# ===== 第十一步：再次保存PM2配置 =====
pm2 save
```

### 验证开机自启是否生效

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 1. 查看systemd服务状态
systemctl status pm2-root
# 应该显示：Active: active (running)

# 2. 查看是否已启用开机自启
systemctl is-enabled pm2-root
# 应该返回：enabled

# 3. 查看PM2保存的进程列表
cat ~/.pm2/dump.pm2
# 应该看到所有进程的配置

# 4. 测试恢复功能（可选）
pm2 kill                    # 杀掉所有PM2进程
systemctl start pm2-root    # 启动systemd服务
pm2 list                    # 查看进程是否恢复
```

### 常见问题排查

**问题1：systemctl status pm2-root 显示 failed**

```bash
# 查看详细错误日志
journalctl -u pm2-root -n 50

# 重新配置
pm2 unstartup
pm2 startup systemd -u root --hp /root
# 执行输出的 sudo 命令
systemctl daemon-reload
systemctl enable pm2-root
systemctl start pm2-root
pm2 save
```

**问题2：服务器重启后进程没有恢复**

```bash
# 检查服务是否启用
systemctl is-enabled pm2-root

# 检查服务状态
systemctl status pm2-root

# 检查PM2保存的配置
cat ~/.pm2/dump.pm2

# 如果配置文件为空，重新保存
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list
pm2 save
```

**问题3：pm2 save 后配置没有生效**

```bash
# 确保使用正确的Node版本
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 重新保存
pm2 save

# 重启systemd服务
systemctl restart pm2-root
```

### 更新PM2进程后必须保存

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 每次添加、删除、修改PM2进程后，必须执行：
pm2 save

# 这样服务器重启后才会自动恢复这些进程
```

### 取消开机自启（如果需要）

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 取消开机自启
pm2 unstartup

# 禁用systemd服务
systemctl disable pm2-root

# 停止服务
systemctl stop pm2-root
```

### 完整的一键配置脚本

```bash
#!/bin/bash
# PM2开机自启一键配置脚本

export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

echo "🔧 配置PM2开机自启..."

# 1. 检查PM2进程
echo "📋 当前PM2进程："
pm2 list

# 2. 保存进程列表
echo ""
echo "💾 保存PM2进程列表..."
pm2 save

# 3. 清理旧配置
echo ""
echo "🗑️  清理旧配置..."
pm2 unstartup 2>/dev/null
systemctl disable pm2-root 2>/dev/null
rm -f /etc/systemd/system/pm2-root.service

# 4. 生成新配置
echo ""
echo "⚙️  生成systemd服务..."
pm2 startup systemd -u root --hp /root

echo ""
echo "⚠️  请复制上面输出的 sudo 命令并执行"
echo ""
echo "执行完成后，继续运行以下命令："
echo "  systemctl daemon-reload"
echo "  systemctl enable pm2-root"
echo "  systemctl start pm2-root"
echo "  pm2 save"
echo "  systemctl status pm2-root"
```

---

## 📝 快速参考命令

### 一键重启所有游戏服务

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 restart game game-backend
pm2 save
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
```

### 一键查看所有日志

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
echo "=== 前端日志 ==="
pm2 logs game --lines 20 --nostream
echo ""
echo "=== 后端日志 ==="
pm2 logs game-backend --lines 20 --nostream
```



mysql -u root -p teaching_platform < /www/wwwroot/teaching-platform/backend/database/teaching_platform_2026-01-24_01-52-42_mysql_data_Wr2S3.sql



### 一键健康检查

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
echo "=== PM2进程状态 ==="
pm2 list
echo ""
echo "=== 端口监听 ==="
netstat -tlnp | grep -E "3003|8000"
echo ""
echo "=== 后端健康检查 ==="
curl http://localhost:8000/health
echo ""
echo "=== 前端响应 ==="
curl -I http://localhost:3003
```

---

## ⚠️ 重要提醒

1. **前端必须指定端口3003**
   - 启动命令：`pm2 start "npm start -- -p 3003" --name game`
   - 如果不指定，会默认使用3000端口，导致502错误

2. **每次修改PM2进程后必须保存**
   - 执行 `pm2 save` 保存配置
   - 否则服务器重启后进程不会自动恢复

3. **更新前端后必须清除Nginx缓存**
   - `rm -rf /www/server/nginx/proxy_cache_dir/*`
   - `/etc/init.d/nginx reload`
   - 否则可能看到旧版本页面

4. **使用进程名称而不是ID**
   - 推荐：`pm2 restart game`
   - 不推荐：`pm2 restart 3`（ID可能变化）

5. **设置环境变量**
   - 每次SSH登录后必须执行：`export PATH=/www/server/nodejs/v20.19.6/bin:$PATH`
   - 或者添加到 `~/.bashrc` 中自动加载

---

<p align="center">📅 最后更新：2026-01-17 | 版本：v2.4.7</p>










🚀 最终发布包 & 服务器部署指南 (v2.4.7-20260119)
已为您准备好前端完整部署包，并整理了后端更新步骤。

📦 准备工作
1. 前端打包文件
文件名: game-v2.4.7-20260119-frontend.zip
内容: 已包含编译后的 .next, public, 
package.json
, 
next.config.ts
。
路径: 
C:\kaifa\Obsidian\senlin-kaifa\game-google\game-v2.4.7-20260119-frontend.zip
2. 后端修改文件
文件: 
backend/app/schemas/custom_level.py
目的: 必须要更新此文件，否则创意工坊将无法保存包含“血包”元素的关卡。
🚀 服务器部署步骤 (参考 MAINTENANCE.md)
第一步：部署后端 (Backend)
使用宝塔面板上传本地的 
backend/app/schemas/custom_level.py
 到服务器的 /www/wwwroot/game-backend/app/schemas/ 目录并覆盖。
SSH 连接服务器，执行备份和重启：
cd /www/wwwroot/game-backend
# 备份数据库（以防万一）
cp code_adventure.db code_adventure.db.backup.$(date +%Y%m%d%H%M)
# 验证代码
./venv/bin/python -c "from app.main import app; print('✅ 后端代码验证通过')"
# 重启后端服务
pm2 restart game-backend
pm2 save
第二步：部署前端 (Frontend)
使用宝塔面板将 game-v2.4.7-20260119-frontend.zip 上传到 /www/wwwroot/game/。
SSH 连接服务器，执行部署逻辑：
# 设置 Node 环境
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game
# 停止并清理
pm2 stop game
rm -rf .next
rm -f package.json package-lock.json next.config.ts
# 解压新版本
unzip -o game-v2.4.7-20260119-frontend.zip
# 重启服务 (关键：指定 3003 端口)
pm2 delete game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M
pm2 save
# 清理 Nginx 缓存
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload
✅ 验证事项
PVP 难度: 检查“简单”模式 AI 是否足够缓慢。
血包功能: 拾取血包回复 10-20 HP。
复活逻辑: 测试模式下死亡是否弹出答题弹窗。
保存关卡: 创建一个带血包的关卡并保存，确认后端不报错。





# 运行安全检查
bash /www/wwwroot/game/deploy/daily-security-check.sh

# 查看结果
tail -50 /www/wwwlogs/security-check.log

# 立即清理
bash /www/wwwroot/game/deploy/emergency-cleanup.sh




