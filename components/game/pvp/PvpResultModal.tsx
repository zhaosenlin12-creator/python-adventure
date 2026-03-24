'use client';

/**
 * PVP 结果展示组件
 * Requirements: 5.2, 5.5
 * 🔧 优化：游戏结束时自动关闭房间
 * 🍖 新增：PvP完成时发放食物奖励
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Coins, Zap, Swords, Brain, Code } from 'lucide-react';
import { TotalScoreResult, RoundScores, SCORE_WEIGHTS } from '../../../types/pvp';
import { calculateRewards } from '../../../lib/pvpScoring';
import { usePvpStore } from '../../../store/pvpStore';
import { useAuthStore } from '../../../store/authStore';
import { getPvpWebSocket } from '../../../lib/services/pvpWebSocket';
import { grantPvpWinReward, grantPvpLoseReward } from '../../../lib/utils/foodRewards';
import { showFoodRewardToast } from '../../ui/FoodRewardToast';
import { getApiBaseUrl } from '../../../lib/config/api';

interface PvpResultModalProps {
    result: TotalScoreResult;
    roundScores: RoundScores;
    onClose: () => void;
}

export default function PvpResultModal({ result, roundScores, onClose }: PvpResultModalProps) {
    const isWinner = result.winnerId === 'player1';
    const isDraw = result.winnerId === null;
    const rewards = calculateRewards(isWinner, result.player1Total);
    
    const { currentRoom } = usePvpStore();
    const { user, token } = useAuthStore();
    
    // 🔧 标记是否已发送结束请求，避免重复调用
    const hasFinishedRef = useRef(false);
    const hasFoodRewardRef = useRef(false);
    
    // 🍖 发放食物奖励
    useEffect(() => {
        if (hasFoodRewardRef.current) return;
        hasFoodRewardRef.current = true;
        
        const grantReward = async () => {
            try {
                if (isWinner) {
                    await grantPvpWinReward(showFoodRewardToast);
                    console.log('[PvpResultModal] PvP胜利食物奖励已发放');
                } else if (!isDraw) {
                    await grantPvpLoseReward(showFoodRewardToast);
                    console.log('[PvpResultModal] PvP失败安慰奖励已发放');
                }
            } catch (error) {
                console.error('[PvpResultModal] 食物奖励发放失败:', error);
                // 奖励失败不影响游戏流程
            }
        };
        
        grantReward();
    }, [isWinner, isDraw]);
    
    // 🔧 组件挂载时自动通知后端游戏结束
    useEffect(() => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        
        const finishRoom = async () => {
            if (!currentRoom?.id || !user?.id) return;
            
            // 方式1：通过 WebSocket 发送 game_end 消息
            try {
                const ws = getPvpWebSocket();
                if (ws) {
                    ws.sendGameEnd(
                        result.winnerId,
                        { player1: result.player1Total, player2: result.player2Total }
                    );
                }
            } catch {
                // WebSocket发送失败，尝试HTTP
            }
            
            // 方式2：通过 HTTP API 调用 finish（双保险）
            try {
                await fetch(
                    `${getApiBaseUrl()}/pvp/rooms/${currentRoom.id}/finish?user_id=${user.id}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        }
                    }
                );
            } catch {
                // HTTP finish调用失败
            }
        };
        
        finishRoom();
    }, [currentRoom?.id, user?.id, token, result]);

    const roundIcons = {
        battle: Swords,
        quiz: Brain,
        coding: Code,
    };

    const roundNames = {
        battle: '实时对战',
        quiz: '快速答题',
        coding: '编程挑战',
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="bg-slate-800 backdrop-blur-md rounded-2xl w-full max-w-lg overflow-hidden shadow-lg border-2 border-slate-700"
            >
                {/* 头部 - 胜负结果 */}
                <div className={`p-8 text-center ${
                    isDraw 
                        ? 'bg-slate-700/50'
                        : isWinner 
                            ? 'bg-gradient-to-r from-amber-900/30 to-amber-800/30'
                            : 'bg-slate-700/30'
                }`}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                    >
                        <Trophy className={`w-16 h-16 mx-auto mb-4 ${
                            isDraw ? 'text-slate-400' : isWinner ? 'text-amber-500' : 'text-slate-400'
                        }`} />
                    </motion.div>
                    
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-white mb-2"
                    >
                        {isDraw ? '平局！' : isWinner ? '胜利！' : '失败'}
                    </motion.h2>
                    
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-500"
                    >
                        {isDraw 
                            ? '势均力敌的对决！'
                            : isWinner 
                                ? '恭喜你赢得了这场对战！'
                                : '再接再厉，下次一定能赢！'}
                    </motion.p>
                </div>

                <div className="p-6 space-y-6">
                    {/* 总分对比 */}
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <p className="text-slate-500 text-sm mb-1">你的得分</p>
                            <p className={`text-4xl font-bold ${isWinner || isDraw ? 'text-blue-400' : 'text-slate-400'}`}>
                                {result.player1Total.toFixed(1)}
                            </p>
                        </div>
                        <div className="text-slate-400 text-2xl">VS</div>
                        <div className="text-center">
                            <p className="text-slate-500 text-sm mb-1">对手得分</p>
                            <p className={`text-4xl font-bold ${!isWinner && !isDraw ? 'text-red-400' : 'text-slate-400'}`}>
                                {result.player2Total.toFixed(1)}
                            </p>
                        </div>
                    </div>

                    {/* 各轮分数明细 */}
                    <div className="space-y-3">
                        {(['battle', 'quiz', 'coding'] as const).map((round, index) => {
                            const Icon = roundIcons[round];
                            const scores = roundScores[round];
                            const weight = SCORE_WEIGHTS[round];
                            
                            return (
                                <motion.div
                                    key={round}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    className="bg-blue-900/30 rounded-xl p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5 text-slate-500" />
                                            <span className="text-white">{roundNames[round]}</span>
                                            <span className="text-slate-400 text-sm">({(weight * 100).toFixed(0)}%)</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className={scores && scores.player1 > scores.player2 ? 'text-green-400' : 'text-gray-400'}>
                                                {scores?.player1 || 0}
                                            </span>
                                            <span className="text-slate-400">:</span>
                                            <span className={scores && scores.player2 > scores.player1 ? 'text-red-400' : 'text-gray-400'}>
                                                {scores?.player2 || 0}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* 奖励 */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="bg-blue-900/30 border border-slate-700 rounded-xl p-4"
                    >
                        <p className="text-slate-500 text-sm mb-3 text-center">获得奖励</p>
                        <div className="flex items-center justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-bold">+{rewards.xp} XP</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Coins className="w-5 h-5 text-amber-500" />
                                <span className="text-white font-bold">+{rewards.coins} 金币</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* 确认按钮 */}
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        onClick={onClose}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-xl hover:from-blue-500 hover:to-teal-400 transition-all shadow-lg shadow-blue-500/30"
                    >
                        领取奖励
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
