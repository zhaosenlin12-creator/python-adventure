'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Star, TrendingUp, Sparkles } from 'lucide-react';
import { EVOLUTION_STAGES, type EvolutionStage, getEvolutionProgress, getNextStage, canEvolve, getStageAppearance } from '@/lib/petEvolution';
import { usePetStore } from '@/store/petStore';
import PetEggDisplay from './PetEggDisplay';
import { PET_CONFIGS, PetType } from '@/types/pet';
import { getPetImageUrl } from '@/lib/config/petAssets';

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

export function EvolutionPokedex({
  isOpen,
  onClose,
  currentStage,
  petType,
  petData
}: EvolutionPokedexProps) {
  const { pets } = usePetStore();
  const [selectedStage, setSelectedStage] = useState<number>(currentStage);
  const [activeTab, setActiveTab] = useState<'evolution' | 'eggs'>('evolution');

  useEffect(() => {
    setSelectedStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const eggPets = (pets || []).filter(p => p.isEgg || p.petType === 'egg');

  const selected = EVOLUTION_STAGES[selectedStage];
  const isUnlocked = (stage: number) => stage <= currentStage;
  const petConfig = PET_CONFIGS[petType] || PET_CONFIGS['dog_shiba'];
  const petStyle = petConfig.style;
  const persistence = petData.persistence ?? petData.perseverance ?? 0;
  const nextStage = getNextStage(currentStage);
  const evolutionProgress = getEvolutionProgress({
    level: petData.level,
    evolution_stage: currentStage,
    intimacy: petData.intimacy,
    intelligence: petData.intelligence,
    creativity: petData.creativity,
    persistence
  });
  const evolutionCheck = canEvolve({
    level: petData.level,
    evolution_stage: currentStage,
    intimacy: petData.intimacy,
    intelligence: petData.intelligence,
    creativity: petData.creativity,
    persistence
  });

  const meetsRequirements = (stage: EvolutionStage) => {
    if (!stage.minLevel) return true;
    
    const checks = [
      petData.level >= stage.minLevel,
      !stage.minIntimacy || petData.intimacy >= stage.minIntimacy,
      !stage.minIntelligence || petData.intelligence >= stage.minIntelligence,
      !stage.minCreativity || petData.creativity >= stage.minCreativity,
      !stage.minPerseverance || persistence >= stage.minPerseverance
    ];

    return checks.every(check => check);
  };

  const getStageRingClass = (stageIndex: number) => {
    const stageRing: Record<number, string> = {
      0: 'border-slate-500',
      1: 'border-amber-400',
      2: 'border-emerald-400',
      3: 'border-sky-400',
      4: 'border-purple-400',
      5: 'border-yellow-300'
    };
    const styleRing = petStyle === 'tech' ? 'shadow-[0_0_16px_rgba(56,189,248,0.35)]' : 'shadow-[0_0_16px_rgba(244,114,182,0.25)]';
    return `${stageRing[stageIndex] || 'border-slate-500'} ${styleRing}`;
  };

  const renderPetPreview = (stageIndex: number) => {
    const appearance = getStageAppearance(stageIndex);
    const size = Math.max(36, Math.min(72, (appearance.size || 48) + 8));
    const boxSize = size + 12;
    const glowStyle = appearance.glowEffect
      ? { filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))' }
      : undefined;

    return (
      <div
        className={`rounded-full border-2 flex items-center justify-center bg-slate-700 ${getStageRingClass(stageIndex)}`}
        style={{ width: boxSize, height: boxSize }}
      >
        {stageIndex === 0 ? (
          <img
            src="/assets/pets/egg.svg"
            alt="神秘的蛋"
            className="object-contain"
            style={{ width: size, height: size }}
          />
        ) : getPetImageUrl(petType, 'normal', stageIndex) ? (
          <img
            src={getPetImageUrl(petType, 'normal', stageIndex)}
            alt={petConfig.displayName}
            className="object-contain"
            style={{ width: size, height: size, imageRendering: 'pixelated', ...glowStyle }}
          />
        ) : (
          <span style={{ fontSize: Math.max(24, size / 1.6), ...glowStyle }}>{petConfig.icon}</span>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      style={{ overscrollBehavior: 'contain' }}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl h-[90vh] pixel-panel bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-xl flex flex-col min-h-0"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 pixel-btn bg-red-600 hover:bg-red-900/300 p-2"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* 标题 */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-6 border-b border-slate-600">
          <h2 className="text-3xl font-bold text-white text-center flex items-center justify-center gap-2 ">
            <Star className="w-8 h-8" />
            进化图鉴
            <Star className="w-8 h-8" />
          </h2>
          <p className="text-center text-white/90 mt-2">
            探索宠物的所有进化形态
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-3 bg-blue-900/30 border-b border-slate-700 p-3">
          <button
            onClick={() => setActiveTab('evolution')}
            className={`pixel-btn text-sm px-4 py-2 ${activeTab === 'evolution' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}
          >
            进化图鉴
          </button>
          <button
            onClick={() => setActiveTab('eggs')}
            className={`pixel-btn text-sm px-4 py-2 ${activeTab === 'eggs' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}
          >
            蛋仓库
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {activeTab === 'evolution' ? (
            <div className="flex flex-col md:flex-row h-full min-h-0">
          {/* 左侧：进化阶段列表 */}
          <div className="w-full md:w-1/3 bg-slate-800 p-4 overflow-y-auto border-r border-slate-700 min-h-0">
            <div className="space-y-2">
              {EVOLUTION_STAGES.map((stage, index) => {
                const unlocked = isUnlocked(index);
                const isCurrent = index === currentStage;
                const isSelected = index === selectedStage;

                return (
                  <motion.button
                    key={stage.stage}
                    onClick={() => unlocked && setSelectedStage(index)}
                    whileHover={{ scale: unlocked ? 1.02 : 1 }}
                    whileTap={{ scale: unlocked ? 0.98 : 1 }}
                    className={`
                      w-full p-4 text-left transition-all pixel-panel
                      ${isSelected ? 'bg-blue-900/30 border-2 border-emerald-400' : 'bg-slate-700 border border-slate-600 rounded-lg'}
                      ${!unlocked && 'opacity-50 cursor-not-allowed'}
                      ${isCurrent && 'ring-2 ring-blue-500'}
                    `}
                    disabled={!unlocked}
                    style={{ imageRendering: 'pixelated' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* 图标 */}
                      <div className={`
                        w-12 h-12 flex items-center justify-center border-2
                        ${unlocked ? 'bg-blue-900/20 border-slate-600' : 'bg-slate-700 border-slate-600'}
                      `}>
                        {unlocked ? renderPetPreview(index) : <Lock className="w-6 h-6 text-slate-400" />}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-bold">
                            {unlocked ? stage.name : '???'}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                              当前
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {unlocked ? `Lv.${stage.minLevel}+` : '未解锁'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 右侧：详细信息 */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-700 min-h-0">
            {isUnlocked(selectedStage) ? (
              <motion.div
                key={selectedStage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* 成长路线提示 */}
                <div className="pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-4 text-sm text-slate-500">
                  <div className="font-bold text-white mb-2">成长路线</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>通过每日签到 / 成就领取获得宠物蛋</li>
                    <li>在“蛋仓库”选择蛋，完成 3 个关卡即可孵化</li>
                    <li>互动提升亲密度与属性，满足条件后点击“进化”</li>
                  </ul>
                </div>
                {/* 形态展示 */}
                <div className="pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-6 text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-4"
                  >
                    <div className="w-32 h-32 mx-auto bg-blue-900/30 border-2 border-slate-600 rounded-xl flex items-center justify-center">
                      {selectedStage === 0 ? (
                        <img
                          src="/assets/pets/egg.svg"
                          alt="神秘的蛋"
                          className="w-20 h-24 object-contain mx-auto"
                        />
                      ) : (
                        renderPetPreview(selectedStage)
                      )}
                    </div>
                  </motion.div>
                  <h3 className="text-3xl font-bold text-white mb-2 ">
                    {selected.name} · {petConfig.displayName}
                  </h3>
                  <p className="text-slate-500">
                    {selected.description}
                  </p>
                </div>
                {/* 下一阶段进化进度与条件 */}
                {nextStage && (
                  <div className="pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-6">
                    <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2 ">
                      <Sparkles className="w-5 h-5" />
                      下一阶段：{nextStage.name}
                    </h4>
                    <div className="text-xs text-slate-500 mb-3">
                      进化进度：{evolutionProgress}% {evolutionCheck.canEvolve ? '✅ 可进化' : '⏳ 未满足'}
                    </div>
                    <div className="w-full bg-slate-800 border border-slate-600 rounded-lg h-3 mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, evolutionProgress))}%` }}
                      />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                        <span className="text-slate-500">等级</span>
                        <span className={`font-bold ${petData.level >= nextStage.minLevel ? 'text-green-400' : 'text-red-400'}`}>
                          {petData.level} / {nextStage.minLevel}
                          {petData.level >= nextStage.minLevel && ' ✓'}
                        </span>
                      </div>
                      {nextStage.minIntimacy && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">亲密度</span>
                          <span className={`font-bold ${petData.intimacy >= nextStage.minIntimacy ? 'text-green-400' : 'text-red-400'}`}>
                            {petData.intimacy} / {nextStage.minIntimacy}
                            {petData.intimacy >= nextStage.minIntimacy && ' ✓'}
                          </span>
                        </div>
                      )}
                      {nextStage.minIntelligence && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">智力</span>
                          <span className={`font-bold ${petData.intelligence >= nextStage.minIntelligence ? 'text-green-400' : 'text-red-400'}`}>
                            {petData.intelligence} / {nextStage.minIntelligence}
                            {petData.intelligence >= nextStage.minIntelligence && ' ✓'}
                          </span>
                        </div>
                      )}
                      {nextStage.minCreativity && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">创造力</span>
                          <span className={`font-bold ${petData.creativity >= nextStage.minCreativity ? 'text-green-400' : 'text-red-400'}`}>
                            {petData.creativity} / {nextStage.minCreativity}
                            {petData.creativity >= nextStage.minCreativity && ' ✓'}
                          </span>
                        </div>
                      )}
                      {nextStage.minPerseverance && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">毅力</span>
                          <span className={`font-bold ${(persistence) >= nextStage.minPerseverance ? 'text-green-400' : 'text-red-400'}`}>
                            {persistence} / {nextStage.minPerseverance}
                            {(persistence) >= nextStage.minPerseverance && ' ✓'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 进化条件 */}
                {selectedStage > 0 && (
                  <div className="pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-6">
                    <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2 ">
                      <TrendingUp className="w-5 h-5" />
                      进化条件
                    </h4>
                    <div className="space-y-3">
                      {/* 等级 */}
                      <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                        <span className="text-slate-500">等级</span>
                        <span className={`font-bold ${
                          petData.level >= selected.minLevel ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {petData.level} / {selected.minLevel}
                          {petData.level >= selected.minLevel && ' ✓'}
                        </span>
                      </div>

                      {/* 亲密度 */}
                      {selected.minIntimacy && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">亲密度</span>
                          <span className={`font-bold ${
                            petData.intimacy >= selected.minIntimacy ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {petData.intimacy} / {selected.minIntimacy}
                            {petData.intimacy >= selected.minIntimacy && ' ✓'}
                          </span>
                        </div>
                      )}

                      {/* 智力 */}
                      {selected.minIntelligence && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">智力</span>
                          <span className={`font-bold ${
                            petData.intelligence >= selected.minIntelligence ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {petData.intelligence} / {selected.minIntelligence}
                            {petData.intelligence >= selected.minIntelligence && ' ✓'}
                          </span>
                        </div>
                      )}

                      {/* 创造力 */}
                      {selected.minCreativity && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">创造力</span>
                          <span className={`font-bold ${
                            petData.creativity >= selected.minCreativity ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {petData.creativity} / {selected.minCreativity}
                            {petData.creativity >= selected.minCreativity && ' ✓'}
                          </span>
                        </div>
                      )}

                      {/* 毅力 */}
                      {selected.minPerseverance && (
                        <div className="flex items-center justify-between p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          <span className="text-slate-500">毅力</span>
                          <span className={`font-bold ${
                            (petData.persistence ?? petData.perseverance ?? 0) >= selected.minPerseverance ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {petData.persistence ?? petData.perseverance ?? 0} / {selected.minPerseverance}
                            {(petData.persistence ?? petData.perseverance ?? 0) >= selected.minPerseverance && ' ✓'}
                          </span>
                        </div>
                      )}

                      {/* 进化状态 */}
                      {selectedStage === currentStage + 1 && (
                        <div className="mt-4 p-3 bg-blue-900/30 border border-slate-600 rounded-lg">
                          <p className="text-blue-400 text-center font-bold">
                            {meetsRequirements(selected) ? '✨ 可以进化！' : '⏳ 继续努力...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 进化奖励 */}
                {selectedStage > 1 && (
                  <div className="pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-6">
                    <h4 className="text-xl font-bold text-white mb-4 ">
                      🎁 进化奖励
                    </h4>
                    <div className="space-y-2 text-slate-500">
                      <p className="p-2 bg-slate-800 border border-slate-600 rounded-lg">
                        💰 金币 +{selected.rewards.coins}
                      </p>
                      <p className="p-2 bg-slate-800 border border-slate-600 rounded-lg">
                        ⭐ 全属性 +{selected.rewards.attributeBonus}
                      </p>
                      {selected.rewards.food.map((food) => (
                        <p key={food.id} className="p-2 bg-slate-800 border border-slate-600 rounded-lg">
                          🎁 {food.id} x{food.quantity}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-8">
                  <Lock className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-400 mb-2">
                    未解锁
                  </h3>
                  <p className="text-slate-400">
                    继续培养宠物以解锁此形态
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
          ) : (
            <div className="h-full overflow-y-auto bg-slate-700 p-6 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white ">我的宠物蛋</h3>
                <span className="text-sm text-slate-400">共 {eggPets.length} 枚</span>
              </div>
              {eggPets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eggPets.map((egg) => (
                    <PetEggDisplay key={egg.id} pet={egg} />
                  ))}
                </div>
              ) : (
                <div className="text-center pixel-panel bg-slate-700 border border-slate-600 rounded-xl p-8">
                  <img
                    src="/assets/pets/egg.svg"
                    alt="神秘的蛋"
                    className="w-16 h-20 object-contain mx-auto mb-3"
                  />
                  <h3 className="text-xl font-bold text-slate-500 mb-2">暂无宠物蛋</h3>
                  <p className="text-slate-400 text-sm">完成签到或成就可获得新蛋</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
