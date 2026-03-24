"use client";

/**
 * AutoSaveIndicator - 自动保存指示器组件
 * Requirements: 设计文档-自动保存
 * 
 * 显示自动保存状态和恢复提示
 */

import { useState, useEffect } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Cloud, CloudOff, RefreshCw, X } from "lucide-react";

interface AutoSaveIndicatorProps {
  onRestore?: () => void;
}

export default function AutoSaveIndicator({ onRestore }: AutoSaveIndicatorProps) {
  const {
    lastAutoSaveTime,
    hasAutoSave,
    restoreAutoSave,
    clearAutoSave,
    showAutoSaveIndicator,
  } = useAutoSave({
    onAutoSaveRestore: onRestore,
  });

  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Show restore prompt if there's an auto-save
  useEffect(() => {
    if (hasAutoSave) {
      setShowRestorePrompt(true);
    }
  }, [hasAutoSave]);

  // Format time
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle restore
  const handleRestore = () => {
    const success = restoreAutoSave();
    if (success) {
      setShowRestorePrompt(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    clearAutoSave();
    setShowRestorePrompt(false);
  };

  return (
    <>
      {/* Auto-save indicator */}
      {showAutoSaveIndicator && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-green-900/80 border border-green-500/50 rounded-lg animate-fade-in">
          <Cloud className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">已自动保存</span>
          {lastAutoSaveTime > 0 && (
            <span className="text-xs text-green-400/60">
              {formatTime(lastAutoSaveTime)}
            </span>
          )}
        </div>
      )}

      {/* Restore prompt */}
      {showRestorePrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 rounded-xl p-4 border-2 border-yellow-500/50 shadow-xl animate-fade-in max-w-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-600/30 rounded-lg">
              <RefreshCw className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-100 mb-1">
                发现未保存的编辑
              </h3>
              <p className="text-sm text-yellow-200/70 mb-3">
                检测到上次编辑的自动保存数据，是否恢复？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRestore}
                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm text-white transition-colors"
                >
                  恢复编辑
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                >
                  放弃
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-red-900/30 rounded transition-colors"
            >
              <X className="w-4 h-4 text-yellow-400" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
