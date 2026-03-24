/**
 * 🍖 食物奖励助手
 * 在游戏各个环节完成时自动发放食物奖励
 */

import { useFoodStore } from '@/store/foodStore';
import { useAuthStore } from '@/store/authStore';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console, '[FoodReward]') : () => {};

/**
 * 奖励类型映射
 */
export type RewardType =
  | 'level_easy'
  | 'level_medium'
  | 'level_hard'
  | 'code_quality_a'
  | 'code_quality_b'
  | 'code_quality_c'
  | 'boss_defeat'
  | 'pvp_win'
  | 'pvp_loss'
  | 'workshop_publish'
  | 'workshop_play'
  | 'workshop_like'
  | 'daily_login'
  | 'daily_quest'
  | 'leaderboard_top10'
  | 'leaderboard_top3'
  | 'leaderboard_top1';

/**
 * 根据关卡难度判断奖励类型
 */
export function getLevelRewardType(levelId: string, score?: number): RewardType {
  // 根据关卡ID判断难度
  if (levelId.includes('boss') || levelId.includes('final')) {
    return 'boss_defeat';
  }
  
  if (levelId.includes('hard') || levelId.includes('challenge')) {
    return 'level_hard';
  }
  
  if (levelId.includes('medium') || levelId.includes('intermediate')) {
    return 'level_medium';
  }
  
  return 'level_easy';
}

/**
 * 根据代码质量判断奖励类型
 */
export function getCodeQualityRewardType(score: number): RewardType | null {
  if (score >= 90) return 'code_quality_a';
  if (score >= 75) return 'code_quality_b';
  if (score >= 60) return 'code_quality_c';
  return null;
}

/**
 * 发放食物奖励
 */
export async function grantFoodReward(rewardType: RewardType): Promise<boolean> {
  try {
    const { token } = useAuthStore.getState();
    if (!token) {
      debugLog('No token, skipping food reward');
      return false;
    }
    
    const { grantReward } = useFoodStore.getState();
    
    debugLog('Granting food reward:', rewardType);
    const rewards = await grantReward(rewardType, token);
    
    if (rewards && rewards.length > 0) {
      debugLog('Food rewards granted:', rewards);
      
      // 显示Toast通知
      showFoodRewardToast(rewards);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[FoodReward] Failed to grant reward:', error);
    return false;
  }
}

/**
 * 显示食物奖励Toast通知
 */
function showFoodRewardToast(rewards: Array<{ food_name: string; food_icon: string; quantity: number }>) {
  if (typeof window === 'undefined') return;
  
  // 构建奖励消息
  const message = rewards
    .map(r => `${r.food_icon} ${r.food_name} x${r.quantity}`)
    .join(', ');
  
  // 触发自定义事件显示Toast
  const event = new CustomEvent('show-food-reward', {
    detail: {
      message: `🎉 获得食物：${message}`,
      rewards
    }
  });
  
  window.dispatchEvent(event);
}

/**
 * 关卡完成时的食物奖励
 */
export async function onLevelComplete(levelId: string, score: number, code: string): Promise<void> {
  debugLog('Level completed:', levelId, 'Score:', score);
  
  // 1. 根据关卡难度发放基础奖励
  const levelReward = getLevelRewardType(levelId, score);
  await grantFoodReward(levelReward);
  
  // 2. 根据代码质量发放额外奖励
  const qualityReward = getCodeQualityRewardType(score);
  if (qualityReward) {
    await grantFoodReward(qualityReward);
  }
}

/**
 * PvP完成时的食物奖励
 */
export async function onPvPComplete(isWin: boolean): Promise<void> {
  debugLog('PvP completed:', isWin ? 'Win' : 'Loss');
  
  const rewardType = isWin ? 'pvp_win' : 'pvp_loss';
  await grantFoodReward(rewardType);
}

/**
 * 创意工坊发布时的食物奖励
 */
export async function onWorkshopPublish(): Promise<void> {
  debugLog('Workshop published');
  await grantFoodReward('workshop_publish');
}

/**
 * 创意工坊作品被玩时的食物奖励
 */
export async function onWorkshopPlay(): Promise<void> {
  debugLog('Workshop played');
  await grantFoodReward('workshop_play');
}

/**
 * 创意工坊作品被点赞时的食物奖励
 */
export async function onWorkshopLike(): Promise<void> {
  debugLog('Workshop liked');
  await grantFoodReward('workshop_like');
}

/**
 * 每日登录时的食物奖励
 */
export async function onDailyLogin(): Promise<void> {
  debugLog('Daily login');
  await grantFoodReward('daily_login');
}

/**
 * 每日任务完成时的食物奖励
 */
export async function onDailyQuestComplete(): Promise<void> {
  debugLog('Daily quest completed');
  await grantFoodReward('daily_quest');
}

/**
 * 排行榜奖励
 */
export async function onLeaderboardRank(rank: number): Promise<void> {
  debugLog('Leaderboard rank:', rank);
  
  if (rank === 1) {
    await grantFoodReward('leaderboard_top1');
  } else if (rank <= 3) {
    await grantFoodReward('leaderboard_top3');
  } else if (rank <= 10) {
    await grantFoodReward('leaderboard_top10');
  }
}
