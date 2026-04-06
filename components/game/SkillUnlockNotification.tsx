'use client';

import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SkillUnlockNotificationProps {
    isOpen: boolean;
    onClose: () => void;
    skillTitle: string;
    skillDescription: string;
    skillInstruction: string;
}

export default function SkillUnlockNotification({
    isOpen,
    onClose,
    skillTitle,
    skillDescription,
    skillInstruction
}: SkillUnlockNotificationProps) {
    // 自动关闭
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3600);
            
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-x-3 bottom-3 z-[100] flex justify-center pointer-events-none md:inset-x-auto md:bottom-5 md:right-5">
            <div className="pointer-events-auto relative w-full max-w-sm rounded-3xl border border-cyan-400/30 bg-slate-950/92 shadow-2xl backdrop-blur-sm">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 text-slate-400 transition hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                            <CheckCircle className="h-6 w-6" strokeWidth={2.4} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                                Skill Learned
                            </div>
                            <h2 className="mt-1 text-xl font-bold text-white">已学习：{skillTitle}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{skillDescription}</p>

                            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">用法</div>
                                <div className="mt-1 text-sm font-semibold text-cyan-100">{skillInstruction}</div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <p className="text-xs leading-5 text-slate-400">
                                    已加入技能栏，进入关卡后直接生效。
                                </p>
                                <button
                                    onClick={onClose}
                                    className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                                >
                                    继续
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
