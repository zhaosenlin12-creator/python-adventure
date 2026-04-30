"use client";

/**
 * MobileElementPanel - 移动端元素面板组件
 * Requirements: 15.4 - 可折叠面板
 * 元素面板滑出/收起
 */

import { useState, useCallback, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import {
  ElementCategory,
  ElementConfig,
  PlatformConfig,
  EnemyConfig,
  CollectibleConfig,
  TrapConfig,
  MechanismConfig,
  SpecialConfig,
} from "@/types/editor";
import { X, ChevronDown, ChevronRight, Sparkles, Zap } from "lucide-react";

// ==================== 元素定义 (与 ElementPalette 同步) ====================

interface ElementDefinition {
  id: string;
  name: string;
  nameCN: string;
  icon: string;
  category: ElementCategory;
  defaultConfig: ElementConfig;
  defaultSize?: { width: number; height: number };
  isAdvanced: boolean;
  tooltip: string;
}

// 特殊元素 - 只有终点（起点由玩家角色位置决定）
const SPECIAL_ELEMENTS: ElementDefinition[] = [
  {
    id: "goal",
    name: "Goal",
    nameCN: "终点",
    icon: "⭐",
    category: "special",
    defaultConfig: { specialType: "goal" } as SpecialConfig,
    defaultSize: { width: 64, height: 64 },
    isAdvanced: false,
    tooltip: "关卡终点",
  },
];

// 平台元素
const PLATFORM_ELEMENTS: ElementDefinition[] = [
  { id: "ground", name: "Ground", nameCN: "地面", icon: "▬", category: "platforms", defaultConfig: { platformType: "ground" } as PlatformConfig, defaultSize: { width: 200, height: 30 }, isAdvanced: false, tooltip: "基础地面" },
  { id: "platform", name: "Platform", nameCN: "平台", icon: "▭", category: "platforms", defaultConfig: { platformType: "platform" } as PlatformConfig, defaultSize: { width: 120, height: 24 }, isAdvanced: false, tooltip: "可站立平台" },
  { id: "moving", name: "Moving", nameCN: "移动", icon: "↔️", category: "platforms", defaultConfig: { platformType: "moving", moveDirection: "horizontal", moveDistance: 200, moveSpeed: 100 } as PlatformConfig, defaultSize: { width: 100, height: 24 }, isAdvanced: false, tooltip: "移动平台" },
  { id: "bouncy", name: "Bouncy", nameCN: "弹跳", icon: "🔼", category: "platforms", defaultConfig: { platformType: "bouncy", bounceForce: 800 } as PlatformConfig, defaultSize: { width: 100, height: 24 }, isAdvanced: false, tooltip: "弹跳平台" },
  { id: "disappearing", name: "Disappearing", nameCN: "消失", icon: "👻", category: "platforms", defaultConfig: { platformType: "disappearing", disappearTime: 1000 } as PlatformConfig, defaultSize: { width: 80, height: 24 }, isAdvanced: true, tooltip: "消失平台" },
  { id: "conveyor", name: "Conveyor", nameCN: "传送带", icon: "➡️", category: "platforms", defaultConfig: { platformType: "conveyor", conveyorSpeed: 100, conveyorDirection: "right" } as PlatformConfig, defaultSize: { width: 150, height: 24 }, isAdvanced: true, tooltip: "传送带" },
];

// 敌人元素
const ENEMY_ELEMENTS: ElementDefinition[] = [
  { id: "enemy_basic", name: "Basic", nameCN: "基础", icon: "👾", category: "enemies", defaultConfig: { enemyType: "basic", patrolDistance: 150, moveSpeed: 60 } as EnemyConfig, defaultSize: { width: 32, height: 32 }, isAdvanced: false, tooltip: "基础敌人" },
  { id: "enemy_bat", name: "Bat", nameCN: "蝙蝠", icon: "🦇", category: "enemies", defaultConfig: { enemyType: "bat", patrolDistance: 200, moveSpeed: 80 } as EnemyConfig, defaultSize: { width: 28, height: 28 }, isAdvanced: false, tooltip: "蝙蝠" },
  { id: "enemy_robot", name: "Robot", nameCN: "机器人", icon: "🤖", category: "enemies", defaultConfig: { enemyType: "robot", patrolDistance: 180, moveSpeed: 70 } as EnemyConfig, defaultSize: { width: 36, height: 36 }, isAdvanced: false, tooltip: "机器人" },
  { id: "enemy_slime", name: "Slime", nameCN: "史莱姆", icon: "🟢", category: "enemies", defaultConfig: { enemyType: "slime", patrolDistance: 100, moveSpeed: 40 } as EnemyConfig, defaultSize: { width: 32, height: 32 }, isAdvanced: false, tooltip: "史莱姆" },
  { id: "enemy_boss", name: "Boss", nameCN: "Boss", icon: "B", category: "enemies", defaultConfig: { enemyType: "boss", patrolDistance: 300, moveSpeed: 100, bossConfig: { hp: 100, defeatCondition: "combat" } } as EnemyConfig, defaultSize: { width: 64, height: 64 }, isAdvanced: true, tooltip: "Boss" },
];

// 收集物元素
const COLLECTIBLE_ELEMENTS: ElementDefinition[] = [
  { id: "coin", name: "Coin", nameCN: "金币", icon: "🪙", category: "collectibles", defaultConfig: { collectibleType: "coin", value: 10 } as CollectibleConfig, defaultSize: { width: 24, height: 24 }, isAdvanced: false, tooltip: "金币" },
  { id: "gem", name: "Gem", nameCN: "宝石", icon: "💎", category: "collectibles", defaultConfig: { collectibleType: "gem", value: 50 } as CollectibleConfig, defaultSize: { width: 28, height: 28 }, isAdvanced: false, tooltip: "宝石" },
  { id: "key", name: "Key", nameCN: "钥匙", icon: "🔑", category: "collectibles", defaultConfig: { collectibleType: "key", value: 1 } as CollectibleConfig, defaultSize: { width: 24, height: 24 }, isAdvanced: false, tooltip: "钥匙" },
  { id: "health_pack", name: "Health Pack", nameCN: "血包", icon: "❤️", category: "collectibles", defaultConfig: { collectibleType: "health_pack", value: 30 } as CollectibleConfig, defaultSize: { width: 28, height: 28 }, isAdvanced: false, tooltip: "回血道具" },
];

// 机关元素
const MECHANISM_ELEMENTS: ElementDefinition[] = [
  { id: "button", name: "Button", nameCN: "按钮", icon: "🔘", category: "mechanisms", defaultConfig: { mechanismType: "button" } as MechanismConfig, defaultSize: { width: 32, height: 16 }, isAdvanced: true, tooltip: "按钮" },
  { id: "door", name: "Door", nameCN: "门", icon: "🚪", category: "mechanisms", defaultConfig: { mechanismType: "door" } as MechanismConfig, defaultSize: { width: 32, height: 64 }, isAdvanced: true, tooltip: "门" },
  { id: "portal", name: "Portal", nameCN: "传送门", icon: "🌀", category: "mechanisms", defaultConfig: { mechanismType: "portal" } as MechanismConfig, defaultSize: { width: 48, height: 64 }, isAdvanced: true, tooltip: "传送门" },
  { id: "trampoline", name: "Trampoline", nameCN: "蹦床", icon: "🎪", category: "mechanisms", defaultConfig: { mechanismType: "trampoline" } as MechanismConfig, defaultSize: { width: 64, height: 24 }, isAdvanced: false, tooltip: "蹦床" },
  { id: "wind", name: "Wind", nameCN: "风力", icon: "💨", category: "mechanisms", defaultConfig: { mechanismType: "wind", windDirection: "up", windForce: 300 } as MechanismConfig, defaultSize: { width: 64, height: 128 }, isAdvanced: true, tooltip: "风力区域" },
];

// 陷阱元素
const TRAP_ELEMENTS: ElementDefinition[] = [
  { id: "spike", name: "Spike", nameCN: "尖刺", icon: "🔺", category: "traps", defaultConfig: { trapType: "spike", damage: 20, pattern: "static" } as TrapConfig, defaultSize: { width: 32, height: 32 }, isAdvanced: true, tooltip: "尖刺" },
  { id: "fire", name: "Fire", nameCN: "火焰", icon: "🔥", category: "traps", defaultConfig: { trapType: "fire", damage: 30, pattern: "periodic" } as TrapConfig, defaultSize: { width: 32, height: 48 }, isAdvanced: true, tooltip: "火焰" },
  { id: "electric", name: "Electric", nameCN: "电击", icon: "⚡", category: "traps", defaultConfig: { trapType: "electric", damage: 25, pattern: "periodic" } as TrapConfig, defaultSize: { width: 32, height: 64 }, isAdvanced: true, tooltip: "电击" },
];

// 分类配置
const CATEGORIES: { id: ElementCategory; name: string; icon: string; isAdvanced: boolean }[] = [
  { id: "special", name: "目标", icon: "⭐", isAdvanced: false },
  { id: "platforms", name: "平台", icon: "📦", isAdvanced: false },
  { id: "enemies", name: "敌人", icon: "👾", isAdvanced: false },
  { id: "collectibles", name: "收集物", icon: "💎", isAdvanced: false },
  { id: "mechanisms", name: "机关", icon: "⚙️", isAdvanced: true },
  { id: "traps", name: "陷阱", icon: "⚡", isAdvanced: true },
];

// 所有元素
const ALL_ELEMENTS: ElementDefinition[] = [
  ...SPECIAL_ELEMENTS,
  ...PLATFORM_ELEMENTS,
  ...ENEMY_ELEMENTS,
  ...COLLECTIBLE_ELEMENTS,
  ...MECHANISM_ELEMENTS,
  ...TRAP_ELEMENTS,
];

// ==================== 组件 ====================

interface MobileElementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onElementSelect: (elementType: string, config?: ElementConfig, defaultSize?: { width: number; height: number }) => void;
}

export default function MobileElementPanel({
  isOpen,
  onClose,
  onElementSelect,
}: MobileElementPanelProps) {
  const { isSimpleMode, toggleSimpleMode } = useEditorStore();
  const [expandedCategory, setExpandedCategory] = useState<ElementCategory>("special");

  // Handle element selection
  const handleElementSelect = useCallback((element: ElementDefinition) => {
    onElementSelect(element.id, element.defaultConfig, element.defaultSize);
    onClose();
  }, [onElementSelect, onClose]);

  // Get elements for a category
  const getElementsForCategory = useCallback(
    (category: ElementCategory): ElementDefinition[] => {
      const elements = ALL_ELEMENTS.filter((el) => el.category === category);
      if (isSimpleMode) {
        return elements.filter((el) => !el.isAdvanced);
      }
      return elements;
    },
    [isSimpleMode]
  );

  // Get visible categories
  const visibleCategories = isSimpleMode
    ? CATEGORIES.filter((cat) => !cat.isAdvanced)
    : CATEGORIES;

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-0 top-0 bottom-20 w-72 bg-[#0f172a]/98 border-r border-slate-600 z-50 flex flex-col animate-slide-in-left safe-area-left">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700/40">
          <h2 className="text-lg font-bold text-blue-400">元素面板</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSimpleMode}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${isSimpleMode
                  ? "bg-green-600/30 text-green-400"
                  : "bg-purple-600/30 text-purple-400"
                }`}
            >
              {isSimpleMode ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {isSimpleMode ? "简化" : "高级"}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {visibleCategories.map((category) => {
            const elements = getElementsForCategory(category.id);
            const isExpanded = expandedCategory === category.id;

            if (elements.length === 0) return null;

            return (
              <div key={category.id} className="rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? "" as ElementCategory : category.id)}
                  className="w-full flex items-center gap-2 px-3 py-3 bg-yellow-900/20 active:bg-yellow-900/40 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-blue-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-blue-400" />
                  )}
                  <span className="text-xl">{category.icon}</span>
                  <span className="text-base text-slate-300">{category.name}</span>
                  <span className="ml-auto text-sm text-gray-500">
                    {elements.length}
                  </span>
                </button>

                {/* Elements Grid */}
                {isExpanded && (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-black/20">
                    {elements.map((element) => (
                      <MobileElementButton
                        key={element.id}
                        element={element}
                        onClick={() => handleElementSelect(element)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/40 bg-black/20">
          <p className="text-xs text-gray-500 text-center">
            💡 选择元素后点击画布放置
          </p>
        </div>
      </div>
    </>
  );
}

// ==================== 子组件 ====================

interface MobileElementButtonProps {
  element: ElementDefinition;
  onClick: () => void;
}

function MobileElementButton({ element, onClick }: MobileElementButtonProps) {
  const isGoalElement = element.id === "goal";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all active:scale-95 ${isGoalElement
          ? "bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-500/40"
          : "bg-yellow-900/10 border border-transparent active:border-blue-400/30"
        }`}
    >
      <span className={`mb-1 ${isGoalElement ? "text-3xl" : "text-2xl"}`}>
        {element.icon}
      </span>
      <span className={`text-xs text-center ${isGoalElement ? "text-blue-300 font-medium" : "text-gray-400"
        }`}>
        {element.nameCN}
      </span>
      {isGoalElement && (
        <span className="text-[8px] text-yellow-500/60 mt-0.5">必需</span>
      )}
    </button>
  );
}
