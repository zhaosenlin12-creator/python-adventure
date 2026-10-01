'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
import { toFriendlyMessage } from '@/lib/utils/friendlyError';
import { useGlobalUiStore } from '@/store/globalUiStore';

export default function PetMainPanel() {
  const pathname = usePathname();
  const { currentPet, pets, loadPets, isLoading, evolvePet, checkEvolution, updatePetName } = usePetStore();
  const { isAuthenticated, token, user } = useAuthStore();
  const setPetHomeActive = useGlobalUiStore((state) => state.setPetHomeActive);
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

  if (pathname?.startsWith('/code-research')) {
    return null;
  }
  
  useEffect(() => {
    if (currentPet) {
      setPetName(currentPet.name);
    }
  }, [currentPet]);

  useEffect(() => {
    setPetHomeActive(showPetHome);

    if (showPetHome) {
      window.dispatchEvent(new CustomEvent('pet-home-opened'));
    } else {
      window.dispatchEvent(new CustomEvent('pet-home-closed'));
    }

    return () => {
      setPetHomeActive(false);
      window.dispatchEvent(new CustomEvent('pet-home-closed'));
    };
  }, [setPetHomeActive, showPetHome]);

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
            className={`rounded-[22px] border border-[#dec7a5] bg-[#fffaf0]/94 p-2 shadow-[0_14px_30px_rgba(91,59,35,0.18)] backdrop-blur-md transition-all ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:-translate-y-0.5 hover:border-[#caa977]'}`}
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
              <div className="text-xs font-bold text-[#6b5140]">
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
            data-testid="pet-egg-panel-toggle"
            className="cursor-grab rounded-[22px] border border-[#dec7a5] bg-[#fffaf0]/94 p-2 shadow-[0_14px_30px_rgba(91,59,35,0.18)] backdrop-blur-md transition-all active:cursor-grabbing hover:-translate-y-0.5 hover:border-[#8abfd1]"
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8b95f] text-xs font-bold text-white">
                  {currentPet.hatchProgress}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 灞曞紑鐘舵€?- 铔嬭鎯?*/}
        {isExpanded && (
          <div data-testid="pet-egg-panel" className="w-72 rounded-[26px] border border-[#dec7a5] bg-[linear-gradient(180deg,#fffaf0,#f4e6d2)] p-4 shadow-[0_24px_50px_rgba(91,59,35,0.22)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#5c4537]">神秘的蛋</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8bd] bg-[#fffaf0] text-xl text-[#a18b78] transition hover:bg-white hover:text-[#5c4537]"
              >
                ×
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
          badge: 'bg-[#fff0d2] text-[#a35d32] border border-[#e4b57a]',
          icon: <Cpu className="w-3 h-3" />,
          label: '算力'
        };
      case 'data_sprite':
      case 'tech_drone':
        return {
          frame: 'rounded-full border border-sky-300/50 bg-sky-500/10 border-dashed',
          glow: 'shadow-[0_0_14px_rgba(56,189,248,0.28)]',
          badge: 'bg-[#e9f3f8] text-[#5f7f91] border border-[#b8d3e0]',
          icon: <Zap className="w-3 h-3" />,
          label: '巡航'
        };
      case 'ava_ai':
      case 'tech_ai':
        return {
          frame: 'rounded-full border border-rose-300/50 bg-rose-500/10',
          glow: 'shadow-[0_0_14px_rgba(244,63,94,0.24)]',
          badge: 'bg-[#fff0ec] text-[#a35d57] border border-[#e8b8b0]',
          icon: <Sparkles className="w-3 h-3" />,
          label: '灵感'
        };
      default:
        return null;
    }
  };
  const currentTechAccent = getTechAccent(resolvedPetType);
  
  const canEvolveNow = currentPet ? checkEvolution(currentPet.id) : false;
  const pendingEggCount = (pets || []).filter((pet) => pet.isEgg || pet.petType === 'egg').length;
  
  const handleSaveName = async () => {
    const nextName = petName.trim();

    if (!nextName) {
      setPetName(currentPet.name);
      setIsEditingName(false);
      const { showErrorToast } = await import('@/components/ui/ErrorToast');
      showErrorToast('昵称不能为空，请输入 1 到 12 个字符。', 'warning');
      return;
    }

    if (nextName !== currentPet.name) {
      try {
        await updatePetName(currentPet.id, nextName);
        const { showErrorToast } = await import('@/components/ui/ErrorToast');
        showErrorToast('伙伴昵称已更新。', 'info');
      } catch (error) {
        console.error('Failed to update pet name:', error);
        setPetName(currentPet.name);
        const { showErrorToast } = await import('@/components/ui/ErrorToast');
        showErrorToast(toFriendlyMessage(error, '昵称保存失败，请稍后重试'), 'error');
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
      const { showErrorToast } = await import('@/components/ui/ErrorToast');
      const errorMessage = toFriendlyMessage(error, '进化失败，请稍后重试');
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
      {!showPetHome && (
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
              className="cursor-grab rounded-[22px] border border-[#dec7a5] bg-[#fffaf0]/92 p-2 shadow-[0_14px_30px_rgba(91,59,35,0.18)] backdrop-blur-md transition-all active:cursor-grabbing hover:-translate-y-0.5 hover:border-[#caa977] hover:bg-white"
              onMouseDown={handleMouseDown}
              onClick={(e) => {
                if (!isDragging) {
                  setIsExpanded(true);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute inset-1.5 rounded-full bg-[#dff1e8] blur-md" />
                  <div className="absolute inset-x-2 bottom-1 h-2.5 rounded-full bg-[#8b6b4a]/18 blur-md" />
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
                <div className="text-xs font-bold text-[#6b5140]">
                  Lv.{currentPet.level}
                </div>
              </div>
            </div>
          )}
          
          {/* 灞曞紑鐘舵€?*/}
          {isExpanded && (
            <div className="w-80 rounded-[28px] border border-[#dec7a5] bg-[linear-gradient(180deg,#fffaf0,#f4e6d2)] p-4 shadow-[0_26px_54px_rgba(91,59,35,0.22)] backdrop-blur-md">
              {/* 澶撮儴 */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a27642]">伙伴口袋</div>
                  <h3 className="text-lg font-black text-[#5c4537]">我的伙伴</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e3cdb0] bg-[#fff8ec] text-xl text-[#8a6b57] transition hover:bg-white hover:text-[#5c4537]"
                  aria-label="收起宠物面板"
                >
                  ×
                </button>
              </div>
              
              {/* 瀹犵墿淇℃伅 */}
              <div className="space-y-3">
                {/* 澶村儚鍜屽熀鏈俊鎭?*/}
                <div className="flex items-center gap-3">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-3 rounded-full bg-[#dff1e8] blur-xl" />
                    <div className="absolute inset-x-3 bottom-2 h-4 rounded-full bg-[#8b6b4a]/18 blur-lg" />
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
                          className="w-full rounded-xl border border-[#ead8bd] bg-white px-2 py-1 text-sm text-[#6b5140] outline-none focus:border-[#8abfd1]"
                          maxLength={12}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-base font-black text-[#5c4537]">{currentPet.name}</div>
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="text-[#a18b78] transition-colors hover:text-[#6f9eaa]"
                          aria-label="编辑宠物名字"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-[#927866]">{petConfig.displayName}</div>
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
                  <div className="mb-1 flex justify-between text-xs text-[#6b5140]">
                    <span className="font-medium">Lv.{currentPet.level}</span>
                    <span className="text-[#927866]">{currentLevelExp}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#e2d5c3]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#78b892,#8abfd1,#e4c987)] transition-all"
                      style={{ width: `${expPercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* 灞炴€?- 浣跨敤鍔ㄧ敾鐘舵€佹潯锛屽甫鍥炬爣鍜岄鑹插尯鍒?*/}
                <div className="space-y-2">
                  <AnimatedStatusValue
                    value={currentPet.attributes.intelligence}
                    label="智力"
                    color="bg-sky-500"
                    icon="🧠"
                  />
                  <AnimatedStatusValue
                    value={currentPet.attributes.creativity}
                    label="创造力"
                    color="bg-indigo-500"
                    icon="✨"
                  />
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
                      className="flex h-10 items-center justify-center gap-1 rounded-full bg-[#78b892] px-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(120,184,146,0.18)] transition hover:bg-[#65a47d] disabled:cursor-not-allowed disabled:bg-[#e6d9c8] disabled:text-[#a38b78]"
                    >
                      <Apple className="w-4 h-4" />
                      喂养
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsExpanded(false);
                        setShowPetHome(true);
                      }}
                      className="flex h-10 items-center justify-center gap-1 rounded-full bg-[#78b7c5] px-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(120,183,197,0.18)] transition hover:bg-[#66a7b6]"
                    >
                      <Home className="w-4 h-4" />
                      小屋
                    </button>
                    <button
                      onClick={handleEvolve}
                      disabled={!canEvolveNow || isLoading}
                      className={`flex h-10 items-center justify-center gap-1 rounded-full px-3 text-xs font-bold transition ${
                        canEvolveNow 
                      ? 'animate-pulse bg-gradient-to-r from-[#e9b961] to-[#e49b61] text-white shadow-[0_8px_18px_rgba(228,155,97,0.22)] hover:from-[#f0c671] hover:to-[#d9894c]'
                          : 'cursor-not-allowed bg-[#e6d9c8] text-[#a38b78]'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      {canEvolveNow ? '进化' : '进化'}
                    </button>
                    
                    <button
                      onClick={() => setShowPokedex(true)}
                      className="flex h-10 items-center justify-center gap-1 rounded-full border border-[#ead8bd] bg-[#fffaf0] px-3 text-xs font-bold text-[#6b5140] transition hover:bg-white"
                    >
                      <BookOpen className="w-4 h-4" />
                      图鉴
                    </button>
                    <button
                      onClick={() => setShowGrowthGuide(true)}
                      className="col-span-2 flex h-10 items-center justify-center gap-1 rounded-full border border-[#ead8bd] bg-[#fffaf0] px-3 text-xs font-bold text-[#6b5140] transition hover:bg-white"
                    >
                      成长说明
                    </button>
                  </div>
                  <div className="text-center text-[10px] leading-4 text-[#927866]">
                    进入小屋可以互动、喂养和观察宠物状态，持续提升亲密度与成长属性。
                  </div>
                  {pendingEggCount > 0 && (
                    <button
                      onClick={() => setShowPokedex(true)}
                      className="w-full rounded-2xl border border-[#e4c987] bg-[#fff1c8] px-3 py-2 text-left text-xs leading-5 text-[#916a2d] transition hover:bg-[#ffebad]"
                    >
                      还有 {pendingEggCount} 枚宠物蛋在孵化中。现在首次通关新关卡会自动推进所有宠物蛋，无需设为跟随。可进入图鉴蛋仓统一查看进度。
                    </button>
                  )}
                </div>
                
                {/* 鐘舵€佹彁绀?*/}
                {currentPet.status === 'tired' && (
                  <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-400">
                    提示：你的伙伴有点累了，记得多陪陪它，或者带它去小屋休息一下。
                  </div>
                )}
                
                {currentPet.status === 'coma' && (
                  <div className="bg-red-950/30 border border-red-500/40 rounded-lg p-2 text-xs text-red-300">
                    警告：你的伙伴陷入昏迷了，快去答题营救它。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
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
