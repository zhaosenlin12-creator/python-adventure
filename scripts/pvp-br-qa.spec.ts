import { test, expect, request as playwrightRequest } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const FRONTEND_ORIGIN = 'http://127.0.0.1:3000';
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

test('battle royale world entry and room flow smoke', async ({ browser }) => {
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
    ({ storedAuth }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem('editor-tutorial-completed', 'true');
      window.localStorage.setItem('newUserGuideCompleted', 'true');
      window.localStorage.setItem('pet-home-guide-completed', 'true');
    },
    {
      storedAuth: authStorageValue(token, user),
    }
  );

  const page = await context.newPage();
  await page.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('stationInteraction', {
        detail: { stationId: 'battle_royale' },
      })
    );
  });

  await expect(page.getByTestId('br-lobby')).toBeVisible({ timeout: 15000 });
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
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('br-arena-status')).toBeVisible({ timeout: 10000 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '03-br-arena.png'),
    fullPage: true,
  });

  await context.close();
});
