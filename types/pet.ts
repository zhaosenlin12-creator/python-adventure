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
  | 'silver_lynx'
  | 'forest_maine'
  | 'coffee_shadow'
  | 'husky_rider'
  | 'pom_angel'
  | 'mini_civet'
  | 'dutch_whisker'
  | 'neon_hound'
  | 'qiongqi_howl'
  | 'taowu_flare'
  | 'golden_roc'
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

interface PetCatalogEntry {
  style: PetStyle;
  displayName: string;
  description: string;
  icon: string;
  color: number;
}

const PET_CATALOG: Record<Exclude<PetType, 'egg'>, PetCatalogEntry> = {
  code_kitty: {
    style: 'cute',
    displayName: '英短蓝猫',
    description: '沉稳耐看，成长线完整，适合作为主跟随宠物和图鉴封面。',
    icon: '🐈',
    color: 0x7c96d6,
  },
  algo_bunny: {
    style: 'cute',
    displayName: '银霜灵猫',
    description: '旧版兔系宠物会自动兼容到银霜灵猫素材，保留原有数据但不再展示兔系外观。',
    icon: '🐈',
    color: 0x94a3b8,
  },
  shiba_debugger: {
    style: 'cute',
    displayName: '柴犬',
    description: '元气最足的日常伙伴，家园和开放世界里都很有存在感。',
    icon: '🐕',
    color: 0xf28b39,
  },
  bit_bot: {
    style: 'tech',
    displayName: '金渐层',
    description: '金色层次很强，越成长越高级，适合做视觉主角。',
    icon: '🐈',
    color: 0xf6b341,
  },
  data_sprite: {
    style: 'tech',
    displayName: '边牧',
    description: '轮廓清晰，站姿利落，放在开放世界里非常适合做主力跟宠。',
    icon: '🐕',
    color: 0x4f6dff,
  },
  ava_ai: {
    style: 'tech',
    displayName: '雪豹',
    description: '压迫感和高级感兼具，后期形态尤其适合作为战斗型展示。',
    icon: '🐆',
    color: 0x8aa0ff,
  },
  code_dragon: {
    style: 'mythic',
    displayName: '火龙',
    description: '成长曲线张力极强，战斗气质鲜明，适合高光进化展示。',
    icon: '🐉',
    color: 0xf95d4e,
  },
  giraffe_oracle: {
    style: 'mythic',
    displayName: '应龙',
    description: '天空系传说宠物，形态跨度大，后期仪式感很强。',
    icon: '🐲',
    color: 0x13a39b,
  },
  snow_cat: {
    style: 'mythic',
    displayName: '白泽',
    description: '白金神兽气质很足，图鉴、挂件和小屋展示都很适合。',
    icon: '✨',
    color: 0xd4a62a,
  },
  silver_lynx: {
    style: 'cute',
    displayName: '银霜灵猫',
    description: '银灰色层次细腻，适合作为优雅系的高颜值主宠。',
    icon: '🐈',
    color: 0x94a3b8,
  },
  forest_maine: {
    style: 'cute',
    displayName: '琥斑团猫',
    description: '虎斑卷团的轮廓更稳定，色块对比清楚，适合做高辨识度陪伴宠物。',
    icon: '🐈',
    color: 0x8b5e3c,
  },
  coffee_shadow: {
    style: 'cute',
    displayName: '咖影猫',
    description: '暖棕色系很有质感，进化后依旧保持漂亮轮廓。',
    icon: '🐈',
    color: 0x8c5a3c,
  },
  husky_rider: {
    style: 'cute',
    displayName: '极地哈士奇',
    description: '速度感很强，开放世界携带时辨识度很高。',
    icon: '🐕',
    color: 0x7dd3fc,
  },
  pom_angel: {
    style: 'cute',
    displayName: '绒球博美',
    description: '毛绒感很强，适合治愈系和高亲密互动路线。',
    icon: '🐕',
    color: 0xfbbf24,
  },
  mini_civet: {
    style: 'cute',
    displayName: '迷你灵狸',
    description: '体态小巧，适合在小屋里做灵活系陪伴宠物。',
    icon: '🐾',
    color: 0x64748b,
  },
  dutch_whisker: {
    style: 'cute',
    displayName: '荷兰团子',
    description: '圆润可爱，幼态观感好，适合做轻松治愈风的选择。',
    icon: '🐹',
    color: 0xefb08c,
  },
  neon_hound: {
    style: 'tech',
    displayName: '霓光机犬',
    description: '科技轮廓明确，适合作为灵能与战斗路线的进阶选项。',
    icon: '⚡',
    color: 0x22d3ee,
  },
  qiongqi_howl: {
    style: 'mythic',
    displayName: '穷奇',
    description: '猛兽感强，适合偏近战和压制感的展示风格。',
    icon: '🦁',
    color: 0xb45309,
  },
  taowu_flare: {
    style: 'mythic',
    displayName: '梼杌',
    description: '轮廓凶悍，后期气势很足，适合战斗型阵容。',
    icon: '🔥',
    color: 0xdc2626,
  },
  golden_roc: {
    style: 'mythic',
    displayName: '金鹏',
    description: '飞禽系传说宠物，形态拉伸感很强，适合作为终阶高光。',
    icon: '🪽',
    color: 0xfacc15,
  },
  dog_shiba: {
    style: 'cute',
    displayName: '忠犬柴柴',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🐕',
    color: 0xf59e0b,
  },
  cute_cat: {
    style: 'cute',
    displayName: '代码喵喵',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🐈',
    color: 0xfb7185,
  },
  cute_rabbit: {
    style: 'cute',
    displayName: '银霜灵猫',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🐈',
    color: 0x94a3b8,
  },
  cute_dog: {
    style: 'cute',
    displayName: '逻辑小狗',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🐕',
    color: 0x60a5fa,
  },
  tech_bot: {
    style: 'tech',
    displayName: '比特机器人',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🤖',
    color: 0x22d3ee,
  },
  tech_drone: {
    style: 'tech',
    displayName: '数据精灵',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '🛸',
    color: 0x38bdf8,
  },
  tech_ai: {
    style: 'tech',
    displayName: 'AI 助手',
    description: '旧版兼容宠物，读取时会自动迁移到新的素材体系。',
    icon: '✨',
    color: 0x818cf8,
  },
};

function buildPetConfig(type: Exclude<PetType, 'egg'>): PetConfig {
  const entry = PET_CATALOG[type];
  return {
    type,
    style: entry.style,
    name: type,
    displayName: entry.displayName,
    description: entry.description,
    icon: entry.icon,
    color: entry.color,
  };
}

export const NEW_CUTE_PETS: PetType[] = [
  'code_kitty',
  'shiba_debugger',
  'silver_lynx',
  'forest_maine',
  'coffee_shadow',
  'husky_rider',
  'pom_angel',
  'mini_civet',
  'dutch_whisker',
];

export const NEW_TECH_PETS: PetType[] = [
  'bit_bot',
  'data_sprite',
  'ava_ai',
  'neon_hound',
];

export const NEW_MYTHIC_PETS: PetType[] = [
  'code_dragon',
  'giraffe_oracle',
  'snow_cat',
  'qiongqi_howl',
  'taowu_flare',
  'golden_roc',
];

export const LEGACY_PET_TYPES: PetType[] = [
  'algo_bunny',
  'dog_shiba',
  'cute_cat',
  'cute_rabbit',
  'cute_dog',
  'tech_bot',
  'tech_drone',
  'tech_ai',
];

export const ALL_SELECTABLE_PETS: PetType[] = [
  ...NEW_CUTE_PETS,
  ...NEW_TECH_PETS,
  ...NEW_MYTHIC_PETS,
];

export const PET_STYLE_GROUPS: Record<'cute' | 'tech' | 'mythic', PetType[]> = {
  cute: NEW_CUTE_PETS,
  tech: NEW_TECH_PETS,
  mythic: NEW_MYTHIC_PETS,
};

export const PET_CONFIGS: Record<PetType, PetConfig> = {
  egg: {
    type: 'egg',
    style: 'unknown',
    name: 'egg',
    displayName: '神秘宠物蛋',
    description: '首次通关新关卡会自动推进所有未孵化宠物蛋的进度，满 3 点即可挑选外观孵化。',
    icon: '🥚',
    color: 0xffffff,
  },
  code_kitty: buildPetConfig('code_kitty'),
  algo_bunny: buildPetConfig('algo_bunny'),
  shiba_debugger: buildPetConfig('shiba_debugger'),
  bit_bot: buildPetConfig('bit_bot'),
  data_sprite: buildPetConfig('data_sprite'),
  ava_ai: buildPetConfig('ava_ai'),
  code_dragon: buildPetConfig('code_dragon'),
  giraffe_oracle: buildPetConfig('giraffe_oracle'),
  snow_cat: buildPetConfig('snow_cat'),
  silver_lynx: buildPetConfig('silver_lynx'),
  forest_maine: buildPetConfig('forest_maine'),
  coffee_shadow: buildPetConfig('coffee_shadow'),
  husky_rider: buildPetConfig('husky_rider'),
  pom_angel: buildPetConfig('pom_angel'),
  mini_civet: buildPetConfig('mini_civet'),
  dutch_whisker: buildPetConfig('dutch_whisker'),
  neon_hound: buildPetConfig('neon_hound'),
  qiongqi_howl: buildPetConfig('qiongqi_howl'),
  taowu_flare: buildPetConfig('taowu_flare'),
  golden_roc: buildPetConfig('golden_roc'),
  dog_shiba: buildPetConfig('dog_shiba'),
  cute_cat: buildPetConfig('cute_cat'),
  cute_rabbit: buildPetConfig('cute_rabbit'),
  cute_dog: buildPetConfig('cute_dog'),
  tech_bot: buildPetConfig('tech_bot'),
  tech_drone: buildPetConfig('tech_drone'),
  tech_ai: buildPetConfig('tech_ai'),
};

export function getPetStyleForType(type: PetType): PetStyle {
  if (PET_STYLE_GROUPS.cute.includes(type)) return 'cute';
  if (PET_STYLE_GROUPS.tech.includes(type)) return 'tech';
  if (PET_STYLE_GROUPS.mythic.includes(type)) return 'mythic';
  if (['algo_bunny', 'dog_shiba', 'cute_cat', 'cute_rabbit', 'cute_dog'].includes(type)) return 'cute';
  if (['tech_bot', 'tech_drone', 'tech_ai'].includes(type)) return 'tech';
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
