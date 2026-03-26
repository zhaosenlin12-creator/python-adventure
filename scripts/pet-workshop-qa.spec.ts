import { test, expect, request as playwrightRequest, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_ORIGIN = 'http://127.0.0.1:3000';
const API_BASE = 'http://127.0.0.1:8000/api/v1';
const ARTIFACT_DIR = path.join(process.env.TEMP || process.cwd(), 'game-google-pet-workshop-qa');

const PET_FIXTURES = [
  { pet_type: 'code_kitty', pet_style: 'cute', name: 'kitty-qa' },
  { pet_type: 'algo_bunny', pet_style: 'cute', name: 'bunny-qa' },
  { pet_type: 'shiba_debugger', pet_style: 'cute', name: 'shiba-qa' },
  { pet_type: 'silver_lynx', pet_style: 'cute', name: 'lynx-qa' },
  { pet_type: 'coffee_shadow', pet_style: 'cute', name: 'coffee-qa' },
  { pet_type: 'bit_bot', pet_style: 'tech', name: 'goldcat-qa' },
  { pet_type: 'data_sprite', pet_style: 'tech', name: 'collie-qa' },
  { pet_type: 'ava_ai', pet_style: 'tech', name: 'snowleopard-qa' },
  { pet_type: 'neon_hound', pet_style: 'tech', name: 'neon-qa' },
  { pet_type: 'code_dragon', pet_style: 'mythic', name: 'dragon-qa' },
  { pet_type: 'giraffe_oracle', pet_style: 'mythic', name: 'yinglong-qa' },
  { pet_type: 'snow_cat', pet_style: 'mythic', name: 'baize-qa' },
  { pet_type: 'qiongqi_howl', pet_style: 'mythic', name: 'qiongqi-qa' },
] as const;

const FOOD_FIXTURES = [
  { food_id: 'apple', quantity: 12 },
  { food_id: 'bone', quantity: 12 },
  { food_id: 'fish', quantity: 12 },
] as const;

type QaSession = {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    level: number;
    experience: number;
  };
  pets: Array<{
    id: number;
    name: string;
    petType: string;
    petStyle: string;
  }>;
  primaryPet: {
    id: number;
    name: string;
    petType: string;
  };
  worldPet: {
    id: number;
    name: string;
    petType: string;
  };
};

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function authStorageValue(token: string, user: QaSession['user']) {
  return JSON.stringify({
    state: {
      token,
      user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

async function seedQaSession(): Promise<QaSession> {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const username = `petqa_${seed}`;
  const email = `${username}@example.com`;
  const password = 'QaPass123!';

  const registerResponse = await api.post(`${API_BASE}/auth/register`, {
    data: { username, email, password },
  });
  expect(registerResponse.ok(), await registerResponse.text()).toBeTruthy();

  const loginResponse = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
  const loginPayload = await loginResponse.json();
  const token = loginPayload.access_token as string;
  const user = loginPayload.user as QaSession['user'];

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const createdPets: QaSession['pets'] = [];
  for (const pet of PET_FIXTURES) {
    const createResponse = await api.post(`${API_BASE}/pets/create`, {
      headers: authHeaders,
      data: pet,
    });
    expect(createResponse.ok(), await createResponse.text()).toBeTruthy();
    const created = await createResponse.json();
    createdPets.push(created.pet);
  }

  for (const item of FOOD_FIXTURES) {
    const addFoodResponse = await api.post(`${API_BASE}/food/add`, {
      headers: authHeaders,
      data: item,
    });
    expect(addFoodResponse.ok(), await addFoodResponse.text()).toBeTruthy();
  }

  const primaryPet = createdPets.find((pet) => pet.petType === 'code_kitty');
  const worldPet = createdPets.find((pet) => pet.petType === 'code_dragon') || createdPets[0];
  expect(primaryPet).toBeTruthy();
  expect(worldPet).toBeTruthy();

  const setPrimaryResponse = await api.post(`${API_BASE}/pets/${primaryPet!.id}/set-active`, {
    headers: authHeaders,
  });
  expect(setPrimaryResponse.ok(), await setPrimaryResponse.text()).toBeTruthy();

  await api.dispose();

  return {
    token,
    user,
    pets: createdPets,
    primaryPet: primaryPet!,
    worldPet: worldPet!,
  };
}

async function prepareContext(context: BrowserContext, session: QaSession) {
  await context.addInitScript(
    ({ storedAuth, userId }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem('editor-tutorial-completed', 'true');
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
}

async function screenshot(page: Page, fileName: string) {
  ensureArtifactDir();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, fileName),
    fullPage: true,
  });
}

async function openRootPanel(page: Page) {
  await page.goto(FRONTEND_ORIGIN, { waitUntil: 'domcontentloaded' });
  let panelOpened = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.waitForTimeout(800);
    await page.mouse.click(68, 106);
    if (await page.locator('button:has(svg.lucide-apple)').first().isVisible().catch(() => false)) {
      panelOpened = true;
      break;
    }
  }
  expect(panelOpened).toBeTruthy();
}

async function setServerActivePet(session: QaSession, petId: number) {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const response = await api.post(`${API_BASE}/pets/${petId}/set-active`);
  expect(response.ok(), await response.text()).toBeTruthy();
  await api.dispose();
}

async function fetchInventory(session: QaSession): Promise<Record<string, number>> {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  const response = await api.get(`${API_BASE}/food/inventory`);
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  await api.dispose();

  return Object.fromEntries(
    (payload.inventory || []).map((item: { food_id: string; quantity: number }) => [item.food_id, item.quantity])
  );
}

async function waitForInventoryConsumption(
  session: QaSession,
  before: Record<string, number>,
  timeoutMs = 10_000
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const after = await fetchInventory(session);
    const consumed = Object.keys(before).some((foodId) => (after[foodId] ?? 0) < (before[foodId] ?? 0));
    if (consumed) {
      return after;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Food inventory did not change after feed action');
}

async function desktopAudit(browser: Browser, session: QaSession) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  await prepareContext(context, session);

  const page = await context.newPage();
  await openRootPanel(page);
  await screenshot(page, '01-root-panel-desktop.png');

  const pokedexButton = page.locator('button:has(svg.lucide-book-open)').last();
  await pokedexButton.click();
  await expect(page.getByTestId('pet-pokedex')).toBeVisible({ timeout: 10000 });
  await screenshot(page, '02-pokedex-desktop.png');
  await page.keyboard.press('Escape');

  const beforeFeedInventory = await fetchInventory(session);
  const feedButton = page.locator('button:has(svg.lucide-apple)').last();
  await feedButton.click();
  const useButton = page.locator('button.pixel-btn.text-lg.py-3').first();
  await expect(useButton).toBeVisible({ timeout: 10000 });
  await screenshot(page, '03-feed-modal-desktop.png');
  await useButton.click();
  await waitForInventoryConsumption(session, beforeFeedInventory);
  await screenshot(page, '04-feed-success-desktop.png');
  await page.waitForTimeout(1500);

  await setServerActivePet(session, session.worldPet.id);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openRootPanel(page);

  const homeButton = page.locator('button:has(svg.lucide-house), button:has(svg.lucide-home)').last();
  await homeButton.click();
  const homeBackpackButton = page.locator('button.absolute.right-4.top-1\\/2.z-40.bg-slate-700').first();
  await expect(homeBackpackButton).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await screenshot(page, '05-pet-home-desktop.png');

  await screenshot(page, '06-home-dragon-desktop.png');

  const beforeHomeFeedInventory = await fetchInventory(session);
  await homeBackpackButton.click();
  const homeFeedButton = page.locator('button.pixel-btn.text-lg.py-3').first();
  await expect(homeFeedButton).toBeVisible({ timeout: 10000 });
  await screenshot(page, '07-home-feed-modal-desktop.png');
  await homeFeedButton.click();
  await waitForInventoryConsumption(session, beforeHomeFeedInventory);
  await page.keyboard.press('Escape');

  const closeButtons = page.locator('button.w-10.h-10.rounded-full.bg-red-600');
  if (await closeButtons.count()) {
    await closeButtons.first().click();
  }

  await page.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await screenshot(page, '08-world-follower-desktop.png');

  await page.goto(`${FRONTEND_ORIGIN}/editor`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('button.px-8.py-4.bg-gradient-to-r').first()).toBeVisible({ timeout: 20000 });
  await screenshot(page, '09-editor-menu-desktop.png');

  await page.locator('button.px-8.py-4.bg-gradient-to-r').first().click();
  await expect(page.locator('#editor-canvas')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(2000);
  await screenshot(page, '10-editor-canvas-desktop.png');

  await context.close();
}

async function mobileAudit(browser: Browser, session: QaSession) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await prepareContext(context, session);

  const page = await context.newPage();
  await page.goto(FRONTEND_ORIGIN, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('Lv.', { timeout: 30000 });
  await page.waitForTimeout(1200);
  await screenshot(page, '11-root-mobile.png');

  await page.goto(`${FRONTEND_ORIGIN}/editor`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('button.px-8.py-4.bg-gradient-to-r').first()).toBeVisible({ timeout: 20000 });
  await screenshot(page, '12-editor-menu-mobile.png');

  await page.locator('button.px-8.py-4.bg-gradient-to-r').first().click();
  await expect(page.locator('#editor-canvas')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await screenshot(page, '13-editor-mobile.png');

  await context.close();
}

test.describe.configure({ mode: 'serial' });

test('pet system and workshop qa', async ({ browser }) => {
  test.setTimeout(360_000);
  ensureArtifactDir();

  const session = await seedQaSession();
  await desktopAudit(browser, session);
  await mobileAudit(browser, session);

  const artifactFiles = fs.readdirSync(ARTIFACT_DIR).filter((file) => file.endsWith('.png'));
  expect(artifactFiles.length).toBeGreaterThanOrEqual(10);
});
