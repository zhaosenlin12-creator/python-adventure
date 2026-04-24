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
  const isWallMounted = decoration?.anchor === 'wall';
  const isPlantLike = decoration?.type === 'plant' || decoration?.type === 'nature';
  const isRugLike = decorationId === 'rug_round' || decoration?.type === 'floor';
  const shadowWidth = isRugLike
    ? Math.max(78, Math.round(resolvedSize * 0.92))
    : isWallMounted
      ? Math.max(30, Math.round(resolvedSize * 0.5))
      : Math.max(42, Math.round(resolvedSize * (isPlantLike ? 0.58 : 0.68)));
  const shadowHeight = isRugLike
    ? Math.max(10, Math.round(resolvedSize * 0.08))
    : Math.max(6, Math.round(resolvedSize * (isWallMounted ? 0.08 : 0.12)));
  const baseGlow =
    isWallMounted
      ? 'radial-gradient(ellipse at 50% 50%, rgba(148,163,184,0.12) 0%, rgba(51,65,85,0.04) 54%, transparent 78%)'
      : isRugLike
        ? 'radial-gradient(ellipse at 50% 70%, rgba(248,250,252,0.08) 0%, rgba(148,163,184,0.04) 52%, transparent 82%)'
        : decoration?.type === 'plant'
          ? 'radial-gradient(circle, rgba(74,222,128,0.14) 0%, rgba(34,197,94,0.05) 50%, transparent 78%)'
          : decoration?.type === 'nature'
            ? 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(74,222,128,0.05) 48%, transparent 80%)'
            : decoration?.type === 'furniture'
              ? 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.04) 48%, transparent 80%)'
              : 'radial-gradient(circle, rgba(148,163,184,0.12) 0%, rgba(71,85,105,0.05) 52%, transparent 82%)';
  const ambientFrameClass = isSelected
    ? 'scale-[1.03] drop-shadow-[0_0_12px_rgba(125,211,252,0.28)]'
    : isWallMounted
      ? 'drop-shadow-[0_12px_18px_rgba(15,23,42,0.16)]'
      : 'drop-shadow-[0_18px_24px_rgba(15,23,42,0.18)]';

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ${ambientFrameClass}`}
      aria-label={name}
    >
      <span
        className={`absolute left-1/2 rounded-full blur-2xl ${
          isWallMounted ? 'top-[48%] -translate-y-1/2' : 'top-1/2 -translate-y-[42%]'
        } -translate-x-1/2`}
        style={{
          width: Math.round(resolvedSize * (isWallMounted ? 0.72 : isRugLike ? 0.98 : 0.9)),
          height: Math.round(resolvedSize * (isWallMounted ? 0.54 : isRugLike ? 0.42 : 0.72)),
          background: baseGlow,
          opacity: isSelected ? 0.95 : 0.62,
        }}
      />

      {isWallMounted ? (
        <span
          className="absolute left-1/2 top-[54%] -translate-x-1/2 rounded-full bg-black/16 blur-md"
          style={{
            width: shadowWidth,
            height: shadowHeight,
          }}
        />
      ) : (
        <>
          {isRugLike && (
            <span
              className="absolute left-1/2 top-[70%] -translate-x-1/2 rounded-full border border-white/6"
              style={{
                width: Math.round(resolvedSize * 0.84),
                height: Math.max(12, Math.round(resolvedSize * 0.16)),
                background:
                  'radial-gradient(ellipse at center, rgba(248,250,252,0.12) 0%, rgba(15,23,42,0.02) 58%, transparent 100%)',
              }}
            />
          )}
          <span
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/30 blur-[2px]"
            style={{ width: shadowWidth, height: shadowHeight }}
          />
          {!isRugLike && (
            <span
              className="absolute left-1/2 top-[76%] -translate-x-1/2 rounded-full"
              style={{
                width: Math.round(resolvedSize * (isPlantLike ? 0.42 : 0.5)),
                height: Math.max(5, Math.round(resolvedSize * 0.055)),
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
              }}
            />
          )}
        </>
      )}

      <DecorationIcon
        decorationId={decorationId}
        size={resolvedSize}
        className={`relative z-[2] select-none ${
          isWallMounted ? '-translate-y-[3%]' : isRugLike ? 'translate-y-[8%]' : ''
        }`}
      />
    </div>
  );
});

FurnitureRenderer.displayName = 'FurnitureRenderer';
export default FurnitureRenderer;
