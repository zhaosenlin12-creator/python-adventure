const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => { const t = m.text(); if (/Platform|campaign|Boss|error|level|age|Phaser|hero|main|level|select|渲染|preload/i.test(t)) logs.push('[' + m.type() + '] ' + t); });
    page.on('pageerror', e => logs.push('[ERROR] ' + String(e)));

    await page.goto('http://127.0.0.1:3000/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 注入技能 + 解锁所有 campaign_1 关卡
    await page.evaluate(() => {
        const key = 'game-storage';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        existing.state = existing.state || {};
        existing.state.skills = ['double_jump', 'glide'];
        existing.state.completedLevels = existing.state.completedLevels || [];
        // 解锁 campaign_1 所有前置
        for (const id of ['level_1_1', 'level_1_2', 'level_1_3', 'level_1_4']) {
            if (!existing.state.completedLevels.includes(id)) existing.state.completedLevels.push(id);
        }
        localStorage.setItem(key, JSON.stringify(existing));
        console.log('[inject] skills=' + JSON.stringify(existing.state.skills));
        console.log('[inject] completedLevels=' + JSON.stringify(existing.state.completedLevels));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 进 campaign
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

    // 点低年级组
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const low = btns.find(b => b.textContent.includes('低年级组'));
        if (low) low.click();
    });
    await page.waitForTimeout(2000);

    // 点 campaign_1
    await page.evaluate(() => {
        const el = document.querySelector('[data-campaign-id="campaign_1"]');
        if (el) el.click();
    });
    await page.waitForTimeout(2000);

    // 点 level_1_5 (boss)
    const beforeClick = await page.evaluate(() => !!window.__platformPhaserGame);
    await page.evaluate(() => {
        const el = document.querySelector('[data-level-id="level_1_5"]');
        if (el) {
            console.log('[click] level_1_5 classes:', el.className);
            el.click();
        }
    });
    await page.waitForTimeout(7000);

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
                visualEqualsBody: Math.abs(visRect.width - bodyRect.w) < 5 && Math.abs(visRect.height - bodyRect.h) < 5,
            };
        }

        // texture cache check
        const tex = g.textures;
        const expected = [
            'campaign_1','campaign_2','campaign_3','campaign_4','campaign_5','campaign_6',
            'campaign_7','campaign_8','campaign_9','campaign_10','campaign_11','campaign_12',
            'campaign_13','campaign_14','campaign_15','campaign_16',
            'campaign_7_variant_b','campaign_8_variant_b','campaign_9_variant_b',
            'campaign_10_ticket_master','campaign_10_platform_master','campaign_10_conductor',
        ];
        const texLoaded = expected.filter(id => tex.exists('bossPortrait_' + id)).length;

        return {
            exists: true,
            sceneKey: sceneKey,
            currentLevelId: scene.levelData && scene.levelData.id,
            campaignId: scene.campaignId,
            enemiesCount: enemies.length,
            bossesCount: bosses.length,
            textureLoaded: texLoaded + '/' + expected.length,
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
    console.log('=== PLATFORM STATE ===');
    console.log(JSON.stringify(platformState, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v9-state.json', JSON.stringify(platformState, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v9-logs.txt', logs.join('\n'));

    await page.screenshot({ path: 'C:/Users/Administrator/AppData/Local/Temp/boss_qa/v9-final.png' });
    await browser.close();
})();
