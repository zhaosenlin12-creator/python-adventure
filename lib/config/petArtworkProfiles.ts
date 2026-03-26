import { PetType } from '@/types/pet';

export type PetRenderVariant = 'selection' | 'panel' | 'home' | 'world' | 'list';

type PetStageMap = Record<1 | 2 | 3 | 4 | 5, string>;
type RenderScaleMap = Record<PetRenderVariant, number>;

export interface PetArtworkProfile {
  preview: string;
  stages: PetStageMap;
  renderScale: RenderScaleMap;
  worldYOffset?: number;
}

interface ArtworkSourceConfig {
  slug?: string;
  stages?: string[];
  renderScale: RenderScaleMap;
  worldYOffset?: number;
}

const UI_VARIANT_SCALE_BOOST: RenderScaleMap = {
  selection: 1.14,
  panel: 1.18,
  home: 1.28,
  world: 1,
  list: 1.14,
};

const CUTE_SCALE: RenderScaleMap = {
  selection: 1.18,
  panel: 1.2,
  home: 1.34,
  world: 1.14,
  list: 1.12,
};

const CUTE_TALL_SCALE: RenderScaleMap = {
  selection: 1.2,
  panel: 1.22,
  home: 1.38,
  world: 1.15,
  list: 1.14,
};

const TECH_SCALE: RenderScaleMap = {
  selection: 1.18,
  panel: 1.22,
  home: 1.36,
  world: 1.15,
  list: 1.14,
};

const MYTHIC_SCALE: RenderScaleMap = {
  selection: 1.1,
  panel: 1.14,
  home: 1.3,
  world: 1.11,
  list: 1.08,
};

const MYTHIC_LARGE_SCALE: RenderScaleMap = {
  selection: 1.04,
  panel: 1.08,
  home: 1.24,
  world: 1.06,
  list: 1.02,
};

const buildRemasterStageChain = (slug: string, stageIndexes: number[] = [1, 2, 3, 4, 5]): string[] =>
  stageIndexes.map((stageIndex) => `/assets/pets/camp-remaster/${slug}/stage-${stageIndex}.png`);

const ARTWORK_SOURCES: Partial<Record<PetType, ArtworkSourceConfig>> = {
  code_kitty: { slug: 'british-shorthair', renderScale: CUTE_SCALE, worldYOffset: -4 },
  algo_bunny: { slug: 'silver-lynx', renderScale: CUTE_SCALE, worldYOffset: -4 },
  shiba_debugger: {
    stages: buildRemasterStageChain('shiba-inu', [1, 2, 3, 4, 4]),
    renderScale: CUTE_SCALE,
    worldYOffset: -4,
  },
  bit_bot: { slug: 'golden-cat', renderScale: TECH_SCALE, worldYOffset: -4 },
  data_sprite: { slug: 'border-collie', renderScale: TECH_SCALE, worldYOffset: -5 },
  ava_ai: { slug: 'snow-leopard', renderScale: TECH_SCALE, worldYOffset: -6 },
  code_dragon: { slug: 'blazing-dragon', renderScale: MYTHIC_SCALE, worldYOffset: -12 },
  giraffe_oracle: { slug: 'yinglong', renderScale: MYTHIC_LARGE_SCALE, worldYOffset: -14 },
  snow_cat: { slug: 'baize', renderScale: MYTHIC_SCALE, worldYOffset: -10 },
  silver_lynx: { slug: 'silver-lynx', renderScale: CUTE_SCALE, worldYOffset: -4 },
  forest_maine: { slug: 'tabby-coil', renderScale: CUTE_SCALE, worldYOffset: -3 },
  coffee_shadow: { slug: 'coffee-shadow', renderScale: CUTE_SCALE, worldYOffset: -4 },
  husky_rider: { slug: 'husky-rider', renderScale: CUTE_TALL_SCALE, worldYOffset: -5 },
  pom_angel: { slug: 'pom-angel', renderScale: CUTE_SCALE, worldYOffset: -4 },
  mini_civet: { slug: 'mini-civet', renderScale: CUTE_SCALE, worldYOffset: -3 },
  dutch_whisker: { slug: 'dutch-whisker', renderScale: CUTE_SCALE, worldYOffset: -2 },
  neon_hound: { slug: 'neon-hound', renderScale: TECH_SCALE, worldYOffset: -5 },
  qiongqi_howl: { slug: 'qiongqi-howl', renderScale: MYTHIC_LARGE_SCALE, worldYOffset: -12 },
  taowu_flare: { slug: 'taowu-flare', renderScale: MYTHIC_LARGE_SCALE, worldYOffset: -13 },
  golden_roc: {
    stages: buildRemasterStageChain('golden-roc', [1, 2, 3, 4, 4]),
    renderScale: MYTHIC_LARGE_SCALE,
    worldYOffset: -14,
  },
};

function buildStageMap(stages: string[]): PetStageMap {
  const safeStages = stages.filter((stage) => typeof stage === 'string' && stage.trim().length > 0);
  const fallback = safeStages[0] ?? '';
  const pick = (index: number) => safeStages[Math.min(index, safeStages.length - 1)] ?? fallback;

  return {
    1: pick(0),
    2: pick(1),
    3: pick(2),
    4: pick(3),
    5: pick(4),
  };
}

function boostRenderScale(renderScale: RenderScaleMap): RenderScaleMap {
  return {
    selection: renderScale.selection * UI_VARIANT_SCALE_BOOST.selection,
    panel: renderScale.panel * UI_VARIANT_SCALE_BOOST.panel,
    home: renderScale.home * UI_VARIANT_SCALE_BOOST.home,
    world: renderScale.world * UI_VARIANT_SCALE_BOOST.world,
    list: renderScale.list * UI_VARIANT_SCALE_BOOST.list,
  };
}

function createProfile(config: ArtworkSourceConfig): PetArtworkProfile {
  const stages = config.stages ?? buildRemasterStageChain(config.slug ?? '');
  return {
    preview: stages[0],
    stages: buildStageMap(stages),
    renderScale: boostRenderScale(config.renderScale),
    worldYOffset: config.worldYOffset ?? 0,
  };
}

export const PET_ARTWORK_PROFILES: Partial<Record<PetType, PetArtworkProfile>> = Object.fromEntries(
  Object.entries(ARTWORK_SOURCES).map(([type, config]) => [type, createProfile(config as ArtworkSourceConfig)])
) as Partial<Record<PetType, PetArtworkProfile>>;

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
