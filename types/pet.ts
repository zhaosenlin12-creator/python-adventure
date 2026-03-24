export type PetType =
  | 'egg'
  | 'code_kitty'
  | 'algo_bunny'
  | 'shiba_debugger'
  | 'bit_bot'
  | 'data_sprite'
  | 'ava_ai'
  | 'code_dragon'
  | 'giraffe_oracle'
  | 'snow_cat'
  | 'dog_shiba'
  | 'cute_cat'
  | 'cute_rabbit'
  | 'cute_dog'
  | 'tech_bot'
  | 'tech_drone'
  | 'tech_ai';

export type PetStyle = 'cute' | 'tech' | 'mythic' | 'unknown';

export type PetStatus = 'normal' | 'tired' | 'coma' | 'egg';

export type PetMood =
  | 'normal'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'tired'
  | 'curious'
  | 'eating'
  | 'coma'
  | 'playing'
  | 'sleeping'
  | 'walking'
  | 'question';

export interface PetAttributes {
  intelligence: number;
  creativity: number;
  persistence: number;
}

export interface Pet {
  id: number;
  userId: number;
  petType: PetType;
  petStyle: PetStyle;
  name: string;
  level: number;
  exp: number;
  hp: number;
  attributes: PetAttributes;
  codeQuality: number;
  creatorValue: number;
  battlePower: number;
  status: PetStatus;
  lastFeedTime: string | null;
  createdAt: string;
  evolution_stage?: number;
  intimacy?: number;
  intelligence?: number;
  creativity?: number;
  persistence?: number;
  perseverance?: number;
  isEgg?: boolean;
  hatchProgress?: number;
}

export interface PetConfig {
  type: PetType;
  style: PetStyle;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: number;
}

export const PET_CONFIGS: Record<PetType, PetConfig> = {
  egg: {
    type: 'egg',
    style: 'unknown',
    name: 'egg',
    displayName: '神秘宠物蛋',
    description: '完成 3 个关卡后就能孵化，挑选你最喜欢的课堂伙伴。',
    icon: '🥚',
    color: 0xffffff,
  },

  code_kitty: {
    type: 'code_kitty',
    style: 'cute',
    name: 'code_kitty',
    displayName: '灰塔猫',
    description: '安静又机灵的灰猫，总会先发现教室里最细的小线索。',
    icon: '🐱',
    color: 0xf59e0b,
  },
  algo_bunny: {
    type: 'algo_bunny',
    style: 'cute',
    name: 'algo_bunny',
    displayName: '乐跑猎犬',
    description: '一只永远在往前冲的小猎犬，擅长把练习做得又快又稳。',
    icon: '🐶',
    color: 0xfbbf24,
  },
  shiba_debugger: {
    type: 'shiba_debugger',
    style: 'cute',
    name: 'shiba_debugger',
    displayName: '团子熊猫',
    description: '圆滚滚的熊猫伙伴，陪你把每一步代码都练扎实。',
    icon: '🐼',
    color: 0xa3a3a3,
  },

  bit_bot: {
    type: 'bit_bot',
    style: 'tech',
    name: 'bit_bot',
    displayName: '灵光金鱼',
    description: '像一束流动灵感的小金鱼，成长后会化成更亮眼的锦鲤。',
    icon: '🐟',
    color: 0xf97316,
  },
  data_sprite: {
    type: 'data_sprite',
    style: 'tech',
    name: 'data_sprite',
    displayName: '破冰企鹅',
    description: '总能让课堂气氛热起来的企鹅伙伴，成熟后会更有舞台感。',
    icon: '🐧',
    color: 0x38bdf8,
  },
  ava_ai: {
    type: 'ava_ai',
    style: 'tech',
    name: 'ava_ai',
    displayName: '冲刺虎崽',
    description: '看起来软萌，真正开跑时却很有压迫感的冲线型伙伴。',
    icon: '🐯',
    color: 0xf43f5e,
  },

  code_dragon: {
    type: 'code_dragon',
    style: 'mythic',
    name: 'code_dragon',
    displayName: '狮王队长',
    description: '自带领队气场的传奇伙伴，站上场就像拉满了班级主心骨。',
    icon: '🦁',
    color: 0xf59e0b,
  },
  giraffe_oracle: {
    type: 'giraffe_oracle',
    style: 'mythic',
    name: 'giraffe_oracle',
    displayName: '长颈观察员',
    description: '视野开阔又安静的观察者，特别适合陪孩子慢慢看懂问题。',
    icon: '🦒',
    color: 0xeab308,
  },
  snow_cat: {
    type: 'snow_cat',
    style: 'mythic',
    name: 'snow_cat',
    displayName: '云团白猫',
    description: '像软云一样安静的白猫，陪伴感很强，也最容易让人安心。',
    icon: '🐈',
    color: 0xe5e7eb,
  },

  dog_shiba: {
    type: 'dog_shiba',
    style: 'cute',
    name: 'dog_shiba',
    displayName: '忠犬柴柴',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🐕',
    color: 0xf59e0b,
  },
  cute_cat: {
    type: 'cute_cat',
    style: 'cute',
    name: 'cute_cat',
    displayName: '代码喵喵',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🐱',
    color: 0xfb7185,
  },
  cute_rabbit: {
    type: 'cute_rabbit',
    style: 'cute',
    name: 'cute_rabbit',
    displayName: '算法兔兔',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🐰',
    color: 0xfacc15,
  },
  cute_dog: {
    type: 'cute_dog',
    style: 'cute',
    name: 'cute_dog',
    displayName: '逻辑小狗',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🐶',
    color: 0x60a5fa,
  },
  tech_bot: {
    type: 'tech_bot',
    style: 'tech',
    name: 'tech_bot',
    displayName: '比特机器人',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🤖',
    color: 0x22d3ee,
  },
  tech_drone: {
    type: 'tech_drone',
    style: 'tech',
    name: 'tech_drone',
    displayName: '数据精灵',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '🛸',
    color: 0x38bdf8,
  },
  tech_ai: {
    type: 'tech_ai',
    style: 'tech',
    name: 'tech_ai',
    displayName: 'AI 助手',
    description: '旧版兼容宠物，读取时会自动迁移到新画风体系。',
    icon: '✨',
    color: 0x818cf8,
  },
};

export const NEW_CUTE_PETS: PetType[] = ['code_kitty', 'algo_bunny', 'shiba_debugger'];
export const NEW_TECH_PETS: PetType[] = ['bit_bot', 'data_sprite', 'ava_ai'];
export const NEW_MYTHIC_PETS: PetType[] = ['code_dragon', 'giraffe_oracle', 'snow_cat'];

export function getPetStyleForType(type: PetType): PetStyle {
  if (NEW_CUTE_PETS.includes(type) || ['dog_shiba', 'cute_cat', 'cute_rabbit', 'cute_dog'].includes(type)) {
    return 'cute';
  }
  if (NEW_TECH_PETS.includes(type) || ['tech_bot', 'tech_drone', 'tech_ai'].includes(type)) {
    return 'tech';
  }
  if (NEW_MYTHIC_PETS.includes(type)) {
    return 'mythic';
  }
  return 'unknown';
}

export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  5: 100,
  15: 500,
  30: 1500,
  50: 5000,
  100: 20000,
};

export const STATUS_COLORS: Record<PetStatus, string> = {
  normal: 'text-green-500',
  tired: 'text-yellow-500',
  coma: 'text-red-500',
  egg: 'text-purple-500',
};

export const STATUS_TEXT: Record<PetStatus, string> = {
  normal: '健康',
  tired: '疲惫',
  coma: '昏迷',
  egg: '孵化中',
};
