"use client";

import { useState, useEffect } from 'react';
import { Quiz } from '@/lib/platformLevels';
import { Brain, Timer, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';

interface QuizModalProps {
    isOpen: boolean;
    quiz: Quiz;
    onCorrect: () => void;
    onWrong: () => void;
    onClose: () => void;
}

export default function QuizModal({ isOpen, quiz, onCorrect, onWrong, onClose }: QuizModalProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit || 60);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // 重置状态
        setSelectedAnswer('');
        setShowResult(false);
        setIsCorrect(false);
        setTimeLeft(quiz.timeLimit || 60);
        setShowHint(false);

        // 倒计时
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, quiz]);

    const handleTimeout = () => {
        setShowResult(true);
        setIsCorrect(false);
        setTimeout(() => {
            onWrong();
        }, 2000);
    };

    const handleSubmit = () => {
        const correct = selectedAnswer.trim() === quiz.answer.trim();
        setIsCorrect(correct);
        setShowResult(true);

        setTimeout(() => {
            if (correct) {
                onCorrect();
            } else {
                onWrong();
            }
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 backdrop-blur-md rounded-xl p-8 max-w-2xl w-full border-2 border-slate-700 shadow-lg">
                {/* 标题和计时器 */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Brain className="w-9 h-9 text-blue-400" />
                        {quiz.type === 'math' ? '数学题' : quiz.type === 'coding' ? '编程题' : '逻辑题'}
                    </h2>
                    <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${
                        timeLeft <= 10 ? 'bg-red-900/300 animate-pulse' : 'bg-blue-500'
                    } text-white`}>
                        <Timer className="w-5 h-5 inline mr-1" />{timeLeft}s
                    </div>
                </div>

                {/* 问题 */}
                <div className="bg-blue-900/30 rounded-lg p-6 mb-6 border border-slate-700">
                    <p className="text-xl text-white leading-relaxed">
                        {quiz.question}
                    </p>
                </div>

                {/* 选项 */}
                {quiz.options ? (
                    <div className="space-y-3 mb-6">
                        {quiz.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => !showResult && setSelectedAnswer(option)}
                                disabled={showResult}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    selectedAnswer === option
                                        ? 'border-emerald-500 bg-blue-600/20'
                                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-600'
                                } ${
                                    showResult && option === quiz.answer
                                        ? 'border-green-500 bg-green-500/20'
                                        : showResult && selectedAnswer === option && !isCorrect
                                        ? 'border-red-500 bg-red-900/300/20'
                                        : ''
                                } disabled:cursor-not-allowed`}
                            >
                                <span className="text-lg text-white font-mono">
                                    {String.fromCharCode(65 + index)}. {option}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="mb-6">
                        <input
                            type="text"
                            value={selectedAnswer}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            disabled={showResult}
                            placeholder="输入你的答案..."
                            className="w-full p-4 bg-blue-900/30 border-2 border-slate-700 rounded-lg text-white text-lg focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed"
                        />
                    </div>
                )}

                {/* 提示 */}
                {quiz.hint && (
                    <div className="mb-6">
                        {showHint ? (
                            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
                                <p className="text-amber-400 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-amber-400" />
                                    {quiz.hint}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowHint(true)}
                                disabled={showResult}
                                className="text-amber-500 hover:text-amber-400 underline disabled:opacity-50"
                            >
                                需要提示？点击查看
                            </button>
                        )}
                    </div>
                )}

                {/* 结果提示 */}
                {showResult && (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${
                        isCorrect
                            ? 'bg-green-500/20 border-green-500'
                            : 'bg-red-900/300/20 border-red-500'
                    }`}>
                            <p className={`text-xl font-bold ${
                            isCorrect ? 'text-green-500' : 'text-red-500'
                        }`}>
                            {isCorrect ? '✅ 回答正确！' : '❌ 回答错误！'}
                        </p>
                        {!isCorrect && (
                            <p className="text-white mt-2">
                                正确答案是：<span className="font-bold text-green-400">{quiz.answer}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* 按钮 */}
                <div className="flex gap-4">
                    {!showResult ? (
                        <>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedAnswer}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                            >
                                提交答案
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                            >
                                放弃
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={isCorrect ? onCorrect : onWrong}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                        >
                            {isCorrect ? '继续前进 →' : '重试关卡'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
