"use client";

import React, { useState, useCallback } from 'react';
import { Campaign, CampaignLevel, getAllCampaigns } from '@/lib/campaigns';
import { formatSkillRewardText } from '@/lib/skills';
import { useGameStore } from '@/store/gameStore';
import { AgeGroup, AGE_GROUP_INFO } from '@/types/ageGroup';
import AgeGroupSelector from './AgeGroupSelector';
import { buildCampaignRuleText } from '@/lib/gameplayText';
import { resolveCompatibleCampaignProgress } from '@/lib/campaignProgress';

type CampaignIconSize = 'card' | 'hero';

// 音效
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
    ageGroupCampaignProgress 
  } = useGameStore();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  // 🔥 只有在没有选择年龄段时才显示年龄选择器
  // 使用 useRef 来追踪是否是首次进入（从大厅进入）
  const [hasSelectedAgeThisSession, setHasSelectedAgeThisSession] = useState(false);
  // 如果已经选择过年龄段（本次会话），则不显示选择器
  const [showAgeSelector, setShowAgeSelector] = useState(!selectedAgeGroup);
  // 当前选择的年龄段（本地状态，用于选择后立即显示）
  const [currentAgeGroup, setCurrentAgeGroup] = useState<AgeGroup | null>(selectedAgeGroup);
  
  // 🔥 确保 currentAgeGroup 在 selectedAgeGroup 变化时同步更新
  // 这样当用户完成战役返回时，能正确获取年龄段
  React.useEffect(() => {
    if (selectedAgeGroup && !currentAgeGroup) {
      setCurrentAgeGroup(selectedAgeGroup);
    }
  }, [selectedAgeGroup, currentAgeGroup]);
  
  const allCampaigns = getAllCampaigns();
  
  // 🔥 使用年龄段独立进度
  const activeAgeGroup = currentAgeGroup || selectedAgeGroup;
  const ageProgress = activeAgeGroup ? ageGroupCampaignProgress[activeAgeGroup] : null;
  
  // 获取当前年龄段已完成的战役（优先用新的年龄段进度，兼容旧进度）
  const {
    completedCampaignIds: ageGroupCompletedCampaigns,
    completedLevelIds: ageGroupCompletedLevels,
  } = resolveCompatibleCampaignProgress({
    activeAgeGroup,
    ageProgress,
    completedCampaigns,
    completedCampaignLevels,
  });
  
  // 获取当前年龄段已完成的关卡
  
  // 处理年龄段选择
  const handleAgeGroupSelect = (ageGroup: AgeGroup) => {
    setCurrentAgeGroup(ageGroup);
    setSelectedAgeGroup(ageGroup);
    setShowAgeSelector(false);
    setHasSelectedAgeThisSession(true);
    playSound('/sounds/button_click.wav', 0.4);
  };

  // 如果需要选择年龄段
  if (showAgeSelector) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
        <AgeGroupSelector 
          onSelect={handleAgeGroupSelect}
          onBack={onClose}
        />
      </div>
    );
  }

  const getLocationEmoji = (location: string) => {
    const emojiMap: { [key: string]: string } = {
      '古老背街道': '🏘️',
      '长江中学': '🏫',
      '实验小学': '🎓',
      '十八中': '📚',
      '六泉湖广场': '🏞️',
      '乐奇享': '🎮',
      '盛世天下': '🏢',
      '猇亭古战场': '⚔️',
      '体育中心': '🏟️',
      '长江大桥': '🌉',
      '高速收费站': '🛣️',
      '宜昌东站': '🚄',
      '猇亭工业园': '🏭',
      '宜昌高新区': '🔬',
      '兴发集团': '🏭',
      '幻门试炼场': '🌀',
      '坠门训练塔': '🧱',
      '镜门回环馆': '🪞',
      '节拍门阵馆': '🎼',
      '单门机关工坊': '🛠️',
      '终门总测场': '🚪'
    };
    return emojiMap[location] || '📍';
  };

  const renderCampaignLocationIcon = (campaign: Campaign, size: CampaignIconSize = 'card') => {
    const iconSize = size === 'hero' ? 116 : 72;
    const stroke = size === 'hero' ? 3.5 : 3;
    const containerClass = size === 'hero'
      ? 'mx-auto sm:mx-0 flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/10 bg-slate-950/28 shadow-[0_18px_40px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.14)]'
      : 'mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-slate-950/28 shadow-[0_12px_26px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]';

    const renderDoorGlyph = (accent: string, fill: string) => (
      <svg viewBox="0 0 96 96" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M48 8L71 22V54C71 70 61 82 48 88C35 82 25 70 25 54V22L48 8Z" fill={fill} stroke="#101828" strokeWidth={stroke} strokeLinejoin="round" />
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
        {getLocationEmoji(campaign.location)}
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

  const getThemeColor = (theme: string) => {
    const colorMap: { [key: string]: string } = {
      '历史文化': 'from-amber-600 to-orange-700',
      '校园学习': 'from-blue-600 to-indigo-700',
      '科学探索': 'from-green-600 to-teal-700',
      '现代科技': 'from-purple-600 to-pink-700',
      '自然环境': 'from-emerald-600 to-green-700',
      '娱乐休闲': 'from-pink-600 to-rose-700',
      '商业中心': 'from-gray-600 to-slate-700',
      '古代战争': 'from-red-600 to-crimson-700',
      '体育运动': 'from-orange-600 to-yellow-700',
      '交通枢纽': 'from-cyan-600 to-blue-700',
      '逆向机关': 'from-violet-600 to-fuchsia-700',
      '坍塌机关': 'from-stone-600 to-orange-700',
      '传送镜像': 'from-sky-600 to-indigo-700',
      '安全窗节奏': 'from-emerald-600 to-cyan-700',
      '多室试炼': 'from-amber-600 to-red-700',
      '终极混合': 'from-rose-600 to-orange-700'
    };
    return colorMap[theme] || 'from-gray-600 to-gray-700';
  };

  const isCampaignUnlocked = (campaign: Campaign) => {
    if (!campaign.unlockRequirement) return true;
    return ageGroupCompletedCampaigns.includes(campaign.unlockRequirement);
  };

  const isCampaignCompleted = (campaignId: string) => {
    // 🔥 使用年龄段独立进度
    return ageGroupCompletedCampaigns.includes(campaignId);
  };

  // 判断关卡是否解锁
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

  // 判断关卡是否完成
  const isLevelCompleted = (levelId: string): boolean => {
    // 🔥 使用年龄段独立进度
    return ageGroupCompletedLevels.includes(levelId);
  };

  // 获取关卡状态图标
  const getLevelStatusIcon = (campaign: Campaign, levelIndex: number): string => {
    const level = campaign.levels[levelIndex];
    if (isLevelCompleted(level.id)) return '✅';
    if (isLevelUnlocked(campaign, levelIndex)) return '🔓';
    return '🔒';
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-800 backdrop-blur-md rounded-2xl p-3 sm:p-6 max-w-6xl w-full mx-2 sm:mx-4 border-2 border-slate-700 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* 头部 - 移动端适配 */}
        <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-8 gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-4xl font-bold text-blue-400 mb-1 sm:mb-2">🗺️ 宜昌猇亭战役地图</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-slate-400 text-xs sm:text-lg">选择你的冒险之旅</p>
              {selectedAgeGroup && (
                <button
                  onClick={() => setShowAgeSelector(true)}
                  className="px-3 py-2 min-h-[44px] bg-slate-700 text-blue-400 text-xs sm:text-sm rounded-full hover:bg-slate-600 transition-all flex items-center justify-center border border-slate-600"
                >
                  {AGE_GROUP_INFO[selectedAgeGroup].name} ▼
                </button>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white active:text-slate-300 text-2xl sm:text-3xl font-bold p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {!selectedCampaign ? (
          /* 战役网格 - 移动端滑动卡片 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {allCampaigns.map((campaign, index) => {
              const isUnlocked = isCampaignUnlocked(campaign);
              const isCompleted = isCampaignCompleted(campaign.id);
              
              return (
                <div
                  key={campaign.id}
                  data-campaign-id={campaign.id}
                  className={`relative rounded-2xl p-4 sm:p-6 border-2 transition-all cursor-pointer ${
                    isUnlocked
                      ? 'border-slate-600 hover:border-blue-500 active:border-blue-400 sm:hover:scale-105 active:scale-95 bg-slate-700/80 shadow-lg'
                      : 'border-slate-700 opacity-50 cursor-not-allowed bg-slate-800/50'
                  }`}
                  onClick={() => {
                    if (isUnlocked) {
                      playSound('/sounds/button_click.wav', 0.4);
                      setSelectedCampaign(campaign);
                    }
                  }}
                  onMouseEnter={() => isUnlocked && playSound('/sounds/button_hover.wav', 0.2)}
                >
                  {/* 完成状态 */}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 text-2xl">
                      ✅
                    </div>
                  )}
                  
                  {/* 锁定状态 */}
                  {!isUnlocked && (
                    <div className="absolute top-3 right-3 text-2xl">
                      🔒
                    </div>
                  )}

                  {/* 战役编号 */}
                  <div className="absolute top-3 left-3 bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>

                  {/* 地点图标 - 移动端适配 */}
                  <div className="text-center mb-3 sm:mb-4">
                    <div className="mb-1 sm:mb-2">{renderCampaignLocationIcon(campaign, 'card')}</div>
                    <h3 className="text-base sm:text-xl font-bold text-white mb-1">{campaign.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-400">{campaign.location}</p>
                  </div>

                  {/* 描述 - 移动端隐藏 */}
                  <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 hidden sm:block">
                    {campaign.description}
                  </p>

                  {/* 进度信息 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {campaign.levels.length} 关卡
                    </span>
                    <span className="text-blue-400">
                      +{campaign.rewards.xp} XP
                    </span>
                  </div>

                  {/* 解锁条件 */}
                  {!isUnlocked && campaign.unlockRequirement && (
                    <div className="mt-3 text-xs text-slate-400 bg-slate-700 rounded-lg p-2">
                      需要完成：{allCampaigns.find(c => c.id === campaign.unlockRequirement)?.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 战役详情 */
          <div className="space-y-4 sm:space-y-6">
            <button
              onClick={() => setSelectedCampaign(null)}
              className="flex items-center text-blue-400 hover:text-blue-300 active:text-blue-200 mb-2 sm:mb-4 p-2 -ml-2 min-h-[44px]"
            >
              ← 返回战役列表
            </button>

            <div className="bg-gradient-to-r from-slate-700 to-slate-700 rounded-xl p-4 sm:p-8 border border-slate-600 shadow-lg">
              {/* 移动端：垂直布局 / 桌面端：水平布局 */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {renderCampaignLocationIcon(selectedCampaign, 'hero')}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{selectedCampaign.name}</h2>
                  <p className="text-lg sm:text-xl text-blue-400 mb-3 sm:mb-4">{selectedCampaign.location}</p>
                  <p className="text-slate-300 text-sm sm:text-lg leading-relaxed mb-4 sm:mb-6">
                    {selectedCampaign.story}
                  </p>
                  
                  {/* 移动端：标签换行显示 */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-6 text-xs sm:text-sm">
                    <span className="bg-blue-600 px-2 sm:px-3 py-1 rounded-full text-white">
                      {selectedCampaign.theme}
                    </span>
                    <span className="text-slate-400">
                      {selectedCampaign.levels.length} 个关卡
                    </span>
                    <span className="text-blue-400">
                      +{selectedCampaign.rewards.xp} XP
                    </span>
                    {selectedCampaign.rewards.title && (
                      <span className="text-purple-400">
                        🏆 {selectedCampaign.rewards.title}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-3 text-xs sm:text-sm text-blue-100">
                    规则：先完成目标，再按本关题数答题过关；失败后答对 1 题可重开本关。
                  </div>
                </div>
              </div>
            </div>

            {/* 关卡列表 */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">📋 关卡列表</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {selectedCampaign.levels.map((level, index) => {
                  const unlocked = isLevelUnlocked(selectedCampaign, index);
                  const completed = isLevelCompleted(level.id);
                  const statusIcon = getLevelStatusIcon(selectedCampaign, index);
                  
                  return (
                    <div
                      key={level.id}
                      data-level-id={level.id}
                      className={`relative bg-slate-700/80 rounded-xl p-3 sm:p-4 border-2 transition-all ${
                        unlocked
                          ? 'border-slate-600 hover:border-blue-500 active:border-blue-400 cursor-pointer sm:hover:scale-105 active:scale-95 shadow-md'
                          : 'border-slate-700 opacity-50 cursor-not-allowed'
                      } ${completed ? 'bg-blue-900/30' : ''}`}
                      onClick={() => {
                        if (unlocked) {
                          playSound('/sounds/level_complete.wav', 0.5);
                          // 🔥 使用 currentAgeGroup（本地状态）而不是 selectedAgeGroup（store状态）
                          // 确保年龄段正确传递，避免异步更新问题
                          onSelectCampaign(selectedCampaign, index, currentAgeGroup || selectedAgeGroup || undefined);
                        }
                      }}
                      onMouseEnter={() => unlocked && playSound('/sounds/button_hover.wav', 0.2)}
                    >
                      {/* 状态图标 */}
                      <div className="absolute top-2 right-2 text-xl sm:text-2xl">
                        {statusIcon}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white font-bold text-sm sm:text-base ${
                          completed ? 'bg-green-600' : unlocked ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <h4 className="text-white font-bold text-base sm:text-lg pr-8">{level.name}</h4>
                      </div>
                      
                      <p className="text-slate-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{level.description}</p>
                      
                      {/* 关卡故事 - 移动端隐藏 */}
                      {level.story && (
                        <p className="text-slate-500 text-xs mb-2 sm:mb-3 italic line-clamp-2 hidden sm:block">
                          "{level.story}"
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {level.questions.length} 道题目
                        </span>
                        <span className="text-blue-400 font-bold">
                          +{level.rewards.xp} XP
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-sky-300">
                        规则：{buildCampaignRuleText(level.questions.length)}
                      </div>

                      {/* 技能奖励 */}
                      {getRewardSkillText(level.rewards) && (
                        <div className="mt-2 text-xs text-purple-400 bg-purple-900/30 rounded-lg px-2 py-1">
                          🎁 奖励：{getRewardSkillText(level.rewards)}
                        </div>
                      )}

                      {/* 未解锁提示 */}
                      {!unlocked && (
                        <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded-lg px-2 py-1">
                          🔒 完成关卡 {index} 后解锁
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 提示信息 - 移动端简化 */}
            <div className="bg-slate-700 border border-slate-600 rounded-xl p-3 sm:p-4 mt-4 sm:mt-6">
              <p className="text-blue-300 text-xs sm:text-sm">
                💡 点击已解锁关卡开始，具体题数看各关规则。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
