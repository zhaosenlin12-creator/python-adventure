# 🛠️ Python 冒险岛 - 运维手册 v2.5.0

> 本文档包含服务器部署、安全检查、应急响应、日常维护的完整指南

## 📋 目录

1. [服务器信息](#服务器信息)
2. [⭐ 每日安全检查](#每日安全检查) - 新增
3. [⭐ 应急响应](#应急响应) - 新增
4. [⭐ 快速部署](#快速部署) - 新增
5. [⭐ 更新应用](#更新应用) - 新增
6. [备份恢复](#备份恢复)
7. [前端部署](#前端部署)
8. [后端部署](#后端部署)
9. [日常维护](#日常维护)
10. [故障排查](#故障排查)
11. [性能监控](#性能监控)

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
│                                                                 │
│  🚨 服务器已被入侵3次！必须每天执行安全检查！                  │
│     入侵原因：MySQL弱密码 + 3306端口暴露                       │
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
| 当前版本 | v2.5.0 |
| 访问方式 | 阿里云VNC救援控制台 + 宝塔面板 |

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

# ===== 运维脚本目录 =====
/www/wwwroot/daily-security-check.sh      # 每日安全检查
/www/wwwroot/emergency-response.sh 
/www/wwwroot/emergency-cleanup.sh        # 应急响应
/root/backup-database.sh            # 数据库备份
/root/restore-database.sh           # 数据库恢复
/root/quick-deploy.sh               # 快速部署
/root/update-frontend.sh            # 更新前端
/root/update-backend.sh             # 更新后端
```

---

## ⭐ 每日安全检查

### 快速检查（5分钟）

```bash
# 通过宝塔面板终端或阿里云VNC执行
bash /root/daily-security-check.sh
```

**检查内容：**
1. ✅ 挖矿进程检测（自动杀死）
2. ✅ CPU使用率监控
3. ✅ 内存使用率监控
4. ✅ /dev/shm目录检查（自动清理）
5. ✅ 定时任务检查
6. ✅ MySQL监听地址验证
7. ✅ 异常网络连接检测（自动拉黑）
8. ✅ fail2ban状态检查
9. ✅ 应用运行状态
10. ✅ 磁盘空间检查

**查看检查日志：**
```bash
# 查看最近的检查记录
tail -100 /var/log/game-security-check.log

# 查看告警记录
cat /var/log/game-security-alert.log
```

### 手动检查命令

```bash
# 1. 检查挖矿进程
ps aux | grep -iE "xmrig|minerd|kdevtmpfsi|kinsing" | grep -v grep

# 2. 检查CPU使用率
top -bn1 | head -10

# 3. 检查内存使用率
free -h

# 4. 检查/dev/shm
ls -la /dev/shm/

# 5. 检查MySQL监听地址（必须是127.0.0.1）
netstat -tlnp | grep 3306

# 6. 检查异常网络连接
netstat -antp | grep ESTABLISHED | grep -vE ":80|:443|:8000|:3003|:8888"

# 7. 检查应用状态
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list

# 8. 检查磁盘空间
df -h
```

---

## ⭐ 应急响应

### 发现入侵时立即执行

```bash
# 一键应急响应
bash /root/emergency-response.sh
```

**应急响应操作：**
1. ✅ 杀死所有挖矿进程
2. ✅ 清理/dev/shm目录
3. ✅ 清理/tmp可疑文件
4. ✅ 清理恶意定时任务
5. ✅ 修复MySQL配置
6. ✅ 拉黑可疑IP
7. ✅ 重启应用
8. ✅ 运行rootkit检测

**查看应急日志：**
```bash
tail -100 /var/log/game-emergency.log
```

### 入侵后必做操作

```bash
# 1. 修改MySQL密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY '新的超强密码';
FLUSH PRIVILEGES;
exit

# 2. 更新后端.env配置
vi /www/wwwroot/game-backend/.env
# 修改 DB_PASSWORD=新密码

# 3. 重启后端
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 restart game-backend
pm2 save

# 4. 检查阿里云安全组
# 登录阿里云控制台，确保3306端口未开放

# 5. 运行完整安全检查
bash /root/daily-security-check.sh
```

---

## ⭐ 快速部署

### 重装服务器后快速恢复

```bash
# 一键部署（需要先上传代码和数据库备份）
bash /root/quick-deploy.sh
```

**部署步骤：**
1. ✅ 安装前端依赖
2. ✅ 构建前端
3. ✅ 启动前端（端口3003）
4. ✅ 创建Python虚拟环境
5. ✅ 安装后端依赖
6. ✅ 启动后端（端口8000）
7. ✅ 配置PM2开机自启

**恢复数据库：**
```bash
# 列出可用备份
ls -lh /root/backups/

# 恢复数据库
bash /root/restore-database.sh code_adventure_20260124_120000.db.gz
```

---

## ⭐ 更新应用

### 更新前端（零停机）

```bash
# 方式1：使用脚本（推荐）
bash /root/update-frontend.sh

# 方式2：手动更新
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game
git pull origin main
npm install
npm run build
pm2 restart game
pm2 save
```

### 更新后端（零停机）

```bash
# 方式1：使用脚本（推荐）
bash /root/update-backend.sh

# 方式2：手动更新
cd /www/wwwroot/game-backend
bash /root/backup-database.sh  # 先备份！
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
pm2 restart game-backend
pm2 save
```

---

## 备份恢复

### 数据库备份

```bash
# 手动备份
bash /root/backup-database.sh

# 查看备份列表
ls -lh /root/backups/

# 备份文件命名格式
# code_adventure_20260124_120000.db.gz
```

### 数据库恢复

```bash
# 恢复数据库
bash /root/restore-database.sh code_adventure_20260124_120000.db.gz

# 恢复后会自动：
# 1. 停止后端服务
# 2. 备份当前数据库
# 3. 恢复指定备份
# 4. 重启后端服务
```

### 自动备份（推荐）

```bash
# 设置每天凌晨2点自动备份
crontab -e

# 添加以下行
0 2 * * * /root/backup-database.sh
```

---

## 前端部署

### 本地打包
```powershell
# Windows PowerShell
npm run build
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
Compress-Archive -Path ".next", "public", "package.json", "next.config.ts" -DestinationPath "game-v2.5.0-$timestamp-full.zip" -Force
```

### 服务器部署
```bash
# 设置Node环境
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH

# 进入前端目录
cd /www/wwwroot/game

# 停止PM2进程
pm2 stop game

# 清理旧文件
rm -rf .next
rm -f package.json package-lock.json next.config.ts

# 上传并解压新版本（通过宝塔面板上传）
unzip -o game-v2.5.0-20260124-full.zip

# 重启PM2（必须指定端口3003！）
pm2 delete game
pm2 start "npm start -- -p 3003" --name game --max-memory-restart 500M
pm2 save

# 清除Nginx缓存
rm -rf /www/server/nginx/proxy_cache_dir/*
/etc/init.d/nginx reload

# 验证
sleep 3
curl -s http://localhost:3003 | head -20
netstat -tlnp | grep 3003
```

---

## 后端部署

### 服务器部署
```bash
cd /www/wwwroot/game-backend

# 备份数据库（重要！）
bash /root/backup-database.sh

# 上传后端文件（通过宝塔面板）

# 验证代码无语法错误
./venv/bin/python -c "from app.main import app; print('✅ 代码检查通过')"

# 如有数据库迁移脚本，先运行
# ./venv/bin/python migrate_xxx.py

# 重启后端
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 restart game-backend
pm2 save

# 查看日志
pm2 logs game-backend --lines 50
```

---

## 日常维护

### 每日检查清单

```bash
# 1. 运行安全检查（必须！）
bash /root/daily-security-check.sh

# 2. 查看应用状态
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list

# 3. 查看应用日志
pm2 logs --lines 50

# 4. 检查磁盘空间
df -h

# 5. 检查内存使用
free -h
```

### 每周维护

```bash
# 1. 备份数据库
bash /root/backup-database.sh

# 2. 清理旧日志
find /www/wwwlogs -name "*.log" -mtime +30 -delete

# 3. 检查PM2状态
pm2 list
pm2 save

# 4. 运行rootkit检测
chkrootkit
```

---

## 故障排查

### 前端无法访问

```bash
# 1. 检查PM2状态
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list

# 2. 检查端口监听
netstat -tlnp | grep 3003

# 3. 查看前端日志
pm2 logs game --lines 100

# 4. 重启前端
pm2 restart game

# 5. 检查Nginx配置
nginx -t
/etc/init.d/nginx reload
```

### 后端API报错

```bash
# 1. 查看后端日志
pm2 logs game-backend --lines 100

# 2. 检查端口监听
netstat -tlnp | grep 8000

# 3. 检查数据库
ls -lh /www/wwwroot/game-backend/code_adventure.db

# 4. 重启后端
pm2 restart game-backend

# 5. 测试API
curl http://localhost:8000/api/health
```

### 服务器被入侵

```bash
# 立即执行应急响应
bash /root/emergency-response.sh

# 查看应急日志
tail -100 /var/log/game-emergency.log

# 修改MySQL密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';

# 更新后端配置
vi /www/wwwroot/game-backend/.env

# 重启后端
pm2 restart game-backend
```

---

## 性能监控

### 实时监控

```bash
# CPU和内存
top

# 网络连接
netstat -antp | grep ESTABLISHED

# 磁盘IO
iostat -x 1

# PM2监控
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 monit
```

### 日志查看

```bash
# 安全检查日志
tail -f /var/log/game-security-check.log

# 应急响应日志
tail -f /var/log/game-emergency.log

# PM2日志
pm2 logs --lines 100

# Nginx访问日志
tail -f /www/wwwlogs/game.codebn.cn.log

# Nginx错误日志
tail -f /www/wwwlogs/game.codebn.cn.error.log
```

---

## 📞 紧急联系

如果遇到无法解决的问题：

1. 查看日志文件
2. 运行安全检查
3. 检查阿里云安全组配置
4. 必要时重装服务器并快速部署

**记住：数据库备份是最重要的！每天备份！**

---

<p align="center">📅 最后更新：2026-01-24 | 版本：v2.5.0</p>
