export const PLAYER_SOURCE_WIDTH = 657;
export const PLAYER_SOURCE_HEIGHT = 983;

export interface PlayerVisualSize {
  width: number;
  height: number;
}

export function getPlayerVisualSize(
  playerScale = 1,
  baseSize = 40,
): PlayerVisualSize {
  const safeScale = Number.isFinite(playerScale) && playerScale > 0 ? playerScale : 1;
  const aspectRatio = PLAYER_SOURCE_WIDTH / PLAYER_SOURCE_HEIGHT;

  return {
    width: baseSize * aspectRatio * safeScale,
    height: baseSize * safeScale,
  };
}

export function getPlayerCollisionSize(
  playerScale = 1,
  baseSize = 40,
): PlayerVisualSize {
  const safeScale = Number.isFinite(playerScale) && playerScale > 0 ? playerScale : 1;
  const collisionSize = (baseSize + 15) * safeScale;

  return {
    width: collisionSize,
    height: collisionSize,
  };
}
