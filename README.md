# 🎮 编程冒险岛 · Code Adventure Island

> 一款面向青少年与儿童的**编程 + 学科 + 打字**综合学习游戏，把 Python、章节闯关、平台跳跃、宠物养成、实时对战、创意工坊、代码研究整合在一个可一键启动的 Next.js + FastAPI 全栈项目里。

| 项目 | 信息 |
| --- | --- |
| 当前版本 | **v2.3.0** (`game-google` · 2026-09-10 typing / world / auth 综合包) |
| 上游 GitHub | https://github.com/zhaosenlin12-creator/python-adventure |
| 部署域名 | `https://game.codebn.cn` |
| 前端端口 | 3003 (PM2 `game`) |
| 后端端口 | 8000 (PM2 `game-backend`) |
| 技术栈 | Next.js 16 · React 19 · TypeScript · Phaser 3 · FastAPI · SQLAlchemy · WebSocket |

---

## ✨ 项目特色

### 🎯 8 大可玩模式

| 模式 | 说明 |
| --- | --- |
| 🗺️ **开放世界** | Phaser 2D 大地图，自由探索猇亭，与 NPC / 站点互动，支持多玩家同屏 |
| 📚 **章节闯关** | 8 大章节、40+ 关卡，从零开始学 Python，含解释器、循环、函数等知识点 |
| ⚔️ **战役模式** | 10 大战役（宜昌猇亭文化主题），平台跳跃 + 重力翻转 + Boss 战 + 风力系统 |
| 🏆 **PvP 大乱斗** | 20 人实时混战，断线 AI 接管、房间生命周期、复活与同步补偿 |
| 🥊 **1v1 PvP** | 实时 1v1 编程对战，心跳 15s、60s 内最多 3 个房间 |
| 🐾 **宠物系统** | 宠物养成、孵化、装饰、小屋交互、宠物聊天（DeepSeek 兜底） |
| ⌨️ **打字训练** | 9 款独立打字游戏，课程进度落库，支持语音 TTS / 速度排行 |
| 🧠 **代码研究** | AI 驱动的代码研究入口，配套战役化引导 |

### 🛠️ 创意工坊

- 关卡拖拽编辑器（元素上限 500 / 50 个云端关卡）
- 自定义题库管理（选择 + 填空）
- 🤖 **AI 出题（DeepSeek）**：10 个科目 × 3 个年级分组 × 5 个快捷模板
- 预览 → 编辑 → 选择性导入工作流

### 👶 分龄段学习

- 小学低年级（1–3）/ 小学高年级（4–6）/ 初中（7–9）
- 自适应题库：数学、语文、英语、物理、化学、Python、Scratch、趣味推理、历史、科学常识

### 🔒 安全 / 性能

- JWT Token 黑名单（登出即失效）
- WebSocket / HTTP 接口统一鉴权
- bcrypt 密码哈希（兼容旧密码自动升级）
- XSS 消毒（创意工坊、关卡名）
- 数据库排行榜缓存（60s · 支持 Redis/内存双模式）
- 视口裁剪 + 状态同步 20fps 插值

---

## 🚀 快速开始

### 环境要求

- Node.js **v20+**（生产环境固定 `/www/server/nodejs/v20.19.6/bin`）
- Python **3.10+**（生产环境固定 `/www/server/python_manager/versions/3.10.0/bin/python3.10`）
- npm + PowerShell 5+（Windows 部署用）

### 一键启动（开发机 / Windows）

```powershell
# 完整启动：宠物系统数据修复 + 后端 + 前端
.\start-all.bat
```

启动后访问：

- 游戏首页：http://localhost:3000
- FastAPI 文档：http://localhost:8000/docs（非生产环境）
- 健康检查：http://localhost:8000/health

测试账号：`senlin8dog` / `123456`

### 手动启动

**终端 1 · 后端**
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate
pip install -r requirements.txt
python init_db_quick.py   # 首次运行初始化数据库
python -m uvicorn app.main:app --reload --port 8000
```

**终端 2 · 前端**
```bash
npm install
npm run dev
```

### 校验

```bash
# 前端单元测试（Jest）
npm test

# 前端代码风格（ESLint）
npm run lint

# 后端测试（pytest）
python -m pytest backend/tests -q
```

---

## 📁 项目结构

```text
game-google/
├── app/                         # Next.js 16 App Router
│   ├── page.tsx                # 首页（微工作室入口）
│   ├── campaign/               # 战役模式入口
│   ├── code-research/          # AI 代码研究
│   ├── editor/                 # 创意工坊关卡编辑器
│   ├── world/                  # 开放世界入口
│   └── api/typing/[...path]/   # 打字 SPA 数据/分数代理
│
├── components/                 # React 组件
│   ├── auth/                   # 鉴权弹窗（确定性渲染、无 Math.random）
│   ├── campaign/               # 战役门、Boss、平台视觉
│   ├── chat/                   # 聊天 / 私聊
│   ├── code-research/          # 代码研究抽屉
│   ├── common/                 # 通用 UI（错误回退、加载态）
│   ├── editor/                 # 拖拽编辑器
│   ├── game/                   # 章节、关卡、PvP、大乱斗
│   ├── layout/                 # 顶栏、移动端折叠菜单
│   ├── pet/                    # 宠物小屋、孵化、商店
│   ├── providers/              # 全局 Context
│   ├── ui/                     # 原子 UI
│   └── world/                  # 开放世界场景 / 实体 / 技能
│
├── public/typing/              # 9 款打字 SPA（独立 HTML/JS/CSS/资源）
│
├── backend/                    # FastAPI 服务
│   ├── app/api/v1/             # 27 个路由：auth/pvp/pets/typing/...
│   ├── app/core/               # 配置、数据库、缓存
│   ├── app/models/             # SQLAlchemy ORM
│   ├── app/services/           # 业务服务
│   ├── migrations/             # 数据库迁移
│   └── tests/                  # pytest 覆盖
│
├── lib/                        # 战役配置、题库、输入管理
├── store/                      # Zustand 状态（game/auth/pvp）
├── server/                     # Node 侧 WS / 实时网关
├── scripts/                    # 同步 / 资产刷新 / QA 脚本
├── deploy/                     # 生产部署脚本 + nginx + 文档
├── release/                    # 部署包 + SHA256SUMS + 发布说明
└── __tests__/                  # Jest 单元测试（15 套件 / 64 用例）
```

---

## 🔧 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端框架 | Next.js 16 + React 19 + TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| 游戏引擎 | Phaser 3.90 |
| 状态管理 | Zustand 5 |
| 后端框架 | FastAPI + SQLAlchemy + Pydantic |
| 数据库 | SQLite（生产固定 `/www/data/game-backend/code_adventure.db`） |
| 实时通信 | WebSocket（PvP / 大乱斗 / 开放世界） |
| AI 集成 | DeepSeek Chat Completions（创意工坊出题 + 宠物聊天兜底） |
| 浏览器内 Python | Pyodide 0.29 |
| 部署 | PM2 + Nginx + 自定义 post-upload 脚本 |

---

## 📦 生产部署

详细流程见 [`deploy/DEPLOY_SERVER_EXACT.md`](./deploy/DEPLOY_SERVER_EXACT.md)。

核心流程：**本地打 zip → 上传到服务器 → root 解压 → `su - game` 跑 post-upload 脚本**。**服务器上不做 `git pull`**。

```powershell
# 本地打两个包
powershell -ExecutionPolicy Bypass -File .\deploy\build-backend.ps1
powershell -ExecutionPolicy Bypass -File .\deploy\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-deploy-packages.ps1
```

包哈希写入 `release/SHA256SUMS.txt`。

服务器端（`game.codebn.cn`）：

- 前端代码目录：`/www/wwwroot/game`（PM2 `game`）
- 后端代码目录：`/www/wwwroot/game-backend`（PM2 `game-backend`）
- 数据库：永远在 `/www/data/game-backend/code_adventure.db`，**绝不放在代码目录**
- 6 小时 DB 备份 cron：`0 */6 * * * .../backup-database.sh`

### 关键环境变量

后端（`backend/.env` 或生产 `/www/wwwroot/game-backend/.env`）：

```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<至少 32 位强随机串>
DEEPSEEK_API_KEY=your-api-key
# 可选覆盖：
# DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
# DEEPSEEK_MODEL=deepseek-chat
```

> `backend/.env.example` 只是模板，不会被程序读取。

前端（`.env.local`）：仅在需要自定义 API 域名时填写。

---

## 📝 更新日志

### 2026-09-10 · typing / world / auth 综合包

- 打字 SPA：新增 `/user/speed-test-rank` 与 `/lesson/speed-test`，重写 8 个 game-res 资源与 `daziya.com/lexq` 字体包
- 鉴权弹窗：确定性渲染（去掉 `Math.random`），平台装饰数组，可恢复错误回退
- 开放世界：微调 `MainScene`、新增 `worldSync` 覆盖（pong + HTTP 轮询兜底）
- 部署：nginx 静态资源 `1y` 缓存 + API / WS 速率限制放宽
- 后端：新增 speed-test 路由、规范化模式持久化

### 2026-08 · 战役 · 大乱斗 · 宠物 稳定版

- 大乱斗 20 人同步 / 断线接管 / 主机回收
- 战役平台视觉升级 + 移动端折叠菜单
- 宠物小屋、孵化、商店一致性打磨

### 2024-12 · v2.3.0 · AI 出题 + 安全加固

- 🤖 **AI 智能出题（DeepSeek）**：10 科目 × 3 年龄段 × 5 模板
- 🔒 **JWT 黑名单 / WS 鉴权 / bcrypt 升级 / XSS 消毒**
- 🎮 **PVP 断线 AI 接管 / 60s 心跳 / 房间生命周期**
- 🎨 **创意工坊编辑器 + 题库管理**
- ⚡ **排行榜缓存 / 视口裁剪 / 20fps 插值**

### 2024-12 · v2.1.x · 新年主题 / 年龄分段 / 移动端

- 移动端虚拟控制器（D-Pad + A/B/E/冲刺）
- 小学 / 初中分段题库
- 新年主题 UI

---

## 🧪 验证状态

最近一次推送前的本地校验（2026-09-17）：

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 单元测试 | `npx jest --silent` | ✅ 15 suites / 64 tests passed |
| ESLint | `npx eslint . --max-warnings 0` | ✅ exit 0 |
| 部署包校验 | `scripts/verify-deploy-packages.ps1` | ✅ PASS（`game-deploy.zip` / `backend-deploy.zip`） |
| 部署包 SHA256 | `release/SHA256SUMS.txt` | ✅ 已生成 |

---

## 📄 License

MIT License

---

<p align="center">Made with ❤️ for young coders · v2.3.0 · 2026-09-10</p>