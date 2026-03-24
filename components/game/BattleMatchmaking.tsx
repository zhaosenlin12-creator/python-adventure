"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, TrendingUp, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/config/api";

interface BattleMatchmakingProps {
    isOpen: boolean;
    onClose: () => void;
    onMatchFound: (roomId: string, opponentName: string, taskId: number) => void;
}

export default function BattleMatchmaking({ isOpen, onClose, onMatchFound }: BattleMatchmakingProps) {
    const [status, setStatus] = useState<'idle' | 'queued' | 'matched'>('idle');
    const [dots, setDots] = useState('');
    const [matchTimeout, setMatchTimeout] = useState<number>(15); // 15秒倒计时
    const [isAiMatch, setIsAiMatch] = useState(false);
    const { token } = useAuthStore();

    useEffect(() => {
        if (status === 'queued') {
            const interval = setInterval(() => {
                setDots(prev => prev.length >= 3 ? '' : prev + '.');
            }, 500);
            return () => clearInterval(interval);
        }
    }, [status]);

    // 匹配倒计时
    useEffect(() => {
        if (status === 'queued' && matchTimeout > 0) {
            const timer = setTimeout(() => {
                setMatchTimeout(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (status === 'queued' && matchTimeout === 0) {
            // 超时后匹配AI
            matchWithAI();
        }
    }, [status, matchTimeout]);

    const matchWithAI = () => {
        setIsAiMatch(true);
        setStatus('matched');
        setTimeout(() => {
            // 生成AI对手信息
            const aiNames = ['CodeBot', 'AlgoMaster', 'BugSlayer', 'SyntaxNinja', 'LogicKing'];
            const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
            const aiRoomId = `ai_${Date.now()}`;
            const aiTaskId = Math.floor(Math.random() * 10) + 1; // 随机题目ID
            onMatchFound(aiRoomId, `AI-${aiName}`, aiTaskId);
        }, 1500);
    };

    const joinQueue = async () => {
        if (!token) return;
        setStatus('queued');
        setMatchTimeout(15); // 重置倒计时
        setIsAiMatch(false);

        try {
            const response = await fetch(`${getApiBaseUrl()}/battles/queue`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();

            if (data.status === 'matched') {
                setStatus('matched');
                setTimeout(() => {
                    onMatchFound(data.room_id, data.opponent_username, data.task_id);
                }, 1500);
            } else if (data.status === 'queued') {
                pollMatchStatus();
            }
        } catch (error) {
            console.error('匹配失败:', error);
            setStatus('idle');
        }
    };

    const pollMatchStatus = async () => {
        const interval = setInterval(async () => {
            if (!token || matchTimeout === 0) {
                clearInterval(interval);
                return;
            }

            try {
                const response = await fetch(`${getApiBaseUrl()}/battles/status`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                const data = await response.json();

                if (data.status === 'in_room') {
                    clearInterval(interval);
                    setStatus('matched');
                    setTimeout(() => {
                        onMatchFound(data.room_id, '对手', 0);
                    }, 1500);
                }
            } catch (error) {
                console.error('检查状态失败:', error);
            }
        }, 2000);

        // 15秒后停止轮询，让倒计时触发AI匹配
        setTimeout(() => clearInterval(interval), 15000);
    };

    const cancelQueue = async () => {
        if (!token) return;

        try {
            await fetch(`${getApiBaseUrl()}/battles/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setStatus('idle');
        } catch (error) {
            console.error('取消匹配失败:', error);
        }
    };

    // 重置状态当模态框关闭时
    useEffect(() => {
        if (!isOpen) {
            setStatus('idle');
            setMatchTimeout(15);
            setIsAiMatch(false);
            setDots('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-2xl p-8 max-w-md w-full relative shadow-lg"
            >
                <button onClick={() => { if (status === 'queued') cancelQueue(); onClose(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">⚔️</div>
                    <h2 className="text-3xl font-pixel text-blue-400 mb-2">PvP 对战</h2>
                    <p className="text-slate-500 text-sm">与其他玩家实时代码对战</p>
                </div>

                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="bg-blue-900/30 rounded-lg p-6 space-y-4">
                                <div className="flex items-center gap-3"><Swords className="w-5 h-5 text-blue-400" /><span className="text-white font-medium">实时对战</span></div>
                                <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-blue-400" /><span className="text-white font-medium">段位系统</span></div>
                                <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-blue-400" /><span className="text-white font-medium">ELO积分</span></div>
                            </div>
                            <button onClick={joinQueue} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-pixel text-xl py-4 rounded-lg transition-all transform hover:scale-105">开始匹配</button>
                        </motion.div>
                    )}

                    {status === 'queued' && (
                        <motion.div key="queued" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 text-center">
                            <div className="relative">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-24 h-24 mx-auto border-4 border-blue-600 border-t-transparent rounded-full" />
                                <div className="absolute inset-0 flex items-center justify-center text-4xl">🎯</div>
                            </div>
                            <div>
                                <p className="text-xl font-pixel text-white mb-2">正在匹配{dots}</p>
                                <p className="text-slate-500 text-sm">寻找实力相近的对手</p>
                                <div className="mt-4 text-blue-400 font-pixel text-lg">
                                    匹配中 {matchTimeout}秒
                                </div>
                            </div>
                            <button onClick={cancelQueue} className="w-full bg-red-600 hover:bg-red-700 text-white font-pixel py-3 rounded-lg transition-colors">取消匹配</button>
                        </motion.div>
                    )}

                    {status === 'matched' && (
                        <motion.div key="matched" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: 2 }} className="text-8xl">{isAiMatch ? '🤖' : '⚔️'}</motion.div>
                            <div>
                                <p className="text-2xl font-pixel text-blue-400 mb-2">匹配成功！</p>
                                <p className="text-slate-500">{isAiMatch ? '即将与AI对手对战...' : '准备进入对战房间...'}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
