// 运行时验证脚本：实际打开 /world 平台游戏,检查 boss portrait texture cache
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:3000';
const OUT_DIR = 'C:/Users/Administrator/AppData/Local/Temp/boss_qa';

function log(...args) { console.log('[boss-qa]', ...args); }

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    const pageErrs = [];
    const consoleLogs = [];
    const networkFails = [];
    page.on('pageerror', e => pageErrs.push(String(e)));
    page.on('console', m => { consoleLogs.push('[' + m.type() + '] ' + m.text()); });
    page.on('response', r => {
        const u = r.url();
        if (r.status() >= 400 && !u.includes('aborted')) {
            networkFails.push(r.status() + ' ' + u);
        }
    });

    log('opening /world...');
    await page.goto(BASE + '/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '01-world-home.png'), fullPage: false });

    await page.evaluate(() => {
        window.__debugEvents = [];
        const tryHook = () => {
            const g = window.__worldPhaserGame || window.__platformPhaserGame;
            if (g) {
                window.__debugEvents.push('Found Phaser game, scenes: ' + Object.keys(g.scene.keys).join(','));
                return true;
            }
            return false;
        };
        if (!tryHook()) {
            const iv = setInterval(() => { if (tryHook()) clearInterval(iv); }, 200);
        }
    });

    const campaignEntry = await page.evaluate(() => {
        const candidates = [];
        document.querySelectorAll('button, [role=\"button\"], a, div[onclick]').forEach(el => {
            const txt = (el.textContent || '').trim();
            const ds = (el.getAttribute('data-station') || el.getAttribute('data-id') || '').toLowerCase();
            if (/战役|campaign/i.test(txt) || ds.includes('campaign')) {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    candidates.push({
                        tag: el.tagName,
                        text: txt.slice(0, 30),
                        x: r.x + r.width / 2,
                        y: r.y + r.height / 2,
                        w: r.width, h: r.height,
                    });
                }
            }
        });
        return candidates;
    });
    log('campaign candidates:', JSON.stringify(campaignEntry));

    if (campaignEntry.length > 0) {
        const t = campaignEntry[0];
        log('clicking campaign entry at', t.x, t.y);
        await page.mouse.click(t.x, t.y);
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(OUT_DIR, '03-after-campaign-click.png') });
    } else {
        log('no DOM candidate');
        await page.screenshot({ path: path.join(OUT_DIR, '02-world-no-candidate.png') });
    }

    const platformShown = await page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        return Array.from(canvases).map(c => ({
            w: c.width, h: c.height,
            parentClass: (c.parentElement && c.parentElement.className && c.parentElement.className.toString().slice(0, 80)) || '',
        }));
    });
    log('canvases:', JSON.stringify(platformShown));

    await page.waitForTimeout(3000);
    const portraitCheck = await page.evaluate(() => {
        const g = window.__worldPhaserGame || window.__platformPhaserGame;
        if (!g) return { ok: false, reason: 'no Phaser game on window' };
        const tex = g.textures;
        const expected = [
            'campaign_1','campaign_2','campaign_3','campaign_4','campaign_5','campaign_6',
            'campaign_7','campaign_8','campaign_9','campaign_10','campaign_11','campaign_12',
            'campaign_13','campaign_14','campaign_15','campaign_16',
            'campaign_7_variant_b','campaign_8_variant_b','campaign_9_variant_b',
            'campaign_10_ticket_master','campaign_10_platform_master','campaign_10_conductor',
        ];
        const items = expected.map(id => {
            const key = 'bossPortrait_' + id;
            const exists = tex.exists(key);
            let frameInfo = null;
            if (exists) {
                const f = tex.getFrame(key);
                const img = tex.get(key);
                frameInfo = {
                    realWidth: (f && (f.realWidth || f.width)) || (img && img.source && img.source[0] && img.source[0].width),
                    realHeight: (f && (f.realHeight || f.height)) || (img && img.source && img.source[0] && img.source[0].height),
                };
            }
            return { id, key, exists, frameInfo };
        });
        return { ok: true, total: items.length, loaded: items.filter(i => i.exists).length, items };
    });
    log('Texture cache check:');
    log(JSON.stringify(portraitCheck, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'texture-check.json'), JSON.stringify(portraitCheck, null, 2));

    await page.waitForTimeout(2000);
    const bossSpriteCheck = await page.evaluate(() => {
        const g = window.__worldPhaserGame || window.__platformPhaserGame;
        if (!g) return { ok: false, reason: 'no game' };
        const sceneKey = Object.keys(g.scene.keys).find(k => /PlatformGame/i.test(k));
        const scene = sceneKey ? g.scene.keys[sceneKey] : null;
        if (!scene) return { ok: false, reason: 'no PlatformGame scene', scenes: Object.keys(g.scene.keys) };
        const enemies = (scene.enemies && scene.enemies.getChildren ? scene.enemies.getChildren() : []) || [];
        const bosses = enemies.filter(e => {
            const t = (e.texture && e.texture.key) || '';
            return t.startsWith('bossPortrait_') || (e.enemyType === 'boss');
        });
        return {
            ok: true,
            enemyCount: enemies.length,
            bossCount: bosses.length,
            bosses: bosses.map(b => ({
                texture: b.texture && b.texture.key,
                scaleX: b.scaleX,
                scaleY: b.scaleY,
                displayWidth: b.displayWidth,
                displayHeight: b.displayHeight,
                baseScaleX: b.baseScaleX,
                baseScaleY: b.baseScaleY,
                bodyW: b.body && b.body.width,
                bodyH: b.body && b.body.height,
                bodySourceW: b.body && b.body.sourceWidth,
                body_sx: b.body && b.body._sx,
                x: b.x, y: b.y,
                visible: b.visible,
                alpha: b.alpha,
                frameRealWidth: b.frame && b.frame.realWidth,
                health: b.health,
            })),
            allTextures: enemies.map(e => e.texture && e.texture.key),
        };
    });
    log('Boss sprite check:');
    log(JSON.stringify(bossSpriteCheck, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'boss-sprite-check.json'), JSON.stringify(bossSpriteCheck, null, 2));

    await page.screenshot({ path: path.join(OUT_DIR, '99-final.png'), fullPage: false });

    log('--- summary ---');
    log('Page errors:', pageErrs.length);
    pageErrs.slice(0, 10).forEach(e => log('  ERR:', e));
    log('Network failures:', networkFails.length);
    networkFails.slice(0, 10).forEach(e => log('  NET:', e));

    fs.writeFileSync(path.join(OUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));

    await browser.close();

    log('=== VERDICT ===');
    log('Texture loaded: ' + (portraitCheck.loaded || 0) + '/' + (portraitCheck.total || 22) + '  ' + ((portraitCheck.loaded === 22) ? 'PASS' : 'FAIL'));
    if (bossSpriteCheck.bossCount > 0) {
        const b = bossSpriteCheck.bosses[0];
        const displayOk = b.displayWidth >= 30 && b.displayWidth <= 300;
        const bodyOk = b.bodyW >= 30 && b.bodyW <= 300;
        log('Boss displayWidth: ' + b.displayWidth + '  ' + (displayOk ? 'PASS' : 'FAIL (expected 30-300)'));
        log('Boss body.width: ' + b.bodyW + '  ' + (bodyOk ? 'PASS' : 'FAIL (expected 30-300)'));
        log('Boss texture: ' + b.texture + '  ' + (b.texture && b.texture.startsWith('bossPortrait_') ? 'PASS portrait loaded' : 'FALLBACK'));
    } else {
        log('No boss sprite in scene');
    }

    if (portraitCheck.loaded !== 22) process.exit(1);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
