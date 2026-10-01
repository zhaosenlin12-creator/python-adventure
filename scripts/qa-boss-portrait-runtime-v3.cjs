// 运行时验证 v3: 解决之前 reload 后 Phaser game handle 失效的问题
// 进入 campaign 后,等 window.__platformPhaserGame 出现
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
    page.on('console', m => {
        const txt = m.text();
        consoleLogs.push('[' + m.type() + '] ' + txt);
    });

    log('opening /world...');
    await page.goto(BASE + '/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 等 MainScene
    await page.waitForFunction(() => {
        const g = window.__worldPhaserGame;
        return g && g.scene.keys.MainScene && g.scene.keys.MainScene.scene.isActive();
    }, { timeout: 15000 });
    log('MainScene ready');

    // 通过 game store 注入技能 (zustand persist 的 key 可能在 game-store 或不同)
    const skillsInjected = await page.evaluate(() => {
        // 常见 zustand persist keys
        const keysToTry = ['game-store', 'game-storage', 'game-store-v2'];
        let store = null;
        let usedKey = null;
        for (const k of keysToTry) {
            const raw = localStorage.getItem(k);
            if (raw) { try { store = JSON.parse(raw); usedKey = k; break; } catch (e) {} }
        }
        // 也检查 sessionStorage
        if (!store) {
            for (const k of keysToTry) {
                const raw = sessionStorage.getItem(k);
                if (raw) { try { store = JSON.parse(raw); usedKey = k; break; } catch (e) {} }
            }
        }
        return { found: !!store, usedKey, state: store ? Object.keys(store.state || {}) : [] };
    });
    log('localStorage store:', JSON.stringify(skillsInjected));

    // 不 reload — 直接 hook 进 React 然后调 setShowPlatformGame 是更稳的方案
    // 但更简单的: 给 MainScene 注入双跳技能检查绕过的方法 / 直接调用 interactWithStation('campaign')

    // 实际方案: React 的 useGameStore 是 zustand,可以通过 store.setState 修改
    // 直接查 MainScene 里的 requiredSkills 校验逻辑
    const stationCheck = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        const ms = g.scene.keys.MainScene;
        const stations = ms.stations || [];
        return {
            ids: stations.map(s => ({ id: s.id, req: s.requiredSkills, x: s.x, y: s.y })),
        };
    });
    log('stations:', JSON.stringify(stationCheck.ids));

    // 尝试通过 global window event 触发 interact
    // 看 interactWithStation 怎么实现的
    const interactMethod = await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        const ms = g.scene.keys.MainScene;
        return {
            hasInteractWithStation: typeof ms.interactWithStation === 'function',
            keys: Object.keys(ms).filter(k => /interact|station/i.test(k)).slice(0, 10),
        };
    });
    log('interact method:', JSON.stringify(interactMethod));

    // 滚动到 campaign + 触发交互
    await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        const ms = g.scene.keys.MainScene;
        const camp = ms.stations.find(s => s.id === 'campaign');
        if (camp) {
            ms.cameras.main.scrollX = Math.max(0, camp.x - 400);
            ms.cameras.main.scrollY = Math.max(0, camp.y - 200);
            ms.cameras.main.setScroll(camp.x - 400, camp.y - 200);
            if (ms.player) { ms.player.x = camp.x - 50; ms.player.y = camp.y + 20; }
        }
    });
    await page.waitForTimeout(500);

    // 模拟按 E 键触发交互
    await page.keyboard.press('e');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-after-E-press.png') });

    // 检查 __platformPhaserGame
    let platformGameFound = false;
    for (let i = 0; i < 30; i++) {
        const found = await page.evaluate(() => !!window.__platformPhaserGame);
        if (found) { platformGameFound = true; log('__platformPhaserGame appeared at attempt ' + i); break; }
        await page.waitForTimeout(500);
    }

    if (!platformGameFound) {
        log('__platformPhaserGame never appeared. Trying direct invoke...');
        // 找 React fiber 强制调用 setShowPlatformGame
        await page.evaluate(() => {
            const root = document.querySelector('main, body, #__next, [data-reactroot]');
            // 查找包含 PlatformGame 的 fiber
            function findFiber(node) {
                if (!node) return null;
                const key = Object.keys(node).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
                return key ? node[key] : null;
            }
            function walk(fiber, depth) {
                if (!fiber || depth > 50) return null;
                // 检查这个 fiber 是否含 setShowPlatformGame
                if (fiber.memoizedState) {
                    let s = fiber.memoizedState;
                    while (s) {
                        if (s.memoizedState && typeof s.memoizedState === 'object' && 'showPlatformGame' in s.memoizedState) {
                            // 找到 setState
                            if (s.queue && s.queue.dispatch) {
                                s.queue.dispatch(true);
                                return true;
                            }
                        }
                        s = s.next;
                    }
                }
                if (fiber.child) {
                    if (walk(fiber.child, depth + 1)) return true;
                }
                if (fiber.sibling) {
                    if (walk(fiber.sibling, depth + 1)) return true;
                }
                return false;
            }
            const fiber = findFiber(root);
            if (fiber) walk(fiber, 0);
        });
        await page.waitForTimeout(3000);
        for (let i = 0; i < 10; i++) {
            const found = await page.evaluate(() => !!window.__platformPhaserGame);
            if (found) { platformGameFound = true; log('appeared after fiber hack'); break; }
            await page.waitForTimeout(500);
        }
    }

    if (!platformGameFound) {
        log('STILL no PlatformGame. Inspecting DOM...');
        const html = await page.content();
        fs.writeFileSync(path.join(OUT_DIR, 'final-dom.html'), html);
        await page.screenshot({ path: path.join(OUT_DIR, '03-no-platform.png') });
        log('dom dumped');
    } else {
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(OUT_DIR, '03-platform-loaded.png') });

        // 现在 PlatformGameScene 应该激活,检查 boss
        const bossSpriteCheck = await page.evaluate(() => {
            const g = window.__platformPhaserGame;
            if (!g) return { ok: false, reason: 'no platform game' };
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
                sceneKey,
                enemyCount: enemies.length,
                bossCount: bosses.length,
                currentLevel: scene.levelData ? (scene.levelData.id || scene.levelData.campaignId) : 'unknown',
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
            };
        });
        log('boss sprite check:');
        log(JSON.stringify(bossSpriteCheck, null, 2));
        fs.writeFileSync(path.join(OUT_DIR, 'boss-sprite-check.json'), JSON.stringify(bossSpriteCheck, null, 2));

        // 检查所有 texture 加载情况
        const texCheck = await page.evaluate(() => {
            const g = window.__platformPhaserGame;
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
                return { id, key, exists: tex.exists(key) };
            });
            return { total: items.length, loaded: items.filter(i => i.exists).length };
        });
        log('texture check:', JSON.stringify(texCheck));

        // 如果有 boss 精灵,测试 phase 2/3 tween 是否会爆屏
        if (bossSpriteCheck.bossCount > 0) {
            log('--- phase tween simulation ---');
            const phaseTest = await page.evaluate(() => {
                const g = window.__platformPhaserGame;
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
                b.setScale(baseScale * 1.1, baseScale * 1.1);
                const phase2W = b.displayWidth;
                b.setScale(baseScale * 1.5, baseScale * 1.5);
                const phase3W = b.displayWidth;
                b.setScale(baseScale, baseScale);

                return {
                    ok: true,
                    baseScale,
                    beforeW,
                    phase2W,
                    phase3W,
                    canvasW: scene.cameras.main.width,
                };
            });
            log('phase tween test:', JSON.stringify(phaseTest, null, 2));
        }
    }

    log('--- summary ---');
    log('Page errors:', pageErrs.length);
    pageErrs.slice(0, 5).forEach(e => log('  ERR:', e));
    fs.writeFileSync(path.join(OUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));

    await browser.close();
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
