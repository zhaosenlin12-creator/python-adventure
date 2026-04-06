# 20260406-stable6-r7

## Build

- Frontend package: `game-deploy.zip`
- Backend package: `backend-deploy.zip`
- Frontend build version: `v20260406-stable6-r7`

## 本轮更新

- 生存乱斗继续做了同步与房间清理收口，客人端延迟波动更稳，最终 smoke 验证保持 `droppedSnapshots = 0`
- 新增系统更新公告与补给入口，现有用户首次回来会看到更新说明，并一次性收到 `1000` 金币补给
- 金币记录新增“系统更新补给”来源展示，前端余额会在公告拉起时同步刷新
- 宠物孵化选择最左侧风格卡改为深色方案，避免白底导致文字发灰看不清
- 公告弹窗、金币入口、孵化面板补充了稳定的 QA 测试点位，方便后续真实验收
- 首页悬浮入口收口：签到与成就只在首页显示并缩小，聊天继续全局保留
- 开放世界不再提前弹出生存乱斗恢复提示，只有真正进入生存乱斗时才会显示相关界面
- 系统补给弹窗底部文案已收口为正式玩家提示，不再展示开发说明

## 已完成验证

- `npm run lint`
- `npm run build`
- `python -m pytest backend/tests/test_system_announcements.py -q`
- `python -m pytest backend/tests/test_pvp_battle_royale_api.py -q`
- `node scripts/qa-system-update-pet.mjs`
- `node scripts/qa-battle-royale-smoke.mjs`

## 部署与数据安全

- 当前服务器唯一标准流程仍然是 [`deploy/DEPLOY_SERVER_EXACT.md`](../deploy/DEPLOY_SERVER_EXACT.md)
- 后端包继续保持 DB-free，不包含 `.db` / `-wal` / `-shm`
- 生产数据库继续固定在 `/www/data/game-backend/code_adventure.db`
