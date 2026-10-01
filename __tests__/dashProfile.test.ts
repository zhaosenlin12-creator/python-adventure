import { getDashDistance, getDashProfile } from '@/lib/game/dashProfile';

describe('dash profile', () => {
  it('keeps lobby and campaign basic dash distance aligned', () => {
    const profile = getDashProfile(false);
    expect(profile).toEqual({ speed: 500, durationMs: 200, cooldownSeconds: 1 });
    expect(getDashDistance(profile)).toBe(100);
  });

  it('keeps quantum dash distance aligned while applying cooldown modifiers', () => {
    const profile = getDashProfile(true, 0.8);
    expect(profile).toEqual({ speed: 680, durationMs: 280, cooldownSeconds: 0.6 });
    expect(getDashDistance(profile)).toBe(190.4);
  });
});
