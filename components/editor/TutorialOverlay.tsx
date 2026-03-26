"use client";

/**
 * TutorialOverlay - 新手引导覆盖层组件
 * Requirements: 设计文档-新手引导
 * 实现分步骤高亮提示，引导用户完成第一个关卡的创建
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle } from "lucide-react";

// ==================== 教程步骤定义 ====================

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetArea: "palette" | "canvas" | "toolbar" | "property" | "none";
  highlightElement?: string;  // CSS selector for highlight
  action?: "place_platform" | "place_enemy" | "place_collectible" | "place_goal" | "test" | "save";
  completionCheck?: () => boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "欢迎来到创意工坊！",
    description: "在这里，你可以创建属于自己的关卡。让我们一步步学习如何使用编辑器吧！",
    icon: "🎨",
    targetArea: "none",
  },
  {
    id: "palette_intro",
    title: "认识元素面板",
    description: "左侧是元素面板，包含了所有可以放置的元素。点击元素后，在画布上点击即可放置。",
    icon: "📦",
    targetArea: "palette",
  },
  {
    id: "place_platform",
    title: "放置平台",
    description: "首先，让我们放置一些平台。在元素面板中点击「平台」类别，选择一个平台元素，然后在画布上点击放置。",
    icon: "▭",
    targetArea: "palette",
    action: "place_platform",
  },
  {
    id: "place_collectible",
    title: "添加收集物",
    description: "接下来，添加一些金币或宝石让关卡更有趣！在「收集物」类别中选择金币，放置在平台上方。",
    icon: "🪙",
    targetArea: "palette",
    action: "place_collectible",
  },
  {
    id: "place_enemy",
    title: "放置敌人",
    description: "添加一些敌人增加挑战性！在「敌人」类别中选择一个敌人，放置在平台上。",
    icon: "👾",
    targetArea: "palette",
    action: "place_enemy",
  },
  {
    id: "place_goal",
    title: "设置终点",
    description: "每个关卡都需要一个终点！在「特殊」类别中选择「终点」⭐，放置在关卡的末尾。",
    icon: "⭐",
    targetArea: "palette",
    action: "place_goal",
  },
  {
    id: "property_panel",
    title: "属性面板",
    description: "选中任意元素后，右侧的属性面板会显示该元素的配置选项。你可以调整位置、大小等属性。",
    icon: "⚙️",
    targetArea: "property",
  },
  {
    id: "toolbar_intro",
    title: "工具栏",
    description: "顶部工具栏包含常用操作：选择工具、撤销/重做、测试关卡、保存等。",
    icon: "🔧",
    targetArea: "toolbar",
  },
  {
    id: "test_level",
    title: "测试关卡",
    description: "点击工具栏中的「测试」按钮🎮，可以立即试玩你的关卡！测试完成后会自动返回编辑器。你可以稍后再试。",
    icon: "🎮",
    targetArea: "toolbar",
    // No action - optional step
  },
  {
    id: "save_level",
    title: "保存关卡",
    description: "满意你的作品后，点击「保存」按钮💾将关卡保存到云端。下次可以继续编辑！",
    icon: "💾",
    targetArea: "toolbar",
    // No action - optional step
  },
  {
    id: "complete",
    title: "教程完成！",
    description: "恭喜你！现在你已经掌握了创意工坊的基本操作。开始创作你的第一个关卡吧！",
    icon: "🎉",
    targetArea: "none",
  },
];

// ==================== 组件属性 ====================

interface TutorialOverlayProps {
  onComplete?: () => void;
}

// ==================== 主组件 ====================

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const {
    showTutorial,
    tutorialStep,
    nextTutorialStep,
    skipTutorial,
    elements,
    goal,
  } = useEditorStore();

  const [isAnimating, setIsAnimating] = useState(false);

  // Get current step
  const currentStep = useMemo(() => {
    return TUTORIAL_STEPS[tutorialStep] || TUTORIAL_STEPS[0];
  }, [tutorialStep]);

  // Check if current step action is completed
  const isStepActionCompleted = useMemo(() => {
    if (!currentStep.action) return true;

    switch (currentStep.action) {
      case "place_platform":
        return elements.some(
          (el) =>
            el.type === "ground" ||
            el.type === "platform" ||
            el.type === "moving" ||
            el.type === "bouncy" ||
            el.type === "disappearing" ||
            el.type === "conveyor" ||
            el.type === "gravity_flip"
        );
      case "place_collectible":
        return elements.some(
          (el) =>
            el.type === "coin" || el.type === "gem" || el.type === "key" || el.type === "clue"
        );
      case "place_enemy":
        return elements.some((el) => el.type.startsWith("enemy_"));
      case "place_goal":
        return goal !== null;
      default:
        return true;
    }
  }, [currentStep.action, elements, goal]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);

    // Check if this is the last step
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      skipTutorial();
      onComplete?.();
    } else {
      nextTutorialStep();
    }

    setTimeout(() => setIsAnimating(false), 300);
  }, [tutorialStep, nextTutorialStep, skipTutorial, onComplete, isAnimating]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (isAnimating || tutorialStep <= 0) return;

    setIsAnimating(true);

    // Go back one step by resetting and advancing
    const targetStep = tutorialStep - 1;
    const { reset } = useEditorStore.getState();
    
    // We need to manually set the tutorial step
    useEditorStore.setState({ tutorialStep: targetStep });

    setTimeout(() => setIsAnimating(false), 300);
  }, [tutorialStep, isAnimating]);

  // Handle skip tutorial
  const handleSkip = useCallback(() => {
    skipTutorial();
    onComplete?.();
  }, [skipTutorial, onComplete]);

  // Auto-advance when action is completed
  useEffect(() => {
    if (currentStep.action && isStepActionCompleted && !isAnimating) {
      // Small delay before auto-advancing
      const timer = setTimeout(() => {
        handleNext();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep.action, isStepActionCompleted, isAnimating, handleNext]);

  // Don't render if tutorial is disabled
  if (!showTutorial) {
    return null;
  }

  // Calculate progress
  const progress = ((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <>
      {/* Overlay backdrop for highlighted areas */}
      <TutorialHighlight targetArea={currentStep.targetArea} />

      {/* Tutorial dialog */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg px-4">
        <div
          className={`bg-gradient-to-br from-slate-900/96 via-sky-950/96 to-cyan-950/96 
            rounded-xl shadow-2xl border-2 border-cyan-400/35 backdrop-blur-sm
            transform transition-all duration-300 ${
              isAnimating ? "scale-95 opacity-80" : "scale-100 opacity-100"
            }`}
        >
          {/* Progress bar */}
          <div className="h-1 bg-black/30 rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentStep.icon}</span>
              <h3 className="text-lg font-bold text-slate-100">
                {currentStep.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="跳过教程"
            >
              <X className="w-5 h-5 text-slate-300/60 hover:text-slate-100" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <p className="text-slate-200/90 text-sm leading-relaxed">
              {currentStep.description}
            </p>

            {/* Action indicator */}
            {currentStep.action && (
              <div
                className={`mt-3 flex items-center gap-2 text-sm ${
                  isStepActionCompleted ? "text-green-400" : "text-cyan-300"
                }`}
              >
                {isStepActionCompleted ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>已完成！</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>请完成上述操作...</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 pb-4">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === tutorialStep
                      ? "bg-cyan-400"
                      : index < tutorialStep
                      ? "bg-sky-500"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {tutorialStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 
                    rounded-lg transition-colors text-sm text-gray-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={currentStep.action && !isStepActionCompleted}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium
                  ${
                    currentStep.action && !isStepActionCompleted
                      ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                  }`}
              >
                {tutorialStep >= TUTORIAL_STEPS.length - 1 ? (
                  "开始创作"
                ) : (
                  <>
                    {currentStep.action && !isStepActionCompleted
                      ? "等待完成"
                      : "下一步"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// ==================== 高亮组件 ====================

interface TutorialHighlightProps {
  targetArea: TutorialStep["targetArea"];
}

function TutorialHighlight({ targetArea }: TutorialHighlightProps) {
  // Define highlight areas based on target
  const getHighlightStyle = useCallback(() => {
    switch (targetArea) {
      case "palette":
        return {
          left: "0",
          top: "0",
          width: "256px",  // w-64 = 16rem = 256px
          height: "100%",
          clipPath: "inset(0 0 0 0)",
        };
      case "canvas":
        return {
          left: "256px",
          top: "48px",  // toolbar height
          right: "288px",  // property panel width
          bottom: "0",
          clipPath: "inset(0 0 0 0)",
        };
      case "toolbar":
        return {
          left: "256px",
          top: "0",
          right: "288px",
          height: "48px",
          clipPath: "inset(0 0 0 0)",
        };
      case "property":
        return {
          right: "0",
          top: "0",
          width: "288px",  // w-72 = 18rem = 288px
          height: "100%",
          clipPath: "inset(0 0 0 0)",
        };
      default:
        return null;
    }
  }, [targetArea]);

  const highlightStyle = getHighlightStyle();

  if (!highlightStyle || targetArea === "none") {
    return null;
  }

  return (
    <>
      {/* Semi-transparent overlay */}
      <div
        className="fixed inset-0 z-[55] pointer-events-none"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Highlight cutout */}
      <div
        className="fixed z-[56] pointer-events-none border-2 border-cyan-400 rounded-lg animate-pulse"
        style={{
          ...highlightStyle,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.4)",
        }}
      />

      {/* Arrow indicator */}
      <TutorialArrow targetArea={targetArea} />
    </>
  );
}

// ==================== 箭头指示器 ====================

interface TutorialArrowProps {
  targetArea: TutorialStep["targetArea"];
}

function TutorialArrow({ targetArea }: TutorialArrowProps) {
  const getArrowPosition = useCallback(() => {
    switch (targetArea) {
      case "palette":
        return {
          position: "fixed" as const,
          left: "270px",
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
        };
      case "canvas":
        return {
          position: "fixed" as const,
          left: "50%",
          top: "60px",
          transform: "translateX(-50%)",
        };
      case "toolbar":
        return {
          position: "fixed" as const,
          left: "50%",
          top: "60px",
          transform: "translateX(-50%)",
        };
      case "property":
        return {
          position: "fixed" as const,
          right: "300px",
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
        };
      default:
        return null;
    }
  }, [targetArea]);

  const arrowPosition = getArrowPosition();

  if (!arrowPosition || targetArea === "none") {
    return null;
  }

  return (
    <div
      className="z-[57] text-cyan-300 animate-bounce"
      style={arrowPosition}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L4 14h6v8h4v-8h6L12 2z" />
      </svg>
    </div>
  );
}

// ==================== 导出教程工具函数 ====================

/**
 * 检查是否应该显示教程
 * 首次进入编辑器时显示
 */
export function shouldShowTutorial(): boolean {
  if (typeof window === "undefined") return false;
  
  const hasSeenTutorial = localStorage.getItem("editor-tutorial-completed");
  return !hasSeenTutorial;
}

/**
 * 标记教程已完成
 */
export function markTutorialCompleted(): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem("editor-tutorial-completed", "true");
}

/**
 * 重置教程状态（用于测试或用户请求重新查看教程）
 */
export function resetTutorial(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem("editor-tutorial-completed");
  
  // Reset store state
  useEditorStore.setState({
    showTutorial: true,
    tutorialStep: 0,
  });
}
