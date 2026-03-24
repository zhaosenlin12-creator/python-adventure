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

const CAMP_REMASTER_STAGE_CHAINS = {
  british_shorthair: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/1200000151.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001959.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001975.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001999.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000002015.jpg',
  ],
  lop_rabbit: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000255.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000264.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000280.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000304.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000320.jpg',
  ],
  shiba_inu: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000030.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000046.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000062.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000086.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/CQ.jpg',
  ],
  golden_cat: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/100000231.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000038.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000054.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000078.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000094.jpg',
  ],
  border_collie: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/100000396.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000829.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000845.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000869.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000885.jpg',
  ],
  snow_leopard: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/01.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/03.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/05.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/8.2.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/x.jpg',
  ],
  blazing_dragon: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/01.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/03.1.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/04.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/08.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/10.jpg',
  ],
  yinglong: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/01.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/03.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/05.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/08.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/10.jpg',
  ],
  baize: [
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/01.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/03.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/05.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/09.jpg',
    'https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/11.jpg',
  ],
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
    renderScale,
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
    selection: 1.16,
    panel: 1.18,
    home: 1.28,
    world: 1.12,
    list: 1.1,
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
