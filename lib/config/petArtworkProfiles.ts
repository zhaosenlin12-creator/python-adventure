import { PetType } from '@/types/pet';

export type PetRenderVariant = 'selection' | 'panel' | 'home' | 'world' | 'list';

export interface PetArtworkProfile {
  preview: string;
  stages: Record<1 | 2 | 3 | 4 | 5, string>;
  renderScale: Record<PetRenderVariant, number>;
  worldYOffset?: number;
}

const CAMP_COLLECTION_BASE = '/assets/pets/camp-collection';

const stageAsset = (filename: string) => `${CAMP_COLLECTION_BASE}/${filename}`;

const buildStaticStages = (filename: string): Record<1 | 2 | 3 | 4 | 5, string> => ({
  1: stageAsset(filename),
  2: stageAsset(filename),
  3: stageAsset(filename),
  4: stageAsset(filename),
  5: stageAsset(filename),
});

const buildEvolutionStages = (
  babyFilename: string,
  evolvedFilename: string
): Record<1 | 2 | 3 | 4 | 5, string> => ({
  1: stageAsset(babyFilename),
  2: stageAsset(babyFilename),
  3: stageAsset(evolvedFilename),
  4: stageAsset(evolvedFilename),
  5: stageAsset(evolvedFilename),
});

export const PET_ARTWORK_PROFILES: Partial<Record<PetType, PetArtworkProfile>> = {
  code_kitty: {
    preview: stageAsset('gray-cat.png'),
    stages: buildStaticStages('gray-cat.png'),
    renderScale: {
      selection: 1.04,
      panel: 1.02,
      home: 1.06,
      world: 1.0,
      list: 1.0,
    },
  },
  algo_bunny: {
    preview: stageAsset('beagle.png'),
    stages: buildEvolutionStages('beagle.png', 'dachshund.png'),
    renderScale: {
      selection: 1.08,
      panel: 1.08,
      home: 1.12,
      world: 1.08,
      list: 1.06,
    },
  },
  shiba_debugger: {
    preview: stageAsset('panda-baby.png'),
    stages: buildEvolutionStages('panda-baby.png', 'panda-guardian.png'),
    renderScale: {
      selection: 1.02,
      panel: 1.02,
      home: 1.04,
      world: 1.02,
      list: 1.0,
    },
  },
  bit_bot: {
    preview: stageAsset('goldfish.png'),
    stages: buildEvolutionStages('goldfish.png', 'koi.png'),
    renderScale: {
      selection: 0.98,
      panel: 1.0,
      home: 1.06,
      world: 1.0,
      list: 0.96,
    },
    worldYOffset: 2,
  },
  data_sprite: {
    preview: stageAsset('penguin-buddy.png'),
    stages: buildEvolutionStages('penguin-buddy.png', 'penguin-royal.png'),
    renderScale: {
      selection: 1.0,
      panel: 1.0,
      home: 1.04,
      world: 1.0,
      list: 0.98,
    },
  },
  ava_ai: {
    preview: stageAsset('tiger-cub.png'),
    stages: buildEvolutionStages('tiger-cub.png', 'tiger-guardian.png'),
    renderScale: {
      selection: 1.0,
      panel: 1.02,
      home: 1.08,
      world: 1.04,
      list: 1.0,
    },
  },
  code_dragon: {
    preview: stageAsset('lion.png'),
    stages: buildStaticStages('lion.png'),
    renderScale: {
      selection: 1.04,
      panel: 1.06,
      home: 1.1,
      world: 1.08,
      list: 1.02,
    },
  },
  giraffe_oracle: {
    preview: stageAsset('giraffe.png'),
    stages: buildStaticStages('giraffe.png'),
    renderScale: {
      selection: 0.94,
      panel: 0.96,
      home: 0.98,
      world: 0.9,
      list: 0.92,
    },
  },
  snow_cat: {
    preview: stageAsset('white-cat.png'),
    stages: buildStaticStages('white-cat.png'),
    renderScale: {
      selection: 0.96,
      panel: 0.98,
      home: 1.02,
      world: 0.96,
      list: 0.94,
    },
  },
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
