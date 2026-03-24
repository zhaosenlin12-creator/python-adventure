"use client";

/**
 * CommunityBrowserModal - 社区关卡浏览弹窗组件
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2
 * 用于浏览、点赞和游玩社区关卡
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  getCommunityLevels,
  likeLevel,
  unlikeLevel,
  unpublishLevel,
} from "@/lib/api/community";
import { toFriendlyMessage } from "@/lib/utils/friendlyError";
import type {
  CommunityLevelSummary,
  CommunityLevelListResponse,
} from "@/types/community";
import {
  X,
  Loader2,
  RefreshCw,
  Heart,
  Play,
  Users,
  Calendar,
  AlertCircle,
  Globe,
  ChevronDown,
  Star,
  GlobeLock,
} from "lucide-react";

// ==================== 类型定义 ====================

type SortOption = "newest" | "most_played" | "difficulty";

interface CommunityBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayLevel: (levelId: string) => void;
}

// ==================== 排序选项配置 ====================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "最新发布" },
  { value: "most_played", label: "最多游玩" },
  { value: "difficulty", label: "难度排序" },
];

// ==================== 主组件 ====================

export default function CommunityBrowserModal({
  isOpen,
  onClose,
  onPlayLevel,
}: CommunityBrowserModalProps) {
  const { token, isAuthenticated, user } = useAuthStore();

  // 状态管理
  const [levels, setLevels] = useState<CommunityLevelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [likingLevelId, setLikingLevelId] = useState<string | null>(null);
  const [unpublishingLevelId, setUnpublishingLevelId] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<string | null>(null);

  // 获取社区关卡列表 - 🔥 v2.4.6: 增强错误处理和重试机制
  const fetchLevels = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      // 🔥 离线检测
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError("网络已断开，请检查网络连接后重试");
        return;
      }

      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      // 🔥 重试计数
      let retries = 2;
      
      const attemptFetch = async (): Promise<CommunityLevelListResponse | null> => {
        try {
          const response = await getCommunityLevels(
            { page: pageNum, limit: 20, sort: sortBy },
            token || undefined
          );
          return response;
        } catch (err) {
          if (retries > 0) {
            retries--;
            console.log(`[CommunityBrowserModal] Retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            return attemptFetch();
          }
          throw err;
        }
      };

      try {
        const response = await attemptFetch();
        
        if (!response) {
          throw new Error("获取数据失败");
        }

        if (append) {
          // 🔥 v2.4.6: 防止重复数据
          setLevels((prev) => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLevels = response.levels.filter(l => !existingIds.has(l.id));
            return [...prev, ...newLevels];
          });
        } else {
          setLevels(response.levels || []);
        }

        setHasMore(response.has_more);
        setTotal(response.total);
        setPage(pageNum);
      } catch (err) {
        let message = "获取社区关卡失败，请刷新重试";
        if (err instanceof Error) {
          if (err.message === "LOGIN_EXPIRED") {
            message = "登录已过期，请重新登录";
          } else if (err.message.includes('cannot') || err.message.includes('undefined') || err.message.includes('TypeError')) {
            message = "加载失败，请刷新页面重试";
          } else {
            message = err.message;
          }
        }
        setError(toFriendlyMessage(err, message));
        console.error("[CommunityBrowserModal] Fetch levels failed:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [sortBy, token]
  );

  // 当弹窗打开或排序改变时加载数据
  useEffect(() => {
    if (isOpen) {
      fetchLevels(1, false);
    }
  }, [isOpen, sortBy, fetchLevels]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchLevels(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, fetchLevels]);

  // 处理点赞/取消点赞
  const handleToggleLike = useCallback(
    async (level: CommunityLevelSummary, e: React.MouseEvent) => {
      e.stopPropagation();

      if (!isAuthenticated || !token) {
        setError("请先登录后再点赞");
        return;
      }

      setLikingLevelId(level.id);

      try {
        if (level.is_liked) {
          const response = await unlikeLevel(level.id, token);
          setLevels((prev) =>
            prev.map((l) =>
              l.id === level.id
                ? { ...l, is_liked: false, like_count: response.like_count }
                : l
            )
          );
        } else {
          const response = await likeLevel(level.id, token);
          setLevels((prev) =>
            prev.map((l) =>
              l.id === level.id
                ? { ...l, is_liked: true, like_count: response.like_count }
                : l
            )
          );
          
          // 🍖 发放点赞奖励（鼓励互动）
          try {
            const { grantWorkshopLikeReward } = await import('@/lib/utils/foodRewards');
            const { showFoodRewardToast } = await import('@/components/ui/FoodRewardToast');
            await grantWorkshopLikeReward(showFoodRewardToast);
            console.log('[CommunityBrowser] 点赞食物奖励发放成功');
          } catch (error) {
            console.error('[CommunityBrowser] 食物奖励发放失败:', error);
            // 奖励失败不影响点赞流程
          }
          
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "操作失败";
        if (message === "LOGIN_EXPIRED") {
          setError("登录已过期，请重新登录");
        } else {
          setError(toFriendlyMessage(err, message));
        }
      } finally {
        setLikingLevelId(null);
      }
    },
    [isAuthenticated, token]
  );

  // 处理游玩
  const handlePlay = useCallback(
    (levelId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onPlayLevel(levelId);
      onClose();
    },
    [onPlayLevel, onClose]
  );

  // 处理取消发布
  const handleUnpublish = useCallback(
    async (levelId: string) => {
      if (!token) {
        setError("请先登录");
        return;
      }

      setUnpublishingLevelId(levelId);
      setShowUnpublishConfirm(null);

      try {
        await unpublishLevel(levelId, token);
        // 从列表中移除该关卡
        setLevels((prev) => prev.filter((l) => l.id !== levelId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "取消发布失败";
        if (message === "LOGIN_EXPIRED") {
          setError("登录已过期，请重新登录");
        } else {
          setError(message);
        }
      } finally {
        setUnpublishingLevelId(null);
      }
    },
    [token]
  );

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 获取难度标签
  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < difficulty ? "text-blue-400 fill-yellow-400" : "text-gray-600"
        }`}
      />
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e293b] rounded-xl w-full max-w-4xl max-h-[85vh] border-2 border-yellow-600/50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600 bg-[#1e293b]/50">
          <h2 className="text-xl font-bold text-yellow-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            社区关卡
            {total > 0 && (
              <span className="text-sm font-normal text-slate-400">
                ({total} 个关卡)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-700/20 hover:bg-yellow-600/30 border border-blue-600/30 rounded-lg transition-colors"
              >
                <span className="text-sm text-slate-300">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <ChevronDown className="w-4 h-4 text-blue-400" />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-[#1e293b] border border-yellow-600/50 rounded-lg shadow-xl z-10 min-w-[140px]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? "bg-yellow-600/30 text-blue-300"
                          : "text-slate-400 hover:bg-blue-700/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchLevels(1, false)}
              disabled={isLoading}
              className="p-2 hover:bg-yellow-800/30 rounded-lg transition-colors"
              title="刷新列表"
            >
              <RefreshCw
                className={`w-5 h-5 text-blue-400 ${
                  isLoading ? "animate-spin" : ""
                }`}
              />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-200">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="ml-3 text-slate-300">加载中...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && levels.length === 0 && (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 text-yellow-600/50 mx-auto mb-4" />
              <p className="text-slate-400">暂无社区关卡</p>
              <p className="text-slate-400 text-sm mt-2">
                成为第一个发布关卡的创作者吧！
              </p>
            </div>
          )}

          {/* Level Grid */}
          {!isLoading && levels.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levels.map((level) => (
                  <LevelCard
                    key={level.id}
                    level={level}
                    currentUserId={user?.id}
                    onPlay={handlePlay}
                    onToggleLike={handleToggleLike}
                    onUnpublish={(levelId) => setShowUnpublishConfirm(levelId)}
                    isLiking={likingLevelId === level.id}
                    isUnpublishing={unpublishingLevelId === level.id}
                    formatDate={formatDate}
                    getDifficultyStars={getDifficultyStars}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 rounded-lg text-blue-300 transition-colors flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      "加载更多"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unpublish Confirmation Dialog */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-[#0f172a] border border-slate-600 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">取消发布</h3>
            <p className="text-gray-300 mb-4">
              确定要取消发布此关卡吗？取消后其他玩家将无法在社区中看到此关卡。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnpublishConfirm(null)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleUnpublish(showUnpublishConfirm)}
                className="px-4 py-2 bg-red-600/50 hover:bg-red-600 border border-red-500 rounded-lg text-red-200 transition-colors"
              >
                确认取消发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close sort dropdown */}
      {showSortDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSortDropdown(false)}
        />
      )}
    </div>
  );
}


// ==================== LevelCard 子组件 ====================

interface LevelCardProps {
  level: CommunityLevelSummary;
  currentUserId?: number;
  onPlay: (levelId: string, e: React.MouseEvent) => void;
  onToggleLike: (level: CommunityLevelSummary, e: React.MouseEvent) => void;
  onUnpublish: (levelId: string) => void;
  isLiking: boolean;
  isUnpublishing: boolean;
  formatDate: (dateString: string) => string;
  getDifficultyStars: (difficulty: number) => React.ReactNode[];
}

function LevelCard({
  level,
  currentUserId,
  onPlay,
  onToggleLike,
  onUnpublish,
  isLiking,
  isUnpublishing,
  formatDate,
  getDifficultyStars,
}: LevelCardProps) {
  const isOwnLevel = currentUserId !== undefined && level.author_id === currentUserId;

  return (
    <div className="bg-[#0f172a]/80 border border-slate-600 rounded-lg p-4 hover:border-yellow-500/50 transition-all group">
      {/* Header: Name and Difficulty */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-yellow-100 truncate group-hover:text-yellow-50 transition-colors">
              {level.name}
            </h3>
            {isOwnLevel && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded border border-purple-500/30">
                我的
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate">
            by {level.author_name}
          </p>
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          {getDifficultyStars(level.difficulty)}
        </div>
      </div>

      {/* Description */}
      {level.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-3">
          {level.description}
        </p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {level.play_count} 次游玩
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" />
          {level.like_count} 点赞
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(level.published_at)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/40">
        {/* Unpublish Button - Only for own levels */}
        {isOwnLevel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnpublish(level.id);
            }}
            disabled={isUnpublishing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors"
            title="取消发布"
          >
            {isUnpublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GlobeLock className="w-4 h-4" />
            )}
            <span className="text-sm">取消发布</span>
          </button>
        )}

        {/* Like Button */}
        <button
          onClick={(e) => onToggleLike(level, e)}
          disabled={isLiking}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            level.is_liked
              ? "bg-pink-600/30 text-pink-300 hover:bg-pink-600/40"
              : "bg-blue-700/20 text-blue-300 hover:bg-yellow-600/30"
          }`}
          title={level.is_liked ? "取消点赞" : "点赞"}
        >
          {isLiking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Heart
              className={`w-4 h-4 ${level.is_liked ? "fill-pink-400" : ""}`}
            />
          )}
          <span className="text-sm">{level.like_count}</span>
        </button>

        {/* Play Button */}
        <button
          onClick={(e) => onPlay(level.id, e)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          <span className="text-sm">游玩</span>
        </button>
      </div>
    </div>
  );
}
