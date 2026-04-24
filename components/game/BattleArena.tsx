"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Bug, ImageIcon, ShieldAlert, Sparkles, Swords } from "lucide-react";
import { BattleConfig } from "@/lib/levels";

interface BattleArenaProps {
    config: BattleConfig;
    playerHealth: number;
    enemyHealth: number;
    isAttacking: boolean;
    isHit: boolean;
    damage: number | null;
    turn: 'player' | 'enemy';
    language?: "cn" | "en";
}

function isImageAvatar(avatar?: string) {
    if (!avatar) {
        return false;
    }

    return /^(https?:\/\/|\/)/.test(avatar);
}

function getEnemyIcon(config: BattleConfig) {
    const avatar = (config.enemyAvatar || "").toLowerCase();
    const enemyName = config.enemyName.toLowerCase();

    if (avatar.includes("🐛") || enemyName.includes("bug") || enemyName.includes("虫")) {
        return Bug;
    }

    if (
        avatar.includes("🧙") ||
        enemyName.includes("mage") ||
        enemyName.includes("wizard") ||
        enemyName.includes("法师") ||
        enemyName.includes("巫师")
    ) {
        return Sparkles;
    }

    if (avatar.includes("🤖") || enemyName.includes("bot") || enemyName.includes("robot") || enemyName.includes("ai")) {
        return Bot;
    }

    return ShieldAlert;
}

export default function BattleArena({
    config,
    playerHealth,
    enemyHealth,
    isAttacking,
    isHit,
    damage,
    turn,
    language = "cn",
}: BattleArenaProps) {
    const playerLabel = language === "cn" ? "玩家" : "Hero";
    const EnemyIcon = getEnemyIcon(config);

    const shakeVariants = {
        idle: { x: 0 },
        hit: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } },
    };

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
        <div className="relative flex h-full w-full items-center justify-between overflow-hidden rounded-lg border-4 border-slate-700 bg-slate-900 bg-[url('https://api.dicebear.com/9.x/pixel-art/svg?seed=Background')] bg-cover bg-center bg-no-repeat bg-blend-multiply px-4 py-2 sm:px-6">

            <div className="z-10 flex flex-col items-center gap-1.5">
                <div className="relative">
                    <motion.div
                        animate={isHit && turn === 'enemy' ? "hit" : "idle"}
                        variants={shakeVariants}
                        className="h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-blue-500 shadow-xl sm:h-14 sm:w-14"
                    >
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-cyan-400 via-blue-500 to-blue-700">
                            <Sparkles className="h-7 w-7 text-white drop-shadow sm:h-8 sm:w-8" />
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {isHit && turn === 'enemy' && damage !== null && (
                            <motion.div
                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                animate={{ y: -50, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute left-1/2 top-0 z-20 -translate-x-1/2 font-pixel text-xl font-bold text-red-500 stroke-black sm:text-2xl"
                                style={{ textShadow: '2px 2px 0 #000' }}
                            >
                                -{damage}
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                <div className="w-24 sm:w-28">
                    <div className="mb-1 flex justify-between text-xs font-pixel text-white">
                        <span>{playerLabel}</span>
                        <span>{playerHealth}/{config.playerMaxHp}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full border border-slate-950 bg-slate-700">
                        <motion.div
                            className="h-full bg-green-500"
                            initial={{ width: "100%" }}
                            animate={{ width: `${(playerHealth / config.playerMaxHp) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 opacity-25">
                <span className="font-pixel text-2xl font-bold text-white/20 sm:text-3xl">VS</span>
            </div>

            <div className="z-10 flex flex-col items-center gap-1.5">
                <div className="relative">
                    <motion.div
                        animate={isAttacking ? "hit" : "idle"}
                        variants={shakeVariants}
                        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border-2 border-red-500 bg-red-900/50 text-3xl shadow-xl sm:h-14 sm:w-14 sm:text-4xl"
                    >
                        {isImageAvatar(config.enemyAvatar) ? (
                            <img
                                src={config.enemyAvatar}
                                alt={config.enemyName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-rose-400 via-rose-600 to-red-800">
                                {config.enemyAvatar ? (
                                    <EnemyIcon className="h-7 w-7 text-rose-50 drop-shadow sm:h-8 sm:w-8" />
                                ) : (
                                    <ImageIcon className="h-7 w-7 text-rose-50 drop-shadow sm:h-8 sm:w-8" />
                                )}
                            </div>
                        )}
                    </motion.div>

                    <AnimatePresence>
                        {isHit && turn === 'player' && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={slashVariants}
                                className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center"
                            >
                                <Swords className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.7)] sm:h-14 sm:w-14" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {isHit && turn === 'player' && damage !== null && (
                            <motion.div
                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                animate={{ y: -50, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute left-1/2 top-0 z-20 -translate-x-1/2 font-pixel text-xl font-bold text-yellow-400 stroke-black sm:text-2xl"
                                style={{ textShadow: '2px 2px 0 #000' }}
                            >
                                {damage}
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                <div className="w-24 sm:w-28">
                    <div className="mb-1 flex justify-between text-xs font-pixel text-white">
                        <span>{config.enemyName}</span>
                        <span>{enemyHealth}/{config.enemyMaxHp}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full border border-slate-950 bg-slate-700">
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
