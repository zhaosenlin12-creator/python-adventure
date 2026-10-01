// v4: 直接通过 localStorage 注入技能,然后刷新页面,最后进 campaign
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
    page.on('pageerror', e => pageErrs.push(String(e)));
    page.on('console', m => { consoleLogs.push('[' + m.type() + '] ' + m.text()); });

    // 先访问一次让 cookie/localStorage 设置好
    await page.goto(BASE + '/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 注入技能到 game-storage (zustand persist key)
    await page.evaluate(() => {
        const key = 'game-storage';
        const existing = JSON.parse(localStorage.getItem(key) || '{"state":{},"version":0}');
        existing.state = existing.state || {};
        existing.state.skills = ['double_jump', 'glide'];
        localStorage.setItem(key, JSON.stringify(existing));
        console.log('[inject] skills=' + JSON.stringify(existing.state.skills));
    });

    // 重新加载页面,store 会从 localStorage 恢复
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 确认 Phaser game 在 MainScene
    await page.waitForFunction(() => {
        const g = window.__worldPhaserGame;
        return g && g.scene.keys.MainScene && g.scene.keys.MainScene.scene.isActive();
    }, { timeout: 15000 });
    log('MainScene ready after reload');

    // 验证技能是否真的进了 store
    const skillState = await page.evaluate(() => {
        const key = 'game-storage';
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).state?.skills : 'no-store';
    });
    log('skills in localStorage:', JSON.stringify(skillState));

    // 触发 campaign 站点
    await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        const ms = g.scene.keys.MainScene;
        const camp = ms.stations.find(s => s.id === 'campaign');
        ms.cameras.main.setScroll(camp.x - 400, camp.y - 200);
        if (ms.player) { ms.player.x = camp.x - 50; ms.player.y = camp.y + 20; }
    });
    await page.waitForTimeout(500);
    await page.keyboard.press('e');
    await page.waitForTimeout(2500);

    // 等 PlatformGame
    let platformGameFound = false;
    for (let i = 0; i < 30; i++) {
        const found = await page.evaluate(() => !!window.__platformPhaserGame);
        if (found) { platformGameFound = true; log('__platformPhaserGame appeared at attempt ' + i); break; }
        await page.waitForTimeout(500);
    }

    if (!platformGameFound) {
        log('no PlatformGame - try direct setState via React fiber');
        await page.evaluate(() => {
            function findFiber(node) {
                if (!node) return null;
                const key = Object.keys(node).find(k => k.startsWith('__reactFiber'));
                return key ? node[key] : null;
            }
            function walk(fiber, depth) {
                if (!fiber || depth > 60) return null;
                let s = fiber.memoizedState;
                while (s) {
                    if (s.memoizedState && typeof s.memoizedState === 'object' && 'showPlatformGame' in s.memoizedState) {
                        if (s.queue && s.queue.dispatch) {
                            s.queue.dispatch(true);
                            return true;
                        }
                    }
                    s = s.next;
                }
                if (fiber.child && walk(fiber.child, depth + 1)) return true;
                if (fiber.sibling && walk(fiber.sibling, depth + 1)) return true;
                return false;
            }
            const root = document.querySelector('main') || document.body;
            const fiber = findFiber(root);
            if (fiber) walk(fiber, 0);
        });
        await page.waitForTimeout(3000);
        for (let i = 0; i < 10; i++) {
            const found = await page.evaluate(() => !!window.__platformPhaserGame);
            if (found) { platformGameFound = true; log('appeared after fiber hack attempt ' + i); break; }
            await page.waitForTimeout(500);
        }
    }

    await page.screenshot({ path: path.join(OUT_DIR, '03-state.png') });

    if (!platformGameFound) {
        log('FAIL: PlatformGame never mounted');
        fs.writeFileSync(path.join(OUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));
        await browser.close();
        return;
    }

    // 等 boss 加载
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT_DIR, '04-platform-game.png') });

    // ===== 关键检查 =====
    const result = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        if (!g) return { ok: false, reason: 'no game' };
        const sceneKey = Object.keys(g.scene.keys).find(k => /Platform/i.test(k));
        const scene = sceneKey ? g.scene.keys[sceneKey] : null;
        if (!scene) return { ok: false, reason: 'no Platform scene', scenes: Object.keys(g.scene.keys) };

        // Texture cache 检查
        const tex = g.textures;
        const expected = [
            'campaign_1','campaign_2','campaign_3','campaign_4','campaign_5','campaign_6',
            'campaign_7','campaign_8','campaign_9','campaign_10','campaign_11','campaign_12',
            'campaign_13','campaign_14','campaign_15','campaign_16',
            'campaign_7_variant_b','campaign_8_variant_b','campaign_9_variant_b',
            'campaign_10_ticket_master','campaign_10_platform_master','campaign_10_conductor',
        ];
        const texItems = expected.map(id => {
            const key = 'bossPortrait_' + id;
            const exists = tex.exists(key);
            let info = null;
            if (exists) {
                const f = tex.getFrame(key);
                info = { w: f && (f.realWidth || f.width), h: f && (f.realHeight || f.height) };
            }
            return { id, exists, info };
        });

        // 找 boss 精灵
        const enemies = (scene.enemies && scene.enemies.getChildren ? scene.enemies.getChildren() : []) || [];
        const bosses = enemies.filter(e => {
            const t = (e.texture && e.texture.key) || '';
            return t.startsWith('bossPortrait_') || (e.enemyType === 'boss');
        });

        // 模拟 phase 2/3 tween
        let phaseTest = null;
        if (bosses.length > 0) {
            const b = bosses[0];
            const baseScale = b.baseScaleX || b.scaleX;
            const beforeW = b.displayWidth;
            const beforeBodyW = b.body && b.body.width;
            b.setScale(baseScale * 1.1, baseScale * 1.1);
            const phase2W = b.displayWidth;
            const phase2BodyW = b.body && b.body.width;
            b.setScale(baseScale * 1.5, baseScale * 1.5);
            const phase3W = b.displayWidth;
            const phase3BodyW = b.body && b.body.width;
            b.setScale(baseScale, baseScale);
            phaseTest = {
                baseScale, beforeW, beforeBodyW,
                phase2W, phase2BodyW,
                phase3W, phase3BodyW,
                canvasW: scene.cameras.main.width,
                canvasH: scene.cameras.main.height,
            };
        }

        // bullet hit test
        let hitTest = null;
        if (bosses.length > 0) {
            const b = bosses[0];
            const bossRect = b.getBounds();
            const bodyRect = { x: b.body.x, y: b.body.y, w: b.body.width, h: b.body.height };
            // 模拟一个中心在 boss 位置的 30x30 子弹
            const fakeBulletRect = { x: b.x - 15, y: b.y - 15, w: 30, h: 30 };
            // 用 Phaser 的 intersects
            const PhaserRect = Phaser.Geom.Rectangle;
            const overlapsVisual = PhaserRect.Overlaps(new PhaserRect(bossRect.x, bossRect.y, bossRect.width, bossRect.height), new PhaserRect(fakeBulletRect.x, fakeBulletRect.y, fakeBulletRect.w, fakeBulletRect.h));
            const overlapsBody = PhaserRect.Overlaps(new PhaserRect(bodyRect.x, bodyRect.y, bodyRect.w, bodyRect.h), new PhaserRect(fakeBulletRect.x, fakeBulletRect.y, fakeBulletRect.w, fakeBulletRect.h));
            hitTest = {
                bossRect: { x: bossRect.x, y: bossRect.y, w: bossRect.width, h: bossRect.height },
                bodyRect,
                fakeBulletRect,
                overlapsVisual,
                overlapsBody,
            };
        }

        return {
            ok: true,
            sceneKey,
            currentLevel: scene.levelData ? (scene.levelData.id || scene.levelData.campaignId) : 'unknown',
            canvasSize: { w: scene.cameras.main.width, h: scene.cameras.main.height },
            tex: { total: texItems.length, loaded: texItems.filter(i => i.exists).length, items: texItems },
            enemies: { count: enemies.length, bossCount: bosses.length, textures: enemies.map(e => e.texture && e.texture.key) },
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
                health: b.health,
                maxHealth: b.maxHealth,
                enemyType: b.enemyType,
                frameRealWidth: b.frame && b.frame.realWidth,
                phase: b.currentPhase || b.bossPhase,
            })),
            phaseTest,
            hitTest,
        };
    });

    log('==== RUNTIME RESULT ====');
    log(JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'boss-runtime-result.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));

    log('--- summary ---');
    log('Page errors:', pageErrs.length);
    pageErrs.slice(0, 5).forEach(e => log('  ERR:', e));

    await browser.close();

    log('=== VERDICT ===');
    log('Texture loaded: ' + result.tex.loaded + '/' + result.tex.total + '  ' + ((result.tex.loaded === 22) ? 'PASS' : 'FAIL'));
    log('Boss sprite count: ' + result.enemies.bossCount);
    if (result.enemies.bossCount > 0) {
        const b = result.bosses[0];
        log('  Texture: ' + b.texture);
        log('  displayWidth: ' + b.displayWidth + ' (expected ~60)');
        log('  body.width: ' + b.bodyW + ' (expected ~60)');
        log('  baseScaleX: ' + b.baseScaleX);
        log('  scaleX: ' + b.scaleX);
        log('  body._sx: ' + b.body_sx);
        log('  frame.realWidth: ' + b.frameRealWidth);
        log('  health: ' + b.health + '/' + b.maxHealth);

        const displayOk = b.displayWidth >= 30 && b.displayWidth <= 200;
        const bodyOk = b.bodyW >= 30 && b.bodyW <= 200;
        log('  displayWidth OK: ' + (displayOk ? 'PASS' : 'FAIL'));
        log('  body.width OK: ' + (bodyOk ? 'PASS' : 'FAIL'));

        if (result.phaseTest) {
            const pt = result.phaseTest;
            log('Phase test:');
            log('  before: ' + pt.beforeW + 'px');
            log('  phase2 (1.1x): ' + pt.phase2W + 'px');
            log('  phase3 (1.5x): ' + pt.phase3W + 'px');
            log('  canvas width: ' + pt.canvasW);
            const p2ok = pt.phase2W < pt.canvasW * 0.8;
            const p3ok = pt.phase3W < pt.canvasW * 0.8;
            log('  phase2 fills < 80% canvas: ' + (p2ok ? 'PASS' : 'FAIL'));
            log('  phase3 fills < 80% canvas: ' + (p3ok ? 'PASS' : 'FAIL'));
        }

        if (result.hitTest) {
            const ht = result.hitTest;
            log('Hit test (bullet at boss center):');
            log('  boss visual rect: ' + ht.bossRect.w + 'x' + ht.bossRect.h);
            log('  boss body rect: ' + ht.bodyRect.w + 'x' + ht.bodyRect.h);
            log('  bullet overlaps visual: ' + ht.overlapsVisual);
            log('  bullet overlaps body: ' + ht.overlapsBody);
            log('  visual==body: ' + (Math.abs(ht.bossRect.w - ht.bodyRect.w) < 5 ? 'PASS' : 'FAIL (visual/body mismatch)'));
        }
    }
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
