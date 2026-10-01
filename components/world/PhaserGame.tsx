"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from '@/lib/game/config';
import { installPhaserAudioGuard } from '@/lib/game/phaserAudioGuard';
import { destroyPhaserGameSafely } from '@/lib/game/phaserLifecycle';

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || gameRef.current || !parentRef.current) {
      return;
    }

    try {
      installPhaserAudioGuard();
      const shouldExposeDebugHandle =
        typeof window !== 'undefined' &&
        Boolean((window as Window & { __enableWorldDebug?: boolean }).__enableWorldDebug);
      const config = {
        ...gameConfig,
        parent: parentRef.current,
      };

      gameRef.current = new Phaser.Game(config);
      if (process.env.NODE_ENV === 'development' || shouldExposeDebugHandle) {
        (window as Window & { __worldPhaserGame?: Phaser.Game | null }).__worldPhaserGame = gameRef.current;
      }

      window.setTimeout(() => {
        const canvas = parentRef.current?.querySelector('canvas');
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
      const game = gameRef.current;
      destroyPhaserGameSafely(game, parentRef.current);
      if (game && gameRef.current === game) {
        gameRef.current = null;
      }
      if (
        process.env.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' &&
          Boolean((window as Window & { __enableWorldDebug?: boolean }).__enableWorldDebug))
      ) {
        (window as Window & { __worldPhaserGame?: Phaser.Game | null }).__worldPhaserGame = null;
      }
    };
  }, []);

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
