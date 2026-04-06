'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Shield, Swords, Trophy, Users, Wifi, WifiOff, Wind } from 'lucide-react';

import MobileGameWrapper from '@/components/game/MobileGameWrapper';
import BattleRoyaleQuizModal from '@/components/game/pvp-br/BattleRoyaleQuizModal';
import { musicManager } from '@/lib/audio/musicManager';
import { getPetVariantScale, getPetWorldYOffset } from '@/lib/config/petArtworkProfiles';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { touchInputManager } from '@/lib/input/TouchInputManager';
import { migratePetType } from '@/lib/pet/migration';
import { buildBattleRoyaleQuiz, evaluateBattleRoyaleQuiz } from '@/lib/pvpBrQuestions';
import { BattleRoyaleWebSocketClient } from '@/lib/services/pvpBattleRoyaleWebSocket';
import { playSound } from '@/lib/soundEffects';
import { useAuthStore } from '@/store/authStore';
import { usePvpBattleRoyaleStore } from '@/store/pvpBattleRoyaleStore';
import type {
  BattleRoyaleDifficulty,
  BattleRoyaleEffectView,
  BattleRoyaleFighterView,
  BattleRoyaleInputPayload,
  BattleRoyalePickupView,
  BattleRoyalePlatform,
  BattleRoyaleProjectileView,
  BattleRoyaleQuizOffer,
  BattleRoyaleQuizQuestion,
  BattleRoyaleResult,
  BattleRoyaleRoom,
  BattleRoyaleSnapshot,
  BattleRoyaleWeaponPickupView,
  BrPickupType,
} from '@/types/pvp-br';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const BASE_MAP_WIDTH = 8600;
const BASE_MAP_HEIGHT = 3200;
const BASE_FLOOR_Y = 2860;
const MAP_WIDTH = 5600;
const MAP_HEIGHT = 2480;
const FLOOR_Y = Math.round((BASE_FLOOR_Y / BASE_MAP_HEIGHT) * MAP_HEIGHT);
const X_SCALE = MAP_WIDTH / BASE_MAP_WIDTH;
const Y_SCALE = MAP_HEIGHT / BASE_MAP_HEIGHT;
const DISTANCE_SCALE = (X_SCALE + Y_SCALE) / 2;
const FIGHTER_WIDTH = 68;
const FIGHTER_HEIGHT = 78;
const FIGHTER_HP = 120;
const GRAVITY = 2280;
const MOVE_SPEED = 430;
const JUMP_FORCE = 1120;
const DOUBLE_JUMP_FORCE = 1060;
const DASH_SPEED = 1240;
const DASH_DURATION_MS = 165;
const DASH_COOLDOWN_MS = 1000;
const ATTACK_RANGE = 68;
const ATTACK_VERTICAL_TOLERANCE = 92;
const ATTACK_DAMAGE = 18;
const ATTACK_COOLDOWN_MS = 460;
const ATTACK_ACTIVE_MS = 200;
const WEAPON_THROW_SPEED = 1260;
const WEAPON_THROW_MAX_DISTANCE = 560;
const WEAPON_THROW_COOLDOWN_MS = 360;
const WEAPON_PROJECTILE_DAMAGE = 24;
const WEAPON_PICKUP_RADIUS = 58;
const WEAPON_PICKUP_GRACE_MS = 650;
const WEAPON_MODEL_LENGTH = 50;
const WEAPON_HOLD_OFFSET_X = 34;
const HIT_FLASH_MS = 220;
const SWING_MS = 280;
const EFFECT_TTL_SLASH_MS = 260;
const EFFECT_TTL_HIT_MS = 240;
const EFFECT_TTL_SHOCKWAVE_MS = 280;
const EFFECT_TTL_DASH_MS = 220;
const SAFE_ZONE_DAMAGE_BY_PHASE = [10, 14, 20, 30, 42, 58, 78] as const;
const MATCH_MAX_MS = 360000;
const PICKUP_RESPAWN_MS = 12000;
const QUIZ_PENDING_TIMEOUT_MS = 15000;
const SNAPSHOT_INTERVAL_MS = 80;
const UI_SYNC_INTERVAL_MS = 66;
const INPUT_SEND_INTERVAL_MS = 34;
const INPUT_KEEPALIVE_INTERVAL_MS = 90;
const MAX_RENDER_EXTRAPOLATION_MS = 220;
const LOCAL_INPUT_LEAD_MS = 104;
const MAX_LOCAL_INPUT_LEAD_MS = 240;
const LOCAL_FIGHTER_SMOOTHING_RATE = 36;
const REMOTE_FIGHTER_SMOOTHING_RATE = 20;
const PROJECTILE_SMOOTHING_RATE = 16;
const POSITION_SNAP_DISTANCE = 300;
const LOCAL_PREDICTION_BLEND_MIN = 0.92;
const LOCAL_PREDICTION_BLEND_MAX = 0.985;
const LOCAL_PREDICTION_HARD_CORRECTION_DISTANCE = 320;
const CANVAS_FONT_FAMILY = '"Microsoft YaHei", "Noto Sans SC", "PingFang SC", sans-serif';
const IS_DEV = process.env.NODE_ENV === 'development';
const BR_QA_DEBUG =
  process.env.NEXT_PUBLIC_BR_QA_DEBUG === 'true' || process.env.NEXT_PUBLIC_QA_DEBUG === 'true';

function shouldExposeQaDebug() {
  if (IS_DEV || BR_QA_DEBUG) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.localStorage.getItem('br-qa-debug') === 'true' ||
      window.localStorage.getItem('qa-debug') === 'true'
    );
  } catch {
    return false;
  }
}
const MAX_ACTIVE_PICKUPS = 6;
const OPENING_SPAWN_SAFE_MARGIN = 400;
const OPENING_SPAWN_FLOOR_CUTOFF = FLOOR_Y - 160;
const REVIVE_SPAWN_SAFE_MARGIN = 180;

const scaleX = (value: number) => Math.round(value * X_SCALE);
const scaleY = (value: number) => Math.round(value * Y_SCALE);
const scaleDistance = (value: number) => Math.max(1, Math.round(value * DISTANCE_SCALE));
const scaleWidth = (value: number) => Math.max(48, Math.round(value * X_SCALE));
const scaleHeight = (value: number) => Math.max(18, Math.round(value * Y_SCALE));

const BASE_ZONE_PHASES = [
  { until: 45000, radius: 3400 },
  { until: 100000, radius: 2860 },
  { until: 155000, radius: 2280 },
  { until: 220000, radius: 1700 },
  { until: 280000, radius: 1180 },
  { until: 330000, radius: 760 },
  { until: MATCH_MAX_MS, radius: 360 },
] as const;

const ZONE_PHASES: ReadonlyArray<{ until: number; radius: number }> = BASE_ZONE_PHASES.map((phase, index) => ({
  ...phase,
  radius: Math.max(index === BASE_ZONE_PHASES.length - 1 ? 300 : 420, scaleDistance(phase.radius)),
}));

interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  minX: number;
  maxX: number;
}

interface PickupSpawnZone {
  id: string;
  x: number;
  y: number;
  minX: number;
  maxX: number;
}

function scalePlatform(platform: BattleRoyalePlatform): BattleRoyalePlatform {
  return {
    ...platform,
    x: scaleX(platform.x),
    y: scaleY(platform.y),
    width: scaleWidth(platform.width),
    height: scaleHeight(platform.height),
    travel: platform.travel ? scaleDistance(platform.travel) : platform.travel,
    bounceBoost: platform.bounceBoost ? Math.round(platform.bounceBoost * Math.sqrt(Y_SCALE)) : platform.bounceBoost,
  };
}

function scaleSpawnPoint(point: SpawnPoint): SpawnPoint {
  return {
    ...point,
    x: scaleX(point.x),
    y: scaleY(point.y),
    minX: scaleX(point.minX),
    maxX: scaleX(point.maxX),
  };
}

function scalePickupSpawn(point: PickupSpawnZone): PickupSpawnZone {
  return {
    ...point,
    x: scaleX(point.x),
    y: scaleY(point.y),
    minX: scaleX(point.minX),
    maxX: scaleX(point.maxX),
  };
}

const BASE_PLATFORM_LAYOUT_ALL: BattleRoyalePlatform[] = [
  { id: 'p-ground-a', x: 220, y: 2570, width: 560, height: 28 },
  { id: 'p-ground-b', x: 920, y: 2350, width: 420, height: 28 },
  { id: 'p-ground-c', x: 1500, y: 2130, width: 360, height: 28 },
  { id: 'p-ground-d', x: 1960, y: 2490, width: 520, height: 28 },
  { id: 'p-ground-e', x: 2580, y: 2240, width: 420, height: 28 },
  { id: 'p-mid-a', x: 3100, y: 1820, width: 340, height: 28 },
  { id: 'p-mid-b', x: 3560, y: 1570, width: 300, height: 28 },
  { id: 'p-ground-f', x: 3950, y: 2350, width: 560, height: 28 },
  { id: 'p-mid-c', x: 4600, y: 2080, width: 360, height: 28 },
  { id: 'p-mid-d', x: 5030, y: 1830, width: 320, height: 28 },
  { id: 'p-ground-g', x: 5480, y: 2490, width: 520, height: 28 },
  { id: 'p-ground-h', x: 6120, y: 2250, width: 420, height: 28 },
  { id: 'p-mid-e', x: 6600, y: 1930, width: 360, height: 28 },
  { id: 'p-mid-f', x: 7050, y: 1660, width: 320, height: 28 },
  { id: 'p-ground-i', x: 7480, y: 2400, width: 520, height: 28 },
  { id: 'p-ground-j', x: 8060, y: 2140, width: 360, height: 28 },
  { id: 'p-high-a', x: 1120, y: 1870, width: 280, height: 28 },
  { id: 'p-high-b', x: 1670, y: 1610, width: 260, height: 28 },
  { id: 'p-high-c', x: 2260, y: 1410, width: 260, height: 28 },
  { id: 'p-high-d', x: 2820, y: 1180, width: 240, height: 28 },
  { id: 'p-high-e', x: 4700, y: 1390, width: 280, height: 28 },
  { id: 'p-high-f', x: 5280, y: 1180, width: 240, height: 28 },
  { id: 'p-high-g', x: 5860, y: 1490, width: 280, height: 28 },
  { id: 'p-high-h', x: 6880, y: 1320, width: 300, height: 28 },
  { id: 'p-top-a', x: 7520, y: 1020, width: 240, height: 28 },
  { id: 'p-move-h-1', x: 1380, y: 1980, width: 220, height: 26, kind: 'moving', axis: 'x', travel: 210, speed: 0.88, phase: 0.15 },
  { id: 'p-move-v-1', x: 3380, y: 2080, width: 190, height: 26, kind: 'moving', axis: 'y', travel: 240, speed: 0.95, phase: 0.42 },
  { id: 'p-move-h-2', x: 4920, y: 1720, width: 200, height: 26, kind: 'moving', axis: 'x', travel: 260, speed: 1.02, phase: 0.62 },
  { id: 'p-move-v-2', x: 6420, y: 1540, width: 190, height: 26, kind: 'moving', axis: 'y', travel: 210, speed: 0.86, phase: 0.25 },
  { id: 'p-bounce-a', x: 4240, y: 2460, width: 200, height: 24, kind: 'bounce', bounceBoost: 1140 },
  { id: 'p-bounce-b', x: 7180, y: 2250, width: 180, height: 24, kind: 'bounce', bounceBoost: 1180 },
  { id: 'p-step-a0', x: 420, y: 2710, width: 220, height: 26 },
  { id: 'p-step-a1', x: 1120, y: 2470, width: 220, height: 26 },
  { id: 'p-step-b0', x: 1860, y: 2300, width: 220, height: 26 },
  { id: 'p-step-b1', x: 2480, y: 2050, width: 220, height: 26 },
  { id: 'p-step-c0', x: 3320, y: 2580, width: 220, height: 26 },
  { id: 'p-step-c1', x: 4180, y: 2250, width: 240, height: 26 },
  { id: 'p-step-c2', x: 4710, y: 1980, width: 220, height: 26 },
  { id: 'p-step-d0', x: 5660, y: 2600, width: 220, height: 26 },
  { id: 'p-step-d1', x: 6360, y: 2310, width: 220, height: 26 },
  { id: 'p-step-d2', x: 7080, y: 2040, width: 220, height: 26 },
  { id: 'p-step-e0', x: 7780, y: 1850, width: 220, height: 26 },
  { id: 'p-move-h-3', x: 2140, y: 1730, width: 240, height: 26, kind: 'moving', axis: 'x', travel: 180, speed: 0.94, phase: 0.78 },
  { id: 'p-move-v-3', x: 5900, y: 1840, width: 220, height: 26, kind: 'moving', axis: 'y', travel: 190, speed: 0.92, phase: 0.53 },
  { id: 'p-bounce-c', x: 1250, y: 2625, width: 200, height: 24, kind: 'bounce', bounceBoost: 1240 },
  { id: 'p-bounce-d', x: 5160, y: 2380, width: 200, height: 24, kind: 'bounce', bounceBoost: 1260 },
  { id: 'p-bounce-e', x: 7440, y: 2090, width: 180, height: 24, kind: 'bounce', bounceBoost: 1280 },
];

const RETAINED_PLATFORM_IDS = new Set<string>([
  'p-ground-a', 'p-ground-b', 'p-ground-c', 'p-ground-d', 'p-ground-e',
  'p-ground-f', 'p-ground-g', 'p-ground-h', 'p-ground-i', 'p-ground-j',
  'p-mid-a', 'p-mid-b', 'p-mid-c', 'p-mid-d', 'p-mid-e',
  'p-high-a', 'p-high-b', 'p-high-c', 'p-high-e', 'p-high-g',
  'p-move-h-1', 'p-move-v-2',
  'p-bounce-a', 'p-bounce-c', 'p-bounce-d',
  'p-step-a0', 'p-step-a1', 'p-step-b0', 'p-step-b1',
  'p-step-c0', 'p-step-c1', 'p-step-d0', 'p-step-d1', 'p-step-e0',
]);

const BASE_PLATFORM_LAYOUT: BattleRoyalePlatform[] = BASE_PLATFORM_LAYOUT_ALL.filter((platform) =>
  RETAINED_PLATFORM_IDS.has(platform.id),
);

const PLATFORM_LAYOUT: BattleRoyalePlatform[] = BASE_PLATFORM_LAYOUT.map(scalePlatform);
const PLATFORM_BY_ID = new Map(PLATFORM_LAYOUT.map((platform) => [platform.id, platform]));

function getPlatformById(id: string): BattleRoyalePlatform {
  const platform = PLATFORM_BY_ID.get(id);
  if (!platform) {
    throw new Error(`Missing battle royale platform: ${id}`);
  }
  return platform;
}

const PLATFORM_SPAWN_IDS = [
  'p-ground-a', 'p-ground-b', 'p-ground-d', 'p-ground-f', 'p-ground-g', 'p-ground-i', 'p-ground-j',
  'p-mid-a', 'p-mid-c', 'p-mid-e',
  'p-high-a', 'p-high-c', 'p-high-g',
  'p-step-a1', 'p-step-b1', 'p-step-c1', 'p-step-d1', 'p-step-e0',
];
const PICKUP_PLATFORM_IDS = [
  'p-ground-b', 'p-ground-c', 'p-ground-e', 'p-ground-f', 'p-ground-h', 'p-ground-j',
  'p-mid-a', 'p-mid-c', 'p-mid-e',
  'p-high-b', 'p-high-e',
  'p-move-h-1', 'p-move-v-2',
  'p-bounce-a', 'p-bounce-c', 'p-bounce-d',
  'p-step-a0', 'p-step-b0', 'p-step-c0', 'p-step-d0', 'p-step-e0',
];

const PRIMARY_SPAWN_POINTS: SpawnPoint[] = PLATFORM_SPAWN_IDS.map((platformId) => {
  const platform = getPlatformById(platformId);
  const padding = Math.min(96, Math.max(28, Math.round(platform.width * 0.18)));
  return {
    id: `spawn-${platform.id}`,
    x: platform.x + platform.width / 2 - FIGHTER_WIDTH / 2,
    y: platform.y - 94,
    minX: platform.x + padding,
    maxX: platform.x + platform.width - padding - FIGHTER_WIDTH,
  };
});

const SECONDARY_SPAWN_POINTS: SpawnPoint[] = [
  { id: 'spawn-floor-a', x: 180, y: BASE_FLOOR_Y - 96, minX: 90, maxX: 360 },
  { id: 'spawn-floor-b', x: 1630, y: BASE_FLOOR_Y - 96, minX: 1480, maxX: 1800 },
  { id: 'spawn-floor-c', x: 3300, y: BASE_FLOOR_Y - 96, minX: 3160, maxX: 3460 },
  { id: 'spawn-floor-d', x: 5000, y: BASE_FLOOR_Y - 96, minX: 4850, maxX: 5180 },
  { id: 'spawn-floor-e', x: 6750, y: BASE_FLOOR_Y - 96, minX: 6590, maxX: 6930 },
  { id: 'spawn-floor-f', x: 8220, y: BASE_FLOOR_Y - 96, minX: 8040, maxX: 8390 },
].map(scaleSpawnPoint);

const SPAWN_POINTS = [...PRIMARY_SPAWN_POINTS, ...SECONDARY_SPAWN_POINTS];

const PICKUP_SPAWNS: PickupSpawnZone[] = [
  ...PICKUP_PLATFORM_IDS.map((platformId) => {
    const platform = getPlatformById(platformId);
    const padding = Math.min(80, Math.max(24, Math.round(platform.width * 0.16)));
    return {
      id: `pickup-${platform.id}`,
      x: platform.x + platform.width / 2,
      y: platform.y - 34,
      minX: platform.x + padding,
      maxX: platform.x + platform.width - padding,
    };
  }),
  { id: 'pickup-floor-a', x: 640, y: BASE_FLOOR_Y - 44, minX: 420, maxX: 900 },
  { id: 'pickup-floor-b', x: 2410, y: BASE_FLOOR_Y - 44, minX: 2160, maxX: 2640 },
  { id: 'pickup-floor-c', x: 4300, y: BASE_FLOOR_Y - 44, minX: 4080, maxX: 4530 },
  { id: 'pickup-floor-d', x: 6210, y: BASE_FLOOR_Y - 44, minX: 5980, maxX: 6440 },
  { id: 'pickup-floor-e', x: 8010, y: BASE_FLOOR_Y - 44, minX: 7800, maxX: 8240 },
].map(scalePickupSpawn);

const BACKGROUND_ORBS = [
  { x: 520, y: 260, radius: 130, color: 'rgba(103, 232, 249, 0.08)' },
  { x: 3020, y: 300, radius: 160, color: 'rgba(45, 212, 191, 0.07)' },
  { x: 5930, y: 280, radius: 170, color: 'rgba(244, 114, 182, 0.06)' },
].map((orb) => ({
  ...orb,
  x: scaleX(orb.x),
  y: scaleY(orb.y),
  radius: scaleDistance(orb.radius),
}));

const FLOATING_CLOUDS = [
  { x: 420, y: 280, width: 220, height: 72 },
  { x: 2660, y: 240, width: 210, height: 68 },
  { x: 4210, y: 430, width: 280, height: 92 },
  { x: 7080, y: 400, width: 260, height: 86 },
].map((cloud) => ({
  ...cloud,
  x: scaleX(cloud.x),
  y: scaleY(cloud.y),
  width: scaleWidth(cloud.width),
  height: scaleHeight(cloud.height),
}));

const GROUND_PROPS = [
  { x: 380, stem: '#94d2bd', cap: '#fda4af', size: 22 },
  { x: 1710, stem: '#86efac', cap: '#f9a8d4', size: 24 },
  { x: 2480, stem: '#a7f3d0', cap: '#fdba74', size: 20 },
  { x: 4230, stem: '#86efac', cap: '#fcd34d', size: 18 },
  { x: 5010, stem: '#67e8f9', cap: '#fda4af', size: 24 },
  { x: 6620, stem: '#93c5fd', cap: '#c4b5fd', size: 22 },
  { x: 8140, stem: '#67e8f9', cap: '#f9a8d4', size: 24 },
].map((prop) => ({
  ...prop,
  x: scaleX(prop.x),
  size: Math.max(14, scaleDistance(prop.size)),
}));

const PICKUP_WEIGHT_TABLE: Array<{
  type: BrPickupType;
  earlyWeight: number;
  midWeight: number;
  lateWeight: number;
  maxConcurrent: number;
}> = [
  { type: 'med_kit', earlyWeight: 24, midWeight: 18, lateWeight: 12, maxConcurrent: 4 },
  { type: 'armor_vest', earlyWeight: 22, midWeight: 16, lateWeight: 10, maxConcurrent: 4 },
  { type: 'shield_core', earlyWeight: 20, midWeight: 16, lateWeight: 10, maxConcurrent: 4 },
  { type: 'damage_claw', earlyWeight: 10, midWeight: 14, lateWeight: 18, maxConcurrent: 3 },
  { type: 'wind_boost', earlyWeight: 10, midWeight: 14, lateWeight: 18, maxConcurrent: 3 },
  { type: 'shockwave_charge', earlyWeight: 8, midWeight: 12, lateWeight: 16, maxConcurrent: 2 },
];

const zoneCenter = {
  x: MAP_WIDTH / 2,
  y: MAP_HEIGHT * 0.56,
};

const STATIC_GROUND_PLATFORM: BattleRoyalePlatform = {
  id: 'floor',
  x: 0,
  y: FLOOR_Y,
  width: MAP_WIDTH,
  height: MAP_HEIGHT - FLOOR_Y,
  kind: 'static',
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
  damageDealt: number;
  speedMultiplier: number;
  ageGroup: string;
  jumpHeld: boolean;
  attackHeld: boolean;
  skillHeld: boolean;
  dashHeld: boolean;
  throwHeld: boolean;
  lastAttackerId: string | null;
  eliminatedAtMs: number | null;
  weaponCooldownMs: number;
  weaponReady: boolean;
  swingMs: number;
  hitFlashMs: number;
  roamTargetX: number;
  roamTargetY: number;
  roamExpireAtMs: number;
  combatAnchorX: number;
  combatAnchorExpireAtMs: number;
  combatTargetId: string | null;
  nextJumpPulseAtMs: number;
  botThinkAtMs: number;
  moveCommitDirection: -1 | 0 | 1;
  moveCommitUntilMs: number;
  stuckMs: number;
  lastSampleX: number;
  lastSampleY: number;
}

interface InternalPickup extends BattleRoyalePickupView {
  respawnAtMs: number;
}

interface InternalProjectile extends BattleRoyaleProjectileView {
  vx: number;
  vy: number;
  traveled: number;
  maxDistance: number;
  active: boolean;
}

interface InternalWeaponPickup extends BattleRoyaleWeaponPickupView {
  active: boolean;
  ttlMs: number;
  pickupReadyAtMs: number;
}

interface InternalEffect extends BattleRoyaleEffectView {
  ttlMs: number;
}

interface KillFeedItem {
  id: string;
  text: string;
  createdAt: number;
}

type BattleRoyaleZoneState = BattleRoyaleSnapshot['zone'];

interface PvpBattleRoyaleArenaProps {
  room: BattleRoyaleRoom;
  onExit: () => void;
}

type IncomingBattleRoyaleSnapshot = Omit<BattleRoyaleSnapshot, 'platforms' | 'zone'> &
  Partial<Pick<BattleRoyaleSnapshot, 'platforms' | 'zone'>>;

const PICKUP_COLORS: Record<BrPickupType, string> = {
  med_kit: '#10b981',
  armor_vest: '#f59e0b',
  shield_core: '#60a5fa',
  damage_claw: '#ef4444',
  wind_boost: '#22d3ee',
  shockwave_charge: '#a855f7',
};

const PICKUP_SYMBOLS: Record<BrPickupType, string> = {
  med_kit: '血',
  armor_vest: '甲',
  shield_core: '盾',
  damage_claw: '爪',
  wind_boost: '速',
  shockwave_charge: '波',
};

const ARENA_SOUND_MAP = {
  swing: 'player_attack',
  throw: 'pvp_kick',
  hit: 'enemy_hit',
  pickup: 'collect_gem',
  shockwave: 'boss_wave',
  bounce: 'player_jump',
  dash: 'pvp_block',
} as const;

const AI_TUNING = {
  easy: {
    engageDistance: 230,
    lootScoreFloor: 0.42,
    lootRadius: 780,
    roamMinMs: 2600,
    roamMaxMs: 4300,
    thinkMinMs: 250,
    thinkMaxMs: 360,
    jumpPulseMinMs: 520,
    jumpPulseMaxMs: 780,
    moveDeadZone: 66,
    attackChance: 0.34,
    throwChance: 0.08,
    skillChance: 0.06,
    dashChance: 0.12,
    dashMinDistance: 380,
    guardHpThreshold: 30,
    speedMultiplier: 0.94,
    lowHpFocus: 0.18,
  },
  medium: {
    engageDistance: 320,
    lootScoreFloor: 0.26,
    lootRadius: 680,
    roamMinMs: 2200,
    roamMaxMs: 3600,
    thinkMinMs: 190,
    thinkMaxMs: 290,
    jumpPulseMinMs: 440,
    jumpPulseMaxMs: 660,
    moveDeadZone: 56,
    attackChance: 0.56,
    throwChance: 0.16,
    skillChance: 0.12,
    dashChance: 0.22,
    dashMinDistance: 280,
    guardHpThreshold: 38,
    speedMultiplier: 1,
    lowHpFocus: 0.36,
  },
  hard: {
    engageDistance: 460,
    lootScoreFloor: 0.16,
    lootRadius: 620,
    roamMinMs: 1800,
    roamMaxMs: 3000,
    thinkMinMs: 140,
    thinkMaxMs: 220,
    jumpPulseMinMs: 380,
    jumpPulseMaxMs: 560,
    moveDeadZone: 44,
    attackChance: 0.76,
    throwChance: 0.26,
    skillChance: 0.18,
    dashChance: 0.34,
    dashMinDistance: 220,
    guardHpThreshold: 48,
    speedMultiplier: 1.06,
    lowHpFocus: 0.6,
  },
} satisfies Record<
  BattleRoyaleDifficulty,
  {
    engageDistance: number;
    lootScoreFloor: number;
    lootRadius: number;
    roamMinMs: number;
    roamMaxMs: number;
    thinkMinMs: number;
    thinkMaxMs: number;
    jumpPulseMinMs: number;
    jumpPulseMaxMs: number;
    moveDeadZone: number;
    attackChance: number;
    throwChance: number;
    skillChance: number;
    dashChance: number;
    dashMinDistance: number;
    guardHpThreshold: number;
    speedMultiplier: number;
    lowHpFocus: number;
  }
>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerpValue(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function smoothingFactor(deltaSeconds: number, rate: number): number {
  return 1 - Math.exp(-deltaSeconds * rate);
}

function canDrawImage(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

function fighterCenterX(fighter: Pick<BattleRoyaleFighterView, 'x'>) {
  return fighter.x + FIGHTER_WIDTH / 2;
}

function fighterCenterY(fighter: Pick<BattleRoyaleFighterView, 'y'>) {
  return fighter.y + FIGHTER_HEIGHT * 0.45;
}

function fighterDistance(left: Pick<BattleRoyaleFighterView, 'x' | 'y'>, right: Pick<BattleRoyaleFighterView, 'x' | 'y'>) {
  return Math.hypot(fighterCenterX(left) - fighterCenterX(right), fighterCenterY(left) - fighterCenterY(right));
}

function fighterVerticalGap(left: Pick<BattleRoyaleFighterView, 'y'>, right: Pick<BattleRoyaleFighterView, 'y'>) {
  return Math.abs(fighterCenterY(left) - fighterCenterY(right));
}

function fighterHorizontalGap(attacker: Pick<BattleRoyaleFighterView, 'x' | 'facing'>, target: Pick<BattleRoyaleFighterView, 'x'>) {
  return attacker.facing === 1 ? target.x - (attacker.x + FIGHTER_WIDTH) : attacker.x - (target.x + FIGHTER_WIDTH);
}

function targetWithinStrikeLane(attacker: Pick<BattleRoyaleFighterView, 'x' | 'y' | 'facing'>, target: Pick<BattleRoyaleFighterView, 'x' | 'y'>, range = ATTACK_RANGE) {
  const forwardGap = fighterHorizontalGap(attacker, target);
  return forwardGap <= range && forwardGap >= -FIGHTER_WIDTH * 0.38 && fighterVerticalGap(attacker, target) <= ATTACK_VERTICAL_TOLERANCE;
}

function resolveDynamicPlatform(platform: BattleRoyalePlatform, elapsedMs: number): BattleRoyalePlatform {
  if (platform.kind !== 'moving' || !platform.axis || !platform.travel || !platform.speed) {
    return platform;
  }

  const phase = platform.phase ?? 0;
  const wave = Math.sin((elapsedMs / 1000) * platform.speed + phase * Math.PI * 2);
  if (platform.axis === 'x') {
    return {
      ...platform,
      x: platform.x + wave * platform.travel,
    };
  }

  return {
    ...platform,
    y: platform.y + wave * platform.travel,
  };
}

function createPlatforms(elapsedMs = 0): BattleRoyalePlatform[] {
  return [STATIC_GROUND_PLATFORM, ...PLATFORM_LAYOUT.map((platform) => resolveDynamicPlatform(platform, elapsedMs))];
}

function getZoneState(elapsedMs: number): BattleRoyaleZoneState {
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
    throwWeapon: false,
    skill: false,
    guard: false,
    jumpPressed: false,
    dashPressed: false,
    attackPressed: false,
    throwPressed: false,
    skillPressed: false,
  };
}

function createInputPulseState(): Required<Pick<
  BattleRoyaleInputPayload,
  'jumpPressed' | 'dashPressed' | 'attackPressed' | 'throwPressed' | 'skillPressed'
>> {
  return {
    jumpPressed: false,
    dashPressed: false,
    attackPressed: false,
    throwPressed: false,
    skillPressed: false,
  };
}

function randomBetween(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function hashRoomSeed(room: BattleRoyaleRoom): number {
  const seedSource = `${room.id}:${room.started_at ?? room.created_at}:${room.match_seed ?? 'pending'}`;
  let hash = 2166136261;
  for (let index = 0; index < seedSource.length; index += 1) {
    hash ^= seedSource.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleList<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function spawnPointCenter(point: SpawnPoint): number {
  return (point.minX + point.maxX) / 2 + FIGHTER_WIDTH / 2;
}

function rollSpawnPoint(point: SpawnPoint): { x: number; y: number } {
  return {
    x: clamp(randomBetween(point.minX, point.maxX), 0, MAP_WIDTH - FIGHTER_WIDTH),
    y: point.y,
  };
}

function rollSpawnPointWithRandom(point: SpawnPoint, rng: () => number): { x: number; y: number } {
  return {
    x: clamp(point.minX + rng() * Math.max(point.maxX - point.minX, 0), 0, MAP_WIDTH - FIGHTER_WIDTH),
    y: point.y,
  };
}

function rollPickupSpawn(zone: PickupSpawnZone): { x: number; y: number } {
  return {
    x: randomBetween(zone.minX, zone.maxX),
    y: zone.y - randomBetween(0, 8),
  };
}

function rollPickupSpawnWithRandom(zone: PickupSpawnZone, rng: () => number): { x: number; y: number } {
  return {
    x: zone.minX + rng() * Math.max(zone.maxX - zone.minX, 0),
    y: zone.y - rng() * 8,
  };
}

function zoneDamagePerSecond(zone: BattleRoyaleZoneState, elapsedMs: number): number {
  const phaseIndex = clamp(zone.phase - 1, 0, SAFE_ZONE_DAMAGE_BY_PHASE.length - 1);
  const lateMatchBoost = Math.max(0, Math.floor(Math.max(0, elapsedMs - 180000) / 45000)) * 6;
  return SAFE_ZONE_DAMAGE_BY_PHASE[phaseIndex] + lateMatchBoost;
}

function fighterIdForUser(userId: number): string {
  return `human-${userId}`;
}

function buildSafeSpawnPoints(zone: BattleRoyaleZoneState) {
  const distanceToZone = (point: SpawnPoint) => {
    const centerX = spawnPointCenter(point);
    const centerY = point.y + FIGHTER_HEIGHT * 0.5;
    return Math.hypot(centerX - zone.centerX, centerY - zone.centerY);
  };
  const sortedFallbackPoints = [...SPAWN_POINTS].sort((left, right) => distanceToZone(left) - distanceToZone(right));
  const elevatedSafePoints = PRIMARY_SPAWN_POINTS.filter((point) => {
    return (
      point.y <= OPENING_SPAWN_FLOOR_CUTOFF &&
      distanceToZone(point) < zone.radius - OPENING_SPAWN_SAFE_MARGIN
    );
  });
  const bufferedSafePoints = SPAWN_POINTS.filter((point) => distanceToZone(point) < zone.radius - 320);
  const candidatePool = elevatedSafePoints.length >= 6
    ? [...elevatedSafePoints, ...bufferedSafePoints]
    : bufferedSafePoints.length > 0
      ? bufferedSafePoints
      : sortedFallbackPoints;
  const seenIds = new Set<string>();
  const uniqueCandidates = candidatePool.filter((point) => {
    if (seenIds.has(point.id)) {
      return false;
    }
    seenIds.add(point.id);
    return true;
  });

  if (uniqueCandidates.length > 0) {
    return uniqueCandidates;
  }

  return sortedFallbackPoints.slice(0, Math.min(8, sortedFallbackPoints.length));
}

function buildSafePickupZones(zone: BattleRoyaleZoneState) {
  const distanceToZone = (spawnZone: PickupSpawnZone) => Math.hypot(spawnZone.x - zone.centerX, spawnZone.y - zone.centerY);
  const sortedZones = [...PICKUP_SPAWNS].sort((left, right) => distanceToZone(left) - distanceToZone(right));
  const elevatedSafeZones = PICKUP_SPAWNS.filter((spawnZone) => {
    return (
      spawnZone.y <= FLOOR_Y - 120 &&
      distanceToZone(spawnZone) < zone.radius - 240
    );
  });
  if (elevatedSafeZones.length >= 8) {
    return [...elevatedSafeZones].sort((left, right) => distanceToZone(left) - distanceToZone(right));
  }

  const safeZones = PICKUP_SPAWNS.filter((spawnZone) => {
    return distanceToZone(spawnZone) < zone.radius - 180;
  });
  if (safeZones.length >= 8) {
    return [...safeZones].sort((left, right) => distanceToZone(left) - distanceToZone(right));
  }
  return sortedZones.slice(0, Math.min(Math.max(8, safeZones.length), sortedZones.length));
}

function pickupWeightForPhase(
  entry: (typeof PICKUP_WEIGHT_TABLE)[number],
  phase: number,
) {
  if (phase <= 2) {
    return entry.earlyWeight;
  }
  if (phase <= 4) {
    return entry.midWeight;
  }
  return entry.lateWeight;
}

function rollPickupType(
  phase: number,
  activePickups: Array<Pick<InternalPickup, 'type' | 'active'>>,
  rng: () => number = Math.random,
): BrPickupType {
  const activeCounts = activePickups.reduce<Partial<Record<BrPickupType, number>>>((counts, pickup) => {
    if (!pickup.active) {
      return counts;
    }
    counts[pickup.type] = (counts[pickup.type] ?? 0) + 1;
    return counts;
  }, {});

  const weightedEntries = PICKUP_WEIGHT_TABLE.map((entry) => {
    const activeCount = activeCounts[entry.type] ?? 0;
    if (activeCount >= entry.maxConcurrent) {
      return null;
    }

    const duplicatePenalty = activeCount === 0 ? 1 : activeCount === 1 ? 0.72 : 0.46;
    return {
      type: entry.type,
      weight: pickupWeightForPhase(entry, phase) * duplicatePenalty,
    };
  }).filter((entry): entry is { type: BrPickupType; weight: number } => Boolean(entry && entry.weight > 0));

  if (weightedEntries.length === 0) {
    return 'med_kit';
  }

  const totalWeight = weightedEntries.reduce((total, entry) => total + entry.weight, 0);
  let remainingWeight = rng() * totalWeight;
  for (const entry of weightedEntries) {
    remainingWeight -= entry.weight;
    if (remainingWeight <= 0) {
      return entry.type;
    }
  }

  return weightedEntries[weightedEntries.length - 1].type;
}

function buildSpawnQueue(seed: number) {
  const rng = createSeededRandom(seed);
  const remaining = [...buildSafeSpawnPoints(getZoneState(0))];
  if (remaining.length === 0) {
    return [];
  }

  const queue: Array<{ x: number; y: number }> = [];

  if (remaining.length >= 2) {
    let bestLeftIndex = 0;
    let bestRightIndex = 1;
    let bestPairScore = -1;

    for (let leftIndex = 0; leftIndex < remaining.length - 1; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < remaining.length; rightIndex += 1) {
        const left = remaining[leftIndex];
        const right = remaining[rightIndex];
        const horizontalSpread = Math.abs(spawnPointCenter(left) - spawnPointCenter(right));
        const verticalSpread = Math.abs(left.y - right.y);
        const midpointOffset = Math.abs((spawnPointCenter(left) + spawnPointCenter(right)) * 0.5 - zoneCenter.x);
        const edgeBias =
          Math.abs(spawnPointCenter(left) - zoneCenter.x) +
          Math.abs(spawnPointCenter(right) - zoneCenter.x);
        const pairScore =
          horizontalSpread * 1.45 +
          verticalSpread * 0.24 +
          edgeBias * 0.18 -
          midpointOffset * 0.08 +
          rng() * 60;

        if (pairScore > bestPairScore) {
          bestPairScore = pairScore;
          bestLeftIndex = leftIndex;
          bestRightIndex = rightIndex;
        }
      }
    }

    const firstPairIndices = [bestLeftIndex, bestRightIndex].sort((left, right) => right - left);
    const seededPair = firstPairIndices.map((index) => remaining.splice(index, 1)[0]).reverse();
    seededPair.forEach((point) => {
      queue.push(rollSpawnPointWithRandom(point, rng));
    });
  } else {
    queue.push(rollSpawnPointWithRandom(remaining.splice(0, 1)[0], rng));
  }

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -1;
    remaining.forEach((point, index) => {
      const minDistance = queue.reduce((lowest, placed) => {
        const distance = Math.hypot(
          spawnPointCenter(point) - (placed.x + FIGHTER_WIDTH / 2),
          (point.y - placed.y) * 1.18,
        );
        return Math.min(lowest, distance);
      }, Number.POSITIVE_INFINITY);
      const lateralSpread = Math.abs(spawnPointCenter(point) - zoneCenter.x) * 0.14;
      const highGroundBonus = Math.max(0, FLOOR_Y - point.y) * 0.09;
      const score = minDistance * 1.22 + lateralSpread + highGroundBonus + rng() * 140;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    queue.push(rollSpawnPointWithRandom(remaining.splice(bestIndex, 1)[0], rng));
  }

  return queue;
}

function pickBotSkills(difficulty: BattleRoyaleDifficulty): string[] {
  if (difficulty === 'easy') return ['double_jump'];
  if (difficulty === 'hard') return ['double_jump', 'dash', 'glide', 'wall_jump'];
  if (difficulty === 'medium') return ['double_jump', 'dash', 'glide'];
  return ['double_jump'];
}

function createInitialFighters(room: BattleRoyaleRoom): Map<string, InternalFighter> {
  const fighters = new Map<string, InternalFighter>();
  const spawnQueue = buildSpawnQueue(hashRoomSeed(room));
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
      damageDealt: 0,
      speedMultiplier: 1,
      ageGroup: human.age_group,
      jumpHeld: false,
      attackHeld: false,
      skillHeld: false,
      dashHeld: false,
      throwHeld: false,
      lastAttackerId: null,
      eliminatedAtMs: null,
      weaponCooldownMs: 0,
      weaponReady: true,
      swingMs: 0,
      hitFlashMs: 0,
      roamTargetX: spawn.x,
      roamTargetY: spawn.y,
      roamExpireAtMs: 0,
      combatAnchorX: spawn.x,
      combatAnchorExpireAtMs: 0,
      combatTargetId: null,
      nextJumpPulseAtMs: 0,
      botThinkAtMs: 0,
      moveCommitDirection: 0,
      moveCommitUntilMs: 0,
      stuckMs: 0,
      lastSampleX: spawn.x,
      lastSampleY: spawn.y,
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
      damageDealt: 0,
      speedMultiplier: AI_TUNING[bot.difficulty].speedMultiplier,
      ageGroup: 'primary-upper',
      jumpHeld: false,
      attackHeld: false,
      skillHeld: false,
      dashHeld: false,
      throwHeld: false,
      lastAttackerId: null,
      eliminatedAtMs: null,
      weaponCooldownMs: 0,
      weaponReady: true,
      swingMs: 0,
      hitFlashMs: 0,
      roamTargetX: spawn.x,
      roamTargetY: spawn.y,
      roamExpireAtMs: 0,
      combatAnchorX: spawn.x,
      combatAnchorExpireAtMs: 0,
      combatTargetId: null,
      nextJumpPulseAtMs: 0,
      botThinkAtMs: 0,
      moveCommitDirection: 0,
      moveCommitUntilMs: 0,
      stuckMs: 0,
      lastSampleX: spawn.x,
      lastSampleY: spawn.y,
    });
  });

  return fighters;
}

function createInitialPickups(room?: BattleRoyaleRoom): InternalPickup[] {
  if (room) {
    return createInitialPickupsForRoom(room);
  }
  const seededPickups: InternalPickup[] = [];
  return shuffleList(PICKUP_SPAWNS).slice(0, MAX_ACTIVE_PICKUPS).map((spawnZone, index) => {
    const rolled = rollPickupSpawn(spawnZone);
    const pickup: InternalPickup = {
      id: `pickup-${index}`,
      type: rollPickupType(1, seededPickups),
      x: rolled.x,
      y: rolled.y,
      active: true,
      respawnAtMs: 0,
    };
    seededPickups.push(pickup);
    return pickup;
  });
}

function createInitialPickupsForRoom(room: BattleRoyaleRoom): InternalPickup[] {
  const rng = createSeededRandom(hashRoomSeed(room) ^ 0x9e3779b9);
  const candidateZones = buildSafePickupZones(getZoneState(0));
  const zones = [...candidateZones]
    .sort(() => rng() - 0.5)
    .slice(0, Math.min(MAX_ACTIVE_PICKUPS, candidateZones.length));

  const seededPickups: InternalPickup[] = [];
  return zones.map((spawnZone, index) => {
    const rolled = rollPickupSpawnWithRandom(spawnZone, rng);
    const pickup: InternalPickup = {
      id: `pickup-${index}`,
      type: rollPickupType(1, seededPickups, rng),
      x: rolled.x,
      y: rolled.y,
      active: true,
      respawnAtMs: 0,
    };
    seededPickups.push(pickup);
    return pickup;
  });
}

function distanceToZone(fighter: InternalFighter, zone: BattleRoyaleZoneState): number {
  const centerX = fighter.x + FIGHTER_WIDTH / 2;
  const centerY = fighter.y + FIGHTER_HEIGHT / 2;
  return Math.hypot(centerX - zone.centerX, centerY - zone.centerY);
}

function spawnPositionForRevive(zone: BattleRoyaleZoneState): { x: number; y: number } {
  const safeSpawns = buildSafeSpawnPoints(zone)
    .filter(
      (point) =>
        Math.hypot(spawnPointCenter(point) - zone.centerX, point.y - zone.centerY) < zone.radius - REVIVE_SPAWN_SAFE_MARGIN,
    )
    .sort(
      (left, right) =>
        Math.hypot(spawnPointCenter(left) - zone.centerX, left.y - zone.centerY) -
        Math.hypot(spawnPointCenter(right) - zone.centerX, right.y - zone.centerY),
    );

  if (safeSpawns.length > 0) {
    const candidatePool = safeSpawns.slice(0, Math.min(6, safeSpawns.length));
    const candidate = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    return rollSpawnPoint(candidate);
  }

  return {
    x: clamp(zone.centerX - FIGHTER_WIDTH / 2, 0, MAP_WIDTH - FIGHTER_WIDTH),
    y: zone.centerY - 120,
  };
}

function buildSnapshot(
  tick: number,
  elapsedMs: number,
  zone: BattleRoyaleZoneState,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  projectiles: InternalProjectile[],
  weapons: InternalWeaponPickup[],
  effects: InternalEffect[],
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
      reviveUsed: fighter.reviveUsed,
      quizPending: fighter.quizPending,
      damageDealt: fighter.damageDealt,
      survivedMs: fighter.alive ? elapsedMs : fighter.eliminatedAtMs ?? elapsedMs,
      specialCharges: fighter.specialCharges,
      buffs: fighter.buffs,
      weaponReady: fighter.weaponReady,
      swingMs: fighter.swingMs,
      hitFlashMs: fighter.hitFlashMs,
    })),
    pickups: pickups.map((pickup) => ({
      id: pickup.id,
      type: pickup.type,
      x: pickup.x,
      y: pickup.y,
      active: pickup.active,
    })),
    projectiles: projectiles
      .filter((projectile) => projectile.active)
      .map((projectile) => ({
        id: projectile.id,
        ownerId: projectile.ownerId,
        x: projectile.x,
        y: projectile.y,
        rotation: projectile.rotation,
        active: projectile.active,
      })),
    weapons: weapons
      .filter((weapon) => weapon.active)
      .map((weapon) => ({
        id: weapon.id,
        ownerId: weapon.ownerId,
        x: weapon.x,
        y: weapon.y,
        active: weapon.active,
      })),
    effects: effects
      .filter((effect) => effect.ttlMs > 0)
      .map((effect) => ({
        id: effect.id,
        kind: effect.kind,
        x: effect.x,
        y: effect.y,
        radius: effect.radius,
        facing: effect.facing,
        ttlMs: effect.ttlMs,
      })),
    killFeed: killFeed.slice(-6),
    winnerId,
    platforms,
  };
}

function buildSnapshotRoster(room: BattleRoyaleRoom) {
  const roster = new Map<
    string,
    {
      userId?: number;
      name: string;
      petType: string;
      petStage: number;
      isBot: boolean;
      difficulty?: BattleRoyaleDifficulty;
    }
  >();

  room.humans.forEach((human) => {
    roster.set(fighterIdForUser(human.user_id), {
      userId: human.user_id,
      name: human.username,
      petType: human.pet_type,
      petStage: human.pet_stage ?? 3,
      isBot: false,
    });
  });

  room.bots.forEach((bot) => {
    roster.set(bot.id, {
      name: bot.name,
      petType: bot.pet_type,
      petStage: bot.pet_stage ?? 3,
      isBot: true,
      difficulty: bot.difficulty,
    });
  });

  return roster;
}

function normalizeIncomingSnapshot(incoming: IncomingBattleRoyaleSnapshot, room: BattleRoyaleRoom): BattleRoyaleSnapshot {
  const elapsedMs = incoming.elapsedMs ?? 0;
  const roster = buildSnapshotRoster(room);

  return {
    tick: incoming.tick ?? 0,
    elapsedMs,
    zone: incoming.zone ?? getZoneState(elapsedMs),
    fighters: (incoming.fighters ?? []).map((fighter) => {
      const rosterEntry = roster.get(fighter.id);
      return {
        id: fighter.id,
        userId: fighter.userId ?? rosterEntry?.userId,
        name: fighter.name ?? rosterEntry?.name ?? 'Player',
        petType: fighter.petType ?? rosterEntry?.petType ?? 'code_kitty',
        petStage: fighter.petStage ?? rosterEntry?.petStage ?? 1,
        x: fighter.x,
        y: fighter.y,
        vx: fighter.vx,
        vy: fighter.vy,
        hp: fighter.hp,
        maxHp: fighter.maxHp ?? FIGHTER_HP,
        shield: fighter.shield,
        armor: fighter.armor,
        kills: fighter.kills,
        alive: fighter.alive,
        facing: fighter.facing,
        isBot: fighter.isBot ?? rosterEntry?.isBot ?? false,
        difficulty: fighter.difficulty ?? rosterEntry?.difficulty,
        hasRevived: fighter.hasRevived,
        reviveUsed: fighter.reviveUsed,
        quizPending: fighter.quizPending,
        damageDealt: fighter.damageDealt ?? 0,
        survivedMs: fighter.survivedMs ?? elapsedMs,
        specialCharges: fighter.specialCharges ?? 0,
        buffs: { ...(fighter.buffs ?? {}) },
        weaponReady: fighter.weaponReady ?? true,
        swingMs: fighter.swingMs ?? 0,
        hitFlashMs: fighter.hitFlashMs ?? 0,
      };
    }),
    pickups: (incoming.pickups ?? []).map((pickup) => ({ ...pickup })),
    killFeed: (incoming.killFeed ?? []).map((item) => ({ ...item })),
    winnerId: incoming.winnerId ?? null,
    platforms: createPlatforms(elapsedMs),
    projectiles: (incoming.projectiles ?? []).map((projectile) => ({ ...projectile })),
    weapons: (incoming.weapons ?? []).map((weapon) => ({ ...weapon })),
    effects: (incoming.effects ?? []).map((effect) => ({ ...effect })),
  };
}

function createTransportSnapshot(snapshot: BattleRoyaleSnapshot): Record<string, unknown> {
  return {
    tick: snapshot.tick,
    elapsedMs: Math.round(snapshot.elapsedMs),
    zone: {
      ...snapshot.zone,
      centerX: Math.round(snapshot.zone.centerX),
      centerY: Math.round(snapshot.zone.centerY),
      radius: Math.round(snapshot.zone.radius),
      nextShrinkAtMs: Math.round(snapshot.zone.nextShrinkAtMs),
    },
    fighters: snapshot.fighters.map((fighter) => ({
      id: fighter.id,
      x: Math.round(fighter.x),
      y: Math.round(fighter.y),
      vx: Math.round(fighter.vx),
      vy: Math.round(fighter.vy),
      hp: Math.round(fighter.hp),
      shield: Math.round(fighter.shield),
      armor: Math.round(fighter.armor),
      kills: fighter.kills,
      alive: fighter.alive,
      facing: fighter.facing,
      hasRevived: fighter.hasRevived,
      reviveUsed: fighter.reviveUsed,
      quizPending: fighter.quizPending,
      damageDealt: Math.round(fighter.damageDealt ?? 0),
      survivedMs: Math.round(fighter.survivedMs ?? snapshot.elapsedMs),
      specialCharges: fighter.specialCharges,
      buffs: Object.fromEntries(
        Object.entries(fighter.buffs ?? {}).filter(([, stacks]) => typeof stacks === 'number' && stacks > 0),
      ),
      weaponReady: fighter.weaponReady,
      swingMs: Math.round(fighter.swingMs),
      hitFlashMs: Math.round(fighter.hitFlashMs),
    })),
    pickups: snapshot.pickups.map((pickup) => ({
      id: pickup.id,
      type: pickup.type,
      x: Math.round(pickup.x),
      y: Math.round(pickup.y),
      active: pickup.active,
    })).filter((pickup) => pickup.active),
    killFeed: snapshot.killFeed.slice(-1),
    winnerId: snapshot.winnerId,
    projectiles: snapshot.projectiles.filter((projectile) => projectile.active).slice(-3).map((projectile) => ({
      id: projectile.id,
      ownerId: projectile.ownerId,
      x: Math.round(projectile.x),
      y: Math.round(projectile.y),
      rotation: Math.round(projectile.rotation * 100) / 100,
      active: projectile.active,
    })),
    weapons: snapshot.weapons.filter((weapon) => weapon.active).slice(-3).map((weapon) => ({
      id: weapon.id,
      ownerId: weapon.ownerId,
      x: Math.round(weapon.x),
      y: Math.round(weapon.y),
      active: weapon.active,
    })),
    effects: snapshot.effects.slice(-2).map((effect) => ({
      id: effect.id,
      kind: effect.kind,
      x: Math.round(effect.x),
      y: Math.round(effect.y),
      radius: Math.round(effect.radius),
      facing: effect.facing,
      ttlMs: Math.round(effect.ttlMs),
    })),
  } as Record<string, unknown>;
}

function cloneInternalFighter(fighter: InternalFighter): InternalFighter {
  return {
    ...fighter,
    input: { ...fighter.input },
    movementSkills: [...fighter.movementSkills],
    buffs: { ...fighter.buffs },
  };
}

function deriveDamageBonusFromBuffs(buffs: Partial<Record<BrPickupType, number>>): number {
  return clamp((buffs.damage_claw ?? 0) * 5, 0, 18);
}

function deriveSpeedMultiplierFromBuffs(buffs: Partial<Record<BrPickupType, number>>): number {
  return clamp(1 + (buffs.wind_boost ?? 0) * 0.12, 1, 1.45);
}

function buildLootHudLine(fighter: BattleRoyaleFighterView): string {
  const damageBonus = deriveDamageBonusFromBuffs(fighter.buffs);
  const speedBonusPercent = Math.max(0, Math.round((deriveSpeedMultiplierFromBuffs(fighter.buffs) - 1) * 100));
  return `利爪 +${damageBonus}  风压 +${speedBonusPercent}%  L 冲击波 x${fighter.specialCharges}`;
}

function hydrateFightersFromSnapshot(room: BattleRoyaleRoom, snapshot: BattleRoyaleSnapshot): Map<string, InternalFighter> {
  const fighters = createInitialFighters(room);

  snapshot.fighters.forEach((view) => {
    const existing = fighters.get(view.id);
    if (!existing) {
      return;
    }

    existing.x = view.x;
    existing.y = view.y;
    existing.vx = view.vx;
    existing.vy = view.vy;
    existing.hp = view.hp;
    existing.maxHp = view.maxHp ?? existing.maxHp;
    existing.shield = view.shield;
    existing.armor = view.armor;
    existing.kills = view.kills;
    existing.alive = view.alive;
    existing.facing = view.facing;
    existing.hasRevived = view.hasRevived;
    existing.reviveUsed = view.reviveUsed ?? existing.reviveUsed;
    existing.quizPending = view.quizPending ?? false;
    existing.damageDealt = view.damageDealt ?? existing.damageDealt;
    existing.specialCharges = view.specialCharges ?? existing.specialCharges;
    existing.buffs = { ...(view.buffs ?? {}) };
    existing.damageBonus = deriveDamageBonusFromBuffs(view.buffs ?? {});
    existing.speedMultiplier = existing.isBot
      ? AI_TUNING[existing.difficulty ?? 'medium'].speedMultiplier
      : deriveSpeedMultiplierFromBuffs(view.buffs ?? {});
    existing.weaponReady = view.weaponReady ?? existing.weaponReady;
    existing.swingMs = view.swingMs ?? 0;
    existing.hitFlashMs = view.hitFlashMs ?? 0;
    existing.eliminatedAtMs = view.alive ? null : view.survivedMs ?? snapshot.elapsedMs;
    existing.attackTimerMs = view.swingMs;
    existing.weaponCooldownMs = view.weaponReady ? 0 : WEAPON_THROW_COOLDOWN_MS;
    existing.onGround = false;
    existing.jumpHeld = false;
    existing.attackHeld = false;
    existing.skillHeld = false;
    existing.dashHeld = false;
    existing.throwHeld = false;
    existing.lastAttackerId = null;
    existing.roamTargetX = view.x;
    existing.roamTargetY = view.y;
    existing.roamExpireAtMs = snapshot.elapsedMs;
    existing.combatAnchorX = view.x;
    existing.combatAnchorExpireAtMs = snapshot.elapsedMs;
    existing.combatTargetId = null;
    existing.nextJumpPulseAtMs = snapshot.elapsedMs;
    existing.botThinkAtMs = snapshot.elapsedMs;
    existing.moveCommitDirection = 0;
    existing.moveCommitUntilMs = snapshot.elapsedMs;
    existing.stuckMs = 0;
    existing.lastSampleX = view.x;
    existing.lastSampleY = view.y;
  });

  return fighters;
}

function hydratePickupsFromSnapshot(snapshot: BattleRoyaleSnapshot): InternalPickup[] {
  return snapshot.pickups.map((pickup) => ({
    ...pickup,
    respawnAtMs: pickup.active ? 0 : snapshot.elapsedMs + PICKUP_RESPAWN_MS,
  }));
}

function hydrateWeaponsFromSnapshot(snapshot: BattleRoyaleSnapshot): InternalWeaponPickup[] {
  return snapshot.weapons.map((weapon) => ({
    ...weapon,
    active: weapon.active,
    ttlMs: Math.max(12000, MATCH_MAX_MS - snapshot.elapsedMs),
    pickupReadyAtMs: snapshot.elapsedMs,
  }));
}

function hydrateEffectsFromSnapshot(snapshot: BattleRoyaleSnapshot): InternalEffect[] {
  return snapshot.effects.map((effect) => ({
    ...effect,
    ttlMs: effect.ttlMs,
  }));
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

function selectZoneReturnPoint(zone: BattleRoyaleZoneState) {
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

  if (snapshot.elapsedMs < 5000) {
    return '开局先搜护甲、护盾和武器，再往安全区走。';
  }

  if (localFighter && !localFighter.alive && !localFighter.hasRevived) {
    return '你已倒下，答对 3 题可半血复活 1 次。';
  }

  if (localFighter) {
    const localDistanceToZone = Math.hypot(
      localFighter.x + FIGHTER_WIDTH / 2 - snapshot.zone.centerX,
      localFighter.y + FIGHTER_HEIGHT / 2 - snapshot.zone.centerY,
    );

    if (localDistanceToZone > snapshot.zone.radius + 120) {
      return '你在圈外，先回安全区。';
    }

    if (localFighter.hp < localFighter.maxHp * 0.35) {
      return '血量低，先找医疗包、护盾核或防弹衣。';
    }

    if (!localFighter.weaponReady) {
      return '武器已脱手，先捡回武器再近身。';
    }

    if (localFighter.specialCharges > 0) {
      return '有冲击波了，按 L 可以逼退近身目标。';
    }

    if (deriveDamageBonusFromBuffs(localFighter.buffs) > 0) {
      return '利爪生效，近战和投掷更疼。';
    }

    if (deriveSpeedMultiplierFromBuffs(localFighter.buffs) > 1 && localDistanceToZone < snapshot.zone.radius - 220) {
      return '风压生效，可以抢点或追残血。';
    }
  }

  if (aliveCount <= 3) {
    return '决赛圈到了，盯紧高台和移动平台。';
  }

  if (snapshot.zone.phase >= 5) {
    return '后期缩圈很快，先守安全区高台。';
  }

  return '先靠近安全区，再用 J/K/L 找机会。';
}

function connectionLabel(wsConnected: boolean, latencyMs: number) {
  if (!wsConnected) {
    return '重连';
  }
  if (latencyMs >= 180) {
    return '波动';
  }
  return '稳定';
}

function pickBotRoamPoint(
  fighter: InternalFighter,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  zone: BattleRoyaleZoneState,
) {
  const candidates = SPAWN_POINTS
    .map((point) => rollSpawnPoint(point))
    .filter((point) => Math.hypot(point.x - zone.centerX, point.y - zone.centerY) < Math.max(280, zone.radius - 180));

  if (candidates.length === 0) {
    return {
      x: clamp(zone.centerX - FIGHTER_WIDTH / 2, 0, MAP_WIDTH - FIGHTER_WIDTH),
      y: zone.centerY - 120,
    };
  }

  const scoredCandidates = candidates
    .map((point) => {
      const travelDistance = Math.hypot(point.x - fighter.x, point.y - fighter.y);
      const crowdPenalty = Array.from(fighters.values()).reduce((penalty, other) => {
        if (!other.alive || other.id === fighter.id) return penalty;
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        return penalty + Math.max(0, 260 - distance);
      }, 0);
      const nearbyPickupBonus = pickups.some(
        (pickup) => pickup.active && Math.hypot(point.x - pickup.x, point.y - pickup.y) < 280,
      )
        ? 160
        : 0;
      const highGroundBonus = fighter.difficulty === 'easy' ? 0 : Math.max(0, FLOOR_Y - point.y) * 0.08;
      const travelBonus = travelDistance * 0.2;
      const minimumStride = fighter.difficulty === 'easy' ? 320 : 220;
      const shortHopPenalty = travelDistance < minimumStride ? (minimumStride - travelDistance) * 1.35 : 0;
      const score = nearbyPickupBonus + highGroundBonus + travelBonus + Math.random() * 90 - crowdPenalty - shortHopPenalty;
      return { point, score, travelDistance };
    })
    .sort((left, right) => right.score - left.score);

  const preferred = scoredCandidates.find(({ travelDistance }) => travelDistance > (fighter.difficulty === 'easy' ? 280 : 180));
  return (preferred ?? scoredCandidates[0]).point;
}

function combatAnchorSpacingRange(difficulty: BattleRoyaleDifficulty | undefined) {
  if (difficulty === 'easy') {
    return { min: 168, max: 262, holdMinMs: 1700, holdMaxMs: 2400 };
  }
  if (difficulty === 'hard') {
    return { min: 118, max: 198, holdMinMs: 1200, holdMaxMs: 1760 };
  }
  return { min: 144, max: 226, holdMinMs: 1450, holdMaxMs: 2050 };
}

function aiInputForFighter(
  fighter: InternalFighter,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  weapons: InternalWeaponPickup[],
  zone: BattleRoyaleZoneState,
  elapsedMs: number,
): BattleRoyaleInputPayload {
  const tuning = AI_TUNING[fighter.difficulty ?? 'medium'];
  const isDecisionFrame =
    elapsedMs >= fighter.botThinkAtMs || fighter.stuckMs > 420 || !fighter.alive || fighter.quizPending;
  if (!isDecisionFrame) {
    return {
      ...fighter.input,
      jumpPressed: false,
      dashPressed: false,
      attackPressed: false,
      throwPressed: false,
      skillPressed: false,
    };
  }

  const candidates = Array.from(fighters.values()).filter((target) => target.id !== fighter.id && target.alive);
  const aliveCount = candidates.length + 1;
  const nearestEnemy = candidates
    .map((target) => {
      const distance = fighterDistance(fighter, target);
      const verticalPenalty = fighterVerticalGap(fighter, target) * 0.22;
      const lowHpBonus = (target.maxHp - target.hp) * tuning.lowHpFocus;
      const zonePenalty = distanceToZone(target, zone) > zone.radius - 90 ? 70 : 0;
      return {
        target,
        score: distance + verticalPenalty + zonePenalty - lowHpBonus,
      };
    })
    .sort((left, right) => left.score - right.score)[0]?.target;

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

  const availableWeapon = weapons
    .filter((weapon) => weapon.active)
    .sort(
      (left, right) =>
        Math.hypot(left.x - fighterCenterX(fighter), left.y - fighterCenterY(fighter)) -
        Math.hypot(right.x - fighterCenterX(fighter), right.y - fighterCenterY(fighter)),
    )[0];

  const isOutsideZone = distanceToZone(fighter, zone) > zone.radius - 140;
  const recoveryTarget = selectZoneReturnPoint(zone);
  const shouldRecoverWeapon = !fighter.weaponReady && !!availableWeapon;
  const enemyDistance = nearestEnemy ? fighterDistance(fighter, nearestEnemy) : Number.POSITIVE_INFINITY;
  const shouldSkirmish =
    !!nearestEnemy &&
    (
      fighter.difficulty !== 'easy' ||
      aliveCount <= 5 ||
      fighter.hp < 88 ||
      nearestEnemy.hp < 52 ||
      enemyDistance < tuning.engageDistance
    );
  const combatTarget = shouldSkirmish ? nearestEnemy : null;
  const strikeGap = combatTarget ? fighterHorizontalGap(fighter, combatTarget) : Number.POSITIVE_INFINITY;
  const strikeVerticalGap = combatTarget ? fighterVerticalGap(fighter, combatTarget) : Number.POSITIVE_INFINITY;

  if (combatTarget) {
    const { min, max, holdMinMs, holdMaxMs } = combatAnchorSpacingRange(fighter.difficulty);
    const targetChanged = fighter.combatTargetId !== combatTarget.id;
    const closeQuarterPivot = strikeGap < ATTACK_RANGE + 24 && strikeVerticalGap < 120;
    if (targetChanged || elapsedMs >= fighter.combatAnchorExpireAtMs || (closeQuarterPivot && fighter.stuckMs > 220)) {
      const previousSign = fighter.combatAnchorX <= combatTarget.x ? -1 : 1;
      const fallbackSign = fighter.x <= combatTarget.x ? -1 : 1;
      let anchorSign = targetChanged ? fallbackSign : previousSign;
      if ((fighter.hp < fighter.maxHp * 0.32 || !fighter.weaponReady) && strikeGap < 138) {
        anchorSign = fallbackSign;
      }
      fighter.combatTargetId = combatTarget.id;
      fighter.combatAnchorX = clamp(
        combatTarget.x + anchorSign * randomBetween(min, max),
        0,
        MAP_WIDTH - FIGHTER_WIDTH,
      );
      fighter.combatAnchorExpireAtMs = elapsedMs + randomBetween(holdMinMs, holdMaxMs);
    }
  } else {
    fighter.combatTargetId = null;
    fighter.combatAnchorExpireAtMs = 0;
  }

  const shouldRefreshRoamTarget =
    elapsedMs >= fighter.roamExpireAtMs ||
    Math.hypot(fighter.roamTargetX - fighter.x, fighter.roamTargetY - fighter.y) < 120;
  if (shouldRefreshRoamTarget) {
    const roamPoint = pickBotRoamPoint(fighter, fighters, pickups, zone);
    fighter.roamTargetX = roamPoint.x;
    fighter.roamTargetY = roamPoint.y;
    fighter.roamExpireAtMs = elapsedMs + randomBetween(tuning.roamMinMs, tuning.roamMaxMs);
  }

  const wantsLoot = Boolean(
    activePickup &&
      activePickup.score > tuning.lootScoreFloor &&
      Math.hypot(activePickup.pickup.x - fighter.x, activePickup.pickup.y - fighter.y) <
        tuning.lootRadius &&
      (!combatTarget || enemyDistance > ATTACK_RANGE + 36) &&
      fighter.hp > 20,
  );

  const crowdOffset = candidates.reduce((offset, target) => {
    const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    if (distance <= 0 || distance > 200) return offset;
    return offset + ((fighter.x - target.x) / distance) * (200 - distance) * 0.8;
  }, 0);

  const targetX = (isOutsideZone
    ? recoveryTarget.x
    : shouldRecoverWeapon
      ? availableWeapon!.x
      : wantsLoot
      ? activePickup!.pickup.x
      : combatTarget
        ? fighter.combatAnchorX
        : fighter.roamTargetX) + clamp(crowdOffset, -220, 220);
  const targetY = isOutsideZone
    ? recoveryTarget.y
    : shouldRecoverWeapon
      ? availableWeapon!.y
      : wantsLoot
      ? activePickup!.pickup.y
      : combatTarget?.y ?? fighter.roamTargetY;

  const dx = targetX - fighter.x;
  const dy = targetY - fighter.y;
  const canSecondJump = fighter.movementSkills.includes('double_jump') && fighter.jumpsUsed < 1;
  const shouldEscapeJump = fighter.stuckMs > (fighter.difficulty === 'easy' ? 320 : 250) && (fighter.onGround || canSecondJump);
  const shouldClimb = dy < -108 && (fighter.onGround || canSecondJump || fighter.stuckMs > 320);
  const shouldHopForward =
    fighter.onGround &&
    Math.abs(dx) > 180 &&
    Math.abs(dx) < 460 &&
    (
      dy < -96 ||
      (isOutsideZone && Math.abs(dx) > 320) ||
      (combatTarget !== null && strikeVerticalGap > 136 && fighter.stuckMs > 220) ||
      fighter.stuckMs > 460
    );
  const jumpIntent = shouldEscapeJump || shouldClimb || shouldHopForward;
  const canTriggerJumpPulse =
    elapsedMs >= fighter.nextJumpPulseAtMs &&
    (!fighter.jumpHeld || fighter.onGround || canSecondJump || (fighter.movementSkills.includes('wall_jump') && Math.abs(dx) > 40));
  const shouldPulseJump = jumpIntent && canTriggerJumpPulse;
  if (shouldPulseJump) {
    fighter.nextJumpPulseAtMs =
      elapsedMs +
      randomBetween(
        fighter.onGround ? tuning.jumpPulseMinMs : tuning.jumpPulseMinMs + 60,
        fighter.onGround ? tuning.jumpPulseMaxMs : tuning.jumpPulseMaxMs + 80,
      );
  } else if (!jumpIntent && fighter.nextJumpPulseAtMs > elapsedMs + 420) {
    fighter.nextJumpPulseAtMs = elapsedMs;
  }
  const shouldGlideHold = fighter.movementSkills.includes('glide') && !fighter.onGround && dy < -24 && fighter.vy > 220;
  const aggressiveRange = fighter.difficulty === 'hard' ? ATTACK_RANGE + 10 : ATTACK_RANGE;
  const shouldDash =
    fighter.movementSkills.includes('dash') &&
    fighter.dashCooldownMs <= 0 &&
    fighter.onGround &&
    Math.random() < tuning.dashChance &&
    (
      (fighter.stuckMs > 260 && Math.abs(dx) > 80) ||
      (isOutsideZone && Math.abs(dx) > 240) ||
      (!!combatTarget &&
        enemyDistance > tuning.dashMinDistance &&
        enemyDistance < 820 &&
        strikeVerticalGap < 140)
    );
  const shouldThrowWeapon =
    fighter.weaponReady &&
    fighter.weaponCooldownMs <= 0 &&
    !!combatTarget &&
    strikeGap > aggressiveRange + 18 &&
    strikeGap < 220 &&
    strikeVerticalGap < 118 &&
    Math.random() < tuning.throwChance;

  const rawDirection = dx < -tuning.moveDeadZone ? -1 : dx > tuning.moveDeadZone ? 1 : 0;
  if (rawDirection === 0) {
    if (fighter.moveCommitDirection !== 0 || elapsedMs >= fighter.moveCommitUntilMs) {
      fighter.moveCommitDirection = 0;
      fighter.moveCommitUntilMs =
        elapsedMs + randomBetween(combatTarget ? 220 : 280, combatTarget ? 340 : 460);
    }
  } else {
    const commitExpired = elapsedMs >= fighter.moveCommitUntilMs;
    const holdingPosition =
      fighter.moveCommitDirection === 0 &&
      !commitExpired &&
      !isOutsideZone &&
      fighter.stuckMs <= 180;
    if (
      (!holdingPosition && fighter.moveCommitDirection === 0) ||
      commitExpired ||
      isOutsideZone ||
      fighter.stuckMs > 240
    ) {
      fighter.moveCommitDirection = rawDirection;
      fighter.moveCommitUntilMs =
        elapsedMs +
        randomBetween(
          combatTarget || isOutsideZone ? 520 : 620,
          combatTarget || isOutsideZone ? 820 : 980,
        );
    }
  }
  const committedDirection = rawDirection === 0 ? 0 : fighter.moveCommitDirection;

  const nextInput: BattleRoyaleInputPayload = {
    left: committedDirection < 0,
    right: committedDirection > 0,
    jump: shouldPulseJump || shouldGlideHold,
    dash: shouldDash,
    attack:
      fighter.weaponReady &&
      fighter.attackCooldownMs <= 0 &&
      !!combatTarget &&
      targetWithinStrikeLane(fighter, combatTarget, aggressiveRange) &&
      Math.random() < tuning.attackChance,
    throwWeapon: shouldThrowWeapon,
    skill:
      fighter.specialCharges > 0 &&
      !!combatTarget &&
      enemyDistance < (fighter.difficulty === 'hard' ? 280 : 230) &&
      strikeVerticalGap < 150 &&
      Math.random() < tuning.skillChance,
    guard:
      (!!combatTarget &&
        (
          (fighter.hp < tuning.guardHpThreshold && enemyDistance < 180 && strikeVerticalGap < 120) ||
          (!fighter.weaponReady && enemyDistance < 150 && strikeVerticalGap < 120)
        )) ||
      (isOutsideZone && fighter.shield <= 0 && enemyDistance < 240),
    jumpPressed: shouldPulseJump,
  };

  const isCompletelyIdle =
    !nextInput.left &&
    !nextInput.right &&
    !nextInput.jump &&
    !nextInput.dash &&
    !nextInput.attack &&
    !nextInput.throwWeapon &&
    !nextInput.skill &&
    !nextInput.guard;

  if (isCompletelyIdle && (!combatTarget || enemyDistance > tuning.engageDistance * 0.72 || strikeVerticalGap > 160)) {
    const fallbackRoamPoint = pickBotRoamPoint(fighter, fighters, pickups, zone);
    fighter.roamTargetX = fallbackRoamPoint.x;
    fighter.roamTargetY = fallbackRoamPoint.y;
    fighter.roamExpireAtMs = elapsedMs + randomBetween(Math.max(860, tuning.roamMinMs * 0.55), Math.max(1280, tuning.roamMaxMs * 0.82));
    const fallbackDx = fallbackRoamPoint.x - fighter.x;
    const fallbackDy = fallbackRoamPoint.y - fighter.y;
    nextInput.left = fallbackDx < -24;
    nextInput.right = fallbackDx > 24;
    nextInput.jump = fallbackDy < -96 && (!fighter.jumpHeld || fighter.onGround || canSecondJump);
  }

  fighter.botThinkAtMs =
    elapsedMs +
    randomBetween(
      combatTarget || isOutsideZone ? tuning.thinkMinMs * 0.78 : tuning.thinkMinMs,
      combatTarget || isOutsideZone ? tuning.thinkMaxMs * 0.86 : tuning.thinkMaxMs,
    );

  return nextInput;
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
  const platformsRef = useRef<BattleRoyalePlatform[]>(createPlatforms(0));
  const previousPlatformsRef = useRef<BattleRoyalePlatform[]>(createPlatforms(0));
  const fightersRef = useRef<Map<string, InternalFighter>>(createInitialFighters(room));
  const pickupsRef = useRef<InternalPickup[]>(createInitialPickups(room));
  const projectilesRef = useRef<InternalProjectile[]>([]);
  const weaponPickupsRef = useRef<InternalWeaponPickup[]>([]);
  const effectsRef = useRef<InternalEffect[]>([]);
  const killFeedRef = useRef<KillFeedItem[]>([]);
  const snapshotRef = useRef<BattleRoyaleSnapshot>(
    buildSnapshot(
      0,
      0,
      getZoneState(0),
      fightersRef.current,
      pickupsRef.current,
      projectilesRef.current,
      weaponPickupsRef.current,
      effectsRef.current,
      killFeedRef.current,
      null,
      platformsRef.current,
    ),
  );
  const authoritativeSnapshotRef = useRef<BattleRoyaleSnapshot>(snapshotRef.current);
  const lastAuthoritativeSnapshotAtRef = useRef(0);
  const remoteInputsRef = useRef<Record<string, BattleRoyaleInputPayload>>({});
  const pendingQuizzesRef = useRef<Record<string, BattleRoyaleQuizQuestion[]>>({});
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const matchEndedRef = useRef(false);
  const finishReportedRef = useRef(false);
  const roomNoticeLockUntilRef = useRef(0);
  const lastRoomNoticeRef = useRef<{ message: string; at: number }>({ message: '', at: 0 });
  const hasConnectedOnceRef = useRef(false);
  const reconnectNoticeVisibleRef = useRef(false);
  const initialHostSnapshotSentRef = useRef(false);
  const quizSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizOfferRef = useRef<BattleRoyaleQuizOffer | null>(null);
  const submittingQuizRef = useRef(false);
  const localEliminationHandledRef = useRef(false);
  const lastInputSentRef = useRef(0);
  const lastInputSignatureRef = useRef('');
  const previousFrameInputRef = useRef<BattleRoyaleInputPayload>(createDefaultInput());
  const pendingInputPulseRef = useRef(createInputPulseState());
  const predictedLocalFighterRef = useRef<InternalFighter | null>(null);
  const syncStatsRef = useRef({
    authoritativeSnapshots: 0,
    guestRenderFrames: 0,
    lastWireSnapshotBytes: 0,
    lastFullSnapshotBytes: 0,
    platformsStripped: false,
    inputMessagesSent: 0,
    droppedSnapshots: 0,
    localPredictionFrames: 0,
  });

  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const localFighterId = currentUserId ? fighterIdForUser(currentUserId) : '';
  const isHost = room.host_user_id === currentUserId;
  const [snapshot, setSnapshot] = useState<BattleRoyaleSnapshot>(snapshotRef.current);
  const [quizOffer, setQuizOffer] = useState<BattleRoyaleQuizOffer | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BattleRoyaleResult | null>(null);
  const [showEliminationPrompt, setShowEliminationPrompt] = useState(false);
  const [hasAuthoritativeSnapshot, setHasAuthoritativeSnapshot] = useState(isHost);
  const [roomNotice, setRoomNotice] = useState<string>('战场已就绪，先搜资源，再抢高台和武器。');

  const finishCurrentRoom = usePvpBattleRoyaleStore((state) => state.finishCurrentRoom);
  const setCurrentRoom = usePvpBattleRoyaleStore((state) => state.setCurrentRoom);
  const leaveCurrentRoom = usePvpBattleRoyaleStore((state) => state.leaveCurrentRoom);
  const setWsConnected = usePvpBattleRoyaleStore((state) => state.setWsConnected);
  const wsConnected = usePvpBattleRoyaleStore((state) => state.wsConnected);
  const latencyMs = usePvpBattleRoyaleStore((state) => state.latencyMs);
  const setLatencyMs = usePvpBattleRoyaleStore((state) => state.setLatencyMs);
  const resetBattleRoyaleStore = usePvpBattleRoyaleStore((state) => state.reset);
  const audioContextRef = useRef<AudioContext | null>(null);

  const liveSnapshot = snapshot;

  useEffect(() => {
    quizOfferRef.current = quizOffer;
  }, [quizOffer]);

  useEffect(() => {
    submittingQuizRef.current = submittingQuiz;
  }, [submittingQuiz]);

  useEffect(() => {
    return () => {
      if (quizSubmitTimeoutRef.current) {
        clearTimeout(quizSubmitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    musicManager.switchBGM('pvp');
    return () => {
      musicManager.switchBGM('main');
    };
  }, []);

  useEffect(() => {
    setRoomNotice('战场已就绪，先搜资源，再争夺高台和武器。');
  }, []);

  useEffect(() => {
    if (!quizOffer) {
      clearQuizSubmitTimeout();
      setSubmittingQuiz(false);
      setQuizSubmitError(null);
      return;
    }
    setQuizSubmitError(null);
  }, [quizOffer]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase());
      if (
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', 'j', 'k', 'l', ' '].includes(
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
    return () => {
      setWsConnected(false);
      setLatencyMs(0);
    };
  }, [setLatencyMs, setWsConnected]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const client = new BattleRoyaleWebSocketClient({
      roomId: room.id,
      userId: currentUserId,
      disconnectGraceMs: 2400,
      reconnectBaseDelayMs: 650,
      reconnectMaxDelayMs: 2800,
      onConnect: () => {
        setWsConnected(true);
        if (!hasConnectedOnceRef.current) {
          hasConnectedOnceRef.current = true;
        }
      },
      onDisconnect: () => {
        setWsConnected(false);
        setLatencyMs(0);
        reconnectNoticeVisibleRef.current = true;
        if (quizOfferRef.current && submittingQuizRef.current) {
          clearQuizSubmitTimeout();
          setSubmittingQuiz(false);
          setQuizSubmitError('连接波动，答题结果还未确认。连接恢复后请重新提交当前答卷。');
        }
        pushRoomNotice('连接波动，系统正在重连。', 2800);
      },
      onLatencyUpdate: (nextLatencyMs) => {
        setLatencyMs(Math.round(nextLatencyMs));
      },
      onMessage: (message) => {
        if (message.type === 'connected') {
          if (message.room) {
            setCurrentRoom(message.room as BattleRoyaleRoom);
          }

          if (message.latest_snapshot) {
            setHasAuthoritativeSnapshot(true);
            applyRecoveredSnapshot(message.latest_snapshot as BattleRoyaleSnapshot);
            if (reconnectNoticeVisibleRef.current) {
              reconnectNoticeVisibleRef.current = false;
              pushRoomNotice('同步已恢复，可以继续操作。', 2200);
            }
          }

          if (reconnectNoticeVisibleRef.current && !message.latest_snapshot) {
            reconnectNoticeVisibleRef.current = false;
            pushRoomNotice('连接已恢复。', 1800);
          }

          if (quizOfferRef.current && submittingQuizRef.current) {
            clearQuizSubmitTimeout();
            setSubmittingQuiz(false);
            setQuizSubmitError('连接已恢复，请重新提交当前答卷。');
          }

          if (message.latest_match_payload) {
            finalizeMatch(message.latest_match_payload);
          }
          return;
        }

        if (message.type === 'br_input_batch' && isHost && Array.isArray(message.inputs)) {
          message.inputs.forEach((entry: { user_id?: number; payload?: { input?: Partial<BattleRoyaleInputPayload> } }) => {
            if (typeof entry.user_id !== 'number') {
              return;
            }
            const fighterId = fighterIdForUser(entry.user_id);
            remoteInputsRef.current[fighterId] = {
              ...createDefaultInput(),
              ...(entry.payload?.input ?? {}),
            };
          });
          return;
        }

        if (message.type === 'br_input' && isHost) {
          const fighterId = fighterIdForUser(message.user_id);
          remoteInputsRef.current[fighterId] = {
            ...createDefaultInput(),
            ...(message.payload?.input ?? {}),
          };
          return;
        }

        if (message.type === 'br_snapshot' && !isHost && message.payload) {
          setHasAuthoritativeSnapshot(true);
          applyRecoveredSnapshot(message.payload as BattleRoyaleSnapshot);
          return;
        }

        if (message.type === 'br_quiz_offer' && message.payload) {
          if (matchEndedRef.current) {
            return;
          }
          const payload = message.payload as BattleRoyaleQuizOffer;
          if (payload.fighterId === localFighterId) {
            clearQuizSubmitTimeout();
            setSubmittingQuiz(false);
            setQuizSubmitError(null);
            setQuizOffer(payload);
          }
          return;
        }

        if (message.type === 'br_quiz_result' && message.payload) {
          if (matchEndedRef.current) {
            return;
          }
          const payload = message.payload as { fighterId: string; success: boolean };
          if (payload.fighterId === localFighterId) {
            clearQuizSubmitTimeout();
            setQuizSubmitError(null);
          }
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

        if (message.type === 'br_room_notice' && message.payload?.message) {
          pushRoomNotice(String(message.payload.message), Number(message.payload.lock_ms ?? 2600));
          return;
        }

        if (message.type === 'br_room_closed') {
          setCurrentRoom(null);
          pushRoomNotice(message.reason || '房间已关闭，即将返回大厅。', 5000);
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
    };
  }, [currentUserId, isHost, localFighterId, onExit, resetBattleRoyaleStore, room.id, setCurrentRoom, setLatencyMs, setWsConnected]);

  useEffect(() => {
    previousFrameInputRef.current = createDefaultInput();
    pendingInputPulseRef.current = createInputPulseState();
    predictedLocalFighterRef.current = null;
    hasConnectedOnceRef.current = false;
    reconnectNoticeVisibleRef.current = false;
    initialHostSnapshotSentRef.current = false;
    setHasAuthoritativeSnapshot(isHost);
    setLatencyMs(0);
  }, [isHost, localFighterId, room.id, setLatencyMs]);

  useEffect(() => {
    if (!isHost || !wsConnected || initialHostSnapshotSentRef.current) {
      return;
    }

    const transportSnapshot = createTransportSnapshot(snapshotRef.current);
    const sent = wsRef.current?.sendSnapshot(transportSnapshot) ?? false;
    if (sent) {
      initialHostSnapshotSentRef.current = true;
      lastSnapshotSentRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }, [isHost, wsConnected]);

  useEffect(() => {
    if (shouldExposeQaDebug() && typeof window !== 'undefined') {
      const debugWindow = window as Window & {
        __brSnapshot?: BattleRoyaleSnapshot;
        __brRenderSnapshot?: BattleRoyaleSnapshot;
        __brRoomNotice?: string;
        __brSyncStats?: typeof syncStatsRef.current;
      };
      debugWindow.__brSnapshot = snapshot;
      debugWindow.__brRoomNotice = roomNotice;
      debugWindow.__brSyncStats = { ...syncStatsRef.current };
    }

    if (result || quizOffer || Date.now() < roomNoticeLockUntilRef.current) {
      return;
    }

    const nextNotice = deriveAmbientRoomNotice(snapshot, localFighterId);
    setRoomNotice((current) => (current === nextNotice ? current : nextNotice));
  }, [localFighterId, quizOffer, result, roomNotice, snapshot]);

  useEffect(() => {
    const localFighter = snapshot.fighters.find((fighter) => fighter.id === localFighterId);
    if (!localFighter || result) {
      return;
    }

    if (localFighter.alive || localFighter.quizPending) {
      localEliminationHandledRef.current = false;
      if (localFighter.alive) {
        setShowEliminationPrompt(false);
      }
      return;
    }

    if (!localEliminationHandledRef.current) {
      localEliminationHandledRef.current = true;
      setShowEliminationPrompt(true);
    }
  }, [localFighterId, result, snapshot]);

  const readLocalInput = (): BattleRoyaleInputPayload => {
    const touchState = touchInputManager.getState();
    const keys = keysRef.current;
    return {
      left: keys.has('arrowleft') || keys.has('a') || touchState.left,
      right: keys.has('arrowright') || keys.has('d') || touchState.right,
      jump: keys.has('arrowup') || keys.has('w') || touchState.jump,
      dash: keys.has(' ') || touchState.dash,
      attack: keys.has('j') || touchState.attack,
      throwWeapon: keys.has('k'),
      skill: keys.has('l') || touchState.interact,
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
    const now = Date.now();
    if (lastRoomNoticeRef.current.message === message && now - lastRoomNoticeRef.current.at < 1200) {
      return;
    }
    lastRoomNoticeRef.current = { message, at: now };
    roomNoticeLockUntilRef.current = now + lockMs;
    setRoomNotice(message);
  };

  const clearQuizSubmitTimeout = () => {
    if (quizSubmitTimeoutRef.current) {
      clearTimeout(quizSubmitTimeoutRef.current);
      quizSubmitTimeoutRef.current = null;
    }
  };

  const currentPredictionLeadMs = (snapshotAgeMs: number) =>
    clamp(
      LOCAL_INPUT_LEAD_MS + latencyMs * 0.55 + Math.min(snapshotAgeMs * 0.3, 22),
      LOCAL_INPUT_LEAD_MS,
      MAX_LOCAL_INPUT_LEAD_MS,
    );

  const buildOutgoingInputPayload = (input: BattleRoyaleInputPayload): BattleRoyaleInputPayload => ({
    ...input,
    ...(pendingInputPulseRef.current.jumpPressed ? { jumpPressed: true } : {}),
    ...(pendingInputPulseRef.current.dashPressed ? { dashPressed: true } : {}),
    ...(pendingInputPulseRef.current.attackPressed ? { attackPressed: true } : {}),
    ...(pendingInputPulseRef.current.throwPressed ? { throwPressed: true } : {}),
    ...(pendingInputPulseRef.current.skillPressed ? { skillPressed: true } : {}),
  });

  const buildGuestRenderSnapshot = (
    authoritative: BattleRoyaleSnapshot,
    current: BattleRoyaleSnapshot,
    localInput: BattleRoyaleInputPayload,
    frameTime: number,
    deltaSeconds: number,
    predictedLocalFighter: InternalFighter | null,
  ): BattleRoyaleSnapshot => {
    if (shouldExposeQaDebug()) {
      syncStatsRef.current.guestRenderFrames += 1;
    }
    const snapshotAgeMs = clamp(frameTime - lastAuthoritativeSnapshotAtRef.current, 0, MAX_RENDER_EXTRAPOLATION_MS);
    const renderElapsedMs = Math.max(current.elapsedMs + deltaSeconds * 1000, authoritative.elapsedMs + snapshotAgeMs);
    const platformState = createPlatforms(renderElapsedMs);
    const currentFighters = new Map(current.fighters.map((fighter) => [fighter.id, fighter]));
    const directionAxis = (localInput.right ? 1 : 0) + (localInput.left ? -1 : 0);

    const nextFighters = authoritative.fighters.map((fighter) => {
      const previous = currentFighters.get(fighter.id) ?? fighter;
      const isLocalFighter = fighter.id === localFighterId;
      if (isLocalFighter && predictedLocalFighter?.id === fighter.id) {
        const predictionBlend = clamp(
          LOCAL_PREDICTION_BLEND_MIN + Math.min(latencyMs, 180) / 1200,
          LOCAL_PREDICTION_BLEND_MIN,
          LOCAL_PREDICTION_BLEND_MAX,
        );
        const gapX = Math.abs(predictedLocalFighter.x - fighter.x);
        const gapY = Math.abs(predictedLocalFighter.y - fighter.y);
        const blendedX =
          gapX > LOCAL_PREDICTION_HARD_CORRECTION_DISTANCE
            ? lerpValue(predictedLocalFighter.x, fighter.x, 0.24)
            : lerpValue(fighter.x, predictedLocalFighter.x, predictionBlend);
        const blendedY =
          gapY > LOCAL_PREDICTION_HARD_CORRECTION_DISTANCE
            ? lerpValue(predictedLocalFighter.y, fighter.y, 0.28)
            : lerpValue(fighter.y, predictedLocalFighter.y, Math.max(0.58, predictionBlend - 0.08));
        return {
          ...fighter,
          buffs: { ...predictedLocalFighter.buffs },
          x: blendedX,
          y: blendedY,
          vx: lerpValue(fighter.vx, predictedLocalFighter.vx, 0.58),
          vy: lerpValue(fighter.vy, predictedLocalFighter.vy, 0.52),
          facing: predictedLocalFighter.facing,
          swingMs: Math.max(predictedLocalFighter.swingMs, fighter.swingMs),
          hitFlashMs: Math.max(predictedLocalFighter.hitFlashMs, fighter.hitFlashMs),
        };
      }
      const movementLeadMs = isLocalFighter ? currentPredictionLeadMs(snapshotAgeMs) : 0;
      const predictedX = clamp(
        fighter.x +
          fighter.vx * (snapshotAgeMs / 1000) +
          (isLocalFighter ? directionAxis * MOVE_SPEED * (movementLeadMs / 1000) : 0),
        0,
        MAP_WIDTH - FIGHTER_WIDTH,
      );
      const predictedY = clamp(fighter.y + fighter.vy * (snapshotAgeMs / 1000), 0, FLOOR_Y - FIGHTER_HEIGHT);
      const shouldSnap =
        previous.alive !== fighter.alive ||
        previous.quizPending !== fighter.quizPending ||
        previous.weaponReady !== fighter.weaponReady ||
        Math.abs(previous.x - fighter.x) > POSITION_SNAP_DISTANCE ||
        Math.abs(previous.y - fighter.y) > POSITION_SNAP_DISTANCE;

      if (shouldSnap || !fighter.alive) {
        return {
          ...fighter,
          buffs: { ...fighter.buffs },
        };
      }

      const alpha = smoothingFactor(
        deltaSeconds,
        isLocalFighter
          ? LOCAL_FIGHTER_SMOOTHING_RATE + Math.min(latencyMs / 35, 4)
          : REMOTE_FIGHTER_SMOOTHING_RATE,
      );

      return {
        ...fighter,
        buffs: { ...fighter.buffs },
        x: lerpValue(previous.x, predictedX, alpha),
        y: lerpValue(previous.y, predictedY, alpha),
        vx: lerpValue(previous.vx, fighter.vx, alpha),
        vy: lerpValue(previous.vy, fighter.vy, alpha),
      };
    });

    const currentProjectiles = new Map(current.projectiles.map((projectile) => [projectile.id, projectile]));
    const projectileAlpha = smoothingFactor(deltaSeconds, PROJECTILE_SMOOTHING_RATE);
    const nextProjectiles = authoritative.projectiles.map((projectile) => {
      const previous = currentProjectiles.get(projectile.id);
      if (!previous) {
        return { ...projectile };
      }

      return {
        ...projectile,
        x: lerpValue(previous.x, projectile.x, projectileAlpha),
        y: lerpValue(previous.y, projectile.y, projectileAlpha),
        rotation: lerpValue(previous.rotation, projectile.rotation, projectileAlpha),
      };
    });

    return {
      tick: authoritative.tick,
      elapsedMs: renderElapsedMs,
      zone: getZoneState(renderElapsedMs),
      fighters: nextFighters,
      pickups: authoritative.pickups.map((pickup) => ({ ...pickup })),
      killFeed: authoritative.killFeed.map((item) => ({ ...item })),
      winnerId: authoritative.winnerId,
      platforms: platformState,
      projectiles: nextProjectiles,
      weapons: authoritative.weapons.map((weapon) => ({ ...weapon })),
      effects: authoritative.effects.map((effect) => ({ ...effect })),
    };
  };

  const applyRecoveredSnapshot = (incoming: IncomingBattleRoyaleSnapshot) => {
    const normalized = normalizeIncomingSnapshot(incoming, room);
    const receiptTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (shouldExposeQaDebug()) {
      syncStatsRef.current.authoritativeSnapshots += 1;
    }

    tickRef.current = normalized.tick;
    elapsedMsRef.current = normalized.elapsedMs;
    winnerIdRef.current = normalized.winnerId;
    previousPlatformsRef.current = normalized.platforms;
    platformsRef.current = normalized.platforms;
    fightersRef.current = hydrateFightersFromSnapshot(room, normalized);
    pickupsRef.current = hydratePickupsFromSnapshot(normalized);
    projectilesRef.current = [];
    weaponPickupsRef.current = hydrateWeaponsFromSnapshot(normalized);
    effectsRef.current = hydrateEffectsFromSnapshot(normalized);
    killFeedRef.current = normalized.killFeed.map((item) => ({ ...item }));
    authoritativeSnapshotRef.current = normalized;
    if (!isHost) {
      const authoritativeLocalFighter = fightersRef.current.get(localFighterId) ?? null;
      mergeAuthoritativeIntoPredictedLocalFighter(authoritativeLocalFighter);
    }

    const shouldResetRenderSnapshot =
      lastAuthoritativeSnapshotAtRef.current === 0 ||
      snapshotRef.current.fighters.length !== normalized.fighters.length ||
      snapshotRef.current.winnerId !== normalized.winnerId ||
      Math.abs(snapshotRef.current.elapsedMs - normalized.elapsedMs) > 420;

    lastAuthoritativeSnapshotAtRef.current = receiptTime;

    if (shouldResetRenderSnapshot) {
      snapshotRef.current = normalized;
      setSnapshot(normalized);
      lastUiSyncRef.current = receiptTime;
    }
  };

  const expirePendingRevive = (fighter: InternalFighter, reason: string) => {
    fighter.quizPending = false;
    pendingQuizzesRef.current[fighter.id] = [];
    addKillFeed(`${fighter.name}${reason}`);

    if (fighter.id === localFighterId) {
      clearQuizSubmitTimeout();
      setQuizOffer(null);
      setSubmittingQuiz(false);
      setQuizSubmitError(null);
      setShowEliminationPrompt(true);
      localEliminationHandledRef.current = true;
    }

    if (isHost && fighter.userId && fighter.id !== localFighterId) {
      wsRef.current?.sendQuizResult(fighter.userId, {
        fighterId: fighter.id,
        success: false,
      });
    }
  };

  const clearExpiredPendingRevives = () => {
    fightersRef.current.forEach((fighter) => {
      if (!fighter.quizPending) {
        return;
      }

      const elapsedSinceElimination =
        fighter.eliminatedAtMs === null ? 0 : elapsedMsRef.current - fighter.eliminatedAtMs;

      if (elapsedSinceElimination >= QUIZ_PENDING_TIMEOUT_MS) {
        expirePendingRevive(fighter, '答题超时，正式出局');
      }
    });
  };

  const clearPendingRevivesForMatchEnd = () => {
    clearQuizSubmitTimeout();
    pendingQuizzesRef.current = {};
    fightersRef.current.forEach((fighter) => {
      fighter.quizPending = false;
    });
    setQuizOffer(null);
    setSubmittingQuiz(false);
    setQuizSubmitError(null);
    setShowEliminationPrompt(false);
  };

  const playArenaCue = (kind: 'swing' | 'throw' | 'hit' | 'pickup' | 'shockwave' | 'bounce' | 'dash') => {
    playSound(ARENA_SOUND_MAP[kind]);
    if (kind === 'swing' || kind === 'throw' || kind === 'hit' || kind === 'pickup') {
      return;
    }
    if (typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    const context = audioContextRef.current;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;
    const cueMap = {
      swing: { type: 'triangle' as OscillatorType, from: 520, to: 180, gain: 0.032, duration: 0.12, overtone: 1.8 },
      throw: { type: 'sawtooth' as OscillatorType, from: 680, to: 220, gain: 0.026, duration: 0.13, overtone: 2.1 },
      hit: { type: 'square' as OscillatorType, from: 210, to: 110, gain: 0.036, duration: 0.09, overtone: 1.4 },
      pickup: { type: 'triangle' as OscillatorType, from: 640, to: 820, gain: 0.022, duration: 0.11, overtone: 1.5 },
      shockwave: { type: 'sine' as OscillatorType, from: 260, to: 110, gain: 0.032, duration: 0.18, overtone: 1.2 },
      bounce: { type: 'triangle' as OscillatorType, from: 520, to: 760, gain: 0.024, duration: 0.11, overtone: 1.6 },
      dash: { type: 'triangle' as OscillatorType, from: 360, to: 620, gain: 0.021, duration: 0.1, overtone: 1.9 },
    }[kind];

    const buildLayer = (from: number, to: number, gainValue: number, type: OscillatorType) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + cueMap.duration);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cueMap.duration);
      oscillator.start(now);
      oscillator.stop(now + cueMap.duration + 0.01);
    };

    buildLayer(cueMap.from, cueMap.to, cueMap.gain, cueMap.type);
    buildLayer(cueMap.from * cueMap.overtone, cueMap.to * cueMap.overtone, cueMap.gain * 0.42, 'sine');
  };

  const spawnEffect = (
    kind: InternalEffect['kind'],
    x: number,
    y: number,
    radius: number,
    facing?: 1 | -1,
  ) => {
    const ttlMs =
      kind === 'slash'
        ? EFFECT_TTL_SLASH_MS
        : kind === 'hit'
          ? EFFECT_TTL_HIT_MS
          : kind === 'dash'
            ? EFFECT_TTL_DASH_MS
            : EFFECT_TTL_SHOCKWAVE_MS;

    effectsRef.current.push({
      id: `effect-${Date.now()}-${Math.random()}`,
      kind,
      x,
      y,
      radius,
      facing,
      ttlMs,
    });
  };

  const mergeAuthoritativeIntoPredictedLocalFighter = (authoritative: InternalFighter | null) => {
    if (!authoritative) {
      predictedLocalFighterRef.current = null;
      return null;
    }

    const previousPredicted = predictedLocalFighterRef.current;
    if (!previousPredicted) {
      const cloned = cloneInternalFighter(authoritative);
      predictedLocalFighterRef.current = cloned;
      return cloned;
    }

    const requiresReset =
      previousPredicted.id !== authoritative.id ||
      previousPredicted.alive !== authoritative.alive ||
      previousPredicted.quizPending !== authoritative.quizPending ||
      previousPredicted.hasRevived !== authoritative.hasRevived ||
      Math.abs(previousPredicted.x - authoritative.x) > 260 ||
      Math.abs(previousPredicted.y - authoritative.y) > 260;

    if (requiresReset) {
      const cloned = cloneInternalFighter(authoritative);
      predictedLocalFighterRef.current = cloned;
      return cloned;
    }

    const merged = cloneInternalFighter(previousPredicted);
    merged.userId = authoritative.userId;
    merged.name = authoritative.name;
    merged.petType = authoritative.petType;
    merged.petStage = authoritative.petStage;
    merged.hp = authoritative.hp;
    merged.maxHp = authoritative.maxHp;
    merged.shield = authoritative.shield;
    merged.armor = authoritative.armor;
    merged.kills = authoritative.kills;
    merged.alive = authoritative.alive;
    merged.isBot = authoritative.isBot;
    merged.difficulty = authoritative.difficulty;
    merged.hasRevived = authoritative.hasRevived;
    merged.reviveUsed = authoritative.reviveUsed;
    merged.quizPending = authoritative.quizPending;
    merged.damageDealt = authoritative.damageDealt ?? merged.damageDealt;
    merged.specialCharges = authoritative.specialCharges;
    merged.buffs = { ...authoritative.buffs };
    merged.damageBonus = authoritative.damageBonus;
    merged.speedMultiplier = authoritative.speedMultiplier;
    merged.weaponReady = authoritative.weaponReady;
    merged.swingMs = Math.max(previousPredicted.swingMs, authoritative.swingMs);
    merged.hitFlashMs = Math.max(previousPredicted.hitFlashMs, authoritative.hitFlashMs);
    const correctionAlpha = clamp(0.1 - Math.min(latencyMs, 180) / 3600, 0.05, 0.1);
    const velocityCorrectionAlpha = clamp(correctionAlpha + 0.05, 0.1, 0.16);
    merged.x = lerpValue(previousPredicted.x, authoritative.x, correctionAlpha);
    merged.y = lerpValue(previousPredicted.y, authoritative.y, correctionAlpha);
    merged.vx = lerpValue(previousPredicted.vx, authoritative.vx, velocityCorrectionAlpha);
    merged.vy = lerpValue(previousPredicted.vy, authoritative.vy, velocityCorrectionAlpha);
    predictedLocalFighterRef.current = merged;
    return merged;
  };

  const predictGuestLocalFighter = (
    authoritative: InternalFighter | null,
    input: BattleRoyaleInputPayload,
    deltaSeconds: number,
    previousPlatforms: BattleRoyalePlatform[],
    nextPlatforms: BattleRoyalePlatform[],
  ) => {
    const merged = mergeAuthoritativeIntoPredictedLocalFighter(authoritative);
    if (!merged || !merged.alive || merged.quizPending) {
      return merged;
    }

    if (shouldExposeQaDebug()) {
      syncStatsRef.current.localPredictionFrames += 1;
    }
    const fighter = cloneInternalFighter(merged);
    const canDoubleJump = fighter.movementSkills.includes('double_jump');
    const canDash = fighter.movementSkills.includes('dash');
    const canGlide = fighter.movementSkills.includes('glide');
    const canWallJump = fighter.movementSkills.includes('wall_jump');
    const justJump = Boolean(input.jumpPressed) || (input.jump && !fighter.jumpHeld);
    const justDash = Boolean(input.dashPressed) || (input.dash && !fighter.dashHeld);
    const justAttack = Boolean(input.attackPressed) || (input.attack && !fighter.attackHeld);
    const justThrow = Boolean(input.throwPressed) || (input.throwWeapon && !fighter.throwHeld);
    const justSkill = Boolean(input.skillPressed) || (input.skill && !fighter.skillHeld);

    fighter.attackCooldownMs = Math.max(0, fighter.attackCooldownMs - deltaSeconds * 1000);
    fighter.attackTimerMs = Math.max(0, fighter.attackTimerMs - deltaSeconds * 1000);
    fighter.dashCooldownMs = Math.max(0, fighter.dashCooldownMs - deltaSeconds * 1000);
    fighter.dashTimerMs = Math.max(0, fighter.dashTimerMs - deltaSeconds * 1000);
    fighter.weaponCooldownMs = Math.max(0, fighter.weaponCooldownMs - deltaSeconds * 1000);
    fighter.swingMs = Math.max(0, fighter.swingMs - deltaSeconds * 1000);
    fighter.hitFlashMs = Math.max(0, fighter.hitFlashMs - deltaSeconds * 1000);

    if (input.left) {
      fighter.facing = -1;
    } else if (input.right) {
      fighter.facing = 1;
    }

    if (canDash && justDash && fighter.dashCooldownMs <= 0) {
      fighter.dashCooldownMs = DASH_COOLDOWN_MS;
      fighter.dashTimerMs = DASH_DURATION_MS;
      fighter.vx = fighter.facing * DASH_SPEED;
      fighter.vy = Math.min(fighter.vy, 140);
      playArenaCue('dash');
    }

    const moveAxis = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const baseSpeed = MOVE_SPEED * fighter.speedMultiplier;
    if (fighter.dashTimerMs > 0) {
      fighter.vx = fighter.facing * DASH_SPEED;
      fighter.vy = Math.min(fighter.vy, 180);
    } else {
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

    let platformCarryX = 0;
    let platformCarryY = 0;
    const supportPlatform = previousPlatforms.find((platform) => {
      if (platform.id === STATIC_GROUND_PLATFORM.id) return false;
      const horizontalMatch = fighter.x + FIGHTER_WIDTH > platform.x && fighter.x < platform.x + platform.width;
      const bottom = fighter.y + FIGHTER_HEIGHT;
      return horizontalMatch && Math.abs(bottom - platform.y) < 10;
    });
    if (supportPlatform) {
      const movedPlatform = nextPlatforms.find((platform) => platform.id === supportPlatform.id);
      if (movedPlatform) {
        platformCarryX = movedPlatform.x - supportPlatform.x;
        platformCarryY = movedPlatform.y - supportPlatform.y;
      }
    }

    const nextX = clamp(fighter.x + platformCarryX + fighter.vx * deltaSeconds, 0, MAP_WIDTH - FIGHTER_WIDTH);
    const previousBottom = fighter.y + FIGHTER_HEIGHT;
    let nextY = fighter.y + platformCarryY + fighter.vy * deltaSeconds;
    let landed = false;

    const floorY = FLOOR_Y - FIGHTER_HEIGHT;
    if (nextY >= floorY) {
      nextY = floorY;
      fighter.vy = 0;
      landed = true;
    }

    for (const platform of nextPlatforms) {
      if (platform.id === STATIC_GROUND_PLATFORM.id) continue;
      const withinHorizontal = nextX + FIGHTER_WIDTH > platform.x && nextX < platform.x + platform.width;
      const landingFromAbove = previousBottom <= platform.y + 8 && nextY + FIGHTER_HEIGHT >= platform.y && fighter.vy >= 0;
      if (withinHorizontal && landingFromAbove) {
        if (platform.kind === 'bounce') {
          nextY = platform.y - FIGHTER_HEIGHT - 2;
          fighter.vy = -(platform.bounceBoost ?? 1120);
          landed = false;
          playArenaCue('bounce');
        } else {
          nextY = platform.y - FIGHTER_HEIGHT;
          fighter.vy = 0;
          landed = true;
        }
        break;
      }
    }

    fighter.x = nextX;
    fighter.y = nextY;
    fighter.onGround = landed;
    if (landed) {
      fighter.jumpsUsed = 0;
    }

    if (justAttack && fighter.attackCooldownMs <= 0 && fighter.weaponReady) {
      fighter.attackCooldownMs = ATTACK_COOLDOWN_MS;
      fighter.attackTimerMs = ATTACK_ACTIVE_MS;
      fighter.swingMs = SWING_MS;
      playArenaCue('swing');
    }

    if (justThrow && fighter.weaponReady && fighter.weaponCooldownMs <= 0) {
      fighter.weaponReady = false;
      fighter.weaponCooldownMs = WEAPON_THROW_COOLDOWN_MS;
      fighter.attackCooldownMs = Math.max(fighter.attackCooldownMs, 260);
      fighter.swingMs = Math.max(fighter.swingMs, SWING_MS * 0.75);
      playArenaCue('throw');
    }

    if (justSkill && fighter.specialCharges > 0) {
      fighter.specialCharges -= 1;
      playArenaCue('shockwave');
    }

    fighter.jumpHeld = input.jump;
    fighter.attackHeld = input.attack;
    fighter.throwHeld = input.throwWeapon;
    fighter.skillHeld = input.skill;
    fighter.dashHeld = input.dash;
    predictedLocalFighterRef.current = fighter;
    return fighter;
  };

  const settleWeaponY = (x: number, y: number) => {
    let settledY = FLOOR_Y - 20;
    for (const platform of platformsRef.current) {
      if (platform.id === STATIC_GROUND_PLATFORM.id) continue;
      if (x >= platform.x - 18 && x <= platform.x + platform.width + 18 && y <= platform.y + 40) {
        settledY = Math.min(settledY, platform.y - 20);
      }
    }
    return settledY;
  };

  const dropWeapon = (ownerId: string, x: number, y: number) => {
    const existing = weaponPickupsRef.current.find((weapon) => weapon.ownerId === ownerId);
    const settledY = settleWeaponY(x, y);
    if (existing) {
      existing.x = clamp(x, 24, MAP_WIDTH - 24);
      existing.y = settledY;
      existing.active = true;
      existing.ttlMs = MATCH_MAX_MS;
      existing.pickupReadyAtMs = elapsedMsRef.current + WEAPON_PICKUP_GRACE_MS;
      return;
    }

    weaponPickupsRef.current.push({
      id: `weapon-${ownerId}`,
      ownerId,
      x: clamp(x, 24, MAP_WIDTH - 24),
      y: settledY,
      active: true,
      ttlMs: MATCH_MAX_MS,
      pickupReadyAtMs: elapsedMsRef.current + WEAPON_PICKUP_GRACE_MS,
    });
  };

  const recoverWeapon = (fighter: InternalFighter, recoveredWeapon: InternalWeaponPickup) => {
    const originalOwner = fightersRef.current.get(recoveredWeapon.ownerId);
    fighter.weaponReady = true;
    fighter.weaponCooldownMs = Math.max(fighter.weaponCooldownMs, 160);
    recoveredWeapon.active = false;
    if (originalOwner && originalOwner.id !== fighter.id) {
      addKillFeed(`${fighter.name} 捡起了 ${originalOwner.name} 的掉落武器`);
    } else {
      addKillFeed(`${fighter.name} 取回了自己的武器`);
    }
    if (fighter.id === localFighterId || recoveredWeapon.ownerId === localFighterId) {
      playArenaCue('pickup');
    }
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
    fighter.weaponReady = true;
    fighter.weaponCooldownMs = 0;
    fighter.swingMs = 0;
    fighter.hitFlashMs = 0;
    fighter.nextJumpPulseAtMs = elapsedMsRef.current;
    fighter.throwHeld = false;
    if (fighterId === localFighterId) {
      clearQuizSubmitTimeout();
      localEliminationHandledRef.current = false;
      setQuizSubmitError(null);
      setShowEliminationPrompt(false);
    }
    weaponPickupsRef.current.forEach((weapon) => {
      if (weapon.ownerId === fighter.id) {
        weapon.active = false;
      }
    });
    projectilesRef.current.forEach((projectile) => {
      if (projectile.ownerId === fighter.id) {
        projectile.active = false;
      }
    });
    addKillFeed(`${fighter.name} 答题成功，半血重返战场`);
  };

  const resolveReviveOutcome = (fighterId: string, success: boolean) => {
    if (matchEndedRef.current) {
      return;
    }

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
      clearQuizSubmitTimeout();
      setQuizOffer(null);
      setSubmittingQuiz(false);
      setQuizSubmitError(null);
      if (!success) {
        setShowEliminationPrompt(true);
        localEliminationHandledRef.current = true;
      }
    }
  };

  const maybeOfferRevive = (fighter: InternalFighter) => {
    if (matchEndedRef.current || fighter.isBot || fighter.reviveUsed || fighter.quizPending || fighter.hasRevived) {
      return;
    }

    const aliveCount = Array.from(fightersRef.current.values()).filter((entry) => entry.alive).length;
    if (aliveCount <= 1) {
      return;
    }

    fighter.reviveUsed = true;
    fighter.quizPending = true;

    const questions = buildBattleRoyaleQuiz((fighter.ageGroup as any) ?? 'primary-upper', 3);
    pendingQuizzesRef.current[fighter.id] = questions;

    if (fighter.id === localFighterId) {
      setShowEliminationPrompt(false);
      localEliminationHandledRef.current = false;
      setQuizSubmitError(null);
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
    let appliedDamage = 0;
    const guarded = target.input.guard;

    if (guarded) {
      damage *= 0.55;
    }
    if (target.armor > 0) {
      damage *= 0.78;
    }
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, damage);
      target.shield -= absorbed;
      damage -= absorbed;
      appliedDamage += absorbed;
    }
    if (damage <= 0) {
      if (sourceId && appliedDamage > 0) {
        const attacker = fightersRef.current.get(sourceId);
        if (attacker) {
          attacker.damageDealt += appliedDamage;
        }
      }
      if (sourceId === localFighterId || target.id === localFighterId) {
        playSound(guarded ? 'pvp_block' : 'enemy_hit');
      }
      return;
    }

    const hpDamage = Math.min(target.hp, damage);
    target.hp = Math.max(0, target.hp - damage);
    appliedDamage += hpDamage;
    target.lastAttackerId = sourceId;
    target.hitFlashMs = HIT_FLASH_MS;
    spawnEffect('hit', target.x + FIGHTER_WIDTH / 2, target.y + FIGHTER_HEIGHT * 0.42, 34, target.facing);
    if (sourceId && appliedDamage > 0) {
      const attacker = fightersRef.current.get(sourceId);
      if (attacker) {
        attacker.damageDealt += appliedDamage;
      }
    }
    if (sourceId === localFighterId || target.id === localFighterId) {
      if (guarded) {
        playSound('pvp_block');
      } else {
        playArenaCue('hit');
      }
    }
    if (target.hp <= 0) {
      eliminateFighter(target, sourceId);
    }
  };

  const applyPickup = (fighter: InternalFighter, pickup: InternalPickup) => {
    let pickupMessage = `${pickupLabel(pickup.type)}已入手`;

    switch (pickup.type) {
      case 'med_kit':
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + 36);
        fighter.buffs.med_kit = (fighter.buffs.med_kit ?? 0) + 1;
        pickupMessage = '恢复 36 点生命';
        break;
      case 'armor_vest':
        fighter.armor = clamp(fighter.armor + 16, 0, 48);
        fighter.buffs.armor_vest = (fighter.buffs.armor_vest ?? 0) + 1;
        pickupMessage = '减少后续近战伤害';
        break;
      case 'shield_core':
        fighter.shield = clamp(fighter.shield + 26, 0, 60);
        fighter.buffs.shield_core = (fighter.buffs.shield_core ?? 0) + 1;
        pickupMessage = '补充临时护盾';
        break;
      case 'damage_claw':
        fighter.damageBonus = clamp(fighter.damageBonus + 5, 0, 18);
        fighter.buffs.damage_claw = (fighter.buffs.damage_claw ?? 0) + 1;
        pickupMessage = '强化近战伤害';
        break;
      case 'wind_boost':
        fighter.speedMultiplier = clamp(fighter.speedMultiplier + 0.12, 1, 1.45);
        fighter.buffs.wind_boost = (fighter.buffs.wind_boost ?? 0) + 1;
        pickupMessage = '提高位移速度';
        break;
      case 'shockwave_charge':
        fighter.specialCharges = clamp(fighter.specialCharges + 2, 0, 6);
        fighter.buffs.shockwave_charge = (fighter.buffs.shockwave_charge ?? 0) + 2;
        pickupMessage = '追加 2 次冲击波';
        break;
      default:
        break;
    }

    pickup.active = false;
    pickup.respawnAtMs = elapsedMsRef.current + PICKUP_RESPAWN_MS;
    spawnEffect('hit', pickup.x, pickup.y - 6, pickup.type === 'shockwave_charge' ? 38 : 28, fighter.facing);
    addKillFeed(`${fighter.name} 拾取了 ${pickupLabel(pickup.type)}`);
    if (fighter.id === localFighterId) {
      playArenaCue('pickup');
      pushRoomNotice(`已拾取${pickupLabel(pickup.type)}：${pickupMessage}`, 1800);
    }
  };

  const applyAttack = (fighter: InternalFighter) => {
    if (!fighter.alive || fighter.attackCooldownMs > 0 || !fighter.weaponReady) {
      return;
    }
    fighter.attackCooldownMs = ATTACK_COOLDOWN_MS;
    fighter.attackTimerMs = ATTACK_ACTIVE_MS;
    fighter.swingMs = SWING_MS;
    spawnEffect(
      'slash',
      fighter.x + FIGHTER_WIDTH / 2 + fighter.facing * (WEAPON_HOLD_OFFSET_X + WEAPON_MODEL_LENGTH * 0.62),
      fighter.y + FIGHTER_HEIGHT * 0.44,
      38,
      fighter.facing,
    );
    if (fighter.id === localFighterId) {
      playArenaCue('swing');
    }

    fightersRef.current.forEach((target) => {
      if (!target.alive || target.id === fighter.id) {
        return;
      }
      if (targetWithinStrikeLane(fighter, target)) {
        applyDamage(target, ATTACK_DAMAGE + fighter.damageBonus, fighter.id);
      }
    });
  };

  const applyThrowWeapon = (fighter: InternalFighter) => {
    if (!fighter.alive || !fighter.weaponReady || fighter.weaponCooldownMs > 0) {
      return;
    }

    fighter.weaponReady = false;
    fighter.weaponCooldownMs = WEAPON_THROW_COOLDOWN_MS;
    fighter.attackCooldownMs = Math.max(fighter.attackCooldownMs, 260);
    fighter.swingMs = Math.max(fighter.swingMs, SWING_MS * 0.75);
    projectilesRef.current.push({
      id: `projectile-${fighter.id}-${Date.now()}`,
      ownerId: fighter.id,
      x: fighter.x + FIGHTER_WIDTH / 2 + fighter.facing * (WEAPON_HOLD_OFFSET_X + 6),
      y: fighter.y + FIGHTER_HEIGHT * 0.42,
      vx: fighter.facing * WEAPON_THROW_SPEED,
      vy: -80,
      traveled: 0,
      maxDistance: WEAPON_THROW_MAX_DISTANCE,
      rotation: fighter.facing === 1 ? 0.2 : -0.2,
      active: true,
    });
    spawnEffect(
      'slash',
      fighter.x + FIGHTER_WIDTH / 2 + fighter.facing * (WEAPON_HOLD_OFFSET_X + WEAPON_MODEL_LENGTH * 0.5),
      fighter.y + FIGHTER_HEIGHT * 0.42,
      42,
      fighter.facing,
    );
    if (fighter.id === localFighterId) {
      playArenaCue('throw');
    }
  };

  const applySkill = (fighter: InternalFighter) => {
    if (!fighter.alive || fighter.specialCharges <= 0) {
      return;
    }
    fighter.specialCharges -= 1;
    spawnEffect('shockwave', fighter.x + FIGHTER_WIDTH / 2, fighter.y + FIGHTER_HEIGHT / 2, 164, fighter.facing);
    if (fighter.id === localFighterId) {
      playArenaCue('shockwave');
      pushRoomNotice('已释放冲击波，适合逼退贴身目标。', 1600);
    }
    fightersRef.current.forEach((target) => {
      if (!target.alive || target.id === fighter.id) return;
      const distance = Math.hypot(target.x - fighter.x, target.y - fighter.y);
      if (distance < 164) {
        applyDamage(target, 24 + fighter.damageBonus * 0.6, fighter.id);
      }
    });
    addKillFeed(`${fighter.name} 释放了冲击波`);
  };

  const stepProjectiles = (deltaSeconds: number) => {
    projectilesRef.current.forEach((projectile) => {
      if (!projectile.active) return;

      const previousX = projectile.x;
      const previousY = projectile.y;
      projectile.vy += 520 * deltaSeconds;
      projectile.x = clamp(projectile.x + projectile.vx * deltaSeconds, 0, MAP_WIDTH);
      projectile.y += projectile.vy * deltaSeconds;
      projectile.traveled += Math.hypot(projectile.x - previousX, projectile.y - previousY);
      projectile.rotation += deltaSeconds * (projectile.vx >= 0 ? 12 : -12);

      let shouldDrop = projectile.traveled >= projectile.maxDistance;
      if (projectile.y >= FLOOR_Y - 18) {
        shouldDrop = true;
      }

      for (const platform of platformsRef.current) {
        if (platform.id === STATIC_GROUND_PLATFORM.id) continue;
        const withinHorizontal = projectile.x >= platform.x && projectile.x <= platform.x + platform.width;
        if (withinHorizontal && projectile.y >= platform.y - 18 && projectile.y <= platform.y + platform.height) {
          shouldDrop = true;
          break;
        }
      }

      fightersRef.current.forEach((target) => {
        if (!projectile.active || !target.alive || target.id === projectile.ownerId) {
          return;
        }
        const dx = Math.abs(projectile.x - (target.x + FIGHTER_WIDTH / 2));
        const dy = Math.abs(projectile.y - (target.y + FIGHTER_HEIGHT * 0.45));
        if (dx < 36 && dy < 44) {
          const owner = fightersRef.current.get(projectile.ownerId);
          applyDamage(target, WEAPON_PROJECTILE_DAMAGE + (owner?.damageBonus ?? 0) * 0.75, projectile.ownerId);
          projectile.active = false;
          dropWeapon(projectile.ownerId, projectile.x, projectile.y);
        }
      });

      if (projectile.active && shouldDrop) {
        projectile.active = false;
        dropWeapon(projectile.ownerId, projectile.x, projectile.y);
      }
    });

    projectilesRef.current = projectilesRef.current.filter((projectile) => projectile.active);
  };

  const stepEffects = (deltaSeconds: number) => {
    effectsRef.current = effectsRef.current
      .map((effect) => ({
        ...effect,
        ttlMs: effect.ttlMs - deltaSeconds * 1000,
      }))
      .filter((effect) => effect.ttlMs > 0);

    weaponPickupsRef.current = weaponPickupsRef.current
      .map((weapon) => ({
        ...weapon,
        ttlMs: weapon.ttlMs - deltaSeconds * 1000,
      }))
      .filter((weapon) => weapon.ttlMs > 0);
  };

  const stepFighter = (fighter: InternalFighter, input: BattleRoyaleInputPayload, deltaSeconds: number) => {
    if (!fighter.alive) return;

    const canDoubleJump = fighter.movementSkills.includes('double_jump');
    const canDash = fighter.movementSkills.includes('dash');
    const canGlide = fighter.movementSkills.includes('glide');
    const canWallJump = fighter.movementSkills.includes('wall_jump');
    const justJump = Boolean(input.jumpPressed) || (input.jump && !fighter.jumpHeld);
    const justDash = Boolean(input.dashPressed) || (input.dash && !fighter.dashHeld);
    const justAttack = Boolean(input.attackPressed) || (input.attack && !fighter.attackHeld);
    const justThrow = Boolean(input.throwPressed) || (input.throwWeapon && !fighter.throwHeld);
    const justSkill = Boolean(input.skillPressed) || (input.skill && !fighter.skillHeld);

    fighter.attackCooldownMs = Math.max(0, fighter.attackCooldownMs - deltaSeconds * 1000);
    fighter.attackTimerMs = Math.max(0, fighter.attackTimerMs - deltaSeconds * 1000);
    fighter.dashCooldownMs = Math.max(0, fighter.dashCooldownMs - deltaSeconds * 1000);
    fighter.dashTimerMs = Math.max(0, fighter.dashTimerMs - deltaSeconds * 1000);
    fighter.weaponCooldownMs = Math.max(0, fighter.weaponCooldownMs - deltaSeconds * 1000);
    fighter.swingMs = Math.max(0, fighter.swingMs - deltaSeconds * 1000);
    fighter.hitFlashMs = Math.max(0, fighter.hitFlashMs - deltaSeconds * 1000);

    if (input.left) {
      fighter.facing = -1;
    } else if (input.right) {
      fighter.facing = 1;
    }

    if (canDash && justDash && fighter.dashCooldownMs <= 0) {
      fighter.dashCooldownMs = DASH_COOLDOWN_MS;
      fighter.dashTimerMs = DASH_DURATION_MS;
      fighter.vx = fighter.facing * DASH_SPEED;
      fighter.vy = Math.min(fighter.vy, 140);
      spawnEffect(
        'dash',
        fighter.x + FIGHTER_WIDTH / 2 - fighter.facing * 18,
        fighter.y + FIGHTER_HEIGHT * 0.56,
        72,
        fighter.facing,
      );
      if (fighter.id === localFighterId) {
        playArenaCue('dash');
      }
    }

    const moveAxis = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const baseSpeed = MOVE_SPEED * fighter.speedMultiplier;
    if (fighter.dashTimerMs > 0) {
      fighter.vx = fighter.facing * DASH_SPEED;
      fighter.vy = Math.min(fighter.vy, 180);
    } else {
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

    let platformCarryX = 0;
    let platformCarryY = 0;
    const supportPlatform = previousPlatformsRef.current.find((platform) => {
      if (platform.id === STATIC_GROUND_PLATFORM.id) return false;
      const horizontalMatch = fighter.x + FIGHTER_WIDTH > platform.x && fighter.x < platform.x + platform.width;
      const bottom = fighter.y + FIGHTER_HEIGHT;
      return horizontalMatch && Math.abs(bottom - platform.y) < 10;
    });
    if (supportPlatform) {
      const movedPlatform = platformsRef.current.find((platform) => platform.id === supportPlatform.id);
      if (movedPlatform) {
        platformCarryX = movedPlatform.x - supportPlatform.x;
        platformCarryY = movedPlatform.y - supportPlatform.y;
      }
    }

    const nextX = clamp(fighter.x + platformCarryX + fighter.vx * deltaSeconds, 0, MAP_WIDTH - FIGHTER_WIDTH);
    const previousBottom = fighter.y + FIGHTER_HEIGHT;
    let nextY = fighter.y + platformCarryY + fighter.vy * deltaSeconds;
    let landed = false;

    const floorY = FLOOR_Y - FIGHTER_HEIGHT;
    if (nextY >= floorY) {
      nextY = floorY;
      fighter.vy = 0;
      landed = true;
    }

    for (const platform of platformsRef.current) {
      if (platform.id === STATIC_GROUND_PLATFORM.id) continue;
      const withinHorizontal =
        nextX + FIGHTER_WIDTH > platform.x && nextX < platform.x + platform.width;
      const landingFromAbove =
        previousBottom <= platform.y + 8 && nextY + FIGHTER_HEIGHT >= platform.y && fighter.vy >= 0;
      if (withinHorizontal && landingFromAbove) {
        if (platform.kind === 'bounce') {
          nextY = platform.y - FIGHTER_HEIGHT - 2;
          fighter.vy = -(platform.bounceBoost ?? 1120);
          landed = false;
          spawnEffect('hit', fighter.x + FIGHTER_WIDTH / 2, platform.y - 10, 34, fighter.facing);
          if (fighter.id === localFighterId) {
            playArenaCue('bounce');
          }
        } else {
          nextY = platform.y - FIGHTER_HEIGHT;
          fighter.vy = 0;
          landed = true;
        }
        break;
      }
    }

    fighter.x = nextX;
    fighter.y = nextY;
    fighter.onGround = landed;
    if (landed) {
      fighter.jumpsUsed = 0;
    }

    const movedDistance = Math.hypot(fighter.x - fighter.lastSampleX, fighter.y - fighter.lastSampleY);
    const wantsMovement = input.left || input.right || input.jump || input.dash;
    if (wantsMovement && movedDistance < 3.2) {
      fighter.stuckMs = Math.min(960, fighter.stuckMs + deltaSeconds * 1000);
    } else {
      fighter.stuckMs = Math.max(0, fighter.stuckMs - deltaSeconds * (landed ? 760 : 420));
    }
    fighter.lastSampleX = fighter.x;
    fighter.lastSampleY = fighter.y;

    if (justAttack) {
      applyAttack(fighter);
    }
    if (justThrow) {
      applyThrowWeapon(fighter);
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

    weaponPickupsRef.current.forEach((weapon) => {
      if (!weapon.active || fighter.weaponReady || weapon.pickupReadyAtMs > elapsedMsRef.current) return;
      const distance = Math.hypot(weapon.x - fighterCenterX(fighter), weapon.y - fighterCenterY(fighter));
      if (distance < WEAPON_PICKUP_RADIUS) {
        recoverWeapon(fighter, weapon);
      }
    });

    fighter.jumpHeld = input.jump;
    fighter.attackHeld = input.attack;
    fighter.throwHeld = input.throwWeapon;
    fighter.skillHeld = input.skill;
    fighter.dashHeld = input.dash;
    input.jumpPressed = false;
    input.dashPressed = false;
    input.attackPressed = false;
    input.throwPressed = false;
    input.skillPressed = false;
  };

  const finalizeMatch = (payload?: any) => {
    if (matchEndedRef.current) {
      return;
    }
    matchEndedRef.current = true;
    clearPendingRevivesForMatchEnd();
    const placements = (payload?.fighters as BattleRoyaleFighterView[] | undefined) ?? snapshotRef.current.fighters;
    const sorted = [...placements].sort((left, right) => {
      if (left.alive !== right.alive) return left.alive ? -1 : 1;
      if (left.kills !== right.kills) return right.kills - left.kills;
      return right.hp - left.hp;
    });
    const placement = Math.max(1, sorted.findIndex((fighter) => fighter.id === localFighterId) + 1);
    const local = sorted.find((fighter) => fighter.id === localFighterId);
    const localInternal = fightersRef.current.get(localFighterId) ?? null;
    const winner = sorted[0];
    const survivedMs = local?.alive
      ? snapshotRef.current.elapsedMs
      : local?.survivedMs ?? localInternal?.eliminatedAtMs ?? snapshotRef.current.elapsedMs;

    setResult({
      winnerId: winner?.id ?? null,
      winnerName: winner?.name ?? '无人幸存',
      placement,
      kills: local?.kills ?? 0,
      damageDealt: Math.round(local?.damageDealt ?? localInternal?.damageDealt ?? 0),
      revived: Boolean(local?.hasRevived),
      survivedMs,
    });
    pushRoomNotice('本局已结算', 120000);
  };

  const maybeEndMatch = async () => {
    if (matchEndedRef.current) {
      return;
    }
    clearExpiredPendingRevives();
    const fighters = Array.from(fightersRef.current.values());
    const alive = fighters.filter((fighter) => fighter.alive);
    const pendingRevives = fighters.filter((fighter) => fighter.quizPending);
    if (alive.length > 1 && elapsedMsRef.current < MATCH_MAX_MS) {
      return;
    }
    if (alive.length === 1) {
      winnerIdRef.current = alive[0].id;
    } else if (alive.length === 0 && pendingRevives.length > 0 && elapsedMsRef.current < MATCH_MAX_MS) {
      return;
    }

    winnerIdRef.current = alive[0]?.id ?? null;
    fightersRef.current.forEach((fighter) => {
      fighter.quizPending = false;
    });
    pendingQuizzesRef.current = {};
    const payload = {
      winnerId: winnerIdRef.current,
      fighters: buildSnapshot(
        tickRef.current,
        elapsedMsRef.current,
        getZoneState(elapsedMsRef.current),
        fightersRef.current,
        pickupsRef.current,
        projectilesRef.current,
        weaponPickupsRef.current,
        effectsRef.current,
        killFeedRef.current,
        winnerIdRef.current,
        platformsRef.current,
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
    if (shouldExposeQaDebug() && typeof window !== 'undefined') {
      const debugWindow = window as Window & {
        __brRenderSnapshot?: BattleRoyaleSnapshot;
        __brSyncStats?: typeof syncStatsRef.current;
      };
      debugWindow.__brRenderSnapshot = currentSnapshot;
      debugWindow.__brSyncStats = { ...syncStatsRef.current };
    }
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

    currentSnapshot.platforms
      .filter((platform) => platform.id !== STATIC_GROUND_PLATFORM.id)
      .forEach((platform, index) => {
      if (platform.x + platform.width < cameraX - 120 || platform.x > cameraX + VIEW_WIDTH + 120) {
        return;
      }

      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 14);
      ctx.fillStyle =
        platform.kind === 'bounce'
          ? '#e87963'
          : platform.kind === 'moving'
            ? '#4f8ba2'
            : index % 2 === 0
              ? '#4b7d88'
              : '#436f82';
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(platform.x, platform.y - 6, platform.width, 12, 10);
      ctx.fillStyle =
        platform.kind === 'bounce'
          ? '#facc15'
          : platform.kind === 'moving'
            ? '#93c5fd'
            : index % 3 === 0
              ? '#8fe3bf'
              : '#7dd7b1';
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(platform.x + 12, platform.y + 6, platform.width - 24, 4);

      if (platform.kind === 'moving') {
        ctx.strokeStyle = 'rgba(191, 219, 254, 0.32)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (platform.axis === 'x') {
          ctx.moveTo(platform.x + 18, platform.y + platform.height / 2);
          ctx.lineTo(platform.x + platform.width - 18, platform.y + platform.height / 2);
        } else {
          ctx.moveTo(platform.x + platform.width / 2, platform.y + 6);
          ctx.lineTo(platform.x + platform.width / 2, platform.y + platform.height - 6);
        }
        ctx.stroke();
      } else if (platform.kind === 'bounce') {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.font = `bold 14px ${CANVAS_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('弹', platform.x + platform.width / 2, platform.y + platform.height - 6);
      } else if (index % 4 === 0) {
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
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.78)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 113, 133, 0.16)';
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(248, 113, 113, 0.1)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const drawWeaponModel = (mode: 'held' | 'pickup' | 'projectile') => {
      const bladeLength = mode === 'held' ? WEAPON_MODEL_LENGTH + 4 : WEAPON_MODEL_LENGTH;
      const bladeHalfHeight = mode === 'held' ? 6 : 5;
      const handleLength = mode === 'held' ? 18 : 16;

      if (mode !== 'held') {
        ctx.fillStyle = mode === 'projectile' ? 'rgba(244, 114, 182, 0.16)' : 'rgba(14, 165, 233, 0.2)';
        ctx.beginPath();
        ctx.ellipse(-bladeLength * 0.18, 10, 28, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-bladeLength * 0.48, -bladeHalfHeight, bladeLength, bladeHalfHeight * 2, 5);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(-8, -9, 16, 18, 4);
      ctx.fill();

      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.roundRect(-bladeLength * 0.48 - handleLength + 3, -4, handleLength, 8, 4);
      ctx.fill();

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(bladeLength * 0.58, 0);
      ctx.lineTo(bladeLength * 0.4, -bladeHalfHeight - 4);
      ctx.lineTo(bladeLength * 0.4, bladeHalfHeight + 4);
      ctx.closePath();
      ctx.fill();
    };

    currentSnapshot.pickups.forEach((pickup) => {
      if (!pickup.active) return;

      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = `${PICKUP_COLORS[pickup.type]}66`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 24, 0, Math.PI * 2);
      ctx.strokeStyle = `${PICKUP_COLORS[pickup.type]}88`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = PICKUP_COLORS[pickup.type];
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold 12px ${CANVAS_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(PICKUP_SYMBOLS[pickup.type], pickup.x, pickup.y + 4);
    });

    currentSnapshot.weapons.forEach((weapon) => {
      if (!weapon.active) return;
      ctx.save();
      ctx.translate(weapon.x, weapon.y);
      ctx.rotate(Math.sin(currentSnapshot.elapsedMs / 240) * 0.08);
      drawWeaponModel('pickup');
      ctx.restore();
    });

    currentSnapshot.projectiles.forEach((projectile) => {
      if (!projectile.active) return;
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.18)';
      ctx.beginPath();
      ctx.ellipse(-34, 0, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawWeaponModel('projectile');
      ctx.restore();
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

      if (fighter.hitFlashMs > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.24)';
        ctx.fillRect(fighter.x - 4, fighter.y - 4, FIGHTER_WIDTH + 8, FIGHTER_HEIGHT + 8);
      }

      if (fighter.weaponReady) {
        const handX = fighter.x + FIGHTER_WIDTH / 2 + fighter.facing * WEAPON_HOLD_OFFSET_X;
        const handY = fighter.y + FIGHTER_HEIGHT * 0.48;
        const swingTilt = fighter.swingMs > 0 ? (1 - fighter.swingMs / SWING_MS) * 0.48 : 0;
        ctx.save();
        ctx.translate(handX, handY);
        ctx.scale(fighter.facing, 1);
        ctx.rotate(0.12 + swingTilt);
        drawWeaponModel('held');
        ctx.restore();
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
      ctx.font = `bold 14px ${CANVAS_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(fighter.name, fighter.x + FIGHTER_WIDTH / 2, fighter.y - 26);
      ctx.font = `11px ${CANVAS_FONT_FAMILY}`;
      ctx.fillStyle = fighter.isBot ? '#bbf7d0' : '#bae6fd';
      ctx.fillText(
        fighter.isBot ? `${fighter.difficulty ?? 'bot'} AI` : `击败 ${fighter.kills}`,
        fighter.x + FIGHTER_WIDTH / 2,
        fighter.y - 38,
      );
    });

    currentSnapshot.effects.forEach((effect) => {
      const lifeProgress =
        effect.kind === 'slash'
          ? effect.ttlMs / EFFECT_TTL_SLASH_MS
          : effect.kind === 'hit'
            ? effect.ttlMs / EFFECT_TTL_HIT_MS
            : effect.kind === 'dash'
              ? effect.ttlMs / EFFECT_TTL_DASH_MS
              : effect.ttlMs / EFFECT_TTL_SHOCKWAVE_MS;
      ctx.save();
      if (effect.kind === 'slash') {
        const arcRadius = effect.radius * (1.04 - lifeProgress * 0.16);
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.16 + lifeProgress * 0.22})`;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(
          effect.x,
          effect.y,
          arcRadius,
          effect.facing === -1 ? Math.PI * 0.3 : -Math.PI * 0.6,
          effect.facing === -1 ? Math.PI * 1.1 : Math.PI * 0.2,
        );
        ctx.stroke();
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.22 + lifeProgress * 0.44})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(
          effect.x,
          effect.y,
          arcRadius,
          effect.facing === -1 ? Math.PI * 0.36 : -Math.PI * 0.52,
          effect.facing === -1 ? Math.PI * 1.02 : Math.PI * 0.12,
        );
        ctx.stroke();
      } else if (effect.kind === 'hit') {
        ctx.fillStyle = `rgba(251, 113, 133, ${0.14 + lifeProgress * 0.34})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (1.15 - lifeProgress * 0.28), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(254, 205, 211, ${0.16 + lifeProgress * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (0.62 + (1 - lifeProgress) * 0.22), 0, Math.PI * 2);
        ctx.stroke();
        for (let index = 0; index < 4; index += 1) {
          const angle = (Math.PI * 2 * index) / 4 + (1 - lifeProgress) * 0.38;
          const inner = effect.radius * 0.28;
          const outer = effect.radius * (0.78 + (1 - lifeProgress) * 0.16);
          ctx.strokeStyle = `rgba(254, 205, 211, ${0.1 + lifeProgress * 0.18})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(angle) * inner, effect.y + Math.sin(angle) * inner);
          ctx.lineTo(effect.x + Math.cos(angle) * outer, effect.y + Math.sin(angle) * outer);
          ctx.stroke();
        }
      } else if (effect.kind === 'dash') {
        ctx.translate(effect.x, effect.y);
        if (effect.facing === -1) {
          ctx.scale(-1, 1);
        }
        for (let index = 0; index < 3; index += 1) {
          ctx.fillStyle = `rgba(103, 232, 249, ${0.12 + lifeProgress * (0.22 - index * 0.04)})`;
          ctx.beginPath();
          ctx.roundRect(
            -effect.radius + index * 18,
            -12 + index * 4,
            effect.radius * (0.58 - index * 0.1),
            14 - index * 2,
            7,
          );
          ctx.fill();
        }
      } else {
        ctx.fillStyle = `rgba(167, 139, 250, ${0.05 + lifeProgress * 0.12})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (0.74 + (1 - lifeProgress) * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(216, 180, 254, ${0.14 + lifeProgress * 0.28})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (1.25 - lifeProgress * 0.4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(125, 211, 252, ${0.08 + lifeProgress * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (0.8 + (1 - lifeProgress) * 0.18), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
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
    ctx.font = `bold 20px ${CANVAS_FONT_FAMILY}`;
    ctx.fillText('宠物生存乱斗', 38, 48);
    ctx.font = `13px ${CANVAS_FONT_FAMILY}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`剩余 ${currentAliveCount} / ${currentSnapshot.fighters.length}`, 38, 76);
    ctx.fillText(`缩圈阶段 ${currentSnapshot.zone.phase}`, 38, 98);
    ctx.fillText(`用时 ${currentElapsedSeconds}s`, 38, 120);

    if (currentLocalView) {
      ctx.beginPath();
      ctx.roundRect(VIEW_WIDTH - 300, 18, 280, 154, 20);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.66)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold 18px ${CANVAS_FONT_FAMILY}`;
      ctx.fillText(currentLocalView.name, VIEW_WIDTH - 280, 46);
      ctx.font = `13px ${CANVAS_FONT_FAMILY}`;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`HP ${Math.round(currentLocalView.hp)}/${currentLocalView.maxHp}`, VIEW_WIDTH - 280, 72);
      ctx.fillText(`护盾 ${Math.round(currentLocalView.shield)}  护甲 ${Math.round(currentLocalView.armor)}`, VIEW_WIDTH - 280, 94);
      ctx.fillText(
        `击败 ${currentLocalView.kills}  武器 ${currentLocalView.weaponReady ? '就绪' : '待回收'}`,
        VIEW_WIDTH - 280,
        116,
      );
      ctx.font = `12px ${CANVAS_FONT_FAMILY}`;
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(buildLootHudLine(currentLocalView), VIEW_WIDTH - 280, 138);
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
          previousPlatformsRef.current = platformsRef.current;
          platformsRef.current = createPlatforms(elapsedMsRef.current);
          fightersRef.current.forEach((fighter) => {
            const input =
              fighter.id === localFighterId
                ? localInput
                : fighter.isBot
                  ? aiInputForFighter(
                      fighter,
                      fightersRef.current,
                      pickupsRef.current,
                      weaponPickupsRef.current,
                      zone,
                      elapsedMsRef.current,
                    )
                  : remoteInputsRef.current[fighter.id] ?? createDefaultInput();

            fighter.input = input;
            stepFighter(fighter, input, deltaSeconds);

            if (distanceToZone(fighter, zone) > zone.radius) {
              applyDamage(fighter, zoneDamagePerSecond(zone, elapsedMsRef.current) * deltaSeconds, null);
            }
          });

          stepProjectiles(deltaSeconds);
          stepEffects(deltaSeconds);

          pickupsRef.current.forEach((pickup, index) => {
            if (!pickup.active && pickup.respawnAtMs <= elapsedMsRef.current) {
              const candidateZones = buildSafePickupZones(zone);
              const spawnZone =
                candidateZones[(index + Math.floor(Math.random() * candidateZones.length)) % candidateZones.length];
              const spawn = rollPickupSpawn(spawnZone);
              pickup.active = true;
              pickup.type = rollPickupType(
                zone.phase,
                pickupsRef.current.filter((candidate) => candidate.active && candidate.id !== pickup.id),
              );
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
            projectilesRef.current,
            weaponPickupsRef.current,
            effectsRef.current,
            killFeedRef.current,
            winnerIdRef.current,
            platformsRef.current,
          );

          if (time - lastSnapshotSentRef.current > SNAPSHOT_INTERVAL_MS) {
            lastSnapshotSentRef.current = time;
            setSnapshot(snapshotRef.current);
            const transportSnapshot = createTransportSnapshot(snapshotRef.current);
            if (shouldExposeQaDebug()) {
              syncStatsRef.current.lastFullSnapshotBytes = JSON.stringify(snapshotRef.current).length;
              syncStatsRef.current.lastWireSnapshotBytes = JSON.stringify(transportSnapshot).length;
              syncStatsRef.current.platformsStripped = !Object.prototype.hasOwnProperty.call(
                transportSnapshot,
                'platforms',
              );
            }
            const snapshotSent = wsRef.current?.sendSnapshot(transportSnapshot) ?? false;
            if (snapshotSent) {
              initialHostSnapshotSentRef.current = true;
            }
            if (!snapshotSent && initialHostSnapshotSentRef.current) {
              syncStatsRef.current.droppedSnapshots += 1;
            }
          }

          if (time - lastUiSyncRef.current > UI_SYNC_INTERVAL_MS) {
            lastUiSyncRef.current = time;
            setSnapshot(snapshotRef.current);
          }

          await maybeEndMatch();
        } else {
          if (!hasAuthoritativeSnapshot) {
            if (time - lastUiSyncRef.current > UI_SYNC_INTERVAL_MS) {
              lastUiSyncRef.current = time;
              setSnapshot(snapshotRef.current);
            }
            drawFrame();
            return;
          }

          const previousFrameInput = previousFrameInputRef.current;
          pendingInputPulseRef.current.jumpPressed =
            pendingInputPulseRef.current.jumpPressed || (localInput.jump && !previousFrameInput.jump);
          pendingInputPulseRef.current.dashPressed =
            pendingInputPulseRef.current.dashPressed || (localInput.dash && !previousFrameInput.dash);
          pendingInputPulseRef.current.attackPressed =
            pendingInputPulseRef.current.attackPressed || (localInput.attack && !previousFrameInput.attack);
          pendingInputPulseRef.current.throwPressed =
            pendingInputPulseRef.current.throwPressed || (localInput.throwWeapon && !previousFrameInput.throwWeapon);
          pendingInputPulseRef.current.skillPressed =
            pendingInputPulseRef.current.skillPressed || (localInput.skill && !previousFrameInput.skill);
          previousFrameInputRef.current = {
            ...createDefaultInput(),
            ...localInput,
          };

          const snapshotAgeMs = clamp(time - lastAuthoritativeSnapshotAtRef.current, 0, MAX_RENDER_EXTRAPOLATION_MS);
          const predictedElapsedMs = Math.max(
            snapshotRef.current.elapsedMs + deltaSeconds * 1000,
            authoritativeSnapshotRef.current.elapsedMs + snapshotAgeMs,
          );
          const predictedPlatforms = createPlatforms(predictedElapsedMs);
          const outgoingInputPayload = buildOutgoingInputPayload(localInput);
          const predictedLocalFighter = predictGuestLocalFighter(
            fightersRef.current.get(localFighterId) ?? null,
            outgoingInputPayload,
            deltaSeconds,
            snapshotRef.current.platforms,
            predictedPlatforms,
          );

          snapshotRef.current = buildGuestRenderSnapshot(
            authoritativeSnapshotRef.current,
            snapshotRef.current,
            localInput,
            time,
            deltaSeconds,
            predictedLocalFighter,
          );
          elapsedMsRef.current = snapshotRef.current.elapsedMs;
          previousPlatformsRef.current = platformsRef.current;
          platformsRef.current = snapshotRef.current.platforms;

          const inputSignature = [
            localInput.left,
            localInput.right,
            localInput.jump,
            localInput.dash,
            localInput.attack,
            localInput.throwWeapon,
            localInput.skill,
            localInput.guard,
          ]
            .map((value) => (value ? '1' : '0'))
            .join('');
          const hasPendingPulse = Object.values(pendingInputPulseRef.current).some(Boolean);
          const timeSinceLastInputMs = time - lastInputSentRef.current;
          const inputChanged = inputSignature !== lastInputSignatureRef.current;
          const shouldSendKeepalive = timeSinceLastInputMs > INPUT_KEEPALIVE_INTERVAL_MS;
          const shouldSendChangedInput = inputChanged && timeSinceLastInputMs > INPUT_SEND_INTERVAL_MS;
          if (hasPendingPulse || shouldSendChangedInput || shouldSendKeepalive) {
            const inputSent =
              wsRef.current?.sendInput({
                fighterId: localFighterId,
                input: outgoingInputPayload,
              }) ?? false;
            if (inputSent) {
              lastInputSignatureRef.current = inputSignature;
              lastInputSentRef.current = time;
              syncStatsRef.current.inputMessagesSent += 1;
              pendingInputPulseRef.current = createInputPulseState();
            }
          }

          if (time - lastUiSyncRef.current > UI_SYNC_INTERVAL_MS) {
            lastUiSyncRef.current = time;
            setSnapshot(snapshotRef.current);
          }
        }

        drawFrame();
      } catch (error) {
        if (shouldExposeQaDebug()) {
          console.error('[PvpBattleRoyaleArena] Frame loop failed:', error);
        }
        pushRoomNotice('战场画面出现波动，系统正在尝试自动恢复；如果几秒后仍未恢复，请退出房间重新进入。', 5200);
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
  }, [finishCurrentRoom, hasAuthoritativeSnapshot, isHost, localFighterId]);

  const handleSubmitQuiz = async (answers: string[]) => {
    if (!quizOffer) return;
    const fighterId = quizOffer.fighterId;
    clearQuizSubmitTimeout();
    setQuizSubmitError(null);
    setSubmittingQuiz(true);

    if (isHost) {
      const questions = pendingQuizzesRef.current[fighterId] ?? quizOffer.questions;
      const success = evaluateBattleRoyaleQuiz(questions, answers);
      pendingQuizzesRef.current[fighterId] = [];
      resolveReviveOutcome(fighterId, success);
      return;
    }

    const sent =
      wsRef.current?.sendQuizSubmit({
        fighterId,
        answers,
      }) ?? false;

    if (!sent) {
      setSubmittingQuiz(false);
      setQuizSubmitError('当前连接不可用，答卷还没有发出去。请等待连接恢复后重新提交。');
      pushRoomNotice('答题提交失败，请等待连接恢复后重新提交。', 3600);
      return;
    }

    quizSubmitTimeoutRef.current = setTimeout(() => {
      quizSubmitTimeoutRef.current = null;
      if (!quizOfferRef.current || quizOfferRef.current.fighterId !== fighterId || matchEndedRef.current) {
        return;
      }
      setSubmittingQuiz(false);
      setQuizSubmitError('答题结果同步超时，请重新提交当前答卷。');
      pushRoomNotice('答题结果同步超时，请重新提交当前答卷。', 3600);
    }, 6500);
  };

  const handleExit = async () => {
    await leaveCurrentRoom();
    resetBattleRoyaleStore();
    onExit();
  };

  const handleSpectate = () => {
    setShowEliminationPrompt(false);
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

          {!isHost && !hasAuthoritativeSnapshot ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/74 backdrop-blur-sm">
              <div className="rounded-[28px] border border-cyan-300/15 bg-slate-900/92 px-7 py-6 text-center shadow-[0_24px_70px_rgba(2,6,23,0.52)]">
                <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                <div className="text-lg font-semibold text-white">正在同步战场</div>
                <div className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                  正在等待房主首帧快照。同步完成后会自动开始，避免出生错位和卡住。
                </div>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <div className="pointer-events-auto grid gap-3 rounded-full border border-white/10 bg-slate-950/78 px-5 py-3 text-xs text-slate-200 shadow-[0_18px_50px_rgba(2,6,23,0.55)] md:grid-cols-4 md:gap-6">
              <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-cyan-300" /> 方向键/A D 移动</div>
              <div className="flex items-center gap-2"><Wind className="h-3.5 w-3.5 text-cyan-300" /> W/↑ 跳跃，Space 冲刺</div>
              <div className="flex items-center gap-2"><Swords className="h-3.5 w-3.5 text-cyan-300" /> J 近战，K 投掷，L 冲击波</div>
              <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-cyan-300" /> S 防御；武器可回收，圈外掉血会递增</div>
            </div>
          </div>

          <div className="absolute right-4 top-4 w-[min(18rem,calc(100vw-1.25rem))] space-y-2">
            <div className="flex justify-end">
              <div
                data-testid="br-arena-connection-badge"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/78 px-2 py-0.5 text-[9px] font-medium text-slate-200 shadow-[0_16px_40px_rgba(2,6,23,0.42)] backdrop-blur-md"
              >
                {wsConnected ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-amber-300" />
                )}
                {connectionLabel(wsConnected, latencyMs)}
                {wsConnected && latencyMs > 0 ? <span className="text-[8px] text-slate-500">{latencyMs}ms</span> : null}
              </div>
            </div>

            <div
              data-testid="br-arena-status"
              className="rounded-[18px] border border-white/10 bg-slate-950/72 p-2.5 text-[11px] text-slate-200 backdrop-blur-md"
            >
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <AlertTriangle className="h-3 w-3 text-amber-300" />
                提示
              </div>
              <div className="mt-1.5 leading-5 text-slate-300">{roomNotice}</div>
            </div>

            {liveSnapshot.killFeed.length > 0 && (
              <div className="rounded-[18px] border border-white/10 bg-slate-950/72 p-2.5 text-[11px] text-slate-200 backdrop-blur-md">
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-white">
                  <Swords className="h-3 w-3 text-rose-300" />
                  播报
                </div>
                <div className="space-y-1.5">
                  {liveSnapshot.killFeed.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/[0.04] px-2.5 py-1.5 leading-5">
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showEliminationPrompt && !result && (
            <div className="absolute inset-0 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
              <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
                <div className="my-auto w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_26px_90px_rgba(2,6,23,0.58)]">
                  <div className="text-2xl font-black text-white">你已被淘汰</div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">
                    你可以继续观战等待最终结果，也可以现在退出房间返回大厅。
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleSpectate}
                      className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      继续观战
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExit()}
                      className="rounded-full bg-[linear-gradient(135deg,#f97316,#dc2626)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      退出房间
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="absolute inset-0 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md">
              <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
                <div className="my-auto w-full max-w-2xl rounded-[32px] border border-amber-300/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(10,15,30,0.98))] p-8 shadow-[0_26px_90px_rgba(2,6,23,0.58)]">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100">
                    <Trophy className="h-3.5 w-3.5" />
                    本局结算
                  </div>
                  <h2 className="text-3xl font-black text-white">战斗结果</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">冠军</div>
                      <div className="mt-1 text-2xl font-bold text-white">{result.winnerName}</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">你的名次</div>
                      <div className="mt-1 text-2xl font-bold text-white">第 {result.placement} 名</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">淘汰数</div>
                      <div className="mt-1 text-2xl font-bold text-white">{result.kills}</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">造成伤害</div>
                      <div className="mt-1 text-2xl font-bold text-white">{result.damageDealt}</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">生存时间</div>
                      <div className="mt-1 text-2xl font-bold text-white">{(result.survivedMs / 1000).toFixed(1)} 秒</div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-slate-400">是否复活过</div>
                      <div className="mt-1 text-2xl font-bold text-white">{result.revived ? '是' : '否'}</div>
                    </div>
                  </div>
                  <div className="mt-6 text-sm leading-6 text-slate-300">
                    下一局建议优先补防弹衣、护盾核和冲击波，缩圈后近战与投掷更强。
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
            </div>
          )}

          <BattleRoyaleQuizModal
            isOpen={Boolean(quizOffer)}
            questions={quizOffer?.questions ?? []}
            submitting={submittingQuiz}
            submitError={quizSubmitError}
            onSubmit={handleSubmitQuiz}
          />
        </div>
      </MobileGameWrapper>
    </div>
  );
}
