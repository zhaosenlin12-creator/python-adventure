// 验证 headless 模式下 Phaser 物理是否在跑
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-software-rasterizer'] });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => { const t = m.text(); if (!t.includes('WebGL') && !t.includes('font') && !t.includes('Default')) logs.push('[' + m.type() + '] ' + t); });
    page.on('pageerror', e => logs.push('[ERROR] ' + String(e)));

    await page.goto('http://127.0.0.1:3000/world', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
        const key = 'game-storage';
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        existing.state = existing.state || {};
        existing.state.skills = ['double_jump', 'glide'];
        existing.state.selectedAgeGroup = 'primary-lower';
        existing.state.ageGroupCampaignProgress = { 'primary-lower': { completed: [], levels: ['level_1_1','level_1_2','level_1_3','level_1_4'] } };
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
    await page.evaluate(() => { const el = document.querySelector('[data-campaign-id="campaign_1"]'); if (el) el.click(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const el = document.querySelector('[data-level-id="level_1_5"]'); if (el) el.click(); });
    await page.waitForTimeout(7000);
    await page.evaluate(() => {
        const scene = window.__platformPhaserGame?.scene?.keys?.PlatformGameScene;
        const startButton = scene?.children?.list?.find((item) => item?.text === '开始挑战');
        if (startButton) startButton.emit('pointerdown');
    });
    await page.waitForTimeout(250);

    // 检查 Phaser 是否在 loop
    const loopCheck = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        // 记录 100ms 内 frame 数
        let frames = 0;
        const onStep = () => frames++;
        scene.events.on('postupdate', onStep);
        await new Promise(r => setTimeout(r, 500));
        scene.events.off('postupdate', onStep);
        return { framesIn500ms: frames, sceneActive: scene.scene.isActive(), gameLoopRunning: g.loop && g.loop.running };
    });
    console.log('Phaser loop check:', JSON.stringify(loopCheck, null, 2));

    // 现在创建一颗子弹并强制推进 physics step
    const stepTest = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');

        scene.bullets.clear(true, true);
        const bullet = scene.bullets.create(boss.x - 80, boss.y, '');
        bullet.setDisplaySize(16, 16);
        bullet.setCircle(8);
        const bt = bullet.body;
        const bsyncT = bt.transform;
        if (bsyncT) {
            bsyncT.x = bullet.x; bsyncT.y = bullet.y;
            bsyncT.scaleX = 1; bsyncT.scaleY = 1;
            bsyncT.displayOriginX = 8; bsyncT.displayOriginY = 8;
            bt.position.x = bullet.x - 8;
            bt.position.y = bullet.y - 8;
        }

        // 强制 setVelocity
        bt.velocity.x = 400;
        bt.velocity.y = 0;

        const before = { x: bullet.x, bodyX: bt.x, bodyVx: bt.velocity.x };
        // 等几秒看是否移动
        await new Promise(r => setTimeout(r, 500));
        const after500 = { x: bullet.x, bodyX: bt.x, bodyVx: bt.velocity.x };

        await new Promise(r => setTimeout(r, 1000));
        const after1500 = { x: bullet.x, bodyX: bt.x, bodyVx: bt.velocity.x };

        // 手动调用 scene.update 或 physics.world.step
        if (g.physics && g.physics.world) {
            g.physics.world.update(16, 100);
        }
        const afterStep = { x: bullet.x, bodyX: bt.x, bodyVx: bt.velocity.x };

        return {
            before, after500, after1500, afterStep,
            worldPaused: g.physics && g.physics.world && g.physics.world.isPaused,
        };
    });
    console.log('Step test:', JSON.stringify(stepTest, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v20-result.json', JSON.stringify({ loopCheck, stepTest }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v20-logs.txt', logs.join('\n'));

    await browser.close();
})();
