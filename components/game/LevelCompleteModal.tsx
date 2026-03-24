'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Star, Coins, Target, Clock, X, RotateCcw } from 'lucide-react';
import { playSound } from '@/lib/soundEffects';

interface LevelCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNextLevel: () => void;
    onRetry: () => void;
    success: boolean;
    levelData: {
        title: string;
        score: number;
        stars?: number;              // 星级评价（1-3星）
        timeElapsed?: number;
        objectives: string[];
        // 详细统计
        questionsCorrect?: number;
        questionsTotal?: number;
        itemsCollected?: number;
        itemsTotal?: number;
        hpRemaining?: number;
        hpTotal?: number;
        enemiesDefeated?: number;
        enemiesTotal?: number;
        rewards: {
            exp: number;
            coins: number;
            items?: string[];
        };
    };
}

export default function LevelCompleteModal({
    isOpen,
    onClose,
    onNextLevel,
    onRetry,
    success,
    levelData
}: LevelCompleteModalProps) {
    const [showRewards, setShowRewards] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 播放音效
            if (success) {
                playSound('level_complete');
                // 延迟显示奖励动画
                const timer = setTimeout(() => {
                    setShowRewards(true);
                }, 800);
                return () => clearTimeout(timer);
            } else {
                playSound('level_failed');
                setShowRewards(false);
            }
        } else {
            setShowRewards(false);
        }
    }, [isOpen, success]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
            <div className={`bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border-2 ${success ? 'border-blue-500/60' : 'border-rose-500/60'} animate-bounce-in relative`}>
                
                {/* 关闭按钮 */}
                    <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                    aria-label="关闭"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 text-center">
                    {/* 状态图标 */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className={`absolute inset-0 ${success ? 'bg-amber-300' : 'bg-slate-300'} rounded-full blur-xl opacity-40 animate-pulse`}></div>
                            {success ? (
                                <Trophy className="w-20 h-20 text-yellow-400 relative animate-scale-in" strokeWidth={3} />
                            ) : (
                                <Target className="w-20 h-20 text-slate-400 relative animate-scale-in" strokeWidth={3} />
                            )}
                        </div>
                    </div>

                    {/* 标题 */}
                    <h2 className={`text-4xl font-bold mb-2 ${success ? 'text-amber-500' : 'text-rose-500'}`}>
                        {success ? '关卡完成！' : '任务失败'}
                    </h2>

                    {/* 关卡名称 */}
                    <h3 className="text-xl text-slate-300 mb-6">{levelData.title}</h3>

                    {/* 星级评价 */}
                    {success && levelData.stars && (
                        <div className="mb-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {[1, 2, 3].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-12 h-12 ${
                                            star <= (levelData.stars || 0)
                                                ? 'text-yellow-400 fill-yellow-400 animate-bounce'
                                                : 'text-gray-600'
                                        }`}
                                        style={{ animationDelay: `${star * 0.2}s` }}
                                    />
                                ))}
                            </div>
                            <div className="text-lg text-white/80">
                                {levelData.stars === 3 && '🎉 完美通关！'}
                                {levelData.stars === 2 && '👍 表现优秀！'}
                                {levelData.stars === 1 && '✓ 通关成功！'}
                            </div>
                        </div>
                    )}

                    {/* 分数显示 */}
                    <div className="bg-slate-700/60 rounded-xl p-5 mb-6 border border-slate-600">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Trophy className="w-7 h-7 text-amber-500 animate-pulse" />
                            <span className="text-3xl font-bold text-white">{levelData.score}</span>
                            <span className="text-slate-400 text-lg">分</span>
                        </div>
                        {levelData.timeElapsed && (
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span>用时 {Math.floor(levelData.timeElapsed / 60)}:{(levelData.timeElapsed % 60).toString().padStart(2, '0')}</span>
                            </div>
                        )}
                    </div>

                    {/* 详细统计 */}
                    {success && (
                        <div className="bg-slate-700/60 rounded-xl p-4 mb-6 border border-slate-600">
                            <h4 className="text-slate-300 font-semibold mb-3 text-sm">关卡统计</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {levelData.questionsCorrect !== undefined && levelData.questionsTotal !== undefined && (
                                    <div className="flex items-center justify-between bg-slate-600/40 rounded-lg p-2">
                                        <span className="text-slate-400">答题正确率</span>
                                        <span className={`font-bold ${
                                            levelData.questionsCorrect === levelData.questionsTotal
                                                ? 'text-green-400'
                                                : 'text-yellow-400'
                                        }`}>
                                            {levelData.questionsCorrect}/{levelData.questionsTotal}
                                        </span>
                                    </div>
                                )}
                                {levelData.itemsCollected !== undefined && levelData.itemsTotal !== undefined && (
                                    <div className="flex items-center justify-between bg-black/20 rounded p-2">
                                        <span className="text-white/60">物品收集</span>
                                        <span className={`font-bold ${
                                            levelData.itemsCollected === levelData.itemsTotal
                                                ? 'text-green-400'
                                                : 'text-yellow-400'
                                        }`}>
                                            {levelData.itemsCollected}/{levelData.itemsTotal}
                                        </span>
                                    </div>
                                )}
                                {levelData.hpRemaining !== undefined && levelData.hpTotal !== undefined && (
                                    <div className="flex items-center justify-between bg-black/20 rounded p-2">
                                        <span className="text-white/60">剩余HP</span>
                                        <span className={`font-bold ${
                                            levelData.hpRemaining === levelData.hpTotal
                                                ? 'text-green-400'
                                                : levelData.hpRemaining > levelData.hpTotal * 0.5
                                                ? 'text-yellow-400'
                                                : 'text-red-400'
                                        }`}>
                                            {levelData.hpRemaining}/{levelData.hpTotal}
                                        </span>
                                    </div>
                                )}
                                {levelData.enemiesDefeated !== undefined && levelData.enemiesTotal !== undefined && (
                                    <div className="flex items-center justify-between bg-black/20 rounded p-2">
                                        <span className="text-white/60">击败敌人</span>
                                        <span className={`font-bold ${
                                            levelData.enemiesDefeated === levelData.enemiesTotal
                                                ? 'text-green-400'
                                                : 'text-yellow-400'
                                        }`}>
                                            {levelData.enemiesDefeated}/{levelData.enemiesTotal}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 目标完成情况 */}
                    {success && levelData.objectives.length > 0 && (
                        <div className="bg-black/30 rounded-lg p-4 mb-6 border border-green-500/20">
                            <h4 className="text-green-400 font-semibold mb-3 flex items-center justify-center gap-2">
                                <span className="text-xl">✓</span>
                                <span>目标完成</span>
                            </h4>
                            <div className="space-y-2">
                                {levelData.objectives.map((objective, index) => (
                                    <div key={index} className="text-sm text-white/80 flex items-center gap-2">
                                        <span className="text-green-400">▸</span>
                                        <span>{objective}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 奖励显示 */}
                    {success && showRewards && (
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 mb-6 border border-yellow-400/30">
                            <h4 className="text-yellow-300 font-bold mb-3 flex items-center justify-center gap-2">
                                <Trophy className="w-5 h-5" />
                                获得奖励
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-center gap-2">
                                    <Star className="w-5 h-5 text-blue-300" />
                                    <span className="text-white">+{levelData.rewards.exp} 经验</span>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Coins className="w-5 h-5 text-yellow-300" />
                                    <span className="text-white">+{levelData.rewards.coins} 金币</span>
                                </div>
                            </div>
                            {levelData.rewards.items && levelData.rewards.items.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/20">
                                    <div className="text-sm text-white/80">
                                        获得物品: {levelData.rewards.items.join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 失败提示 */}
                    {!success && (
                        <div className="bg-red-900/20 rounded-lg p-4 mb-6 border border-red-500/30">
                            <p className="text-white/80 text-sm">
                                💪 不要气馁，再试一次！
                            </p>
                        </div>
                    )}

                    {/* 按钮 */}
                    <div className="flex gap-3">
                        {success ? (
                            <>
                                <button
                                    onClick={onNextLevel}
                                    className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                                >
                                    下一关 →
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                                >
                                    返回
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onRetry}
                                    className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                                >
                                    <RotateCcw className="w-5 h-5 inline mr-1" />重试
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                                >
                                    退出
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
