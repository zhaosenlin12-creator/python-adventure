/**
 * 🍖 食物系统类型定义
 */

export type FoodRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface FoodEffects {
  hunger?: number;        // 饱食度
  happiness?: number;     // 快乐值
  intelligence?: number;  // 智力
  creativity?: number;    // 创造力
  persistence?: number;   // 毅力
}

export interface FoodType {
  id: string;
  name: string;
  icon: string;
  rarity: FoodRarity;
  price: number;  // 金币价格
  effects: FoodEffects;
  description: string;
}

export interface FoodInventoryItem {
  food_id: string;
  food_type: FoodType;
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface FoodReward {
  food_id: string;
  food_name: string;
  food_icon: string;
  quantity: number;
}

// 食物稀有度颜色
export const RARITY_COLORS: Record<FoodRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

// 食物稀有度背景色
export const RARITY_BG_COLORS: Record<FoodRarity, string> = {
  common: 'bg-gray-700',
  rare: 'bg-blue-900',
  epic: 'bg-purple-900',
  legendary: 'bg-yellow-900'
};

// 食物稀有度边框色
export const RARITY_BORDER_COLORS: Record<FoodRarity, string> = {
  common: 'border-gray-600',
  rare: 'border-blue-600',
  epic: 'border-purple-600',
  legendary: 'border-yellow-600'
};

// 食物稀有度文本
export const RARITY_TEXT: Record<FoodRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};
