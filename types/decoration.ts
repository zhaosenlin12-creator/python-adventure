/**
 * 装饰品系统类型定义
 */

export type DecorationType = 'furniture' | 'plant' | 'toy' | 'nature' | 'fun' | 'decor' | 'wallpaper' | 'floor';

export type DecorationRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type DecorationScene = 'living' | 'garden';
export type DecorationRenderTone = 'amber' | 'rose' | 'sky' | 'emerald' | 'violet';
export type DecorationRenderMotion = 'none' | 'float' | 'sway' | 'pulse' | 'twinkle' | 'bob';
export type DecorationRenderAccent = 'none' | 'sparkles' | 'notes' | 'bubbles' | 'petals' | 'fireflies';
export type DecorationRenderSurface = 'none' | 'cushion' | 'wood' | 'planter' | 'meadow' | 'spotlight';
export type DecorationRenderBackplate = 'none' | 'halo' | 'panel' | 'gallery' | 'bloom';
export type DecorationShadowProfile = 'soft' | 'grounded' | 'wide';

export interface DecorationRenderHints {
  tone?: DecorationRenderTone;
  motion?: DecorationRenderMotion;
  accent?: DecorationRenderAccent;
  surface?: DecorationRenderSurface;
  backplate?: DecorationRenderBackplate;
  shadow?: DecorationShadowProfile;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
}

export interface Decoration {
  id: string;
  name: string;
  type: DecorationType;
  rarity: DecorationRarity;
  icon: string;
  price: number; // 购买价格（金币）
  unlockLevel: number; // 解锁等级
  description: string;
  effect?: {
    happiness?: number; // 快乐值加成
    comfort?: number; // 舒适度加成
  };
  /** 基础像素尺寸（px），未指定则按类型默认 */
  baseSize?: number;
  /** 场景特定尺寸（px），优先于 baseSize */
  sceneSizes?: Partial<Record<DecorationScene, number>>;
  /** 布局锚点：地面贴边/靠墙/居中 */
  anchor?: 'floor' | 'wall' | 'center';
  /** 渲染提示：用于增强立体感、动态效果和空间表现 */
  renderHints?: DecorationRenderHints;
}

export interface PlacedDecoration {
  id: string;
  decorationId: string;
  x: number;
  y: number;
  rotation?: number;
  scene: DecorationScene;
}

export interface UserDecoration {
  userId: number;
  decorationId: string;
  quantity: number;
  purchasedAt: Date;
}

export const DEFAULT_DECORATION_SIZE_BY_TYPE: Record<DecorationType, number> = {
  furniture: 180,
  plant: 140,
  toy: 110,
  nature: 150,
  fun: 160,
  decor: 170,
  wallpaper: 220,
  floor: 220,
};

export const DECORATION_RENDER_LIBRARY: Record<string, DecorationRenderHints> = {
  sofa_red: { tone: 'amber', motion: 'none', surface: 'cushion', shadow: 'grounded', iconScale: 1.08, iconOffsetY: 2 },
  table_wood: { tone: 'amber', motion: 'none', surface: 'wood', shadow: 'grounded', iconScale: 1.05 },
  bookshelf: { tone: 'amber', motion: 'none', backplate: 'gallery', shadow: 'soft', iconScale: 1.01, iconOffsetY: -2 },
  plant_small: { tone: 'emerald', motion: 'sway', surface: 'planter', accent: 'petals', shadow: 'grounded', iconScale: 1.08 },
  plant_flower: { tone: 'rose', motion: 'sway', surface: 'planter', accent: 'petals', shadow: 'grounded', iconScale: 1.08 },
  plant_tree: { tone: 'emerald', motion: 'sway', surface: 'meadow', accent: 'fireflies', shadow: 'grounded', iconScale: 1.12 },
  toy_ball: { tone: 'amber', motion: 'bob', surface: 'cushion', accent: 'sparkles', shadow: 'soft', iconScale: 1.18, iconOffsetY: 4 },
  toy_robot: { tone: 'sky', motion: 'bob', surface: 'wood', accent: 'sparkles', shadow: 'soft', iconScale: 1.08 },
  toy_teddy: { tone: 'rose', motion: 'bob', surface: 'cushion', accent: 'sparkles', shadow: 'soft', iconScale: 1.08 },
  lamp_floor: { tone: 'amber', motion: 'none', surface: 'spotlight', backplate: 'none', shadow: 'grounded', iconScale: 1.1, iconOffsetY: -4 },
  rug_round: { tone: 'amber', motion: 'none', surface: 'cushion', shadow: 'wide', iconScale: 1.1, iconOffsetY: 8 },
  clock_wall: { tone: 'amber', motion: 'pulse', backplate: 'panel', shadow: 'soft', iconScale: 1.1 },
  bed_cozy: { tone: 'rose', motion: 'none', surface: 'cushion', backplate: 'none', shadow: 'grounded', iconScale: 1.08, iconOffsetY: 3 },
  fish_tank: { tone: 'sky', motion: 'pulse', surface: 'wood', accent: 'bubbles', backplate: 'halo', shadow: 'grounded', iconScale: 0.82, iconOffsetY: 4 },
  cactus: { tone: 'emerald', motion: 'none', surface: 'planter', shadow: 'grounded', iconScale: 1.08 },
  flower_vase: { tone: 'rose', motion: 'sway', surface: 'wood', accent: 'petals', shadow: 'grounded', iconScale: 1.1 },
  cat_tower: { tone: 'amber', motion: 'bob', surface: 'wood', accent: 'sparkles', shadow: 'grounded', iconScale: 1.1 },
  music_box: { tone: 'violet', motion: 'float', surface: 'wood', accent: 'notes', backplate: 'halo', shadow: 'soft', iconScale: 1.08 },
  tv_retro: { tone: 'sky', motion: 'none', surface: 'wood', backplate: 'none', shadow: 'grounded', iconScale: 1.08 },
  fairy_lights: { tone: 'amber', motion: 'twinkle', accent: 'sparkles', backplate: 'halo', shadow: 'soft', iconScale: 1.06, iconOffsetY: -2 },
  picture_frame: { tone: 'emerald', motion: 'float', backplate: 'gallery', shadow: 'soft', iconScale: 0.98 },
};

// 装饰品配置
export const DECORATIONS: Record<string, Decoration> = {
  // 家具类
  sofa_red: {
    id: 'sofa_red',
    name: '红色沙发',
    type: 'furniture',
    rarity: 'common',
    icon: '🛋️',
    price: 100,
    unlockLevel: 1,
    description: '舒适的红色沙发，宠物最爱',
    effect: { comfort: 5 },
    baseSize: 180,
    anchor: 'floor'
  },
  
  table_wood: {
    id: 'table_wood',
    name: '木质桌子',
    type: 'furniture',
    rarity: 'common',
    icon: '🪑',
    price: 80,
    unlockLevel: 1,
    description: '简约的木质桌子',
    effect: { comfort: 3 },
    baseSize: 160,
    anchor: 'floor'
  },
  
  bookshelf: {
    id: 'bookshelf',
    name: '书架',
    type: 'furniture',
    rarity: 'rare',
    icon: '📚',
    price: 200,
    unlockLevel: 5,
    description: '装满书的书架，增加智力',
    effect: { comfort: 10 },
    baseSize: 190,
    anchor: 'wall'
  },
  
  // 植物类
  plant_small: {
    id: 'plant_small',
    name: '小盆栽',
    type: 'plant',
    rarity: 'common',
    icon: '🌱',
    price: 50,
    unlockLevel: 1,
    description: '可爱的小盆栽',
    effect: { happiness: 3 },
    baseSize: 130,
    anchor: 'floor'
  },
  
  plant_flower: {
    id: 'plant_flower',
    name: '花盆',
    type: 'plant',
    rarity: 'common',
    icon: '🌸',
    price: 60,
    unlockLevel: 1,
    description: '美丽的花朵',
    effect: { happiness: 5 },
    baseSize: 140,
    anchor: 'floor'
  },
  
  plant_tree: {
    id: 'plant_tree',
    name: '小树',
    type: 'plant',
    rarity: 'rare',
    icon: '🌳',
    price: 150,
    unlockLevel: 3,
    description: '茁壮成长的小树',
    effect: { happiness: 10 },
    baseSize: 160,
    anchor: 'floor'
  },
  
  // 玩具类
  toy_ball: {
    id: 'toy_ball',
    name: '小球',
    type: 'toy',
    rarity: 'common',
    icon: '⚽',
    price: 30,
    unlockLevel: 1,
    description: '宠物最爱的玩具球',
    effect: { happiness: 5 },
    baseSize: 100,
    anchor: 'floor'
  },
  
  toy_robot: {
    id: 'toy_robot',
    name: '机器人玩具',
    type: 'toy',
    rarity: 'rare',
    icon: '🤖',
    price: 120,
    unlockLevel: 5,
    description: '科技感十足的机器人',
    effect: { happiness: 15 },
    baseSize: 120,
    anchor: 'floor'
  },
  
  toy_teddy: {
    id: 'toy_teddy',
    name: '泰迪熊',
    type: 'toy',
    rarity: 'epic',
    icon: '🧸',
    price: 250,
    unlockLevel: 10,
    description: '超级可爱的泰迪熊',
    effect: { happiness: 25 },
    baseSize: 130,
    anchor: 'floor'
  },

  // ─── 新增 12 种装饰品 ───

  lamp_floor: {
    id: 'lamp_floor',
    name: '落地灯',
    type: 'furniture',
    rarity: 'common',
    icon: '💡',
    price: 90,
    unlockLevel: 2,
    description: '暖色灯光点亮小屋',
    effect: { comfort: 4, happiness: 2 },
    baseSize: 150,
    anchor: 'floor'
  },

  rug_round: {
    id: 'rug_round',
    name: '圆形地毯',
    type: 'furniture',
    rarity: 'common',
    icon: '🧶',
    price: 70,
    unlockLevel: 2,
    description: '柔软温暖的圆形地毯',
    effect: { comfort: 6 },
    baseSize: 200,
    anchor: 'floor'
  },

  clock_wall: {
    id: 'clock_wall',
    name: '挂钟',
    type: 'furniture',
    rarity: 'rare',
    icon: '🕰️',
    price: 120,
    unlockLevel: 4,
    description: '复古圆形挂钟，追寻时光',
    effect: { comfort: 5 },
    baseSize: 120,
    anchor: 'wall'
  },

  bed_cozy: {
    id: 'bed_cozy',
    name: '温馨小床',
    type: 'furniture',
    rarity: 'rare',
    icon: '🛏️',
    price: 180,
    unlockLevel: 6,
    description: '蓝色被子和软柕子，宝贝的梦乡',
    effect: { comfort: 15, happiness: 5 },
    baseSize: 200,
    anchor: 'floor'
  },

  fish_tank: {
    id: 'fish_tank',
    name: '观赏鱼缸',
    type: 'nature',
    rarity: 'epic',
    icon: '🐠',
    price: 300,
    unlockLevel: 8,
    description: '热带鱼在水草中游动，治愈力满分',
    effect: { happiness: 20, comfort: 10 },
    baseSize: 148,
    anchor: 'floor'
  },

  cactus: {
    id: 'cactus',
    name: '开花仙人掌',
    type: 'nature',
    rarity: 'common',
    icon: '🌵',
    price: 55,
    unlockLevel: 1,
    description: '顶上开着粉色小花的可爱仙人掌',
    effect: { happiness: 3 },
    baseSize: 130,
    anchor: 'floor'
  },

  flower_vase: {
    id: 'flower_vase',
    name: '花瓶花束',
    type: 'nature',
    rarity: 'rare',
    icon: '🌺',
    price: 140,
    unlockLevel: 3,
    description: '紫色花瓶配五彩花束，美不胜收',
    effect: { happiness: 10, comfort: 3 },
    baseSize: 140,
    anchor: 'floor'
  },

  cat_tower: {
    id: 'cat_tower',
    name: '猫爪架',
    type: 'fun',
    rarity: 'epic',
    icon: '🐱',
    price: 280,
    unlockLevel: 7,
    description: '多层猫爪架带洞穴和吴球，宠物的乐园',
    effect: { happiness: 25, comfort: 8 },
    baseSize: 180,
    anchor: 'floor'
  },

  music_box: {
    id: 'music_box',
    name: '音乐盒',
    type: 'fun',
    rarity: 'rare',
    icon: '🎵',
    price: 160,
    unlockLevel: 5,
    description: '打开盒盖，流淌出柔和旋律',
    effect: { happiness: 15, comfort: 5 },
    baseSize: 130,
    anchor: 'floor'
  },

  tv_retro: {
    id: 'tv_retro',
    name: '复古电视机',
    type: 'fun',
    rarity: 'rare',
    icon: '📺',
    price: 200,
    unlockLevel: 6,
    description: '带天线和旋钮的复古CRT电视',
    effect: { happiness: 12, comfort: 6 },
    baseSize: 160,
    anchor: 'floor'
  },

  fairy_lights: {
    id: 'fairy_lights',
    name: '彩色串灯',
    type: 'decor',
    rarity: 'rare',
    icon: '✨',
    price: 130,
    unlockLevel: 4,
    description: '七彩灯泡营造梦幻氛围',
    effect: { happiness: 10, comfort: 8 },
    baseSize: 220,
    anchor: 'wall'
  },

  picture_frame: {
    id: 'picture_frame',
    name: '山水画框',
    type: 'decor',
    rarity: 'epic',
    icon: '🖼️',
    price: 220,
    unlockLevel: 8,
    description: '精美木框裱着山水绿意，挂在墙上赏心悦目',
    effect: { happiness: 8, comfort: 12 },
    baseSize: 160,
    anchor: 'wall'
  },
};

Object.entries(DECORATION_RENDER_LIBRARY).forEach(([decorationId, renderHints]) => {
  if (DECORATIONS[decorationId]) {
    DECORATIONS[decorationId].renderHints = renderHints;
  }
});

export function getDecorationDisplaySize(
  decoration: Decoration | undefined,
  scene: DecorationScene,
  overrideSize?: number
) {
  if (overrideSize) return overrideSize;
  if (!decoration) return 120;

  const sceneSize = decoration.sceneSizes?.[scene];
  if (sceneSize) return sceneSize;
  if (decoration.baseSize) return decoration.baseSize;
  return DEFAULT_DECORATION_SIZE_BY_TYPE[decoration.type] ?? 120;
}

// 稀有度颜色
export const RARITY_COLORS: Record<DecorationRarity, string> = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

// 稀有度文本
export const RARITY_TEXT: Record<DecorationRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};

// 类型文本
export const TYPE_TEXT: Record<DecorationType, string> = {
  furniture: '家具',
  plant: '植物',
  toy: '玩具',
  nature: '自然',
  fun: '趣味',
  decor: '装饰',
  wallpaper: '壁纸',
  floor: '地板'
};
