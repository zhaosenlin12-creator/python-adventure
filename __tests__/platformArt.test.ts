import {
  getPlatformArtPack,
  getPlatformCampaignThemeId,
  getPlatformShellTheme,
} from '@/lib/platformArt';
import { ASSET_BUNDLES } from '@/lib/utils/assetPreloader';

describe('platformArt', () => {
  test('maps campaign level ids to advanced campaign themes', () => {
    expect(getPlatformCampaignThemeId('level_12_3')).toBe('campaign_12');
    expect(getPlatformCampaignThemeId('campaign_12')).toBe('campaign_12');
    expect(getPlatformCampaignThemeId('level_15_1')).toBe('campaign_15');
    expect(getPlatformCampaignThemeId('custom_level_1')).toBe('default');
  });

  test('returns campaign_12 art pack with real asset paths', () => {
    const pack = getPlatformArtPack('campaign_12');
    expect(pack.player.texture).toBe('/assets/campaign-platform/characters/hero-maple-student.svg');
    expect(pack.goal.texture).toBe('/assets/campaign-platform/items/goal-flower-flag.svg');
    expect(pack.background.layers).toContain('/assets/campaign-platform/backgrounds/campaign12-sky.svg');
  });

  test('returns shell theme tokens for campaign selection and HUD styling', () => {
    const theme = getPlatformShellTheme('campaign_12');
    expect(theme.chromeClassName).toContain('emerald');
    expect(theme.panelClassName).toContain('sky');
  });

  test('registers a platform campaign preload bundle', () => {
    expect(ASSET_BUNDLES.platformCampaignBase).toBeDefined();
    expect(ASSET_BUNDLES.platformCampaignBase.some((asset) => asset.key === 'platform-player')).toBe(true);
  });

  test('all advanced platform themes provide shell token classes', () => {
    for (const themeId of ['campaign_12', 'campaign_13', 'campaign_14', 'campaign_15', 'campaign_16'] as const) {
      const theme = getPlatformShellTheme(themeId);
      expect(theme.chromeClassName.length).toBeGreaterThan(0);
      expect(theme.panelClassName.length).toBeGreaterThan(0);
      expect(theme.accentClassName.length).toBeGreaterThan(0);
    }
  });
});
