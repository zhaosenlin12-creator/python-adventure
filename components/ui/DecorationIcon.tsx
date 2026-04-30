'use client';

import Image from 'next/image';
import { memo, useEffect, useState } from 'react';

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

const DECORATION_ICON_MAP: Record<string, string> = {
  sofa_red: '/icons/decorations/furniture-sofa.svg',
  table_wood: '/icons/decorations/furniture-table.svg',
  bookshelf: '/icons/decorations/furniture-bookshelf.svg',
  lamp_floor: '/icons/decorations/furniture-lamp.svg',
  rug_round: '/icons/decorations/furniture-rug.svg',
  clock_wall: '/icons/decorations/furniture-clock.svg',
  bed_cozy: '/icons/decorations/furniture-bed.svg',
  tv_retro: '/icons/decorations/fun-tv.svg',
  picture_frame: '/icons/decorations/decor-frame.svg',
  fairy_lights: '/icons/decorations/decor-fairylights.svg',
  plant_small: '/icons/decorations/plant-small.svg',
  plant_flower: '/icons/decorations/plant-flower.svg',
  plant_tree: '/icons/decorations/plant-tree.svg',
  cactus: '/icons/decorations/nature-cactus.svg',
  flower_vase: '/icons/decorations/nature-vase.svg',
  fish_tank: '/icons/decorations/nature-fishtank.svg',
  toy_ball: '/icons/decorations/toy-ball.svg',
  toy_robot: '/icons/decorations/toy-robot.svg',
  toy_teddy: '/icons/decorations/toy-teddy.svg',
  cat_tower: '/icons/decorations/fun-cattower.svg',
  music_box: '/icons/decorations/fun-musicbox.svg',
};

const DECORATION_FALLBACK_LABEL: Record<string, string> = {
  sofa_red: '沙发',
  table_wood: '木桌',
  bookshelf: '书架',
  lamp_floor: '落灯',
  rug_round: '地毯',
  clock_wall: '挂钟',
  bed_cozy: '小床',
  tv_retro: '电视',
  picture_frame: '画框',
  fairy_lights: '灯串',
  plant_small: '绿植',
  plant_flower: '花盆',
  plant_tree: '树苗',
  cactus: '仙人掌',
  flower_vase: '花瓶',
  fish_tank: '鱼缸',
  toy_ball: '玩球',
  toy_robot: '机器人',
  toy_teddy: '抱偶',
  cat_tower: '猫架',
  music_box: '音乐盒',
};

interface DecorationIconProps {
  decorationId: string;
  size?: number;
  className?: string;
  useEmoji?: boolean;
}

function EmojiFallback({
  decorationId,
  size,
  className,
}: {
  decorationId: string;
  size: number;
  className: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[28%] border border-white/18 bg-[linear-gradient(145deg,rgba(226,232,240,0.88),rgba(148,163,184,0.52),rgba(51,65,85,0.36))] text-center font-black text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] ${className}`}
      data-decoration-id={decorationId}
      data-decoration-render="vector-fallback"
      style={{
        fontSize: `${Math.max(10, size * 0.16)}px`,
        lineHeight: 1.15,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <span className="absolute left-[18%] top-[14%] h-[28%] w-[44%] rounded-full bg-white/45 blur-sm" />
      <span className="absolute inset-[18%] rounded-[24%] border border-slate-700/10" />
      <span className="relative max-w-[70%]">{DECORATION_FALLBACK_LABEL[decorationId] || '装饰'}</span>
    </span>
  );
}

export const DecorationIcon = memo(function DecorationIcon({
  decorationId,
  size = 48,
  className = '',
  useEmoji = false,
}: DecorationIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [decorationId]);

  const iconPath = DECORATION_ICON_MAP[decorationId];
  if (useEmoji || hasError || !iconPath) {
    return <EmojiFallback decorationId={decorationId} size={size} className={className} />;
  }

  return (
    <Image
      src={iconPath}
      alt={`${decorationId} decoration`}
      width={size}
      height={size}
      data-decoration-id={decorationId}
      data-decoration-render="image"
      className={`object-contain ${className}`}
      style={{
        filter:
          'drop-shadow(0 12px 14px rgba(15,23,42,0.18)) saturate(0.98) contrast(1.02)',
      }}
      draggable={false}
      onError={() => {
        setHasError(true);
      }}
    />
  );
});

export function getDecorationIconPath(decorationId: string): string | null {
  return DECORATION_ICON_MAP[decorationId] || null;
}

export function getDecorationEmoji(decorationId: string): string {
  return DECORATION_FALLBACK_LABEL[decorationId] || '装饰';
}
