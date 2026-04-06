import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { chromium, request as playwrightRequest } from '@playwright/test';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3200';
const API_BASE = process.env.SYSTEM_QA_API_BASE || 'http://127.0.0.1:8000/api/v1';
const DB_PATH = process.env.SYSTEM_QA_DB_PATH || path.resolve('backend', 'code_adventure.db');
const ARTIFACT_DIR = path.resolve('.tmp-system-update-qa');
const CUTOFF_CREATED_AT = '2026-04-05 09:07:44';

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function authStorageValue(auth) {
  return JSON.stringify({
    state: {
      token: auth.token,
      user: auth.user,
      isAuthenticated: true,
    },
    version: 0,
  });
}

async function apiRequest(api, method, url, data) {
  const response = await api.fetch(url, {
    method,
    data,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error(`${method} ${url} -> ${response.status()}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function createEligibleQaUser() {
  const api = await playwrightRequest.newContext({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const seed = Date.now();
  const username = `system_pet_${seed}`;
  const email = `${username}@example.com`;
  const password = 'QaPass123!';

  await apiRequest(api, 'POST', `${API_BASE}/auth/register`, {
    username,
    email,
    password,
  });

  const login = await apiRequest(api, 'POST', `${API_BASE}/auth/login`, {
    username,
    password,
  });

  await api.dispose();

  return {
    token: login.access_token,
    user: login.user,
  };
}

function backdateUserAndPrepareEgg(userId) {
  const pythonScript = `
import sqlite3
import sys

db_path = sys.argv[1]
user_id = int(sys.argv[2])
created_at = sys.argv[3]

connection = sqlite3.connect(db_path)
try:
    connection.execute("UPDATE users SET created_at = ? WHERE id = ?", (created_at, user_id))
    connection.execute(
        """
        UPDATE pets
        SET hatch_progress = 3,
            is_egg = 1,
            pet_type = 'egg',
            pet_style = 'unknown',
            status = 'egg',
            evolution_stage = 0
        WHERE user_id = ? AND is_egg = 1
        """,
        (user_id,),
    )
    connection.commit()
finally:
    connection.close()
`;

  const result = spawnSync('python', ['-c', pythonScript, DB_PATH, String(userId), CUTOFF_CREATED_AT], {
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to prepare QA user: ${result.stderr || result.stdout}`);
  }
}

async function main() {
  ensureArtifactDir();

  const auth = await createEligibleQaUser();
  backdateUserAndPrepareEgg(auth.user.id);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
  });

  await context.addInitScript(
    ({ storedAuth, userId }) => {
      window.localStorage.setItem('auth-storage', storedAuth);
      window.localStorage.setItem(`newUserGuideCompleted:${userId}`, 'true');
      window.localStorage.setItem('newUserGuideCompleted', 'true');
      window.localStorage.setItem(`petWelcomeGuideCompleted:${userId}`, 'true');
      window.localStorage.setItem('petWelcomeGuideCompleted', 'true');
    },
    {
      storedAuth: authStorageValue(auth),
      userId: auth.user.id,
    }
  );

  const page = await context.newPage();

  try {
    await page.goto(FRONTEND_ORIGIN, { waitUntil: 'domcontentloaded' });

    await page.locator('[data-testid="system-update-modal"]').waitFor({ timeout: 20000 });
    const announcementText = await page.locator('[data-testid="system-update-modal"]').innerText();
    if (!announcementText.includes('1000')) {
      throw new Error(`Announcement modal did not mention 1000 coins: ${announcementText}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'system-update-modal.png'),
      fullPage: true,
    });

    await page.locator('[data-testid="coin-balance-button"]').waitFor({ timeout: 10000 });
    await page.waitForFunction(
      () => {
        const button = document.querySelector('[data-testid="coin-balance-button"]');
        return button ? button.textContent?.replace(/\s+/g, '').includes('1,100') : false;
      },
      { timeout: 10000 }
    );

    await page.locator('[data-testid="system-update-confirm"]').click();
    await page.locator('[data-testid="system-update-button"]').waitFor({ timeout: 10000 });

    await page.locator('[data-testid="system-update-button"]').click();
    await page.locator('[data-testid="system-update-modal"]').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="system-update-confirm"]').click();

    await page.locator('[data-testid="coin-balance-button"]').click();
    await page.locator('[data-testid="coin-history-modal"]').waitFor({ timeout: 10000 });
    const historyText = await page.locator('[data-testid="coin-history-modal"]').innerText();
    if (!historyText.includes('系统更新补给') || !historyText.includes('1000')) {
      throw new Error(`Coin history did not contain the update compensation entry: ${historyText}`);
    }
    await page.locator('[data-testid="coin-history-close"]').click();

    await page.locator('[data-testid="pet-egg-panel-toggle"]').click();
    await page.locator('[data-testid="pet-egg-panel"]').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="pet-hatch-button"]').click();
    await page.locator('[data-testid="pet-selection-modal"]').waitFor({ timeout: 10000 });

    const cuteCardClassName = await page.locator('[data-testid="pet-style-cute"]').evaluate((element) => element.className);
    if (!cuteCardClassName.includes('from-rose-950') || cuteCardClassName.includes('from-rose-100')) {
      throw new Error(`Cute pet style card is not using the dark shell: ${cuteCardClassName}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'pet-selection-modal.png'),
      fullPage: true,
    });

    const result = {
      status: 'ok',
      user: auth.user.username,
      balanceVerified: true,
      noticeVerified: true,
      coinHistoryVerified: true,
      petSelectionVerified: true,
      artifacts: {
        systemUpdateModal: path.join(ARTIFACT_DIR, 'system-update-modal.png'),
        petSelectionModal: path.join(ARTIFACT_DIR, 'pet-selection-modal.png'),
      },
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
