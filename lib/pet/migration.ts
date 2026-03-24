/**
 * 🔄 宠物数据迁移工具
 *
 * 将旧版宠物类型自动映射到新版，确保：
 * - 用户数据零丢失
 * - 前端自动兼容（无需等待后端迁移完成）
 * - 进化阶段、亲密度等属性全部保留
 */

import { PetType, getPetStyleForType } from '@/types/pet';

/**
 * 旧版 → 新版宠物类型映射表
 */
export const PET_MIGRATION_MAP: Record<string, PetType> = {
  'dog_shiba':   'shiba_debugger',
  'cute_cat':    'code_kitty',
  'cute_rabbit': 'algo_bunny',
  'cute_dog':    'shiba_debugger',   // cute_dog 合并到柴柴
  'tech_bot':    'bit_bot',
  'tech_drone':  'data_sprite',
  'tech_ai':     'ava_ai',
  'egg':         'egg',              // 蛋状态不变
};

/**
 * 新版宠物类型集合（用于快速判断是否已迁移）
 */
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
]);

/**
 * 迁移单个宠物类型
 * 如果已经是新版类型则原样返回
 */
export function migratePetType(oldType: string): PetType {
  // 已经是新版类型
  if (NEW_PET_TYPES.has(oldType)) {
    return oldType as PetType;
  }

  // 查找映射
  const newType = PET_MIGRATION_MAP[oldType];
  if (newType) {
    return newType;
  }

  // 🔒 未知类型，返回安全默认值（防止无效类型传播到渲染层）
  console.warn(`[PetMigration] Unknown pet type: ${String(oldType).slice(0, 50)}, defaulting to code_kitty`);
  return 'code_kitty';
}

/**
 * 检查宠物类型是否需要迁移
 */
export function needsMigration(petType: string): boolean {
  return !NEW_PET_TYPES.has(petType) && petType in PET_MIGRATION_MAP;
}

/**
 * 获取旧版类型对应的新版风格
 */
export function getNewStyleForOldType(oldType: string): 'cute' | 'tech' | 'mythic' | 'unknown' {
  const newType = migratePetType(oldType);
  return getPetStyleForType(newType);
}

/**
 * 批量迁移宠物列表（用于 petStore.loadPets）
 */
export function migratePetList<T extends { petType: string }>(pets: T[]): T[] {
  return pets.map(pet => ({
    ...pet,
    petType: migratePetType(pet.petType),
  }));
}
