"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface LeaderboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_LEADERBOARD = [
    { rank: 1, name: "CodeWizard99", xp: 15400, streak: 12 },
    { rank: 2, name: "PythonMaster", xp: 14200, streak: 8 },
    { rank: 3, name: "SenlinStudent", xp: 12800, streak: 5 },
    { rank: 4, name: "BugHunter", xp: 11000, streak: 3 },
    { rank: 5, name: "LoopLover", xp: 9500, streak: 1 },
];

export default function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
    const { t } = useI18n();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        className="w-full max-w-2xl bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-xl p-6 relative shadow-lg"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-pixel text-blue-400 flex items-center justify-center gap-4">
                                <Trophy className="w-8 h-8" />
                                {t('ui.leaderboard')}
                                <Trophy className="w-8 h-8" />
                            </h2>
                            <p className="text-slate-500">{t('ui.leaderboard.subtitle')}</p>
                        </div>

                        <div className="space-y-4">
                            {MOCK_LEADERBOARD.map((player) => (
                                <div
                                    key={player.rank}
                                    className={`flex items-center justify-between p-4 rounded border-2 ${player.rank === 1 ? 'bg-amber-900/30 border-amber-400' :
                                        player.rank === 2 ? 'bg-slate-700/80 border-slate-400' :
                                            player.rank === 3 ? 'bg-orange-900/30 border-orange-400' :
                                                'bg-slate-800/80 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 flex items-center justify-center font-bold text-xl ${player.rank <= 3 ? 'text-blue-400' : 'text-slate-400'
                                            }`}>
                                            #{player.rank}
                                        </div>
                                        <div className="font-pixel text-white">{player.name}</div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-2 text-orange-400" title={t('ui.dailyStreak')}>
                                            <Flame className="w-4 h-4" />
                                            <span>{player.streak}</span>
                                        </div>
                                        <div className="text-blue-400 font-bold w-20 text-right">
                                            {player.xp.toLocaleString()} XP
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
