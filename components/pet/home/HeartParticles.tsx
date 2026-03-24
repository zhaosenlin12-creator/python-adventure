'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  duration: number;
}

interface HeartParticlesProps {
  // 触发位置（百分比）
  triggerX?: number;
  triggerY?: number;
  // 是否持续产生粒子
  continuous?: boolean;
  // 触发粒子的事件
  trigger?: boolean;
}

const HEART_EMOJIS = ['❤️', '💖', '💕', '💗', '💓', '💝', '🩷', '🧡', '💛'];

/**
 * 💕 心形粒子效果组件
 * 点击宠物或互动时产生漂浮的爱心
 */
export default function HeartParticles({ 
  triggerX = 50, 
  triggerY = 50, 
  continuous = false,
  trigger = false 
}: HeartParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idCounterRef = useRef(0);
  const lastTriggerRef = useRef(false);
  
  // 生成单个粒子
  const createParticle = useCallback((baseX: number, baseY: number) => {
    const id = idCounterRef.current++;
    
    const particle: Particle = {
      id,
      x: baseX + (Math.random() - 0.5) * 20,
      y: baseY,
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
      size: 16 + Math.random() * 16,
      duration: 2 + Math.random() * 1
    };
    
    setParticles(prev => [...prev, particle]);
    
    // 粒子动画结束后移除
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, particle.duration * 1000);
  }, []);
  
  // 触发一波粒子
  const burstParticles = useCallback((count: number = 5) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        createParticle(triggerX, triggerY);
      }, i * 100);
    }
  }, [createParticle, triggerX, triggerY]);
  
  // 外部触发
  useEffect(() => {
    const shouldBurst = trigger && !lastTriggerRef.current;
    lastTriggerRef.current = trigger;
    if (shouldBurst) {
      burstParticles(8);
    }
  }, [trigger, burstParticles]);
  
  // 持续模式
  useEffect(() => {
    if (!continuous) return;
    
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        createParticle(triggerX, triggerY);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [continuous, createParticle, triggerX, triggerY]);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              fontSize: particle.size
            }}
            initial={{ 
              opacity: 1, 
              scale: 0,
              y: 0
            }}
            animate={{ 
              opacity: [1, 1, 0],
              scale: [0, 1.2, 1],
              y: -100 - Math.random() * 50,
              x: (Math.random() - 0.5) * 60,
              rotate: (Math.random() - 0.5) * 40
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: particle.duration,
              ease: 'easeOut'
            }}
          >
            {particle.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 使用Hook触发心形粒子
 */
export function useHeartParticles() {
  const [trigger, setTrigger] = useState(false);
  
  const burst = useCallback(() => {
    setTrigger(true);
    setTimeout(() => setTrigger(false), 100);
  }, []);
  
  return { trigger, burst };
}
