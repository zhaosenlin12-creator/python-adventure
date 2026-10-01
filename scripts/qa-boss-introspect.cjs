const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
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
    await page.evaluate(() => { const el = document.querySelector('[data-campaign-id=\"campaign_1\"]'); if (el) el.click(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const el = document.querySelector('[data-level-id=\"level_1_5\"]'); if (el) el.click(); });
    await page.waitForTimeout(7000);

    const info = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return { ok: false };
        // 列所有非内部属性的字段
        const allKeys = Object.keys(boss);
        const dataFields = allKeys.filter(k => /health|hp|max|phase|life|dead|alive|enemy/i.test(k));
        const ownProps = {};
        for (const k of allKeys) {
            if (k.startsWith('_') || k === 'scene' || k === 'anims' || k === 'body' || k === 'texture' || k === 'frame') continue;
            try {
                const v = boss[k];
                if (typeof v === 'function') continue;
                if (v === null || v === undefined) continue;
                if (typeof v === 'object' && !Array.isArray(v)) {
                    ownProps[k] = '[object]';
                } else {
                    ownProps[k] = v;
                }
            } catch (e) {}
        }
        // 也查 enemyData
        return {
            bossX: boss.x,
            bossY: boss.y,
            dataFields,
            ownProps,
        };
    });
    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})();
