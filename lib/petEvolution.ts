/**
 * 宠物进化系统
 * 
 * 进化阶段：
 * - 0: 宠物蛋（Lv.0）
 * - 1: 幼年期（Lv.1-4）
 * - 2: 少年期（Lv.5-14）
 * - 3: 成年期（Lv.15-29）
 * - 4: 完全体（Lv.30-49）
 * - 5: 传说形态（Lv.50+）
 */

export interface EvolutionStage {
  stage: number;
  name: string;
  minLevel: number;
  minIntimacy?: number;
  minIntelligence?: number;
  minCreativity?: number;
  minPerseverance?: number;
  description: string;
  rewards: {
    coins: number;
    food: { id: string; quantity: number }[];
    attributeBonus: number;
  };
}

/**
 * 进化阶段配置
 */
export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    stage: 0,
    name: '宠物蛋',
    minLevel: 0,
    description: '等待孵化的神秘宠物蛋',
    rewards: { coins: 0, food: [], attributeBonus: 0 }
  },
  {
    stage: 1,
    name: '幼年期',
    minLevel: 1,
    description: '刚刚孵化的小宠物，充满好奇心',
    rewards: { coins: 0, food: [], attributeBonus: 0 }
  },
  {
    stage: 2,
    name: '少年期',
    minLevel: 5,
    minIntimacy: 30,
    description: '开始成长的宠物，活泼好动',
    rewards: {
      coins: 100,
      food: [{ id: 'cake', quantity: 2 }],
      attributeBonus: 5
    }
  },
  {
    stage: 3,
    name: '成年期',
    minLevel: 15,
    minIntimacy: 80,
    minIntelligence: 20,
    description: '成熟稳重的宠物，拥有更强的能力',
    rewards: {
      coins: 300,
      food: [{ id: 'star_cookie', quantity: 3 }],
      attributeBonus: 10
    }
  },
  {
    stage: 4,
    name: '完全体',
    minLevel: 30,
    minIntimacy: 150,
    minIntelligence: 40,
    minCreativity: 40,
    minPerseverance: 40,
    description: '达到完美形态的宠物，实力强大',
    rewards: {
      coins: 800,
      food: [{ id: 'mystery_box', quantity: 1 }],
      attributeBonus: 20
    }
  },
  {
    stage: 5,
    name: '传说形态',
    minLevel: 50,
    minIntimacy: 300,
    minIntelligence: 80,
    minCreativity: 80,
    minPerseverance: 80,
    description: '传说中的究极形态，散发着神圣的光芒',
    rewards: {
      coins: 2000,
      food: [{ id: 'mystery_box', quantity: 3 }],
      attributeBonus: 50
    }
  }
];

/**
 * 检查宠物是否可以进化
 */
export function canEvolve(pet: {
  level: number;
  evolution_stage: number;
  intimacy: number;
  intelligence: number;
  creativity: number;
  persistence?: number;
  perseverance?: number;
}): { canEvolve: boolean; nextStage?: EvolutionStage; reason?: string } {
  const perseverance = pet.persistence ?? pet.perseverance ?? 0;
  const currentStage = pet.evolution_stage;
  const nextStageIndex = currentStage + 1;

  // 已经是最高阶段
  if (nextStageIndex >= EVOLUTION_STAGES.length) {
    return {
      canEvolve: false,
      reason: '已达到最高进化阶段'
    };
  }

  const nextStage = EVOLUTION_STAGES[nextStageIndex];

  // 检查等级
  if (pet.level < nextStage.minLevel) {
    return {
      canEvolve: false,
      reason: `需要达到 Lv.${nextStage.minLevel}`
    };
  }

  // 检查亲密度
  if (nextStage.minIntimacy && pet.intimacy < nextStage.minIntimacy) {
    return {
      canEvolve: false,
      reason: `需要亲密度达到 ${nextStage.minIntimacy}`
    };
  }

  // 检查智力
  if (nextStage.minIntelligence && pet.intelligence < nextStage.minIntelligence) {
    return {
      canEvolve: false,
      reason: `需要智力达到 ${nextStage.minIntelligence}`
    };
  }

  // 检查创造力
  if (nextStage.minCreativity && pet.creativity < nextStage.minCreativity) {
    return {
      canEvolve: false,
      reason: `需要创造力达到 ${nextStage.minCreativity}`
    };
  }

  // 检查毅力
  if (nextStage.minPerseverance && perseverance < nextStage.minPerseverance) {
    return {
      canEvolve: false,
      reason: `需要毅力达到 ${nextStage.minPerseverance}`
    };
  }

  // 满足所有条件
  return {
    canEvolve: true,
    nextStage
  };
}

/**
 * 获取当前进化阶段信息
 */
export function getCurrentStage(evolutionStage: number): EvolutionStage {
  return EVOLUTION_STAGES[evolutionStage] || EVOLUTION_STAGES[0];
}

/**
 * 获取下一进化阶段信息
 */
export function getNextStage(evolutionStage: number): EvolutionStage | null {
  const nextIndex = evolutionStage + 1;
  return nextIndex < EVOLUTION_STAGES.length ? EVOLUTION_STAGES[nextIndex] : null;
}

/**
 * 计算进化进度百分比
 */
export function getEvolutionProgress(pet: {
  level: number;
  evolution_stage: number;
  intimacy: number;
  intelligence: number;
  creativity: number;
  persistence?: number;
  perseverance?: number;
}): number {
  const perseverance = pet.persistence ?? pet.perseverance ?? 0;
  const nextStage = getNextStage(pet.evolution_stage);
  if (!nextStage) return 100; // 已达到最高阶段

  let totalRequirements = 0;
  let metRequirements = 0;

  // 等级要求
  totalRequirements++;
  if (pet.level >= nextStage.minLevel) metRequirements++;

  // 亲密度要求
  if (nextStage.minIntimacy) {
    totalRequirements++;
    if (pet.intimacy >= nextStage.minIntimacy) metRequirements++;
  }

  // 智力要求
  if (nextStage.minIntelligence) {
    totalRequirements++;
    if (pet.intelligence >= nextStage.minIntelligence) metRequirements++;
  }

  // 创造力要求
  if (nextStage.minCreativity) {
    totalRequirements++;
    if (pet.creativity >= nextStage.minCreativity) metRequirements++;
  }

  // 毅力要求
  if (nextStage.minPerseverance) {
    totalRequirements++;
    if (perseverance >= nextStage.minPerseverance) metRequirements++;
  }

  return Math.round((metRequirements / totalRequirements) * 100);
}

/**
 * 获取进化阶段的外观配置
 */
export function getStageAppearance(evolutionStage: number): {
  size: number;
  glowEffect: boolean;
  specialEffect?: string;
} {
  switch (evolutionStage) {
    case 0: // 宠物蛋
      return { size: 32, glowEffect: false };
    case 1: // 幼年期
      return { size: 40, glowEffect: false };
    case 2: // 少年期
      return { size: 48, glowEffect: false };
    case 3: // 成年期
      return { size: 56, glowEffect: false };
    case 4: // 完全体
      return { size: 64, glowEffect: true, specialEffect: 'aura' };
    case 5: // 传说形态
      return { size: 72, glowEffect: true, specialEffect: 'legendary' };
    default:
      return { size: 48, glowEffect: false };
  }
}
