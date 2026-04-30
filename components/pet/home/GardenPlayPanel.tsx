'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { FARM_PLOTS } from '@/components/pet/home/FarmGrid';

type CropId = 'carrot' | 'strawberry' | 'pumpkin' | 'sunflower';

type PlotStage = 'empty' | 'seed' | 'sprout' | 'bloom' | 'ready' | 'thirsty' | 'wilted';

interface GardenPlotState {
  cropId: CropId | null;
  plantedAt: number | null;
  wateredAt: number | null;
  careCount: number;
}

interface GardenSaveState {
  plots: GardenPlotState[];
  harvestLedger: Partial<Record<CropId, number>>;
  lastPatrolAt: number | null;
}

interface PlotView {
  stage: PlotStage;
  progress: number;
  remainingMs: number;
  cropId: CropId | null;
  crop: (typeof CROPS)[CropId] | null;
  actionLabel: string;
  subtitle: string;
  needsWater: boolean;
}

interface GardenPlayPanelProps {
  userId?: string | number | null;
  currentPetName: string;
  companionCount: number;
  visible: boolean;
  compact?: boolean;
}

const STORAGE_KEY_PREFIX = 'pet-home-garden-v2';
const MAX_PLOTS = FARM_PLOTS.length;
const PATROL_COOLDOWN_MS = 90 * 1000;

const CROPS = {
  carrot: {
    label: '胡萝卜',
    accent: '#fb923c',
    cardClass: 'from-orange-500/18 to-amber-400/10 border-orange-300/30',
    growMs: 3 * 60 * 1000,
    thirstMs: 70 * 1000,
    wiltMs: 150 * 1000,
    mood: '清爽醒神',
    tip: '长得稳，适合先把田地热起来。',
  },
  strawberry: {
    label: '草莓',
    accent: '#f43f5e',
    cardClass: 'from-rose-500/18 to-pink-400/10 border-rose-300/30',
    growMs: 4 * 60 * 1000,
    thirstMs: 80 * 1000,
    wiltMs: 170 * 1000,
    mood: '甜香满园',
    tip: '成熟后很亮眼，收获感强。',
  },
  pumpkin: {
    label: '南瓜',
    accent: '#f59e0b',
    cardClass: 'from-amber-500/18 to-orange-400/10 border-amber-300/30',
    growMs: 5 * 60 * 1000,
    thirstMs: 90 * 1000,
    wiltMs: 190 * 1000,
    mood: '丰收厚实',
    tip: '慢一点，但成熟时最有成就感。',
  },
  sunflower: {
    label: '向日葵',
    accent: '#facc15',
    cardClass: 'from-yellow-500/18 to-amber-300/10 border-yellow-300/30',
    growMs: 160 * 1000,
    thirstMs: 60 * 1000,
    wiltMs: 130 * 1000,
    mood: '阳光明亮',
    tip: '长得最快，适合先练手。',
  },
} satisfies Record<
  CropId,
  {
    label: string;
    accent: string;
    cardClass: string;
    growMs: number;
    thirstMs: number;
    wiltMs: number;
    mood: string;
    tip: string;
  }
>;

function createEmptyPlot(): GardenPlotState {
  return {
    cropId: null,
    plantedAt: null,
    wateredAt: null,
    careCount: 0,
  };
}

function createDefaultState(): GardenSaveState {
  return {
    plots: Array.from({ length: MAX_PLOTS }, () => createEmptyPlot()),
    harvestLedger: {},
    lastPatrolAt: null,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getStorageKey(userId?: string | number | null) {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'guest'}`;
}

function normalizeGardenState(input: unknown): GardenSaveState {
  const fallback = createDefaultState();
  if (!input || typeof input !== 'object') {
    return fallback;
  }

  const source = input as Partial<GardenSaveState>;
  const plots = Array.from({ length: MAX_PLOTS }, (_, index) => {
    const candidate = source.plots?.[index];
    if (!candidate || typeof candidate !== 'object') {
      return createEmptyPlot();
    }
    const cropId = candidate.cropId && candidate.cropId in CROPS ? candidate.cropId : null;
    return {
      cropId,
      plantedAt: typeof candidate.plantedAt === 'number' ? candidate.plantedAt : null,
      wateredAt: typeof candidate.wateredAt === 'number' ? candidate.wateredAt : null,
      careCount: typeof candidate.careCount === 'number' ? candidate.careCount : 0,
    };
  });

  const harvestLedger: Partial<Record<CropId, number>> = {};
  for (const key of Object.keys(CROPS) as CropId[]) {
    const value = source.harvestLedger?.[key];
    if (typeof value === 'number' && value > 0) {
      harvestLedger[key] = value;
    }
  }

  return {
    plots,
    harvestLedger,
    lastPatrolAt: typeof source.lastPatrolAt === 'number' ? source.lastPatrolAt : null,
  };
}

function formatRemainingMs(ms: number) {
  if (ms <= 0) {
    return '马上成熟';
  }
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} 分钟`;
}

function getPlotProgress(plot: GardenPlotState, now: number): PlotView {
  if (!plot.cropId || !plot.plantedAt) {
    return {
      stage: 'empty',
      progress: 0,
      remainingMs: 0,
      cropId: null,
      crop: null,
      actionLabel: '播种',
      subtitle: '空地待播种',
      needsWater: false,
    };
  }

  const crop = CROPS[plot.cropId];
  const wateredBonusRatio = plot.wateredAt ? 0.12 : 0;
  const careBonusRatio = clamp(plot.careCount * 0.025, 0, 0.12);
  const effectiveGrowMs = crop.growMs * (1 - wateredBonusRatio - careBonusRatio);
  const elapsedMs = Math.max(0, now - plot.plantedAt);
  const progress = clamp(elapsedMs / effectiveGrowMs, 0, 1);
  const remainingMs = Math.max(0, effectiveGrowMs - elapsedMs);
  const lastCareAt = plot.wateredAt ?? plot.plantedAt;
  const dryMs = Math.max(0, now - lastCareAt);

  if (dryMs >= crop.wiltMs) {
    return {
      stage: 'wilted',
      progress,
      remainingMs,
      cropId: plot.cropId,
      crop,
      actionLabel: '浇水救回',
      subtitle: `${crop.label}有点打蔫了`,
      needsWater: true,
    };
  }

  if (progress >= 1) {
    return {
      stage: 'ready',
      progress,
      remainingMs: 0,
      cropId: plot.cropId,
      crop,
      actionLabel: '收获',
      subtitle: `${crop.label}成熟了`,
      needsWater: false,
    };
  }

  if (dryMs >= crop.thirstMs) {
    return {
      stage: 'thirsty',
      progress,
      remainingMs,
      cropId: plot.cropId,
      crop,
      actionLabel: '浇水',
      subtitle: `${crop.label}在等水`,
      needsWater: true,
    };
  }

  if (progress >= 0.68) {
    return {
      stage: 'bloom',
      progress,
      remainingMs,
      cropId: plot.cropId,
      crop,
      actionLabel: '等待成熟',
      subtitle: `${formatRemainingMs(remainingMs)} 后可收`,
      needsWater: false,
    };
  }

  if (progress >= 0.32) {
    return {
      stage: 'sprout',
      progress,
      remainingMs,
      cropId: plot.cropId,
      crop,
      actionLabel: '继续生长',
      subtitle: `${crop.label}正在抽叶`,
      needsWater: false,
    };
  }

  return {
    stage: 'seed',
    progress,
    remainingMs,
    cropId: plot.cropId,
    crop,
    actionLabel: '等待发芽',
    subtitle: `${crop.label}刚种下`,
    needsWater: false,
  };
}

function CropSigil({
  cropId,
  stage,
  compact = false,
}: {
  cropId: CropId;
  stage: PlotStage;
  compact?: boolean;
}) {
  const crop = CROPS[cropId];
  const size = compact ? 28 : 54;
  const stemHeight =
    stage === 'seed' ? size * 0.16 : stage === 'sprout' ? size * 0.38 : stage === 'thirsty' ? size * 0.48 : size * 0.62;
  const wilted = stage === 'wilted';
  const bloomVisible = stage === 'bloom' || stage === 'ready' || stage === 'thirsty';
  const stemRotation = wilted ? -22 : 0;
  const bloomOpacity = wilted ? 0.28 : stage === 'thirsty' ? 0.72 : 1;

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/20 blur-sm"
        style={{ width: size * 0.68, height: Math.max(7, size * 0.18) }}
      />
      <div
        className="absolute bottom-[16%] left-1/2 origin-bottom -translate-x-1/2 rounded-full"
        style={{
          width: size * 0.14,
          height: stemHeight,
          transform: `translateX(-50%) rotate(${stemRotation}deg)`,
          background: wilted
            ? 'linear-gradient(180deg, rgba(163,163,163,0.85) 0%, rgba(120,53,15,0.85) 100%)'
            : 'linear-gradient(180deg, rgba(167,243,208,0.96) 0%, rgba(22,163,74,0.92) 100%)',
        }}
      />
      {stage !== 'seed' && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              left: size * 0.12,
              bottom: size * 0.28,
              width: size * 0.34,
              height: size * 0.22,
              transform: `rotate(${wilted ? '-46deg' : '-28deg'})`,
              background: wilted
                ? 'linear-gradient(180deg, rgba(202,138,4,0.38) 0%, rgba(120,53,15,0.76) 100%)'
                : 'linear-gradient(180deg, rgba(110,231,183,0.96) 0%, rgba(21,128,61,0.92) 100%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              right: size * 0.12,
              bottom: size * 0.36,
              width: size * 0.32,
              height: size * 0.2,
              transform: `rotate(${wilted ? '42deg' : '30deg'})`,
              background: wilted
                ? 'linear-gradient(180deg, rgba(202,138,4,0.34) 0%, rgba(120,53,15,0.72) 100%)'
                : 'linear-gradient(180deg, rgba(134,239,172,0.95) 0%, rgba(22,101,52,0.92) 100%)',
            }}
          />
        </>
      )}
      {bloomVisible && (
        <div
          className="absolute rounded-full"
          style={{
            top: size * 0.02,
            left: '50%',
            width: size * 0.5,
            height: size * 0.5,
            opacity: bloomOpacity,
            transform: `translateX(-50%) scale(${stage === 'ready' ? 1.04 : 0.9})`,
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.56) 0%, ${crop.accent}dd 45%, ${crop.accent}aa 100%)`,
            boxShadow: `0 0 18px ${crop.accent}44`,
          }}
        />
      )}
      {stage === 'ready' && (
        <div
          className="absolute rounded-full border border-white/25"
          style={{
            top: 0,
            left: '50%',
            width: size * 0.64,
            height: size * 0.64,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 18px ${crop.accent}35`,
          }}
        />
      )}
      {stage === 'thirsty' && (
        <div className="absolute right-0 top-0 rounded-full bg-cyan-300/16 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-50">
          水
        </div>
      )}
      {stage === 'wilted' && (
        <div className="absolute right-0 top-0 rounded-full bg-amber-500/16 px-1.5 py-0.5 text-[10px] font-semibold text-amber-50">
          枯
        </div>
      )}
    </div>
  );
}

export default function GardenPlayPanel({
  userId,
  currentPetName,
  companionCount,
  visible,
  compact = false,
}: GardenPlayPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldToneDownMotion = compact || !!prefersReducedMotion;
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const [gardenState, setGardenState] = useState<GardenSaveState>(() => createDefaultState());
  const [selectedCrop, setSelectedCrop] = useState<CropId>('sunflower');
  const [now, setNow] = useState(() => Date.now());
  const [isExpanded, setIsExpanded] = useState(false);
  const [gardenHint, setGardenHint] = useState('点空地播种，成熟后再回来收获。');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      setGardenState(raw ? normalizeGardenState(JSON.parse(raw)) : createDefaultState());
    } catch {
      setGardenState(createDefaultState());
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(gardenState));
  }, [gardenState, storageKey]);

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        setNow(Date.now());
      },
      visible ? (shouldToneDownMotion ? 9000 : 6000) : 18000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [shouldToneDownMotion, visible]);

  const plots = useMemo(
    () => gardenState.plots.map((plot) => getPlotProgress(plot, now)),
    [gardenState.plots, now],
  );

  const readyCount = plots.filter((plot) => plot.stage === 'ready').length;
  const thirstyCount = plots.filter((plot) => plot.stage === 'thirsty').length;
  const wiltedCount = plots.filter((plot) => plot.stage === 'wilted').length;
  const plantedCount = plots.filter((plot) => plot.stage !== 'empty').length;
  const harvestCount = Object.values(gardenState.harvestLedger).reduce((sum, value) => sum + (value ?? 0), 0);
  const needsCareCount = thirstyCount + wiltedCount;
  const atmosphereLabel =
    readyCount > 0 ? '丰收时刻' : wiltedCount > 0 ? '等你救回' : plantedCount > 3 ? '庭院正热闹' : '慢慢种起来';
  const gardenVitalityScore = clamp(
    38 + plantedCount * 7 + readyCount * 9 + companionCount * 4 + Math.min(harvestCount, 12) * 2 - needsCareCount * 8,
    0,
    100,
  );
  const gardenFocusLabel =
    needsCareCount > 0
      ? '优先补水'
      : readyCount > 0
        ? '可以收获'
        : plantedCount > 0
          ? '稳定生长'
          : '等待播种';
  const patrolRemainingMs = Math.max(
    0,
    PATROL_COOLDOWN_MS - (gardenState.lastPatrolAt ? now - gardenState.lastPatrolAt : PATROL_COOLDOWN_MS),
  );
  const canPatrol = patrolRemainingMs <= 0;

  const handleCompanionPatrol = () => {
    if (!canPatrol) {
      setGardenHint(`${currentPetName} 休息一下，${Math.ceil(patrolRemainingMs / 1000)} 秒后再巡园。`);
      return;
    }

    const timestamp = Date.now();
    setGardenState((previous) => {
      const nextPlots = [...previous.plots];
      let helped = 0;

      const priority = [...nextPlots.keys()].sort((left, right) => {
        const leftPlot = getPlotProgress(nextPlots[left], timestamp);
        const rightPlot = getPlotProgress(nextPlots[right], timestamp);
        const leftScore = leftPlot.stage === 'wilted' ? 3 : leftPlot.stage === 'thirsty' ? 2 : leftPlot.stage !== 'empty' && leftPlot.stage !== 'ready' ? 1 : 0;
        const rightScore = rightPlot.stage === 'wilted' ? 3 : rightPlot.stage === 'thirsty' ? 2 : rightPlot.stage !== 'empty' && rightPlot.stage !== 'ready' ? 1 : 0;
        return rightScore - leftScore;
      });

      for (const index of priority) {
        const current = nextPlots[index];
        const progress = getPlotProgress(current, timestamp);
        if (!current.cropId || progress.stage === 'ready' || progress.stage === 'empty') {
          continue;
        }
        nextPlots[index] = {
          ...current,
          wateredAt: timestamp,
          careCount: current.careCount + 1,
        };
        helped += 1;
        if (helped >= 3) {
          break;
        }
      }

      setGardenHint(
        helped > 0
          ? `${currentPetName} 巡园照看了 ${helped} 块田，院子又精神起来了。`
          : `${currentPetName} 在庭院里逛了一圈，今天的田地状态很稳。`,
      );

      return {
        ...previous,
        plots: nextPlots,
        lastPatrolAt: timestamp,
      };
    });
  };

  const handlePlotAction = (plotIndex: number) => {
    const progress = plots[plotIndex];
    const timestamp = Date.now();

    setGardenState((previous) => {
      const nextPlots = [...previous.plots];
      const current = nextPlots[plotIndex];

      if (!current.cropId || progress.stage === 'empty') {
        nextPlots[plotIndex] = {
          cropId: selectedCrop,
          plantedAt: timestamp,
          wateredAt: timestamp,
          careCount: 0,
        };
        setGardenHint(`${currentPetName} 帮你种下了 ${CROPS[selectedCrop].label}。`);
        return {
          ...previous,
          plots: nextPlots,
        };
      }

      if (progress.stage === 'ready') {
        const cropId = current.cropId;
        nextPlots[plotIndex] = createEmptyPlot();
        setGardenHint(`收下了 ${CROPS[cropId].label}，庭院里多了一份小丰收。`);
        return {
          ...previous,
          plots: nextPlots,
          harvestLedger: {
            ...previous.harvestLedger,
            [cropId]: (previous.harvestLedger[cropId] ?? 0) + 1,
          },
        };
      }

      nextPlots[plotIndex] = {
        ...current,
        wateredAt: timestamp,
        careCount: current.careCount + 1,
      };
      setGardenHint(
        progress.stage === 'wilted'
          ? `${progress.crop?.label ?? '作物'} 喝到水了，慢慢缓回来了。`
          : `${progress.crop?.label ?? '作物'} 已浇水，继续等它长大。`,
      );
      return {
        ...previous,
        plots: nextPlots,
      };
    });
  };

  return (
    <>
      <div className={`pointer-events-none absolute z-[11] ${compact ? 'left-[4.4%] top-[69.6%] flex w-[118px] flex-col gap-1.5' : 'left-[3.2%] top-[72.2%] flex w-[36%] items-start justify-between'}`}>
        <div className={`rounded-[22px] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(8,66,82,0.76),rgba(6,31,52,0.94))] px-3 text-[11px] text-cyan-50 shadow-[0_16px_30px_rgba(15,23,42,0.18)] backdrop-blur-md ${compact ? 'py-2 px-2.5' : 'py-2.5'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/70">浇水提示</div>
          <div className="mt-1 text-amber-50/92">缺水时点田块浇回去</div>
        </div>
        <div className={`rounded-[22px] border border-emerald-200/20 bg-[linear-gradient(180deg,rgba(16,95,76,0.74),rgba(7,45,47,0.94))] px-3 text-[11px] text-emerald-50 shadow-[0_16px_30px_rgba(15,23,42,0.14)] backdrop-blur-md ${compact ? 'py-2 px-2.5' : 'mt-[6.4%] py-2.5'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/70">丰收篮</div>
          <div className="mt-1 text-amber-50/92">{harvestCount} 份小收获</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[12]">
        {FARM_PLOTS.map((plotAnchor, index) => {
          const plot = plots[index];
          const crop = plot.crop;
          const glowColor = crop?.accent ?? '#f59e0b';
          const isReady = plot.stage === 'ready';
          const isDry = plot.stage === 'thirsty' || plot.stage === 'wilted';
          const isEmpty = plot.stage === 'empty';

          return (
            <button
              key={plotAnchor.id}
              type="button"
              onClick={() => handlePlotAction(index)}
              className={`group pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition ${
                compact ? 'h-[72px] w-[88px]' : 'h-[78px] w-[94px]'
              }`}
              style={{
                left: `${plotAnchor.x}%`,
                top: `${plotAnchor.y - 1.6}%`,
              }}
            >
              <motion.div
                animate={{
                  y: isReady
                    ? shouldToneDownMotion
                      ? [0, -2.4, 0]
                      : [0, -4, 0]
                    : shouldToneDownMotion
                      ? [0, -0.8, 0]
                      : [0, -1.5, 0],
                  scale: isReady
                    ? shouldToneDownMotion
                      ? [1, 1.016, 1]
                      : [1, 1.03, 1]
                    : shouldToneDownMotion
                      ? [1, 1.004, 1]
                      : [1, 1.01, 1],
                }}
                transition={{
                  duration: isReady
                    ? shouldToneDownMotion
                      ? 2.3
                      : 1.8
                    : shouldToneDownMotion
                      ? 4.2
                      : 3.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative flex h-full w-full items-center justify-center"
              >
                <div className="absolute left-1/2 bottom-[4px] h-[16px] w-[56px] -translate-x-1/2 rounded-full bg-slate-950/18 blur-md" />
                {!isEmpty && (
                  <div
                    className="absolute left-1/2 bottom-[18px] h-[18px] w-[52px] -translate-x-1/2 rounded-full blur-lg"
                    style={{ background: `${glowColor}${isReady ? '30' : '18'}` }}
                  />
                )}
                <div
                  className="absolute inset-x-[8px] bottom-[10px] top-[16px] rounded-[28px] border border-white/10"
                  style={{
                    background:
                      isEmpty
                        ? 'linear-gradient(180deg, rgba(120,84,44,0.92) 0%, rgba(87,56,26,0.98) 100%)'
                        : 'linear-gradient(180deg, rgba(126,88,48,0.94) 0%, rgba(79,46,18,0.98) 100%)',
                    boxShadow: '0 12px 20px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,241,214,0.1)',
                  }}
                />
                <div
                  className={`absolute inset-x-[12px] bottom-[14px] top-[22px] overflow-hidden rounded-[24px] border ${
                    isDry ? 'border-amber-200/22' : 'border-amber-950/28'
                  }`}
                  style={{
                    background: isEmpty
                      ? 'radial-gradient(ellipse at 50% 22%, rgba(169,117,64,0.94) 0%, rgba(120,77,36,0.96) 34%, rgba(74,44,19,0.98) 100%)'
                      : isDry
                        ? 'radial-gradient(ellipse at 50% 24%, rgba(157,92,38,0.92) 0%, rgba(115,58,19,0.96) 36%, rgba(61,29,10,0.98) 100%)'
                        : 'radial-gradient(ellipse at 50% 22%, rgba(142,96,52,0.92) 0%, rgba(99,61,29,0.96) 34%, rgba(60,34,14,0.98) 100%)',
                    boxShadow: isEmpty
                      ? 'inset 0 12px 16px rgba(255,213,153,0.05), inset 0 -10px 16px rgba(28,18,8,0.34)'
                      : `inset 0 10px 16px rgba(255,214,164,0.05), inset 0 -12px 18px rgba(20,12,6,0.42), 0 0 16px ${glowColor}10`,
                  }}
                >
                  <div
                    className="absolute inset-[10%] rounded-[18px] opacity-55"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(54,31,13,0.28) 8px, rgba(54,31,13,0.28) 10px)',
                    }}
                  />
                  <div className="absolute inset-x-[20%] top-[21%] h-[1px] rounded-full bg-amber-50/14" />
                  <div className="absolute inset-x-[24%] top-[45%] h-[1px] rounded-full bg-amber-50/10" />
                  <div className="absolute inset-x-[30%] top-[68%] h-[1px] rounded-full bg-amber-50/8" />
                  <div className="absolute inset-x-[16%] top-[10%] h-[16%] rounded-full bg-white/8 blur-sm" />
                </div>

                {plot.cropId ? (
                  <div className="relative z-[2]">
                    <CropSigil cropId={plot.cropId} stage={plot.stage} compact={compact} />
                  </div>
                ) : (
                  <>
                    <motion.div
                      className="absolute left-[34px] top-[32px] h-2.5 w-2.5 rounded-full bg-amber-200/72 shadow-[0_0_10px_rgba(253,224,71,0.25)]"
                      animate={{
                        y: shouldToneDownMotion ? [0, -1.5, 0] : [0, -3, 0],
                        opacity: shouldToneDownMotion ? [0.45, 0.66, 0.45] : [0.45, 0.8, 0.45],
                      }}
                      transition={{
                        duration: shouldToneDownMotion ? 3.2 : 2.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <div className="absolute left-[28px] top-[42px] h-[2px] w-[18px] rounded-full bg-amber-100/16" />
                    <div className="absolute left-[46px] top-[38px] h-[10px] w-[10px] rounded-full bg-amber-100/12" />
                    <div className="absolute right-[24px] top-[28px] flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[10px] font-semibold text-amber-50/90">
                      +
                    </div>
                  </>
                )}

                {isReady && (
                  <motion.div
                    className="absolute right-[18px] top-[18px] h-3 w-3 rounded-full bg-amber-200/90 shadow-[0_0_16px_rgba(253,224,71,0.5)]"
                    animate={{
                      scale: shouldToneDownMotion ? [0.94, 1.08, 0.94] : [0.9, 1.18, 0.9],
                      opacity: shouldToneDownMotion ? [0.5, 0.86, 0.5] : [0.42, 1, 0.42],
                    }}
                    transition={{
                      duration: shouldToneDownMotion ? 1.8 : 1.3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {!isEmpty && (
                  <div className="absolute inset-x-[18px] bottom-[10px] h-[4px] overflow-hidden rounded-full bg-slate-950/28">
                    <motion.div
                      className={`h-full rounded-full ${
                        isDry ? 'bg-amber-300/80' : isReady ? 'bg-emerald-300' : 'bg-cyan-300/90'
                      }`}
                      style={{ width: `${Math.max(8, Math.round(plot.progress * 100))}%` }}
                      animate={{
                        opacity: isReady
                          ? shouldToneDownMotion
                            ? [0.78, 0.96, 0.78]
                            : [0.7, 1, 0.7]
                          : [0.9, 0.9, 0.9],
                      }}
                      transition={{
                        duration: shouldToneDownMotion ? 2.1 : 1.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                )}

                <span
                  className={`absolute rounded-full px-2 py-0.5 font-semibold text-amber-50 transition ${
                    compact ? '-bottom-4.5 text-[9px]' : '-bottom-5 text-[10px]'
                  } ${
                    isReady || isDry ? 'bg-[rgba(60,33,15,0.9)] opacity-100' : 'bg-[rgba(60,33,15,0.84)] opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {plot.actionLabel}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className={`absolute z-[14] flex flex-col items-end ${compact ? 'right-3 top-[5.8rem] gap-1.5' : 'right-5 top-24 gap-2'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/78 font-semibold text-white shadow-[0_16px_34px_rgba(2,6,23,0.26)] backdrop-blur-md transition hover:bg-slate-900/86 ${compact ? 'px-2 py-1.5 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'}`}
          title="展开庭院面板"
        >
          <span>庭院手册</span>
          <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs text-emerald-100">{plantedCount}/{MAX_PLOTS}</span>
        </button>

        {isExpanded && (
          <div className={`rounded-[24px] border border-white/10 bg-slate-950/74 p-3 shadow-[0_26px_60px_rgba(2,6,23,0.32)] backdrop-blur-md ${compact ? 'w-[min(84vw,272px)]' : 'w-[272px]'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">庭院日常</div>
                <div className="mt-1 text-base font-black text-white">减压小农场</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">播种、浇水、等成熟，再轻轻收下今天的小丰收。</p>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1.5 text-right">
                <div className="text-[10px] font-semibold text-emerald-50">{atmosphereLabel}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">已种</div>
                <div className="mt-1 text-sm font-bold text-white">{plantedCount}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">待照看</div>
                <div className="mt-1 text-sm font-bold text-white">{needsCareCount}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">可收</div>
                <div className="mt-1 text-sm font-bold text-white">{readyCount}</div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">庭院活力</div>
                  <div className="mt-1 text-[11px] text-slate-400">{gardenFocusLabel}</div>
                </div>
                <div className="text-right text-sm font-black text-emerald-100">{gardenVitalityScore}%</div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#a7f3d0,#fbbf24)]"
                  initial={false}
                  animate={{ width: `${gardenVitalityScore}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-500/10 px-3 py-2 text-[11px] leading-5 text-cyan-50">
              {gardenHint}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-white">宠物巡园</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">
                  {canPatrol ? '可帮你照看 3 块田，优先救回缺水作物。' : `冷却中，还需 ${Math.ceil(patrolRemainingMs / 1000)} 秒。`}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCompanionPatrol}
                disabled={!canPatrol}
                className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                巡园一次
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(CROPS) as CropId[]).map((cropId) => {
                const crop = CROPS[cropId];
                const selected = cropId === selectedCrop;
                return (
                  <button
                    key={cropId}
                    type="button"
                    onClick={() => {
                      setSelectedCrop(cropId);
                      setGardenHint(`已切换到 ${crop.label}，${crop.tip}`);
                    }}
                    className={`rounded-[20px] border bg-gradient-to-br px-2.5 py-2 text-left transition ${
                      selected
                        ? `${crop.cardClass} shadow-[0_0_0_1px_rgba(255,255,255,0.04)]`
                        : 'border-white/10 from-white/[0.05] to-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CropSigil cropId={cropId} stage="ready" compact />
                      <div>
                        <div className="font-semibold text-white">{crop.label}</div>
                        <div className="text-xs text-slate-300">{crop.mood}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="flex items-center justify-between text-[13px] text-slate-300">
                <span>陪玩伙伴</span>
                <span className="font-semibold text-white">{Math.max(1, companionCount)} 只</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {(Object.keys(CROPS) as CropId[]).map((cropId) => (
                  <div key={cropId} className="rounded-2xl border border-white/8 bg-slate-950/28 px-2 py-2 text-center">
                    <div className="text-[10px] text-slate-400">{CROPS[cropId].label}</div>
                    <div className="mt-1 text-sm font-bold text-white">{gardenState.harvestLedger[cropId] ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
