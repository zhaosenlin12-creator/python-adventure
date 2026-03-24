"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/config/api";
import BattleMatchmaking from "./BattleMatchmaking";
import BattleRoom from "./BattleRoom";
import BattleResult from "./BattleResult";

interface RankSystemProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RankSystem({ isOpen, onClose }: RankSystemProps) {
    const [userRank, setUserRank] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [showMatchmaking, setShowMatchmaking] = useState(false);
    const [battleRoom, setBattleRoom] = useState<any>(null);
    const [battleResult, setBattleResult] = useState<any>(null);
    const { token, user } = useAuthStore();

    useEffect(() => { if (isOpen) { loadUserRank(); loadLeaderboard(); } }, [isOpen]);

    const loadUserRank = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${getApiBaseUrl()}/battles/rank`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            setUserRank(data);
        } catch (error) { console.error('加载段位失败:', error); }
    };

    const loadLeaderboard = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${getApiBaseUrl()}/battles/leaderboard?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            setLeaderboard(data);
        } catch (error) { console.error('加载排行榜失败:', error); }
    };

    const getRankColor = (tier: string) => {
        const colors: any = { bronze: 'text-orange-600', silver: 'text-gray-400', gold: 'text-yellow-400', platinum: 'text-cyan-400', diamond: 'text-blue-400' };
        return colors[tier] || 'text-gray-400';
    };

    const getRankIcon = (tier: string) => {
        const icons: any = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };
        return icons[tier] || '🏅';
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-lg">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>

                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-3xl font-pixel text-blue-400 mb-2">段位系统</h2>
                        <p className="text-slate-500">通过对战提升你的段位</p>
                    </div>

                    {userRank && (
                        <div className="bg-blue-900/30 border border-slate-700 rounded-xl p-6 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-6xl">{getRankIcon(userRank.rank_tier)}</div>
                                    <div>
                                        <div className={`text-2xl font-pixel ${getRankColor(userRank.rank_tier)}`}>{userRank.rank_tier_name}</div>
                                        <div className="text-slate-500 text-sm">{userRank.rank_points} 积分</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-bold text-2xl">{userRank.wins}胜 {userRank.losses}负</div>
                                    <div className="text-slate-500 text-sm">胜率 {userRank.win_rate}%</div>
                                    <div className="text-blue-400 text-sm">最高连胜 {userRank.max_win_streak}</div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-sm text-slate-500 mb-2"><span>当前段位</span><span>下一段位</span></div>
                                <div className="w-full h-4 bg-blue-900/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-600 to-teal-500" style={{ width: `${((userRank.rank_points % 200) / 200) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => setShowMatchmaking(true)} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-pixel text-xl py-4 rounded-lg transition-all transform hover:scale-105 mb-8 flex items-center justify-center gap-2">
                        <Swords className="w-6 h-6" />开始对战
                    </button>

                    <div>
                        <h3 className="text-xl font-pixel text-white mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-400" />排行榜 TOP 10</h3>
                        <div className="space-y-2">
                            {leaderboard.map((player, index) => (
                                <div key={player.user_id} className={`bg-blue-900/30 rounded-lg p-4 flex items-center justify-between ${player.user_id === user?.id ? 'border-2 border-blue-500' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-500'}`}>#{index + 1}</div>
                                        <div className="text-2xl">{getRankIcon(player.rank_tier)}</div>
                                        <div>
                                            <div className="text-white font-medium">{player.username}</div>
                                            <div className="text-sm text-slate-500">{player.wins}胜 {player.losses}负 · 胜率 {player.win_rate}%</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-pixel ${getRankColor(player.rank_tier)}`}>{player.rank_tier_name}</div>
                                        <div className="text-slate-500 text-sm">{player.rank_points} 积分</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {showMatchmaking && (<BattleMatchmaking isOpen={showMatchmaking} onClose={() => setShowMatchmaking(false)} onMatchFound={(roomId, opponentName, taskId) => { setShowMatchmaking(false); setBattleRoom({ roomId, opponentName, taskId }); }} />)}
            {battleRoom && (<BattleRoom roomId={battleRoom.roomId} opponentName={battleRoom.opponentName} taskId={battleRoom.taskId} onBattleEnd={(result) => { setBattleRoom(null); setBattleResult(result); loadUserRank(); }} onClose={() => setBattleRoom(null)} />)}
            {battleResult && user && (<BattleResult result={battleResult} currentUserId={user.id} onClose={() => { setBattleResult(null); loadLeaderboard(); }} onRematch={() => { setBattleResult(null); setShowMatchmaking(true); }} />)}
        </>
    );
}
