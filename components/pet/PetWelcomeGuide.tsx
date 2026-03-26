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
  Rocket,
} from 'lucide-react';

interface PetWelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PetWelcomeGuide({ isOpen, onClose }: PetWelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement | null>(null);

  const steps = [
    {
      title: '欢迎来到宠物系统',
      icon: <Sparkles className="h-5 w-5 text-orange-300" />,
      content: (
        <div className="space-y-3 text-sm text-gray-200">
          <p className="font-medium text-white">你已经解锁宠物养成系统。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-orange-300" />
              从 20 只体系化宠物里挑选外观，陪你一起成长。
            </li>
            <li className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-300" />
              通关、喂养和互动都会持续影响成长与进化。
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-orange-300" />
              图鉴、小屋、开放世界会共用同一套宠物外观与进化形态。
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '宠物面板位置',
      icon: <MapPin className="h-5 w-5 text-blue-300" />,
      content: (
        <div className="space-y-3 text-sm text-gray-200">
          <p>面板默认显示在左上角，可以拖动到任意位置。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-300" />
              折叠状态会显示头像和等级。
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-300" />
              展开后可以直接喂养、进化、进入小屋和查看图鉴。
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '属性与成长',
      icon: <Brain className="h-5 w-5 text-purple-500" />,
      content: (
        <div className="space-y-3 text-sm text-slate-200">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              智力：提升成长效率和进化条件。
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-500" />
              创造力：影响创意路线与高阶进化。
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-blue-500" />
              毅力：关系到训练、战斗和后期门槛。
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '孵化进度怎么推进',
      icon: <Target className="h-5 w-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-200">
          <p>现在不需要把宠物蛋设为跟随。</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              每首次通关一个新关卡，所有未孵化宠物蛋都会自动 +1。
            </li>
            <li className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-400" />
              满 3 点后即可直接进入宠物选择器挑选外观。
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              入口就在战役关卡或开放大厅的战役站点。
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '开始体验',
      icon: <Rocket className="h-5 w-5 text-amber-500" />,
      content: (
        <div className="space-y-3 text-sm text-slate-200">
          <p>展开宠物面板即可查看当前进度、图鉴和小屋互动入口。</p>
          <p className="text-slate-400">
            如果你有多枚宠物蛋，图鉴里的蛋仓会统一展示所有蛋的孵化状态。
          </p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const panel = panelRef.current;
      const width = panel?.offsetWidth || 360;
      const height = panel?.offsetHeight || 280;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const nextX = Math.min(Math.max(8, event.clientX - dragOffset.current.x), maxX);
      const nextY = Math.min(Math.max(8, event.clientY - dragOffset.current.y), maxY);
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
      className="fixed z-[9999] w-96 max-w-[92vw] overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-800 shadow-2xl backdrop-blur-md"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex cursor-move items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-3"
        onMouseDown={(event) => {
          setIsDragging(true);
          dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
        }}
      >
        <div className="flex items-center gap-2 text-white">
          {steps[currentStep].icon}
          <h2 className="text-sm font-bold">{steps[currentStep].title}</h2>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

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

      <div className="px-4 py-3">{steps[currentStep].content}</div>

      <div className="flex items-center justify-between px-4 pb-4">
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">
          跳过引导
        </button>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} className="pixel-btn border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep === steps.length - 1) {
                onClose();
                return;
              }
              setCurrentStep((step) => Math.min(steps.length - 1, step + 1));
            }}
            className="pixel-btn bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-400"
          >
            {currentStep === steps.length - 1 ? (
              '开始体验'
            ) : (
              <span className="flex items-center gap-1">
                下一步
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
