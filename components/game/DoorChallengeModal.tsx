'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, Play, CheckCircle, Lock } from 'lucide-react';

interface DoorChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    doorId: string;
    onUnlock: () => void;
}

const DOOR_CHALLENGES: Record<string, { 
    title: string; 
    description: string; 
    initialCode: string;
    expectedOutput: string;
    hint: string;
}> = {
    'arena_door': {
        title: '竞技场密码门',
        description: '将变量 password 赋值为 True，然后打印它来解锁大门。',
        initialCode: '# 将 password 赋值为 True 来解锁大门\npassword = ___\n\nprint(password)',
        expectedOutput: 'True',
        hint: '提示：将 ___ 替换为 True'
    },
    'secret_door': {
        title: '神秘密室',
        description: '将变量 key 赋值为 True 来打开神秘密室。',
        initialCode: '# 将 key 赋值为 True\nkey = ___\n\nprint(key)',
        expectedOutput: 'True',
        hint: '提示：将 ___ 替换为 True'
    },
    'boss_door': {
        title: 'Boss房间',
        description: '将变量 unlock 赋值为 True 来解锁Boss房间。',
        initialCode: '# 将 unlock 赋值为 True\nunlock = ___\n\nprint(unlock)',
        expectedOutput: 'True',
        hint: '提示：将 ___ 替换为 True'
    }
};

export default function DoorChallengeModal({ isOpen, onClose, doorId, onUnlock }: DoorChallengeModalProps) {
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showHint, setShowHint] = useState(false);
    
    const challenge = DOOR_CHALLENGES[doorId] || DOOR_CHALLENGES['arena_door'];

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen && challenge) {
            setCode(challenge.initialCode);
            setOutput('');
            setIsSuccess(false);
            setShowHint(false);
            
            // 🔥 通知游戏禁用按键
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-opened'));
            }
        }
        
        return () => {
            // 🔥 清理时恢复按键
            if (isOpen && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        };
    }, [isOpen, challenge]);

    const runCode = () => {
        if (!challenge) return;

        try {
            let result = '';
            
            // 移除注释和多余空格，标准化代码
            const cleanCode = code
                .split('\n')
                .map(line => line.split('#')[0].trim()) // 移除注释
                .filter(line => line.length > 0)
                .join('\n');
            
            // 检查是否有变量赋值为 True 并打印
            // 匹配模式: variable = True 和 print(variable)
            const assignTrueMatch = cleanCode.match(/(\w+)\s*=\s*True/);
            const printMatch = cleanCode.match(/print\s*\(\s*(\w+)\s*\)/);
            
            if (assignTrueMatch && printMatch) {
                const assignedVar = assignTrueMatch[1];
                const printedVar = printMatch[1];
                
                // 如果打印的变量就是赋值为 True 的变量
                if (assignedVar === printedVar) {
                    result = 'True';
                } else if (printedVar === 'True') {
                    result = 'True';
                } else {
                    result = 'None';
                }
            }
            // 直接 print(True)
            else if (cleanCode.includes('print(True)') || cleanCode.includes('print( True )')) {
                result = 'True';
            }
            // print(False)
            else if (cleanCode.includes('print(False)')) {
                result = 'False';
            }
            // 还有 ___ 占位符未替换
            else if (code.includes('___')) {
                result = 'Error: 请将 ___ 替换为正确的值';
            }
            // 其他情况
            else {
                result = 'None';
            }

            setOutput(result);

            if (result.trim() === challenge.expectedOutput) {
                setIsSuccess(true);
                setTimeout(() => {
                    // 🔥 先触发modal-closed事件，恢复按键控制
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('modal-closed'));
                    }
                    onUnlock();
                    onClose();
                }, 1500);
            }
        } catch (err) {
            setOutput('Error: ' + err);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
                                <Lock size={24} />
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
                                
                                {/* Code Editor */}
                                <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 min-h-[250px] max-h-[350px] overflow-y-auto">
                                    <textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onKeyUp={(e) => e.stopPropagation()}
                                        onKeyPress={(e) => e.stopPropagation()}
                                        className="w-full h-[230px] bg-transparent outline-none resize-none"
                                        spellCheck={false}
                                        autoFocus
                                    />
                                </div>

                                {/* Hint Button */}
                                {!showHint && (
                                    <button
                                        onClick={() => setShowHint(true)}
                                        className="text-sm text-slate-400 hover:text-blue-400"
                                    >
                                        💡 需要提示？
                                    </button>
                                )}
                                
                                {/* Hint */}
                                {showHint && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm"
                                    >
                                        {challenge.hint}
                                    </motion.div>
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-4 flex flex-col">
                                {/* Output */}
                                <div className="bg-slate-950 rounded-lg p-4 flex-1 font-mono text-sm min-h-[120px]">
                                    <div className="text-slate-500 mb-2">输出：</div>
                                    <div className={`whitespace-pre-wrap ${
                                        output === 'True' ? 'text-green-400' : 
                                        output.startsWith('Error') ? 'text-red-400' : 'text-white'
                                    }`}>
                                        {output || '点击运行查看结果'}
                                    </div>
                                </div>

                                {/* Expected Output */}
                                <div className="bg-slate-800 rounded-lg p-3 text-sm">
                                    <div className="text-slate-500 mb-1">期望输出：</div>
                                    <div className="text-green-400 font-mono">{challenge.expectedOutput}</div>
                                </div>

                                {/* Run Button */}
                                <button
                                    onClick={runCode}
                                    disabled={isSuccess}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                                        isSuccess
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-600 hover:bg-emerald-400 text-white'
                                    }`}
                                >
                                    {isSuccess ? (
                                        <>
                                            <CheckCircle size={20} />
                                            大门已解锁！
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
