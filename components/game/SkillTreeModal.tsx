'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, ArrowRight, Lock, Unlock, Wind, ArrowUp, ChevronsUp } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import SkillUnlockNotification from './SkillUnlockNotification';

interface SkillNode {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    cost: number;
    requirements: string[];
    x: number;
    y: number;
}

const SKILL_NODES: SkillNode[] = [
    {
        id: 'double_jump',
        title: '二段跳',
        description: '在空中再次跳跃',
        icon: ChevronsUp,
        cost: 100,
        requirements: [],
        x: 50,
        y: 80
    },
    {
        id: 'dash',
        title: '冲刺',
        description: '按Shift键快速向前冲刺',
        icon: Zap,
        cost: 300,
        requirements: ['double_jump'],
        x: 20,
        y: 50
    },
    {
        id: 'wall_jump',
        title: '墙跳',
        description: '在墙上按跳跃键反弹',
        icon: ArrowUp,
        cost: 500,
        requirements: ['double_jump'],
        x: 80,
        y: 50
    },
    {
        id: 'glide',
        title: '滑翔',
        description: '空中长按跳跃键缓慢下落',
        icon: Wind,
        cost: 800,
        requirements: ['wall_jump'],
        x: 80,
        y: 20
    }
];

interface TalentBadge {
    id: string;
    title: string;
    description: string;
}

const CAMPAIGN_TALENT_BADGES: TalentBadge[] = [
    { id: 'ancient_wisdom', title: '古老智慧', description: '战役天赋：战役与关卡经验额外 +10%' },
    { id: 'school_star', title: '校园之星', description: '战役天赋：战役与关卡金币额外 +10%' },
    { id: 'academic_master', title: '学霸护符', description: '战役天赋：进入战役时额外获得 1 次生命' },
    { id: 'science_master', title: '科学大师', description: '已获得的战役奖励天赋，可继续扩展玩法效果' },
    { id: 'time_slow', title: '时间减速', description: '已获得的高级战役技能资格' },
    { id: 'chemical_shield', title: '化学护盾', description: '已获得的高级战役技能资格' },
    { id: 'quantum_dash', title: '量子冲刺', description: '已获得的高级战役技能资格' },
];

interface SkillTreeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SkillTreeModal({ isOpen, onClose }: SkillTreeModalProps) {
    const { skills, arenaScore, unlockSkill, addArenaScore } = useGameStore();
    const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
    const [showNotification, setShowNotification] = useState(false);
    const [unlockedSkillInfo, setUnlockedSkillInfo] = useState<{
        title: string;
        description: string;
        instruction: string;
    } | null>(null);
    const unlockedTalentBadges = CAMPAIGN_TALENT_BADGES.filter((badge) => skills.includes(badge.id));

    // 控制游戏按键
    useEffect(() => {
        if (isOpen) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-opened'));
            }
        } else {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUnlock = (skill: SkillNode) => {
        if (skills.includes(skill.id)) return;
        const meetsRequirements = skill.requirements.every(req => skills.includes(req));
        if (!meetsRequirements) return;

        if (arenaScore >= skill.cost) {
            unlockSkill(skill.id);
            addArenaScore(-skill.cost);
            
            const skillInstructions = {
                'double_jump': '空中再按UP键进行二段跳',
                'dash': '按SHIFT键快速冲刺',
                'wall_jump': '贴着墙壁按UP键墙跳',
                'glide': '空中长按UP键滑翔'
            };
            
            setUnlockedSkillInfo({
                title: skill.title,
                description: skill.description,
                instruction: skillInstructions[skill.id as keyof typeof skillInstructions]
            });
            setShowNotification(true);
            
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('skill-unlocked', {
                    detail: { skillId: skill.id }
                }));
            }
        }
    };

    // 技能节点渲染
    const renderSkillNode = (node: SkillNode) => {
        const isUnlocked = skills.includes(node.id);
        const canUnlock = !isUnlocked &&
            node.requirements.every(req => skills.includes(req)) &&
            arenaScore >= node.cost;
        const isLocked = !isUnlocked && !canUnlock;

        return (
            <button
                key={node.id}
                onClick={() => setSelectedSkill(node)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 
                    w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center transition-all duration-300
                    ${isUnlocked
                        ? 'bg-blue-600 border-slate-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110'
                        : canUnlock
                            ? 'bg-blue-900/20 border-amber-400 animate-pulse hover:scale-110 cursor-pointer'
                            : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'}
                    ${selectedSkill?.id === node.id ? 'ring-4 ring-blue-400 ring-offset-2 md:ring-offset-4 ring-offset-slate-800' : ''}
                `}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
                <node.icon className={`w-6 h-6 md:w-8 md:h-8 ${isUnlocked ? 'text-white' : 'text-slate-500'}`} />
            </button>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 overflow-auto">
            <div className="bg-slate-800 backdrop-blur-md rounded-xl shadow-lg w-full max-w-4xl min-h-[500px] md:h-[80vh] border-2 border-slate-700 flex flex-col overflow-hidden relative">

                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {/* Header - 移动端响应式 */}
                <div className="p-3 md:p-6 border-b border-slate-700 bg-blue-900/30 flex justify-between items-center z-10">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl md:text-3xl font-bold text-white font-pixel flex items-center gap-2 md:gap-3">
                            <Zap className="text-blue-400 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                            <span className="truncate">技能树</span>
                        </h2>
                        <p className="text-slate-500 mt-0.5 md:mt-1 text-xs md:text-base hidden md:block">解锁强大的新能力</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
                        <div className="bg-blue-900/30 px-2 md:px-4 py-1 md:py-2 rounded-lg border border-slate-700">
                            <span className="text-slate-500 text-xs md:text-sm mr-1 md:mr-2 hidden md:inline">可用积分</span>
                            <span className="text-blue-400 font-bold text-sm md:text-xl">{arenaScore}</span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
                            <X className="w-6 h-6 md:w-8 md:h-8" />
                        </button>
                    </div>
                </div>

                {/* Main Content - 移动端垂直布局 */}
                <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">

                    {/* Tree Visualization Area */}
                    <div className="flex-1 relative bg-blue-900/30/30 m-2 md:m-4 rounded-xl border border-slate-700 overflow-hidden min-h-[250px] md:min-h-0">
                        {/* Connections */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {SKILL_NODES.map(node =>
                                node.requirements.map(reqId => {
                                    const reqNode = SKILL_NODES.find(n => n.id === reqId);
                                    if (!reqNode) return null;
                                    return (
                                        <line
                                            key={`${reqId}-${node.id}`}
                                            x1={`${reqNode.x}%`} y1={`${reqNode.y}%`}
                                            x2={`${node.x}%`} y2={`${node.y}%`}
                                            stroke={skills.includes(reqId) ? "#10b981" : "#d1d5db"}
                                            strokeWidth="3"
                                            strokeDasharray={skills.includes(reqId) ? "0" : "8 4"}
                                        />
                                    );
                                })
                            )}
                        </svg>

                        {/* Nodes */}
                        {SKILL_NODES.map(renderSkillNode)}
                    </div>

                    {/* Details Panel - 移动端底部显示 */}
                    <div className="w-full md:w-80 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700 p-3 md:p-6 flex flex-col z-10 max-h-[40vh] md:max-h-none overflow-auto">
                        {selectedSkill ? (
                            <>
                                <div className="flex md:flex-col items-center gap-3 md:gap-0 md:mb-6">
                                    <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-900/20 rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-slate-700 flex-shrink-0 md:mx-auto md:mb-6">
                                        <selectedSkill.icon className="w-7 h-7 md:w-10 md:h-10 text-blue-400" />
                                    </div>
                                    <div className="flex-1 md:text-center">
                                        <h3 className="text-lg md:text-2xl font-bold text-white mb-0.5 md:mb-2">{selectedSkill.title}</h3>
                                        <p className="text-slate-500 text-xs md:text-sm">{selectedSkill.description}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 md:space-y-4 mt-2 md:mt-auto">
                                    <div className="flex justify-between items-center p-2 md:p-3 bg-blue-900/30 rounded-lg">
                                        <span className="text-slate-500 text-sm md:text-base">花费</span>
                                        <span className={`font-bold text-sm md:text-base ${arenaScore >= selectedSkill.cost ? 'text-blue-400' : 'text-red-400'}`}>
                                            {selectedSkill.cost} 积分
                                        </span>
                                    </div>

                                    {skills.includes(selectedSkill.id) ? (
                                        <button disabled className="w-full py-2 md:py-3 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 opacity-50 cursor-default text-sm md:text-base">
                                            <Unlock className="w-4 h-4 md:w-5 md:h-5" />
                                            已解锁
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUnlock(selectedSkill)}
                                            disabled={!selectedSkill.requirements.every(req => skills.includes(req)) || arenaScore < selectedSkill.cost}
                                            className={`w-full py-2 md:py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm md:text-base
                                                ${selectedSkill.requirements.every(req => skills.includes(req)) && arenaScore >= selectedSkill.cost
                                                    ? 'bg-blue-600 hover:bg-emerald-400 text-white shadow-lg hover:shadow-blue-500/50'
                                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
                                            `}
                                        >
                                            {selectedSkill.requirements.every(req => skills.includes(req))
                                                ? (arenaScore >= selectedSkill.cost ? '解锁技能' : '积分不足')
                                                : '前置未解锁'}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-4 md:py-0">
                                <Zap className="w-10 h-10 md:w-16 md:h-16 mb-2 md:mb-4 opacity-20" />
                                <p className="text-sm md:text-base">点击技能查看详情</p>
                            </div>
                        )}

                        <div className="mt-4 border-t border-slate-700/80 pt-4">
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white">战役天赋</h4>
                                <span className="text-xs text-slate-400">{unlockedTalentBadges.length}/{CAMPAIGN_TALENT_BADGES.length}</span>
                            </div>
                            <div className="space-y-2">
                                {CAMPAIGN_TALENT_BADGES.map((badge) => {
                                    const unlocked = skills.includes(badge.id);
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`rounded-xl border px-3 py-2 text-left transition ${
                                                unlocked
                                                    ? 'border-emerald-400/40 bg-emerald-500/10'
                                                    : 'border-slate-700 bg-slate-900/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className={`text-sm font-semibold ${unlocked ? 'text-emerald-200' : 'text-slate-200'}`}>
                                                        {badge.title}
                                                    </div>
                                                    <div className="mt-1 text-xs leading-5 text-slate-400">
                                                        {badge.description}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                                        unlocked
                                                            ? 'bg-emerald-400/20 text-emerald-200'
                                                            : 'bg-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    {unlocked ? '已获得' : '未获得'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 技能解锁通知 */}
            {unlockedSkillInfo && (
                <SkillUnlockNotification
                    isOpen={showNotification}
                    onClose={() => {
                        setShowNotification(false);
                        setUnlockedSkillInfo(null);
                    }}
                    skillTitle={unlockedSkillInfo.title}
                    skillDescription={unlockedSkillInfo.description}
                    skillInstruction={unlockedSkillInfo.instruction}
                />
            )}
        </div>
    );
}
