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
            }, 5000); // 5秒后自动关闭
            
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-4 border-white/20 animate-bounce-in">
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 text-center">
                    {/* 成功图标 */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
                            <CheckCircle className="w-20 h-20 text-yellow-400 relative animate-scale-in" strokeWidth={3} />
                        </div>
                    </div>

                    {/* 标题 */}
                    <h2 className="text-3xl font-bold text-white mb-2 font-pixel">
                        🎉 技能解锁成功！
                    </h2>

                    {/* 技能名称 */}
                    <div className="bg-white/20 rounded-lg p-4 mb-4 backdrop-blur-sm">
                        <h3 className="text-2xl font-bold text-yellow-300 mb-2">{skillTitle}</h3>
                        <p className="text-white/90 text-sm">{skillDescription}</p>
                    </div>

                    {/* 使用说明 */}
                    <div className="bg-white/20 rounded-lg p-4 mb-4 backdrop-blur-sm">
                        <p className="text-xs text-white/70 mb-1">使用方法</p>
                        <p className="text-white font-semibold">{skillInstruction}</p>
                    </div>

                    {/* 提示 */}
                    <p className="text-white/80 text-sm">
                        ✨ 立即生效，可在开放世界中使用！
                    </p>

                    {/* 确认按钮 */}
                    <button
                        onClick={onClose}
                        className="mt-6 px-8 py-3 bg-slate-700 text-blue-400 rounded-lg font-bold hover:bg-slate-600 hover:text-blue-300 transition-all transform hover:scale-105 shadow-lg"
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
}
