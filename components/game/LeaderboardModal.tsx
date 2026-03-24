'use client';

import { useState, useEffect } from 'react';
import { X, Trophy, Globe, RefreshCw, Swords } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getApiBaseUrl } from '@/lib/config/api';
import { getRankInfo } from '@/lib/rankSystem';

interface LeaderboardEntry {
    user_id?: string;
    username: string;
    rank: number;
    level?: number;
    experience?: number;
    completed_tasks?: number;
    rank_title?: string;
    total_score?: number;
    arena_score?: number;
}

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
    const [activeTab, setActiveTab] = useState<'global' | 'arena'>('global');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();

    const fetchLeaderboard = async () => {
        setLoading(true);
        
        // 设置超时保护
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
            const endpoint = activeTab === 'global' 
                ? `${getApiBaseUrl()}/leaderboard/global?sort_by=experience`
                : `${getApiBaseUrl()}/leaderboard/arena`;
            
            const res = await fetch(endpoint, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                const mappedData = data.map((entry: LeaderboardEntry) => ({
                    ...entry,
                    user_id: entry.user_id || String(entry.rank),
                }));
                setEntries(mappedData);
            } else {
                setEntries([]);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            // 静默处理错误，不在控制台输出（避免刷屏）
            if (error instanceof Error && error.name !== 'AbortError') {
                console.warn('[Leaderboard] 加载失败，后端可能未运行');
            }
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard();
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    const renderRankBadge = (experience: number | undefined) => {
        const rankInfo = getRankInfo(experience || 0);
        return (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${rankInfo.tier.bgColor}`}>
                <span>{rankInfo.tier.icon}</span>
                <span className={rankInfo.tier.color}>{rankInfo.displayName}</span>
            </div>
        );
    };

    const currentUserEntry = entries.find(e => 
        String(e.user_id) === String(user?.id) || e.username === user?.username
    );
    const currentUserRank = currentUserEntry && activeTab === 'global' 
        ? getRankInfo(currentUserEntry.experience || 0) 
        : null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border-2 border-slate-700 flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-white drop-shadow-lg" />
                        <h2 className="text-2xl font-bold text-white drop-shadow">🏆 排行榜</h2>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition hover:bg-white/20 p-1 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex p-2 bg-slate-700/80 gap-2">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
                            activeTab === 'global' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                        <Globe className="w-4 h-4" />
                        全局段位榜
                    </button>
                    <button
                        onClick={() => setActiveTab('arena')}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${
                            activeTab === 'arena' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                        <Swords className="w-4 h-4" />
                        竞技场排名
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-yellow-200/60">
                            <Trophy className="w-12 h-12 mb-2 opacity-50" />
                            <p>暂无排行数据</p>
                            <p className="text-sm">快去游戏获取经验吧！</p>
                        </div>
                    ) : (
                        entries.map((entry) => {
                            const isCurrentUser = String(entry.user_id) === String(user?.id) || entry.username === user?.username;
                            // 🔥 全局排行榜用经验值计算段位，竞技场用后端返回的rank_title
                            const rankInfo = activeTab === 'global' ? getRankInfo(entry.experience || 0) : null;
                            // 竞技场段位直接使用后端返回的rank_title
                            const arenaRankTitle = activeTab === 'arena' ? (entry.rank_title || '青铜 III') : '';
                            const displayRankName = activeTab === 'global' ? rankInfo?.displayName : arenaRankTitle;
                            const displayRankIcon = activeTab === 'global' ? rankInfo?.tier.icon : '🏆';
                            const displayRankColor = activeTab === 'global' ? rankInfo?.tier.color : 'text-yellow-400';
                            const displayRankBg = activeTab === 'global' ? rankInfo?.tier.bgColor : 'bg-gradient-to-r from-yellow-600/50 to-orange-600/50';
                            
                            return (
                                <div
                                    key={entry.user_id || entry.rank}
                                    className={`flex items-center p-3 rounded-lg border transition ${
                                        isCurrentUser 
                                            ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/50' 
                                            : 'bg-black/20 border-yellow-600/20 hover:bg-black/30'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-3 ${
                                        entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg' :
                                        entry.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                        entry.rank === 3 ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-amber-900/50 text-yellow-200'
                                    }`}>
                                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-bold truncate ${isCurrentUser ? 'text-cyan-300' : 'text-yellow-100'}`}>
                                                {entry.username}
                                                {isCurrentUser && <span className="ml-1 text-xs text-cyan-400">(我)</span>}
                                            </span>
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${displayRankBg}`}>
                                                <span>{displayRankIcon}</span>
                                                <span className={displayRankColor}>{displayRankName}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-yellow-200/60 mt-0.5">
                                            {activeTab === 'global' 
                                                ? `Lv.${entry.level || 1} · ${(entry.experience || 0).toLocaleString()} 经验`
                                                : `Lv.${entry.level || 1} · ${(entry.arena_score || 0).toLocaleString()} 竞技分`
                                            }
                                        </div>
                                    </div>
                                    <div className="text-right ml-2">
                                        <div className={`text-lg font-bold ${displayRankColor}`}>
                                            {displayRankIcon} {displayRankName}
                                        </div>
                                        <div className="text-xs text-yellow-200/50">
                                            {activeTab === 'global' 
                                                ? `${(entry.experience || 0).toLocaleString()} 经验`
                                                : `${(entry.arena_score || 0).toLocaleString()} 分`
                                            }
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {!loading && (
                        <div className="text-center text-xs text-yellow-200/60 mt-3">
                            当前仅展示前50名，继续提升经验和等级即可冲榜上榜。
                        </div>
                    )}
                </div>

                <div className="p-4 bg-black/40 border-t border-yellow-500/30">
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-yellow-200/60">我的排名:</span>
                            <span className="text-cyan-400 font-bold text-lg">#{currentUserEntry?.rank || '-'}</span>
                            {activeTab === 'global' && currentUserRank && (
                                <>
                                    <span className="text-yellow-600">|</span>
                                    <div className="flex items-center gap-1">
                                        <span>{currentUserRank.tier.icon}</span>
                                        <span className={currentUserRank.tier.color}>{currentUserRank.displayName}</span>
                                    </div>
                                    <span className="text-yellow-600">|</span>
                                    <span className="text-cyan-400">{(currentUserEntry?.experience || 0).toLocaleString()} 经验</span>
                                </>
                            )}
                        </div>
                        <button onClick={fetchLeaderboard} className="flex items-center gap-2 text-yellow-200/60 hover:text-yellow-100 transition bg-yellow-600/20 px-3 py-1 rounded-lg hover:bg-yellow-600/30">
                            <RefreshCw className="w-4 h-4" />
                            刷新
                        </button>
                    </div>
                    {activeTab === 'global' && currentUserRank && currentUserRank.tier.id !== 'legend' && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-yellow-200/60 mb-1">
                                <span>距离下一段位</span>
                                <span>还需 {(currentUserRank.nextRankScore - (currentUserEntry?.experience || 0)).toLocaleString()} 经验</span>
                            </div>
                            <div className="h-2 bg-amber-900/50 rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500`} style={{ width: `${currentUserRank.progress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
