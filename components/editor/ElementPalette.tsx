"use client";

/**
 * ElementPalette - 元素面板组件
 * Requirements: 3.1, 4.1, 5.1, 6.1, 6.2, 7.1
 * 显示所有可用的地图元素，支持分类和简化/高级模式切换
 */

import { useState, useCallback } from "react";
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
import { ChevronDown, ChevronRight, Sparkles, Zap } from "lucide-react";

// ==================== 元素定义 ====================

interface ElementDefinition {
  id: string;
  name: string;
  nameCN: string;
  icon: string;
  category: ElementCategory;
  defaultConfig: ElementConfig;
  defaultSize?: { width: number; height: number };  // 默认尺寸
  isAdvanced: boolean;
  tooltip: string;
}

// 平台元素
const PLATFORM_ELEMENTS: ElementDefinition[] = [
  {
    id: "ground",
    name: "Ground",
    nameCN: "地面",
    icon: "▬",
    category: "platforms",
    defaultConfig: { platformType: "ground" } as PlatformConfig,
    defaultSize: { width: 200, height: 30 },
    isAdvanced: false,
    tooltip: "基础地面平台",
  },
  {
    id: "platform",
    name: "Platform",
    nameCN: "平台",
    icon: "▭",
    category: "platforms",
    defaultConfig: { platformType: "platform" } as PlatformConfig,
    defaultSize: { width: 120, height: 24 },
    isAdvanced: false,
    tooltip: "可站立的平台",
  },
  {
    id: "moving",
    name: "Moving Platform",
    nameCN: "移动平台",
    icon: "↔️",
    category: "platforms",
    defaultConfig: {
      platformType: "moving",
      moveDirection: "horizontal",
      moveDistance: 200,
      moveSpeed: 100,
    } as PlatformConfig,
    defaultSize: { width: 100, height: 24 },
    isAdvanced: false,
    tooltip: "可来回移动的平台，支持水平/垂直方向",
  },
  {
    id: "disappearing",
    name: "Disappearing",
    nameCN: "消失平台",
    icon: "👻",
    category: "platforms",
    defaultConfig: {
      platformType: "disappearing",
      disappearTime: 1000,
    } as PlatformConfig,
    defaultSize: { width: 80, height: 24 },
    isAdvanced: true,
    tooltip: "踩上后会消失的平台",
  },
  {
    id: "bouncy",
    name: "Bouncy",
    nameCN: "弹跳平台",
    icon: "🔼",
    category: "platforms",
    defaultConfig: {
      platformType: "bouncy",
      bounceForce: 800,
    } as PlatformConfig,
    defaultSize: { width: 100, height: 24 },
    isAdvanced: false,
    tooltip: "可以弹跳的平台",
  },
  {
    id: "conveyor",
    name: "Conveyor",
    nameCN: "传送带",
    icon: "➡️",
    category: "platforms",
    defaultConfig: {
      platformType: "conveyor",
      conveyorSpeed: 100,
      conveyorDirection: "right",
    } as PlatformConfig,
    defaultSize: { width: 150, height: 24 },
    isAdvanced: true,
    tooltip: "会推动玩家的传送带",
  },
];

// 敌人元素
const ENEMY_ELEMENTS: ElementDefinition[] = [
  {
    id: "enemy_basic",
    name: "Basic Enemy",
    nameCN: "基础敌人",
    icon: "👾",
    category: "enemies",
    defaultConfig: {
      enemyType: "basic",
      patrolDistance: 150,
      moveSpeed: 60,
    } as EnemyConfig,
    defaultSize: { width: 32, height: 32 },
    isAdvanced: false,
    tooltip: "普通巡逻敌人，左右移动",
  },
  {
    id: "enemy_bat",
    name: "Bat",
    nameCN: "蝙蝠",
    icon: "🦇",
    category: "enemies",
    defaultConfig: {
      enemyType: "bat",
      patrolDistance: 200,
      moveSpeed: 80,
    } as EnemyConfig,
    defaultSize: { width: 28, height: 28 },
    isAdvanced: false,
    tooltip: "飞行的蝙蝠敌人",
  },
  {
    id: "enemy_robot",
    name: "Robot",
    nameCN: "机器人",
    icon: "🤖",
    category: "enemies",
    defaultConfig: {
      enemyType: "robot",
      patrolDistance: 180,
      moveSpeed: 70,
    } as EnemyConfig,
    defaultSize: { width: 36, height: 36 },
    isAdvanced: false,
    tooltip: "机器人敌人，可远程攻击",
  },
  {
    id: "enemy_slime",
    name: "Slime",
    nameCN: "史莱姆",
    icon: "🟢",
    category: "enemies",
    defaultConfig: {
      enemyType: "slime",
      patrolDistance: 100,
      moveSpeed: 40,
    } as EnemyConfig,
    defaultSize: { width: 32, height: 32 },
    isAdvanced: false,
    tooltip: "弹跳的史莱姆",
  },
  {
    id: "enemy_boss",
    name: "Boss",
    nameCN: "Boss",
    icon: "B",
    category: "enemies",
    defaultConfig: {
      enemyType: "boss",
      patrolDistance: 300,
      moveSpeed: 100,
      bossConfig: {
        hp: 100,
        defeatCondition: "combat",
      },
    } as EnemyConfig,
    defaultSize: { width: 64, height: 64 },
    isAdvanced: true,
    tooltip: "关卡Boss敌人",
  },
];

// 机关元素 - 🔥 只保留战役模式中实际实现的机关
const MECHANISM_ELEMENTS: ElementDefinition[] = [
  {
    id: "portal",
    name: "Portal",
    nameCN: "传送门",
    icon: "🌀",
    category: "mechanisms",
    defaultConfig: {
      mechanismType: "portal",
      linkedTo: "",  // 需要设置链接的传送门ID
    } as MechanismConfig,
    defaultSize: { width: 70, height: 70 },
    isAdvanced: true,
    tooltip: "传送到另一个传送门位置",
  },
  {
    id: "wind",
    name: "Wind Zone",
    nameCN: "风力区域",
    icon: "💨",
    category: "mechanisms",
    defaultConfig: {
      mechanismType: "wind",
      windDirection: "up",
      windForce: 300,
    } as MechanismConfig,
    defaultSize: { width: 100, height: 150 },
    isAdvanced: true,
    tooltip: "产生风力推动玩家的区域",
  },
  {
    id: "gravity_zone",
    name: "Gravity Zone",
    nameCN: "重力区域",
    icon: "🌐",
    category: "mechanisms",
    defaultConfig: {
      mechanismType: "gravity_zone",
      gravityMultiplier: -1,  // -1为反重力
    } as MechanismConfig,
    defaultSize: { width: 150, height: 100 },
    isAdvanced: true,
    tooltip: "改变重力方向的区域（反重力）",
  },
];

// 陷阱元素
const TRAP_ELEMENTS: ElementDefinition[] = [
  {
    id: "spike",
    name: "Spike",
    nameCN: "尖刺",
    icon: "🔺",
    category: "traps",
    defaultConfig: {
      trapType: "spike",
      damage: 20,
      pattern: "static",
    } as TrapConfig,
    isAdvanced: true,
    tooltip: "静态尖刺陷阱",
  },
  {
    id: "fire",
    name: "Fire",
    nameCN: "火焰",
    icon: "🔥",
    category: "traps",
    defaultConfig: {
      trapType: "fire",
      damage: 30,
      pattern: "periodic",
    } as TrapConfig,
    isAdvanced: true,
    tooltip: "周期性火焰陷阱",
  },
  {
    id: "electric",
    name: "Electric",
    nameCN: "电击",
    icon: "⚡",
    category: "traps",
    defaultConfig: {
      trapType: "electric",
      damage: 25,
      pattern: "periodic",
    } as TrapConfig,
    isAdvanced: true,
    tooltip: "电击陷阱",
  },
  {
    id: "explosion",
    name: "Explosion",
    nameCN: "爆炸",
    icon: "💥",
    category: "traps",
    defaultConfig: {
      trapType: "explosion",
      damage: 50,
      pattern: "triggered",
    } as TrapConfig,
    isAdvanced: true,
    tooltip: "触发式爆炸陷阱",
  },
];

// 收集物元素
const COLLECTIBLE_ELEMENTS: ElementDefinition[] = [
  {
    id: "coin",
    name: "Coin",
    nameCN: "金币",
    icon: "🪙",
    category: "collectibles",
    defaultConfig: {
      collectibleType: "coin",
      value: 10,
    } as CollectibleConfig,
    isAdvanced: false,
    tooltip: "收集获得金币",
  },
  {
    id: "gem",
    name: "Gem",
    nameCN: "宝石",
    icon: "💎",
    category: "collectibles",
    defaultConfig: {
      collectibleType: "gem",
      value: 50,
    } as CollectibleConfig,
    isAdvanced: false,
    tooltip: "稀有宝石",
  },
  {
    id: "key",
    name: "Key",
    nameCN: "钥匙",
    icon: "🔑",
    category: "collectibles",
    defaultConfig: {
      collectibleType: "key",
      value: 1,
    } as CollectibleConfig,
    isAdvanced: false,
    tooltip: "开门钥匙",
  },
  {
    id: "health_pack",
    name: "Health Pack",
    nameCN: "血包",
    icon: "❤️",
    category: "collectibles",
    defaultConfig: {
      collectibleType: "health_pack",
      value: 30,
    } as CollectibleConfig,
    defaultSize: { width: 28, height: 28 },
    isAdvanced: false,
    tooltip: "回血道具 - 拾取后恢复生命值",
  },
  // 🔥 移除"线索"元素 - 战役模式中未使用
];

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
    tooltip: "关卡终点 - 到达此处完成关卡",
  },
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

interface ElementPaletteProps {
  onElementSelect: (elementType: string, config?: ElementConfig, defaultSize?: { width: number; height: number }) => void;
  isSimpleMode: boolean;
}

export default function ElementPalette({
  onElementSelect,
  isSimpleMode,
}: ElementPaletteProps) {
  const { toggleSimpleMode } = useEditorStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<ElementCategory>>(
    new Set(["special", "platforms", "collectibles"])
  );

  // Toggle category expansion
  const toggleCategory = useCallback((category: ElementCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Get elements for a category
  const getElementsForCategory = useCallback(
    (category: ElementCategory): ElementDefinition[] => {
      const elements = ALL_ELEMENTS.filter((el) => el.category === category);

      // In simple mode, filter out advanced elements
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-yellow-600/20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-yellow-400">元素面板</h2>
          <button
            onClick={toggleSimpleMode}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${isSimpleMode
                ? "bg-green-600/30 text-green-400 hover:bg-green-600/40"
                : "bg-purple-600/30 text-purple-400 hover:bg-purple-600/40"
              }`}
            title={isSimpleMode ? "切换到高级模式" : "切换到简化模式"}
          >
            {isSimpleMode ? (
              <>
                <Sparkles className="w-3 h-3" />
                简化
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                高级
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {isSimpleMode ? "显示基础元素" : "显示所有元素"}
        </p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleCategories.map((category) => {
          const elements = getElementsForCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);

          if (elements.length === 0) return null;

          return (
            <div key={category.id} className="rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-900/20 hover:bg-yellow-900/30 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-yellow-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm text-yellow-200">{category.name}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {elements.length}
                </span>
              </button>

              {/* Elements Grid */}
              {isExpanded && (
                <div className="grid grid-cols-3 gap-1 p-2 bg-black/20">
                  {elements.map((element) => (
                    <ElementButton
                      key={element.id}
                      element={element}
                      onClick={() => onElementSelect(element.id, element.defaultConfig, element.defaultSize)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Tip */}
      <div className="p-3 border-t border-yellow-600/20 bg-black/20">
        <p className="text-xs text-gray-500 text-center">
          💡 点击元素后在画布上点击放置
        </p>
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

interface ElementButtonProps {
  element: ElementDefinition;
  onClick: () => void;
}

function ElementButton({ element, onClick }: ElementButtonProps) {
  // Special styling for goal point
  const isGoalElement = element.id === "goal";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all group ${isGoalElement
          ? "bg-gradient-to-br from-yellow-900/40 to-orange-900/40 hover:from-yellow-800/50 hover:to-orange-800/50 border border-yellow-500/40 hover:border-yellow-400/60"
          : "bg-yellow-900/10 hover:bg-yellow-900/30 border border-transparent hover:border-yellow-500/30"
        }`}
      title={element.tooltip}
    >
      <span className={`mb-1 group-hover:scale-110 transition-transform ${isGoalElement ? "text-3xl" : "text-2xl"
        }`}>
        {element.icon}
      </span>
      <span className={`truncate w-full text-center ${isGoalElement
          ? "text-[11px] text-yellow-300 font-medium group-hover:text-yellow-100"
          : "text-[10px] text-gray-400 group-hover:text-yellow-200"
        }`}>
        {element.nameCN}
      </span>
      {isGoalElement && (
        <span className="text-[8px] text-yellow-500/60 mt-0.5">必需</span>
      )}
    </button>
  );
}
