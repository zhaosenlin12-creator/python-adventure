'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Home,
  ShoppingBag,
  Sparkles,
  Trees,
  X,
} from 'lucide-react';

interface GuideStep {
  id: number;
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    title: '欢迎来到宠物小屋',
    description:
      '这里是你和宠物一起生活的私人空间。你可以在这里陪伴、互动、布置房间，也能慢慢经营庭院。',
    tip: '第一次进入会自动出现一次说明，之后不会频繁打扰你。',
    icon: <Home className="h-8 w-8" />,
  },
  {
    id: 2,
    title: '客厅与庭院可以自由切换',
    description:
      '客厅更适合互动、聊天和装扮，庭院更适合慢节奏陪伴、散步以及后续的种植玩法。',
    tip: '如果你想看多只宠物一起活动，切到庭院通常会更有氛围。',
    icon: <Trees className="h-8 w-8" />,
  },
  {
    id: 3,
    title: '先逛商店，再布置小屋',
    description:
      '装饰商店可以购买家具和摆件，买到的内容会进入衣柜。选中后点击场景里的位置，就能直接摆放。',
    tip: '家具越丰富，小屋的舒适度和整体氛围也会更完整。',
    icon: <ShoppingBag className="h-8 w-8" />,
  },
  {
    id: 4,
    title: '食物补给与喂养入口',
    description:
      '通过食物商店补充库存，再从右侧背包给宠物喂食。不同食物会带来不同的状态收益。',
    tip: '如果你发现宠物状态下降，可以优先检查背包里是否有合适的食物。',
    icon: <Apple className="h-8 w-8" />,
  },
  {
    id: 5,
    title: '多互动，反馈会更丰富',
    description:
      '抚摸、玩耍、聊天、训练、阅读、绘画等行为都会影响宠物反馈。连续互动时，动作和语音气泡也会更自然。',
    tip: '想快速提升陪伴感时，建议在客厅连续进行几次不同互动。',
    icon: <Sparkles className="h-8 w-8" />,
  },
  {
    id: 6,
    title: '切换跟随与孵化提醒',
    description:
      '点击其他宠物可以直接切换当前跟随。孵化中的宠物蛋不需要额外设置跟随，只要首次通关新关卡就会自动推进进度。',
    tip: '如果忘了这个规则，小屋左上角也会保留一条简洁提示供你查看。',
    icon: <Home className="h-8 w-8" />,
  },
];

interface PetHomeGuideProps {
  onComplete?: () => void;
}

const LEGACY_STORAGE_KEY = 'pet-home-guide-completed';

export default function PetHomeGuide({ onComplete }: PetHomeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuthStore();
  const storageKey = getPetHomeGuideKey(user?.id);

  useEffect(() => {
    const completed = hasCompletedPetHomeGuide(user?.id);
    if (completed) {
      return;
    }

    const timer = window.setTimeout(() => setIsOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    localStorage.setItem(LEGACY_STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    handleComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    localStorage.setItem(LEGACY_STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) {
    return null;
  }

  const step = GUIDE_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_34%),rgba(2,6,23,0.76)] px-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="w-full max-w-xl overflow-hidden rounded-[30px] border border-amber-300/20 bg-[linear-gradient(155deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_34px_90px_rgba(2,6,23,0.5)]"
        >
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(251,191,36,0.94),rgba(249,115,22,0.92))] px-5 py-5 text-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/10 shadow-inner">
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.6 }}
                  >
                    {step.icon}
                  </motion.div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-900/70">
                    Pet Home Guide
                  </div>
                  <div className="mt-1 text-xl font-black">小屋新手引导</div>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="rounded-full border border-slate-950/10 bg-slate-950/8 p-2 text-slate-900/70 transition hover:bg-slate-950/14 hover:text-slate-950"
                aria-label="关闭引导"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="px-5 pt-4">
            <div className="flex gap-1.5">
              {GUIDE_STEPS.map((item, index) => (
                <div
                  key={item.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-right text-xs text-slate-400">
              第 {currentStep + 1} 步 / 共 {GUIDE_STEPS.length} 步
            </div>
          </div>

          <div className="px-6 pb-6 pt-5">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <h3 className="text-2xl font-black text-white pixel-text-shadow">{step.title}</h3>
              <p className="mt-4 text-[15px] leading-7 text-slate-300">{step.description}</p>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                  使用建议
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-200">{step.tip}</p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-5 py-4">
            <button
              onClick={handleSkip}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              跳过引导
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一步
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
              >
                {currentStep < GUIDE_STEPS.length - 1 ? (
                  <>
                    下一步
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    开始体验
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function getPetHomeGuideKey(userId?: number) {
  return userId ? `pet-home-guide-completed:${userId}` : 'pet-home-guide-completed';
}

export function hasCompletedPetHomeGuide(userId?: number) {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(localStorage.getItem(getPetHomeGuideKey(userId)) || localStorage.getItem(LEGACY_STORAGE_KEY));
}

export function resetPetHomeGuide(userId?: number) {
  localStorage.removeItem(getPetHomeGuideKey(userId));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
