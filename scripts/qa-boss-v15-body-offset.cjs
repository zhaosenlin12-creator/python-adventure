// 检查 body offset 问题
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
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

    // 检查每个敌人 (slime + boss) 的 body
    const allBodies = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const enemies = scene.enemies.getChildren();
        return enemies.map(e => {
            const b = e.body;
            return {
                texture: e.texture && e.texture.key,
                enemyType: e.enemyType,
                spriteX: e.x, spriteY: e.y,
                spriteDisplayW: e.displayWidth, spriteDisplayH: e.displayHeight,
                bodyX: b.x, bodyY: b.y, bodyW: b.width, bodyH: b.height,
                bodyOffsetX: b.offset && b.offset.x, bodyOffsetY: b.offset && b.offset.y,
                bodySourceW: b.sourceWidth,
                body_sx: b._sx,
                bodyCenterX: b.center.x, bodyCenterY: b.center.y,
                diffSpriteBodyX: e.x - b.x,
                diffSpriteBodyY: e.y - b.y,
            };
        });
    });
    console.log('ALL ENEMY BODIES:');
    console.log(JSON.stringify(allBodies, null, 2));

    // 检查玩家 body
    const playerBody = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const p = scene.player;
        const b = p.body;
        return {
            spriteX: p.x, spriteY: p.y,
            spriteDisplayW: p.displayWidth, spriteDisplayH: p.displayHeight,
            bodyX: b.x, bodyY: b.y, bodyW: b.width, bodyH: b.height,
            bodyOffsetX: b.offset && b.offset.x, bodyOffsetY: b.offset && b.offset.y,
            bodySourceW: b.sourceWidth,
            body_sx: b._sx,
            bodyCenterX: b.center.x, bodyCenterY: b.center.y,
            diffSpriteBodyX: p.x - b.x,
            diffSpriteBodyY: p.y - b.y,
        };
    });
    console.log('PLAYER BODY:');
    console.log(JSON.stringify(playerBody, null, 2));

    // 验证子弹能击中 slime (没被 AI 修复的)以对照
    const slimeCanBeHit = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;

        // 钩 handler
        const orig = scene.bulletHitEnemy.bind(scene);
        let hitSlime = 0, hitBoss = 0;
        scene.bulletHitEnemy = function(bullet, enemy) {
            if (enemy.enemyType === 'boss') hitBoss++;
            else hitSlime++;
            return orig(bullet, enemy);
        };
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 找 slime 敌人
        const enemies = scene.enemies.getChildren();
        const slime = enemies.find(e => e.enemyType !== 'boss');
        const boss = enemies.find(e => e.enemyType === 'boss');
        if (!slime) return { ok: false, reason: 'no slime' };

        // 把 player 移到 slime 旁边
        scene.player.x = slime.x - 80;
        scene.player.y = slime.y;
        scene.player.flipX = false;

        const beforeSlime = { hp: slime.health, active: slime.active };
        const beforeBossHP = scene.bossHP;

        scene.performAttack();
        await new Promise(r => setTimeout(r, 800));

        return {
            slime: { x: slime.x, y: slime.y, bodyW: slime.body.width, bodyX: slime.body.x },
            boss: { x: boss.x, y: boss.y, bodyW: boss.body.width, bodyX: boss.body.x },
            player: { x: scene.player.x, y: scene.player.y },
            beforeSlime,
            beforeBossHP,
            afterSlimeActive: slime.active,
            afterBossHP: scene.bossHP,
            hitSlime,
            hitBoss,
        };
    });
    console.log('SLIME HIT TEST:');
    console.log(JSON.stringify(slimeCanBeHit, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v15-result.json', JSON.stringify({ allBodies, playerBody, slimeCanBeHit }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v15-logs.txt', logs.join('\n'));

    await browser.close();
})();
