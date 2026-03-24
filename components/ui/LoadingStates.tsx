'use client';

/**
 * 🔄 加载状态组件集合
 * 提供多种优雅的加载动画
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============ 游戏主题加载器 ============

/**
 * 像素风格加载动画
 */
export function PixelLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 bg-blue-500"
            animate={{
              y: [0, -12, 0],
              backgroundColor: ['#3B82F6', '#8B5CF6', '#3B82F6'],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
            }}
            style={{ imageRendering: 'pixelated' }}
          />
        ))}
      </div>
      <span className="text-gray-400 text-sm font-mono">{text}</span>
    </div>
  );
}

/**
 * 代码风格加载动画
 */
export function CodeLoader({ text = '编译中...' }: { text?: string }) {
  const codeLines = ['def load():', '  while True:', '    progress += 1', '    yield data'];
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
        {codeLines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3 }}
            className="text-green-400"
          >
            <span className="text-gray-500">{i + 1}</span>
            <span className="mx-2">|</span>
            {line}
            {i === codeLines.length - 1 && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-white"
              >
                █
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
      <span className="text-gray-400 text-sm">{text}</span>
    </div>
  );
}

/**
 * 游戏角色跑步加载动画
 */
export function RunnerLoader({ text = '冒险中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-16">
        {/* Ground */}
        <div className="absolute bottom-0 w-full h-1 bg-gray-700 rounded-full" />
        
        {/* Runner */}
        <motion.div
          className="absolute bottom-1 text-3xl"
          animate={{
            x: [0, 100, 0],
            scaleX: [1, 1, -1, -1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          🏃
        </motion.div>
        
        {/* Dust particles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-2 w-2 h-2 bg-gray-500 rounded-full opacity-50"
            animate={{
              x: [50, 30 - i * 10],
              y: [0, -5, 0],
              opacity: [0.5, 0],
              scale: [1, 0.5],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className="text-gray-400 text-sm">{text}</span>
    </div>
  );
}

// ============ 通用加载器 ============

/**
 * 脉冲加载器
 */
export function PulseLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-blue-500/30`}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className={`absolute ${sizeClasses[size]} rounded-full bg-blue-500`}
        animate={{ scale: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: '50%', height: '50%' }}
      />
    </div>
  );
}

/**
 * 旋转加载器
 */
export function SpinLoader({ 
  size = 'md',
  color = 'blue'
}: { 
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'yellow';
}) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  };
  
  const colorClasses = {
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    yellow: 'border-yellow-500',
  };
  
  return (
    <motion.div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/**
 * 点状加载器
 */
export function DotsLoader({ color = 'white' }: { color?: string }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full bg-${color}`}
          animate={{
            y: [0, -6, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
          style={{ backgroundColor: color === 'white' ? 'white' : undefined }}
        />
      ))}
    </div>
  );
}

// ============ 全屏加载器 ============

/**
 * 全屏加载覆盖层
 */
export function FullScreenLoader({
  isLoading,
  text = '加载中...',
  variant = 'pixel',
}: {
  isLoading: boolean;
  text?: string;
  variant?: 'pixel' | 'code' | 'runner' | 'spin';
}) {
  const LoaderComponent = {
    pixel: PixelLoader,
    code: CodeLoader,
    runner: RunnerLoader,
    spin: () => (
      <div className="flex flex-col items-center gap-4">
        <SpinLoader size="lg" />
        <span className="text-gray-400">{text}</span>
      </div>
    ),
  }[variant];
  
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm"
        >
          <LoaderComponent text={text} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 进度条加载器
 */
export function ProgressLoader({
  progress,
  text,
  showPercent = true,
}: {
  progress: number;
  text?: string;
  showPercent?: boolean;
}) {
  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-between text-sm mb-2">
        {text && <span className="text-gray-400">{text}</span>}
        {showPercent && <span className="text-white font-mono">{Math.round(progress)}%</span>}
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// ============ 骨架屏 ============

/**
 * 骨架屏占位
 */
export function Skeleton({
  className = '',
  variant = 'rect',
}: {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}) {
  const baseClasses = 'bg-gray-700 animate-pulse';
  
  const variantClasses = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/4" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={`w-${i === lines - 1 ? '3/4' : 'full'}`} />
      ))}
    </div>
  );
}

/**
 * 关卡卡片骨架屏
 */
export function LevelCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <Skeleton className="w-full h-32" />
      <div className="p-3 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <div className="flex gap-2">
          <Skeleton variant="rect" className="w-16 h-6" />
          <Skeleton variant="rect" className="w-12 h-6" />
        </div>
      </div>
    </div>
  );
}

// ============ 内联加载器 ============

/**
 * 按钮内加载状态
 */
export function ButtonLoader({ text = '处理中' }: { text?: string }) {
  return (
    <span className="flex items-center gap-2">
      <SpinLoader size="sm" color="blue" />
      <span>{text}</span>
    </span>
  );
}
