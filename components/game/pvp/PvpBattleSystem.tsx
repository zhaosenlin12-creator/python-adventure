'use client';

/**
 * PVP 对战系统主控制组件
 * Requirements: 1.5, 7.4, 7.5
 */

import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePvpStore } from '../../../store/pvpStore';
import { useGameStore } from '../../../store/gameStore';
import { useAuthStore } from '../../../store/authStore';
import { useCoinStore } from '../../../store/coinStore';
import { isAIOpponent } from '../../../types/pvp';
import { calculateTotalScore, calculateRewards } from '../../../lib/pvpScoring';
import { getAIConfig, makeQuizDecision, makeCodingDecision } from '../../../lib/pvpAI';
import { grantPvpWinReward, grantPvpLoseReward } from '@/lib/utils/foodRewards';
import { showFoodRewardToast } from '@/components/ui/FoodRewardToast';
import { getApiBaseUrl } from '@/lib/config/api';
import dynamic from 'next/dynamic';

const PvpLobby = dynamic(() => import('./PvpLobby'), { ssr: false });
const PvpRoomWaiting = dynamic(() => import('./PvpRoomWaiting'), { ssr: false });
const PvpBattleRound = dynamic(() => import('./PvpBattleRound'), { ssr: false });
const PvpQuizRound = dynamic(() => import('./PvpQuizRound'), { ssr: false });
const PvpCodingRound = dynamic(() => import('./PvpCodingRound'), { ssr: false });
const PvpResultModal = dynamic(() => import('./PvpResultModal'), { ssr: false });

type PvpPhase = 'lobby' | 'waiting' | 'battle' | 'quiz' | 'coding' | 'result';

interface PvpBattleSystemProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PvpBattleSystem({ isOpen, onClose }: PvpBattleSystemProps) {
    const [phase, setPhase] = useState<PvpPhase>('lobby');
    const [battleResult, setBattleResult] = useState<any>(null);
    // 🔥 用于记录进入 battle 时的真人对战状态（避免 store 更新延迟问题）
    const isRealBattleRef = useRef<boolean>(false);

    const {
        currentRoom,
        roundScores,
        setRoundScore,
        reset: resetPvp,
    } = usePvpStore();

    const { addXp, addCoins } = useGameStore();
    const { user, token } = useAuthStore();
    const { loadBalance } = useCoinStore();
    
    // 判断是否是真人对战（guestPlayer 存在且不是 AI）
    const isRealPlayerBattle = currentRoom?.guestPlayer && !isAIOpponent(currentRoom.guestPlayer);
    
    // 判断当前用户是否是房主
    const isHost = currentRoom?.hostPlayer?.id === user?.id?.toString();

    // 重置状态
    const handleClose = useCallback(() => {
        resetPvp();
        setPhase('lobby');
        setBattleResult(null);
        onClose();
    }, [resetPvp, onClose]);

    // 开始对战
    const handleStartBattle = useCallback((_roomId: string) => {
        // 直接进入等待页面
        setPhase('waiting');
    }, []);

    // 从等待进入对战
    const handleBattleStart = useCallback(() => {
        // 进入 battle 时，记录当前的真人对战状态
        const currentState = usePvpStore.getState();
        const guestPlayer = currentState.currentRoom?.guestPlayer;
        const isAI = guestPlayer ? isAIOpponent(guestPlayer) : true;
        const isReal = guestPlayer && !isAI;
        isRealBattleRef.current = !!isReal;
        
        // 进入第一轮实时对战
        setPhase('battle');
    }, []);

    // 第一轮对战完成
    const handleBattleRoundComplete = useCallback((p1Score: number, p2Score: number, p1HP: number, p2HP: number) => {
        setRoundScore('battle', p1Score, p2Score);
        setPhase('quiz');
    }, [setRoundScore]);

    // 答题轮完成
    const handleQuizComplete = useCallback((player1Correct: number, player1AvgTime: number) => {
        const isAI = currentRoom?.guestPlayer && isAIOpponent(currentRoom.guestPlayer);
        
        let player2Correct = 5;
        let player2AvgTime = 8000;
        
        if (isAI && isAIOpponent(currentRoom!.guestPlayer!)) {
            const aiConfig = getAIConfig(currentRoom!.guestPlayer!.difficulty);
            // 模拟 AI 答题
            let correct = 0;
            let totalTime = 0;
            for (let i = 0; i < 10; i++) {
                const decision = makeQuizDecision(aiConfig, 'medium');
                if (decision.isCorrect) correct++;
                totalTime += decision.timeUsed;
            }
            player2Correct = correct;
            player2AvgTime = totalTime / 10;
        }
        
        // 计算分数
        const player1Score = Math.round((player1Correct / 10) * 70 + Math.max(0, (1 - player1AvgTime / 30000)) * 30);
        const player2Score = Math.round((player2Correct / 10) * 70 + Math.max(0, (1 - player2AvgTime / 30000)) * 30);
        
        setRoundScore('quiz', player1Score, player2Score);
        setPhase('coding');
    }, [currentRoom, setRoundScore]);

    // 编程轮完成
    const handleCodingComplete = useCallback((completed: boolean, timeUsed: number) => {
        const isAI = currentRoom?.guestPlayer && isAIOpponent(currentRoom.guestPlayer);
        const timeLimit = 300000; // 5 分钟
        
        let player2Completed = false;
        let player2Time = timeLimit;
        
        if (isAI && isAIOpponent(currentRoom!.guestPlayer!)) {
            const aiConfig = getAIConfig(currentRoom!.guestPlayer!.difficulty);
            const decision = makeCodingDecision(aiConfig, 'medium', timeLimit);
            player2Completed = decision.completed;
            player2Time = decision.timeUsed;
        }
        
        // 计算分数
        const calcScore = (done: boolean, time: number) => {
            if (!done) return Math.round((1 - time / timeLimit) * 20);
            return Math.round(50 + (1 - time / timeLimit) * 30 + 10);
        };
        
        const player1Score = calcScore(completed, timeUsed);
        const player2Score = calcScore(player2Completed, player2Time);
        
        setRoundScore('coding', player1Score, player2Score);
        
        // 计算总分
        const totalResult = calculateTotalScore({
            battle: roundScores.battle,
            quiz: roundScores.quiz,
            coding: { player1: player1Score, player2: player2Score },
        });
        
        setBattleResult(totalResult);
        setPhase('result');
    }, [currentRoom, roundScores, setRoundScore]);

    // 领取奖励
    const handleClaimRewards = useCallback(async () => {
        if (battleResult) {
            const isWinner = battleResult.winnerId === 'player1';
            const rewards = calculateRewards(isWinner, battleResult.player1Total);
            addXp(rewards.xp);
            addCoins(rewards.coins);
            
            // 🪙 调用后端API发放金币奖励
            try {
                if (user && currentRoom) {
                    const response = await fetch(`${getApiBaseUrl()}/pvp/battle/complete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            room_id: currentRoom.id,
                            is_winner: isWinner,
                            exp_gained: rewards.xp,
                            score_gained: battleResult.player1Total,
                            win_streak: 0 // TODO: 实现连胜追踪
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log('[PvpBattleSystem] PVP金币奖励:', result);
                        
                        // 如果后端返回了金币信息
                        if (result.coins_earned && result.coin_awarded) {
                            // 更新本地金币余额
                            const { setCoins, coins } = useGameStore.getState();
                            setCoins((coins || 0) + result.coins_earned);
                            
                            // 显示金币Toast
                            if (typeof window !== 'undefined') {
                                const { showCoinRewardToast } = await import('@/components/ui/CoinRewardToast');
                                const description = isWinner 
                                    ? `PVP对战胜利 🏆` 
                                    : `PVP对战参与 💪`;
                                showCoinRewardToast(
                                    result.coins_earned,
                                    description,
                                    'reward'
                                );
                            }
                        }
                        if (token) {
                            loadBalance(token).catch(() => {});
                        }
                    }
                }
            } catch (error) {
                console.error('[PvpBattleSystem] 金币奖励发放失败:', error);
                // 金币奖励失败不影响游戏流程
            }
            
            // 🍖 发放食物奖励
            try {
                if (isWinner) {
                    await grantPvpWinReward(showFoodRewardToast);
                    console.log('[PvpBattleSystem] PvP胜利食物奖励发放成功');
                } else {
                    await grantPvpLoseReward(showFoodRewardToast);
                    console.log('[PvpBattleSystem] PvP失败安慰奖励发放成功');
                }
            } catch (error) {
                console.error('[PvpBattleSystem] 食物奖励发放失败:', error);
                // 奖励失败不影响游戏流程
            }
        }
        handleClose();
    }, [battleResult, addXp, addCoins, handleClose, user, currentRoom, token, loadBalance]);

    if (!isOpen) return null;

    return (
        <AnimatePresence mode="wait">
            {phase === 'lobby' && (
                <PvpLobby
                    key="lobby"
                    onClose={handleClose}
                    onStartBattle={handleStartBattle}
                />
            )}

            {phase === 'waiting' && (
                <PvpRoomWaiting
                    key="waiting"
                    onClose={handleClose}
                    onStartBattle={handleBattleStart}
                />
            )}

            {phase === 'battle' && (
                <PvpBattleRound
                    key="battle"
                    opponent={
                        currentRoom?.guestPlayer && isAIOpponent(currentRoom.guestPlayer) 
                            ? currentRoom.guestPlayer 
                            : null // 真人对战时传 null
                    }
                    isRealPlayer={isRealBattleRef.current || !!isRealPlayerBattle}
                    roomId={currentRoom?.id}
                    playerId={user?.id?.toString()}
                    isHost={!!isHost}
                    opponentName={
                        isHost 
                            ? (currentRoom?.guestPlayer as any)?.username || '对手'
                            : currentRoom?.hostPlayer?.username || '房主'
                    }
                    onComplete={handleBattleRoundComplete}
                    onClose={handleClose}
                />
            )}

            {phase === 'quiz' && (
                <PvpQuizRound
                    key="quiz"
                    onComplete={handleQuizComplete}
                    onClose={handleClose}
                />
            )}

            {phase === 'coding' && (
                <PvpCodingRound
                    key="coding"
                    onComplete={handleCodingComplete}
                    onClose={handleClose}
                />
            )}

            {phase === 'result' && battleResult && (
                <PvpResultModal
                    key="result"
                    result={battleResult}
                    roundScores={roundScores}
                    onClose={handleClaimRewards}
                />
            )}
        </AnimatePresence>
    );
}
