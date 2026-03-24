/**
 * 🍖 食物奖励工具函数
 * 根据游戏活动自动发放食物奖励
 */

import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console, '[FoodRewards]') : () => {};

/**
 * 发放食物奖励
 * @param rewardType 奖励类型
 * @param showToast 是否显示Toast通知（可选）
 */
export async function grantFoodReward(
  rewardType: string,
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  try {
    const { token, isAuthenticated } = useAuthStore.getState();
    
    if (!isAuthenticated || !token) {
      debugLog('用户未登录，跳过食物奖励');
      return;
    }
    
    debugLog('发放食物奖励:', rewardType);
    
    const { grantReward } = useFoodStore.getState();
    const rewards = await grantReward(rewardType, token);
    
    if (rewards && rewards.length > 0) {
      debugLog('食物奖励发放成功:', rewards);
      
      // 构建奖励消息
      const rewardMessages = rewards.map(r => `${r.food_icon} ${r.food_name} x${r.quantity}`).join(', ');
      const message = `🎁 获得食物：${rewardMessages}`;
      
      // 显示Toast通知
      if (showToast) {
        showToast(message, 'success');
      }
      
      debugLog('食物奖励通知已显示');
    }
  } catch (error) {
    console.error('[FoodRewards] 发放食物奖励失败:', error);
    // 奖励失败不影响游戏流程
  }
}

/**
 * 关卡完成奖励
 */
export async function grantLevelCompleteReward(
  difficulty: 'easy' | 'medium' | 'hard',
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  const rewardType = `level_${difficulty}`;
  await grantFoodReward(rewardType, showToast);
}

/**
 * 代码质量奖励
 */
export async function grantCodeQualityReward(
  grade: 'a' | 'b' | 'c',
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  const rewardType = `code_quality_${grade}`;
  await grantFoodReward(rewardType, showToast);
}

/**
 * Boss击败奖励
 */
export async function grantBossDefeatReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('boss_defeat', showToast);
}

/**
 * PvP胜利奖励
 */
export async function grantPvpWinReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('pvp_win', showToast);
}

/**
 * PvP失败奖励（安慰奖）
 */
export async function grantPvpLoseReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('pvp_lose', showToast);
}

/**
 * 创意工坊发布奖励
 */
export async function grantWorkshopPublishReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('workshop_publish', showToast);
}

/**
 * 创意工坊被玩奖励
 */
export async function grantWorkshopPlayReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('workshop_play', showToast);
}

/**
 * 创意工坊被点赞奖励
 */
export async function grantWorkshopLikeReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('workshop_like', showToast);
}

/**
 * 每日登录奖励
 */
export async function grantDailyLoginReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('daily_login', showToast);
}

/**
 * 每日任务完成奖励
 */
export async function grantDailyQuestReward(
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  await grantFoodReward('daily_quest', showToast);
}

/**
 * 排行榜奖励
 */
export async function grantLeaderboardReward(
  rank: 'top1' | 'top3' | 'top10',
  showToast?: (message: string, type: 'success' | 'error') => void
): Promise<void> {
  const rewardType = `leaderboard_${rank}`;
  await grantFoodReward(rewardType, showToast);
}
