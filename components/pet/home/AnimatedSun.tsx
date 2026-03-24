'use client';

import { motion } from 'framer-motion';

interface AnimatedSunProps {
  x?: number;
  y?: number;
  size?: number;
}

/**
 * ☀️ SVG动画太阳组件
 * 温暖治愈的太阳动画
 */
export default function AnimatedSun({ x = 85, y = 8, size = 80 }: AnimatedSunProps) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ right: `${100 - x}%`, top: `${y}%` }}
      animate={{ 
        scale: [1, 1.05, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
        style={{ filter: 'drop-shadow(0 0 20px rgba(255,200,0,0.5))' }}
      >
        <defs>
          {/* 太阳渐变 */}
          <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF7AE" />
            <stop offset="50%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#FFB347" />
          </radialGradient>
          
          {/* 光晕效果 */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFE066" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* 外层光晕 */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#sunGlow)"
          animate={{ 
            r: [45, 48, 45],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* 太阳光芒 */}
        {[...Array(12)].map((_, i) => (
          <motion.line
            key={i}
            x1="50"
            y1="50"
            x2="50"
            y2="5"
            stroke="#FFD93D"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 30} 50 50)`}
            animate={{
              y2: [5, 8, 5],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
        
        {/* 太阳本体 */}
        <circle
          cx="50"
          cy="50"
          r="25"
          fill="url(#sunGradient)"
        />
        
        {/* 太阳表情 - 眯眯眼 */}
        <motion.g
          animate={{ y: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* 左眼 */}
          <path
            d="M 40 47 Q 43 44 46 47"
            stroke="#F97316"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 右眼 */}
          <path
            d="M 54 47 Q 57 44 60 47"
            stroke="#F97316"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 微笑 */}
          <path
            d="M 42 55 Q 50 62 58 55"
            stroke="#F97316"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 腮红 */}
          <circle cx="38" cy="54" r="4" fill="#FFAB91" opacity="0.6" />
          <circle cx="62" cy="54" r="4" fill="#FFAB91" opacity="0.6" />
        </motion.g>
      </svg>
    </motion.div>
  );
}
