'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;
const toastListeners: ((message: string, type: 'success' | 'error') => void)[] = [];

/**
 * 显示Toast通知
 */
export function showFoodRewardToast(message: string, type: 'success' | 'error' = 'success') {
  toastListeners.forEach(listener => listener(message, type));
}

/**
 * 食物奖励Toast通知组件
 */
export default function FoodRewardToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  useEffect(() => {
    const listener = (message: string, type: 'success' | 'error') => {
      const id = toastId++;
      setToasts(prev => [...prev, { id, message, type }]);
      
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
            ${toast.type === 'success' 
              ? 'bg-blue-900/30 border-slate-600' 
              : 'bg-red-900/30 border-red-500/30'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {toast.type === 'success' ? '🎁' : '❌'}
            </div>
            <div className="flex-1 text-sm text-white">
              {toast.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
