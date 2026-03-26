'use client';

import { useState } from 'react';
import { Pet, PetStyle, PetType } from '@/types/pet';
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

  const handleGoToCampaign = () => {
    if (typeof window === 'undefined') return;

    const isWorld = window.location.pathname.startsWith('/world');
    if (isWorld) {
      window.dispatchEvent(new CustomEvent('stationInteraction', { detail: { stationId: 'campaign' } }));
      return;
    }

    window.dispatchEvent(new CustomEvent('open-campaign', { detail: { chapterId: 1, openMap: true } }));
  };

  const handlePetSelect = (petType: PetType, petStyle: PetStyle, name: string) => {
    setSelectedPetData({ type: petType, style: petStyle, name });
    setShowSelection(false);
    setShowAnimation(true);
  };

  const handleAnimationComplete = async () => {
    setShowAnimation(false);

    if (!selectedPetData) return;

    try {
      await hatchPet(pet.id, selectedPetData.type, selectedPetData.style, selectedPetData.name);
      loadPets().catch(() => {});
    } catch (error) {
      console.error('Failed to hatch pet:', error);
    }
  };

  return (
    <>
      <div className="rounded-2xl border-2 border-sky-400/30 bg-gradient-to-br from-sky-950/45 to-cyan-950/25 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className={`h-24 w-20 ${canHatch ? 'animate-bounce' : 'animate-pulse'}`}
              onClick={handleHatchClick}
              style={{ cursor: canHatch ? 'pointer' : 'default' }}
            >
              <img src="/assets/pets/egg.svg" alt="神秘的蛋" className="h-full w-full object-contain" />
            </div>
            {progress > 0 && (
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950 animate-pulse">
                {progress}
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="mb-1 text-sm font-bold text-white">神秘的蛋</h3>
            <p className="text-xs text-slate-400">首次通关新关卡时会自动推进孵化进度</p>
          </div>

          <div className="w-full">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>孵化进度</span>
              <span>{progress}/3</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/55">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="h-full w-full animate-pulse bg-white/20" />
              </div>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-xs leading-5 text-slate-300">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                不需要把宠物蛋设为跟随。
                只要去挑战之前没通关过的新关卡，背包里所有未孵化的宠物蛋都会同步 +1。
              </div>
            </div>
          </div>

          {progress === 0 && (
            <button
              onClick={handleGoToCampaign}
              className="pixel-btn bg-sky-500 px-3 py-1 text-[10px] text-slate-950 hover:bg-sky-400"
            >
              <span className="flex items-center gap-1">
                前往闯关
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          )}

          {progress > 0 && progress < 3 && (
            <div className="space-y-2 text-center text-xs text-sky-300">
              <div className="flex items-center justify-center gap-1 animate-pulse">
                <Sparkles className="h-3 w-3" />
                还需完成 {3 - progress} 个新关卡即可孵化
              </div>
              <button
                onClick={handleGoToCampaign}
                className="pixel-btn bg-sky-500 px-3 py-1 text-[10px] text-slate-950 hover:bg-sky-400"
              >
                <span className="flex items-center gap-1">
                  继续推进
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </div>
          )}

          {canHatch && (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-center gap-1 text-center text-xs text-blue-400 animate-bounce">
                <CheckCircle2 className="h-4 w-4" />
                已满足孵化条件，点击宠物蛋即可选择新外观
              </div>
              <button
                onClick={handleHatchClick}
                className="pixel-btn w-full bg-gradient-to-r from-sky-400 to-cyan-400 py-2 text-sm font-bold text-slate-950 hover:from-sky-300 hover:to-cyan-300"
              >
                立即孵化
              </button>
            </div>
          )}
        </div>
      </div>

      <PetSelection isOpen={showSelection} onClose={() => setShowSelection(false)} onSelect={handlePetSelect} />

      <HatchAnimation
        isOpen={showAnimation}
        onComplete={handleAnimationComplete}
        revealIcon={selectedPetData ? getPetAnimation(selectedPetData.type, 'normal') : undefined}
      />
    </>
  );
}
