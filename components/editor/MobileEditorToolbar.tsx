"use client";

/**
 * MobileEditorToolbar - 移动端编辑器工具栏组件
 * Requirements: 15.1 - 触摸优化的控件
 * 底部固定工具栏，触摸优化的按钮尺寸
 * 🔥 v2.0: 添加发布按钮，调整布局避免被聊天按钮遮挡
 */

import { useState, useCallback } from "react";
import { useEditorStore, canUndo, canRedo } from "@/store/editorStore";
import { EditorTool } from "@/types/editor";
import {
  MousePointer,
  Move,
  Trash2,
  Hand,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Play,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Settings,
  Loader2,
  Layers,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Globe,
  GlobeLock,
} from "lucide-react";

// ==================== 类型定义 ====================

interface MobileEditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onShowSettings: () => void;
  onShowPalette: () => void;
  onShowProperties: () => void;
  onShowLoadModal: () => void;
  isPaletteVisible: boolean;
  isPropertiesVisible: boolean;
}

// ==================== 工具定义 ====================

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer className="w-5 h-5" />, label: "选择" },
  { id: "pan", icon: <Hand className="w-5 h-5" />, label: "平移" },
  { id: "delete", icon: <Trash2 className="w-5 h-5" />, label: "删除" },
];

// ==================== 主组件 ====================

export default function MobileEditorToolbar({
  currentTool,
  onToolChange,
  onShowSettings,
  onShowPalette,
  onShowProperties,
  onShowLoadModal,
  isPaletteVisible,
  isPropertiesVisible,
}: MobileEditorToolbarProps) {
  const {
    undo,
    redo,
    saveToCloud,
    isDirty,
    isSaving,
    goal,
    selectedElementId,
    levelId,
    isPublished,
    isPublishing,
    publishLevel,
    unpublishLevel,
  } = useEditorStore();
  
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // Handle save
  const handleSave = useCallback(async () => {
    const success = await saveToCloud();
    if (success) {
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }
  }, [saveToCloud]);

  // Handle test
  const handleTest = useCallback(() => {
    if (!goal) {
      alert("请先设置关卡终点！");
      return;
    }
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-start-test"));
    }
  }, [goal]);

  // Handle publish - 使用 editorStore 内置方法
  const handlePublish = useCallback(async () => {
    setShowPublishConfirm(false);
    const success = await publishLevel();
    if (!success) {
      alert("发布失败，请重试");
    }
  }, [publishLevel]);

  // Handle unpublish - 使用 editorStore 内置方法
  const handleUnpublish = useCallback(async () => {
    setShowUnpublishConfirm(false);
    const success = await unpublishLevel();
    if (!success) {
      alert("取消发布失败，请重试");
    }
  }, [unpublishLevel]);

  // Handle zoom
  const handleZoom = useCallback((direction: "in" | "out") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-zoom", {
        detail: { direction },
      }));
    }
  }, []);

  // Handle grid toggle
  const handleToggleGrid = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-toggle-grid"));
    }
  }, []);

  return (
    <>
      {/* Expanded Tools Panel */}
      {showMoreTools && (
        <div className="fixed bottom-20 left-0 right-0 bg-[#0f172a]/95 border-t border-slate-600 p-3 z-40 animate-slide-up">
          <div className="flex justify-around items-center">
            {/* Undo/Redo */}
            <MobileToolButton
              icon={<Undo2 className="w-6 h-6" />}
              label="撤销"
              onClick={undo}
              disabled={!canUndo()}
            />
            <MobileToolButton
              icon={<Redo2 className="w-6 h-6" />}
              label="重做"
              onClick={redo}
              disabled={!canRedo()}
            />
            
            {/* Zoom */}
            <MobileToolButton
              icon={<ZoomOut className="w-6 h-6" />}
              label="缩小"
              onClick={() => handleZoom("out")}
            />
            <MobileToolButton
              icon={<ZoomIn className="w-6 h-6" />}
              label="放大"
              onClick={() => handleZoom("in")}
            />
            
            {/* Grid */}
            <MobileToolButton
              icon={<Grid3X3 className="w-6 h-6" />}
              label="网格"
              onClick={handleToggleGrid}
            />
            
            {/* Settings */}
            <MobileToolButton
              icon={<Settings className="w-6 h-6" />}
              label="设置"
              onClick={onShowSettings}
            />
          </div>
        </div>
      )}

      {/* Main Bottom Toolbar - 🔥 调整底部间距避免被聊天按钮遮挡 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 border-t border-slate-600 z-50 safe-area-bottom pb-safe">
        {/* 🔥 第一行：主要操作按钮（发布、测试、保存）- 放在上面避免被遮挡 */}
        <div className="flex items-center justify-center gap-2 px-2 py-1.5 border-b border-slate-700/40">
          {/* Load */}
          <MobileToolButton
            icon={<FolderOpen className="w-5 h-5" />}
            label="加载"
            onClick={onShowLoadModal}
            variant="secondary"
            compact
          />
          
          {/* Test */}
          <MobileToolButton
            icon={<Play className="w-5 h-5" />}
            label="测试"
            onClick={handleTest}
            variant="success"
            compact
          />
          
          {/* Save */}
          <MobileToolButton
            icon={isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            label={showSaveSuccess ? "✓" : "保存"}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            variant={showSaveSuccess ? "success" : isDirty ? "primary" : "disabled"}
            compact
          />
          
          {/* 🔥 Publish Button - 移动端新增 */}
          {levelId && (
            <MobileToolButton
              icon={isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : isPublished ? <Globe className="w-5 h-5" /> : <GlobeLock className="w-5 h-5" />}
              label={isPublishing ? "..." : isPublished ? "已发布" : "发布"}
              onClick={() => isPublished ? setShowUnpublishConfirm(true) : setShowPublishConfirm(true)}
              disabled={isPublishing || isDirty}
              variant={isPublished ? "published" : isDirty ? "disabled" : "publish"}
              compact
            />
          )}
        </div>
        
        {/* 🔥 第二行：工具和面板切换 */}
        <div className="flex items-center justify-between px-2 py-1.5">
          {/* Left: Panel Toggles */}
          <div className="flex items-center gap-1">
            <MobileToolButton
              icon={<Layers className="w-5 h-5" />}
              label="元素"
              onClick={onShowPalette}
              isActive={isPaletteVisible}
              compact
            />
            <MobileToolButton
              icon={<SlidersHorizontal className="w-5 h-5" />}
              label="属性"
              onClick={onShowProperties}
              isActive={isPropertiesVisible}
              disabled={!selectedElementId}
              compact
            />
          </div>

          {/* Center: Tools */}
          <div className="flex items-center gap-1">
            {TOOLS.map((tool) => (
              <MobileToolButton
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                isActive={currentTool === tool.id}
                onClick={() => onToolChange(tool.id)}
                compact
              />
            ))}
            
            {/* More Tools Toggle */}
            <MobileToolButton
              icon={showMoreTools ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              label="更多"
              onClick={() => setShowMoreTools(!showMoreTools)}
              isActive={showMoreTools}
              compact
            />
          </div>

          {/* Right: 空出位置给聊天按钮 */}
          <div className="w-12" />
        </div>
      </div>
      
      {/* 🔥 发布确认对话框 */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-[#0f172a] border border-slate-600 rounded-xl p-5 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">发布到社区</h3>
            <p className="text-gray-300 text-sm mb-4">
              确定要将此关卡发布到社区吗？发布后其他玩家可以浏览和游玩你的关卡。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-purple-600/50 hover:bg-purple-600 border border-purple-500 rounded-lg text-purple-200 text-sm transition-colors"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔥 取消发布确认对话框 */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-[#0f172a] border border-slate-600 rounded-xl p-5 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">取消发布</h3>
            <p className="text-gray-300 text-sm mb-4">
              确定要取消发布此关卡吗？取消后其他玩家将无法在社区中看到此关卡。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnpublishConfirm(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 bg-red-600/50 hover:bg-red-600 border border-red-500 rounded-lg text-red-200 text-sm transition-colors"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== 子组件 ====================

interface MobileToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "default" | "primary" | "secondary" | "success" | "disabled" | "publish" | "published";
  compact?: boolean;
}

function MobileToolButton({
  icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
  variant = "default",
  compact = false,
}: MobileToolButtonProps) {
  const baseClasses = "flex flex-col items-center justify-center rounded-lg transition-all active:scale-95";
  
  const sizeClasses = compact 
    ? "min-w-[44px] min-h-[44px] p-1" 
    : "min-w-[56px] min-h-[56px] p-2";
  
  const variantClasses = {
    default: disabled
      ? "opacity-30 cursor-not-allowed bg-gray-800/30"
      : isActive
      ? "bg-yellow-600/40 text-blue-300"
      : "bg-yellow-900/20 text-gray-400 active:bg-yellow-900/40",
    primary: disabled
      ? "opacity-30 cursor-not-allowed bg-gray-800/30"
      : "bg-yellow-600/30 text-blue-300 active:bg-yellow-600/50",
    secondary: "bg-blue-600/30 text-blue-300 active:bg-blue-600/50",
    success: "bg-green-600/30 text-green-300 active:bg-green-600/50",
    disabled: "opacity-30 cursor-not-allowed bg-gray-800/30 text-gray-500",
    publish: disabled
      ? "opacity-30 cursor-not-allowed bg-gray-800/30"
      : "bg-purple-600/30 text-purple-300 active:bg-purple-600/50",
    published: "bg-purple-600/50 text-purple-200 active:bg-purple-600/70",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}
      title={label}
    >
      {icon}
      <span className="text-[9px] mt-0.5 truncate max-w-full">{label}</span>
    </button>
  );
}
