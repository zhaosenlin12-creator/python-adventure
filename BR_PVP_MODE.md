# Pet Battle Royale Plan

## Goal

Ship a new open-world station that opens a standalone pet battle royale mode with:

- room creation and join flow
- up to 25 total entrants per room
- per-bot difficulty configuration
- larger platform arena with a shrinking safe zone
- carried pet visuals and melee-driven combat
- loot-based temporary combat upgrades
- revive quiz using campaign question banks
- full pre-ship audit checklist for UX, stability, performance, concurrency, and security

## Product Decisions

- Capacity is capped at `25` players/bots per room.
- The existing three-round duel mode stays intact.
- Battle royale is a new mode with its own world entry and room flow.
- The host client runs the authoritative arena simulation.
- Other human players join the same room and stream inputs to the host.
- The backend is responsible for secure room membership and websocket relay.
- Revive requires `3` correct answers in one attempt and restores `50%` HP.
- Revived players lose temporary loot buffs and special pickups from the prior life.

## Arena Rules

- Platform map is wider and taller than the open-world hub.
- All pets start with melee attack.
- Open-world traversal skills carry into the mode as movement benefits:
  - `double_jump`
  - `glide`
  - `dash`
  - `wall_jump`
- Loot can grant temporary combat advantages:
  - med kit
  - armor vest
  - shield core
  - damage claw
  - wind booster
  - shockwave charge
- Safe zone shrinks in phases and damages fighters outside the circle.
- Last surviving fighter wins.

## Networking Shape

- REST:
  - create room
  - list rooms
  - join room
  - leave room
  - add/remove bot
  - start match
  - fetch room snapshot
- WebSocket:
  - player input uplink
  - authoritative state snapshot downlink
  - targeted revive quiz messages
  - room closed / player disconnected / final result messages

## Execution TODO

- [x] Lock BR product rules, capacity cap, and audit scope in a ship doc.
- [ ] Add a dedicated battle royale world station and entry modal wiring.
- [ ] Build secure backend room APIs for BR rooms with a 25-player cap.
- [ ] Add BR websocket relay with targeted and broadcast message support.
- [ ] Build frontend BR lobby and waiting-room UX.
- [ ] Support host-managed bot slots with per-bot difficulty.
- [ ] Implement the arena simulation, safe-zone shrink, and loot system.
- [ ] Implement revive quiz flow with 3-question all-correct validation.
- [ ] Add match result flow and cleanup for room lifecycle.
- [ ] Verify typecheck, backend tests, and BR-specific tests.
- [ ] Run final launch audit for functionality, UX consistency, concurrency, performance, stability, and security.

## Launch Audit Checklist

- [ ] World station is reachable and clearly labeled.
- [ ] Room creation/join/leave/start all succeed and reject invalid states.
- [ ] Capacity cannot exceed 25.
- [ ] Host-only room controls are enforced.
- [ ] Bots respect individually selected difficulty.
- [ ] Guests receive live arena snapshots and can move/attack.
- [ ] Shrinking zone always converges and ends the round.
- [ ] Revive quiz cannot be reused after success or failure.
- [ ] Revive restores 50% HP and wipes temporary loot.
- [ ] Room cleanup runs after finish or disconnect edge cases.
- [ ] UI is consistent on desktop and touch devices.
- [ ] No typecheck regressions, test regressions, or obvious console/runtime crashes.
