"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Clock, X } from "lucide-react";

interface BattleResultProps {
    result: {
        room_id: string;
        winner_id: number | null;
        player1_id: number;
        player2_id: number;
        player1_score: number;
        player2_score: number;
        player1_time: number | null;
        player2_time: number | null;
        player1_rank_change: number;
        player2_rank_change: number;
    };
    currentUserId: number;
    onClose: () => void;
    onRematch?: () => void;
}

export default function BattleResult({ result, currentUserId, onClose, onRematch }: BattleResultProps) {
    const isWinner = result.winner_id === currentUserId;
    const isDraw = result.winner_id === null;
    const isPlayer1 = currentUserId === result.player1_id;

    const myScore = isPlayer1 ? result.player1_score : result.player2_score;
    const opponentScore = isPlayer1 ? result.player2_score : result.player1_score;
    const myTime = isPlayer1 ? result.player1_time : result.player2_time;
    const opponentTime = isPlayer1 ? result.player2_time : result.player1_time;
    const rankChange = isPlayer1 ? result.player1_rank_change : result.player2_rank_change;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-2xl p-8 max-w-2xl w-full relative shadow-lg">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>

                <div className="text-center mb-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="text-8xl mb-4">{isDraw ? '🤝' : isWinner ? '🏆' : '😢'}</motion.div>
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className={`text-4xl font-pixel mb-2 ${isDraw ? 'text-yellow-400' : isWinner ? 'text-green-400' : 'text-red-400'}`}>{isDraw ? '平局！' : isWinner ? '胜利！' : '失败'}</motion.h2>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-slate-500">{isDraw ? '势均力敌的对手' : isWinner ? '干得漂亮！' : '继续加油！'}</motion.p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className={`bg-blue-900/30 rounded-lg p-6 border-2 ${isWinner ? 'border-green-500' : 'border-slate-700'}`}>
                        <div className="text-center mb-4"><div className="text-2xl mb-2">👤</div><div className="text-white font-pixel">你</div></div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><span className="text-slate-500 text-sm">得分</span><span className="text-white font-bold text-xl">{myScore}</span></div>
                            {myTime !== null && (<div className="flex items-center justify-between"><span className="text-slate-500 text-sm flex items-center gap-1"><Clock className="w-3 h-3" />时间</span><span className="text-white">{(myTime / 1000).toFixed(2)}s</span></div>)}
                        </div>
                    </motion.div>

                    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className={`bg-blue-900/30 rounded-lg p-6 border-2 ${!isWinner && !isDraw ? 'border-green-500' : 'border-slate-700'}`}>
                        <div className="text-center mb-4"><div className="text-2xl mb-2">🎮</div><div className="text-white font-pixel">对手</div></div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><span className="text-slate-500 text-sm">得分</span><span className="text-white font-bold text-xl">{opponentScore}</span></div>
                            {opponentTime !== null && (<div className="flex items-center justify-between"><span className="text-slate-500 text-sm flex items-center gap-1"><Clock className="w-3 h-3" />时间</span><span className="text-white">{(opponentTime / 1000).toFixed(2)}s</span></div>)}
                        </div>
                    </motion.div>
                </div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="bg-blue-900/30 border border-slate-700 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><Trophy className="w-6 h-6 text-blue-400" /><span className="text-white font-pixel">段位积分</span></div>
                        <div className="flex items-center gap-2">
                            {rankChange > 0 ? (<><TrendingUp className="w-5 h-5 text-green-400" /><span className="text-green-400 font-bold text-xl">+{rankChange}</span></>) : rankChange < 0 ? (<><TrendingDown className="w-5 h-5 text-red-400" /><span className="text-red-400 font-bold text-xl">{rankChange}</span></>) : (<span className="text-gray-400 font-bold text-xl">0</span>)}
                        </div>
                    </div>
                </motion.div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-pixel py-3 rounded-lg transition-colors">返回</button>
                    {onRematch && (<button onClick={onRematch} className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-pixel py-3 rounded-lg transition-all">再来一局</button>)}
                </div>
            </motion.div>
        </div>
    );
}
