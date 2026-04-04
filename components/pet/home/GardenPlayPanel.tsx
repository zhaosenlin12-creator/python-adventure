'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { FARM_PLOTS } from '@/components/pet/home/FarmGrid';

type CropId = 'carrot' | 'strawberry' | 'pumpkin' | 'sunflower';

type PlotStage = 'empty' | 'seed' | 'sprout' | 'bloom' | 'ready';

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

interface GardenPlayPanelProps {
  userId?: string | number | null;
  currentPetName: string;
  companionCount: number;
  visible: boolean;
}

const STORAGE_KEY_PREFIX = 'pet-home-garden-v2';
const MAX_PLOTS = FARM_PLOTS.length;

const CROPS: Record<
  CropId,
  {
    label: string;
    accent: string;
    cardClass: string;
    growMs: number;
    mood: string;
  }
> = {
  carrot: {
    label: '胡萝卜',
    accent: '#fb923c',
    cardClass: 'from-orange-500/18 to-amber-400/10 border-orange-300/30',
    growMs: 7 * 60 * 1000,
    mood: '清脆醒神',
  },
  strawberry: {
    label: '草莓',
    accent: '#f43f5e',
    cardClass: 'from-rose-500/18 to-pink-400/10 border-rose-300/30',
    growMs: 8 * 60 * 1000,
    mood: '甜香满园',
  },
  pumpkin: {
    label: '南瓜',
    accent: '#f59e0b',
    cardClass: 'from-amber-500/18 to-orange-400/10 border-amber-300/30',
    growMs: 9 * 60 * 1000,
    mood: '丰收感十足',
  },
  sunflower: {
    label: '向日葵',
    accent: '#facc15',
    cardClass: 'from-yellow-500/18 to-amber-300/10 border-yellow-300/30',
    growMs: 6 * 60 * 1000,
    mood: '阳光明亮',
  },
};

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

function getPlotProgress(plot: GardenPlotState, now: number) {
  if (!plot.cropId || !plot.plantedAt) {
    return {
      stage: 'empty' as PlotStage,
      progress: 0,
      remainingMs: 0,
      cropId: null,
      crop: null,
      actionLabel: '播种',
      subtitle: '空地待耕',
    };
  }

  const crop = CROPS[plot.cropId];
  const wateredBonusRatio = plot.wateredAt ? 0.16 : 0;
  const careBonusRatio = clamp(plot.careCount * 0.03, 0, 0.09);
  const effectiveGrowMs = crop.growMs * (1 - wateredBonusRatio - careBonusRatio);
  const elapsedMs = Math.max(0, now - plot.plantedAt);
  const progress = clamp(elapsedMs / effectiveGrowMs, 0, 1);

  if (progress >= 1) {
    return {
      stage: 'ready' as PlotStage,
      progress,
      remainingMs: 0,
      cropId: plot.cropId,
      crop,
      actionLabel: '收获',
      subtitle: `${crop.label}已经成熟`,
    };
  }
  if (progress >= 0.68) {
    return {
      stage: 'bloom' as PlotStage,
      progress,
      remainingMs: effectiveGrowMs - elapsedMs,
      cropId: plot.cropId,
      crop,
      actionLabel: plot.wateredAt ? '等待成熟' : '浇水',
      subtitle: `快成熟了，还差 ${Math.ceil((effectiveGrowMs - elapsedMs) / 60000)} 分钟`,
    };
  }
  if (progress >= 0.32) {
    return {
      stage: 'sprout' as PlotStage,
      progress,
      remainingMs: effectiveGrowMs - elapsedMs,
      cropId: plot.cropId,
      crop,
      actionLabel: plot.wateredAt ? '继续成长' : '浇水',
      subtitle: `${crop.label}正在长叶`,
    };
  }

  return {
    stage: 'seed' as PlotStage,
    progress,
    remainingMs: effectiveGrowMs - elapsedMs,
    cropId: plot.cropId,
    crop,
    actionLabel: plot.wateredAt ? '等待发芽' : '浇水',
    subtitle: `${crop.label}刚刚播下`,
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
  const size = compact ? 28 : 42;
  const sproutHeight = stage === 'seed' ? '24%' : stage === 'sprout' ? '46%' : '68%';
  const bloomScale = stage === 'ready' ? 1 : stage === 'bloom' ? 0.84 : 0.72;

  return (
    <div
      className="relative flex items-end justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/18 blur-sm"
        style={{ width: size * 0.62, height: Math.max(6, size * 0.16) }}
      />
      <div
        className="absolute bottom-[16%] left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: size * 0.12,
          height: sproutHeight,
          background: 'linear-gradient(180deg, rgba(167,243,208,0.95) 0%, rgba(22,163,74,0.92) 100%)',
        }}
      />
      {stage !== 'seed' && (
        <>
          <div
            className="absolute rounded-full"
            style={{
              left: size * 0.16,
              bottom: size * 0.3,
              width: size * 0.32,
              height: size * 0.2,
              transform: 'rotate(-28deg)',
              background: 'linear-gradient(180deg, rgba(110,231,183,0.95) 0%, rgba(21,128,61,0.92) 100%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              right: size * 0.16,
              bottom: size * 0.36,
              width: size * 0.3,
              height: size * 0.18,
              transform: 'rotate(32deg)',
              background: 'linear-gradient(180deg, rgba(134,239,172,0.95) 0%, rgba(22,101,52,0.92) 100%)',
            }}
          />
        </>
      )}
      {stage === 'bloom' || stage === 'ready' ? (
        <div
          className="absolute rounded-full"
          style={{
            top: size * 0.08,
            left: '50%',
            width: size * 0.52,
            height: size * 0.52,
            transform: `translateX(-50%) scale(${bloomScale})`,
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, ${crop.accent}cc 45%, ${crop.accent}aa 100%)`,
            boxShadow: `0 0 18px ${crop.accent}55`,
          }}
        />
      ) : null}
      {stage === 'ready' ? (
        <div
          className="absolute rounded-full border border-white/25"
          style={{
            top: size * 0.04,
            left: '50%',
            width: size * 0.66,
            height: size * 0.66,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 20px ${crop.accent}40`,
          }}
        />
      ) : null}
    </div>
  );
}

export default function GardenPlayPanel({
  userId,
  currentPetName,
  companionCount,
  visible,
}: GardenPlayPanelProps) {
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const [gardenState, setGardenState] = useState<GardenSaveState>(() => createDefaultState());
  const [selectedCrop, setSelectedCrop] = useState<CropId>('carrot');
  const [now, setNow] = useState(() => Date.now());
  const [isExpanded, setIsExpanded] = useState(false);
  const [gardenHint, setGardenHint] = useState('选一块空地播种，宠物会在庭院里陪你慢慢等作物成熟。');

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
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, visible ? 15000 : 45000);

    return () => {
      window.clearInterval(timer);
    };
  }, [visible]);

  const plots = useMemo(
    () => gardenState.plots.map((plot) => getPlotProgress(plot, now)),
    [gardenState.plots, now],
  );

  const matureCount = plots.filter((plot) => plot.stage === 'ready').length;
  const plantedCount = plots.filter((plot) => plot.stage !== 'empty').length;
  const harvestCount = (Object.values(gardenState.harvestLedger).reduce((sum, value) => sum + (value ?? 0), 0));
  const atmosphereLabel = matureCount > 0 ? '丰收时刻' : plantedCount > 3 ? '生机渐浓' : '慢慢布置中';
  const patrolCooldownMs = 3 * 60 * 1000;
  const patrolRemainingMs = Math.max(0, patrolCooldownMs - (gardenState.lastPatrolAt ? now - gardenState.lastPatrolAt : patrolCooldownMs));
  const canPatrol = patrolRemainingMs <= 0;

  const handleCompanionPatrol = () => {
    if (!canPatrol) {
      setGardenHint(`巡园还需要等待 ${Math.ceil(patrolRemainingMs / 1000)} 秒，${currentPetName} 正在庭院里慢慢散步。`);
      return;
    }

    const timestamp = Date.now();
    setGardenState((previous) => {
      const nextPlots = [...previous.plots];
      let helped = 0;

      for (let index = 0; index < nextPlots.length; index += 1) {
        const current = nextPlots[index];
        const progress = getPlotProgress(current, timestamp);
        if (!current.cropId || progress.stage === 'ready') {
          continue;
        }
        nextPlots[index] = {
          ...current,
          wateredAt: timestamp,
          careCount: current.careCount + 1,
        };
        helped += 1;
        if (helped >= 2) {
          break;
        }
      }

      setGardenHint(
        helped > 0
          ? `${currentPetName} 巡园时顺手照看了 ${helped} 块作物，庭院的成长节奏更稳定了。`
          : `${currentPetName} 在庭院里逛了一圈，今天暂时没有需要额外照看的作物。`,
      );

      return {
        ...previous,
        plots: nextPlots,
        lastPatrolAt: timestamp,
      };
    });
  };

  const handlePlotAction = (plotIndex: number) => {
    const plot = gardenState.plots[plotIndex];
    const progress = plots[plotIndex];
    const timestamp = Date.now();

    setGardenState((previous) => {
      const nextPlots = [...previous.plots];
      const current = nextPlots[plotIndex];

      if (!current.cropId || progress.stage === 'empty') {
        nextPlots[plotIndex] = {
          cropId: selectedCrop,
          plantedAt: timestamp,
          wateredAt: null,
          careCount: 0,
        };
        setGardenHint(`${currentPetName} 帮你把 ${CROPS[selectedCrop].label} 种下了，记得过一会儿回来看看。`);
      } else if (progress.stage === 'ready') {
        const cropId = current.cropId;
        nextPlots[plotIndex] = createEmptyPlot();
        setGardenHint(`收获完成：${CROPS[cropId].label} 已装进庭院收纳箱，今天的庭院更热闹了。`);
        return {
          plots: nextPlots,
          harvestLedger: {
            ...previous.harvestLedger,
            [cropId]: (previous.harvestLedger[cropId] ?? 0) + 1,
          },
          lastPatrolAt: previous.lastPatrolAt,
        };
      } else {
        nextPlots[plotIndex] = {
          ...current,
          wateredAt: timestamp,
          careCount: current.careCount + 1,
        };
        setGardenHint(`${currentPetName} 给 ${progress.crop?.label ?? '作物'} 浇了水，成熟速度会更快一点。`);
      }

      return {
        ...previous,
        plots: nextPlots,
      };
    });
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-[12]">
        {FARM_PLOTS.map((plotAnchor, index) => {
          const plot = plots[index];
          const crop = plot.crop;
          const isEmpty = plot.stage === 'empty';
          const glowColor = crop?.accent ?? '#f59e0b';

          return (
            <button
              key={plotAnchor.id}
              type="button"
              onClick={() => handlePlotAction(index)}
              className="group pointer-events-auto absolute flex min-h-[62px] min-w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/12 backdrop-blur-[1px] transition hover:scale-[1.03]"
              style={{
                left: `${plotAnchor.x}%`,
                top: `${plotAnchor.y - 2}%`,
                boxShadow: isEmpty ? 'none' : `0 0 24px ${glowColor}22`,
              }}
              >
                <motion.div
                  animate={{
                  scale: plot.stage === 'ready' ? [1, 1.08, 1] : [1, 1.02, 1],
                  y: plot.stage === 'ready' ? [0, -3, 0] : [0, -1, 0],
                }}
                transition={{
                  duration: plot.stage === 'ready' ? 1.8 : 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative flex h-14 w-14 items-center justify-center rounded-full"
              >
                {!isEmpty && (
                  <div
                    className="absolute inset-1 rounded-full blur-xl"
                    style={{ background: `${glowColor}2a` }}
                  />
                )}
                {plot.cropId && plot.stage !== 'empty' ? (
                  <div className="relative">
                    <CropSigil cropId={plot.cropId} stage={plot.stage} />
                  </div>
                ) : (
                  <div
                    className="relative rounded-[18px] border border-amber-100/18"
                    style={{
                      width: 28,
                      height: 28,
                      background: 'linear-gradient(180deg, rgba(120,74,36,0.58) 0%, rgba(78,46,18,0.76) 100%)',
                    }}
                  />
                )}
                <span className={`absolute -bottom-5 rounded-full bg-slate-900/82 px-2 py-0.5 text-[10px] font-semibold text-slate-100 transition ${
                  plot.stage === 'ready' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {plot.actionLabel}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className="absolute right-5 top-24 z-[14] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/76 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_16px_34px_rgba(2,6,23,0.26)] backdrop-blur-md transition hover:bg-slate-900/86"
          title="展开庭院种植面板"
        >
          <span>庭院助手</span>
          <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs text-emerald-100">{plantedCount}/{MAX_PLOTS}</span>
        </button>

        {isExpanded && (
          <div className="w-[244px] rounded-[22px] border border-white/10 bg-slate-950/72 p-3 shadow-[0_26px_60px_rgba(2,6,23,0.32)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-200">庭院日常</div>
            <div className="mt-1 text-base font-black text-white">轻养成种植台</div>
            <p className="hidden mt-2 text-sm leading-6 text-slate-300">
              先选种子，再点空地播种。成熟前可以浇水，也可以让宠物巡园帮你照看作物。
            </p>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1.5 text-right">
            <div className="text-[10px] font-semibold text-emerald-50">{atmosphereLabel}</div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">已种植</div>
            <div className="mt-1 text-sm font-bold text-white">{plantedCount}/{MAX_PLOTS}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">已成熟</div>
            <div className="mt-1 text-sm font-bold text-white">{matureCount}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">总收成</div>
            <div className="mt-1 text-sm font-bold text-white">{harvestCount}</div>
          </div>
        </div>

        <div className="mt-2.5 rounded-full border border-cyan-300/15 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] leading-5 text-cyan-50">
          {gardenHint}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2.5">
          <div>
            <div className="text-sm font-semibold text-white">宠物巡园</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              {canPatrol ? '可以让宠物巡园一次，帮助照看 2 块未成熟作物。' : `冷却中，还需 ${Math.ceil(patrolRemainingMs / 1000)} 秒。`}
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

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {(Object.keys(CROPS) as CropId[]).map((cropId) => {
            const crop = CROPS[cropId];
            const selected = cropId === selectedCrop;
            return (
              <button
                key={cropId}
                type="button"
                onClick={() => {
                  setSelectedCrop(cropId);
                  setGardenHint(`已切换到 ${crop.label} 种子，这片庭院会呈现 ${crop.mood} 的感觉。`);
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

        <div className="mt-2.5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[13px] text-slate-300">
          <span>庭院陪玩伙伴</span>
          <span className="font-semibold text-white">{Math.max(1, companionCount)} 只</span>
        </div>
          </div>
        )}
      </div>
    </>
  );
}
