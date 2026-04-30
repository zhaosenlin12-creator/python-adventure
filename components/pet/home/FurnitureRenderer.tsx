'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DECORATIONS,
  type DecorationRenderHints,
  getDecorationDisplaySize,
} from '@/types/decoration';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

interface FurnitureRendererProps {
  decorationId: string;
  name: string;
  isSelected?: boolean;
  size?: number; // 外部覆盖尺寸（px）
  scene?: 'living' | 'garden';
}

const DEFAULT_RENDER_HINTS_BY_TYPE: Record<string, DecorationRenderHints> = {
  furniture: { tone: 'amber', motion: 'bob', surface: 'wood', backplate: 'none', shadow: 'grounded', iconScale: 1.04 },
  plant: { tone: 'emerald', motion: 'sway', surface: 'planter', accent: 'petals', shadow: 'grounded', iconScale: 1.08 },
  toy: { tone: 'rose', motion: 'float', surface: 'cushion', accent: 'sparkles', shadow: 'soft', iconScale: 1.08 },
  nature: { tone: 'sky', motion: 'pulse', surface: 'wood', accent: 'bubbles', backplate: 'none', shadow: 'grounded', iconScale: 1.06 },
  fun: { tone: 'violet', motion: 'pulse', surface: 'wood', accent: 'sparkles', backplate: 'none', shadow: 'grounded', iconScale: 1.06 },
  decor: { tone: 'amber', motion: 'twinkle', backplate: 'gallery', shadow: 'soft', iconScale: 1.04 },
  wallpaper: { tone: 'sky', motion: 'none', backplate: 'gallery', shadow: 'soft' },
  floor: { tone: 'amber', motion: 'none', surface: 'cushion', shadow: 'wide', iconScale: 1.16 },
};

const TONE_STYLES = {
  amber: {
    halo: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.08) 48%, transparent 82%)',
    backplate: 'linear-gradient(180deg, rgba(255,248,220,0.24) 0%, rgba(146,98,57,0.12) 100%)',
    accent: 'rgba(255,236,179,0.82)',
    sheen: 'rgba(255,249,220,0.28)',
  },
  rose: {
    halo: 'radial-gradient(circle, rgba(251,113,133,0.18) 0%, rgba(244,114,182,0.08) 48%, transparent 82%)',
    backplate: 'linear-gradient(180deg, rgba(255,240,245,0.22) 0%, rgba(190,93,133,0.1) 100%)',
    accent: 'rgba(255,228,239,0.8)',
    sheen: 'rgba(255,244,248,0.3)',
  },
  sky: {
    halo: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(125,211,252,0.08) 48%, transparent 82%)',
    backplate: 'linear-gradient(180deg, rgba(240,249,255,0.22) 0%, rgba(56,189,248,0.09) 100%)',
    accent: 'rgba(224,242,254,0.84)',
    sheen: 'rgba(240,249,255,0.32)',
  },
  emerald: {
    halo: 'radial-gradient(circle, rgba(74,222,128,0.18) 0%, rgba(34,197,94,0.08) 48%, transparent 82%)',
    backplate: 'linear-gradient(180deg, rgba(236,253,245,0.22) 0%, rgba(52,211,153,0.09) 100%)',
    accent: 'rgba(220,252,231,0.84)',
    sheen: 'rgba(236,253,245,0.3)',
  },
  violet: {
    halo: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, rgba(196,181,253,0.08) 48%, transparent 82%)',
    backplate: 'linear-gradient(180deg, rgba(245,243,255,0.22) 0%, rgba(167,139,250,0.09) 100%)',
    accent: 'rgba(243,232,255,0.82)',
    sheen: 'rgba(250,245,255,0.32)',
  },
} as const;

const ACCENT_POINTS = [
  { left: '14%', top: '18%' },
  { left: '76%', top: '26%' },
  { left: '28%', top: '72%' },
];

function getIdleAnimation(motionStyle: DecorationRenderHints['motion']) {
  switch (motionStyle) {
    case 'float':
      return { y: [0, -5, 0], rotate: [0, 1.4, 0], scale: [1, 1.018, 1] };
    case 'sway':
      return { y: [0, -2, 0], rotate: [-1.4, 1.4, -1.4] };
    case 'pulse':
      return { scale: [1, 1.026, 1], opacity: [0.98, 1, 0.98] };
    case 'twinkle':
      return { scale: [0.99, 1.04, 0.99], opacity: [0.94, 1, 0.94], y: [0, -2, 0] };
    case 'bob':
      return { y: [0, -3.5, 0], scale: [1, 1.012, 1] };
    default:
      return undefined;
  }
}

function getIdleTransition(motionStyle: DecorationRenderHints['motion']) {
  switch (motionStyle) {
    case 'sway':
      return { duration: 4.4, repeat: Infinity, ease: 'easeInOut' as const };
    case 'pulse':
      return { duration: 3.8, repeat: Infinity, ease: 'easeInOut' as const };
    case 'twinkle':
      return { duration: 2.9, repeat: Infinity, ease: 'easeInOut' as const };
    case 'bob':
      return { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const };
    case 'float':
      return { duration: 4.8, repeat: Infinity, ease: 'easeInOut' as const };
    default:
      return undefined;
  }
}

/**
 * 🛋️ 家具渲染器
 * 使用装饰品SVG资源渲染，保证与商店展示一致
 */
const FurnitureRenderer = memo(({ decorationId, name, isSelected, size, scene = 'living' }: FurnitureRendererProps) => {
  const decoration = DECORATIONS[decorationId];
  const resolvedSize = useMemo(() => {
    return getDecorationDisplaySize(decoration, scene, size);
  }, [size, decoration, scene]);
  const hints = decoration
    ? { ...DEFAULT_RENDER_HINTS_BY_TYPE[decoration.type], ...decoration.renderHints }
    : DEFAULT_RENDER_HINTS_BY_TYPE.furniture;
  const isWallMounted = decoration?.anchor === 'wall';
  const isPlantLike = decoration?.type === 'plant' || decoration?.type === 'nature';
  const isRugLike = decorationId === 'rug_round' || decoration?.type === 'floor';
  const toneKey = hints.tone ?? 'amber';
  const tone = TONE_STYLES[toneKey];
  const shadowProfile = hints.shadow ?? (isRugLike ? 'wide' : isWallMounted ? 'soft' : 'grounded');
  const shadowProfileConfig =
    shadowProfile === 'soft'
      ? {
          widthMultiplier: isWallMounted ? 0.46 : 0.58,
          heightMultiplier: isWallMounted ? 0.06 : 0.08,
          opacity: 0.28,
          blurPx: 3,
        }
      : shadowProfile === 'wide'
        ? {
            widthMultiplier: 0.94,
            heightMultiplier: 0.1,
            opacity: 0.34,
            blurPx: 4,
          }
        : {
            widthMultiplier: isWallMounted ? 0.5 : isPlantLike ? 0.62 : 0.7,
            heightMultiplier: isWallMounted ? 0.08 : 0.12,
            opacity: 0.38,
            blurPx: 2,
          };
  const shadowWidth = isRugLike
    ? Math.max(78, Math.round(resolvedSize * 0.92))
    : isWallMounted
      ? Math.max(30, Math.round(resolvedSize * shadowProfileConfig.widthMultiplier))
      : Math.max(42, Math.round(resolvedSize * shadowProfileConfig.widthMultiplier));
  const shadowHeight = isRugLike
    ? Math.max(10, Math.round(resolvedSize * 0.08))
    : Math.max(6, Math.round(resolvedSize * shadowProfileConfig.heightMultiplier));
  const baseGlow = isRugLike
    ? 'radial-gradient(ellipse at 50% 70%, rgba(248,250,252,0.1) 0%, rgba(148,163,184,0.04) 52%, transparent 82%)'
    : tone.halo;
  const ambientFrameClass = isSelected
    ? 'scale-[1.03] drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
    : isWallMounted
      ? 'drop-shadow-[0_10px_14px_rgba(15,23,42,0.12)]'
      : 'drop-shadow-[0_12px_16px_rgba(15,23,42,0.14)]';
  const idleAnimation = getIdleAnimation(hints.motion);
  const idleTransition = getIdleTransition(hints.motion);
  const iconScale = hints.iconScale ?? 1;
  const iconOffsetX = hints.iconOffsetX ?? 0;
  const iconOffsetY = hints.iconOffsetY ?? (isWallMounted ? -2 : isRugLike ? 8 : 0);
  const backplateWidth = Math.round(resolvedSize * (isWallMounted ? 0.92 : 0.72));
  const backplateHeight = Math.round(resolvedSize * (isWallMounted ? 0.7 : 0.38));
  const surfaceWidth = Math.round(
    resolvedSize * (hints.surface === 'planter' ? 0.62 : hints.surface === 'cushion' ? 0.8 : 0.72)
  );
  const surfaceHeight = Math.max(16, Math.round(resolvedSize * (hints.surface === 'cushion' ? 0.18 : 0.14)));
  const sceneHaloBackground = scene === 'garden'
    ? 'radial-gradient(ellipse at center, rgba(110,231,183,0.18) 0%, rgba(34,197,94,0.08) 48%, transparent 82%)'
    : 'radial-gradient(ellipse at center, rgba(255,244,214,0.18) 0%, rgba(251,191,36,0.07) 48%, transparent 82%)';
  const sceneHaloWidth = Math.round(resolvedSize * (isRugLike ? 0.98 : 0.8));
  const sceneHaloHeight = Math.max(10, Math.round(resolvedSize * (isRugLike ? 0.18 : 0.14)));
  const renderSurface =
    !isWallMounted && hints.surface && hints.surface !== 'none' && !isRugLike;
  const renderGalleryBackplate =
    isWallMounted && hints.backplate && hints.backplate !== 'none';
  const renderSpecialGlow = isSelected && (hints.backplate === 'halo' || hints.backplate === 'bloom');
  const shouldRenderAccent = isSelected && hints.accent && hints.accent !== 'none';
  const shouldRenderIconSheen = isSelected || decorationId === 'fish_tank' || decorationId === 'tv_retro';

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ${ambientFrameClass}`}
      aria-label={name}
    >
      {(isSelected || isWallMounted) && (
        <span
          className={`absolute left-1/2 rounded-full blur-2xl ${
            isWallMounted ? 'top-[48%] -translate-y-1/2' : 'top-1/2 -translate-y-[42%]'
          } -translate-x-1/2`}
          style={{
            width: Math.round(resolvedSize * (isWallMounted ? 0.62 : isRugLike ? 0.82 : 0.68)),
            height: Math.round(resolvedSize * (isWallMounted ? 0.44 : isRugLike ? 0.28 : 0.5)),
            background: baseGlow,
            opacity: isSelected ? 0.32 : 0.14,
          }}
        />
      )}

      {!isWallMounted && isSelected && (
        <motion.span
          className="absolute left-1/2 top-[76%] -translate-x-1/2 rounded-full blur-xl"
          style={{
            width: sceneHaloWidth,
            height: sceneHaloHeight,
            background: sceneHaloBackground,
            opacity: 0.32,
          }}
          animate={{
            opacity: [0.16, 0.32, 0.16],
            scale: [0.96, 1.04, 0.96],
          }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {renderGalleryBackplate && (
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 ${
            hints.backplate === 'gallery' ? 'shadow-[0_16px_34px_rgba(15,23,42,0.12)]' : ''
          }`}
          style={{
            width: backplateWidth,
            height: backplateHeight,
            background: tone.backplate,
            boxShadow:
              hints.backplate === 'gallery'
                ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 22px rgba(15,23,42,0.12)'
                : 'inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          <span className="absolute inset-[10px] rounded-[22px] border border-white/8" />
        </span>
      )}

      {renderSurface && (
        <>
          <span
            className="absolute left-1/2 top-[74%] -translate-x-1/2 rounded-[999px]"
            style={{
              width: surfaceWidth,
              height: surfaceHeight,
              background:
                hints.surface === 'wood'
                  ? 'linear-gradient(180deg, rgba(150,93,45,0.9), rgba(73,45,23,0.96))'
                  : hints.surface === 'planter'
                    ? 'linear-gradient(180deg, rgba(112,86,57,0.92), rgba(60,42,25,0.98))'
                    : hints.surface === 'meadow'
                      ? 'radial-gradient(ellipse at center, rgba(74,222,128,0.14) 0%, rgba(21,128,61,0.1) 54%, transparent 100%)'
                      : hints.surface === 'spotlight'
                        ? 'radial-gradient(ellipse at center, rgba(255,248,220,0.22) 0%, rgba(255,228,155,0.1) 48%, transparent 100%)'
                        : 'linear-gradient(180deg, rgba(231,158,185,0.72), rgba(154,75,104,0.34))',
              boxShadow:
                hints.surface === 'wood'
                  ? '0 16px 22px rgba(35,20,9,0.18), inset 0 1px 0 rgba(255,236,210,0.24), inset 0 -5px 8px rgba(43,25,12,0.24)'
                  : '0 12px 18px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.16)',
            }}
          />
          <span
            className="absolute left-1/2 top-[71%] -translate-x-1/2 rounded-full blur-[1px]"
            style={{
              width: Math.max(24, Math.round(surfaceWidth * 0.74)),
              height: Math.max(4, Math.round(surfaceHeight * 0.22)),
              background: 'rgba(255,255,255,0.14)',
            }}
          />
          <span
            className="absolute left-1/2 top-[78%] -translate-x-1/2 rounded-full"
            style={{
              width: Math.max(28, Math.round(surfaceWidth * 0.82)),
              height: Math.max(8, Math.round(surfaceHeight * 0.5)),
              background: scene === 'garden'
                ? 'linear-gradient(180deg, rgba(30,64,35,0.18), rgba(12,38,20,0.02))'
                : 'linear-gradient(180deg, rgba(80,45,20,0.14), rgba(40,22,8,0.02))',
            }}
          />
        </>
      )}

      {isWallMounted ? (
        <span
          className="absolute left-1/2 top-[54%] -translate-x-1/2 rounded-full"
          style={{
            width: shadowWidth,
            height: shadowHeight,
            background: `radial-gradient(ellipse at center, rgba(2,6,23,${shadowProfileConfig.opacity}) 0%, rgba(2,6,23,${shadowProfileConfig.opacity * 0.45}) 58%, transparent 100%)`,
            filter: `blur(${shadowProfileConfig.blurPx}px)`,
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
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: shadowWidth,
              height: shadowHeight,
              background: `radial-gradient(ellipse at center, rgba(2,6,23,${shadowProfileConfig.opacity}) 0%, rgba(2,6,23,${shadowProfileConfig.opacity * 0.45}) 56%, transparent 100%)`,
              filter: `blur(${shadowProfileConfig.blurPx}px)`,
            }}
          />
          {!isRugLike && (
            <span
              className="absolute left-1/2 top-[76%] -translate-x-1/2 rounded-full"
              style={{
                width: Math.round(resolvedSize * (isPlantLike ? 0.42 : 0.5)),
                height: Math.max(5, Math.round(resolvedSize * 0.055)),
                background: scene === 'garden'
                  ? 'linear-gradient(180deg, rgba(187,247,208,0.12), rgba(255,255,255,0.02))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
              }}
            />
          )}
        </>
      )}

      {renderSpecialGlow && (
        <motion.span
          className="absolute left-1/2 top-1/2 rounded-full blur-2xl"
          style={{
            width: Math.round(resolvedSize * (isWallMounted ? 0.84 : 0.96)),
            height: Math.round(resolvedSize * (isWallMounted ? 0.42 : 0.58)),
            background:
              hints.backplate === 'bloom'
                ? 'radial-gradient(circle, rgba(255,228,240,0.28) 0%, rgba(244,114,182,0.12) 42%, transparent 82%)'
                : tone.halo,
          }}
          animate={{ opacity: isSelected ? [0.4, 0.9, 0.4] : [0.22, 0.5, 0.22], scale: [0.96, 1.04, 0.96], x: '-50%', y: '-50%' }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {shouldRenderAccent &&
        ACCENT_POINTS.map((point, index) => (
          <motion.span
            key={`${decorationId}-accent-${index}`}
            className="absolute rounded-full"
            style={{
              left: point.left,
              top: point.top,
              width:
                hints.accent === 'notes'
                  ? 10
                  : hints.accent === 'sparkles'
                    ? 7
                    : hints.accent === 'bubbles'
                      ? 8
                      : 6,
              height:
                hints.accent === 'notes'
                  ? 14
                  : hints.accent === 'petals'
                    ? 10
                    : hints.accent === 'fireflies'
                      ? 6
                      : 8,
              borderRadius: hints.accent === 'notes' ? '999px 999px 6px 6px' : '999px',
              background:
                hints.accent === 'sparkles'
                  ? tone.accent
                  : hints.accent === 'notes'
                    ? tone.accent
                    : hints.accent === 'bubbles'
                      ? 'rgba(224,242,254,0.3)'
                      : hints.accent === 'petals'
                        ? 'rgba(255,228,239,0.84)'
                        : 'rgba(254,240,138,0.8)',
              boxShadow:
                hints.accent === 'bubbles'
                  ? 'inset 0 1px 0 rgba(255,255,255,0.55), 0 0 10px rgba(125,211,252,0.18)'
                  : `0 0 12px ${tone.accent}`,
            }}
            animate={{
              y:
                hints.accent === 'bubbles'
                  ? [0, -18 - index * 4, -8]
                  : hints.accent === 'notes'
                    ? [0, -14, -6]
                    : [0, -8 - index * 2, 0],
              x:
                hints.accent === 'petals'
                  ? [0, index % 2 === 0 ? 6 : -6, 0]
                  : [0, index % 2 === 0 ? 4 : -4, 0],
              rotate: hints.accent === 'notes' ? [-10, 5, 12] : [0, index % 2 === 0 ? 8 : -8, 0],
              opacity: hints.accent === 'fireflies' ? [0.18, 0.9, 0.18] : [0.3, 0.78, 0.3],
              scale: [0.72, 1, 0.72],
            }}
            transition={{
              duration: hints.accent === 'bubbles' ? 3 + index * 0.4 : 2.6 + index * 0.25,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.24,
            }}
          />
        ))}

      {isSelected && decorationId === 'lamp_floor' && (
        <motion.span
          className="absolute left-1/2 top-[28%] rounded-full blur-xl"
          style={{
            width: Math.round(resolvedSize * 0.34),
            height: Math.round(resolvedSize * 0.5),
            background: 'linear-gradient(180deg, rgba(255,248,220,0.22) 0%, rgba(255,211,120,0.08) 52%, transparent 100%)',
          }}
          animate={{ opacity: [0.18, 0.34, 0.18], scaleY: [0.96, 1.03, 0.96], x: '-50%' }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {decorationId === 'fish_tank' && (
        <motion.span
          className="absolute left-1/2 top-[44%] rounded-full"
          style={{
            width: Math.round(resolvedSize * 0.64),
            height: Math.max(8, Math.round(resolvedSize * 0.06)),
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            filter: 'blur(1px)',
          }}
          animate={{ x: ['-50%', 'calc(-50% + 10px)', '-50%'], opacity: [0.18, 0.44, 0.18] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {decorationId === 'tv_retro' && (
        <motion.span
          className="absolute left-1/2 top-[46%] -translate-x-1/2 rounded-[10px]"
          style={{
            width: Math.round(resolvedSize * 0.42),
            height: Math.round(resolvedSize * 0.24),
            background: 'linear-gradient(180deg, rgba(191,219,254,0.22), rgba(56,189,248,0.08), transparent)',
            mixBlendMode: 'screen',
          }}
          animate={{ opacity: [0.12, 0.32, 0.12] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {decorationId === 'fairy_lights' && (
        <div className="pointer-events-none absolute left-1/2 top-[24%] z-[3] flex -translate-x-1/2 items-center gap-2">
          {['rgba(253,224,71,0.9)', 'rgba(251,113,133,0.82)', 'rgba(125,211,252,0.84)', 'rgba(167,139,250,0.84)'].map((bulb, index) => (
            <motion.span
              key={`${decorationId}-bulb-${index}`}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: bulb, boxShadow: `0 0 12px ${bulb}` }}
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.15, 0.8] }}
              transition={{ duration: 1.8 + index * 0.25, repeat: Infinity, ease: 'easeInOut', delay: index * 0.14 }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative z-[2]"
        animate={idleAnimation}
        transition={idleTransition}
      >
        {isSelected && (
          <span
            className="absolute left-1/2 top-[18%] -z-[1] -translate-x-1/2 rounded-full blur-lg"
            style={{
              width: Math.round(resolvedSize * 0.34),
              height: Math.round(resolvedSize * 0.14),
              background: `linear-gradient(180deg, ${tone.sheen}, transparent)`,
              opacity: isWallMounted ? 0.32 : 0.2,
            }}
          />
        )}
        {!isWallMounted && shouldRenderIconSheen && (
          <motion.span
            className="absolute left-1/2 top-[44%] z-[3] rounded-full"
            style={{
              width: Math.round(resolvedSize * 0.28),
              height: Math.max(6, Math.round(resolvedSize * 0.055)),
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)',
              filter: 'blur(1px)',
              opacity: isSelected ? 0.24 : 0.14,
            }}
            animate={{
              x: ['-50%', 'calc(-50% + 6px)', '-50%'],
              opacity: isSelected ? [0.16, 0.28, 0.16] : [0.08, 0.16, 0.08],
            }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div
          style={{
            transform: `translate(${iconOffsetX}px, ${iconOffsetY}px) scale(${iconScale})`,
            transformOrigin: 'center bottom',
          }}
        >
          <DecorationIcon
            decorationId={decorationId}
            size={resolvedSize}
            className={`relative select-none object-contain ${
              isWallMounted ? '-translate-y-[3%]' : isRugLike ? 'translate-y-[8%]' : ''
            }`}
          />
        </div>
      </motion.div>
    </div>
  );
});

FurnitureRenderer.displayName = 'FurnitureRenderer';
export default FurnitureRenderer;
