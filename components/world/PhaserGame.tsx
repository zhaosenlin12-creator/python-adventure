"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useGameStore } from '@/store/gameStore';
import { gameConfig } from '@/lib/game/config';

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { skills } = useGameStore();

  useEffect(() => {
    if (typeof window === 'undefined' || gameRef.current || !parentRef.current) {
      return;
    }

    try {
      const config = {
        ...gameConfig,
        parent: parentRef.current,
      };

      gameRef.current = new Phaser.Game(config);
      if (process.env.NODE_ENV === 'development') {
        (window as Window & { __worldPhaserGame?: Phaser.Game | null }).__worldPhaserGame = gameRef.current;
      }

      if (gameRef.current.scene.keys.MainScene) {
        gameRef.current.scene.keys.MainScene.scene.restart({ skills });
      }

      window.setTimeout(() => {
        const canvas = document.querySelector('canvas');
        if (canvas instanceof HTMLCanvasElement) {
          canvas.focus();
        }
      }, 100);

      setIsLoading(false);
    } catch (error) {
      console.error('[PhaserGame] Failed to initialize:', error);
      setIsLoading(false);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (process.env.NODE_ENV === 'development') {
        (window as Window & { __worldPhaserGame?: Phaser.Game | null }).__worldPhaserGame = null;
      }
    };
  }, [skills]);

  return (
    <div className="relative h-screen w-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-pixel text-xl text-white">开放世界加载中...</div>
        </div>
      )}
      <div ref={parentRef} id="phaser-game" className="h-full w-full" style={{ width: '100%', height: '100vh' }} />
    </div>
  );
}
