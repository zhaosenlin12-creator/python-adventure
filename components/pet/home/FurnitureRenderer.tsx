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

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-200 ${
        isSelected ? 'scale-105 drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]' : 'drop-shadow-lg'
      }`}
      aria-label={name}
    >
      <span
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/30 blur-[2px] rounded-full"
        style={{ width: shadowWidth, height: shadowHeight }}
      />
      <DecorationIcon
        decorationId={decorationId}
        size={resolvedSize}
        className="select-none"
      />
    </div>
  );
});

FurnitureRenderer.displayName = 'FurnitureRenderer';
export default FurnitureRenderer;
