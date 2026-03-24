'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, Play, CheckCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

interface SkillChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    skillId: string;
    onUnlock: () => void;
}

const SKILL_CHALLENGES: Record<string, { title: string, description: string, initialCode: string, expectedOutput: string }> = {
    'double_jump': {
        title: '二段跳协议',
        description: '定义一个名为 "jump_twice" 的函数，返回 True。',
        initialCode: 'def jump_twice():\n    # 返回 True 以启用二段跳\n    pass\n\nprint(jump_twice())',
        expectedOutput: 'True'
    },
    'dash': {
        title: '冲刺引擎',
        description: '计算冲刺所需的速度（质量 * 加速度）。质量=10，加速度=5。',
        initialCode: 'mass = 10\naccel = 5\nforce = \nprint(force)',
        expectedOutput: '50'
    }
};

export default function SkillChallengeModal({ isOpen, onClose, skillId, onUnlock }: SkillChallengeModalProps) {
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const challenge = SKILL_CHALLENGES[skillId];

    // Initialize code when modal opens
    React.useEffect(() => {
        if (isOpen && challenge) {
            setCode(challenge.initialCode);
            setOutput('');
            setIsSuccess(false);
        }
    }, [isOpen, challenge]);

    const runCode = async () => {
        if (!challenge) return;

        try {
            // Simple Pyodide simulation for now (since we can't easily access the full Pyodide instance here without context)
            // In a real implementation, we would pass the runPython function or context.
            // For this prototype, we'll do simple string matching or basic eval if possible, 
            // but to be safe and robust, let's simulate the check logic.

            // NOTE: In the full game, this should use the same Pyodide engine as LevelView.
            // Here we will do a simplified check for the prototype to ensure it works without complex dependency injection.

            let result = '';

            if (skillId === 'double_jump') {
                // Check if function is defined and returns True
                const hasFunction = code.includes('def jump_twice');
                const hasReturn = code.includes('return True') || code.includes('return true');
                const hasPrint = code.includes('print(jump_twice())') || code.includes('print(True)');

                if (hasFunction && hasReturn) {
                    result = 'True';
                } else if (hasReturn || code.includes('True')) {
                    result = 'True'; // Accept any code that has True
                } else {
                    result = 'None';
                }
            } else if (skillId === 'dash') {
                if (code.includes('10 * 5') || code.includes('50')) {
                    result = '50';
                } else {
                    result = 'Error';
                }
            }

            setOutput(result);

            if (result.trim() === challenge.expectedOutput) {
                setIsSuccess(true);
                setTimeout(() => {
                    onUnlock();
                    onClose();
                }, 1500);
            }
        } catch (err) {
            setOutput('Error: ' + err);
        }
    };

    if (!challenge) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-slate-800 backdrop-blur-md border-2 border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-lg"
                    >
                        {/* Header */}
                        <div className="bg-blue-900/30 p-4 flex justify-between items-center border-b border-slate-700">
                            <div className="flex items-center gap-2 text-blue-400">
                                <Code size={24} />
                                <h2 className="text-xl font-bold">{challenge.title}</h2>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                            <div className="md:col-span-3 space-y-4">
                                <p className="text-slate-600">{challenge.description}</p>
                                <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 min-h-[300px] max-h-[400px] overflow-y-auto">
                                    <textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full h-[280px] bg-transparent outline-none resize-none"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4 flex flex-col">
                                <div className="bg-slate-900 rounded-lg p-4 flex-1 font-mono text-sm min-h-[150px]">
                                    <div className="text-slate-400 mb-2">输出：</div>
                                    <div className="text-green-400 whitespace-pre-wrap">{output}</div>
                                </div>

                                <button
                                    onClick={runCode}
                                    disabled={isSuccess}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isSuccess
                                        ? 'bg-green-500 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                        }`}
                                >
                                    {isSuccess ? (
                                        <>
                                            <CheckCircle size={20} />
                                            系统已解锁！
                                        </>
                                    ) : (
                                        <>
                                            <Play size={20} />
                                            运行代码
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
