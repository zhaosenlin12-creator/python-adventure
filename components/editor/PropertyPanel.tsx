"use client";

/**
 * PropertyPanel - 属性面板组件
 * Requirements: 4.2, 4.3, 4.4, 4.5, 5.3, 5.4, 6.4, 6.5, 7.2
 * Requirements: 9.1, 9.2, 9.3, 7.3 - 起点和终点设置
 * 根据选中元素类型动态渲染配置表单
 */

import { useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import {
  EditorElement,
  PlatformConfig,
  EnemyConfig,
  CollectibleConfig,
  TrapConfig,
  MechanismConfig,
  SpecialConfig,
} from "@/types/editor";
import { Trash2, Settings, Move, Box, MapPin, Flag } from "lucide-react";

// ==================== 类型定义 ====================

interface PropertyPanelProps {
  selectedElement: EditorElement | null;
  onPropertyChange: (property: string, value: unknown) => void;
  onDelete: () => void;
}

// ==================== 主组件 ====================

export default function PropertyPanel({
  selectedElement,
  onPropertyChange,
  onDelete,
}: PropertyPanelProps) {
  const { playerStart, goal } = useEditorStore();

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-yellow-600/20">
          <h2 className="text-sm font-bold text-yellow-400">属性面板</h2>
        </div>

        {/* Show start/end point info when no element selected */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Player Position Info */}
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-600/30">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">🎮 玩家位置</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-gray-400">X: </span>
                <span className="text-green-200">{playerStart.x}</span>
              </div>
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-gray-400">Y: </span>
                <span className="text-green-200">{playerStart.y}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              💡 拖动画布上的玩家角色来修改起始位置
            </p>
          </div>

          {/* Goal Info */}
          <div className={`rounded-lg p-3 border ${goal
            ? "bg-yellow-900/20 border-yellow-600/30"
            : "bg-red-900/20 border-red-600/30"
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className={`w-4 h-4 ${goal ? "text-yellow-400" : "text-red-400"}`} />
              <span className={`text-sm font-medium ${goal ? "text-yellow-300" : "text-red-300"}`}>
                ⭐ 终点位置
              </span>
            </div>
            {goal ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/20 rounded px-2 py-1">
                    <span className="text-gray-400">X: </span>
                    <span className="text-yellow-200">{goal.x}</span>
                  </div>
                  <div className="bg-black/20 rounded px-2 py-1">
                    <span className="text-gray-400">Y: </span>
                    <span className="text-yellow-200">{goal.y}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  💡 从元素面板选择"终点"来修改位置
                </p>
              </>
            ) : (
              <div className="text-xs text-red-300/80">
                <p>⚠️ 尚未设置终点</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  从元素面板选择"终点"来设置
                </p>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center text-gray-500 pt-4">
            <Box className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">选择画布上的元素</p>
            <p className="text-[10px] mt-1">查看和编辑详细属性</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-yellow-600/20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-yellow-400">属性面板</h2>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
            title="删除元素"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          类型: {getElementTypeName(selectedElement.type)}
        </p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Position Section */}
        <PropertySection title="位置" icon={<Move className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="X"
              value={selectedElement.x}
              onChange={(v) => onPropertyChange("x", v)}
              step={32}
            />
            <NumberInput
              label="Y"
              value={selectedElement.y}
              onChange={(v) => onPropertyChange("y", v)}
              step={32}
            />
          </div>
        </PropertySection>

        {/* Size Section */}
        <PropertySection title="尺寸" icon={<Box className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="宽度"
              value={selectedElement.width || 64}
              onChange={(v) => onPropertyChange("width", v)}
              min={32}
              max={512}
              step={32}
            />
            <NumberInput
              label="高度"
              value={selectedElement.height || 64}
              onChange={(v) => onPropertyChange("height", v)}
              min={32}
              max={512}
              step={32}
            />
          </div>
        </PropertySection>

        {/* Type-specific Properties */}
        <PropertySection title="配置" icon={<Settings className="w-4 h-4" />}>
          <TypeSpecificProperties
            element={selectedElement}
            onPropertyChange={onPropertyChange}
          />
        </PropertySection>
      </div>
    </div>
  );
}

// ==================== 类型特定属性 ====================

interface TypeSpecificPropertiesProps {
  element: EditorElement;
  onPropertyChange: (property: string, value: unknown) => void;
}

function TypeSpecificProperties({
  element,
  onPropertyChange,
}: TypeSpecificPropertiesProps) {
  const config = element.config;

  // Platform properties
  if (isPlatformConfig(config)) {
    return (
      <PlatformProperties
        config={config}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  // Enemy properties
  if (isEnemyConfig(config)) {
    return (
      <EnemyProperties
        config={config}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  // Collectible properties
  if (isCollectibleConfig(config)) {
    return (
      <CollectibleProperties
        config={config}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  // Trap properties
  if (isTrapConfig(config)) {
    return (
      <TrapProperties
        config={config}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  // Mechanism properties
  if (isMechanismConfig(config)) {
    return (
      <MechanismProperties
        config={config}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  return (
    <p className="text-xs text-gray-500">无可配置属性</p>
  );
}

// ==================== 平台属性 ====================

function PlatformProperties({
  config,
  onPropertyChange,
}: {
  config: PlatformConfig;
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 🔥 移除类型选择器，只显示当前类型 */}
      <div className="bg-blue-900/20 rounded px-2 py-1.5 border border-blue-600/30">
        <span className="text-xs text-gray-400">当前类型: </span>
        <span className="text-xs text-blue-300 font-medium">
          {getPlatformTypeName(config.platformType)}
        </span>
      </div>

      {config.platformType === "moving" && (
        <>
          <SelectInput
            label="移动方向"
            value={config.moveDirection || "horizontal"}
            options={[
              { value: "horizontal", label: "水平 ↔️" },
              { value: "vertical", label: "垂直 ↕️" },
            ]}
            onChange={(v) => onPropertyChange("config.moveDirection", v)}
          />
          <NumberInput
            label="移动距离(像素)"
            value={config.moveDistance || 200}
            onChange={(v) => onPropertyChange("config.moveDistance", v)}
            min={50}
            max={800}
            step={50}
          />
          <NumberInput
            label="移动速度"
            value={config.moveSpeed || 100}
            onChange={(v) => onPropertyChange("config.moveSpeed", v)}
            min={20}
            max={300}
            step={10}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            💡 平台会从当前位置往返移动指定距离
          </p>
        </>
      )}

      {config.platformType === "disappearing" && (
        <NumberInput
          label="消失时间(ms)"
          value={config.disappearTime || 1000}
          onChange={(v) => onPropertyChange("config.disappearTime", v)}
          min={500}
          max={5000}
          step={100}
        />
      )}

      {config.platformType === "bouncy" && (
        <NumberInput
          label="弹跳力度"
          value={config.bounceForce || 800}
          onChange={(v) => onPropertyChange("config.bounceForce", v)}
          min={400}
          max={1500}
          step={100}
        />
      )}

      {config.platformType === "conveyor" && (
        <>
          <NumberInput
            label="传送速度"
            value={config.conveyorSpeed || 100}
            onChange={(v) => onPropertyChange("config.conveyorSpeed", v)}
            min={50}
            max={300}
            step={25}
          />
          <SelectInput
            label="传送方向"
            value={config.conveyorDirection || "right"}
            options={[
              { value: "left", label: "向左 ←" },
              { value: "right", label: "向右 →" },
            ]}
            onChange={(v) => onPropertyChange("config.conveyorDirection", v)}
          />
        </>
      )}

      {/* 如果是基础平台类型，显示提示 */}
      {(config.platformType === "ground" || config.platformType === "platform") && (
        <p className="text-[10px] text-gray-500">
          💡 基础平台无额外配置，可调整位置和尺寸
        </p>
      )}

      {config.platformType === "gravity_flip" && (
        <p className="text-[10px] text-gray-500">
          💡 玩家踩上后重力会翻转
        </p>
      )}
    </div>
  );
}

// ==================== 敌人属性 ====================

function EnemyProperties({
  config,
  onPropertyChange,
}: {
  config: EnemyConfig;
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 🔥 移除类型选择器，只显示当前类型 */}
      <div className="bg-red-900/20 rounded px-2 py-1.5 border border-red-600/30">
        <span className="text-xs text-gray-400">当前类型: </span>
        <span className="text-xs text-red-300 font-medium">
          {getEnemyTypeName(config.enemyType)}
        </span>
      </div>

      {/* 巡逻配置 - 所有敌人都有 */}
      <NumberInput
        label="巡逻范围(像素)"
        value={config.patrolDistance || 150}
        onChange={(v) => onPropertyChange("config.patrolDistance", v)}
        min={50}
        max={500}
        step={25}
      />
      <NumberInput
        label="移动速度"
        value={config.moveSpeed || 60}
        onChange={(v) => onPropertyChange("config.moveSpeed", v)}
        min={20}
        max={200}
        step={10}
      />
      <p className="text-[10px] text-gray-500">
        💡 敌人会在放置位置左右巡逻
      </p>

      {config.enemyType === "boss" && (
        <>
          <div className="border-t border-yellow-600/20 pt-3 mt-3">
            <p className="text-xs text-yellow-400 mb-2">Boss 基础配置</p>
          </div>
          <NumberInput
            label="Boss血量"
            value={config.bossConfig?.hp || 300}
            onChange={(v) => onPropertyChange("config.bossConfig.hp", v)}
            min={100}
            max={2000}
            step={50}
          />
          <SelectInput
            label="击败条件"
            value={config.bossConfig?.defeatCondition || "combat"}
            options={[
              { value: "combat", label: "战斗击败" },
              { value: "quiz", label: "答题击败" },
              { value: "hybrid", label: "混合模式" },
            ]}
            onChange={(v) => onPropertyChange("config.bossConfig.defeatCondition", v)}
          />
          {(config.bossConfig?.defeatCondition === "quiz" ||
            config.bossConfig?.defeatCondition === "hybrid") && (
              <NumberInput
                label="需要答题数"
                value={config.bossConfig?.questionsRequired || 3}
                onChange={(v) => onPropertyChange("config.bossConfig.questionsRequired", v)}
                min={1}
                max={10}
              />
            )}

          {/* 🔥 Boss技能配置 */}
          <div className="border-t border-red-600/20 pt-3 mt-3">
            <p className="text-xs text-red-400 mb-2">Boss 技能配置</p>
            <p className="text-[10px] text-gray-500 mb-3">
              💡 选择Boss拥有的技能，技能会自动按冷却时间释放
            </p>
          </div>

          {/* 攻击技能 */}
          <div className="space-y-2">
            <p className="text-[10px] text-orange-400 font-medium">🎯 攻击技能</p>
            <SkillToggle
              label="远程射击"
              description="发射子弹攻击玩家"
              checked={config.bossConfig?.skills?.shoot ?? true}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.shoot", v)}
            />
            <SkillToggle
              label="三连发"
              description="连续发射3发子弹"
              checked={config.bossConfig?.skills?.tripleShot ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.tripleShot", v)}
            />
            <SkillToggle
              label="激光扫射"
              description="发射持续激光束"
              checked={config.bossConfig?.skills?.laser ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.laser", v)}
            />
          </div>

          {/* 移动技能 */}
          <div className="space-y-2 mt-3">
            <p className="text-[10px] text-blue-400 font-medium">🏃 移动技能</p>
            <SkillToggle
              label="冲刺攻击"
              description="快速冲向玩家造成伤害"
              checked={config.bossConfig?.skills?.charge ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.charge", v)}
            />
            <SkillToggle
              label="瞬移"
              description="随机传送到新位置"
              checked={config.bossConfig?.skills?.teleport ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.teleport", v)}
            />
          </div>

          {/* 范围技能 */}
          <div className="space-y-2 mt-3">
            <p className="text-[10px] text-purple-400 font-medium">💥 范围技能</p>
            <SkillToggle
              label="冲击波"
              description="释放范围伤害波"
              checked={config.bossConfig?.skills?.shockwave ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.shockwave", v)}
            />
          </div>

          {/* 召唤技能 */}
          <div className="space-y-2 mt-3">
            <p className="text-[10px] text-green-400 font-medium">👾 召唤技能</p>
            <SkillToggle
              label="召唤小怪"
              description="召唤小怪协助战斗"
              checked={config.bossConfig?.skills?.summonMinions ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.summonMinions", v)}
            />
          </div>

          {/* 防御/特殊技能 */}
          <div className="space-y-2 mt-3">
            <p className="text-[10px] text-cyan-400 font-medium">🛡️ 防御/特殊</p>
            <SkillToggle
              label="护盾"
              description="短暂无敌状态"
              checked={config.bossConfig?.skills?.shield ?? false}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.shield", v)}
            />
            <SkillToggle
              label="狂暴"
              description="血量低时攻击增强"
              checked={config.bossConfig?.skills?.enrage ?? true}
              onChange={(v) => onPropertyChange("config.bossConfig.skills.enrage", v)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 收集物属性 ====================

function CollectibleProperties({
  config,
  onPropertyChange,
}: {
  config: CollectibleConfig;
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 🔥 移除类型选择器，只显示当前类型 */}
      <div className="bg-yellow-900/20 rounded px-2 py-1.5 border border-yellow-600/30">
        <span className="text-xs text-gray-400">当前类型: </span>
        <span className="text-xs text-yellow-300 font-medium">
          {getCollectibleTypeName(config.collectibleType)}
        </span>
      </div>
      <NumberInput
        label={config.collectibleType === 'health_pack' ? "回血量" : "价值"}
        value={config.value || (config.collectibleType === 'health_pack' ? 30 : 10)}
        onChange={(v) => onPropertyChange("config.value", v)}
        min={1}
        max={1000}
      />
    </div>
  );
}

// ==================== 陷阱属性 ====================

function TrapProperties({
  config,
  onPropertyChange,
}: {
  config: TrapConfig;
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 🔥 移除类型选择器，只显示当前类型 */}
      <div className="bg-orange-900/20 rounded px-2 py-1.5 border border-orange-600/30">
        <span className="text-xs text-gray-400">当前类型: </span>
        <span className="text-xs text-orange-300 font-medium">
          {getTrapTypeName(config.trapType)}
        </span>
      </div>
      <NumberInput
        label="伤害值"
        value={config.damage || 20}
        onChange={(v) => onPropertyChange("config.damage", v)}
        min={5}
        max={100}
        step={5}
      />
      <SelectInput
        label="激活模式"
        value={config.pattern}
        options={[
          { value: "static", label: "静态" },
          { value: "periodic", label: "周期性" },
          { value: "triggered", label: "触发式" },
        ]}
        onChange={(v) => onPropertyChange("config.pattern", v)}
      />
    </div>
  );
}

// ==================== 机关属性 ====================

function MechanismProperties({
  config,
  onPropertyChange,
}: {
  config: MechanismConfig;
  onPropertyChange: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 🔥 移除类型选择器，只显示当前类型 */}
      <div className="bg-purple-900/20 rounded px-2 py-1.5 border border-purple-600/30">
        <span className="text-xs text-gray-400">当前类型: </span>
        <span className="text-xs text-purple-300 font-medium">
          {getMechanismTypeName(config.mechanismType)}
        </span>
      </div>

      {config.mechanismType === "wind" && (
        <>
          <SelectInput
            label="风向"
            value={config.windDirection || "up"}
            options={[
              { value: "up", label: "向上 ⬆️" },
              { value: "down", label: "向下 ⬇️" },
              { value: "left", label: "向左 ⬅️" },
              { value: "right", label: "向右 ➡️" },
            ]}
            onChange={(v) => onPropertyChange("config.windDirection", v)}
          />
          <NumberInput
            label="风力强度"
            value={config.windForce || 300}
            onChange={(v) => onPropertyChange("config.windForce", v)}
            min={100}
            max={800}
            step={50}
          />
          <p className="text-[10px] text-gray-500">
            💡 风力会推动玩家向指定方向移动
          </p>
        </>
      )}

      {config.mechanismType === "gravity_zone" && (
        <>
          <SelectInput
            label="重力效果"
            value={String(config.gravityMultiplier ?? -1)}
            options={[
              { value: "-1", label: "反重力 ⬆️ (向上飘)" },
              { value: "1", label: "正常重力 ⬇️" },
              { value: "2", label: "双倍重力 ⬇️⬇️" },
            ]}
            onChange={(v) => onPropertyChange("config.gravityMultiplier", Number(v))}
          />
          <p className="text-[10px] text-gray-500">
            💡 反重力会让玩家向上"掉落"
          </p>
        </>
      )}

      {config.mechanismType === "portal" && (
        <>
          <TextInput
            label="传送门ID"
            value={config.portalId || ""}
            onChange={(v) => onPropertyChange("config.portalId", v)}
            placeholder="如: A, B, 1, 2"
          />
          <TextInput
            label="链接到传送门ID"
            value={config.linkedTo || ""}
            onChange={(v) => onPropertyChange("config.linkedTo", v)}
            placeholder="输入目标传送门的ID"
          />
          <p className="text-[10px] text-gray-500">
            💡 示例：传送门1设ID为A，链接到B；传送门2设ID为B，链接到A
          </p>
        </>
      )}

      {(config.mechanismType === "button" ||
        config.mechanismType === "lever") && (
          <TextInput
            label="关联元素ID"
            value={config.linkedTo || ""}
            onChange={(v) => onPropertyChange("config.linkedTo", v)}
            placeholder="输入要关联的元素ID"
          />
        )}
    </div>
  );
}

// ==================== 通用输入组件 ====================

interface PropertySectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function PropertySection({ title, icon, children }: PropertySectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-yellow-400">
        {icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: NumberInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full px-2 py-1.5 bg-black/30 border border-yellow-600/30 rounded text-sm text-white focus:outline-none focus:border-yellow-500"
      />
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectInput({ label, value, options, onChange }: SelectInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 bg-black/30 border border-yellow-600/30 rounded text-sm text-white focus:outline-none focus:border-yellow-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextInput({ label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 bg-black/30 border border-yellow-600/30 rounded text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
      />
    </div>
  );
}

/** 🔥 技能开关组件 */
interface SkillToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SkillToggle({ label, description, checked, onChange }: SkillToggleProps) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${checked ? 'bg-green-900/30 border border-green-600/30' : 'bg-black/20 border border-gray-700/30'
        }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1">
        <p className={`text-xs font-medium ${checked ? 'text-green-300' : 'text-gray-400'}`}>
          {label}
        </p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${checked ? 'bg-green-600' : 'bg-gray-600'
        }`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
          }`} />
      </div>
    </div>
  );
}

// ==================== 类型守卫 ====================

function isPlatformConfig(config: unknown): config is PlatformConfig {
  return (config as PlatformConfig)?.platformType !== undefined;
}

function isEnemyConfig(config: unknown): config is EnemyConfig {
  return (config as EnemyConfig)?.enemyType !== undefined;
}

function isCollectibleConfig(config: unknown): config is CollectibleConfig {
  return (config as CollectibleConfig)?.collectibleType !== undefined;
}

function isTrapConfig(config: unknown): config is TrapConfig {
  return (config as TrapConfig)?.trapType !== undefined;
}

function isMechanismConfig(config: unknown): config is MechanismConfig {
  return (config as MechanismConfig)?.mechanismType !== undefined;
}

function isSpecialConfig(config: unknown): config is SpecialConfig {
  return (config as SpecialConfig)?.specialType !== undefined;
}

// ==================== 辅助函数 ====================

function getElementTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    ground: "地面",
    platform: "平台",
    moving: "移动平台",
    disappearing: "消失平台",
    bouncy: "弹跳平台",
    conveyor: "传送带",
    gravity_flip: "重力翻转",
    enemy_basic: "基础敌人",
    enemy_bat: "蝙蝠",
    enemy_robot: "机器人",
    enemy_slime: "史莱姆",
    enemy_boss: "Boss",
    coin: "金币",
    gem: "宝石",
    key: "钥匙",
    clue: "线索",
    health_pack: "血包",
    spike: "尖刺",
    fire: "火焰",
    electric: "电击",
    explosion: "爆炸",
    button: "按钮",
    lever: "拉杆",
    door: "门",
    portal: "传送门",
    trampoline: "蹦床",
    wind: "风力区域",
    gravity_zone: "重力区域",
    player_start: "起点",
    goal: "终点",
  };
  return typeNames[type] || type;
}

// 🔥 平台类型名称
function getPlatformTypeName(type: string): string {
  const names: Record<string, string> = {
    ground: "地面 🟫",
    platform: "平台 🟦",
    moving: "移动平台 ↔️",
    disappearing: "消失平台 👻",
    bouncy: "弹跳平台 🦘",
    conveyor: "传送带 ➡️",
    gravity_flip: "重力翻转 🔄",
  };
  return names[type] || type;
}

// 🔥 敌人类型名称
function getEnemyTypeName(type: string): string {
  const names: Record<string, string> = {
    basic: "基础敌人 👾",
    bat: "蝙蝠 🦇",
    robot: "机器人 🤖",
    slime: "史莱姆 🟢",
    boss: "Boss",
  };
  return names[type] || type;
}

// 🔥 收集物类型名称
function getCollectibleTypeName(type: string): string {
  const names: Record<string, string> = {
    coin: "金币 🪙",
    gem: "宝石 💎",
    key: "钥匙 🔑",
    clue: "线索 📜",
    health_pack: "血包 ❤️",
  };
  return names[type] || type;
}

// 🔥 陷阱类型名称
function getTrapTypeName(type: string): string {
  const names: Record<string, string> = {
    spike: "尖刺 🔺",
    fire: "火焰 🔥",
    electric: "电击 ⚡",
    explosion: "爆炸 💥",
  };
  return names[type] || type;
}

// 🔥 机关类型名称
function getMechanismTypeName(type: string): string {
  const names: Record<string, string> = {
    button: "按钮 🔘",
    lever: "拉杆 🕹️",
    door: "门 🚪",
    portal: "传送门 🌀",
    trampoline: "蹦床 🎪",
    wind: "风力区域 💨",
    gravity_zone: "重力区域 🌍",
  };
  return names[type] || type;
}
