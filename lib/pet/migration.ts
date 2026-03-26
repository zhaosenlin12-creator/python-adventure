/**
 * Legacy pet-type migration helpers.
 *
 * Old pet identifiers are mapped onto the newer remastered artwork set so the
 * frontend can render historic data without waiting for a backend data rewrite.
 */

import { PetType, getPetStyleForType } from '@/types/pet';

export const PET_MIGRATION_MAP: Record<string, PetType> = {
  dog_shiba: 'shiba_debugger',
  cute_cat: 'code_kitty',
  cute_rabbit: 'algo_bunny',
  cute_dog: 'shiba_debugger',
  tech_bot: 'bit_bot',
  tech_drone: 'data_sprite',
  tech_ai: 'ava_ai',
  egg: 'egg',
};

const NEW_PET_TYPES = new Set<string>([
  'egg',
  'code_kitty',
  'algo_bunny',
  'shiba_debugger',
  'bit_bot',
  'data_sprite',
  'ava_ai',
  'code_dragon',
  'giraffe_oracle',
  'snow_cat',
  'silver_lynx',
  'forest_maine',
  'coffee_shadow',
  'husky_rider',
  'pom_angel',
  'mini_civet',
  'dutch_whisker',
  'neon_hound',
  'qiongqi_howl',
  'taowu_flare',
  'golden_roc',
]);

export function migratePetType(oldType: string): PetType {
  if (NEW_PET_TYPES.has(oldType)) {
    return oldType as PetType;
  }

  const migrated = PET_MIGRATION_MAP[oldType];
  if (migrated) {
    return migrated;
  }

  console.warn(`[PetMigration] Unknown pet type: ${String(oldType).slice(0, 50)}, defaulting to code_kitty`);
  return 'code_kitty';
}

export function needsMigration(petType: string): boolean {
  return !NEW_PET_TYPES.has(petType) && petType in PET_MIGRATION_MAP;
}

export function getNewStyleForOldType(oldType: string): 'cute' | 'tech' | 'mythic' | 'unknown' {
  return getPetStyleForType(migratePetType(oldType));
}

export function migratePetList<T extends { petType: string }>(pets: T[]): T[] {
  return pets.map((pet) => ({
    ...pet,
    petType: migratePetType(pet.petType),
  }));
}
