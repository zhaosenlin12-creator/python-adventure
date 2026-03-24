'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'info';
}

let toastId = 0;
const toastListeners: ((message: string, type: 'error' | 'warning' | 'info') => void)[] = [];
const recentToasts = new Map<string, number>();
const TOAST_DEDUPE_WINDOW_MS = 1500;

/**
 * 显示错误Toast通知
 * @param message 错误消息
 * @param type 类型(error=错误, warning=警告, info=信息)
 */
export function showErrorToast(
  message: string, 
  type: 'error' | 'warning' | 'info' = 'error'
) {
  const key = `${type}:${message}`;
  const now = Date.now();
  const last = recentToasts.get(key);
  if (last && now - last < TOAST_DEDUPE_WINDOW_MS) {
    return;
  }
  recentToasts.set(key, now);
  // 清理过旧的记录，避免Map无限增长
  for (const [k, ts] of recentToasts.entries()) {
    if (now - ts > TOAST_DEDUPE_WINDOW_MS * 10) {
      recentToasts.delete(k);
    }
  }
  toastListeners.forEach(listener => listener(message, type));
}

/**
 * 错误Toast通知组件
 */
export default function ErrorToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  useEffect(() => {
    const listener = (message: string, type: 'error' | 'warning' | 'info') => {
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
  
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-24 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pixel-panel p-4 min-w-[300px] max-w-[400px]
            animate-slide-in-right
            ${toast.type === 'error' 
              ? 'bg-red-900/30 border-red-500/30' 
              : toast.type === 'warning'
              ? 'bg-amber-900/30 border-amber-500/30'
              : 'bg-slate-700 border-sky-300'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* 图标 */}
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              ${toast.type === 'error' 
                ? 'bg-red-900/30' 
                : toast.type === 'warning'
                ? 'bg-amber-900/30'
                : 'bg-sky-900/30'
              }
            `}>
              <AlertCircle 
              className={`w-6 h-6 ${
                  toast.type === 'error' 
                    ? 'text-red-500' 
                    : toast.type === 'warning'
                    ? 'text-amber-500'
                    : 'text-sky-500'
                }`}
              />
            </div>
            
            {/* 内容 */}
            <div className="flex-1 text-sm text-white">
              {toast.message}
            </div>
            
            {/* 关闭按钮 */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
