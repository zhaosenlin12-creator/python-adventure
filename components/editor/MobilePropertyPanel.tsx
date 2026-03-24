"use client";

/**
 * MobilePropertyPanel - 移动端属性面板组件
 * Requirements: 15.4 - 可折叠面板
 * 属性面板滑出/收起
 */

import { useEffect, useCallback } from "react";
import { EditorElement, ElementConfig } from "@/types/editor";
import { X, Trash2, Move, Settings2 } from "lucide-react";

// ==================== 类型定义 ====================

interface MobilePropertyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: EditorElement | null;
  onPropertyChange: (property: string, value: unknown) => void;
  onDelete: () => void;
}

// ==================== 主组件 ====================

export default function MobilePropertyPanel({
  isOpen,
  onClose,
  selectedElement,
  onPropertyChange,
  onDelete,
}: MobilePropertyPanelProps) {
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

  // Handle delete with confirmation
  const handleDelete = useCallback(() => {
    if (confirm("确定要删除这个元素吗？")) {
      onDelete();
      onClose();
    }
  }, [onDelete, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-20 w-80 bg-[#0f172a]/98 border-l border-slate-600 z-50 flex flex-col animate-slide-in-right safe-area-right">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-blue-400">属性</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedElement ? (
            <div className="space-y-4">
              {/* Element Info */}
              <div className="bg-yellow-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getElementIcon(selectedElement.type)}</span>
                  <span className="text-slate-300 font-medium">
                    {getElementName(selectedElement.type)}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  ID: {selectedElement.id.slice(0, 8)}...
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <Move className="w-4 h-4" />
                  <span>位置</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MobileNumberInput
                    label="X"
                    value={selectedElement.x}
                    onChange={(v) => onPropertyChange("x", v)}
                    min={0}
                    step={10}
                  />
                  <MobileNumberInput
                    label="Y"
                    value={selectedElement.y}
                    onChange={(v) => onPropertyChange("y", v)}
                    min={0}
                    step={10}
                  />
                </div>
              </div>

              {/* Size (if applicable) */}
              {(selectedElement.width || selectedElement.height) && (
                <div className="space-y-2">
                  <div className="text-sm text-blue-300">尺寸</div>
                  <div className="grid grid-cols-2 gap-2">
                    <MobileNumberInput
                      label="宽"
                      value={selectedElement.width || 64}
                      onChange={(v) => onPropertyChange("width", v)}
                      min={16}
                      max={512}
                      step={16}
                    />
                    <MobileNumberInput
                      label="高"
                      value={selectedElement.height || 64}
                      onChange={(v) => onPropertyChange("height", v)}
                      min={16}
                      max={512}
                      step={16}
                    />
                  </div>
                </div>
              )}

              {/* Type-specific properties */}
              <TypeSpecificProperties
                element={selectedElement}
                onPropertyChange={onPropertyChange}
              />

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded-lg transition-colors mt-4"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="text-red-300">删除元素</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Settings2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">选择一个元素查看属性</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ==================== 类型特定属性 ====================

interface TypeSpecificPropertiesProps {
  element: EditorElement;
  onPropertyChange: (property: string, value: unknown) => void;
}

function TypeSpecificProperties({ element, onPropertyChange }: TypeSpecificPropertiesProps) {
  const config = element.config as any;

  // Platform properties
  if (element.type === "moving" || config?.platformType === "moving") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">移动设置</div>
        <MobileNumberInput
          label="速度"
          value={config?.moveSpeed || 100}
          onChange={(v) => onPropertyChange("config.moveSpeed", v)}
          min={10}
          max={500}
          step={10}
        />
      </div>
    );
  }

  if (element.type === "bouncy" || config?.platformType === "bouncy") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">弹跳设置</div>
        <MobileNumberInput
          label="弹力"
          value={config?.bounceForce || 800}
          onChange={(v) => onPropertyChange("config.bounceForce", v)}
          min={200}
          max={1500}
          step={50}
        />
      </div>
    );
  }

  if (element.type === "disappearing" || config?.platformType === "disappearing") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">消失设置</div>
        <MobileNumberInput
          label="消失时间(ms)"
          value={config?.disappearTime || 1000}
          onChange={(v) => onPropertyChange("config.disappearTime", v)}
          min={100}
          max={5000}
          step={100}
        />
      </div>
    );
  }

  if (element.type === "conveyor" || config?.platformType === "conveyor") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">传送带设置</div>
        <MobileNumberInput
          label="速度"
          value={config?.conveyorSpeed || 100}
          onChange={(v) => onPropertyChange("config.conveyorSpeed", v)}
          min={10}
          max={300}
          step={10}
        />
        <MobileSelectInput
          label="方向"
          value={config?.conveyorDirection || "right"}
          options={[
            { value: "left", label: "向左" },
            { value: "right", label: "向右" },
          ]}
          onChange={(v) => onPropertyChange("config.conveyorDirection", v)}
        />
      </div>
    );
  }

  // Collectible properties
  if (["coin", "gem", "key", "health_pack"].includes(element.type)) {
    const isHealthPack = element.type === "health_pack";
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">{isHealthPack ? "血包设置" : "收集物设置"}</div>
        <MobileNumberInput
          label={isHealthPack ? "回血量" : "价值"}
          value={config?.value || (isHealthPack ? 30 : 10)}
          onChange={(v) => onPropertyChange("config.value", v)}
          min={1}
          max={1000}
          step={5}
        />
      </div>
    );
  }

  // Trap properties
  if (["spike", "fire", "electric", "explosion"].includes(element.type)) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">陷阱设置</div>
        <MobileNumberInput
          label="伤害"
          value={config?.damage || 20}
          onChange={(v) => onPropertyChange("config.damage", v)}
          min={5}
          max={100}
          step={5}
        />
        <MobileSelectInput
          label="模式"
          value={config?.pattern || "static"}
          options={[
            { value: "static", label: "静态" },
            { value: "periodic", label: "周期" },
            { value: "triggered", label: "触发" },
          ]}
          onChange={(v) => onPropertyChange("config.pattern", v)}
        />
      </div>
    );
  }

  // Wind zone properties
  if (element.type === "wind" || config?.mechanismType === "wind") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">风力设置</div>
        <MobileSelectInput
          label="方向"
          value={config?.windDirection || "up"}
          options={[
            { value: "up", label: "向上" },
            { value: "down", label: "向下" },
            { value: "left", label: "向左" },
            { value: "right", label: "向右" },
          ]}
          onChange={(v) => onPropertyChange("config.windDirection", v)}
        />
        <MobileNumberInput
          label="风力"
          value={config?.windForce || 300}
          onChange={(v) => onPropertyChange("config.windForce", v)}
          min={50}
          max={800}
          step={50}
        />
      </div>
    );
  }

  // Boss properties
  if (element.type === "enemy_boss" || config?.enemyType === "boss") {
    return (
      <div className="space-y-2">
        <div className="text-sm text-blue-300">Boss设置</div>
        <MobileNumberInput
          label="生命值"
          value={config?.bossConfig?.hp || 100}
          onChange={(v) => onPropertyChange("config.bossConfig.hp", v)}
          min={50}
          max={1000}
          step={50}
        />
      </div>
    );
  }

  return null;
}

// ==================== 辅助组件 ====================

interface MobileNumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function MobileNumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: MobileNumberInputProps) {
  return (
    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
      <span className="text-xs text-gray-400 min-w-[24px]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 bg-transparent text-slate-300 text-sm outline-none w-full"
      />
    </div>
  );
}

interface MobileSelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function MobileSelectInput({
  label,
  value,
  options,
  onChange,
}: MobileSelectInputProps) {
  return (
    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
      <span className="text-xs text-gray-400 min-w-[40px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-slate-300 text-sm outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0f172a]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==================== 辅助函数 ====================

function getElementIcon(type: string): string {
  const icons: Record<string, string> = {
    player_start: "🏁",
    goal: "⭐",
    ground: "▬",
    platform: "▭",
    moving: "↔️",
    bouncy: "🔼",
    disappearing: "👻",
    conveyor: "➡️",
    enemy_basic: "👾",
    enemy_bat: "🦇",
    enemy_robot: "🤖",
    enemy_slime: "🟢",
    enemy_boss: "👹",
    coin: "🪙",
    gem: "💎",
    key: "🔑",
    health_pack: "❤️",
    button: "🔘",
    door: "🚪",
    portal: "🌀",
    trampoline: "🎪",
    wind: "💨",
    spike: "🔺",
    fire: "🔥",
    electric: "⚡",
    explosion: "💥",
  };
  return icons[type] || "📦";
}

function getElementName(type: string): string {
  const names: Record<string, string> = {
    player_start: "起点",
    goal: "终点",
    ground: "地面",
    platform: "平台",
    moving: "移动平台",
    bouncy: "弹跳平台",
    disappearing: "消失平台",
    conveyor: "传送带",
    enemy_basic: "基础敌人",
    enemy_bat: "蝙蝠",
    enemy_robot: "机器人",
    enemy_slime: "史莱姆",
    enemy_boss: "Boss",
    coin: "金币",
    gem: "宝石",
    key: "钥匙",
    health_pack: "血包",
    button: "按钮",
    door: "门",
    portal: "传送门",
    trampoline: "蹦床",
    wind: "风力区域",
    spike: "尖刺",
    fire: "火焰",
    electric: "电击",
    explosion: "爆炸",
  };
  return names[type] || type;
}
