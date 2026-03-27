'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, ShieldAlert, Skull } from 'lucide-react';

import type { BattleRoyaleQuizQuestion } from '@/types/pvp-br';

interface BattleRoyaleQuizModalProps {
  isOpen: boolean;
  questions: BattleRoyaleQuizQuestion[];
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (answers: string[]) => void;
}

export default function BattleRoyaleQuizModal({
  isOpen,
  questions,
  submitting = false,
  submitError = null,
  onSubmit,
}: BattleRoyaleQuizModalProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setAnswers([]);
    setCurrentInput('');
  }, [isOpen, questions]);

  const question = questions[step];
  const canSubmitCurrent = currentInput.trim().length > 0;
  const progressLabel = useMemo(() => `${Math.min(step + 1, questions.length)}/${questions.length}`, [step, questions.length]);

  if (!isOpen || !question) {
    return null;
  }

  const storeAnswer = (answer: string) => {
    const nextAnswers = [...answers];
    nextAnswers[step] = answer;
    setAnswers(nextAnswers);
    setCurrentInput(answer);
  };

  const handleNext = () => {
    const normalized = currentInput.trim();
    if (!normalized) return;

    const nextAnswers = [...answers];
    nextAnswers[step] = normalized;

    if (step >= questions.length - 1) {
      onSubmit(nextAnswers);
      return;
    }

    setAnswers(nextAnswers);
    setStep((value) => value + 1);
    setCurrentInput(nextAnswers[step + 1] ?? '');
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/85 backdrop-blur-md">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div className="my-4 flex w-full max-w-2xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(160deg,rgba(15,23,42,0.97),rgba(12,18,34,0.97))] shadow-[0_24px_80px_rgba(3,7,18,0.55)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/15">
                <Skull className="h-6 w-6 text-red-300" />
              </div>
              <div>
                <div className="text-xl font-black tracking-wide text-white">答题复活</div>
                <div className="text-sm text-slate-300">连续答对 3 题才能以 50% 血量重返乱斗</div>
              </div>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-200">
              {progressLabel}
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {questions.map((item, index) => {
                const completed = index < step;
                const active = index === step;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                      active
                        ? 'border-cyan-300/60 bg-cyan-500/15 text-cyan-100'
                        : completed
                          ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {completed ? <CheckCircle2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                      第 {index + 1} 题
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{item.subject}</div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                <ShieldAlert className="h-4 w-4" />
                单次机会
              </div>
              <div className="text-lg font-semibold leading-8 text-white">{question.question}</div>

              {question.options?.length ? (
                <div className="mt-5 grid gap-3">
                  {question.options.map((option) => {
                    const selected = currentInput === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => storeAnswer(option)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? 'border-cyan-300/60 bg-cyan-400/15 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.2)]'
                            : 'border-white/10 bg-slate-900/70 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-500/10'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={currentInput}
                  onChange={(event) => storeAnswer(event.target.value)}
                  placeholder="输入你的答案"
                  className="mt-5 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                />
              )}
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              规则：中途死亡后只有这一次答题复活机会，失败则本局直接淘汰，成功后临时拾取增益会全部清空。
            </div>

            {submitError ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {submitError}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end border-t border-white/10 px-4 py-5 sm:px-6">
            <button
              type="button"
              disabled={!canSubmitCurrent || submitting}
              onClick={handleNext}
              className="rounded-full bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? '提交中...' : step >= questions.length - 1 ? '提交复活答卷' : '下一题'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
