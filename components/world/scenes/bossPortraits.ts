import * as Phaser from 'phaser';

// Boss 立绘资源 ID 列表：默认主题(每战役一个 boss) + 双 boss 阶段二 + 战役 10 三人组。
// 与 `public/assets/bosses/<id>.png` 一一对应。
// PlatformGame.tsx 起 Phaser 时只把 PlatformGameScene 放进了 scene 数组，
// 因此战役场景需要在自己的 preload() 中登记这些资源。开放大厅不加载 Boss 立绘。
export const BOSS_PORTRAIT_IDS: readonly string[] = Object.freeze([
    // 默认主题（每个战役一个 boss）
    'campaign_1', 'campaign_2', 'campaign_3', 'campaign_4',
    'campaign_5', 'campaign_6', 'campaign_7', 'campaign_8',
    'campaign_9', 'campaign_10', 'campaign_11', 'campaign_12',
    'campaign_13', 'campaign_14', 'campaign_15', 'campaign_16',
    // 阶段二 boss（双 boss 关卡）
    'campaign_7_variant_b', 'campaign_8_variant_b', 'campaign_9_variant_b',
    // 最终 boss 三人组（campaign_10 异常洞）
    'campaign_10_ticket_master',
    'campaign_10_platform_master',
    'campaign_10_conductor',
    // 创意工坊默认立绘与两个阶段变体
    'custom_default',
    'custom_variant_b',
    'custom_variant_c',
]);

export const BOSS_PORTRAIT_PATH_PREFIX = '/assets/bosses/';

// 纹理键命名规则：
//   默认主题 → `bossPortrait_<campaignId>`
//   变体主题 → `bossPortrait_<campaignId>_<visualTheme>`
// 与 PlatformGameScene.createBossTexture() 的查找顺序保持一致。
export function bossPortraitKey(id: string): string {
    return `bossPortrait_${id}`;
}

function campaignIdFromLevel(level: any): string {
    if (level?.isCustomLevel || level?.isTestMode || String(level?.id || '').startsWith('custom')) {
        return 'custom';
    }

    const match = String(level?.id || '').match(/^level_(\d+)_/);
    return match ? `campaign_${match[1]}` : 'campaign_1';
}

export function getBossPortraitIdsForLevel(level: any): string[] {
    const campaignId = campaignIdFromLevel(level);
    const portraitIds = new Set<string>();
    const bossConfig = level?.campaignMapData?.bossConfig || level?.bossConfig;

    const addCandidate = (themeOrId: unknown) => {
        if (typeof themeOrId !== 'string' || !themeOrId || themeOrId === 'default') return;
        const candidate = campaignId === 'custom'
            ? `custom_${themeOrId}`
            : `${campaignId}_${themeOrId}`;
        if (BOSS_PORTRAIT_IDS.includes(candidate)) {
            portraitIds.add(candidate);
        }
    };

    const collectBossThemes = (config: any) => {
        if (!config || typeof config !== 'object') return;
        addCandidate(config.visualTheme);
        addCandidate(config.id);
        for (const key of ['phase1Boss', 'phase2Boss', 'secondBoss', 'boss1', 'boss2', 'boss3']) {
            collectBossThemes(config[key]);
        }
    };

    collectBossThemes(bossConfig);
    if (campaignId === 'custom') {
        portraitIds.add('custom_default');
        portraitIds.add('campaign_3');
    } else {
        portraitIds.add(campaignId);
    }

    return BOSS_PORTRAIT_IDS.filter((id) => portraitIds.has(id));
}

// 在指定战役场景的 LoaderPlugin 上登记所有 boss 立绘。
// 必须在 scene.preload() 里调用；调用之后 Phaser 会异步下载，
// scene.create() 触发时 `this.textures.exists('bossPortrait_<id>')` 返回 true。
export function loadBossPortraits(scene: Phaser.Scene): void {
    loadBossPortraitsForIds(scene, BOSS_PORTRAIT_IDS);
}

export function loadBossPortraitsForIds(scene: Phaser.Scene, ids: readonly string[]): void {
    const loader = scene.load;
    for (const id of ids) {
        loader.image(bossPortraitKey(id), `${BOSS_PORTRAIT_PATH_PREFIX}${id}.png`);
    }
}
