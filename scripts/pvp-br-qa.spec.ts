import { test, expect, request as playwrightRequest, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3003';
const API_BASE = 'http://127.0.0.1:8000/api/v1';
const ARTIFACT_DIR = path.join(process.env.TEMP || process.cwd(), 'game-google-br-qa');

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function authStorageValue(token: string, user: any) {
  return JSON.stringify({
    state: {
      token,
      user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

function gameStorageValue(skills: string[]) {
  return JSON.stringify({
    state: {
      skills,
      selectedAgeGroup: 'primary-upper',
    },
    version: 0,
  });
}

async function registerAndLogin(api: APIRequestContext, username: string, password: string) {
  const email = `${username}@example.com`;

  const registerResponse = await api.post(`${API_BASE}/auth/register`, {
    data: { username, email, password },
  });
  expect(registerResponse.ok(), await registerResponse.text()).toBeTruthy();

  const loginResponse = await api.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();
  const loginPayload = await loginResponse.json();

  return {
    token: loginPayload.access_token as string,
    user: loginPayload.user,
  };
}

async function seedBrowserAuth(context: BrowserContext, token: string, user: any) {
  await context.addInitScript(
    ({ storedAuth, storedGame }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem('game-storage', storedGame);
      window.localStorage.setItem('editor-tutorial-completed', 'true');
      window.localStorage.setItem('newUserGuideCompleted', 'true');
      window.localStorage.setItem('pet-home-guide-completed', 'true');
    },
    {
      storedAuth: authStorageValue(token, user),
      storedGame: gameStorageValue(['double_jump', 'dash']),
    },
  );
}

async function openBattleRoyaleLobby(page: Page) {
  await page.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('stationInteraction', {
        detail: { stationId: 'battle_royale' },
      }),
    );
  });
  await expect(page.getByTestId('br-lobby')).toBeVisible({ timeout: 15000 });
}

test('battle royale world entry and room flow smoke', async ({ browser }) => {
  test.setTimeout(120000);
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const username = `brqa_${seed}`;
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
  const user = loginPayload.user;

  const fullHostName = `brfull_${seed}`;
  const fullGuestName = `brguest_${seed}`;
  const fullHostEmail = `${fullHostName}@example.com`;
  const fullGuestEmail = `${fullGuestName}@example.com`;

  const fullHostRegister = await api.post(`${API_BASE}/auth/register`, {
    data: { username: fullHostName, email: fullHostEmail, password },
  });
  expect(fullHostRegister.ok(), await fullHostRegister.text()).toBeTruthy();

  const fullGuestRegister = await api.post(`${API_BASE}/auth/register`, {
    data: { username: fullGuestName, email: fullGuestEmail, password },
  });
  expect(fullGuestRegister.ok(), await fullGuestRegister.text()).toBeTruthy();

  const fullHostLogin = await api.post(`${API_BASE}/auth/login`, {
    data: { username: fullHostName, password },
  });
  expect(fullHostLogin.ok(), await fullHostLogin.text()).toBeTruthy();
  const fullHostToken = (await fullHostLogin.json()).access_token as string;

  const fullGuestLogin = await api.post(`${API_BASE}/auth/login`, {
    data: { username: fullGuestName, password },
  });
  expect(fullGuestLogin.ok(), await fullGuestLogin.text()).toBeTruthy();
  const fullGuestToken = (await fullGuestLogin.json()).access_token as string;

  const fullRoomCreate = await api.post(`${API_BASE}/pvp-br/rooms/create`, {
    headers: { Authorization: `Bearer ${fullHostToken}` },
    data: {
      username: fullHostName,
      pet_type: 'code_kitty',
      pet_name: 'host-cat',
      pet_stage: 3,
      movement_skills: ['double_jump'],
      age_group: 'primary-upper',
      room_name: '满员测试房',
      max_players: 2,
    },
  });
  expect(fullRoomCreate.ok(), await fullRoomCreate.text()).toBeTruthy();
  const fullRoomPayload = await fullRoomCreate.json();

  const fullRoomJoin = await api.post(`${API_BASE}/pvp-br/rooms/${fullRoomPayload.room.id}/join`, {
    headers: { Authorization: `Bearer ${fullGuestToken}` },
    data: {
      username: fullGuestName,
      pet_type: 'silver_lynx',
      pet_name: 'guest-lynx',
      pet_stage: 3,
      movement_skills: ['double_jump'],
      age_group: 'primary-upper',
    },
  });
  expect(fullRoomJoin.ok(), await fullRoomJoin.text()).toBeTruthy();

  const createPetResponse = await api.post(`${API_BASE}/pets/create`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'br-dragon',
      pet_type: 'code_dragon',
      pet_style: 'mythic',
    },
  });
  expect(createPetResponse.ok(), await createPetResponse.text()).toBeTruthy();
  const createdPet = (await createPetResponse.json()).pet;

  const setActiveResponse = await api.post(`${API_BASE}/pets/${createdPet.id}/set-active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(setActiveResponse.ok(), await setActiveResponse.text()).toBeTruthy();
  await api.dispose();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  await context.addInitScript(
    ({ storedAuth, storedGame }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem('game-storage', storedGame);
      window.localStorage.setItem('editor-tutorial-completed', 'true');
      window.localStorage.setItem('newUserGuideCompleted', 'true');
      window.localStorage.setItem('pet-home-guide-completed', 'true');
    },
    {
      storedAuth: authStorageValue(token, user),
      storedGame: gameStorageValue(['double_jump', 'dash']),
    },
  );

  const page = await context.newPage();
  await page.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('stationInteraction', {
        detail: { stationId: 'battle_royale' },
      }),
    );
  });

  await expect(page.getByTestId('br-lobby')).toBeVisible({ timeout: 15000 });
  const fullRoomButton = page.getByRole('button', { name: '房间已满' }).first();
  await expect(fullRoomButton).toBeVisible({ timeout: 15000 });
  await expect(fullRoomButton).toBeDisabled();
  ensureArtifactDir();
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '01-br-lobby.png'),
    fullPage: true,
  });

  await page.getByTestId('br-create-room').click();
  await expect(page.getByTestId('br-room')).toBeVisible({ timeout: 15000 });

  await page.getByTestId('br-add-bot').click();
  await expect(page.getByTestId('br-room')).toBeVisible({ timeout: 10000 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '02-br-room.png'),
    fullPage: true,
  });

  await page.getByTestId('br-start-match').click();
  await expect(page.getByTestId('br-arena')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.getByTestId('br-arena').click({ position: { x: 240, y: 240 } });
  const earlySnapshot = await page.evaluate(() => {
    return (window as any).__brSnapshot ?? null;
  });

  await page.waitForTimeout(6000);
  await expect(page.getByTestId('br-arena-status')).toBeVisible({ timeout: 10000 });
  const laterSnapshot = await page.evaluate(() => {
    return (window as any).__brSnapshot ?? null;
  });
  const arenaStatusText = await page.getByTestId('br-arena-status').textContent();

  expect(earlySnapshot).toBeTruthy();
  expect(laterSnapshot).toBeTruthy();
  expect(laterSnapshot.elapsedMs).toBeGreaterThan(4000);
  expect(laterSnapshot.platforms.length).toBeGreaterThan(20);
  expect(laterSnapshot.platforms.some((platform: any) => platform.kind === 'moving')).toBeTruthy();
  expect(laterSnapshot.platforms.some((platform: any) => platform.kind === 'bounce')).toBeTruthy();
  expect(arenaStatusText).not.toContain('战斗即将开始');
  const spawnXs = earlySnapshot.fighters.map((fighter: any) => fighter.x);
  expect(Math.max(...spawnXs) - Math.min(...spawnXs)).toBeGreaterThan(1800);

  const earlyBot = earlySnapshot.fighters.find((fighter: any) => fighter.isBot);
  const laterBot = laterSnapshot.fighters.find((fighter: any) => fighter.id === earlyBot?.id);
  expect(earlyBot).toBeTruthy();
  expect(laterBot).toBeTruthy();
  const movementDelta =
    Math.abs((laterBot?.x ?? 0) - (earlyBot?.x ?? 0)) +
    Math.abs((laterBot?.y ?? 0) - (earlyBot?.y ?? 0));
  expect(movementDelta).toBeGreaterThan(25);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j' }));
  });
  const swingSnapshot = await page.evaluate(() => {
    return (window as any).__brSnapshot ?? null;
  });
  const swingFighter = swingSnapshot.fighters.find((fighter: any) => !fighter.isBot);
  expect(swingFighter).toBeTruthy();
  expect(
    (swingFighter?.swingMs ?? 0) > 0 ||
      swingSnapshot.effects.some((effect: any) => effect.kind === 'slash'),
  ).toBeTruthy();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  });
  await page.waitForTimeout(140);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
  });
  const dashSnapshot = await page.evaluate(() => {
    return (window as any).__brSnapshot ?? null;
  });
  expect(dashSnapshot.effects.some((effect: any) => effect.kind === 'dash')).toBeTruthy();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
  });
  await page.waitForTimeout(280);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'k' }));
  });
  const throwSnapshot = await page.evaluate(() => {
    return (window as any).__brSnapshot ?? null;
  });
  const localFighter = throwSnapshot.fighters.find((fighter: any) => !fighter.isBot);
  expect(localFighter).toBeTruthy();
  expect(localFighter.weaponReady).toBeFalsy();
  expect((throwSnapshot.projectiles?.length ?? 0) + (throwSnapshot.weapons?.length ?? 0)).toBeGreaterThan(0);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '03-br-arena.png'),
    fullPage: true,
  });

  await context.close();
});

test('battle royale host start syncs guest and guest can recover after reload', async ({ browser }) => {
  test.setTimeout(180000);

  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const password = 'QaPass123!';
  const host = await registerAndLogin(api, `brsync_host_${seed}`, password);
  const guest = await registerAndLogin(api, `brsync_guest_${seed}`, password);

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await seedBrowserAuth(hostContext, host.token, host.user);
  await seedBrowserAuth(guestContext, guest.token, guest.user);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const roomName = `同步房${seed}`;

  await Promise.all([openBattleRoyaleLobby(hostPage), openBattleRoyaleLobby(guestPage)]);

  await hostPage.getByRole('textbox', { name: '房间名称' }).fill(roomName);
  await hostPage.getByTestId('br-create-room').click();
  await expect
    .poll(async () => hostPage.locator('body').innerText(), { timeout: 15000 })
    .toContain('WAITING ROOM');

  await expect
    .poll(async () => guestPage.locator('body').innerText(), { timeout: 20000 })
    .toContain(roomName);
  await guestPage
    .locator('div')
    .filter({ hasText: roomName })
    .getByRole('button', { name: '加入房间' })
    .last()
    .click();
  await expect
    .poll(async () => guestPage.locator('body').innerText(), { timeout: 15000 })
    .toContain('WAITING ROOM');

  await hostPage.getByTestId('br-start-match').click();
  await expect
    .poll(async () => hostPage.locator('body').innerText(), { timeout: 15000 })
    .toContain('Space');
  await expect
    .poll(async () => guestPage.locator('body').innerText(), { timeout: 15000 })
    .toContain('Space');

  await guestPage.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: 'domcontentloaded' });
  await guestPage.waitForTimeout(2500);
  await guestPage.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('stationInteraction', {
        detail: { stationId: 'battle_royale' },
      }),
    );
  });

  await expect
    .poll(async () => guestPage.locator('body').innerText(), { timeout: 15000 })
    .toContain('Space');

  await guestContext.close();
  await hostContext.close();
  await api.dispose();
});

test('battle royale waiting room connection badge stays stable while sync polling runs', async ({ browser }) => {
  test.setTimeout(120000);

  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const password = 'QaPass123!';
  const host = await registerAndLogin(api, `brstable_host_${seed}`, password);

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await seedBrowserAuth(hostContext, host.token, host.user);

  const hostPage = await hostContext.newPage();
  await openBattleRoyaleLobby(hostPage);

  await hostPage.getByRole('textbox', { name: '房间名称' }).fill(`稳定等待房${seed}`);
  await hostPage.getByTestId('br-create-room').click();
  await expect(hostPage.getByTestId('br-room')).toBeVisible({ timeout: 15000 });
  await expect(hostPage.getByTestId('br-room-connection-badge')).toContainText('实时同步中', { timeout: 15000 });

  const connectionSamples = await hostPage.evaluate(async () => {
    const samples: Array<{ badge: string; notice: string }> = [];
    const startedAt = performance.now();

    while (performance.now() - startedAt < 9800) {
      const badge = document.querySelector('[data-testid="br-room-connection-badge"]')?.textContent?.trim() ?? '';
      const notice = document.querySelector('[data-testid="br-room-notice"]')?.textContent?.trim() ?? '';
      samples.push({ badge, notice });
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    return samples;
  });

  expect(connectionSamples.some((sample) => sample.badge.includes('等待重连'))).toBeFalsy();
  expect(connectionSamples.some((sample) => sample.notice.includes('自动重连'))).toBeFalsy();

  await hostContext.close();
  await api.dispose();
});

test('battle royale guest render stays smooth while moving after room start', async ({ browser }) => {
  test.setTimeout(180000);

  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const password = 'QaPass123!';
  const host = await registerAndLogin(api, `brsmooth_host_${seed}`, password);
  const guest = await registerAndLogin(api, `brsmooth_guest_${seed}`, password);

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await seedBrowserAuth(hostContext, host.token, host.user);
  await seedBrowserAuth(guestContext, guest.token, guest.user);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await Promise.all([openBattleRoyaleLobby(hostPage), openBattleRoyaleLobby(guestPage)]);

  await hostPage.getByRole('textbox', { name: '房间名称' }).fill(`流畅房${seed}`);
  await hostPage.getByTestId('br-create-room').click();
  await expect(hostPage.getByTestId('br-room')).toBeVisible({ timeout: 15000 });

  await expect
    .poll(async () => guestPage.locator('body').innerText(), { timeout: 20000 })
    .toContain(`流畅房${seed}`);
  await guestPage
    .locator('div')
    .filter({ hasText: `流畅房${seed}` })
    .getByRole('button', { name: '加入房间' })
    .last()
    .click();
  await expect(guestPage.getByTestId('br-room')).toBeVisible({ timeout: 15000 });

  await hostPage.getByTestId('br-start-match').click();
  await expect(hostPage.getByTestId('br-arena')).toBeVisible({ timeout: 15000 });
  await expect(guestPage.getByTestId('br-arena')).toBeVisible({ timeout: 15000 });
  await guestPage.getByTestId('br-arena').click({ position: { x: 240, y: 240 } });

  await guestPage.keyboard.down('d');
  const sampledXs: number[] = [];
  for (let index = 0; index < 36; index += 1) {
    const currentX = await guestPage.evaluate((userId: number) => {
      const snapshot = (window as any).__brRenderSnapshot ?? (window as any).__brSnapshot ?? null;
      const fighter = snapshot?.fighters?.find((item: any) => item.id === `human-${userId}`);
      return typeof fighter?.x === 'number' ? Math.round(fighter.x) : -1;
    }, guest.user.id);
    sampledXs.push(currentX);
    await guestPage.waitForTimeout(25);
  }
  await guestPage.keyboard.up('d');

  const effectiveSamples = sampledXs.filter((value) => value >= 0);
  const movementChanges = effectiveSamples.filter((value, index) => index === 0 || Math.abs(value - effectiveSamples[index - 1]) >= 2);
  const travelDistance = effectiveSamples[effectiveSamples.length - 1] - effectiveSamples[0];
  const hostSyncStats = await hostPage.evaluate(() => (window as any).__brSyncStats ?? null);
  const guestSyncStats = await guestPage.evaluate(() => (window as any).__brSyncStats ?? null);

  expect(effectiveSamples.length).toBeGreaterThan(24);
  expect(movementChanges.length).toBeGreaterThan(8);
  expect(travelDistance).toBeGreaterThan(180);
  expect(hostSyncStats?.platformsStripped).toBeTruthy();
  expect(hostSyncStats?.lastWireSnapshotBytes).toBeGreaterThan(0);
  expect(hostSyncStats?.lastWireSnapshotBytes).toBeLessThan(hostSyncStats?.lastFullSnapshotBytes ?? 0);
  expect(guestSyncStats?.authoritativeSnapshots).toBeGreaterThan(4);
  expect(guestSyncStats?.inputMessagesSent).toBeGreaterThan(8);

  await guestContext.close();
  await hostContext.close();
  await api.dispose();
});
