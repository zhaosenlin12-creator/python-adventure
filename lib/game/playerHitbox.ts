export const PLAYER_SOURCE_WIDTH = 657;
export const PLAYER_SOURCE_HEIGHT = 983;
export const PLAYER_COLLISION_RUNTIME_SIGNATURE = 'player-collision-bottom-aligned-v1';
export const PLAYER_BASE_VISUAL_HEIGHT = 44;
export const PLAYER_BASE_COLLISION_WIDTH = 30;
export const PLAYER_BASE_COLLISION_HEIGHT = 42;
export const PLAYER_BASE_COLLISION_BOTTOM_PADDING = 1;

export interface PlayerVisualSize {
  width: number;
  height: number;
}

export interface PlayerCollisionSize extends PlayerVisualSize {
  bottomPadding: number;
}

function normalizeScale(playerScale: number) {
  return Number.isFinite(playerScale) && playerScale > 0 ? playerScale : 1;
}

function normalizeBaseSize(baseSize: number) {
  return Number.isFinite(baseSize) && baseSize > 0
    ? baseSize
    : PLAYER_BASE_VISUAL_HEIGHT;
}

export function getPlayerVisualSize(
  playerScale = 1,
  baseSize = PLAYER_BASE_VISUAL_HEIGHT,
): PlayerVisualSize {
  const safeScale = normalizeScale(playerScale);
  const safeBaseSize = normalizeBaseSize(baseSize);
  const aspectRatio = PLAYER_SOURCE_WIDTH / PLAYER_SOURCE_HEIGHT;

  return {
    width: safeBaseSize * aspectRatio * safeScale,
    height: safeBaseSize * safeScale,
  };
}

export function getPlayerCollisionSize(
  playerScale = 1,
  baseSize = PLAYER_BASE_VISUAL_HEIGHT,
): PlayerCollisionSize {
  const safeScale = normalizeScale(playerScale);
  const safeBaseSize = normalizeBaseSize(baseSize);
  const baseRatio = safeBaseSize / PLAYER_BASE_VISUAL_HEIGHT;

  return {
    width: PLAYER_BASE_COLLISION_WIDTH * safeScale * baseRatio,
    height: PLAYER_BASE_COLLISION_HEIGHT * safeScale * baseRatio,
    bottomPadding: PLAYER_BASE_COLLISION_BOTTOM_PADDING * safeScale * baseRatio,
  };
}
