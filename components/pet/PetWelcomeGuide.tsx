'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  PawPrint,
  Brain,
  Palette,
  Dumbbell,
  BookOpen,
  Target,
  Rocket
} from 'lucide-react';

interface PetWelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 宠物系统新手引导
 * 点击"领养宠物"按钮后显示，介绍宠物系统
 */
export default function PetWelcomeGuide({ isOpen, onClose }: PetWelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    {
      title: '欢迎来到宠物系统',
      icon: <Sparkles className="w-5 h-5 text-orange-300" />,
      content: (
        <div className="space-y-3 text-sm text-gray-200">
          <p className="text-white font-medium">你已解锁宠物养成系统。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-orange-300" />
              选择你的专属伙伴，与你一起成长
            </li>
            <li className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-300" />
              完成关卡会提升宠物属性与亲密度
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-300" />
              学习与训练将影响进化与能力
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '宠物面板位置',
      icon: <MapPin className="w-5 h-5 text-blue-300" />,
      content: (
        <div className="space-y-3 text-sm text-gray-200">
          <p>面板默认显示在左上角，可拖动到任意位置。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-300" />
              折叠状态显示头像与等级
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-300" />
              点击展开查看属性与功能
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '属性与成长',
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-3 text-sm text-slate-600">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              智力：提升解题与成长效率
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-500" />
              创造力：影响创意与进化条件
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-blue-500" />
              毅力：训练与对战表现
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '如何获得孵化进度',
      icon: <Target className="w-5 h-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>完成新手关卡可提升孵化进度。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              每完成 1 个关卡，孵化进度 +1
            </li>
            <li className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-400" />
              完成 3 个关卡即可孵化
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              入口：主页章节关卡 / 开放世界战役模式
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '开始体验',
      icon: <Rocket className="w-5 h-5 text-amber-500" />,
      content: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>展开蛋面板即可查看孵化进度与操作入口。</p>
          <p className="text-slate-400">完成关卡后将触发孵化仪式动画。</p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const panel = panelRef.current;
      const width = panel?.offsetWidth || 360;
      const height = panel?.offsetHeight || 280;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const nextX = Math.min(Math.max(8, e.clientX - dragOffset.current.x), maxX);
      const nextY = Math.min(Math.max(8, e.clientY - dragOffset.current.y), maxY);
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, isDragging]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] w-96 max-w-[92vw] bg-slate-800 border-2 border-slate-700 shadow-2xl rounded-lg overflow-hidden backdrop-blur-md"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-500 cursor-move"
        onMouseDown={(e) => {
          setIsDragging(true);
          dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }}
      >
        <div className="flex items-center gap-2 text-white">
          {steps[currentStep].icon}
          <h2 className="text-sm font-bold">{steps[currentStep].title}</h2>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3">
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded transition-all ${
                index === currentStep ? 'bg-emerald-400' : index < currentStep ? 'bg-emerald-300' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">{steps[currentStep].content}</div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
          跳过引导
        </button>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button onClick={handlePrev} className="pixel-btn bg-slate-700 text-slate-600 border border-slate-600 px-3 py-1.5 text-xs">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleNext} className="pixel-btn bg-blue-600 text-white hover:bg-emerald-400 px-3 py-1.5 text-xs">
            {currentStep === steps.length - 1 ? (
              '开始体验'
            ) : (
              <span className="flex items-center gap-1">
                下一步
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
