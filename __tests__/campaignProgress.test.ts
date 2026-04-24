import { resolveCompatibleCampaignProgress } from '@/lib/campaignProgress';

describe('resolveCompatibleCampaignProgress', () => {
  test('keeps legacy campaign progress visible for older players after age groups are enabled', () => {
    const resolved = resolveCompatibleCampaignProgress({
      activeAgeGroup: 'junior-high',
      ageProgress: undefined,
      completedCampaigns: ['campaign_1'],
      completedCampaignLevels: ['level_1_1'],
    });

    expect(resolved.completedCampaignIds).toEqual(['campaign_1']);
    expect(resolved.completedLevelIds).toEqual(['level_1_1']);
  });

  test('merges legacy progress with current age-group progress without leaking other age groups', () => {
    const resolved = resolveCompatibleCampaignProgress({
      activeAgeGroup: 'junior-high',
      ageProgress: {
        completed: ['campaign_3'],
        levels: ['level_3_1'],
      },
      completedCampaigns: [
        'campaign_1',
        'junior-high:campaign_2',
        'primary:campaign_9',
      ],
      completedCampaignLevels: [
        'level_1_1',
        'junior-high:level_2_4',
        'primary:level_9_2',
      ],
    });

    expect(resolved.completedCampaignIds).toEqual([
      'campaign_3',
      'campaign_1',
      'campaign_2',
    ]);
    expect(resolved.completedLevelIds).toEqual([
      'level_3_1',
      'level_1_1',
      'level_2_4',
    ]);
  });

  test('still produces usable progress when no age group is selected yet', () => {
    const resolved = resolveCompatibleCampaignProgress({
      activeAgeGroup: null,
      ageProgress: undefined,
      completedCampaigns: ['campaign_1', 'junior-high:campaign_2'],
      completedCampaignLevels: ['level_1_1', 'junior-high:level_2_1'],
    });

    expect(resolved.completedCampaignIds).toEqual([
      'campaign_1',
      'campaign_2',
    ]);
    expect(resolved.completedLevelIds).toEqual([
      'level_1_1',
      'level_2_1',
    ]);
  });
});
