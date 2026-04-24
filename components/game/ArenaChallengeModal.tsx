'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Code, Lightbulb, Trophy, X } from 'lucide-react';
import { ArenaChallenge, ARENA_DIFFICULTY_LABELS, buildArenaChallengeEditorTemplate } from '@/types/arena';
import { TRAINING_CURRENCY_ICON, TRAINING_CURRENCY_LABEL } from '@/lib/gameEconomy';
import { ARENA_DAILY_DIAMOND_LIMIT } from '@/lib/arenaRewards';
import usePyodide from '@/hooks/usePyodide';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

interface ArenaChallengeModalProps {
    challenge: ArenaChallenge | null;
    onClose: () => void;
    onComplete: (timeUsed: number, codeLength: number) => void;
    onFail?: () => void;
}

export default function ArenaChallengeModal({
    challenge,
    onClose,
    onComplete,
    onFail,
}: ArenaChallengeModalProps) {
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const onCloseRef = useRef(onClose);
    const onCompleteRef = useRef(onComplete);
    const onFailRef = useRef(onFail);
    const { isReady, runCode: runPyodide, output: pyodideOutput } = usePyodide();

    useEffect(() => {
        onCloseRef.current = onClose;
        onCompleteRef.current = onComplete;
        onFailRef.current = onFail;
    }, [onClose, onComplete, onFail]);

    useEffect(() => {
        if (!challenge) {
            return;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        hasEndedRef.current = false;
        setCode(buildArenaChallengeEditorTemplate(challenge));
        setOutput('');
        setIsRunning(false);
        setShowGuide(false);
        setTimeRemaining(challenge.timeLimit);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('modal-opened'));
        }

        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }

                    if (!hasEndedRef.current) {
                        hasEndedRef.current = true;
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('modal-closed'));
                        }
                        onFailRef.current?.();
                        setTimeout(() => onCloseRef.current(), 0);
                    }

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        };
    }, [challenge?.id]);

    useEffect(() => {
        if (!challenge || !isRunning || pyodideOutput.length === 0) {
            return;
        }

        const resultText = pyodideOutput.join('\n');
        const normalizedResult = resultText.trim().replace(/\r\n/g, '\n');
        const normalizedExpected = challenge.expectedOutput.trim().replace(/\r\n/g, '\n');
        const success = normalizedResult === normalizedExpected;

        debugLog('[ArenaChallengeModal] result', normalizedResult);
        debugLog('[ArenaChallengeModal] expected', normalizedExpected);

        if (!success) {
            setOutput(`${resultText}\n\n输出还不对，再检查一次。`);
            setIsRunning(false);
            return;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        hasEndedRef.current = true;
        const timeUsed = challenge.timeLimit - timeRemaining;
        const codeLength = code
            .split('\n')
            .filter((line) => line.trim() && !line.trim().startsWith('#'))
            .length;

        setOutput(`${resultText}\n\n挑战成功，正在结算奖励...`);
        setIsRunning(false);

        setTimeout(() => {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
            onCompleteRef.current(timeUsed, codeLength);
        }, 360);
    }, [challenge, code, isRunning, pyodideOutput, timeRemaining]);

    const difficultyLabel = useMemo(() => {
        if (!challenge) {
            return '';
        }
        return ARENA_DIFFICULTY_LABELS[challenge.difficulty];
    }, [challenge]);

    if (!challenge) {
        return null;
    }

    const handleRunCode = async () => {
        if (code.includes('___')) {
            setOutput('先把代码里的 ___ 都补完整，再点击运行。');
            return;
        }

        setIsRunning(true);
        setOutput(isReady ? '正在运行代码...' : 'Python 环境正在准备，请稍候...');

        if (!isReady) {
            setIsRunning(false);
            return;
        }

        await runPyodide(code);
    };

    const handleClose = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        onCloseRef.current();
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        event.stopPropagation();
    };

    const handleKeyUp = (event: React.KeyboardEvent) => {
        event.stopPropagation();
    };

    const difficultyClasses =
        challenge.difficulty === 'easy'
            ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20'
            : challenge.difficulty === 'medium'
                ? 'text-amber-200 bg-amber-400/10 border-amber-400/20'
                : 'text-rose-200 bg-rose-400/10 border-rose-400/20';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
        >
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-900/95 px-5 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${difficultyClasses}`}>
                                {difficultyLabel}
                            </div>
                            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                                {challenge.points} 排名分
                            </div>
                            <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
                                前 {ARENA_DAILY_DIAMOND_LIMIT} 次通关可领 {TRAINING_CURRENCY_ICON} {TRAINING_CURRENCY_LABEL}
                            </div>
                        </div>
                        <h2 className="mt-2 text-xl font-bold text-white">{challenge.title}</h2>
                        <p className="mt-1 text-sm text-slate-300">{challenge.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-red-100">
                            <Clock className="h-4 w-4" />
                            <span className="font-semibold">
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:text-white"
                            aria-label="关闭挑战"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">
                    <section className="min-h-0">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                            <Code className="h-4 w-4" />
                            补全代码
                        </div>
                        <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                            <textarea
                                ref={textareaRef}
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                onKeyDown={handleKeyDown}
                                onKeyUp={handleKeyUp}
                                onKeyPress={(event) => event.stopPropagation()}
                                className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm text-emerald-300 outline-none"
                                spellCheck={false}
                                autoFocus
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                            提示：把 <code>___</code> 替换成正确内容，再点击运行。
                        </p>
                        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-200">
                                    <Lightbulb className="h-4 w-4" />
                                    知识点提示
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowGuide((value) => !value)}
                                    className="flex items-center gap-1 rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                                >
                                    {showGuide ? '收起提示' : '查看提示'}
                                    {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                            </div>

                            {showGuide ? (
                                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                            知识点
                                        </div>
                                        <p className="mt-1 text-cyan-100">{challenge.knowledgePoint}</p>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                            用法提示
                                        </div>
                                        <p className="mt-1 text-emerald-100">{challenge.usageHint}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    先自己想一想，卡住时再点开提示，会更容易真正学会这个知识点。
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="min-h-0">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                            <Trophy className="h-4 w-4" />
                            运行结果
                        </div>
                        <div className="h-[360px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm">
                            <pre
                                className={`whitespace-pre-wrap ${
                                    output.includes('挑战成功')
                                        ? 'text-emerald-300'
                                        : output.includes('输出还不对') || output.includes('先把代码')
                                            ? 'text-rose-300'
                                            : 'text-slate-200'
                                }`}
                            >
                                {output || '点击“运行代码”后，这里会显示结果。'}
                            </pre>
                        </div>
                        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                目标输出
                            </div>
                            <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-cyan-100">
                                {challenge.expectedOutput}
                            </pre>
                        </div>
                    </section>
                </div>

                <div className="border-t border-slate-700 bg-slate-900/95 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-400">
                            简单题练速度，进阶题练组合，挑战题练思路。输出和目标完全一致才算通关。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                            >
                                稍后再做
                            </button>
                            <button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                                    isRunning
                                        ? 'cursor-wait bg-slate-700 text-slate-400'
                                        : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                                }`}
                            >
                                {isRunning ? '运行中...' : '运行代码'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
