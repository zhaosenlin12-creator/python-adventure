import fs from 'node:fs';
import path from 'node:path';
import { chromium, request as playwrightRequest } from '@playwright/test';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3017';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000/api/v1';
const ARTIFACT_DIR = path.join(process.cwd(), 'qa-artifacts');
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 430, height: 932 };

const LIVING_PLACEMENTS = [
  { id: 1, decoration_id: 'plant_flower', x: 18, y: 82, rotation: 0, scene: 'living' },
  { id: 2, decoration_id: 'lamp_floor', x: 30, y: 82, rotation: 0, scene: 'living' },
  { id: 3, decoration_id: 'toy_teddy', x: 40, y: 81, rotation: 0, scene: 'living' },
  { id: 4, decoration_id: 'music_box', x: 58, y: 81, rotation: 0, scene: 'living' },
  { id: 5, decoration_id: 'rug_round', x: 52, y: 88, rotation: 0, scene: 'living' },
  { id: 6, decoration_id: 'fish_tank', x: 74, y: 80, rotation: 0, scene: 'living' },
  { id: 7, decoration_id: 'picture_frame', x: 78, y: 38, rotation: 0, scene: 'living' },
  { id: 8, decoration_id: 'bookshelf', x: 60, y: 46, rotation: 0, scene: 'living' },
  { id: 9, decoration_id: 'fairy_lights', x: 54, y: 36, rotation: 0, scene: 'living' },
];

const GARDEN_PLACEMENTS = [
  { id: 10, decoration_id: 'plant_small', x: 18, y: 77, rotation: 0, scene: 'garden' },
  { id: 11, decoration_id: 'plant_tree', x: 32, y: 72, rotation: 0, scene: 'garden' },
  { id: 12, decoration_id: 'cat_tower', x: 50, y: 78, rotation: 0, scene: 'garden' },
  { id: 13, decoration_id: 'cactus', x: 67, y: 78, rotation: 0, scene: 'garden' },
  { id: 14, decoration_id: 'flower_vase', x: 80, y: 75, rotation: 0, scene: 'garden' },
];

const DECORATION_ICON_PATHS = [
  'furniture-sofa.svg',
  'furniture-table.svg',
  'furniture-bookshelf.svg',
  'furniture-lamp.svg',
  'furniture-rug.svg',
  'furniture-clock.svg',
  'furniture-bed.svg',
  'fun-tv.svg',
  'decor-frame.svg',
  'decor-fairylights.svg',
  'plant-small.svg',
  'plant-flower.svg',
  'plant-tree.svg',
  'nature-cactus.svg',
  'nature-vase.svg',
  'nature-fishtank.svg',
  'toy-ball.svg',
  'toy-robot.svg',
  'toy-teddy.svg',
  'fun-cattower.svg',
  'fun-musicbox.svg',
];

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function authStorageValue(token, user) {
  return JSON.stringify({
    state: {
      token,
      user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

async function seedQaSession() {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const username = `petartaudit_${seed}`;
  const email = `${username}@example.com`;
  const password = 'QaPass123!';

  let response = await api.post(`${API_BASE}/auth/register`, {
    data: { username, email, password },
  });
  if (!response.ok()) {
    throw new Error(`register failed: ${await response.text()}`);
  }

  response = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  if (!response.ok()) {
    throw new Error(`login failed: ${await response.text()}`);
  }
  const loginPayload = await response.json();
  const token = loginPayload.access_token;
  const user = loginPayload.user;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const pets = [
    { pet_type: 'code_dragon', pet_style: 'mythic', name: 'art-home-dragon' },
    { pet_type: 'pom_angel', pet_style: 'cute', name: 'art-home-pom' },
  ];

  let activePetId = null;
  for (const pet of pets) {
    response = await api.post(`${API_BASE}/pets/create`, {
      headers: authHeaders,
      data: pet,
    });
    if (!response.ok()) {
      throw new Error(`create pet failed: ${await response.text()}`);
    }
    const created = await response.json();
    if (!activePetId) {
      activePetId = created.pet.id;
    }
  }

  response = await api.post(`${API_BASE}/pets/${activePetId}/set-active`, {
    headers: authHeaders,
  });
  if (!response.ok()) {
    throw new Error(`set active failed: ${await response.text()}`);
  }

  await api.dispose();
  return { token, user, username };
}

async function loadDecorationIcons(page) {
  const iconUrls = DECORATION_ICON_PATHS.map((iconPath) => `${FRONTEND_ORIGIN}/icons/decorations/${iconPath}`);
  return page.evaluate(async (paths) => {
    const results = [];
    for (const iconPath of paths) {
      const result = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            path: iconPath,
            ok: true,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => {
          resolve({
            path: iconPath,
            ok: false,
          });
        };
        img.src = iconPath;
      });
      results.push(result);
    }
    return results;
  }, iconUrls);
}

async function collectDecorationRenderStats(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-decoration-render]')).filter((node) => {
      const element = node;
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0;
    });

    const imageIds = [];
    const emojiIds = [];
    for (const node of nodes) {
      const render = node.getAttribute('data-decoration-render');
      const decorationId = node.getAttribute('data-decoration-id') || 'unknown';
      if (render === 'image') {
        imageIds.push(decorationId);
      } else if (render === 'emoji') {
        emojiIds.push(decorationId);
      }
    }

    return {
      total: nodes.length,
      imageCount: imageIds.length,
      emojiCount: emojiIds.length,
      imageIds,
      emojiIds,
    };
  });
}

async function openPetHome(page) {
  await page.goto(FRONTEND_ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  const skipGuide = page.getByText('跳过引导');
  if (await skipGuide.count()) {
    await skipGuide.click();
    await page.waitForTimeout(500);
  }

  await page.locator('img.pet-sprite-panel').click();
  await page.waitForTimeout(500);
  await page.mouse.click(245, 475);
  await page.waitForTimeout(2500);
}

async function switchToGarden(page) {
  const gardenButton = page.locator('button[title="切换到庭院"]');
  if (await gardenButton.count()) {
    await gardenButton.click();
  } else {
    await page.mouse.click(1156, 56);
  }
  await page.waitForTimeout(2200);
}

async function stubDecorationEndpoints(page) {
  await page.route('**/api/v1/decorations/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
  await page.route('**/api/v1/decorations/placed', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([...LIVING_PLACEMENTS, ...GARDEN_PLACEMENTS]),
    });
  });
}

async function createAuditedContext(browser, session, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(
    ({ storedAuth, userId }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem(`petWelcomeGuideCompleted:${userId}`, 'true');
      window.localStorage.setItem(`newUserGuideCompleted:${userId}`, 'true');
      window.localStorage.setItem('newUserGuideCompleted', 'true');
      window.localStorage.setItem('pet-home-guide-completed', 'true');
    },
    {
      storedAuth: authStorageValue(session.token, session.user),
      userId: session.user.id,
    }
  );
  return context;
}

async function main() {
  ensureArtifactDir();
  const session = await seedQaSession();

  const browser = await chromium.launch({ headless: true });
  const desktopContext = await createAuditedContext(browser, session, DESKTOP_VIEWPORT);
  const desktopPage = await desktopContext.newPage();
  await stubDecorationEndpoints(desktopPage);

  await openPetHome(desktopPage);
  const livingPath = path.join(ARTIFACT_DIR, 'pet-home-art-pass-living-v4.png');
  await desktopPage.screenshot({ path: livingPath, fullPage: false });
  const livingRenderAudit = await collectDecorationRenderStats(desktopPage);

  await switchToGarden(desktopPage);
  const gardenPath = path.join(ARTIFACT_DIR, 'pet-home-art-pass-garden-v4.png');
  await desktopPage.screenshot({ path: gardenPath, fullPage: false });
  const gardenRenderAudit = await collectDecorationRenderStats(desktopPage);

  const mobileContext = await createAuditedContext(browser, session, MOBILE_VIEWPORT);
  const mobilePage = await mobileContext.newPage();
  await stubDecorationEndpoints(mobilePage);

  await openPetHome(mobilePage);
  const livingMobilePath = path.join(ARTIFACT_DIR, 'pet-home-art-pass-living-mobile-v4.png');
  await mobilePage.screenshot({ path: livingMobilePath, fullPage: false });
  const livingMobileRenderAudit = await collectDecorationRenderStats(mobilePage);

  await switchToGarden(mobilePage);
  const gardenMobilePath = path.join(ARTIFACT_DIR, 'pet-home-art-pass-garden-mobile-v4.png');
  await mobilePage.screenshot({ path: gardenMobilePath, fullPage: false });
  const gardenMobileRenderAudit = await collectDecorationRenderStats(mobilePage);

  const iconAudit = await loadDecorationIcons(desktopPage);
  const iconFailures = iconAudit.filter((item) => !item.ok);
  const renderEmojiFailures = [
    livingRenderAudit,
    gardenRenderAudit,
    livingMobileRenderAudit,
    gardenMobileRenderAudit,
  ].flatMap((entry) => entry.emojiIds);

  const report = {
    generatedAt: new Date().toISOString(),
    frontendOrigin: FRONTEND_ORIGIN,
    seededUser: session.username,
    livingScreenshot: path.relative(process.cwd(), livingPath),
    gardenScreenshot: path.relative(process.cwd(), gardenPath),
    livingMobileScreenshot: path.relative(process.cwd(), livingMobilePath),
    gardenMobileScreenshot: path.relative(process.cwd(), gardenMobilePath),
    sceneRenderAudit: {
      desktopLiving: livingRenderAudit,
      desktopGarden: gardenRenderAudit,
      mobileLiving: livingMobileRenderAudit,
      mobileGarden: gardenMobileRenderAudit,
      emojiFallbackFailures: renderEmojiFailures,
    },
    decorationIconAudit: {
      total: iconAudit.length,
      passed: iconAudit.length - iconFailures.length,
      failed: iconFailures.length,
      failures: iconFailures,
    },
  };

  const reportPath = path.join(ARTIFACT_DIR, 'pet-home-art-audit-v4.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));

  await desktopContext.close();
  await mobileContext.close();
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
