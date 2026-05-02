# 2026-05-03 享打字集成更新部署说明

本次更新包包含：

- `game-deploy.zip`：前端部署包，包含 Next.js 构建产物、`public/typing` 享打字静态资源、`app/api/typing` 集成 API、部署辅助脚本。
- `backend-deploy.zip`：后端部署包，包含 FastAPI 后端代码和安全部署脚本。
- `SHA256SUMS.txt`：部署包校验值。

## 重要安全要求

- 后端更新前必须备份服务器数据库。
- 不要覆盖服务器的 `/www/wwwroot/game-backend/code_adventure.db`。
- 本后端包已排除 `.env`、数据库文件、日志、缓存、虚拟环境和测试数据库。
- 服务器上的 `.env`、MiniMax/Qwen 等密钥继续使用服务器现有配置，不在部署包内。

## 前端更新

上传 `game-deploy.zip` 到服务器目录：

```bash
/www/wwwroot/game/
```

在服务器执行：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game
unzip -o game-deploy.zip
chmod +x deploy/*.sh
bash deploy/post-upload-frontend.sh
```

前端脚本会执行依赖安装、清理 Next 缓存、重启 PM2 `game`，并验证 `http://127.0.0.1:3003`。

## 后端更新

上传 `backend-deploy.zip` 到服务器目录：

```bash
/www/wwwroot/game-backend/
```

在服务器执行：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/game-backend
bash /root/backup-database.sh
unzip -o backend-deploy.zip
chmod +x deploy/*.sh
bash deploy/post-upload-backend.sh
```

后端脚本会再次备份数据库、执行数据库安全预检、安装依赖、校验 `from app.main import app`、重启 PM2 `game-backend`，并验证 `http://127.0.0.1:8000/health`。

## 更新后验证

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
pm2 list
pm2 logs game --lines 50
pm2 logs game-backend --lines 50
curl -I http://127.0.0.1:3003
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/typing/health
```

浏览器访问：

```text
https://game.codebn.cn
```

登录后检查顶部 `享打字` 入口，进入后重点检查：

- 中文练习：上排原文、下排输入方格，当前字符实时变化。
- 英文长文章：同样使用对照方格输入。
- 单词练习：朗读、自动下一词、手势键盘保持可用。
- 排行榜、比赛、个人中心正常打开。

## 包校验

```bash
sha256sum game-deploy.zip backend-deploy.zip
cat SHA256SUMS.txt
```

本地生成时的校验：

```text
9079e6d433f0f100f59f4ad524f412caf8d38d7e43709d5bfa353151b431b288  game-deploy.zip
60a9622f7813e58602b4a535e7be20ac50c7224126cf53213b92bfda15103fcb  backend-deploy.zip
```
