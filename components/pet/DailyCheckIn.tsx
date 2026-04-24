'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCoinStore } from '@/store/coinStore';
import { usePetStore } from '@/store/petStore';
import { useFoodStore } from '@/store/foodStore';
import { getApiBaseUrl } from '@/lib/config/api';
import { showErrorToast } from '@/components/ui/ErrorToast';

interface FoodReward {
  id: string;
  quantity: number;
  name?: string;
  icon?: string;
}

interface DailyReward {
  day: number;
  coins: number;
  food: FoodReward[];
  eggs?: number;
  is_current: boolean;
  is_claimed: boolean;
}

interface DailyStatus {
  has_checked_in: boolean;
  current_streak: number;
  total_login_days: number;
  today_reward: { coins: number; food: FoodReward[]; eggs?: number } | null;
  rewards_preview: DailyReward[];
}

interface CheckInResult {
  success: boolean;
  message: string;
  rewards: {
    coins: number;
    food: { name: string; quantity: number; icon: string }[];
    eggs?: number;
  };
  new_streak: number;
  total_login_days: number;
  new_achievements?: { id: number; title: string; icon?: string; reward_exp?: number; reward_eggs?: number }[];
}

/**
 * 🎁 每日签到组件
 * 显示7天签到奖励日历，支持签到领取奖励
 */
export default function DailyCheckIn() {
  const { token, isAuthenticated } = useAuthStore();
  const { loadBalance } = useCoinStore();
  const { loadPets } = usePetStore();
  const { loadInventory } = useFoodStore();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [hasUnclaimed, setHasUnclaimed] = useState(false);

  // 获取签到状态
  const fetchStatus = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/daily/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setHasUnclaimed(!data.has_checked_in);
      }
    } catch (error) {
      console.error('获取签到状态失败:', error);
    }
  };

  // 执行签到
  const handleCheckIn = async () => {
    if (!token || loading || status?.has_checked_in) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/daily/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setCheckInResult(result);
        setShowRewardAnimation(true);
        setHasUnclaimed(false);
        
        // 同步金币余额（避免商店余额不同步）
        loadBalance(token).catch(() => {});

        // 如果获得蛋，同步宠物列表
        if ((result.rewards?.eggs || 0) > 0) {
          loadPets().catch(() => {});
        }

        // 同步食物背包（签到食物奖励）
        loadInventory(token, true).catch(() => {});
        
        // 更新状态
        await fetchStatus();

        // 成就解锁提示
        if (result.new_achievements && result.new_achievements.length > 0) {
          result.new_achievements.forEach((a: any) => {
            showErrorToast(`🏆 成就解锁：${a.title}，快去领取奖励！`, 'info');
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('achievement-refresh'));
          }
        }
        
        // 3秒后关闭动画
        setTimeout(() => {
          setShowRewardAnimation(false);
        }, 3000);
      }
    } catch (error) {
      console.error('签到失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchStatus();
    }
  }, [isAuthenticated, token]);

  // 未登录不显示
  if (!isAuthenticated || !token) return null;

  // 食物图标映射
  const foodIcons: Record<string, string> = {
    apple: '🍎',
    cookie: '🍪',
    cake: '🎂',
    star_cookie: '⭐🍪'
  };

  return (
    <>
      {/* 签到入口按钮 - 圆形风格 */}
      <motion.button
        onClick={() => setIsOpen(true)}
        data-testid="daily-checkin-button"
        className="fixed right-3 z-50"
        style={{ bottom: '4rem' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-600 bg-gradient-to-br from-blue-500 to-teal-500 shadow-lg">
            <CalendarDays className="h-[18px] w-[18px] text-white" />
          </div>
          
          {/* 未签到红点提示 */}
          {hasUnclaimed && (
            <motion.div
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-red-800 bg-red-600 px-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <span className="text-[10px] font-bold text-white">!</span>
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* 签到弹窗 - 像素风格 */}
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
              className="pixel-panel p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="text-center mb-6 pb-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                  <span>🎁</span> 每日签到
                </h2>
                <p className="text-blue-400 mt-1 text-sm">
                  已累计签到 <span className="font-bold text-blue-400">{status?.total_login_days || 0}</span> 天
                </p>
                <p className="text-blue-400 text-sm">
                  连续签到 <span className="font-bold text-blue-400">{status?.current_streak || 0}</span> 天
                </p>
              </div>

              {/* 7天奖励日历 - 像素风格 */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {status?.rewards_preview.map((reward, index) => (
                  <motion.div
                    key={reward.day}
                    className={`
                      relative p-2 text-center border-2
                      ${reward.is_claimed 
                        ? 'bg-blue-900/30 border-slate-600' 
                        : reward.is_current 
                          ? 'bg-amber-900/30 border-amber-400' 
                          : 'bg-slate-700 border-slate-600'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-xs text-slate-500 mb-1">Day {reward.day}</div>
                    <div className="text-lg">
                      {reward.is_claimed ? '✅' : reward.eggs ? '🥚' : reward.food[0]?.id ? foodIcons[reward.food[0].id] || '🎁' : '🪙'}
                    </div>
                    <div className="text-xs text-amber-400 font-medium">
                      {reward.coins}💰
                    </div>
                    {reward.eggs ? (
                      <div className="text-xs text-purple-600 font-medium">🥚 x{reward.eggs}</div>
                    ) : null}
                    
                    {/* 当前天高亮 */}
                    {reward.is_current && !reward.is_claimed && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 border border-red-900"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* 今日奖励预览 - 像素风格 */}
              {status?.today_reward && !status.has_checked_in && (
                <div className="pixel-panel p-4 mb-4 border-yellow-700">
                  <div className="text-center text-amber-400 font-bold mb-2">
                    今日签到可获得
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl">💰</div>
                      <div className="text-amber-400 font-bold">+{status.today_reward.coins}</div>
                    </div>
                    {status.today_reward.food.map((f, i) => (
                      <div key={i} className="text-center">
                        <div className="text-2xl">{foodIcons[f.id] || '🍎'}</div>
                        <div className="text-amber-400 font-bold">x{f.quantity}</div>
                      </div>
                    ))}
                    {(status.today_reward.eggs || 0) > 0 && (
                      <div className="text-center">
                        <img
                          src="/assets/pets/egg.svg"
                          alt="宠物蛋"
                          className="w-8 h-10 object-contain mx-auto"
                        />
                        <div className="text-amber-400 font-bold">x{status.today_reward.eggs}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 签到按钮 - 像素风格 */}
              <motion.button
                onClick={handleCheckIn}
                disabled={loading || status?.has_checked_in}
                className={`
                  w-full pixel-btn text-lg
                  ${status?.has_checked_in
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'pixel-btn-success'
                  }
                `}
                whileHover={!status?.has_checked_in ? { scale: 1.02 } : {}}
                whileTap={!status?.has_checked_in ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      ⏳
                    </motion.span>
                    签到中...
                  </span>
                ) : status?.has_checked_in ? (
                  '✅ 今日已签到'
                ) : (
                  '🎁 立即签到'
                )}
              </motion.button>

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

      {/* 签到成功奖励动画 - 像素风格 */}
      <AnimatePresence>
        {showRewardAnimation && checkInResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999]"
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
                {checkInResult.message}
              </h3>
              
              <div className="flex items-center justify-center gap-6 mb-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="text-4xl">💰</div>
                  <div className="text-yellow-400 font-bold text-xl pixel-text-shadow">+{checkInResult.rewards.coins}</div>
                </motion.div>
                
                {checkInResult.rewards.food.map((food, index) => (
                  <motion.div
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-4xl">{food.icon || '🍎'}</div>
                    <div className="text-yellow-400 font-bold text-xl pixel-text-shadow">
                      {food.name} x{food.quantity}
                    </div>
                  </motion.div>
                ))}
                {(checkInResult.rewards.eggs || 0) > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                  >
                    <img
                      src="/assets/pets/egg.svg"
                      alt="宠物蛋"
                      className="w-12 h-16 object-contain mx-auto"
                    />
                    <div className="text-yellow-400 font-bold text-xl pixel-text-shadow">
                      x{checkInResult.rewards.eggs}
                    </div>
                  </motion.div>
                )}
              </div>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowRewardAnimation(false)}
                className="pixel-btn pixel-btn-primary"
              >
                太棒了！
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
