import { chromium } from '@playwright/test';

const baseUrl = process.env.BR_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const apiBase = process.env.BR_QA_API_BASE ?? 'http://127.0.0.1:8000/api/v1';
const sampleCount = Number(process.env.BR_QA_SAMPLE_COUNT ?? 56);
const sampleIntervalMs = Number(process.env.BR_QA_SAMPLE_INTERVAL_MS ?? 150);
const headless = process.env.BR_QA_HEADLESS !== 'false';

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

async function openBattleRoyale(browser, auth, label) {
  console.log(`[smoke] opening ${label}`);
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
  try {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#phaser-game canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        return false;
      }
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, { timeout: 30000 });
  } catch (error) {
    const probe = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      canvasCount: document.querySelectorAll('canvas').length,
      phaserExists: !!document.querySelector('#phaser-game'),
      phaserHtml: document.querySelector('#phaser-game')?.innerHTML?.slice(0, 240) ?? '',
      bodyText: document.body.innerText.slice(0, 240),
    }));
    console.error(`[smoke] ${label} failed to open world`, JSON.stringify(probe, null, 2));
    throw error;
  }
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('stationInteraction', { detail: { stationId: 'battle_royale' } }));
  });
  await page.locator('[data-testid="br-lobby"]').waitFor({ timeout: 15000 });
  console.log(`[smoke] ${label} entered lobby`);
  return { context, page };
}

async function joinFirstWaitingRoom(page) {
  const roomJoinButton = page.locator('[data-testid^="br-join-room-"]').first();
  await roomJoinButton.waitFor({ state: 'visible', timeout: 15000 });
  await roomJoinButton.click();
}

async function addBotWithDifficulty(page, difficulty) {
  const configPanel = page.locator('[data-testid="br-room"]');
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
      const rendered = debugWindow.__brRenderSnapshot ?? live;
      const stats = debugWindow.__brSyncStats ?? null;
      const network = debugWindow.__brNetDebug ?? null;
      const badge = document.querySelector('[data-testid="br-arena-connection-badge"]')?.textContent?.trim() ?? '';
      const notice = document.querySelector('[data-testid="br-arena-status"]')?.textContent?.trim() ?? '';
      if (!live) {
        return { ready: false, badge, notice, stats, network };
      }
      return {
        ready: true,
        badge,
        notice,
        stats,
        network,
        tick: live.tick,
        liveHumanCount: live.fighters.filter((fighter) => !fighter.isBot).length,
        renderedHumanCount: rendered?.fighters?.filter((fighter) => !fighter.isBot).length ?? 0,
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
  const network = finalSample?.network ?? samples.at(-1)?.network ?? null;
  const unstableNoticeHits = 0;
  return {
    readySamples: readySamples.length,
    unstableNoticeHits,
    finalBadge: finalSample?.badge ?? '',
    finalNotice: finalSample?.notice ?? '',
    finalTick: Number(finalSample?.tick ?? 0),
    maxLiveHumans: Math.max(0, ...readySamples.map((sample) => Number(sample.liveHumanCount ?? 0))),
    maxRenderedHumans: Math.max(0, ...readySamples.map((sample) => Number(sample.renderedHumanCount ?? 0))),
    stats,
    network,
    botMetrics: collectBotMetrics(readySamples),
  };
}

async function waitForLocalContinuity(page, previousTick) {
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    const arena = page.locator('[data-testid="br-arena"]');
    await arena.waitFor({ state: 'visible', timeout: 2000 });
    const state = await page.evaluate(() => {
      const debugWindow = window;
      const live = debugWindow.__brSnapshot ?? null;
      return {
        badge: document.querySelector('[data-testid="br-arena-connection-badge"]')?.textContent?.trim() ?? '',
        notice: document.querySelector('[data-testid="br-arena-status"]')?.textContent?.trim() ?? '',
        tick: Number(live?.tick ?? 0),
        renderedHumanCount: Number((debugWindow.__brRenderSnapshot?.fighters ?? []).filter((fighter) => !fighter.isBot).length ?? 0),
        network: debugWindow.__brNetDebug ?? null,
      };
    });

    if (state.tick > previousTick + 20) {
      return {
        continued: true,
        ...state,
      };
    }

    await page.waitForTimeout(400);
  }

  const finalState = await page.evaluate(() => {
    const debugWindow = window;
    const live = debugWindow.__brSnapshot ?? null;
    return {
      badge: document.querySelector('[data-testid="br-arena-connection-badge"]')?.textContent?.trim() ?? '',
      notice: document.querySelector('[data-testid="br-arena-status"]')?.textContent?.trim() ?? '',
      tick: Number(live?.tick ?? 0),
      renderedHumanCount: Number((debugWindow.__brRenderSnapshot?.fighters ?? []).filter((fighter) => !fighter.isBot).length ?? 0),
      network: debugWindow.__brNetDebug ?? null,
    };
  });

  return {
    continued: false,
    ...finalState,
  };
}

async function main() {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const hostAuth = await createLogin(`br_host_${runId}`);
  const guestAuthA = await createLogin(`br_guest_a_${runId}`);

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    const host = await openBattleRoyale(browser, hostAuth, 'host');
    const guestA = await openBattleRoyale(browser, guestAuthA, 'guest-a');

    await createRoomWithRetry(host.page);

    await guestA.page.locator('[data-testid="br-refresh-rooms"]').click();
    await joinFirstWaitingRoom(guestA.page);
    await guestA.page.waitForTimeout(900);
    await guestA.page.locator('[data-testid="br-room"]').waitFor({ state: 'attached', timeout: 20000 });

    const roomsPayload = await apiRequest('/pvp-br/rooms', {
      headers: { Authorization: `Bearer ${hostAuth.token}` },
    });
    const activeRoom = roomsPayload.rooms?.[0];
    if (!activeRoom) {
      throw new Error('Expected one waiting battle royale room after room creation.');
    }
    if (activeRoom.sync_mode !== 'local_coop') {
      throw new Error(`Expected local_coop sync mode, got: ${JSON.stringify(activeRoom)}`);
    }
    if (activeRoom.human_count !== 2 || activeRoom.bot_count !== 4 || activeRoom.participant_count !== 6) {
      throw new Error(`Unexpected room roster before start: ${JSON.stringify(activeRoom)}`);
    }

    await host.page.locator('[data-testid="br-start-match"]').click();
    await host.page.locator('[data-testid="br-arena"]').waitFor({ state: 'attached', timeout: 20000 });
    await guestA.page.locator('[data-testid="br-arena"]').waitFor({ state: 'attached', timeout: 20000 });
    await guestA.page.waitForTimeout(2500);

    await host.page.locator('[data-testid="br-arena"]').click();
    await guestA.page.locator('[data-testid="br-arena"]').click();

    await host.page.keyboard.down('d');
    await host.page.waitForTimeout(320);
    await host.page.keyboard.press('j');
    await host.page.waitForTimeout(120);
    await host.page.keyboard.up('d');
    await host.page.keyboard.press('l');

    await guestA.page.keyboard.down('ArrowRight');
    await guestA.page.waitForTimeout(360);
    await guestA.page.keyboard.press('j');
    await guestA.page.waitForTimeout(120);
    await guestA.page.keyboard.up('ArrowRight');
    await guestA.page.keyboard.press('k');

    const [hostSamples, guestSamples] = await Promise.all([
      sampleArena(host.page),
      sampleArena(guestA.page),
    ]);

    const hostSummary = summarizeSamples(hostSamples);
    const guestSummary = summarizeSamples(guestSamples);
    const hostDisplayedLatencyMs = Number(hostSummary.network?.displayedLatencyMs ?? 0);
    const guestDisplayedLatencyMs = Number(guestSummary.network?.displayedLatencyMs ?? 0);
    const continuityState = await (async () => {
      await host.context.close();
      return waitForLocalContinuity(guestA.page, guestSummary.finalTick);
    })();

    const result = {
      baseUrl,
      apiBase,
      runId,
      host: hostSummary,
      guest: guestSummary,
      afterHostExit: continuityState,
    };

    console.log(JSON.stringify(result, null, 2));

    const excessiveBotJitter = hostSummary.botMetrics.some((bot) => {
      const thresholds =
        bot.difficulty === 'easy'
          ? { directionChanges: 14, jumpImpulses: 10 }
          : bot.difficulty === 'hard'
            ? { directionChanges: 28, jumpImpulses: 14 }
            : { directionChanges: 20, jumpImpulses: 12 };
      return bot.directionChanges > thresholds.directionChanges || bot.jumpImpulses > thresholds.jumpImpulses;
    });

    if (excessiveBotJitter) {
      throw new Error(`Bot jitter exceeds threshold: ${JSON.stringify(hostSummary.botMetrics)}`);
    }
    if (hostSummary.readySamples < 24 || guestSummary.readySamples < 24) {
      throw new Error(`Arena samples too low: host=${hostSummary.readySamples}, guest=${guestSummary.readySamples}`);
    }
    if (hostSummary.finalTick < 30 || guestSummary.finalTick < 30) {
      throw new Error(`Arena tick did not advance enough: host=${hostSummary.finalTick}, guest=${guestSummary.finalTick}`);
    }
    if (hostSummary.maxRenderedHumans < 2 || guestSummary.maxRenderedHumans < 2) {
      throw new Error(`Remote presence did not render reliably: host=${hostSummary.maxRenderedHumans}, guest=${guestSummary.maxRenderedHumans}`);
    }
    if (hostDisplayedLatencyMs > 180 || guestDisplayedLatencyMs > 180) {
      throw new Error(`Local coop latency too high: host=${hostDisplayedLatencyMs}ms guest=${guestDisplayedLatencyMs}ms`);
    }
    if (!continuityState.continued) {
      throw new Error(`Guest did not keep simulating after host exit: ${JSON.stringify(continuityState)}`);
    }
    if (Number(continuityState.renderedHumanCount ?? 0) < 1) {
      throw new Error(`Guest render state collapsed after host exit: ${JSON.stringify(continuityState)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
