// 运行时验证 v2: 跳过 UI 点击,直接调用 Phaser MainScene.interactWithStation('campaign')
// 进入 PlatformGame,然后找到 boss sprite 验证 scale/body
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

    log('opening /world...');
    await page.goto(BASE + '/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT_DIR, '01-world-home.png'), fullPage: false });

    // 等到 Phaser game 就绪
    const ready = await page.waitForFunction(() => {
        const g = window.__worldPhaserGame;
        return g && Object.keys(g.scene.keys).includes('MainScene') && g.scene.keys.MainScene && g.scene.keys.MainScene.scene.isActive();
    }, { timeout: 15000 });
    log('Phaser MainScene ready');

    // 解锁所需技能 double_jump,通过 useGameStore 设置 localStorage
    await page.evaluate(() => {
        // gameStore 应该会用 localStorage 持久化 skills
        // 强制设置:通过 zustand-persist 注入
        try {
            const key = 'game-store';
            const existing = JSON.parse(localStorage.getItem(key) || '{}');
            existing.state = existing.state || {};
            existing.state.skills = existing.state.skills || [];
            const need = ['double_jump', 'glide'];
            for (const s of need) {
                if (!existing.state.skills.includes(s)) existing.state.skills.push(s);
            }
            localStorage.setItem(key, JSON.stringify(existing));
            log('[inject] skills=' + JSON.stringify(existing.state.skills));
        } catch (e) {
            console.warn('inject skill failed', e);
        }
    });

    // 重新加载页面让 store 生效
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 触发 campaign 站点交互
    const interactResult = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        if (!g) return { ok: false, reason: 'no game' };
        const ms = g.scene.keys.MainScene;
        if (!ms) return { ok: false, reason: 'no MainScene' };

        // 找到 campaign 站点 sprite 位置
        const stations = ms.stations || [];
        const camp = stations.find(s => s.id === 'campaign');
        if (!camp) return { ok: false, reason: 'no campaign station', stationIds: stations.map(s => s.id) };

        // 滚动摄像机到 campaign 位置
        const cam = ms.cameras.main;
        cam.scrollX = Math.max(0, camp.x - 400);
        cam.scrollY = Math.max(0, camp.y - 200);
        if (cam.deadzone) cam.deadzone = null;
        ms.cameras.main.scrollX = cam.scrollX;
        ms.cameras.main.scrollY = cam.scrollY;

        // 把玩家瞬移到 campaign 位置附近
        if (ms.player) {
            ms.player.x = camp.x - 50;
            ms.player.y = camp.y + 20;
        }

        // 直接调用交互方法
        try {
            ms.interactWithStation(camp);
            return { ok: true, station: { id: camp.id, x: camp.x, y: camp.y }, cam: { x: cam.scrollX, y: cam.scrollY } };
        } catch (e) {
            return { ok: false, reason: 'interactWithStation threw: ' + e.message };
        }
    });
    log('interact result:', JSON.stringify(interactResult));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-after-campaign-interact.png') });

    // 检查 PlatformGame 是否出现
    let sceneState = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        if (!g) return { ok: false };
        return {
            scenes: Object.keys(g.scene.keys).map(k => {
                const sc = g.scene.keys[k];
                return { key: k, active: sc?.scene?.isActive?.(), visible: sc?.scene?.isVisible?.() };
            }),
            platformSceneKeys: Object.keys(g.scene.keys).filter(k => /Platform/i.test(k)),
        };
    });
    log('scene state after interact:', JSON.stringify(sceneState, null, 2));

    // 如果 PlatformGameScene 还没出现, 反复尝试(需要 React 端切到 PlatformGame)
    let attempts = 0;
    while (!(sceneState.platformSceneKeys && sceneState.platformSceneKeys.length > 0) && attempts < 6) {
        attempts++;
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const g = window.__worldPhaserGame;
            if (!g) return;
            const ms = g.scene.keys.MainScene;
            const stations = ms.stations || [];
            const camp = stations.find(s => s.id === 'campaign');
            if (camp) {
                ms.cameras.main.scrollX = Math.max(0, camp.x - 400);
                ms.cameras.main.scrollY = Math.max(0, camp.y - 200);
                if (ms.player) { ms.player.x = camp.x - 50; ms.player.y = camp.y + 20; }
                try { ms.interactWithStation(camp); } catch (e) {}
            }
        });
        sceneState = await page.evaluate(() => {
            const g = window.__worldPhaserGame;
            if (!g) return { ok: false };
            return {
                scenes: Object.keys(g.scene.keys).map(k => {
                    const sc = g.scene.keys[k];
                    return { key: k, active: sc?.scene?.isActive?.() };
                }),
                platformSceneKeys: Object.keys(g.scene.keys).filter(k => /Platform/i.test(k)),
            };
        });
        log('attempt ' + attempts + ' scenes:', JSON.stringify(sceneState.platformSceneKeys));
    }

    // 现在 PlatformGameScene 应该激活
    // 检查 boss sprite
    await page.waitForTimeout(3000);
    const portraitCheck = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        if (!g) return { ok: false };
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
            return { id, key, exists };
        });
        return { ok: true, total: items.length, loaded: items.filter(i => i.exists).length, items };
    });
    log('texture check:', portraitCheck.loaded + '/' + portraitCheck.total);

    // boss sprite 检查
    const bossSpriteCheck = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        if (!g) return { ok: false, reason: 'no game' };
        const sceneKey = Object.keys(g.scene.keys).find(k => /Platform/i.test(k));
        const scene = sceneKey ? g.scene.keys[sceneKey] : null;
        if (!scene) return { ok: false, reason: 'no Platform scene', scenes: Object.keys(g.scene.keys) };
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
                health: b.health,
                maxHealth: b.maxHealth,
                enemyType: b.enemyType,
                frameRealWidth: b.frame && b.frame.realWidth,
            })),
            allEnemyTextures: enemies.map(e => e.texture && e.texture.key),
            sceneKeys: Object.keys(g.scene.keys),
        };
    });
    log('boss sprite check:');
    log(JSON.stringify(bossSpriteCheck, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'boss-sprite-check.json'), JSON.stringify(bossSpriteCheck, null, 2));

    // 如果有 boss 精灵,测试 phase 2/3 tween 是否会爆屏
    if (bossSpriteCheck.bossCount > 0) {
        log('--- phase tween simulation ---');
        const phaseTest = await page.evaluate(() => {
            const g = window.__worldPhaserGame;
            const sceneKey = Object.keys(g.scene.keys).find(k => /Platform/i.test(k));
            const scene = g.scene.keys[sceneKey];
            const enemies = scene.enemies.getChildren();
            const b = enemies.find(e => {
                const t = e.texture && e.texture.key;
                return (t && t.startsWith('bossPortrait_')) || e.enemyType === 'boss';
            });
            if (!b) return { ok: false };

            const baseScale = b.baseScaleX || b.scaleX;
            const beforeW = b.displayWidth;
            // 模拟 phase 2: baseScale * 1.1
            b.setScale(baseScale * 1.1, baseScale * 1.1);
            const phase2W = b.displayWidth;
            // 模拟 phase 3: baseScale * 1.5
            b.setScale(baseScale * 1.5, baseScale * 1.5);
            const phase3W = b.displayWidth;
            // 恢复
            b.setScale(baseScale, baseScale);

            return {
                ok: true,
                baseScale,
                beforeW,
                phase2W,
                phase3W,
                canvasW: scene.cameras.main.width,
                canvasH: scene.cameras.main.height,
                phase2Ratio: (phase2W / scene.cameras.main.width).toFixed(3),
                phase3Ratio: (phase3W / scene.cameras.main.width).toFixed(3),
            };
        });
        log('phase tween test:');
        log(JSON.stringify(phaseTest, null, 2));

        // 模拟子弹命中测试
        log('--- bullet hit test ---');
        const hitTest = await page.evaluate(() => {
            const g = window.__worldPhaserGame;
            const sceneKey = Object.keys(g.scene.keys).find(k => /Platform/i.test(k));
            const scene = g.scene.keys[sceneKey];
            const enemies = scene.enemies.getChildren();
            const b = enemies.find(e => {
                const t = e.texture && e.texture.key;
                return (t && t.startsWith('bossPortrait_')) || e.enemyType === 'boss';
            });
            if (!b) return { ok: false };

            // 找到一个玩家子弹
            const projectiles = scene.projectiles || scene.bullets || scene.playerBullets;
            let bullets = [];
            if (projectiles && projectiles.getChildren) {
                bullets = projectiles.getChildren();
            } else if (scene.children) {
                bullets = scene.children.list.filter(c => c.type === 'Sprite' && c.texture && c.texture.key === 'bullet');
            }
            if (bullets.length === 0) {
                // 用 Phaser.Intersects.RectangleToRectangle 模拟
                const bossRect = b.getBounds();
                // 构造一个中心在 boss 的 30x30 子弹精灵
                const fakeBullet = { x: b.x, y: b.y, width: 30, height: 30 };
                const fakeBulletRect = new Phaser.Geom.Rectangle(fakeBullet.x - 15, fakeBullet.y - 15, 30, 30);
                const intersects = Phaser.Geom.Rectangle.Overlaps(bossRect, fakeBulletRect);
                return {
                    ok: true,
                    bossRect: { x: bossRect.x, y: bossRect.y, w: bossRect.width, h: bossRect.height },
                    bodyRect: { x: b.body.x, y: b.body.y, w: b.body.width, h: b.body.height },
                    intersectsWithBody: Phaser.Geom.Rectangle.Overlaps(
                        new Phaser.Geom.Rectangle(b.body.x, b.body.y, b.body.width, b.body.height),
                        fakeBulletRect
                    ),
                    intersectsWithVisual: intersects,
                };
            }
            return { ok: true, bulletCount: bullets.length };
        });
        log('hit test:');
        log(JSON.stringify(hitTest, null, 2));
    }

    await page.screenshot({ path: path.join(OUT_DIR, '99-final.png'), fullPage: false });

    log('--- summary ---');
    log('Page errors:', pageErrs.length);
    pageErrs.slice(0, 5).forEach(e => log('  ERR:', e));
    fs.writeFileSync(path.join(OUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));

    await browser.close();

    log('=== VERDICT ===');
    log('Texture loaded: ' + portraitCheck.loaded + '/' + portraitCheck.total + '  ' + ((portraitCheck.loaded === 22) ? 'PASS' : 'FAIL'));
    if (bossSpriteCheck.bossCount > 0) {
        const b = bossSpriteCheck.bosses[0];
        log('Boss displayWidth: ' + b.displayWidth + ' (expected ~60)');
        log('Boss body.width: ' + b.bodyW + ' (expected ~60)');
        log('Boss texture: ' + b.texture);
        log('Boss health: ' + b.health + '/' + b.maxHealth);
        const okDisplay = b.displayWidth >= 30 && b.displayWidth <= 200;
        const okBody = b.bodyW >= 30 && b.bodyW <= 200;
        log('displayWidth in range: ' + (okDisplay ? 'PASS' : 'FAIL'));
        log('body.width in range: ' + (okBody ? 'PASS' : 'FAIL'));
    } else {
        log('No boss sprite in scene');
    }
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
