"use client";

/**
 * LevelSelectModal - 关卡选择弹窗组件
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 用于加载用户保存的自定义关卡
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useEditorStore } from "@/store/editorStore";
import { getApiBaseUrl } from "@/lib/config/api";
import {
  X,
  Loader2,
  RefreshCw,
  Trash2,
  Calendar,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

// ==================== 类型定义 ====================

interface LevelSummary {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  created_at: string;
  updated_at: string;
}

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLevelLoaded?: () => void;
}

// ==================== 主组件 ====================

export default function LevelSelectModal({
  isOpen,
  onClose,
  onLevelLoaded,
}: LevelSelectModalProps) {
  const { token, isAuthenticated } = useAuthStore();
  const { loadFromCloud, isLoading: isLoadingLevel, error: loadError, clearError } = useEditorStore();
  
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's levels - 🔥 v2.4.6: 增强错误处理和重试机制
  const fetchLevels = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setError("请先登录");
      return;
    }

    // 🔥 离线检测
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError("网络已断开，请检查网络连接后重试");
      return;
    }

    setIsLoading(true);
    setError(null);

    // 🔥 带超时和重试的请求函数
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, options, retries - 1);
          }
          throw new Error('网络请求超时，请刷新页面重试');
        }
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
      }
    };

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetchWithRetry(`${baseUrl}/custom-levels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 🔥 处理401登录过期
      if (response.status === 401) {
        setError("登录已过期，请刷新页面重新登录");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: null }));
        // 🔥 友好的错误提示
        let errorMessage = "获取关卡列表失败，请刷新页面重试";
        if (response.status === 429) {
          errorMessage = "请求过于频繁，请稍后再试";
        } else if (response.status >= 500) {
          errorMessage = "服务器繁忙，请稍后刷新页面重试";
        } else if (errorData.detail && typeof errorData.detail === 'string') {
          // 过滤技术性错误
          if (!errorData.detail.includes('cannot') && !errorData.detail.includes('undefined')) {
            errorMessage = errorData.detail;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setLevels(Array.isArray(data) ? data : []);
    } catch (err) {
      let message = "获取关卡列表失败，请刷新页面重试";
      if (err instanceof Error) {
        // 过滤技术性错误
        if (err.message.includes('cannot') || err.message.includes('undefined') || err.message.includes('TypeError')) {
          message = "加载失败，请刷新页面重试";
        } else {
          message = err.message;
        }
      }
      setError(message);
      console.error("[LevelSelectModal] Fetch levels failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  // Load levels when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLevels();
    }
  }, [isOpen, fetchLevels]);

  // Handle level selection and load
  const handleLoadLevel = useCallback(async () => {
    if (!selectedLevelId) return;
    
    // 清除之前的错误
    clearError();
    setError(null);

    const success = await loadFromCloud(selectedLevelId);
    if (success) {
      onLevelLoaded?.();
      onClose();
    }
    // 如果失败，loadError 会被设置，下面会显示
  }, [selectedLevelId, loadFromCloud, clearError, onLevelLoaded, onClose]);

  // Handle level deletion
  const handleDeleteLevel = useCallback(async (levelId: string) => {
    if (!token) return;

    setIsDeleting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/custom-levels/${levelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "删除失败");
      }

      // Remove from local list
      setLevels((prev) => prev.filter((l) => l.id !== levelId));
      setDeleteConfirmId(null);
      
      // Clear selection if deleted level was selected
      if (selectedLevelId === levelId) {
        setSelectedLevelId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  }, [token, selectedLevelId]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get difficulty label
  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return { text: "简单", color: "text-green-400" };
      case 2:
        return { text: "中等", color: "text-yellow-400" };
      case 3:
        return { text: "困难", color: "text-red-400" };
      default:
        return { text: "未知", color: "text-gray-400" };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 rounded-xl w-full max-w-2xl max-h-[80vh] border-2 border-yellow-500/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-600/30">
          <h2 className="text-xl font-bold text-yellow-100 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            加载关卡
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLevels}
              disabled={isLoading}
              className="p-2 hover:bg-yellow-800/30 rounded-lg transition-colors"
              title="刷新列表"
            >
              <RefreshCw className={`w-5 h-5 text-yellow-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-yellow-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error Message */}
          {(error || loadError) && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-200">{error || loadError}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              <span className="ml-3 text-yellow-200">加载中...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && levels.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-yellow-600/50 mx-auto mb-4" />
              <p className="text-yellow-200/60">暂无保存的关卡</p>
              <p className="text-yellow-200/40 text-sm mt-2">
                创建并保存关卡后，可以在这里加载
              </p>
            </div>
          )}

          {/* Level List */}
          {!isLoading && levels.length > 0 && (
            <div className="space-y-2">
              {levels.map((level) => {
                const difficulty = getDifficultyLabel(level.difficulty);
                const isSelected = selectedLevelId === level.id;
                const isConfirmingDelete = deleteConfirmId === level.id;

                return (
                  <div
                    key={level.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-yellow-600/30 border-yellow-400"
                        : "bg-black/20 border-yellow-600/20 hover:border-yellow-500/50"
                    }`}
                    onClick={() => setSelectedLevelId(level.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-yellow-100">
                            {level.name}
                          </h3>
                          <span className={`text-xs ${difficulty.color}`}>
                            [{difficulty.text}]
                          </span>
                        </div>
                        {level.description && (
                          <p className="text-sm text-yellow-200/60 mt-1 line-clamp-2">
                            {level.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-yellow-200/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            更新: {formatDate(level.updated_at)}
                          </span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="ml-4">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLevel(level.id);
                              }}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
                            >
                              {isDeleting ? "删除中..." : "确认"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(level.id);
                            }}
                            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="删除关卡"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-yellow-600/30">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleLoadLevel}
            disabled={!selectedLevelId || isLoadingLevel}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              selectedLevelId && !isLoadingLevel
                ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                : "bg-gray-700/50 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoadingLevel && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoadingLevel ? "加载中..." : "加载关卡"}
          </button>
        </div>
      </div>
    </div>
  );
}
