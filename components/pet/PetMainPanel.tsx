'use client';

import { useEffect, useState } from 'react';
import { usePetStore } from '@/store/petStore';
import { useAuthStore } from '@/store/authStore';
import { PET_CONFIGS, STATUS_TEXT, STATUS_COLORS } from '@/types/pet';
import { getPetImageUrl } from '@/lib/config/petAssets';
import { getPetVariantScale } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';
import PetHomeSceneV3 from './PetHomeScene-v3';
import FoodSelector from './FoodSelector';
import { EvolutionAnimation } from './EvolutionAnimation';
import { EvolutionPokedex } from './EvolutionPokedex';
import { getCurrentStage, getNextStage } from '@/lib/petEvolution';
import { Sparkles, BookOpen, Edit2, Home, Apple, Cpu, Zap } from 'lucide-react';
import PetEggDisplay from './PetEggDisplay';
import AnimatedStatusValue from './AnimatedStatusValue';
import StatusIcon from '@/components/ui/StatusIcon';
import PetGrowthGuide from './PetGrowthGuide';
import PetWelcomeGuide from './PetWelcomeGuide';

export default function PetMainPanel() {
  const { currentPet, pets, loadPets, isLoading, evolvePet, checkEvolution, updatePetName } = usePetStore();
  const { isAuthenticated, token, user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPetHome, setShowPetHome] = useState(false);
  const [showFoodSelector, setShowFoodSelector] = useState(false);
  const [showEvolutionAnimation, setShowEvolutionAnimation] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [showGrowthGuide, setShowGrowthGuide] = useState(false);
  const [showPetWelcomeGuide, setShowPetWelcomeGuide] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [petName, setPetName] = useState('');
  
  // 鎷栧姩鐩稿叧鐘舵€?
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [evolutionData, setEvolutionData] = useState<{
    oldStage: any;
    newStage: any;
  } | null>(null);
  
  useEffect(() => {
    if (isAuthenticated && token) {
      loadPets();
    }
  }, [isAuthenticated, token, loadPets]);
  
  useEffect(() => {
    if (currentPet) {
      setPetName(currentPet.name);
    }
  }, [currentPet]);

  const getPetWelcomeGuideKey = (userId?: number) => (
    userId ? `petWelcomeGuideCompleted:${userId}` : 'petWelcomeGuideCompleted'
  );

  useEffect(() => {
    if (!currentPet || !currentPet.isEgg) return;
    if (!isExpanded) return;
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(getPetWelcomeGuideKey(user?.id));
    if (!completed) {
      setShowPetWelcomeGuide(true);
    }
  }, [currentPet?.id, currentPet?.isEgg, isExpanded, user?.id]);
  
  // 鎷栧姩澶勭悊
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragStart.x)),
          y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.y))
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);
  
  // 馃敀 鏈櫥褰曟椂涓嶆樉绀哄疇鐗╅潰鏉?
  if (!isAuthenticated || !token) {
    return null;
  }
  
  // 娌℃湁瀹犵墿鏃朵笉鏄剧ず
  if (!currentPet) {

    return (
      <>
        <div
          className="fixed z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <div
            className={`pixel-panel p-2 transition-all ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-grab hover:border-game-accent'}`}
            onMouseDown={handleMouseDown}
            onClick={() => {
              if (!isDragging && !isLoading) {
                loadPets();
              }
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-10">
                <img
                  src="/assets/pets/egg.svg"
                  alt="pet egg"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs font-bold text-game-light">
                {isLoading ? '加载宠物中...' : '领取宠物蛋'}
              </div>
              {pets.length === 0 && !isLoading && (
                <span className="text-[10px] text-amber-500 font-bold">新</span>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // 馃 濡傛灉鏄泲鐘舵€侊紝鏄剧ず铔嬬晫闈?
  if (currentPet.isEgg) {
    return (
      <div 
        className="fixed z-50"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : (isExpanded ? 'default' : 'grab')
        }}
      >
        {/* 鎶樺彔鐘舵€?- 铔嬪浘鏍?*/}
        {!isExpanded && (
          <div
            className="pixel-panel p-2 cursor-grab active:cursor-grabbing hover:border-sky-400 transition-all"
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              if (!isDragging) {
                setIsExpanded(true);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-12 animate-bounce">
                <img
                  src="/assets/pets/egg.svg"
                  alt="pet egg"
                  className="w-full h-full object-contain"
                />
              </div>
              {(currentPet.hatchProgress || 0) > 0 && (
                <div className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {currentPet.hatchProgress}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 灞曞紑鐘舵€?- 铔嬭鎯?*/}
        {isExpanded && (
          <div className="pixel-panel p-4 w-72 border-2 border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-white">绁炵鐨勮泲</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-white text-xl w-6 h-6 flex items-center justify-center"
              >
                脳
              </button>
            </div>
            
            <PetEggDisplay pet={currentPet} />
          </div>
        )}
      </div>
    );
  }
  
  const expForNextLevel = 100;
  const currentLevelExp = currentPet.exp % expForNextLevel;
  const expPercentage = (currentLevelExp / expForNextLevel) * 100;
  
  const resolvedPetType = migratePetType(currentPet.petType);
  const petConfig = PET_CONFIGS[resolvedPetType];
  const stageIndex = currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1);
  const currentImageUrl = getPetImageUrl(resolvedPetType, currentPet.status, stageIndex);
  const panelScale = getPetVariantScale(resolvedPetType, 'panel');
  const getTechAccent = (petType?: string) => {
    switch (petType) {
      case 'bit_bot':
      case 'tech_bot':
        return {
          frame: 'rounded-xl border border-orange-300/50 bg-orange-500/10',
          glow: 'shadow-[0_0_14px_rgba(251,146,60,0.24)]',
          badge: 'bg-orange-900 text-orange-100 border border-orange-400/50',
          icon: <Cpu className="w-3 h-3" />,
          label: '鐏靛厜'
        };
      case 'data_sprite':
      case 'tech_drone':
        return {
          frame: 'rounded-full border border-sky-300/50 bg-sky-500/10 border-dashed',
          glow: 'shadow-[0_0_14px_rgba(56,189,248,0.28)]',
          badge: 'bg-sky-900 text-sky-100 border border-sky-400/50',
          icon: <Zap className="w-3 h-3" />,
          label: '宸℃父'
        };
      case 'ava_ai':
      case 'tech_ai':
        return {
          frame: 'rounded-full border border-rose-300/50 bg-rose-500/10',
          glow: 'shadow-[0_0_14px_rgba(244,63,94,0.24)]',
          badge: 'bg-rose-900 text-rose-100 border border-rose-400/50',
          icon: <Sparkles className="w-3 h-3" />,
          label: '鍐插埡'
        };
      default:
        return null;
    }
  };
  const currentTechAccent = getTechAccent(resolvedPetType);
  
  const canEvolveNow = currentPet ? checkEvolution(currentPet.id) : false;
  const pendingEggCount = (pets || []).filter((pet) => pet.isEgg || pet.petType === 'egg').length;
  
  const handleSaveName = async () => {
    if (petName.trim() && petName !== currentPet.name) {
      try {
        await updatePetName(currentPet.id, petName.trim());
      } catch (error) {
        console.error('Failed to update pet name:', error);
        setPetName(currentPet.name);
      }
    }
    setIsEditingName(false);
  };
  
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setPetName(currentPet.name);
      setIsEditingName(false);
    }
  };
  
  const handleEvolve = async () => {
    if (!currentPet || !canEvolveNow) return;
    
    try {
      const oldStage = getCurrentStage(currentPet.evolution_stage || 0);
      const newStage = getNextStage(currentPet.evolution_stage || 0);
      
      if (!newStage) return;
      
      setEvolutionData({ oldStage, newStage });
      setShowEvolutionAnimation(true);
      await evolvePet(currentPet.id);
    } catch (error) {
      console.error('Evolution failed:', error);
      setShowEvolutionAnimation(false);
      setEvolutionData(null);
      // 鏄剧ず閿欒鎻愮ず
      const { showErrorToast } = await import('@/components/ui/ErrorToast');
      const errorMessage = error instanceof Error ? error.message : '进化失败，请稍后重试';
      showErrorToast(errorMessage, 'error');
    }
  };
  
  const handleEvolutionComplete = () => {
    setShowEvolutionAnimation(false);
    setEvolutionData(null);
    loadPets();
  };
  
  return (
    <>
      <div 
        className="fixed z-50"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : (isExpanded ? 'default' : 'grab')
        }}
      >
        {/* 鎶樺彔鐘舵€?- 缂╁皬鐗?*/}
        {!isExpanded && (
          <div
            className="pixel-panel p-2 cursor-grab active:cursor-grabbing hover:border-game-accent transition-all"
            onMouseDown={handleMouseDown}
            onClick={(e) => {
              if (!isDragging) {
                setIsExpanded(true);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-1.5 rounded-full bg-slate-200/8 blur-md" />
                <div className="absolute inset-x-2 bottom-1 h-2.5 rounded-full bg-slate-950/20 blur-md" />
                {currentTechAccent && (
                  <div className={`absolute -bottom-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full ${currentTechAccent.badge}`}>
                    {currentTechAccent.icon}
                  </div>
                )}
                {currentImageUrl ? (
                  <img 
                    src={currentImageUrl} 
                    alt={petConfig.displayName}
                    className="pet-sprite pet-sprite-panel w-full h-full object-contain"
                    style={{ transform: `scale(${panelScale})` }}
                  />
                ) : (
                  <span className="text-xl">{petConfig.icon}</span>
                )}
              </div>
              <div className="text-xs font-bold text-game-light">
                Lv.{currentPet.level}
              </div>
            </div>
          </div>
        )}
        
        {/* 灞曞紑鐘舵€?*/}
        {isExpanded && (
          <div className="pixel-panel w-80 border-2 border-slate-700 p-4 shadow-[0_26px_48px_rgba(15,23,42,0.36)]">
            {/* 澶撮儴 */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-white">我的伙伴</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-white text-xl w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            {/* 瀹犵墿淇℃伅 */}
            <div className="space-y-3">
              {/* 澶村儚鍜屽熀鏈俊鎭?*/}
              <div className="flex items-center gap-3">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-3 rounded-full bg-slate-200/8 blur-xl" />
                  <div className="absolute inset-x-3 bottom-2 h-4 rounded-full bg-slate-950/30 blur-lg" />
                  {currentTechAccent && (
                    <div className={`absolute -bottom-1 -right-1 z-10 px-1.5 py-0.5 text-[9px] rounded-full flex items-center gap-1 ${currentTechAccent.badge}`}>
                      {currentTechAccent.icon}
                      <span>{currentTechAccent.label}</span>
                    </div>
                  )}
                  {currentImageUrl ? (
                    <img 
                      src={currentImageUrl} 
                      alt={petConfig.displayName}
                      className="pet-sprite pet-sprite-panel w-full h-full object-contain"
                      style={{ transform: `scale(${panelScale})` }}
                    />
                  ) : (
                    <span className="text-3xl">{petConfig.icon}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  {/* 鍚嶅瓧缂栬緫 */}
                  {isEditingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={handleNameKeyDown}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 text-white text-sm rounded"
                        maxLength={12}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-base text-white">{currentPet.name}</div>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-gray-400 hover:text-game-accent transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-slate-500">{petConfig.displayName}</div>
                  <div className={`text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[currentPet.status]}`}>
                    <StatusIcon 
                      status={currentPet.status} 
                      size={16}
                      animate={currentPet.status === 'tired' || currentPet.status === 'coma'}
                    />
                    {STATUS_TEXT[currentPet.status]}
                  </div>
                </div>
              </div>
              
              {/* 绛夌骇鍜岀粡楠?*/}
              <div>
                <div className="flex justify-between text-xs mb-1 text-white">
                  <span className="font-medium">Lv.{currentPet.level}</span>
                  <span className="text-slate-400">{currentLevelExp}/100</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full">
                  <div
                    className="bg-blue-600 h-full transition-all rounded-full"
                    style={{ width: `${expPercentage}%` }}
                  />
                </div>
              </div>
              
              {/* 灞炴€?- 浣跨敤鍔ㄧ敾鐘舵€佹潯锛屽甫鍥炬爣鍜岄鑹插尯鍒?*/}
              <div className="space-y-2">
                {/* 鏅哄姏 - 绱壊锛屽ぇ鑴戝浘鏍?*/}
                <AnimatedStatusValue
                  value={currentPet.attributes.intelligence}
                  label="智力"
                  color="bg-sky-500"
                  icon="🧠"
                />
                {/* 鍒涢€犲姏 - 绮夎壊锛屾槦鏄熷浘鏍?*/}
                <AnimatedStatusValue
                  value={currentPet.attributes.creativity}
                  label="创造力"
                  color="bg-indigo-500"
                  icon="✨"
                />
                {/* 姣呭姏 - 钃濊壊锛岃倢鑲夊浘鏍?*/}
                <AnimatedStatusValue
                  value={currentPet.attributes.persistence}
                  label="毅力"
                  color="bg-cyan-500"
                  icon="💪"
                />
              </div>
              
              {/* 鎿嶄綔鎸夐挳 */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowFoodSelector(true)}
                    disabled={isLoading || currentPet.status === 'coma'}
                    className="pixel-btn pixel-btn-success text-xs flex items-center justify-center gap-1 h-10"
                  >
                    <Apple className="w-4 h-4" />
                    喂养
                  </button>
                  
                  <button
                    onClick={() => setShowPetHome(true)}
                    className="pixel-btn bg-sky-700 text-white hover:bg-sky-600 text-xs flex items-center justify-center gap-1 h-10"
                  >
                    <Home className="w-4 h-4" />
                    小屋
                  </button>
                  <button
                    onClick={handleEvolve}
                    disabled={!canEvolveNow || isLoading}
                    className={`pixel-btn text-xs flex items-center justify-center gap-1 h-10 ${
                      canEvolveNow 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-300 hover:to-orange-300 animate-pulse' 
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {canEvolveNow ? '进化' : '进化'}
                  </button>
                  
                  <button
                    onClick={() => setShowPokedex(true)}
                    className="pixel-btn bg-slate-700 text-white hover:bg-slate-600 text-xs flex items-center justify-center gap-1 h-10"
                  >
                    <BookOpen className="w-4 h-4" />
                    图鉴
                  </button>
                  <button
                    onClick={() => setShowGrowthGuide(true)}
                    className="pixel-btn bg-slate-700 text-white hover:bg-slate-600 text-xs flex items-center justify-center gap-1 h-10 col-span-2"
                  >
                    成长说明
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 text-center">
                  进入小屋可以互动、喂养和观察宠物状态，持续提升亲密度与成长属性。
                </div>
                {pendingEggCount > 0 && (
                  <button
                    onClick={() => setShowPokedex(true)}
                    className="w-full rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-100 transition hover:bg-amber-500/15"
                  >
                    还有 {pendingEggCount} 枚宠物蛋在孵化中。现在首次通关新关卡会自动推进所有宠物蛋，无需设为跟随。可进入图鉴蛋仓统一查看进度。
                  </button>
                )}
              </div>
              
              {/* 鐘舵€佹彁绀?*/}
              {currentPet.status === 'tired' && (
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-400">
                  鈿狅笍 浣犵殑浼欎即鏈夌偣绱簡锛岃寰楀闄櫔瀹冨摝锛?
                </div>
              )}
              
              {currentPet.status === 'coma' && (
                <div className="bg-red-950/30 border border-red-500/40 rounded-lg p-2 text-xs text-red-300">
                  馃毃 浣犵殑浼欎即闄峰叆鏄忚糠锛佸揩鍘荤瓟棰樿惀鏁戝畠锛?
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 瀹犵墿灏忓眿 - V3鍏ㄥ睆鐗堟湰 */}
      {showPetHome && (
        <PetHomeSceneV3 
          isOpen={showPetHome} 
          onClose={() => setShowPetHome(false)} 
        />
      )}
      
      {/* 椋熺墿閫夋嫨鍣?*/}
      {currentPet && (
        <FoodSelector
          isOpen={showFoodSelector}
          onClose={() => setShowFoodSelector(false)}
          petId={currentPet.id}
          petName={currentPet.name}
        />
      )}
      
      {/* 杩涘寲鍔ㄧ敾 */}
      {showEvolutionAnimation && evolutionData && currentPet && (
        <EvolutionAnimation
          isOpen={showEvolutionAnimation}
          petName={currentPet.name}
          oldStage={evolutionData.oldStage}
          newStage={evolutionData.newStage}
          oldImageUrl={getPetImageUrl(resolvedPetType, 'normal', evolutionData.oldStage.stage)}
          newImageUrl={getPetImageUrl(resolvedPetType, 'normal', evolutionData.newStage.stage)}
          onComplete={handleEvolutionComplete}
        />
      )}
      
      {/* 杩涘寲鍥鹃壌 */}
      {currentPet && (
        <EvolutionPokedex
          isOpen={showPokedex}
          onClose={() => setShowPokedex(false)}
          currentStage={currentPet.evolution_stage ?? (currentPet.isEgg ? 0 : 1)}
          petType={resolvedPetType}
          petData={{
            level: currentPet.level,
            intimacy: currentPet.intimacy || 0,
            intelligence: currentPet.attributes?.intelligence ?? currentPet.intelligence ?? 0,
            creativity: currentPet.attributes?.creativity ?? currentPet.creativity ?? 0,
            persistence: currentPet.attributes?.persistence ?? currentPet.persistence ?? currentPet.perseverance ?? 0,
            perseverance: currentPet.perseverance
          }}
        />
      )}
      <PetGrowthGuide isOpen={showGrowthGuide} onClose={() => setShowGrowthGuide(false)} />
      <PetWelcomeGuide
        isOpen={showPetWelcomeGuide}
        onClose={() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(getPetWelcomeGuideKey(user?.id), 'true');
          }
          setShowPetWelcomeGuide(false);
        }}
      />
    </>
  );
}
