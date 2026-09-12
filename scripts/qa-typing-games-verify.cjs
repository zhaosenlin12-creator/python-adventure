const { chromium } = require('playwright');
const fs = require('fs');

const GAMES = [
  { id: 'potato-zombies',  expectIframe: false, expectInline: true },
  { id: 'pinyin-fighter',  expectIframe: true },
  { id: 'car-racing',      expectIframe: true },
  { id: 'virus-battle',    expectIframe: true },
  { id: 'whac-a-mole',     expectIframe: true },
  { id: 'defend-earth',    expectIframe: true },
  { id: 'typing-test',     expectIframe: true },
  { id: 'duck-jump',       expectIframe: true },
  { id: 'fishing-guru',    expectIframe: true },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const failedRequests = [];
  const ignoredAborts = [];
  page.on('requestfailed', (req) => {
    const error = req.failure() && req.failure().errorText;
    const isAudio = /\.(mp3|ogg|wav|m4a)(?:[?#]|$)/i.test(new URL(req.url()).pathname);
    if (error === 'net::ERR_ABORTED' && isAudio) {
      ignoredAborts.push({ url: req.url(), error });
      return;
    }
    failedRequests.push({ url: req.url(), error });
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (u.includes('/typing/') && resp.status() >= 400) {
      failedRequests.push({ url: u, status: resp.status() });
    }
  });

  const results = [];
  for (const g of GAMES) {
    failedRequests.length = 0;
    const target = 'http://localhost:3003/typing/index.html#/games/' + g.id;
    try {
      await page.goto(target, { waitUntil: 'load', timeout: 30000 });
    } catch (e) {
      results.push({ id: g.id, status: 'NAV-FAIL', err: e.message });
      continue;
    }
    try {
      await page.waitForSelector('[data-game-stage], .game-iframe, iframe', { timeout: 15000 });
    } catch (e) {}
    await page.waitForTimeout(3500);
    let info = {};
    if (g.expectInline) {
      const stageOk = await page.$('[data-game-stage]');
      info = { stagePresent: !!stageOk };
    } else {
      const iframeEl = await page.$('iframe.game-iframe');
      const src = iframeEl ? await iframeEl.getAttribute('src') : null;
      info = { iframeSrc: src, iframeLoaded: false };
      if (iframeEl) {
        const frame = await iframeEl.contentFrame();
        if (frame) {
          await frame.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          await frame.waitForTimeout(2500);
          info.iframeLoaded = true;
          try {
            info.iframeReadyState = await frame.evaluate(() => document.readyState);
          } catch (e) {}
        }
      }
    }
    results.push({
      id: g.id,
      status: 'OK',
      failed: failedRequests.slice(),
      ignoredExpectedAborts: ignoredAborts.splice(0),
      ...info,
    });
    await page.screenshot({ path: 'release/qa-' + g.id + '.png', full: true }).catch(() => {});
  }

  await browser.close();
  fs.writeFileSync('release/qa-games-verify.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
