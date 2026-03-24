"use client";

/**
 * EditorToolbar - 编辑器工具栏组件
 * Requirements: 13.4, 13.5, 11.1-11.5, 12.1-12.4, 1.1, 1.4 (社区发布)
 * 包含保存、加载、测试、撤销、重做、缩放、发布按钮
 */

import { useState, useCallback } from "react";
import { useEditorStore, canUndo, canRedo } from "@/store/editorStore";
import { EditorTool } from "@/types/editor";
import LevelSelectModal from "./LevelSelectModal";
import {
  MousePointer,
  Trash2,
  Hand,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Play,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
  Settings,
  Loader2,
  Globe,
  GlobeLock,
} from "lucide-react";

// ==================== 类型定义 ====================

interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onShowSettings: () => void;
}

// ==================== 工具定义 ====================

const TOOLS: { id: EditorTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: "select", icon: <MousePointer className="w-4 h-4" />, label: "选择", shortcut: "V" },
  { id: "pan", icon: <Hand className="w-4 h-4" />, label: "平移", shortcut: "H" },
  { id: "delete", icon: <Trash2 className="w-4 h-4" />, label: "删除", shortcut: "D" },
];

// ==================== 主组件 ====================

export default function EditorToolbar({
  currentTool,
  onToolChange,
  onShowSettings,
}: EditorToolbarProps) {
  const {
    undo,
    redo,
    saveToCloud,
    isDirty,
    isSaving,
    goal,
    levelId,
    isPublished,
    isPublishing,
    publishLevel,
    unpublishLevel,
  } = useEditorStore();
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
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

  // Handle publish
  const handlePublish = useCallback(async () => {
    setShowPublishConfirm(false);
    const success = await publishLevel();
    if (success) {
      // 可以添加成功提示
    }
  }, [publishLevel]);

  // Handle unpublish
  const handleUnpublish = useCallback(async () => {
    setShowUnpublishConfirm(false);
    const success = await unpublishLevel();
    if (success) {
      // 可以添加成功提示
    }
  }, [unpublishLevel]);

  // Handle test
  const handleTest = useCallback(() => {
    // Validate level before testing
    if (!goal) {
      alert("请先设置关卡终点！");
      return;
    }
    
    // Dispatch test event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-start-test"));
    }
  }, [goal]);

  // Handle undo
  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  // Handle redo
  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // Handle zoom
  const handleZoom = useCallback((direction: "in" | "out" | "reset") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-zoom", {
        detail: { direction },
      }));
    }
    
    // Update local zoom level for display
    if (direction === "in") {
      setZoomLevel((prev) => Math.min(prev + 0.1, 2));
    } else if (direction === "out") {
      setZoomLevel((prev) => Math.max(prev - 0.1, 0.25));
    } else {
      setZoomLevel(1);
    }
  }, []);

  // Handle grid toggle
  const handleToggleGrid = useCallback(() => {
    setGridVisible((prev) => !prev);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("editor-toggle-grid"));
    }
  }, []);

  // Listen for zoom changes from scene
  if (typeof window !== "undefined") {
    window.addEventListener("editor-zoom-changed", ((event: CustomEvent) => {
      setZoomLevel(event.detail.zoom);
    }) as EventListener);
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a]/90 border-b border-slate-700/40">
      {/* Left Section - Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => (
          <ToolButton
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={currentTool === tool.id}
            onClick={() => onToolChange(tool.id)}
          />
        ))}
        
        <div className="w-px h-6 bg-yellow-600/30 mx-2" />
        
        {/* Grid Toggle */}
        <ToolButton
          icon={<Grid3X3 className="w-4 h-4" />}
          label="网格"
          shortcut="G"
          isActive={gridVisible}
          onClick={handleToggleGrid}
        />
      </div>

      {/* Center Section - Undo/Redo */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label="撤销"
          shortcut="Ctrl+Z"
          onClick={handleUndo}
          disabled={!canUndo()}
        />
        <ToolButton
          icon={<Redo2 className="w-4 h-4" />}
          label="重做"
          shortcut="Ctrl+Y"
          onClick={handleRedo}
          disabled={!canRedo()}
        />
        
        <div className="w-px h-6 bg-yellow-600/30 mx-2" />
        
        {/* Zoom Controls */}
        <ToolButton
          icon={<ZoomOut className="w-4 h-4" />}
          label="缩小"
          shortcut="-"
          onClick={() => handleZoom("out")}
        />
        <div className="px-2 py-1 text-xs text-blue-400 min-w-[50px] text-center">
          {Math.round(zoomLevel * 100)}%
        </div>
        <ToolButton
          icon={<ZoomIn className="w-4 h-4" />}
          label="放大"
          shortcut="+"
          onClick={() => handleZoom("in")}
        />
        <ToolButton
          icon={<Maximize className="w-4 h-4" />}
          label="重置缩放"
          shortcut="0"
          onClick={() => handleZoom("reset")}
        />
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        <ToolButton
          icon={<Settings className="w-4 h-4" />}
          label="设置"
          onClick={onShowSettings}
        />
        
        <div className="w-px h-6 bg-yellow-600/30 mx-1" />
        
        {/* Load Button */}
        <button
          onClick={() => setShowLoadModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded-lg transition-colors"
          title="加载关卡"
        >
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300">加载</span>
        </button>
        
        {/* Test Button */}
        <button
          onClick={handleTest}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 rounded-lg transition-colors"
          title="测试关卡"
        >
          <Play className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">测试</span>
        </button>
        
        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            showSaveSuccess
              ? "bg-green-600/50 border border-green-400"
              : isDirty
              ? "bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50"
              : "bg-gray-700/30 border border-gray-600/30 cursor-not-allowed"
          }`}
          title={isDirty ? "保存关卡" : "无更改需要保存"}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : showSaveSuccess ? (
            <span className="text-green-400">✓</span>
          ) : (
            <Save className="w-4 h-4 text-blue-400" />
          )}
          <span className={`text-sm ${showSaveSuccess ? "text-green-300" : "text-blue-300"}`}>
            {isSaving ? "保存中..." : showSaveSuccess ? "已保存" : "保存"}
          </span>
        </button>
        
        {/* Publish Button - Requirements: 1.1, 1.4 */}
        {levelId && (
          <button
            onClick={() => isPublished ? setShowUnpublishConfirm(true) : setShowPublishConfirm(true)}
            disabled={isPublishing || isDirty}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isPublishing
                ? "bg-purple-600/30 border border-purple-500/50"
                : isPublished
                ? "bg-purple-600/50 border border-purple-400 hover:bg-purple-600/70"
                : isDirty
                ? "bg-gray-700/30 border border-gray-600/30 cursor-not-allowed"
                : "bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50"
            }`}
            title={
              isDirty 
                ? "请先保存关卡" 
                : isPublished 
                ? "点击取消发布" 
                : "发布到社区"
            }
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            ) : isPublished ? (
              <Globe className="w-4 h-4 text-purple-300" />
            ) : (
              <GlobeLock className="w-4 h-4 text-purple-400" />
            )}
            <span className={`text-sm ${isPublished ? "text-purple-200" : "text-purple-300"}`}>
              {isPublishing ? "处理中..." : isPublished ? "已发布" : "发布"}
            </span>
          </button>
        )}
      </div>
      
      {/* Publish Confirmation Dialog */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-600 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">发布到社区</h3>
            <p className="text-gray-300 mb-4">
              确定要将此关卡发布到社区吗？发布后其他玩家可以浏览和游玩你的关卡。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-purple-600/50 hover:bg-purple-600 border border-purple-500 rounded-lg text-purple-200 transition-colors"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Unpublish Confirmation Dialog */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f172a] border border-slate-600 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">取消发布</h3>
            <p className="text-gray-300 mb-4">
              确定要取消发布此关卡吗？取消后其他玩家将无法在社区中看到此关卡。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnpublishConfirm(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUnpublish}
                className="px-4 py-2 bg-red-600/50 hover:bg-red-600 border border-red-500 rounded-lg text-red-200 transition-colors"
              >
                确认取消发布
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Level Select Modal */}
      <LevelSelectModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLevelLoaded={() => {
          // Dispatch event to refresh the editor scene
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("editor-level-loaded"));
          }
        }}
      />
    </div>
  );
}

// ==================== 子组件 ====================

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolButton({
  icon,
  label,
  shortcut,
  isActive = false,
  disabled = false,
  onClick,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : isActive
          ? "bg-yellow-600/40 text-blue-300"
          : "hover:bg-blue-700/30 text-gray-400 hover:text-blue-300"
      }`}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
    </button>
  );
}
