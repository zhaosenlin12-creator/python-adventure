import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "https://game.codebn.cn").replace(/\/+$/, "");
const API_BASE = (process.env.API_BASE || `${FRONTEND_ORIGIN}/api/v1`).replace(/\/+$/, "");
const QA_USERNAME = process.env.QA_REAL_USERNAME?.trim();
const QA_PASSWORD = process.env.QA_REAL_PASSWORD ?? "";
const FIRST_LEVEL_ID = "shadow-cell-1";
const FIRST_LEVEL_MARKER = `code_research:${FIRST_LEVEL_ID}`;
const FIRST_LEVEL_STARS_KEY = `code_research:${FIRST_LEVEL_ID}:stars`;
const FIRST_LEVEL_BEST_STEPS_KEY = `code_research:${FIRST_LEVEL_ID}:bestSteps`;
const FIRST_LEVEL_REWARD_KEY = `code_research:${FIRST_LEVEL_ID}:rewardClaimedAt`;
const ARTIFACT_DIR = path.resolve(".tmp-production-online-audit");
const FIRST_LEVEL_SOLUTION = `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sanitizeUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    if (parsed.searchParams.has("token")) {
      parsed.searchParams.set("token", "[REDACTED]");
    }
    return parsed.toString();
  } catch {
    return urlValue;
  }
}

async function waitForReachable(url, name, retries = 30) {
  let lastError = null;
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status < 500) return;
      lastError = new Error(`${name} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} unreachable after ${retries}s: ${String(lastError)}`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: response.ok, status: response.status, text, json };
}

async function loginByApi() {
  assert(QA_USERNAME && QA_PASSWORD, "QA_REAL_USERNAME and QA_REAL_PASSWORD are required for production audit.");
  const loginResponse = await requestJson(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: QA_USERNAME, password: QA_PASSWORD }),
  });
  assert(loginResponse.ok, `auth/login failed: ${loginResponse.status} ${loginResponse.text}`);
  return loginResponse.json;
}

async function authedGet(token, route) {
  return requestJson(`${API_BASE}${route}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
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

async function fillLoginForm(page, username, password) {
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 60000 });
  const inputs = page.locator("input");
  const inputCount = await inputs.count();

  let userFilled = false;
  for (let index = 0; index < inputCount; index += 1) {
    const input = inputs.nth(index);
    if (!(await input.isVisible())) continue;
    const type = ((await input.getAttribute("type")) || "text").toLowerCase();
    if (type === "password" || type === "hidden") continue;
    await input.fill(username);
    userFilled = true;
    break;
  }
  assert(userFilled, "Could not locate visible username input.");
  await passwordInput.fill(password);

  const buttonSelectors = [
    'button:has-text("登录")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    'button[type="submit"]',
  ];
  let clicked = false;
  for (const selector of buttonSelectors) {
    const button = page.locator(selector).first();
    if ((await button.count()) === 0) continue;
    if (!(await button.isVisible())) continue;
    await button.click();
    clicked = true;
    break;
  }
  assert(clicked, "Could not locate login submit button.");
}

async function waitForUrlChange(page, previousUrl, timeoutMs = 12000) {
  try {
    await page.waitForURL((url) => url.toString() !== previousUrl, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function clickFirstPlayableNode(page, retries = 6) {
  const selector = ".cr-dungeon-node.is-playable";
  let lastError = null;
  for (let index = 0; index < retries; index += 1) {
    const count = await page.locator(selector).count();
    if (count === 0) {
      await page.waitForTimeout(350);
      continue;
    }
    try {
      const clicked = await page.evaluate((nodeSelector) => {
        const node = document.querySelector(nodeSelector);
        if (!(node instanceof HTMLElement)) return false;
        node.scrollIntoView({ block: "center", inline: "center" });
        node.click();
        return true;
      }, selector);
      if (clicked) {
        await page.waitForTimeout(500);
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Failed to click playable node after ${retries} retries: ${String(lastError)}`);
}

async function openFirstPlayableLevel(page, timeoutMs = 30000) {
  await clickFirstPlayableNode(page);
  const startButton = page.locator(".cr-selected-card-modern .cr-start-btn").first();
  const levelScreen = page.locator(".cr-level-screen").first();

  try {
    await startButton.waitFor({ timeout: 8000 });
    await startButton.click();
  } catch {
    if (!(await levelScreen.isVisible().catch(() => false))) {
      await clickFirstPlayableNode(page);
      await startButton.waitFor({ timeout: 12000 });
      await startButton.click();
    }
  }

  await levelScreen.waitFor({ timeout: timeoutMs });
}

async function returnToMapFromVictory(page) {
  const candidates = [
    '[data-testid="code-research-victory-modal"] .cr-victory-actions .cr-tool-btn',
    '[data-testid="code-research-victory-modal"] button:has-text("地图")',
    '[data-testid="code-research-victory-modal"] button:has-text("Map")',
    '[data-testid="code-research-victory-modal"] button',
  ];
  for (const selector of candidates) {
    const button = page.locator(selector).first();
    if ((await button.count()) === 0) continue;
    if (!(await button.isVisible())) continue;
    await button.click();
    return;
  }
  throw new Error("Could not locate a button to return to dungeon map from victory modal.");
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await waitForReachable(FRONTEND_ORIGIN, "frontend");
  await waitForReachable(`${API_BASE}/auth/login`, "backend-auth");

  const authPayload = await loginByApi();
  const token = authPayload.access_token;
  const user = authPayload.user;
  const username = QA_USERNAME;
  const password = QA_PASSWORD;

  const initialBalanceResponse = await authedGet(token, "/coins/balance");
  assert(initialBalanceResponse.ok, `initial balance read failed: ${initialBalanceResponse.status} ${initialBalanceResponse.text}`);
  const initialBalance = Number(initialBalanceResponse.json?.coins ?? 0);

  const initialProgressResponse = await authedGet(token, "/progress/load");
  assert(initialProgressResponse.ok, `initial progress load failed: ${initialProgressResponse.status} ${initialProgressResponse.text}`);
  const initialCompletedCampaignLevels = initialProgressResponse.json?.completed_campaign_levels ?? [];
  const wasLevelCompletedBefore = initialCompletedCampaignLevels.includes(FIRST_LEVEL_MARKER);

  const initialHistoryResponse = await authedGet(token, "/coins/history?limit=50");
  assert(initialHistoryResponse.ok, `initial history read failed: ${initialHistoryResponse.status} ${initialHistoryResponse.text}`);
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
  await page.addInitScript(() => {
    const nativeOpen = window.open.bind(window);
    window.__qaLastWindowOpenUrl = null;
    window.open = (...args) => {
      window.__qaLastWindowOpenUrl = args[0] ? String(args[0]) : null;
      return nativeOpen(...args);
    };
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("Failed to start background music")) return;
    consoleErrors.push(text);
  });

  try {
    await page.goto(FRONTEND_ORIGIN, { waitUntil: "domcontentloaded" });
    await fillLoginForm(page, username, password);

    await page.locator('[data-testid="ai-research-button"]').waitFor({ timeout: 45000 });
    await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 45000 });
    await dismissHomeOverlays(page);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "home.png"), fullPage: true });

    let coinHistoryModalVisible = false;
    const coinButton = page.locator('[data-testid="coin-balance-button"]').first();
    if ((await coinButton.count()) > 0) {
      await coinButton.click();
      const coinModal = page.locator('[data-testid="coin-history-modal"]');
      await coinModal.waitFor({ timeout: 12000 });
      coinHistoryModalVisible = true;
      if ((await page.locator('[data-testid="coin-history-close"]').count()) > 0) {
        await page.locator('[data-testid="coin-history-close"]').first().click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    await page.goto(`${FRONTEND_ORIGIN}/world`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const worldPageLoaded = page.url().includes("/world");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "world.png"), fullPage: true });
    await page.goto(FRONTEND_ORIGIN, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 30000 });
    await dismissHomeOverlays(page);

    const typingButton = page.locator('[data-testid="typing-entry-button"]').first();
    let typingEntryWorks = false;
    let typingTarget = page.url();
    if ((await typingButton.count()) > 0) {
      const typingBefore = page.url();
      await typingButton.click();
      const typingChanged = await waitForUrlChange(page, typingBefore, 12000);
      typingTarget = page.url();
      typingEntryWorks = typingChanged && typingTarget !== typingBefore;
      await page.goto(FRONTEND_ORIGIN, { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 30000 });
      await dismissHomeOverlays(page);
    }

    const aiButton = page.locator('[data-testid="ai-research-button"]').first();
    const homeUrl = page.url();
    const popupPromise = context.waitForEvent("page", { timeout: 6000 }).catch(() => null);
    await aiButton.click();
    const openCallUrl = await page.evaluate(() => window.__qaLastWindowOpenUrl || null);
    const popupPage = await popupPromise;
    let aiUrl = page.url();
    let aiEntryWorks = false;
    if (popupPage) {
      await popupPage.waitForLoadState("domcontentloaded", { timeout: 12000 }).catch(() => {});
      aiUrl = popupPage.url();
      aiEntryWorks = Boolean(aiUrl && aiUrl !== "about:blank");
      await popupPage.close().catch(() => {});
    } else {
      const aiEntryChangedUrl = await waitForUrlChange(page, homeUrl, 12000);
      aiUrl = page.url();
      aiEntryWorks = aiEntryChangedUrl && aiUrl !== homeUrl;
    }
    if (!aiEntryWorks && openCallUrl) {
      aiUrl = openCallUrl;
      aiEntryWorks = true;
    }
    await page.goto(FRONTEND_ORIGIN, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 30000 });
    await dismissHomeOverlays(page);

    await page.locator('[data-testid="code-research-button"]').click();
    await page.waitForURL("**/code-research", { timeout: 20000 });
    await page.locator('[data-testid="code-research-chapter-grid"]').waitFor({ timeout: 30000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "code-research-chapters.png"), fullPage: true });

    const chapterCards = page.locator('[data-testid="code-research-chapter-card"]');
    assert((await chapterCards.count()) > 0, "No chapter cards found on code research chapter page.");
    await chapterCards.first().click();

    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 30000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "code-research-map.png"), fullPage: true });

    const playableNodes = page.locator(".cr-dungeon-node.is-playable");
    assert((await playableNodes.count()) > 0, "No playable dungeon node found.");
    await openFirstPlayableLevel(page, 30000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "code-research-level.png"), fullPage: true });

    let guideDrawerOpen = false;
    const guideButtons = page.locator(".cr-guided-top-actions .cr-hint-toggle");
    if ((await guideButtons.count()) > 0) {
      await guideButtons.first().click();
      const drawer = page.locator('[data-testid="code-research-drawer"]');
      try {
        await drawer.waitFor({ timeout: 12000 });
        guideDrawerOpen = true;
        const closeButton = drawer.locator(".cr-tool-btn").first();
        if ((await closeButton.count()) > 0) {
          await closeButton.click();
        } else {
          await page.keyboard.press("Escape");
        }
      } catch {
        guideDrawerOpen = false;
      }
    }

    let aiCompanionOpen = false;
    let aiCompanionReply = false;
    const companionBtn = page.locator(".cr-ai-companion-btn").first();
    if ((await companionBtn.count()) > 0) {
      await companionBtn.click();
      const modal = page.locator('[data-testid="learning-companion-modal"]');
      await modal.waitFor({ timeout: 15000 });
      aiCompanionOpen = true;
      const bubbles = modal.locator(".space-y-3 > .flex");
      const beforeBubbleCount = await bubbles.count();
      const companionQuestion = "请给我这一关第一步要做什么？";
      await modal.locator("input").first().fill(companionQuestion);

      const sendButton = modal.locator('button:has-text("Send"), button:has-text("发送"), button:has-text("鍙戦€?")').first();
      if ((await sendButton.count()) > 0) {
        await sendButton.click();
      } else {
        await modal.locator("input").first().press("Enter");
      }

      await bubbles
        .filter({ hasText: companionQuestion })
        .first()
        .waitFor({ timeout: 12000 });

      try {
        await page.waitForFunction(
          ({ selector, baseline }) => {
            const modalNode = document.querySelector(selector);
            if (!modalNode) return false;
            const items = modalNode.querySelectorAll(".space-y-3 > .flex");
            return items.length >= baseline + 2;
          },
          { selector: '[data-testid="learning-companion-modal"]', baseline: beforeBubbleCount },
          { timeout: 20000 },
        );
        aiCompanionReply = true;
      } catch {
        aiCompanionReply = false;
      }

      await modal.locator('button[aria-label="Close"]').click();
    }

    const editor = page.locator('[data-testid="code-research-editor"]');
    await editor.fill("x\ny");
    await editor.evaluate((el) => {
      const input = el;
      input.focus();
      input.setSelectionRange(0, 0);
      input.dispatchEvent(new Event("select", { bubbles: true }));
    });

    const commandChips = page.locator('[data-testid="code-research-command-chip"]');
    assert((await commandChips.count()) > 0, "No command chips found in toolbox.");
    const firstChipText = ((await commandChips.first().innerText()) || "").trim();
    await commandChips.first().click();
    await page.waitForTimeout(250);
    const codeAfterChip = await editor.inputValue();
    const commandChipInsertedAtCursor = !codeAfterChip.startsWith("x");

    await editor.fill(FIRST_LEVEL_SOLUTION);
    await page.locator('[data-testid="code-research-run"]').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "victory-first-clear.png"), fullPage: true });

    const firstBalanceResponse = await authedGet(token, "/coins/balance");
    assert(firstBalanceResponse.ok, `post-clear balance read failed: ${firstBalanceResponse.status} ${firstBalanceResponse.text}`);
    const balanceAfterFirstClear = Number(firstBalanceResponse.json?.coins ?? 0);

    const firstHistoryResponse = await authedGet(token, "/coins/history?limit=50");
    assert(firstHistoryResponse.ok, `post-clear history read failed: ${firstHistoryResponse.status} ${firstHistoryResponse.text}`);
    const firstCodeResearchTransactions = (firstHistoryResponse.json?.transactions ?? []).filter(
      (transaction) => transaction?.source === "code_research",
    );

    const progressResponse = await authedGet(token, "/progress/load");
    assert(progressResponse.ok, `progress load failed: ${progressResponse.status} ${progressResponse.text}`);
    const completedCampaignLevels = progressResponse.json?.completed_campaign_levels ?? [];
    const campaignProgress = progressResponse.json?.campaign_progress ?? {};
    const rewardClaimedValue = Number(campaignProgress[FIRST_LEVEL_REWARD_KEY] ?? 0);

    await returnToMapFromVictory(page);
    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 20000 });
    await openFirstPlayableLevel(page, 20000);
    await editor.fill(FIRST_LEVEL_SOLUTION);
    await page.locator('[data-testid="code-research-run"]').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "victory-replay.png"), fullPage: true });

    const replayBalanceResponse = await authedGet(token, "/coins/balance");
    assert(replayBalanceResponse.ok, `post-replay balance read failed: ${replayBalanceResponse.status} ${replayBalanceResponse.text}`);
    const balanceAfterReplay = Number(replayBalanceResponse.json?.coins ?? 0);

    const replayHistoryResponse = await authedGet(token, "/coins/history?limit=50");
    assert(replayHistoryResponse.ok, `post-replay history read failed: ${replayHistoryResponse.status} ${replayHistoryResponse.text}`);
    const replayCodeResearchTransactions = (replayHistoryResponse.json?.transactions ?? []).filter(
      (transaction) => transaction?.source === "code_research",
    );

    const firstClearCoinRuleOk = wasLevelCompletedBefore
      ? balanceAfterFirstClear === initialBalance
      : balanceAfterFirstClear > initialBalance;
    const firstClearHistoryRuleOk = wasLevelCompletedBefore
      ? firstCodeResearchTransactions.length === initialCodeResearchTransactionCount
      : firstCodeResearchTransactions.length === initialCodeResearchTransactionCount + 1;

    const result = {
      status: "ok",
      frontend: FRONTEND_ORIGIN,
      backend: API_BASE,
      account: {
        id: user.id,
        username: user.username,
      },
      verified: {
        loginUiSuccess: true,
        homeActionButtonsVisible: true,
        coinHistoryModalVisible,
        worldPageLoaded,
        typingEntryWorks,
        aiResearchEntryWorks: aiEntryWorks,
        codeResearchChapterGridLoads: true,
        dungeonMapLoads: true,
        guideDrawerOpen,
        aiCompanionOpen,
        aiCompanionReply,
        commandChipInsertedAtCursor,
        firstLevelVictory: true,
        progressMarkerSyncedToServer: completedCampaignLevels.includes(FIRST_LEVEL_MARKER),
        starsSyncedToServer: Number(campaignProgress[FIRST_LEVEL_STARS_KEY] ?? 0) >= 1,
        bestStepsSyncedToServer: Number(campaignProgress[FIRST_LEVEL_BEST_STEPS_KEY] ?? 0) >= 1,
        rewardClaimedMarkerPersisted: wasLevelCompletedBefore ? "not-required-for-legacy-completions" : rewardClaimedValue > 0,
        firstClearCoinRuleOk,
        firstClearHistoryRuleOk,
        replayDidNotRegrantCoins: balanceAfterReplay === balanceAfterFirstClear,
        replayDidNotCreateDuplicateTransactions: replayCodeResearchTransactions.length === firstCodeResearchTransactions.length,
      },
      values: {
        initialBalance,
        balanceAfterFirstClear,
        balanceAfterReplay,
        wasLevelCompletedBefore,
        initialCodeResearchTransactionCount,
        codeResearchTransactionsAfterFirstClear: firstCodeResearchTransactions.length,
        codeResearchTransactionsAfterReplay: replayCodeResearchTransactions.length,
        firstChipText,
        codeAfterChip,
        typingEntryTarget: sanitizeUrl(typingTarget),
        aiEntryTarget: aiUrl,
        aiWindowOpenCallUrl: openCallUrl,
      },
      consoleErrors,
      artifacts: {
        home: path.join(ARTIFACT_DIR, "home.png"),
        world: path.join(ARTIFACT_DIR, "world.png"),
        chapters: path.join(ARTIFACT_DIR, "code-research-chapters.png"),
        map: path.join(ARTIFACT_DIR, "code-research-map.png"),
        level: path.join(ARTIFACT_DIR, "code-research-level.png"),
        firstVictory: path.join(ARTIFACT_DIR, "victory-first-clear.png"),
        replayVictory: path.join(ARTIFACT_DIR, "victory-replay.png"),
      },
      auditDate: new Date().toISOString(),
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
