# v20261003-collision-deploy-r2

## Build

- Frontend package: `game-deploy.zip` (sha256 `77fdf5db5213f07a2c78a8792993b9e6b82bcb159c32abbc6611837a9d2af5d4`)
- Backend package: `backend-deploy.zip` (sha256 `85046e11233f41bdd16af0046466f16dfcfaf07ca516b4b1344b13d19a6e49c6`)
- Frontend build version: `v20261003-collision-deploy-r2`
- Frontend runtime signature: `player-collision-bottom-aligned-v1`
- Collision runtime: `30x42-bottom-aligned`
- Player artwork: `657x983-aspect-preserved`
- Deploy mode: `pm2-clean-start-runtime-gated-permissions-gated`

## 本轮更新

- 玩家碰撞从 `55x55` 收回 `30x42` 并改为底对齐(`bottomPadding=1`),手感回到上版本正常档
- 新增 `PLAYER_COLLISION_RUNTIME_SIGNATURE = player-collision-bottom-aligned-v1`,`BootScene` 创建玩家后写入 `player.setData(collisionRuntimeSignature, ...)`,前后端能直接对账运行时版本
- `lib/game/playerHitbox.ts` 重构:`getPlayerCollisionSize` 返回 `bottomPadding`,`syncArcadeBodyToDisplay` 支持 `verticalAlignment: bottom`
- `deploy/post-upload-frontend.sh`:进入部署流程时强制 `.next` 权限修复、并在 Next.js 启动前 verify `runtimeSignature` 一致,防止旧的 Next.js chunk 残留导致命中错误版本
- `deploy/build.ps1`:重打 `game-deploy.zip` 后再次写签名
- `release/SHA256SUMS.txt`:同步两个 zip 的新哈希
- `scripts/verify-deploy-packages.ps1`:发布前的 LF-only + 数据库安全 sanity check 路径更新
- QA:`scripts/qa-online-public-probe.mjs` + `scripts/qa-online-perf-security.mjs` 上线,可在 CI 里直接跑生产冒烟

## 已完成线上验证(2026-10-03,senlin 账号)

- `scripts/qa-online-public-probe.mjs`:6 个主路由全 200、`/world` canvas 加载、0 console error、0 page error
- `scripts/qa-production-online-audit.mjs`(登录态):22 项全部通过
  - 登录 UI /首页入口 / `/code-research` 章节+地图+关卡 / 攻略抽屉 / AI 伙伴(DeepSeek 兜底回话) / 打字外链
  - 首次通关 + 复玩:`code_research` 流水条数 3 -> 3 -> 3,不重复发金币、不写重复流水
  - 进度 / stars / bestSteps / rewardClaimed 全部服务端落库
- `scripts/qa-online-perf-security.mjs`:见 `audit/audit-summary.md`
- 安全头:HSTS `max-age=31536000` + `nosniff` + `SAMEORIGIN` + `strict-origin-when-cross-origin` 在线;`CSP` / `Permissions-Policy` / `COOP` / `CORP` 暂缺,后续单独打

## 部署与数据安全

- 流程仍走 `deploy/DEPLOY_SERVER_EXACT.md`
- 后端包继续 DB-free,数据库继续固定在 `/www/data/game-backend/code_adventure.db`
- 6 小时 DB 备份 cron 保持就位

## 已知遗留(下一轮处理)

- CSP / Permissions-Policy / COOP / CORP 未上,nginx 配置层面补
- TLS 协议未启用 1.3
- Let’s Encrypt 证书有效期至 2026-10-30(剩 26 天),盯着 certbot 自动续期
- 没有 k6 / autocannon 并发压测,生产并发下的 p95 未采样
- 登录限速无显式 `X-RateLimit-*` 头,需要做一次实测看拐点
- Boss 战内"打到 boss 是否真的扣血"未自动化覆盖,需要关卡内 5-10 轮手动回归