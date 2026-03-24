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
    displayName: '英短蓝猫',
    description: '稳重又耐看的蓝猫伙伴，低阶就有陪伴感，越进化越有主角气质。',
    icon: '🐈',
    color: 0x7c96d6,
  },
  algo_bunny: {
    type: 'algo_bunny',
    style: 'cute',
    name: 'algo_bunny',
    displayName: '垂耳兔',
    description: '柔软、轻盈、进化层次很完整，特别适合做有陪伴感的养成线。',
    icon: '🐇',
    color: 0xf59fc3,
  },
  shiba_debugger: {
    type: 'shiba_debugger',
    style: 'cute',
    name: 'shiba_debugger',
    displayName: '柴犬',
    description: '元气感最强的日常伙伴，开场讨喜，终阶也有很高的辨识度。',
    icon: '🐕',
    color: 0xf28b39,
  },

  bit_bot: {
    type: 'bit_bot',
    style: 'tech',
    name: 'bit_bot',
    displayName: '金渐层',
    description: '金色层次非常漂亮，成长过程中从萌感到高级感的变化最明显。',
    icon: '🐈',
    color: 0xf6b341,
  },
  data_sprite: {
    type: 'data_sprite',
    style: 'tech',
    name: 'data_sprite',
    displayName: '边牧',
    description: '轮廓清晰、存在感强，放到家园和开放世界里都非常像主力跟宠。',
    icon: '🐕',
    color: 0x4f6dff,
  },
  ava_ai: {
    type: 'ava_ai',
    style: 'tech',
    name: 'ava_ai',
    displayName: '雪豹',
    description: '从幼态到终阶都很有压迫感，最适合做高光展示和强存在感跟随。',
    icon: '🐆',
    color: 0x8aa0ff,
  },

  code_dragon: {
    type: 'code_dragon',
    style: 'mythic',
    name: 'code_dragon',
    displayName: '火龙',
    description: '战意最强的一条成长线，终阶火龙非常适合做进化和战斗高光。',
    icon: '🐲',
    color: 0xf95d4e,
  },
  giraffe_oracle: {
    type: 'giraffe_oracle',
    style: 'mythic',
    name: 'giraffe_oracle',
    displayName: '应龙',
    description: '形态跨度很大，终阶非常有仪式感，适合做传说线的天空主角。',
    icon: '🐉',
    color: 0x13a39b,
  },
  snow_cat: {
    type: 'snow_cat',
    style: 'mythic',
    name: 'snow_cat',
    displayName: '白泽',
    description: '白金色调和神兽气质都很完整，最适合做图鉴压轴和荣誉展示。',
    icon: '✨',
    color: 0xd4a62a,
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
