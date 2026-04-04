import type { AgeGroup } from '@/types/ageGroup';
import type { PetType } from '@/types/pet';

export type BattleRoyaleDifficulty = 'easy' | 'medium' | 'hard';
export type BattleRoyaleRoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface BattleRoyaleHuman {
  user_id: number;
  username: string;
  pet_type: PetType | string;
  pet_name: string;
  pet_stage?: number;
  movement_skills?: string[];
  age_group: AgeGroup | string;
  is_host: boolean;
  connected?: boolean;
  disconnected_at?: string | null;
  joined_at: string;
}

export interface BattleRoyaleBot {
  id: string;
  name: string;
  difficulty: BattleRoyaleDifficulty;
  pet_type: PetType | string;
  pet_name: string;
  pet_stage?: number;
  joined_at: string;
}

export interface BattleRoyaleRoom {
  id: string;
  room_name: string;
  status: BattleRoyaleRoomStatus;
  host_user_id: number;
  host_username: string;
  max_players: number;
  participant_count: number;
  human_count: number;
  bot_count: number;
  created_at: string;
  started_at: string | null;
  match_seed?: number | null;
  humans: BattleRoyaleHuman[];
  bots: BattleRoyaleBot[];
}

export interface BattleRoyaleRoomListResponse {
  rooms: BattleRoyaleRoom[];
  cap: number;
}

export interface BattleRoyaleRoomResponse {
  room: BattleRoyaleRoom;
  cap?: number;
  reused?: boolean;
  joined?: boolean;
  started?: boolean;
  recoverable?: boolean;
}

export interface BattleRoyaleParticipantPayload {
  username?: string;
  pet_type: string;
  pet_name: string;
  pet_stage?: number;
  movement_skills?: string[];
  age_group: AgeGroup;
}

export interface BattleRoyaleCreateRoomPayload extends BattleRoyaleParticipantPayload {
  room_name: string;
  max_players: number;
}

export type BrPickupType =
  | 'med_kit'
  | 'armor_vest'
  | 'shield_core'
  | 'damage_claw'
  | 'wind_boost'
  | 'shockwave_charge';

export interface BattleRoyaleQuizQuestion {
  id: string;
  question: string;
  options?: string[];
  answer: string | string[];
  subject: string;
  type: 'choice' | 'fill';
}

export interface BattleRoyaleQuizOffer {
  fighterId: string;
  questions: BattleRoyaleQuizQuestion[];
}

export interface BattleRoyaleFighterView {
  id: string;
  userId?: number;
  name: string;
  petType: string;
  petStage: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  armor: number;
  kills: number;
  alive: boolean;
  facing: 1 | -1;
  isBot: boolean;
  difficulty?: BattleRoyaleDifficulty;
  hasRevived: boolean;
  reviveUsed?: boolean;
  quizPending?: boolean;
  damageDealt?: number;
  survivedMs?: number;
  specialCharges: number;
  buffs: Partial<Record<BrPickupType, number>>;
  weaponReady: boolean;
  swingMs: number;
  hitFlashMs: number;
}

export interface BattleRoyalePickupView {
  id: string;
  type: BrPickupType;
  x: number;
  y: number;
  active: boolean;
}

export interface BattleRoyalePlatform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: 'static' | 'moving' | 'bounce';
  axis?: 'x' | 'y';
  travel?: number;
  speed?: number;
  phase?: number;
  bounceBoost?: number;
}

export interface BattleRoyaleProjectileView {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  rotation: number;
  active: boolean;
}

export interface BattleRoyaleWeaponPickupView {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  active: boolean;
}

export interface BattleRoyaleEffectView {
  id: string;
  kind: 'slash' | 'hit' | 'shockwave' | 'dash';
  x: number;
  y: number;
  radius: number;
  facing?: 1 | -1;
  ttlMs: number;
}

export interface BattleRoyaleSnapshot {
  tick: number;
  elapsedMs: number;
  zone: {
    centerX: number;
    centerY: number;
    radius: number;
    phase: number;
    nextShrinkAtMs: number;
  };
  fighters: BattleRoyaleFighterView[];
  pickups: BattleRoyalePickupView[];
  killFeed: Array<{
    id: string;
    text: string;
    createdAt: number;
  }>;
  winnerId: string | null;
  platforms: BattleRoyalePlatform[];
  projectiles: BattleRoyaleProjectileView[];
  weapons: BattleRoyaleWeaponPickupView[];
  effects: BattleRoyaleEffectView[];
}

export interface BattleRoyaleInputPayload {
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
  attack: boolean;
  throwWeapon: boolean;
  skill: boolean;
  guard: boolean;
  jumpPressed?: boolean;
  dashPressed?: boolean;
  attackPressed?: boolean;
  throwPressed?: boolean;
  skillPressed?: boolean;
}

export interface BattleRoyaleResult {
  winnerId: string | null;
  winnerName: string;
  placement: number;
  kills: number;
  damageDealt: number;
  revived: boolean;
  survivedMs: number;
}
