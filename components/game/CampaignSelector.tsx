"use client";

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { Campaign, CampaignLevel, getAllCampaigns } from '@/lib/campaigns';
import { formatSkillRewardText } from '@/lib/skills';
import { useGameStore } from '@/store/gameStore';
import { AgeGroup, AGE_GROUP_INFO } from '@/types/ageGroup';
import AgeGroupSelector from './AgeGroupSelector';
import { buildCampaignRuleText } from '@/lib/gameplayText';
import { resolveCompatibleCampaignProgress } from '@/lib/campaignProgress';

type CampaignIconSize = 'card' | 'hero';

const playSound = (soundPath: string, volume = 0.5) => {
  try {
    const audio = new Audio(soundPath);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
};

const getRewardSkillText = (rewards: CampaignLevel['rewards']) => {
  const rewardSkills = [
    ...(rewards.skills ?? []),
    ...((rewards as any).skill ? [(rewards as any).skill] : []),
  ];

  return rewardSkills.length > 0 ? formatSkillRewardText(rewardSkills) : '';
};

const CAMPAIGN_ACCENTS: Record<
  string,
  {
    shell: string;
    glow: string;
    chip: string;
  }
> = {
  campaign_11: {
    shell: 'from-stone-500/28 via-orange-400/16 to-red-400/12',
    glow: 'shadow-[0_26px_60px_rgba(190,110,72,0.20)]',
    chip: 'bg-orange-400/16 text-orange-100 border-orange-200/18',
  },
  campaign_12: {
    shell: 'from-emerald-400/28 via-cyan-300/14 to-sky-400/12',
    glow: 'shadow-[0_26px_60px_rgba(72,190,167,0.22)]',
    chip: 'bg-emerald-400/16 text-emerald-50 border-emerald-200/18',
  },
  campaign_13: {
    shell: 'from-violet-400/28 via-fuchsia-300/16 to-sky-300/10',
    glow: 'shadow-[0_26px_60px_rgba(144,110,242,0.22)]',
    chip: 'bg-violet-400/16 text-violet-50 border-violet-200/18',
  },
  campaign_14: {
    shell: 'from-amber-300/30 via-orange-300/18 to-emerald-300/12',
    glow: 'shadow-[0_26px_60px_rgba(236,168,78,0.22)]',
    chip: 'bg-amber-400/16 text-amber-50 border-amber-200/18',
  },
  campaign_15: {
    shell: 'from-amber-400/26 via-stone-300/16 to-sky-200/10',
    glow: 'shadow-[0_26px_60px_rgba(194,154,88,0.22)]',
    chip: 'bg-stone-200/14 text-stone-50 border-stone-100/16',
  },
  campaign_16: {
    shell: 'from-cyan-300/24 via-sky-200/16 to-slate-300/10',
    glow: 'shadow-[0_26px_60px_rgba(105,181,209,0.22)]',
    chip: 'bg-cyan-300/16 text-cyan-50 border-cyan-100/18',
  },
};

const getCampaignAccent = (campaignId: string) =>
  CAMPAIGN_ACCENTS[campaignId] ?? {
    shell: 'from-slate-400/24 via-slate-300/14 to-white/6',
    glow: 'shadow-[0_26px_60px_rgba(148,163,184,0.18)]',
    chip: 'bg-slate-300/14 text-slate-50 border-slate-100/14',
  };

const getCampaignPreviewText = (campaignId: string) => {
  switch (campaignId) {
    case 'campaign_12':
      return '瀑布山谷、蘑菇平台和轻快跳跃，先做成第一套样板场景。';
    case 'campaign_13':
      return '镜像机关和反向路径更强，适合做出层次丰富的像素冒险感。';
    case 'campaign_14':
      return '节拍机关和风元素适合做更鲜明的动作反馈与场景节奏。';
    case 'campaign_15':
      return '工坊区可以承接机械平台、齿轮、升降台和机关门。';
    case 'campaign_16':
      return '水坝和工业设施适合做终局关卡的压迫感与视觉纵深。';
    default:
      return '选择一张战役地图，进入更像冒险岛风格的平台挑战。';
  }
};

const getLocationEmoji = () => '🗺️';

interface CampaignSelectorProps {
  onSelectCampaign: (campaign: Campaign, levelIndex?: number, ageGroup?: AgeGroup) => void;
  onClose: () => void;
}

export default function CampaignSelector({ onSelectCampaign, onClose }: CampaignSelectorProps) {
  const {
    completedCampaigns,
    completedCampaignLevels,
    selectedAgeGroup,
    setSelectedAgeGroup,
    ageGroupCampaignProgress,
  } = useGameStore();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showAgeSelector, setShowAgeSelector] = useState(!selectedAgeGroup);
  const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | null>(selectedAgeGroup);

  useEffect(() => {
    if (selectedAgeGroup && !currentAgeGroup) {
      setCurrentAgeGroup(selectedAgeGroup);
    }
  }, [selectedAgeGroup, currentAgeGroup]);

  const allCampaigns = getAllCampaigns();
  const activeAgeGroup = currentAgeGroup || selectedAgeGroup;
  const ageProgress = activeAgeGroup ? ageGroupCampaignProgress[activeAgeGroup] : null;

  const {
    completedCampaignIds: ageGroupCompletedCampaigns,
    completedLevelIds: ageGroupCompletedLevels,
  } = resolveCompatibleCampaignProgress({
    activeAgeGroup,
    ageProgress,
    completedCampaigns,
    completedCampaignLevels,
  });

  const handleAgeGroupSelect = (ageGroup: AgeGroup) => {
    setCurrentAgeGroup(ageGroup);
    setSelectedAgeGroup(ageGroup);
    setShowAgeSelector(false);
    playSound('/sounds/button_click.wav', 0.4);
  };

  if (showAgeSelector) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      >
        <AgeGroupSelector onSelect={handleAgeGroupSelect} onBack={onClose} />
      </div>
    );
  }

  const renderCampaignLocationIcon = (campaign: Campaign, size: CampaignIconSize = 'card') => {
    const iconSize = size === 'hero' ? 116 : 72;
    const stroke = size === 'hero' ? 3.5 : 3;
    const containerClass =
      size === 'hero'
        ? 'mx-auto sm:mx-0 flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/10 bg-slate-950/28 shadow-[0_18px_40px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.14)]'
        : 'mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-slate-950/28 shadow-[0_12px_26px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]';

    const renderDoorGlyph = (accent: string, fill: string) => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <path
          d="M48 8L71 22V54C71 70 61 82 48 88C35 82 25 70 25 54V22L48 8Z"
          fill={fill}
          stroke="#101828"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        <path d="M48 18V78" stroke={accent} strokeWidth={stroke} strokeLinecap="round" />
        <circle cx="48" cy="18" r="12" fill={accent} stroke="#101828" strokeWidth={stroke} />
        <path d="M39 56C43 51 53 51 57 56" stroke={accent} strokeWidth={stroke - 0.8} strokeLinecap="round" />
        <circle cx="54" cy="46" r="2.7" fill={accent} />
      </svg>
    );

    const renderValleyGlyph = () => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M14 72L32 32L48 58L64 28L82 72H14Z" fill="#4B5563" stroke="#0F172A" strokeWidth={stroke} strokeLinejoin="round" />
        <path d="M12 72C18 68 24 65 31 65C39 65 44 70 48 76C52 70 57 65 65 65C72 65 78 68 84 72" fill="none" stroke="#9BE7FF" strokeWidth={stroke} strokeLinecap="round" />
        <path d="M22 62L30 47L38 62" fill="none" stroke="#D8F5FF" strokeWidth={stroke - 0.8} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="66" cy="22" r="8" fill="#B8ECFF" stroke="#0F172A" strokeWidth={stroke - 0.6} />
      </svg>
    );

    const renderMirrorGlyph = () => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="18" y="16" width="60" height="64" rx="16" fill="#5B5FC7" stroke="#161B44" strokeWidth={stroke} />
        <rect x="28" y="24" width="40" height="48" rx="12" fill="#D9ECFF" stroke="#161B44" strokeWidth={stroke - 0.8} />
        <path d="M48 28V68" stroke="#7A58D6" strokeWidth={stroke} strokeLinecap="round" />
        <path d="M35 38L44 47L35 56" fill="none" stroke="#58BFFF" strokeWidth={stroke - 0.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M61 38L52 47L61 56" fill="none" stroke="#FF8DE1" strokeWidth={stroke - 0.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

    const renderWindGlyph = () => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="48" cy="48" r="12" fill="#F7C66A" stroke="#5A3217" strokeWidth={stroke} />
        <path d="M48 16C58 20 64 26 66 36C58 38 52 38 48 36V16Z" fill="#7FCB67" stroke="#28431F" strokeWidth={stroke - 0.8} strokeLinejoin="round" />
        <path d="M80 48C76 58 70 64 60 66C58 58 58 52 60 48H80Z" fill="#F2A94A" stroke="#5A3217" strokeWidth={stroke - 0.8} strokeLinejoin="round" />
        <path d="M48 80C38 76 32 70 30 60C38 58 44 58 48 60V80Z" fill="#54B2E8" stroke="#1C4161" strokeWidth={stroke - 0.8} strokeLinejoin="round" />
        <path d="M16 48C20 38 26 32 36 30C38 38 38 44 36 48H16Z" fill="#D96B57" stroke="#5E221A" strokeWidth={stroke - 0.8} strokeLinejoin="round" />
        <path d="M71 22C77 28 80 34 80 42" fill="none" stroke="#DDF7FF" strokeWidth={stroke - 1} strokeLinecap="round" />
        <path d="M68 28C72 32 74 36 74 40" fill="none" stroke="#DDF7FF" strokeWidth={stroke - 1} strokeLinecap="round" />
      </svg>
    );

    const renderWorkshopGlyph = () => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="20" y="18" width="42" height="54" rx="10" fill="#9C6A3D" stroke="#311C12" strokeWidth={stroke} />
        <path d="M30 28H52M30 38H48M30 48H50" stroke="#FCE8B2" strokeWidth={stroke - 1} strokeLinecap="round" />
        <path d="M36 58L44 50L52 58" fill="none" stroke="#FCE8B2" strokeWidth={stroke - 1} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="67" cy="56" r="14" fill="#4D6A88" stroke="#162534" strokeWidth={stroke} />
        <circle cx="67" cy="56" r="5" fill="#D6EFFD" stroke="#162534" strokeWidth={stroke - 1} />
        <path d="M67 35V28M67 84V77M46 56H39M95 56H88M52 41L47 36M82 76L77 71M82 36L77 41M52 71L47 76" stroke="#162534" strokeWidth={stroke - 0.8} strokeLinecap="round" />
      </svg>
    );

    const renderDamGlyph = () => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M22 24H60C70 24 76 30 76 40V72H22V24Z" fill="#5D7C92" stroke="#172634" strokeWidth={stroke} strokeLinejoin="round" />
        <path d="M32 24V72M44 24V72M56 24V72" stroke="#CFF3FF" strokeWidth={stroke - 1} opacity="0.7" />
        <path d="M76 42C83 46 86 51 86 58C86 65 83 70 76 74" fill="none" stroke="#97E8FF" strokeWidth={stroke} strokeLinecap="round" />
        <path d="M14 76C22 71 30 69 38 69C46 69 54 71 62 76C70 81 78 83 86 83" fill="none" stroke="#8CDFFF" strokeWidth={stroke - 0.6} strokeLinecap="round" />
        <path d="M14 66C22 61 30 59 38 59C46 59 54 61 62 66C70 71 78 73 86 73" fill="none" stroke="#66C7FF" strokeWidth={stroke - 1} strokeLinecap="round" opacity="0.9" />
      </svg>
    );

    const fallback = (
      <span className={size === 'hero' ? 'text-6xl sm:text-7xl' : 'text-4xl sm:text-5xl'}>
        {getLocationEmoji()}
      </span>
    );

    let iconNode: React.ReactNode = fallback;
    switch (campaign.id) {
      case 'campaign_11':
        iconNode = renderDoorGlyph('#D86B55', '#48515F');
        break;
      case 'campaign_12':
        iconNode = renderValleyGlyph();
        break;
      case 'campaign_13':
        iconNode = renderMirrorGlyph();
        break;
      case 'campaign_14':
        iconNode = renderWindGlyph();
        break;
      case 'campaign_15':
        iconNode = renderWorkshopGlyph();
        break;
      case 'campaign_16':
        iconNode = renderDamGlyph();
        break;
      default:
        break;
    }

    return <div className={containerClass}>{iconNode}</div>;
  };

  const isCampaignUnlocked = (campaign: Campaign) => {
    if (!campaign.unlockRequirement) return true;
    return ageGroupCompletedCampaigns.includes(campaign.unlockRequirement);
  };

  const isCampaignCompleted = (campaignId: string) => ageGroupCompletedCampaigns.includes(campaignId);

  const isLevelCompleted = (levelId: string): boolean => ageGroupCompletedLevels.includes(levelId);

  const isLevelUnlocked = (campaign: Campaign, levelIndex: number): boolean => {
    if (!isCampaignUnlocked(campaign)) return false;
    const currentLevel = campaign.levels[levelIndex];
    if (!currentLevel) return false;
    if (isLevelCompleted(currentLevel.id)) return true;
    if (isCampaignCompleted(campaign.id)) return true;
    if (levelIndex === 0) return true;

    const previousLevel = campaign.levels[levelIndex - 1];
    return Boolean(previousLevel && isLevelCompleted(previousLevel.id));
  };

  const getLevelStatusText = (campaign: Campaign, levelIndex: number): 'done' | 'ready' | 'locked' => {
    const level = campaign.levels[levelIndex];
    if (isLevelCompleted(level.id)) return 'done';
    if (isLevelUnlocked(campaign, levelIndex)) return 'ready';
    return 'locked';
  };

  const totalCompletedCampaigns = allCampaigns.filter((campaign) => isCampaignCompleted(campaign.id)).length;
  const totalCompletedLevels = ageGroupCompletedLevels.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,#20507a_0%,#121a33_36%,#080d17_100%)] p-2 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950/72 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:mx-4 sm:max-h-[92vh] sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/14 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-sky-100/70">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Campaign Adventure</span>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-4xl">宜昌猇亭冒险战役</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="rounded-full border border-emerald-200/16 bg-emerald-300/10 px-3 py-1 text-emerald-100">
                已完成 {totalCompletedCampaigns}/{allCampaigns.length} 张战役地图
              </span>
              <span className="rounded-full border border-slate-200/12 bg-white/6 px-3 py-1 text-slate-200">
                已解锁关卡 {totalCompletedLevels}
              </span>
              {selectedAgeGroup && (
                <button
                  onClick={() => setShowAgeSelector(true)}
                  className="rounded-full border border-sky-200/16 bg-sky-400/12 px-3 py-1 text-sky-100 transition-colors hover:bg-sky-400/20"
                >
                  {AGE_GROUP_INFO[selectedAgeGroup].name}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-2xl text-white/75 transition-all hover:-translate-y-0.5 hover:bg-white/12 hover:text-white"
            aria-label="关闭战役选择"
          >
            ×
          </button>
        </div>

        {!selectedCampaign ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {allCampaigns.map((campaign, index) => {
              const accent = getCampaignAccent(campaign.id);
              const isUnlocked = isCampaignUnlocked(campaign);
              const isCompleted = isCampaignCompleted(campaign.id);
              const completedLevelCount = campaign.levels.filter((level) => isLevelCompleted(level.id)).length;

              return (
                <div
                  key={campaign.id}
                  data-campaign-id={campaign.id}
                  className={`group relative overflow-hidden rounded-[28px] border p-5 transition-all sm:p-6 ${
                    isUnlocked
                      ? `cursor-pointer border-white/10 bg-slate-900/78 hover:-translate-y-1 hover:border-sky-200/26 ${accent.glow}`
                      : 'cursor-not-allowed border-white/8 bg-slate-950/64 opacity-60'
                  }`}
                  onClick={() => {
                    if (isUnlocked) {
                      playSound('/sounds/button_click.wav', 0.4);
                      setSelectedCampaign(campaign);
                    }
                  }}
                  onMouseEnter={() => isUnlocked && playSound('/sounds/button_hover.wav', 0.2)}
                >
                  <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${accent.shell} opacity-90`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_50%)]" />

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/28 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/20 bg-emerald-300/14 px-3 py-1 text-xs font-semibold text-emerald-100">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            已通关
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/18 bg-amber-300/14 px-3 py-1 text-xs font-semibold text-amber-50">
                            <Lock className="h-3.5 w-3.5" />
                            未解锁
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 text-center">
                      {renderCampaignLocationIcon(campaign, 'card')}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white sm:text-xl">{campaign.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-200/78">
                        <MapPin className="h-4 w-4 text-sky-200/75" />
                        <span>{campaign.location}</span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-slate-200/76">{campaign.description}</p>
                      <p className="line-clamp-2 text-xs leading-5 text-slate-400">{getCampaignPreviewText(campaign.id)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full border px-3 py-1 ${accent.chip}`}>{campaign.theme}</span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-slate-100">
                        {completedLevelCount}/{campaign.levels.length} 关
                      </span>
                      <span className="rounded-full border border-yellow-200/16 bg-yellow-300/12 px-3 py-1 text-yellow-50">
                        +{campaign.rewards.xp} XP
                      </span>
                    </div>

                    {!isUnlocked && campaign.unlockRequirement && (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-xs leading-5 text-slate-300">
                        解锁条件：先完成
                        {' '}
                        {allCampaigns.find((item) => item.id === campaign.unlockRequirement)?.name}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-sm">
                      <span className="text-slate-300">进入战役地图</span>
                      <span className="inline-flex items-center gap-1 text-sky-100">
                        查看关卡
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-100 transition-all hover:-translate-y-0.5 hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              返回战役列表
            </button>

            <div className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/78 p-5 sm:p-8 ${getCampaignAccent(selectedCampaign.id).glow}`}>
              <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-r ${getCampaignAccent(selectedCampaign.id).shell}`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_42%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                {renderCampaignLocationIcon(selectedCampaign, 'hero')}
                <div className="flex-1 text-center sm:text-left">
                  <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className={`rounded-full border px-3 py-1 text-xs ${getCampaignAccent(selectedCampaign.id).chip}`}>
                      {selectedCampaign.theme}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-100">
                      {selectedCampaign.levels.length} 个关卡
                    </span>
                    <span className="rounded-full border border-yellow-200/16 bg-yellow-300/12 px-3 py-1 text-xs text-yellow-50">
                      +{selectedCampaign.rewards.xp} XP
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-white">{selectedCampaign.name}</h2>
                  <p className="mt-2 inline-flex items-center gap-2 text-base text-sky-100/88">
                    <MapPin className="h-4 w-4" />
                    {selectedCampaign.location}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-100/82 sm:text-base">{selectedCampaign.story}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-sky-200/12 bg-sky-300/8 p-4 text-left">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-100">
                        <Swords className="h-4 w-4" />
                        关卡规则
                      </div>
                      <p className="text-sm leading-6 text-slate-200/82">
                        先完成平台目标，再回答每关题目过关；失败后答对 1 题即可重新开始当前关。
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200/12 bg-amber-300/8 p-4 text-left">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-50">
                        <Trophy className="h-4 w-4" />
                        战役奖励
                      </div>
                      <p className="text-sm leading-6 text-slate-200/82">
                        通关整张地图可拿到经验、金币与称号奖励，后续会逐步换成更完整的角色与场景包。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white sm:text-2xl">关卡列表</h3>
                  <p className="mt-1 text-sm text-slate-300/78">先从已解锁关卡开始，战役进度会按年龄段独立记录。</p>
                </div>
                <div className="hidden rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200 sm:block">
                  已完成 {selectedCampaign.levels.filter((level) => isLevelCompleted(level.id)).length}/{selectedCampaign.levels.length}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {selectedCampaign.levels.map((level, index) => {
                  const unlocked = isLevelUnlocked(selectedCampaign, index);
                  const completed = isLevelCompleted(level.id);
                  const status = getLevelStatusText(selectedCampaign, index);
                  const rewardSkillText = getRewardSkillText(level.rewards);

                  return (
                    <div
                      key={level.id}
                      data-level-id={level.id}
                      className={`group relative overflow-hidden rounded-[24px] border p-4 transition-all sm:p-5 ${
                        unlocked
                          ? 'cursor-pointer border-white/10 bg-slate-900/76 hover:-translate-y-1 hover:border-sky-200/24 hover:shadow-[0_18px_46px_rgba(35,107,154,0.16)]'
                          : 'cursor-not-allowed border-white/8 bg-slate-950/64 opacity-60'
                      } ${completed ? 'ring-1 ring-emerald-200/18' : ''}`}
                      onClick={() => {
                        if (unlocked) {
                          playSound('/sounds/level_complete.wav', 0.5);
                          onSelectCampaign(selectedCampaign, index, currentAgeGroup || selectedAgeGroup || undefined);
                        }
                      }}
                      onMouseEnter={() => unlocked && playSound('/sounds/button_hover.wav', 0.2)}
                    >
                      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-white/10 to-transparent" />
                      <div className="relative">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white ${
                                completed
                                  ? 'bg-emerald-500/90'
                                  : unlocked
                                    ? 'bg-sky-500/90'
                                    : 'bg-slate-600/90'
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="pr-6 text-base font-bold text-white sm:text-lg">{level.name}</h4>
                              <p className="mt-1 text-xs text-slate-300/75">{level.questions.length} 道题目</p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              status === 'done'
                                ? 'border-emerald-200/18 bg-emerald-300/14 text-emerald-50'
                                : status === 'ready'
                                  ? 'border-sky-200/18 bg-sky-300/14 text-sky-50'
                                  : 'border-amber-200/18 bg-amber-300/14 text-amber-50'
                            }`}
                          >
                            {status === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'ready' ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {status === 'done' ? '已完成' : status === 'ready' ? '可挑战' : '未解锁'}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-sm leading-6 text-slate-200/82">{level.description}</p>

                        {level.story && (
                          <p className="mt-3 line-clamp-2 rounded-2xl border border-white/6 bg-black/16 px-3 py-3 text-xs italic leading-5 text-slate-300/72">
                            “{level.story}”
                          </p>
                        )}

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="rounded-2xl border border-sky-200/10 bg-sky-400/8 px-3 py-2 text-sky-50/90">
                            规则：{buildCampaignRuleText(level.questions.length)}
                          </div>
                          {rewardSkillText && (
                            <div className="rounded-2xl border border-violet-200/12 bg-violet-400/10 px-3 py-2 text-violet-50/90">
                              奖励技能：{rewardSkillText}
                            </div>
                          )}
                          {!unlocked && (
                            <div className="rounded-2xl border border-amber-200/12 bg-amber-300/10 px-3 py-2 text-amber-50/90">
                              解锁提示：先完成第 {index} 关。
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4 text-sm">
                          <span className="text-slate-200/82">+{level.rewards.xp} XP</span>
                          <span className="inline-flex items-center gap-1 text-sky-100">
                            {unlocked ? '开始冒险' : '等待解锁'}
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-200/82">
              点击已解锁关卡即可进入平台冒险。当前这轮升级只改前端视觉与素材表现，战役规则、题目和后端数据保持原样。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
