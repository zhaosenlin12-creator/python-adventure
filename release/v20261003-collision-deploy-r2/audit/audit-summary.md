# v20261003-collision-deploy-r2 线上审计摘要

抓取时间:`2026-10-03T14:18:43.181Z`(Asia/Shanghai)
账号:`senlin`(id=1,level=93,coins=1558)
完整报告原文:`_archived/2026-10-03-collision-deploy-r2/audit/.tmp-production-online-audit/`

## 1. 公开探针(`qa-online-public-probe.mjs`)

| 路由 | 状态 | 备注 |
| --- | --- | --- |
| `/` | 200 | title=`Python Adventure` |
| `/world` | 200 | `<canvas>` 已渲染 |
| `/campaign` | 200 |  |
| `/editor` | 200 |  |
| `/code-research` | 200 |  |
| `/typing/index.html` | 200 | title=`乐启享打字训练中心` |

控制台 `error`:0 · `pageerror`:0 · `requestfailed`:1 条 RSC abort,无业务影响。

## 2. 登录态审计(`qa-production-online-audit.mjs`)

22/22 通过,核心项:

- 登录 UI、首页三个悬浮入口、`/world` canvas 加载、`/code-research` 章节 / 地图 / 关卡
- 攻略抽屉、AI 伙伴弹窗 + DeepSeek 兜底回话
- 代码研究 `shadow-cell-1` 首次通关 + 复玩:**`code_research` 流水 3 -> 3 -> 3,金币 1558 -> 1558 -> 1558**,`rewardClaimedMarker` 沿用旧完成记录、不重发
- 进度 / stars / bestSteps / rewardClaimed 服务端落库

## 3. 性能 / 安全 / 稳定(`qa-online-perf-security.mjs`)

### 性能(5 次取样)

| URL | median | p95 | max |
| --- | --- | --- | --- |
| `/` | 44.7 ms | 284.5 ms | 284.5 ms |
| `/world` | 40.3 ms | 41.9 ms | 41.9 ms |
| `/code-research` | 41.6 ms | 45.7 ms | 45.7 ms |
| `/campaign` | 39 ms | 47.6 ms | 47.6 ms |
| `/editor` | 41.3 ms | 46.1 ms | 46.1 ms |
| `/typing/index.html` | 36.6 ms | 37.2 ms | 37.2 ms |
| `/build-info.json` | 34.6 ms | 100.7 ms | 100.7 ms |
| `/assets/player/player.png` | 226.4 ms | 352.2 ms | 352.2 ms |
| `/assets/bosses/campaign_1.png` | 137.7 ms | 368.1 ms | 368.1 ms |
| `/assets/pet-home/garden-bg.png` | 326.6 ms | 336.8 ms | 336.8 ms |
| `/api/v1/auth/login`(空 body) | 35.6 ms | 43.7 ms | 43.7 ms |
| `/api/v1/coins/balance`(无 token) | 35.4 ms | 42.8 ms | 42.8 ms |

### 安全

| 探测 | 结果 |
| --- | --- |
| `GET /api/v1/openapi.json` | 404(未公开) |
| `GET /docs`(Swagger UI) | 404(未公开) |
| `GET /api/v1/auth/login` | 405(不允许 GET) |
| 错误 / 畸形 / 过期 token | 401 |
| SQL 注入探测 `' OR 1=1 --` | 401(参数化生效) |
| 不存在用户 vs 错密码 | 响应完全一致(抗枚举) |
| 不存在关卡 `__not_exist__` | 404 |
| CORS 预检(攻击者源) | `Allow-Origin: null` + `Allow-Credentials: true`(未回显攻击源) |
| `Strict-Transport-Security` | `max-age=31536000`(在线) |
| `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` | 在线 |
| `Content-Security-Policy` / `Permissions-Policy` / `COOP` / `CORP` | **缺失**(下一轮打) |
| TLS 证书 | `CN=game.codebn.cn`,Let’s Encrypt,2026-10-30 到期(剩 26 天) |

### 稳定

| 探测 | 结果 |
| --- | --- |
| `/build-info.json` 30 次抽样 | 1 个唯一响应体,状态 200 |
| `/` 50 次抽样 | 50/50 都是 200 |
| 无 token API 20 次抽样 | 20/20 都是 401 |

## 4. 截图

放在 `_archived/2026-10-03-collision-deploy-r2/audit/.tmp-production-online-audit/`:

- `home.png` `world.png` `code-research-chapters.png` `code-research-map.png`
- `code-research-level.png` `victory-first-clear.png` `victory-replay.png`
- `public/` 下 6 张:home / world / campaign / editor / code-research / typing-spa

## 5. 遗留 / 建议

- CSP / Permissions-Policy / COOP / CORP 加到 `deploy/nginx.conf`,下一次部署带上
- TLS 1.3 + HSTS `includeSubDomains; preload`
- certbot 续期(26 天内必须续上)
- k6 / autocannon 压测脚本 + 限速实测脚本
- Boss 战内 5-10 轮手动回归