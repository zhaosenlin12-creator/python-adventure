'use client';

import { memo } from 'react';
import Image from 'next/image';

/**
 * 🏠 装饰品图标类型
 */
export type DecorationIconType = 
  | 'furniture-sofa'
  | 'furniture-table'
  | 'furniture-bookshelf'
  | 'plant-small'
  | 'plant-flower'
  | 'plant-tree'
  | 'toy-ball'
  | 'toy-robot'
  | 'toy-teddy'
  // 新增高清装饰品资源名
  | 'furniture-lamp'
  | 'furniture-rug'
  | 'furniture-clock'
  | 'furniture-bed'
  | 'nature-fishtank'
  | 'nature-cactus'
  | 'nature-vase'
  | 'fun-cattower'
  | 'fun-musicbox'
  | 'fun-tv'
  | 'decor-fairylights'
  | 'decor-frame';

/**
 * 🏠 装饰品图标映射
 * 根据装饰品ID返回对应的SVG图标路径
 */
const DECORATION_ICON_MAP: Record<string, string> = {
  // 家具类（含高清新资源）
  'sofa_red': '/icons/decorations/furniture-sofa.svg',
  'table_wood': '/icons/decorations/furniture-table.svg',
  'bookshelf': '/icons/decorations/furniture-bookshelf.svg',
  'lamp_floor': '/icons/decorations/furniture-lamp.svg',
  'rug_round': '/icons/decorations/furniture-rug.svg',
  'clock_wall': '/icons/decorations/furniture-clock.svg',
  'bed_cozy': '/icons/decorations/furniture-bed.svg',
  'tv_retro': '/icons/decorations/fun-tv.svg',
  'picture_frame': '/icons/decorations/decor-frame.svg',
  'fairy_lights': '/icons/decorations/decor-fairylights.svg',
  
  // 植物/自然类
  'plant_small': '/icons/decorations/plant-small.svg',
  'plant_flower': '/icons/decorations/plant-flower.svg',
  'plant_tree': '/icons/decorations/plant-tree.svg',
  'cactus': '/icons/decorations/nature-cactus.svg',
  'flower_vase': '/icons/decorations/nature-vase.svg',
  'fish_tank': '/icons/decorations/nature-fishtank.svg',
  
  // 玩具/趣味类
  'toy_ball': '/icons/decorations/toy-ball.svg',
  'toy_robot': '/icons/decorations/toy-robot.svg',
  'toy_teddy': '/icons/decorations/toy-teddy.svg',
  'cat_tower': '/icons/decorations/fun-cattower.svg',
  'music_box': '/icons/decorations/fun-musicbox.svg',
};

/**
 * 🏠 装饰品图标emoji fallback
 * 当SVG加载失败时使用
 */
const DECORATION_EMOJI_FALLBACK: Record<string, string> = {
  'sofa_red': '🛋️',
  'table_wood': '🪑',
  'bookshelf': '📚',
  'lamp_floor': '💡',
  'rug_round': '🧶',
  'clock_wall': '🕰️',
  'bed_cozy': '🛏️',
  'tv_retro': '📺',
  'picture_frame': '🖼️',
  'fairy_lights': '✨',
  
  'plant_small': '🌱',
  'plant_flower': '🌸',
  'plant_tree': '🌳',
  'cactus': '🌵',
  'flower_vase': '🌺',
  'fish_tank': '🐠',
  
  'toy_ball': '⚽',
  'toy_robot': '🤖',
  'toy_teddy': '🧸',
  'cat_tower': '🐱',
  'music_box': '🎵',
};

interface DecorationIconProps {
  /** 装饰品ID */
  decorationId: string;
  /** 图标大小 (px) */
  size?: number;
  /** 自定义类名 */
  className?: string;
  /** 是否显示为emoji (fallback模式) */
  useEmoji?: boolean;
}

/**
 * 🏠 装饰品图标组件
 * 
 * 根据装饰品ID显示对应的SVG图标
 * 支持自定义大小和样式
 * 加载失败时自动降级到emoji
 * 
 * @example
 * ```tsx
 * <DecorationIcon decorationId="sofa_red" size={48} />
 * <DecorationIcon decorationId="toy_robot" size={64} className="animate-bounce" />
 * ```
 */
export const DecorationIcon = memo(({ 
  decorationId, 
  size = 48, 
  className = '',
  useEmoji = false 
}: DecorationIconProps) => {
  // 如果强制使用emoji或者图标不存在
  if (useEmoji || !DECORATION_ICON_MAP[decorationId]) {
    return (
      <span 
        className={`inline-flex items-center justify-center ${className}`}
        style={{ 
          fontSize: `${size * 0.85}px`, 
          lineHeight: 1,
          width: `${size}px`,
          height: `${size}px`,
          filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))'
        }}
      >
        {DECORATION_EMOJI_FALLBACK[decorationId] || '🏠'}
      </span>
    );
  }

  const iconPath = DECORATION_ICON_MAP[decorationId];

  return (
    <Image
      src={iconPath}
      alt={`${decorationId} decoration`}
      width={size}
      height={size}
      className={`${className}`}
      style={{ filter: 'drop-shadow(2px 3px 3px rgba(0,0,0,0.3))' }}
      onError={(e) => {
        // 加载失败时替换为emoji
        const target = e.target as HTMLImageElement;
        const parent = target.parentElement;
        if (parent) {
          parent.innerHTML = `<span style="font-size: ${size * 0.85}px; line-height: 1; width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));">${DECORATION_EMOJI_FALLBACK[decorationId] || '🏠'}</span>`;
        }
      }}
    />
  );
});

DecorationIcon.displayName = 'DecorationIcon';

/**
 * 🏠 获取装饰品图标路径
 * 用于在PetHomeScene中直接使用图标路径
 */
export function getDecorationIconPath(decorationId: string): string | null {
  return DECORATION_ICON_MAP[decorationId] || null;
}

/**
 * 🏠 获取装饰品emoji
 * 用于fallback场景
 */
export function getDecorationEmoji(decorationId: string): string {
  return DECORATION_EMOJI_FALLBACK[decorationId] || '🏠';
}
