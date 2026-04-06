import { chromium } from '@playwright/test';

const baseUrl = process.env.BR_QA_BASE_URL ?? 'http://127.0.0.1:3200';
const apiBase = process.env.BR_QA_API_BASE ?? 'http://127.0.0.1:8000/api/v1';
const sampleCount = Number(process.env.BR_QA_SAMPLE_COUNT ?? 56);
const sampleIntervalMs = Number(process.env.BR_QA_SAMPLE_INTERVAL_MS ?? 150);

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

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function createLogin(username) {
  const email = `${username}@example.com`;
  const password = 'test123456';
  await fetch(`${apiBase}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  }).catch(() => null);
  const login = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return {
    token: login.access_token,
    user: login.user,
  };
}

async function openBattleRoyale(browser, auth) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript((payload) => {
    window.localStorage.setItem('auth-storage', payload.authStorage);
    window.localStorage.setItem('br-qa-debug', 'true');
    window.localStorage.setItem('qa-debug', 'true');
  }, { authStorage: authStorageValue(auth) });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/world`, { waitUntil: 'domcontentloaded' });
  await page.locator('#phaser-game canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('stationInteraction', { detail: { stationId: 'battle_royale' } }));
  });
  await page.locator('[data-testid="br-lobby"]').waitFor({ timeout: 15000 });
  return { context, page };
}

async function joinFirstWaitingRoom(page) {
  const roomJoinButton = page.locator('[data-testid^="br-join-room-"]').first();
  await roomJoinButton.waitFor({ state: 'visible', timeout: 15000 });
  await roomJoinButton.click();
}

async function addBotWithDifficulty(page, difficulty) {
  const configPanel = page.locator('section').filter({ hasText: '人机配置' });
  const difficultyButton = configPanel.locator('button').filter({ hasText: difficulty }).first();
  await difficultyButton.waitFor({ state: 'visible', timeout: 15000 });
  await difficultyButton.click();
  await page.locator('[data-testid="br-add-bot"]').click();
}

async function waitForFreshCreateSlot(page) {
  const createButton = page.locator('[data-testid="br-create-room"]');
  const refreshButton = page.locator('[data-testid="br-refresh-rooms"]');
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    if (!(await createButton.isDisabled())) {
      return;
    }
    await refreshButton.click();
    await page.waitForTimeout(1500);
  }

  throw new Error('Waiting room from the previous smoke run did not clear in time.');
}

async function createRoomWithRetry(page) {
  const roomView = page.locator('[data-testid="br-room"]');
  const refreshButton = page.locator('[data-testid="br-refresh-rooms"]');
  const deadline = Date.now() + 45000;

  while (Date.now() < deadline) {
    await waitForFreshCreateSlot(page);
    await page.locator('[data-testid="br-create-room"]').click();
    try {
      await roomView.waitFor({ state: 'attached', timeout: 5000 });
      return;
    } catch {
      await refreshButton.click();
      await page.waitForTimeout(2500);
    }
  }

  throw new Error('Room creation did not enter the waiting room before timeout.');
}

function collectBotMetrics(samples) {
  const metrics = new Map();

  for (let index = 1; index < samples.length; index += 1) {
    const previousBots = new Map((samples[index - 1]?.bots ?? []).map((bot) => [bot.id, bot]));
    for (const bot of samples[index]?.bots ?? []) {
      const previous = previousBots.get(bot.id);
      if (!previous) continue;
      const current = metrics.get(bot.id) ?? {
        id: bot.id,
        name: bot.name,
        difficulty: bot.difficulty ?? 'medium',
        directionChanges: 0,
        jumpImpulses: 0,
        distanceTravelled: 0,
      };
      const previousSign = Math.abs(previous.vx) >= 48 ? Math.sign(previous.vx) : 0;
      const nextSign = Math.abs(bot.vx) >= 48 ? Math.sign(bot.vx) : 0;
      if (previousSign !== 0 && nextSign !== 0 && previousSign !== nextSign) {
        current.directionChanges += 1;
      }
      if (previous.vy >= -120 && bot.vy <= -420) {
        current.jumpImpulses += 1;
      }
      current.distanceTravelled += Math.hypot(bot.x - previous.x, bot.y - previous.y);
      metrics.set(bot.id, current);
    }
  }

  return Array.from(metrics.values());
}

async function sampleArena(page) {
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const snapshot = await page.evaluate(() => {
      const debugWindow = window;
      const live = debugWindow.__brSnapshot ?? null;
      const stats = debugWindow.__brSyncStats ?? null;
      const badge = document.querySelector('[data-testid="br-arena-connection-badge"]')?.textContent?.trim() ?? '';
      const notice = document.querySelector('[data-testid="br-arena-status"]')?.textContent?.trim() ?? '';
      if (!live) {
        return { ready: false, badge, notice, stats };
      }
      return {
        ready: true,
        badge,
        notice,
        stats,
        tick: live.tick,
        bots: live.fighters
          .filter((fighter) => fighter.isBot)
          .map((fighter) => ({
            id: fighter.id,
            name: fighter.name,
            difficulty: fighter.difficulty,
            x: fighter.x,
            y: fighter.y,
            vx: fighter.vx,
            vy: fighter.vy,
            alive: fighter.alive,
            hp: fighter.hp,
          })),
      };
    });
    samples.push(snapshot);
    await page.waitForTimeout(sampleIntervalMs);
  }
  return samples;
}

function summarizeSamples(samples) {
  const readySamples = samples.filter((sample) => sample?.ready);
  const finalSample = readySamples.at(-1) ?? null;
  const stats = finalSample?.stats ?? samples.at(-1)?.stats ?? null;
  const unstableNoticeHits = readySamples.filter((sample) => /波动|重连|同步/.test(sample.notice)).length;
  return {
    readySamples: readySamples.length,
    unstableNoticeHits,
    finalBadge: finalSample?.badge ?? '',
    finalNotice: finalSample?.notice ?? '',
    stats,
    botMetrics: collectBotMetrics(readySamples),
  };
}

async function main() {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const hostAuth = await createLogin(`br_host_${runId}`);
  const guestAuth = await createLogin(`br_guest_${runId}`);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const host = await openBattleRoyale(browser, hostAuth);
    const guest = await openBattleRoyale(browser, guestAuth);

    await createRoomWithRetry(host.page);

    await guest.page.locator('[data-testid="br-refresh-rooms"]').click();
    await joinFirstWaitingRoom(guest.page);
    await guest.page.waitForTimeout(1200);
    await guest.page.locator('[data-testid="br-room"]').waitFor({ state: 'attached', timeout: 20000 });

    for (const difficulty of ['简单', '普通', '困难']) {
      await addBotWithDifficulty(host.page, difficulty);
      await host.page.waitForTimeout(250);
    }

    await host.page.locator('[data-testid="br-start-match"]').click();
    await host.page.locator('[data-testid="br-arena"]').waitFor({ state: 'attached', timeout: 20000 });
    await guest.page.locator('[data-testid="br-arena"]').waitFor({ state: 'attached', timeout: 20000 });
    await guest.page.waitForTimeout(2500);

    await host.page.locator('[data-testid="br-arena"]').click();
    await guest.page.locator('[data-testid="br-arena"]').click();

    await host.page.keyboard.down('d');
    await host.page.waitForTimeout(320);
    await host.page.keyboard.press('j');
    await host.page.waitForTimeout(120);
    await host.page.keyboard.up('d');
    await host.page.keyboard.press('l');

    await guest.page.keyboard.down('ArrowRight');
    await guest.page.waitForTimeout(360);
    await guest.page.keyboard.press('j');
    await guest.page.waitForTimeout(120);
    await guest.page.keyboard.up('ArrowRight');
    await guest.page.keyboard.press('k');

    const [hostSamples, guestSamples] = await Promise.all([
      sampleArena(host.page),
      sampleArena(guest.page),
    ]);

    const hostSummary = summarizeSamples(hostSamples);
    const guestSummary = summarizeSamples(guestSamples);

    const result = {
      baseUrl,
      apiBase,
      runId,
      host: hostSummary,
      guest: guestSummary,
    };

    console.log(JSON.stringify(result, null, 2));

    const guestSnapshots = Number(guestSummary.stats?.authoritativeSnapshots ?? 0);
    const droppedSnapshots = Number(hostSummary.stats?.droppedSnapshots ?? 0);
    const lastWireSnapshotBytes = Number(hostSummary.stats?.lastWireSnapshotBytes ?? 0);
    const excessiveBotJitter = hostSummary.botMetrics.some(
      (bot) => {
        const thresholds =
          bot.difficulty === 'easy'
            ? { directionChanges: 14, jumpImpulses: 10 }
            : bot.difficulty === 'hard'
              ? { directionChanges: 28, jumpImpulses: 14 }
              : { directionChanges: 20, jumpImpulses: 12 };
        return (
          bot.directionChanges > thresholds.directionChanges ||
          bot.jumpImpulses > thresholds.jumpImpulses
        );
      },
    );
    const unstableConnection = /波动|重连/.test(hostSummary.finalBadge) || /波动|重连/.test(guestSummary.finalBadge);

    if (guestSnapshots < 24) {
      throw new Error(`Guest authoritative snapshots too low: ${guestSnapshots}`);
    }
    if (droppedSnapshots > 0) {
      throw new Error(`Dropped host snapshots detected: ${droppedSnapshots}`);
    }
    if (lastWireSnapshotBytes <= 0 || lastWireSnapshotBytes > 12000) {
      throw new Error(`Unexpected host snapshot size: ${lastWireSnapshotBytes}`);
    }
    if (excessiveBotJitter) {
      throw new Error(`Bot jitter exceeds threshold: ${JSON.stringify(hostSummary.botMetrics)}`);
    }
    if (unstableConnection) {
      throw new Error(`Connection badge unstable: host=${hostSummary.finalBadge}, guest=${guestSummary.finalBadge}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
