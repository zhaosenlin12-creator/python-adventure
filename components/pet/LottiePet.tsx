'use client';

/**
 * 🎬 LottiePet - 宠物 Lottie 动画渲染组件
 * 
 * 功能：
 * - 动态加载 Lottie JSON 动画
 * - 支持 12 种动画状态平滑切换
 * - 加载失败时降级为 emoji 图标
 * - 支持进化阶段尺寸适配
 * - 带骨架屏加载状态
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { PetType, PetMood, PET_CONFIGS } from '@/types/pet';
import { getPetConfig } from '@/lib/config/petAssets';
import { motion, AnimatePresence } from 'framer-motion';

interface LottiePetProps {
  petType: PetType;
  animationState: PetMood;
  size?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  /** 进化阶段 (0-5)，影响视觉效果 */
  evolutionStage?: number;
  /** 是否启用悬浮交互效果 */
  interactive?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

// 🔒 安全白名单 - 防止路径遍历攻击
const VALID_PET_TYPES = new Set([
  'egg', 'code_kitty', 'algo_bunny', 'shiba_debugger',
  'bit_bot', 'data_sprite', 'ava_ai', 'code_dragon',
]);
const VALID_ANIMATION_STATES = new Set([
  'normal', 'happy', 'excited', 'sad', 'tired', 'curious',
  'eating', 'coma', 'playing', 'sleeping', 'walking', 'question',
]);

// 动画数据缓存（带上限，避免内存泄漏）
const MAX_CACHE_SIZE = 50;
const animationCache = new Map<string, object>();
const cacheOrder: string[] = []; // LRU 顺序追踪

// 加载中的 Promise 缓存（避免并发重复请求）
const loadingPromises = new Map<string, Promise<object | null>>();

/**
 * 基本 Lottie JSON 结构校验
 */
function isValidLottieData(data: unknown): data is object {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  // Lottie JSON 必须包含版本号和帧率
  return typeof d.v === 'string' && typeof d.fr === 'number' && typeof d.w === 'number' && typeof d.h === 'number';
}

/**
 * 加载 Lottie 动画数据（带缓存 + 白名单校验 + 结构验证）
 */
async function loadAnimation(petType: string, state: string): Promise<object | null> {
  // 🔒 白名单校验 - 防止路径遍历 (../)
  if (!VALID_PET_TYPES.has(petType) || !VALID_ANIMATION_STATES.has(state)) {
    console.warn(`[LottiePet] Invalid petType/state: ${petType.slice(0, 30)}/${state.slice(0, 20)}`);
    return null;
  }

  const cacheKey = `${petType}/${state}`;

  // 命中缓存 - 更新 LRU 顺序
  if (animationCache.has(cacheKey)) {
    const idx = cacheOrder.indexOf(cacheKey);
    if (idx > -1) { cacheOrder.splice(idx, 1); cacheOrder.push(cacheKey); }
    return animationCache.get(cacheKey)!;
  }

  // 已有进行中的请求
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`/assets/pets/lottie/${petType}/${state}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // 🔒 结构校验 - 防止恶意/损坏 JSON 导致渲染崩溃
      if (!isValidLottieData(data)) {
        console.warn(`[LottiePet] Invalid Lottie structure: ${cacheKey}`);
        return null;
      }

      // LRU 淘汰策略
      if (animationCache.size >= MAX_CACHE_SIZE) {
        const oldest = cacheOrder.shift();
        if (oldest) animationCache.delete(oldest);
      }
      animationCache.set(cacheKey, data);
      cacheOrder.push(cacheKey);
      return data;
    } catch (err) {
      console.warn(`[LottiePet] Failed to load ${cacheKey}:`, err);
      return null;
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, promise);
  return promise;
}

/**
 * 进化阶段视觉效果配置
 */
function getEvolutionVisuals(stage: number) {
  switch (stage) {
    case 0: return { glow: false, particles: false, aura: 'none' as const };
    case 1: return { glow: false, particles: false, aura: 'none' as const };
    case 2: return { glow: false, particles: false, aura: 'none' as const };
    case 3: return { glow: true, particles: false, aura: 'subtle' as const };
    case 4: return { glow: true, particles: true, aura: 'strong' as const };
    case 5: return { glow: true, particles: true, aura: 'legendary' as const };
    default: return { glow: false, particles: false, aura: 'none' as const };
  }
}

export default function LottiePet({
  petType,
  animationState,
  size = 64,
  loop = true,
  autoplay = true,
  className = '',
  evolutionStage = 1,
  interactive = false,
  onClick,
}: LottiePetProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const config = PET_CONFIGS[petType];
  const visuals = useMemo(() => getEvolutionVisuals(evolutionStage), [evolutionStage]);

  // 加载动画
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    loadAnimation(petType, animationState).then(data => {
      if (cancelled) return;
      if (data) {
        setAnimationData(data);
        setHasError(false);
      } else {
        // 尝试降级到 normal 状态
        if (animationState !== 'normal') {
          loadAnimation(petType, 'normal').then(fallback => {
            if (cancelled) return;
            if (fallback) {
              setAnimationData(fallback);
              setHasError(false);
            } else {
              setHasError(true);
            }
            setIsLoading(false);
          });
          return;
        }
        setHasError(true);
      }
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [petType, animationState]);

  // 当动画数据变化时重新播放
  useEffect(() => {
    if (animationData && lottieRef.current && autoplay) {
      lottieRef.current.goToAndPlay(0);
    }
  }, [animationData, autoplay]);

  // 骨架屏
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <motion.div
          className="rounded-full bg-slate-700/50"
          style={{ width: size * 0.8, height: size * 0.8 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
    );
  }

  // 降级：优先使用 SVG 预览图，再降级为 emoji
  if (hasError || !animationData) {
    const assetCfg = getPetConfig(petType);
    if (assetCfg?.previewSvg) {
      return (
        <motion.div
          className={`flex items-center justify-center ${className}`}
          style={{ width: size, height: size }}
          whileHover={interactive ? { scale: 1.15 } : undefined}
          whileTap={interactive ? { scale: 0.9 } : undefined}
          onClick={onClick}
        >
          <img
            src={assetCfg.previewSvg}
            alt={config?.icon || petType}
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </motion.div>
      );
    }
    return (
      <motion.div
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        whileHover={interactive ? { scale: 1.15 } : undefined}
        whileTap={interactive ? { scale: 0.9 } : undefined}
        onClick={onClick}
      >
        <span style={{ fontSize: size * 0.7 }} className="drop-shadow-2xl">
          {config?.icon || '❓'}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      whileHover={interactive ? { scale: 1.1 } : undefined}
      whileTap={interactive ? { scale: 0.9 } : undefined}
      onClick={onClick}
    >
      {/* 进化光环效果 */}
      {visuals.aura !== 'none' && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: visuals.aura === 'legendary'
              ? `radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0) 70%)`
              : visuals.aura === 'strong'
                ? `radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0) 60%)`
                : `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 50%)`,
          }}
          animate={visuals.aura === 'legendary' ? {
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.9, 0.6],
          } : visuals.aura === 'strong' ? {
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4],
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* 传说形态粒子环绕 */}
      {visuals.particles && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: evolutionStage >= 5
                  ? `hsl(${i * 60}, 100%, 70%)`
                  : 'rgba(99,102,241,0.6)',
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: Math.cos((i * 60 * Math.PI) / 180) * (size * 0.6),
                y: Math.sin((i * 60 * Math.PI) / 180) * (size * 0.6),
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Lottie 动画主体 */}
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{
          width: size,
          height: size,
          filter: visuals.glow
            ? `drop-shadow(0 0 ${evolutionStage >= 5 ? 12 : 6}px rgba(${
                evolutionStage >= 5 ? '245,158,11' : '99,102,241'
              },0.5))`
            : undefined,
        }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice',
        }}
      />
    </motion.div>
  );
}

/**
 * 预加载指定宠物的常用动画
 */
export function preloadPetAnimations(petType: string, states: string[] = ['normal', 'happy', 'sad']) {
  states.forEach(state => loadAnimation(petType, state));
}

/**
 * 清理动画缓存
 */
export function clearAnimationCache() {
  animationCache.clear();
}
