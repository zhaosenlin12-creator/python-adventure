'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePetStore } from '@/store/petStore';
import { useDecorationStore } from '@/store/decorationStore';
import { useCoinStore } from '@/store/coinStore';
import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';
import { PET_CONFIGS, STATUS_TEXT, STATUS_COLORS } from '@/types/pet';
import { InteractionType, INTERACTION_CONFIGS } from '@/types/interaction';
import { DECORATIONS, PlacedDecoration, TYPE_TEXT, getDecorationDisplaySize } from '@/types/decoration';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';
import { getCurrentStage, getStageAppearance } from '@/lib/petEvolution';
import './pet-home-animations.css';
import InteractionButton from './InteractionButton';
import DecorationShop from './DecorationShop';
import FoodSelector from './FoodSelector';
import FoodShop from './FoodShop';
import PetHomeGuide, { hasCompletedPetHomeGuide } from './PetHomeGuide';
import PetChatModal from './PetChatModal';
import { musicManager } from '@/lib/audio/musicManager';
import { playSound } from '@/lib/utils/soundManager';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Apple,
  ChevronUp,
  Coins,
  Cpu,
  Check,
  Heart,
  Home,
  Info,
  MoreHorizontal,
  Move,
  Package2,
  PawPrint,
  ShoppingBag,
  Shirt,
  Sparkles,
  Star,
  Trees,
  X,
  Zap,
} from 'lucide-react';

// 🌟 UI Enhanced Components
import AnimatedCloud from './home/AnimatedCloud';
import AnimatedSun from './home/AnimatedSun';
import HealingCornerPanel from './home/HealingCornerPanel';
import PetSpeechBubble from './home/PetSpeechBubble';
import HeartParticles, { useHeartParticles } from './home/HeartParticles';
import AmbientSounds, { AmbientSoundToggle } from './home/AmbientSounds';
import CozyRoomBackground from './home/CozyRoomBackground';
import FarmGrid, {
  findNearestFarmPlot,
  getOccupiedPlotIds,
  isPlantable,
} from './home/FarmGrid';
import GardenPlayPanel from './home/GardenPlayPanel';
import FurnitureRenderer from './home/FurnitureRenderer';
import InteractionFeedback, { setFeedbackTrigger } from './InteractionFeedback';
import PetMoodOverlay from './PetMoodOverlay';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

interface PetHomeSceneProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type HomeSceneKey = 'living' | 'garden';

interface HomeLane {
  minX: number;
  maxX: number;
  y: number;
}

interface PetActorState {
  x: number;
  y: number;
  laneIndex: number;
  direction: 'left' | 'right';
  isWalking: boolean;
  moveDurationMs: number;
}

interface WallSketch {
  id: number;
  left: string;
  top: string;
  rotate: number;
  scale: number;
  accent: string;
  accentSoft: string;
}

const SCENE_LANES: Record<HomeSceneKey, HomeLane[]> = {
  living: [
    { minX: 10, maxX: 34, y: 63 },
    { minX: 24, maxX: 52, y: 70 },
    { minX: 46, maxX: 72, y: 77 },
    { minX: 68, maxX: 90, y: 83 },
  ],
  garden: [
    { minX: 12, maxX: 36, y: 62 },
    { minX: 26, maxX: 54, y: 69 },
    { minX: 50, maxX: 76, y: 76 },
    { minX: 70, maxX: 90, y: 82 },
  ],
};

const LANE_DEPTH_SCALE = [0.82, 0.9, 1, 1.08];
const GOLDEN_DISTRIBUTION = 0.61803398875;
const HATCH_HINT_AUTO_COLLAPSE_MS = 5600;
const QUIET_ACTIONS = new Set<InteractionType>(['train', 'read', 'paint']);
const SCENE_PERFORMANCE_ACTIONS = new Set<InteractionType>(['train', 'read', 'paint', 'bath']);
const WALL_SKETCH_PALETTE = [
  ['#f472b6', '#fbcfe8'],
  ['#60a5fa', '#bfdbfe'],
  ['#f59e0b', '#fde68a'],
  ['#34d399', '#a7f3d0'],
  ['#a78bfa', '#ddd6fe'],
] as const;

function clampToRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function shouldCollapseHatchHint(userId?: number) {
  if (typeof window === 'undefined') {
    return false;
  }

  return hasCompletedPetHomeGuide(userId) || Boolean(window.localStorage.getItem('petWelcomeGuideCompleted'));
}

function buildWallSketch(id: number): WallSketch {
  const [accent, accentSoft] = WALL_SKETCH_PALETTE[id % WALL_SKETCH_PALETTE.length];
  return {
    id,
    left: `${18 + Math.random() * 58}%`,
    top: `${16 + Math.random() * 48}%`,
    rotate: -10 + Math.random() * 20,
    scale: 0.86 + Math.random() * 0.28,
    accent,
    accentSoft,
  };
}

function pickInitialActor(scene: HomeSceneKey, slot: number, total: number, preferredLane = 1): PetActorState {
  const lanes = SCENE_LANES[scene];
  const laneIndex = clampToRange((slot + preferredLane) % lanes.length, 0, lanes.length - 1);
  const lane = lanes[laneIndex];
  const travelWidth = Math.max(12, lane.maxX - lane.minX);
  const seed = (slot * GOLDEN_DISTRIBUTION + total * 0.11 + preferredLane * 0.17) % 1;
  const padding = Math.min(4.5, travelWidth * 0.12);
  const x = lane.minX + padding + seed * Math.max(6, travelWidth - padding * 2);

  return {
    x,
    y: lane.y + randomBetween(-0.45, 0.45),
    laneIndex,
    direction: seed > 0.5 ? 'left' : 'right',
    isWalking: false,
    moveDurationMs: 6400,
  };
}

function pickRoamingActorTarget(
  scene: HomeSceneKey,
  actor: Pick<PetActorState, 'x' | 'laneIndex'>,
  occupiedActors: Array<Pick<PetActorState, 'x' | 'laneIndex'>>
): PetActorState {
  const lanes = SCENE_LANES[scene];
  const laneShift = Math.random() < 0.12 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  const laneIndex = clampToRange(actor.laneIndex + laneShift, 0, lanes.length - 1);
  const lane = lanes[laneIndex];

  let x = clampToRange(actor.x + randomBetween(-10, 10), lane.minX, lane.maxX);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const conflict = occupiedActors.some(
      (occupied) => occupied.laneIndex === laneIndex && Math.abs(occupied.x - x) < 12
    );
    if (!conflict) {
      break;
    }
    x = clampToRange(randomBetween(lane.minX, lane.maxX), lane.minX, lane.maxX);
  }

  return {
    x,
    y: lane.y + randomBetween(-0.65, 0.65),
    laneIndex,
    direction: x >= actor.x ? 'right' : 'left',
    isWalking: true,
    moveDurationMs: Math.round(randomBetween(7000, 10800)),
  };
}

function adjustLeadActorForViewport(scene: HomeSceneKey, actor: PetActorState, isCompactViewport: boolean) {
  if (!isCompactViewport) {
    return actor;
  }

  const yOffset = scene === 'living' ? 6.6 : 5.8;
  const minY = scene === 'living' ? 58 : 57;
  const maxY = scene === 'living' ? 74 : 75;

  return {
    ...actor,
    x: clampToRange(actor.x, 18, 82),
    y: clampToRange(actor.y - yOffset, minY, maxY),
  };
}

function CuteHomeAmbientLayer({
  scene,
  burst,
  activeAction,
  combo,
  onStarlightCollect,
  compact = false,
  muted = false,
}: {
  scene: HomeSceneKey;
  burst: number;
  activeAction: InteractionType | null;
  combo: number;
  onStarlightCollect: (label: string) => void;
  compact?: boolean;
  muted?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldToneDownMotion = compact || muted || !!prefersReducedMotion;
  const accents =
    scene === 'garden'
      ? ['text-emerald-100/70', 'text-lime-100/65', 'text-sky-100/65', 'text-amber-100/70']
      : ['text-sky-100/70', 'text-fuchsia-100/65', 'text-amber-100/70', 'text-emerald-100/65'];
  const collectibles = scene === 'garden'
    ? [
        { label: '一片叶光', left: '22%', top: '38%', icon: Sparkles, tone: 'text-lime-100', bg: 'bg-emerald-300/18' },
        { label: '一颗露珠', left: '72%', top: '32%', icon: Star, tone: 'text-sky-100', bg: 'bg-sky-300/18' },
        { label: '一朵小花心', left: '58%', top: '62%', icon: Heart, tone: 'text-rose-100', bg: 'bg-rose-300/18' },
      ]
    : [
        { label: '一颗小星光', left: '24%', top: '34%', icon: Star, tone: 'text-amber-100', bg: 'bg-amber-300/18' },
        { label: '一个软抱抱', left: '74%', top: '42%', icon: Heart, tone: 'text-rose-100', bg: 'bg-rose-300/18' },
        { label: '一枚亮贴纸', left: '54%', top: '24%', icon: Sparkles, tone: 'text-sky-100', bg: 'bg-sky-300/18' },
      ];
  const floatingCount = muted ? 0 : compact ? 3 : 6;
  const burstCount = shouldToneDownMotion ? 5 : 8;
  const visibleCollectibles = compact ? collectibles.slice(0, 2) : collectibles;

  return (
    <div className="pointer-events-none absolute inset-0 z-[13] overflow-hidden">
      {Array.from({ length: floatingCount }, (_, index) => {
        const Icon = index % 3 === 0 ? Heart : index % 3 === 1 ? Sparkles : PawPrint;
        return (
          <motion.div
            key={index}
            className={`absolute ${accents[index % accents.length]} drop-shadow-[0_0_12px_rgba(255,255,255,0.38)]`}
            style={{
              left: `${8 + index * 15}%`,
              top: `${18 + (index % 4) * 13}%`,
            }}
            animate={{
              y: [0, -(shouldToneDownMotion ? 7 : 12) - index * (shouldToneDownMotion ? 0.8 : 1.4), 0],
              x: [0, shouldToneDownMotion ? 0 : index % 2 === 0 ? 5 : -5, 0],
              rotate: [0, shouldToneDownMotion ? 0 : index % 2 === 0 ? 10 : -10, 0],
              opacity: compact ? [0.18, 0.52, 0.18] : [0.22, 0.68, 0.22],
              scale: compact ? [0.68, 0.94, 0.68] : [0.72, 1.04, 0.72],
            }}
            transition={{
              duration: (shouldToneDownMotion ? 5.8 : 4.4) + index * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.22,
            }}
          >
            <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </motion.div>
        );
      })}

      <AnimatePresence>
        {burst > 0 && (
          <motion.div
            key={burst}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: burstCount }, (_, index) => (
              <motion.div
                key={index}
                className={`absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border border-white/24 bg-white/12 text-amber-100 shadow-[0_12px_28px_rgba(251,191,36,0.18)] backdrop-blur-sm ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}
                animate={{
                  x: Math.cos((index / burstCount) * Math.PI * 2) * (shouldToneDownMotion ? 94 + index * 5 : 120 + index * 8),
                  y: Math.sin((index / burstCount) * Math.PI * 2) * (shouldToneDownMotion ? 68 + index * 4 : 82 + index * 6),
                  scale: [0.2, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, shouldToneDownMotion ? 52 : 80],
                }}
                transition={{ duration: shouldToneDownMotion ? 1 : 1.15, ease: 'easeOut' }}
              >
                {index % 2 === 0 ? <Sparkles className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : <Heart className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill-current`} />}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {combo > 0 && !muted && (
        <motion.div
          key={combo}
          className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-100/30 bg-slate-950/34 font-bold text-amber-50 shadow-[0_14px_30px_rgba(251,191,36,0.16)] backdrop-blur-md ${compact ? 'top-4 px-2.5 py-0.5 text-[9px]' : 'top-5 px-3 py-1 text-[10px]'}`}
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
        >
          <Star className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill-current`} />
          星光连击 x{combo}
        </motion.div>
      )}

      {visibleCollectibles.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={`${scene}-${item.label}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStarlightCollect(item.label);
            }}
            title={`收集${item.label}`}
            aria-label={`收集${item.label}`}
            className={`pointer-events-auto absolute flex items-center justify-center rounded-full border border-white/20 ${item.bg} ${item.tone} shadow-[0_16px_30px_rgba(15,23,42,0.22)] backdrop-blur-md transition hover:border-white/40 hover:bg-white/18 ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
            style={{ left: item.left, top: item.top }}
            animate={{
              y: [0, -(shouldToneDownMotion ? 4 : 8) - index * (shouldToneDownMotion ? 1 : 2), 0],
              rotate: shouldToneDownMotion ? [0, 0, 0] : [-6, 6, -6],
              scale: compact ? [0.94, 1.02, 0.94] : [0.92, 1.04, 0.92],
            }}
            whileHover={shouldToneDownMotion ? undefined : { scale: 1.12 }}
            whileTap={{ scale: 0.82 }}
            transition={{
              duration: (shouldToneDownMotion ? 3.6 : 2.6) + index * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.18,
            }}
          >
            <Icon className={`${compact ? 'h-4 w-4' : 'h-4.5 w-4.5'} drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]`} />
          </motion.button>
        );
      })}

      {activeAction && !muted && (
        <div className="absolute left-[12%] top-[18%] flex gap-2">
          {['#fbbf24', '#38bdf8', '#f472b6'].map((color, index) => (
            <motion.span
              key={`${activeAction}-${color}`}
              className="h-3 w-8 rounded-full shadow-[0_8px_18px_rgba(15,23,42,0.18)]"
              style={{ backgroundColor: color }}
              animate={{ y: [0, -10, 0], rotate: [-8, 8, -8], opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 🏠 Pet Home Scene V3 - Final Optimized Version
 * 
 * Improvements:
 * 1. Visual overhaul with CozyRoomBackground and FurnitureRenderer
 * 2. Enhanced interactions (breathing, speech bubbles, heart particles)
 * 3. Integrated functionality from V3 (Food system, Inventory sync)
 * 4. Smoother animations and transitions
 */
export default function PetHomeSceneV3({ isOpen, onClose }: PetHomeSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const { currentPet, pets, setCurrentPet } = usePetStore();
  const { placedDecorations, ownedDecorations, loadDecorations, placeDecoration, removeDecoration, updateDecorationPosition } = useDecorationStore();
  const { balance: userCoins, loadBalance } = useCoinStore();
  const { inventory, loadInventory } = useFoodStore();
  const { token, isAuthenticated, user } = useAuthStore();
  const currentAppearance = currentPet ? getStageAppearance(currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1)) : null;
  const currentRenderScale = currentPet ? getPetVariantScale(migratePetType(currentPet.petType), 'home') : 1;
  const currentScale = currentAppearance ? ((currentAppearance.size || 48) / 48) * currentRenderScale : 1;
  const currentStageInfo = currentPet ? getCurrentStage(currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1)) : null;
  const getPetAuraClass = (stage: number, style?: string) => {
    if (style === 'tech') return 'bg-cyan-300/14';
    if (style === 'mythic') return 'bg-yellow-200/14';

    const auraMap: Record<number, string> = {
      0: 'bg-slate-200/10',
      1: 'bg-amber-200/14',
      2: 'bg-emerald-200/14',
      3: 'bg-sky-200/14',
      4: 'bg-violet-200/16',
      5: 'bg-yellow-100/18',
    };

    return auraMap[stage] || auraMap[0];
  };

  const getTechAccent = (petType?: string) => {
    switch (petType) {
      case 'bit_bot':
      case 'tech_bot':
        return {
          frame: 'rounded-xl border border-orange-300/50 bg-orange-500/10',
          glow: 'shadow-[0_0_18px_rgba(251,146,60,0.24)]',
          badge: 'bg-orange-900 text-orange-100 border border-orange-400/50',
          icon: <Cpu className="w-3 h-3" />,
          label: '灵光'
        };
      case 'data_sprite':
      case 'tech_drone':
        return {
          frame: 'rounded-full border border-sky-300/50 bg-sky-500/10 border-dashed',
          glow: 'shadow-[0_0_18px_rgba(56,189,248,0.28)]',
          badge: 'bg-sky-900 text-sky-100 border border-sky-400/50',
          icon: <Zap className="w-3 h-3" />,
          label: '巡游'
        };
      case 'ava_ai':
      case 'tech_ai':
        return {
          frame: 'rounded-full border border-rose-300/50 bg-rose-500/10',
          glow: 'shadow-[0_0_18px_rgba(244,63,94,0.24)]',
          badge: 'bg-rose-900 text-rose-100 border border-rose-400/50',
          icon: <Sparkles className="w-3 h-3" />,
          label: '冲刺'
        };
      default:
        return null;
    }
  };

  const [currentScene, setCurrentScene] = useState<HomeSceneKey>('living');
  const [showShop, setShowShop] = useState(false);
  const [showFoodShop, setShowFoodShop] = useState(false);
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [showPetChat, setShowPetChat] = useState(false);
  const [showHealingCorner, setShowHealingCorner] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showPetList, setShowPetList] = useState(false);
  const [showInteractionPanel, setShowInteractionPanel] = useState(false);
  const [showSceneOverview, setShowSceneOverview] = useState(false);
  const [showMobileUtilityTray, setShowMobileUtilityTray] = useState(false);
  const [isStarterMode, setIsStarterMode] = useState(false);
  const [isHatchHintCollapsed, setIsHatchHintCollapsed] = useState(() => shouldCollapseHatchHint(user?.id));
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [draggingDecoration, setDraggingDecoration] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  
  // Ambient Sound Toggle
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  // Heart Particles Trigger (triggered on pet click)
  const { trigger: heartTrigger, burst: burstHearts } = useHeartParticles();
  const [starlightBurst, setStarlightBurst] = useState(0);
  const [starlightCombo, setStarlightCombo] = useState(0);
  
  // Decoration Operation State
  const [selectedPlaced, setSelectedPlaced] = useState<PlacedDecoration | null>(null);
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false);
  
  // Confirm Modal State
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Pet Position and Movement
  const [petPosition, setPetPosition] = useState({ x: 50, y: 76 });
  const [petLaneIndex, setPetLaneIndex] = useState(1);
  const [petDirection, setPetDirection] = useState<'left' | 'right'>('right');
  const [isWalking, setIsWalking] = useState(false);
  const [petMoveDurationMs, setPetMoveDurationMs] = useState(4600);
  const [otherPetActors, setOtherPetActors] = useState<Record<number, PetActorState>>({});
  const walkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const walkStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const otherPetWalkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const otherPetStopTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const hatchHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType | null>(null);
  const [interactionPlaying, setInteractionPlaying] = useState(false);
  const [interactionPosition, setInteractionPosition] = useState({ x: 0, y: 0 });
  const [interactionFollowPet, setInteractionFollowPet] = useState(true);
  const [interactionSpeech, setInteractionSpeech] = useState<string | null>(null);
  const [wallSketches, setWallSketches] = useState<WallSketch[]>(() => [buildWallSketch(1), buildWallSketch(2)]);
  const petRef = useRef<HTMLDivElement | null>(null);
  const petPositionRef = useRef(petPosition);
  const petLaneIndexRef = useRef(petLaneIndex);
  const otherPetActorsRef = useRef(otherPetActors);
  const nextWallSketchIdRef = useRef(3);
  const otherPets = useMemo(() => (pets || []).filter((pet) => pet.id !== currentPet?.id), [pets, currentPet?.id]);
  
  // Load Data
  useEffect(() => {
    if (isOpen !== false && currentPet && isAuthenticated && token) {
      loadDecorations();
      loadInventory(token);
      loadBalance(token);
    }
  }, [isOpen, currentPet, isAuthenticated, token, loadDecorations, loadInventory, loadBalance]);
  
  // BGM Manager
  useEffect(() => {
    if (isOpen === false || !currentPet) return;
    // Switch to home BGM when entering (lock to prevent override)
    debugLog('[PetHome] Switching to home BGM');
    musicManager.lockBGM('home');
    return () => {
      // Switch back to main BGM when unmounting
      debugLog('[PetHome] Switching back to main BGM');
      musicManager.unlockBGM('home');
      musicManager.switchBGM('main');
    };
  }, [isOpen, currentPet?.id]);

  useEffect(() => {
    if (hatchHintTimeoutRef.current) {
      clearTimeout(hatchHintTimeoutRef.current);
      hatchHintTimeoutRef.current = null;
    }

    if (isOpen === false || !currentPet) {
      return;
    }

    const shouldStartCollapsed = shouldCollapseHatchHint(user?.id);
    setIsHatchHintCollapsed(shouldStartCollapsed);

    if (!shouldStartCollapsed) {
      hatchHintTimeoutRef.current = setTimeout(() => {
        setIsHatchHintCollapsed(true);
        hatchHintTimeoutRef.current = null;
      }, HATCH_HINT_AUTO_COLLAPSE_MS);
    }

    return () => {
      if (hatchHintTimeoutRef.current) {
        clearTimeout(hatchHintTimeoutRef.current);
        hatchHintTimeoutRef.current = null;
      }
    };
  }, [isOpen, currentPet?.id, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      setIsCompactViewport(window.innerWidth < 640 || window.innerHeight < 760);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (!isCompactViewport) {
      setShowMobileUtilityTray(false);
    }
  }, [isCompactViewport]);

  const getPetScreenPosition = useCallback(() => {
    if (petRef.current) {
      const rect = petRef.current.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    const rect = sceneRef.current?.getBoundingClientRect();
    if (rect) {
      return {
        x: rect.left + (rect.width * petPosition.x) / 100,
        y: rect.top + (rect.height * petPosition.y) / 100
      };
    }
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    return { x: 0, y: 0 };
  }, [petPosition.x, petPosition.y]);

  const handleStarlightMoment = useCallback((sourceLabel = '一颗小星光') => {
    if (!currentPet) {
      return;
    }

    playSound('collect_gem', { volume: 0.28 });
    setStarlightBurst((current) => current + 1);
    setStarlightCombo((current) => Math.min(current + 1, 99));
    burstHearts();
    setInteractionType('play');
    setInteractionPlaying(true);
    setInteractionFollowPet(true);
    setInteractionPosition(getPetScreenPosition());
    setInteractionSpeech(`${currentPet.name} 收到${sourceLabel}`);
  }, [burstHearts, currentPet, getPetScreenPosition]);

  useEffect(() => {
    if (starlightCombo <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStarlightCombo(0);
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [starlightCombo]);

  useEffect(() => {
    setFeedbackTrigger((type, pos, speech) => {
      setInteractionType(type);
      setInteractionPlaying(true);
      setInteractionFollowPet(!pos);
      const resolvedPos = pos ?? getPetScreenPosition();
      setInteractionPosition(resolvedPos);
      const dialogues = INTERACTION_CONFIGS[type]?.dialogues;
      const trimmedSpeech = speech?.trim();
      if (trimmedSpeech) {
        setInteractionSpeech(trimmedSpeech);
      } else if (dialogues?.length) {
        setInteractionSpeech(dialogues[Math.floor(Math.random() * dialogues.length)]);
      } else {
        setInteractionSpeech(null);
      }
      if (['pat', 'play', 'talk', 'chat'].includes(type)) {
        burstHearts();
      }
    });
    return () => setFeedbackTrigger(null);
  }, [getPetScreenPosition, burstHearts]);

  const addWallSketch = useCallback(() => {
    const nextId = nextWallSketchIdRef.current++;
    setWallSketches((previous) => [...previous.slice(-4), buildWallSketch(nextId)]);
  }, []);

  useEffect(() => {
    if (!interactionPlaying || !interactionFollowPet) return;
    let rafId = 0;
    const tick = () => {
      const nextPos = getPetScreenPosition();
      setInteractionPosition(prev =>
        prev.x === nextPos.x && prev.y === nextPos.y ? prev : nextPos
      );
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [interactionPlaying, interactionFollowPet, getPetScreenPosition]);

  useEffect(() => {
    petPositionRef.current = petPosition;
  }, [petPosition]);

  useEffect(() => {
    petLaneIndexRef.current = petLaneIndex;
  }, [petLaneIndex]);

  useEffect(() => {
    otherPetActorsRef.current = otherPetActors;
  }, [otherPetActors]);

  useEffect(() => {
    if (isOpen === false || !currentPet) return;

    const livingPets = otherPets.filter((pet) => !pet.isEgg && pet.petType !== 'egg');
    const leadActor = adjustLeadActorForViewport(
      currentScene,
      pickInitialActor(currentScene, 1, Math.max(2, livingPets.length + 1)),
      isCompactViewport
    );
    setPetPosition({ x: leadActor.x, y: leadActor.y });
    setPetLaneIndex(leadActor.laneIndex);
    setPetDirection(leadActor.direction);
    setPetMoveDurationMs(leadActor.moveDurationMs);
    setIsWalking(false);

    const actorMap = livingPets.reduce<Record<number, PetActorState>>((result, pet, index) => {
      result[pet.id] = pickInitialActor(currentScene, index, Math.max(1, livingPets.length), index % 2 === 0 ? 0 : 2);
      return result;
    }, {});
    setOtherPetActors(actorMap);
  }, [isCompactViewport, isOpen, currentPet?.id, currentScene, otherPets]);

  useEffect(() => {
    if (currentScene === 'garden') {
      setShowInteractionPanel(false);
    }
  }, [currentScene]);

  useEffect(() => {
    if (isOpen === false || typeof window === 'undefined') {
      return;
    }

    const shouldStartFocused = !hasCompletedPetHomeGuide(user?.id);
    setIsStarterMode(shouldStartFocused);
    setShowSceneOverview(false);
    setShowWardrobe(false);
    setShowPetList(false);

    if (shouldStartFocused) {
      setShowInteractionPanel(true);
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen === false || !currentPet) return;

    const clearWalkStop = () => {
      if (walkStopTimeoutRef.current) {
        clearTimeout(walkStopTimeoutRef.current);
        walkStopTimeoutRef.current = null;
      }
    };

    walkIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.42) {
        return;
      }

      const occupiedActors = Object.values(otherPetActorsRef.current);
      const targetActor = adjustLeadActorForViewport(
        currentScene,
        pickRoamingActorTarget(
          currentScene,
          {
            x: petPositionRef.current.x,
            laneIndex: petLaneIndexRef.current,
          },
          occupiedActors
        ),
        isCompactViewport
      );

      setPetDirection(targetActor.direction);
      setPetLaneIndex(targetActor.laneIndex);
      setPetMoveDurationMs(targetActor.moveDurationMs);
      setPetPosition({ x: targetActor.x, y: targetActor.y });
      setIsWalking(true);

      clearWalkStop();
      walkStopTimeoutRef.current = setTimeout(() => {
        setIsWalking(false);
      }, Math.max(2400, targetActor.moveDurationMs - 900));
    }, 7200);

    return () => {
      if (walkIntervalRef.current) {
        clearInterval(walkIntervalRef.current);
        walkIntervalRef.current = null;
      }
      clearWalkStop();
    };
  }, [isCompactViewport, isOpen, currentPet?.id, currentScene]);

  useEffect(() => {
    const livingPets = otherPets.filter((pet) => !pet.isEgg && pet.petType !== 'egg');
    if (isOpen === false || livingPets.length === 0) {
      return;
    }

    otherPetWalkIntervalRef.current = setInterval(() => {
      setOtherPetActors((previousActors) => {
        const actorIds = Object.keys(previousActors).map((value) => Number(value));
        if (actorIds.length === 0) {
          return previousActors;
        }

        const shuffledIds = [...actorIds].sort(() => Math.random() - 0.5);
        const movingIds = shuffledIds.slice(0, actorIds.length > 7 ? 2 : 1);
        const nextActors = { ...previousActors };

        movingIds.forEach((actorId) => {
          const currentActor = previousActors[actorId];
          if (!currentActor) {
            return;
          }

          const occupiedActors = Object.entries(previousActors)
            .filter(([id]) => Number(id) !== actorId)
            .map(([, actor]) => ({
              x: actor.x,
              laneIndex: actor.laneIndex,
            }));

          const targetActor = pickRoamingActorTarget(currentScene, currentActor, occupiedActors);
          nextActors[actorId] = {
            ...currentActor,
            ...targetActor,
          };

          const pendingTimeout = otherPetStopTimeoutsRef.current[actorId];
          if (pendingTimeout) {
            clearTimeout(pendingTimeout);
          }
          otherPetStopTimeoutsRef.current[actorId] = setTimeout(() => {
            setOtherPetActors((latestActors) => {
              const latestActor = latestActors[actorId];
              if (!latestActor) {
                return latestActors;
              }
              return {
                ...latestActors,
                [actorId]: {
                  ...latestActor,
                  isWalking: false,
                },
              };
            });
          }, Math.max(2400, targetActor.moveDurationMs - 960));
        });

        return nextActors;
      });
    }, 4200);

    return () => {
      if (otherPetWalkIntervalRef.current) {
        clearInterval(otherPetWalkIntervalRef.current);
        otherPetWalkIntervalRef.current = null;
      }
      Object.values(otherPetStopTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      otherPetStopTimeoutsRef.current = {};
    };
  }, [isOpen, currentScene, otherPets]);

  const resolveDecorationDropPosition = useCallback(
    (
      decorationId: string,
      x: number,
      y: number,
      scene: HomeSceneKey,
      movingPlacedId?: string | null,
    ) => {
      if (scene !== 'garden' || !isPlantable(decorationId)) {
        return { x, y };
      }

      const occupiedPlotIds = getOccupiedPlotIds(
        placedDecorations.filter(
          (placed) => placed.scene === 'garden' && (!movingPlacedId || placed.id !== movingPlacedId),
        ),
      );
      const nearestPlot = findNearestFarmPlot(x, y, occupiedPlotIds);
      if (!nearestPlot) {
        return { x, y };
      }

      return {
        x: nearestPlot.x,
        y: nearestPlot.y,
      };
    },
    [placedDecorations],
  );
  
  // Handle decoration drop (New placement)
  const handleDecorationDrop = async (e: React.MouseEvent) => {
    if (!draggingDecoration && !isDraggingPlaced) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp position within reasonable bounds
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(15, Math.min(85, y));
    
    if (draggingDecoration) {
      const snapped = resolveDecorationDropPosition(draggingDecoration, clampedX, clampedY, currentScene);
      // Place new decoration
      await placeDecoration(draggingDecoration, snapped.x, snapped.y, currentScene);
      playSound('decoration_place');
      setDraggingDecoration(null);
    } else if (isDraggingPlaced && selectedPlaced) {
      const snapped = resolveDecorationDropPosition(
        selectedPlaced.decorationId,
        clampedX,
        clampedY,
        currentScene,
        selectedPlaced.id,
      );
      // Move existing decoration
      await updateDecorationPosition(selectedPlaced.id, snapped.x, snapped.y);
      playSound('decoration_place');
      setIsDraggingPlaced(false);
    }
  };
  
  // Handle click on placed decoration - Select it
  const handlePlacedDecorationClick = (e: React.MouseEvent, placed: PlacedDecoration) => {
    e.stopPropagation();
    // If clicking already selected, deselect
    if (selectedPlaced?.id === placed.id) {
      setSelectedPlaced(null);
      setIsDraggingPlaced(false);
    } else {
      setSelectedPlaced(placed);
      setIsDraggingPlaced(false);
    }
  };
  
  // Start dragging placed decoration
  const handleStartDragPlaced = () => {
    if (selectedPlaced) {
      setIsDraggingPlaced(true);
    }
  };
  
  // Remove decoration - Show confirm
  const handleRemoveDecoration = () => {
    if (selectedPlaced) {
      setShowRemoveConfirm(true);
    }
  };
  
  // Confirm remove decoration
  const confirmRemoveDecoration = async () => {
    if (selectedPlaced && !isRemoving) {
      setIsRemoving(true);
      const decorationToRemove = selectedPlaced;
      
      // Optimistic UI update
      setSelectedPlaced(null);
      setShowRemoveConfirm(false);
      
      try {
        const success = await removeDecoration(decorationToRemove.id);
        if (success) {
          playSound('button_click');
        }
      } catch {
      } finally {
        setIsRemoving(false);
      }
    }
  };
  
  // Render placed decoration with animation
  const renderPlacedDecoration = (placed: PlacedDecoration) => {
    const decoration = DECORATIONS[placed.decorationId];
    if (!decoration) return null;
    
    const isSelected = selectedPlaced?.id === placed.id;
    const isWallMounted = decoration.anchor === 'wall';
    const isRugLike = decoration.id === 'rug_round' || decoration.type === 'floor';
    const decorationSize = getDecorationDisplaySize(decoration, currentScene);
    const baseZIndex = isWallMounted ? 14 : 18 + Math.round(placed.y * 0.22) + (isRugLike ? -1 : 0);
    const frameClass = isWallMounted ? 'rounded-[26px]' : isRugLike ? 'rounded-[999px]' : 'rounded-[32px]';
    const frameWidth = Math.round(decorationSize * (isWallMounted ? 0.9 : isRugLike ? 0.9 : 0.82));
    const frameHeight = Math.round(decorationSize * (isWallMounted ? 0.68 : isRugLike ? 0.28 : 0.72));
    
    return (
      <motion.div
        key={placed.id}
        className="absolute cursor-pointer group"
        style={{
          left: `${placed.x}%`,
          top: `${placed.y}%`,
          zIndex: isSelected ? baseZIndex + 12 : baseZIndex,
        }}
        initial={{ scale: 0, opacity: 0, y: -20 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0,
          x: '-50%',
        }}
        exit={{ 
          scale: 0, 
          opacity: 0, 
          y: 20,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 20,
          delay: 0.05
        }}
        whileHover={{ scale: isWallMounted ? 1.05 : 1.07, y: isWallMounted ? -2 : isRugLike ? -1 : -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => handlePlacedDecorationClick(e, placed)}
      >
        {/* Selection Border */}
        <AnimatePresence>
          {isSelected && (
            <motion.div 
              className={`absolute left-1/2 top-1/2 border border-sky-300/60 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),rgba(14,165,233,0.06)_48%,transparent_78%)] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_22px_44px_rgba(14,165,233,0.16)] ${frameClass}`}
              style={{
                width: frameWidth,
                height: frameHeight,
              }}
              initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-[10px] rounded-[20px] border border-white/12" />
              <div className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.8)]" />
              <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-sky-300/85 shadow-[0_0_10px_rgba(125,211,252,0.55)]" />
              <div className="absolute bottom-3 left-3 h-2.5 w-2.5 rounded-full bg-sky-300/85 shadow-[0_0_10px_rgba(125,211,252,0.55)]" />
              <div className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.8)]" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Furniture Renderer */}
        <motion.div 
          className="transition-transform duration-200"
          animate={{ 
            scale: isSelected ? 1.03 : 1,
            y: isSelected ? [0, isWallMounted ? -1.5 : -3, 0] : 0,
            rotate: isSelected && !isRugLike ? [0, 0.45, 0] : 0,
          }}
          transition={{ 
            y: { repeat: Infinity, duration: 2.6, repeatDelay: 0.2, ease: 'easeInOut' },
            rotate: { repeat: Infinity, duration: 2.6, repeatDelay: 0.2, ease: 'easeInOut' },
          }}
        >
          <FurnitureRenderer 
            decorationId={decoration.id} 
            name={decoration.name} 
            isSelected={isSelected}
            scene={currentScene}
          />
        </motion.div>
        
        {/* Decoration Name Label */}
        <motion.div 
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${isWallMounted ? 'top-full mt-2' : '-bottom-8'}`}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: isSelected ? 1 : 0, y: isSelected ? 0 : -5 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          <span className="rounded-full border border-white/12 bg-slate-950/88 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(2,6,23,0.22)]">
            {decoration.name}
          </span>
        </motion.div>
      </motion.div>
    );
  };
  
  if (isOpen === false) return null;
  if (!currentPet) return null;
  
  const resolvedPetType = migratePetType(currentPet.petType);
  const petConfig = PET_CONFIGS[resolvedPetType];
  const currentStageIndex = currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1);
  const currentImageUrl = getPetImageUrl(resolvedPetType, isWalking ? 'normal' : currentPet.status, currentStageIndex);
  const currentTechAccent = getTechAccent(resolvedPetType);
  const roamingOtherPets = otherPets.filter((pet) => !pet.isEgg && pet.petType !== 'egg');
  const currentSceneDecorations = placedDecorations.filter((placed) => placed.scene === currentScene);
  const selectedDecorationMeta = selectedPlaced ? DECORATIONS[selectedPlaced.decorationId] : null;
  const comfortScore = currentSceneDecorations.reduce((total, placed) => {
    const effect = DECORATIONS[placed.decorationId]?.effect;
    return total + (effect?.comfort ?? 0) + (effect?.happiness ?? 0);
  }, 0);
  const sceneMoodLabel =
    currentScene === 'garden'
      ? '慢节奏庭院'
      : comfortScore > 26
        ? '高舒适陪伴'
        : comfortScore > 12
          ? '温暖生活感'
          : '正在慢慢成形';
  const currentStatusText = STATUS_TEXT[currentPet.status];
  const currentStatusColor = STATUS_COLORS[currentPet.status];
  const homeHour = new Date().getHours();
  const routineLabel =
    currentScene === 'garden'
      ? '适合种植、散步和慢养成'
      : homeHour < 11
        ? '早晨适合整理小屋和打招呼'
        : homeHour < 18
          ? '白天适合互动、阅读和训练'
          : '夜晚适合安静陪伴和放松';
  const interactiveHint =
    currentScene === 'garden'
      ? '庭院更适合多宠慢慢散步、种植和观察互动。'
      : '客厅更适合连续互动、装扮和提升陪伴感。';
  const interactionModeLabel = currentScene === 'garden' ? '庭院陪玩' : '客厅互动';
  const interactionDockHint = currentScene === 'garden' ? '悬停图标查看玩法' : '点图标就能直接互动';
  const homeAtmosphereScore = Math.min(
    100,
    46 + Math.min(comfortScore, 28) + currentSceneDecorations.length * 3 + Math.min(roamingOtherPets.length + 1, 5) * 4,
  );
  const careSignalLabel =
    currentScene === 'garden'
      ? currentSceneDecorations.length > 4
        ? '庭院生态稳定'
        : '庭院等待布置'
      : comfortScore > 26
        ? '高品质陪伴'
        : comfortScore > 12
          ? '温暖陪伴中'
          : '小屋可继续升级';
  const rhythmSignals = [
    {
      id: 'mood',
      label: '情绪',
      value: currentStatusText,
      icon: Heart,
      tone: 'text-rose-100',
    },
    {
      id: 'scene',
      label: '场景',
      value: currentScene === 'garden' ? '庭院' : '客厅',
      icon: currentScene === 'garden' ? Trees : Home,
      tone: 'text-emerald-100',
    },
    {
      id: 'comfort',
      label: '氛围',
      value: `${homeAtmosphereScore}%`,
      icon: Sparkles,
      tone: 'text-sky-100',
    },
  ];

  const compactRhythmSignals = isCompactViewport ? rhythmSignals.slice(0, 2) : rhythmSignals;
  const shouldShowRhythmSignals = !isCompactViewport && !isStarterMode;
  const shouldToneDownHomeMotion = isCompactViewport || !!prefersReducedMotion;
  const petBodyScale = isCompactViewport ? currentScale * 0.92 : currentScale;
  const petBodySizeClass = isCompactViewport ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-32 w-32';
  const showCompactBottomDock = false;
  const interactionDockPositionClass = isCompactViewport
    ? 'right-4 bottom-16'
    : isStarterMode
      ? 'right-5 bottom-24'
      : 'right-20 bottom-28 sm:right-24';
  const interactionDockSurfaceClass = isCompactViewport
    ? 'w-[188px] rounded-[20px] px-1.5 py-1.5'
    : 'w-[188px] rounded-[20px] px-1.5 py-1.5';
  const topBarWrapClass = isCompactViewport
    ? 'pointer-events-none absolute inset-x-0 top-0 z-50 px-3 pt-3'
    : 'absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-950/80 via-slate-950/18 to-transparent px-3 pt-2.5';
  const topBarCardClass = isCompactViewport
    ? 'mx-auto max-w-[1460px]'
    : 'mx-auto max-w-[1460px] rounded-[20px] border border-white/6 bg-slate-950/34 px-2 py-1.5 shadow-[0_14px_28px_rgba(2,6,23,0.2)] backdrop-blur-md';
  const shouldMuteAmbientLayer =
    showHealingCorner || (isCompactViewport && (showInteractionPanel || interactionPlaying));
  const shouldPausePetSpeech =
    showHealingCorner || (isCompactViewport && (currentScene === 'garden' || showInteractionPanel || interactionPlaying));
  const starterHintPositionClass = isCompactViewport
    ? 'left-1/2 top-[5.6rem] w-[min(92vw,320px)] -translate-x-1/2'
    : 'left-5 bottom-6 max-w-[260px]';
  const starterHintBodyClass = isCompactViewport ? 'rounded-[22px] px-3 py-2.5' : 'rounded-full px-3 py-2';

  const activePerformanceAction =
    interactionPlaying && interactionType && SCENE_PERFORMANCE_ACTIONS.has(interactionType) ? interactionType : null;
  const shouldShowInteractionSpeech =
    interactionPlaying && interactionSpeech && (!interactionType || !QUIET_ACTIONS.has(interactionType));

  const interactionMotion = (() => {
    if (!interactionPlaying || !interactionType) {
      return { x: 0, y: 0, rotate: 0, scale: 1 };
    }
    switch (interactionType) {
      case 'train':
        return {
          x: [0, 10, -12, 14, -8, 0],
          y: [0, -12, -28, -10, -22, 0],
          rotate: [0, -10, 15, -8, 12, 0],
          scale: [1, 1.04, 0.95, 1.07, 0.98, 1],
        };
      case 'play':
        return { y: [0, -22, -8, -18, 0], rotate: [0, 8, -8, 6, 0], scale: [1, 1.04, 0.99, 1.03, 1] };
      case 'talk':
        return { rotate: [0, -10, 10, -8, 0], y: [0, -3, 0] };
      case 'pat':
        return { scale: [1, 1.1, 0.98, 1.03, 1], y: [0, -4, 0] };
      case 'read':
        return { x: [0, -2, 1, -1, 0], y: [0, -4, -6, -3, 0], rotate: [0, -5, 2, -4, 0], scale: [1, 0.995, 1, 0.995, 1] };
      case 'paint':
        return { rotate: [0, 12, -8, 10, -5, 0], x: [0, 8, -10, 6, -2, 0], y: [0, -2, -5, -1, 0], scale: [1, 1.01, 0.99, 1.02, 1] };
      case 'chat':
        return { x: [0, 8, -8, 6, 0], y: [0, -5, 0], scale: [1, 1.03, 1] };
      case 'bath':
        return { rotate: [0, 6, -7, 5, 0], x: [0, 2, -2, 1, 0], y: [0, -4, -1, -3, 0], scale: [1, 1.03, 0.99, 1.01, 1] };
      default:
        return { x: 0, y: 0, rotate: 0, scale: 1 };
    }
  })();
  const interactionTransition = interactionPlaying
    ? interactionType === 'train'
      ? { duration: 1.28, repeat: Infinity, ease: 'easeInOut' as const }
      : interactionType === 'read'
        ? { duration: 1.55, repeat: Infinity, ease: 'easeInOut' as const }
        : interactionType === 'paint'
          ? { duration: 1.18, repeat: Infinity, ease: 'easeInOut' as const }
          : interactionType === 'bath'
            ? { duration: 1.35, repeat: Infinity, ease: 'easeInOut' as const }
            : { duration: 0.82, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
    : { duration: 0.2 };
  
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900">
      {/* Top Bar */}
      <div className={topBarWrapClass}>
        <div className={topBarCardClass}>
          <div className={`flex justify-between gap-2 ${isCompactViewport ? 'items-start' : 'flex-wrap items-center'}`}>
            <div className={`min-w-0 flex-1 ${isCompactViewport ? 'pointer-events-auto max-w-[34vw] rounded-[20px] border border-white/8 bg-slate-950/36 px-2 py-1.5 shadow-[0_12px_22px_rgba(2,6,23,0.18)] backdrop-blur-md' : ''}`}>
              <div className="flex flex-wrap items-center gap-1">
                <div className={`rounded-full border border-sky-300/16 bg-sky-500/10 font-semibold uppercase tracking-[0.22em] text-sky-100 ${isCompactViewport ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[8px]'}`}>
                  Pet Home
                </div>
                <div className={`rounded-full border border-white/10 bg-white/[0.04] font-semibold ${currentStatusColor} ${isCompactViewport ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
                  {currentStatusText}
                </div>
                {currentStageInfo && !isCompactViewport && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                    {currentStageInfo.name}
                  </span>
                )}
              </div>

              <div className={`mt-1 flex items-center ${isCompactViewport ? 'gap-1' : 'flex-wrap gap-1.5'}`}>
                <h2 className={`truncate font-black tracking-tight text-white pixel-text-shadow ${isCompactViewport ? 'max-w-[36vw] text-[12px] leading-[1.15]' : 'max-w-[42vw] text-sm sm:text-base'}`}>
                  {currentPet.name}的小屋
                </h2>
                <span className="sr-only">{routineLabel}</span>
              </div>

              {!isStarterMode && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <div className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] text-slate-200 ${isCompactViewport ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
                  <Coins className="h-3 w-3 text-amber-300" />
                  <span className="font-semibold text-white">{userCoins}</span>
                </div>
                <div className={`items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] text-slate-200 ${isCompactViewport ? 'hidden' : 'inline-flex px-2 py-0.5 text-[10px]'}`}>
                  <PawPrint className="h-3 w-3 text-sky-200" />
                  <span>{roamingOtherPets.length + 1} 只伙伴</span>
                </div>
                <div className="hidden max-w-[144px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200 md:inline-flex" title={routineLabel}>
                  <Sparkles className="h-3 w-3 shrink-0 text-emerald-200" />
                  <span className="truncate">{sceneMoodLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSceneOverview((value) => !value)}
                  className={`items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] hover:text-white ${isCompactViewport ? 'hidden' : 'inline-flex h-6 w-6'}`}
                  title={showSceneOverview ? '收起场景状态' : '展开场景状态'}
                  aria-label={showSceneOverview ? '收起场景状态' : '展开场景状态'}
                >
                  {showSceneOverview ? <ChevronUp className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5 text-sky-200" />}
                </button>
              </div>
              )}
            </div>

            <div className={`relative flex shrink-0 items-center ${isCompactViewport ? 'pointer-events-auto rounded-[999px] border border-white/10 bg-slate-950/52 px-1.5 py-1.5 shadow-[0_16px_28px_rgba(2,6,23,0.24)] backdrop-blur-md gap-1' : 'gap-1'}`}>
              <div className={`flex items-center rounded-full border border-white/10 bg-slate-950/58 p-0.5 ${isCompactViewport ? 'gap-0.5 border-none bg-transparent p-0' : 'gap-1'}`}>
                <button
                  onClick={() => setCurrentScene('living')}
                  title="切换到客厅"
                  aria-label="切换到客厅"
                  className={`flex items-center justify-center rounded-full px-0 py-0 text-[10px] font-semibold transition-all ${isCompactViewport ? 'h-7 w-7' : 'h-8 w-8'} ${
                    currentScene === 'living'
                      ? 'bg-sky-600 text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5" />
                    <span className="sr-only">客厅</span>
                  </span>
                </button>
                <button
                  onClick={() => setCurrentScene('garden')}
                  title="切换到庭院"
                  aria-label="切换到庭院"
                  className={`flex items-center justify-center rounded-full px-0 py-0 text-[10px] font-semibold transition-all ${isCompactViewport ? 'h-7 w-7' : 'h-8 w-8'} ${
                    currentScene === 'garden'
                      ? 'bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.28)]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Trees className="h-3.5 w-3.5" />
                    <span className="sr-only">庭院</span>
                  </span>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowHealingCorner((value) => !value);
                  setShowInteractionPanel(false);
                  setShowMobileUtilityTray(false);
                }}
                className={`flex items-center justify-center gap-1 rounded-full border text-white transition ${isCompactViewport ? 'h-[30px] px-1.5' : 'h-7 px-2'} ${
                  showHealingCorner
                    ? 'border-emerald-300/45 bg-emerald-500/18'
                    : 'border-white/10 bg-white/[0.05] hover:scale-[1.03] hover:bg-white/[0.1]'
                }`}
                title="打开心能角"
                aria-label="打开心能角"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden text-[10px] font-semibold sm:inline">心能角</span>
              </button>

              {!isStarterMode && (
                <>
                <button
                  onClick={() => setShowShop(true)}
                  className={`flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:scale-[1.03] hover:bg-white/[0.1] ${isCompactViewport ? 'h-[30px] w-[30px]' : 'h-7 w-7'}`}
                  title="打开装饰商店"
                  aria-label="打开装饰商店"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowFoodShop(true)}
                  className={`flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:scale-[1.03] hover:bg-white/[0.1] ${isCompactViewport ? 'h-[30px] w-[30px]' : 'h-7 w-7'}`}
                  title="打开食物补给"
                  aria-label="打开食物补给"
                >
                  <Apple className="h-4 w-4" />
                </button>
                {!isCompactViewport && (
                  <button
                    onClick={() => setShowPetList(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:scale-[1.03] hover:bg-white/[0.1]"
                    title="查看所有宠物伙伴"
                    aria-label="查看所有宠物伙伴"
                  >
                    <PawPrint className="h-4 w-4" />
                  </button>
                )}
              {!isCompactViewport && (
                <AmbientSoundToggle
                  enabled={ambientEnabled}
                  onToggle={() => setAmbientEnabled(v => !v)}
                />
              )}
                </>
              )}
              {!isStarterMode && isCompactViewport && (
                <button
                  type="button"
                  onClick={() => setShowMobileUtilityTray((value) => !value)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
                  title={showMobileUtilityTray ? '收起快捷工具' : '展开快捷工具'}
                  aria-label={showMobileUtilityTray ? '收起快捷工具' : '展开快捷工具'}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className={`flex items-center justify-center rounded-full border border-red-300/25 bg-red-500/18 text-white transition hover:scale-105 hover:bg-red-500/28 ${isCompactViewport ? 'h-[30px] w-[30px]' : 'h-7 w-7'}`}
                  title="关闭"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
              {isCompactViewport && showMobileUtilityTray && !isStarterMode && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[72] w-[132px] rounded-[22px] border border-white/10 bg-slate-950/92 p-2 shadow-[0_22px_38px_rgba(2,6,23,0.32)] backdrop-blur-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSceneOverview((value) => !value);
                        setShowMobileUtilityTray(false);
                      }}
                      className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                    >
                      <Info className="h-4 w-4 text-sky-200" />
                      概览
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPetList(true);
                        setShowMobileUtilityTray(false);
                      }}
                      className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                    >
                      <PawPrint className="h-4 w-4 text-sky-200" />
                      宠物
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAmbientEnabled((value) => !value);
                        setShowMobileUtilityTray(false);
                      }}
                      className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                    >
                      <Sparkles className={`h-4 w-4 ${ambientEnabled ? 'text-emerald-100' : 'text-slate-300'}`} />
                      音景
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Left Sidebar - Wardrobe */}
      {!isStarterMode && (
      <button
        onClick={() => {
          setShowInteractionPanel(false);
          setShowMobileUtilityTray(false);
          setShowWardrobe(!showWardrobe);
        }}
        className={`absolute z-40 flex items-center justify-center rounded-full border border-white/10 bg-slate-950/68 text-white shadow-[0_16px_28px_rgba(2,6,23,0.2)] transition-all hover:scale-[1.03] hover:bg-slate-900/76 ${isCompactViewport ? 'left-4 bottom-[4.5rem] h-10 w-10' : 'left-5 bottom-20 h-11 w-11'}`}
        title="我的衣柜"
      >
        <Shirt className="h-5 w-5" />
      </button>
      )}
      
      {/* Right Sidebar - Food Backpack */}
      {!isStarterMode && (
      <button
        onClick={() => {
          setShowWardrobe(false);
          setShowPetList(false);
          setShowFoodShop(false);
          setShowInteractionPanel(false);
          setShowMobileUtilityTray(false);
          setShowFoodSelector(true);
        }}
        className={`absolute z-40 flex items-center justify-center rounded-full border border-white/10 bg-slate-950/68 text-white shadow-[0_16px_28px_rgba(2,6,23,0.2)] transition-all hover:scale-[1.03] hover:bg-slate-900/76 ${isCompactViewport ? 'right-4 bottom-[4.5rem] h-10 w-10' : 'right-5 bottom-20 h-11 w-11'}`}
        title="食物背包"
      >
        <Package2 className="h-5 w-5" />
      </button>
      )}
      
      {/* Main Game Area (using CozyRoomBackground) */}
      <div 
        ref={sceneRef}
        className="w-full h-full relative"
        onClick={(draggingDecoration || isDraggingPlaced) ? handleDecorationDrop : undefined}
        style={{ cursor: (draggingDecoration || isDraggingPlaced) ? 'crosshair' : 'default' }}
      >
        <CozyRoomBackground scene={currentScene}>
          <CuteHomeAmbientLayer
            scene={currentScene}
            burst={starlightBurst}
            activeAction={activePerformanceAction}
            combo={starlightCombo}
            onStarlightCollect={handleStarlightMoment}
            compact={shouldToneDownHomeMotion}
            muted={shouldMuteAmbientLayer}
          />

          {/* Decorations */}
          {placedDecorations
            .filter(p => p.scene === currentScene)
            .map(placed => renderPlacedDecoration(placed))}

          {currentScene === 'living' && (
            <div className="pointer-events-none absolute right-[10%] top-[15%] z-[12] hidden xl:block">
              <div className="relative h-[182px] w-[252px] overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.08))] shadow-[0_22px_48px_rgba(15,23,42,0.2)] backdrop-blur-[1px]">
                <div className="absolute inset-x-5 top-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">Inspiration Nook</div>
                    <div className="mt-1 text-sm font-semibold text-white/92">陪伴灵感角</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-amber-100/90">
                    <PawPrint className="h-4 w-4" />
                  </div>
                </div>
                <div className="absolute inset-x-5 top-[52px] bottom-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,250,240,0.9),rgba(255,241,219,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_rgba(15,23,42,0.08)]">
                  <div className="absolute inset-x-4 top-3 h-[8px] rounded-full bg-amber-950/8 blur-md" />
                  <div className="absolute left-4 top-3 flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-white/72 px-2 py-1 text-[10px] font-semibold text-amber-900">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    今日灵感
                  </div>
                  <div className="absolute right-4 top-3 h-8 w-8 rounded-full bg-rose-100/90 shadow-[0_10px_18px_rgba(251,113,133,0.16)]">
                    <Heart className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-rose-400" />
                  </div>
                </div>
                {wallSketches.map((sketch) => (
                  <motion.div
                    key={sketch.id}
                    className="absolute h-16 w-16 rounded-[20px] border border-amber-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,235,0.88))] shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
                    style={{
                      left: `calc(${sketch.left} - 2%)`,
                      top: `calc(${sketch.top} + 22px)`,
                      rotate: `${sketch.rotate}deg`,
                      scale: sketch.scale,
                    }}
                    initial={{ opacity: 0.72, scale: sketch.scale * 0.94 }}
                    animate={{ opacity: 0.96, scale: sketch.scale }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <div className="absolute left-1/2 top-2 h-2 w-6 -translate-x-1/2 rounded-full bg-amber-200/70" />
                    <div className="absolute right-2 top-2 h-3 w-3 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.08)]" />
                    <div className="absolute left-3 top-4 h-4 w-4 rounded-full" style={{ backgroundColor: sketch.accentSoft }} />
                    <div
                      className="absolute left-4 top-8 h-2 w-8 rounded-full"
                      style={{ backgroundColor: sketch.accent, transform: 'rotate(-14deg)' }}
                    />
                    <div
                      className="absolute left-4 top-11 h-1.5 w-6 rounded-full"
                      style={{ backgroundColor: sketch.accentSoft, transform: 'rotate(18deg)' }}
                    />
                    <div
                      className="absolute left-7 top-12 h-5 w-5 rounded-full border-[3px]"
                      style={{ borderColor: sketch.accent }}
                    />
                    <Star className="absolute right-3 bottom-3 h-3.5 w-3.5 text-amber-400/70" />
                  </motion.div>
                ))}
                {activePerformanceAction === 'paint' && (
                  <motion.div
                    className="absolute bottom-4 right-5 h-16 w-16 rounded-[22px] border border-fuchsia-300/45 bg-white/92 shadow-[0_14px_28px_rgba(217,70,239,0.18)]"
                    initial={{ opacity: 0.3, scale: 0.9, rotate: -5 }}
                    animate={{ opacity: [0.65, 1, 0.8], scale: [0.95, 1.04, 1], rotate: [-5, 0, 4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute left-3 top-3 h-2 w-9 rounded-full bg-fuchsia-300" />
                    <div className="absolute left-5 top-6 h-2 w-6 rounded-full bg-sky-300" />
                    <div className="absolute left-4 top-9 h-3 w-3 rounded-full bg-amber-300" />
                    <div className="absolute left-9 top-9 h-3 w-3 rounded-full bg-emerald-300" />
                    <Sparkles className="absolute right-2 top-2 h-3.5 w-3.5 text-fuchsia-400/70" />
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {currentScene === 'living' && (
            <div className="pointer-events-none absolute left-[18%] bottom-[31%] z-[11] hidden lg:block">
              <motion.div
                className="relative h-[138px] w-[214px]"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute left-[20px] bottom-[6px] h-[18px] w-[150px] rounded-full bg-slate-950/20 blur-md" />
                <div className="absolute left-[16px] top-[20px] h-[88px] w-[154px] rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,250,242,0.16),rgba(169,132,85,0.12))] shadow-[0_18px_34px_rgba(15,23,42,0.14)]">
                  <div className="absolute inset-x-[18px] top-[16px] h-[14px] rounded-full bg-white/16 blur-sm" />
                  <div className="absolute left-[26px] bottom-[18px] h-[34px] w-[96px] rounded-[22px] bg-[linear-gradient(180deg,rgba(255,228,203,0.38),rgba(201,146,86,0.24))]" />
                  <div className="absolute left-[40px] bottom-[34px] h-[16px] w-[68px] rounded-full bg-white/18" />
                  <div className="absolute left-[26px] top-[18px] h-[28px] w-[12px] rounded-[4px] bg-emerald-300/32" />
                  <div className="absolute left-[42px] top-[14px] h-[32px] w-[14px] rounded-[4px] bg-sky-300/28" />
                  <div className="absolute left-[60px] top-[20px] h-[24px] w-[16px] rounded-[4px] bg-rose-300/28" />
                  <div className="absolute right-[26px] top-[16px] h-[18px] w-[18px] rounded-full bg-amber-100/34" />
                  <div className="absolute right-[34px] bottom-[20px] h-[28px] w-[44px] rounded-[18px] bg-amber-950/18" />
                </div>
                <motion.div
                  className="absolute right-[10px] top-[4px] flex gap-1.5"
                  animate={{ y: [0, -4, 0], rotate: [-6, 4, -6] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="h-3 w-3 rounded-full bg-amber-200/90 shadow-[0_0_10px_rgba(253,224,71,0.38)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-200/80 shadow-[0_0_10px_rgba(125,211,252,0.3)]" />
                  <span className="h-3 w-3 rounded-full bg-rose-200/82 shadow-[0_0_10px_rgba(251,113,133,0.3)]" />
                </motion.div>
              </motion.div>
            </div>
          )}

          {currentScene === 'garden' && (
            <div className="pointer-events-none absolute left-1/2 bottom-[25%] z-[11] hidden lg:block -translate-x-1/2">
              <div className="relative h-[170px] w-[320px]">
                <div className="absolute left-[46px] right-[46px] bottom-[10px] h-[18px] rounded-full bg-slate-950/18 blur-md" />
                <div className="absolute left-[58px] right-[58px] top-[12px] h-[18px] rounded-[999px] bg-[linear-gradient(180deg,rgba(246,211,164,0.75),rgba(148,102,58,0.78))] shadow-[0_10px_18px_rgba(15,23,42,0.12)]" />
                <div className="absolute left-[70px] top-[28px] h-[100px] w-[12px] rounded-full bg-[linear-gradient(180deg,rgba(145,98,56,0.86),rgba(87,56,25,0.96))]" />
                <div className="absolute right-[70px] top-[28px] h-[100px] w-[12px] rounded-full bg-[linear-gradient(180deg,rgba(145,98,56,0.86),rgba(87,56,25,0.96))]" />
                <div className="absolute left-[86px] right-[86px] top-[30px] h-[84px] rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(110,231,183,0.04))]" />
                <div className="absolute left-[102px] right-[102px] bottom-[30px] h-[34px] rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(110,231,183,0.18),rgba(56,189,248,0.08),transparent)]" />
                <div className="absolute left-[86px] right-[86px] bottom-[18px] h-[16px] rounded-[999px] border border-white/10 bg-white/[0.05]" />
                <div className="absolute left-[100px] right-[100px] bottom-[22px] h-[8px] rounded-full bg-emerald-100/12" />
                <div className="absolute left-[64px] right-[64px] top-[22px] flex items-center justify-between px-2">
                  {['rgba(253,224,71,0.88)', 'rgba(251,113,133,0.82)', 'rgba(125,211,252,0.86)', 'rgba(167,139,250,0.86)', 'rgba(110,231,183,0.86)'].map((bulb, index) => (
                    <motion.span
                      key={`garden-arbor-bulb-${index}`}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: bulb, boxShadow: `0 0 12px ${bulb}` }}
                      animate={{ opacity: [0.35, 1, 0.35], scale: [0.82, 1.14, 0.82] }}
                      transition={{ duration: 1.7 + index * 0.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.14 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isStarterMode && !isCompactViewport && (
          <AnimatePresence initial={false}>
            {isHatchHintCollapsed ? (
              <motion.button
                key="hatch-hint-chip"
                type="button"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={() => setIsHatchHintCollapsed(false)}
                className="absolute left-5 top-24 z-30 rounded-full border border-sky-300/30 bg-slate-950/78 px-3 py-1.5 text-xs font-semibold text-sky-100 shadow-lg backdrop-blur-md"
                title="展开孵化提醒"
              >
                孵化提醒
              </motion.button>
            ) : (
              <motion.div
                key="hatch-hint-card"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute left-5 top-24 z-30 w-[min(84vw,286px)] rounded-[24px] border border-white/10 bg-slate-950/74 px-3.5 py-3 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-300">孵化提醒</div>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-100">
                      切换伙伴后，直接去挑战一个没通关过的新关卡，就会推进孵化进度。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHatchHintCollapsed(true)}
                    className="shrink-0 rounded-full border border-slate-700 bg-slate-900/70 p-1.5 text-slate-200 transition hover:border-sky-300/40 hover:text-white"
                    aria-label="收起孵化提醒"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 text-[11px] leading-5 text-slate-300">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                    点小屋里的其他宠物，就能马上切到新的跟随伙伴。
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                    首次通关新关卡后会自动结算孵化进度，不用再额外设置。
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}

          {showSceneOverview && !isStarterMode && (
            <div className="absolute left-5 top-[160px] z-20 w-[184px] rounded-[18px] border border-white/10 bg-slate-950/74 p-2 shadow-[0_14px_28px_rgba(2,6,23,0.2)] backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                    {currentScene === 'garden' ? '庭院状态' : '小屋状态'}
                  </div>
                  <div className="mt-1 truncate text-xs font-black text-white">{sceneMoodLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSceneOverview(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="收起场景状态"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">装饰</div>
                  <div className="mt-1 text-xs font-bold text-white">{currentSceneDecorations.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">舒适</div>
                  <div className="mt-1 text-xs font-bold text-white">{comfortScore}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">伙伴</div>
                  <div className="mt-1 text-xs font-bold text-white">{roamingOtherPets.length + 1}</div>
                </div>
                <p className="sr-only">
                  顶部切换场景，右下打开互动，左下继续布置小屋。
                </p>
              </div>

              <div className="mt-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-white">{careSignalLabel}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">陪伴同步 {homeAtmosphereScore}%</div>
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-200" />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8,#fbbf24)]"
                    initial={false}
                    animate={{ width: `${homeAtmosphereScore}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-2.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] leading-4 text-slate-300">
                {interactiveHint}
              </div>
            </div>
          )}

          {currentScene === 'garden' && (
            <>
              <FarmGrid placedDecorations={currentSceneDecorations} />
              <GardenPlayPanel
                userId={user?.id}
                currentPetName={currentPet.name}
                companionCount={roamingOtherPets.length + 1}
                visible
                compact={isCompactViewport}
              />
            </>
          )}

          {/* Other Pets Render */}
          {roamingOtherPets.map((pet) => {
            const actor = otherPetActors[pet.id];
            if (!actor) {
              return null;
            }

            const resolvedType = migratePetType(pet.petType);
            const config = PET_CONFIGS[resolvedType];
            const stageIndex = pet.evolution_stage ?? (pet.isEgg ? 0 : 1);
            const petImgUrl = getPetImageUrl(resolvedType, pet.status, stageIndex);
            const hasAsset = !!petImgUrl;
            const appearance = getStageAppearance(stageIndex);
            const depthScale = LANE_DEPTH_SCALE[actor.laneIndex] ?? 1;
            const scale = ((appearance.size || 48) / 48) * Math.min(getPetVariantScale(resolvedType, 'home') * 0.68, 1.36) * depthScale;
            const techAccent = getTechAccent(resolvedType);

            return (
              <div
                key={pet.id}
                className="absolute cursor-pointer"
                style={{
                  left: `${actor.x}%`,
                  top: `${actor.y}%`,
                  transform: `translate(-50%, -50%) scaleX(${actor.direction === 'left' ? -1 : 1})`,
                  transition: `left ${actor.moveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), top ${actor.moveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  zIndex: 18 + actor.laneIndex * 4,
                  opacity: Math.min(1, 0.82 + actor.laneIndex * 0.05),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPet(pet);
                }}
                title={`切换 ${pet.name} 为当前跟随`}
              >
                <motion.div
                  className="relative group"
                  animate={{
                    y: actor.isWalking ? [0, -1.1, 0] : [0, -0.35, 0],
                    scale: actor.isWalking ? [1, 1.008, 1] : [1, 1.003, 1],
                  }}
                  transition={{
                    duration: actor.isWalking ? 2.8 : 4.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="relative flex h-20 w-20 items-center justify-center" style={{ transform: `scale(${scale})` }}>
                    <div className={`absolute inset-2 rounded-full blur-lg ${getPetAuraClass(stageIndex, pet.petStyle)}`} />
                    <div className="absolute inset-x-2 bottom-2 h-3 rounded-full bg-slate-950/16 blur-md" />
                    {techAccent && (
                      <div className={`absolute -bottom-1 -right-1 z-10 px-1 py-0.5 text-[9px] rounded-full flex items-center gap-1 ${techAccent.badge}`}>
                        {techAccent.icon}
                      </div>
                    )}
                    {hasAsset ? (
                      <img
                        src={petImgUrl}
                        alt={pet.name}
                        className="pet-sprite pet-sprite-chip h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-5xl drop-shadow-lg">{config.icon}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="rounded-full border border-slate-600 bg-slate-800/90 px-2 py-0.5 text-xs text-white">
                      {pet.name}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}

          {/* Pet Render */}
          <div 
            className="absolute z-30 cursor-pointer"
            style={{
              left: `${petPosition.x}%`,
              top: `${petPosition.y}%`,
              transform: `translate(-50%, -50%) scaleX(${petDirection === 'left' ? -1 : 1})`,
              transition: `left ${petMoveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), top ${petMoveDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
            }}
            onClick={() => burstHearts()}
            ref={petRef}
          >
            <motion.div
              className="relative group"
              animate={interactionMotion}
              transition={interactionTransition}
            >
              {shouldShowInteractionSpeech && (
                <motion.div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-40"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ transform: `translateX(-50%) ${petDirection === 'left' ? 'scaleX(-1)' : ''}`.trim() }}
                >
                  <div className="relative">
                    <div className="bg-slate-900/90 rounded-2xl px-4 py-2 shadow-lg border border-cyan-500/40 min-w-[120px] max-w-[220px]">
                      <p className="text-sm text-slate-100 font-medium text-center whitespace-normal leading-snug">
                        {interactionSpeech}
                      </p>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <svg width="20" height="10" viewBox="0 0 20 10">
                        <path d="M0 0 L10 10 L20 0" fill="rgba(15,23,42,0.9)" stroke="rgba(6,182,212,0.4)" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Pet Speech Bubble */}
              <div style={{ transform: petDirection === 'left' ? 'scaleX(-1)' : undefined }}>
                <PetSpeechBubble
                  petName={currentPet.name}
                  mood={isWalking ? 'happy' : 'normal'}
                  compact={isCompactViewport}
                  paused={shouldPausePetSpeech}
                />
              </div>

              {/* Pet Mood Overlay */}
              <PetMoodOverlay
                status={currentPet.status}
                isInteracting={interactionPlaying}
                interactionType={interactionType}
              />

              {currentScene === 'living' ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-[8px]">
                  <motion.div
                    className="mx-auto h-10 w-[118px] rounded-[999px] border border-amber-100/12"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(255,223,164,0.26) 0%, rgba(251,191,36,0.1) 42%, transparent 82%)',
                      boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
                    }}
                    animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.56, 0.8, 0.56] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="mx-auto -mt-6 h-5 w-[76px] rounded-full bg-white/8 blur-md" />
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-x-0 bottom-[8px]">
                  <motion.div
                    className="mx-auto h-11 w-[126px] rounded-[999px] border border-emerald-100/10"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(110,231,183,0.2) 0%, rgba(56,189,248,0.08) 40%, transparent 82%)',
                      boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
                    }}
                    animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 0.78, 0.5] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute left-1/2 top-[6px] flex -translate-x-1/2 gap-2">
                    {[0, 1, 2].map((index) => (
                      <motion.span
                        key={`pet-stage-firefly-${index}`}
                        className="h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(253,224,71,0.5)]"
                        animate={{ y: [0, -6 - index * 2, 0], opacity: [0.22, 0.85, 0.22] }}
                        transition={{ duration: 2.2 + index * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
                      />
                    ))}
                  </div>
                </div>
              )}
               
              {/* Pet Body (with breathing animation) */}
              <motion.div 
                className={`relative flex items-center justify-center ${petBodySizeClass}`}
                animate={{
                  scale: isWalking ? [petBodyScale, petBodyScale * 1.018, petBodyScale] : [petBodyScale, petBodyScale * 1.008, petBodyScale],
                  y: isWalking ? [0, -2.4, 0] : [0, -0.8, 0]
                }}
                transition={{
                  duration: isWalking ? 2.6 : 4.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: petBodyScale * 1.08 }}
                whileTap={{ scale: petBodyScale * 0.9 }}
                style={currentAppearance?.glowEffect ? { filter: 'drop-shadow(0 0 18px rgba(255, 215, 0, 0.6))' } : undefined}
              >
                <div className={`absolute inset-4 rounded-full blur-2xl ${getPetAuraClass(currentStageIndex, currentPet.petStyle)}`} />
                <div className="absolute inset-x-5 bottom-3 h-5 rounded-full bg-slate-950/16 blur-xl" />
                {activePerformanceAction && (
                  <div className="pointer-events-none absolute inset-0">
                    {activePerformanceAction === 'train' && (
                      <>
                        <motion.div
                          className="absolute inset-3 rounded-full border border-amber-300/60"
                          animate={{ scale: [0.78, 1.12], opacity: [0.68, 0] }}
                          transition={{ duration: 0.72, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute inset-1 rounded-full border border-orange-300/35"
                          animate={{ scale: [0.7, 1.18], opacity: [0.42, 0] }}
                          transition={{ duration: 0.82, repeat: Infinity, ease: 'easeOut', delay: 0.08 }}
                        />
                        <motion.div
                          className="absolute -left-10 bottom-5 flex h-10 w-6 items-end justify-center"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="h-8 w-2 rounded-full bg-amber-300/75" />
                          <div className="absolute top-0 h-3 w-6 rounded-full bg-orange-300/85" />
                        </motion.div>
                        <motion.div
                          className="absolute -right-10 top-3 h-14 w-14 rounded-full border-2 border-dashed border-amber-200/80"
                          animate={{ rotate: [0, 180, 360], scale: [0.94, 1.04, 0.94] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                        >
                          <div className="absolute inset-[18%] rounded-full border border-amber-100/60" />
                        </motion.div>
                        <motion.div
                          className="absolute left-1/2 top-0 -translate-x-1/2 text-amber-200"
                          animate={{ y: [2, -16, -2], rotate: [0, -16, 10], opacity: [0, 1, 0] }}
                          transition={{ duration: 0.82, repeat: Infinity, ease: 'easeOut' }}
                        >
                          <Zap className="h-4 w-4" />
                        </motion.div>
                      </>
                    )}

                    {activePerformanceAction === 'read' && (
                      <>
                        <motion.div
                          className="absolute -left-10 top-6 h-12 w-12 rounded-[18px] border border-indigo-200/60 bg-slate-950/60 shadow-[0_12px_26px_rgba(49,46,129,0.22)]"
                          animate={{ y: [0, -4, 0], rotate: [-4, 0, 4, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="absolute left-3 top-2 h-8 w-2 rounded-full bg-indigo-200/80" />
                          <div className="absolute right-3 top-2 h-8 w-2 rounded-full bg-indigo-100/75" />
                          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/45" />
                        </motion.div>
                        <motion.div
                          className="absolute -right-9 top-4 h-8 w-8 rounded-full bg-amber-200/85 shadow-[0_0_28px_rgba(251,191,36,0.45)]"
                          animate={{ opacity: [0.7, 1, 0.7], scale: [0.94, 1.04, 0.94] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85" />
                        </motion.div>
                      </>
                    )}

                    {activePerformanceAction === 'paint' && (
                      <>
                        <motion.div
                          className="absolute -right-14 top-1 h-20 w-16 rounded-[22px] border border-fuchsia-200/45 bg-white/90 shadow-[0_14px_32px_rgba(217,70,239,0.14)]"
                          animate={{ rotate: [-4, 0, 4, 0], y: [0, -2, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="absolute left-3 top-4 h-2 w-9 rounded-full bg-fuchsia-300" />
                          <div className="absolute left-5 top-8 h-2 w-6 rounded-full bg-sky-300" />
                          <div className="absolute left-4 top-12 h-3 w-3 rounded-full bg-amber-300" />
                          <div className="absolute left-9 top-12 h-3 w-3 rounded-full bg-emerald-300" />
                        </motion.div>
                        <motion.div
                          className="absolute -left-6 top-8 h-3 w-11 rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-fuchsia-300 shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
                          animate={{ rotate: [-18, -6, 10, -12], x: [0, 4, -3, 0] }}
                          transition={{ duration: 0.92, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                          className="absolute right-2 -top-3 flex gap-1"
                          animate={{ opacity: [0.5, 1, 0.6], y: [0, -6, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        </motion.div>
                      </>
                    )}

                    {activePerformanceAction === 'bath' && (
                      <>
                        <motion.div
                          className="absolute inset-x-3 bottom-2 h-10 rounded-[24px] border border-cyan-200/35 bg-cyan-200/18"
                          animate={{ scaleX: [0.96, 1.02, 0.98], y: [0, -1, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                          className="absolute left-4 top-5 h-3 w-3 rounded-full border border-white/60 bg-cyan-100/35"
                          animate={{ y: [0, -18, -28], opacity: [0, 0.9, 0], scale: [0.5, 1, 1.1] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute right-5 top-8 h-4 w-4 rounded-full border border-white/60 bg-cyan-100/35"
                          animate={{ y: [0, -14, -24], opacity: [0, 0.85, 0], scale: [0.5, 1, 1.08] }}
                          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut', delay: 0.28 }}
                        />
                      </>
                    )}
                  </div>
                )}
                {currentTechAccent && (
                  <div className={`absolute -bottom-2 -right-2 z-10 px-2 py-1 text-[10px] rounded-full flex items-center gap-1 ${currentTechAccent.badge}`}>
                    {currentTechAccent.icon}
                    <span>{currentTechAccent.label}</span>
                  </div>
                )}
                {currentAppearance?.specialEffect && (
                  <div className="absolute inset-0 -z-10">
                    {currentAppearance.specialEffect === 'aura' && (
                      <div className="absolute inset-0 rounded-full blur-xl bg-yellow-400/30 animate-pulse" />
                    )}
                    {currentAppearance.specialEffect === 'legendary' && (
                      <>
                        <div className="absolute inset-0 rounded-full blur-2xl bg-fuchsia-400/30 animate-pulse" />
                        <div className="absolute inset-3 rounded-full bg-yellow-200/12 blur-xl animate-pulse" />
                      </>
                    )}
                  </div>
                )}
                {currentImageUrl ? (
                  <img 
                    src={currentImageUrl} 
                    alt={currentPet.name}
                    className="pet-sprite pet-sprite-home w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-8xl drop-shadow-2xl">{petConfig.icon}</span>
                )}
              </motion.div>
              
              {/* Pet Name */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-slate-800/90 px-3 py-1 rounded-full text-white font-bold text-sm pixel-text-shadow border-2 border-slate-600">
                  {currentPet.name}
                </div>
              </div>
              
              {/* Walking Effect */}
              {isWalking && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                  <PawPrint className="h-6 w-6 animate-bounce text-amber-200 drop-shadow-[0_6px_12px_rgba(251,191,36,0.28)]" />
                </div>
              )}
            </motion.div>
          </div>
        </CozyRoomBackground>
      </div>
      
      {/* Interaction Panel (toggleable) */}
      {showInteractionPanel && (
        <div className={`absolute z-[58] ${interactionDockPositionClass}`}>
          <div
            className={`border border-white/10 bg-slate-950/88 shadow-[0_24px_44px_rgba(2,6,23,0.34)] backdrop-blur-xl ${interactionDockSurfaceClass}`}
            title={interactionDockHint}
          >
            <div className="hidden">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-100">
                <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                <span>互动</span>
              </div>
            </div>
            <div className="mb-1 flex justify-end">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                {interactionModeLabel}
              </div>
            </div>
            {shouldShowRhythmSignals && (
              <div className="mb-2 grid gap-1.5">
                {compactRhythmSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-white/[0.04] px-2.5 py-1.5"
                    >
                      <span className="inline-flex min-w-0 items-center gap-1 text-[9px] font-semibold text-slate-400">
                        <Icon className={`h-3 w-3 shrink-0 ${signal.tone}`} />
                        <span>{signal.label}</span>
                      </span>
                      <span className="max-w-[72px] truncate text-[9px] font-bold text-white">{signal.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`grid grid-cols-4 ${isCompactViewport ? 'gap-2' : 'gap-1'}`}>
              <InteractionButton interactionType="pat" petId={currentPet.id} size="small" />
              <InteractionButton interactionType="play" petId={currentPet.id} size="small" />
              <InteractionButton interactionType="talk" petId={currentPet.id} size="small" />
              <InteractionButton interactionType="train" petId={currentPet.id} size="small" />
              <InteractionButton interactionType="read" petId={currentPet.id} size="small" />
              <InteractionButton interactionType="paint" petId={currentPet.id} size="small" />
              <InteractionButton
                interactionType="chat"
                petId={currentPet.id}
                size="small"
                onClickOverride={() => setShowPetChat(true)}
              />
              <InteractionButton interactionType="bath" petId={currentPet.id} size="small" />
            </div>
            <button
              type="button"
              onClick={() => handleStarlightMoment()}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-amber-200/24 bg-[linear-gradient(135deg,rgba(251,191,36,0.2),rgba(56,189,248,0.12))] px-2 py-1.5 text-[10px] font-bold text-amber-50 shadow-[0_10px_22px_rgba(251,191,36,0.12)] transition hover:border-amber-100/45 hover:bg-amber-300/18"
              title="触发星光互动"
              aria-label="触发星光互动"
            >
              <Sparkles className="h-3.5 w-3.5" />
              星光互动
            </button>
            <div className="hidden mt-1.5 text-[10px] text-slate-500">
              {interactionDockHint}
            </div>
          </div>
        </div>
      )}

      {showCompactBottomDock && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[60] flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-[28px] border border-white/10 bg-slate-950/78 px-2 py-2 shadow-[0_20px_36px_rgba(2,6,23,0.32)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setShowInteractionPanel(false);
                setShowMobileUtilityTray(false);
                setShowWardrobe(!showWardrobe);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
              title="我的衣柜"
              aria-label="我的衣柜"
            >
              <Shirt className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMobileUtilityTray(false);
                setShowInteractionPanel((value) => !value);
              }}
              className={`flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-[20px] border px-3 text-sm font-semibold text-white transition ${
                showInteractionPanel
                  ? 'border-sky-200/50 bg-sky-500/22 shadow-[0_16px_30px_rgba(2,132,199,0.28)]'
                  : 'border-sky-300/30 bg-sky-600/88 shadow-[0_16px_30px_rgba(2,132,199,0.3)] hover:bg-sky-500'
              }`}
              title={showInteractionPanel ? '收起互动工具栏' : '展开互动工具栏'}
              aria-label={showInteractionPanel ? '收起互动工具栏' : '展开互动工具栏'}
            >
              <Sparkles className="h-4.5 w-4.5" />
              <span>互动</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowWardrobe(false);
                setShowPetList(false);
                setShowFoodShop(false);
                setShowInteractionPanel(false);
                setShowMobileUtilityTray(false);
                setShowFoodSelector(true);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1]"
              title="食物背包"
              aria-label="食物背包"
            >
              <Package2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interaction Toggle Button */}
      {!showCompactBottomDock && (
        <button
          onClick={() => {
            setShowMobileUtilityTray(false);
            setShowInteractionPanel(v => !v);
          }}
          className={`absolute z-50 flex items-center justify-center rounded-full border border-sky-300/30 bg-sky-600/88 text-white shadow-[0_16px_30px_rgba(2,132,199,0.3)] transition-all hover:scale-[1.03] hover:bg-sky-500 ${isCompactViewport ? 'right-4 bottom-3 h-11 w-11' : 'right-5 bottom-6 h-9 w-9'}`}
          title={showInteractionPanel ? '收起互动工具栏' : '展开互动工具栏'}
          aria-label={showInteractionPanel ? '收起互动工具栏' : '展开互动工具栏'}
        >
          <Sparkles className="h-4.5 w-4.5" />
        </button>
      )}

      {isStarterMode && (
        <div className={`absolute z-50 ${starterHintPositionClass}`}>
          <div className={`border border-emerald-300/20 bg-slate-950/84 shadow-[0_18px_38px_rgba(2,6,23,0.32)] backdrop-blur-md ${starterHintBodyClass}`}>
            <div className={`flex text-[11px] text-slate-200 ${isCompactViewport ? 'flex-col items-start gap-2' : 'items-center gap-2'}`}>
            <span className="rounded-full bg-emerald-500/16 px-2 py-0.5 font-semibold text-emerald-100">新手视图</span>
            <span className="truncate">先互动、切场景，熟悉后再展开全部工具。</span>
            <button
              type="button"
              onClick={() => {
                setIsStarterMode(false);
                setShowInteractionPanel(false);
              }}
              className={`shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-white/[0.1] ${isCompactViewport ? 'self-end' : ''}`}
            >
              展开
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Feedback Effects */}
      <InteractionFeedback
        interactionType={interactionType}
        isPlaying={interactionPlaying}
        position={interactionPosition}
        onComplete={() => {
          const finishedInteraction = interactionType;
          if (finishedInteraction === 'paint' && currentScene === 'living') {
            addWallSketch();
          }
          setInteractionPlaying(false);
          setInteractionType(null);
          setInteractionSpeech(null);
          setInteractionFollowPet(false);
        }}
      />

      {/* Pet Chat Modal */}
      <PetChatModal
        isOpen={showPetChat}
        onClose={() => setShowPetChat(false)}
        petId={currentPet.id}
        petName={currentPet.name}
      />

      <HealingCornerPanel
        isOpen={showHealingCorner}
        onClose={() => setShowHealingCorner(false)}
        onOpenChat={() => {
          setShowHealingCorner(false);
          setShowPetChat(true);
        }}
        petName={currentPet.name}
        ambientEnabled={ambientEnabled}
        onEnableAmbient={() => setAmbientEnabled(true)}
      />
      
      {/* Wardrobe Modal */}
      {showWardrobe && (
        <>
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowWardrobe(false)}
          />
          
          <div 
            className="absolute left-0 top-0 bottom-0 z-[70] w-[336px] overflow-y-auto border-r border-white/10 bg-[linear-gradient(165deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">Home Wardrobe</div>
                  <h3 className="mt-2 flex items-center gap-2 text-xl font-black text-white pixel-text-shadow">
                    <Shirt className="h-5 w-5 text-sky-300" />
                    我的衣柜
                  </h3>
                  <p className="hidden mt-2 text-sm leading-6 text-slate-300">
                    先选中一个装饰，再点击场景中的位置放下它。植物和农田装饰会优先吸附到可种植区域。
                  </p>
                </div>
                <button
                  onClick={() => setShowWardrobe(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.1]"
                  aria-label="关闭衣柜"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-3 rounded-full border border-sky-300/15 bg-sky-500/10 px-3 py-2 text-xs leading-5 text-sky-50">
                当前可摆放装饰 {ownedDecorations.filter(d => d.quantity > 0).length} 种。想快速丰富小屋氛围，可以优先摆放植物、灯光和桌面摆件。
              </div>
              
              <div className="mt-5 grid grid-cols-2 gap-3">
                {ownedDecorations
                  .filter(d => d.quantity > 0)
                  .map(owned => {
                    const decoration = DECORATIONS[owned.decorationId];
                    if (!decoration) return null;
                    
                    const isSelected = draggingDecoration === owned.decorationId;
                    
                    return (
                      <button
                        key={owned.decorationId}
                        onClick={() => {
                          setDraggingDecoration(owned.decorationId);
                          setShowWardrobe(false);
                        }}
                        className={`group rounded-[22px] border p-3 text-left transition-all ${
                          isSelected 
                            ? 'scale-[1.02] border-sky-300/70 bg-sky-500/18 shadow-[0_18px_32px_rgba(14,165,233,0.18)]' 
                            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            x{owned.quantity}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-sky-300/15 px-2 py-1 text-[10px] font-semibold text-sky-100">
                              已选中
                            </span>
                          )}
                        </div>
                        <div className="mb-3 flex min-h-[76px] items-center justify-center rounded-2xl border border-white/8 bg-slate-950/45">
                          <DecorationIcon decorationId={decoration.id} size={56} />
                        </div>
                        <div className="text-sm font-bold text-white">{decoration.name}</div>
                        <div className="mt-1 text-[11px] leading-4 text-slate-400 group-hover:text-slate-300">
                          点击后返回场景放置
                        </div>
                      </button>
                    );
                  })}
                
                {ownedDecorations.filter(d => d.quantity > 0).length === 0 && (
                  <div className="col-span-2 rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] px-5 py-10 text-center text-slate-400">
                    <Shirt className="mx-auto h-10 w-10 text-slate-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-300">衣柜里还没有可摆放的装饰</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">去商店挑几件家具回来，小屋会立刻更有氛围。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pet List Modal */}
      {showPetList && (
        <>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowPetList(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 z-[70] w-[336px] overflow-y-auto border-l border-white/10 bg-[linear-gradient(165deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">Companion Queue</div>
                  <h3 className="mt-2 flex items-center gap-2 text-xl font-black text-white pixel-text-shadow">
                    <PawPrint className="h-5 w-5 text-sky-300" />
                    我的伙伴
                  </h3>
                  <p className="hidden mt-2 text-sm leading-6 text-slate-300">
                    点击任意宠物就能立即切换当前跟随。切换后返回大厅或关卡时，会自动使用新的伙伴外观。
                  </p>
                </div>
                <button
                  onClick={() => setShowPetList(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.1]"
                  aria-label="关闭伙伴列表"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 rounded-full border border-emerald-300/14 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-50">
                当前共有 {(pets || []).length} 只宠物。宠物蛋的孵化进度不需要手动切换跟随，只要去完成新的未通关关卡即可推进。
              </div>

              <div className="mt-5 space-y-3">
              {(pets || []).map(pet => {
                  const resolvedType = migratePetType(pet.petType);
                  const config = PET_CONFIGS[resolvedType];
                  const isActive = currentPet.id === pet.id;
                  const petImgUrl = getPetImageUrl(resolvedType, pet.status, pet.evolution_stage ?? (pet.isEgg ? 0 : 1));
                  const hasAsset = !!petImgUrl;
                  const stageIndex = pet.evolution_stage ?? (pet.isEgg ? 0 : 1);
                  const techAccent = getTechAccent(resolvedType);
                  const listScale = getPetVariantScale(resolvedType, 'list');
                  return (
                    <div
                      key={pet.id}
                      className={`rounded-[24px] border p-3 transition-all ${
                        isActive
                          ? 'border-sky-300/70 bg-sky-500/16 shadow-[0_18px_32px_rgba(14,165,233,0.18)]'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-slate-950/50">
                          <div className={`absolute inset-1 rounded-full blur-md ${getPetAuraClass(stageIndex, pet.petStyle)}`} />
                          {techAccent && (
                            <div className={`absolute -bottom-1 -right-1 z-10 flex items-center gap-1 rounded-full px-1 py-0.5 text-[9px] ${techAccent.badge}`}>
                              {techAccent.icon}
                            </div>
                          )}
                          {hasAsset ? (
                            <img
                              src={petImgUrl}
                              alt={pet.name}
                              className="pet-sprite pet-sprite-chip w-full h-full object-contain"
                              style={{ transform: `scale(${listScale})` }}
                            />
                          ) : (
                            <span className="text-2xl">{config.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{pet.name}</div>
                          <div className="mt-1 text-xs text-slate-400">Lv.{pet.level}</div>
                          <div className={`mt-1 text-xs font-medium ${STATUS_COLORS[pet.status]}`}>{STATUS_TEXT[pet.status]}</div>
                        </div>
                        {isActive ? (
                          <div className="rounded-full border border-sky-300/25 bg-sky-500/12 px-3 py-1 text-xs font-bold text-sky-100">
                            跟随中
                          </div>
                        ) : (
                          <button
                            onClick={() => setCurrentPet(pet)}
                            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
                          >
                            设为跟随
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(pets || []).length === 0 && (
                  <div className="rounded-[26px] border border-dashed border-white/12 bg-white/[0.03] px-5 py-10 text-center text-slate-400">
                    <PawPrint className="mx-auto h-10 w-10 text-slate-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-300">当前还没有宠物伙伴</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">先去冒险或孵化新的伙伴，再回来布置属于你们的小屋。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Decoration Shop */}
      {showShop && (
        <DecorationShop isOpen={showShop} onClose={() => setShowShop(false)} />
      )}
      
      {/* Food Shop (Added back) */}
      <FoodShop isOpen={showFoodShop} onClose={() => setShowFoodShop(false)} />

      {/* Food Selector (Added back) */}
      <FoodSelector
        isOpen={showFoodSelector}
        petId={currentPet.id}
        petName={currentPet.name}
        onClose={() => setShowFoodSelector(false)}
      />
      
      {/* Selected Decoration Controls - Bottom Floating Panel */}
      {selectedPlaced && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute bottom-6 left-1/2 z-[100] w-[min(94vw,520px)] -translate-x-1/2"
        >
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,rgba(11,18,38,0.96),rgba(6,11,27,0.94))] shadow-[0_28px_64px_rgba(2,6,23,0.42)] backdrop-blur-xl">
            <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(56,189,248,0.02))] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <DecorationIcon decorationId={selectedPlaced.decorationId} size={38} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-sky-200">
                      已选装饰
                    </span>
                    {selectedDecorationMeta && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {TYPE_TEXT[selectedDecorationMeta.type]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-white">
                    {selectedDecorationMeta?.name || '这个装饰'}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    轻点下方按钮，可移动、收回或关闭选择。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-3">
              <button
                onClick={handleStartDragPlaced}
                title={isDraggingPlaced ? '点击场景中的位置，完成摆放' : '重新摆放这个装饰'}
                aria-label={isDraggingPlaced ? '点击场景中的位置，完成摆放' : '重新摆放这个装饰'}
                className={`flex items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
                  isDraggingPlaced
                    ? 'border-emerald-300/25 bg-emerald-400/12 text-emerald-100 shadow-[0_16px_34px_rgba(16,185,129,0.18)]'
                    : 'border-sky-300/18 bg-sky-400/10 text-sky-100 hover:bg-sky-400/14'
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[16px] border ${
                    isDraggingPlaced
                      ? 'border-emerald-300/25 bg-emerald-400/18'
                      : 'border-sky-300/18 bg-sky-400/16'
                  }`}
                >
                  {isDraggingPlaced ? <Check className="h-4 w-4" /> : <Move className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">
                    {isDraggingPlaced ? '完成摆放' : '移动位置'}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/65">
                    {isDraggingPlaced ? '点场景落点即可' : '换到更合适的位置'}
                  </span>
                </span>
              </button>

              <button
                onClick={handleRemoveDecoration}
                title="收回到衣柜"
                aria-label="收回到衣柜"
                className="flex items-center gap-3 rounded-[20px] border border-rose-300/16 bg-rose-400/10 px-3 py-3 text-left text-rose-100 transition hover:bg-rose-400/14"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-rose-300/16 bg-rose-400/14">
                  <Package2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">收回衣柜</span>
                  <span className="mt-0.5 block text-[11px] text-white/65">
                    不会丢失这件装饰
                  </span>
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedPlaced(null);
                  setIsDraggingPlaced(false);
                }}
                title="关闭装饰工具栏"
                aria-label="关闭装饰工具栏"
                className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition hover:bg-white/[0.07]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05]">
                  <X className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">取消选择</span>
                  <span className="mt-0.5 block text-[11px] text-white/65">
                    继续查看当前场景
                  </span>
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Heart Particles Overlay */}
      <HeartParticles triggerX={petPosition.x} triggerY={petPosition.y} trigger={heartTrigger} />
      
      {/* Dragging Hint */}
      {(draggingDecoration || isDraggingPlaced) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100]">
          <div className="rounded-full border border-sky-300/25 bg-sky-600/90 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-pulse">
            {isDraggingPlaced ? '点击想摆放的位置，完成移动' : '点击场景中的空位，放下装饰'}
          </div>
        </div>
      )}
      
      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveConfirm}
        title="移回衣柜"
        message={`确定要移除 ${selectedPlaced ? DECORATIONS[selectedPlaced.decorationId]?.name || '这个装饰品' : ''} 吗？移除后它会回到你的衣柜，不会丢失。`}
        icon="🪑"
        confirmText="确认移回"
        cancelText="取消"
        confirmType="danger"
        onConfirm={confirmRemoveDecoration}
        onCancel={() => setShowRemoveConfirm(false)}
      />

      {/* Ambient Sounds */}
      <AmbientSounds scene={currentScene} enabled={ambientEnabled} />
      
      {/* New User Guide */}
      <PetHomeGuide onComplete={() => setShowInteractionPanel(true)} />
    </div>
  );
}

