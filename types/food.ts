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
  common: 'text-[#7f8d86]',
  rare: 'text-[#5b94b0]',
  epic: 'text-[#9b74b4]',
  legendary: 'text-[#c38b3d]'
};

// 食物稀有度背景色
export const RARITY_BG_COLORS: Record<FoodRarity, string> = {
  common: 'bg-[#f3eee5]',
  rare: 'bg-[#e9f3f8]',
  epic: 'bg-[#f6edf9]',
  legendary: 'bg-[#fff4d8]'
};

// 食物稀有度边框色
export const RARITY_BORDER_COLORS: Record<FoodRarity, string> = {
  common: 'border-[#d8cec0]',
  rare: 'border-[#b8d3e0]',
  epic: 'border-[#dec9e8]',
  legendary: 'border-[#e4c987]'
};

// 食物稀有度文本
export const RARITY_TEXT: Record<FoodRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};
