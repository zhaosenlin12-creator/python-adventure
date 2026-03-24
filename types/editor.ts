/**
 * 创意工坊编辑器类型定义
 * Requirements: 16.1, 16.3
 */

// ==================== 基础类型 ====================

export type ElementCategory = 
  | 'platforms'    // 平台类
  | 'enemies'      // 敌人类
  | 'mechanisms'   // 机关类
  | 'traps'        // 陷阱类
  | 'collectibles' // 收集物
  | 'special';     // 特殊元素(起点/终点)

export type EditorTool = 'select' | 'place' | 'delete' | 'pan';

export type Difficulty = 1 | 2 | 3;

// ==================== 元素配置类型 ====================

/** 平台类型 */
export type PlatformType = 
  | 'ground' 
  | 'platform' 
  | 'moving' 
  | 'ceiling' 
  | 'disappearing' 
  | 'bouncy' 
  | 'gravity_flip' 
  | 'conveyor';

/** 平台配置 */
export interface PlatformConfig {
  platformType: PlatformType;
  // 移动平台 - 路径移动模式 (movingPlatforms)
  movePath?: { x: number; y: number }[];
  moveSpeed?: number;
  // 移动平台 - 自动往返模式 (autoMovingPlatforms)
  moveDirection?: 'horizontal' | 'vertical';  // 移动方向
  moveDistance?: number;  // 移动距离
  // 消失平台
  disappearTime?: number;
  // 弹跳平台
  bounceForce?: number;
  // 传送带
  conveyorSpeed?: number;
  conveyorDirection?: 'left' | 'right';
}

/** 平台默认尺寸 */
export const PLATFORM_DEFAULT_SIZES: Record<PlatformType, { width: number; height: number }> = {
  ground: { width: 200, height: 30 },
  platform: { width: 120, height: 24 },
  moving: { width: 100, height: 24 },
  ceiling: { width: 150, height: 20 },
  disappearing: { width: 80, height: 24 },
  bouncy: { width: 100, height: 24 },
  gravity_flip: { width: 100, height: 24 },
  conveyor: { width: 150, height: 24 },
};

/** 敌人类型 */
export type EnemyType = 'basic' | 'bat' | 'robot' | 'slime' | 'boss';

/** Boss阶段配置 */
export interface BossPhase {
  hpThreshold: number;
  attacks: string[];
  speed: number;
}

/** 敌人配置 */
export interface EnemyConfig {
  enemyType: EnemyType;
  // 巡逻配置
  patrolDistance?: number;  // 巡逻范围（像素）
  moveSpeed?: number;  // 移动速度
  // Boss配置
  bossConfig?: {
    hp: number;
    phases?: BossPhase[];
    defeatCondition: 'combat' | 'quiz' | 'hybrid';
    questionsRequired?: number;
    // 🔥 Boss技能配置（开关式选择）
    skills?: BossSkillConfig;
  };
}

/** 🔥 Boss技能配置 - 每个技能都是开关式选择 */
export interface BossSkillConfig {
  // 基础攻击技能
  shoot?: boolean;           // 远程射击（发射子弹）
  tripleShot?: boolean;      // 三连发射击
  // 移动技能
  charge?: boolean;          // 冲刺攻击（快速冲向玩家）
  teleport?: boolean;        // 瞬移（随机传送）
  // 范围技能
  shockwave?: boolean;       // 冲击波（范围伤害）
  laser?: boolean;           // 激光扫射
  // 召唤技能
  summonMinions?: boolean;   // 召唤小怪
  // 防御技能
  shield?: boolean;          // 护盾（短暂无敌）
  // 特殊技能
  enrage?: boolean;          // 狂暴（血量低时增强）
}

/** 敌人默认配置 */
export const ENEMY_DEFAULT_CONFIG: Record<EnemyType, { patrolDistance: number; moveSpeed: number; size: number }> = {
  basic: { patrolDistance: 150, moveSpeed: 60, size: 32 },
  bat: { patrolDistance: 200, moveSpeed: 80, size: 28 },
  robot: { patrolDistance: 180, moveSpeed: 70, size: 36 },
  slime: { patrolDistance: 100, moveSpeed: 40, size: 32 },
  boss: { patrolDistance: 300, moveSpeed: 100, size: 64 },
};

/** 机关类型 */
export type MechanismType = 
  | 'button' 
  | 'lever' 
  | 'door' 
  | 'portal' 
  | 'trampoline' 
  | 'wind' 
  | 'gravity_zone';

/** 机关配置 */
export interface MechanismConfig {
  mechanismType: MechanismType;
  linkedTo?: string;
  effect?: Record<string, unknown>;
  // 传送门
  portalId?: string;       // 传送门自己的ID
  portalColor?: string;    // 传送门颜色
  // 风力区域
  windDirection?: 'left' | 'right' | 'up' | 'down';
  windForce?: number;
  // 重力区域
  gravityMultiplier?: number;  // -1为反重力，1为正常，2为双倍重力
}

/** 陷阱类型 */
export type TrapType = 'spike' | 'fire' | 'electric' | 'explosion';

/** 陷阱配置 */
export interface TrapConfig {
  trapType: TrapType;
  damage: number;
  pattern: 'static' | 'periodic' | 'triggered';
}

/** 收集物类型 */
export type CollectibleType = 'coin' | 'gem' | 'key' | 'clue' | 'health_pack';

/** 收集物配置 */
export interface CollectibleConfig {
  collectibleType: CollectibleType;
  value?: number;
}

/** 奖励类型 */
export type RewardType = 'unlock_door' | 'give_item' | 'hp' | 'coins' | 'xp';

/** 答题触发点配置 */
export interface QuestionTriggerConfig {
  questionId: string;
  reward: {
    type: RewardType;
    value?: number;
  };
}

/** 特殊元素配置 (起点/终点) */
export interface SpecialConfig {
  specialType: 'player_start' | 'goal';
}

// ==================== 元素配置联合类型 ====================

export type ElementConfig = 
  | PlatformConfig 
  | EnemyConfig 
  | MechanismConfig 
  | TrapConfig 
  | CollectibleConfig 
  | QuestionTriggerConfig
  | SpecialConfig;

// ==================== 编辑器元素 ====================

/** 元素类型定义 */
export interface ElementTypeInfo {
  id: string;
  name: string;
  nameCN: string;
  icon: string;
  category: ElementCategory;
  defaultConfig: ElementConfig;
  isAdvanced: boolean;
  tooltip: string;
}

/** 编辑器元素 */
export interface EditorElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config: ElementConfig;
}

// ==================== 自定义题目 ====================

/** 题目类型 */
export type QuestionType = 'choice' | 'fill' | 'math' | 'logic';

/** 自定义题目 */
export interface CustomQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | string[];
  explanation?: string;
  difficulty: Difficulty;
  reward?: {
    type: RewardType;
    value?: number;
  };
}

// ==================== 关卡数据 ====================

/** 位置坐标 */
export interface Position {
  x: number;
  y: number;
}

/** 关卡元数据 */
export interface LevelMeta {
  name: string;
  description: string;
  difficulty: Difficulty;
  mapWidth: number;
  mapHeight: number;
}

/** 完整关卡数据 */
export interface CustomLevelData {
  // 元数据
  id?: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  authorId: string;
  authorName: string;
  createdAt?: string;
  updatedAt?: string;
  
  // 地图配置
  mapWidth: number;
  mapHeight: number;
  
  // 玩家起点
  playerStart: Position;
  
  // 终点
  goal: Position | null;
  
  // 元素数据
  elements: EditorElement[];
  
  // 自定义题目
  questions: CustomQuestion[];
}

// ==================== 预设模板 ====================

/** 关卡模板 */
export interface LevelTemplate {
  id: string;
  name: string;
  nameCN: string;
  description: string;
  thumbnail: string;
  difficulty: Difficulty;
  levelData: CustomLevelData;
}

// ==================== 编辑器状态快照 (用于撤销/重做) ====================

/** 编辑器状态快照 */
export interface EditorSnapshot {
  elements: EditorElement[];
  playerStart: Position;
  goal: Position | null;
  questions: CustomQuestion[];
}

// ==================== 验证相关 ====================

/** 地图尺寸限制 - 扩大以支持战役模式大地图（最大18000x4000） */
export const MAP_DIMENSION_LIMITS = {
  width: { min: 800, max: 20000 },
  height: { min: 600, max: 5000 },
} as const;

/** 验证地图宽度 */
export function isValidMapWidth(width: number): boolean {
  return width >= MAP_DIMENSION_LIMITS.width.min && width <= MAP_DIMENSION_LIMITS.width.max;
}

/** 验证地图高度 */
export function isValidMapHeight(height: number): boolean {
  return height >= MAP_DIMENSION_LIMITS.height.min && height <= MAP_DIMENSION_LIMITS.height.max;
}

/** 验证地图尺寸 */
export function isValidMapDimensions(width: number, height: number): boolean {
  return isValidMapWidth(width) && isValidMapHeight(height);
}

// ==================== 序列化相关 ====================

/** 序列化关卡数据为JSON字符串 */
export function serializeLevelData(data: CustomLevelData): string {
  return JSON.stringify(data);
}

/** 反序列化JSON字符串为关卡数据 */
export function deserializeLevelData(json: string): CustomLevelData {
  return JSON.parse(json) as CustomLevelData;
}

/** 验证关卡数据是否包含必需的元数据 */
export function hasRequiredMetadata(data: CustomLevelData): boolean {
  return (
    typeof data.name === 'string' &&
    data.name.length > 0 &&
    typeof data.mapWidth === 'number' &&
    typeof data.mapHeight === 'number' &&
    data.playerStart !== null &&
    typeof data.playerStart.x === 'number' &&
    typeof data.playerStart.y === 'number'
  );
}

/** 深度比较两个关卡数据是否相等 */
export function areLevelDataEqual(a: CustomLevelData, b: CustomLevelData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ==================== 关卡验证相关 ====================

/** 关卡验证结果 */
export interface LevelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 位置验证结果 */
export interface PositionValidationResult {
  valid: boolean;
  warnings: string[];
}

/**
 * 验证位置是否在地图边界内
 * Requirements: 9.4
 */
export function isPositionInBounds(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  margin: number = 32
): boolean {
  return x >= margin && x <= mapWidth - margin && y >= margin && y <= mapHeight - margin;
}

/**
 * 验证关卡是否满足测试/保存的最低要求
 * Requirements: 10.1, 7.4
 * - 必须有起点（playerStart）
 * - 必须有终点（goal）
 */
export function validateLevelForTesting(data: CustomLevelData): LevelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 验证起点
  if (!data.playerStart || typeof data.playerStart.x !== 'number' || typeof data.playerStart.y !== 'number') {
    errors.push('关卡必须设置玩家起点');
  }
  
  // 验证终点 (Requirements: 7.4, 10.1)
  if (!data.goal || typeof data.goal.x !== 'number' || typeof data.goal.y !== 'number') {
    errors.push('关卡必须设置终点');
  }
  
  // 验证地图尺寸
  if (!isValidMapDimensions(data.mapWidth, data.mapHeight)) {
    errors.push(`地图尺寸无效 (宽度: ${MAP_DIMENSION_LIMITS.width.min}-${MAP_DIMENSION_LIMITS.width.max}, 高度: ${MAP_DIMENSION_LIMITS.height.min}-${MAP_DIMENSION_LIMITS.height.max})`);
  }
  
  // 验证关卡名称
  if (!data.name || data.name.trim() === '') {
    errors.push('关卡必须有名称');
  }
  
  // 可选警告：没有平台元素
  const platformElements = data.elements.filter(el => 
    el.type === 'platform' || el.type === 'ground' || el.type === 'moving'
  );
  if (platformElements.length === 0) {
    warnings.push('关卡没有任何平台，玩家可能无法到达终点');
  }
  
  // 可选警告：起点和终点位置相同
  if (data.playerStart && data.goal) {
    const distance = Math.sqrt(
      Math.pow(data.goal.x - data.playerStart.x, 2) + 
      Math.pow(data.goal.y - data.playerStart.y, 2)
    );
    if (distance < 50) {
      warnings.push('起点和终点距离过近');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
