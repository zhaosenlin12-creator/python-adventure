'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { usePetStore } from '@/store/petStore';
import { useCoinStore } from '@/store/coinStore';
import { useFoodStore } from '@/store/foodStore';
import { showErrorToast } from '@/components/ui/ErrorToast';
import { apiRequest, ApiError } from '@/lib/utils/apiRequest';
import { getApiBaseUrl } from '@/lib/config/api';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  reward_exp: number;
  reward_eggs?: number;
  unlocked: boolean;
  unlocked_at: string | null;
  is_claimed?: boolean;
}

/**
 * 🏆 成就系统面板
 * 展示所有成就，支持领取奖励
 */
export default function AchievementPanel() {
  const { token, isAuthenticated, loadUserProfile } = useAuthStore();
  const { loadFromCloud } = useGameStore();
  const { loadPets } = usePetStore();
  const { loadBalance } = useCoinStore();
  const { loadInventory } = useFoodStore();
  const [isOpen, setIsOpen] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [showClaimAnimation, setShowClaimAnimation] = useState<{exp: number; levelUp: boolean; eggs: number} | null>(null);
  const unlockedIdsRef = useRef<Set<number>>(new Set());
  const firstLoadRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  // 获取成就列表
  const fetchAchievements = async (force = false) => {
    if (!token || isFetchingRef.current) return;
    const now = Date.now();
    if (!force && now - lastFetchAtRef.current < 800) return;
    lastFetchAtRef.current = now;

    setLoading(true);
    isFetchingRef.current = true;
    try {
      const data = await apiRequest<Achievement[]>(
        '/achievements/list',
        { token, timeout: 8000, retries: 1, retryDelay: 1000 },
        'achievements-list'
      );
      setAchievements(data);
      
      // 计算未领取的已解锁成就数量
      const unclaimed = data.filter((a: Achievement) => a.unlocked && !a.is_claimed).length;
      setUnclaimedCount(unclaimed);

      const unlockedIds = new Set(data.filter((a: Achievement) => a.unlocked).map(a => a.id));
      // 提示新解锁成就（跳过首次加载）
      if (!firstLoadRef.current) {
        const newUnlocked = data.filter((a: Achievement) => a.unlocked && !unlockedIdsRef.current.has(a.id));
        if (newUnlocked.length > 0) {
          newUnlocked.forEach((a: Achievement) => {
            showErrorToast(`🏆 成就解锁：${a.title}，去领取奖励吧！`, 'info');
          });
        }
      }
      firstLoadRef.current = false;
      unlockedIdsRef.current = unlockedIds;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setAchievements([]);
        setUnclaimedCount(0);
        return;
      }
      if (error instanceof ApiError && error.isNetworkError()) {
        // 网络问题交给全局提示处理，避免控制台重复报错
      } else if (error instanceof ApiError && error.isClientError()) {
        // 其他客户端错误静默降级，避免在开发环境把调试层直接打到页面上
      } else {
        console.error('获取成就失败:', error);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // 领取成就奖励
  const claimReward = async (achievementId: number) => {
    if (!token || claimingId) return;
    
    setClaimingId(achievementId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/achievements/claim/${achievementId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 显示奖励动画
        setShowClaimAnimation({
          exp: result.reward_exp,
          levelUp: result.leveled_up,
          eggs: result.reward_eggs || 0
        });
        
        // 更新成就列表
        await fetchAchievements();

        // 如果奖励有蛋，同步宠物列表
        if ((result.reward_eggs || 0) > 0) {
          loadPets().catch(() => {});
        }
        // 同步金币与食物背包（成就可能包含物资奖励）
        loadBalance(token).catch(() => {});
        loadInventory(token, true).catch(() => {});

        // 同步玩家经验（后端真实数据）
        if ((result.reward_exp || 0) > 0 || result.leveled_up) {
          loadFromCloud().catch(() => {});
          loadUserProfile().catch(() => {});
        }
        
        // 3秒后关闭动画
        setTimeout(() => {
          setShowClaimAnimation(null);
        }, 3000);
      }
    } catch (error) {
      console.error('领取奖励失败:', error);
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAchievements();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const handler = () => fetchAchievements(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('achievement-refresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('achievement-refresh', handler);
      }
    };
  }, [isAuthenticated, token]);

  // 未登录不显示
  if (!isAuthenticated || !token) return null;

  // 成就分类
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  // 条件类型中文映射
  const conditionTypeText: Record<string, string> = {
    level: '达到等级',
    task_count: '完成任务/关卡',
    perfect_score: '满分次数',
    first_try: '首次通过任务',
    login_streak: '连续登录',
    evolution_stage: '进化阶段',
    evolution_count: '进化次数',
    hatch_count: '孵化次数'
  };

  const formatConditionText = (achievement: Achievement) => {
    if (achievement.condition_type === 'first_try') {
      return '首次提交即通过任意任务';
    }
    if (achievement.condition_type === 'evolution_stage') {
      return `进化到阶段 ${achievement.condition_value}`;
    }
    const label = conditionTypeText[achievement.condition_type] || achievement.condition_type;
    return `${label}: ${achievement.condition_value}`;
  };

  return (
    <>
      {/* 成就入口按钮 - 圆形风格 */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-44 right-4 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-amber-500 shadow-lg flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
          
          {/* 未领取红点提示 */}
          {unclaimedCount > 0 && (
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border-2 border-red-800 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <span className="text-white text-xs font-bold">{unclaimedCount}</span>
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* 成就弹窗 - 像素风格 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="pixel-panel w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="text-center p-4 border-b border-slate-700 flex-shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <span>🏆</span> 成就系统
                </h2>
                <p className="text-blue-400 mt-1 text-sm">
                  已解锁 <span className="font-bold text-blue-400">{unlockedAchievements.length}</span> / {achievements.length}
                </p>
              </div>

              {/* 成就列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-slate-400">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="inline-block text-2xl"
                    >
                      ⏳
                    </motion.span>
                    <div className="mt-2">加载中...</div>
                  </div>
                ) : (
                  <>
                    {/* 已解锁成就 */}
                    {unlockedAchievements.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-1">
                          <span>✨</span> 已解锁
                        </h3>
                        {unlockedAchievements.map(achievement => (
                          <motion.div
                            key={achievement.id}
                            className="pixel-panel p-3 mb-2 border-slate-600"
                            whileHover={{ scale: 1.01 }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-3xl flex-shrink-0">{achievement.icon}</div>
                              <div className="flex-1 min-w-0">
                              <div className="font-bold text-white flex items-center gap-2">
                                  {achievement.title}
                                  {achievement.is_claimed && (
                                    <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 border border-slate-700 rounded">
                                      已领取
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                  {achievement.description}
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-amber-400">
                                  <span>玩家经验 +{achievement.reward_exp}</span>
                                  {achievement.reward_eggs ? <span>🥚 x{achievement.reward_eggs}</span> : null}
                                  {achievement.unlocked_at && (
                                    <span className="text-slate-400">📅 {new Date(achievement.unlocked_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* 领取按钮 - 像素风格 */}
                              {!achievement.is_claimed && (
                                <motion.button
                                  onClick={() => claimReward(achievement.id)}
                                  disabled={claimingId === achievement.id}
                                  className="flex-shrink-0 pixel-btn pixel-btn-success text-xs px-3 py-1"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {claimingId === achievement.id ? '领取中...' : '领取'}
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* 未解锁成就 */}
                    {lockedAchievements.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <span>🔒</span> 未解锁
                        </h3>
                        {lockedAchievements.map(achievement => (
                          <motion.div
                            key={achievement.id}
                            className="pixel-panel p-3 mb-2 opacity-60"
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-3xl flex-shrink-0 grayscale">{achievement.icon}</div>
                              <div className="flex-1">
                                <div className="font-bold text-slate-400">{achievement.title}</div>
                                <div className="text-sm text-slate-500 mt-1">
                                  {achievement.description}
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                  <span>🎁 +{achievement.reward_exp} EXP</span>
                                  {achievement.reward_eggs ? <span>🥚 x{achievement.reward_eggs}</span> : null}
                                  <span>🎯 {formatConditionText(achievement)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {achievements.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        暂无成就数据
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 关闭按钮 - 像素风格 */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center rounded-lg transition-colors"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 领取奖励动画 - 像素风格 */}
      <AnimatePresence>
        {showClaimAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999]"
            onClick={() => setShowClaimAnimation(null)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="pixel-panel p-8 text-center border-4 border-yellow-600"
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                🎉
              </motion.div>
              
              <h3 className="text-2xl font-bold text-game-light pixel-text-shadow mb-4">
                成就奖励已领取！
              </h3>
              
              {showClaimAnimation.exp > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl text-yellow-400 font-bold mb-2 pixel-text-shadow"
                >
                  玩家经验 +{showClaimAnimation.exp}
                </motion.div>
              )}

              {showClaimAnimation.eggs > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl text-purple-300 font-bold mb-2 pixel-text-shadow"
                >
                  🥚 x{showClaimAnimation.eggs}
                </motion.div>
              )}
              
              {showClaimAnimation.levelUp && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className="text-green-400 text-xl font-bold pixel-text-shadow"
                >
                  🎊 升级了！
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
