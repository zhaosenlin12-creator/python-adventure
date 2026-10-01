// 真实子弹打 boss 端到端测试: 验证 HP 真的减少,phase 真的转换
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

    // 1) 测前 boss 状态
    const before = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        return {
            bossHP: scene.bossHP,
            bossMaxHP: scene.bossMaxHP,
            bossPhase: scene.bossPhase,
            bossDisplayW: boss && boss.displayWidth,
            bossDisplayH: boss && boss.displayHeight,
            bossBodyW: boss && boss.body && boss.body.width,
            bossX: boss && boss.x,
            bossY: boss && boss.y,
            playerX: scene.player && scene.player.x,
            playerY: scene.player && scene.player.y,
        };
    });
    console.log('BEFORE:', JSON.stringify(before, null, 2));

    // 2) 把玩家移到 boss 同一水平线,然后调用 performAttack() 多次
    const attackResult = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss || !scene.player) return { ok: false };

        // 把玩家放到 boss 左侧 100px
        scene.player.x = boss.x - 100;
        scene.player.y = boss.y;
        scene.player.flipX = false; // 朝右
        if (scene.player.body) scene.player.body.velocity.x = 0;

        const before = { hp: scene.bossHP, phase: scene.bossPhase };

        // 触发 5 次攻击 (每次间隔需要冷却)
        // 直接调用 performAttack() 多次,跳过键盘检测
        // 但每次之间需要等冷却 300ms
        return new Promise((resolve) => {
            const shots = [];
            let i = 0;
            const total = 5;
            const fireOne = () => {
                if (i >= total) {
                    const after = { hp: scene.bossHP, phase: scene.bossPhase };
                    resolve({ ok: true, before, after, shots });
                    return;
                }
                scene.performAttack();
                shots.push({ i, bulletsAfterFire: scene.bullets.getChildren().length });
                i++;
                setTimeout(fireOne, 400);
            };
            fireOne();
        });
    });
    console.log('ATTACK RESULT:', JSON.stringify(attackResult, null, 2));

    // 3) 等待子弹命中 boss,检查 HP 变化
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        return {
            bossHP: scene.bossHP,
            bossMaxHP: scene.bossMaxHP,
            bossPhase: scene.bossPhase,
            bossActive: boss && boss.active,
            bossDisplayW: boss && boss.displayWidth,
            bossBodyW: boss && boss.body && boss.body.width,
            bossY: boss && boss.y,
            bulletsCount: scene.bullets.getChildren().length,
            enemiesAlive: scene.enemies.getChildren().filter(e => e.active).length,
        };
    });
    console.log('AFTER (after bullet fly time):', JSON.stringify(after, null, 2));

    // 4) 强制把 HP 打到 phase 2 边界,看 boss 缩放是否合理
    const phase2Test = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };

        const before = {
            displayW: boss.displayWidth,
            bodyW: boss.body && boss.body.width,
            scaleX: boss.scaleX,
            baseScaleX: boss.baseScaleX,
            hp: scene.bossHP,
            phase: scene.bossPhase,
        };

        // 模拟 HP 低于 0.66 → 触发 phase 2
        scene.bossHP = Math.floor(scene.bossMaxHP * 0.6);
        if (scene.enterBossPhase2) {
            scene.enterBossPhase2();
        }

        const after = {
            displayW: boss.displayWidth,
            bodyW: boss.body && boss.body.width,
            scaleX: boss.scaleX,
            baseScaleX: boss.baseScaleX,
            hp: scene.bossHP,
            phase: scene.bossPhase,
        };

        return { before, after, canvasW: scene.cameras.main.width };
    });
    console.log('PHASE 2 TRANSITION TEST:', JSON.stringify(phase2Test, null, 2));

    // 5) 强制 phase 3
    const phase3Test = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };

        const before = { displayW: boss.displayWidth, bodyW: boss.body && boss.body.width, hp: scene.bossHP };

        scene.bossHP = Math.floor(scene.bossMaxHP * 0.3);
        if (scene.enterBossPhase3) {
            scene.enterBossPhase3();
        }

        const after = { displayW: boss.displayWidth, bodyW: boss.body && boss.body.width, hp: scene.bossHP };
        return { before, after, canvasW: scene.cameras.main.width };
    });
    console.log('PHASE 3 TRANSITION TEST:', JSON.stringify(phase3Test, null, 2));

    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v12-result.json', JSON.stringify({ before, attackResult, after, phase2Test, phase3Test }, null, 2));
    fs.writeFileSync('C:/Users/Administrator/AppData/Local/Temp/boss_qa/v12-logs.txt', logs.join('\n'));
    await page.screenshot({ path: 'C:/Users/Administrator/AppData/Local/Temp/boss_qa/v12-final.png' });

    await browser.close();
})();
