import {
  clampDisplayedBotState,
  reconcileSharedBotState,
  shouldAcceptSharedBotVersion,
} from '@/lib/game/pvpBrSharedBotState';
import type { BattleRoyaleSharedBotState } from '@/types/pvp-br';

function createSharedState(overrides: Partial<BattleRoyaleSharedBotState> = {}): BattleRoyaleSharedBotState {
  return {
    id: 'bot-1',
    hp: 120,
    maxHp: 120,
    shield: 0,
    armor: 0,
    alive: true,
    updatedAt: 100,
    lastAttackerId: null,
    ...overrides,
  };
}

describe('pvpBrSharedBotState', () => {
  test('rejects stale shared bot versions', () => {
    expect(shouldAcceptSharedBotVersion(3, 2)).toBe(false);
    expect(shouldAcceptSharedBotVersion(3, 3)).toBe(true);
    expect(shouldAcceptSharedBotVersion(3, 4)).toBe(true);
    expect(shouldAcceptSharedBotVersion(3, null)).toBe(true);
  });

  test('keeps newer shared bot state when an older packet arrives later', () => {
    const previous = createSharedState({
      hp: 84,
      shield: 0,
      armor: 0,
      updatedAt: 220,
      lastAttackerId: 'human-8',
    });
    const staleIncoming = createSharedState({
      hp: 102,
      shield: 6,
      armor: 4,
      updatedAt: 180,
      lastAttackerId: 'human-2',
    });

    expect(reconcileSharedBotState(previous, staleIncoming)).toEqual(previous);
  });

  test('never lets the displayed bot state jump backward after local hits', () => {
    const displayed = {
      hp: 18,
      maxHp: 120,
      shield: 0,
      armor: 0,
      alive: true,
      lastAttackerId: 'human-1',
    };
    const intermediateServerState = createSharedState({
      hp: 72,
      shield: 8,
      armor: 6,
      alive: true,
      updatedAt: 260,
      lastAttackerId: 'human-1',
    });

    expect(clampDisplayedBotState(displayed, intermediateServerState)).toEqual({
      hp: 18,
      maxHp: 120,
      shield: 0,
      armor: 0,
      alive: true,
      lastAttackerId: 'human-1',
    });
  });

  test('lets the server-confirmed knockout finish the bot', () => {
    const displayed = {
      hp: 1,
      maxHp: 120,
      shield: 0,
      armor: 0,
      alive: true,
      lastAttackerId: 'human-1',
    };
    const defeatedState = createSharedState({
      hp: 0,
      alive: false,
      updatedAt: 300,
      lastAttackerId: 'human-1',
    });

    expect(clampDisplayedBotState(displayed, defeatedState)).toEqual({
      hp: 0,
      maxHp: 120,
      shield: 0,
      armor: 0,
      alive: false,
      lastAttackerId: 'human-1',
    });
  });
});
