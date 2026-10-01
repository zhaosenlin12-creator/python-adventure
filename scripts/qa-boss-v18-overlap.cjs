// 终极调试: 把 bullet 强制放到 boss 体内,看 overlap 是否真的工作
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

    const directBullet = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };

        // 钩 handler
        const orig = scene.bulletHitEnemy.bind(scene);
        let hitCount = 0;
        let lastHitInfo = null;
        scene.bulletHitEnemy = function(bullet, enemy) {
            hitCount++;
            lastHitInfo = {
                enemyType: enemy.enemyType,
                enemyX: enemy.x,
                enemyY: enemy.y,
                bulletX: bullet.x,
                bulletY: bullet.y,
                enemyBodyX: enemy.body && enemy.body.x,
                enemyBodyY: enemy.body && enemy.body.y,
                bulletBodyX: bullet.body && bullet.body.x,
                bulletBodyY: bullet.body && bullet.body.y,
            };
            return orig(bullet, enemy);
        };

        // 关键: 重新注册 overlap 用我们的钩子
        scene.physics.add.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 立即调用手动 overlap 测试
        const beforeHP = scene.bossHP;

        // 直接创建一个 bullet 在 boss 体内
        const fakeBullet = scene.bullets.create(boss.x, boss.y, '');
        fakeBullet.setDisplaySize(16, 16);
        fakeBullet.setCircle(8);

        // 等一帧让 physics 处理
        await new Promise(r => setTimeout(r, 100));

        // 强制调用 scene.physics.overlap 看检测结果
        const overlapDetected = scene.physics.overlap(scene.bullets, scene.enemies, scene.bulletHitEnemy, undefined, scene);

        // 等一帧
        await new Promise(r => setTimeout(r, 100));

        return {
            ok: true,
            beforeHP,
            afterHP: scene.bossHP,
            hitCount,
            lastHitInfo,
            overlapDetected,
            bossBody: { x: boss.body.x, y: boss.body.y, w: boss.body.width, h: boss.body.height },
            bossSprite: { x: boss.x, y: boss.y, displayW: boss.displayWidth, displayH: boss.displayHeight },
            bulletsRemaining: scene.bullets.getChildren().length,
            enemiesCount: scene.enemies.getChildren().length,
        };
    });
    console.log('DIRECT BULLET TEST:');
    console.log(JSON.stringify(directBullet, null, 2));

    // 现在做完整的攻击测试: 玩家攻击,等子弹飞过去
    const realAttackTest = await page.evaluate(async () => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');

        // 把玩家放在 boss 紧邻的左边
        scene.player.x = boss.x - 50;
        scene.player.y = boss.y;
        scene.player.flipX = false;
        if (scene.player.body) {
            scene.player.body.velocity.x = 0;
            scene.player.body.velocity.y = 0;
        }

        const beforeHP = scene.bossHP;
        const beforeBossX = boss.x;

        // 触发一次攻击
        scene.performAttack();

        // 等子弹飞
        await new Promise(r => setTimeout(r, 500));

        const bullets = scene.bullets.getChildren().map(b => ({
            x: b.x, y: b.y,
            active: b.active,
            hasHit: b.hasHit,
            bodyX: b.body && b.body.x,
            bodyY: b.body && b.body.y,
            bodyVx: b.body && b.body.velocity.x,
        }));

        return {
            bossX: boss.x, bossBodyX: boss.body.x, bossBodyW: boss.body.width,
            playerX: scene.player.x,
            beforeHP,
            afterHP: scene.bossHP,
            bullets,
        };
    });
    console.log('REAL ATTACK TEST:');
    console.log(JSON.stringify(realAttackTest, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v18-result.json', JSON.stringify({ directBullet, realAttackTest }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v18-logs.txt', logs.join('\n'));

    await browser.close();
})();
