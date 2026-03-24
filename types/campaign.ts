/**
 * 战役模式类型定义
 */

export interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'normal' | 'moving' | 'breakable' | 'bouncy';
}

export interface Enemy {
    id: string;
    x: number;
    y: number;
    type: 'basic' | 'flying' | 'boss';
    health: number;
    damage: number;
    patrolRange?: number;
}

export interface NPC {
    id: string;
    x: number;
    y: number;
    name: string;
    avatar: string;
    dialogues: Dialogue[];
}

export interface Dialogue {
    id: string;
    text: string;
    options?: DialogueOption[];
    next?: string;
}

export interface DialogueOption {
    text: string;
    nextDialogue: string;
    condition?: string;
}

export interface Challenge {
    id: string;
    x: number;
    y: number;
    type: 'code' | 'puzzle' | 'quiz';
    difficulty: 'easy' | 'medium' | 'hard';
    title: string;
    description: string;
    code?: string;
    expectedOutput?: string;
    testCases?: { input: string; output: string }[];
}

export interface Collectible {
    id: string;
    x: number;
    y: number;
    type: 'coin' | 'star' | 'key' | 'powerup';
    value: number;
}

export interface MapData {
    width: number;
    height: number;
    platforms: Platform[];
    enemies: Enemy[];
    npcs: NPC[];
    challenges: Challenge[];
    collectibles: Collectible[];
    spawnPoint: { x: number; y: number };
    exitPoint: { x: number; y: number };
    background?: string;
}

export interface Objective {
    type: 'reach' | 'collect' | 'defeat' | 'solve';
    target: string;
    count: number;
    description: string;
}

export interface Rewards {
    exp: number;
    coins: number;
    skills?: string[];
    items?: string[];
}

export interface UnlockRequirements {
    previousLevel?: number;
    minLevel?: number;
    requiredSkills?: string[];
}

export interface CampaignLevel {
    id: number;
    chapter: number;
    order: number;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    mapData: MapData;
    objectives: Objective[];
    rewards: Rewards;
    unlockRequirements: UnlockRequirements;
    estimatedTime: number; // 预计完成时间（分钟）
    thumbnail?: string;
}

export interface CampaignProgress {
    userId: number;
    completedLevels: number[];
    currentLevel: number;
    stars: { [levelId: number]: number };
    achievements: string[];
    totalPlayTime: number;
    lastPlayed: Date;
}

/**
 * 关卡结算结果
 */
export interface LevelResult {
    completed: boolean;
    stars: number;              // 1-3星
    questionsCorrect: number;   // 答对题目数
    questionsTotal: number;     // 总题目数
    itemsCollected: number;     // 收集物品数
    itemsTotal: number;         // 总物品数
    hpRemaining: number;        // 剩余HP
    hpTotal: number;            // 总HP
    enemiesDefeated: number;    // 击败敌人数
    enemiesTotal: number;       // 总敌人数
    timeUsed: number;           // 用时（秒）
    score: number;              // 总分
}

/**
 * Boss战配置
 */
export interface BossConfig {
    maxHP: number;              // Boss最大血量
    currentHP: number;          // 当前血量
    phases: BossPhase[];        // 阶段配置
    playerLives: number;        // 玩家生命数（默认3）
    reviveQuestions: number;    // 复活需要答对的题目数
    reviveHPPercent: number;    // 复活后恢复的HP百分比
    finalQuestions: number;     // 最终答题数量
    type?: 'single' | 'dual';   // Boss类型：单Boss或双Boss
    phase1Boss?: {              // 第一阶段Boss（双Boss模式）
        name: string;
        hp: number;
        attacks: string[];
    };
    phase2Boss?: {              // 第二阶段Boss（双Boss模式）
        name: string;
        hp: number;
        attacks: string[];
    };
}

/**
 * Boss阶段配置
 */
export interface BossPhase {
    hpThreshold: number;        // 进入该阶段的HP阈值
    attackSpeed: number;        // 攻击速度倍率
    moveSpeed: number;          // 移动速度
    attacks: string[];          // 可用攻击模式
    summonMinions: boolean;     // 是否召唤小怪
}

/**
 * 排行榜条目
 */
export interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    avatar: string;
    tier: string;               // 段位
    totalScore: number;         // 总积分
    stars: number;              // 总星数
    campaignsCompleted: number; // 完成战役数
}

/**
 * 段位定义
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'king';

export interface TierInfo {
    tier: Tier;
    name: string;
    icon: string;
    minStars: number;
    minCampaigns: number;
    rewards: Rewards;
}

export interface Chapter {
    id: number;
    title: string;
    description: string;
    levels: CampaignLevel[];
    unlocked: boolean;
}
