import {
  PLAYER_COLLISION_RUNTIME_SIGNATURE,
  PLAYER_BASE_COLLISION_BOTTOM_PADDING,
  PLAYER_BASE_COLLISION_HEIGHT,
  PLAYER_BASE_COLLISION_WIDTH,
  PLAYER_BASE_VISUAL_HEIGHT,
  getPlayerCollisionSize,
  getPlayerVisualSize,
  PLAYER_SOURCE_HEIGHT,
  PLAYER_SOURCE_WIDTH,
} from '@/lib/game/playerHitbox';

describe('player hitbox sizing', () => {
  it('exposes the collision implementation signature used by deployment checks', () => {
    expect(PLAYER_COLLISION_RUNTIME_SIGNATURE).toBe('player-collision-bottom-aligned-v1');
  });

  it('keeps the generated player artwork aspect ratio', () => {
    const size = getPlayerVisualSize();

    expect(size.height).toBe(PLAYER_BASE_VISUAL_HEIGHT);
    expect(size.width / size.height).toBeCloseTo(
      PLAYER_SOURCE_WIDTH / PLAYER_SOURCE_HEIGHT,
      6,
    );
  });

  it('keeps the collision box aligned with the visible player instead of source pixels', () => {
    expect(getPlayerCollisionSize()).toEqual({
      width: PLAYER_BASE_COLLISION_WIDTH,
      height: PLAYER_BASE_COLLISION_HEIGHT,
      bottomPadding: PLAYER_BASE_COLLISION_BOTTOM_PADDING,
    });
    expect(getPlayerCollisionSize(1.5)).toEqual({
      width: PLAYER_BASE_COLLISION_WIDTH * 1.5,
      height: PLAYER_BASE_COLLISION_HEIGHT * 1.5,
      bottomPadding: PLAYER_BASE_COLLISION_BOTTOM_PADDING * 1.5,
    });
  });

  it('scales the collision box with custom visual height', () => {
    expect(getPlayerCollisionSize(1, 88)).toEqual({
      width: PLAYER_BASE_COLLISION_WIDTH * 2,
      height: PLAYER_BASE_COLLISION_HEIGHT * 2,
      bottomPadding: PLAYER_BASE_COLLISION_BOTTOM_PADDING * 2,
    });
  });

  it('falls back to a neutral scale for invalid values', () => {
    expect(getPlayerVisualSize(0)).toEqual(getPlayerVisualSize(1));
    expect(getPlayerCollisionSize(Number.NaN)).toEqual(getPlayerCollisionSize(1));
  });
});
