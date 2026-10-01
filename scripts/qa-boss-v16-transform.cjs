const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({});
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
    await page.evaluate(() => { const el = document.querySelector('[data-campaign-id="campaign_1"]'); if (el) el.click(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const el = document.querySelector('[data-level-id="level_1_5"]'); if (el) el.click(); });
    await page.waitForTimeout(7000);

    const info = await page.evaluate(() => {
        const g = window.__platformPhaserGame;
        const scene = g.scene.keys.PlatformGameScene;
        const boss = (scene.enemies.getChildren() || []).find(e => e.enemyType === 'boss');
        if (!boss) return null;

        // 找 transform
        const t = boss.transform || {};
        const body = boss.body;
        const expectedX = (t.x || boss.x) + (t.scaleX || boss.scaleX) * ((body.offset ? body.offset.x : 0) - (t.displayOriginX || boss.displayOriginX));

        // 列出所有 boss 上 _ 开头的私有属性(Phaser transform 通常在那里)
        const underscoreKeys = Object.keys(boss).filter(k => k.startsWith('_'));

        return {
            sprite_x: boss.x,
            sprite_scaleX: boss.scaleX,
            sprite_displayOriginX: boss.displayOriginX,
            sprite_originX: boss.originX,
            sprite_frame_realWidth: boss.frame && boss.frame.realWidth,
            transform_keys: Object.keys(t),
            transform_x: t.x,
            transform_scaleX: t.scaleX,
            transform_displayOriginX: t.displayOriginX,
            body_x: body.x,
            body_width: body.width,
            body_halfWidth: body.halfWidth,
            body_offset_x: body.offset.x,
            body_center_x: body.center.x,
            expected_body_x_via_transform: expectedX,
            underscoreKeys_count: underscoreKeys.length,
            _scaleX: boss._scaleX,
        };
    });
    console.log(JSON.stringify(info, null, 2));

    await browser.close();
})();
