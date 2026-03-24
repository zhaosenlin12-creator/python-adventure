"use client";

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function PhaserGame() {
    const gameRef = useRef<any>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { skills } = useGameStore();

    useEffect(() => {
        if (typeof window === 'undefined' || gameRef.current) return;

        let mounted = true;

        const initGame = async () => {
            try {
                // Dynamically import Phaser and config only on client
                const Phaser = await import('phaser');
                const { gameConfig } = await import('@/lib/game/config');

                if (!mounted) return;

                // Create game instance
                const config = {
                    ...gameConfig,
                    parent: parentRef.current || undefined,
                };

                gameRef.current = new Phaser.Game(config);
                
                // 传递玩家技能到MainScene
                if (gameRef.current.scene.keys.MainScene) {
                    gameRef.current.scene.keys.MainScene.scene.restart({ skills });
                }
                
                // 确保游戏canvas获得焦点
                setTimeout(() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                        canvas.focus();
                    }
                }, 100);
                
                setIsLoading(false);
            } catch (error) {
                console.error('[PhaserGame] Failed to initialize:', error);
                setIsLoading(false);
            }
        };

        initGame();

        // Cleanup on unmount
        return () => {
            mounted = false;
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return (
        <div className="w-full h-screen bg-black relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white font-pixel text-xl">
                        Loading World...
                    </div>
                </div>
            )}
            <div 
                ref={parentRef} 
                id="phaser-game" 
                className="w-full h-full"
                style={{ width: '100%', height: '100vh' }}
            />
        </div>
    );
}
