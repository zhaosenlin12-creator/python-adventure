'use client';

/**
 * PVP 编程轮组件
 * 使用本地 Pyodide 运行 Python 代码
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, CheckCircle, XCircle, Code, Lightbulb, Loader2 } from 'lucide-react';
import { getRandomCodingTask } from '../../../lib/pvpCodingBank';
import usePyodide from '../../../hooks/usePyodide';

interface PvpCodingRoundProps {
    onComplete: (completed: boolean, timeUsed: number) => void;
    onClose: () => void;
}

export default function PvpCodingRound({ onComplete }: PvpCodingRoundProps) {
    // 随机选择一道题目
    const task = useMemo(() => getRandomCodingTask(), []);
    
    // Pyodide hook
    const { isReady: pyodideReady, isLoading: pyodideLoading, runCode: runPyodide, output: pyodideOutput } = usePyodide();
    
    const [code, setCode] = useState(task.template);
    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [showHints, setShowHints] = useState(false);
    const [startTime] = useState(Date.now());
    const [remainingTime, setRemainingTime] = useState(300); // 5 分钟

    // 🔥 组件挂载时通知游戏禁用E键，卸载时恢复
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('modal-opened'));
            return () => {
                window.dispatchEvent(new Event('modal-closed'));
            };
        }
    }, []);

    // 计时器
    useEffect(() => {
        const timer = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    onComplete(false, 300000);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onComplete]);

    // 监听 Pyodide 输出变化
    useEffect(() => {
        if (pyodideOutput.length > 0) {
            const outputStr = pyodideOutput.join('\n');
            setOutput(outputStr);
            
            // 检查输出是否正确
            const expectedOutput = task.expectedOutput.trim();
            const actualOutput = outputStr.trim();
            const correct = actualOutput === expectedOutput;
            setIsCorrect(correct);
            
            if (correct) {
                const timeUsed = Date.now() - startTime;
                setTimeout(() => {
                    onComplete(true, timeUsed);
                }, 1500);
            }
            
            setIsRunning(false);
        }
    }, [pyodideOutput, task.expectedOutput, startTime, onComplete]);

    // 运行代码
    const handleRunCode = useCallback(async () => {
        if (!pyodideReady) {
            setOutput('Python 环境加载中，请稍候...');
            return;
        }
        
        setIsRunning(true);
        setOutput('');
        setIsCorrect(null);
        
        await runPyodide(code);
    }, [code, pyodideReady, runPyodide]);

    // 提交代码
    const handleSubmit = useCallback(() => {
        const timeUsed = Date.now() - startTime;
        onComplete(isCorrect === true, timeUsed);
    }, [isCorrect, startTime, onComplete]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getDifficultyStyle = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return { color: 'text-green-400', bg: 'bg-green-500/20', label: '简单' };
            case 'medium': return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '中等' };
            case 'hard': return { color: 'text-red-400', bg: 'bg-red-500/20', label: '困难' };
            default: return { color: 'text-gray-400', bg: 'bg-gray-500/20', label: '未知' };
        }
    };

    const difficultyStyle = getDifficultyStyle(task.difficulty);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div className="bg-slate-800 backdrop-blur-md rounded-2xl w-full max-w-4xl h-[90vh] overflow-hidden shadow-lg border-2 border-slate-700 flex flex-col">
                {/* 头部 */}
                <div className="bg-gradient-to-r from-green-600 to-blue-700 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Code className="w-6 h-6 text-white" />
                            <span className="text-white font-bold">第三轮：编程挑战</span>
                            <span className={`px-2 py-1 ${difficultyStyle.bg} rounded-full text-xs ${difficultyStyle.color}`}>
                                {difficultyStyle.label}
                            </span>
                            {pyodideLoading && (
                                <span className="flex items-center gap-1 text-yellow-300 text-xs">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Python加载中...
                                </span>
                            )}
                            {pyodideReady && (
                                <span className="text-green-300 text-xs">✓ Python就绪</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <Clock className="w-5 h-5" />
                            <span className={`font-mono font-bold ${remainingTime < 60 ? 'text-red-300' : ''}`}>
                                {formatTime(remainingTime)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* 左侧：题目描述 */}
                    <div className="w-1/3 border-r border-slate-700 p-4 overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-3">{task.title}</h3>
                        <pre className="text-slate-300 text-sm whitespace-pre-wrap mb-4">
                            {task.description}
                        </pre>
                        
                        <div className="p-3 bg-gray-800 rounded-lg mb-4">
                            <p className="text-gray-400 text-sm mb-1">期望输出：</p>
                            <code className="text-green-400 font-mono">{task.expectedOutput}</code>
                        </div>

                        {/* 提示按钮 */}
                        <button
                            onClick={() => setShowHints(!showHints)}
                            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm mb-2"
                        >
                            <Lightbulb className="w-4 h-4" />
                            {showHints ? '隐藏提示' : '显示提示'}
                        </button>

                        {showHints && (
                            <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                                <p className="text-yellow-400 text-sm font-medium mb-2">💡 提示：</p>
                                <ul className="text-yellow-200 text-sm space-y-1">
                                    {task.hints.map((hint, index) => (
                                        <li key={index}>• {hint}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* 右侧：代码编辑器 */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-hidden">
                            {/* 使用简单的 textarea 代替 Monaco，避免加载问题 */}
                            <div className="h-full flex flex-col bg-gray-950">
                                <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 border-b border-gray-700 flex items-center justify-between">
                                    <span>Python 代码编辑器</span>
                                    <span className="text-gray-500">Tab = 4空格</span>
                                </div>
                                <textarea
                                    className="flex-1 w-full bg-gray-950 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none focus:ring-1 focus:ring-green-500/50"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={(e) => {
                                        // 🔥 阻止所有按键事件冒泡和默认行为（除了正常输入）
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                        
                                        // Tab 键插入 4 个空格
                                        if (e.key === 'Tab') {
                                            e.preventDefault();
                                            const start = e.currentTarget.selectionStart;
                                            const end = e.currentTarget.selectionEnd;
                                            const newCode = code.substring(0, start) + '    ' + code.substring(end);
                                            setCode(newCode);
                                            // 设置光标位置
                                            setTimeout(() => {
                                                e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                                            }, 0);
                                        }
                                    }}
                                    onKeyUp={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                    }}
                                    onKeyPress={(e) => {
                                        e.stopPropagation();
                                        e.nativeEvent.stopImmediatePropagation();
                                    }}
                                    spellCheck={false}
                                    placeholder="在此输入Python代码..."
                                    style={{ lineHeight: '1.6' }}
                                />
                            </div>
                        </div>

                        {/* 输出区域 */}
                        <div className="h-32 border-t border-gray-700 bg-gray-800 p-3 overflow-y-auto">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">输出</span>
                                {isCorrect !== null && (
                                    <span className={`flex items-center gap-1 text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        {isCorrect ? '正确！' : '错误'}
                                    </span>
                                )}
                            </div>
                            <pre className={`font-mono text-sm ${isCorrect ? 'text-green-400' : isCorrect === false ? 'text-red-400' : 'text-gray-300'}`}>
                                {output || '点击运行查看输出...'}
                            </pre>
                        </div>

                        {/* 按钮区域 */}
                        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                            <button
                                onClick={handleRunCode}
                                disabled={isRunning || !pyodideReady}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRunning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                {isRunning ? '运行中...' : pyodideReady ? '运行代码' : 'Python加载中...'}
                            </button>
                            
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-500 hover:to-blue-600 text-white rounded-lg font-bold"
                            >
                                提交答案
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
