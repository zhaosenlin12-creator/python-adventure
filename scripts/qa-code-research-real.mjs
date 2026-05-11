import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:3003";
const API_BASE = process.env.API_BASE || "http://127.0.0.1:8000/api/v1";
const ARTIFACT_DIR = path.resolve(".tmp-code-research-real-qa");
const CODE_RESEARCH_PREFIX = "code_research";
const FIRST_LEVEL_ID = "shadow-cell-1";
const FIRST_LEVEL_MARKER = `${CODE_RESEARCH_PREFIX}:${FIRST_LEVEL_ID}`;
const FIRST_LEVEL_STARS_KEY = `${CODE_RESEARCH_PREFIX}:${FIRST_LEVEL_ID}:stars`;
const FIRST_LEVEL_BEST_STEPS_KEY = `${CODE_RESEARCH_PREFIX}:${FIRST_LEVEL_ID}:bestSteps`;
const FIRST_LEVEL_REWARD_KEY = `${CODE_RESEARCH_PREFIX}:${FIRST_LEVEL_ID}:rewardClaimedAt`;

function uniqueUsername() {
  return `qa_real_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForReachable(url, name, retries = 30) {
  let lastError = null;
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${name} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} unreachable after ${retries}s: ${String(lastError)}`);
}

async function registerAndLogin() {
  const username = uniqueUsername();
  const password = "Qa123456!";
  const email = `${username}@example.com`;
  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  if (!registerResponse.ok) {
    const text = await registerResponse.text();
    throw new Error(`register failed: ${registerResponse.status} ${text}`);
  }

  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!loginResponse.ok) {
    const text = await loginResponse.text();
    throw new Error(`login failed: ${loginResponse.status} ${text}`);
  }

  const payload = await loginResponse.json();
  return {
    username,
    password,
    token: payload.access_token,
    user: payload.user,
  };
}

async function loginExisting(username, password) {
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!loginResponse.ok) {
    const text = await loginResponse.text();
    throw new Error(`existing account login failed: ${loginResponse.status} ${text}`);
  }
  const payload = await loginResponse.json();
  return {
    username,
    password,
    token: payload.access_token,
    user: payload.user,
    isExistingAccount: true,
  };
}

async function authedGet(token, route) {
  const response = await fetch(`${API_BASE}${route}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: response.ok, status: response.status, text, json };
}

async function dismissHomeOverlays(page) {
  const updateModal = page.locator('[data-testid="system-update-modal"]');
  if (await updateModal.count()) {
    if (await updateModal.first().isVisible()) {
      if (await page.locator('[data-testid="system-update-confirm"]').count()) {
        await page.locator('[data-testid="system-update-confirm"]').first().click({ timeout: 10000 });
      } else if (await page.locator('[data-testid="system-update-close"]').count()) {
        await page.locator('[data-testid="system-update-close"]').first().click({ timeout: 10000 });
      } else {
        await page.keyboard.press("Escape");
      }
    }
  }
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await waitForReachable(`${FRONTEND_ORIGIN}`, "frontend");
  await waitForReachable(`${API_BASE.replace("/api/v1", "")}/health`, "backend");

  const envUsername = process.env.QA_REAL_USERNAME?.trim();
  const envPassword = process.env.QA_REAL_PASSWORD ?? "";
  const account = envUsername && envPassword
    ? await loginExisting(envUsername, envPassword)
    : await registerAndLogin();
  const { token, user, username, password } = account;

  const initialBalanceResponse = await authedGet(token, "/coins/balance");
  assert(initialBalanceResponse.ok, `initial balance read failed: ${initialBalanceResponse.status} ${initialBalanceResponse.text}`);
  const initialBalance = Number(initialBalanceResponse.json?.coins ?? 0);
  const initialProgressResponse = await authedGet(token, "/progress/load");
  assert(initialProgressResponse.ok, `initial progress load failed: ${initialProgressResponse.status} ${initialProgressResponse.text}`);
  const initialCompletedCampaignLevels = initialProgressResponse.json?.completed_campaign_levels ?? [];
  const wasLevelCompletedBefore = initialCompletedCampaignLevels.includes(FIRST_LEVEL_MARKER);
  const initialHistoryResponse = await authedGet(token, "/coins/history?limit=50");
  assert(initialHistoryResponse.ok, `initial coin history read failed: ${initialHistoryResponse.status} ${initialHistoryResponse.text}`);
  const initialCodeResearchTransactions = (initialHistoryResponse.json?.transactions ?? []).filter(
    (transaction) => transaction?.source === "code_research",
  );
  const initialCodeResearchTransactionCount = initialCodeResearchTransactions.length;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
  });
  const consoleErrors = [];

  await context.addInitScript(({ userValue }) => {
    window.localStorage.setItem(`newUserGuideCompleted:${userValue.id}`, "true");
    window.localStorage.setItem("newUserGuideCompleted", "true");
    window.localStorage.setItem(`petWelcomeGuideCompleted:${userValue.id}`, "true");
    window.localStorage.setItem("petWelcomeGuideCompleted", "true");
  }, { userValue: user });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("Failed to start background music")) return;
    consoleErrors.push(text);
  });

  try {
    await page.goto(FRONTEND_ORIGIN, { waitUntil: "domcontentloaded" });
    await page.locator('input[placeholder="输入用户名"]').waitFor({ timeout: 30000 });
    await page.locator('input[placeholder="输入用户名"]').fill(username);
    await page.locator('input[placeholder="输入密码"]').fill(password);
    await page.locator('button:has-text("登录")').click();
    await page.locator('[data-testid="ai-research-button"]').waitFor({ timeout: 30000 });
    await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 30000 });
    await dismissHomeOverlays(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "home.png"), fullPage: true });

    await page.locator('[data-testid="code-research-button"]').click();
    await page.waitForURL("**/code-research", { timeout: 15000 });
    await page.locator('[data-testid="code-research-chapter-grid"]').waitFor({ timeout: 30000 });
    await page.locator('[data-testid="code-research-chapter-card"]').first().click();
    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 30000 });
    await page.locator('.cr-dungeon-node.is-playable').first().click();
    await page.locator('.cr-selected-card-modern .cr-start-btn').click();
    await page.locator('.cr-level-screen').waitFor({ timeout: 20000 });

    await page.locator('[data-testid="code-research-editor"]').fill(`hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`);
    await page.locator('[data-testid="code-research-run"]').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "victory-first-clear.png"), fullPage: true });

    const firstBalanceResponse = await authedGet(token, "/coins/balance");
    assert(firstBalanceResponse.ok, `post-clear balance read failed: ${firstBalanceResponse.status} ${firstBalanceResponse.text}`);
    const balanceAfterFirstClear = Number(firstBalanceResponse.json?.coins ?? 0);
    if (wasLevelCompletedBefore) {
      assert(
        balanceAfterFirstClear === initialBalance,
        `completed level unexpectedly granted coins: before=${initialBalance} after=${balanceAfterFirstClear}`,
      );
    } else {
      assert(balanceAfterFirstClear > initialBalance, `coins did not increase after first clear: before=${initialBalance} after=${balanceAfterFirstClear}`);
    }

    const firstHistoryResponse = await authedGet(token, "/coins/history?limit=20");
    assert(firstHistoryResponse.ok, `coin history read failed: ${firstHistoryResponse.status} ${firstHistoryResponse.text}`);
    const firstCodeResearchTransactions = (firstHistoryResponse.json?.transactions ?? []).filter(
      (transaction) => transaction?.source === "code_research",
    );
    if (wasLevelCompletedBefore) {
      assert(
        firstCodeResearchTransactions.length === initialCodeResearchTransactionCount,
        `completed level unexpectedly increased transaction count: before=${initialCodeResearchTransactionCount} after=${firstCodeResearchTransactions.length}`,
      );
    } else {
      assert(
        firstCodeResearchTransactions.length === initialCodeResearchTransactionCount + 1,
        `first clear did not create exactly one code_research transaction: before=${initialCodeResearchTransactionCount} after=${firstCodeResearchTransactions.length}`,
      );
    }

    const progressResponse = await authedGet(token, "/progress/load");
    assert(progressResponse.ok, `progress load failed: ${progressResponse.status} ${progressResponse.text}`);
    const completedCampaignLevels = progressResponse.json?.completed_campaign_levels ?? [];
    const campaignProgress = progressResponse.json?.campaign_progress ?? {};
    assert(completedCampaignLevels.includes(FIRST_LEVEL_MARKER), `missing marker ${FIRST_LEVEL_MARKER}`);
    assert(Number(campaignProgress[FIRST_LEVEL_STARS_KEY] ?? 0) >= 1, `missing stars key ${FIRST_LEVEL_STARS_KEY}`);
    assert(Number(campaignProgress[FIRST_LEVEL_BEST_STEPS_KEY] ?? 0) >= 1, `missing best steps key ${FIRST_LEVEL_BEST_STEPS_KEY}`);
    const rewardClaimedValue = Number(campaignProgress[FIRST_LEVEL_REWARD_KEY] ?? 0);
    if (!wasLevelCompletedBefore) {
      assert(rewardClaimedValue > 0, `missing reward key ${FIRST_LEVEL_REWARD_KEY}`);
    }

    await page.locator('[data-testid="code-research-victory-modal"] .cr-victory-actions .cr-tool-btn').click();
    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 20000 });
    await page.locator('.cr-dungeon-node.is-playable').first().click();
    await page.locator('.cr-selected-card-modern .cr-start-btn').click();
    await page.locator('.cr-level-screen').waitFor({ timeout: 20000 });
    await page.locator('[data-testid="code-research-editor"]').fill(`hero.wait()
hero.wait()
hero.wait()
hero.moveRight()
hero.wait()
hero.moveRight()
hero.collect()
hero.wait()
hero.moveRight()
hero.moveRight()
hero.wait()
hero.moveRight()
hero.moveRight()`);
    await page.locator('[data-testid="code-research-run"]').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "victory-replay.png"), fullPage: true });

    const replayBalanceResponse = await authedGet(token, "/coins/balance");
    assert(replayBalanceResponse.ok, `post-replay balance read failed: ${replayBalanceResponse.status} ${replayBalanceResponse.text}`);
    const balanceAfterReplay = Number(replayBalanceResponse.json?.coins ?? 0);
    assert(
      balanceAfterReplay === balanceAfterFirstClear,
      `coins changed on replay: first=${balanceAfterFirstClear} replay=${balanceAfterReplay}`,
    );

    const replayHistoryResponse = await authedGet(token, "/coins/history?limit=20");
    assert(replayHistoryResponse.ok, `coin history after replay failed: ${replayHistoryResponse.status} ${replayHistoryResponse.text}`);
    const replayCodeResearchTransactions = (replayHistoryResponse.json?.transactions ?? []).filter(
      (transaction) => transaction?.source === "code_research",
    );
    assert(
      replayCodeResearchTransactions.length === firstCodeResearchTransactions.length,
      `code_research transaction count changed on replay: first=${firstCodeResearchTransactions.length} replay=${replayCodeResearchTransactions.length}`,
    );

    const result = {
      status: "ok",
      frontend: FRONTEND_ORIGIN,
      backend: API_BASE,
      account: {
        id: user.id,
        username: user.username,
      },
      verified: {
        homeLoadedWithRealAccount: true,
        codeResearchEntryVisible: true,
        firstLevelVictory: true,
        coinRewardSyncedToServer: !wasLevelCompletedBefore,
        completedLevelDidNotRegress: wasLevelCompletedBefore ? balanceAfterFirstClear === initialBalance : true,
        progressMarkerSyncedToServer: true,
        rewardClaimedMarkerPersisted: !wasLevelCompletedBefore ? rewardClaimedValue > 0 : "not-required-for-legacy-completions",
        replayDidNotRegrantCoins: true,
        replayDidNotCreateDuplicateTransactions: true,
      },
      values: {
        initialBalance,
        balanceAfterFirstClear,
        balanceAfterReplay,
        wasLevelCompletedBefore,
        initialCodeResearchTransactionCount,
        codeResearchTransactions: replayCodeResearchTransactions.length,
      },
      consoleErrors,
      artifacts: {
        home: path.join(ARTIFACT_DIR, "home.png"),
        firstVictory: path.join(ARTIFACT_DIR, "victory-first-clear.png"),
        replayVictory: path.join(ARTIFACT_DIR, "victory-replay.png"),
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
