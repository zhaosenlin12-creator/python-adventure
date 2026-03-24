# 🎮 Python 冒险岛 v2.4.7

> 一款寓教于乐的编程学习游戏，让孩子们在冒险中学习 Python 编程

## 🆕 v2.4.7 更新日志 (2026-01-30)

- 🐾 宠物聊天与互动UI优化，失败时提供本地友好对话备用
- 🎨 小屋与按钮圆角/配色统一，聊天窗口位置与尺寸优化
- 🧩 商店装饰展示与摆放一致化（统一使用装饰图标资源）
- 📄 部署与AI配置说明更新（详见 MAINTENANCE.md）

## 🗂️ v2.3.0 更新日志 (2024-12-28)

### 🤖 新功能：AI智能出题
- 创意工坊新增AI辅助出题功能（基于DeepSeek API）
- 支持10个科目：数学、语文、英语、物理、化学、Python、Scratch、趣味推理、趣味历史、科学常识
- 3个年级分组：小学低年级(1-3)、小学高年级(4-6)、初中(7-9)
- 科目按年级智能过滤（如物理化学只对初中显示）
- 5个快捷模板：口算练习、成语填空、单词拼写、脑筋急转弯、历史趣闻
- 生成结果可预览、编辑、选择性导入

### 🔒 安全增强
- **JWT Token黑名单机制** - 登出后Token立即失效
- **WebSocket身份验证** - PVP和开放世界WebSocket连接需要Token验证
- **HTTP接口认证** - 位置更新、附近玩家等接口添加认证
- **密码哈希升级** - 升级到bcrypt算法，兼容旧密码自动升级
- **PVP房间速率限制** - 60秒内最多创建3个房间
- **XSS防护** - 创意工坊题目内容、关卡名称等输入消毒

### 🎮 PVP系统优化
- **断线AI接管** - 玩家断线后AI立即接管，在线玩家无需等待
- **房间生命周期** - 游戏结束后自动清理房间
- **放弃对战** - 支持主动放弃对战功能
- **心跳优化** - 心跳间隔从5秒改为15秒，减少服务器负载

### 🎨 创意工坊
- 完整的关卡编辑器，支持拖拽放置元素
- 自定义题库管理，支持选择题和填空题
- 关卡云端保存，最多50个关卡
- 元素数量限制（500个），防止性能问题

### ⚡ 性能优化
- **数据库缓存** - 排行榜缓存60秒，支持Redis/内存双模式
- **大地图渲染** - 视口裁剪优化，只渲染可见区域
- **状态同步** - PVP同步从60fps降到20fps，配合插值平滑显示

### 配置说明
AI出题与宠物聊天功能需要配置 DeepSeek API 密钥（后端读取）：
```bash
# 1) 复制 backend/.env.example 到后端目录的 .env
# 本地开发：backend/.env
# 生产环境：/www/wwwroot/game-backend/.env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=replace_with_a_strong_random_secret_at_least_32_chars

DEEPSEEK_API_KEY=your-api-key-here
# 可选覆盖
# DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
# DEEPSEEK_MODEL=deepseek-chat
```
> 注意：`backend/.env.example` 只是模板文件，不会被程序读取。

## ✨ 核心特性

| 模式 | 描述 |
|------|------|
| 🗺️ 开放世界 | 自由探索猇亭地图，与NPC互动，发现隐藏任务 |
| 📚 章节模式 | 8大章节、40+关卡，从零开始学习Python |
| ⚔️ 战役模式 | 10大战役，探索宜昌猇亭历史文化 |
| 🎯 PvP对战 | 实时1v1编程对战，比拼代码能力 |
| 🏆 竞技场 | 挑战Boss，获取稀有奖励 |
| 👥 多人在线 | 实时聊天，查看在线玩家 |
| 📱 移动端支持 | 虚拟控制器，支持手机/平板游玩 |
| 👶 年龄分段 | 小学低年级/高年级/初中，题目难度自适应 |

## 🚀 快速开始

### 环境要求

- Node.js v20+
- Python 3.10+
- npm 或 yarn

### 一键启动（Windows）

```powershell
# 启动游戏（前端+后端）
.\start-game.ps1

# 停止游戏
.\stop-game.ps1
```

### 手动启动

**终端 1 - 后端**
```bash
cd backend
pip install -r requirements.txt
python init_db_quick.py  # 首次运行需要初始化数据库
python run.py
```

**终端 2 - 前端**
```bash
npm install
npm run dev
```

访问 http://localhost:3000 开始游戏！

## 📁 项目架构

```
game-google/
├── app/                    # Next.js 页面路由
│   ├── page.tsx           # 首页（章节选择）
│   ├── world/             # 开放世界入口
│   └── campaign/          # 战役模式入口
│
├── components/            # React 组件库
│   ├── game/              # 游戏核心组件
│   │   ├── pvp/           # PvP对战系统
│   │   ├── ChapterSelect  # 章节选择器
│   │   ├── VirtualController # 移动端虚拟控制器
│   │   └── LevelView      # 关卡渲染器
│   └── world/             # 开放世界组件
│       └── scenes/        # Phaser 游戏场景
│
├── backend/               # FastAPI 后端服务
│   ├── app/
│   │   ├── api/v1/        # RESTful API
│   │   ├── models/        # SQLAlchemy 模型
│   │   └── core/          # 核心配置
│   └── run.py             # 开发服务器
│
├── lib/                   # 共享工具库
│   ├── campaigns.ts       # 战役配置（1-6）
│   ├── campaigns-advanced.ts # 高级战役（7-10）
│   ├── questionBank/      # 分年龄段题库
│   │   ├── primary-lower/ # 小学低年级
│   │   ├── primary-upper/ # 小学高年级
│   │   └── junior-high/   # 初中
│   └── input/             # 输入管理（触控支持）
│
├── store/                 # Zustand 状态管理
│   ├── gameStore.ts       # 游戏进度状态
│   ├── authStore.ts       # 用户认证状态
│   └── pvpStore.ts        # PvP对战状态
│
├── .backup/               # 代码备份目录
├── _archived/             # 归档文件
└── MAINTENANCE.md         # 运维部署手册
```

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + React 19 + TypeScript |
| 样式方案 | Tailwind CSS |
| 游戏引擎 | Phaser 3 |
| 状态管理 | Zustand |
| 后端框架 | FastAPI + SQLAlchemy |
| 数据库 | SQLite |
| 实时通信 | WebSocket |

## 📦 生产部署

详细部署流程请参考 [MAINTENANCE.md](./MAINTENANCE.md)

**服务器信息**
- 服务器IP: `120.26.114.244`
- 域名: `game.codebn.cn`
- 前端端口: `3003` (PM2 id=3)
- 后端端口: `8000` (PM2 id=4)

**关键路径**
```bash
# Node.js（必须指定版本！）
/www/server/nodejs/v20.19.6/bin/node
/www/server/nodejs/v20.19.6/bin/npm
/www/server/nodejs/v20.19.6/bin/pm2

# Python虚拟环境
/www/wwwroot/game-backend/venv/bin/python
```

## 📝 更新日志
### v2.4.7 (2026-01-30) - UI与宠物互动优化
- 🐾 宠物聊天失败本地预制对话备用
- 🎨 UI圆角与配色统一，聊天窗口更紧凑
- 🧩 装饰展示与摆放效果统一

### v2.1.18 (2024-12-20) - Bug修复版
- 🐛 修复战役6-5 Boss关卡平台跳跃问题
- 🐛 修复用户战役进度丢失问题（年龄段数据迁移）
- 🏆 修复竞技场排行榜段位显示（根据积分计算）
- 🗺️ 战役1-6 Boss关卡地图优化（空间更大）
- 📱 移动端怪物闪烁修复
- 🎮 PVP补给品数量调整（减少至2个）

### v2.1.16 (2024-12-18) - 新年主题 + 年龄分段版
- 🎊 新年主题UI（红金配色、灯笼装饰）
- 👶 年龄段选择系统（小学低年级/高年级/初中）
- 📚 分年龄段题库（数学、语文、英语、科学、编程、趣味）
- 🎮 PVP玩家角色优化为真实人物形象
- 💨 战役9/10风力系统加强
- 🏮 开放世界大厅新年风格站点UI

### v2.1.15 (2024-12-15) - 移动端适配版
- 📱 新增移动端虚拟控制器（D-Pad + 动作按钮）
- 📱 开放世界、战役模式、PVP对战支持触控操作
- 🔧 修复移动端精灵抖动问题

### v2.1.12 (2024-12-12) - 稳定版
- 🔧 修复战役解锁条件
- ⏰ Token有效期延长至24小时

## 🎯 游戏模式说明

### 章节模式
- 解锁条件：用户等级达到章节要求
- 关卡解锁：需逐关完成
- 内容：Python基础、简单逻辑、循环、函数等

### 战役模式
- 解锁条件：完成前一个战役
- 特色玩法：平台跳跃、重力翻转、Boss战、风力系统
- 背景：宜昌猇亭历史文化（10个战役）

### 年龄分段
- 小学低年级（1-3年级）：基础数学、简单编程概念
- 小学高年级（4-6年级）：进阶数学、Scratch编程
- 初中（7-9年级）：代数几何、Python编程

### 移动端操作
- D-Pad：方向移动
- A按钮（绿）：跳跃
- B按钮（红）：攻击
- E按钮（黄）：交互/技能
- ⚡按钮（蓝）：冲刺

## 📄 License

MIT License

---

<p align="center">Made with ❤️ for young coders | v2.4.7 | 2026-01-30</p>
