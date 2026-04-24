import { chromium } from '@playwright/test';

const baseUrl = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3000';
const ageGroup = 'junior-high';

const campaignsToVerify = [
  { id: 'campaign_11', completedThrough: 10 },
  { id: 'campaign_12', completedThrough: 11 },
  { id: 'campaign_13', completedThrough: 12 },
  { id: 'campaign_14', completedThrough: 13 },
  { id: 'campaign_15', completedThrough: 14 },
  { id: 'campaign_16', completedThrough: 15 },
];

const allSkills = [
  'double_jump',
  'dash',
  'wall_jump',
  'glide',
  'time_slow',
  'chemical_shield',
  'quantum_dash',
  'academic_master',
];

function buildState(completedThrough, unlockedLevelIds = []) {
  const completedCampaigns = Array.from({ length: completedThrough }, (_, i) => `campaign_${i + 1}`);

  return {
    authState: {
      state: {
        token: 'dev-token',
        user: {
          id: 1,
          username: 'qa',
          email: 'qa@example.com',
          level: 20,
          experience: 9999,
          coins: 9999,
        },
        isAuthenticated: true,
      },
      version: 0,
    },
    gameState: {
      state: {
        arenaScore: 0,
        skills: allSkills,
        arenaHighScore: 0,
        completedChallenges: [],
        hasKey: false,
        xp: 9999,
        level: 20,
        coins: 9999,
        inventory: [],
        completedLevels: [],
        completedCampaigns,
        completedCampaignLevels: unlockedLevelIds,
        campaignProgress: Object.fromEntries(completedCampaigns.map((id) => [id, 5])),
        selectedAgeGroup: ageGroup,
        ageGroupCampaignProgress: {
          [ageGroup]: {
            completed: completedCampaigns,
            levels: unlockedLevelIds,
          },
        },
      },
      version: 0,
    },
  };
}

async function seedState(page, completedThrough, unlockedLevelIds = []) {
  const { authState, gameState } = buildState(completedThrough, unlockedLevelIds);
  await page.addInitScript(({ authState, gameState }) => {
    window.localStorage.setItem('auth-storage', JSON.stringify(authState));
    window.localStorage.setItem('game-storage', JSON.stringify(gameState));
  }, { authState, gameState });
}

async function openCampaignSelector(page) {
  await page.goto(`${baseUrl}/world`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('stationInteraction', { detail: { stationId: 'campaign' } }));
  });
  await page.waitForFunction(() => document.querySelectorAll('[data-campaign-id]').length > 0, null, {
    timeout: 15000,
  });
}

async function getLevelIds(browser, campaign) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await seedState(page, campaign.completedThrough);
  await openCampaignSelector(page);

  const totalCampaignCards = await page.locator('[data-campaign-id]').count();
  await page.locator(`[data-campaign-id="${campaign.id}"]`).click();
  const levelIds = await page.locator('[data-level-id]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('data-level-id'))
      .filter(Boolean)
  );

  await page.close();

  if (totalCampaignCards !== 16) {
    throw new Error(`${campaign.id}: expected 16 campaign cards, got ${totalCampaignCards}`);
  }

  return levelIds;
}

function summarizeLevelData(levelData) {
  const map = levelData?.campaignMapData || {};
  const platforms = map.platforms || [];

  return {
    title: levelData?.title ?? '',
    width: map.width || 0,
    height: map.height || 0,
    platforms: platforms.length,
    disappearingPlatforms: platforms.filter((platform) => Number.isFinite(platform.disappearTime)).length,
    conveyors: platforms.filter((platform) => Number.isFinite(platform.conveyorSpeed)).length,
    bouncyPlatforms: platforms.filter((platform) => platform.bouncy).length,
    autoMovingPlatforms: (map.autoMovingPlatforms || []).length,
    portals: (map.portals || []).length,
    gravityZones: (map.gravityZones || []).length,
    windZones: (map.windZones || []).length,
    explosionTraps: (map.explosionTraps || []).length,
    traps: (map.traps || []).length,
    enemies: (map.enemies || []).map((enemy) => enemy.type),
    hasBoss: Boolean(levelData?.bossConfig),
  };
}

async function summarizeLevel(browser, campaign, levelId, unlockedLevelIds) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await seedState(page, campaign.completedThrough, unlockedLevelIds);
  await openCampaignSelector(page);

  await page.locator(`[data-campaign-id="${campaign.id}"]`).click();
  await page.locator(`[data-level-id="${levelId}"]`).click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    const game = window.__platformPhaserGame;

    const sceneFromKeys = game?.scene?.keys?.PlatformGameScene ?? null;
    let sceneFromGetter = null;
    if (!sceneFromKeys && typeof game?.scene?.getScene === 'function') {
      try {
        sceneFromGetter = game.scene.getScene('PlatformGameScene');
      } catch {
        sceneFromGetter = null;
      }
    }

    const scene = sceneFromKeys || sceneFromGetter;
    return (
      !!canvas &&
      canvas.width > 0 &&
      canvas.height > 0 &&
      !!scene &&
      !!scene.levelData &&
      !!scene.levelData.campaignMapData
    );
  }, null, {
    timeout: 15000,
  });

  const levelSummary = await page.evaluate(() => {
    const game = window.__platformPhaserGame;
    const sceneFromKeys = game?.scene?.keys?.PlatformGameScene ?? null;

    let sceneFromGetter = null;
    if (!sceneFromKeys && typeof game?.scene?.getScene === 'function') {
      try {
        sceneFromGetter = game.scene.getScene('PlatformGameScene');
      } catch {
        sceneFromGetter = null;
      }
    }

    const scene = sceneFromKeys || sceneFromGetter;
    if (!scene) {
      return {
        canvas: null,
        level: null,
        debug: {
          hasGame: Boolean(game),
          sceneKeys: game?.scene?.keys ? Object.keys(game.scene.keys) : [],
        },
      };
    }

    const canvas = document.querySelector('canvas');

    return {
      canvas: canvas
        ? {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
          }
        : null,
      level: {
        title: scene.levelData?.title ?? '',
        campaignMapData: scene.levelData?.campaignMapData ?? {},
        bossConfig: scene.levelData?.bossConfig ?? null,
      },
      debug: {
        hasGame: Boolean(game),
        sceneKeys: game?.scene?.keys ? Object.keys(game.scene.keys) : [],
      },
    };
  });

  await page.close();

  if (!levelSummary?.canvas || levelSummary.canvas.width <= 0 || levelSummary.canvas.height <= 0) {
    throw new Error(`${campaign.id}/${levelId}: Phaser canvas did not mount`);
  }

  return {
    levelId,
    ...summarizeLevelData(levelSummary.level),
  };
}

function hasEnemy(level, enemyType) {
  return level.enemies.includes(enemyType);
}

function verifyCampaignTheme(campaignId, levels) {
  const checks = {
    campaign_11: [
      {
        ok: levels.some((level) => level.disappearingPlatforms > 0),
        message: 'campaign_11 should still use fake-route disappearing platforms',
      },
      {
        ok: levels.some((level) => level.portals > 0),
        message: 'campaign_11 should still include return-orientation portal routing',
      },
      {
        ok: levels.some((level) => level.windZones > 0),
        message: 'campaign_11 should still include reverse-wind route reading',
      },
      {
        ok: levels.some(
          (level) =>
            level.disappearingPlatforms > 0 &&
            level.portals > 0 &&
            level.windZones > 0 &&
            level.autoMovingPlatforms > 0
        ),
        message: 'campaign_11 final synthesis level should combine fake bridge, portal, wind, and moving timing',
      },
    ],
    campaign_12: [
      {
        ok: levels.some((level) => level.bouncyPlatforms > 0),
        message: 'campaign_12 should still use recovery bounce pads',
      },
      {
        ok: levels.some((level) => level.autoMovingPlatforms > 0),
        message: 'campaign_12 should still use bottom-to-top recovery lifts',
      },
      {
        ok: levels.some((level) => level.height >= 2200),
        message: 'campaign_12 should still include a tall vertical drop tower',
      },
      {
        ok: levels.some(
          (level) =>
            level.bouncyPlatforms > 0 &&
            level.autoMovingPlatforms > 0 &&
            level.hasBoss &&
            level.height >= 2400
        ),
        message: 'campaign_12 capstone should mix drop, rebound, lift, and a full boss-pressure finale',
      },
    ],
    campaign_13: [
      {
        ok: levels.every((level) => level.portals >= 2),
        message: 'campaign_13 should keep portals in every level',
      },
      {
        ok: levels.some((level) => level.gravityZones > 0),
        message: 'campaign_13 should still include mirror-gravity re-reading',
      },
      {
        ok: levels.some((level) => level.portals >= 6),
        message: 'campaign_13 should still include a dense portal-loop level',
      },
      {
        ok: levels.some((level) => level.hasBoss && hasEnemy(level, 'boss')),
        message: 'campaign_13 should still end in a mirror boss arena',
      },
    ],
    campaign_14: [
      {
        ok: levels.every((level) => level.traps > 0),
        message: 'campaign_14 should keep periodic gate pressure in every level',
      },
      {
        ok: levels.some((level) => level.conveyors > 0),
        message: 'campaign_14 should still include conveyor timing sections',
      },
      {
        ok: levels.some((level) => level.autoMovingPlatforms > 0 && level.explosionTraps > 0),
        message: 'campaign_14 should still include moving-platform rhythm with blast timing',
      },
      {
        ok: levels.some((level) => level.windZones > 0),
        message: 'campaign_14 should still include wind-window timing',
      },
    ],
    campaign_15: [
      {
        ok: levels.some((level) => level.disappearingPlatforms > 0),
        message: 'campaign_15 should still open with fake-bridge micro-room training',
      },
      {
        ok: levels.some((level) => level.portals > 0 && level.windZones > 0),
        message: 'campaign_15 should still include reverse-run room logic',
      },
      {
        ok: levels.some((level) => level.gravityZones > 0 && level.autoMovingPlatforms > 0),
        message: 'campaign_15 should still include lift + gravity chain rooms',
      },
      {
        ok: levels.some(
          (level) => level.portals > 0 && level.gravityZones > 0 && level.explosionTraps > 0 && hasEnemy(level, 'robot')
        ),
        message: 'campaign_15 capstone should still combine multiple room archetypes',
      },
    ],
    campaign_16: [
      {
        ok: levels.some((level) => level.disappearingPlatforms > 0),
        message: 'campaign_16 should still reuse fake-route collapse pressure',
      },
      {
        ok: levels.some((level) => level.bouncyPlatforms > 0 && level.autoMovingPlatforms > 0),
        message: 'campaign_16 should still include vertical recovery synthesis',
      },
      {
        ok: levels.some((level) => level.portals >= 4),
        message: 'campaign_16 should still include full advance-retreat mirror routing',
      },
      {
        ok: levels.some((level) => level.explosionTraps > 0 && level.hasBoss && hasEnemy(level, 'boss')),
        message: 'campaign_16 finale should still be a mixed-mechanic boss arena',
      },
    ],
  };

  for (const check of checks[campaignId] || []) {
    if (!check.ok) {
      throw new Error(`${campaignId}: ${check.message}`);
    }
  }
}

function printCampaignSummary(campaignId, levels) {
  console.log(`\n[deep-audit] ${campaignId}`);
  for (const level of levels) {
    const featureSummary = [
      `${level.platforms} platforms`,
      level.disappearingPlatforms ? `${level.disappearingPlatforms} vanish` : null,
      level.conveyors ? `${level.conveyors} conveyors` : null,
      level.bouncyPlatforms ? `${level.bouncyPlatforms} bounce` : null,
      level.autoMovingPlatforms ? `${level.autoMovingPlatforms} auto` : null,
      level.portals ? `${level.portals} portals` : null,
      level.gravityZones ? `${level.gravityZones} gravity` : null,
      level.windZones ? `${level.windZones} wind` : null,
      level.explosionTraps ? `${level.explosionTraps} blast` : null,
      level.traps ? `${level.traps} traps` : null,
      level.enemies.length ? `enemies=${level.enemies.join(',')}` : null,
      level.hasBoss ? 'boss' : null,
    ]
      .filter(Boolean)
      .join(' | ');

    console.log(`  - ${level.levelId}: ${level.title} :: ${featureSummary}`);
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const campaign of campaignsToVerify) {
    const levelIds = await getLevelIds(browser, campaign);

    if (levelIds.length !== 5) {
      throw new Error(`${campaign.id}: expected 5 levels, got ${levelIds.length}`);
    }

    const levels = [];
    for (const [index, levelId] of levelIds.entries()) {
      const unlockedLevelIds = levelIds.slice(0, index);
      levels.push(await summarizeLevel(browser, campaign, levelId, unlockedLevelIds));
    }

    verifyCampaignTheme(campaign.id, levels);
    printCampaignSummary(campaign.id, levels);
    results.push({ campaign: campaign.id, levels });
  }
} finally {
  await browser.close();
}

console.log('\n[deep-audit] PASS');
console.log(JSON.stringify(results, null, 2));
