"use client";

import { motion } from "framer-motion";
import { Gamepad2, BookOpen, Trophy, LogOut, User, Coins, Zap } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { useI18n } from "@/lib/i18n";
import { TRAINING_CURRENCY_LABEL } from "@/lib/gameEconomy";

interface MainMenuProps {
    onNavigateToWorld: () => void;
    onNavigateToCampaign: () => void;
    onOpenLeaderboard: () => void;
}

export default function MainMenu({
    onNavigateToWorld,
    onNavigateToCampaign,
    onOpenLeaderboard
}: MainMenuProps) {
    const { user, logout } = useAuthStore();
    const { level, xp, coins } = useGameStore();
    const { t, language } = useI18n();

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] text-white p-8">
            {/* Header with User Info */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-pixel text-blue-400 pixel-text-shadow mb-2">
                            Python 冒险岛
                        </h1>
                        <p className="text-slate-400">
                            {language === 'cn' ? '欢迎回来' : 'Welcome back'}, {user?.username}!
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        {language === 'cn' ? '登出' : 'Logout'}
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400">Level</div>
                            <div className="text-2xl font-pixel text-blue-400">{level}</div>
                        </div>
                    </div>
                    <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 flex items-center gap-3">
                        <Zap className="w-8 h-8 text-green-400" />
                        <div>
                            <div className="text-xs text-slate-400">XP</div>
                            <div className="text-2xl font-pixel text-green-400">{xp}</div>
                        </div>
                    </div>
                    <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4 flex items-center gap-3">
                        <Coins className="w-8 h-8 text-amber-400" />
                        <div>
                            <div className="text-xs text-slate-400">{TRAINING_CURRENCY_LABEL}</div>
                            <div className="text-2xl font-pixel text-amber-400">{coins}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Navigation Cards */}
            <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-pixel text-blue-400 mb-6 text-center">
                    {language === 'cn' ? '选择冒险' : 'Choose Your Adventure'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Open World Card */}
                    <motion.button
                        onClick={onNavigateToWorld}
                        className="relative bg-slate-800 border-2 border-purple-700 rounded-2xl p-8 hover:scale-105 transition-transform shadow-lg shadow-purple-900/30"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <Gamepad2 className="w-16 h-16 text-purple-500" />
                            <h3 className="text-3xl font-pixel text-purple-400">
                                {language === 'cn' ? '开放世界' : 'Open World'}
                            </h3>
                            <p className="text-slate-400 text-center">
                                {language === 'cn'
                                    ? '探索像素世界，挑战技能神殿，解锁新能力'
                                    : 'Explore the pixel world, challenge skill shrines, unlock new abilities'}
                            </p>
                        </div>
                        <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-pixel">
                            {language === 'cn' ? '推荐' : 'RECOMMENDED'}
                        </div>
                    </motion.button>

                    {/* Campaign Mode Card */}
                    <motion.button
                        onClick={onNavigateToCampaign}
                        className="relative bg-slate-800 border-2 border-sky-700 rounded-2xl p-8 hover:scale-105 transition-transform shadow-lg shadow-sky-900/30"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <BookOpen className="w-16 h-16 text-sky-500" />
                            <h3 className="text-3xl font-pixel text-sky-400">
                                {language === 'cn' ? '剧情模式' : 'Campaign Mode'}
                            </h3>
                            <p className="text-slate-400 text-center">
                                {language === 'cn'
                                    ? '通过章节学习Python，从基础到高级'
                                    : 'Learn Python through chapters, from basics to advanced'}
                            </p>
                        </div>
                    </motion.button>
                </div>

                {/* Leaderboard Button */}
                <motion.button
                    onClick={onOpenLeaderboard}
                    className="w-full bg-slate-800 border-2 border-amber-700 rounded-2xl p-6 hover:scale-105 transition-transform flex items-center justify-center gap-4 shadow-lg shadow-amber-900/30"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Trophy className="w-12 h-12 text-amber-500" />
                    <h3 className="text-2xl font-pixel text-amber-400">
                        {language === 'cn' ? '🏆 排行榜' : '🏆 Leaderboard'}
                    </h3>
                </motion.button>
            </div>
        </div>
    );
}
