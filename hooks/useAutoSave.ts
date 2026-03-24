/**
 * useAutoSave - 自动保存 Hook
 * Requirements: 设计文档-自动保存
 * 
 * 功能:
 * - 每30秒自动保存到localStorage
 * - 启动时检查并恢复自动保存
 * - 显示"已自动保存"提示
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';

const AUTO_SAVE_INTERVAL = 30000; // 30秒

interface UseAutoSaveOptions {
  enabled?: boolean;
  interval?: number;
  onAutoSave?: () => void;
  onAutoSaveRestore?: () => void;
}

interface UseAutoSaveReturn {
  lastAutoSaveTime: number;
  hasAutoSave: boolean;
  restoreAutoSave: () => boolean;
  clearAutoSave: () => void;
  showAutoSaveIndicator: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveReturn {
  const {
    enabled = true,
    interval = AUTO_SAVE_INTERVAL,
    onAutoSave,
    onAutoSaveRestore,
  } = options;

  const {
    autoSave,
    loadAutoSave,
    clearAutoSave,
    lastAutoSaveTime,
    autoSaveEnabled,
    isDirty,
  } = useEditorStore();

  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing auto-save on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('editor-autosave');
      if (saved) {
        // 🔥 尝试解码 Base64（editorStore 使用了 obfuscateData）
        let parsed;
        try {
          // 先尝试 Base64 解码
          const decoded = decodeURIComponent(atob(saved));
          parsed = JSON.parse(decoded);
        } catch {
          // 回退到直接解析（旧格式兼容）
          try {
            parsed = JSON.parse(saved);
          } catch {
            // 数据格式无效，清除
            console.warn('[useAutoSave] Invalid auto-save data, clearing');
            localStorage.removeItem('editor-autosave');
            return;
          }
        }
        
        const { timestamp } = parsed;
        // Check if not expired (24 hours)
        if (timestamp && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setHasAutoSave(true);
        } else {
          // 过期，清除
          localStorage.removeItem('editor-autosave');
        }
      }
    } catch (error) {
      console.error('[useAutoSave] Error checking auto-save:', error);
      // 出错时清除无效数据
      try {
        localStorage.removeItem('editor-autosave');
      } catch {}
    }
  }, []);

  // Perform auto-save
  const performAutoSave = useCallback(() => {
    if (!enabled || !autoSaveEnabled || !isDirty) return;

    autoSave();
    onAutoSave?.();

    // Show indicator briefly
    setShowAutoSaveIndicator(true);
    setTimeout(() => setShowAutoSaveIndicator(false), 2000);
  }, [enabled, autoSaveEnabled, isDirty, autoSave, onAutoSave]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled || !autoSaveEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(performAutoSave, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, autoSaveEnabled, interval, performAutoSave]);

  // Restore auto-save
  const restoreAutoSave = useCallback(() => {
    const success = loadAutoSave();
    if (success) {
      setHasAutoSave(false);
      onAutoSaveRestore?.();
    }
    return success;
  }, [loadAutoSave, onAutoSaveRestore]);

  // Clear auto-save
  const handleClearAutoSave = useCallback(() => {
    clearAutoSave();
    setHasAutoSave(false);
  }, [clearAutoSave]);

  return {
    lastAutoSaveTime,
    hasAutoSave,
    restoreAutoSave,
    clearAutoSave: handleClearAutoSave,
    showAutoSaveIndicator,
  };
}

export default useAutoSave;
