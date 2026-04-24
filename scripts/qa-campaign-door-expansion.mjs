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
}

async function getCampaignLevelIds(browser, campaign, totalCampaignCardsRef) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await seedState(page, campaign.completedThrough);
  await openCampaignSelector(page);

  const totalCampaignCards = await page.locator('[data-campaign-id]').count();
  totalCampaignCardsRef.value = totalCampaignCards;

  const campaignCard = page.locator(`[data-campaign-id="${campaign.id}"]`);
  await campaignCard.waitFor({ timeout: 15000 });
  await campaignCard.click();

  const levelIds = await page.locator('[data-level-id]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('data-level-id'))
      .filter((value) => Boolean(value))
  );

  await page.close();
  return levelIds;
}

async function verifyLevel(browser, campaign, levelId, levelIndex, unlockedLevelIds) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await seedState(page, campaign.completedThrough, unlockedLevelIds);
  await openCampaignSelector(page);

  await page.locator(`[data-campaign-id="${campaign.id}"]`).waitFor({ timeout: 15000 });
  await page.locator(`[data-campaign-id="${campaign.id}"]`).click();
  await page.locator(`[data-level-id="${levelId}"]`).waitFor({ timeout: 15000 });
  await page.locator(`[data-level-id="${levelId}"]`).click();
  await page.waitForTimeout(3500);

  const bodyText = await page.locator('body').innerText();
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    return {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    };
  });

  await page.close();

  if (!bodyText.includes(`第${levelIndex + 1}关`)) {
    throw new Error(`${campaign.id}/${levelId}: failed to enter expected level index ${levelIndex + 1}`);
  }

  if (!canvasInfo || canvasInfo.width <= 0 || canvasInfo.height <= 0) {
    throw new Error(`${campaign.id}/${levelId}: Phaser canvas did not mount`);
  }

  return {
    levelId,
    canvasInfo,
    bodyPreview: bodyText.slice(0, 120),
  };
}

async function verifyCampaign(browser, campaign) {
  const totalCampaignCardsRef = { value: 0 };
  const levelIds = await getCampaignLevelIds(browser, campaign, totalCampaignCardsRef);

  if (totalCampaignCardsRef.value !== 16) {
    throw new Error(`${campaign.id}: expected 16 campaign cards, got ${totalCampaignCardsRef.value}`);
  }

  if (levelIds.length !== 5) {
    throw new Error(`${campaign.id}: expected 5 levels, got ${levelIds.length}`);
  }

  const levelResults = [];
  for (const [index, levelId] of levelIds.entries()) {
    const unlockedLevelIds = levelIds.slice(0, index);
    const levelResult = await verifyLevel(browser, campaign, levelId, index, unlockedLevelIds);
    levelResults.push(levelResult);
    console.log(`[qa] ${campaign.id}/${levelId} ok`);
  }

  return {
    id: campaign.id,
    totalCampaignCards: totalCampaignCardsRef.value,
    totalLevels: levelIds.length,
    levels: levelResults,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const campaign of campaignsToVerify) {
    const result = await verifyCampaign(browser, campaign);
    results.push(result);
    console.log(`[qa] ${campaign.id} full sweep ok`);
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
