'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Sparkles, Volume2, Wind, X } from 'lucide-react';
import {
  COURAGE_CARDS,
  HEALING_BREATHING_STEPS,
  HEALING_GROUNDING_STEPS,
  HEALING_MOOD_OPTIONS,
  HealingActivityId,
  HealingMoodId,
  getCourageCard,
  getMoodOption,
  getRecommendedActivity,
} from '@/lib/pet/healingCorner';

interface HealingCornerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  petName: string;
  ambientEnabled: boolean;
  onEnableAmbient: () => void;
}

const ACTIVITY_META: Record<
  Exclude<HealingActivityId, 'chat'>,
  { label: string; icon: typeof Wind; description: string }
> = {
  breathe: {
    label: '呼吸一下',
    icon: Wind,
    description: '跟着节奏吸气、停一下、慢慢呼气。',
  },
  ground: {
    label: '回到当下',
    icon: Sparkles,
    description: '看一看、听一听、动一动，把注意力拉回来。',
  },
  release: {
    label: '放下烦心',
    icon: Send,
    description: '写一句就好，写完就让它飘走。',
  },
  courage: {
    label: '鼓劲小卡',
    icon: Heart,
    description: '抽一张短卡，带着一点点勇气继续往前走。',
  },
};

function SoftPulseDots() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute rounded-full bg-emerald-300/18 blur-xl"
          style={{
            width: 72 + index * 24,
            height: 72 + index * 24,
            top: 10 + index * 8,
            left: `${18 + index * 23}%`,
          }}
          animate={{
            y: [0, -6, 0],
            opacity: [0.22, 0.38, 0.22],
            scale: [0.94, 1.04, 0.94],
          }}
          transition={{
            duration: 3.4 + index * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export default function HealingCornerPanel({
  isOpen,
  onClose,
  onOpenChat,
  petName,
  ambientEnabled,
  onEnableAmbient,
}: HealingCornerPanelProps) {
  const [selectedMood, setSelectedMood] = useState<HealingMoodId>('tense');
  const [activeActivity, setActiveActivity] = useState<Exclude<HealingActivityId, 'chat'>>('breathe');
  const [breathingStepIndex, setBreathingStepIndex] = useState(0);
  const [courageIndex, setCourageIndex] = useState(0);
  const [releaseText, setReleaseText] = useState('');
  const [releaseDone, setReleaseDone] = useState(false);
  const [groundingProgress, setGroundingProgress] = useState(0);

  const moodOption = useMemo(() => getMoodOption(selectedMood), [selectedMood]);
  const breathingStep = HEALING_BREATHING_STEPS[breathingStepIndex];
  const courageCard = getCourageCard(courageIndex);
  const groundingDone = groundingProgress >= HEALING_GROUNDING_STEPS.length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const recommended = getRecommendedActivity('tense');
    setSelectedMood('tense');
    setActiveActivity(recommended === 'chat' ? 'breathe' : recommended);
    setBreathingStepIndex(0);
    setReleaseText('');
    setReleaseDone(false);
    setGroundingProgress(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeActivity !== 'breathe') {
      return;
    }

    const step = HEALING_BREATHING_STEPS[breathingStepIndex];
    const timer = window.setTimeout(() => {
      setBreathingStepIndex((current) => (current + 1) % HEALING_BREATHING_STEPS.length);
    }, step.durationMs);

    return () => window.clearTimeout(timer);
  }, [activeActivity, breathingStepIndex, isOpen]);

  const handleMoodChange = (moodId: HealingMoodId) => {
    const recommended = getRecommendedActivity(moodId);
    setSelectedMood(moodId);
    setActiveActivity(recommended === 'chat' ? 'breathe' : recommended);
  };

  const handleRelease = () => {
    if (!releaseText.trim()) {
      return;
    }
    setReleaseDone(true);
  };

  const ActivityIcon = ACTIVITY_META[activeActivity].icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 28, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 28, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute right-5 top-20 z-[75] flex max-h-[calc(100vh-5.5rem)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.985))] shadow-[0_28px_70px_rgba(2,6,23,0.42)] backdrop-blur-xl"
        >
          <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(15,23,42,0))] px-4 py-4">
            <SoftPulseDots />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                  <Heart className="h-3.5 w-3.5" />
                  心能角
                </div>
                <h3 className="mt-2 text-lg font-black text-white">{petName} 陪你缓一缓</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">{moodOption.hint}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="关闭心能角"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {HEALING_MOOD_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMoodChange(item.id)}
                  className={`rounded-2xl border px-3 py-2 text-left transition ${
                    selectedMood === item.id
                      ? 'border-emerald-300/55 bg-emerald-500/12 text-white shadow-[0_12px_30px_rgba(16,185,129,0.16)]'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">{item.hint}</div>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(ACTIVITY_META) as Array<Exclude<HealingActivityId, 'chat'>>).map((activity) => {
                const meta = ACTIVITY_META[activity];
                const Icon = meta.icon;

                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => setActiveActivity(activity)}
                    className={`rounded-2xl border px-3 py-2 text-left transition ${
                      activeActivity === activity
                        ? 'border-sky-300/55 bg-sky-500/12 text-white'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="mt-2 text-xs font-semibold">{meta.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ActivityIcon className="h-4.5 w-4.5 text-sky-200" />
                {ACTIVITY_META[activeActivity].label}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{ACTIVITY_META[activeActivity].description}</p>

              {activeActivity === 'breathe' && (
                <div className="mt-4">
                  <div className="flex items-center justify-center rounded-[28px] border border-emerald-300/16 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.16),transparent_58%)] px-4 py-5">
                    <motion.div
                      animate={{
                        scale: breathingStep.scale,
                        opacity: [0.82, 1, 0.88],
                      }}
                      transition={{
                        duration: breathingStep.durationMs / 1000,
                        ease: 'easeInOut',
                      }}
                      className="flex h-32 w-32 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.16)]"
                    >
                      <div className="text-center">
                        <div className="text-base font-black text-white">{breathingStep.label}</div>
                        <div className="mt-1 text-xs text-emerald-100/80">{breathingStep.detail}</div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    {HEALING_BREATHING_STEPS.map((step, index) => (
                      <div
                        key={step.id}
                        className={`h-2 rounded-full transition ${
                          index === breathingStepIndex ? 'w-8 bg-emerald-300' : 'w-2 bg-white/18'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-100">想更安静一点</div>
                      <div className="mt-1 text-[11px] text-slate-400">开一点环境声，跟着节奏就好。</div>
                    </div>
                    <button
                      type="button"
                      onClick={onEnableAmbient}
                      disabled={ambientEnabled}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        ambientEnabled
                          ? 'border border-emerald-300/20 bg-emerald-500/12 text-emerald-100'
                          : 'border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]'
                      }`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      {ambientEnabled ? '已开启' : '打开环境声'}
                    </button>
                  </div>
                </div>
              )}

              {activeActivity === 'ground' && (
                <div className="mt-4">
                  <div className="grid gap-2">
                    {HEALING_GROUNDING_STEPS.map((step, index) => {
                      const done = index < groundingProgress;
                      const active = index === groundingProgress && !groundingDone;

                      return (
                        <div
                          key={step.id}
                          className={`rounded-[20px] border px-3 py-3 transition ${
                            done
                              ? 'border-emerald-300/35 bg-emerald-500/10'
                              : active
                                ? 'border-sky-300/35 bg-sky-500/10'
                                : 'border-white/10 bg-slate-950/35'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{step.title}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-300">{step.hint}</div>
                            </div>
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                done ? 'bg-emerald-300 text-slate-950' : 'bg-white/10 text-white'
                              }`}
                            >
                              {done ? '✓' : index + 1}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/45 px-3 py-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-100">
                        {groundingDone ? '很好，已经落回来了' : '完成一步就点一次'}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {groundingDone ? '如果还想继续放松，可以再做一轮。' : '不用追求完美，慢慢做就行。'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setGroundingProgress((current) =>
                          groundingDone ? 0 : Math.min(current + 1, HEALING_GROUNDING_STEPS.length),
                        )
                      }
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                    >
                      {groundingDone ? '再来一轮' : '完成一步'}
                    </button>
                  </div>
                </div>
              )}

              {activeActivity === 'release' && (
                <div className="mt-4">
                  <AnimatePresence mode="wait">
                    {releaseDone ? (
                      <motion.div
                        key="release-done"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="rounded-[24px] border border-sky-300/18 bg-sky-500/10 px-4 py-5"
                      >
                        <motion.div
                          initial={{ opacity: 0.9, x: 0, y: 0 }}
                          animate={{ opacity: 0, x: 84, y: -52, rotate: 12 }}
                          transition={{ duration: 1.1, ease: 'easeOut' }}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-100"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {releaseText.trim().slice(0, 18)}
                        </motion.div>
                        <div className="mt-6 text-sm font-semibold text-white">这句小烦恼已经飘走了。</div>
                        <div className="mt-1 text-xs leading-5 text-slate-300">先轻一点，再继续今天的冒险。</div>
                        <button
                          type="button"
                          onClick={() => {
                            setReleaseText('');
                            setReleaseDone(false);
                          }}
                          className="mt-4 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                        >
                          再写一句
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="release-input"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                      >
                        <textarea
                          value={releaseText}
                          onChange={(event) => setReleaseText(event.target.value.slice(0, 40))}
                          rows={3}
                          placeholder="写一句就好，比如：我现在有点紧张。"
                          className="w-full resize-none rounded-[22px] border border-white/10 bg-slate-950/55 px-3 py-3 text-sm text-white outline-none transition focus:border-sky-300/45"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="text-[11px] text-slate-400">写完就放下，不会留在这里。</div>
                          <div className="text-[11px] text-slate-500">{releaseText.length}/40</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRelease}
                          disabled={!releaseText.trim()}
                          className={`mt-3 w-full rounded-full px-3 py-2 text-sm font-semibold transition ${
                            releaseText.trim()
                              ? 'bg-sky-500 text-white hover:bg-sky-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          放出去
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeActivity === 'courage' && (
                <div className="mt-4 rounded-[24px] border border-amber-300/18 bg-amber-500/8 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/80">
                    Courage Card
                  </div>
                  <div className="mt-2 text-base font-black text-white">{courageCard.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{courageCard.message}</p>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-300">
                    {courageCard.action}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCourageIndex((current) => (current + 1) % COURAGE_CARDS.length)}
                    className="mt-4 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                  >
                    换一张
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={onOpenChat}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-300/24 bg-sky-500/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500/18"
            >
              <MessageCircle className="h-4 w-4" />
              和小伴聊聊
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
