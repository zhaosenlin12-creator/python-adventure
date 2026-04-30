import { advancedCampaigns } from '@/lib/campaigns-advanced';

const DOOR_CAMPAIGN_IDS = new Set([
  'campaign_11',
  'campaign_12',
  'campaign_13',
  'campaign_14',
  'campaign_15',
  'campaign_16',
]);

const SUPPORTED_BOSS_ATTACKS = new Set([
  'acid_pool',
  'acid_spray',
  'poison_cloud',
  'gas_burst',
  'projectile',
  'projectile_spread',
  'summon',
]);

const mechanicCount = (mapData: any) =>
  [
    mapData.portals,
    mapData.windZones,
    mapData.gravityZones,
    mapData.chemicalZones,
    mapData.explosionTraps,
    mapData.autoMovingPlatforms,
    mapData.traps?.filter((trap: any) =>
      ['gear_chaser', 'expanding_hazard', 'moving_spike'].includes(trap.type),
    ),
  ].filter((items) => Array.isArray(items) && items.length > 0).length;

describe('campaign 11-16 enterprise polish', () => {
  const doorCampaigns = advancedCampaigns.filter((campaign) => DOOR_CAMPAIGN_IDS.has(campaign.id));

  it('loads the full polished campaign arc', () => {
    expect(doorCampaigns.map((campaign) => campaign.id)).toEqual([
      'campaign_11',
      'campaign_12',
      'campaign_13',
      'campaign_14',
      'campaign_15',
      'campaign_16',
    ]);

    for (const campaign of doorCampaigns) {
      expect((campaign as any).polishTier).toBe('enterprise-door-v2');
      expect((campaign as any).designPillars).toEqual(
        expect.arrayContaining(['clear_telegraphing', 'student_appeal', 'boss_mechanic_escalation']),
      );
      expect(campaign.levels).toHaveLength(5);
    }
  });

  it('adds readable mechanics, enemies, recovery, and rewards to every level', () => {
    for (const campaign of doorCampaigns) {
      for (const level of campaign.levels) {
        const mapData = level.campaignMapData as any;
        expect(mapData).toBeTruthy();
        expect(mapData.polishTier).toBe('enterprise-door-v2');
        expect(mechanicCount(mapData)).toBeGreaterThanOrEqual(3);
        expect(mapData.chemicalZones.filter((zone: any) => zone.polishId).length).toBeGreaterThanOrEqual(2);
        expect(mapData.traps.filter((trap: any) => trap.polishId).length).toBeGreaterThanOrEqual(2);
        expect(mapData.enemies.filter((enemy: any) => enemy.polishId).length).toBeGreaterThanOrEqual(2);
        expect(mapData.collectibles.filter((item: any) => item.polishId).length).toBeGreaterThanOrEqual(2);
        expect(level.questions.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps final dual-boss arenas auditable and supported by the Phaser skill runner', () => {
    for (const campaign of doorCampaigns) {
      const finalLevel = campaign.levels.at(-1)!;
      const mapData = finalLevel.campaignMapData as any;
      const bossConfig = finalLevel.bossConfig as any;

      expect(mapData.enemies.filter((enemy: any) => enemy.type === 'boss')).toHaveLength(2);
      expect(bossConfig.type).toBe('dual');
      expect(bossConfig.requireBothDefeated).toBe(true);
      expect(bossConfig.combinedAttack).toEqual(
        expect.objectContaining({
          triggerCondition: 'both_alive',
          telegraphMs: expect.any(Number),
        }),
      );
      expect(bossConfig.defeatReward).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          xp: expect.any(Number),
          coins: expect.any(Number),
        }),
      );

      for (const phase of [bossConfig.phase1Boss, bossConfig.phase2Boss]) {
        expect(phase.visualTheme).toEqual(expect.any(String));
        expect(phase.attacks.length).toBeGreaterThanOrEqual(3);
        for (const attack of phase.attacks) {
          expect(SUPPORTED_BOSS_ATTACKS.has(attack)).toBe(true);
        }
      }
    }
  });
});
