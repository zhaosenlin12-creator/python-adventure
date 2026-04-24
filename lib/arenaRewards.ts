export const ARENA_DAILY_DIAMOND_LIMIT = 100;
export const ARENA_REWARD_MARKER_PREFIX = 'arena_reward_claim';

export const ARENA_DIAMOND_REWARD_RANGES = {
  easy: { min: 10, max: 18 },
  medium: { min: 16, max: 24 },
  hard: { min: 22, max: 30 },
} as const;

export function getArenaRewardDayKey(date: Date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

export function isArenaRewardMarker(entry: string) {
  return entry.startsWith(`${ARENA_REWARD_MARKER_PREFIX}:`);
}

export function getArenaRewardClaimsUsed(
  completedChallenges: string[],
  dayKey: string = getArenaRewardDayKey(),
) {
  const prefix = `${ARENA_REWARD_MARKER_PREFIX}:${dayKey}:`;
  return completedChallenges.filter((entry) => entry.startsWith(prefix)).length;
}

export function getArenaRewardClaimsRemaining(
  completedChallenges: string[],
  dayKey: string = getArenaRewardDayKey(),
) {
  return Math.max(0, ARENA_DAILY_DIAMOND_LIMIT - getArenaRewardClaimsUsed(completedChallenges, dayKey));
}

export function mergeArenaRewardMarker(entries: string[], marker: string | null | undefined) {
  if (!marker || entries.includes(marker)) {
    return entries;
  }
  return [...entries, marker];
}
