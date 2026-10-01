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
  /** 视觉素材宽高比，用于选择框/点击热区匹配非方形资产 */
  visualAspect?: number;
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
  sofa_red: { tone: 'amber', motion: 'none', surface: 'cushion', shadow: 'grounded', iconScale: 1.0, iconOffsetY: 2 },
  table_wood: { tone: 'amber', motion: 'none', surface: 'wood', shadow: 'grounded', iconScale: 1.05 },
  bookshelf: { tone: 'amber', motion: 'none', backplate: 'gallery', shadow: 'soft', iconScale: 1.01, iconOffsetY: -2 },
  plant_small: { tone: 'emerald', motion: 'sway', surface: 'planter', accent: 'petals', shadow: 'grounded', iconScale: 1.08 },
  plant_flower: { tone: 'rose', motion: 'sway', surface: 'planter', accent: 'petals', shadow: 'grounded', iconScale: 0.98 },
  plant_tree: { tone: 'emerald', motion: 'sway', surface: 'meadow', accent: 'fireflies', shadow: 'grounded', iconScale: 0.96 },
  toy_ball: { tone: 'amber', motion: 'bob', surface: 'cushion', accent: 'sparkles', shadow: 'soft', iconScale: 1.18, iconOffsetY: 4 },
  toy_robot: { tone: 'sky', motion: 'bob', surface: 'wood', accent: 'sparkles', shadow: 'soft', iconScale: 1.08 },
  toy_teddy: { tone: 'rose', motion: 'bob', surface: 'cushion', accent: 'sparkles', shadow: 'soft', iconScale: 0.96 },
  lamp_floor: { tone: 'amber', motion: 'pulse', surface: 'spotlight', backplate: 'none', shadow: 'grounded', iconScale: 0.98, iconOffsetY: -4 },
  rug_round: { tone: 'rose', motion: 'none', surface: 'cushion', shadow: 'wide', iconScale: 1.0, iconOffsetY: 8 },
  clock_wall: { tone: 'amber', motion: 'pulse', backplate: 'panel', shadow: 'soft', iconScale: 1.1 },
  bed_cozy: { tone: 'sky', motion: 'none', surface: 'cushion', backplate: 'none', shadow: 'grounded', iconScale: 0.98, iconOffsetY: 3 },
  fish_tank: { tone: 'sky', motion: 'pulse', surface: 'wood', accent: 'bubbles', backplate: 'halo', shadow: 'grounded', iconScale: 1.02, iconOffsetY: 4 },
  cactus: { tone: 'emerald', motion: 'none', surface: 'planter', shadow: 'grounded', iconScale: 1.08 },
  flower_vase: { tone: 'rose', motion: 'sway', surface: 'wood', accent: 'petals', shadow: 'grounded', iconScale: 1.1 },
  cat_tower: { tone: 'amber', motion: 'bob', surface: 'wood', accent: 'sparkles', shadow: 'grounded', iconScale: 0.98 },
  music_box: { tone: 'violet', motion: 'float', surface: 'wood', accent: 'notes', backplate: 'halo', shadow: 'soft', iconScale: 1.08 },
  tv_retro: { tone: 'sky', motion: 'none', surface: 'wood', backplate: 'none', shadow: 'grounded', iconScale: 1.08 },
  fairy_lights: { tone: 'amber', motion: 'twinkle', accent: 'sparkles', backplate: 'halo', shadow: 'soft', iconScale: 0.96, iconOffsetY: -2 },
  picture_frame: { tone: 'emerald', motion: 'float', backplate: 'gallery', shadow: 'soft', iconScale: 0.98 },
};

// 装饰品配置
export const DECORATIONS: Record<string, Decoration> = {
  // 家具类
  sofa_red: {
    id: 'sofa_red',
    name: '猫耳云朵沙发',
    type: 'furniture',
    rarity: 'common',
    icon: '🛋️',
    price: 100,
    unlockLevel: 1,
    description: '猫耳靠背和爪爪抱枕，柔软又亲切',
    effect: { comfort: 5 },
    baseSize: 188,
    visualAspect: 1.36,
    anchor: 'floor'
  },
  
  table_wood: {
    id: 'table_wood',
    name: '松果圆圆桌',
    type: 'furniture',
    rarity: 'common',
    icon: '🪑',
    price: 80,
    unlockLevel: 1,
    description: '圆圆桌脚和爪印抽屉，刚好放下小点心',
    effect: { comfort: 3 },
    baseSize: 160,
    visualAspect: 1.07,
    anchor: 'floor'
  },
  
  bookshelf: {
    id: 'bookshelf',
    name: '童话小书架',
    type: 'furniture',
    rarity: 'rare',
    icon: '📚',
    price: 200,
    unlockLevel: 5,
    description: '拱形小书架，摆满彩色故事书',
    effect: { comfort: 10 },
    baseSize: 190,
    visualAspect: 0.74,
    anchor: 'wall'
  },
  
  // 植物类
  plant_small: {
    id: 'plant_small',
    name: '嫩芽小盆栽',
    type: 'plant',
    rarity: 'common',
    icon: '🌱',
    price: 50,
    unlockLevel: 1,
    description: '爪印陶盆里长出一颗软乎乎的小嫩芽',
    effect: { happiness: 3 },
    baseSize: 130,
    visualAspect: 0.82,
    anchor: 'floor'
  },
  
  plant_flower: {
    id: 'plant_flower',
    name: '爪印花花盆',
    type: 'plant',
    rarity: 'common',
    icon: '🌸',
    price: 60,
    unlockLevel: 1,
    description: '圆润陶盆和奶油色花朵，让小屋更有生命力',
    effect: { happiness: 5 },
    baseSize: 146,
    visualAspect: 0.86,
    anchor: 'floor'
  },
  
  plant_tree: {
    id: 'plant_tree',
    name: '童话小树',
    type: 'plant',
    rarity: 'rare',
    icon: '🌳',
    price: 150,
    unlockLevel: 3,
    description: '木桶里长出的童话树，带一点萤火星光',
    effect: { happiness: 10 },
    baseSize: 168,
    visualAspect: 0.81,
    anchor: 'floor'
  },
  
  // 玩具类
  toy_ball: {
    id: 'toy_ball',
    name: '星星玩具球',
    type: 'toy',
    rarity: 'common',
    icon: '⚽',
    price: 30,
    unlockLevel: 1,
    description: '柔软拼布和星星爪印，滚起来刚刚好',
    effect: { happiness: 5 },
    baseSize: 100,
    visualAspect: 0.95,
    anchor: 'floor'
  },
  
  toy_robot: {
    id: 'toy_robot',
    name: '圆圆陪伴机器人',
    type: 'toy',
    rarity: 'rare',
    icon: '🤖',
    price: 120,
    unlockLevel: 5,
    description: '会陪宠物玩耍的圆滚滚小伙伴',
    effect: { happiness: 15 },
    baseSize: 120,
    visualAspect: 0.81,
    anchor: 'floor'
  },
  
  toy_teddy: {
    id: 'toy_teddy',
    name: '暖心抱抱熊',
    type: 'toy',
    rarity: 'epic',
    icon: '🧸',
    price: 250,
    unlockLevel: 10,
    description: '手作绒毛与爱心刺绣，适合陪宠物午睡',
    effect: { happiness: 25 },
    baseSize: 136,
    visualAspect: 0.89,
    anchor: 'floor'
  },

  // ─── 新增 12 种装饰品 ───

  lamp_floor: {
    id: 'lamp_floor',
    name: '蘑菇暖光灯',
    type: 'furniture',
    rarity: 'common',
    icon: '💡',
    price: 90,
    unlockLevel: 2,
    description: '亚麻灯罩散出柔和暖光，夜晚也很安心',
    effect: { comfort: 4, happiness: 2 },
    baseSize: 166,
    visualAspect: 0.61,
    anchor: 'floor'
  },

  rug_round: {
    id: 'rug_round',
    name: '云朵爪爪毯',
    type: 'furniture',
    rarity: 'common',
    icon: '🧶',
    price: 70,
    unlockLevel: 2,
    description: '云朵形绒面和爪爪织纹，踩上去像棉花',
    effect: { comfort: 6 },
    baseSize: 188,
    visualAspect: 1.09,
    anchor: 'floor'
  },

  clock_wall: {
    id: 'clock_wall',
    name: '童话挂钟',
    type: 'furniture',
    rarity: 'rare',
    icon: '🕰️',
    price: 120,
    unlockLevel: 4,
    description: '星星刻度和叶子边框，让时间也变得温柔',
    effect: { comfort: 5 },
    baseSize: 120,
    visualAspect: 0.98,
    anchor: 'wall'
  },

  bed_cozy: {
    id: 'bed_cozy',
    name: '云朵宠物床',
    type: 'furniture',
    rarity: 'rare',
    icon: '🛏️',
    price: 180,
    unlockLevel: 6,
    description: '软包靠垫和小云枕，给宠物一个安心角落',
    effect: { comfort: 15, happiness: 5 },
    baseSize: 170,
    visualAspect: 2.29,
    anchor: 'floor'
  },

  fish_tank: {
    id: 'fish_tank',
    name: '圆角治愈鱼缸',
    type: 'nature',
    rarity: 'epic',
    icon: '🐠',
    price: 300,
    unlockLevel: 8,
    description: '圆角玻璃、柔和水光和小鱼泡泡，安静治愈',
    effect: { happiness: 20, comfort: 10 },
    baseSize: 148,
    visualAspect: 1.36,
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
    description: '没有尖刺的圆滚滚仙人掌，开着一朵小花',
    effect: { happiness: 3 },
    baseSize: 130,
    visualAspect: 0.82,
    anchor: 'floor'
  },

  flower_vase: {
    id: 'flower_vase',
    name: '彩虹花束瓶',
    type: 'nature',
    rarity: 'rare',
    icon: '🌺',
    price: 140,
    unlockLevel: 3,
    description: '奶油陶瓶插着五彩花朵，给小屋添一束好心情',
    effect: { happiness: 10, comfort: 3 },
    baseSize: 140,
    visualAspect: 0.74,
    anchor: 'floor'
  },

  cat_tower: {
    id: 'cat_tower',
    name: '奶油猫爪乐园',
    type: 'fun',
    rarity: 'epic',
    icon: '🐱',
    price: 280,
    unlockLevel: 7,
    description: '爬梯、洞穴和吊球组成的迷你活动乐园',
    effect: { happiness: 25, comfort: 8 },
    baseSize: 184,
    visualAspect: 0.85,
    anchor: 'floor'
  },

  music_box: {
    id: 'music_box',
    name: '星月音乐盒',
    type: 'fun',
    rarity: 'rare',
    icon: '🎵',
    price: 160,
    unlockLevel: 5,
    description: '月亮和星星陪你播放一段轻柔旋律',
    effect: { happiness: 15, comfort: 5 },
    baseSize: 130,
    visualAspect: 0.87,
    anchor: 'floor'
  },

  tv_retro: {
    id: 'tv_retro',
    name: '圆角故事电视',
    type: 'fun',
    rarity: 'rare',
    icon: '📺',
    price: 200,
    unlockLevel: 6,
    description: '圆角小屏幕，适合播放宠物故事',
    effect: { happiness: 12, comfort: 6 },
    baseSize: 160,
    visualAspect: 1.08,
    anchor: 'floor'
  },

  fairy_lights: {
    id: 'fairy_lights',
    name: '星叶小串灯',
    type: 'decor',
    rarity: 'rare',
    icon: '✨',
    price: 130,
    unlockLevel: 4,
    description: '星叶夹子和柔和彩灯，挂起来会微微闪烁',
    effect: { happiness: 10, comfort: 8 },
    baseSize: 178,
    visualAspect: 2.9,
    anchor: 'wall'
  },

  picture_frame: {
    id: 'picture_frame',
    name: '森林画框',
    type: 'decor',
    rarity: 'epic',
    icon: '🖼️',
    price: 220,
    unlockLevel: 8,
    description: '拱形木框装着一小片晴天森林',
    effect: { happiness: 8, comfort: 12 },
    baseSize: 160,
    visualAspect: 0.76,
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
