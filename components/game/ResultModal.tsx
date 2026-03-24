"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Coins, Zap, X } from "lucide-react";

interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    isWinner: boolean;
    xpGained: number;
    coinsGained: number;
    rankChange: number;
    title?: string;
    message?: string;
}

export default function ResultModal({
    isOpen,
    onClose,
    isWinner,
    xpGained,
    coinsGained,
    rankChange,
    title,
    message
}: ResultModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    className={`backdrop-blur-md ${
                        isWinner 
                            ? 'bg-amber-900/95 border-amber-500/30' 
                            : 'bg-slate-800 border-slate-600'
                    } border-2 rounded-2xl p-8 max-w-md w-full relative shadow-lg`}
                >
                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* 标题图标 */}
                    <div className="flex justify-center mb-6">
                        {isWinner ? (
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", duration: 0.6 }}
                            >
                                <Trophy size={80} className="text-yellow-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.6 }}
                            >
                                <div className="text-6xl">😢</div>
                            </motion.div>
                        )}
                    </div>

                    {/* 标题 */}
                    <h2 className={`text-3xl font-bold text-center mb-2 font-pixel ${
                        isWinner ? 'text-amber-500' : 'text-slate-500'
                    }`}>
                        {title || (isWinner ? '🎉 胜利！' : '失败')}
                    </h2>

                    {/* 消息 */}
                    {message && (
                        <p className="text-center text-slate-500 mb-6">
                            {message}
                        </p>
                    )}

                    {/* 奖励列表 */}
                    <div className="space-y-4 mb-6">
                        {/* 经验值 */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-between bg-blue-900/30 rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Zap className="text-blue-400" size={24} />
                                <span className="text-white font-semibold">经验值</span>
                            </div>
                            <span className="text-blue-400 font-bold text-xl">
                                +{xpGained}
                            </span>
                        </motion.div>

                        {/* 金币 */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-between bg-blue-900/30 rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3">
                                <Coins className="text-yellow-400" size={24} />
                                <span className="text-white font-semibold">金币</span>
                            </div>
                            <span className="text-yellow-400 font-bold text-xl">
                                +{coinsGained}
                            </span>
                        </motion.div>

                        {/* 排名变化 */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-between bg-blue-900/30 rounded-lg p-4"
                        >
                            <div className="flex items-center gap-3">
                                {rankChange > 0 ? (
                                    <TrendingUp className="text-green-400" size={24} />
                                ) : (
                                    <TrendingDown className="text-red-400" size={24} />
                                )}
                                <span className="text-white font-semibold">排名变化</span>
                            </div>
                            <span className={`font-bold text-xl ${
                                rankChange > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {rankChange > 0 ? '+' : ''}{rankChange}
                            </span>
                        </motion.div>
                    </div>

                    {/* 确认按钮 */}
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={onClose}
                        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                            isWinner
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                    >
                        确定
                    </motion.button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
