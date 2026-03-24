'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  NEW_CUTE_PETS,
  NEW_MYTHIC_PETS,
  NEW_TECH_PETS,
  PET_CONFIGS,
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

const STYLE_GROUPS: Record<'cute' | 'tech' | 'mythic', PetType[]> = {
  cute: NEW_CUTE_PETS,
  tech: NEW_TECH_PETS,
  mythic: NEW_MYTHIC_PETS,
};

const STYLE_META: Record<'cute' | 'tech' | 'mythic', {
  title: string;
  subtitle: string;
  icon: ReactNode;
  shell: string;
  border: string;
  copy: string;
}> = {
  cute: {
    title: '暖心伙伴',
    subtitle: '陪伴感强，适合刚开始建立宠物关系的时候。',
    icon: <Heart className="w-10 h-10 text-rose-300" />,
    shell: 'from-rose-100 via-orange-50 to-amber-100',
    border: 'border-rose-200',
    copy: '灰塔猫、乐跑猎犬、团子熊猫',
  },
  tech: {
    title: '灵感伙伴',
    subtitle: '节奏更鲜活，适合想让家园和世界里更有动态感的搭配。',
    icon: <Waves className="w-10 h-10 text-cyan-300" />,
    shell: 'from-cyan-950 via-sky-950 to-slate-900',
    border: 'border-cyan-400/40',
    copy: '灵光金鱼、破冰企鹅、冲刺虎崽',
  },
  mythic: {
    title: '传奇伙伴',
    subtitle: '气场更强，适合想把跟宠做成主视觉的玩家。',
    icon: <Stars className="w-10 h-10 text-amber-300" />,
    shell: 'from-amber-950 via-orange-950 to-stone-950',
    border: 'border-amber-400/40',
    copy: '狮王队长、长颈观察员、云团白猫',
  },
};

const TYPE_META: Record<string, {
  chip: string;
  focus: string;
  shell: string;
  border: string;
}> = {
  code_kitty: {
    chip: '观察系',
    focus: '安静、稳定、很有陪伴感',
    shell: 'from-orange-900/40 to-slate-950/70',
    border: 'border-orange-300/40',
  },
  algo_bunny: {
    chip: '活力系',
    focus: '更有冲劲，跟宠体态也更饱满',
    shell: 'from-amber-900/40 to-stone-950/70',
    border: 'border-amber-300/40',
  },
  shiba_debugger: {
    chip: '治愈系',
    focus: '进化前后都很讨喜，家园里存在感强',
    shell: 'from-slate-800/80 to-zinc-950/80',
    border: 'border-slate-300/40',
  },
  bit_bot: {
    chip: '灵动系',
    focus: '游动感强，开放世界跟随时更轻盈',
    shell: 'from-orange-950/80 to-red-950/80',
    border: 'border-orange-300/40',
  },
  data_sprite: {
    chip: '社交系',
    focus: '轮廓清晰，站在场景里识别度最高',
    shell: 'from-sky-950/80 to-slate-950/80',
    border: 'border-sky-300/40',
  },
  ava_ai: {
    chip: '冲线系',
    focus: '成长形态变化明显，适合做主力跟宠',
    shell: 'from-rose-950/80 to-stone-950/80',
    border: 'border-rose-300/40',
  },
  code_dragon: {
    chip: '领袖系',
    focus: '正面体量足，跟宠站位更压得住场',
    shell: 'from-amber-950/80 to-red-950/80',
    border: 'border-amber-300/40',
  },
  giraffe_oracle: {
    chip: '观察系',
    focus: '高挑轮廓很特别，远景里也容易认出来',
    shell: 'from-yellow-950/80 to-stone-950/80',
    border: 'border-yellow-300/40',
  },
  snow_cat: {
    chip: '氛围系',
    focus: '白底像云团，适合偏柔和的宠物风格',
    shell: 'from-slate-100/10 to-slate-950/80',
    border: 'border-slate-200/40',
  },
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
    return <span className={`${sizeClass} flex items-center justify-center text-3xl`}>{PET_CONFIGS[petType].icon}</span>;
  }

  return (
    <div className={`${sizeClass} relative flex items-center justify-center ${className}`.trim()}>
      <img
        src={src}
        alt={PET_CONFIGS[petType].displayName}
        className="w-full h-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.28)]"
        style={{ imageRendering: 'pixelated', transform: `scale(${selectionScale})` }}
      />
    </div>
  );
}

export default function PetSelection({ isOpen, onClose, onSelect }: PetSelectionProps) {
  const [selectedStyle, setSelectedStyle] = useState<PetStyle | null>(null);
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [petName, setPetName] = useState('');
  const [step, setStep] = useState<'style' | 'type' | 'name'>('style');

  const availablePets = useMemo(() => {
    if (!selectedStyle || !STYLE_GROUPS[selectedStyle as 'cute' | 'tech' | 'mythic']) {
      return [];
    }
    return STYLE_GROUPS[selectedStyle as 'cute' | 'tech' | 'mythic'];
  }, [selectedStyle]);

  if (!isOpen) return null;

  const handleStyleSelect = (style: PetStyle) => {
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
      setStep('type');
      setSelectedType(null);
      return;
    }
    if (step === 'type') {
      setStep('style');
      setSelectedStyle(null);
    }
  };

  const handleConfirm = () => {
    if (!selectedType || !selectedStyle) return;
    const finalName = petName.trim() || PET_CONFIGS[selectedType].displayName;
    onSelect(selectedType, selectedStyle, finalName);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-md px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[#090d14] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
      >
        <div className="relative overflow-hidden rounded-[28px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]" />
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute right-0 top-16 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative p-6 md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-400">
                  <Sparkles className="w-4 h-4" />
                  Pet Atelier
                </div>
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  {step === 'style' && '挑一组你喜欢的宠物气质'}
                  {step === 'type' && '从 9 只重制宠物里选你的伙伴'}
                  {step === 'name' && '给新伙伴起一个名字'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  当前宠物已替换为来自 `camp-pk-system` 的统一像素美术。选择卡会同时展示初始形态和高阶形态，所见即所得。
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭宠物选择"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
              <div className={`rounded-full px-3 py-1 ${step === 'style' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>1. 风格</div>
              <div className={`rounded-full px-3 py-1 ${step === 'type' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>2. 宠物</div>
              <div className={`rounded-full px-3 py-1 ${step === 'name' ? 'bg-white/12 text-white' : 'bg-white/5'}`}>3. 命名</div>
            </div>

            {step === 'style' && (
              <div className="grid gap-5 md:grid-cols-3">
                {(Object.keys(STYLE_META) as Array<'cute' | 'tech' | 'mythic'>).map((styleKey) => {
                  const meta = STYLE_META[styleKey];
                  return (
                    <motion.button
                      key={styleKey}
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleStyleSelect(styleKey)}
                      className={`relative overflow-hidden rounded-[24px] border p-5 text-left ${meta.border} bg-gradient-to-br ${meta.shell}`}
                    >
                      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
                      <div className="relative flex h-full flex-col gap-5">
                        <div className="flex items-center justify-between">
                          {meta.icon}
                          <Telescope className="w-5 h-5 text-white/45" />
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white">{meta.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-200/90">{meta.subtitle}</p>
                        </div>

                        <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                          {STYLE_GROUPS[styleKey].map((petType, index) => (
                            <div key={petType} className={index === 1 ? 'translate-y-2' : ''}>
                              <PetArtPreview petType={petType} sizeClass="w-16 h-16 md:w-20 md:h-20" />
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-xs leading-5 text-slate-200/85">
                          {meta.copy}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {step === 'type' && selectedStyle && (
              <div>
                <div className="grid gap-4 md:grid-cols-3">
                  {availablePets.map((petType) => {
                    const config = PET_CONFIGS[petType];
                    const meta = TYPE_META[petType];
                    const evolvedPreview = getPetImageUrl(petType, 'normal', 4);
                    const basePreview = getPetImageUrl(petType, 'normal', 1);
                    const hasEvolutionPreview = evolvedPreview && evolvedPreview !== basePreview;

                    return (
                      <motion.button
                        key={petType}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleTypeSelect(petType)}
                        className={`rounded-[24px] border bg-gradient-to-br p-4 text-left ${meta.shell} ${meta.border}`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/90">
                            {meta.chip}
                          </span>
                          <span className="text-xs text-slate-300">9 宠物重制</span>
                        </div>

                        <div className="relative mb-4 rounded-[22px] border border-white/10 bg-black/20 px-4 pb-5 pt-4">
                          <div className="flex items-end justify-center gap-6">
                            <div className="text-center">
                              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">初始</div>
                              <PetArtPreview petType={petType} evolutionStage={1} sizeClass="w-24 h-24" />
                            </div>
                            <div className="pb-5 text-slate-500">→</div>
                            <div className="text-center">
                              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                                {hasEvolutionPreview ? '高阶' : '常驻'}
                              </div>
                              <PetArtPreview petType={petType} evolutionStage={hasEvolutionPreview ? 4 : 1} sizeClass="w-24 h-24" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-white">{config.displayName}</h3>
                          <p className="text-sm leading-6 text-slate-300">{config.description}</p>
                          <div className="text-xs text-slate-400">{meta.focus}</div>
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
                      <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
                      <PetArtPreview petType={selectedType} evolutionStage={1} sizeClass="w-40 h-40" className="relative" />
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
                      className="flex-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-105"
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
