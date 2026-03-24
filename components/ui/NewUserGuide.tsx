'use client';

import { useState, type ReactNode } from 'react';
import { X, ChevronRight, Sparkles, BookOpen, Map, Coins, Rocket, CheckCircle2, Target } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface NewUserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 新用户欢迎引导组件
 * 登录后首次显示，介绍游戏核心功能
 * UI风格：深色像素面板 + 蓝青高亮，贴合游戏主色
 */
export default function NewUserGuide({ isOpen, onClose }: NewUserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuthStore();
  const storageKey = getNewUserGuideKey(user?.id);
  
  const steps: { icon: ReactNode; title: string; content: ReactNode }[] = [
    {
      icon: <Sparkles className="w-7 h-7 text-blue-400" />,
      title: `欢迎, ${user?.username || '冒险者'}!`,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300 text-base">
            欢迎来到 <span className="text-blue-400 font-bold">Python冒险岛</span>，在挑战中学习编程，
            并培养属于你的代码伙伴。
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-900/30 border border-slate-700 rounded-lg p-3 flex flex-col items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <span className="text-xs text-slate-300">章节闯关</span>
            </div>
            <div className="bg-blue-900/30 border border-slate-700 rounded-lg p-3 flex flex-col items-center gap-2">
              <Target className="w-6 h-6 text-teal-500" />
              <span className="text-xs text-slate-300">挑战目标</span>
            </div>
            <div className="bg-blue-900/30 border border-slate-700 rounded-lg p-3 flex flex-col items-center gap-2">
              <Map className="w-6 h-6 text-blue-400" />
              <span className="text-xs text-slate-300">开放世界</span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <BookOpen className="w-7 h-7 text-blue-400" />,
      title: '如何开始学习？',
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-900/30 rounded-lg border border-slate-700">
            <BookOpen className="w-6 h-6 text-blue-400 mt-0.5" />
            <div>
              <p className="font-bold text-blue-400">章节关卡（推荐新手）</p>
              <p className="text-sm text-slate-300">从基础开始，循序渐进学习Python</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-900/30 rounded-lg border border-slate-700">
            <Map className="w-6 h-6 text-blue-400 mt-0.5" />
            <div>
              <p className="font-bold text-blue-400">开放世界</p>
              <p className="text-sm text-slate-300">探索战役模式、竞技场和创意工坊</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: (
        <img
          src="/assets/pets/egg.svg"
          alt="宠物蛋"
          className="w-8 h-8 object-contain"
        />
      ),
      title: '你的代码伙伴',
      content: (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="flex justify-center">
              <img
                src="/assets/pets/egg.svg"
                alt="宠物蛋"
                className="w-20 h-20 object-contain animate-bounce"
              />
            </div>
            <p className="text-blue-400 font-bold mt-2">你已获得一颗神秘的蛋</p>
          </div>
          <div className="bg-blue-900/30 p-4 rounded-lg border border-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5" />
              <p className="text-slate-300 text-sm">
                完成 <span className="text-blue-400 font-bold">3个关卡</span> 后即可孵化，
                选择你喜欢的宠物类型。
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">
            宠物会随学习成长，并在冒险中提供帮助
          </p>
        </div>
      )
    },
    {
      icon: <Coins className="w-7 h-7 text-amber-500" />,
      title: '金币奖励系统',
      content: (
        <div className="space-y-3">
          <p className="text-slate-300 text-sm">完成关卡与活动可获得金币奖励：</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-amber-900/30 rounded border border-amber-500/30">
              <span className="text-slate-300 text-sm">章节关卡</span>
              <span className="text-blue-400 font-bold">+10</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-amber-900/30 rounded border border-amber-500/30">
              <span className="text-slate-300 text-sm">BOSS关卡</span>
              <span className="text-blue-400 font-bold">+50</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-amber-900/30 rounded border border-amber-500/30">
              <span className="text-slate-300 text-sm">战役关卡</span>
              <span className="text-blue-400 font-bold">+10~30</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-amber-900/30 rounded border border-amber-500/30">
              <span className="text-slate-300 text-sm">每日登录</span>
              <span className="text-blue-400 font-bold">+10~30</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">金币可用于购买宠物食物与装饰品</p>
        </div>
      )
    },
    {
      icon: <Rocket className="w-7 h-7 text-blue-400" />,
      title: '开始你的冒险！',
      content: (
        <div className="space-y-4 text-center">
          <p className="text-lg font-bold text-blue-400">准备好了吗？</p>
          <div className="bg-blue-900/30 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-300 text-sm">
              建议从 <span className="text-blue-400 font-bold">第1章：Python基础</span> 开始，
              完成关卡解锁更多内容。
            </p>
          </div>
          <p className="text-xs text-slate-500">祝你编程之旅顺利开始</p>
        </div>
      )
    }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 记录已完成新手引导
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
      <div className="pixel-panel max-w-md w-full mx-4 overflow-hidden border-2 border-slate-700 bg-slate-800 backdrop-blur-md rounded-2xl shadow-xl">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 p-4 border-b border-slate-700 relative">
          <button 
            onClick={handleSkip}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-blue-900/30 border border-slate-700 rounded-lg">
              {steps[currentStep].icon}
            </div>
            <h2 className="text-xl font-bold text-white">
              {steps[currentStep].title}
            </h2>
          </div>
          {/* 进度指示器 */}
          <div className="flex gap-1 mt-3">
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
        
        {/* 内容 */}
        <div className="p-5 bg-slate-700 min-h-[220px]">
          {steps[currentStep].content}
        </div>
        
        {/* 底部按钮 */}
        <div className="p-4 bg-blue-900/30 border-t border-slate-700 flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            跳过引导
          </button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="pixel-btn bg-slate-700 text-slate-300 hover:bg-slate-600 px-4 py-2 border border-slate-600"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="pixel-btn bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold hover:from-blue-500 hover:to-teal-400 px-4 py-2 flex items-center gap-2 border border-blue-500/60"
            >
              {currentStep === steps.length - 1 ? '开始冒险' : '下一步'}
              {currentStep === steps.length - 1 ? <Rocket className="w-4 h-4" /> : null}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 检查是否需要显示新用户引导
 */
export function shouldShowNewUserGuide(userId?: number): boolean {
  if (typeof window === 'undefined') return false;
  
  const completed = localStorage.getItem(getNewUserGuideKey(userId));
  return !completed;
}

export function getNewUserGuideKey(userId?: number) {
  return userId ? `newUserGuideCompleted:${userId}` : 'newUserGuideCompleted';
}
