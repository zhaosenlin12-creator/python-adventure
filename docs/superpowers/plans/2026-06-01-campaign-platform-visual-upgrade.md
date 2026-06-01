# Campaign Platform Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the campaign-mode platform frontend into a more cohesive, MapleStory-inspired presentation without changing backend behavior.

**Architecture:** Introduce a frontend-only platform art manifest and theme resolver, load real campaign-platform assets during the Phaser lifecycle, keep procedural drawing as fallback, and reskin the React shell and mobile controls to match the upgraded scene art. The first concrete slice targets globally visible platform surfaces plus a themed `campaign_12` scene pack.

**Tech Stack:** Next.js, React 19, TypeScript, Phaser 3, Jest, Tailwind CSS

---

## File Structure

- Create: `__tests__/platformArt.test.ts`
- Create: `lib/platformArt.ts`
- Create: `public/assets/campaign-platform/meta/ASSET_NOTES.md`
- Create: `public/assets/campaign-platform/characters/hero-maple-student.svg`
- Create: `public/assets/campaign-platform/characters/enemy-valley-scout.svg`
- Create: `public/assets/campaign-platform/characters/enemy-mirror-sentry.svg`
- Create: `public/assets/campaign-platform/characters/enemy-wind-drummer.svg`
- Create: `public/assets/campaign-platform/characters/enemy-workshop-proctor.svg`
- Create: `public/assets/campaign-platform/characters/enemy-dam-warden.svg`
- Create: `public/assets/campaign-platform/items/coin-sun.svg`
- Create: `public/assets/campaign-platform/items/dash-star-bloom.svg`
- Create: `public/assets/campaign-platform/items/goal-flower-flag.svg`
- Create: `public/assets/campaign-platform/backgrounds/campaign12-sky.svg`
- Create: `public/assets/campaign-platform/backgrounds/campaign12-mid.svg`
- Create: `public/assets/campaign-platform/backgrounds/campaign12-fore.svg`
- Modify: `lib/utils/assetPreloader.ts`
- Modify: `components/world/scenes/PlatformGameScene.ts`
- Modify: `components/game/PlatformGame.tsx`
- Modify: `components/game/CampaignSelector.tsx`
- Modify: `components/game/VirtualController.tsx`
- Modify: `components/game/LevelCompleteModal.tsx`

### Task 1: Build the platform art manifest and test the resolution layer

**Files:**
- Create: `__tests__/platformArt.test.ts`
- Create: `lib/platformArt.ts`
- Create: `public/assets/campaign-platform/meta/ASSET_NOTES.md`

- [ ] **Step 1: Write the failing tests for theme and asset resolution**

```ts
import {
  getPlatformArtPack,
  getPlatformShellTheme,
  getPlatformCampaignThemeId,
} from '@/lib/platformArt';

describe('platformArt', () => {
  test('maps campaign level ids to advanced campaign themes', () => {
    expect(getPlatformCampaignThemeId('level_12_3')).toBe('campaign_12');
    expect(getPlatformCampaignThemeId('level_15_1')).toBe('campaign_15');
    expect(getPlatformCampaignThemeId('custom_level_1')).toBe('default');
  });

  test('returns campaign_12 art pack with real asset paths', () => {
    const pack = getPlatformArtPack('campaign_12');
    expect(pack.player.texture).toBe('/assets/campaign-platform/characters/hero-maple-student.svg');
    expect(pack.goal.texture).toBe('/assets/campaign-platform/items/goal-flower-flag.svg');
    expect(pack.background.layers).toContain('/assets/campaign-platform/backgrounds/campaign12-sky.svg');
  });

  test('returns shell theme tokens for campaign selection and HUD styling', () => {
    const theme = getPlatformShellTheme('campaign_12');
    expect(theme.chromeClassName).toContain('emerald');
    expect(theme.panelClassName).toContain('sky');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: FAIL with module or export errors because `lib/platformArt.ts` does not exist yet.

- [ ] **Step 3: Write the minimal platform art manifest**

```ts
export type PlatformThemeId =
  | 'default'
  | 'campaign_12'
  | 'campaign_13'
  | 'campaign_14'
  | 'campaign_15'
  | 'campaign_16';

export interface PlatformArtPack {
  player: { texture: string };
  enemies: Record<string, string>;
  items: { coin: string; dashStar: string };
  goal: { texture: string };
  background: { layers: string[] };
  specialPlatforms: {
    groundTint: number;
    platformTint: number;
    movingTint: number;
  };
}

export interface PlatformShellTheme {
  chromeClassName: string;
  panelClassName: string;
  accentClassName: string;
}
```

And implement:

- `getPlatformCampaignThemeId(levelId: string): PlatformThemeId`
- `getPlatformArtPack(themeId: PlatformThemeId): PlatformArtPack`
- `getPlatformShellTheme(themeId: PlatformThemeId): PlatformShellTheme`

With explicit data for `campaign_12` through `campaign_16` and safe defaults for old campaigns.

- [ ] **Step 4: Add asset provenance notes**

Write `public/assets/campaign-platform/meta/ASSET_NOTES.md` with:

- frontend-only scope
- original/local asset note
- no backend dependency
- source tracking rule for future additions

- [ ] **Step 5: Re-run the tests**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add __tests__/platformArt.test.ts lib/platformArt.ts public/assets/campaign-platform/meta/ASSET_NOTES.md
git commit -m "feat: add platform art manifest"
```

### Task 2: Load real platform assets in Phaser and keep procedural fallback

**Files:**
- Modify: `lib/utils/assetPreloader.ts`
- Modify: `components/world/scenes/PlatformGameScene.ts`
- Create: `public/assets/campaign-platform/characters/hero-maple-student.svg`
- Create: `public/assets/campaign-platform/items/coin-sun.svg`
- Create: `public/assets/campaign-platform/items/dash-star-bloom.svg`
- Create: `public/assets/campaign-platform/items/goal-flower-flag.svg`

- [ ] **Step 1: Write a failing test for asset-bundle exposure**

Extend `__tests__/platformArt.test.ts` with:

```ts
import { ASSET_BUNDLES } from '@/lib/utils/assetPreloader';

test('registers a platform campaign preload bundle', () => {
  expect(ASSET_BUNDLES.platformCampaignBase).toBeDefined();
  expect(ASSET_BUNDLES.platformCampaignBase.some((asset) => asset.key === 'platform-player')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: FAIL because the bundle is not defined yet.

- [ ] **Step 3: Add the preload bundle**

In `lib/utils/assetPreloader.ts`, add:

```ts
platformCampaignBase: [
  { key: 'platform-player', type: 'image', url: '/assets/campaign-platform/characters/hero-maple-student.svg', priority: 10 },
  { key: 'platform-coin', type: 'image', url: '/assets/campaign-platform/items/coin-sun.svg', priority: 8 },
  { key: 'platform-dash-star', type: 'image', url: '/assets/campaign-platform/items/dash-star-bloom.svg', priority: 8 },
  { key: 'platform-goal-flag', type: 'image', url: '/assets/campaign-platform/items/goal-flower-flag.svg', priority: 9 },
]
```

- [ ] **Step 4: Move platform scene loading into Phaser lifecycle**

In `components/world/scenes/PlatformGameScene.ts`:

- add `preload()` after `init()`
- use `getPlatformCampaignThemeId()` and `getPlatformArtPack()` from `lib/platformArt.ts`
- `load.image(...)` each required texture if `!this.textures.exists(key)`

Use a shape like:

```ts
preload() {
  const themeId = getPlatformCampaignThemeId(this.levelData?.id || '');
  const pack = getPlatformArtPack(themeId);
  const imageAssets = [
    ['platform-player', pack.player.texture],
    ['platform-coin', pack.items.coin],
    ['platform-dash-star', pack.items.dashStar],
    ['platform-goal-flag', pack.goal.texture],
  ] as const;

  imageAssets.forEach(([key, url]) => {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  });
}
```

- [ ] **Step 5: Replace the highest-visibility placeholders first**

In `PlatformGameScene.ts`:

- use `platform-player` in `createPlayer()` if loaded, else fallback
- use `platform-coin` and `platform-dash-star` in collectible creation if loaded, else fallback
- use `platform-goal-flag` in goal creation if loaded, else fallback

Do not delete the old generated textures yet. Gate them behind texture-existence checks.

- [ ] **Step 6: Create the first global SVG assets**

Create:

- `hero-maple-student.svg`
- `coin-sun.svg`
- `dash-star-bloom.svg`
- `goal-flower-flag.svg`

The art should be colorful, layered, and clearly more game-like than the current generated geometry.

- [ ] **Step 7: Re-run the tests**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: PASS

- [ ] **Step 8: Smoke-check the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/utils/assetPreloader.ts components/world/scenes/PlatformGameScene.ts public/assets/campaign-platform/characters/hero-maple-student.svg public/assets/campaign-platform/items/coin-sun.svg public/assets/campaign-platform/items/dash-star-bloom.svg public/assets/campaign-platform/items/goal-flower-flag.svg
git commit -m "feat: load global campaign platform art"
```

### Task 3: Ship the first `campaign_12` themed vertical slice

**Files:**
- Create: `public/assets/campaign-platform/backgrounds/campaign12-sky.svg`
- Create: `public/assets/campaign-platform/backgrounds/campaign12-mid.svg`
- Create: `public/assets/campaign-platform/backgrounds/campaign12-fore.svg`
- Create: `public/assets/campaign-platform/characters/enemy-valley-scout.svg`
- Modify: `lib/platformArt.ts`
- Modify: `components/world/scenes/PlatformGameScene.ts`

- [ ] **Step 1: Write the failing test for themed background layering**

Extend `__tests__/platformArt.test.ts` with:

```ts
test('campaign_12 declares three ordered background layers and a valley enemy texture', () => {
  const pack = getPlatformArtPack('campaign_12');
  expect(pack.background.layers).toEqual([
    '/assets/campaign-platform/backgrounds/campaign12-sky.svg',
    '/assets/campaign-platform/backgrounds/campaign12-mid.svg',
    '/assets/campaign-platform/backgrounds/campaign12-fore.svg',
  ]);
  expect(pack.enemies.patrol).toBe('/assets/campaign-platform/characters/enemy-valley-scout.svg');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: FAIL because the campaign_12 pack does not yet expose the full slice.

- [ ] **Step 3: Expand the campaign_12 art pack**

In `lib/platformArt.ts`, define:

- background layer ordering
- `enemies.patrol`
- stronger `specialPlatforms` tint data for the valley pack
- shell-theme token values for the campaign shell

- [ ] **Step 4: Render SVG background layers in the scene**

In `PlatformGameScene.ts`, update `createBackground()` so that:

- `campaign_12` adds three image layers before any fallback graphics
- each layer uses a different `scrollFactor`
- old gradient/hill graphics remain fallback for themes without art layers

Suggested pattern:

```ts
private createThemedBackgroundLayers(themeId: PlatformThemeId, worldWidth: number, worldHeight: number) {
  const pack = getPlatformArtPack(themeId);
  const scrollFactors = [0.15, 0.35, 0.6];

  pack.background.layers.forEach((texture, index) => {
    const key = `platform-bg-${themeId}-${index}`;
    if (!this.textures.exists(key)) {
      this.load.image(key, texture);
    }
    const layer = this.add.image(worldWidth / 2, worldHeight / 2, key);
    layer.setDisplaySize(worldWidth, worldHeight);
    layer.setScrollFactor(scrollFactors[index] ?? 1);
    layer.setDepth(-100 + index);
  });
}
```

If dynamic loading during `create()` becomes awkward, preload the keys in `preload()` based on the current theme and only instantiate here.

- [ ] **Step 5: Upgrade enemy and platform presentation for the themed slice**

In `PlatformGameScene.ts`:

- map one standard enemy type used by `campaign_12` to `enemy-valley-scout.svg`
- tint standard platforms with the valley theme data from `lib/platformArt.ts`
- keep collision sizes unchanged

- [ ] **Step 6: Create the `campaign_12` background and enemy SVG files**

Create the four files listed in this task with a layered, student-friendly valley/waterfall presentation.

- [ ] **Step 7: Re-run the tests**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: PASS

- [ ] **Step 8: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/platformArt.ts components/world/scenes/PlatformGameScene.ts public/assets/campaign-platform/backgrounds/campaign12-sky.svg public/assets/campaign-platform/backgrounds/campaign12-mid.svg public/assets/campaign-platform/backgrounds/campaign12-fore.svg public/assets/campaign-platform/characters/enemy-valley-scout.svg
git commit -m "feat: add campaign 12 platform art slice"
```

### Task 4: Reskin the React campaign shell and mobile controls

**Files:**
- Modify: `components/game/PlatformGame.tsx`
- Modify: `components/game/CampaignSelector.tsx`
- Modify: `components/game/VirtualController.tsx`
- Modify: `components/game/LevelCompleteModal.tsx`
- Modify: `lib/platformArt.ts`

- [ ] **Step 1: Write a failing test for shell-theme token coverage**

Extend `__tests__/platformArt.test.ts` with:

```ts
test('all advanced platform themes provide shell token classes', () => {
  for (const themeId of ['campaign_12', 'campaign_13', 'campaign_14', 'campaign_15', 'campaign_16'] as const) {
    const theme = getPlatformShellTheme(themeId);
    expect(theme.chromeClassName.length).toBeGreaterThan(0);
    expect(theme.panelClassName.length).toBeGreaterThan(0);
    expect(theme.accentClassName.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: FAIL if any of the shell-theme mappings are incomplete.

- [ ] **Step 3: Complete shell-theme token coverage**

Fill the theme tokens in `lib/platformArt.ts` so every advanced platform campaign returns complete UI classes.

- [ ] **Step 4: Apply the theme tokens in `PlatformGame.tsx`**

Use the selected/current campaign theme to restyle:

- the sticky top chrome
- level cards
- action buttons
- game viewport frame

Keep logic unchanged; only adjust presentation and class structure.

- [ ] **Step 5: Refresh `CampaignSelector.tsx` presentation**

Upgrade:

- hero header
- campaign cards
- reward chips
- level entry CTA styling

Use the existing SVG icon strategy already in the file, but make the shell more premium and more obviously game-oriented.

- [ ] **Step 6: Refresh `VirtualController.tsx` and `LevelCompleteModal.tsx`**

Make the controls and completion modal match the new platform frontend:

- more polished button shells
- clearer label hierarchy
- less generic gray overlays

- [ ] **Step 7: Re-run the tests**

Run: `npm test -- __tests__/platformArt.test.ts`

Expected: PASS

- [ ] **Step 8: Run the production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add components/game/PlatformGame.tsx components/game/CampaignSelector.tsx components/game/VirtualController.tsx components/game/LevelCompleteModal.tsx lib/platformArt.ts
git commit -m "feat: reskin campaign platform shell"
```
