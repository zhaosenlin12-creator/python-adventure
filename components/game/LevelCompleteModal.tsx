'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Coins, RotateCcw, Star, Swords, Target, Trophy, X } from 'lucide-react';
import { playSound } from '@/lib/soundEffects';

interface LevelCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextLevel: () => void;
  onRetry: () => void;
  success: boolean;
  levelData: {
    title: string;
    score: number;
    stars?: number;
    timeElapsed?: number;
    objectives: string[];
    questionsCorrect?: number;
    questionsTotal?: number;
    itemsCollected?: number;
    itemsTotal?: number;
    hpRemaining?: number;
    hpTotal?: number;
    enemiesDefeated?: number;
    enemiesTotal?: number;
    rewards: {
      exp: number;
      coins: number;
      items?: string[];
    };
  };
}

const formatTime = (timeElapsed?: number) => {
  if (!timeElapsed) return null;
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = (timeElapsed % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function LevelCompleteModal({
  isOpen,
  onClose,
  onNextLevel,
  onRetry,
  success,
  levelData,
}: LevelCompleteModalProps) {
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (success) {
        playSound('level_complete');
        const timer = setTimeout(() => {
          setShowRewards(true);
        }, 800);
        return () => clearTimeout(timer);
      }

      playSound('level_failed');
      setShowRewards(false);
      return undefined;
    }

    setShowRewards(false);
    return undefined;
  }, [isOpen, success]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,#264870_0%,rgba(12,18,34,0.96)_38%,rgba(5,7,13,0.98)_100%)] p-4 backdrop-blur-md">
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-[32px] border bg-slate-950/82 shadow-[0_40px_120px_rgba(0,0,0,0.44)] ${
          success ? 'border-emerald-200/18' : 'border-rose-200/18'
        }`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-44 ${
            success
              ? 'bg-gradient-to-b from-emerald-300/24 via-cyan-300/10 to-transparent'
              : 'bg-gradient-to-b from-rose-300/22 via-orange-300/8 to-transparent'
          }`}
        />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-200 transition-all hover:-translate-y-0.5 hover:bg-white/12 hover:text-white"
          aria-label="关闭结算面板"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative p-6 text-center sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
            <Swords className="h-3.5 w-3.5" />
            <span>{success ? 'Quest Clear' : 'Try Again'}</span>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-slate-900/76 shadow-[0_24px_46px_rgba(0,0,0,0.26)]">
              <div
                className={`absolute inset-0 rounded-full blur-2xl ${
                  success ? 'bg-emerald-300/26' : 'bg-rose-300/22'
                }`}
              />
              {success ? (
                <Trophy className="relative h-12 w-12 text-yellow-300" strokeWidth={2.6} />
              ) : (
                <Target className="relative h-12 w-12 text-rose-200" strokeWidth={2.6} />
              )}
            </div>
          </div>

          <h2 className={`text-3xl font-bold sm:text-4xl ${success ? 'text-emerald-100' : 'text-rose-100'}`}>
            {success ? '关卡完成' : '任务失败'}
          </h2>
          <p className="mt-2 text-lg text-slate-200/82">{levelData.title}</p>

          {success && levelData.stars ? (
            <div className="mt-5">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className={`h-10 w-10 ${
                      star <= (levelData.stars || 0)
                        ? 'fill-yellow-300 text-yellow-300'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-200/78">
                {levelData.stars === 3 && '完美通关，动作和答题都很稳。'}
                {levelData.stars === 2 && '表现不错，还能继续压缩失误。'}
                {levelData.stars === 1 && '已经过关，下一次可以冲更高评价。'}
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-[26px] border border-white/10 bg-slate-900/78 p-5">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-300" />
              <span className="text-4xl font-bold text-white">{levelData.score}</span>
              <span className="text-slate-400">分</span>
            </div>
            {formatTime(levelData.timeElapsed) && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-300/80">
                <Clock className="h-4 w-4" />
                <span>用时 {formatTime(levelData.timeElapsed)}</span>
              </div>
            )}
          </div>

          {success && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {levelData.questionsCorrect !== undefined && levelData.questionsTotal !== undefined && (
                <StatCard
                  label="答题进度"
                  value={`${levelData.questionsCorrect}/${levelData.questionsTotal}`}
                  tone={
                    levelData.questionsCorrect === levelData.questionsTotal ? 'good' : 'warn'
                  }
                />
              )}
              {levelData.itemsCollected !== undefined && levelData.itemsTotal !== undefined && (
                <StatCard
                  label="收集物"
                  value={`${levelData.itemsCollected}/${levelData.itemsTotal}`}
                  tone={levelData.itemsCollected === levelData.itemsTotal ? 'good' : 'warn'}
                />
              )}
              {levelData.hpRemaining !== undefined && levelData.hpTotal !== undefined && (
                <StatCard
                  label="剩余生命"
                  value={`${levelData.hpRemaining}/${levelData.hpTotal}`}
                  tone={
                    levelData.hpRemaining === levelData.hpTotal
                      ? 'good'
                      : levelData.hpRemaining > levelData.hpTotal * 0.5
                        ? 'warn'
                        : 'danger'
                  }
                />
              )}
              {levelData.enemiesDefeated !== undefined && levelData.enemiesTotal !== undefined && (
                <StatCard
                  label="击败敌人"
                  value={`${levelData.enemiesDefeated}/${levelData.enemiesTotal}`}
                  tone={
                    levelData.enemiesDefeated === levelData.enemiesTotal ? 'good' : 'warn'
                  }
                />
              )}
            </div>
          )}

          {success && levelData.objectives.length > 0 && (
            <div className="mt-5 rounded-[24px] border border-emerald-200/14 bg-emerald-300/8 p-4 text-left">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-100">
                <CheckMark />
                <span>目标完成</span>
              </div>
              <div className="space-y-2">
                {levelData.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-slate-100/84">
                    <span className="mt-0.5 text-emerald-200">•</span>
                    <span>{objective}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {success && showRewards && (
            <div className="mt-5 rounded-[24px] border border-yellow-200/14 bg-gradient-to-r from-yellow-300/12 to-orange-300/10 p-5">
              <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-yellow-100">
                <Trophy className="h-4 w-4" />
                获得奖励
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-white">
                  <Star className="h-5 w-5 text-sky-200" />
                  <span>+{levelData.rewards.exp} 经验</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-white">
                  <Coins className="h-5 w-5 text-yellow-200" />
                  <span>+{levelData.rewards.coins} 金币</span>
                </div>
              </div>
              {levelData.rewards.items && levelData.rewards.items.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-sm text-slate-100/84">
                  获得物品：{levelData.rewards.items.join(', ')}
                </div>
              )}
            </div>
          )}

          {!success && (
            <div className="mt-5 rounded-[24px] border border-rose-200/14 bg-rose-300/8 px-4 py-4 text-sm text-rose-50/90">
              这次没有通过，但关卡逻辑和题目不会变。调整一下节奏，再试一轮就行。
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {success ? (
              <>
                <button
                  onClick={onNextLevel}
                  className="flex-1 rounded-2xl border border-emerald-200/18 bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-3 font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(52,211,153,0.24)]"
                >
                  下一关
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-white/10 bg-white/6 px-5 py-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/12"
                >
                  返回
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onRetry}
                  className="flex-1 rounded-2xl border border-amber-200/18 bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-3 font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(251,191,36,0.24)]"
                >
                  <RotateCcw className="mr-2 inline h-4.5 w-4.5" />
                  重试
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-white/10 bg-white/6 px-5 py-3 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/12"
                >
                  退出
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckMark() {
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/18 text-xs text-emerald-100">
      ✓
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-200/12 bg-emerald-300/8 text-emerald-100'
      : tone === 'warn'
        ? 'border-amber-200/12 bg-amber-300/8 text-amber-100'
        : 'border-rose-200/12 bg-rose-300/8 text-rose-100';

  return (
    <div className={`rounded-[22px] border px-4 py-3 text-left ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-white/58">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
