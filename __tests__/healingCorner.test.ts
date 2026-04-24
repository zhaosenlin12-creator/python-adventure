import {
  COURAGE_CARDS,
  HEALING_BREATHING_STEPS,
  HEALING_MOOD_OPTIONS,
  getCourageCard,
  getRecommendedActivity,
} from '@/lib/pet/healingCorner';

describe('healingCorner config', () => {
  it('maps every mood to a valid recommended activity', () => {
    const activities = new Set(['breathe', 'ground', 'release', 'courage', 'chat']);

    expect(HEALING_MOOD_OPTIONS.length).toBeGreaterThanOrEqual(4);
    for (const item of HEALING_MOOD_OPTIONS) {
      expect(activities.has(getRecommendedActivity(item.id))).toBe(true);
    }
  });

  it('cycles courage cards safely', () => {
    expect(COURAGE_CARDS.length).toBeGreaterThanOrEqual(4);
    expect(getCourageCard(0)).toEqual(COURAGE_CARDS[0]);
    expect(getCourageCard(COURAGE_CARDS.length)).toEqual(COURAGE_CARDS[0]);
    expect(getCourageCard(-1)).toEqual(COURAGE_CARDS[COURAGE_CARDS.length - 1]);
  });

  it('provides a complete breathing loop', () => {
    expect(HEALING_BREATHING_STEPS.map((step) => step.id)).toEqual([
      'inhale',
      'hold',
      'exhale',
    ]);
    expect(HEALING_BREATHING_STEPS.every((step) => step.durationMs > 0)).toBe(true);
  });
});
