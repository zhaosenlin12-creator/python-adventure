"use client";

import { ARENA_CHALLENGES, ArenaChallenge } from '@/types/arena';
import { Clock, Star, Trophy } from 'lucide-react';

interface ArenaSelectProps {
    onSelectChallenge: (challenge: ArenaChallenge) => void;
    onClose: () => void;
}

export default function ArenaSelect({ onSelectChallenge, onClose }: ArenaSelectProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 p-8 backdrop-blur-sm">
            <div className="w-full max-w-6xl">
                <div className="mb-8 text-center">
                    <div className="mb-4 flex items-center justify-center gap-4">
                        <Trophy className="h-12 w-12 text-blue-400" />
                        <h1 className="text-5xl font-pixel text-blue-400">竞技场</h1>
                        <Trophy className="h-12 w-12 text-blue-400" />
                    </div>
                    <p className="text-xl text-slate-300">
                        选择挑战，检验你的反应、策略和编程节奏。每个挑战限时 120 秒。
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-bold text-slate-200 transition-colors hover:bg-slate-700"
                    >
                        返回世界
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {ARENA_CHALLENGES.map((challenge, index) => (
                        <div
                            key={challenge.id}
                            className="group cursor-pointer rounded-xl border-2 border-slate-700 bg-slate-800/90 p-6 shadow-lg transition-all hover:scale-105 hover:border-emerald-400"
                            onClick={() => onSelectChallenge(challenge)}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div className="font-pixel text-6xl text-blue-400">#{index + 1}</div>
                                <div
                                    className={`rounded-full px-4 py-2 text-sm font-bold text-white ${
                                        challenge.difficulty === 'easy'
                                            ? 'bg-green-500'
                                            : challenge.difficulty === 'medium'
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                    }`}
                                >
                                    {challenge.difficulty === 'easy'
                                        ? '简单'
                                        : challenge.difficulty === 'medium'
                                            ? '中等'
                                            : '困难'}
                                </div>
                            </div>

                            <h3 className="mb-3 text-2xl font-bold text-white transition-colors group-hover:text-blue-400">
                                {challenge.title}
                            </h3>

                            <p className="mb-4 text-sm leading-relaxed text-slate-300">
                                {challenge.description}
                            </p>

                            <div className="mb-4 space-y-2">
                                <div className="flex items-center gap-2 text-sky-300">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">时间限制：{challenge.timeLimit} 秒</span>
                                </div>
                                <div className="flex items-center gap-2 text-amber-300">
                                    <Star className="h-4 w-4" />
                                    <span className="text-sm">挑战积分：{challenge.points}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                                        challenge.type === 'time'
                                            ? 'bg-blue-500'
                                            : challenge.type === 'efficiency'
                                                ? 'bg-purple-500'
                                                : 'bg-rose-500'
                                    }`}
                                >
                                    {challenge.type === 'time'
                                        ? '速度挑战'
                                        : challenge.type === 'efficiency'
                                            ? '效率挑战'
                                            : '生存挑战'}
                                </span>
                            </div>

                            <button className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-bold text-white shadow-md transition-colors group-hover:bg-blue-700">
                                开始挑战
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center text-sm text-slate-400">
                    <p>提示：竞技场积分只用于排行榜；技能请在训练册用金币学习。</p>
                </div>
            </div>
        </div>
    );
}
