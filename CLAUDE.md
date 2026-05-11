# CLAUDE.md

## Project Rules

This project is a student coding game. Changes must be verified in the actual browser, not only by build output or HTTP status.

## Code Research Rules

- Keep the existing `AI Research` feature. Do not replace, rename, or remove it unless explicitly requested.
- `Code Research` is a separate local game entry at `/code-research`.
- `Code Research` must use the existing `authStore` login state. Do not create a second login system.
- Student progress must be scoped by `user.id`.
- The code runner must not execute arbitrary JavaScript from students. Only parse a safe whitelist of commands.
- Allowed student commands are currently:
  - `hero.moveRight()`
  - `hero.moveLeft()`
  - `hero.moveUp()`
  - `hero.moveDown()`
  - `hero.move("right" | "left" | "up" | "down")`
  - `hero.collect()`
  - `hero.attack()`
  - `hero.openDoor()`
  - `hero.buildBridge("right" | "left" | "up" | "down")`
  - `hero.stepOnSwitch()`
  - `hero.scan()`
  - `hero.wait()`
  - `hero.say("...")`
  - `repeat(n) { ... }`

## Visual And Asset Rules

- The game may borrow broad visual direction from CodeCombat-style educational programming games: map selection, floating islands, dungeon/castle mood, resource counters, side dock, and code-driven character movement.
- Do not copy proprietary CodeCombat level scripts, unit configs, level descriptions, paid content, account-gated content, or live production data.
- Prefer original CSS/SVG/Canvas assets or locally generated assets for UI art.
- If image-generation assets are added, store prompts/source notes beside the assets and avoid trademarked logos or confusingly identical marks.
- Open-source CodeCombat code or CC-BY common assets may be studied or used only under their license terms and with attribution where required.

## Verification Rules

For any `Code Research` change, run:

```powershell
npm test -- --runInBand __tests__/codeResearch.test.ts __tests__/smoke.test.js
npx tsc --noEmit
npm run build
```

Also run a real browser check with Playwright or manual Chrome:

- Visit `/` and confirm both `AI Research` and `Code Research` exist after login.
- Visit `/code-research`.
- Confirm the map renders without the ErrorBoundary fallback.
- Click `开始`.
- Confirm `任务卷轴`, `导师路线`, `命令书`, `挑战目标`, `运行时间线`, and board legend render.
- Click one command chip and confirm it inserts text into the code editor.
- Click `运行代码`.
- Confirm the sample level reaches `挑战完成`.

HTTP `200 OK` alone is not sufficient verification.

## Coding Rules

- Make surgical changes. Touch only files required by the task.
- Prefer simple, local components over speculative abstractions.
- Do not refactor unrelated systems while working on Code Research.
- Add or update tests when changing command parsing, simulation rules, level data, rewards, or progress.
- Preserve existing project style and Zustand store patterns.
- Remove unused imports or unused variables introduced by your own changes.

## Current Code Research Files

- `app/code-research/page.tsx`
- `components/code-research/CodeResearchPage.tsx`
- `components/code-research/code-research.css`
- `lib/codeResearch.ts`
- `store/codeResearchStore.ts`
- `__tests__/codeResearch.test.ts`
