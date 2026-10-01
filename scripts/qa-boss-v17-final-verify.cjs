// 最终验证: 应用 transform 同步补丁后,boss body 位置和碰撞是否正确
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({});
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
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

    // 1) 关键测试: 子弹能否真正打到 boss
    const hitTest = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss || !scene.player) return { ok: false };

        // 检查 body 位置
        const bodyInspect = {
            spriteX: boss.x, spriteY: boss.y,
            bodyX: boss.body.x, bodyY: boss.body.y,
            bodyW: boss.body.width, bodyH: boss.body.height,
            bodyCenterX: boss.body.center.x, bodyCenterY: boss.body.center.y,
            transform_scaleX: boss.body.transform.scaleX,
            transform_displayOriginX: boss.body.transform.displayOriginX,
            diffSpriteBodyX: boss.x - boss.body.x,
            diffSpriteBodyY: boss.y - boss.body.y,
        };

        // 钩 handler 看是否触发
        const orig = scene.bulletHitEnemy.bind(scene);
        let bulletHits = 0;
        let lastHit = null;
        scene.bulletHitEnemy = function(bullet, enemy) {
            bulletHits++;
            lastHit = { enemyType: enemy.enemyType, x: enemy.x, y: enemy.y };
            return orig(bullet, enemy);
        };
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 玩家站到 boss 旁边,发射多颗子弹
        scene.player.x = boss.x - 100;
        scene.player.y = boss.y;
        scene.player.flipX = false;

        const beforeHP = scene.bossHP;

        // 触发 3 次攻击,每次间隔冷却 400ms
        for (let i = 0; i < 3; i++) {
            scene.performAttack();
            await new Promise(r => setTimeout(r, 400));
        }

        // 等子弹飞抵
        await new Promise(r => setTimeout(r, 600));

        return {
            ...bodyInspect,
            beforeHP,
            afterHP: scene.bossHP,
            bulletHits,
            lastHit,
            bulletsRemaining: scene.bullets.getChildren().length,
        };
    });
    console.log('FINAL HIT TEST (after transform sync fix):');
    console.log(JSON.stringify(hitTest, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v17-final.json', JSON.stringify(hitTest, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v17-logs.txt', logs.join('\n'));

    await browser.close();
})();
