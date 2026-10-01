import { getBossPortraitIdsForLevel } from '@/components/world/scenes/bossPortraits';

describe('boss portrait loading plan', () => {
    it('loads only the current campaign portrait by default', () => {
        expect(getBossPortraitIdsForLevel({ id: 'level_4_1' })).toEqual(['campaign_4']);
    });

    it('loads campaign 10 triple-boss portraits without loading other campaigns', () => {
        expect(getBossPortraitIdsForLevel({
            id: 'level_10_5',
            campaignMapData: {
                bossConfig: {
                    mode: 'triple_boss_arena',
                    boss1: { id: 'ticket_master' },
                    boss2: { id: 'platform_master' },
                    boss3: { id: 'conductor' },
                },
            },
        })).toEqual([
            'campaign_10',
            'campaign_10_ticket_master',
            'campaign_10_platform_master',
            'campaign_10_conductor',
        ]);
    });

    it('keeps custom-level fallbacks available while loading custom variants', () => {
        expect(getBossPortraitIdsForLevel({
            id: 'custom-lab',
            isCustomLevel: true,
            bossConfig: { visualTheme: 'variant_b' },
        })).toEqual(['campaign_3', 'custom_default', 'custom_variant_b']);
    });
});
