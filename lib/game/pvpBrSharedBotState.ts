import type { BattleRoyaleFighterView, BattleRoyaleSharedBotState } from '@/types/pvp-br';

export interface SharedBotDisplayState {
  hp: number;
  maxHp: number;
  shield: number;
  armor: number;
  alive: boolean;
  lastAttackerId?: string | null;
}

function clampNonNegative(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

export function shouldAcceptSharedBotVersion(currentVersion: number, incomingVersion: number | null) {
  if (incomingVersion == null) {
    return true;
  }
  return incomingVersion >= currentVersion;
}

export function reconcileSharedBotState(
  previous: BattleRoyaleSharedBotState | undefined,
  incoming: BattleRoyaleSharedBotState,
): BattleRoyaleSharedBotState {
  if (!previous) {
    return incoming;
  }

  if (incoming.updatedAt > previous.updatedAt) {
    return incoming;
  }

  if (incoming.updatedAt < previous.updatedAt) {
    return previous;
  }

  const hp = Math.min(clampNonNegative(previous.hp), clampNonNegative(incoming.hp));
  const shield = Math.min(clampNonNegative(previous.shield), clampNonNegative(incoming.shield));
  const armor = Math.min(clampNonNegative(previous.armor), clampNonNegative(incoming.armor));
  const alive = previous.alive && incoming.alive && hp > 0;

  return {
    ...incoming,
    hp,
    maxHp: Math.max(clampNonNegative(previous.maxHp), clampNonNegative(incoming.maxHp)),
    shield,
    armor,
    alive,
    updatedAt: previous.updatedAt,
    lastAttackerId: incoming.lastAttackerId ?? previous.lastAttackerId ?? null,
  };
}

export function clampDisplayedBotState<T extends SharedBotDisplayState>(
  current: T,
  shared: BattleRoyaleSharedBotState,
): T {
  const hp = Math.min(clampNonNegative(current.hp), clampNonNegative(shared.hp));
  const shield = Math.min(clampNonNegative(current.shield), clampNonNegative(shared.shield));
  const armor = Math.min(clampNonNegative(current.armor), clampNonNegative(shared.armor));
  const alive = Boolean(current.alive && shared.alive && hp > 0);

  return {
    ...current,
    hp,
    maxHp: Math.max(clampNonNegative(current.maxHp), clampNonNegative(shared.maxHp)),
    shield,
    armor,
    alive,
    lastAttackerId: shared.lastAttackerId ?? current.lastAttackerId ?? null,
  };
}

export function clampDisplayedBotFighter(
  fighter: BattleRoyaleFighterView,
  shared: BattleRoyaleSharedBotState,
): BattleRoyaleFighterView {
  return clampDisplayedBotState(fighter, shared);
}
