// 深度调试: 子弹没打中 boss 的原因
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
        existing.state.ageGroupCampaignProgress = {
            'primary-lower': { completed: [], levels: ['level_1_1','level_1_2','level_1_3','level_1_4'] },
        };
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

    // 1) 检查 boss body 详细状态
    const bodyInspect = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };
        const body = boss.body;
        return {
            bossX: boss.x, bossY: boss.y,
            spriteDisplayW: boss.displayWidth, spriteDisplayH: boss.displayHeight,
            spriteOriginX: boss.originX, spriteOriginY: boss.originY,
            spriteDisplayOriginX: boss.displayOriginX, spriteDisplayOriginY: boss.displayOriginY,
            bodyX: body.x, bodyY: body.y,
            bodyW: body.width, bodyH: body.height,
            bodySourceW: body.sourceWidth, bodySourceH: body.sourceHeight,
            bodyOffsetX: body.offset.x, bodyOffsetY: body.offset.y,
            body_sx: body._sx, body_sy: body._sy,
            bodyCenterX: body.center.x, bodyCenterY: body.center.y,
            bodyIsCircle: body.isCircle,
            bodyEnable: body.enable,
            bodyAllowGravity: body.allowGravity,
            bodyImmovable: body.immovable,
            bodyMoves: body.moves,
        };
    });
    console.log('BOSS BODY INSPECT:');
    console.log(JSON.stringify(bodyInspect, null, 2));

    // 2) 检查子弹 group
    const bulletsInfo = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        return {
            bulletsCount: scene.bullets.getChildren().length,
            enemiesCount: scene.enemies.getChildren().length,
            bulletsGroupExists: !!scene.bullets,
            enemiesGroupExists: !!scene.enemies,
        };
    });
    console.log('BULLETS/ENEMIES GROUPS:', JSON.stringify(bulletsInfo, null, 2));

    // 3) 手动创建一颗子弹,放在 boss 体内,看 bulletHitEnemy 是否触发
    const manualBulletTest = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false, reason: 'no boss' };

        // 钩住 bulletHitEnemy 看是否触发
        const origHandler = scene.bulletHitEnemy.bind(scene);
        let hitCount = 0;
        scene.bulletHitEnemy = function(bullet, enemy) {
            hitCount++;
            console.log('[HOOK] bulletHitEnemy called, hit #' + hitCount + ' enemyType=' + enemy.enemyType);
            return origHandler(bullet, enemy);
        };

        // 重新注册 overlap 用新 handler
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 用 performAttack 发射子弹,但 boss 离得很近
        // 把玩家放在 boss 旁边
        scene.player.x = boss.x - 80;
        scene.player.y = boss.y;
        scene.player.flipX = false;

        const beforeHP = scene.bossHP;

        // 直接调用 performAttack 让子弹朝向 boss
        scene.performAttack();

        // 等子弹飞向 boss
        await new Promise(r => setTimeout(r, 800));

        // 检查
        const bullets = scene.bullets.getChildren();
        const bulletInfo = bullets.map(b => ({
            x: b.x, y: b.y,
            active: b.active,
            hasHit: b.hasHit,
            bodyW: b.body && b.body.width,
            bodyX: b.body && b.body.x,
        }));

        return {
            beforeHP,
            afterHP: scene.bossHP,
            hitCount,
            bossX: boss.x,
            bossY: boss.y,
            playerX: scene.player.x,
            bulletsCount: bullets.length,
            bulletInfo,
        };
    });
    console.log('MANUAL BULLET TEST:');
    console.log(JSON.stringify(manualBulletTest, null, 2));

    // 4) 检查 bulletHitEnemy 函数和 overlap 注册情况
    const overlapCheck = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        return {
            hasBulletHitEnemy: typeof scene.bulletHitEnemy === 'function',
            // 列 scene.physics.world.colliders 的 overlap
            colliders: scene.physics.world.colliders.entries ? scene.physics.world.colliders.entries.map(c => ({
                object1: c.object1 && (c.object1.name || 'unknown'),
                object2: c.object2 && (c.object2.name || 'unknown'),
                overlapOnly: c.overlapOnly,
                name: c.name,
            })) : 'no entries',
        };
    });
    console.log('OVERLAP CHECK:', JSON.stringify(overlapCheck, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v13-result.json', JSON.stringify({ bodyInspect, bulletsInfo, manualBulletTest, overlapCheck }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v13-logs.txt', logs.join('\n'));

    await browser.close();
})();
