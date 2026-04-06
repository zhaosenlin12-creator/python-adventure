'use client';

import GlobalChat from '@/components/chat/GlobalChat';
import InteractionEffectToast from '@/components/pet/InteractionEffectToast';
import PetMainPanel from '@/components/pet/PetMainPanel';
import PetStatusToast from '@/components/pet/PetStatusToast';
import CoinRewardToast from '@/components/ui/CoinRewardToast';
import ErrorToast from '@/components/ui/ErrorToast';
import FoodRewardToast from '@/components/ui/FoodRewardToast';
import { useGlobalUiStore } from '@/store/globalUiStore';

export default function GlobalOverlayShell() {
  const battleRoyaleActive = useGlobalUiStore((state) => state.battleRoyaleActive);
  const petHomeActive = useGlobalUiStore((state) => state.petHomeActive);

  const hideFloatingOverlays = battleRoyaleActive || petHomeActive;

  return (
    <>
      {!battleRoyaleActive && <PetMainPanel />}

      <div className={hideFloatingOverlays ? 'hidden' : ''}>
        <GlobalChat />
        <PetStatusToast />
        <InteractionEffectToast />
        <FoodRewardToast />
        <CoinRewardToast />
        <ErrorToast />
      </div>
    </>
  );
}
