'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';
import type { EvolutionStage } from '@/lib/petEvolution';

interface EvolutionAnimationProps {
  isOpen: boolean;
  petName: string;
  oldStage: EvolutionStage;
  newStage: EvolutionStage;
  petImageUrl: string;
  onComplete: () => void;
}

export function EvolutionAnimation({
  isOpen,
  petName,
  oldStage,
  newStage,
  petImageUrl,
  onComplete
}: EvolutionAnimationProps) {
  const [phase, setPhase] = useState<'glow' | 'transform' | 'reveal' | 'complete'>('glow');

  useEffect(() => {
    if (!isOpen) return;

    const glowTimer = setTimeout(() => setPhase('transform'), 2000);
    const transformTimer = setTimeout(() => setPhase('reveal'), 5000);
    const revealTimer = setTimeout(() => setPhase('complete'), 8000);
    const completeTimer = setTimeout(() => onComplete(), 10000);

    return () => {
      clearTimeout(glowTimer);
      clearTimeout(transformTimer);
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* 像素风格背景粒子 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-game-accent"
              style={{ imageRendering: 'pixelated' }}
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                opacity: 0
              }}
              animate={{
                y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* 主要内容 */}
        <div className="relative z-10 flex flex-col items-center">
          {/* 阶段1：发光 */}
          {phase === 'glow' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="pixel-panel p-6 bg-white/10 border-2 border-blue-500 backdrop-blur-sm rounded-xl">
                <img
                  src={petImageUrl}
                  alt={petName}
                  className="w-32 h-32 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              <motion.div
                  className="absolute inset-0 bg-blue-500/20 pointer-events-none"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-2xl text-white font-bold text-center"
              >
                {petName} 开始发光了！
              </motion.p>
            </motion.div>
          )}

          {/* 阶段2：变形 */}
          {phase === 'transform' && (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 0.8, 1.2, 1] }}
              transition={{ duration: 3 }}
              className="relative"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Sparkles className="w-24 h-24 text-blue-400" />
              </motion.div>

              <div className="w-32 h-32" />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 text-3xl text-white font-bold text-center"
              >
                进化中...
              </motion.p>
            </motion.div>
          )}

          {/* 阶段3：展示新形态 */}
          {phase === 'reveal' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="pixel-panel p-6 bg-white/10 border-2 border-blue-500 backdrop-blur-sm rounded-xl"
              >
                <img
                  src={petImageUrl}
                  alt={petName}
                  className="w-40 h-40 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>

              {/* 像素风格星星 */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * 45 * Math.PI) / 180) * 80,
                    y: Math.sin((i * 45 * Math.PI) / 180) * 80
                  }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                  className="absolute"
                >
                  <div className="w-4 h-4 bg-blue-500" style={{ imageRendering: 'pixelated' }} />
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
              >
                <p className="text-4xl text-white font-bold mb-2">
                  恭喜！
                </p>
                <p className="text-2xl text-blue-300 font-bold">
                  {petName} 进化成了 {newStage.name}！
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* 阶段4：奖励展示 */}
          {phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mb-6"
              >
                <Zap className="w-20 h-20 text-blue-400 mx-auto" />
              </motion.div>

              <div className="pixel-panel p-8 bg-white/10 border-2 border-blue-500 backdrop-blur-sm rounded-xl">
                <h3 className="text-2xl text-white font-bold mb-4">
                  进化奖励
                </h3>
                <div className="space-y-2 text-white/90">
                  <p className="text-lg">
                    💰 金币 +{newStage.rewards.coins}
                  </p>
                  <p className="text-lg">
                    ⭐ 全属性 +{newStage.rewards.attributeBonus}
                  </p>
                  {newStage.rewards.food.map((food) => (
                    <p key={food.id} className="text-lg">
                      🎁 {food.id} x{food.quantity}
                    </p>
                  ))}
                </div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-6 text-gray-400"
              >
                点击任意位置继续...
              </motion.p>
            </motion.div>
          )}
        </div>

        {/* 点击关闭 */}
        {phase === 'complete' && (
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={onComplete}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
