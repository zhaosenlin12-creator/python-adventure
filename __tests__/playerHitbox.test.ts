import {
  getPlayerCollisionSize,
  getPlayerVisualSize,
  PLAYER_SOURCE_HEIGHT,
  PLAYER_SOURCE_WIDTH,
} from '@/lib/game/playerHitbox';

describe('player hitbox sizing', () => {
  it('keeps the generated player artwork aspect ratio', () => {
    const size = getPlayerVisualSize();

    expect(size.width / size.height).toBeCloseTo(
      PLAYER_SOURCE_WIDTH / PLAYER_SOURCE_HEIGHT,
      6,
    );
  });

  it('keeps the previous gameplay collision envelope instead of source pixels', () => {
    expect(getPlayerCollisionSize()).toEqual({ width: 55, height: 55 });
    expect(getPlayerCollisionSize(1.5)).toEqual({ width: 82.5, height: 82.5 });
  });

  it('falls back to a neutral scale for invalid values', () => {
    expect(getPlayerVisualSize(0)).toEqual(getPlayerVisualSize(1));
    expect(getPlayerCollisionSize(Number.NaN)).toEqual(getPlayerCollisionSize(1));
  });
});
