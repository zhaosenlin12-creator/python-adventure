import { PetType } from '@/types/pet';

export type PetRenderVariant = 'selection' | 'panel' | 'home' | 'world' | 'list';

type PetStageMap = Record<1 | 2 | 3 | 4 | 5, string>;

export interface PetArtworkProfile {
  preview: string;
  stages: PetStageMap;
  renderScale: Record<PetRenderVariant, number>;
  worldYOffset?: number;
}

const STAGE_SNAPSHOTS = [0, 2, 4, 7, 9] as const;
const UI_VARIANT_SCALE_BOOST: Record<PetRenderVariant, number> = {
  selection: 1.14,
  panel: 1.18,
  home: 1.28,
  world: 1,
  list: 1.14,
};

const buildLocalStageChain = (slug: string): string[] => [
  `/assets/pets/camp-remaster/${slug}/stage-1.png`,
  `/assets/pets/camp-remaster/${slug}/stage-2.png`,
  `/assets/pets/camp-remaster/${slug}/stage-3.png`,
  `/assets/pets/camp-remaster/${slug}/stage-4.png`,
  `/assets/pets/camp-remaster/${slug}/stage-5.png`,
];

const CAMP_REMASTER_STAGE_CHAINS = {
  british_shorthair: buildLocalStageChain('british-shorthair'),
  lop_rabbit: buildLocalStageChain('lop-rabbit'),
  shiba_inu: buildLocalStageChain('shiba-inu'),
  golden_cat: buildLocalStageChain('golden-cat'),
  border_collie: buildLocalStageChain('border-collie'),
  snow_leopard: buildLocalStageChain('snow-leopard'),
  blazing_dragon: buildLocalStageChain('blazing-dragon'),
  yinglong: buildLocalStageChain('yinglong'),
  baize: buildLocalStageChain('baize'),
} satisfies Record<string, string[]>;

function buildStageMap(stages: string[]): PetStageMap {
  const safeStages = stages.filter((stage) => typeof stage === 'string' && stage.trim().length > 0);
  const fallback = safeStages[0] ?? '';
  const snapshotIndexes = safeStages.length >= 10 ? STAGE_SNAPSHOTS : [0, 1, 2, 3, 4];
  const pickStage = (stageIndex: number) => safeStages[Math.min(stageIndex, safeStages.length - 1)] ?? fallback;

  return {
    1: pickStage(snapshotIndexes[0]),
    2: pickStage(snapshotIndexes[1]),
    3: pickStage(snapshotIndexes[2]),
    4: pickStage(snapshotIndexes[3]),
    5: pickStage(snapshotIndexes[4]),
  };
}

function createProfile(
  stages: string[],
  renderScale: Record<PetRenderVariant, number>,
  worldYOffset = 0
): PetArtworkProfile {
  return {
    preview: stages[0] ?? '',
    stages: buildStageMap(stages),
    renderScale: {
      selection: renderScale.selection * UI_VARIANT_SCALE_BOOST.selection,
      panel: renderScale.panel * UI_VARIANT_SCALE_BOOST.panel,
      home: renderScale.home * UI_VARIANT_SCALE_BOOST.home,
      world: renderScale.world * UI_VARIANT_SCALE_BOOST.world,
      list: renderScale.list * UI_VARIANT_SCALE_BOOST.list,
    },
    worldYOffset,
  };
}

export const PET_ARTWORK_PROFILES: Partial<Record<PetType, PetArtworkProfile>> = {
  code_kitty: createProfile(CAMP_REMASTER_STAGE_CHAINS.british_shorthair, {
    selection: 1.18,
    panel: 1.2,
    home: 1.32,
    world: 1.16,
    list: 1.12,
  }, -4),
  algo_bunny: createProfile(CAMP_REMASTER_STAGE_CHAINS.lop_rabbit, {
    selection: 1.22,
    panel: 1.26,
    home: 1.42,
    world: 1.12,
    list: 1.16,
  }, -3),
  shiba_debugger: createProfile(CAMP_REMASTER_STAGE_CHAINS.shiba_inu, {
    selection: 1.16,
    panel: 1.2,
    home: 1.32,
    world: 1.14,
    list: 1.12,
  }, -4),
  bit_bot: createProfile(CAMP_REMASTER_STAGE_CHAINS.golden_cat, {
    selection: 1.22,
    panel: 1.24,
    home: 1.36,
    world: 1.16,
    list: 1.14,
  }, -4),
  data_sprite: createProfile(CAMP_REMASTER_STAGE_CHAINS.border_collie, {
    selection: 1.18,
    panel: 1.2,
    home: 1.34,
    world: 1.18,
    list: 1.16,
  }, -5),
  ava_ai: createProfile(CAMP_REMASTER_STAGE_CHAINS.snow_leopard, {
    selection: 1.2,
    panel: 1.24,
    home: 1.38,
    world: 1.16,
    list: 1.18,
  }, -6),
  code_dragon: createProfile(CAMP_REMASTER_STAGE_CHAINS.blazing_dragon, {
    selection: 1.1,
    panel: 1.12,
    home: 1.28,
    world: 1.12,
    list: 1.08,
  }, -12),
  giraffe_oracle: createProfile(CAMP_REMASTER_STAGE_CHAINS.yinglong, {
    selection: 1.06,
    panel: 1.08,
    home: 1.26,
    world: 1.08,
    list: 1.06,
  }, -14),
  snow_cat: createProfile(CAMP_REMASTER_STAGE_CHAINS.baize, {
    selection: 1.12,
    panel: 1.16,
    home: 1.3,
    world: 1.12,
    list: 1.1,
  }, -10),
};

export function getPetArtworkProfile(type: PetType): PetArtworkProfile | undefined {
  return PET_ARTWORK_PROFILES[type];
}

export function resolvePetStageArtwork(type: PetType, evolutionStage?: number): string | undefined {
  const profile = getPetArtworkProfile(type);
  if (!profile) return undefined;

  const normalizedStage = Math.max(1, Math.min(5, evolutionStage ?? 1)) as 1 | 2 | 3 | 4 | 5;
  return profile.stages[normalizedStage];
}

export function getPetVariantScale(type: PetType, variant: PetRenderVariant): number {
  return getPetArtworkProfile(type)?.renderScale[variant] ?? 1;
}

export function getPetWorldYOffset(type: PetType): number {
  return getPetArtworkProfile(type)?.worldYOffset ?? 0;
}
