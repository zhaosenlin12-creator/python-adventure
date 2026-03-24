'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedCloudProps {
  x: number; // 百分比位置
  y: number;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}

/**
 * ☁️ 可交互的云朵组件
 * 点击后会有彩蛋效果（爱心、星星、彩虹等）
 */
export default function AnimatedCloud({ x, y, size = 'md', delay = 0 }: AnimatedCloudProps) {
  const [showEffect, setShowEffect] = useState(false);
  const [effectType, setEffectType] = useState<'hearts' | 'stars' | 'rainbow'>('hearts');
  
  const sizeMap = {
    sm: { cloud: 'text-3xl', duration: 8 },
    md: { cloud: 'text-5xl', duration: 10 },
    lg: { cloud: 'text-7xl', duration: 12 }
  };
  
  const effects = ['hearts', 'stars', 'rainbow'] as const;
  
  const handleClick = useCallback(() => {
    // 随机选择一个彩蛋效果
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    setEffectType(randomEffect);
    setShowEffect(true);
    
    // 2秒后隐藏效果
    setTimeout(() => setShowEffect(false), 2000);
  }, []);
  
  const config = sizeMap[size];
  
  return (
    <motion.div
      className="absolute cursor-pointer select-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, x: -50 }}
      animate={{ 
        opacity: [0.4, 0.7, 0.4],
        x: [0, 30, 0]
      }}
      transition={{
        duration: config.duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.2, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* 云朵SVG - 更精致的外观 */}
      <svg 
        viewBox="0 0 100 60" 
        className={`w-20 h-12 ${size === 'lg' ? 'w-32 h-20' : size === 'sm' ? 'w-12 h-8' : ''}`}
        style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
      >
        <defs>
          <linearGradient id={`cloudGrad-${x}-${y}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>
        <ellipse cx="30" cy="40" rx="25" ry="18" fill={`url(#cloudGrad-${x}-${y})`} />
        <ellipse cx="55" cy="35" rx="22" ry="20" fill={`url(#cloudGrad-${x}-${y})`} />
        <ellipse cx="75" cy="42" rx="18" ry="15" fill={`url(#cloudGrad-${x}-${y})`} />
        <ellipse cx="45" cy="25" rx="18" ry="15" fill={`url(#cloudGrad-${x}-${y})`} />
      </svg>
      
      {/* 彩蛋效果 */}
      <AnimatePresence>
        {showEffect && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            {effectType === 'hearts' && <HeartBurst />}
            {effectType === 'stars' && <StarBurst />}
            {effectType === 'rainbow' && <RainbowEffect />}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 爱心喷发效果
function HeartBurst() {
  const hearts = ['❤️', '💖', '💕', '💗', '💓'];
  return (
    <div className="relative">
      {hearts.map((heart, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          initial={{ opacity: 1, y: 0, x: 0, scale: 0 }}
          animate={{ 
            opacity: [1, 1, 0],
            y: -60 - Math.random() * 40,
            x: (Math.random() - 0.5) * 80,
            scale: [0, 1.2, 0.8],
            rotate: Math.random() * 360
          }}
          transition={{ 
            duration: 1.5,
            delay: i * 0.1,
            ease: 'easeOut'
          }}
        >
          {heart}
        </motion.span>
      ))}
    </div>
  );
}

// 星星喷发效果
function StarBurst() {
  const stars = ['⭐', '✨', '🌟', '💫', '⚡'];
  return (
    <div className="relative">
      {stars.map((star, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          initial={{ opacity: 1, y: 0, scale: 0 }}
          animate={{ 
            opacity: [1, 1, 0],
            y: -50 - Math.random() * 30,
            x: (Math.random() - 0.5) * 100,
            scale: [0, 1.5, 1],
            rotate: [0, 360]
          }}
          transition={{ 
            duration: 1.2,
            delay: i * 0.08,
            ease: 'easeOut'
          }}
        >
          {star}
        </motion.span>
      ))}
    </div>
  );
}

// 彩虹效果
function RainbowEffect() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: -30 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.5 }}
      className="text-4xl"
    >
      🌈
    </motion.div>
  );
}
