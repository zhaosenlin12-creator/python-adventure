'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractionEffect } from '@/types/interaction';

interface EffectItem {
  id: number;
  icon: string;
  label: string;
  value: number;
  color: string;
}

interface InteractionEffectToastProps {
  effects: InteractionEffect | null;
  onComplete?: () => void;
}

/**
 * ✨ 互动效果飘升动画
 * 显示 +5 智力、+3 亲密度 等数字飘升效果
 */
export function InteractionEffectToast({ effects, onComplete }: InteractionEffectToastProps) {
  const [items, setItems] = useState<EffectItem[]>([]);
  
  useEffect(() => {
    if (!effects) return;
    
    const newItems: EffectItem[] = [];
    let id = Date.now();
    
    if (effects.happiness) {
      newItems.push({
        id: id++,
        icon: '😊',
        label: '快乐',
        value: effects.happiness,
        color: 'text-pink-400'
      });
    }
    
    if (effects.intimacy) {
      newItems.push({
        id: id++,
        icon: '❤️',
        label: '亲密度',
        value: effects.intimacy,
        color: 'text-red-400'
      });
    }
    
    if (effects.energy) {
      newItems.push({
        id: id++,
        icon: '⚡',
        label: '活力',
        value: effects.energy,
        color: 'text-yellow-400'
      });
    }
    
    if (effects.exp) {
      newItems.push({
        id: id++,
        icon: '⭐',
        label: 'EXP',
        value: effects.exp,
        color: 'text-blue-400'
      });
    }
    
    if (effects.attributes?.intelligence) {
      newItems.push({
        id: id++,
        icon: '🧠',
        label: '智力',
        value: effects.attributes.intelligence,
        color: 'text-purple-400'
      });
    }
    
    if (effects.attributes?.creativity) {
      newItems.push({
        id: id++,
        icon: '🎨',
        label: '创造力',
        value: effects.attributes.creativity,
        color: 'text-pink-400'
      });
    }
    
    if (effects.attributes?.persistence) {
      newItems.push({
        id: id++,
        icon: '💪',
        label: '毅力',
        value: effects.attributes.persistence,
        color: 'text-orange-400'
      });
    }
    
    setItems(newItems);
    
    // 2秒后清除并回调
    const timer = setTimeout(() => {
      setItems([]);
      onComplete?.();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [effects, onComplete]);
  
  if (items.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ 
              opacity: 0, 
              y: 0,
              scale: 0.5,
              x: (index - items.length / 2) * 80
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: -100,
              scale: [0.5, 1.2, 1, 0.8],
              x: (index - items.length / 2) * 100
            }}
            transition={{ 
              duration: 1.8,
              delay: index * 0.1,
              ease: 'easeOut'
            }}
            className={`
              absolute flex items-center gap-2 
              bg-slate-800 px-4 py-2 rounded-full
              border border-slate-700 shadow-2xl backdrop-blur-sm
              ${item.color}
            `}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="font-bold text-lg">+{item.value}</span>
            <span className="text-xs text-slate-500">{item.label}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// 全局事件触发器
let globalShowEffect: ((effects: InteractionEffect) => void) | null = null;

export function showInteractionEffect(effects: InteractionEffect) {
  globalShowEffect?.(effects);
}

/**
 * 全局互动效果Toast容器
 * 放在layout中，通过事件触发显示
 */
export default function InteractionEffectToastContainer() {
  const [currentEffects, setCurrentEffects] = useState<InteractionEffect | null>(null);
  
  useEffect(() => {
    globalShowEffect = (effects) => {
      setCurrentEffects(effects);
    };
    
    return () => {
      globalShowEffect = null;
    };
  }, []);
  
  return (
    <InteractionEffectToast 
      effects={currentEffects} 
      onComplete={() => setCurrentEffects(null)}
    />
  );
}
