'use client';

import { memo } from 'react';
import Image from 'next/image';

/**
 * 🍖 食物图标类型
 */
export type FoodIconType = 'basic' | 'snack' | 'premium' | 'special';

/**
 * 🍖 食物图标映射
 * 根据食物类型返回对应的SVG图标路径
 */
const FOOD_ICON_MAP: Record<FoodIconType, string> = {
  basic: '/icons/food/basic-food.svg',
  snack: '/icons/food/snack.svg',
  premium: '/icons/food/premium-food.svg',
  special: '/icons/food/special-food.svg',
};

// 每种食物对应的专属图标（用于消除重复）
const FOOD_ITEM_ICON_MAP: Record<string, string> = {
  apple: '/icons/food/items/apple.svg',
  bread: '/icons/food/items/bread.svg',
  fish: '/icons/food/items/fish.svg',
  meat: '/icons/food/items/meat.svg',
  milk: '/icons/food/items/milk.svg',
  bone: '/icons/food/items/bone.svg',
  cake: '/icons/food/items/cake.svg',
  star_cookie: '/icons/food/items/star_cookie.svg',
  energy_drink: '/icons/food/items/energy_drink.svg',
  rainbow_candy: '/icons/food/items/rainbow_candy.svg',
  mystery_box: '/icons/food/items/mystery_box.svg'
};

/**
 * 🍖 食物图标emoji fallback
 * 当SVG加载失败时使用
 */
const FOOD_EMOJI_FALLBACK: Record<FoodIconType, string> = {
  basic: '🍞',
  snack: '🍪',
  premium: '🎂',
  special: '🧪',
};

interface FoodIconProps {
  /** 食物类型 */
  type?: FoodIconType;
  /** 食物ID（优先使用专属图标） */
  foodId?: string;
  /** 图标大小 (px) */
  size?: number;
  /** 自定义类名 */
  className?: string;
  /** 是否显示为emoji (fallback模式) */
  useEmoji?: boolean;
  /** 指定emoji回退 */
  fallbackEmoji?: string;
}

/**
 * 🍖 食物图标组件
 * 
 * 根据食物类型显示对应的SVG图标
 * 支持自定义大小和样式
 * 加载失败时自动降级到emoji
 * 
 * @example
 * ```tsx
 * <FoodIcon type="basic" size={32} />
 * <FoodIcon foodId="apple" size={48} />
 * ```
 */
export const FoodIcon = memo(({ 
  type = 'basic',
  foodId,
  size = 32, 
  className = '',
  useEmoji = false,
  fallbackEmoji
}: FoodIconProps) => {
  // 如果强制使用emoji
  if (useEmoji) {
    return (
      <span 
        className={`inline-block ${className}`}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
      >
        {fallbackEmoji || FOOD_EMOJI_FALLBACK[type] || '🍽️'}
      </span>
    );
  }

  const iconPath = (foodId && FOOD_ITEM_ICON_MAP[foodId]) || FOOD_ICON_MAP[type];

  return (
    <Image
      src={iconPath}
      alt={`${foodId || type} food`}
      width={size}
      height={size}
      className={className}
      onError={(e) => {
        // 加载失败时替换为emoji
        const target = e.target as HTMLImageElement;
        const parent = target.parentElement;
        if (parent) {
          parent.innerHTML = `<span style="font-size: ${size}px; line-height: 1;">${fallbackEmoji || FOOD_EMOJI_FALLBACK[type] || '🍽️'}</span>`;
        }
      }}
    />
  );
});

FoodIcon.displayName = 'FoodIcon';

/**
 * 🍖 根据食物名称或稀有度推断图标类型
 * 
 * 这个辅助函数帮助从食物数据中推断应该使用哪个图标
 */
export function inferFoodIconType(foodName: string, rarity?: string): FoodIconType {
  const nameLower = foodName.toLowerCase();
  
  // 根据名称推断
  if (nameLower.includes('面包') || nameLower.includes('bread')) {
    return 'basic';
  }
  if (nameLower.includes('饼干') || nameLower.includes('cookie') || nameLower.includes('零食')) {
    return 'snack';
  }
  if (nameLower.includes('蛋糕') || nameLower.includes('cake')) {
    return 'premium';
  }
  if (nameLower.includes('药水') || nameLower.includes('potion') || nameLower.includes('魔法')) {
    return 'special';
  }
  
  // 根据稀有度推断
  if (rarity) {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower === 'common') return 'basic';
    if (rarityLower === 'uncommon') return 'snack';
    if (rarityLower === 'rare') return 'premium';
    if (rarityLower === 'epic' || rarityLower === 'legendary') return 'special';
  }
  
  // 默认返回基础食物
  return 'basic';
}
