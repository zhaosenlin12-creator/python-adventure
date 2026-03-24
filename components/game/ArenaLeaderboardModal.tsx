'use client';

import { useState, useEffect } from 'react';
import { X, Trophy, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getApiBaseUrl } from '@/lib/config/api';

interface ArenaLeaderboardEntry {
    rank: number;
    user_id: string;
    username: string;
    arena_score: number;
    arena_high_score: number;
    level: number;
    rank_title: string;
}

interface ArenaLeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ArenaLeaderboardModal({ isOpen, onClose }: ArenaLeaderboardModalProps) {
    const [entries, setEntries] = useState<ArenaLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/leaderboard/arena`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            } else {
                // Fallback mock data
                console.warn('Failed to fetch arena leaderboard, using mock data');
                setEntries([
                    { rank: 1, user_id: '1', username: '竞技之王', arena_score: 5000, arena_high_score: 5500, level: 15, rank_title: '传奇' },
                    { rank: 2, user_id: '2', username: '代码战神', arena_score: 4200, arena_high_score: 4800, level: 12, rank_title: '大师' },
                    { rank: 3, user_id: '3', username: '算法高手', arena_score: 3500, arena_high_score: 4000, level: 10, rank_title: '专家' },
                    { rank: 4, user_id: '4', username: '编程达人', arena_score: 2800, arena_high_score: 3200, level: 9, rank_title: '高手' },
                    { rank: 5, user_id: '5', username: '挑战者', arena_score: 2100, arena_high_score: 2500, level: 7, rank_title: '进阶' },
                ]);
            }
        } catch (error) {
            console.error('Error fetching arena leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 backdrop-blur-md rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border-2 border-slate-700 flex flex-col">

                {/* Header */}
                <div className="bg-blue-900/30 p-4 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-blue-400" />
                        <h2 className="text-2xl font-bold text-blue-400">🏆 竞技场排行榜</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div
                                key={entry.user_id}
                                className={`flex items-center p-3 rounded-lg border ${String(entry.user_id) === String(user?.id)
                                    ? 'bg-blue-900/20 border-blue-500'
                                    : 'bg-slate-800/80 border-slate-700 hover:bg-blue-700'
                                    } transition`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-4 ${entry.rank === 1 ? 'bg-yellow-500 text-black' :
                                    entry.rank === 2 ? 'bg-gray-300 text-black' :
                                        entry.rank === 3 ? 'bg-orange-600 text-white' :
                                            'bg-gray-700 text-gray-300'
                                    }`}>
                                    {entry.rank}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-white">{entry.username}</div>
                                    <div className="text-xs text-slate-500">{entry.rank_title} · Lv.{entry.level}</div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="flex items-center gap-3 justify-end">
                                        <div>
                                            <div className="text-sm font-bold text-blue-400">{entry.arena_score}</div>
                                            <div className="text-xs text-slate-400">当前积分</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-amber-500">{entry.arena_high_score}</div>
                                            <div className="text-xs text-slate-400">最高积分</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-blue-900/30 border-t border-slate-700 flex justify-between items-center text-sm text-slate-500">
                    <div>
                        我的排名: <span className="text-white font-bold">#{entries.find(e => String(e.user_id) === String(user?.id))?.rank || '-'}</span>
                    </div>
                    <button
                        onClick={fetchLeaderboard}
                        className="flex items-center gap-2 hover:text-white transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        刷新
                    </button>
                </div>
            </div>
        </div>
    );
}
