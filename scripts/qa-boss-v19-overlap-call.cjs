const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({});
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => { const t = m.text(); if (!t.includes('WebGL') && !t.includes('font')) logs.push('[' + m.type() + '] ' + t); });
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

    const result = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };

        const orig = scene.bulletHitEnemy.bind(scene);
        let hits = 0;
        scene.bulletHitEnemy = function(bullet, enemy) {
            hits++;
            return orig(bullet, enemy);
        };
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 清理旧子弹
        scene.bullets.clear(true, true);

        // 在 boss 中心创建子弹
        const bullet = scene.bullets.create(boss.x, boss.y, '');
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

        const PR = Phaser.Geom.Rectangle;
        const bossRect = new PR(boss.body.x, boss.body.y, boss.body.width, boss.body.height);
        const bulRect = new PR(bt.x, bt.y, bt.width, bt.height);
        const geoOverlap = PR.Overlaps(bossRect, bulRect);

        const beforeHP = scene.bossHP;

        const overlapCalled = scene.physics.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        await new Promise(r => setTimeout(r, 50));

        return {
            bossRect: { x: bossRect.x, y: bossRect.y, w: bossRect.width, h: bossRect.height },
            bulletRect: { x: bulRect.x, y: bulRect.y, w: bulRect.width, h: bulRect.height },
            geoOverlap,
            overlapCalled,
            beforeHP,
            afterHP: scene.bossHP,
            hits,
        };
    });
    console.log(JSON.stringify(result, null, 2));

    const attackResult = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };

        scene.bullets.clear(true, true);
        scene.player.x = boss.x - 80;
        scene.player.y = boss.y;
        scene.player.flipX = false;
        if (scene.player.body) scene.player.body.velocity.x = 0;

        const beforeHP = scene.bossHP;
        scene.performAttack();

        const positions = [];
        for (let t = 0; t < 10; t++) {
            await new Promise(r => setTimeout(r, 100));
            const bullets = scene.bullets.getChildren().map(b => ({
                x: b.x, bodyX: b.body && b.body.x, bodyVx: b.body && b.body.velocity.x, active: b.active,
            }));
            positions.push({ t_ms: (t + 1) * 100, bullets });
        }

        return {
            bossX: boss.x, bossBodyX: boss.body.x, bossBodyRight: boss.body.x + boss.body.width,
            beforeHP,
            afterHP: scene.bossHP,
            positions,
        };
    });
    console.log('ATTACK OVER TIME:');
    console.log(JSON.stringify(attackResult, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v19-result.json', JSON.stringify({ result, attackResult }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v19-logs.txt', logs.join('\n'));

    await browser.close();
})();
