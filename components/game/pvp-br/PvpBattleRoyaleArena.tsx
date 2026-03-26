'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Shield, Swords, Trophy, Users, Wind } from 'lucide-react';

import MobileGameWrapper from '@/components/game/MobileGameWrapper';
import BattleRoyaleQuizModal from '@/components/game/pvp-br/BattleRoyaleQuizModal';
import { musicManager } from '@/lib/audio/musicManager';
import { getPetVariantScale, getPetWorldYOffset } from '@/lib/config/petArtworkProfiles';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { touchInputManager } from '@/lib/input/TouchInputManager';
import { migratePetType } from '@/lib/pet/migration';
import { buildBattleRoyaleQuiz, evaluateBattleRoyaleQuiz } from '@/lib/pvpBrQuestions';
import { BattleRoyaleWebSocketClient } from '@/lib/services/pvpBattleRoyaleWebSocket';
import { useAuthStore } from '@/store/authStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type {
  BattleRoyaleDifficulty,
  BattleRoyaleFighterView,
  BattleRoyaleInputPayload,
  BattleRoyalePickupView,
  BattleRoyalePlatform,
  BattleRoyaleQuizOffer,
  BattleRoyaleQuizQuestion,
  BattleRoyaleResult,
  BattleRoyaleRoom,
  BattleRoyaleSnapshot,
  BrPickupType,
} from '@/types/pvp-br';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const MAP_WIDTH = 8600;
const MAP_HEIGHT = 3200;
const FLOOR_Y = 2860;
const FIGHTER_WIDTH = 68;
const FIGHTER_HEIGHT = 78;
const FIGHTER_HP = 120;
const GRAVITY = 2400;
const MOVE_SPEED = 410;
const JUMP_FORCE = 900;
const DOUBLE_JUMP_FORCE = 860;
const DASH_SPEED = 980;
const DASH_DURATION_MS = 130;
const DASH_COOLDOWN_MS = 1200;
const ATTACK_RANGE = 96;
const ATTACK_DAMAGE = 16;
const ATTACK_COOLDOWN_MS = 540;
const ATTACK_ACTIVE_MS = 150;
const SAFE_ZONE_DAMAGE = 13;
const MATCH_MAX_MS = 360000;
const PICKUP_RESPAWN_MS = 14000;
const SNAPSHOT_INTERVAL_MS = 90;
const UI_SYNC_INTERVAL_MS = 120;

const ZONE_PHASES = [
  { until: 45000, radius: 3400 },
  { until: 100000, radius: 2860 },
  { until: 155000, radius: 2280 },
  { until: 220000, radius: 1700 },
  { until: 280000, radius: 1180 },
  { until: 330000, radius: 760 },
  { until: MATCH_MAX_MS, radius: 360 },
] as const;

const PLATFORM_LAYOUT: BattleRoyalePlatform[] = [
  { x: 220, y: 2570, width: 560, height: 28 },
  { x: 920, y: 2350, width: 420, height: 28 },
  { x: 1500, y: 2130, width: 360, height: 28 },
  { x: 1960, y: 2490, width: 520, height: 28 },
  { x: 2580, y: 2240, width: 420, height: 28 },
  { x: 3100, y: 1820, width: 340, height: 28 },
  { x: 3560, y: 1570, width: 300, height: 28 },
  { x: 3950, y: 2350, width: 560, height: 28 },
  { x: 4600, y: 2080, width: 360, height: 28 },
  { x: 5030, y: 1830, width: 320, height: 28 },
  { x: 5480, y: 2490, width: 520, height: 28 },
  { x: 6120, y: 2250, width: 420, height: 28 },
  { x: 6600, y: 1930, width: 360, height: 28 },
  { x: 7050, y: 1660, width: 320, height: 28 },
  { x: 7480, y: 2400, width: 520, height: 28 },
  { x: 8060, y: 2140, width: 360, height: 28 },
  { x: 1120, y: 1870, width: 280, height: 28 },
  { x: 1670, y: 1610, width: 260, height: 28 },
  { x: 2260, y: 1410, width: 260, height: 28 },
  { x: 2820, y: 1180, width: 240, height: 28 },
  { x: 4700, y: 1390, width: 280, height: 28 },
  { x: 5280, y: 1180, width: 240, height: 28 },
  { x: 5860, y: 1490, width: 280, height: 28 },
  { x: 6880, y: 1320, width: 300, height: 28 },
  { x: 7520, y: 1020, width: 240, height: 28 },
];

const PLATFORM_SPAWN_INDICES = [0, 1, 3, 4, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 18, 20, 21, 23, 24];
const PICKUP_PLATFORM_INDICES = [0, 2, 4, 5, 7, 8, 10, 11, 12, 14, 16, 18, 19, 20, 22, 24];

const PRIMARY_SPAWN_POINTS = PLATFORM_SPAWN_INDICES.map((index) => {
  const platform = PLATFORM_LAYOUT[index];
  return {
    x: platform.x + platform.width / 2 - FIGHTER_WIDTH / 2,
    y: platform.y - 94,
  };
});

const SECONDARY_SPAWN_POINTS = [
  { x: 180, y: FLOOR_Y - 96 },
  { x: 1630, y: FLOOR_Y - 96 },
  { x: 3300, y: FLOOR_Y - 96 },
  { x: 5000, y: FLOOR_Y - 96 },
  { x: 6750, y: FLOOR_Y - 96 },
  { x: 8220, y: FLOOR_Y - 96 },
];

const SPAWN_POINTS = [...PRIMARY_SPAWN_POINTS, ...SECONDARY_SPAWN_POINTS];

const PICKUP_SPAWNS = [
  ...PICKUP_PLATFORM_INDICES.map((index) => {
    const platform = PLATFORM_LAYOUT[index];
    return {
      x: platform.x + platform.width / 2,
      y: platform.y - 34,
    };
  }),
  { x: 640, y: FLOOR_Y - 44 },
  { x: 2410, y: FLOOR_Y - 44 },
  { x: 4300, y: FLOOR_Y - 44 },
  { x: 6210, y: FLOOR_Y - 44 },
  { x: 8010, y: FLOOR_Y - 44 },
];

const BACKGROUND_ORBS = [
  { x: 520, y: 260, radius: 130, color: 'rgba(103, 232, 249, 0.08)' },
  { x: 1680, y: 420, radius: 190, color: 'rgba(251, 191, 36, 0.07)' },
  { x: 3020, y: 300, radius: 160, color: 'rgba(45, 212, 191, 0.07)' },
  { x: 4460, y: 360, radius: 210, color: 'rgba(125, 211, 252, 0.07)' },
  { x: 5930, y: 280, radius: 170, color: 'rgba(244, 114, 182, 0.06)' },
  { x: 7440, y: 340, radius: 190, color: 'rgba(165, 180, 252, 0.06)' },
];

const FLOATING_CLOUDS = [
  { x: 420, y: 280, width: 220, height: 72 },
  { x: 1360, y: 460, width: 260, height: 86 },
  { x: 2660, y: 240, width: 210, height: 68 },
  { x: 4210, y: 430, width: 280, height: 92 },
  { x: 5660, y: 250, width: 240, height: 80 },
  { x: 7080, y: 400, width: 260, height: 86 },
  { x: 8120, y: 300, width: 220, height: 72 },
];

const GROUND_PROPS = [
  { x: 380, stem: '#94d2bd', cap: '#fda4af', size: 22 },
  { x: 940, stem: '#93c5fd', cap: '#fcd34d', size: 18 },
  { x: 1710, stem: '#86efac', cap: '#f9a8d4', size: 24 },
  { x: 2480, stem: '#a7f3d0', cap: '#fdba74', size: 20 },
  { x: 3370, stem: '#93c5fd', cap: '#c4b5fd', size: 22 },
  { x: 4230, stem: '#86efac', cap: '#fcd34d', size: 18 },
  { x: 5010, stem: '#67e8f9', cap: '#fda4af', size: 24 },
  { x: 5820, stem: '#a7f3d0', cap: '#fdba74', size: 20 },
  { x: 6620, stem: '#93c5fd', cap: '#c4b5fd', size: 22 },
  { x: 7390, stem: '#86efac', cap: '#fcd34d', size: 18 },
  { x: 8140, stem: '#67e8f9', cap: '#f9a8d4', size: 24 },
];

const PICKUP_ROTATION: BrPickupType[] = [
  'med_kit',
  'armor_vest',
  'shield_core',
  'damage_claw',
  'wind_boost',
  'shockwave_charge',
];

const zoneCenter = {
  x: MAP_WIDTH / 2,
  y: MAP_HEIGHT * 0.56,
};

interface InternalFighter extends BattleRoyaleFighterView {
  input: BattleRoyaleInputPayload;
  movementSkills: string[];
  onGround: boolean;
  jumpsUsed: number;
  attackTimerMs: number;
  attackCooldownMs: number;
  dashTimerMs: number;
  dashCooldownMs: number;
  guardMeterMs: number;
  reviveUsed: boolean;
  quizPending: boolean;
  damageBonus: number;
  speedMultiplier: number;
  ageGroup: string;
  jumpHeld: boolean;
  attackHeld: boolean;
  skillHeld: boolean;
  dashHeld: boolean;
  lastAttackerId: string | null;
  eliminatedAtMs: number | null;
}

interface InternalPickup extends BattleRoyalePickupView {
  respawnAtMs: number;
}

interface KillFeedItem {
  id: string;
  text: string;
  createdAt: number;
}

interface PvpBattleRoyaleArenaProps {
  room: BattleRoyaleRoom;
  onExit: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function canDrawImage(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

function createPlatforms(): BattleRoyalePlatform[] {
  return [
    { x: 0, y: FLOOR_Y, width: MAP_WIDTH, height: MAP_HEIGHT - FLOOR_Y },
    ...PLATFORM_LAYOUT,
  ];
}

function getZoneState(elapsedMs: number) {
  let previousUntil = 0;
  let previousRadius: number = ZONE_PHASES[0].radius;

  for (let index = 0; index < ZONE_PHASES.length; index += 1) {
    const phase = ZONE_PHASES[index];
    if (elapsedMs <= phase.until) {
      const duration = Math.max(phase.until - previousUntil, 1);
      const progress = clamp((elapsedMs - previousUntil) / duration, 0, 1);
      const radius = previousRadius + (phase.radius - previousRadius) * progress;
      return {
        centerX: zoneCenter.x,
        centerY: zoneCenter.y,
        radius,
        phase: index + 1,
        nextShrinkAtMs: phase.until,
      };
    }
    previousUntil = phase.until;
    previousRadius = phase.radius;
  }

  const lastPhase = ZONE_PHASES[ZONE_PHASES.length - 1];
  return {
    centerX: zoneCenter.x,
    centerY: zoneCenter.y,
    radius: lastPhase.radius,
    phase: ZONE_PHASES.length,
    nextShrinkAtMs: MATCH_MAX_MS,
  };
}

function createDefaultInput(): BattleRoyaleInputPayload {
  return {
    left: false,
    right: false,
    jump: false,
    dash: false,
    attack: false,
    skill: false,
    guard: false,
  };
}

function fighterIdForUser(userId: number): string {
  return `human-${userId}`;
}

function buildSpawnQueue() {
  const shuffle = (points: Array<{ x: number; y: number }>) => {
    const queue = [...points];
    for (let index = queue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
    }
    return queue;
  };

  return [...shuffle(PRIMARY_SPAWN_POINTS), ...shuffle(SECONDARY_SPAWN_POINTS)];
}

function pickBotSkills(difficulty: BattleRoyaleDifficulty): string[] {
  if (difficulty === 'hard') return ['double_jump', 'dash', 'glide', 'wall_jump'];
  if (difficulty === 'medium') return ['double_jump', 'dash', 'glide'];
  return ['double_jump'];
}

function createInitialFighters(room: BattleRoyaleRoom): Map<string, InternalFighter> {
  const fighters = new Map<string, InternalFighter>();
  const spawnQueue = buildSpawnQueue();
  let spawnIndex = 0;

  room.humans.forEach((human) => {
    const spawn = spawnQueue[spawnIndex % spawnQueue.length];
    spawnIndex += 1;
    fighters.set(fighterIdForUser(human.user_id), {
      id: fighterIdForUser(human.user_id),
      userId: human.user_id,
      name: human.username,
      petType: human.pet_type,
      petStage: human.pet_stage ?? 3,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      hp: FIGHTER_HP,
      maxHp: FIGHTER_HP,
      shield: 0,
      armor: 0,
      kills: 0,
      alive: true,
      facing: 1,
      isBot: false,
      difficulty: undefined,
      hasRevived: false,
      specialCharges: 0,
      buffs: {},
      input: createDefaultInput(),
      movementSkills: human.movement_skills ?? [],
      onGround: false,
      jumpsUsed: 0,
      attackTimerMs: 0,
      attackCooldownMs: 0,
      dashTimerMs: 0,
      dashCooldownMs: 0,
      guardMeterMs: 0,
      reviveUsed: false,
      quizPending: false,
      damageBonus: 0,
      speedMultiplier: 1,
      ageGroup: human.age_group,
      jumpHeld: false,
      attackHeld: false,
      skillHeld: false,
      dashHeld: false,
      lastAttackerId: null,
      eliminatedAtMs: null,
    });
  });

  room.bots.forEach((bot) => {
    const spawn = spawnQueue[spawnIndex % spawnQueue.length];
    spawnIndex += 1;
    fighters.set(bot.id, {
      id: bot.id,
      name: bot.name,
      petType: bot.pet_type,
      petStage: bot.pet_stage ?? 3,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      hp: FIGHTER_HP,
      maxHp: FIGHTER_HP,
      shield: 0,
      armor: 0,
      kills: 0,
      alive: true,
      facing: 1,
      isBot: true,
      difficulty: bot.difficulty,
      hasRevived: false,
      specialCharges: 0,
      buffs: {},
      input: createDefaultInput(),
      movementSkills: pickBotSkills(bot.difficulty),
      onGround: false,
      jumpsUsed: 0,
      attackTimerMs: 0,
      attackCooldownMs: 0,
      dashTimerMs: 0,
      dashCooldownMs: 0,
      guardMeterMs: 0,
      reviveUsed: true,
      quizPending: false,
      damageBonus: 0,
      speedMultiplier: 1,
      ageGroup: 'primary-upper',
      jumpHeld: false,
      attackHeld: false,
      skillHeld: false,
      dashHeld: false,
      lastAttackerId: null,
      eliminatedAtMs: null,
    });
  });

  return fighters;
}

function createInitialPickups(): InternalPickup[] {
  return PICKUP_SPAWNS.map((spawn, index) => ({
    id: `pickup-${index}`,
    type: PICKUP_ROTATION[index % PICKUP_ROTATION.length],
    x: spawn.x,
    y: spawn.y,
    active: true,
    respawnAtMs: 0,
  }));
}

function distanceToZone(fighter: InternalFighter, zone: ReturnType<typeof getZoneState>): number {
  const centerX = fighter.x + FIGHTER_WIDTH / 2;
  const centerY = fighter.y + FIGHTER_HEIGHT / 2;
  return Math.hypot(centerX - zone.centerX, centerY - zone.centerY);
}

function spawnPositionForRevive(zone: ReturnType<typeof getZoneState>): { x: number; y: number } {
  const safeSpawn = SPAWN_POINTS.find(
    (point) => Math.hypot(point.x - zone.centerX, point.y - zone.centerY) < zone.radius - 160,
  );
  return safeSpawn ?? SPAWN_POINTS[0];
}

function buildSnapshot(
  tick: number,
  elapsedMs: number,
  zone: ReturnType<typeof getZoneState>,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  killFeed: KillFeedItem[],
  winnerId: string | null,
  platforms: BattleRoyalePlatform[],
): BattleRoyaleSnapshot {
  return {
    tick,
    elapsedMs,
    zone,
    fighters: Array.from(fighters.values()).map((fighter) => ({
      id: fighter.id,
      userId: fighter.userId,
      name: fighter.name,
      petType: fighter.petType,
      petStage: fighter.petStage,
      x: fighter.x,
      y: fighter.y,
      vx: fighter.vx,
      vy: fighter.vy,
      hp: fighter.hp,
      maxHp: fighter.maxHp,
      shield: fighter.shield,
      armor: fighter.armor,
      kills: fighter.kills,
      alive: fighter.alive,
      facing: fighter.facing,
      isBot: fighter.isBot,
      difficulty: fighter.difficulty,
      hasRevived: fighter.hasRevived,
      specialCharges: fighter.specialCharges,
      buffs: fighter.buffs,
    })),
    pickups: pickups.map((pickup) => ({
      id: pickup.id,
      type: pickup.type,
      x: pickup.x,
      y: pickup.y,
      active: pickup.active,
    })),
    killFeed: killFeed.slice(-6),
    winnerId,
    platforms,
  };
}

function pickupLabel(type: BrPickupType): string {
  switch (type) {
    case 'med_kit':
      return '医疗包';
    case 'armor_vest':
      return '防弹衣';
    case 'shield_core':
      return '护盾核';
    case 'damage_claw':
      return '利爪武器';
    case 'wind_boost':
      return '风压助推';
    case 'shockwave_charge':
      return '冲击波';
    default:
      return type;
  }
}

function selectZoneReturnPoint(zone: ReturnType<typeof getZoneState>) {
  const inZonePoints = SPAWN_POINTS.filter(
    (point) => Math.hypot(point.x - zone.centerX, point.y - zone.centerY) < zone.radius - 180,
  );
  if (inZonePoints.length > 0) {
    return inZonePoints.sort(
      (left, right) =>
        Math.hypot(left.x - zone.centerX, left.y - zone.centerY) -
        Math.hypot(right.x - zone.centerX, right.y - zone.centerY),
    )[0];
  }

  return {
    x: zone.centerX - FIGHTER_WIDTH / 2,
    y: zone.centerY - 120,
  };
}

function deriveAmbientRoomNotice(snapshot: BattleRoyaleSnapshot, localFighterId: string): string {
  const localFighter = snapshot.fighters.find((fighter) => fighter.id === localFighterId) ?? null;
  const aliveCount = snapshot.fighters.filter((fighter) => fighter.alive).length;
  const shrinkSeconds = Math.max(0, Math.ceil((snapshot.zone.nextShrinkAtMs - snapshot.elapsedMs) / 1000));

  if (snapshot.elapsedMs < 5000) {
    return '已投放大地图，先搜防具和伤害增益，再找近处对手。';
  }

  if (localFighter && !localFighter.alive && !localFighter.hasRevived) {
    return '你已倒下，答对三题后可以半血复活一次。';
  }

  if (localFighter) {
    const localDistanceToZone = Math.hypot(
      localFighter.x + FIGHTER_WIDTH / 2 - snapshot.zone.centerX,
      localFighter.y + FIGHTER_HEIGHT / 2 - snapshot.zone.centerY,
    );

    if (localDistanceToZone > snapshot.zone.radius + 120) {
      return '你已经在安全圈外，正在持续掉血，立刻回圈。';
    }

    if (localFighter.hp < localFighter.maxHp * 0.35) {
      return '血量偏低，优先寻找医疗包、护盾核或防弹衣。';
    }
  }

  if (aliveCount <= 3) {
    return '决赛圈已形成，注意高台落点和冲击波先手。';
  }

  if (snapshot.zone.phase >= 5) {
    return `第 ${snapshot.zone.phase} 次缩圈中，${shrinkSeconds}s 后会继续收缩。`;
  }

  return `战场仍在扩散混战，${shrinkSeconds}s 后缩圈，尽量先占据更高的平台。`;
}

function aiInputForFighter(
  fighter: InternalFighter,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  zone: ReturnType<typeof getZoneState>,
): BattleRoyaleInputPayload {
  const candidates = Array.from(fighters.values()).filter((target) => target.id !== fighter.id && target.alive);
  const nearestEnemy = candidates
    .sort((left, right) => {
      const leftDistance = Math.hypot(left.x - fighter.x, left.y - fighter.y);
      const rightDistance = Math.hypot(right.x - fighter.x, right.y - fighter.y);
      const leftScore = leftDistance - left.hp * 0.8;
      const rightScore = rightDistance - right.hp * 0.8;
      return leftScore - rightScore;
    })[0];

  const activePickup = pickups
    .filter((pickup) => pickup.active)
    .map((pickup) => {
      const distance = Math.hypot(pickup.x - fighter.x, pickup.y - fighter.y);
      let score = 0;

      if (pickup.type === 'med_kit') score = fighter.hp < 70 ? 1.5 : 0.45;
      if (pickup.type === 'shield_core') score = fighter.shield < 22 ? 1.2 : 0.55;
      if (pickup.type === 'armor_vest') score = fighter.armor < 18 ? 1.05 : 0.42;
      if (pickup.type === 'damage_claw') score = 0.85;
      if (pickup.type === 'wind_boost') score = fighter.difficulty === 'easy' ? 0.4 : 0.95;
      if (pickup.type === 'shockwave_charge') score = fighter.specialCharges <= 0 ? 1.1 : 0.35;

      return {
        pickup,
        score: score - distance / 820,
      };
    })
    .sort((left, right) => right.score - left.score)[0];

  const isOutsideZone = distanceToZone(fighter, zone) > zone.radius - 120;
  const recoveryTarget = selectZoneReturnPoint(zone);
  const wantsLoot = Boolean(
    activePickup &&
      fighter.difficulty !== 'easy' &&
      activePickup.score > 0.18 &&
      Math.hypot(activePickup.pickup.x - fighter.x, activePickup.pickup.y - fighter.y) < 520 &&
      fighter.hp > 20,
  );

  const targetX = isOutsideZone
    ? recoveryTarget.x
    : wantsLoot
      ? activePickup!.pickup.x
      : nearestEnemy?.x ?? zone.centerX;
  const targetY = isOutsideZone
    ? recoveryTarget.y
    : wantsLoot
      ? activePickup!.pickup.y
      : nearestEnemy?.y ?? zone.centerY;

  const dx = targetX - fighter.x;
  const dy = targetY - fighter.y;
  const canSecondJump = fighter.movementSkills.includes('double_jump') && fighter.jumpsUsed < 1;
  const shouldClimb = dy < -72 && (fighter.onGround || canSecondJump);
  const shouldHopForward =
    fighter.onGround &&
    Math.abs(dx) > 140 &&
    Math.abs(dx) < 420 &&
    (dy < 120 || (isOutsideZone && Math.abs(dx) > 220));
  const aggressiveRange = fighter.difficulty === 'hard' ? ATTACK_RANGE + 16 : ATTACK_RANGE;
  const shouldDash =
    fighter.movementSkills.includes('dash') &&
    fighter.dashCooldownMs <= 0 &&
    fighter.onGround &&
    Math.abs(dx) > (fighter.difficulty === 'easy' ? 360 : 220) &&
    Math.abs(dx) < 760;

  return {
    left: dx < -24,
    right: dx > 24,
    jump: shouldClimb || shouldHopForward,
    dash: shouldDash,
    attack:
      !!nearestEnemy &&
      Math.abs(nearestEnemy.x - fighter.x) < aggressiveRange &&
      Math.abs(nearestEnemy.y - fighter.y) < 118,
    skill:
      fighter.specialCharges > 0 &&
      !!nearestEnemy &&
      Math.abs(nearestEnemy.x - fighter.x) < 240 &&
      Math.abs(nearestEnemy.y - fighter.y) < 140,
    guard:
      (!!nearestEnemy && fighter.hp < (fighter.difficulty === 'hard' ? 48 : 36) && Math.abs(nearestEnemy.x - fighter.x) < 150) ||
      (isOutsideZone && fighter.shield <= 0),
  };
}

export default function PvpBattleRoyaleArena({ room, onExit }: PvpBattleRoyaleArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<BattleRoyaleWebSocketClient | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastFrameTimeRef = useRef(0);
  const lastSnapshotSentRef = useRef(0);
  const lastUiSyncRef = useRef(0);
  const tickRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const winnerIdRef = useRef<string | null>(null);
  const fightersRef = useRef<Map<string, InternalFighter>>(createInitialFighters(room));
  const pickupsRef = useRef<InternalPickup[]>(createInitialPickups());
  const killFeedRef = useRef<KillFeedItem[]>([]);
  const snapshotRef = useRef<BattleRoyaleSnapshot>(
    buildSnapshot(0, 0, getZoneState(0), fightersRef.current, pickupsRef.current, killFeedRef.current, null, createPlatforms()),
  );
  const remoteInputsRef = useRef<Record<string, BattleRoyaleInputPayload>>({});
  const pendingQuizzesRef = useRef<Record<string, BattleRoyaleQuizQuestion[]>>({});
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const matchEndedRef = useRef(false);
  const finishReportedRef = useRef(false);
  const roomNoticeLockUntilRef = useRef(0);

  const [snapshot, setSnapshot] = useState<BattleRoyaleSnapshot>(snapshotRef.current);
  const [quizOffer, setQuizOffer] = useState<BattleRoyaleQuizOffer | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [result, setResult] = useState<BattleRoyaleResult | null>(null);
  const [roomNotice, setRoomNotice] = useState<string>('战斗即将开始');

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const localFighterId = currentUserId ? fighterIdForUser(currentUserId) : '';
  const isHost = room.host_user_id === currentUserId;
  const finishCurrentRoom = usePvpBattleRoyaleStore((state) => state.finishCurrentRoom);
  const setWsConnected = usePvpBattleRoyaleStore((state) => state.setWsConnected);
  const resetBattleRoyaleStore = usePvpBattleRoyaleStore((state) => state.reset);
  const platforms = useMemo(() => createPlatforms(), []);

  const liveSnapshot = snapshot;

  useEffect(() => {
    musicManager.switchBGM('pvp');
    return () => {
      musicManager.switchBGM('main');
    };
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase());
      if (
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', 'j', 'k', 'shift', ' '].includes(
          event.key.toLowerCase(),
        ) ||
        event.key === ' '
      ) {
        event.preventDefault();
      }
    };

    const keyup = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  }, []);

  useEffect(() => {
    room.humans.forEach((human) => {
      const cacheKey = `${human.pet_type}-${human.pet_stage ?? 3}`;
      const image = new Image();
      image.decoding = 'async';
      image.src = getPetImageUrl(human.pet_type as any, 'normal', human.pet_stage ?? 3);
      imageCacheRef.current[cacheKey] = image;
    });
    room.bots.forEach((bot) => {
      const cacheKey = `${bot.pet_type}-${bot.pet_stage ?? 3}`;
      const image = new Image();
      image.decoding = 'async';
      image.src = getPetImageUrl(bot.pet_type as any, 'normal', bot.pet_stage ?? 3);
      imageCacheRef.current[cacheKey] = image;
    });
  }, [room]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const client = new BattleRoyaleWebSocketClient({
      roomId: room.id,
      userId: currentUserId,
      onConnect: () => {
        setWsConnected(true);
      },
      onDisconnect: () => {
        setWsConnected(false);
      },
      onMessage: (message) => {
        if (message.type === 'br_input' && isHost) {
          const fighterId = fighterIdForUser(message.user_id);
          remoteInputsRef.current[fighterId] = {
            ...createDefaultInput(),
            ...(message.payload?.input ?? {}),
          };
          return;
        }

        if (message.type === 'br_snapshot' && !isHost && message.payload) {
          snapshotRef.current = message.payload as BattleRoyaleSnapshot;
          setSnapshot(message.payload as BattleRoyaleSnapshot);
          return;
        }

        if (message.type === 'br_quiz_offer' && message.payload) {
          const payload = message.payload as BattleRoyaleQuizOffer;
          if (payload.fighterId === localFighterId) {
            setQuizOffer(payload);
          }
          return;
        }

        if (message.type === 'br_quiz_result' && message.payload) {
          const payload = message.payload as { fighterId: string; success: boolean };
          resolveReviveOutcome(payload.fighterId, payload.success);
          pushRoomNotice(payload.success ? '答题成功，半血复活' : '答题失败，本局出局', 4200);
          return;
        }

        if (message.type === 'br_quiz_submit' && isHost && message.payload) {
          const payload = message.payload as { fighterId: string; answers: string[] };
          const questions = pendingQuizzesRef.current[payload.fighterId];
          if (!questions?.length) {
            return;
          }
          const success = evaluateBattleRoyaleQuiz(questions, payload.answers);
          pendingQuizzesRef.current[payload.fighterId] = [];
          resolveReviveOutcome(payload.fighterId, success);
          return;
        }

        if (message.type === 'br_player_disconnected' && isHost) {
          const fighter = fightersRef.current.get(fighterIdForUser(message.user_id));
          if (fighter && fighter.alive) {
            eliminateFighter(fighter, null, '断线离场');
          }
          return;
        }

        if (message.type === 'br_match_end' && !isHost && message.payload) {
          finalizeMatch(message.payload);
          return;
        }

        if (message.type === 'br_room_closed') {
          pushRoomNotice(message.reason || '房间已关闭', 5000);
          setTimeout(() => {
            resetBattleRoyaleStore();
            onExit();
          }, 1200);
        }
      },
    });

    wsRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [currentUserId, isHost, localFighterId, onExit, resetBattleRoyaleStore, room.id, setWsConnected]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const debugWindow = window as Window & {
        __brSnapshot?: BattleRoyaleSnapshot;
        __brRoomNotice?: string;
      };
      debugWindow.__brSnapshot = snapshot;
      debugWindow.__brRoomNotice = roomNotice;
    }

    if (result || quizOffer || Date.now() < roomNoticeLockUntilRef.current) {
      return;
    }

    const nextNotice = deriveAmbientRoomNotice(snapshot, localFighterId);
    setRoomNotice((current) => (current === nextNotice ? current : nextNotice));
  }, [localFighterId, quizOffer, result, roomNotice, snapshot]);

  const readLocalInput = (): BattleRoyaleInputPayload => {
    const touchState = touchInputManager.getState();
    const keys = keysRef.current;
    return {
      left: keys.has('arrowleft') || keys.has('a') || touchState.left,
      right: keys.has('arrowright') || keys.has('d') || touchState.right,
      jump: keys.has('arrowup') || keys.has('w') || keys.has(' ') || touchState.jump,
      dash: keys.has('shift') || touchState.dash,
      attack: keys.has('j') || keys.has('f') || touchState.attack,
      skill: keys.has('k') || keys.has('e') || touchState.interact,
      guard: keys.has('arrowdown') || keys.has('s') || touchState.down,
    };
  };

  const addKillFeed = (text: string) => {
    killFeedRef.current = [
      ...killFeedRef.current,
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        createdAt: Date.now(),
      },
    ].slice(-8);
  };

  const pushRoomNotice = (message: string, lockMs = 2600) => {
    roomNoticeLockUntilRef.current = Date.now() + lockMs;
    setRoomNotice(message);
  };

  const reviveFighter = (fighterId: string) => {
    const fighter = fightersRef.current.get(fighterId);
    if (!fighter) return;
    const zone = getZoneState(elapsedMsRef.current);
    const spawn = spawnPositionForRevive(zone);
    fighter.x = spawn.x;
    fighter.y = spawn.y;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.hp = Math.round(fighter.maxHp * 0.5);
    fighter.shield = 0;
    fighter.armor = 0;
    fighter.damageBonus = 0;
    fighter.speedMultiplier = 1;
    fighter.specialCharges = 0;
    fighter.buffs = {};
    fighter.alive = true;
    fighter.quizPending = false;
    fighter.hasRevived = true;
    fighter.jumpsUsed = 0;
    fighter.eliminatedAtMs = null;
    addKillFeed(`${fighter.name} 答题成功，半血重返战场`);
  };

  const resolveReviveOutcome = (fighterId: string, success: boolean) => {
    const fighter = fightersRef.current.get(fighterId);
    if (success) {
      reviveFighter(fighterId);
    } else {
      if (fighter) {
        fighter.quizPending = false;
        addKillFeed(`${fighter.name} 复活失败，正式出局`);
      }
    }

    if (isHost && fighter?.userId && fighterId !== localFighterId) {
      wsRef.current?.sendQuizResult(fighter.userId, {
        fighterId,
        success,
      });
    }

    if (fighterId === localFighterId) {
      setQuizOffer(null);
      setSubmittingQuiz(false);
    }
  };

  const maybeOfferRevive = (fighter: InternalFighter) => {
    if (fighter.isBot || fighter.reviveUsed || fighter.quizPending || fighter.hasRevived) {
      return;
    }
    fighter.reviveUsed = true;
    fighter.quizPending = true;

    const questions = buildBattleRoyaleQuiz((fighter.ageGroup as any) ?? 'primary-upper', 3);
    pendingQuizzesRef.current[fighter.id] = questions;

    if (fighter.id === localFighterId) {
      setQuizOffer({ fighterId: fighter.id, questions });
      return;
    }

    if (fighter.userId) {
      wsRef.current?.sendQuizOffer(fighter.userId, {
        fighterId: fighter.id,
        questions,
      });
    }
  };

  const eliminateFighter = (fighter: InternalFighter, killerId: string | null, reason = '被击败') => {
    if (!fighter.alive) return;
    fighter.alive = false;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.eliminatedAtMs = elapsedMsRef.current;

    if (killerId) {
      const killer = fightersRef.current.get(killerId);
      if (killer) {
        killer.kills += 1;
        addKillFeed(`${killer.name} 击败了 ${fighter.name}`);
      }
    } else {
      addKillFeed(`${fighter.name} ${reason}`);
    }

    maybeOfferRevive(fighter);
  };

  const applyDamage = (target: InternalFighter, rawDamage: number, sourceId: string | null) => {
    if (!target.alive) return;
    let damage = rawDamage;

    if (target.input.guard) {
      damage *= 0.55;
    }
    if (target.armor > 0) {
      damage *= 0.78;
    }
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, damage);
      target.shield -= absorbed;
      damage -= absorbed;
    }
    if (damage <= 0) return;

    target.hp = Math.max(0, target.hp - damage);
    target.lastAttackerId = sourceId;
    if (target.hp <= 0) {
      eliminateFighter(target, sourceId);
    }
  };

  const applyPickup = (fighter: InternalFighter, pickup: InternalPickup) => {
    switch (pickup.type) {
      case 'med_kit':
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + 36);
        fighter.buffs.med_kit = (fighter.buffs.med_kit ?? 0) + 1;
        break;
      case 'armor_vest':
        fighter.armor = clamp(fighter.armor + 16, 0, 48);
        fighter.buffs.armor_vest = (fighter.buffs.armor_vest ?? 0) + 1;
        break;
      case 'shield_core':
        fighter.shield = clamp(fighter.shield + 26, 0, 60);
        fighter.buffs.shield_core = (fighter.buffs.shield_core ?? 0) + 1;
        break;
      case 'damage_claw':
        fighter.damageBonus = clamp(fighter.damageBonus + 5, 0, 18);
        fighter.buffs.damage_claw = (fighter.buffs.damage_claw ?? 0) + 1;
        break;
      case 'wind_boost':
        fighter.speedMultiplier = clamp(fighter.speedMultiplier + 0.12, 1, 1.45);
        fighter.buffs.wind_boost = (fighter.buffs.wind_boost ?? 0) + 1;
        break;
      case 'shockwave_charge':
        fighter.specialCharges = clamp(fighter.specialCharges + 2, 0, 6);
        fighter.buffs.shockwave_charge = (fighter.buffs.shockwave_charge ?? 0) + 2;
        break;
      default:
        break;
    }

    pickup.active = false;
    pickup.respawnAtMs = elapsedMsRef.current + PICKUP_RESPAWN_MS;
    addKillFeed(`${fighter.name} 拾取了 ${pickupLabel(pickup.type)}`);
  };

  const applyAttack = (fighter: InternalFighter) => {
    if (!fighter.alive || fighter.attackCooldownMs > 0) {
      return;
    }
    fighter.attackCooldownMs = ATTACK_COOLDOWN_MS;
    fighter.attackTimerMs = ATTACK_ACTIVE_MS;

    fightersRef.current.forEach((target) => {
      if (!target.alive || target.id === fighter.id) {
        return;
      }
      const dx = target.x - fighter.x;
      const dy = Math.abs(target.y - fighter.y);
      const directionMatches = fighter.facing === 1 ? dx >= 0 : dx <= 0;
      if (directionMatches && Math.abs(dx) < ATTACK_RANGE && dy < 90) {
        applyDamage(target, ATTACK_DAMAGE + fighter.damageBonus, fighter.id);
      }
    });
  };

  const applySkill = (fighter: InternalFighter) => {
    if (!fighter.alive || fighter.specialCharges <= 0) {
      return;
    }
    fighter.specialCharges -= 1;
    fightersRef.current.forEach((target) => {
      if (!target.alive || target.id === fighter.id) return;
      const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      if (distance < 180) {
        applyDamage(target, 20 + fighter.damageBonus * 0.5, fighter.id);
      }
    });
    addKillFeed(`${fighter.name} 释放了冲击波`);
  };

  const stepFighter = (fighter: InternalFighter, input: BattleRoyaleInputPayload, deltaSeconds: number) => {
    if (!fighter.alive) return;

    const canDoubleJump = fighter.movementSkills.includes('double_jump');
    const canDash = fighter.movementSkills.includes('dash');
    const canGlide = fighter.movementSkills.includes('glide');
    const canWallJump = fighter.movementSkills.includes('wall_jump');
    const justJump = input.jump && !fighter.jumpHeld;
    const justDash = input.dash && !fighter.dashHeld;
    const justAttack = input.attack && !fighter.attackHeld;
    const justSkill = input.skill && !fighter.skillHeld;

    fighter.attackCooldownMs = Math.max(0, fighter.attackCooldownMs - deltaSeconds * 1000);
    fighter.attackTimerMs = Math.max(0, fighter.attackTimerMs - deltaSeconds * 1000);
    fighter.dashCooldownMs = Math.max(0, fighter.dashCooldownMs - deltaSeconds * 1000);
    fighter.dashTimerMs = Math.max(0, fighter.dashTimerMs - deltaSeconds * 1000);

    if (input.left) {
      fighter.facing = -1;
    } else if (input.right) {
      fighter.facing = 1;
    }

    if (canDash && justDash && fighter.dashCooldownMs <= 0) {
        fighter.dashCooldownMs = DASH_COOLDOWN_MS;
        fighter.dashTimerMs = DASH_DURATION_MS;
        fighter.vx = fighter.facing * DASH_SPEED;
    }

    const moveAxis = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const baseSpeed = MOVE_SPEED * fighter.speedMultiplier;
    if (fighter.dashTimerMs <= 0) {
      fighter.vx = moveAxis * baseSpeed;
    }

    const touchedWall = fighter.x <= 0.5 || fighter.x >= MAP_WIDTH - FIGHTER_WIDTH - 0.5;
    const canUseExtraJump = canDoubleJump && fighter.jumpsUsed < 1;

    if (justJump) {
      if (fighter.onGround) {
        fighter.vy = -JUMP_FORCE;
        fighter.onGround = false;
        fighter.jumpsUsed = 0;
      } else if (canUseExtraJump) {
        fighter.vy = -DOUBLE_JUMP_FORCE;
        fighter.jumpsUsed += 1;
      } else if (canWallJump && touchedWall) {
        fighter.vy = -DOUBLE_JUMP_FORCE;
        fighter.vx = fighter.x <= 0 ? 420 : -420;
      }
    }

    fighter.vy += GRAVITY * deltaSeconds;
    if (canGlide && input.jump && fighter.vy > 220) {
      fighter.vy = Math.min(fighter.vy, 230);
    }

    const nextX = clamp(fighter.x + fighter.vx * deltaSeconds, 0, MAP_WIDTH - FIGHTER_WIDTH);
    const previousBottom = fighter.y + FIGHTER_HEIGHT;
    let nextY = fighter.y + fighter.vy * deltaSeconds;
    let landed = false;

    const floorY = FLOOR_Y - FIGHTER_HEIGHT;
    if (nextY >= floorY) {
      nextY = floorY;
      fighter.vy = 0;
      landed = true;
    }

    for (const platform of platforms) {
      const withinHorizontal =
        nextX + FIGHTER_WIDTH > platform.x && nextX < platform.x + platform.width;
      const landingFromAbove =
        previousBottom <= platform.y + 8 && nextY + FIGHTER_HEIGHT >= platform.y && fighter.vy >= 0;
      if (withinHorizontal && landingFromAbove) {
        nextY = platform.y - FIGHTER_HEIGHT;
        fighter.vy = 0;
        landed = true;
        break;
      }
    }

    fighter.x = nextX;
    fighter.y = nextY;
    fighter.onGround = landed;
    if (landed) {
      fighter.jumpsUsed = 0;
    }

    if (justAttack) {
      applyAttack(fighter);
    }
    if (justSkill) {
      applySkill(fighter);
    }

    pickupsRef.current.forEach((pickup) => {
      if (!pickup.active) return;
      const distance = Math.hypot(pickup.x - fighter.x, pickup.y - fighter.y);
      if (distance < 52) {
        applyPickup(fighter, pickup);
      }
    });

    fighter.jumpHeld = input.jump;
    fighter.attackHeld = input.attack;
    fighter.skillHeld = input.skill;
    fighter.dashHeld = input.dash;
  };

  const finalizeMatch = (payload?: any) => {
    if (matchEndedRef.current) {
      return;
    }
    matchEndedRef.current = true;
    const placements = (payload?.fighters as BattleRoyaleFighterView[] | undefined) ?? snapshotRef.current.fighters;
    const sorted = [...placements].sort((left, right) => {
      if (left.alive !== right.alive) return left.alive ? -1 : 1;
      if (left.kills !== right.kills) return right.kills - left.kills;
      return right.hp - left.hp;
    });
    const placement = Math.max(1, sorted.findIndex((fighter) => fighter.id === localFighterId) + 1);
    const local = sorted.find((fighter) => fighter.id === localFighterId);
    const winner = sorted[0];

    setResult({
      winnerId: winner?.id ?? null,
      winnerName: winner?.name ?? '无人幸存',
      placement,
      kills: local?.kills ?? 0,
      revived: Boolean(local?.hasRevived),
      survivedMs: snapshotRef.current.elapsedMs,
    });
    pushRoomNotice('本局已结算', 120000);
  };

  const maybeEndMatch = async () => {
    if (matchEndedRef.current) {
      return;
    }
    const fighters = Array.from(fightersRef.current.values());
    const alive = fighters.filter((fighter) => fighter.alive);
    const pendingRevives = fighters.filter((fighter) => fighter.quizPending);
    if (alive.length > 1 && elapsedMsRef.current < MATCH_MAX_MS) {
      return;
    }
    if (alive.length <= 1 && pendingRevives.length > 0 && elapsedMsRef.current < MATCH_MAX_MS) {
      return;
    }

    winnerIdRef.current = alive[0]?.id ?? null;
    const payload = {
      winnerId: winnerIdRef.current,
      fighters: buildSnapshot(
        tickRef.current,
        elapsedMsRef.current,
        getZoneState(elapsedMsRef.current),
        fightersRef.current,
        pickupsRef.current,
        killFeedRef.current,
        winnerIdRef.current,
        platforms,
      ).fighters,
    };

    finalizeMatch(payload);

    if (isHost) {
      wsRef.current?.sendMatchEnd(payload);
      if (!finishReportedRef.current) {
        finishReportedRef.current = true;
        const winnerHuman = alive[0]?.userId ?? null;
        await finishCurrentRoom(winnerHuman);
      }
    }
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const currentSnapshot = snapshotRef.current;
    const currentLocalView = currentSnapshot.fighters.find((fighter) => fighter.id === localFighterId);
    const currentAliveCount = currentSnapshot.fighters.filter((fighter) => fighter.alive).length;
    const currentElapsedSeconds = Math.floor(currentSnapshot.elapsedMs / 1000);
    const cameraX = clamp((currentLocalView?.x ?? zoneCenter.x) - VIEW_WIDTH / 2, 0, MAP_WIDTH - VIEW_WIDTH);
    const cameraY = clamp((currentLocalView?.y ?? zoneCenter.y) - VIEW_HEIGHT / 2, 0, MAP_HEIGHT - VIEW_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#102041');
    gradient.addColorStop(0.55, '#163459');
    gradient.addColorStop(1, '#1d3752');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    BACKGROUND_ORBS.forEach((orb) => {
      const screenX = orb.x - cameraX * 0.22;
      const screenY = orb.y - cameraY * 0.08;
      if (screenX < -orb.radius || screenX > VIEW_WIDTH + orb.radius) return;

      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, orb.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    FLOATING_CLOUDS.forEach((cloud) => {
      const screenX = cloud.x - cameraX * 0.34;
      const screenY = cloud.y - cameraY * 0.05;
      if (screenX < -cloud.width || screenX > VIEW_WIDTH + cloud.width) return;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, cloud.width * 0.3, cloud.height * 0.46, 0, 0, Math.PI * 2);
      ctx.ellipse(screenX + cloud.width * 0.18, screenY - cloud.height * 0.08, cloud.width * 0.24, cloud.height * 0.34, 0, 0, Math.PI * 2);
      ctx.ellipse(screenX - cloud.width * 0.18, screenY - cloud.height * 0.02, cloud.width * 0.22, cloud.height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    [
      { baseY: FLOOR_Y - 360, amplitude: 90, color: 'rgba(29, 78, 80, 0.26)', phase: 0.2 },
      { baseY: FLOOR_Y - 250, amplitude: 74, color: 'rgba(45, 95, 105, 0.28)', phase: 1.4 },
      { baseY: FLOOR_Y - 150, amplitude: 58, color: 'rgba(58, 112, 112, 0.24)', phase: 2.1 },
    ].forEach((band) => {
      ctx.beginPath();
      ctx.moveTo(0, MAP_HEIGHT);
      ctx.lineTo(0, band.baseY);
      for (let x = 0; x <= MAP_WIDTH; x += 720) {
        const y = band.baseY + Math.sin(x / 640 + band.phase) * band.amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = band.color;
      ctx.fill();
    });

    ctx.fillStyle = '#385d6f';
    ctx.fillRect(0, FLOOR_Y, MAP_WIDTH, MAP_HEIGHT - FLOOR_Y);
    ctx.fillStyle = '#7bd8b0';
    ctx.fillRect(0, FLOOR_Y, MAP_WIDTH, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, FLOOR_Y + 6, MAP_WIDTH, 6);

    GROUND_PROPS.forEach((prop) => {
      if (prop.x < cameraX - 80 || prop.x > cameraX + VIEW_WIDTH + 80) {
        return;
      }

      const baseY = FLOOR_Y - 4;
      ctx.strokeStyle = prop.stem;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(prop.x, baseY);
      ctx.lineTo(prop.x, baseY - prop.size);
      ctx.stroke();

      ctx.fillStyle = prop.cap;
      ctx.beginPath();
      ctx.ellipse(prop.x, baseY - prop.size - 4, prop.size * 0.55, prop.size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(prop.x - 4, baseY - prop.size - 8, 3, 0, Math.PI * 2);
      ctx.arc(prop.x + 5, baseY - prop.size - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    PLATFORM_LAYOUT.forEach((platform, index) => {
      if (platform.x + platform.width < cameraX - 120 || platform.x > cameraX + VIEW_WIDTH + 120) {
        return;
      }

      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 14);
      ctx.fillStyle = index % 2 === 0 ? '#4b7d88' : '#436f82';
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y - 6, platform.width, 12, 10);
      ctx.fillStyle = index % 3 === 0 ? '#8fe3bf' : '#7dd7b1';
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(platform.x + 12, platform.y + 6, platform.width - 24, 4);

      if (index % 4 === 0) {
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.width * 0.32, platform.y + platform.height);
        ctx.lineTo(platform.x + platform.width * 0.32, platform.y + platform.height + 24);
        ctx.stroke();
      }
    });

    const zone = currentSnapshot.zone;
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.72)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(248, 113, 113, 0.14)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    currentSnapshot.pickups.forEach((pickup) => {
      if (!pickup.active) return;
      const colors: Record<BrPickupType, string> = {
        med_kit: '#10b981',
        armor_vest: '#f59e0b',
        shield_core: '#60a5fa',
        damage_claw: '#ef4444',
        wind_boost: '#22d3ee',
        shockwave_charge: '#a855f7',
      };

      const symbols: Record<BrPickupType, string> = {
        med_kit: '补',
        armor_vest: '甲',
        shield_core: '盾',
        damage_claw: '爪',
        wind_boost: '速',
        shockwave_charge: '波',
      };

      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = `${colors[pickup.type]}33`;
      ctx.fill();
      ctx.fillStyle = colors[pickup.type];
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(symbols[pickup.type], pickup.x, pickup.y + 4);
    });

    currentSnapshot.fighters.forEach((fighter) => {
      const cacheKey = `${fighter.petType}-${fighter.petStage}`;
      const image = imageCacheRef.current[cacheKey];
      const resolvedType = migratePetType(fighter.petType as any);
      const fighterScale = Math.min(getPetVariantScale(resolvedType, 'world') * 1.08, 1.42);
      const width = Math.round((FIGHTER_WIDTH + 18) * fighterScale);
      const height = Math.round((FIGHTER_HEIGHT + 18) * fighterScale);
      const yOffset = getPetWorldYOffset(resolvedType);
      const spriteX = fighter.x + FIGHTER_WIDTH / 2 - width / 2;
      const spriteY = fighter.y + yOffset - (height - FIGHTER_HEIGHT) / 2 - 6;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.beginPath();
      ctx.ellipse(
        fighter.x + FIGHTER_WIDTH / 2,
        fighter.y + FIGHTER_HEIGHT + 10,
        Math.max(24, width * 0.32),
        Math.max(11, height * 0.12),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      if (!fighter.alive) {
        ctx.globalAlpha = 0.42;
      }

      if (canDrawImage(image)) {
        ctx.save();
        if (fighter.facing === -1) {
          ctx.translate(fighter.x + FIGHTER_WIDTH / 2, spriteY + height / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(image, -width / 2, -height / 2, width, height);
        } else {
          ctx.drawImage(image, spriteX, spriteY, width, height);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = fighter.isBot ? '#22c55e' : '#38bdf8';
        ctx.fillRect(fighter.x, fighter.y, FIGHTER_WIDTH, FIGHTER_HEIGHT);
      }
      ctx.globalAlpha = 1;

      const barX = fighter.x - 6;
      const barY = fighter.y - 18;
      ctx.fillStyle = 'rgba(15,23,42,0.9)';
      ctx.fillRect(barX, barY, 82, 8);
      ctx.fillStyle = fighter.alive ? '#22c55e' : '#64748b';
      ctx.fillRect(barX + 1, barY + 1, 80 * (fighter.hp / fighter.maxHp), 6);
      if (fighter.shield > 0) {
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(barX, barY - 6, Math.min(82, fighter.shield), 4);
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fighter.name, fighter.x + FIGHTER_WIDTH / 2, fighter.y - 26);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = fighter.isBot ? '#bbf7d0' : '#bae6fd';
      ctx.fillText(
        fighter.isBot ? `${fighter.difficulty ?? 'bot'} AI` : `击败 ${fighter.kills}`,
        fighter.x + FIGHTER_WIDTH / 2,
        fighter.y - 38,
      );
    });

    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(2, 6, 23, 0.66)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(20, 18, 260, 112, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('宠物生存乱斗', 38, 48);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`剩余 ${currentAliveCount} / ${currentSnapshot.fighters.length}`, 38, 76);
    ctx.fillText(`缩圈阶段 ${currentSnapshot.zone.phase}`, 38, 98);
    ctx.fillText(`用时 ${currentElapsedSeconds}s`, 38, 120);

    if (currentLocalView) {
      ctx.beginPath();
      ctx.roundRect(VIEW_WIDTH - 300, 18, 280, 132, 20);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.66)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(currentLocalView.name, VIEW_WIDTH - 280, 46);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`HP ${Math.round(currentLocalView.hp)}/${currentLocalView.maxHp}`, VIEW_WIDTH - 280, 72);
      ctx.fillText(`护盾 ${Math.round(currentLocalView.shield)}  护甲 ${Math.round(currentLocalView.armor)}`, VIEW_WIDTH - 280, 94);
      ctx.fillText(`击败 ${currentLocalView.kills}  冲击波 ${currentLocalView.specialCharges}`, VIEW_WIDTH - 280, 116);
    }
  };

  useEffect(() => {
    const loop = async (time: number) => {
      try {
        if (matchEndedRef.current) {
          drawFrame();
          return;
        }

        const previous = lastFrameTimeRef.current || time;
        const deltaMs = Math.min(time - previous, 100);
        const deltaSeconds = deltaMs / 1000;
        lastFrameTimeRef.current = time;
        elapsedMsRef.current += deltaMs;

        const localInput = readLocalInput();
        if (isHost) {
          const zone = getZoneState(elapsedMsRef.current);
          fightersRef.current.forEach((fighter) => {
            const input =
              fighter.id === localFighterId
                ? localInput
                : fighter.isBot
                  ? aiInputForFighter(fighter, fightersRef.current, pickupsRef.current, zone)
                  : remoteInputsRef.current[fighter.id] ?? createDefaultInput();

            fighter.input = input;
            stepFighter(fighter, input, deltaSeconds);

            if (distanceToZone(fighter, zone) > zone.radius) {
              applyDamage(fighter, SAFE_ZONE_DAMAGE * deltaSeconds, null);
            }
          });

          pickupsRef.current.forEach((pickup, index) => {
            if (!pickup.active && pickup.respawnAtMs <= elapsedMsRef.current) {
              const spawn = PICKUP_SPAWNS[index % PICKUP_SPAWNS.length];
              pickup.active = true;
              pickup.x = spawn.x;
              pickup.y = spawn.y;
            }
          });

          killFeedRef.current = killFeedRef.current.filter((item) => Date.now() - item.createdAt < 7000);
          tickRef.current += 1;
          snapshotRef.current = buildSnapshot(
            tickRef.current,
            elapsedMsRef.current,
            zone,
            fightersRef.current,
            pickupsRef.current,
            killFeedRef.current,
            winnerIdRef.current,
            platforms,
          );

          if (time - lastSnapshotSentRef.current > SNAPSHOT_INTERVAL_MS) {
            lastSnapshotSentRef.current = time;
            setSnapshot(snapshotRef.current);
            wsRef.current?.sendSnapshot(snapshotRef.current as any);
          }

          if (time - lastUiSyncRef.current > UI_SYNC_INTERVAL_MS) {
            lastUiSyncRef.current = time;
            setSnapshot(snapshotRef.current);
          }

          await maybeEndMatch();
        } else if (time - lastSnapshotSentRef.current > 60) {
          lastSnapshotSentRef.current = time;
          wsRef.current?.sendInput({ fighterId: localFighterId, input: localInput });
        }

        drawFrame();
      } catch (error) {
        console.error('[PvpBattleRoyaleArena] Frame loop failed:', error);
        pushRoomNotice('战场渲染出现波动，系统正在自动恢复。', 4200);
      } finally {
        animationRef.current = requestAnimationFrame(loop);
      }
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [finishCurrentRoom, isHost, localFighterId, platforms]);

  const handleSubmitQuiz = async (answers: string[]) => {
    if (!quizOffer) return;
    setSubmittingQuiz(true);

    if (isHost) {
      const questions = pendingQuizzesRef.current[quizOffer.fighterId] ?? quizOffer.questions;
      const success = evaluateBattleRoyaleQuiz(questions, answers);
      pendingQuizzesRef.current[quizOffer.fighterId] = [];
      resolveReviveOutcome(quizOffer.fighterId, success);
      return;
    }

    wsRef.current?.sendQuizSubmit({
      fighterId: quizOffer.fighterId,
      answers,
    });
  };

  const handleExit = () => {
    resetBattleRoyaleStore();
    onExit();
  };

  return (
    <div data-testid="br-arena" className="fixed inset-0 z-50 bg-slate-950">
      <MobileGameWrapper showController={true}>
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            className="h-full w-full max-h-screen object-contain"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <div className="pointer-events-auto grid gap-3 rounded-full border border-white/10 bg-slate-950/78 px-5 py-3 text-xs text-slate-200 shadow-[0_18px_50px_rgba(2,6,23,0.55)] md:grid-cols-4 md:gap-6">
              <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-cyan-300" /> 方向键/A D 移动</div>
              <div className="flex items-center gap-2"><Wind className="h-3.5 w-3.5 text-cyan-300" /> W/空格 跳跃，Shift 冲刺</div>
              <div className="flex items-center gap-2"><Swords className="h-3.5 w-3.5 text-cyan-300" /> J 近战，K 冲击波</div>
              <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-cyan-300" /> S 防御，圈外会持续掉血</div>
            </div>
          </div>

          <div className="absolute right-4 top-4 w-80 space-y-3">
            <div
              data-testid="br-arena-status"
              className="rounded-[24px] border border-white/10 bg-slate-950/72 p-4 text-sm text-slate-200 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 font-bold text-white">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                当前状态
              </div>
              <div className="mt-2 leading-6">{roomNotice}</div>
            </div>

            {liveSnapshot.killFeed.length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/72 p-4 text-sm text-slate-200 backdrop-blur-md">
                <div className="mb-2 flex items-center gap-2 font-bold text-white">
                  <Swords className="h-4 w-4 text-rose-300" />
                  击败播报
                </div>
                <div className="space-y-2">
                  {liveSnapshot.killFeed.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/[0.04] px-3 py-2">
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
              <div className="w-full max-w-2xl rounded-[32px] border border-amber-300/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(10,15,30,0.98))] p-8 shadow-[0_26px_90px_rgba(2,6,23,0.58)]">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-amber-100">
                  <Trophy className="h-3.5 w-3.5" />
                  Match Result
                </div>
                <h2 className="text-3xl font-black text-white">本局结算</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-sm text-slate-400">冠军</div>
                    <div className="mt-1 text-2xl font-bold text-white">{result.winnerName}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-sm text-slate-400">你的名次</div>
                    <div className="mt-1 text-2xl font-bold text-white">第 {result.placement} 名</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-sm text-slate-400">击败数</div>
                    <div className="mt-1 text-2xl font-bold text-white">{result.kills}</div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-sm text-slate-400">是否复活过</div>
                    <div className="mt-1 text-2xl font-bold text-white">{result.revived ? '是' : '否'}</div>
                  </div>
                </div>
                <div className="mt-6 text-sm leading-6 text-slate-300">
                  本局生存时长 {(result.survivedMs / 1000).toFixed(1)} 秒。建议下一局继续补充护盾核、防弹衣和冲击波，缩圈后近战收益会更高。
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExit}
                    className="rounded-full bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
                  >
                    返回开放大厅
                  </button>
                </div>
              </div>
            </div>
          )}

          <BattleRoyaleQuizModal
            isOpen={Boolean(quizOffer)}
            questions={quizOffer?.questions ?? []}
            submitting={submittingQuiz}
            onSubmit={handleSubmitQuiz}
          />
        </div>
      </MobileGameWrapper>
    </div>
  );
}
