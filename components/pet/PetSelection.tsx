'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  PET_CONFIGS,
  PET_STYLE_GROUPS,
  PetStyle,
  PetType,
} from '@/types/pet';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale } from '@/lib/config/petArtworkProfiles';
import { Heart, Sparkles, Stars, Telescope, Waves, X } from 'lucide-react';

interface PetSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (petType: PetType, petStyle: PetStyle, name: string) => void;
}

type SelectableStyle = keyof typeof PET_STYLE_GROUPS;

const STYLE_META: Record<SelectableStyle, {
  title: string;
  subtitle: string;
  icon: ReactNode;
  shell: string;
  border: string;
  chips: string[];
}> = {
  cute: {
    title: '暖心伙伴',
    subtitle: '更强调陪伴、治愈和家园氛围，适合想要高频互动的玩家。',
    icon: <Heart className="h-10 w-10 text-rose-300" />,
    shell: 'from-rose-950 via-fuchsia-950 to-slate-950',
    border: 'border-rose-400/40',
    chips: ['陪伴感', '治愈系', '毛绒感', '轻松风'],
  },
  tech: {
    title: '灵感伙伴',
    subtitle: '轮廓更利落，适合开放世界跟随和战斗展示，辨识度很强。',
    icon: <Waves className="h-10 w-10 text-cyan-300" />,
    shell: 'from-cyan-950 via-sky-950 to-slate-900',
    border: 'border-cyan-400/40',
    chips: ['战斗感', '机能风', '速度感', '灵能系'],
  },
  mythic: {
    title: '传说伙伴',
    subtitle: '压迫感和仪式感最强，适合做终阶目标和图鉴收藏主角。',
    icon: <Stars className="h-10 w-10 text-amber-300" />,
    shell: 'from-amber-950 via-orange-950 to-stone-950',
    border: 'border-amber-400/40',
    chips: ['传说线', '压迫感', '终阶型', '高光感'],
  },
};

const TYPE_CHIPS: Record<SelectableStyle, string[]> = {
  cute: ['陪伴系', '收藏系', '治愈系', '元气系', '轻互动'],
  tech: ['灵能系', '机能系', '战斗系', '探索系'],
  mythic: ['传说系', '高压系', '仪式感', '终阶型'],
};

function PetArtPreview({
  petType,
  sizeClass,
  evolutionStage = 1,
  className = '',
}: {
  petType: PetType;
  sizeClass: string;
  evolutionStage?: number;
  className?: string;
}) {
  const src = getPetImageUrl(petType, 'normal', evolutionStage);
  const selectionScale = getPetVariantScale(petType, 'selection');
  if (!src) {
    return (
      <span className={`${sizeClass} flex items-center justify-center text-3xl`}>
        {PET_CONFIGS[petType].icon}
      </span>
    );
  }

  return (
    <div className={`${sizeClass} relative flex items-center justify-center ${className}`.trim()}>
      <img
        src={src}
        alt={PET_CONFIGS[petType].displayName}
        className="pet-sprite pet-sprite-catalog h-full w-full object-contain drop-shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
        style={{ transform: `scale(${selectionScale})` }}
      />
    </div>
  );
}

export default function PetSelection({ isOpen, onClose, onSelect }: PetSelectionProps) {
  const [selectedStyle, setSelectedStyle] = useState<SelectableStyle | null>(null);
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [petName, setPetName] = useState('');
  const [step, setStep] = useState<'style' | 'type' | 'name'>('style');

  const availablePets = useMemo(() => {
    if (!selectedStyle) return [];
    return PET_STYLE_GROUPS[selectedStyle];
  }, [selectedStyle]);

  if (!isOpen) return null;

  const handleStyleSelect = (style: SelectableStyle) => {
    setSelectedStyle(style);
    setSelectedType(null);
    setPetName('');
    setStep('type');
  };

  const handleTypeSelect = (type: PetType) => {
    setSelectedType(type);
    setPetName('');
    setStep('name');
  };

  const handleBack = () => {
    if (step === 'name') {
      setSelectedType(null);
      setStep('type');
      return;
    }
    if (step === 'type') {
      setSelectedStyle(null);
      setStep('style');
    }
  };

  const handleConfirm = () => {
    if (!selectedStyle || !selectedType) return;
    onSelect(selectedType, selectedStyle, petName.trim() || PET_CONFIGS[selectedType].displayName);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        data-testid="pet-selection-modal"
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#090d14] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      >
        <div className="relative overflow-hidden rounded-[28px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]" />
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute right-0 top-16 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-400">
                  <Sparkles className="h-4 w-4" />
                  宠物孵化台
                </div>
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  {step === 'style' && '从 20 只体系化宠物里挑选你的新伙伴'}
                  {step === 'type' && `选择 ${selectedStyle ? STYLE_META[selectedStyle].title : '宠物'} 外观`}
                  {step === 'name' && '给新伙伴起一个名字'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  当前孵化池已统一替换为来自 `camp-pk-system` 的透明背景成体系素材。
                  选卡里展示的就是孵化后的真实轮廓，不再使用白底蛋图当作初始形态。
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭宠物选择"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
              <div className={`rounded-full px-3 py-1 ${step === 'style' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>1. 风格</div>
              <div className={`rounded-full px-3 py-1 ${step === 'type' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>2. 宠物</div>
              <div className={`rounded-full px-3 py-1 ${step === 'name' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>3. 命名</div>
            </div>

            {step === 'style' && (
              <div className="grid gap-5 md:grid-cols-3">
                {(Object.keys(STYLE_META) as SelectableStyle[]).map((styleKey) => {
                  const meta = STYLE_META[styleKey];
                  const stylePets = PET_STYLE_GROUPS[styleKey];
                  return (
                    <motion.button
                      key={styleKey}
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleStyleSelect(styleKey)}
                      data-testid={`pet-style-${styleKey}`}
                      className={`relative overflow-hidden rounded-[24px] border p-5 text-left ${meta.border} bg-gradient-to-br ${meta.shell}`}
                    >
                      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
                      <div className="relative flex h-full flex-col gap-5">
                        <div className="flex items-center justify-between">
                          {meta.icon}
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <span>{stylePets.length} 只可选</span>
                            <Telescope className="h-5 w-5 text-white/45" />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white">{meta.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-200/90">{meta.subtitle}</p>
                        </div>

                        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/15 p-4">
                          {stylePets.slice(0, 4).map((petType) => (
                            <PetArtPreview key={petType} petType={petType} sizeClass="h-16 w-16 md:h-20 md:w-20" />
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {meta.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] text-slate-200/85"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {step === 'type' && selectedStyle && (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-300">
                    当前风格共 <span className="font-semibold text-white">{availablePets.length}</span> 只可孵化宠物，
                    所有卡片左侧都是孵化后的起始轮廓，右侧是高阶形态。
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {STYLE_META[selectedStyle].title}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {availablePets.map((petType, index) => {
                    const config = PET_CONFIGS[petType];
                    const evolvedPreview = getPetImageUrl(petType, 'normal', 5);
                    const chipOptions = TYPE_CHIPS[selectedStyle];

                    return (
                      <motion.button
                        key={petType}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleTypeSelect(petType)}
                        data-testid={`pet-type-${petType}`}
                        className="rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/75 to-slate-950 p-4 text-left shadow-[0_18px_40px_rgba(2,6,23,0.2)] transition hover:border-white/20"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/90">
                            {chipOptions[index % chipOptions.length]}
                          </span>
                          <span className="text-xs text-slate-400">{index + 1}/{availablePets.length}</span>
                        </div>

                        <div className="relative mb-4 rounded-[22px] border border-white/10 bg-black/25 px-3 pb-4 pt-4">
                          <div className="flex items-end justify-center gap-3">
                            <div className="text-center">
                              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">起始</div>
                              <PetArtPreview petType={petType} evolutionStage={1} sizeClass="h-20 w-20 md:h-24 md:w-24" />
                            </div>
                            <div className="pb-4 text-slate-500">→</div>
                            <div className="text-center">
                              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">高阶</div>
                              {evolvedPreview ? (
                                <PetArtPreview petType={petType} evolutionStage={5} sizeClass="h-20 w-20 md:h-24 md:w-24" />
                              ) : (
                                <PetArtPreview petType={petType} evolutionStage={1} sizeClass="h-20 w-20 md:h-24 md:w-24" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-white">{config.displayName}</h3>
                          <p className="text-sm leading-6 text-slate-300">{config.description}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleBack}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    返回风格选择
                  </button>
                </div>
              </div>
            )}

            {step === 'name' && selectedType && (
              <div className="mx-auto max-w-xl">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="mb-6 flex flex-col items-center gap-4 text-center">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),rgba(14,165,233,0.08),transparent_72%)] blur-2xl" />
                      <PetArtPreview petType={selectedType} evolutionStage={1} sizeClass="h-40 w-40" className="relative" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{PET_CONFIGS[selectedType].displayName}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{PET_CONFIGS[selectedType].description}</p>
                    </div>
                  </div>

                  <label className="mb-2 block text-sm text-slate-200">给它取个名字</label>
                  <input
                    type="text"
                    value={petName}
                    onChange={(event) => setPetName(event.target.value)}
                    placeholder={PET_CONFIGS[selectedType].displayName}
                    maxLength={12}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  />
                  <p className="mt-2 text-xs text-slate-400">最多 12 个字符，留空时会使用默认名字。</p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleBack}
                      className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-slate-200 transition hover:bg-white/10"
                    >
                      返回宠物列表
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-105"
                    >
                      确认孵化
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
