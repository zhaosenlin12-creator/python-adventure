const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => { const t = m.text(); if (/Platform|campaign|Boss|error|level|age|Phaser|main|hero/i.test(t)) logs.push('[' + m.type() + '] ' + t); });
    page.on('pageerror', e => logs.push('[ERROR] ' + String(e)));

    await page.goto('http://127.0.0.1:3000/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const key = 'game-storage';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        existing.state = existing.state || {};
        existing.state.skills = ['double_jump', 'glide'];
        localStorage.setItem(key, JSON.stringify(existing));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const g = window.__worldPhaserGame;
        const ms = g.scene.keys.MainScene;
        ms.playerSkills = ['double_jump', 'glide'];
        const camp = ms.stations.find(s => s.id === 'campaign');
        ms.cameras.main.setScroll(camp.x - 400, camp.y - 200);
        if (ms.player) { ms.player.x = camp.x - 50; ms.player.y = camp.y + 20; }
        ms.interactWithStation(camp);
    });

    await page.waitForTimeout(4000);

    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const low = btns.find(b => b.textContent.includes('低年级组'));
        if (low) low.click();
    });
    await page.waitForTimeout(2000);

    const campaigns = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-campaign-id]');
        return Array.from(items).map(b => ({
            id: b.getAttribute('data-campaign-id'),
            text: (b.textContent || '').trim().slice(0, 60),
        }));
    });
    console.log('Campaigns:', JSON.stringify(campaigns, null, 2));

    if (campaigns.length > 0) {
        await page.evaluate((id) => {
            const sel = '[data-campaign-id="' + id + '"]';
            const el = document.querySelector(sel);
            if (el) el.click();
        }, campaigns[0].id);
        await page.waitForTimeout(2000);

        const levels = await page.evaluate(() => {
            const items = document.querySelectorAll('[data-level-id]');
            return Array.from(items).map(b => ({
                id: b.getAttribute('data-level-id'),
                text: (b.textContent || '').trim().slice(0, 50),
            }));
        });
        console.log('Levels:', JSON.stringify(levels, null, 2));

        const bossLevel = levels.find(l => /_5$/.test(l.id)) || levels[levels.length - 1];
        if (bossLevel) {
            console.log('Clicking boss level:', bossLevel.id);
            await page.evaluate((id) => {
                const sel = '[data-level-id="' + id + '"]';
                const el = document.querySelector(sel);
                if (el) el.click();
            }, bossLevel.id);
            await page.waitForTimeout(6000);
        }
    }

    const platformState = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        if (!g) return { exists: false };
        const sceneKey = Object.keys(g.scene.keys).find(k => /Platform/i.test(k));
        const scene = sceneKey ? g.scene.keys[sceneKey] : null;
        if (!scene) return { exists: true, scenes: Object.keys(g.scene.keys) };
        const enemies = (scene.enemies && scene.enemies.getChildren) ? scene.enemies.getChildren() : [];
        const bosses = enemies.filter(e => {
            const t = e.texture && e.texture.key;
            return (t && t.startsWith('bossPortrait_')) || e.enemyType === 'boss';
        });

        let phaseTest = null;
        if (bosses.length > 0) {
            const b = bosses[0];
            const baseScale = b.baseScaleX || b.scaleX;
            const before = { w: b.displayWidth, bodyW: b.body && b.body.width };
            b.setScale(baseScale * 1.1, baseScale * 1.1);
            const p2 = { w: b.displayWidth, bodyW: b.body && b.body.width };
            b.setScale(baseScale * 1.5, baseScale * 1.5);
            const p3 = { w: b.displayWidth, bodyW: b.body && b.body.width };
            b.setScale(baseScale, baseScale);
            phaseTest = { baseScale: baseScale, before: before, phase2: p2, phase3: p3, canvasW: scene.cameras.main.width, canvasH: scene.cameras.main.height };
        }

        let hitTest = null;
        if (bosses.length > 0) {
            const b = bosses[0];
            const visRect = b.getBounds();
            const bodyRect = { x: b.body.x, y: b.body.y, w: b.body.width, h: b.body.height };
            const PR = Phaser.Geom.Rectangle;
            const fakeBullet = new PR(b.x - 15, b.y - 15, 30, 30);
            hitTest = {
                visualRect: { x: visRect.x, y: visRect.y, w: visRect.width, h: visRect.height },
                bodyRect: bodyRect,
                fakeBulletRect: { x: fakeBullet.x, y: fakeBullet.y, w: fakeBullet.width, h: fakeBullet.height },
                overlapsVisual: PR.Overlaps(new PR(visRect.x, visRect.y, visRect.width, visRect.height), fakeBullet),
                overlapsBody: PR.Overlaps(new PR(bodyRect.x, bodyRect.y, bodyRect.w, bodyRect.h), fakeBullet),
            };
        }

        return {
            exists: true,
            sceneKey: sceneKey,
            currentLevelId: scene.levelData && scene.levelData.id,
            campaignId: scene.campaignId,
            enemiesCount: enemies.length,
            bossesCount: bosses.length,
            bosses: bosses.map(b => ({
                texture: b.texture && b.texture.key,
                displayWidth: b.displayWidth,
                displayHeight: b.displayHeight,
                bodyW: b.body && b.body.width,
                bodyH: b.body && b.body.height,
                baseScaleX: b.baseScaleX,
                scaleX: b.scaleX,
                bodySourceW: b.body && b.body.sourceWidth,
                body_sx: b.body && b.body._sx,
                frameRealWidth: b.frame && b.frame.realWidth,
                x: b.x, y: b.y,
                health: b.health,
                maxHealth: b.maxHealth,
                enemyType: b.enemyType,
            })),
            phaseTest: phaseTest,
            hitTest: hitTest,
            allEnemyTextures: enemies.map(e => e.texture && e.texture.key).slice(0, 30),
        };
    });
    console.log('PLATFORM STATE:');
    console.log(JSON.stringify(platformState, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v8-state.json', JSON.stringify(platformState, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v8-logs.txt', logs.join('\n'));

    await page.screenshot({ path: 'C:/Users/Administrator/AppData/Local/Temp/boss_qa/v8-final.png' });
    await browser.close();
})();
