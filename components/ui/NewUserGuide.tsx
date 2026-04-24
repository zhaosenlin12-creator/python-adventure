'use client';

import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Coins,
  Map,
  Rocket,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

interface NewUserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewUserGuide({ isOpen, onClose }: NewUserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuthStore();
  const storageKey = getNewUserGuideKey(user?.id);

  const steps: { icon: ReactNode; title: string; content: ReactNode }[] = [
    {
      icon: <Sparkles className="h-7 w-7 text-blue-400" />,
      title: `欢迎，${user?.username || '冒险者'}！`,
      content: (
        <div className="space-y-4">
          <p className="text-base text-slate-300">
            欢迎来到 <span className="font-bold text-blue-400">Python 冒险岛</span>。
            你可以一边闯关，一边学习编程，还能培养自己的代码伙伴。
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-blue-900/30 p-3">
              <BookOpen className="h-6 w-6 text-blue-400" />
              <span className="text-xs text-slate-300">章节闯关</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-blue-900/30 p-3">
              <Target className="h-6 w-6 text-teal-400" />
              <span className="text-xs text-slate-300">挑战目标</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-700 bg-blue-900/30 p-3">
              <Map className="h-6 w-6 text-blue-400" />
              <span className="text-xs text-slate-300">开放世界</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <BookOpen className="h-7 w-7 text-blue-400" />,
      title: '怎么开始学习？',
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-slate-700 bg-blue-900/30 p-3">
            <BookOpen className="mt-0.5 h-6 w-6 text-blue-400" />
            <div>
              <p className="font-bold text-blue-400">章节闯关</p>
              <p className="text-sm text-slate-300">适合新手，从基础开始，循序渐进学习编程。</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-700 bg-blue-900/30 p-3">
            <Map className="mt-0.5 h-6 w-6 text-blue-400" />
            <div>
              <p className="font-bold text-blue-400">开放世界</p>
              <p className="text-sm text-slate-300">适合想继续探索的玩家，能体验更多玩法和互动。</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Coins className="h-7 w-7 text-amber-400" />,
      title: '奖励怎么获得？',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">完成学习和挑战后可以获得金币奖励：</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-900/30 p-2">
              <span className="text-sm text-slate-300">普通关卡</span>
              <span className="font-bold text-amber-300">+10</span>
            </div>
            <div className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-900/30 p-2">
              <span className="text-sm text-slate-300">Boss 关卡</span>
              <span className="font-bold text-amber-300">+50</span>
            </div>
            <div className="flex items-center justify-between rounded border border-amber-500/30 bg-amber-900/30 p-2">
              <span className="text-sm text-slate-300">战役与活动</span>
              <span className="font-bold text-amber-300">+10~30</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">金币可以用来购买宠物食物和部分装饰物。</p>
        </div>
      ),
    },
    {
      icon: <Rocket className="h-7 w-7 text-blue-400" />,
      title: '开始你的冒险',
      content: (
        <div className="space-y-4 text-center">
          <p className="text-lg font-bold text-blue-400">准备好了就出发吧。</p>
          <div className="rounded-lg border border-slate-700 bg-blue-900/30 p-4">
            <p className="text-sm text-slate-300">
              推荐先从 <span className="font-bold text-blue-400">Python 基础</span> 开始，
              逐步解锁更多章节、技能和玩法。
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            学习、练习、挑战，三步一体。
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, 'true');
      }
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="pixel-panel mx-4 w-full max-w-md overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl">
        <div className="relative border-b border-slate-700 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 p-4">
          <button
            onClick={handleSkip}
            className="absolute right-3 top-3 text-slate-400 transition-colors hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-blue-900/30">
              {steps[currentStep].icon}
            </div>
            <h2 className="text-xl font-bold text-white">{steps[currentStep].title}</h2>
          </div>
          <div className="mt-3 flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded transition-all ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                      ? 'bg-blue-400'
                      : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[220px] bg-slate-700 p-5">
          {steps[currentStep].content}
        </div>

        <div className="flex items-center justify-between border-t border-slate-700 bg-blue-900/30 p-4">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 transition-colors hover:text-slate-300"
          >
            跳过引导
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="pixel-btn border border-slate-600 bg-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-600"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="pixel-btn flex items-center gap-2 bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              {currentStep === steps.length - 1 ? '开始冒险' : '下一步'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowNewUserGuide(userId?: number): boolean {
  if (typeof window === 'undefined') return false;

  const completed = localStorage.getItem(getNewUserGuideKey(userId));
  return !completed;
}

export function getNewUserGuideKey(userId?: number) {
  return userId ? `newUserGuideCompleted:${userId}` : 'newUserGuideCompleted';
}
