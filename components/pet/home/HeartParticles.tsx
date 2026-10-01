'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  kind: 'heart' | 'spark' | 'bubble';
  color: string;
  driftX: number;
  rise: number;
  rotate: number;
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

const PARTICLE_COLORS = ['#fb7185', '#f472b6', '#fbbf24', '#a7f3d0', '#7dd3fc'];

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
    const kindRoll = Math.random();
    
    const particle: Particle = {
      id,
      x: baseX + (Math.random() - 0.5) * 20,
      y: baseY,
      size: 16 + Math.random() * 16,
      duration: 2 + Math.random() * 1,
      kind: kindRoll < 0.58 ? 'heart' : kindRoll < 0.82 ? 'spark' : 'bubble',
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      driftX: (Math.random() - 0.5) * 60,
      rise: 50 + Math.random() * 50,
      rotate: (Math.random() - 0.5) * 40,
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
          <motion.svg
            key={particle.id}
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="absolute overflow-visible"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              filter: `drop-shadow(0 0 8px ${particle.color}99)`,
            }}
            initial={{ 
              opacity: 1, 
              scale: 0,
              y: 0
            }}
            animate={{ 
              opacity: [1, 1, 0],
              scale: [0, 1.2, 1],
              y: -100 - particle.rise,
              x: particle.driftX,
              rotate: particle.rotate
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: particle.duration,
              ease: 'easeOut'
            }}
          >
            {particle.kind === 'heart' && (
              <path
                d="M12 20.5S4.5 15.7 3.3 10.3C2.1 4.8 8.5 2.7 12 7.2c3.5-4.5 9.9-2.4 8.7 3.1C19.5 15.7 12 20.5 12 20.5Z"
                fill={particle.color}
              />
            )}
            {particle.kind === 'spark' && (
              <path
                d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"
                fill={particle.color}
              />
            )}
            {particle.kind === 'bubble' && (
              <>
                <circle cx="11" cy="12" r="6.5" fill={`${particle.color}55`} stroke={particle.color} strokeWidth="1.4" />
                <circle cx="8.5" cy="9.5" r="1.4" fill="white" opacity="0.8" />
              </>
            )}
          </motion.svg>
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
