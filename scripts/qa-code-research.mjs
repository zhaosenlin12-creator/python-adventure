import fs from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3003';
const ARTIFACT_DIR = path.resolve('.tmp-code-research-qa');
const RESULT_FILE = process.env.QA_CODE_RESEARCH_RESULT_FILE
  ? path.resolve(process.env.QA_CODE_RESEARCH_RESULT_FILE)
  : path.join(ARTIFACT_DIR, 'qa-code-research-result.json');
const codeResearchCampaignPrefix = 'code_research';
const firstLevelId = 'shadow-cell-1';
const firstLevelMarker = `${codeResearchCampaignPrefix}:${firstLevelId}`;
const firstLevelStarsKey = `${codeResearchCampaignPrefix}:${firstLevelId}:stars`;
const firstLevelBestStepsKey = `${codeResearchCampaignPrefix}:${firstLevelId}:bestSteps`;
const firstLevelRewardClaimedKey = `${codeResearchCampaignPrefix}:${firstLevelId}:rewardClaimedAt`;

const qaStudent = {
  id: 42,
  username: 'qa-student',
  email: 'qa-student@example.com',
  level: 5,
  experience: 450,
  coins: 120,
};

const qaProgress = {
  level: 5,
  experience: 450,
  coins: 120,
  completed_levels: [],
  skills: [],
  inventory: [],
  has_key: false,
  arena_score: 0,
  arena_high_score: 0,
  completed_challenges: [],
  completed_campaigns: [],
  completed_campaign_levels: [],
  campaign_progress: {},
  age_group_campaign_progress: {},
};

function cloneQaProgress() {
  return JSON.parse(JSON.stringify(qaProgress));
}

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function wheelScrollProbe(page, screenSelector, hoverSelector = screenSelector) {
  const before = await page.evaluate((selector) => {
    const screen = document.querySelector(selector);
    if (!screen) {
      return { found: false };
    }
    const root = document.scrollingElement ?? document.documentElement;
    return {
      found: true,
      screenTop: screen.scrollTop,
      screenScrollHeight: screen.scrollHeight,
      screenClientHeight: screen.clientHeight,
      docTop: root.scrollTop,
      docScrollHeight: root.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  }, screenSelector);

  if (!before.found) {
    return { found: false };
  }

  await page.locator(hoverSelector).first().hover();
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(180);

  const after = await page.evaluate((selector) => {
    const screen = document.querySelector(selector);
    if (!screen) {
      return { found: false };
    }
    const root = document.scrollingElement ?? document.documentElement;
    return {
      found: true,
      screenTop: screen.scrollTop,
      docTop: root.scrollTop,
    };
  }, screenSelector);

  if (!after.found) {
    return { found: false };
  }

  const requiresScroll =
    before.screenScrollHeight > before.screenClientHeight + 8 ||
    before.docScrollHeight > before.viewportHeight + 8;
  const screenMoved = after.screenTop > before.screenTop + 1;
  const docMoved = after.docTop > before.docTop + 1;

  return {
    found: true,
    requiresScroll,
    moved: screenMoved || docMoved,
    screenMoved,
    docMoved,
    before,
    after,
  };
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockBackend(context, state) {
  await context.route(/https?:\/\/[^/]+:8000\/api\/v1\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/users/profile')) {
      await fulfillJson(route, qaStudent);
      return;
    }

    if (pathname.endsWith('/coins/balance')) {
      await fulfillJson(route, { coins: state.coinsBalance });
      return;
    }

    if (pathname.endsWith('/coins/history')) {
      await fulfillJson(route, { transactions: [] });
      return;
    }

    if (pathname.endsWith('/coins/add')) {
      let amount = 0;
      try {
        const rawBody = request.postData();
        if (rawBody) {
          const payload = JSON.parse(rawBody);
          amount = Number(payload?.amount ?? 0);
        }
      } catch {}
      if (!Number.isFinite(amount)) {
        amount = 0;
      }
      state.coinsBalance += amount;
      state.coinsAddCount += 1;
      await fulfillJson(route, {
        success: true,
        balance: state.coinsBalance,
        coins: state.coinsBalance,
      });
      return;
    }

    if (pathname.endsWith('/progress/load')) {
      await fulfillJson(route, state.progress);
      return;
    }

    if (pathname.endsWith('/progress/save')) {
      try {
        const rawBody = request.postData();
        if (rawBody) {
          const parsedBody = JSON.parse(rawBody);
          const incomingProgress = parsedBody?.progress ?? parsedBody;
          if (incomingProgress && typeof incomingProgress === 'object') {
            state.progress = {
              ...state.progress,
              ...incomingProgress,
            };
          }
        }
      } catch {}
      state.saveCount += 1;
      await fulfillJson(route, { success: true, progress: state.progress });
      return;
    }

    if (pathname.endsWith('/users/system-announcements')) {
      await fulfillJson(route, { announcements: [] });
      return;
    }

    if (pathname.endsWith('/daily/status')) {
      await fulfillJson(route, {
        has_checked_in: true,
        current_streak: 1,
        total_login_days: 1,
        today_reward: null,
        rewards_preview: [],
      });
      return;
    }

    if (pathname.endsWith('/achievements/list')) {
      await fulfillJson(route, []);
      return;
    }

    if (pathname.endsWith('/pets/my')) {
      await fulfillJson(route, { success: true, pets: [], current_pet_id: null });
      return;
    }

    if (pathname.includes('/food')) {
      await fulfillJson(route, { items: [], inventory: [] });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

async function seedBrowserState(context) {
  await context.addInitScript(({ user }) => {
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          token: 'qa-token',
          user,
          isAuthenticated: true,
        },
        version: 0,
      }),
    );

    window.localStorage.setItem(
      'game-storage',
      JSON.stringify({
        state: {
          xp: user.experience,
          level: user.level,
          coins: user.coins,
          inventory: [],
          completedLevels: [],
          skills: [],
          arenaScore: 0,
          arenaHighScore: 0,
          completedChallenges: [],
          hasKey: false,
          completedCampaigns: [],
          completedCampaignLevels: [],
          campaignProgress: {},
          ageGroupCampaignProgress: {},
        },
        version: 0,
      }),
    );

    window.localStorage.setItem(
      'coin-storage',
      JSON.stringify({
        state: {
          balance: user.coins,
          transactions: [],
          isLoading: false,
          error: null,
        },
        version: 0,
      }),
    );

    window.localStorage.setItem(
      'code-research-progress',
      JSON.stringify({
        state: {
          progressByUser: {},
        },
        version: 1,
      }),
    );

    window.localStorage.setItem(`newUserGuideCompleted:${user.id}`, 'true');
    window.localStorage.setItem('newUserGuideCompleted', 'true');
    window.localStorage.setItem(`petWelcomeGuideCompleted:${user.id}`, 'true');
    window.localStorage.setItem('petWelcomeGuideCompleted', 'true');

    const NativeWebSocket = window.WebSocket;

    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      constructor(url, protocols) {
        if (!String(url).includes('/chat/ws/')) {
          return protocols
            ? new NativeWebSocket(url, protocols)
            : new NativeWebSocket(url);
        }
        this.url = url;
        this.readyState = MockWebSocket.CONNECTING;
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.listeners = new Map();
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.dispatchEvent(new Event('open'));
          this.dispatchEvent(
            new MessageEvent('message', {
              data: JSON.stringify({ type: 'online_users', data: { users: [user] } }),
            }),
          );
        }, 0);
      }

      send() {}

      close() {
        this.readyState = MockWebSocket.CLOSED;
        this.dispatchEvent(new CloseEvent('close'));
      }

      addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
      }

      dispatchEvent(event) {
        const propertyHandler = this[`on${event.type}`];
        if (typeof propertyHandler === 'function') {
          propertyHandler.call(this, event);
        }
        for (const listener of this.listeners.get(event.type) ?? []) {
          listener.call(this, event);
        }
        return true;
      }
    }

    window.WebSocket = MockWebSocket;
  }, { user: qaStudent });
}

async function assertNoErrorBoundary(page, label) {
  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const markers = [
    'Application error',
    'Maximum update depth exceeded',
    'The result of getServerSnapshot should be cached',
  ];
  const found = markers.find((marker) => bodyText.includes(marker));
  if (found) {
    throw new Error(`${label}: ErrorBoundary/runtime failure detected: ${found}`);
  }
}

async function readLocalCodeResearchProgress(page, userId) {
  return await page.evaluate((targetUserId) => {
    const raw = window.localStorage.getItem('code-research-progress');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed?.state?.progressByUser?.[String(targetUserId)] ?? null;
    } catch {
      return null;
    }
  }, userId);
}

async function assertServerReachable() {
  try {
    const response = await fetch(FRONTEND_ORIGIN);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Frontend is not reachable at ${FRONTEND_ORIGIN}. Start Next first, for example: npm run dev -- -p 3003. ${error}`,
    );
  }
}

async function main() {
  ensureArtifactDir();
  await assertServerReachable();

  const browser = await chromium.launch({ headless: true });
  const backendState = {
    progress: cloneQaProgress(),
    saveCount: 0,
    coinsBalance: qaStudent.coins,
    coinsAddCount: 0,
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
  });

  await mockBackend(context, backendState);
  await seedBrowserState(context);

  const page = await context.newPage();
  const pageErrors = [];
  const consoleIssues = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!text.includes('Failed to start background music')) {
        consoleIssues.push(text);
      }
    }
  });

  try {
    await page.goto(FRONTEND_ORIGIN, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="ai-research-button"]').waitFor({ timeout: 30000 });
    await page.locator('[data-testid="code-research-button"]').waitFor({ timeout: 30000 });
    const initialPerf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      return {
        domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        loadMs: nav ? Math.round(nav.loadEventEnd) : null,
        fcpMs: fcp ? Math.round(fcp.startTime) : null,
      };
    });

    if (!(await page.locator('[data-testid="ai-research-button"]').isVisible())) {
      throw new Error('AI Research button is missing or hidden');
    }
    if (!(await page.locator('[data-testid="code-research-button"]').isVisible())) {
      throw new Error('Code Research button is missing or hidden');
    }

    await assertNoErrorBoundary(page, 'home');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'home-entry.png'),
      fullPage: true,
    });

    await page.locator('[data-testid="code-research-button"]').click();
    await page.waitForURL('**/code-research', { timeout: 15000 });
    await page.locator('[data-testid="code-research-chapter-grid"]').waitFor({ timeout: 30000 });
    await page.locator('[data-testid="code-research-chapter-card"]').first().waitFor({ timeout: 30000 });
    await page.locator('[data-testid="code-research-onboarding-restart"]').click();
    const onboardingLayer = page.locator('[data-testid="code-research-onboarding"]');
    await onboardingLayer.waitFor({ timeout: 10000 });
    const onboardingProgressDotCount = await onboardingLayer.locator('.cr-onboard-progress i').count();
    if (onboardingProgressDotCount !== 8) {
      throw new Error(`Onboarding progress dot count mismatch: expected 8, got ${onboardingProgressDotCount}`);
    }
    await onboardingLayer.locator('.cr-onboard-path').first().waitFor({ timeout: 10000 });
    await onboardingLayer.locator('button:has-text("跳过")').click();
    await onboardingLayer.waitFor({ state: 'hidden', timeout: 10000 });
    const chapterScrollState = await page.evaluate(() => {
      const screen = document.querySelector('.cr-chapter-screen');
      if (!screen) {
        return { found: false };
      }
      const before = screen.scrollTop;
      screen.scrollTop = before + 220;
      const after = screen.scrollTop;
      const style = window.getComputedStyle(screen);
      return {
        found: true,
        moved: after > before,
        scrollHeight: screen.scrollHeight,
        clientHeight: screen.clientHeight,
        overflowY: style.overflowY,
      };
    });
    if (!chapterScrollState.found) {
      throw new Error('Chapter screen container (.cr-chapter-screen) is missing.');
    }
    if (chapterScrollState.overflowY === 'hidden') {
      throw new Error('Chapter screen overflowY is hidden, which can cause scroll lock.');
    }
    const chapterRequiresScroll = chapterScrollState.scrollHeight > chapterScrollState.clientHeight + 8;
    const chapterUsesDocumentScroll = chapterScrollState.overflowY === 'visible';
    const chapterScrollUnlocked = chapterUsesDocumentScroll || !chapterRequiresScroll || chapterScrollState.moved;
    if (!chapterScrollUnlocked) {
      throw new Error(
        `Chapter screen appears scroll-locked: scrollHeight=${chapterScrollState.scrollHeight}, clientHeight=${chapterScrollState.clientHeight}, moved=${chapterScrollState.moved}`,
      );
    }
    await page.evaluate(() => {
      const screen = document.querySelector('.cr-chapter-screen');
      if (screen) {
        screen.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });
    const chapterWheelProbe = await wheelScrollProbe(page, '.cr-chapter-screen', '[data-testid="code-research-chapter-grid"]');
    if (!chapterWheelProbe.found) {
      throw new Error('Chapter wheel probe failed because the chapter screen container is missing.');
    }
    const chapterWheelScrollUnlocked = !chapterWheelProbe.requiresScroll || chapterWheelProbe.moved;
    if (!chapterWheelScrollUnlocked) {
      throw new Error(
        `Chapter wheel scroll failed: ` +
        `screenMoved=${chapterWheelProbe.screenMoved}, docMoved=${chapterWheelProbe.docMoved}, ` +
        `before=${JSON.stringify(chapterWheelProbe.before)}, after=${JSON.stringify(chapterWheelProbe.after)}`,
      );
    }

    const chapterCardCount = await page.locator('[data-testid="code-research-chapter-card"]').count();
    if (chapterCardCount < 4) {
      throw new Error(`Expected at least 4 chapter cards on the chapter selection screen, got ${chapterCardCount}`);
    }
    const mapTransitionStart = Date.now();
    await page.locator('[data-testid="code-research-chapter-card"]').first().click();
    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 30000 });
    const mapTransitionMs = Date.now() - mapTransitionStart;
    await page.locator('.cr-dungeon-node.is-playable').first().waitFor({ timeout: 30000 });
    const mapScrollState = await page.evaluate(() => {
      const screen = document.querySelector('.cr-map-screen');
      if (!screen) {
        return { found: false };
      }
      const before = screen.scrollTop;
      screen.scrollTop = before + 220;
      const after = screen.scrollTop;
      const style = window.getComputedStyle(screen);
      return {
        found: true,
        moved: after > before,
        scrollHeight: screen.scrollHeight,
        clientHeight: screen.clientHeight,
        overflowY: style.overflowY,
      };
    });
    if (!mapScrollState.found) {
      throw new Error('Map screen container (.cr-map-screen) is missing.');
    }
    if (mapScrollState.overflowY === 'hidden') {
      throw new Error('Map screen overflowY is hidden, which can cause scroll lock.');
    }
    const mapRequiresScroll = mapScrollState.scrollHeight > mapScrollState.clientHeight + 8;
    const mapUsesDocumentScroll = mapScrollState.overflowY === 'visible';
    const mapScrollUnlocked = mapUsesDocumentScroll || !mapRequiresScroll || mapScrollState.moved;
    if (!mapScrollUnlocked) {
      throw new Error(
        `Map screen appears scroll-locked: scrollHeight=${mapScrollState.scrollHeight}, clientHeight=${mapScrollState.clientHeight}, moved=${mapScrollState.moved}`,
      );
    }
    await page.evaluate(() => {
      const screen = document.querySelector('.cr-map-screen');
      if (screen) {
        screen.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });
    const mapWheelProbe = await wheelScrollProbe(page, '.cr-map-screen', '[data-testid="code-research-dungeon-map"]');
    if (!mapWheelProbe.found) {
      throw new Error('Map wheel probe failed because the map screen container is missing.');
    }
    const mapWheelScrollUnlocked = !mapWheelProbe.requiresScroll || mapWheelProbe.moved;
    if (!mapWheelScrollUnlocked) {
      throw new Error(
        `Map wheel scroll failed: ` +
        `screenMoved=${mapWheelProbe.screenMoved}, docMoved=${mapWheelProbe.docMoved}, ` +
        `before=${JSON.stringify(mapWheelProbe.before)}, after=${JSON.stringify(mapWheelProbe.after)}`,
      );
    }

    await page.locator('.cr-side-dock button').first().hover();
    await page.locator('[data-testid="code-research-side-preview"]').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="code-research-side-preview"] .cr-side-preview-action').click();
    await page.locator('[data-testid="code-research-drawer"]').waitFor({ timeout: 10000 });
    await page.locator('.cr-drawer-head .cr-tool-btn').click();

    const islandCount = await page.locator('.cr-dungeon-node.is-playable').count();
    if (islandCount < 4) {
      throw new Error(`Expected at least 4 playable Code Research nodes inside the selected chapter, got ${islandCount}`);
    }

    const backgroundImage = await page.locator('.cr-reference-bg').evaluate((element) =>
      window.getComputedStyle(element).backgroundImage,
    );
    if (!backgroundImage.includes('/code-research/generated-reference-board.png')) {
      throw new Error(`Generated reference board was not applied as a map background: ${backgroundImage}`);
    }

    await assertNoErrorBoundary(page, 'code-research-map');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'code-research-map.png'),
      fullPage: true,
    });

    const wideContext = await browser.newContext({
      viewport: { width: 1920, height: 888 },
    });
    await mockBackend(wideContext, { progress: cloneQaProgress(), saveCount: 0 });
    await seedBrowserState(wideContext);
    const widePage = await wideContext.newPage();
    await widePage.goto(`${FRONTEND_ORIGIN}/code-research`, { waitUntil: 'domcontentloaded' });
    await widePage.locator('[data-testid="code-research-chapter-card"]').first().click();
    await widePage.locator('.cr-dungeon-node.is-playable').first().click();
    await widePage.locator('.cr-selected-card-modern').waitFor({ timeout: 30000 });
    const startButtonBox = await widePage.locator('.cr-selected-card-modern .cr-start-btn').boundingBox();
    if (!startButtonBox || startButtonBox.y + startButtonBox.height > 888) {
      throw new Error(`Start button is below the 1920x888 viewport: ${JSON.stringify(startButtonBox)}`);
    }
    await widePage.keyboard.press('Escape');
    await widePage.locator('.cr-selected-card-modern').waitFor({ state: 'hidden', timeout: 10000 });
    await widePage.locator('.cr-dungeon-node.is-playable').first().click();
    await widePage.locator('.cr-selected-card-modern').waitFor({ timeout: 10000 });
    await widePage.locator('[data-testid="code-research-selected-close"]').click();
    await widePage.locator('.cr-selected-card-modern').waitFor({ state: 'hidden', timeout: 10000 });
    await widePage.locator('.cr-dungeon-node.is-playable').first().click();
    await widePage.locator('.cr-selected-card-modern').waitFor({ timeout: 10000 });
    await widePage.evaluate(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    });
    await widePage.keyboard.press('Enter');
    await widePage.locator('.cr-level-screen').waitFor({ timeout: 15000 });
    const launchModalCount = await widePage.locator('[data-testid="code-research-launch-modal"]').count();
    if (launchModalCount !== 0) {
      throw new Error(`Launch modal should not appear after start; count=${launchModalCount}`);
    }
    await widePage.close();
    await wideContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mockBackend(mobileContext, { progress: cloneQaProgress(), saveCount: 0 });
    await seedBrowserState(mobileContext);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${FRONTEND_ORIGIN}/code-research`, { waitUntil: 'domcontentloaded' });
    await mobilePage.locator('[data-testid="code-research-chapter-card"]').first().click();
    await mobilePage.locator('.cr-dungeon-node.is-playable').first().click();
    await mobilePage.locator('.cr-selected-card-modern .cr-start-btn').click();
    await mobilePage.locator('.cr-level-screen').waitFor({ timeout: 15000 });
    await mobilePage.locator('[data-testid="code-research-run"]').scrollIntoViewIfNeeded();
    const runViewportProbe = await mobilePage.locator('[data-testid="code-research-run"]').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        visible:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight + 4 &&
          rect.right <= window.innerWidth + 4,
        height: Math.round(rect.height),
      };
    });
    await mobilePage.locator('[data-testid="code-research-level-onboarding"]').scrollIntoViewIfNeeded();
    const onboardingViewportProbe = await mobilePage.locator('[data-testid="code-research-level-onboarding"]').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        visible:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight + 4 &&
          rect.right <= window.innerWidth + 4,
      };
    });
    await mobilePage.locator('[data-testid="code-research-story-toggle"]').scrollIntoViewIfNeeded();
    const storyViewportProbe = await mobilePage.locator('[data-testid="code-research-story-toggle"]').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        visible:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight + 4 &&
          rect.right <= window.innerWidth + 4,
      };
    });
    const mobileLayoutProbe = await mobilePage.evaluate(() => {
      const root = document.documentElement;
      const controlRow = document.querySelector('.cr-control-row');
      const controlStyle = controlRow ? window.getComputedStyle(controlRow) : null;

      return {
        horizontalOverflowPx: Math.max(0, root.scrollWidth - window.innerWidth),
        controlRowPosition: controlStyle?.position ?? '',
      };
    });
    await mobilePage.close();
    await mobileContext.close();
    if (mobileLayoutProbe.horizontalOverflowPx > 2) {
      throw new Error(`Mobile layout has horizontal overflow: ${mobileLayoutProbe.horizontalOverflowPx}px`);
    }
    if (!runViewportProbe.visible || !onboardingViewportProbe.visible || !storyViewportProbe.visible) {
      throw new Error(
        `Mobile layout visibility failed: ${JSON.stringify({
          run: runViewportProbe,
          onboarding: onboardingViewportProbe,
          story: storyViewportProbe,
          layout: mobileLayoutProbe,
        })}`,
      );
    }
    if (mobileLayoutProbe.controlRowPosition !== 'sticky') {
      throw new Error(`Mobile control row should be sticky: ${mobileLayoutProbe.controlRowPosition}`);
    }
    if (runViewportProbe.height < 46) {
      throw new Error(`Mobile run button touch height is too small: ${runViewportProbe.height}`);
    }

    await page.locator('.cr-dungeon-node.is-playable').first().click();
    await page.locator('.cr-selected-card-modern').waitFor({ timeout: 30000 });
    await page.locator('.cr-selected-card-modern .cr-start-btn').waitFor({ timeout: 30000 });
    const levelTransitionStart = Date.now();
    await page.locator('.cr-selected-card-modern .cr-start-btn').click();
    await page.locator('.cr-level-screen').waitFor({ timeout: 15000 });
    const levelTransitionMs = Date.now() - levelTransitionStart;
    await page.locator('.cr-toolbox').waitFor({ timeout: 15000 });
    await page.locator('[data-testid="code-research-board"]').waitFor({ timeout: 15000 });
    await page.locator('[data-testid="code-research-level-onboarding"]').waitFor({ timeout: 15000 });
    const coachRailCount = await page.locator('[data-testid="code-research-coach-rail"]').count();
    if (coachRailCount !== 0) {
      throw new Error(`Legacy coach rail should be removed from level UI, got count=${coachRailCount}`);
    }
    await page.locator('[data-testid="code-research-level-onboarding"]').click();
    await page.locator('[data-testid="code-research-onboarding"]').waitFor({ timeout: 10000 });
    await page.locator('[data-testid="code-research-onboarding"] button:has-text("跳过")').click();
    await page.locator('[data-testid="code-research-onboarding"]').waitFor({ state: 'hidden', timeout: 10000 });
    await page.evaluate(() => {
      document.querySelectorAll('button[hidden]').forEach((node) => node.remove());
    });

    const taskDrawerStart = Date.now();
    await page.locator('[data-testid="code-research-task-toggle"]').click();
    await page.locator('[data-testid="code-research-drawer"]').waitFor({ timeout: 15000 });
    const taskDrawerOpenMs = Date.now() - taskDrawerStart;
    await page.locator('text=当前任务').waitFor({ timeout: 15000 });
    await page.locator('button:has-text("关闭")').click();
    const storyDrawerStart = Date.now();
    await page.locator('[data-testid="code-research-story-toggle"]').click();
    await page.locator('[data-testid="code-research-drawer"]').waitFor({ timeout: 15000 });
    const storyDrawerOpenMs = Date.now() - storyDrawerStart;
    const storyToggleActive = await page.locator('[data-testid="code-research-story-toggle"]').evaluate((element) =>
      element.classList.contains('is-active-toggle'),
    );
    if (!storyToggleActive) {
      throw new Error('Story toggle should show active visual state while drawer is open.');
    }
    await page.locator('text=剧情线').waitFor({ timeout: 15000 });
    await page.locator('button:has-text("关闭")').click();

    const levelUiText = await page.locator('.cr-level-screen').innerText();
    for (const expected of [
      '运行前检查',
      '命令书',
      '当前步骤 1/3',
      '命令书',
      'hero.move_right()',
      '任务',
      '提示',
      '知识点',
      'AI 小伴',
      '新手指导',
    ]) {
      if (!levelUiText.includes(expected)) {
        throw new Error(`Level UI is missing expected text: ${expected}`);
      }
    }
    if (levelUiText.includes('新手教练')) {
      throw new Error('Legacy "新手教练" panel copy is still rendered on level screen.');
    }
    const progressMeterWidth = await page.locator('.cr-guided-progress-meter .cr-guided-progress-track b').evaluate((node) => {
      const style = window.getComputedStyle(node);
      return Number.parseFloat(style.width || '0');
    });
    if (!Number.isFinite(progressMeterWidth) || progressMeterWidth <= 0) {
      throw new Error(`Objective progress meter width is invalid: ${progressMeterWidth}`);
    }
    const starterEditorCode = await page.locator('[data-testid="code-research-editor"]').inputValue();
    if (!/^\s*#\s*待补全：/m.test(starterEditorCode)) {
      throw new Error('Starter editor code is missing TODO teaching comments.');
    }
    if (!/^\s*#\s*待补全：[^\n]*\n\s*\n/m.test(starterEditorCode)) {
      throw new Error('Starter editor code should reserve at least one blank input line after TODO comments.');
    }

    const aiCompanionOpenStart = Date.now();
    await page.locator('[data-testid="code-research-ai-toggle"]').click();
    await page.locator('text=快捷提问').waitFor({ timeout: 10000 });
    const aiCompanionOpenMs = Date.now() - aiCompanionOpenStart;
    await page.locator('button:has-text("只告诉我下一步。")').click();
    await page.locator('[data-testid="learning-companion-modal"]').locator('text=思考中...').first().waitFor({ timeout: 10000 });
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return text.includes('你可以先做这一步') || text.includes('下一步');
    }, { timeout: 15000 });
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="learning-companion-modal"]').waitFor({ state: 'hidden', timeout: 10000 });

    await page.locator('[data-testid="code-research-run"]').click();
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return text.includes('请先调整起始代码中的占位步骤或错误顺序，再运行。')
        || text.includes('请先修改编辑器中的 TODO 或错误顺序，再运行');
    }, { timeout: 15000 });
    const inlineFeedback = page.locator('[data-testid="code-research-inline-feedback"]');
    await inlineFeedback.waitFor({ timeout: 10000 });
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-testid="code-research-inline-feedback"]');
      return Boolean(node?.className.includes('is-fail'));
    }, { timeout: 10000 });
    const firstInlineFeedbackClass = (await inlineFeedback.getAttribute('class')) ?? '';
    if (!firstInlineFeedbackClass.includes('is-fail')) {
      throw new Error(`Inline run feedback should be in fail tone after blocked run, got class=${firstInlineFeedbackClass}`);
    }
    const firstInlineActionCount = await inlineFeedback.locator('.cr-run-feedback-inline-actions button').count();
    if (firstInlineActionCount < 2) {
      throw new Error(`Inline run feedback should expose replay + hint actions on fail, got ${firstInlineActionCount} action(s).`);
    }
    const firstInlineFeedbackLine = (await inlineFeedback.locator('p').textContent())?.trim() ?? '';
    if (firstInlineFeedbackLine.length < 6) {
      throw new Error(`Inline run feedback line is unexpectedly short: "${firstInlineFeedbackLine}"`);
    }

    await page.locator('[data-testid="code-research-editor"]').fill('hero.collect()');
    await page.locator('[data-testid="code-research-editor"]').evaluate((element) => {
      element.focus();
      element.setSelectionRange(0, 0);
    });
    await page.locator('[data-testid="code-research-command-chip"]').first().click();
    const insertedCommand = await page.locator('[data-testid="code-research-editor"]').inputValue();
    if (!insertedCommand.includes('hero.move_right()') || !insertedCommand.includes('hero.collect()')) {
      throw new Error(`Command chip did not insert code into editor: ${insertedCommand}`);
    }
    const normalizedInserted = insertedCommand.trimStart();
    if (!normalizedInserted.startsWith('hero.move_right()')) {
      throw new Error(`Command chip was not inserted at cursor position: ${insertedCommand}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'code-research-level.png'),
      fullPage: true,
    });

    await page.locator('button:has-text("重置")').click();
    await page.locator('[data-testid="code-research-hint-toggle"]').click();
    await page.locator('[data-testid="code-research-drawer"]').waitFor({ timeout: 10000 });
    await page.locator('text=导师提醒').waitFor({ timeout: 10000 });
    await page.locator('button:has-text("关闭")').click();

    await page.locator('[aria-label="toggle sound"]').click();
    await page.locator('[aria-label="toggle sound"]').click();

    await page.locator('[data-testid="code-research-editor"]').fill('hero.move_left()');
    await page.locator('.cr-run-btn').click();
    await page.waitForFunction(() => document.body.textContent?.includes('撞到地图边界'), { timeout: 15000 });
    await page.waitForFunction(() => document.body.textContent?.includes('调整'), { timeout: 15000 });
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-testid="code-research-inline-feedback"]');
      return Boolean(node?.className.includes('is-fail'));
    }, { timeout: 10000 });
    const secondInlineFeedbackClass = (await inlineFeedback.getAttribute('class')) ?? '';
    if (!secondInlineFeedbackClass.includes('is-fail')) {
      throw new Error(`Inline run feedback should remain fail tone after invalid movement, got class=${secondInlineFeedbackClass}`);
    }

    await page.locator('button:has-text("回放记录")').click();
    await page.locator('[data-testid="code-research-run-timeline"]').waitFor({ timeout: 15000 });
    await page.locator('[data-testid="code-research-board-legend"]').waitFor({ timeout: 15000 });
    await page.locator('button:has-text("关闭")').click();

    await page.locator('button:has-text("参考思路")').click();
    await page.locator('[data-testid="code-research-drawer"]').waitFor({ timeout: 10000 });
    await page.locator('button:has-text("关闭")').click();

    await page.locator('[data-testid="code-research-editor"]').fill(`hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`);
    await page.locator('.cr-run-btn').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(2300);

    const victoryText = await page.locator('[data-testid="code-research-victory-modal"]').innerText();
    if (!victoryText.includes('挑战完成')) {
      throw new Error(`Victory state did not contain expected text: ${victoryText}`);
    }

    const completedCampaignLevels = backendState.progress?.completed_campaign_levels ?? [];
    if (!completedCampaignLevels.includes(firstLevelMarker)) {
      throw new Error(
        `Cloud progress did not persist first Code Research level marker (${firstLevelMarker}). ` +
        `saved=${JSON.stringify(completedCampaignLevels)}`,
      );
    }

    const campaignProgress = backendState.progress?.campaign_progress ?? {};
    const persistedStars = Number(campaignProgress[firstLevelStarsKey] ?? 0);
    const persistedBestSteps = Number(campaignProgress[firstLevelBestStepsKey] ?? 0);
    const persistedRewardClaimedAt = Number(campaignProgress[firstLevelRewardClaimedKey] ?? 0);
    if (!Number.isFinite(persistedStars) || persistedStars < 1) {
      throw new Error(
        `Cloud progress did not persist stars for ${firstLevelStarsKey}. ` +
        `value=${String(campaignProgress[firstLevelStarsKey])}`,
      );
    }
    if (!Number.isFinite(persistedBestSteps) || persistedBestSteps < 1) {
      throw new Error(
        `Cloud progress did not persist bestSteps for ${firstLevelBestStepsKey}. ` +
        `value=${String(campaignProgress[firstLevelBestStepsKey])}`,
      );
    }
    if (!Number.isFinite(persistedRewardClaimedAt) || persistedRewardClaimedAt <= 0) {
      throw new Error(
        `Cloud progress did not persist reward marker for ${firstLevelRewardClaimedKey}. ` +
        `value=${String(campaignProgress[firstLevelRewardClaimedKey])}`,
      );
    }
    if (backendState.coinsAddCount !== 1) {
      throw new Error(`Expected one /coins/add call after first clear, got ${backendState.coinsAddCount}`);
    }

    await page.locator('[data-testid="code-research-victory-modal"] .cr-victory-actions .cr-tool-btn').click();
    await page.locator('[data-testid="code-research-dungeon-map"]').waitFor({ timeout: 15000 });
    await page.locator('.cr-dungeon-node.is-playable').first().click();
    await page.locator('.cr-selected-card-modern .cr-start-btn').click();
    await page.locator('.cr-level-screen').waitFor({ timeout: 15000 });
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
    await page.locator('.cr-run-btn').click();
    await page.locator('[data-testid="code-research-victory-modal"]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(2300);

    const replayCampaignProgress = backendState.progress?.campaign_progress ?? {};
    const replayPersistedStars = Number(replayCampaignProgress[firstLevelStarsKey] ?? 0);
    const replayPersistedBestSteps = Number(replayCampaignProgress[firstLevelBestStepsKey] ?? 0);
    const replayPersistedRewardClaimedAt = Number(replayCampaignProgress[firstLevelRewardClaimedKey] ?? 0);
    if (replayPersistedStars !== persistedStars) {
      throw new Error(
        `Cloud stars were downgraded after a worse replay. before=${persistedStars} after=${replayPersistedStars}`,
      );
    }
    if (replayPersistedBestSteps !== persistedBestSteps) {
      throw new Error(
        `Cloud bestSteps were downgraded after a worse replay. before=${persistedBestSteps} after=${replayPersistedBestSteps}`,
      );
    }
    if (replayPersistedRewardClaimedAt !== persistedRewardClaimedAt) {
      throw new Error(
        `Reward marker changed unexpectedly on replay. before=${persistedRewardClaimedAt} after=${replayPersistedRewardClaimedAt}`,
      );
    }
    if (backendState.coinsAddCount !== 1) {
      throw new Error(`Replay should not trigger additional /coins/add calls; got ${backendState.coinsAddCount}`);
    }

    const reloadedContext = await browser.newContext({
      viewport: { width: 1440, height: 980 },
    });
    await mockBackend(reloadedContext, backendState);
    await seedBrowserState(reloadedContext);
    const reloadedPage = await reloadedContext.newPage();
    await reloadedPage.goto(`${FRONTEND_ORIGIN}/code-research`, { waitUntil: 'domcontentloaded' });
    await reloadedPage.locator('[data-testid="code-research-chapter-grid"]').waitFor({ timeout: 30000 });
    await reloadedPage.waitForFunction(
      ({ userId, levelId, expectedStars, expectedBestSteps }) => {
        const raw = window.localStorage.getItem('code-research-progress');
        if (!raw) return false;

        try {
          const parsed = JSON.parse(raw);
          const record = parsed?.state?.progressByUser?.[String(userId)]?.[levelId];
          return Boolean(
            record &&
            record.completed === true &&
            Number(record.stars) === expectedStars &&
            Number(record.bestSteps) === expectedBestSteps,
          );
        } catch {
          return false;
        }
      },
      {
        userId: qaStudent.id,
        levelId: firstLevelId,
        expectedStars: persistedStars,
        expectedBestSteps: persistedBestSteps,
      },
      { timeout: 20000 },
    );

    const reloadedProgress = await readLocalCodeResearchProgress(reloadedPage, qaStudent.id);
    const reloadedFirstLevel = reloadedProgress?.[firstLevelId] ?? null;
    if (!reloadedFirstLevel) {
      throw new Error('Fresh reload did not import the first Code Research level into local progress storage.');
    }
    if (Number(reloadedFirstLevel.stars) !== persistedStars || Number(reloadedFirstLevel.bestSteps) !== persistedBestSteps) {
      throw new Error(
        `Fresh reload imported incorrect best progress. ` +
        `expected=${persistedStars}/${persistedBestSteps} actual=${reloadedFirstLevel.stars}/${reloadedFirstLevel.bestSteps}`,
      );
    }
    await reloadedContext.close();

    await assertNoErrorBoundary(page, 'code-research-victory');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'code-research-victory.png'),
      fullPage: true,
    });

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors: ${pageErrors.join('\n')}`);
    }

    const result = {
      status: 'ok',
      frontend: FRONTEND_ORIGIN,
      performance: {
        initial: initialPerf,
        transitions: {
          mapTransitionMs,
          levelTransitionMs,
          taskDrawerOpenMs,
          storyDrawerOpenMs,
          aiCompanionOpenMs,
        },
      },
      verified: {
        aiResearchPreserved: true,
        codeResearchEntry: true,
        chapterSelectFlow: true,
        onboardingSimplifiedProgress: true,
        onboardingPathHighlighted: true,
        levelOnboardingButton: true,
        legacyCoachRailRemoved: true,
        chapterScrollUnlocked,
        chapterWheelScrollUnlocked,
        mapRendered: true,
        mapScrollUnlocked,
        mapWheelScrollUnlocked,
        challengeIslandCount: islandCount,
        generatedReferenceBackground: true,
        sideDockPreview: true,
        centeredLaunchCard: true,
        selectedCardEscClose: true,
        selectedCardCloseButton: true,
        selectedCardEnterStart: true,
        boardLegend: true,
        toolboxPanel: true,
        drawerDrivenGuide: true,
        storyDrawerFlow: true,
        storyToggleActiveState: true,
        mobileTouchLayout: true,
        mobileMapNodeClickable: true,
        objectiveProgressMeter: true,
        starterTodoInputSlots: true,
        commandInsertion: true,
        runTimeline: true,
        hintInteraction: true,
        requiresStudentEditBeforeRun: true,
        referenceDrawer: true,
        friendlyFailure: true,
        soundToggle: true,
        challengeStarted: true,
        editedCodeReachedVictory: true,
        progressSavedToCloud: backendState.saveCount > 0,
        progressFieldsSynced: true,
        coinRewardSynced: backendState.coinsAddCount === 1,
        rewardIdempotent: replayPersistedRewardClaimedAt === persistedRewardClaimedAt,
        worseReplayDidNotDowngradeCloud: true,
        reloadImportedBestProgress: true,
        perfDomContentLoadedHealthy: initialPerf.domContentLoadedMs === null || initialPerf.domContentLoadedMs <= 4500,
        perfMapTransitionHealthy: mapTransitionMs <= 3200,
        perfLevelTransitionHealthy: levelTransitionMs <= 3600,
        perfTaskDrawerOpenHealthy: taskDrawerOpenMs <= 1200,
        perfStoryDrawerOpenHealthy: storyDrawerOpenMs <= 1400,
        perfAiCompanionOpenHealthy: aiCompanionOpenMs <= 1500,
      },
      consoleErrors: consoleIssues,
      artifacts: {
        homeEntry: path.join(ARTIFACT_DIR, 'home-entry.png'),
        map: path.join(ARTIFACT_DIR, 'code-research-map.png'),
        level: path.join(ARTIFACT_DIR, 'code-research-level.png'),
        victory: path.join(ARTIFACT_DIR, 'code-research-victory.png'),
      },
    };

    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2), 'utf8');
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
