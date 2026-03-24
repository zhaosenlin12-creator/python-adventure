"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Lock, Play, Trophy, Clock, Zap } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { CampaignLevel, CampaignProgress, Chapter } from "@/types/campaign";

interface CampaignMapProps {
    isOpen: boolean;
    onClose: () => void;
    onStartLevel: (levelId: number) => void;
}

export default function CampaignMap({ isOpen, onClose, onStartLevel }: CampaignMapProps) {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [progress, setProgress] = useState<CampaignProgress | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<CampaignLevel | null>(null);
    const [activeChapter, setActiveChapter] = useState(0);
    const { token, user } = useAuthStore();

    useEffect(() => {
        if (isOpen) {
            loadCampaignData();
        }
    }, [isOpen]);

    const loadCampaignData = async () => {
        // 暂时使用模拟数据，后续接入真实后端
        const mockChapters: Chapter[] = [
            {
                id: 1,
                title: "第一章：初入编程世界",
                description: "学习基础的编程概念，掌握变量、条件和循环",
                unlocked: true,
                levels: [
                    {
                        id: 1,
                        chapter: 1,
                        order: 1,
                        title: "基础移动",
                        description: "学习如何使用变量控制角色移动",
                        difficulty: "easy",
                        estimatedTime: 5,
                        mapData: {
                            width: 800,
                            height: 600,
                            platforms: [],
                            enemies: [],
                            npcs: [],
                            challenges: [],
                            collectibles: [],
                            spawnPoint: { x: 50, y: 500 },
                            exitPoint: { x: 750, y: 500 }
                        },
                        objectives: [
                            { type: "reach", target: "exit", count: 1, description: "到达终点" }
                        ],
                        rewards: { exp: 100, coins: 50 },
                        unlockRequirements: {}
                    },
                    {
                        id: 2,
                        chapter: 1,
                        order: 2,
                        title: "跳跃挑战",
                        description: "使用条件判断来控制跳跃时机",
                        difficulty: "easy",
                        estimatedTime: 8,
                        mapData: {
                            width: 800,
                            height: 600,
                            platforms: [],
                            enemies: [],
                            npcs: [],
                            challenges: [],
                            collectibles: [],
                            spawnPoint: { x: 50, y: 500 },
                            exitPoint: { x: 750, y: 200 }
                        },
                        objectives: [
                            { type: "collect", target: "star", count: 3, description: "收集3颗星星" },
                            { type: "reach", target: "exit", count: 1, description: "到达终点" }
                        ],
                        rewards: { exp: 150, coins: 75 },
                        unlockRequirements: { previousLevel: 1 }
                    },
                    {
                        id: 3,
                        chapter: 1,
                        order: 3,
                        title: "首次战斗",
                        description: "学习使用循环来处理重复任务",
                        difficulty: "medium",
                        estimatedTime: 10,
                        mapData: {
                            width: 800,
                            height: 600,
                            platforms: [],
                            enemies: [],
                            npcs: [],
                            challenges: [],
                            collectibles: [],
                            spawnPoint: { x: 50, y: 500 },
                            exitPoint: { x: 750, y: 500 }
                        },
                        objectives: [
                            { type: "defeat", target: "enemy", count: 5, description: "击败5个敌人" },
                            { type: "reach", target: "exit", count: 1, description: "到达终点" }
                        ],
                        rewards: { exp: 200, coins: 100, skills: ["dash"] },
                        unlockRequirements: { previousLevel: 2 }
                    }
                ]
            },
            {
                id: 2,
                title: "第二章：算法之路",
                description: "探索常用算法，提升解决问题的能力",
                unlocked: false,
                levels: []
            }
        ];

        const mockProgress: CampaignProgress = {
            userId: user?.id || 0,
            completedLevels: [],
            currentLevel: 1,
            stars: {},
            achievements: [],
            totalPlayTime: 0,
            lastPlayed: new Date()
        };

        setChapters(mockChapters);
        setProgress(mockProgress);
    };

    const isLevelUnlocked = (level: CampaignLevel): boolean => {
        if (!progress) return false;
        
        // 第一关总是解锁
        if (level.id === 1) return true;
        
        // 检查前置关卡
        if (level.unlockRequirements.previousLevel) {
            return progress.completedLevels.includes(level.unlockRequirements.previousLevel);
        }
        
        return true;
    };

    const getLevelStars = (levelId: number): number => {
        return progress?.stars[levelId] || 0;
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'hard': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '简单';
            case 'medium': return '中等';
            case 'hard': return '困难';
            default: return '未知';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border-2 border-blue-500/40 w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="bg-slate-800 border-b-2 border-blue-500/40 p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-pixel text-blue-400 mb-2">战役模式</h1>
                        <p className="text-slate-500">探索编程世界，完成挑战关卡</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Chapter List */}
                    <div className="w-80 bg-slate-800 border-r-2 border-slate-700 p-4 overflow-y-auto">
                        <h2 className="text-xl font-pixel text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-blue-400" />
                            章节列表
                        </h2>
                        <div className="space-y-3">
                            {chapters.map((chapter, index) => (
                                <motion.button
                                    key={chapter.id}
                                    onClick={() => chapter.unlocked && setActiveChapter(index)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                        activeChapter === index
                                            ? 'bg-purple-900/50 border-blue-500'
                                            : chapter.unlocked
                                            ? 'bg-slate-700 border-slate-600 hover:border-blue-500'
                                            : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                                    }`}
                                    whileHover={chapter.unlocked ? { scale: 1.02 } : {}}
                                    disabled={!chapter.unlocked}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-pixel text-white">{chapter.title}</h3>
                                        {!chapter.unlocked && <Lock className="w-4 h-4 text-slate-400" />}
                                    </div>
                                    <p className="text-sm text-slate-500">{chapter.description}</p>
                                    {chapter.unlocked && (
                                        <div className="mt-2 text-xs text-blue-400">
                                            {chapter.levels.length} 个关卡
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Level Grid */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {chapters[activeChapter] && (
                            <>
                                <h2 className="text-2xl font-pixel text-white mb-6">
                                    {chapters[activeChapter].title}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {chapters[activeChapter].levels.map((level) => {
                                        const unlocked = isLevelUnlocked(level);
                                        const stars = getLevelStars(level.id);
                                        const completed = stars > 0;

                                        return (
                                            <motion.div
                                                key={level.id}
                                                className={`bg-slate-700 rounded-lg border p-4 cursor-pointer transition-all ${
                                                    unlocked
                                                        ? 'border-slate-600 hover:border-blue-500'
                                                        : 'border-slate-600 opacity-50 cursor-not-allowed'
                                                }`}
                                                whileHover={unlocked ? { scale: 1.05 } : {}}
                                                onClick={() => unlocked && setSelectedLevel(level)}
                                            >
                                                {/* Level Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-blue-400 font-pixel">#{level.order}</span>
                                                            {!unlocked && <Lock className="w-4 h-4 text-slate-400" />}
                                                        </div>
                                                        <h3 className="font-pixel text-white text-lg">{level.title}</h3>
                                                    </div>
                                                    {completed && (
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3].map((i) => (
                                                                <Star
                                                                    key={i}
                                                                    className={`w-4 h-4 ${
                                                                        i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Level Info */}
                                                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{level.description}</p>

                                                {/* Level Stats */}
                                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                                    <div className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        <span className={getDifficultyColor(level.difficulty)}>
                                                            {getDifficultyLabel(level.difficulty)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{level.estimatedTime}分钟</span>
                                                    </div>
                                                </div>

                                                {/* Rewards Preview */}
                                                <div className="mt-3 pt-3 border-t border-slate-600 flex items-center gap-3 text-xs">
                                                    <span className="text-yellow-400">+{level.rewards.exp} EXP</span>
                                                    <span className="text-blue-400">+{level.rewards.coins} 金币</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Level Detail Modal */}
            <AnimatePresence>
                {selectedLevel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-60 flex items-center justify-center p-4"
                        onClick={() => setSelectedLevel(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            className="bg-slate-800 backdrop-blur-md rounded-xl border-2 border-slate-700 shadow-xl p-8 max-w-2xl w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-3xl font-pixel text-yellow-400 mb-4">{selectedLevel.title}</h2>
                            <p className="text-slate-500 mb-6">{selectedLevel.description}</p>

                            {/* Objectives */}
                            <div className="mb-6">
                                <h3 className="text-lg font-pixel text-white mb-3">任务目标</h3>
                                <div className="space-y-2">
                                    {selectedLevel.objectives.map((obj, i) => (
                                        <div key={i} className="flex items-center gap-2 text-slate-500">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                            <span>{obj.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rewards */}
                            <div className="mb-6">
                                <h3 className="text-lg font-pixel text-white mb-3">完成奖励</h3>
                                <div className="flex gap-4">
                                    <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2">
                                        <span className="text-yellow-400">+{selectedLevel.rewards.exp} EXP</span>
                                    </div>
                                    <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2">
                                        <span className="text-blue-400">+{selectedLevel.rewards.coins} 金币</span>
                                    </div>
                                    {selectedLevel.rewards.skills && selectedLevel.rewards.skills.length > 0 && (
                                        <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2">
                                            <span className="text-purple-500">解锁技能</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        onStartLevel(selectedLevel.id);
                                        setSelectedLevel(null);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-400 hover:to-blue-500 text-white font-pixel text-lg py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Play className="w-5 h-5" />
                                    开始挑战
                                </button>
                                <button
                                    onClick={() => setSelectedLevel(null)}
                                    className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-pixel py-3 rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
