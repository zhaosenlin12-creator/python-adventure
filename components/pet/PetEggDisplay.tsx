'use client';

import { useState } from 'react';
import { Pet, PET_CONFIGS, PetType, PetStyle } from '@/types/pet';
import { getPetAnimation } from '@/lib/config/petAssets';
import { ArrowRight, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { HatchAnimation } from './HatchAnimation';
import PetSelection from './PetSelection';
import { usePetStore } from '@/store/petStore';

interface PetEggDisplayProps {
  pet: Pet;
}

export default function PetEggDisplay({ pet }: PetEggDisplayProps) {
  const [showSelection, setShowSelection] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [selectedPetData, setSelectedPetData] = useState<{
    type: PetType;
    style: PetStyle;
    name: string;
  } | null>(null);
  
  const { hatchPet, loadPets } = usePetStore();
  
  if (!pet.isEgg && pet.petType !== 'egg') {
    return null;
  }
  
  const progress = pet.hatchProgress || 0;
  const progressPercentage = (progress / 3) * 100;
  const canHatch = progress >= 3;
  
  const handleHatchClick = () => {
    if (canHatch) {
      setShowSelection(true);
    }
  };

  const handleGoToTutorial = () => {
    if (typeof window === 'undefined') return;
    const isWorld = window.location.pathname.startsWith('/world');
    if (isWorld) {
      window.dispatchEvent(new CustomEvent('stationInteraction', { detail: { stationId: 'campaign' } }));
    } else {
      window.dispatchEvent(new CustomEvent('open-campaign', { detail: { chapterId: 1, openMap: true } }));
    }
  };
  
  const handlePetSelect = (petType: PetType, petStyle: PetStyle, name: string) => {
    setSelectedPetData({ type: petType, style: petStyle, name });
    setShowSelection(false);
    setShowAnimation(true);
  };
  
  const handleAnimationComplete = async () => {
    setShowAnimation(false);
    
    // 调用孵化API
    if (selectedPetData) {
      try {
        await hatchPet(pet.id, selectedPetData.type, selectedPetData.style, selectedPetData.name);
        loadPets().catch(() => {});
      } catch (error) {
        console.error('Failed to hatch pet:', error);
      }
    }
  };
  
  return (
    <>
      <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 backdrop-blur-sm rounded-2xl p-4 border-2 border-amber-500/30 shadow-lg">
        {/* 蛋图标 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div 
              className={`w-20 h-24 ${canHatch ? 'animate-bounce' : 'animate-pulse'}`}
              onClick={handleHatchClick}
              style={{ cursor: canHatch ? 'pointer' : 'default' }}
            >
              <img
                src="/assets/pets/egg.svg"
                alt="神秘的蛋"
                className="w-full h-full object-contain"
              />
            </div>
            {progress > 0 && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {progress}
              </div>
            )}
          </div>
          
          {/* 蛋信息 */}
          <div className="text-center">
            <h3 className="text-white font-bold text-sm mb-1">神秘的蛋</h3>
            <p className="text-slate-400 text-xs">完成关卡即可孵化</p>
          </div>
          
          {/* 孵化进度条 */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>孵化进度</span>
              <span>{progress}/3</span>
            </div>
            <div className="w-full bg-amber-900/30 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="h-full w-full animate-pulse bg-white/20"></div>
              </div>
            </div>
          </div>
          
          {/* 提示文字 */}
          {progress === 0 && (
            <div className="text-center text-xs text-slate-400 mt-2 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Info className="w-4 h-4 text-amber-500" />
                <span>完成新手关卡即可解锁孵化进度</span>
              </div>
              <button
                onClick={handleGoToTutorial}
                className="pixel-btn bg-amber-500 text-white hover:bg-amber-400 py-1 px-3 text-[10px]"
              >
                <span className="flex items-center gap-1">
                  前往新手关卡
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          )}
          
          {progress > 0 && progress < 3 && (
            <div className="text-center text-xs text-amber-400 mt-2 space-y-2">
              <div className="animate-pulse flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                还需完成 {3 - progress} 个关卡即可孵化
              </div>
              <button
                onClick={handleGoToTutorial}
                className="pixel-btn bg-amber-500 text-white hover:bg-amber-400 py-1 px-3 text-[10px]"
              >
                <span className="flex items-center gap-1">
                  继续去闯关
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          )}
          
          {canHatch && (
            <div className="w-full">
              <div className="text-center text-xs text-blue-400 mb-3 animate-bounce flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                可以孵化了！点击蛋或按钮选择你的代码伙伴
              </div>
              <button
                onClick={handleHatchClick}
                className="w-full pixel-btn bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 py-2 text-sm font-bold animate-pulse"
              >
                立即孵化
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 宠物选择界面 */}
      <PetSelection
        isOpen={showSelection}
        onClose={() => setShowSelection(false)}
        onSelect={handlePetSelect}
      />
      
      {/* 孵化动画 */}
      <HatchAnimation
        isOpen={showAnimation}
        onComplete={handleAnimationComplete}
        revealIcon={selectedPetData ? getPetAnimation(selectedPetData.type, 'normal') : undefined}
      />
    </>
  );
}
