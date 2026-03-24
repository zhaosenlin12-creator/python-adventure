"use client";

import { motion } from "framer-motion";
import { LEVELS, Level } from "@/lib/levels";
import { useGameStore } from "@/store/gameStore";
import { Lock, Star, Skull } from "lucide-react";
import clsx from "clsx";

import { useI18n } from "@/lib/i18n";
import { useSound } from "@/hooks/useSound";

export default function WorldMap({ onSelectLevel, chapterFilter }: {
    onSelectLevel: (level: Level) => void;
    chapterFilter?: number;
}) {
    const { completedLevels, level: userLevel } = useGameStore();
    const { language } = useI18n();
    const { play } = useSound();

    const handleSelectLevel = (level: Level) => {
        play('click');
        onSelectLevel(level);
    };

    // Filter levels by chapter if specified
    const filteredLevels = chapterFilter
        ? LEVELS.filter(l => l.chapter === chapterFilter)
        : LEVELS;

    // 🔥 v2.1.9: 修复关卡解锁逻辑 - 基于前一关是否完成
    const isLevelUnlocked = (level: Level, index: number): boolean => {
        // 第一关始终解锁
        if (index === 0) return true;
        
        // 后续关卡需要前一关完成才能解锁
        const prevLevel = filteredLevels[index - 1];
        return completedLevels.includes(prevLevel.id);
    };

    return (
            <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gradient-to-b from-[#0a0e27] to-[#1a1e3e] overflow-hidden rounded-2xl border-2 border-slate-700 shadow-lg shadow-slate-900/30">
            {/* Background Stars */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.3 + Math.random() * 0.7 }} />
                ))}
            </div>

            {/* Connection Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {filteredLevels.map((level, index) => {
                    if (index === filteredLevels.length - 1) return null;
                    const nextLevel = filteredLevels[index + 1];
                    return (
                        <motion.line
                            key={`line-${level.id}`}
                            x1={`${level.x}%`}
                            y1={`${level.y}%`}
                            x2={`${nextLevel.x}%`}
                            y2={`${nextLevel.y}%`}
                            stroke={completedLevels.includes(level.id) ? "#60a5fa" : "#334155"}
                            strokeWidth="4"
                            strokeDasharray="8 4"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                        />
                    );
                })}
            </svg>

            {/* Level Nodes */}
            {filteredLevels.map((level, index) => {
                // 🔥 v2.1.9: 使用新的解锁逻辑
                const isUnlocked = isLevelUnlocked(level, index);
                const isCompleted = completedLevels.includes(level.id);
                const isBoss = level.type === 'boss';

                return (
                    <motion.button
                        key={level.id}
                        className={clsx(
                            "absolute transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full border-2 transition-all z-10 min-w-[44px] min-h-[44px] shadow-md",
                            isUnlocked
                                ? isBoss ? "bg-rose-500 border-rose-300 hover:scale-110 active:scale-95" : "bg-blue-600 border-blue-400 hover:scale-110 active:scale-95"
                                : "bg-slate-700 border-slate-600 cursor-not-allowed grayscale"
                        )}
                        style={{ left: `${level.x}%`, top: `${level.y}%` }}
                        whileHover={isUnlocked ? { scale: 1.2 } : {}}
                        whileTap={isUnlocked ? { scale: 0.95 } : {}}
                        onClick={() => isUnlocked && handleSelectLevel(level)}
                    >
                        {isUnlocked ? (
                            isCompleted ? (
                                <Star className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400 fill-yellow-400" />
                            ) : isBoss ? (
                                <Skull className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-200 animate-pulse" />
                            ) : (
                                <span className="text-sm sm:text-lg md:text-xl font-bold text-white">{filteredLevels.indexOf(level) + 1}</span>
                            )
                        ) : (
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-500" />
                        )}

                        {/* Tooltip - 移动端隐藏 */}
                        <div className="absolute top-full mt-2 w-32 bg-slate-800 text-xs p-2 rounded-xl border border-slate-600 text-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-20 hidden sm:block shadow-lg">
                            <div className="font-bold text-blue-400 mb-1">
                                {language === 'cn' ? (level.titleCN || level.title) : level.title}
                            </div>
                            <div className="text-slate-400">
                                {language === 'cn' ? (level.descriptionCN || level.description) : level.description}
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
