'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Star, TrendingUp, X } from 'lucide-react';
import {
  EVOLUTION_STAGES,
  type EvolutionStage,
  canEvolve,
  getEvolutionProgress,
  getNextStage,
  getStageAppearance,
} from '@/lib/petEvolution';
import { usePetStore } from '@/store/petStore';
import PetEggDisplay from './PetEggDisplay';
import { PET_CONFIGS, PetType } from '@/types/pet';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';

interface EvolutionPokedexProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: number;
  petType: PetType;
  petData: {
    level: number;
    intimacy: number;
    intelligence: number;
    creativity: number;
    persistence?: number;
    perseverance?: number;
  };
}

const getStageBorder = (stageIndex: number) => {
  const borderMap: Record<number, string> = {
    0: 'border-slate-500/70',
    1: 'border-amber-300/70',
    2: 'border-emerald-300/70',
    3: 'border-sky-300/70',
    4: 'border-violet-300/70',
    5: 'border-yellow-300/80',
  };

  return borderMap[stageIndex] ?? 'border-slate-500/70';
};

const getStageAccent = (stageIndex: number) => {
  const accentMap: Record<number, string> = {
    0: 'from-slate-300/16 via-slate-900/95 to-slate-950',
    1: 'from-amber-200/16 via-slate-900/95 to-slate-950',
    2: 'from-emerald-200/16 via-slate-900/95 to-slate-950',
    3: 'from-sky-200/16 via-slate-900/95 to-slate-950',
    4: 'from-violet-200/16 via-slate-900/95 to-slate-950',
    5: 'from-yellow-100/18 via-slate-900/95 to-slate-950',
  };

  return accentMap[stageIndex] ?? accentMap[0];
};

function buildRequirementRows(stage: EvolutionStage, petData: EvolutionPokedexProps['petData']) {
  const persistence = petData.persistence ?? petData.perseverance ?? 0;
  const rows = [
    {
      label: '等级',
      current: petData.level,
      target: stage.minLevel,
      met: petData.level >= stage.minLevel,
    },
  ];

  if (stage.minIntimacy) {
    rows.push({
      label: '亲密度',
      current: petData.intimacy,
      target: stage.minIntimacy,
      met: petData.intimacy >= stage.minIntimacy,
    });
  }

  if (stage.minIntelligence) {
    rows.push({
      label: '智力',
      current: petData.intelligence,
      target: stage.minIntelligence,
      met: petData.intelligence >= stage.minIntelligence,
    });
  }

  if (stage.minCreativity) {
    rows.push({
      label: '创造力',
      current: petData.creativity,
      target: stage.minCreativity,
      met: petData.creativity >= stage.minCreativity,
    });
  }

  if (stage.minPerseverance) {
    rows.push({
      label: '毅力',
      current: persistence,
      target: stage.minPerseverance,
      met: persistence >= stage.minPerseverance,
    });
  }

  return rows;
}

export function EvolutionPokedex({
  isOpen,
  onClose,
  currentStage,
  petType,
  petData,
}: EvolutionPokedexProps) {
  const { pets } = usePetStore();
  const [selectedStage, setSelectedStage] = useState<number>(currentStage);
  const [activeTab, setActiveTab] = useState<'evolution' | 'eggs'>('evolution');

  const resolvedPetType = migratePetType(petType);
  const petConfig = PET_CONFIGS[resolvedPetType] || PET_CONFIGS.code_kitty;
  const persistence = petData.persistence ?? petData.perseverance ?? 0;
  const selectionScale = getPetVariantScale(resolvedPetType, 'selection');
  const nextStage = getNextStage(currentStage);
  const eggPets = (pets || []).filter((pet) => pet.isEgg || pet.petType === 'egg');

  const evolutionProgress = getEvolutionProgress({
    level: petData.level,
    evolution_stage: currentStage,
    intimacy: petData.intimacy,
    intelligence: petData.intelligence,
    creativity: petData.creativity,
    persistence,
  });

  const evolutionCheck = canEvolve({
    level: petData.level,
    evolution_stage: currentStage,
    intimacy: petData.intimacy,
    intelligence: petData.intelligence,
    creativity: petData.creativity,
    persistence,
  });

  useEffect(() => {
    setSelectedStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const stageCards = useMemo(
    () =>
      EVOLUTION_STAGES.map((stage) => ({
        stage,
        unlocked: stage.stage <= currentStage,
        artUrl: stage.stage === 0 ? '/assets/pets/egg.svg' : getPetImageUrl(resolvedPetType, 'normal', stage.stage),
      })),
    [currentStage, resolvedPetType]
  );

  if (!isOpen) return null;

  const selected = EVOLUTION_STAGES[selectedStage] ?? EVOLUTION_STAGES[0];
  const selectedRequirementRows = buildRequirementRows(selected, petData);
  const isSelectedUnlocked = selected.stage <= currentStage;
  const selectedArtUrl =
    selected.stage === 0 ? '/assets/pets/egg.svg' : getPetImageUrl(resolvedPetType, 'normal', selected.stage);
  const detailScale = Math.min(selectionScale + 0.14, 1.42);

  const renderArtFrame = (
    stageIndex: number,
    artUrl: string,
    locked: boolean,
    sizeClass: string,
    scale: number,
    emphasize = false
  ) => {
    const appearance = getStageAppearance(stageIndex);
    const glowStyle = appearance.glowEffect
      ? { filter: 'drop-shadow(0 0 18px rgba(250, 204, 21, 0.36))' }
      : undefined;

    return (
      <div
        className={`relative overflow-hidden rounded-[28px] border bg-gradient-to-b ${getStageAccent(stageIndex)} ${getStageBorder(stageIndex)} ${sizeClass}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_46%)]" />
        <div className="absolute inset-3 rounded-[22px] border border-white/8" />
        {artUrl ? (
          <img
            src={artUrl}
            alt={petConfig.displayName}
            className={`h-full w-full object-contain transition duration-300 ${locked ? 'opacity-40 blur-[1px] saturate-0' : ''}`}
            style={{ ...glowStyle, transform: `scale(${scale})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">{petConfig.icon}</div>
        )}
        {emphasize && appearance.specialEffect === 'legendary' && (
          <div className="absolute inset-0 rounded-[28px] border border-yellow-200/30 shadow-[0_0_32px_rgba(250,204,21,0.18)]" />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
            <div className="rounded-full border border-white/10 bg-slate-950/80 p-3 text-white">
              <Lock className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 14 }}
        className="relative flex h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#0f172a,#020617)] shadow-[0_36px_100px_rgba(2,6,23,0.62)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_34%),linear-gradient(135deg,rgba(59,130,246,0.08),transparent_40%)]" />

        <div className="relative border-b border-white/10 px-6 py-5 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                <Star className="h-4 w-4" />
                Pet Atlas
              </div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">进化图鉴</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                当前图鉴已对齐 `camp-pk-system` 的高质量演进素材，所有阶段展示、挂件渲染和跟随形态保持同源。
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="关闭进化图鉴"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('evolution')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === 'evolution'
                  ? 'bg-sky-500 text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.22)]'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              进化路线
            </button>
            <button
              onClick={() => setActiveTab('eggs')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === 'eggs'
                  ? 'bg-sky-500 text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.22)]'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              蛋仓库
            </button>
            <div className="ml-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              当前伙伴：{petConfig.displayName}
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {activeTab === 'evolution' ? (
            <div className="flex h-full flex-col overflow-hidden lg:flex-row">
              <div className="w-full shrink-0 overflow-y-auto border-b border-white/10 bg-slate-950/35 px-4 py-4 lg:w-[360px] lg:border-b-0 lg:border-r lg:px-5">
                <div className="space-y-3">
                  {stageCards.map(({ stage, unlocked, artUrl }) => {
                    const isCurrent = stage.stage === currentStage;
                    const isSelected = stage.stage === selectedStage;

                    return (
                      <button
                        key={stage.stage}
                        onClick={() => setSelectedStage(stage.stage)}
                        className={`w-full rounded-[24px] border p-3 text-left transition ${
                          isSelected
                            ? 'border-sky-300/60 bg-sky-400/10 shadow-[0_18px_40px_rgba(14,165,233,0.14)]'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-20 w-20 shrink-0">
                            {renderArtFrame(stage.stage, artUrl, !unlocked, 'h-20 w-20', Math.min(selectionScale + 0.08, 1.3))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-base font-semibold text-white">{stage.name}</div>
                              {isCurrent && (
                                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                                  当前
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-slate-400">{stage.description}</div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className={unlocked ? 'text-slate-300' : 'text-slate-500'}>
                                {stage.stage === 0 ? '孵化前' : `Lv.${stage.minLevel}+`}
                              </span>
                              <span className={unlocked ? 'text-sky-300' : 'text-slate-500'}>
                                {unlocked ? '已解锁' : '未解锁'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
                <motion.div
                  key={`${activeTab}-${selectedStage}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {selected.stage === 0 ? '孵化阶段' : `第 ${selected.stage} 阶`}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs ${isSelectedUnlocked ? 'bg-emerald-400/15 text-emerald-200' : 'bg-slate-700/70 text-slate-300'}`}>
                          {isSelectedUnlocked ? '已解锁形态' : '待解锁形态'}
                        </span>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
                        <div className="mx-auto h-[320px] w-full max-w-[320px]">
                          {renderArtFrame(
                            selected.stage,
                            selectedArtUrl,
                            !isSelectedUnlocked,
                            'h-[320px] w-full',
                            detailScale,
                            true
                          )}
                        </div>

                        <div className="flex flex-col justify-center">
                          <div className="text-sm uppercase tracking-[0.22em] text-slate-400">{petConfig.displayName}</div>
                          <h3 className="mt-2 text-3xl font-bold text-white">{selected.name}</h3>
                          <p className="mt-3 text-sm leading-7 text-slate-300">{selected.description}</p>

                          <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <div className="text-xs text-slate-400">当前等级</div>
                              <div className="mt-2 text-2xl font-semibold text-white">Lv.{petData.level}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <div className="text-xs text-slate-400">亲密度</div>
                              <div className="mt-2 text-2xl font-semibold text-white">{petData.intimacy}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                              <div className="text-xs text-slate-400">毅力</div>
                              <div className="mt-2 text-2xl font-semibold text-white">{persistence}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                        <div className="mb-4 flex items-center gap-2 text-white">
                          <TrendingUp className="h-5 w-5 text-sky-300" />
                          <h4 className="text-lg font-semibold">解锁条件</h4>
                        </div>
                        <div className="space-y-3">
                          {selectedRequirementRows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3"
                            >
                              <span className="text-sm text-slate-300">{row.label}</span>
                              <span className={`text-sm font-semibold ${row.met ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {row.current} / {row.target}
                              </span>
                            </div>
                          ))}
                        </div>

                        {selected.stage === currentStage + 1 && (
                          <div
                            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                              evolutionCheck.canEvolve
                                ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200'
                                : 'border-amber-300/20 bg-amber-400/10 text-amber-100'
                            }`}
                          >
                            {evolutionCheck.canEvolve
                              ? '当前条件已满足，可以直接进行下一次进化。'
                              : evolutionCheck.reason || '继续培养当前伙伴，满足条件后可进化。'}
                          </div>
                        )}
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                        <div className="mb-4 flex items-center gap-2 text-white">
                          <Sparkles className="h-5 w-5 text-violet-300" />
                          <h4 className="text-lg font-semibold">成长进度</h4>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                            <span>下一阶段目标</span>
                            <span>
                              {nextStage ? `${evolutionProgress}%` : '已满阶'}
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, evolutionProgress))}%` }}
                            />
                          </div>
                          <div className="mt-3 text-sm text-slate-400">
                            {nextStage
                              ? `距离 ${nextStage.name} 还差最后一段养成进度。`
                              : '当前已经达到最高进化阶段。'}
                          </div>
                        </div>
                      </div>

                      {selected.stage > 1 && (
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                          <div className="mb-4 flex items-center gap-2 text-white">
                            <Star className="h-5 w-5 text-amber-300" />
                            <h4 className="text-lg font-semibold">阶段奖励</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3 text-slate-200">
                              金币 +{selected.rewards.coins}
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3 text-slate-200">
                              全属性 +{selected.rewards.attributeBonus}
                            </div>
                            {selected.rewards.food.map((food) => (
                              <div
                                key={food.id}
                                className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3 text-slate-200"
                              >
                                {food.id} x{food.quantity}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-white">宠物蛋仓库</h3>
                  <p className="mt-1 text-sm text-slate-400">这里保留尚未孵化的蛋，方便你统一查看成长起点。</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  共 {eggPets.length} 枚
                </div>
              </div>

              {eggPets.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {eggPets.map((egg) => (
                    <PetEggDisplay key={egg.id} pet={egg} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
                  <img
                    src="/assets/pets/egg.svg"
                    alt="神秘的蛋"
                    className="mx-auto h-24 w-20 object-contain"
                  />
                  <h3 className="mt-4 text-xl font-semibold text-white">暂无宠物蛋</h3>
                  <p className="mt-2 text-sm text-slate-400">完成签到、成就或后续活动奖励后，新蛋会自动出现在这里。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
