'use client';

import { memo, useState } from 'react';
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
  basic: '/assets/pet-home/food/apple.png',
  snack: '/assets/pet-home/food/star_cookie.png',
  premium: '/assets/pet-home/food/cake.png',
  special: '/assets/pet-home/food/energy_drink.png',
};

// 每种食物对应的专属图标（用于消除重复）
const FOOD_ITEM_ICON_MAP: Record<string, string> = {
  apple: '/assets/pet-home/food/apple.png',
  bread: '/assets/pet-home/food/bread.png',
  fish: '/assets/pet-home/food/fish.png',
  meat: '/assets/pet-home/food/meat.png',
  milk: '/assets/pet-home/food/milk.png',
  bone: '/assets/pet-home/food/bone.png',
  cake: '/assets/pet-home/food/cake.png',
  star_cookie: '/assets/pet-home/food/star_cookie.png',
  energy_drink: '/assets/pet-home/food/energy_drink.png',
  rainbow_candy: '/assets/pet-home/food/rainbow_candy.png',
  mystery_box: '/assets/pet-home/food/mystery_box.png'
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
  const [hasLoadError, setHasLoadError] = useState(false);

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

  if (hasLoadError) {
    return (
      <span
        className={`inline-block ${className}`}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        role="img"
        aria-label={`${foodId || type} food`}
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
        e.currentTarget.style.display = 'none';
        setHasLoadError(true);
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
