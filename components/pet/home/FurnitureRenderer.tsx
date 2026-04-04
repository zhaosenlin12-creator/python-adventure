'use client';

import { memo, useMemo } from 'react';
import { DECORATIONS } from '@/types/decoration';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

interface FurnitureRendererProps {
  decorationId: string;
  name: string;
  isSelected?: boolean;
  size?: number; // 外部覆盖尺寸（px）
  scene?: 'living' | 'garden';
}

/**
 * 🛋️ 家具渲染器
 * 使用装饰品SVG资源渲染，保证与商店展示一致
 */
const FurnitureRenderer = memo(({ decorationId, name, isSelected, size, scene = 'living' }: FurnitureRendererProps) => {
  const decoration = DECORATIONS[decorationId];
  const defaultByType: Record<string, number> = {
    furniture: 180,
    plant: 140,
    toy: 110,
    nature: 150,
    fun: 160,
    decor: 170,
    wallpaper: 220,
    floor: 220,
  };
  const resolvedSize = useMemo(() => {
    if (size) return size;
    if (!decoration) return 120;
    const sceneSize = decoration.sceneSizes?.[scene];
    if (sceneSize) return sceneSize;
    if (decoration.baseSize) return decoration.baseSize;
    return defaultByType[decoration.type] ?? 120;
  }, [size, decoration, scene]);
  const shadowWidth = Math.max(40, Math.round(resolvedSize * 0.7));
  const shadowHeight = Math.max(6, Math.round(resolvedSize * 0.12));
  const isPlantLike = decoration?.type === 'plant' || decoration?.type === 'nature';
  const baseGlow =
    decoration?.type === 'plant'
      ? 'radial-gradient(circle, rgba(74,222,128,0.18) 0%, rgba(34,197,94,0.08) 48%, transparent 78%)'
      : decoration?.type === 'nature'
        ? 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, rgba(74,222,128,0.08) 48%, transparent 80%)'
        : decoration?.type === 'furniture'
          ? 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, rgba(245,158,11,0.06) 48%, transparent 80%)'
          : 'radial-gradient(circle, rgba(148,163,184,0.16) 0%, rgba(71,85,105,0.06) 52%, transparent 82%)';
  const pedestalWidth = Math.max(54, Math.round(resolvedSize * (isPlantLike ? 0.54 : 0.64)));
  const pedestalHeight = Math.max(8, Math.round(resolvedSize * (isPlantLike ? 0.12 : 0.09)));
  const ambientFrameClass = isSelected
    ? 'scale-105 drop-shadow-[0_0_14px_rgba(255,215,0,0.5)]'
    : 'drop-shadow-[0_16px_20px_rgba(15,23,42,0.18)]';

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ${ambientFrameClass}`}
      aria-label={name}
    >
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] rounded-full blur-2xl"
        style={{
          width: Math.round(resolvedSize * 0.94),
          height: Math.round(resolvedSize * 0.78),
          background: baseGlow,
          opacity: isSelected ? 1 : 0.8,
        }}
      />
      <span
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/30 blur-[2px]"
        style={{ width: shadowWidth, height: shadowHeight }}
      />
      <span
        className="absolute left-1/2 top-[72%] -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-[1px]"
        style={{
          width: pedestalWidth,
          height: pedestalHeight,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 20px rgba(15,23,42,0.14)',
        }}
      />
      <DecorationIcon
        decorationId={decorationId}
        size={resolvedSize}
        className="relative z-[2] select-none"
      />
    </div>
  );
});

FurnitureRenderer.displayName = 'FurnitureRenderer';
export default FurnitureRenderer;
