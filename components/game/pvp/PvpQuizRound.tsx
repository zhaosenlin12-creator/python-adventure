'use client';

/**
 * PVP 答题轮组件
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { getBalancedRandomQuestions, getCategoryInfo, QuizQuestion } from '../../../lib/pvpQuizBank';

interface PvpQuizRoundProps {
    onComplete: (correctCount: number, avgTime: number) => void;
    onClose: () => void;
}

// 🔥 随机打乱数组的工具函数
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 🔥 为每道题目生成随机打乱的选项
interface ShuffledQuestion extends QuizQuestion {
    shuffledOptions: string[];
}

export default function PvpQuizRound({ onComplete }: PvpQuizRoundProps) {
    // 使用 useMemo 确保题目只在组件挂载时随机选择一次，并打乱每道题的选项
    const questions = useMemo(() => {
        const rawQuestions = getBalancedRandomQuestions(10);
        // 为每道题随机打乱选项顺序
        return rawQuestions.map(q => ({
            ...q,
            shuffledOptions: shuffleArray(q.options)
        })) as ShuffledQuestion[];
    }, []);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<{ correct: boolean; time: number }[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [totalTime, setTotalTime] = useState(300); // 5 分钟

    const currentQuestion = questions[currentIndex];
    const categoryInfo = getCategoryInfo(currentQuestion.category);

    // 总计时
    useEffect(() => {
        const timer = setInterval(() => {
            setTotalTime((prev) => {
                if (prev <= 1) {
                    // 时间到，结束答题
                    const correctCount = answers.filter(a => a.correct).length;
                    const avgTime = answers.length > 0 
                        ? answers.reduce((sum, a) => sum + a.time, 0) / answers.length 
                        : 30000;
                    onComplete(correctCount, avgTime);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [answers, onComplete]);

    // 选择答案
    const handleSelectAnswer = useCallback((answer: string) => {
        if (showResult) return;
        
        setSelectedAnswer(answer);
        setShowResult(true);
        
        const timeUsed = Date.now() - questionStartTime;
        const isCorrect = answer === currentQuestion.answer;
        
        setAnswers(prev => [...prev, { correct: isCorrect, time: timeUsed }]);
        
        // 1.5 秒后进入下一题
        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setSelectedAnswer(null);
                setShowResult(false);
                setQuestionStartTime(Date.now());
            } else {
                // 答题完成
                const newAnswers = [...answers, { correct: isCorrect, time: timeUsed }];
                const correctCount = newAnswers.filter(a => a.correct).length;
                const avgTime = newAnswers.reduce((sum, a) => sum + a.time, 0) / newAnswers.length;
                onComplete(correctCount, avgTime);
            }
        }, 1500);
    }, [showResult, questionStartTime, currentQuestion, currentIndex, questions.length, answers, onComplete]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div className="bg-slate-800 backdrop-blur-md rounded-2xl w-full max-w-2xl overflow-hidden shadow-lg border-2 border-slate-700">
                {/* 头部 */}
                <div className="bg-blue-900/30 border-b border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-white font-bold">第二轮：快速答题</span>
                            <span className="px-3 py-1 bg-blue-900/20 rounded-full text-blue-400 text-sm">
                                {currentIndex + 1} / {questions.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <Clock className="w-5 h-5" />
                            <span className={`font-mono font-bold ${totalTime < 60 ? 'text-red-300' : ''}`}>
                                {formatTime(totalTime)}
                            </span>
                        </div>
                    </div>
                    
                    {/* 进度条 */}
                    <div className="mt-3 h-2 bg-blue-900/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* 题目 */}
                <div className="p-6">
                    {/* 类别标签 */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{categoryInfo.icon}</span>
                        <span className="px-2 py-1 bg-blue-900/30 rounded text-slate-500 text-sm border border-slate-700">
                            {categoryInfo.name}
                        </span>
                    </div>
                    
                    <h3 className="text-xl text-white font-medium mb-6">
                        {currentQuestion.question}
                    </h3>

                    {/* 选项 - 使用随机打乱后的选项 */}
                    <div className="grid grid-cols-1 gap-3">
                        {currentQuestion.shuffledOptions.map((option, index) => {
                            const isSelected = selectedAnswer === option;
                            const isCorrect = option === currentQuestion.answer;
                            
                            let bgColor = 'bg-blue-900/30 hover:bg-blue-900/20 border border-slate-700';
                            if (showResult) {
                                if (isCorrect) bgColor = 'bg-green-600';
                                else if (isSelected) bgColor = 'bg-red-600';
                            }
                            
                            return (
                                <motion.button
                                    key={index}
                                    onClick={() => handleSelectAnswer(option)}
                                    disabled={showResult}
                                    className={`p-4 rounded-xl text-white font-medium transition-all ${bgColor} ${
                                        showResult ? 'cursor-default' : 'cursor-pointer'
                                    }`}
                                    whileHover={!showResult ? { scale: 1.02 } : {}}
                                    whileTap={!showResult ? { scale: 0.98 } : {}}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-slate-700/20 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="text-left">{option}</span>
                                        {showResult && isCorrect && <CheckCircle className="w-5 h-5 ml-auto flex-shrink-0" />}
                                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 ml-auto flex-shrink-0" />}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* 底部状态 */}
                <div className="border-t border-slate-700 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-400">
                            ✓ {answers.filter(a => a.correct).length} 正确
                        </span>
                        <span className="text-red-400">
                            ✗ {answers.filter(a => !a.correct).length} 错误
                        </span>
                    </div>
                    {showResult && currentIndex < questions.length - 1 && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <span>下一题</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
