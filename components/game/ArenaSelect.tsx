"use client";

import { useState } from 'react';
import { ARENA_CHALLENGES, ArenaChallenge } from '@/types/arena';
import { Trophy, Clock, Star } from 'lucide-react';

interface ArenaSelectProps {
    onSelectChallenge: (challenge: ArenaChallenge) => void;
    onClose: () => void;
}

export default function ArenaSelect({ onSelectChallenge, onClose }: ArenaSelectProps) {
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27]/95 via-[#1a1e3e]/95 to-[#0a0e27]/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="max-w-6xl w-full">
                {/* 头部 */}
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Trophy className="w-12 h-12 text-blue-400" />
                        <h1 className="text-5xl font-pixel text-blue-400">竞技场</h1>
                        <Trophy className="w-12 h-12 text-blue-400" />
                    </div>
                    <p className="text-xl text-slate-600">
                        选择挑战，证明你的编程实力！每个挑战限时120秒
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-600 font-bold rounded-lg transition-colors border border-slate-700"
                    >
                        ← 返回世界
                    </button>
                </div>

                {/* 挑战列表 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {ARENA_CHALLENGES.map((challenge, index) => (
                        <div
                            key={challenge.id}
                            className="bg-slate-700/90 backdrop-blur-sm rounded-xl p-6 border-2 border-slate-700 hover:border-emerald-400 transition-all cursor-pointer group transform hover:scale-105 shadow-lg"
                            onClick={() => onSelectChallenge(challenge)}
                        >
                            {/* 挑战编号 */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-6xl font-pixel text-blue-400">
                                    #{index + 1}
                                </div>
                                <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                                    challenge.difficulty === 'easy' ? 'bg-green-500' :
                                    challenge.difficulty === 'medium' ? 'bg-yellow-500' :
                                    'bg-red-900/300'
                                } text-white`}>
                                    {challenge.difficulty === 'easy' ? '简单' :
                                     challenge.difficulty === 'medium' ? '中等' : '困难'}
                                </div>
                            </div>

                            {/* 标题 */}
                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                                {challenge.title}
                            </h3>

                            {/* 描述 */}
                            <p className="text-slate-500 mb-4 text-sm leading-relaxed">
                                {challenge.description}
                            </p>

                            {/* 挑战信息 */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sky-500">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">时间限制: {challenge.timeLimit}秒</span>
                                </div>
                                <div className="flex items-center gap-2 text-amber-500">
                                    <Star className="w-4 h-4" />
                                    <span className="text-sm">奖励积分: {challenge.points}</span>
                                </div>
                            </div>

                            {/* 类型标签 */}
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    challenge.type === 'time' ? 'bg-blue-500' :
                                    challenge.type === 'efficiency' ? 'bg-purple-500' :
                                    'bg-red-900/300'
                                } text-white`}>
                                    {challenge.type === 'time' ? '⏱️ 速度挑战' :
                                     challenge.type === 'efficiency' ? '⚡ 效率挑战' :
                                     '💀 生存挑战'}
                                </span>
                            </div>

                            {/* 开始按钮 */}
                            <button className="w-full mt-4 bg-blue-600 group-hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md">
                                开始挑战 →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 底部提示 */}
                <div className="mt-8 text-center text-slate-500 text-sm">
                    <p>💡 提示：完成挑战可获得积分，用于解锁技能树中的新技能</p>
                </div>
            </div>
        </div>
    );
}
