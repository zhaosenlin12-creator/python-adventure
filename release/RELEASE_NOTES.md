# 20260331-stable6-r5

## Build

- Frontend package: `game-deploy.zip`
- Backend package: `backend-deploy.zip`
- Frontend build version: `v20260331-stable6-r5`

## 本轮收口内容

- 生存乱斗与全局浮层彻底隔离，避免聊天、签到、成就、宠物挂件覆盖到乱斗界面
- 宠物小屋进入时也会隐藏全局浮层，避免小屋体验被外层组件打断
- 宠物小屋新手首进模式改成轻量引导，先保留核心互动，再展开高级工具
- 宠物小屋引导改成按用户隔离的本地 key，同时兼容旧 key，避免不同账号互相污染
- 修复小屋互动面板遮挡食物背包按钮的问题
- 更新宠物/乱斗 QA 规约，和当前产品交互保持一致
- 前端版本标识更新为 `v20260331-stable6-r5`

## 已完成验证

- `npm run lint`
- `npm run build`
- `pytest -q`
- `npx playwright test scripts/pet-workshop-qa.spec.ts scripts/pvp-br-qa.spec.ts --reporter=line`

## 稳定性结论

- 当前最适合你服务器的仍然是单实例部署，不建议这轮改成多实例或容器编排
- 前端可继续沿用当前 PM2 + Nginx 发布方式
- 后端必须保持单实例，避免 WebSocket 状态、房间状态和 SQLite 写入竞争复杂化

## 后续可做但不阻塞本次上线

- 前端后续可以切 `Next standalone` 打包，进一步缩小部署包、减少服务器端无关文件
- 后端如果未来要追求 `10+` 真人房，再考虑迁移房间态到 Redis/PostgreSQL，再谈多实例
