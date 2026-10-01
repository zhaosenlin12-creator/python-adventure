// 验证 overlap 系统是否真的工作
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

    // 把 boss 直接移到玩家附近,确保重叠
    const directOverlap = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        const player = scene.player;
        if (!boss || !player) return { ok: false };

        // 把 boss 移到 player 位置(强制重叠)
        boss.x = player.x + 20;
        boss.y = player.y;
        boss.body.x = boss.x - boss.body.halfWidth;
        boss.body.y = boss.y - boss.body.halfHeight;

        const bossRect = new Phaser.Geom.Rectangle(boss.body.x, boss.body.y, boss.body.width, boss.body.height);
        const playerRect = new Phaser.Geom.Rectangle(player.body.x, player.body.y, player.body.width, player.body.height);
        const overlapCheck = Phaser.Geom.Rectangle.Overlaps(bossRect, playerRect);

        // 等一帧
        await new Promise(r => setTimeout(r, 100));

        // 检查 overlap 系统是否触发
        const beforeHP = scene.bossHP;

        // 直接调用 scene.physics.overlap() 看是否检测
        const phaserOverlap = scene.physics.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        return {
            bossBody: { x: boss.body.x, y: boss.body.y, w: boss.body.width, h: boss.body.height },
            playerBody: { x: player.body.x, y: player.body.y, w: player.body.width, h: player.body.height },
            bodyOverlap: overlapCheck,
            phaserOverlapReturned: phaserOverlap,
            bossHP: scene.bossHP,
            beforeHP,
        };
    });
    console.log('DIRECT OVERLAP TEST:');
    console.log(JSON.stringify(directOverlap, null, 2));

    // 钩 bulletHitEnemy 看是否触发
    const hitTrace = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;

        // 替换 bulletHitEnemy 添加日志
        const orig = scene.bulletHitEnemy.bind(scene);
        let bulletEnemyHits = 0;
        let lastHitEnemy = null;
        scene.bulletHitEnemy = function(bullet, enemy) {
            bulletEnemyHits++;
            lastHitEnemy = { enemyType: enemy.enemyType, x: enemy.x, y: enemy.y };
            console.log('[HOOK] bulletHitEnemy hit #' + bulletEnemyHits + ' enemyType=' + enemy.enemyType);
            return orig(bullet, enemy);
        };
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 把玩家移到 boss 旁边
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        scene.player.x = boss.x - 80;
        scene.player.y = boss.y;
        scene.player.flipX = false;

        const beforeHP = scene.bossHP;

        // 触发 1 次攻击
        scene.performAttack();

        // 等子弹命中
        await new Promise(r => setTimeout(r, 500));

        // 检查子弹是否还活着
        const bullets = scene.bullets.getChildren();
        const bulletStates = bullets.map(b => ({
            x: b.x, y: b.y,
            active: b.active,
            bodyVx: b.body && b.body.velocity.x,
            bodyX: b.body && b.body.x,
            hasHit: b.hasHit,
        }));

        return {
            beforeHP,
            afterHP: scene.bossHP,
            bulletEnemyHits,
            lastHitEnemy,
            bulletsCount: bullets.length,
            bulletStates,
        };
    });
    console.log('HIT TRACE TEST:');
    console.log(JSON.stringify(hitTrace, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v14-result.json', JSON.stringify({ directOverlap, hitTrace }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v14-logs.txt', logs.join('\n'));

    await browser.close();
})();
