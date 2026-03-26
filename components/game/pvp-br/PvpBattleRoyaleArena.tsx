'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Shield, Swords, Trophy, Users, Wind } from 'lucide-react';

import MobileGameWrapper from '@/components/game/MobileGameWrapper';
import BattleRoyaleQuizModal from '@/components/game/pvp-br/BattleRoyaleQuizModal';
import { musicManager } from '@/lib/audio/musicManager';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { touchInputManager } from '@/lib/input/TouchInputManager';
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
const MAP_WIDTH = 4200;
const MAP_HEIGHT = 1800;
const FLOOR_Y = 1600;
const FIGHTER_WIDTH = 68;
const FIGHTER_HEIGHT = 78;
const FIGHTER_HP = 120;
const GRAVITY = 2400;
const MOVE_SPEED = 360;
const JUMP_FORCE = 860;
const DOUBLE_JUMP_FORCE = 820;
const DASH_SPEED = 920;
const DASH_DURATION_MS = 130;
const DASH_COOLDOWN_MS = 1200;
const ATTACK_RANGE = 96;
const ATTACK_DAMAGE = 16;
const ATTACK_COOLDOWN_MS = 540;
const ATTACK_ACTIVE_MS = 150;
const SAFE_ZONE_DAMAGE = 13;
const MATCH_MAX_MS = 300000;
const PICKUP_RESPAWN_MS = 14000;
const SNAPSHOT_INTERVAL_MS = 90;
const UI_SYNC_INTERVAL_MS = 120;

const ZONE_PHASES = [
  { until: 35000, radius: 1800 },
  { until: 80000, radius: 1400 },
  { until: 125000, radius: 1050 },
  { until: 170000, radius: 760 },
  { until: 220000, radius: 520 },
  { until: 260000, radius: 340 },
  { until: MATCH_MAX_MS, radius: 220 },
] as const;

const SPAWN_POINTS = [
  { x: 220, y: 1320 },
  { x: 520, y: 1080 },
  { x: 860, y: 1380 },
  { x: 1120, y: 980 },
  { x: 1500, y: 1220 },
  { x: 1820, y: 860 },
  { x: 2180, y: 1340 },
  { x: 2520, y: 1080 },
  { x: 2860, y: 780 },
  { x: 3240, y: 1220 },
  { x: 3520, y: 980 },
  { x: 3880, y: 1360 },
] as const;

const PICKUP_SPAWNS = [
  { x: 320, y: 1440 },
  { x: 650, y: 1320 },
  { x: 980, y: 1220 },
  { x: 1220, y: 920 },
  { x: 1540, y: 1440 },
  { x: 1800, y: 1120 },
  { x: 2050, y: 770 },
  { x: 2310, y: 1450 },
  { x: 2590, y: 1210 },
  { x: 2860, y: 880 },
  { x: 3140, y: 1400 },
  { x: 3400, y: 1100 },
  { x: 3720, y: 1450 },
  { x: 3960, y: 1200 },
] as const;

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
    { x: 180, y: 1410, width: 420, height: 22 },
    { x: 620, y: 1300, width: 360, height: 22 },
    { x: 990, y: 1180, width: 280, height: 22 },
    { x: 1280, y: 960, width: 260, height: 22 },
    { x: 1530, y: 1420, width: 460, height: 22 },
    { x: 1910, y: 1120, width: 300, height: 22 },
    { x: 2110, y: 780, width: 250, height: 22 },
    { x: 2360, y: 1420, width: 440, height: 22 },
    { x: 2670, y: 1210, width: 320, height: 22 },
    { x: 2900, y: 900, width: 280, height: 22 },
    { x: 3180, y: 1420, width: 420, height: 22 },
    { x: 3480, y: 1110, width: 300, height: 22 },
    { x: 3740, y: 1260, width: 280, height: 22 },
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

function pickBotSkills(difficulty: BattleRoyaleDifficulty): string[] {
  if (difficulty === 'hard') return ['double_jump', 'dash', 'glide', 'wall_jump'];
  if (difficulty === 'medium') return ['double_jump', 'dash', 'glide'];
  return ['double_jump'];
}

function createInitialFighters(room: BattleRoyaleRoom): Map<string, InternalFighter> {
  const fighters = new Map<string, InternalFighter>();
  let spawnIndex = 0;

  room.humans.forEach((human) => {
    const spawn = SPAWN_POINTS[spawnIndex % SPAWN_POINTS.length];
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
    const spawn = SPAWN_POINTS[spawnIndex % SPAWN_POINTS.length];
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
  const safeSpawn = SPAWN_POINTS.find((point) => Math.hypot(point.x - zone.centerX, point.y - zone.centerY) < zone.radius - 120);
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

function aiInputForFighter(
  fighter: InternalFighter,
  fighters: Map<string, InternalFighter>,
  pickups: InternalPickup[],
  zone: ReturnType<typeof getZoneState>,
): BattleRoyaleInputPayload {
  const candidates = Array.from(fighters.values()).filter((target) => target.id !== fighter.id && target.alive);
  const nearestEnemy = candidates.sort(
    (left, right) =>
      Math.hypot(left.x - fighter.x, left.y - fighter.y) - Math.hypot(right.x - fighter.x, right.y - fighter.y),
  )[0];

  const activePickup = pickups
    .filter((pickup) => pickup.active)
    .sort(
      (left, right) =>
        Math.hypot(left.x - fighter.x, left.y - fighter.y) - Math.hypot(right.x - fighter.x, right.y - fighter.y),
    )[0];

  const prefersLoot =
    fighter.difficulty !== 'easy' &&
    activePickup &&
    Math.hypot(activePickup.x - fighter.x, activePickup.y - fighter.y) < 320 &&
    fighter.hp > 28;

  const targetX = prefersLoot ? activePickup.x : nearestEnemy?.x ?? zone.centerX;
  const targetY = prefersLoot ? activePickup.y : nearestEnemy?.y ?? zone.centerY;
  const dx = targetX - fighter.x;
  const dy = targetY - fighter.y;
  const jump = dy < -80 && (fighter.onGround || fighter.movementSkills.includes('double_jump'));

  return {
    left: dx < -18,
    right: dx > 18,
    jump,
    dash:
      fighter.difficulty !== 'easy' &&
      fighter.onGround &&
      Math.abs(dx) > 220 &&
      Math.abs(dx) < 500 &&
      fighter.movementSkills.includes('dash'),
    attack: !!nearestEnemy && Math.abs(nearestEnemy.x - fighter.x) < ATTACK_RANGE && Math.abs(nearestEnemy.y - fighter.y) < 90,
    skill: fighter.specialCharges > 0 && !!nearestEnemy && Math.abs(nearestEnemy.x - fighter.x) < 170,
    guard: fighter.hp < 35 || (distanceToZone(fighter, zone) > zone.radius + 80 && fighter.shield <= 0),
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

  const liveSnapshot = snapshotRef.current;
  const localFighterView = snapshot.fighters.find((fighter) => fighter.id === localFighterId) ?? null;
  const aliveCount = snapshot.fighters.filter((fighter) => fighter.alive).length;
  const elapsedSeconds = Math.floor(snapshot.elapsedMs / 1000);

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
          setRoomNotice(payload.success ? '答题成功，半血复活' : '答题失败，本局出局');
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
          setRoomNotice(message.reason || '房间已关闭');
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
    setRoomNotice('本局已结算');
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

    const localView = snapshotRef.current.fighters.find((fighter) => fighter.id === localFighterId);
    const cameraX = clamp((localView?.x ?? zoneCenter.x) - VIEW_WIDTH / 2, 0, MAP_WIDTH - VIEW_WIDTH);
    const cameraY = clamp((localView?.y ?? zoneCenter.y) - VIEW_HEIGHT / 2, 0, MAP_HEIGHT - VIEW_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#071228');
    gradient.addColorStop(1, '#02111f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    ctx.fillStyle = '#17364d';
    ctx.fillRect(0, FLOOR_Y, MAP_WIDTH, MAP_HEIGHT - FLOOR_Y);

    platforms.forEach((platform, index) => {
      ctx.fillStyle = index % 2 === 0 ? '#24566e' : '#1a485f';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.fillRect(platform.x, platform.y, platform.width, 8);
    });

    const zone = snapshotRef.current.zone;
    ctx.save();
    ctx.fillStyle = 'rgba(29, 78, 216, 0.12)';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    snapshotRef.current.pickups.forEach((pickup) => {
      if (!pickup.active) return;
      const colors: Record<BrPickupType, string> = {
        med_kit: '#10b981',
        armor_vest: '#f59e0b',
        shield_core: '#60a5fa',
        damage_claw: '#ef4444',
        wind_boost: '#22d3ee',
        shockwave_charge: '#a855f7',
      };
      ctx.fillStyle = colors[pickup.type];
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pickupLabel(pickup.type).slice(0, 2), pickup.x, pickup.y + 4);
    });

    snapshotRef.current.fighters.forEach((fighter) => {
      const cacheKey = `${fighter.petType}-${fighter.petStage}`;
      const image = imageCacheRef.current[cacheKey];
      const width = FIGHTER_WIDTH + 16;
      const height = FIGHTER_HEIGHT + 18;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.beginPath();
      ctx.ellipse(fighter.x + FIGHTER_WIDTH / 2, fighter.y + FIGHTER_HEIGHT + 10, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!fighter.alive) {
        ctx.globalAlpha = 0.42;
      }

      if (canDrawImage(image)) {
        ctx.save();
        if (fighter.facing === -1) {
          ctx.translate(fighter.x + width / 2, fighter.y + height / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(image, -width / 2, -height / 2, width, height);
        } else {
          ctx.drawImage(image, fighter.x - 8, fighter.y - 8, width, height);
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
    ctx.fillText(`剩余 ${aliveCount} / ${snapshotRef.current.fighters.length}`, 38, 76);
    ctx.fillText(`缩圈阶段 ${snapshotRef.current.zone.phase}`, 38, 98);
    ctx.fillText(`用时 ${elapsedSeconds}s`, 38, 120);

    if (localFighterView) {
      ctx.beginPath();
      ctx.roundRect(VIEW_WIDTH - 300, 18, 280, 132, 20);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.66)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(localFighterView.name, VIEW_WIDTH - 280, 46);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`HP ${Math.round(localFighterView.hp)}/${localFighterView.maxHp}`, VIEW_WIDTH - 280, 72);
      ctx.fillText(`护盾 ${Math.round(localFighterView.shield)}  护甲 ${Math.round(localFighterView.armor)}`, VIEW_WIDTH - 280, 94);
      ctx.fillText(`击败 ${localFighterView.kills}  冲击波 ${localFighterView.specialCharges}`, VIEW_WIDTH - 280, 116);
    }
  };

  useEffect(() => {
    const loop = async (time: number) => {
      try {
        if (matchEndedRef.current) {
          drawFrame();
          animationRef.current = requestAnimationFrame(loop);
          return;
        }

        const previous = lastFrameTimeRef.current || time;
        const deltaMs = Math.min(time - previous, 32);
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
        setRoomNotice('战场渲染出现波动，系统正在自动恢复。');
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
