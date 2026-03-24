'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Home, ShoppingBag, Apple, Sparkles } from 'lucide-react';

interface GuideStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSS选择器，高亮对应元素
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    title: '欢迎来到宠物小屋！',
    description: '这是你和代码伙伴的温馨家园，在这里你可以和宠物互动、装饰房间、喂养它们。',
    icon: <Home className="w-8 h-8" />
  },
  {
    id: 2,
    title: '场景切换',
    description: '点击顶部的「客厅」和「庭院」按钮，可以切换不同的场景。每个场景都可以放置不同的装饰品！',
    icon: <Home className="w-8 h-8" />
  },
  {
    id: 3,
    title: '装饰商店',
    description: '点击「装饰商店」购买各种可爱的装饰品，用金币购买后可以自由放置在房间里。',
    icon: <ShoppingBag className="w-8 h-8" />
  },
  {
    id: 4,
    title: '食物商店 & 背包',
    description: '在「食物商店」购买食物，然后通过右侧的「食物背包」喂养你的宠物。不同食物有不同的属性加成！',
    icon: <Apple className="w-8 h-8" />
  },
  {
    id: 5,
    title: '互动按钮',
    description: '屏幕两侧有互动按钮：抚摸、玩耍、交流、训练。经常互动可以提升宠物的属性和亲密度！',
    icon: <Sparkles className="w-8 h-8" />
  },
  {
    id: 6,
    title: '我的衣柜',
    description: '点击左侧的「我的衣柜」，可以查看已购买的装饰品。选择一个装饰品，然后点击场景中的位置放置它。',
    icon: <ShoppingBag className="w-8 h-8" />
  }
];

const STORAGE_KEY = 'pet-home-guide-completed';

interface PetHomeGuideProps {
  onComplete?: () => void;
}

export default function PetHomeGuide({ onComplete }: PetHomeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // 检查是否已完成引导
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // 延迟显示，让用户先看到场景
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };
  
  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };
  
  if (!isOpen) return null;
  
  const step = GUIDE_STEPS[currentStep];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center"
      >
        {/* 引导卡片 */}
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl border-4 border-amber-500 shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        >
          {/* 头部 */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-900">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                {step.icon}
              </motion.div>
              <span className="font-bold text-lg">新手引导</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-900/70 hover:text-slate-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* 进度条 */}
          <div className="px-4 pt-4">
            <div className="flex gap-1">
              {GUIDE_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">
              {currentStep + 1} / {GUIDE_STEPS.length}
            </div>
          </div>
          
          {/* 内容 */}
          <div className="p-6">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h3 className="text-2xl font-bold text-white mb-4 pixel-text-shadow">
                {step.title}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          </div>
          
          {/* 底部按钮 */}
          <div className="p-4 bg-slate-900/50 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              跳过引导
            </button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="pixel-btn bg-slate-600 hover:bg-slate-500 px-4 py-2 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="pixel-btn bg-amber-600 hover:bg-amber-500 text-slate-900 px-4 py-2 flex items-center gap-1"
              >
                {currentStep < GUIDE_STEPS.length - 1 ? (
                  <>
                    下一步
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    开始体验
                    <Sparkles className="w-4 h-4" />
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

// 重置引导状态的工具函数（用于测试）
export function resetPetHomeGuide() {
  localStorage.removeItem(STORAGE_KEY);
}
