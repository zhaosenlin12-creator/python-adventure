const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const outDir = 'C:/Users/Administrator/AppData/Local/Temp/play_7944';
  fs.mkdirSync(outDir, { recursive: true });

  const games = [
    { slug: 'pinyin-fighter', url: 'http://127.0.0.1:3000/typing/game-res/pinyin-fighter/index.html' },
    { slug: 'car-racing', url: 'http://127.0.0.1:3000/typing/game-res/car-racing/index.html' },
    { slug: 'virus-battle', url: 'http://127.0.0.1:3000/typing/game-res/virus-battle/index.html' },
    { slug: 'whac-a-mole', url: 'http://127.0.0.1:3000/typing/game-res/whac-a-mole/ultra.html' },
    { slug: 'defend-earth', url: 'http://127.0.0.1:3000/typing/game-res/defend-earth/defend-earth-ultra.html' },
    { slug: 'typing-test', url: 'http://127.0.0.1:3000/typing/game-res/typing-test/index.html' },
    { slug: 'duck-jump-river', url: 'http://127.0.0.1:3000/typing/game-res/duck-jump-river/duck-jump-river-ultra.html' },
    { slug: 'fishing-guru', url: 'http://127.0.0.1:3000/typing/game-res/fishing-guru/index.html' },
  ];

  // 8 typing games
  const gameResults = [];
  for (const g of games) {
    const p = await ctx.newPage();
    const errs = []; const fails = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('response', r => { if (r.status() >= 400) fails.push(r.status()+' '+r.url()); });
    p.on('console', m => { if (m.type()==='error') errs.push('[console] '+m.text()); });
    try { await p.goto(g.url, { waitUntil: 'networkidle', timeout: 30000 }); }
    catch (e) { gameResults.push({ slug: g.slug, status: 'goto-err: '+e.message }); await p.close(); continue; }
    await p.waitForTimeout(3500);
    let canvas=null, title=null;
    try {
      canvas = await p.evaluate(() => { const c=document.querySelector('canvas'); return c?{w:c.width,h:c.height,has2d:!!c.getContext('2d'),hasGL:!!c.getContext('webgl')||!!c.getContext('webgl2')}:null; });
      title = await p.title();
    } catch(e){}
    await p.screenshot({ path: path.join(outDir, g.slug+'.png'), timeout: 30000 });
    gameResults.push({ slug: g.slug, status: 'ok', title, canvas, pageErr: errs.length, failReq: fails.filter(f=>!f.includes('aborted')&&!f.includes('Aborted')&&!f.includes('Abort')).length, fails: fails.slice(0,5) });
    await p.close();
  }

  // SPA game routes: verify routing, iframe focus, Space delivery, and iframe stability.
  const spaGames = [
    { slug: 'potato-zombies', iframe: false },
    { slug: 'pinyin-fighter', iframe: true },
    { slug: 'car-racing', iframe: true },
    { slug: 'virus-battle', iframe: true },
    { slug: 'whac-a-mole', iframe: true },
    { slug: 'defend-earth', iframe: true },
    { slug: 'typing-test', iframe: true, verifyBackgroundSync: true },
    { slug: 'duck-jump', iframe: true },
    { slug: 'fishing-guru', iframe: true },
  ];
  const spaCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await spaCtx.addInitScript(() => {
    Math.random = () => 0;
    window.__qaSpaceKeyCount = 0;
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') window.__qaSpaceKeyCount += 1;
    }, true);
  });
  const spaResults = [];
  for (const game of spaGames) {
    const p = await spaCtx.newPage();
    const errs = [];
    const fails = [];
    p.on('pageerror', (error) => errs.push(String(error)));
    p.on('console', (message) => {
      if (message.type() === 'error') errs.push(`[console] ${message.text()}`);
    });
    p.on('response', (response) => {
      if (response.status() >= 400) fails.push(`${response.status()} ${response.url()}`);
    });
    try {
      await p.goto(`http://127.0.0.1:3000/typing/#/games/${game.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
      await p.waitForTimeout(2500);
      if (game.iframe) {
        const before = await p.evaluate(() => {
          const iframe = document.querySelector('.game-iframe');
          if (!iframe) return { hasIframe: false };
          iframe.dataset.qaStable = 'true';
          const rect = iframe.getBoundingClientRect();
          return {
            hasIframe: true,
            iframeSrc: iframe.getAttribute('src'),
            scrollY: window.scrollY,
            iframeTop: Math.round(rect.top),
            iframeBottom: Math.round(rect.bottom),
            iframeInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
            activeIsIframe: document.activeElement === iframe,
          };
        });
        await p.keyboard.press('Space');
        await p.waitForTimeout(150);
        const spaceKeyCount = await p.evaluate(() => {
          const iframe = document.querySelector('.game-iframe');
          return Number(iframe?.contentWindow?.__qaSpaceKeyCount || 0);
        });
        if (game.verifyBackgroundSync) await p.waitForTimeout(6500);
        const after = await p.evaluate(() => {
          const iframe = document.querySelector('.game-iframe');
          const rect = iframe?.getBoundingClientRect();
          return {
            iframeStable: iframe?.dataset.qaStable === 'true',
            activeIsIframe: document.activeElement === iframe,
            iframeInViewport: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight),
          };
        });
        spaResults.push({ slug: game.slug, pageErr: errs.length, failReq: fails.length, before, spaceKeyCount, after, errs: errs.slice(0, 3), fails: fails.slice(0, 3) });
      } else {
        const beforeOverlay = await p.locator('[data-game-start-overlay]').count();
        await p.keyboard.press('Space');
        await p.waitForTimeout(3000);
        const startButton = await p.locator('[data-action="start-game"]').textContent();
        spaResults.push({ slug: game.slug, pageErr: errs.length, failReq: fails.length, beforeOverlay, startButton, errs: errs.slice(0, 3), fails: fails.slice(0, 3) });
      }
      await p.screenshot({ path: path.join(outDir, `spa-${game.slug}.png`), timeout: 30000 });
    } catch (error) {
      spaResults.push({ slug: game.slug, error: String(error) });
    }
    await p.close();
  }
  await spaCtx.close();

  // /world (guest)
  const w = await ctx.newPage();
  const werr=[]; const wfails=[];
  w.on('pageerror', e=>werr.push(String(e)));
  w.on('response', r=>{ if (r.status()>=400) wfails.push(r.status()+' '+r.url()); });
  try { await w.goto('http://127.0.0.1:3000/world', { waitUntil: 'networkidle', timeout: 60000 }); } catch(e){ console.log('world goto:', e.message); }
  await w.waitForTimeout(10000);
  await w.screenshot({ path: path.join(outDir, 'world-guest.png'), timeout: 30000 });
  const wInfo = await w.evaluate(() => ({
    title: document.title,
    canvases: document.querySelectorAll('canvas').length,
    buttons: Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).filter(t=>t).slice(0,15),
    text: (document.body.innerText||'').slice(0,2000),
  }));
  console.log('=== /world (guest) ===');
  console.log('  pageErr:', werr.length, 'fail:', wfails.length);
  if (werr.length) console.log('  errs:', werr.slice(0,5));
  if (wfails.length) console.log('  fails:', wfails.slice(0,10));
  console.log('  canvases:', wInfo.canvases, ' buttons:', wInfo.buttons);
  console.log('  text:', wInfo.text.slice(0,500));
  await w.close();

  // /world (logged in senlin)
  const w2 = await ctx.newPage();
  const w2err=[];
  w2.on('pageerror', e=>w2err.push(String(e)));
  await w2.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  await w2.waitForTimeout(2000);
  await w2.evaluate(async () => {
    const r = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'senlin', password:'123456'})
    });
    const j = await r.json();
    if (j.access_token) {
      localStorage.setItem('code_adventure_user', JSON.stringify(j.user));
      localStorage.setItem('code_adventure_token', j.access_token);
    }
  });
  await w2.waitForTimeout(800);
  await w2.goto('http://127.0.0.1:3000/world', { waitUntil: 'networkidle', timeout: 60000 });
  await w2.waitForTimeout(12000);
  await w2.screenshot({ path: path.join(outDir, 'world-senlin.png'), timeout: 30000 });
  const w2Info = await w2.evaluate(() => ({
    title: document.title,
    canvases: document.querySelectorAll('canvas').length,
    buttons: Array.from(document.querySelectorAll('button')).map(b=>b.innerText.trim()).filter(t=>t).slice(0,15),
    text: (document.body.innerText||'').slice(0,3000),
  }));
  console.log('=== /world (senlin Lv.1) ===');
  console.log('  pageErr:', w2err.length);
  if (w2err.length) console.log('  errs:', w2err.slice(0,5));
  console.log('  canvases:', w2Info.canvases, ' buttons:', w2Info.buttons);
  console.log('  text:', w2Info.text);
  await w2.close();

  // /typing
  const t = await ctx.newPage();
  try { await t.goto('http://127.0.0.1:3000/typing/', { waitUntil: 'networkidle', timeout: 30000 }); } catch(e){ console.log('typing goto:', e.message); }
  await t.waitForTimeout(5000);
  await t.screenshot({ path: path.join(outDir, 'typing.png'), timeout: 30000 });
  const tInfo = await t.evaluate(() => ({
    title: document.title,
    text: (document.body.innerText||'').slice(0,1500),
  }));
  console.log('=== /typing ===');
  console.log('  title:', tInfo.title);
  console.log('  text:', tInfo.text.slice(0,800));
  await t.close();

  // Mobile viewport sanity: no horizontal overflow, browser errors, or hidden game surfaces.
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobileRoutes = [
    { name: 'home', url: 'http://127.0.0.1:3000/', wait: 2500 },
    { name: 'world', url: 'http://127.0.0.1:3000/world', wait: 10000, requiredSelector: 'canvas' },
    { name: 'typing', url: 'http://127.0.0.1:3000/typing/', wait: 5000 },
    { name: 'typing-test', url: 'http://127.0.0.1:3000/typing/#/games/typing-test', wait: 4000, requiredSelector: 'iframe' },
  ];
  const mobileResults = [];
  for (const route of mobileRoutes) {
    const page = await mobileCtx.newPage();
    const errors = [];
    const failures = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    let navigationError = null;
    try {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (error) {
      navigationError = String(error);
    }
    await page.waitForTimeout(route.wait);
    const layout = await page.evaluate((requiredSelector) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
      const requiredElements = requiredSelector
        ? Array.from(document.querySelectorAll(requiredSelector)).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              intersectsViewport: rect.right > 0 && rect.left < viewportWidth && rect.bottom > 0 && rect.top < viewportHeight,
            };
          })
        : [];
      return {
        viewportWidth,
        viewportHeight,
        documentWidth,
        horizontalOverflow: documentWidth > viewportWidth + 2,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        requiredElements,
      };
    }, route.requiredSelector || null);
    await page.screenshot({ path: path.join(outDir, `mobile-${route.name}.png`), timeout: 30000 });
    mobileResults.push({
      route: route.name,
      requiredSelector: route.requiredSelector || null,
      navigationError,
      pageErr: errors.length,
      failReq: failures.length,
      errors: errors.slice(0, 3),
      failures: failures.slice(0, 3),
      layout,
    });
    await page.close();
  }
  await mobileCtx.close();

  await browser.close();
  console.log('\\n=== SUMMARY ===');
  console.log('Games:');
  for (const r of gameResults) console.log(' ', r.slug.padEnd(18), '|', r.status, '| canvas:', r.canvas?.w+'x'+r.canvas?.h, '| pageErr:', r.pageErr, '| failReq:', r.failReq);
  console.log('SPA routes:');
  for (const r of spaResults) console.log(' ', r.slug.padEnd(18), '|', JSON.stringify(r));
  console.log('Mobile routes:');
  for (const r of mobileResults) console.log(' ', r.route.padEnd(18), '|', JSON.stringify(r));

  const directFailures = gameResults.filter((result) => result.status !== 'ok' || !result.canvas || result.pageErr || result.failReq);
  const spaFailures = spaResults.filter((result) => {
    if (result.error || result.pageErr || result.failReq) return true;
    if (result.before?.hasIframe) {
      return !result.before.iframeInViewport || !result.before.activeIsIframe || result.spaceKeyCount < 1 || !result.after?.iframeStable || !result.after?.activeIsIframe || !result.after?.iframeInViewport;
    }
    return result.beforeOverlay < 1 || result.startButton !== '重新开始';
  });
  const mobileFailures = mobileResults.filter((result) => (
    result.navigationError
    || result.pageErr
    || result.failReq
    || result.layout.horizontalOverflow
    || (result.requiredSelector && !result.layout.requiredElements.some((element) => element.intersectsViewport))
  ));
  if (directFailures.length || spaFailures.length || mobileFailures.length || werr.length || wfails.length || w2err.length) {
    console.error('QA_FAILED', JSON.stringify({ directFailures, spaFailures, mobileFailures, worldGuestErrors: werr, worldGuestFailures: wfails, worldUserErrors: w2err }, null, 2));
    process.exitCode = 1;
  }
})();
