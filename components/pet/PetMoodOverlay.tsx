'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PetStatus } from '@/types/pet';

interface PetMoodOverlayProps {
  status: PetStatus;
  hunger?: number;
  happiness?: number;
  isInteracting?: boolean;
  interactionType?: string | null;
}

// 状态对应的表情配置
const MOOD_CONFIG: Record<PetStatus, {
  emoji: string;
  bubbleEmojis: string[];
  color: string;
  animation: 'bounce' | 'pulse' | 'shake' | 'spin' | 'float';
}> = {
  normal: {
    emoji: '😊',
    bubbleEmojis: ['✨', '💫', '🌟'],
    color: '#4ADE80',
    animation: 'float'
  },
  tired: {
    emoji: '😴',
    bubbleEmojis: ['💤', '😪', 'Zzz'],
    color: '#94A3B8',
    animation: 'pulse'
  },
  coma: {
    emoji: '😵',
    bubbleEmojis: ['💫', '⚡', '❗'],
    color: '#EF4444',
    animation: 'shake'
  },
  egg: {
    emoji: '🥚',
    bubbleEmojis: ['✨', '🌟', '💫'],
    color: '#A78BFA',
    animation: 'pulse'
  }
};

// 互动时的特殊表情
const INTERACTION_MOODS: Record<string, { emoji: string; bubbles: string[] }> = {
  pat: { emoji: '🥰', bubbles: ['❤️', '💕', '💗'] },
  play: { emoji: '😆', bubbles: ['⭐', '🎮', '🎉'] },
  talk: { emoji: '😊', bubbles: ['💬', '💭', '❤️'] },
  train: { emoji: '💪', bubbles: ['⚡', '🔥', '💥'] },
  read: { emoji: '🤓', bubbles: ['📖', '✨', '🧠'] },
  paint: { emoji: '🎨', bubbles: ['🖌️', '✨', '🌈'] },
  chat: { emoji: '😄', bubbles: ['💬', '✨', '💛'] },
  bath: { emoji: '🫧', bubbles: ['🚿', '✨', '💙'] },
  feed: { emoji: '😋', bubbles: ['🍖', '😊', '💕'] }
};

// 浮动气泡动画
const FloatingBubble = ({ emoji, delay, index }: { emoji: string; delay: number; index: number }) => {
  const angle = (index * 60) + Math.random() * 30;
  const distance = 40 + Math.random() * 30;
  const endX = Math.cos(angle * Math.PI / 180) * distance;
  const endY = -Math.abs(Math.sin(angle * Math.PI / 180)) * distance - 30;
  
  return (
    <motion.span
      className="absolute text-lg pointer-events-none"
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.5],
        x: endX,
        y: endY
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: 'easeOut'
      }}
    >
      {emoji}
    </motion.span>
  );
};

/**
 * 🎭 宠物心情叠加层
 * 显示宠物当前状态的表情和气泡动画
 */
export default function PetMoodOverlay({
  status,
  hunger = 100,
  happiness = 100,
  isInteracting = false,
  interactionType = null
}: PetMoodOverlayProps) {
  const [showBubbles, setShowBubbles] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);
  
  // 获取当前心情配置
  const getMoodConfig = () => {
    if (isInteracting && interactionType && INTERACTION_MOODS[interactionType]) {
      return {
        emoji: INTERACTION_MOODS[interactionType].emoji,
        bubbles: INTERACTION_MOODS[interactionType].bubbles
      };
    }
    
    const moodConfig = MOOD_CONFIG[status];
    return {
      emoji: moodConfig.emoji,
      bubbles: moodConfig.bubbleEmojis
    };
  };
  
  const { emoji, bubbles } = getMoodConfig();
  const moodConfig = MOOD_CONFIG[status];
  
  // 互动时触发气泡动画
  useEffect(() => {
    if (isInteracting) {
      setShowBubbles(true);
      setBubbleKey(prev => prev + 1);
      
      const timer = setTimeout(() => {
        setShowBubbles(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isInteracting, interactionType]);
  
  // 定期显示气泡（非互动状态时）
  useEffect(() => {
    if (!isInteracting && status === 'normal') {
      const interval = setInterval(() => {
        setShowBubbles(true);
        setBubbleKey(prev => prev + 1);
        setTimeout(() => setShowBubbles(false), 2000);
      }, 8000 + Math.random() * 4000);
      
      return () => clearInterval(interval);
    }
  }, [status, isInteracting]);
  
  // 动画变体
  const animationVariants = {
    bounce: {
      y: [0, -8, 0],
      transition: { repeat: Infinity, duration: 0.6 }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: { repeat: Infinity, duration: 2 }
    },
    shake: {
      x: [-2, 2, -2, 2, 0],
      transition: { repeat: Infinity, duration: 0.5, repeatDelay: 2 }
    },
    spin: {
      rotate: [0, 360],
      transition: { repeat: Infinity, duration: 3 }
    },
    float: {
      y: [0, -4, 0],
      transition: { repeat: Infinity, duration: 3 }
    }
  };
  
  return (
    <div className="absolute -top-2 -right-2 pointer-events-none z-10">
      {/* 主表情 */}
      <motion.div
        className="relative text-2xl"
        animate={animationVariants[moodConfig.animation]}
        style={{
          filter: `drop-shadow(0 2px 4px ${moodConfig.color}40)`
        }}
      >
        {emoji}
        
        {/* 气泡动画 */}
        <AnimatePresence>
          {showBubbles && (
            <div className="absolute inset-0 flex items-center justify-center">
              {bubbles.map((bubble, index) => (
                <FloatingBubble
                  key={`${bubbleKey}-${index}`}
                  emoji={bubble}
                  delay={index * 0.15}
                  index={index}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* 状态指示器 - 饥饿或不开心时显示 */}
      {hunger < 30 && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          🍖❓
        </motion.div>
      )}
      
      {happiness < 30 && !isInteracting && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-sm"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          💔
        </motion.div>
      )}
    </div>
  );
}
