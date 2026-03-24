import { PET_CONFIGS, PetType, PetStatus } from '@/types/pet';
import { getPetArtworkProfile, resolvePetStageArtwork } from '@/lib/config/petArtworkProfiles';

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

const buildProfileAsset = (type: PetType): PetAssetConfig => {
  const preview = getPetArtworkProfile(type)?.preview ?? resolvePetStageArtwork(type, 1) ?? '';
  return {
    type,
    name: PET_CONFIGS[type]?.displayName ?? type,
    isAnimated: false,
    useLottie: false,
    previewSvg: preview,
    animations: buildStaticAnimationSet(preview),
  };
};

const SHIBA_INU_ASSETS: PetAssetConfig = {
  type: 'dog_shiba',
  name: '柴犬',
  isAnimated: false,
  animations: {
    normal: '/assets/pets/unified/dog_shiba_normal.svg',
    happy: '/assets/pets/unified/dog_shiba_happy.svg',
    excited: '/assets/pets/unified/dog_shiba_happy.svg',
    tired: '/assets/pets/unified/dog_shiba_tired.svg',
    coma: '/assets/pets/unified/dog_shiba_coma.svg',
    curious: '/assets/pets/unified/dog_shiba_normal.svg',
    playing: '/assets/pets/unified/dog_shiba_happy.svg',
    question: '/assets/pets/unified/dog_shiba_question.svg',
    sleeping: '/assets/pets/unified/dog_shiba_tired.svg',
    eating: '/assets/pets/unified/dog_shiba_happy.svg',
    sad: '/assets/pets/unified/dog_shiba_coma.svg',
    walking: '/assets/pets/unified/dog_shiba_normal.svg',
  },
};

export const PET_ASSETS: Record<PetType, PetAssetConfig> = {
  egg: {
    type: 'egg',
    name: '神秘宠物蛋',
    isAnimated: false,
    useLottie: false,
    previewSvg: '/assets/pets/egg.svg',
    animations: buildStaticAnimationSet('/assets/pets/egg.svg'),
  },

  code_kitty: buildProfileAsset('code_kitty'),
  algo_bunny: buildProfileAsset('algo_bunny'),
  shiba_debugger: buildProfileAsset('shiba_debugger'),
  bit_bot: buildProfileAsset('bit_bot'),
  data_sprite: buildProfileAsset('data_sprite'),
  ava_ai: buildProfileAsset('ava_ai'),
  code_dragon: buildProfileAsset('code_dragon'),
  giraffe_oracle: buildProfileAsset('giraffe_oracle'),
  snow_cat: buildProfileAsset('snow_cat'),

  dog_shiba: SHIBA_INU_ASSETS,

  cute_cat: {
    type: 'cute_cat',
    name: '代码猫',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/cute_cat_normal.svg',
      happy: '/assets/pets/unified/cute_cat_happy.svg',
      excited: '/assets/pets/unified/cute_cat_happy.svg',
      tired: '/assets/pets/unified/cute_cat_tired.svg',
      coma: '/assets/pets/unified/cute_cat_coma.svg',
      curious: '/assets/pets/unified/cute_cat_normal.svg',
      playing: '/assets/pets/unified/cute_cat_happy.svg',
      question: '/assets/pets/unified/cute_cat_question.svg',
      sleeping: '/assets/pets/unified/cute_cat_tired.svg',
      eating: '/assets/pets/unified/cute_cat_happy.svg',
      sad: '/assets/pets/unified/cute_cat_coma.svg',
      walking: '/assets/pets/unified/cute_cat_normal.svg',
    },
  },
  cute_rabbit: {
    type: 'cute_rabbit',
    name: '算法兔',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/cute_rabbit_normal.svg',
      happy: '/assets/pets/unified/cute_rabbit_happy.svg',
      excited: '/assets/pets/unified/cute_rabbit_happy.svg',
      tired: '/assets/pets/unified/cute_rabbit_tired.svg',
      coma: '/assets/pets/unified/cute_rabbit_coma.svg',
      curious: '/assets/pets/unified/cute_rabbit_normal.svg',
      playing: '/assets/pets/unified/cute_rabbit_happy.svg',
      question: '/assets/pets/unified/cute_rabbit_question.svg',
      sleeping: '/assets/pets/unified/cute_rabbit_tired.svg',
      eating: '/assets/pets/unified/cute_rabbit_happy.svg',
      sad: '/assets/pets/unified/cute_rabbit_coma.svg',
      walking: '/assets/pets/unified/cute_rabbit_normal.svg',
    },
  },
  cute_dog: {
    type: 'cute_dog',
    name: '逻辑狗',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/cute_dog_normal.svg',
      happy: '/assets/pets/unified/cute_dog_happy.svg',
      excited: '/assets/pets/unified/cute_dog_happy.svg',
      tired: '/assets/pets/unified/cute_dog_tired.svg',
      coma: '/assets/pets/unified/cute_dog_coma.svg',
      curious: '/assets/pets/unified/cute_dog_normal.svg',
      playing: '/assets/pets/unified/cute_dog_happy.svg',
      question: '/assets/pets/unified/cute_dog_question.svg',
      sleeping: '/assets/pets/unified/cute_dog_tired.svg',
      eating: '/assets/pets/unified/cute_dog_happy.svg',
      sad: '/assets/pets/unified/cute_dog_coma.svg',
      walking: '/assets/pets/unified/cute_dog_normal.svg',
    },
  },
  tech_bot: {
    type: 'tech_bot',
    name: '编程机器人',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/tech_bot_normal.svg',
      happy: '/assets/pets/unified/tech_bot_happy.svg',
      excited: '/assets/pets/unified/tech_bot_happy.svg',
      tired: '/assets/pets/unified/tech_bot_tired.svg',
      coma: '/assets/pets/unified/tech_bot_coma.svg',
      curious: '/assets/pets/unified/tech_bot_normal.svg',
      playing: '/assets/pets/unified/tech_bot_happy.svg',
      question: '/assets/pets/unified/tech_bot_question.svg',
      sleeping: '/assets/pets/unified/tech_bot_tired.svg',
      eating: '/assets/pets/unified/tech_bot_happy.svg',
      sad: '/assets/pets/unified/tech_bot_coma.svg',
      walking: '/assets/pets/unified/tech_bot_normal.svg',
    },
  },
  tech_drone: {
    type: 'tech_drone',
    name: '数据无人机',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/tech_drone_normal.svg',
      happy: '/assets/pets/unified/tech_drone_happy.svg',
      excited: '/assets/pets/unified/tech_drone_happy.svg',
      tired: '/assets/pets/unified/tech_drone_tired.svg',
      coma: '/assets/pets/unified/tech_drone_coma.svg',
      curious: '/assets/pets/unified/tech_drone_normal.svg',
      playing: '/assets/pets/unified/tech_drone_happy.svg',
      question: '/assets/pets/unified/tech_drone_question.svg',
      sleeping: '/assets/pets/unified/tech_drone_tired.svg',
      eating: '/assets/pets/unified/tech_drone_happy.svg',
      sad: '/assets/pets/unified/tech_drone_coma.svg',
      walking: '/assets/pets/unified/tech_drone_normal.svg',
    },
  },
  tech_ai: {
    type: 'tech_ai',
    name: 'AI 助手',
    isAnimated: false,
    animations: {
      normal: '/assets/pets/unified/tech_ai_normal.svg',
      happy: '/assets/pets/unified/tech_ai_happy.svg',
      excited: '/assets/pets/unified/tech_ai_happy.svg',
      tired: '/assets/pets/unified/tech_ai_tired.svg',
      coma: '/assets/pets/unified/tech_ai_coma.svg',
      curious: '/assets/pets/unified/tech_ai_normal.svg',
      playing: '/assets/pets/unified/tech_ai_happy.svg',
      question: '/assets/pets/unified/tech_ai_question.svg',
      sleeping: '/assets/pets/unified/tech_ai_tired.svg',
      eating: '/assets/pets/unified/tech_ai_happy.svg',
      sad: '/assets/pets/unified/tech_ai_coma.svg',
      walking: '/assets/pets/unified/tech_ai_normal.svg',
    },
  },
};

const statusToAnimationMap: Record<PetStatus, PetAnimationState> = {
  normal: 'normal',
  tired: 'tired',
  coma: 'coma',
  egg: 'normal',
};

export function getPetAnimation(
  type: PetType,
  status: PetStatus | PetAnimationState,
  evolutionStage?: number
): string {
  const stageArtwork = resolvePetStageArtwork(type, evolutionStage);
  if (stageArtwork) {
    return stageArtwork;
  }

  const config = PET_ASSETS[type];
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
  const stageArtwork = resolvePetStageArtwork(type, evolutionStage);
  if (stageArtwork) {
    return stageArtwork;
  }

  const config = PET_ASSETS[type];
  if (!config) return '';
  if (config.useLottie) {
    return config.previewSvg || '';
  }
  return getPetAnimation(type, status, evolutionStage);
}

export function getPetConfig(type: PetType): PetAssetConfig | undefined {
  return PET_ASSETS[type];
}

export const DEFAULT_PET_TYPE: PetType = 'code_kitty';
