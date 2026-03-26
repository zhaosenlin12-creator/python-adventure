import { ALL_SELECTABLE_PETS, LEGACY_PET_TYPES, PET_CONFIGS, PetStatus, PetType } from '@/types/pet';
import { getPetArtworkProfile, resolvePetStageArtwork } from '@/lib/config/petArtworkProfiles';
import { migratePetType } from '@/lib/pet/migration';

export interface PetAnimation {
  normal: string;
  happy: string;
  excited: string;
  tired: string;
  coma: string;
  curious: string;
  playing: string;
  question: string;
  sleeping: string;
  eating: string;
  sad: string;
  walking: string;
}

export type PetAnimationState = keyof PetAnimation;

export interface PetAssetConfig {
  type: PetType;
  name: string;
  animations: PetAnimation;
  isAnimated: boolean;
  useLottie?: boolean;
  previewSvg?: string;
}

const statusToAnimationMap: Record<PetStatus, PetAnimationState> = {
  normal: 'normal',
  tired: 'tired',
  coma: 'coma',
  egg: 'normal',
};

const buildStaticAnimationSet = (src: string): PetAnimation => ({
  normal: src,
  happy: src,
  excited: src,
  tired: src,
  coma: src,
  curious: src,
  playing: src,
  question: src,
  sleeping: src,
  eating: src,
  sad: src,
  walking: src,
});

const buildProfileAsset = (type: PetType, sourceType: PetType = type): PetAssetConfig => {
  const preview = getPetArtworkProfile(sourceType)?.preview ?? resolvePetStageArtwork(sourceType, 1) ?? '';
  return {
    type,
    name: PET_CONFIGS[type]?.displayName ?? type,
    isAnimated: false,
    useLottie: false,
    previewSvg: preview,
    animations: buildStaticAnimationSet(preview),
  };
};

const selectableAssets = Object.fromEntries(
  ALL_SELECTABLE_PETS.map((type) => [type, buildProfileAsset(type)])
) as Record<Exclude<PetType, 'egg'>, PetAssetConfig>;

const legacyAssets = Object.fromEntries(
  LEGACY_PET_TYPES.map((type) => [type, buildProfileAsset(type, migratePetType(type))])
) as Partial<Record<Exclude<PetType, 'egg'>, PetAssetConfig>>;

export const PET_ASSETS: Record<PetType, PetAssetConfig> = {
  ...selectableAssets,
  ...legacyAssets,
  egg: {
    type: 'egg',
    name: 'Mystery Egg',
    isAnimated: false,
    useLottie: false,
    previewSvg: '/assets/pets/egg.svg',
    animations: buildStaticAnimationSet('/assets/pets/egg.svg'),
  },
};

export function getPetAnimation(
  type: PetType,
  status: PetStatus | PetAnimationState,
  evolutionStage?: number
): string {
  const resolvedType = migratePetType(type);
  const stageArtwork = resolvePetStageArtwork(resolvedType, evolutionStage);
  if (stageArtwork) {
    return stageArtwork;
  }

  const config = PET_ASSETS[type] ?? PET_ASSETS[resolvedType];
  if (!config) {
    console.warn(`Unknown pet type: ${type}`);
    return '';
  }

  const animationKey =
    status in statusToAnimationMap
      ? statusToAnimationMap[status as PetStatus]
      : (status as PetAnimationState);

  return config.animations[animationKey] || config.animations.normal;
}

export function getPetAnimationByAction(
  type: PetType,
  action: PetAnimationState,
  evolutionStage?: number
): string {
  return getPetAnimation(type, action, evolutionStage);
}

export function getPetImageUrl(
  type: PetType,
  status: PetStatus | PetAnimationState,
  evolutionStage?: number
): string {
  return getPetAnimation(type, status, evolutionStage);
}

export function getPetConfig(type: PetType): PetAssetConfig | undefined {
  return PET_ASSETS[type] ?? PET_ASSETS[migratePetType(type)];
}

export const DEFAULT_PET_TYPE: PetType = 'code_kitty';
