'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import InteractionIcon from '@/components/ui/InteractionIcon';
import { InteractionType } from '@/types/interaction';

interface ParticleConfig {
  type: 'heart' | 'star' | 'sparkle' | 'bubble' | 'lightning';
  count: number;
  size: number;
}

interface Particle {
  id: number;
  type: ParticleConfig['type'];
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  angle: number;
}

interface InteractionFeedbackProps {
  interactionType: InteractionType | null;
  isPlaying: boolean;
  onComplete?: () => void;
  position?: { x: number; y: number };
}

type FeedbackTrigger = (
  type: InteractionType,
  pos?: { x: number; y: number },
  speech?: string | null,
) => void;

const FEEDBACK_CONFIG: Record<
  InteractionType,
  {
    particles: ParticleConfig[];
    color: string;
    glowColor: string;
  }
> = {
  pat: {
    particles: [
      { type: 'heart', count: 5, size: 24 },
      { type: 'sparkle', count: 3, size: 16 },
    ],
    color: '#FF6B9D',
    glowColor: 'rgba(255, 107, 157, 0.4)',
  },
  play: {
    particles: [
      { type: 'star', count: 6, size: 20 },
      { type: 'sparkle', count: 4, size: 14 },
    ],
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.4)',
  },
  talk: {
    particles: [
      { type: 'bubble', count: 4, size: 18 },
      { type: 'heart', count: 2, size: 16 },
    ],
    color: '#7C9EFF',
    glowColor: 'rgba(124, 158, 255, 0.4)',
  },
  train: {
    particles: [
      { type: 'lightning', count: 4, size: 22 },
      { type: 'star', count: 3, size: 18 },
    ],
    color: '#FF8C00',
    glowColor: 'rgba(255, 140, 0, 0.4)',
  },
  read: {
    particles: [
      { type: 'sparkle', count: 5, size: 18 },
      { type: 'star', count: 3, size: 16 },
    ],
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  paint: {
    particles: [
      { type: 'star', count: 5, size: 18 },
      { type: 'sparkle', count: 4, size: 16 },
    ],
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  chat: {
    particles: [
      { type: 'bubble', count: 5, size: 18 },
      { type: 'sparkle', count: 3, size: 14 },
    ],
    color: '#60A5FA',
    glowColor: 'rgba(96, 165, 250, 0.4)',
  },
  bath: {
    particles: [
      { type: 'bubble', count: 6, size: 18 },
      { type: 'sparkle', count: 3, size: 14 },
    ],
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
};

const FEEDBACK_TEXT: Partial<Record<InteractionType, string>> = {
  pat: '好舒服',
  play: '玩得开心',
  talk: '聊得开心',
  train: '训练中',
  read: '认真阅读',
  paint: '正在创作',
  chat: '一起聊天',
  bath: '洗香香',
};

const FEEDBACK_DURATION_MS: Partial<Record<InteractionType, number>> = {
  train: 3800,
  read: 3000,
  paint: 3600,
  bath: 2600,
};

const ACTION_FIRST_FEEDBACK = new Set<InteractionType>(['train', 'read', 'paint']);

const BATH_BUBBLES = [
  { x: -24, y: 6, size: 8, delay: 0 },
  { x: -6, y: -4, size: 12, delay: 0.1 },
  { x: 10, y: 4, size: 10, delay: 0.15 },
  { x: 22, y: -2, size: 7, delay: 0.2 },
  { x: -14, y: 14, size: 6, delay: 0.25 },
  { x: 4, y: 18, size: 9, delay: 0.3 },
];

const PAINT_SPLASH = [
  { x: -26, y: -6, color: '#f472b6' },
  { x: -6, y: -18, color: '#a855f7' },
  { x: 12, y: -4, color: '#60a5fa' },
  { x: 24, y: 6, color: '#fbbf24' },
];

const ParticleIcon = ({ type, size, color }: { type: Particle['type']; size: number; color: string }) => {
  switch (type) {
    case 'heart':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 0L14.59 9.41 24 12 14.59 14.59 12 24 9.41 14.59 0 12 9.41 9.41z" />
        </svg>
      );
    case 'bubble':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <circle cx="12" cy="12" r="10" fillOpacity="0.3" stroke={color} strokeWidth="2" />
          <circle cx="8" cy="8" r="2" fillOpacity="0.6" />
        </svg>
      );
    case 'lightning':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M7 2v11h3v9l7-12h-4l4-8z" />
        </svg>
      );
    default:
      return null;
  }
};

const AnimatedParticle = ({ particle, color }: { particle: Particle; color: string }) => {
  const endX = particle.x + Math.cos(particle.angle) * 80;
  const endY = particle.y - Math.abs(Math.sin(particle.angle)) * 100 - 50;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: particle.x,
        top: particle.y,
        zIndex: 1000,
      }}
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.5],
        x: endX - particle.x,
        y: endY - particle.y,
        rotate: particle.type === 'star' ? 360 : particle.type === 'sparkle' ? 180 : 0,
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <ParticleIcon type={particle.type} size={particle.size} color={color} />
    </motion.div>
  );
};

const GlowEffect = ({
  color,
  isActive,
  position,
}: {
  color: string;
  isActive: boolean;
  position: { x: number; y: number };
}) => (
  <AnimatePresence>
    {isActive && (
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 120,
          height: 120,
          left: position.x - 60,
          top: position.y - 60,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          zIndex: 999,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    )}
  </AnimatePresence>
);

let feedbackTrigger: FeedbackTrigger | null = null;

export function setFeedbackTrigger(trigger: FeedbackTrigger | null) {
  feedbackTrigger = trigger;
}

export function triggerInteractionFeedback(
  type: InteractionType,
  position?: { x: number; y: number },
  speech?: string | null,
) {
  feedbackTrigger?.(type, position, speech);
}

export default function InteractionFeedback({
  interactionType,
  isPlaying,
  onComplete,
  position = { x: 50, y: 50 },
}: InteractionFeedbackProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showGlow, setShowGlow] = useState(false);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const generateParticles = useCallback(() => {
    if (!interactionType) {
      return [];
    }

    const config = FEEDBACK_CONFIG[interactionType];
    const currentPosition = positionRef.current;
    const nextParticles: Particle[] = [];
    let id = 0;

    config.particles.forEach((particleConfig) => {
      for (let index = 0; index < particleConfig.count; index += 1) {
        const angle = (Math.PI * 2 * index) / particleConfig.count + Math.random() * 0.5;
        nextParticles.push({
          id: id++,
          type: particleConfig.type,
          x: currentPosition.x,
          y: currentPosition.y,
          size: particleConfig.size + Math.random() * 8,
          delay: Math.random() * 0.3,
          duration: 0.8 + Math.random() * 0.4,
          angle,
        });
      }
    });

    return nextParticles;
  }, [interactionType]);

  useEffect(() => {
    if (!isPlaying || !interactionType) {
      return;
    }

    setShowGlow(true);
    setParticles(generateParticles());

    const durationMs = FEEDBACK_DURATION_MS[interactionType] ?? 1200;
    const timer = setTimeout(() => {
      setShowGlow(false);
      setParticles([]);
      onComplete?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [generateParticles, interactionType, isPlaying, onComplete]);

  if (!interactionType || !isPlaying) {
    return null;
  }

  const config = FEEDBACK_CONFIG[interactionType];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <GlowEffect color={config.glowColor} isActive={showGlow} position={position} />

      <AnimatePresence>
        {particles.map((particle) => (
          <AnimatedParticle key={particle.id} particle={particle} color={config.color} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showGlow && interactionType === 'play' && (
          <motion.div
            className="absolute pointer-events-none"
            style={{ left: position.x - 12, top: position.y - 20, zIndex: 1002 }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: [0, -34, 0, -18, 0], opacity: [0, 1, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="h-6 w-6 rounded-full border-2 border-yellow-500 bg-yellow-300 shadow-lg" />
            <div className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-black/30 blur-sm" />
          </motion.div>
        )}

        {showGlow && interactionType === 'bath' && (
          <>
            {BATH_BUBBLES.map((bubble, index) => (
              <motion.div
                key={`bubble-${index}`}
                className="absolute rounded-full border border-slate-600/70 bg-sky-200/20"
                style={{
                  left: position.x + bubble.x,
                  top: position.y + bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  zIndex: 1002,
                }}
                initial={{ opacity: 0, scale: 0.4, y: 0 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.6, 1.1, 1.3], y: -32 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, delay: bubble.delay, ease: 'easeOut' }}
              />
            ))}
          </>
        )}

        {showGlow && interactionType === 'read' && (
          <motion.div
            className="absolute pointer-events-none"
            style={{ left: position.x - 20, top: position.y - 48, zIndex: 1002 }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: [0.9, 1.05, 1], y: [0, -6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="relative h-8 w-10">
              <div className="absolute left-0 top-0 h-7 w-5 rounded-sm border border-slate-500/60 bg-slate-600/90" />
              <motion.div
                className="absolute right-0 top-0 h-7 w-5 rounded-sm border border-slate-500/60 bg-slate-600/80"
                animate={{ rotate: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
                style={{ transformOrigin: 'left center' }}
              />
              <div className="absolute left-1/2 top-0 h-7 w-[2px] bg-slate-300/60" />
            </div>
          </motion.div>
        )}

        {showGlow && interactionType === 'paint' && (
          <>
            {PAINT_SPLASH.map((splash, index) => (
              <motion.div
                key={`paint-${index}`}
                className="absolute rounded-full"
                style={{
                  left: position.x + splash.x,
                  top: position.y + splash.y,
                  width: 10,
                  height: 10,
                  backgroundColor: splash.color,
                  zIndex: 1002,
                }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0.8], scale: [0.6, 1.4, 1.1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
              />
            ))}
          </>
        )}

        {showGlow && interactionType === 'train' && (
          <>
            {[0, 1].map((ring) => (
              <motion.div
                key={`ring-${ring}`}
                className="absolute rounded-full border-2"
                style={{
                  left: position.x - 18,
                  top: position.y - 18,
                  width: 36,
                  height: 36,
                  borderColor: config.color,
                  zIndex: 1002,
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.7, 0], scale: [0.6, 1.4, 1.8] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, delay: ring * 0.2, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlow && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: position.x + 24,
              top: position.y - 24,
              zIndex: 1002,
            }}
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            animate={{ opacity: 1, scale: [0.9, 1.05, 1], rotate: [0, 6, 0], y: [0, -6, 0] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 shadow-lg">
              <InteractionIcon type={interactionType} size={20} className="text-slate-100" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlow && !ACTION_FIRST_FEEDBACK.has(interactionType) && (
          <motion.div
            className="absolute pointer-events-none -translate-x-1/2"
            style={{
              left: position.x,
              top: position.y - 60,
              zIndex: 1001,
            }}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.94 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div
              className="rounded-full border px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md"
              style={{
                color: config.color,
                borderColor: config.glowColor,
                background: 'rgba(15, 23, 42, 0.78)',
                textShadow: `0 0 10px ${config.glowColor}, 0 1px 3px rgba(0,0,0,0.35)`,
              }}
            >
              {FEEDBACK_TEXT[interactionType] ?? '互动完成'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
