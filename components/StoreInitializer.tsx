"use client";

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSoundStore } from '@/store/soundStore';
// 引入logger以在生产环境禁用console.log
import '@/lib/logger';

/**
 * 初始化全局store，使Phaser场景可以访问
 */
export default function StoreInitializer() {
  useEffect(() => {
    // 将store暴露到window对象，供Phaser场景使用
    if (typeof window !== 'undefined') {
      (window as any).__gameStore = useGameStore;
      (window as any).__soundStore = useSoundStore;
      // 生产环境不输出日志
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[StoreInitializer] Stores initialized on window object');
      }
    }
  }, []);

  return null; // 不渲染任何内容
}
