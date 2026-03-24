'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles, Zap } from 'lucide-react';
import { playSound } from '@/lib/utils/soundManager';

interface HatchAnimationProps {
  isOpen: boolean;
  onComplete: () => void;
  revealIcon?: string;
}

export function HatchAnimation({ isOpen, onComplete, revealIcon }: HatchAnimationProps) {
  const [phase, setPhase] = useState<'shake' | 'crack' | 'break' | 'hatch' | 'complete'>('shake');
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // 重置阶段
    setPhase('shake');
    completedRef.current = false;

    const shakeTimer = setTimeout(() => setPhase('crack'), 2500);
    const crackTimer = setTimeout(() => setPhase('break'), 4500);
    const breakTimer = setTimeout(() => setPhase('hatch'), 6000);
    const hatchTimer = setTimeout(() => setPhase('complete'), 8000);
    const completeTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 9500);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(crackTimer);
      clearTimeout(breakTimer);
      clearTimeout(hatchTimer);
      clearTimeout(completeTimer);
    };
  }, [isOpen, onComplete]);
  useEffect(() => {
    if (!isOpen) return;
    if (phase === 'crack' || phase === 'break' || phase === 'hatch') {
      playSound('evolution_shine');
    }
    if (phase === 'complete') {
      playSound('level_complete');
    }
  }, [phase, isOpen]);

  if (!isOpen) return null;
  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900/60"
      >
        {/* 跳过按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 px-4 py-2 bg-black/40 border border-white/20 text-white text-sm rounded-full hover:bg-black/60 transition"
        >
          跳过动画
        </button>

        {/* 像素风格星星粒子 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                opacity: 0
              }}
              animate={{
                y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </motion.div>
          ))}
        </div>

        {/* 主要内容 */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* 阶段1：蛋摇晃 */}
          {phase === 'shake' && (
            <motion.div
              animate={{
                rotate: [-8, 8, -8, 8, -5, 5, 0],
                scale: [1, 1.05, 1, 1.05, 1.02, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.2
              }}
              className="relative"
            >
              <img
                src="/assets/pets/egg.svg"
                alt="神秘的蛋"
                className="w-32 h-40 object-contain"
              />
              <motion.div
                className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              
              {/* 震动波纹 */}
              <motion.div
                className="absolute inset-0 border-4 border-yellow-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 2],
                  opacity: [0.8, 0.4, 0]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          )}

          {/* 阶段2：蛋出现裂纹 */}
          {phase === 'crack' && (
            <motion.div className="relative">
              <motion.div
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.15, 1.1, 1.15, 1.1],
                  rotate: [-3, 3, -3, 3, 0]
                }}
                transition={{ duration: 0.4, repeat: 4 }}
                className="relative"
              >
                <img
                  src="/assets/pets/egg.svg"
                  alt="神秘的蛋"
                  className="w-32 h-40 object-contain"
                />
                
                {/* 裂纹闪电效果 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.8, 1, 0.8] }}
                  transition={{ duration: 0.3, repeat: 5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Zap className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                </motion.div>
                
                {/* 多条裂纹线 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ delay: i * 0.2, duration: 0.3 }}
                    className="absolute top-1/2 left-1/2 w-1 h-20 bg-yellow-600"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                      transformOrigin: 'center'
                    }}
                  />
                ))}
              </motion.div>
              
              {/* 强烈光芒效果 */}
              <motion.div
                className="absolute inset-0 bg-yellow-300/60 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.8, 1.5],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </motion.div>
          )}

          {/* 阶段3：蛋壳破裂 */}
          {phase === 'break' && (
            <motion.div className="relative">
              {/* 蛋壳碎片飞散 */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45) * (Math.PI / 180);
                const distance = 100 + Math.random() * 50;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                    animate={{ 
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance,
                      rotate: Math.random() * 360,
                      opacity: 0,
                      scale: 0.5
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute text-5xl"
                    style={{ left: '50%', top: '50%' }}
                  >
                    🥚
                  </motion.div>
                );
              })}

              {/* 中心爆发光效 */}
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute inset-0 bg-gradient-radial from-yellow-200 via-yellow-400 to-transparent rounded-full blur-2xl"
              />
              
              {/* 光芒射线 */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{ scaleX: 3, opacity: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  className="absolute top-1/2 left-1/2 w-40 h-2 bg-gradient-to-r from-yellow-300 to-transparent"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                    transformOrigin: 'left center'
                  }}
                />
              ))}

              {/* 闪光星星 */}
              {[...Array(20)].map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 100;
                return (
                  <motion.div
                    key={`star-${i}`}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0, 
                      opacity: 0 
                    }}
                    animate={{ 
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance,
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      delay: i * 0.03,
                      ease: 'easeOut'
                    }}
                    className="absolute"
                    style={{ left: '50%', top: '50%' }}
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* 阶段4：宠物出现 */}
          {phase === 'hatch' && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ 
                scale: 1,
                opacity: 1,
                y: 0
              }}
              transition={{ 
                type: 'spring',
                stiffness: 200,
                damping: 15
              }}
              className="relative"
            >
              {/* 神秘光环 */}
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
                className="absolute inset-0 bg-gradient-conic from-amber-500 via-yellow-500 to-orange-500 rounded-full blur-2xl opacity-60"
              />

              {/* 问号（代表未知的宠物） */}
              <motion.div
                animate={{ 
                  scale: [1, 1.15, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
              >
                {revealIcon && revealIcon.startsWith('/') ? (
                  <img
                    src={revealIcon}
                    alt="即将孵化"
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <HelpCircle className="w-28 h-28 text-slate-200" />
                )}
              </motion.div>
              
              {/* 环绕粒子 */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: 360,
                    scale: [1, 1.3, 1]
                  }}
                  transition={{
                    rotate: { duration: 4, repeat: Infinity, ease: 'linear', delay: i * 0.5 },
                    scale: { duration: 1, repeat: Infinity, delay: i * 0.2 }
                  }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-80px)`
                  }}
                >
                  <Sparkles className="w-6 h-6 text-blue-300" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* 阶段5：完成 */}
          {phase === 'complete' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="mb-6"
              >
                <Sparkles className="w-24 h-24 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.6)]" />
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-yellow-300 pixel-text-shadow mb-4"
              >
                孵化成功！
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-blue-200 pixel-text-shadow"
              >
                你的代码伙伴即将诞生...
              </motion.div>
            </motion.div>
          )}

          {/* 提示文字 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-4"
          >
            {phase === 'shake' && (
              <motion.p 
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-2xl text-purple-200 pixel-text-shadow font-bold"
              >
                蛋开始剧烈摇晃了...
              </motion.p>
            )}
            {phase === 'crack' && (
              <motion.p 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-2xl text-yellow-200 pixel-text-shadow font-bold"
              >
                咔嚓！蛋壳出现了裂纹！
              </motion.p>
            )}
            {phase === 'break' && (
              <motion.p 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-2xl text-orange-200 pixel-text-shadow font-bold"
              >
                轰！蛋壳破碎了！
              </motion.p>
            )}
            {phase === 'hatch' && (
              <motion.p 
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-2xl text-green-200 pixel-text-shadow font-bold"
              >
                有什么东西要出来了！
              </motion.p>
            )}
            {phase === 'complete' && (
              <motion.p 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-xl text-blue-200 pixel-text-shadow"
              >
                选择你的代码伙伴吧！
              </motion.p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
