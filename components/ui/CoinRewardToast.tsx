'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

interface CoinToastMessage {
  id: number;
  coins: number;
  source: string;
  type: 'reward' | 'spend';
}

let toastId = 0;
const toastListeners: ((coins: number, source: string, type: 'reward' | 'spend') => void)[] = [];

/**
 * 显示金币奖励Toast通知
 * @param coins 金币数量
 * @param source 来源描述
 * @param type 类型(reward=获得, spend=消费)
 */
export function showCoinRewardToast(
  coins: number, 
  source: string = '完成任务',
  type: 'reward' | 'spend' = 'reward'
) {
  toastListeners.forEach(listener => listener(coins, source, type));
}

/**
 * 金币奖励Toast通知组件
 */
export default function CoinRewardToast() {
  const [toasts, setToasts] = useState<CoinToastMessage[]>([]);
  
  useEffect(() => {
    const listener = (coins: number, source: string, type: 'reward' | 'spend') => {
      const id = toastId++;
      setToasts(prev => [...prev, { id, coins, source, type }]);
      
      // 3秒后自动移除
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    
    toastListeners.push(listener);
    
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-24 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pixel-panel p-4 min-w-[300px] max-w-[400px]
            animate-slide-in-right
            ${toast.type === 'reward' 
              ? 'bg-amber-900/30 border-amber-500/30' 
              : 'bg-slate-800 border-slate-600'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* 金币图标 */}
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${toast.type === 'reward' ? 'bg-amber-900/30' : 'bg-slate-700'}
            `}>
              <Icon 
                name="coin" 
                size={24}
              />
            </div>
            
            {/* 内容 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`
                  text-lg font-bold
                  ${toast.type === 'reward' ? 'text-amber-400' : 'text-slate-500'}
                `}>
                  {toast.type === 'reward' ? '+' : '-'}{toast.coins}
                </span>
                <Icon 
                  name="coin" 
                  size={16}
                />
              </div>
              <div className="text-xs text-slate-300">
                {toast.source}
              </div>
            </div>
            
            {/* 动画效果 */}
            {toast.type === 'reward' && (
              <div className="text-2xl animate-bounce">
                ✨
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
