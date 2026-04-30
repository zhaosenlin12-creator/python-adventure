'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  Cloud,
  Flower2,
  Heart,
  MessageCircle,
  Music2,
  Send,
  Smile,
  Sparkles,
  Star,
  Volume2,
  Wand2,
  Wind,
  X,
} from 'lucide-react';
import { playSound } from '@/lib/utils/soundManager';
import {
  COURAGE_CARDS,
  HEALING_BREATHING_STEPS,
  HEALING_FOCUS_STEPS,
  HEALING_GROUNDING_STEPS,
  HEALING_MOOD_OPTIONS,
  HealingActivityId,
  HealingMoodId,
  getCourageCard,
  getMoodOption,
  getRecommendedActivity,
} from '@/lib/pet/healingCorner';

interface HealingCornerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  petName: string;
  ambientEnabled: boolean;
  onEnableAmbient: () => void;
}

interface ReleaseBubble {
  id: string;
  label: string;
  left: string;
  top: string;
  tint: string;
  popped: boolean;
}

const ACTIVITY_META: Record<
  Exclude<HealingActivityId, 'chat'>,
  { label: string; icon: typeof Wind; description: string }
> = {
  breathe: {
    label: '呼吸一下',
    icon: Wind,
    description: '跟着节奏吸气、停一下、慢慢呼气。',
  },
  ground: {
    label: '回到当下',
    icon: Sparkles,
    description: '看一看、听一听、动一动，把注意力拉回来。',
  },
  release: {
    label: '放下烦心',
    icon: Send,
    description: '写一句就好，写完就让它飘走。',
  },
  courage: {
    label: '鼓劲小卡',
    icon: Heart,
    description: '抽一张短卡，带着一点点勇气继续往前走。',
  },
  focus: {
    label: '专注三步',
    icon: Brain,
    description: '把下一步缩小、命名、启动，适合疲惫或卡住时重新进入状态。',
  },
};

type HealingTone = 'tap' | 'breathe' | 'sparkle' | 'complete' | 'soft';

type WindowWithAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let healingAudioContext: AudioContext | null = null;

const MOOD_VISUALS: Record<HealingMoodId, { glow: string; blush: string; sticker: string }> = {
  tense: { glow: 'from-rose-300/45 via-amber-200/24 to-sky-200/20', blush: 'bg-rose-300/70', sticker: '慢' },
  busy: { glow: 'from-sky-300/42 via-cyan-200/26 to-violet-200/20', blush: 'bg-sky-300/70', sticker: '停' },
  quiet: { glow: 'from-emerald-200/42 via-teal-200/24 to-sky-200/18', blush: 'bg-emerald-300/65', sticker: '静' },
  steady: { glow: 'from-amber-200/45 via-lime-200/22 to-emerald-200/18', blush: 'bg-amber-200/75', sticker: '稳' },
  frustrated: { glow: 'from-fuchsia-300/42 via-rose-200/24 to-amber-200/18', blush: 'bg-fuchsia-300/65', sticker: '拆' },
  tired: { glow: 'from-indigo-300/42 via-sky-200/24 to-slate-100/18', blush: 'bg-indigo-200/70', sticker: '轻' },
  proud: { glow: 'from-yellow-200/50 via-emerald-200/26 to-sky-200/18', blush: 'bg-yellow-200/80', sticker: '赞' },
};

const SENSORY_BUTTONS: Array<{
  id: HealingTone;
  label: string;
  hint: string;
  fallback: Parameters<typeof playSound>[0];
  icon: typeof Wind;
  toneClass: string;
}> = [
  { id: 'breathe', label: '柔风', hint: '轻一点的呼吸节拍', fallback: 'button_hover', icon: Wind, toneClass: 'text-emerald-100' },
  { id: 'sparkle', label: '星铃', hint: '亮一点的鼓励提示', fallback: 'collect_gem', icon: Music2, toneClass: 'text-amber-100' },
  { id: 'soft', label: '暖光', hint: '慢慢落下的安心声', fallback: 'pet_happy', icon: Flower2, toneClass: 'text-rose-100' },
];

const RELEASE_BUBBLE_POSITIONS = [
  { left: '18%', top: '22%' },
  { left: '42%', top: '20%' },
  { left: '68%', top: '22%' },
  { left: '26%', top: '46%' },
  { left: '54%', top: '44%' },
  { left: '76%', top: '48%' },
];

const RELEASE_BUBBLE_TINTS = [
  'rgba(125,211,252,0.46)',
  'rgba(167,243,208,0.48)',
  'rgba(253,224,71,0.46)',
  'rgba(244,114,182,0.42)',
  'rgba(196,181,253,0.46)',
  'rgba(251,191,36,0.42)',
];

const CALM_PLAY_OBJECTS = [
  { id: 'cloud', label: '云团', left: '14%', top: '18%', size: 82, tint: 'from-sky-200/70 to-cyan-300/35' },
  { id: 'leaf', label: '叶光', left: '76%', top: '20%', size: 70, tint: 'from-emerald-200/75 to-teal-300/35' },
  { id: 'stone', label: '小石', left: '22%', top: '68%', size: 68, tint: 'from-slate-200/70 to-slate-400/35' },
  { id: 'star', label: '星点', left: '63%', top: '64%', size: 76, tint: 'from-amber-100/80 to-yellow-300/35' },
  { id: 'flower', label: '花息', left: '44%', top: '30%', size: 62, tint: 'from-rose-100/80 to-pink-300/35' },
  { id: 'ripple', label: '水纹', left: '48%', top: '76%', size: 88, tint: 'from-indigo-100/65 to-sky-300/35' },
];

function createReleaseBubbles(input: string): ReleaseBubble[] {
  const tokens = input
    .replace(/[,.!?，。！？]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const source = tokens.length > 0 ? tokens : ['紧张', '疲惫', '卡住', '杂乱', '担心', '压力'];

  return RELEASE_BUBBLE_POSITIONS.map((position, index) => ({
    id: `release-bubble-${Date.now()}-${index}`,
    label: source[index % source.length].slice(0, 4),
    left: position.left,
    top: position.top,
    tint: RELEASE_BUBBLE_TINTS[index % RELEASE_BUBBLE_TINTS.length],
    popped: false,
  }));
}

function getHealingAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext || (window as WindowWithAudioContext).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  healingAudioContext ??= new AudioContextClass();
  return healingAudioContext;
}

function playHealingTone(kind: HealingTone) {
  const context = getHealingAudioContext();
  if (!context) {
    return;
  }

  const toneMap: Record<HealingTone, { notes: number[]; duration: number; gain: number; type: OscillatorType }> = {
    tap: { notes: [660], duration: 0.12, gain: 0.035, type: 'triangle' },
    breathe: { notes: [392, 523], duration: 0.42, gain: 0.03, type: 'sine' },
    sparkle: { notes: [784, 988, 1175], duration: 0.16, gain: 0.032, type: 'sine' },
    complete: { notes: [523, 659, 784], duration: 0.18, gain: 0.04, type: 'triangle' },
    soft: { notes: [330, 440], duration: 0.34, gain: 0.026, type: 'sine' },
  };

  const preset = toneMap[kind];
  const now = context.currentTime;

  if (context.state === 'suspended') {
    void context.resume();
  }

  preset.notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
    gain.gain.setValueAtTime(0, now + index * 0.08);
    gain.gain.linearRampToValueAtTime(preset.gain, now + index * 0.08 + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + preset.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.08);
    oscillator.stop(now + index * 0.08 + preset.duration + 0.05);
  });
}

function HealingCompanionStage({
  mood,
  activity,
  energyScore,
  sparkleBurst,
  soundEnabled,
  companionTapCount,
  onCompanionTap,
}: {
  mood: HealingMoodId;
  activity: Exclude<HealingActivityId, 'chat'>;
  energyScore: number;
  sparkleBurst: number;
  soundEnabled: boolean;
  companionTapCount: number;
  onCompanionTap: () => void;
}) {
  const visual = MOOD_VISUALS[mood];
  const expression = activity === 'focus' ? '•ᴗ•' : activity === 'release' ? '˘ᴗ˘' : activity === 'courage' ? '＾ᴗ＾' : '•◡•';

  return (
    <div className="relative mt-3 overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.16),rgba(16,185,129,0.1),rgba(168,85,247,0.1))] px-3 py-3 sm:mt-4 sm:px-4 sm:py-4">
      <div className="pointer-events-none absolute inset-0">
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.span
            key={index}
            className="absolute h-2.5 w-2.5 rounded-full bg-white/45 shadow-[0_0_14px_rgba(255,255,255,0.42)]"
            style={{
              left: `${12 + index * 19}%`,
              top: `${18 + (index % 3) * 22}%`,
            }}
            animate={{
              y: [0, -10 - index * 2, 0],
              opacity: [0.25, 0.7, 0.25],
              scale: [0.75, 1.15, 0.75],
            }}
            transition={{
              duration: 3 + index * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.18,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${visual.glow} blur-2xl`}
            animate={{ scale: [0.88, 1.06, 0.88], opacity: [0.6, 0.92, 0.6] }}
            transition={{ duration: activity === 'breathe' ? 3.2 : 4.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-white/22"
            animate={{ scale: activity === 'breathe' ? [0.86, 1.12, 0.86] : [0.94, 1.03, 0.94], opacity: [0.22, 0.55, 0.22] }}
            transition={{ duration: activity === 'breathe' ? 2.8 : 3.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.button
            type="button"
            onClick={onCompanionTap}
            title="轻拍心能小云朵"
            aria-label="轻拍心能小云朵"
            key={`${mood}-${activity}`}
            className="relative flex h-20 w-24 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.88))] shadow-[0_18px_45px_rgba(15,23,42,0.24)] outline-none transition focus-visible:ring-2 focus-visible:ring-amber-200/70 sm:h-24 sm:w-28"
            initial={{ scale: 0.92, rotate: -3, y: 8 }}
            animate={{ scale: [1, 1.02, 1], rotate: [-1.5, 1.5, -1.5], y: [0, -4, 0] }}
            whileHover={{ scale: 1.06, rotate: 2 }}
            whileTap={{ scale: 0.94, y: 4 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute -left-2 top-8 h-9 w-9 rounded-full bg-white/88 shadow-[inset_0_-8px_16px_rgba(148,163,184,0.18)]" />
            <div className="absolute -right-2 top-8 h-9 w-9 rounded-full bg-white/88 shadow-[inset_0_-8px_16px_rgba(148,163,184,0.18)]" />
            <div className="absolute -top-3 left-8 h-8 w-8 rounded-full bg-white/92 shadow-[inset_0_-8px_16px_rgba(148,163,184,0.16)]" />
            <div className={`absolute left-5 top-12 h-2.5 w-4 rounded-full ${visual.blush}`} />
            <div className={`absolute right-5 top-12 h-2.5 w-4 rounded-full ${visual.blush}`} />
            <div className="relative z-[1] text-lg font-black tracking-wide text-slate-700">{expression}</div>
          </motion.button>
          <motion.div
            className="absolute -right-1 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-amber-200 text-xs font-black text-slate-800 shadow-[0_10px_24px_rgba(251,191,36,0.24)]"
            animate={{ y: [0, -6, 0], rotate: [-8, 8, -8] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {visual.sticker}
          </motion.div>

          <AnimatePresence>
            {sparkleBurst > 0 && (
              <motion.div
                key={sparkleBurst}
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <motion.span
                    key={index}
                    className="absolute h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.8)]"
                    style={{ left: '50%', top: '50%' }}
                    animate={{
                      x: Math.cos((index / 6) * Math.PI * 2) * (42 + index * 5),
                      y: Math.sin((index / 6) * Math.PI * 2) * (34 + index * 4),
                      scale: [0.2, 1.15, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {companionTapCount > 0 && (
              <motion.div
                key={companionTapCount}
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2, 3].map((index) => (
                  <motion.span
                    key={index}
                    className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-white/45 bg-white/25 text-amber-100 shadow-[0_12px_28px_rgba(251,191,36,0.22)] backdrop-blur-sm"
                    style={{ left: '50%', top: '50%' }}
                    animate={{
                      x: Math.cos((index / 4) * Math.PI * 2) * (48 + index * 8),
                      y: Math.sin((index / 4) * Math.PI * 2) * (40 + index * 6),
                      scale: [0.15, 1, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 40],
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-100" />
            <div className="text-[11px] font-semibold tracking-[0.16em] text-white/70">放松伙伴</div>
          </div>
          <div className="mt-2 text-xl font-black text-white">心能小云朵</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/45">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#34d399,#38bdf8)]"
              animate={{ width: `${energyScore}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-200">
            <span>{energyScore}% 心能</span>
            <span className={soundEnabled ? 'text-emerald-100' : 'text-slate-400'}>
              {soundEnabled ? '音效开' : '静音'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { label: '拍拍', icon: Cloud },
              { label: '亮亮', icon: Star },
              { label: '抱抱', icon: Heart },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  type="button"
                  onClick={onCompanionTap}
                  className="flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                  whileTap={{ scale: 0.92 }}
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.2 + index * 0.18, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityToyPreview({
  activity,
  breathingStepIndex,
  groundingProgress,
  focusProgress,
  releaseDone,
  courageIndex,
}: {
  activity: Exclude<HealingActivityId, 'chat'>;
  breathingStepIndex: number;
  groundingProgress: number;
  focusProgress: number;
  releaseDone: boolean;
  courageIndex: number;
}) {
  const stageDots = activity === 'ground' ? HEALING_GROUNDING_STEPS.length : activity === 'focus' ? HEALING_FOCUS_STEPS.length : 3;
  const completed = activity === 'ground' ? groundingProgress : activity === 'focus' ? focusProgress : breathingStepIndex + 1;

  return (
    <div className="relative mt-3 h-20 overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.13),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(30,41,59,0.62))] sm:h-28">
      <div className="pointer-events-none absolute inset-0">
        {[0, 1, 2, 3].map((index) => (
          <motion.span
            key={index}
            className="absolute rounded-full bg-white/16 blur-sm"
            style={{
              width: 28 + index * 8,
              height: 28 + index * 8,
              left: `${8 + index * 24}%`,
              top: `${18 + (index % 2) * 34}%`,
            }}
            animate={{ y: [0, -8, 0], opacity: [0.18, 0.38, 0.18] }}
            transition={{ duration: 2.6 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {activity === 'breathe' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="absolute rounded-full border border-emerald-200/40"
              style={{ width: 46 + index * 24, height: 46 + index * 24 }}
              animate={{ scale: [0.82, 1.18, 0.82], opacity: [0.18, 0.56, 0.18] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
            />
          ))}
          <Wind className="relative z-[1] h-7 w-7 text-emerald-100" />
        </div>
      )}

      {activity === 'release' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="h-14 w-20 rounded-[18px] border border-sky-100/60 bg-white/90 shadow-[0_18px_34px_rgba(14,165,233,0.2)]"
            animate={releaseDone ? { x: [0, 52], y: [0, -32], rotate: [0, 14], opacity: [1, 0] } : { y: [0, -4, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: releaseDone ? 1.1 : 2.4, repeat: releaseDone ? 0 : Infinity, ease: 'easeInOut' }}
          >
            <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-sky-300" />
            <div className="mx-auto mt-2 h-1.5 w-8 rounded-full bg-emerald-300" />
          </motion.div>
        </div>
      )}

      {activity === 'courage' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            key={courageIndex}
            className="relative flex h-16 w-24 items-center justify-center rounded-[20px] border border-amber-100/60 bg-[linear-gradient(135deg,rgba(253,230,138,0.94),rgba(251,191,36,0.8))] shadow-[0_20px_40px_rgba(251,191,36,0.18)]"
            initial={{ rotate: -8, scale: 0.86 }}
            animate={{ rotate: [-3, 3, -3], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Heart className="h-7 w-7 fill-white/80 text-white" />
            <motion.span
              className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/90"
              animate={{ y: [0, -5, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      )}

      {(activity === 'ground' || activity === 'focus') && (
        <div className="absolute inset-0 flex items-center justify-center gap-4">
          {Array.from({ length: stageDots }).map((_, index) => {
            const done = index < completed;
            return (
              <motion.div
                key={index}
                className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                  done ? 'border-emerald-200/60 bg-emerald-300/20 text-emerald-50' : 'border-white/16 bg-white/[0.04] text-slate-300'
                }`}
                animate={done ? { y: [0, -5, 0], scale: [1, 1.08, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 1.2, repeat: done ? Infinity : 0, ease: 'easeInOut', delay: index * 0.12 }}
              >
                {activity === 'focus' ? <Brain className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MoodConstellationPicker({
  selectedMood,
  onSelect,
}: {
  selectedMood: HealingMoodId;
  onSelect: (mood: HealingMoodId) => void;
}) {
  return (
    <div className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Smile className="h-4 w-4 text-emerald-100" />
          心情星盘
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-emerald-200/70"
              animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.35, 0.9, 0.35] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {HEALING_MOOD_OPTIONS.map((item, index) => {
          const active = selectedMood === item.id;
          const visual = MOOD_VISUALS[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.hint}
              className={`group relative flex h-[72px] min-w-[62px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border transition ${
                active
                  ? 'border-emerald-200/60 bg-emerald-400/15 text-white shadow-[0_14px_30px_rgba(16,185,129,0.14)]'
                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:bg-white/[0.07]'
              }`}
            >
              <motion.span
                className={`absolute inset-0 bg-gradient-to-br ${visual.glow} opacity-35 blur-md`}
                animate={active ? { scale: [0.92, 1.08, 0.92], opacity: [0.28, 0.56, 0.28] } : { scale: 1, opacity: 0.22 }}
                transition={{ duration: 2 + index * 0.08, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
              />
              <motion.span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-slate-950 ${visual.blush}`}
                animate={active ? { y: [0, -4, 0], rotate: [-5, 5, -5] } : { y: 0, rotate: 0 }}
                transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
              >
                {visual.sticker}
              </motion.span>
              <span className="relative max-w-[52px] truncate text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SensoryMixer({
  lastTone,
  pulse,
  soundEnabled,
}: {
  lastTone: HealingTone;
  pulse: number;
  soundEnabled: boolean;
}) {
  const activeIndex = lastTone === 'sparkle' ? 2 : lastTone === 'soft' ? 1 : lastTone === 'complete' ? 3 : 0;
  const bars = [18, 28, 38, 24, 32];

  return (
    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <motion.div
          key={pulse}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
            soundEnabled ? 'border-amber-200/35 bg-amber-300/15 text-amber-100' : 'border-white/10 bg-white/[0.04] text-slate-400'
          }`}
          animate={soundEnabled ? { scale: [1, 1.08, 1], rotate: [-4, 4, -4] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <Music2 className="h-4.5 w-4.5" />
        </motion.div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-100">音色小调台</div>
          <div className="mt-1 text-[11px] text-slate-400">{soundEnabled ? '轻音反馈已接入' : '当前静音，只保留动效反馈'}</div>
        </div>
      </div>
      <div className="flex h-10 items-end gap-1.5">
        {bars.map((height, index) => (
          <motion.span
            key={`${index}-${pulse}`}
            className={`w-2 rounded-full ${
              index === activeIndex ? 'bg-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.45)]' : 'bg-sky-200/50'
            }`}
            animate={{
              height: soundEnabled ? [height * 0.55, height + (index === activeIndex ? 12 : 5), height * 0.7] : [12, 16, 12],
              opacity: soundEnabled ? [0.45, 0.95, 0.5] : [0.2, 0.35, 0.2],
            }}
            transition={{ duration: 1.2 + index * 0.1, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
          />
        ))}
      </div>
    </div>
  );
}

function HealingRitualTrack({
  audioArmed,
  soundEnabled,
  completedActivityCount,
  sparkleBurst,
}: {
  audioArmed: boolean;
  soundEnabled: boolean;
  completedActivityCount: number;
  sparkleBurst: number;
}) {
  const steps: Array<{ label: string; done: boolean; icon: typeof Wind; tone: string }> = [
    { label: '感受', done: true, icon: Smile, tone: 'text-emerald-100' },
    { label: '音色', done: audioArmed && soundEnabled, icon: Music2, tone: 'text-amber-100' },
    { label: '练习', done: completedActivityCount > 0, icon: Wand2, tone: 'text-sky-100' },
    { label: '陪伴', done: sparkleBurst > 0, icon: Heart, tone: 'text-rose-100' },
  ];

  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div
            key={step.label}
            className={`relative overflow-hidden rounded-[18px] border px-2 py-2 text-center ${
              step.done ? 'border-white/16 bg-white/[0.07]' : 'border-white/8 bg-white/[0.025]'
            }`}
          >
            <motion.div
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-950/28"
              animate={step.done ? { y: [0, -3, 0], scale: [1, 1.08, 1] } : { y: 0, scale: 1 }}
              transition={{ duration: 1.5, repeat: step.done ? Infinity : 0, ease: 'easeInOut', delay: index * 0.12 }}
            >
              <Icon className={`h-3.5 w-3.5 ${step.done ? step.tone : 'text-slate-500'}`} />
            </motion.div>
            <div className={`mt-1 text-[10px] font-semibold ${step.done ? 'text-slate-100' : 'text-slate-500'}`}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SoftPulseDots() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute rounded-full bg-emerald-300/18 blur-xl"
          style={{
            width: 72 + index * 24,
            height: 72 + index * 24,
            top: 10 + index * 8,
            left: `${18 + index * 23}%`,
          }}
          animate={{
            y: [0, -6, 0],
            opacity: [0.22, 0.38, 0.22],
            scale: [0.94, 1.04, 0.94],
          }}
          transition={{
            duration: 3.4 + index * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export default function HealingCornerPanel({
  isOpen,
  onClose,
  onOpenChat,
  petName,
  ambientEnabled,
  onEnableAmbient,
}: HealingCornerPanelProps) {
  const [selectedMood, setSelectedMood] = useState<HealingMoodId>('tense');
  const [activeActivity, setActiveActivity] = useState<Exclude<HealingActivityId, 'chat'>>('breathe');
  const [breathingStepIndex, setBreathingStepIndex] = useState(0);
  const [courageIndex, setCourageIndex] = useState(0);
  const [releaseText, setReleaseText] = useState('');
  const [releaseDone, setReleaseDone] = useState(false);
  const [releaseBubbles, setReleaseBubbles] = useState<ReleaseBubble[]>([]);
  const [groundingProgress, setGroundingProgress] = useState(0);
  const [focusProgress, setFocusProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioArmed, setAudioArmed] = useState(false);
  const [sparkleBurst, setSparkleBurst] = useState(0);
  const [lastTone, setLastTone] = useState<HealingTone>('breathe');
  const [sensoryPulse, setSensoryPulse] = useState(0);
  const [companionTapCount, setCompanionTapCount] = useState(0);
  const [calmCleared, setCalmCleared] = useState<string[]>([]);

  const moodOption = useMemo(() => getMoodOption(selectedMood), [selectedMood]);
  const breathingStep = HEALING_BREATHING_STEPS[breathingStepIndex];
  const courageCard = getCourageCard(courageIndex);
  const groundingDone = groundingProgress >= HEALING_GROUNDING_STEPS.length;
  const focusDone = focusProgress >= HEALING_FOCUS_STEPS.length;
  const releaseClearedCount = releaseBubbles.filter((bubble) => bubble.popped).length;
  const completedActivityCount =
    Number(groundingDone) +
    Number(focusDone) +
    Number(releaseDone) +
    Number(activeActivity === 'breathe' && breathingStepIndex > 0);
  const energyScore = Math.min(96, 54 + completedActivityCount * 11 + (ambientEnabled ? 6 : 0));
  const headerMoodVisual = MOOD_VISUALS[selectedMood];

  const triggerSensoryFeedback = (
    tone: HealingTone,
    fallback: Parameters<typeof playSound>[0] = 'button_click',
    options?: { burst?: boolean; volume?: number },
  ) => {
    setAudioArmed(true);
    setLastTone(tone);
    setSensoryPulse((current) => current + 1);
    if (options?.burst) {
      setSparkleBurst((current) => current + 1);
    }
    if (!soundEnabled) {
      return;
    }
    playSound(fallback, { volume: options?.volume ?? 0.22 });
    playHealingTone(tone);
  };

  const handleSoundToggle = () => {
    setAudioArmed(true);
    setLastTone('tap');
    setSensoryPulse((current) => current + 1);
    setSoundEnabled((current) => {
      const next = !current;
      if (next) {
        playSound('button_click', { volume: 0.18 });
        playHealingTone('tap');
      }
      return next;
    });
  };

  const handleCompanionTap = () => {
    setCompanionTapCount((current) => current + 1);
    triggerSensoryFeedback(activeActivity === 'breathe' ? 'breathe' : 'sparkle', 'pet_happy', {
      burst: true,
      volume: 0.18,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const recommended = getRecommendedActivity('tense');
    setSelectedMood('tense');
    setActiveActivity(recommended === 'chat' ? 'breathe' : recommended);
    setBreathingStepIndex(0);
    setReleaseText('');
    setReleaseDone(false);
    setReleaseBubbles([]);
    setGroundingProgress(0);
    setFocusProgress(0);
    setSparkleBurst(0);
    setLastTone('breathe');
    setSensoryPulse(0);
    setCompanionTapCount(0);
    setCalmCleared([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeActivity !== 'breathe') {
      return;
    }

    const step = HEALING_BREATHING_STEPS[breathingStepIndex];
    const timer = window.setTimeout(() => {
      setBreathingStepIndex((current) => (current + 1) % HEALING_BREATHING_STEPS.length);
    }, step.durationMs);

    return () => window.clearTimeout(timer);
  }, [activeActivity, breathingStepIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || !audioArmed || !soundEnabled || activeActivity !== 'breathe') {
      return;
    }
    playHealingTone('breathe');
  }, [activeActivity, audioArmed, breathingStepIndex, isOpen, soundEnabled]);

  const handleMoodChange = (moodId: HealingMoodId) => {
    const recommended = getRecommendedActivity(moodId);
    triggerSensoryFeedback('tap', 'button_hover');
    setSelectedMood(moodId);
    setActiveActivity(recommended === 'chat' ? 'breathe' : recommended);
  };

  const handleRelease = () => {
    if (!releaseText.trim()) {
      return;
    }
    triggerSensoryFeedback('soft', 'pet_happy', { burst: true, volume: 0.18 });
    setReleaseDone(false);
    setReleaseBubbles(createReleaseBubbles(releaseText));
  };

  const handleReleaseBubblePop = (bubbleId: string) => {
    let clearedAll = false;
    setReleaseBubbles((current) => {
      const next = current.map((bubble) =>
        bubble.id === bubbleId ? { ...bubble, popped: true } : bubble,
      );
      clearedAll = next.length > 0 && next.every((bubble) => bubble.popped);
      return next;
    });
    triggerSensoryFeedback(clearedAll ? 'complete' : 'sparkle', clearedAll ? 'collect_gem' : 'button_hover', {
      burst: true,
      volume: clearedAll ? 0.24 : 0.16,
    });
    if (clearedAll) {
      setReleaseDone(true);
    }
  };

  const handleActivityChange = (activity: Exclude<HealingActivityId, 'chat'>) => {
    triggerSensoryFeedback(activity === 'courage' ? 'sparkle' : activity === 'breathe' ? 'breathe' : 'tap', 'button_click', {
      burst: activity === 'courage',
      volume: 0.2,
    });
    setActiveActivity(activity);
  };

  const ActivityIcon = ACTIVITY_META[activeActivity].icon;
  const releaseTargetCount = releaseBubbles.length > 0 ? releaseBubbles.length : 6;
  const calmClearedCount = calmCleared.length;
  const playScore = Math.min(100, energyScore + calmClearedCount * 3);
  const handleCalmObjectTap = (objectId: string) => {
    triggerSensoryFeedback('sparkle', 'button_hover', { burst: true, volume: 0.14 });
    setCalmCleared((current) =>
      current.includes(objectId) ? current : [...current, objectId],
    );
  };
  const ritualStatusCards: Array<{
    label: string;
    value: string;
    hint: string;
    icon: typeof Heart;
    tone: string;
    glow: string;
  }> = [
    {
      label: '陪伴感',
      value: `${companionTapCount + 1}x`,
      hint: '轻拍、抱抱、点亮都算一次互动。',
      icon: Heart,
      tone: 'text-rose-100',
      glow: 'from-rose-300/22 via-white/6 to-transparent',
    },
    {
      label: '心能同步',
      value: `${energyScore}%`,
      hint: `当前主玩法：${ACTIVITY_META[activeActivity].label}`,
      icon: Sparkles,
      tone: 'text-sky-100',
      glow: 'from-sky-300/22 via-white/6 to-transparent',
    },
    {
      label: '释放进度',
      value: `${releaseDone ? releaseTargetCount : releaseClearedCount}/${releaseTargetCount}`,
      hint: '把烦心泡泡一点点弹走。',
      icon: Send,
      tone: 'text-emerald-100',
      glow: 'from-emerald-300/22 via-white/6 to-transparent',
    },
  ];

  const sensoryDeck = (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.52))] p-4 shadow-[0_22px_42px_rgba(2,6,23,0.2)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/80">感官控制台</div>
          <div className="mt-1 text-sm font-black text-white">声音、氛围、轻触反馈</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-200">
          {soundEnabled ? '已启用' : '静音模式'}
        </div>
      </div>

      <SensoryMixer lastTone={lastTone} pulse={sensoryPulse} soundEnabled={soundEnabled} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSoundToggle}
          className={`flex min-h-[88px] min-w-0 flex-col items-start justify-between rounded-[22px] border px-3 py-3 text-left transition ${
            soundEnabled
              ? 'border-emerald-300/35 bg-emerald-500/14 text-emerald-50'
              : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          <div>
            <div className="text-xs font-semibold">{soundEnabled ? '音效陪伴已开' : '打开音效陪伴'}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-300/80">
              {soundEnabled ? '保留轻柔反馈，和动效同步。' : '让呼吸、星铃、暖光更有触感。'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerSensoryFeedback('soft', 'button_click', { volume: 0.16 });
            onEnableAmbient();
          }}
          disabled={ambientEnabled}
          className={`flex min-h-[88px] min-w-0 flex-col items-start justify-between rounded-[22px] border px-3 py-3 text-left transition ${
            ambientEnabled
              ? 'border-sky-300/28 bg-sky-500/12 text-sky-50'
              : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <div>
            <div className="text-xs font-semibold">{ambientEnabled ? '环境声已开启' : '加一点环境氛围'}</div>
            <div className="mt-1 text-[11px] leading-5 text-slate-300/80">
              {ambientEnabled ? '空气感已经铺开了。' : '更像在一间安静的小屋里慢慢放松。'}
            </div>
          </div>
        </button>

        {SENSORY_BUTTONS.map((item) => {
          const SensoryIcon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() =>
                triggerSensoryFeedback(item.id, item.fallback, {
                  burst: item.id === 'sparkle',
                  volume: item.id === 'sparkle' ? 0.24 : 0.16,
                })
              }
              title={item.hint}
              className="flex min-h-[88px] min-w-0 flex-col items-start justify-between rounded-[22px] border border-white/10 bg-white/[0.05] px-3 py-3 text-left transition hover:border-white/18 hover:bg-white/[0.08]"
              whileTap={{ scale: 0.96 }}
            >
              <SensoryIcon className={`h-4 w-4 ${item.toneClass}`} />
              <div>
                <div className="text-xs font-semibold text-white">{item.label}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-300/80">{item.hint}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const progressDeck = (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4 shadow-[0_20px_38px_rgba(2,6,23,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">舒压进程</div>
          <div className="mt-1 text-sm font-black text-white">今天的放松节奏</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100">
          完成 {completedActivityCount}/4
        </div>
      </div>

      <div className="mt-3 rounded-[22px] border border-white/10 bg-slate-950/45 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">心能同步</div>
            <div className="mt-1 text-sm font-black text-white">{energyScore}%</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8,#a78bfa)]"
                initial={false}
                animate={{ width: `${energyScore}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-1 text-[11px] leading-5 text-slate-400">
              当前推荐：{ACTIVITY_META[activeActivity].label}
            </div>
          </div>
        </div>
      </div>

      <HealingRitualTrack
        audioArmed={audioArmed}
        soundEnabled={soundEnabled}
        completedActivityCount={completedActivityCount}
        sparkleBurst={sparkleBurst}
      />
    </div>
  );

  const activitySelectorDeck = (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(15,23,42,0.22))] p-3 shadow-[0_20px_38px_rgba(2,6,23,0.16)] sm:rounded-[28px] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-sky-100/80">玩法舱</div>
          <div className="mt-1 text-sm font-black text-white">选一种方式</div>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100 sm:block">
          5 种舒压玩法
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-1 xl:grid-cols-2">
        {(Object.keys(ACTIVITY_META) as Array<Exclude<HealingActivityId, 'chat'>>).map((activity, index) => {
          const meta = ACTIVITY_META[activity];
          const Icon = meta.icon;

          return (
            <button
              key={activity}
              type="button"
              onClick={() => handleActivityChange(activity)}
              className={`group relative overflow-hidden rounded-[18px] border px-2 py-2 text-center transition sm:rounded-[24px] sm:px-3 sm:py-3 sm:text-left ${
                activeActivity === activity
                  ? 'border-sky-300/55 bg-sky-500/12 text-white shadow-[0_18px_32px_rgba(56,189,248,0.16)]'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
              }`}
            >
              <motion.div
                className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/6 blur-xl sm:right-3 sm:top-3 sm:h-10 sm:w-10"
                animate={activeActivity === activity ? { scale: [0.88, 1.18, 0.88], opacity: [0.2, 0.45, 0.2] } : { scale: 1, opacity: 0.12 }}
                transition={{ duration: 2 + index * 0.08, repeat: activeActivity === activity ? Infinity : 0, ease: 'easeInOut' }}
              />
              <motion.div
                animate={activeActivity === activity ? { y: [0, -3, 0], rotate: [-4, 4, -4] } : { y: 0, rotate: 0 }}
                transition={{ duration: 1.4, repeat: activeActivity === activity ? Infinity : 0, ease: 'easeInOut' }}
                className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] sm:mx-0 sm:h-10 sm:w-10"
              >
                <Icon className="h-4 w-4" />
              </motion.div>
              <div className="relative mt-2 text-[10px] font-semibold leading-4 sm:mt-3 sm:text-sm">{meta.label}</div>
              <div className="relative mt-1 hidden text-[11px] leading-5 text-slate-400 sm:block">{meta.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const activeActivityBoard = (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-3 shadow-[0_24px_42px_rgba(2,6,23,0.2)] sm:rounded-[30px] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
            <ActivityIcon className="h-3.5 w-3.5" />
            当前舒压玩法
          </div>
          <div className="mt-2 text-lg font-black text-white">{ACTIVITY_META[activeActivity].label}</div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{ACTIVITY_META[activeActivity].description}</p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold text-slate-100 sm:block">
          舒压进度 {completedActivityCount}/4
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-[24px] border border-white/8 bg-slate-950/28 p-3 sm:rounded-[28px]">
          {activeActivity !== 'release' && (
            <ActivityToyPreview
              activity={activeActivity}
              breathingStepIndex={breathingStepIndex}
              groundingProgress={groundingProgress}
              focusProgress={focusProgress}
              releaseDone={releaseDone}
              courageIndex={courageIndex}
            />
          )}

          {activeActivity === 'breathe' && (
            <div className="mt-4">
              <div className="flex items-center justify-center rounded-[28px] border border-emerald-300/16 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.16),transparent_58%)] px-4 py-5">
                <motion.div
                  animate={{
                    scale: breathingStep.scale,
                    opacity: [0.82, 1, 0.88],
                  }}
                  transition={{
                    duration: breathingStep.durationMs / 1000,
                    ease: 'easeInOut',
                  }}
                    className="flex h-28 w-28 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_48px_rgba(52,211,153,0.18)] sm:h-36 sm:w-36"
                >
                  <div className="text-center">
                    <div className="text-lg font-black text-white">{breathingStep.label}</div>
                    <div className="mt-1 text-xs text-emerald-100/80">{breathingStep.detail}</div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                {HEALING_BREATHING_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`h-2 rounded-full transition ${
                      index === breathingStepIndex ? 'w-8 bg-emerald-300' : 'w-2 bg-white/18'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-slate-100">想更安静一点</div>
                  <div className="mt-1 text-[11px] text-slate-400">打开环境声，像在小屋里慢慢把节奏放轻。</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerSensoryFeedback('soft', 'button_click', { volume: 0.16 });
                    onEnableAmbient();
                  }}
                  disabled={ambientEnabled}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    ambientEnabled
                      ? 'border border-emerald-300/20 bg-emerald-500/12 text-emerald-100'
                      : 'border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  {ambientEnabled ? '已开启' : '打开环境声'}
                </button>
              </div>
            </div>
          )}

          {activeActivity === 'ground' && (
            <div className="mt-4">
              <div className="grid gap-2">
                {HEALING_GROUNDING_STEPS.map((step, index) => {
                  const done = index < groundingProgress;
                  const active = index === groundingProgress && !groundingDone;

                  return (
                    <div
                      key={step.id}
                      className={`rounded-[20px] border px-3 py-3 transition ${
                        done
                          ? 'border-emerald-300/35 bg-emerald-500/10'
                          : active
                            ? 'border-sky-300/35 bg-sky-500/10'
                            : 'border-white/10 bg-slate-950/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{step.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-300">{step.hint}</div>
                        </div>
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            done ? 'bg-emerald-300 text-slate-950' : 'bg-white/10 text-white'
                          }`}
                        >
                          {done ? '✓' : index + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3">
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    {groundingDone ? '很好，已经落回来了' : '完成一步就点一次'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {groundingDone ? '如果还想继续放松，可以再做一轮。' : '不用追求完美，慢慢做就行。'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerSensoryFeedback(groundingDone ? 'soft' : 'tap', groundingDone ? 'pet_happy' : 'button_click', {
                      burst: !groundingDone && groundingProgress + 1 >= HEALING_GROUNDING_STEPS.length,
                      volume: 0.18,
                    });
                    setGroundingProgress((current) =>
                      groundingDone ? 0 : Math.min(current + 1, HEALING_GROUNDING_STEPS.length),
                    );
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  {groundingDone ? '再来一轮' : '完成一步'}
                </button>
              </div>
            </div>
          )}

          {activeActivity === 'release' && (
            <div className="mt-4">
              <AnimatePresence mode="wait">
                {releaseDone ? (
                  <motion.div
                    key="release-done"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="rounded-[24px] border border-sky-300/18 bg-sky-500/10 px-4 py-5"
                  >
                    <motion.div
                      initial={{ opacity: 0.9, x: 0, y: 0 }}
                      animate={{ opacity: 0, x: 84, y: -52, rotate: 12 }}
                      transition={{ duration: 1.1, ease: 'easeOut' }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-100"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {releaseText.trim().slice(0, 18)}
                    </motion.div>
                    <div className="mt-6 text-sm font-semibold text-white">这句小烦恼已经飘走了。</div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">先轻一点，再继续今天的冒险。</div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerSensoryFeedback('tap', 'button_click', { volume: 0.16 });
                        setReleaseText('');
                        setReleaseDone(false);
                        setReleaseBubbles([]);
                      }}
                      className="mt-4 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                    >
                      再写一句
                    </button>
                  </motion.div>
                ) : releaseBubbles.length > 0 ? (
                  <motion.div
                    key="release-bubbles"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <div className="relative h-52 overflow-hidden rounded-[24px] border border-sky-300/18 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_52%),linear-gradient(180deg,rgba(8,47,73,0.48),rgba(15,23,42,0.78))] sm:h-72 sm:rounded-[26px]">
                      <div className="pointer-events-none absolute inset-0">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <motion.span
                            key={`release-bubble-aura-${index}`}
                            className="absolute rounded-full bg-white/12 blur-xl"
                            style={{
                              width: 48 + index * 12,
                              height: 48 + index * 12,
                              left: `${10 + index * 16}%`,
                              top: `${16 + (index % 3) * 22}%`,
                            }}
                            animate={{ y: [0, -8 - index, 0], opacity: [0.14, 0.32, 0.14] }}
                            transition={{ duration: 3.2 + index * 0.25, repeat: Infinity, ease: 'easeInOut', delay: index * 0.12 }}
                          />
                        ))}
                      </div>
                      <div className="relative z-10 grid h-full grid-cols-3 place-items-center gap-2 px-4 py-5">
                        {releaseBubbles.map((bubble, index) => (
                          <motion.button
                            key={bubble.id}
                            type="button"
                            disabled={bubble.popped}
                            onClick={() => handleReleaseBubblePop(bubble.id)}
                            className="flex h-16 w-16 items-center justify-center rounded-full border border-white/55 text-center text-[11px] font-semibold text-white shadow-[0_18px_34px_rgba(14,165,233,0.28),inset_0_1px_0_rgba(255,255,255,0.36)] ring-1 ring-white/20 backdrop-blur-sm transition sm:h-20 sm:w-20 sm:text-xs"
                            style={{
                              background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.52) 0%, ${bubble.tint} 58%, rgba(14,165,233,0.34) 100%)`,
                            }}
                            initial={{ opacity: 0, scale: 0.74, y: 10 }}
                            animate={
                              bubble.popped
                                ? { opacity: 0, scale: 0.2, y: -36 }
                                : { opacity: 1, scale: [1, 1.04, 1], y: [0, -6 - index, 0] }
                            }
                            transition={
                              bubble.popped
                                ? { duration: 0.35, ease: 'easeInOut' }
                                : {
                                    opacity: { duration: 0.22, ease: 'easeOut' },
                                    scale: { duration: 2.8 + index * 0.12, repeat: Infinity, ease: 'easeInOut' },
                                    y: { duration: 2.8 + index * 0.12, repeat: Infinity, ease: 'easeInOut' },
                                  }
                            }
                            whileTap={{ scale: 0.9 }}
                          >
                            <span className="max-w-[48px] leading-4 sm:max-w-[52px]">{bubble.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-100">点掉烦心泡泡，把它们一颗颗放走</div>
                        <div className="mt-1 text-[11px] text-slate-400">已释放 {releaseClearedCount}/{releaseBubbles.length} 颗，全部放走后会完成这轮舒压。</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          triggerSensoryFeedback('tap', 'button_click', { volume: 0.16 });
                          setReleaseBubbles([]);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                      >
                        重写一句
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="release-input"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <textarea
                      value={releaseText}
                      onChange={(event) => setReleaseText(event.target.value.slice(0, 40))}
                      rows={3}
                      placeholder="写一句就好，比如：我现在有点紧张。"
                      className="w-full resize-none rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-3 text-sm text-white outline-none transition focus:border-sky-300/45"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400">写完就放下，不会留在这里。</div>
                      <div className="text-[11px] text-slate-500">{releaseText.length}/40</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRelease}
                      disabled={!releaseText.trim()}
                      className={`mt-3 w-full rounded-full px-3 py-2 text-sm font-semibold transition ${
                        releaseText.trim()
                          ? 'bg-sky-500 text-white hover:bg-sky-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      放出去
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeActivity === 'focus' && (
            <div className="mt-4">
              <div className="grid gap-2">
                {HEALING_FOCUS_STEPS.map((step, index) => {
                  const done = index < focusProgress;
                  const active = index === focusProgress && !focusDone;

                  return (
                    <div
                      key={step.id}
                      className={`rounded-[20px] border px-3 py-3 transition ${
                        done
                          ? 'border-violet-300/35 bg-violet-500/10'
                          : active
                            ? 'border-sky-300/35 bg-sky-500/10'
                            : 'border-white/10 bg-slate-950/35'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{step.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-300">{step.hint}</div>
                          <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-slate-200">
                            {step.action}
                          </div>
                        </div>
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            done ? 'bg-violet-300 text-slate-950' : 'bg-white/10 text-white'
                          }`}
                        >
                          {done ? '✓' : index + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3">
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    {focusDone ? '已经可以回到任务了' : '完成一个小动作就推进一步'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {focusDone ? '保持小步启动，不需要一次解决全部。' : '只找下一步，先不处理整座山。'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerSensoryFeedback(focusDone ? 'soft' : 'tap', focusDone ? 'pet_happy' : 'button_click', {
                      burst: !focusDone && focusProgress + 1 >= HEALING_FOCUS_STEPS.length,
                      volume: 0.18,
                    });
                    setFocusProgress((current) =>
                      focusDone ? 0 : Math.min(current + 1, HEALING_FOCUS_STEPS.length),
                    );
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  {focusDone ? '再做一轮' : '完成一步'}
                </button>
              </div>
            </div>
          )}

          {activeActivity === 'courage' && (
              <div className="mt-4 rounded-[26px] border border-amber-300/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(15,23,42,0.28))] px-4 py-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-amber-100/80">
                鼓劲卡
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="relative h-48 w-36">
                  <div className="absolute left-3 top-4 h-full w-full rounded-[24px] border border-white/10 bg-white/[0.05]" />
                  <div className="absolute left-1.5 top-2 h-full w-full rounded-[24px] border border-white/10 bg-white/[0.06]" />
                  <motion.div
                    key={courageIndex}
                    initial={{ rotate: -8, y: 12, opacity: 0.7 }}
                    animate={{ rotate: [0, 2, -1, 0], y: [0, -4, 0], opacity: 1 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="relative flex h-full w-full flex-col justify-between rounded-[24px] border border-amber-100/55 bg-[linear-gradient(160deg,rgba(255,252,238,0.96),rgba(253,230,138,0.92),rgba(251,191,36,0.86))] px-4 py-4 text-slate-900 shadow-[0_24px_44px_rgba(251,191,36,0.2)]"
                  >
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-700/80">
                      <span>加油</span>
                      <Heart className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <div className="text-lg font-black leading-7">{courageCard.title}</div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{courageCard.message}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-900/10 bg-white/55 px-3 py-2 text-xs leading-5 text-slate-800">
                      {courageCard.action}
                    </div>
                  </motion.div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerSensoryFeedback('sparkle', 'collect_gem', { burst: true, volume: 0.24 });
                  setCourageIndex((current) => (current + 1) % COURAGE_CARDS.length);
                }}
                className="mt-4 w-full rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
              >
                再抽一张勇气卡
              </button>
            </div>
          )}
        </div>

        <div className="hidden space-y-4 xl:block">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">陪伴舞台提示</div>
            <div className="mt-2 text-sm font-semibold text-white">先轻拍伙伴，再进入一种舒压玩法。</div>
            <div className="mt-3 space-y-2">
              {ritualStatusCards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br ${card.glow}`}>
                        <CardIcon className={`h-4 w-4 ${card.tone}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-300">{card.label}</div>
                        <div className="text-sm font-black text-white">{card.value}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-slate-400">{card.hint}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const companionStageDeck = (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.68),rgba(15,23,42,0.44))] p-3 shadow-[0_24px_42px_rgba(2,6,23,0.2)] sm:rounded-[30px] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">陪伴舞台</div>
          <div className="mt-1 text-sm font-black text-white">{petName} 正在陪你放轻一点</div>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100 sm:block">
          轻拍伙伴会触发音效和星光
        </div>
      </div>

      <HealingCompanionStage
        mood={selectedMood}
        activity={activeActivity}
        energyScore={energyScore}
        sparkleBurst={sparkleBurst}
        soundEnabled={soundEnabled}
        companionTapCount={companionTapCount}
        onCompanionTap={handleCompanionTap}
      />

      <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-3">
        {ritualStatusCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.label}
              className={`overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br ${card.glow}`}>
                  <CardIcon className={`h-4 w-4 ${card.tone}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-300">{card.label}</div>
                  <div className="text-sm font-black text-white">{card.value}</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] leading-5 text-slate-400">{card.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const immersiveHealingDeck = (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3 shadow-[0_26px_50px_rgba(2,6,23,0.24)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-100">
            <ActivityIcon className="h-3.5 w-3.5" />
            舒压游乐舱
          </div>
          <div className="mt-2 text-base font-black text-white sm:text-lg">{ACTIVITY_META[activeActivity].label}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSoundToggle}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
              soundEnabled
                ? 'border-emerald-300/30 bg-emerald-400/12 text-emerald-50'
                : 'border-white/10 bg-white/[0.04] text-slate-300'
            }`}
            aria-label={soundEnabled ? '关闭心能角音效' : '开启心能角音效'}
            title={soundEnabled ? '关闭音效' : '开启音效'}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold text-slate-100">
            {playScore}%
          </div>
        </div>
      </div>

      <div className="relative mt-3 min-h-[420px] overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(186,230,253,0.24),transparent_34%),linear-gradient(180deg,rgba(8,47,73,0.62),rgba(15,23,42,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:min-h-[520px]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-[34%] rounded-t-[50%] bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.22),rgba(15,118,110,0.14)_48%,transparent_76%)]" />
          <div className="absolute left-[10%] top-[12%] h-28 w-28 rounded-full bg-sky-200/18 blur-3xl" />
          <div className="absolute right-[8%] top-[20%] h-32 w-32 rounded-full bg-emerald-200/14 blur-3xl" />
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.span
              key={`calm-ray-${index}`}
              className="absolute h-[2px] rounded-full bg-white/18"
              style={{ left: `${12 + index * 17}%`, top: `${22 + (index % 2) * 13}%`, width: 80 + index * 18 }}
              animate={{ x: [0, 18, 0], opacity: [0.12, 0.34, 0.12] }}
              transition={{ duration: 4.2 + index * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
            />
          ))}
        </div>

        {CALM_PLAY_OBJECTS.map((item, index) => {
          const cleared = calmCleared.includes(item.id);
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => handleCalmObjectTap(item.id)}
              disabled={cleared}
              className={`absolute z-[2] flex items-center justify-center rounded-full border border-white/35 bg-gradient-to-br ${item.tint} text-[11px] font-bold text-white shadow-[0_18px_38px_rgba(14,165,233,0.18),inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-sm transition`}
              style={{
                left: item.left,
                top: item.top,
                width: item.size,
                height: item.size,
              }}
              initial={false}
              animate={
                cleared
                  ? { opacity: 0, scale: 0.22, y: -28 }
                  : { opacity: 1, scale: [0.96, 1.04, 0.96], y: [0, -6 - index, 0] }
              }
              transition={
                cleared
                  ? { duration: 0.28, ease: 'easeOut' }
                  : { duration: 3.2 + index * 0.18, repeat: Infinity, ease: 'easeInOut' }
              }
              whileTap={{ scale: 0.88 }}
              title={`点亮${item.label}`}
              aria-label={`点亮${item.label}`}
            >
              {item.label}
            </motion.button>
          );
        })}

        <motion.button
          type="button"
          onClick={handleCompanionTap}
          className="absolute left-1/2 top-[46%] z-[4] flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[radial-gradient(circle_at_38%_28%,rgba(255,255,255,0.94),rgba(186,230,253,0.44)_34%,rgba(14,165,233,0.18)_64%,rgba(15,23,42,0.12))] shadow-[0_0_70px_rgba(125,211,252,0.26),inset_0_1px_0_rgba(255,255,255,0.48)] sm:h-52 sm:w-52"
          animate={{ scale: activeActivity === 'breathe' ? breathingStep.scale : [1, 1.025, 1], y: [0, -5, 0] }}
          transition={{
            duration: activeActivity === 'breathe' ? breathingStep.durationMs / 1000 : 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileTap={{ scale: 0.94 }}
          title="轻拍伙伴"
          aria-label="轻拍伙伴"
        >
          <div className="relative flex h-[78%] w-[78%] items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.18))]">
            <motion.div
              className="absolute inset-3 rounded-full border border-white/24"
              animate={{ scale: [0.84, 1.08, 0.84], opacity: [0.28, 0.72, 0.28] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/24 bg-white/18 text-white sm:h-14 sm:w-14">
                <Heart className="h-6 w-6" />
              </div>
              <div className="text-sm font-black text-white sm:text-base">{petName}</div>
              <div className="mt-1 text-[11px] font-semibold text-sky-50/80">
                {activeActivity === 'breathe' ? breathingStep.label : '轻拍放松'}
              </div>
            </div>
          </div>
        </motion.button>

        {activeActivity === 'release' && (
          <div className="absolute inset-x-3 bottom-3 z-[5] rounded-[24px] border border-white/10 bg-slate-950/56 p-3 shadow-[0_18px_36px_rgba(2,6,23,0.28)] backdrop-blur-md sm:inset-x-5 sm:bottom-5">
            {releaseBubbles.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {releaseBubbles.map((bubble, index) => (
                    <motion.button
                      key={bubble.id}
                      type="button"
                      disabled={bubble.popped}
                      onClick={() => handleReleaseBubblePop(bubble.id)}
                      className="flex h-14 items-center justify-center rounded-full border border-white/45 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-16"
                      style={{
                        background: `radial-gradient(circle at 30% 26%, rgba(255,255,255,0.52), ${bubble.tint} 58%, rgba(14,165,233,0.32))`,
                      }}
                      animate={
                        bubble.popped
                          ? { opacity: 0, scale: 0.25, y: -24 }
                          : { opacity: 1, scale: [1, 1.04, 1], y: [0, -4 - index, 0] }
                      }
                      transition={
                        bubble.popped
                          ? { duration: 0.28 }
                          : { duration: 2.8 + index * 0.12, repeat: Infinity, ease: 'easeInOut' }
                      }
                      whileTap={{ scale: 0.9 }}
                    >
                      {bubble.label}
                    </motion.button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-200">
                  <span>释放 {releaseClearedCount}/{releaseBubbles.length}</span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSensoryFeedback('tap', 'button_click', { volume: 0.14 });
                      setReleaseBubbles([]);
                      setReleaseDone(false);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 font-semibold text-white"
                  >
                    重来
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {['紧张', '烦躁', '卡住'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        triggerSensoryFeedback('soft', 'pet_happy', { burst: true, volume: 0.16 });
                        setReleaseText(label);
                        setReleaseDone(false);
                        setReleaseBubbles(createReleaseBubbles(label));
                      }}
                      className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.12]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={releaseText}
                    onChange={(event) => setReleaseText(event.target.value.slice(0, 24))}
                    placeholder="也可以写一句"
                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-slate-950/54 px-3 py-2 text-xs text-white outline-none focus:border-sky-300/45"
                  />
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={!releaseText.trim()}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      releaseText.trim() ? 'bg-sky-500 text-white hover:bg-sky-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    放走
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeActivity !== 'release' && (
          <div className="absolute inset-x-3 bottom-3 z-[5] grid grid-cols-3 gap-1.5 rounded-[24px] border border-white/10 bg-slate-950/50 p-2 shadow-[0_18px_36px_rgba(2,6,23,0.26)] backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:gap-2 sm:p-3">
            <button
              type="button"
              onClick={() => {
                triggerSensoryFeedback('breathe', 'button_click', { volume: 0.16 });
                setBreathingStepIndex((current) => (current + 1) % HEALING_BREATHING_STEPS.length);
              }}
              className="min-w-0 rounded-[18px] border border-emerald-300/20 bg-emerald-400/10 px-1.5 py-3 text-[11px] font-semibold text-emerald-50 transition hover:bg-emerald-400/16 sm:px-2 sm:text-xs"
            >
              呼吸圈
            </button>
            <button
              type="button"
              onClick={() => {
                triggerSensoryFeedback(groundingDone ? 'soft' : 'tap', groundingDone ? 'pet_happy' : 'button_click', {
                  burst: !groundingDone && groundingProgress + 1 >= HEALING_GROUNDING_STEPS.length,
                  volume: 0.16,
                });
                setGroundingProgress((current) =>
                  groundingDone ? 0 : Math.min(current + 1, HEALING_GROUNDING_STEPS.length),
                );
              }}
              className="min-w-0 rounded-[18px] border border-sky-300/20 bg-sky-400/10 px-1.5 py-3 text-[11px] font-semibold text-sky-50 transition hover:bg-sky-400/16 sm:px-2 sm:text-xs"
            >
              落地感
            </button>
            <button
              type="button"
              onClick={() => {
                triggerSensoryFeedback('sparkle', 'collect_gem', { burst: true, volume: 0.2 });
                setCourageIndex((current) => (current + 1) % COURAGE_CARDS.length);
              }}
              className="min-w-0 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-1.5 py-3 text-[11px] font-semibold text-amber-50 transition hover:bg-amber-300/16 sm:px-2 sm:text-xs"
            >
              勇气卡
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 z-[6] rounded-full border border-white/10 bg-slate-950/42 px-3 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-md sm:left-5 sm:top-5">
          点亮 {calmClearedCount}/{CALM_PLAY_OBJECTS.length}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-emerald-100/80">当前节奏</div>
          <div className="mt-1 text-sm font-black text-white">{activeActivity === 'breathe' ? breathingStep.detail : moodOption.label}</div>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-sky-100/80">释放进度</div>
          <div className="mt-1 text-sm font-black text-white">{releaseDone ? releaseTargetCount : releaseClearedCount}/{releaseTargetCount}</div>
        </div>
        <button
          type="button"
          onClick={onOpenChat}
          className="rounded-[20px] border border-sky-300/20 bg-sky-500/10 px-3 py-3 text-left transition hover:bg-sky-500/16"
        >
          <div className="text-[10px] font-semibold tracking-[0.16em] text-sky-100/80">需要帮助</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
            <MessageCircle className="h-4 w-4" />
            问小伴
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={onClose}
          className="absolute inset-0 z-[74] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.44),rgba(2,6,23,0.62))] backdrop-blur-[3px]"
          aria-label="关闭心能角遮罩"
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="absolute inset-x-3 bottom-3 top-16 z-[75] flex flex-col overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/95 shadow-[0_28px_70px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl lg:left-1/2 lg:top-1/2 lg:h-[min(88vh,780px)] lg:w-[min(96vw,1120px)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[32px]"
          style={{
            backgroundImage:
              'radial-gradient(circle at top, rgba(110,231,183,0.14), transparent 28%), radial-gradient(circle at 82% 18%, rgba(125,211,252,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.985))',
          }}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0))] px-3 py-3 sm:px-4 sm:py-4">
            <div className="pointer-events-none absolute inset-0">
              <div className={`absolute -left-10 top-2 h-28 w-28 rounded-full bg-gradient-to-br ${headerMoodVisual.glow} opacity-80 blur-3xl`} />
              <div className="absolute right-3 top-3 h-20 w-20 rounded-full border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
              {[0, 1, 2, 3].map((index) => (
                <motion.span
                  key={`healing-header-spark-${index}`}
                  className="absolute rounded-full bg-white/35 shadow-[0_0_14px_rgba(255,255,255,0.28)]"
                  style={{
                    width: 7 + index * 2,
                    height: 7 + index * 2,
                    right: 24 + index * 18,
                    top: 18 + (index % 2) * 18,
                  }}
                  animate={{ y: [0, -8 - index, 0], opacity: [0.25, 0.7, 0.25], scale: [0.86, 1.08, 0.86] }}
                  transition={{ duration: 2.6 + index * 0.25, repeat: Infinity, ease: 'easeInOut', delay: index * 0.14 }}
                />
              ))}
            </div>
            <SoftPulseDots />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <Heart className="h-3.5 w-3.5" />
                  舒压星湾
                </div>
                <h3 className="mt-2 truncate text-base font-black text-white sm:text-lg">{petName} 陪你慢慢放轻</h3>
                <p className="mt-1 hidden text-sm leading-6 text-slate-300 sm:block">{moodOption.hint}</p>
                <div className="mt-2 hidden flex-wrap gap-2 sm:flex">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100">
                    <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                    {moodOption.label}
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100">
                    <Wand2 className="h-3.5 w-3.5 text-amber-100" />
                    {ACTIVITY_META[activeActivity].label}
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-slate-100">
                    <Volume2 className={`h-3.5 w-3.5 ${soundEnabled ? 'text-emerald-100' : 'text-slate-400'}`} />
                    {soundEnabled ? '音感陪伴已开' : '静音陪伴中'}
                  </div>
                </div>
              </div>
              <div className="relative z-[1] flex items-center gap-2">
                <div className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold text-slate-100 sm:inline-flex">
                  <Star className="mr-1.5 h-3.5 w-3.5 text-amber-100" />
                  心能 {energyScore}%
                </div>
              <button
                type="button"
                onClick={onClose}
                className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="关闭心能角"
              >
                <X className="h-4 w-4" />
              </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_340px] lg:gap-4">
              <div className="space-y-3 lg:space-y-4">
                {immersiveHealingDeck}
                <div className="hidden" aria-hidden="true">
                  {companionStageDeck}
                  {activeActivityBoard}
                </div>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <MoodConstellationPicker selectedMood={selectedMood} onSelect={handleMoodChange} />
                <div className="hidden sm:block">{progressDeck}</div>
                {activitySelectorDeck}
                <div className="hidden sm:block">{sensoryDeck}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-3 py-3 sm:px-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="hidden rounded-[22px] border border-white/10 bg-white/[0.035] px-3 py-3 sm:block">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/18 bg-sky-500/12 text-sky-100">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">想说说刚才的感受？</div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-400">
                      可以让 {petName} 陪你聊聊，也可以继续留在这里慢慢缓一会儿。
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenChat}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-300/24 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500/18 lg:w-auto"
              >
                <MessageCircle className="h-4 w-4" />
                和小伴聊聊
              </button>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
