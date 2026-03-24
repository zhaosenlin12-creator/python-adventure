"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sword, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { BattleConfig } from "@/lib/levels";

interface BattleArenaProps {
    config: BattleConfig;
    playerHealth: number;
    enemyHealth: number;
    isAttacking: boolean;
    isHit: boolean;
    damage: number | null;
    turn: 'player' | 'enemy';
}

export default function BattleArena({
    config,
    playerHealth,
    enemyHealth,
    isAttacking,
    isHit,
    damage,
    turn
}: BattleArenaProps) {

    // Shake effect for damage
    const shakeVariants = {
        idle: { x: 0 },
        hit: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } },
    };

    // Attack animation
    const attackVariants = {
        idle: { x: 0, scale: 1 },
        attack: { x: 50, scale: 1.2, transition: { duration: 0.2, yoyo: 1 } },
    };

    // Slash effect animation
    const slashVariants = {
        hidden: { opacity: 0, scale: 0, rotate: -45 },
        visible: {
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 2],
            rotate: 45,
            transition: { duration: 0.5 }
        },
    };

    return (
        <div className="w-full h-full bg-slate-900 rounded-lg border-4 border-slate-700 relative overflow-hidden px-20 py-4 flex justify-between items-center bg-[url('https://api.dicebear.com/9.x/pixel-art/svg?seed=Background')] bg-cover bg-center bg-no-repeat bg-blend-multiply">

            {/* Player Stats - 靠中间，稍大 */}
            <div className="flex flex-col items-center gap-2 z-10">
                <div className="relative">
                    <motion.div
                        animate={isHit && turn === 'enemy' ? "hit" : "idle"}
                        variants={shakeVariants}
                        className="w-20 h-20 bg-blue-500 rounded-lg border-2 border-white overflow-hidden shadow-xl"
                    >
                        <div className="w-full h-full flex items-center justify-center text-5xl">🧙</div>
                    </motion.div>

                    {/* Damage Number Popup */}
                    <AnimatePresence>
                        {isHit && turn === 'enemy' && damage !== null && (
                            <motion.div
                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                animate={{ y: -50, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-pixel font-bold text-4xl stroke-black z-20"
                                style={{ textShadow: '2px 2px 0 #000' }}
                            >
                                -{damage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Hit particles for player */}
                    <AnimatePresence>
                        {isHit && turn === 'enemy' && (
                            <>
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                        animate={{
                                            opacity: 0,
                                            scale: 0,
                                            x: Math.random() * 40 - 20,
                                            y: Math.random() * 40 - 20
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, delay: i * 0.05 }}
                                        className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-500 rounded-full"
                                    />
                                ))}
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-36">
                    <div className="flex justify-between text-xs font-pixel text-white mb-1">
                        <span>HERO</span>
                        <span>{playerHealth}/{config.playerMaxHp}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full border border-slate-950 overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500"
                            initial={{ width: "100%" }}
                            animate={{ width: `${(playerHealth / config.playerMaxHp) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            {/* VS Badge - 缩小 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-30">
                <span className="text-4xl font-pixel text-white/20 font-bold">VS</span>
            </div>

            {/* Enemy Stats - 稍大 */}
            <div className="flex flex-col items-center gap-2 z-10">
                <div className="relative">
                    <motion.div
                        animate={isAttacking ? "hit" : "idle"}
                        variants={shakeVariants}
                        className="w-20 h-20 bg-red-900/50 rounded-lg border-2 border-red-500 overflow-hidden shadow-xl flex items-center justify-center text-5xl"
                    >
                        {config.enemyAvatar}
                    </motion.div>

                    {/* Slash Effect for Player Attack */}
                    <AnimatePresence>
                        {isHit && turn === 'player' && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={slashVariants}
                                className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
                            >
                                <div className="text-8xl text-yellow-400 font-bold" style={{ textShadow: '0 0 20px #fbbf24' }}>
                                    ⚔️
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Damage Number Popup */}
                    <AnimatePresence>
                        {isHit && turn === 'player' && damage !== null && (
                            <motion.div
                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                animate={{ y: -50, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-0 left-1/2 -translate-x-1/2 text-yellow-400 font-pixel font-bold text-4xl stroke-black z-20"
                                style={{ textShadow: '2px 2px 0 #000' }}
                            >
                                {damage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Hit particles for enemy */}
                    <AnimatePresence>
                        {isHit && turn === 'player' && (
                            <>
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                                        animate={{
                                            opacity: 0,
                                            scale: 0,
                                            x: Math.random() * 60 - 30,
                                            y: Math.random() * 60 - 30
                                        }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, delay: i * 0.05 }}
                                        className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full"
                                    />
                                ))}
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-36">
                    <div className="flex justify-between text-xs font-pixel text-white mb-1">
                        <span>{config.enemyName}</span>
                        <span>{enemyHealth}/{config.enemyMaxHp}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full border border-slate-950 overflow-hidden">
                        <motion.div
                            className="h-full bg-red-500"
                            initial={{ width: "100%" }}
                            animate={{ width: `${(enemyHealth / config.enemyMaxHp) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
