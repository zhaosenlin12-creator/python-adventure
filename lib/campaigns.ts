// 导入题库系统
import { getQuestionsForLevel, QuestionData } from './questionBank';
// 导入高级战役
import { advancedCampaigns } from './campaigns-advanced';

// 地图平台数据结构
export interface PlatformData {
  x: number;
  y: number;
  width: number;
  height?: number;  // 平台高度（可选，默认20）
  type?: 'ground' | 'platform' | 'moving' | 'ceiling';
  movePath?: { x: number; y: number }[];  // 移动路径（可选）
  moveSpeed?: number;  // 移动速度（战役7新增）
  // 战役5新增特性
  disappearing?: boolean;  // 是否是消失平台
  disappearTime?: number;  // 消失时间（毫秒）
  bouncy?: boolean;  // 是否是弹跳平台
  bounceForce?: number;  // 弹跳力度
  gravityFlip?: boolean;  // 是否是重力反转平台
  flipType?: 'reverse' | 'normal';  // 反转类型
  windForce?: number;  // 风力强度（1-5）
  windDirection?: 'left' | 'right' | 'up' | 'down';  // 风向
  // 战役7-2新增：传送带特性
  conveyorSpeed?: number;  // 传送带速度
  conveyorDirection?: 'left' | 'right';  // 传送带方向
}

export interface QuestionTrigger {
  x: number;
  y: number;
  questionId: string;
  reward?: 'unlock_door' | 'give_item' | 'remove_obstacle' | 'hp' | 'coins' | 'xp';
  rewardData?: any;
}

export interface AutoMovingPlatform {
  startX: number;
  y: number;
  width: number;
  speed: number;  // 自动移动速度
  endX: number;   // 终点X坐标
  endY?: number;  // 终点Y坐标（战役7新增，支持垂直移动）
  triggerOnPlayerLand?: boolean;  // 战役10新增：玩家跳上后才启动移动
}

export interface MovingPlatform {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  speed: number;
}

// 战役4新增：互动机关系统
export interface InteractiveMechanism {
  type: 'button' | 'lever' | 'door' | 'portal' | 'trampoline' | 'wind' | 'gravity_zone';
  x: number;
  y: number;
  width?: number;
  height?: number;
  linkedTo?: string;  // 关联的机关ID
  effect?: any;  // 触发效果
}

// 战役4新增：NPC互动系统
export interface NPC {
  x: number;
  y: number;
  type: 'teacher' | 'student' | 'guard' | 'vendor';
  dialogue?: string;
  quest?: string;  // 任务ID
  reward?: any;
}

// 战役4新增：环境陷阱
export interface Trap {
  x: number;
  y: number;
  type:
    | 'spike'
    | 'fire'
    | 'water'
    | 'electric'
    | 'falling_platform'
    | 'rotating_arm'
    | 'gear_chaser'
    | 'expanding_hazard'
    | 'moving_spike';
  damage: number;
  pattern?: 'static' | 'periodic' | 'triggered';
  // 战役7-2新增：旋转机械臂特性
  rotationSpeed?: number;  // 旋转速度（度/秒）
  armLength?: number;      // 机械臂长度
  width?: number;
  height?: number;
  radius?: number;
  maxRadius?: number;
  triggerRadius?: number;
  speed?: number;
  axis?: 'x' | 'y';
  moveDistance?: number;
  activeDuration?: number;
  cooldown?: number;
  growDuration?: number;
  visualTheme?: string;
  icon?: string;
  [key: string]: any;
}

// 战役5新增：玩家成长系统
export interface PlayerGrowth {
  enabled: boolean;
  growthRate: number;  // 每秒增长率
  maxScale: number;    // 最大缩放
  startScale: number;  // 初始缩放
}

// 战役5新增：追击型敌人
export interface Chaser {
  type?: 'chaser';
  startDelay?: number;  // 延迟出现时间（毫秒）
  speed: number;       // 追击速度
  startX?: number;
  startY?: number;
  damage?: number;
  [key: string]: any;  // 允许其他属性
}

export interface MapData {
  startPosition?: { x: number; y: number };  // 玩家起始位置
  width?: number;  // 地图宽度
  height?: number;  // 地图高度
  platforms: PlatformData[];
  enemies?: { x: number; y: number; type: string; bossId?: string; bossIndex?: number; [key: string]: any }[];
  collectibles?: { x: number; y: number; type: string; value?: number }[];  // 添加 value 属性
  goal: { x: number; y: number };
  questionTriggers?: QuestionTrigger[];  // 答题触发点
  movingPlatforms?: MovingPlatform[];  // 移动平台（战役2特色）
  autoMovingPlatforms?: AutoMovingPlatform[];  // 自动移动平台（战役3特色）
  mechanisms?: InteractiveMechanism[];  // 互动机关（战役4特色）
  npcs?: NPC[];  // NPC系统（战役4特色）
  traps?: Trap[];  // 环境陷阱（战役4特色）
  playerGrowth?: PlayerGrowth;  // 玩家成长系统（战役5特色）
  chasers?: Chaser[];  // 追击型敌人（战役5特色）
  timeLimit?: number;  // 时间限制（秒）
  specialRules?: string[];  // 特殊规则
  playerShrink?: { enabled: boolean; shrinkRate: number; minScale: number; startScale: number };  // 玩家缩小系统（战役5特色）
  timeGates?: { x: number; y: number; countdown: number; width: number; height: number }[];  // 时间门系统（战役5特色）
  playerTimeEffect?: { enabled: boolean; slowRate: number };  // 时间减速效果（战役5特色）
  windZones?: { x: number; y: number; width: number; height: number; direction: string; windForce: number }[];  // 风力区域（战役6特色）
}

// 战役系统数据结构（兼容题库系统）
export interface Question {
  id: string;
  type: 'choice' | 'fill' | 'code' | 'math' | 'logic' | 'brainteaser';
  question: string;
  options?: string[]; // 选择题选项
  answer: string | string[]; // 正确答案
  explanation?: string; // 答案解释
  difficulty: 1 | 2 | 3; // 难度等级
  subject: 'math' | 'programming' | 'logic' | 'general' | 'physics' | 'chemistry' | 'safety' | 'chinese' | 'english' | 'science' | 'fun'; // 学科分类
  hint?: string; // 提示
}

function shuffleQuestionOptions<T extends Question>(question: T): T {
  if (!question.options || question.options.length < 2) {
    return { ...question };
  }

  const options = [...question.options];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }

  const normalizedAnswer = Array.isArray(question.answer)
    ? String(question.answer[0] ?? '').trim()
    : String(question.answer ?? '').trim();

  const resolvedAnswer = options.includes(normalizedAnswer)
    ? normalizedAnswer
    : options.find((option, index) => String.fromCharCode(65 + index) === normalizedAnswer) || normalizedAnswer;

  return {
    ...question,
    options,
    answer: Array.isArray(question.answer) ? [resolvedAnswer] : resolvedAnswer,
  };
}

// 为关卡生成随机题目（旧版本，保持兼容）
export function generateQuestionsForLevel(levelNumber: number, count: number = 3): Question[] {
  const questions = getQuestionsForLevel(levelNumber, count);
  return questions.map(q => ({
    id: q.id,
    type: q.type as any,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: (q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3) as 1 | 2 | 3,
    subject: q.subject as any,
    hint: q.hint
  })).map(question => shuffleQuestionOptions(question));
}

// 🔥 新版本：根据年龄段生成题目
import { AgeGroup } from '@/types/ageGroup';
import * as ageQuestionBank from '@/lib/questionBank/index';
import type { Question as AgeQuestion } from '@/lib/questionBank/types';

export function generateQuestionsForAgeGroup(
  ageGroup: AgeGroup,
  count: number = 5,
  difficulty?: number
): Question[] {
  const questions = ageQuestionBank.generateBalancedQuestions(ageGroup, count);
  return questions.map((q: AgeQuestion) => ({
    id: q.id,
    type: q.type as any,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty as 1 | 2 | 3,
    subject: q.subject as any,
  })).map(question => shuffleQuestionOptions(question));
}

// 🔥 战役8：传送门
export interface Portal {
  id: string;
  x: number;
  y: number;
  color: 'blue' | 'orange' | 'green' | 'purple';
  linkedTo: string;  // 链接的传送门ID
}

// 🔥 战役8：化学反应区域
export interface ChemicalZone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'acid' | 'poison' | 'heal' | 'speed' | 'synthesis';
  damage?: number;
  healAmount?: number;
  speedBoost?: number;
  color: number;
}

// 🔥 战役8：重力翻转区域
export interface GravityZone {
  x: number;
  y: number;
  width: number;
  height: number;
  gravityMultiplier?: number;  // 1=正常, -1=翻转
  inverted?: boolean;  // 是否翻转重力
  trigger?: string;  // 触发条件
  [key: string]: any;  // 允许其他属性
}

// Boss战配置
export interface BossConfig {
  type: 'stomp' | 'weakpoint' | 'quiz' | 'hybrid' | 'dual';  // Boss类型（dual=双Boss模式）
  hp?: number;  // Boss血量（双Boss模式可选）
  secondBoss?: any;  // 🔥 双Boss模式：第二个Boss配置
  specialAbilities?: any;  // 🔥 Boss特殊能力
  phase1Boss?: {
    name?: string;
    hp?: number;
    attacks?: string[];
    attackInterval?: number;
    moveSpeed?: number;
    visualTheme?: string;
    size?: number;
    tint?: number;
    specialAbilities?: any;
    [key: string]: any;
  };  // 第一阶段Boss
  phase2Boss?: {
    name?: string;
    hp?: number;
    attacks?: string[];
    attackInterval?: number;
    moveSpeed?: number;
    visualTheme?: string;
    size?: number;
    tint?: number;
    laserDuration?: number;
    stunDuration?: number;
    specialAbilities?: any;
    [key: string]: any;
  };  // 第二阶段Boss
  phases?: {  // 多阶段配置
    hp: number;
    name?: string;  // 阶段名称
    attacks: string[];  // 攻击模式：charge, jump, projectile, summon, aoe
    attackInterval: number;  // 攻击间隔（毫秒）
    moveSpeed?: number;  // 移动速度
    summonMinions?: boolean;  // 是否召唤小怪
    [key: string]: any;  // 允许其他属性
  }[];
  weakPoint?: {  // 弱点位置
    x: number;
    y: number;
    width: number;
    height: number;
  };
  defeatCondition: 'combat' | 'quiz' | 'hybrid';  // 击败条件
  questionsRequired?: number;  // 需要答对的题目数
  [key: string]: any;  // 允许其他任意属性
}

export interface CampaignLevel {
  id: string;
  name: string;
  description: string;
  mapData?: any; // 关卡地图数据（旧格式，兼容）
  campaignMapData?: {  // 新格式：战役地图数据
    startPosition?: { x: number; y: number };  // 起点位置
    width?: number;
    height?: number;
    platforms: PlatformData[];
    enemies?: { x: number; y: number; type: string; bossId?: string; bossIndex?: number; [key: string]: any }[];
    collectibles?: { x: number; y: number; type: string; value?: number }[];
    goal: { x: number; y: number };
    questionTriggers?: QuestionTrigger[];
    movingPlatforms?: MovingPlatform[];
    autoMovingPlatforms?: AutoMovingPlatform[];
    mechanisms?: InteractiveMechanism[];  // 战役4：互动机关
    npcs?: NPC[];  // 战役4：NPC系统
    traps?: Trap[];  // 战役4：环境陷阱
    playerGrowth?: PlayerGrowth;  // 战役5：玩家成长系统
    chasers?: Chaser[];  // 战役5：追击型敌人
    // 🔥 战役8：量子实验室新功能
    portals?: Portal[];  // 传送门
    chemicalZones?: ChemicalZone[];  // 化学反应区域
    gravityZones?: GravityZone[];  // 重力翻转区域
    playerShrink?: any;  // 玩家缩小系统
    playerGrow?: any;  // 玩家放大系统
    timeLimit?: number;  // 时间限制
    quantumEffects?: any;  // 量子效果
    timeGates?: any[];  // 时间门
    cloneSystem?: any;  // 克隆系统
    dimensionShift?: any;  // 维度转换
    [key: string]: any;  // 允许其他任意属性
  };
  objectives?: { type: string; target?: string; description: string; [key: string]: any }[];  // 关卡目标
  bossConfig?: BossConfig;  // Boss战配置
  questions: Question[]; // 关卡中的题目
  story?: string; // 关卡剧情
  rewards: {
    xp: number;
    coins: number;
    skills?: string[];
    title?: string;  // 称号奖励
    [key: string]: any;  // 允许其他属性
  };
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  location: string; // 宜昌猇亭地名
  theme: string; // 主题背景
  story: string; // 战役背景故事
  levels: CampaignLevel[];
  unlockRequirement?: string; // 解锁条件
  rewards: {
    xp: number;
    coins: number;
    skills?: string[];
    title?: string; // 称号奖励
  };
}

// 预定义的地图布局
const createSimpleMap = (difficulty: number): MapData => ({
  platforms: [
    { x: 0, y: 550, width: 800, type: 'ground' }, // 地面
    { x: 150, y: 450, width: 150 },
    { x: 400, y: 400, width: 150 },
    { x: 600, y: 350, width: 120 },
    { x: 680, y: 250, width: 80 }  // 终点平台更高更小
  ],
  goal: { x: 710, y: 200 }  // 终点在高处
});

const createMediumMap = (difficulty: number, questionIds: string[] = []): MapData => ({
  platforms: [
    { x: 0, y: 550, width: 800, type: 'ground' },
    { x: 100, y: 450, width: 120 },
    { x: 280, y: 380, width: 120 },
    { x: 450, y: 320, width: 120 },
    { x: 600, y: 250, width: 100 },
    { x: 720, y: 180, width: 70 }  // 需要二段跳才能到达
  ],
  enemies: [
    { x: 300, y: 350, type: 'basic' },
    { x: 480, y: 290, type: 'bat' }
  ],
  goal: { x: 745, y: 130 }  // 终点在最高处
});

const createHardMap = (difficulty: number, questionIds: string[] = []): MapData => ({
  platforms: [
    { x: 0, y: 550, width: 800, type: 'ground' },
    { x: 80, y: 470, width: 100 },
    { x: 220, y: 400, width: 100 },
    { x: 360, y: 330, width: 100 },
    { x: 500, y: 260, width: 100 },
    { x: 640, y: 190, width: 80 },
    { x: 750, y: 120, width: 50 }  // 需要墙跳或冲刺
  ],
  enemies: [
    { x: 250, y: 370, type: 'basic' },
    { x: 390, y: 300, type: 'robot' },
    { x: 670, y: 160, type: 'bat' }
  ],
  collectibles: [
    { x: 360, y: 300, type: 'coin' },
    { x: 530, y: 230, type: 'gem' }
  ],
  goal: { x: 770, y: 70 }  // 终点在极高处
});

// 超大地图（1200px宽，需要技能才能通过）
const createLargeMap = (difficulty: number, questionIds: string[] = []): MapData => ({
  width: 1200,  // 🔥 必须设置宽度，否则相机不会跟随
  height: 600,
  platforms: [
    { x: 0, y: 550, width: 300, type: 'ground' },
    { x: 350, y: 550, width: 200, type: 'ground' },
    { x: 600, y: 550, width: 200, type: 'ground' },
    { x: 850, y: 550, width: 350, type: 'ground' },
    { x: 100, y: 450, width: 120 },
    { x: 280, y: 370, width: 100 },
    { x: 420, y: 300, width: 100 },
    { x: 560, y: 230, width: 100 },
    { x: 700, y: 300, width: 100 },
    { x: 850, y: 370, width: 120 },
    { x: 1000, y: 280, width: 100 },
    { x: 1120, y: 180, width: 80 }  // 需要冲刺+二段跳
  ],
  enemies: [
    { x: 300, y: 340, type: 'bat' },
    { x: 450, y: 270, type: 'robot' },
    { x: 590, y: 200, type: 'bat' },
    { x: 880, y: 340, type: 'robot' },
    { x: 1030, y: 250, type: 'bat' }
  ],
  collectibles: [
    { x: 200, y: 420, type: 'coin' },
    { x: 450, y: 270, type: 'gem' },
    { x: 720, y: 270, type: 'coin' },
    { x: 1000, y: 250, type: 'gem' }
  ],
  goal: { x: 1150, y: 130 }  // 终点在地图最右侧最高处
});

// Boss关卡地图（需要击败Boss后终点才出现）
const createBossMap = (): MapData => ({
  platforms: [
    { x: 0, y: 550, width: 800, type: 'ground' },
    { x: 100, y: 450, width: 150 },
    { x: 350, y: 380, width: 100 },
    { x: 550, y: 450, width: 150 },
    { x: 250, y: 300, width: 300 },
    { x: 650, y: 200, width: 100 }  // Boss击败后的终点平台
  ],
  enemies: [
    { x: 400, y: 220, type: 'boss' }  // Boss在中央平台上，更显眼
  ],
  collectibles: [
    { x: 150, y: 420, type: 'coin' },
    { x: 600, y: 420, type: 'coin' },
    { x: 400, y: 270, type: 'gem' }
  ],
  goal: { x: 690, y: 150 }  // 终点在高处，需要击败Boss
});

// 线索收集地图（需要收集所有线索才能到达终点）
const createClueMap = (clueCount: number): MapData => ({
  platforms: [
    { x: 0, y: 550, width: 800, type: 'ground' },
    { x: 120, y: 470, width: 100 },
    { x: 260, y: 400, width: 100 },
    { x: 400, y: 330, width: 100 },
    { x: 540, y: 260, width: 100 },
    { x: 680, y: 190, width: 100 },
    { x: 750, y: 120, width: 50 }  // 终点平台
  ],
  enemies: [
    { x: 290, y: 370, type: 'basic' },
    { x: 430, y: 300, type: 'robot' },
    { x: 710, y: 160, type: 'bat' }
  ],
  collectibles: [
    { x: 150, y: 440, type: 'clue' },
    { x: 430, y: 300, type: 'clue' },
    { x: 710, y: 160, type: 'clue' }
  ],
  goal: { x: 770, y: 70 }  // 终点在最高处
});

// 超大地图1500px（战役3专用）
const createXLargeMap = (questionIds: string[] = []): MapData => ({
  width: 1500,  // 🔥 添加地图宽度
  height: 600,  // 🔥 添加地图高度
  platforms: [
    { x: 0, y: 550, width: 400, type: 'ground' },
    { x: 450, y: 550, width: 300, type: 'ground' },
    { x: 800, y: 550, width: 300, type: 'ground' },
    { x: 1150, y: 550, width: 350, type: 'ground' },
    { x: 150, y: 450, width: 120 },
    { x: 320, y: 370, width: 100 },
    { x: 500, y: 300, width: 100 },
    { x: 650, y: 230, width: 100 },
    { x: 800, y: 300, width: 100 },
    { x: 950, y: 230, width: 100 },
    { x: 1100, y: 300, width: 100 },
    { x: 1250, y: 200, width: 100 },
    { x: 1400, y: 120, width: 80 }
  ],
  enemies: [
    { x: 350, y: 340, type: 'bat' },
    { x: 530, y: 270, type: 'robot' },
    { x: 680, y: 200, type: 'bat' },
    { x: 830, y: 270, type: 'robot' },
    { x: 980, y: 200, type: 'bat' },
    { x: 1130, y: 270, type: 'robot' },
    { x: 1280, y: 170, type: 'bat' }
  ],
  collectibles: [
    { x: 250, y: 420, type: 'coin' },
    { x: 530, y: 270, type: 'gem' },
    { x: 830, y: 270, type: 'coin' },
    { x: 1130, y: 270, type: 'gem' }
  ],
  goal: { x: 1430, y: 70 }
});

// 巨大地图2000px（战役3后期）
const createXXLargeMap = (questionIds: string[] = []): MapData => ({
  width: 2000,  // 🔥 添加地图宽度
  height: 600,  // 🔥 添加地图高度
  platforms: [
    { x: 0, y: 550, width: 500, type: 'ground' },
    { x: 550, y: 550, width: 400, type: 'ground' },
    { x: 1000, y: 550, width: 400, type: 'ground' },
    { x: 1450, y: 550, width: 550, type: 'ground' },
    { x: 200, y: 450, width: 120 },
    { x: 400, y: 370, width: 100 },
    { x: 600, y: 300, width: 100 },
    { x: 800, y: 230, width: 100 },
    { x: 1000, y: 300, width: 100 },
    { x: 1200, y: 230, width: 100 },
    { x: 1400, y: 300, width: 100 },
    { x: 1600, y: 200, width: 100 },
    { x: 1800, y: 120, width: 80 },
    { x: 1920, y: 60, width: 60 }
  ],
  enemies: [
    { x: 430, y: 340, type: 'bat' },
    { x: 630, y: 270, type: 'robot' },
    { x: 830, y: 200, type: 'bat' },
    { x: 1030, y: 270, type: 'robot' },
    { x: 1230, y: 200, type: 'bat' },
    { x: 1430, y: 270, type: 'robot' },
    { x: 1630, y: 170, type: 'bat' },
    { x: 1830, y: 90, type: 'robot' }
  ],
  collectibles: [
    { x: 300, y: 420, type: 'coin' },
    { x: 630, y: 270, type: 'gem' },
    { x: 1030, y: 270, type: 'coin' },
    { x: 1430, y: 270, type: 'gem' },
    { x: 1830, y: 90, type: 'gem' }
  ],
  goal: { x: 1950, y: 10 }
});

// 10个战役配置
export const campaigns: Campaign[] = [
  {
    id: 'campaign_1',
    name: '古老背街道探险',
    description: '在古老的街道中寻找编程的奥秘，解锁二段跳技能',
    location: '古老背街道',
    theme: '历史文化与编程启蒙',
    story: '在宜昌猇亭的古老背街道，隐藏着古代智者留下的编程密码。传说这里的每一块石板都蕴含着数学与逻辑的奥秘。作为年轻的探险家，你需要解开这些谜题，学习基础知识，并最终获得传说中的"二段跳"能力！',
    levels: [
      {
        id: 'level_1_1',
        name: '街道入口：数字之门',
        description: '通过简单的数学和逻辑题目，打开古街的大门',
        mapData: {
          width: 1000,  // 🔥 修复相机Bug：添加地图宽度
          height: 600,  // 🔥 修复相机Bug：添加地图高度
          platforms: [
            { x: 0, y: 550, width: 200, type: 'ground' },
            { x: 250, y: 550, width: 150, type: 'ground' },
            { x: 450, y: 550, width: 200, type: 'ground' },
            { x: 150, y: 450, width: 100 },
            { x: 350, y: 380, width: 120 },
            { x: 550, y: 320, width: 100 },
            { x: 700, y: 250, width: 150 }
          ],
          enemies: [
            { x: 280, y: 520, type: 'basic' },
            { x: 580, y: 290, type: 'basic' }
          ],
          collectibles: [
            { x: 180, y: 420, type: 'coin' },
            { x: 380, y: 350, type: 'coin' },
            { x: 730, y: 220, type: 'gem' }
          ],
          goal: { x: 780, y: 200 }
        },
        questions: generateQuestionsForLevel(1, 2), // 随机2道简单题
        story: '古街的入口被一道数字之门封锁，只有答对问题才能进入...',
        rewards: { xp: 100, coins: 50 }
      },
      {
        id: 'level_1_2',
        name: '智慧广场：逻辑迷宫',
        description: '在广场的迷宫中运用逻辑思维找到出路',
        mapData: {
          width: 900,  // 🔥 修复相机Bug：添加地图宽度
          height: 600,  // 🔥 修复相机Bug：添加地图高度
          platforms: [
            { x: 0, y: 550, width: 800, type: 'ground' },
            { x: 100, y: 470, width: 80 },
            { x: 220, y: 470, width: 80 },
            { x: 340, y: 470, width: 80 },
            { x: 460, y: 470, width: 80 },
            { x: 580, y: 470, width: 80 },
            { x: 160, y: 390, width: 80 },
            { x: 400, y: 390, width: 80 },
            { x: 640, y: 390, width: 80 },
            { x: 280, y: 310, width: 100 },
            { x: 520, y: 310, width: 100 },
            { x: 400, y: 230, width: 120 },
            { x: 700, y: 150, width: 80 }
          ],
          enemies: [
            { x: 250, y: 440, type: 'bat' },
            { x: 510, y: 440, type: 'bat' },
            { x: 430, y: 200, type: 'robot' }
          ],
          collectibles: [
            { x: 190, y: 360, type: 'coin' },
            { x: 430, y: 360, type: 'coin' },
            { x: 670, y: 360, type: 'coin' },
            { x: 430, y: 200, type: 'gem' }
          ],
          goal: { x: 730, y: 100 }
        },
        questions: generateQuestionsForLevel(2, 3), // 随机3道题，包含中等难度
        story: '智慧广场的迷宫考验着你的逻辑思维能力，每个岔路口都需要做出正确的选择...',
        rewards: { xp: 130, coins: 65 }
      },
      {
        id: 'level_1_3',
        name: '编程学堂：变量之谜',
        description: '学习编程的基础概念，掌握变量的使用',
        mapData: {
          width: 1000,  // 🔥 修复相机Bug：添加地图宽度
          height: 600,  // 🔥 修复相机Bug：添加地图高度
          platforms: [
            { x: 0, y: 550, width: 300, type: 'ground' },
            { x: 350, y: 550, width: 250, type: 'ground' },
            { x: 650, y: 550, width: 250, type: 'ground' },
            { x: 150, y: 450, width: 120 },
            { x: 400, y: 380, width: 100 },
            { x: 550, y: 320, width: 100 },
            { x: 700, y: 260, width: 100 },
            { x: 550, y: 200, width: 100 },
            { x: 400, y: 140, width: 100 },
            { x: 800, y: 80, width: 80 }
          ],
          enemies: [
            { x: 180, y: 420, type: 'basic' },
            { x: 430, y: 350, type: 'robot' },
            { x: 580, y: 290, type: 'bat' },
            { x: 730, y: 230, type: 'robot' },
            { x: 430, y: 110, type: 'bat' }
          ],
          collectibles: [
            { x: 180, y: 420, type: 'coin' },
            { x: 430, y: 350, type: 'gem' },
            { x: 580, y: 290, type: 'coin' },
            { x: 730, y: 230, type: 'gem' },
            { x: 830, y: 50, type: 'gem' }
          ],
          goal: { x: 830, y: 30 }
        },
        questions: generateQuestionsForLevel(3, 3), // 随机3道题，难度递增
        story: '古老的编程学堂中，智者教导你变量的奥秘。掌握它，你将能控制更多的力量...',
        rewards: { xp: 160, coins: 80 }
      },
      {
        id: 'level_1_4',
        name: '计算塔：数学试炼',
        description: '攀登计算塔，挑战更高难度的数学问题',
        mapData: {
          width: 800,  // 🔥 修复相机Bug：添加地图宽度
          height: 600,  // 🔥 修复相机Bug：添加地图高度
          platforms: [
            { x: 0, y: 550, width: 800, type: 'ground' },
            { x: 350, y: 480, width: 100 },
            { x: 200, y: 420, width: 100 },
            { x: 500, y: 420, width: 100 },
            { x: 350, y: 360, width: 100 },
            { x: 150, y: 300, width: 100 },
            { x: 550, y: 300, width: 100 },
            { x: 350, y: 240, width: 100 },
            { x: 250, y: 180, width: 100 },
            { x: 450, y: 180, width: 100 },
            { x: 350, y: 120, width: 100 },
            { x: 350, y: 60, width: 100 }
          ],
          enemies: [
            { x: 380, y: 450, type: 'bat' },
            { x: 230, y: 390, type: 'robot' },
            { x: 530, y: 390, type: 'robot' },
            { x: 380, y: 330, type: 'bat' },
            { x: 180, y: 270, type: 'robot' },
            { x: 580, y: 270, type: 'robot' },
            { x: 380, y: 210, type: 'bat' },
            { x: 280, y: 150, type: 'robot' },
            { x: 480, y: 150, type: 'robot' }
          ],
          collectibles: [
            { x: 380, y: 450, type: 'coin' },
            { x: 380, y: 330, type: 'gem' },
            { x: 380, y: 210, type: 'gem' },
            { x: 380, y: 90, type: 'gem' }
          ],
          goal: { x: 380, y: 10 }
        },
        questions: generateQuestionsForLevel(4, 3), // 随机3道题，包含难题
        story: '计算塔是古街最高的建筑，传说只有最聪明的人才能登顶。每一层都有更难的挑战等着你...',
        rewards: { xp: 200, coins: 100 }
      },
      {
        id: 'level_1_5',
        name: '守护者之战：获得二段跳',
        description: '击败古街守护者，获得传说中的二段跳能力！',
        campaignMapData: {
          startPosition: { x: 150, y: 500 },  // 玩家从左侧进入
          width: 1600,   // 🔥 地图扩大一倍，给Boss更多活动空间
          height: 700,   // 🔥 增加高度
          platforms: [
            // 地面竞技场（超宽）
            { x: 0, y: 650, width: 1600, type: 'ground' },
            // 左侧平台（玩家起始区）- 简化
            { x: 100, y: 550, width: 150 },
            // 中央Boss战斗区（宽敞开阔）
            { x: 500, y: 550, width: 200 },   // 左侧跳板
            { x: 900, y: 550, width: 200 },   // 右侧跳板
            { x: 650, y: 450, width: 300 },   // 中央主平台（Boss活动区）
            // 右侧平台（逃生区）- 简化
            { x: 1350, y: 550, width: 150 },
            // 顶部平台（终点）
            { x: 700, y: 320, width: 200 }
          ],
          enemies: [
            { x: 200, y: 520, type: 'slime' },   // 守卫小怪
            { x: 1400, y: 520, type: 'slime' },
            { x: 800, y: 420, type: 'boss' }     // Boss在中央主平台
          ],
          collectibles: [
            { x: 150, y: 520, type: 'coin' },
            { x: 550, y: 520, type: 'gem' },
            { x: 1000, y: 520, type: 'gem' },
            { x: 1400, y: 520, type: 'coin' },
            { x: 800, y: 290, type: 'gem' }
          ],
          goal: { x: 800, y: 290 }  // 终点在顶部中央
        },
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',  // 混合模式：先战斗后答题
          hp: 3,  // Boss血量3点
          phases: [
            {
              hp: 3,
              attacks: ['charge'],  // 第一阶段只会冲撞
              attackInterval: 3000,
              moveSpeed: 80
            },
            {
              hp: 2,
              attacks: ['charge', 'jump'],  // 第二阶段增加跳跃攻击
              attackInterval: 2500,
              moveSpeed: 100
            },
            {
              hp: 1,
              attacks: ['charge', 'jump', 'summon'],  // 第三阶段召唤小怪
              attackInterval: 2000,
              moveSpeed: 120,
              summonMinions: true
            }
          ],
          weakPoint: { x: 0, y: -20, width: 40, height: 10 },  // 头顶弱点
          defeatCondition: 'hybrid',  // 先削弱到0HP，然后答题
          questionsRequired: 4  // 需要答对4道题
        },
        questions: [
          {
            id: 'q1_5_1',
            type: 'choice',
            question: 'Python中用什么关键字定义函数？',
            options: ['def', 'function', 'func', 'define'],
            answer: 'def',
            difficulty: 1,
            subject: 'programming'
          },
          {
            id: 'q1_5_2',
            type: 'choice',
            question: 'Scratch中，让角色移动10步的积木是什么颜色？',
            options: ['蓝色', '紫色', '绿色', '黄色'],
            answer: '蓝色',
            difficulty: 1,
            subject: 'programming'
          },
          {
            id: 'q1_5_3',
            type: 'choice',
            question: 'Python中打印"Hello"用哪个函数？',
            options: ['print()', 'echo()', 'console.log()', 'printf()'],
            answer: 'print()',
            difficulty: 1,
            subject: 'programming'
          },
          {
            id: 'q1_5_4',
            type: 'choice',
            question: 'Scratch中，重复执行某个动作用什么积木？',
            options: ['重复执行', '如果那么', '等待', '移动'],
            answer: '重复执行',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        story: '古街的守护者出现了！他会逼你把跳跃节奏练稳。先用踩踏削弱他，再答对题目完成最后一击！',
        rewards: { xp: 300, coins: 150, skills: ['ancient_wisdom'] }
      }
    ],
    rewards: { xp: 600, coins: 300, title: '古街探险家' }
  },
  
  {
    id: 'campaign_2',
    name: '长江中学奇遇',
    description: '在校园中学习编程知识',
    location: '长江中学',
    theme: '校园学习',
    story: '长江中学是猇亭地区最著名的学校，这里有最先进的计算机实验室。你将在这里学习更深入的编程知识，解决各种有趣的数学和逻辑问题。',
    levels: [
      {
        id: 'level_2_1',
        name: '计算机课堂',
        description: '学习基础编程概念',
        campaignMapData: {
          startPosition: { x: 50, y: 500 },
          platforms: [
            { x: 0, y: 550, width: 800, type: 'ground' },
            { x: 120, y: 480, width: 100 },
            { x: 270, y: 420, width: 100 },
            { x: 420, y: 360, width: 100 },
            { x: 570, y: 300, width: 100 },
            { x: 700, y: 240, width: 100 }
          ],
          enemies: [
            { x: 270, y: 400, type: 'robot' },
            { x: 570, y: 280, type: 'robot' }
          ],
          collectibles: [
            { x: 120, y: 450, type: 'coin' },
            { x: 420, y: 330, type: 'gem' },
            { x: 700, y: 210, type: 'gem' }
          ],
          goal: { x: 750, y: 210 }
        },
        questions: [
          {
            id: 'q2_1_1',
            type: 'choice',
            question: '计算机程序是由什么组成的？',
            options: ['指令', '图片', '音乐', '视频'],
            answer: '指令',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        rewards: { xp: 130, coins: 65 }
      },
      {
        id: 'level_2_2',
        name: '数学竞赛',
        description: '参加校内数学竞赛',
        campaignMapData: {
          startPosition: { x: 100, y: 1100 },
          width: 1600,  // 增加宽度，确保相机可以移动
          height: 1200, // 增加高度
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 1600, height: 20, type: 'ground' },
            // 第一组平台
            { x: 200, y: 1070, width: 120, height: 20 },
            { x: 400, y: 1000, width: 120, height: 20 },
            { x: 600, y: 930, width: 120, height: 20 },
            // 第二组平台
            { x: 800, y: 860, width: 120, height: 20 },
            { x: 1000, y: 790, width: 120, height: 20 },
            { x: 1200, y: 720, width: 120, height: 20 },
            // 第三组平台（更高）
            { x: 300, y: 650, width: 120, height: 20 },
            { x: 500, y: 580, width: 120, height: 20 },
            { x: 700, y: 510, width: 120, height: 20 },
            // 顶部平台
            { x: 900, y: 440, width: 150, height: 20 },
            { x: 1100, y: 370, width: 150, height: 20 },
            { x: 1300, y: 300, width: 200, height: 20 }
          ],
          enemies: [
            { x: 250, y: 1050, type: 'basic' },  // 改为basic类型
            { x: 450, y: 980, type: 'bat' },
            { x: 850, y: 840, type: 'robot' },
            { x: 1050, y: 770, type: 'bat' },
            { x: 350, y: 630, type: 'robot' },
            { x: 550, y: 560, type: 'bat' },
            { x: 950, y: 420, type: 'robot' }
          ],
          collectibles: [
            { x: 200, y: 1040, type: 'coin', value: 10 },
            { x: 400, y: 970, type: 'coin', value: 10 },
            { x: 600, y: 900, type: 'gem', value: 20 },
            { x: 1000, y: 760, type: 'gem', value: 20 },
            { x: 500, y: 550, type: 'gem', value: 20 },
            { x: 1100, y: 340, type: 'key', value: 1 }
          ],
          goal: { x: 1400, y: 270 }
        },
        questions: [
          {
            id: 'q2_2_1',
            type: 'math',
            question: '计算：8 × 7 = ?',
            answer: '56',
            difficulty: 2,
            subject: 'math'
          }
        ],
        rewards: { xp: 160, coins: 80 }
      },
      {
        id: 'level_2_3',
        name: '编程社团',
        description: '加入学校编程社团 - 复杂移动平台',
        campaignMapData: {
          startPosition: { x: 50, y: 1100 },
          width: 2000,   // 增加宽度以容纳更多移动平台
          height: 1200,  // 添加高度设置
          platforms: [
            { x: 0, y: 1150, width: 2000, height: 20, type: 'ground' },
            // 第一段：基础平台
            { x: 100, y: 1080, width: 120, height: 20 },
            { x: 300, y: 1020, width: 100, height: 20 },
            // 第二段：移动平台区域
            { x: 500, y: 960, width: 100, height: 20 },
            { x: 700, y: 900, width: 100, height: 20 },
            { x: 900, y: 840, width: 100, height: 20 },
            // 第三段：垂直移动平台
            { x: 1100, y: 780, width: 100, height: 20 },
            { x: 1300, y: 720, width: 100, height: 20 },
            // 第四段：高难度区域
            { x: 1500, y: 660, width: 100, height: 20 },
            { x: 1700, y: 600, width: 120, height: 20 },
            // 顶部终点
            { x: 1850, y: 540, width: 150, height: 20 }
          ],
          enemies: [
            { x: 150, y: 1060, type: 'basic' },
            { x: 350, y: 1000, type: 'bat' },
            { x: 550, y: 940, type: 'robot' },
            { x: 750, y: 880, type: 'bat' },
            { x: 950, y: 820, type: 'robot' },
            { x: 1150, y: 760, type: 'bat' },
            { x: 1350, y: 700, type: 'robot' },
            { x: 1550, y: 640, type: 'bat' }
          ],
          collectibles: [
            { x: 100, y: 1050, type: 'coin', value: 10 },
            { x: 300, y: 990, type: 'coin', value: 10 },
            { x: 700, y: 870, type: 'gem', value: 20 },
            { x: 1100, y: 750, type: 'gem', value: 20 },
            { x: 1500, y: 630, type: 'gem', value: 20 },
            { x: 1850, y: 510, type: 'key', value: 1 }
          ],
          goal: { x: 1900, y: 510 }
        },
        questions: [
          {
            id: 'q2_3_1',
            type: 'choice',
            question: '在编程中，if语句用来做什么？',
            options: ['循环', '判断', '存储', '输出'],
            answer: '判断',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 190, coins: 95 }
      },
      {
        id: 'level_2_4',
        name: '科技节展示',
        description: '在科技节上展示作品 - 大量移动平台',
        mapData: {
          ...createLargeMap(2, ['q2_4_1', 'q2_4_2']),
          movingPlatforms: [
            { startX: 200, startY: 450, endX: 400, endY: 450, width: 100, speed: 1.5 },
            { startX: 500, startY: 400, endX: 700, endY: 300, width: 100, speed: 1.2 },
            { startX: 800, startY: 350, endX: 1000, endY: 250, width: 100, speed: 1.8 },
            { startX: 1050, startY: 200, endX: 1150, endY: 150, width: 80, speed: 1 }
          ]
        },
        questions: [
          {
            id: 'q2_4_1',
            type: 'math',
            question: '小华买了3支笔，每支2.5元，一共花了多少钱？',
            answer: '7.5',
            difficulty: 2,
            subject: 'math'
          },
          {
            id: 'q2_4_2',
            type: 'code',
            question: '写一个for循环输出1到5：',
            answer: 'for i in range(1, 6): print(i)',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 200, coins: 100 }
      },
      {
        id: 'level_2_5',
        name: '校园之星：科技机器人',
        description: '击败科技机器人Boss，成为校园编程之星！',
        campaignMapData: {
          startPosition: { x: 150, y: 600 },  // 玩家从底部进入
          width: 1600,   // 🔥 地图扩大一倍
          height: 750,   // 🔥 增加高度
          platforms: [
            // 地面（超宽竞技场）
            { x: 0, y: 700, width: 1600, type: 'ground' },
            // 左侧平台（简化）
            { x: 100, y: 580, width: 180 },
            { x: 80, y: 450, width: 150 },
            // 中央Boss战斗区（宽敞）
            { x: 500, y: 550, width: 200 },    // 左跳板
            { x: 900, y: 550, width: 200 },    // 右跳板
            { x: 650, y: 420, width: 300 },    // Boss主平台（超大）
            // 右侧平台（简化）
            { x: 1320, y: 580, width: 180 },
            { x: 1370, y: 450, width: 150 },
            // 顶部传送点
            { x: 700, y: 280, width: 200 }
          ],
          enemies: [
            { x: 150, y: 550, type: 'robot' },   // 守卫机器人
            { x: 1400, y: 550, type: 'robot' },
            { x: 800, y: 390, type: 'boss' }     // Boss在中央主平台
          ],
          collectibles: [
            { x: 150, y: 550, type: 'coin' },
            { x: 550, y: 520, type: 'gem' },
            { x: 1000, y: 520, type: 'gem' },
            { x: 1400, y: 550, type: 'coin' },
            { x: 800, y: 250, type: 'gem' }
          ],
          goal: { x: 800, y: 250 }  // 终点在顶部传送点
        },
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',
          hp: 4,  // 战役2：HP=4
          phases: [
            {
              hp: 4,
              attacks: ['charge'],  // 第一阶段：快速冲撞
              attackInterval: 2800,
              moveSpeed: 90
            },
            {
              hp: 3,
              attacks: ['charge', 'projectile'],  // 第二阶段：冲撞+激光弹
              attackInterval: 2500,
              moveSpeed: 100
            },
            {
              hp: 2,
              attacks: ['charge', 'projectile', 'jump'],  // 第三阶段：增加跳跃
              attackInterval: 2200,
              moveSpeed: 110
            },
            {
              hp: 1,
              attacks: ['charge', 'projectile', 'jump', 'summon'],  // 第四阶段：召唤机器人小怪
              attackInterval: 2000,
              moveSpeed: 120,
              summonMinions: true
            }
          ],
          weakPoint: { x: 0, y: -25, width: 35, height: 15 },  // 头部弱点
          defeatCondition: 'hybrid',
          questionsRequired: 4
        },
        questions: [
          {
            id: 'q2_5_1',
            type: 'choice',
            question: 'Python中用什么关键字定义函数？',
            options: ['def', 'function', 'func', 'define'],
            answer: 'def',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q2_5_2',
            type: 'choice',
            question: 'Python中用什么关键字开始循环？',
            options: ['for', 'loop', 'while', 'repeat'],
            answer: 'for',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q2_5_3',
            type: 'code',
            question: '写一个Python代码输出Hello：',
            answer: 'print("Hello")',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q2_5_4',
            type: 'choice',
            question: 'Python中哪个用于判断条件？',
            options: ['if', 'check', 'when', 'test'],
            answer: 'if',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 300, coins: 150, skills: ['school_star'] }
      }
    ],
    unlockRequirement: 'campaign_1',
    rewards: { xp: 600, coins: 250, title: '校园编程之星' }
  },

  {
    id: 'campaign_3',
    name: '实验小学科学之旅',
    description: '在小学里探索科学的奥秘',
    location: '实验小学',
    theme: '科学探索',
    story: '实验小学以其优秀的科学教育而闻名。在这里，你将通过有趣的实验和游戏，学习更多的数学知识和编程技巧。',
    levels: [
      {
        id: 'level_3_1',
        name: '科学实验室',
        description: '在实验室中探索科学奥秘 - 垂直攀爬挑战',
        campaignMapData: {
          startPosition: { x: 100, y: 1100 },
          width: 1200,
          height: 1400,  // 超高地图，垂直攀爬
          platforms: [
            // 地面
            { x: 0, y: 1350, width: 1200, height: 20, type: 'ground' },
            // 第一层：实验台区域（宽平台）
            { x: 50, y: 1280, width: 200, height: 20 },
            { x: 350, y: 1250, width: 180, height: 20 },
            { x: 650, y: 1220, width: 200, height: 20 },
            { x: 950, y: 1190, width: 180, height: 20 },
            // 第二层：试管架区域（窄平台）
            { x: 100, y: 1120, width: 100, height: 20 },
            { x: 300, y: 1080, width: 100, height: 20 },
            { x: 500, y: 1040, width: 100, height: 20 },
            { x: 700, y: 1000, width: 100, height: 20 },
            { x: 900, y: 960, width: 100, height: 20 },
            // 第三层：显微镜区域（交错平台）
            { x: 150, y: 900, width: 120, height: 20 },
            { x: 450, y: 860, width: 120, height: 20 },
            { x: 750, y: 820, width: 120, height: 20 },
            { x: 1000, y: 780, width: 120, height: 20 },
            // 第四层：烧杯区域（小平台）
            { x: 200, y: 720, width: 80, height: 20 },
            { x: 400, y: 680, width: 80, height: 20 },
            { x: 600, y: 640, width: 80, height: 20 },
            { x: 800, y: 600, width: 80, height: 20 },
            // 第五层：顶部实验室（终点）
            { x: 300, y: 540, width: 150, height: 20 },
            { x: 600, y: 480, width: 150, height: 20 },
            { x: 450, y: 420, width: 200, height: 20 }
          ],
          enemies: [
            { x: 100, y: 1260, type: 'basic' },
            { x: 400, y: 1230, type: 'bat' },
            { x: 700, y: 1200, type: 'robot' },
            { x: 350, y: 1060, type: 'bat' },
            { x: 550, y: 1020, type: 'robot' },
            { x: 750, y: 980, type: 'bat' },
            { x: 500, y: 840, type: 'robot' },
            { x: 800, y: 800, type: 'bat' },
            { x: 450, y: 660, type: 'robot' },
            { x: 650, y: 620, type: 'bat' }
          ],
          collectibles: [
            { x: 50, y: 1250, type: 'coin', value: 10 },
            { x: 650, y: 1190, type: 'coin', value: 10 },
            { x: 300, y: 1050, type: 'gem', value: 20 },
            { x: 700, y: 970, type: 'gem', value: 20 },
            { x: 450, y: 830, type: 'gem', value: 20 },
            { x: 600, y: 610, type: 'key', value: 1 }
          ],
          goal: { x: 550, y: 390 }
        },
        questions: [
          {
            id: 'q3_1_1',
            type: 'choice',
            question: '水的沸点是多少度？',
            options: ['90度', '100度', '110度', '120度'],
            answer: '100度',
            difficulty: 1,
            subject: 'logic'
          }
        ],
        rewards: { xp: 140, coins: 70 }
      },
      {
        id: 'level_3_2',
        name: '数学魔法',
        description: '用数学解决科学问题 - 迷宫式探索',
        campaignMapData: {
          startPosition: { x: 50, y: 1100 },
          width: 2200,  // 超宽地图
          height: 1200,
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 2200, height: 20, type: 'ground' },
            // 左侧区域：入口迷宫
            { x: 100, y: 1080, width: 120, height: 20 },
            { x: 100, y: 1000, width: 120, height: 20 },
            { x: 280, y: 1040, width: 100, height: 20 },
            { x: 280, y: 960, width: 100, height: 20 },
            { x: 450, y: 1000, width: 120, height: 20 },
            { x: 450, y: 920, width: 120, height: 20 },
            // 中央区域：数字阶梯
            { x: 650, y: 1080, width: 100, height: 20 },
            { x: 800, y: 1020, width: 100, height: 20 },
            { x: 950, y: 960, width: 100, height: 20 },
            { x: 1100, y: 900, width: 100, height: 20 },
            { x: 1250, y: 840, width: 100, height: 20 },
            { x: 1400, y: 780, width: 100, height: 20 },
            // 右侧区域：方程式平台
            { x: 1600, y: 1080, width: 150, height: 20 },
            { x: 1550, y: 1000, width: 120, height: 20 },
            { x: 1650, y: 920, width: 120, height: 20 },
            { x: 1600, y: 840, width: 150, height: 20 },
            { x: 1700, y: 760, width: 120, height: 20 },
            // 顶部区域：终点
            { x: 800, y: 720, width: 150, height: 20 },
            { x: 1000, y: 660, width: 150, height: 20 },
            { x: 1200, y: 600, width: 150, height: 20 },
            { x: 1400, y: 540, width: 200, height: 20 }
          ],
          enemies: [
            { x: 150, y: 1060, type: 'basic' },
            { x: 330, y: 1020, type: 'bat' },
            { x: 500, y: 980, type: 'robot' },
            { x: 700, y: 1060, type: 'bat' },
            { x: 850, y: 1000, type: 'robot' },
            { x: 1000, y: 940, type: 'bat' },
            { x: 1150, y: 880, type: 'robot' },
            { x: 1300, y: 820, type: 'bat' },
            { x: 1650, y: 1060, type: 'robot' },
            { x: 1600, y: 980, type: 'bat' },
            { x: 1700, y: 900, type: 'robot' },
            { x: 1050, y: 640, type: 'bat' }
          ],
          collectibles: [
            { x: 100, y: 1050, type: 'coin', value: 10 },
            { x: 450, y: 970, type: 'coin', value: 10 },
            { x: 800, y: 990, type: 'gem', value: 20 },
            { x: 1100, y: 870, type: 'gem', value: 20 },
            { x: 1400, y: 750, type: 'gem', value: 20 },
            { x: 1700, y: 730, type: 'gem', value: 20 },
            { x: 1400, y: 510, type: 'key', value: 1 }
          ],
          goal: { x: 1500, y: 510 }
        },
        questions: [
          {
            id: 'q3_2_1',
            type: 'math',
            question: '一个长方形的长是8cm，宽是5cm，面积是多少？',
            answer: '40',
            difficulty: 2,
            subject: 'math'
          }
        ],
        rewards: { xp: 150, coins: 75 }
      },
      {
        id: 'level_3_3',
        name: '编程实验',
        description: '用编程控制实验设备 - 巨大地图+自动平台',
        mapData: {
          ...createXXLargeMap(['q3_3_1', 'q3_3_2']),
          autoMovingPlatforms: [
            { startX: 100, y: 400, width: 150, speed: 3, endX: 1900 }
          ]
        },
        questions: [
          {
            id: 'q3_3_1',
            type: 'code',
            question: '创建一个数组存储实验数据[10, 20, 30]：',
            answer: 'let data = [10, 20, 30]',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 170, coins: 85 }
      },
      {
        id: 'level_3_4',
        name: '线索搜集',
        description: '收集实验线索解开谜题 - 巨大地图+自动平台',
        mapData: {
          ...createXXLargeMap(['q3_4_1', 'q3_4_2', 'q3_4_3']),
          autoMovingPlatforms: [
            { startX: 100, y: 400, width: 150, speed: 3.5, endX: 1900 }
          ]
        },
        questions: [
          {
            id: 'q3_4_1',
            type: 'choice',
            question: '如果A>B，B>C，那么A和C的关系是？',
            options: ['A>C', 'A<C', 'A=C', '无法确定'],
            answer: 'A>C',
            difficulty: 2,
            subject: 'logic'
          }
        ],
        rewards: { xp: 180, coins: 90 }
      },
      {
        id: 'level_3_5',
        name: '科学小博士：水流巨兽',
        description: '在巨大的水池竞技场击败水流巨兽，成为科学小博士！',
        campaignMapData: {
          startPosition: { x: 200, y: 850 },  // 玩家从左下岸边进入
          width: 2000,   // 🔥 地图扩大，给Boss更多活动空间
          height: 1000,  // 🔥 增加高度
          platforms: [
            // 底层岸边（入口区）- 简化
            { x: 0, y: 950, width: 400, type: 'ground' },   // 左岸
            { x: 1600, y: 950, width: 400, type: 'ground' },  // 右岸
            
            // 左侧平台（简化为2个）
            { x: 150, y: 820, width: 200 },
            { x: 100, y: 680, width: 180 },
            
            // 右侧平台（简化为2个）
            { x: 1650, y: 820, width: 200 },
            { x: 1720, y: 680, width: 180 },
            
            // 中央Boss战斗区（宽敞开阔）
            { x: 600, y: 850, width: 250 },    // 左跳板
            { x: 1150, y: 850, width: 250 },   // 右跳板
            { x: 800, y: 700, width: 400 },    // Boss主平台（超大）
            
            // 顶部平台（终点）
            { x: 900, y: 520, width: 200 },
            { x: 900, y: 380, width: 200 }     // 最高点
          ],
          enemies: [
            // 外围守卫（减少）
            { x: 200, y: 790, type: 'bat' },
            { x: 1750, y: 790, type: 'bat' },
            
            // Boss（中央主平台）
            { x: 1000, y: 670, type: 'boss' }  // Boss在中央超大平台
          ],
          collectibles: [
            // 入口引导
            { x: 200, y: 790, type: 'coin' },
            { x: 1750, y: 790, type: 'coin' },
            
            // Boss区奖励
            { x: 700, y: 820, type: 'gem' },
            { x: 1300, y: 820, type: 'gem' },
            
            // 顶部大奖
            { x: 1000, y: 350, type: 'key' }
          ],
          goal: { x: 1000, y: 350 }  // 终点在最高点
        },
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',
          hp: 5,  // 战役3：HP=5
          phases: [
            {
              hp: 5,
              attacks: ['charge', 'aoe'],  // 第一阶段：冲撞+水波攻击
              attackInterval: 2700,
              moveSpeed: 95
            },
            {
              hp: 4,
              attacks: ['charge', 'aoe', 'jump'],  // 第二阶段：增加跳跃
              attackInterval: 2400,
              moveSpeed: 105
            },
            {
              hp: 2,
              attacks: ['charge', 'aoe', 'jump', 'summon'],  // 第三阶段：召唤水滴小怪
              attackInterval: 2100,
              moveSpeed: 115,
              summonMinions: true
            },
            {
              hp: 1,
              attacks: ['charge', 'aoe', 'jump', 'summon', 'projectile'],  // 第四阶段：水柱投射
              attackInterval: 1900,
              moveSpeed: 125,
              summonMinions: true
            }
          ],
          weakPoint: { x: 0, y: -30, width: 40, height: 20 },  // 头顶弱点
          defeatCondition: 'hybrid',
          questionsRequired: 4
        },
        questions: [
          {
            id: 'q3_5_1',
            type: 'math',
            question: '计算：12 × 8 = ?',
            answer: '96',
            difficulty: 2,
            subject: 'math'
          },
          {
            id: 'q3_5_2',
            type: 'choice',
            question: '科学实验中最重要的是什么？',
            options: ['结果', '过程', '设备', '时间'],
            answer: '过程',
            difficulty: 2,
            subject: 'logic'
          },
          {
            id: 'q3_5_3',
            type: 'code',
            question: '写一个函数 add(a, b) { ... }，返回a+b：',
            answer: 'function add(a, b) { return a + b; }',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q3_5_4',
            type: 'choice',
            question: '在编程中，变量用来做什么？',
            options: ['存储数据', '执行代码', '显示界面', '连接网络'],
            answer: '存储数据',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 280, coins: 140, skills: ['science_master'] }
      }
    ],
    unlockRequirement: 'campaign_2',
    rewards: { xp: 650, coins: 275, title: '小小科学家' }
  },
  {
    id: 'campaign_4',
    name: '十八中学霸之路',
    description: '在重点中学挑战更高难度',
    location: '十八中',
    theme: '学术挑战',
    story: '十八中是猇亭地区的重点中学，这里汇聚了最优秀的学生。你需要在激烈的竞争中脱颖而出，掌握更高级的编程和数学技能。',
    levels: [
      {
        id: 'level_4_1',
        name: '篮球场升降挑战',
        description: '【垂直上升】跳上不断上升的平台，躲避障碍物，到达顶层！',
        story: '篮球场的看台正在升起！你必须跳上不断上升的平台，在上升过程中躲避飞来的篮球、校霸的攻击，还要小心掉下去！只有到达最高层，才能证明你的实力！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 1200,
          height: 1400,  // 加高地图！
          
          platforms: [
            // 地面起点
            { x: 0, y: 1350, width: 1200, height: 20, type: 'ground' },
            
            // 起跳平台
            { x: 100, y: 1280, width: 120, height: 20 },
            
            // 左右两侧固定平台（用于中转）
            { x: 50, y: 1150, width: 100, height: 20 },
            { x: 1050, y: 1150, width: 100, height: 20 },
            { x: 50, y: 1000, width: 100, height: 20 },
            { x: 1050, y: 1000, width: 100, height: 20 },
            { x: 50, y: 850, width: 100, height: 20 },
            { x: 1050, y: 850, width: 100, height: 20 },
            { x: 50, y: 700, width: 100, height: 20 },
            { x: 1050, y: 700, width: 100, height: 20 },
            { x: 50, y: 550, width: 100, height: 20 },
            { x: 1050, y: 550, width: 100, height: 20 },
            
            // 顶层终点
            { x: 450, y: 400, width: 300, height: 20 }
          ],
          
          // 【核心机制1：从下往上升的移动平台！】
          movingPlatforms: [
            // 第1组：慢速上升（速度1.5）
            { startX: 300, startY: 1350, endX: 300, endY: 1100, width: 120, speed: 1.5 },
            { startX: 500, startY: 1350, endX: 500, endY: 1100, width: 120, speed: 1.5 },
            { startX: 700, startY: 1350, endX: 700, endY: 1100, width: 120, speed: 1.5 },
            { startX: 900, startY: 1350, endX: 900, endY: 1100, width: 120, speed: 1.5 },
            
            // 第2组：中速上升（速度2.0）
            { startX: 250, startY: 1200, endX: 250, endY: 950, width: 110, speed: 2.0 },
            { startX: 450, startY: 1200, endX: 450, endY: 950, width: 110, speed: 2.0 },
            { startX: 650, startY: 1200, endX: 650, endY: 950, width: 110, speed: 2.0 },
            { startX: 850, startY: 1200, endX: 850, endY: 950, width: 110, speed: 2.0 },
            
            // 第3组：快速上升（速度2.5）
            { startX: 300, startY: 1050, endX: 300, endY: 800, width: 100, speed: 2.5 },
            { startX: 500, startY: 1050, endX: 500, endY: 800, width: 100, speed: 2.5 },
            { startX: 700, startY: 1050, endX: 700, endY: 800, width: 100, speed: 2.5 },
            { startX: 900, startY: 1050, endX: 900, endY: 800, width: 100, speed: 2.5 },
            
            // 第4组：超快上升（速度3.0）
            { startX: 350, startY: 900, endX: 350, endY: 650, width: 90, speed: 3.0 },
            { startX: 550, startY: 900, endX: 550, endY: 650, width: 90, speed: 3.0 },
            { startX: 750, startY: 900, endX: 750, endY: 650, width: 90, speed: 3.0 },
            
            // 第5组：极速上升（速度3.5）
            { startX: 400, startY: 750, endX: 400, endY: 500, width: 80, speed: 3.5 },
            { startX: 600, startY: 750, endX: 600, endY: 500, width: 80, speed: 3.5 },
            { startX: 800, startY: 750, endX: 800, endY: 500, width: 80, speed: 3.5 }
          ],
          
          // 【核心机制2：水平移动平台（增加难度）】
          autoMovingPlatforms: [
            { startX: 200, y: 1200, width: 100, speed: 2.0, endX: 500 },
            { startX: 700, y: 1050, width: 100, speed: 2.5, endX: 1000 },
            { startX: 300, y: 900, width: 90, speed: 3.0, endX: 600 },
            { startX: 500, y: 750, width: 80, speed: 3.5, endX: 800 }
          ],
          
          // 【核心机制3：收集物（分层放置）】
          collectibles: [
            // 第1层（y=1200-1100）
            { x: 300, y: 1180, type: 'coin', value: 10 },
            { x: 700, y: 1150, type: 'coin', value: 10 },
            // 第2层（y=1050-950）
            { x: 450, y: 1030, type: 'gem', value: 20 },
            { x: 850, y: 1000, type: 'gem', value: 20 },
            // 第3层（y=900-800）
            { x: 500, y: 880, type: 'gem', value: 20 },
            { x: 900, y: 850, type: 'gem', value: 20 },
            // 第4层（y=750-650）
            { x: 550, y: 730, type: 'gem', value: 30 },
            { x: 750, y: 700, type: 'gem', value: 30 },
            // 第5层（y=600-500）
            { x: 600, y: 580, type: 'gem', value: 30 },
            // 顶层
            { x: 600, y: 370, type: 'key', value: 1 }
          ],
          
          // 【核心机制4：障碍物和敌人（分层密集）】
          enemies: [
            // 第1层：校霸小弟（basic，地面巡逻）
            { x: 400, y: 1330, type: 'basic' },
            { x: 800, y: 1330, type: 'basic' },
            
            // 第2层：飞来的篮球（bat，快速飞行）
            { x: 300, y: 1180, type: 'bat' },
            { x: 500, y: 1150, type: 'bat' },
            { x: 700, y: 1120, type: 'bat' },
            { x: 900, y: 1100, type: 'bat' },
            
            // 第3层：体育老师（robot，快速移动）
            { x: 250, y: 1030, type: 'robot' },
            { x: 650, y: 1000, type: 'robot' },
            { x: 1000, y: 970, type: 'robot' },
            
            // 第4层：密集篮球（bat）
            { x: 300, y: 880, type: 'bat' },
            { x: 500, y: 850, type: 'bat' },
            { x: 700, y: 820, type: 'bat' },
            { x: 900, y: 800, type: 'bat' },
            
            // 第5层：校霸（robot，超快速）
            { x: 350, y: 730, type: 'robot' },
            { x: 750, y: 700, type: 'robot' },
            
            // 第6层：超密集篮球（bat）
            { x: 400, y: 580, type: 'bat' },
            { x: 600, y: 550, type: 'bat' },
            { x: 800, y: 520, type: 'bat' },
            
            // 顶层守卫（robot）
            { x: 600, y: 380, type: 'robot' }
          ],
          
          goal: { x: 600, y: 370 }
        },
        questions: [
          {
            id: 'q4_1_1',
            type: 'choice',
            question: '体育课打篮球，你投了个三不沾，全班都看着你，这时你应该？',
            options: ['装作什么都没发生', '大喊"风太大了"', '立刻假装系鞋带', '说"刚才是试投"'],
            answer: '说"刚才是试投"',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_1_2',
            type: 'code',
            question: '库里投篮命中率计算器（他投10次中6次）：\nhits = 6  # 命中次数\ntotal = 10  # 总投篮数\nrate = ___  # 填空：计算命中率\nprint(f"命中率: {rate}")  # 输出0.6',
            answer: 'hits / total',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        rewards: { xp: 160, coins: 80 }
      },
      {
        id: 'level_4_2',
        name: '食堂传送带大冒险',
        description: '【反向传送带】站在传送带上狂奔，躲避食堂阿姨的勺子攻击！',
        story: '下课铃响！食堂传送带启动了！你必须跳上传送带，在上面奔跑躲避食堂阿姨的勺子攻击和飞来的餐盘，抢到最后一份红烧肉！注意：有的传送带是反向的！',
        campaignMapData: {
          startPosition: { x: 50, y: 1050 },
          width: 3500,
          height: 1200,
          platforms: [
            // 地面（只有起点和终点）
            { x: 0, y: 1150, width: 200, height: 20, type: 'ground' },
            { x: 3300, y: 1150, width: 200, height: 20, type: 'ground' },
            
            // 起跳平台
            { x: 150, y: 1080, width: 100, height: 20 },
            // 中转平台
            { x: 1100, y: 1050, width: 80, height: 20 },
            { x: 2100, y: 1020, width: 80, height: 20 }
          ],
          
          // 【核心机制1：传送带跑酷 - 包含反向传送带】
          autoMovingPlatforms: [
            // 第1段：正向传送带（4个连续平台）
            { startX: 300, y: 1050, width: 150, speed: 3.0, endX: 650 },
            { startX: 500, y: 1050, width: 150, speed: 3.0, endX: 850 },
            { startX: 700, y: 1050, width: 150, speed: 3.0, endX: 1050 },
            { startX: 900, y: 1050, width: 150, speed: 3.0, endX: 1250 },
            // 第2段：反向传送带（4个连续平台，向左移动）
            { startX: 1900, y: 1020, width: 150, speed: 3.5, endX: 1550 },
            { startX: 1750, y: 1020, width: 150, speed: 3.5, endX: 1400 },
            { startX: 1600, y: 1020, width: 150, speed: 3.5, endX: 1250 },
            { startX: 1450, y: 1020, width: 150, speed: 3.5, endX: 1100 },
            // 第3段：超快正向传送带（5个连续平台）
            { startX: 2200, y: 1000, width: 150, speed: 4.5, endX: 2600 },
            { startX: 2400, y: 1000, width: 150, speed: 4.5, endX: 2800 },
            { startX: 2600, y: 1000, width: 150, speed: 4.5, endX: 3000 },
            { startX: 2800, y: 1000, width: 150, speed: 4.5, endX: 3200 },
            { startX: 3000, y: 1000, width: 150, speed: 4.5, endX: 3400 }
          ],
          
          // 垂直移动平台（用于切换传送带）
          movingPlatforms: [
            { startX: 1000, startY: 1050, endX: 1000, endY: 950, width: 80, speed: 2.0 },
            { startX: 2000, startY: 1020, endX: 2000, endY: 920, width: 80, speed: 2.0 }
          ],
          
          // 【核心机制2：检查点 + 食物收集】
          collectibles: [
            // 检查点1（排队区）
            { x: 570, y: 970, type: 'coin', value: 10 },
            // 检查点2（传送带区）
            { x: 1400, y: 970, type: 'gem', value: 20 },
            // 鸡腿（打饭窗口区）
            { x: 1880, y: 970, type: 'gem', value: 20 },
            // 米饭（餐桌区）
            { x: 2350, y: 890, type: 'gem', value: 20 },
            // 汤（餐桌区）
            { x: 2500, y: 870, type: 'gem', value: 20 },
            // 红烧肉（终点）
            { x: 2800, y: 920, type: 'key', value: 1 }
          ],
          
          // 【核心机制3：传送带上的敌人 - 需要在奔跑中躲避】
          enemies: [
            // 第1段传送带：插队的同学（basic）
            { x: 400, y: 1030, type: 'basic' },
            { x: 550, y: 1030, type: 'basic' },
            { x: 700, y: 1030, type: 'basic' },
            { x: 850, y: 1030, type: 'basic' },
            
            // 第1段上空：飞来的餐盘（bat）
            { x: 450, y: 1000, type: 'bat' },
            { x: 600, y: 980, type: 'bat' },
            { x: 750, y: 960, type: 'bat' },
            
            // 第2段反向传送带：食堂阿姨（robot，需要逆向躲避）
            { x: 1300, y: 1000, type: 'robot' },
            { x: 1500, y: 1000, type: 'robot' },
            { x: 1700, y: 1000, type: 'robot' },
            { x: 1850, y: 1000, type: 'robot' },
            
            // 第2段上空：密集餐盘（bat）
            { x: 1350, y: 970, type: 'bat' },
            { x: 1550, y: 950, type: 'bat' },
            { x: 1750, y: 930, type: 'bat' },
            
            // 第3段超快传送带：食堂大妈Boss（robot）
            { x: 2350, y: 980, type: 'robot' },
            { x: 2550, y: 980, type: 'robot' },
            { x: 2750, y: 980, type: 'robot' },
            { x: 2950, y: 980, type: 'robot' },
            
            // 第3段上空：超密集餐盘（bat）
            { x: 2400, y: 950, type: 'bat' },
            { x: 2500, y: 930, type: 'bat' },
            { x: 2600, y: 910, type: 'bat' },
            { x: 2700, y: 890, type: 'bat' },
            { x: 2800, y: 870, type: 'bat' },
            { x: 2900, y: 850, type: 'bat' }
          ],
          
          goal: { x: 2880, y: 920 }
        },
        questions: [
          {
            id: 'q4_2_1',
            type: 'choice',
            question: '食堂阿姨手抖了一下，给你多打了半勺菜，你应该？',
            options: ['大喊"阿姨我爱你"', '赶紧走别让她发现', '假装没看见', '说"阿姨再来亿勺"'],
            answer: '赶紧走别让她发现',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_2_2',
            type: 'code',
            question: '食堂阿姨的灵魂拷问："孩子，够吗？"\n# 一份菜2.5元，你要3份\nprice_per = 2.5\nportions = 3\ntotal = ___  # 填空\nprint(f"一共{total}元")  # 输出7.5',
            answer: 'price_per * portions',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        rewards: { xp: 200, coins: 100 }
      },
      {
        id: 'level_4_3',
        name: '图书馆寻宝',
        description: '【正常跳跃】在书架间跳跃，找到隐藏的古籍！',
        story: '图书馆最高层藏着一本传说中的"学霸秘籍"！你必须爬上层层书架，躲避管理员和巡视老师，找到这本神秘古籍！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 2500,
          height: 1200,
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 2500, height: 20, type: 'ground' },
            
            // 【第1层：入口区】
            { x: 150, y: 1080, width: 120, height: 20 },
            { x: 320, y: 1050, width: 100, height: 20 },
            { x: 470, y: 1020, width: 100, height: 20 },
            { x: 620, y: 1000, width: 100, height: 20 },
            
            // 【第2层：阅览区】
            { x: 800, y: 1080, width: 110, height: 20 },
            { x: 960, y: 1050, width: 100, height: 20 },
            { x: 1110, y: 1020, width: 100, height: 20 },
            { x: 1260, y: 1000, width: 100, height: 20 },
            
            // 【第3层：高层书架】
            { x: 1440, y: 1080, width: 100, height: 20 },
            { x: 1590, y: 1050, width: 100, height: 20 },
            { x: 1740, y: 1020, width: 100, height: 20 },
            { x: 1890, y: 1000, width: 100, height: 20 },
            
            // 【第4层：顶层书架 - 需要精确跳跃】
            { x: 400, y: 950, width: 90, height: 20 },
            { x: 600, y: 920, width: 90, height: 20 },
            { x: 800, y: 900, width: 90, height: 20 },
            { x: 1000, y: 880, width: 90, height: 20 },
            { x: 1200, y: 860, width: 90, height: 20 },
            { x: 1400, y: 840, width: 90, height: 20 },
            { x: 1600, y: 820, width: 90, height: 20 },
            
            // 【第5层：古籍区 - 终点】
            { x: 1800, y: 800, width: 120, height: 20 },
            { x: 2000, y: 770, width: 150, height: 20 }
          ],
          
          // 少量移动平台（书车）
          autoMovingPlatforms: [
            { startX: 750, y: 1050, width: 100, speed: 1.5, endX: 1050 },
            { startX: 1400, y: 1020, width: 100, speed: 1.8, endX: 1700 }
          ],
          
          enemies: [
            // 第1层：看书的同学
            { x: 320, y: 1030, type: 'basic' },
            { x: 620, y: 980, type: 'basic' },
            
            // 第2层：图书管理员
            { x: 960, y: 1030, type: 'robot' },
            { x: 1260, y: 980, type: 'robot' },
            
            // 第3层：巡视老师
            { x: 1590, y: 1030, type: 'robot' },
            { x: 1890, y: 980, type: 'robot' },
            
            // 第4层：飞行的书本（bat）
            { x: 600, y: 900, type: 'bat' },
            { x: 1000, y: 860, type: 'bat' },
            { x: 1400, y: 820, type: 'bat' },
            
            // 第5层：教导主任守卫
            { x: 2000, y: 750, type: 'robot' }
          ],
          
          collectibles: [
            { x: 470, y: 990, type: 'coin', value: 10 },
            { x: 1110, y: 990, type: 'gem', value: 20 },
            { x: 1740, y: 970, type: 'gem', value: 20 },
            { x: 1200, y: 830, type: 'gem', value: 20 },
            { x: 2000, y: 740, type: 'key', value: 1 }
          ],
          
          goal: { x: 2100, y: 740 }
        },
        questions: [
          {
            id: 'q4_3_1',
            type: 'choice',
            question: '午休时间在图书馆刷抖音，突然班主任出现在身后，你的手机屏幕正在播放《孤勇者》，你应该？',
            options: ['立刻锁屏装睡', '说"老师这是学习资料"', '把音量调到最大证明不心虚', '说"老师您也刷抖音吗"'],
            answer: '说"老师这是学习资料"',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_3_2',
            type: 'code',
            question: '判断今天是不是周五（学生最爱的一天）：\n# 周五是第5天，偶数天是2、4、6\nday = 5\nis_friday = day ___ 2 == 1  # 填空：取余运算符（奇数判断）\nprint(is_friday)  # True表示是周五！',
            answer: '%',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        rewards: { xp: 220, coins: 110 }
      },
      {
        id: 'level_4_4',
        name: '化学实验室逃生',
        description: '【垂直上升】实验爆炸！跳上上升平台逃到屋顶！',
        story: '化学实验室爆炸了！有毒气体从地面升起，试剂架开始自动上升！你必须跳上这些上升的平台，在上升过程中躲避爆炸的试剂瓶、有毒气体，逃到屋顶！',
        campaignMapData: {
          startPosition: { x: 100, y: 1250 },
          width: 1200,
          height: 1500,  // 加高地图！
          
          platforms: [
            // 地面起点（危险区，有毒气）
            { x: 0, y: 1450, width: 1200, height: 20, type: 'ground' },
            
            // 起跳平台
            { x: 100, y: 1380, width: 120, height: 20 },
            
            // 【中间固定平台（少量，用于休息和躲避）】
            // 第1层休息平台
            { x: 500, y: 1250, width: 200, height: 20 },
            
            // 第2层休息平台
            { x: 400, y: 1100, width: 180, height: 20 },
            
            // 第3层休息平台
            { x: 520, y: 950, width: 160, height: 20 },
            
            // 第4层休息平台
            { x: 450, y: 800, width: 140, height: 20 },
            
            // 第5层休息平台
            { x: 500, y: 650, width: 120, height: 20 },
            
            // 顶层终点（屋顶）
            { x: 450, y: 500, width: 300, height: 20 }
          ],
          
          // 【核心机制1：从下往上升的移动平台！】
          movingPlatforms: [
            // 第1组：慢速上升（速度1.8）
            { startX: 250, startY: 1450, endX: 250, endY: 1200, width: 110, speed: 1.8 },
            { startX: 450, startY: 1450, endX: 450, endY: 1200, width: 110, speed: 1.8 },
            { startX: 650, startY: 1450, endX: 650, endY: 1200, width: 110, speed: 1.8 },
            { startX: 850, startY: 1450, endX: 850, endY: 1200, width: 110, speed: 1.8 },
            
            // 第2组：中速上升（速度2.2）
            { startX: 300, startY: 1300, endX: 300, endY: 1050, width: 100, speed: 2.2 },
            { startX: 500, startY: 1300, endX: 500, endY: 1050, width: 100, speed: 2.2 },
            { startX: 700, startY: 1300, endX: 700, endY: 1050, width: 100, speed: 2.2 },
            { startX: 900, startY: 1300, endX: 900, endY: 1050, width: 100, speed: 2.2 },
            
            // 第3组：快速上升（速度2.6）
            { startX: 350, startY: 1150, endX: 350, endY: 900, width: 90, speed: 2.6 },
            { startX: 550, startY: 1150, endX: 550, endY: 900, width: 90, speed: 2.6 },
            { startX: 750, startY: 1150, endX: 750, endY: 900, width: 90, speed: 2.6 },
            
            // 第4组：超快上升（速度3.0）
            { startX: 400, startY: 1000, endX: 400, endY: 750, width: 80, speed: 3.0 },
            { startX: 600, startY: 1000, endX: 600, endY: 750, width: 80, speed: 3.0 },
            { startX: 800, startY: 1000, endX: 800, endY: 750, width: 80, speed: 3.0 },
            
            // 第5组：极速上升（速度3.4）
            { startX: 450, startY: 850, endX: 450, endY: 600, width: 70, speed: 3.4 },
            { startX: 650, startY: 850, endX: 650, endY: 600, width: 70, speed: 3.4 },
            
            // 第6组：最终冲刺（速度3.8）
            { startX: 500, startY: 700, endX: 500, endY: 550, width: 60, speed: 3.8 },
            { startX: 700, startY: 700, endX: 700, endY: 550, width: 60, speed: 3.8 }
          ],
          
          // 【核心机制2：水平移动平台（增加难度）】
          autoMovingPlatforms: [
            { startX: 150, y: 1300, width: 90, speed: 2.5, endX: 450 },
            { startX: 700, y: 1150, width: 90, speed: 3.0, endX: 1000 },
            { startX: 250, y: 1000, width: 80, speed: 3.5, endX: 550 },
            { startX: 600, y: 850, width: 70, speed: 4.0, endX: 900 },
            { startX: 350, y: 700, width: 60, speed: 4.5, endX: 650 }
          ],
          
          // 【核心机制3：分层密集敌人】
          enemies: [
            // 第1层：地面慌乱的同学
            { x: 400, y: 1430, type: 'basic' },
            { x: 800, y: 1430, type: 'basic' },
            
            // 第2层：爆炸的试剂瓶（bat，快速飞行）
            { x: 300, y: 1280, type: 'bat' },
            { x: 500, y: 1250, type: 'bat' },
            { x: 700, y: 1220, type: 'bat' },
            { x: 900, y: 1200, type: 'bat' },
            
            // 第3层：化学老师（robot，快速移动）
            { x: 350, y: 1130, type: 'robot' },
            { x: 650, y: 1100, type: 'robot' },
            { x: 950, y: 1070, type: 'robot' },
            
            // 第4层：有毒气体（bat，密集）
            { x: 400, y: 980, type: 'bat' },
            { x: 600, y: 950, type: 'bat' },
            { x: 800, y: 920, type: 'bat' },
            
            // 第5层：连环爆炸（bat，超密集）
            { x: 450, y: 830, type: 'bat' },
            { x: 650, y: 800, type: 'bat' },
            { x: 850, y: 770, type: 'bat' },
            
            // 第6层：最终爆炸（bat，极密集）
            { x: 500, y: 680, type: 'bat' },
            { x: 700, y: 650, type: 'bat' },
            { x: 900, y: 620, type: 'bat' },
            
            // 顶层守卫（robot）
            { x: 600, y: 480, type: 'robot' }
          ],
          
          // 【核心机制4：收集物（分层放置）】
          collectibles: [
            // 第1层
            { x: 450, y: 1230, type: 'coin', value: 10 },
            { x: 850, y: 1200, type: 'coin', value: 10 },
            // 第2层
            { x: 500, y: 1080, type: 'gem', value: 20 },
            { x: 900, y: 1050, type: 'gem', value: 20 },
            // 第3层
            { x: 550, y: 930, type: 'gem', value: 20 },
            { x: 750, y: 900, type: 'gem', value: 20 },
            // 第4层
            { x: 600, y: 780, type: 'gem', value: 30 },
            { x: 800, y: 750, type: 'gem', value: 30 },
            // 第5层
            { x: 650, y: 630, type: 'gem', value: 30 },
            // 顶层
            { x: 600, y: 470, type: 'key', value: 1 }
          ],
          
          goal: { x: 600, y: 470 }
        },
        questions: [
          {
            id: 'q4_4_1',
            type: 'choice',
            question: '化学老师做实验时说了句"大家注意看，我只演示一次"，然后试管爆炸了，这时你应该？',
            options: ['大喊"老师再来一次"', '鼓掌说"精彩"', '假装认真记笔记', '发朋友圈"见证历史"'],
            answer: '假装认真记笔记',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_4_2',
            type: 'code',
            question: '找出班里最高的分数（学霸的分数）：\nscores = [85, 92, 78, 95, 88]  # 全班成绩\nhighest = ___(scores)  # 填空：Python内置函数\nprint(f"学霸考了{highest}分")  # 输出95',
            answer: 'max',
            difficulty: 1,
            subject: 'programming'
          }
        ],
        rewards: { xp: 240, coins: 120 }
      },
      {
        id: 'level_4_5',
        name: '终极挑战：教导主任',
        description: '【Boss战】面对教导主任的终极考验，证明你的实力！',
        story: '你闯过了所有关卡，现在要面对最终Boss——教导主任！他会用各种手段考验你：快速移动、跳跃攻击、投掷粉笔、召唤老师！只有答对所有题目并击败他，才能获得"校园传奇"称号！',
        campaignMapData: {
          startPosition: { x: 150, y: 650 },
          width: 1800,   // 🔥 地图扩大一倍
          height: 800,   // 🔥 增加高度
          platforms: [
            // 地面（教导处办公室 - 超宽）
            { x: 0, y: 750, width: 1800, height: 20, type: 'ground' },
            
            // 左侧平台（简化）
            { x: 100, y: 630, width: 200, height: 20 },
            { x: 80, y: 480, width: 180, height: 20 },
            
            // 右侧平台（简化）
            { x: 1500, y: 630, width: 200, height: 20 },
            { x: 1540, y: 480, width: 180, height: 20 },
            
            // 中央Boss战斗区（宽敞开阔）
            { x: 550, y: 620, width: 250, height: 20 },   // 左跳板
            { x: 1000, y: 620, width: 250, height: 20 },  // 右跳板
            { x: 700, y: 480, width: 400, height: 20 },   // Boss主平台（超大）
            
            // 顶部平台（终点）
            { x: 800, y: 320, width: 200, height: 20 }
          ],
          
          // 移动平台（简化）
          autoMovingPlatforms: [
            { startX: 450, y: 550, width: 100, speed: 1.5, endX: 1250 }
          ],
          
          enemies: [
            // 小怪：其他老师（减少）
            { x: 200, y: 600, type: 'basic' },
            { x: 1600, y: 600, type: 'basic' },
            // Boss：教导主任
            { x: 900, y: 450, type: 'boss' }
          ],
          
          collectibles: [
            { x: 200, y: 600, type: 'coin', value: 10 },
            { x: 650, y: 590, type: 'gem', value: 20 },
            { x: 1150, y: 590, type: 'gem', value: 20 },
            { x: 1600, y: 600, type: 'coin', value: 10 },
            { x: 900, y: 290, type: 'key', value: 1 }
          ],
          
          goal: { x: 900, y: 290 }
        },
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',
          hp: 8,  // 战役4：HP=8（增加难度）
          phases: [
            {
              hp: 8,
              attacks: ['charge', 'jump'],  // 第一阶段：快速移动+跳跃
              attackInterval: 2400,
              moveSpeed: 110
            },
            {
              hp: 6,
              attacks: ['charge', 'jump', 'projectile'],  // 第二阶段：投掷粉笔
              attackInterval: 2100,
              moveSpeed: 120
            },
            {
              hp: 4,
              attacks: ['charge', 'jump', 'projectile', 'aoe'],  // 第三阶段：怒吼AOE
              attackInterval: 1800,
              moveSpeed: 130
            },
            {
              hp: 2,
              attacks: ['charge', 'jump', 'projectile', 'aoe', 'summon'],  // 第四阶段：召唤老师
              attackInterval: 1500,
              moveSpeed: 140,
              summonMinions: true
            }
          ],
          weakPoint: { x: 0, y: -28, width: 38, height: 18 },  // 头部弱点
          defeatCondition: 'hybrid',
          questionsRequired: 5  // 增加到5道题
        },
        questions: [
          {
            id: 'q4_5_1',
            type: 'choice',
            question: '教导主任："你为什么上课睡觉？" 最佳回答是？',
            options: ['昨晚打游戏了', '您讲得太催眠了', '在思考人生', '梦里也在学习'],
            answer: '梦里也在学习',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_5_2',
            type: 'code',
            question: '教导主任要统计违纪次数：\n# 小明违纪3次，小红违纪2次\nxiaoming = 3\nxiaohong = 2\ntotal = ___  # 填空：计算总违纪次数\nprint(f"总共{total}次")  # 输出5',
            answer: 'xiaoming + xiaohong',
            difficulty: 1,
            subject: 'programming'
          },
          {
            id: 'q4_5_3',
            type: 'choice',
            question: '教导主任："你的作业呢？" 你说？',
            options: ['狗吃了', '风吹走了', '在家忘带了', '昨晚已交给课代表'],
            answer: '昨晚已交给课代表',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q4_5_4',
            type: 'code',
            question: '教导主任检查迟到情况：\n# 迟到5分钟扣1分，迟到15分钟\nminutes = 15\npenalty_per_5min = 1\npenalty = ___  # 填空：计算扣分\nprint(f"扣{penalty}分")  # 输出3',
            answer: 'minutes // 5 * penalty_per_5min',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q4_5_5',
            type: 'choice',
            question: '教导主任："你们班这次考试平均分才60分，你有什么想说的？"',
            options: ['我考了61分，拖后腿了', '我考了100分，我尽力了', '我考了59分，给班级丢脸了', '我考了0分，我是来搞笑的'],
            answer: '我考了100分，我尽力了',
            difficulty: 1,
            subject: 'logic'
          }
        ],
        rewards: { xp: 400, coins: 200, skills: ['academic_master'] }
      }
    ],
    unlockRequirement: 'campaign_3',
    rewards: { xp: 800, coins: 350, title: '学霸之王' }
  },

  // 战役5：猇亭古镇探秘 - 新玩法组合
  {
    id: 'campaign_5',
    name: '猇亭古镇探秘',
    description: '【新玩法组合】在古镇中体验各种创新挑战',
    location: '猇亭古镇',
    theme: '古镇文化',
    story: '猇亭古镇有着悠久的历史，这里的每个地方都有独特的挑战：时光之门的上升平台、老街市场的反向传送带、古塔的垂直攀登、密室的机关谜题。你需要掌握所有技巧，才能通过古镇的终极考验！',
    levels: [
      {
        id: 'level_5_1',
        name: '时光之门：旋转跳跃',
        description: '【旋转平台】跳上旋转的时钟指针，掌握时机穿越时空！',
        story: '古镇入口的巨大时钟正在运转！时钟的指针像平台一样旋转，你必须跳上这些旋转的指针，在它们转动时找准时机跳到下一个，到达时光之门！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 2500,
          height: 1200,
          
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 2500, height: 20, type: 'ground' },
            
            // 起点平台
            { x: 100, y: 1080, width: 150, height: 20 },
            
            // 【第1个时钟区域】
            { x: 400, y: 1000, width: 100, height: 20 },  // 时钟中心
            // 4个旋转平台（模拟时钟指针，圆周运动）
            // 这里用水平+垂直移动模拟圆周
            
            // 【第2个时钟区域】
            { x: 900, y: 950, width: 100, height: 20 },  // 时钟中心
            
            // 【第3个时钟区域】
            { x: 1400, y: 900, width: 100, height: 20 },  // 时钟中心
            
            // 【第4个时钟区域】
            { x: 1900, y: 850, width: 100, height: 20 },  // 时钟中心
            
            // 终点平台（时光之门）
            { x: 2200, y: 800, width: 250, height: 20 }
          ],
          
          // 【核心玩法：圆周运动的平台（模拟旋转时钟指针）】
          movingPlatforms: [
            // 第1个时钟：4个指针（慢速旋转）
            { startX: 400, startY: 900, endX: 400, endY: 1100, width: 80, speed: 1.5 },  // 垂直
            { startX: 300, startY: 1000, endX: 500, endY: 1000, width: 80, speed: 1.5 },  // 水平
            { startX: 400, startY: 1100, endX: 400, endY: 900, width: 80, speed: 1.5 },  // 垂直反向
            { startX: 500, startY: 1000, endX: 300, endY: 1000, width: 80, speed: 1.5 },  // 水平反向
            
            // 第2个时钟：4个指针（中速旋转）
            { startX: 900, startY: 850, endX: 900, endY: 1050, width: 70, speed: 2.0 },
            { startX: 800, startY: 950, endX: 1000, endY: 950, width: 70, speed: 2.0 },
            { startX: 900, startY: 1050, endX: 900, endY: 850, width: 70, speed: 2.0 },
            { startX: 1000, startY: 950, endX: 800, endY: 950, width: 70, speed: 2.0 },
            
            // 第3个时钟：4个指针（快速旋转）
            { startX: 1400, startY: 800, endX: 1400, endY: 1000, width: 60, speed: 2.5 },
            { startX: 1300, startY: 900, endX: 1500, endY: 900, width: 60, speed: 2.5 },
            { startX: 1400, startY: 1000, endX: 1400, endY: 800, width: 60, speed: 2.5 },
            { startX: 1500, startY: 900, endX: 1300, endY: 900, width: 60, speed: 2.5 },
            
            // 第4个时钟：4个指针（超快旋转）
            { startX: 1900, startY: 750, endX: 1900, endY: 950, width: 50, speed: 3.0 },
            { startX: 1800, startY: 850, endX: 2000, endY: 850, width: 50, speed: 3.0 },
            { startX: 1900, startY: 950, endX: 1900, endY: 750, width: 50, speed: 3.0 },
            { startX: 2000, startY: 850, endX: 1800, endY: 850, width: 50, speed: 3.0 }
          ],
          
          // 辅助水平平台（连接各个时钟）
          autoMovingPlatforms: [
            { startX: 600, y: 1050, width: 100, speed: 2.0, endX: 800 },
            { startX: 1100, y: 1000, width: 100, speed: 2.5, endX: 1300 },
            { startX: 1600, y: 950, width: 100, speed: 3.0, endX: 1800 }
          ],
          
          enemies: [
            // 时钟守卫（在时钟中心）
            { x: 400, y: 980, type: 'robot' },
            { x: 900, y: 930, type: 'robot' },
            { x: 1400, y: 880, type: 'robot' },
            { x: 1900, y: 830, type: 'robot' },
            
            // 飞行的时间碎片（bat）
            { x: 350, y: 950, type: 'bat' },
            { x: 450, y: 950, type: 'bat' },
            { x: 850, y: 900, type: 'bat' },
            { x: 950, y: 900, type: 'bat' },
            { x: 1350, y: 850, type: 'bat' },
            { x: 1450, y: 850, type: 'bat' },
            { x: 1850, y: 800, type: 'bat' },
            { x: 1950, y: 800, type: 'bat' },
            
            // 连接区域的巡逻者
            { x: 700, y: 1030, type: 'basic' },
            { x: 1200, y: 980, type: 'basic' },
            { x: 1700, y: 930, type: 'basic' }
          ],
          
          collectibles: [
            { x: 400, y: 970, type: 'coin', value: 10 },
            { x: 700, y: 1020, type: 'coin', value: 10 },
            { x: 900, y: 920, type: 'gem', value: 20 },
            { x: 1200, y: 970, type: 'gem', value: 20 },
            { x: 1400, y: 870, type: 'gem', value: 20 },
            { x: 1700, y: 920, type: 'gem', value: 20 },
            { x: 1900, y: 820, type: 'gem', value: 30 },
            { x: 2300, y: 770, type: 'key', value: 1 }
          ],
          
          goal: { x: 2350, y: 770 }
        },
        questions: [
          {
            id: 'q5_1_1',
            type: 'choice',
            question: '时间的基本单位是什么？',
            options: ['秒', '分', '时', '天'],
            answer: '秒',
            difficulty: 1,
            subject: 'logic'
          },
          {
            id: 'q5_1_2',
            type: 'code',
            question: '写一个Python函数，计算两个时间戳的差值（秒）：',
            answer: 'def time_diff(t1, t2): return abs(t2 - t1)',
            difficulty: 2,
            subject: 'programming'
          },
          {
            id: 'q5_1_3',
            type: 'choice',
            question: '古代计时工具中，哪个最准确？',
            options: ['日晷', '沙漏', '水钟', '机械钟'],
            answer: '机械钟',
            difficulty: 2,
            subject: 'logic'
          }
        ],
        rewards: { xp: 150, coins: 75 }
      },
      {
        id: 'level_5_2',
        name: '老街市场：时间膨胀',
        description: '【玩家变大】随着时间推移，你会越来越大！快速通关！',
        story: '老街市场的时间魔法失控了！你的身体会随着时间不断膨胀变大！体型越大越容易被攻击，而且有神秘的追踪者一直在追击你！必须在变得太大之前到达终点！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 2500,
          height: 1200,
          
          // 【核心玩法：玩家会越来越大！】
          playerGrowth: {
            enabled: true,
            growthRate: 0.25,  // 每秒增长25%（更明显！）
            maxScale: 4.0,     // 最大4倍大小
            startScale: 1.0    // 初始大小
          },
          
          // 【新增：追击型敌人！】
          chasers: [
            { type: 'chaser', startDelay: 3000, speed: 150 },  // 3秒后出现，速度150
            { type: 'chaser', startDelay: 10000, speed: 180 }, // 10秒后出现，速度更快
            { type: 'chaser', startDelay: 20000, speed: 200 }  // 20秒后出现，速度最快
          ],
          
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 2500, height: 20, type: 'ground' },
            
            // 起点平台
            { x: 100, y: 1080, width: 150, height: 20 },
            
            // 第1区：正常大小（容易通过）
            { x: 300, y: 1050, width: 120, height: 20 },
            { x: 450, y: 1020, width: 120, height: 20 },
            { x: 600, y: 990, width: 120, height: 20 },
            
            // 第2区：开始变大（需要小心）
            { x: 750, y: 960, width: 100, height: 20 },
            { x: 880, y: 930, width: 100, height: 20 },
            { x: 1010, y: 900, width: 100, height: 20 },
            
            // 第3区：明显变大（很难通过）
            { x: 1150, y: 870, width: 90, height: 20 },
            { x: 1270, y: 840, width: 90, height: 20 },
            { x: 1390, y: 810, width: 90, height: 20 },
            
            // 第4区：非常大（极限挑战）
            { x: 1520, y: 780, width: 80, height: 20 },
            { x: 1630, y: 750, width: 80, height: 20 },
            { x: 1740, y: 720, width: 80, height: 20 },
            
            // 第5区：巨大（几乎不可能）
            { x: 1860, y: 690, width: 70, height: 20 },
            { x: 1960, y: 660, width: 70, height: 20 },
            { x: 2060, y: 630, width: 70, height: 20 },
            
            // 终点平台
            { x: 2180, y: 600, width: 200, height: 20 }
          ],
          
          // 移动平台（增加难度）
          movingPlatforms: [
            { startX: 350, startY: 1050, endX: 350, endY: 950, width: 80, speed: 2.0 },
            { startX: 800, startY: 960, endX: 800, endY: 860, width: 70, speed: 2.5 },
            { startX: 1200, startY: 870, endX: 1200, endY: 770, width: 60, speed: 3.0 },
            { startX: 1580, startY: 780, endX: 1580, endY: 680, width: 50, speed: 3.5 }
          ],
          
          enemies: [
            // 第1区：少量敌人
            { x: 350, y: 1030, type: 'basic' },
            { x: 650, y: 970, type: 'bat' },
            
            // 第2区：适量
            { x: 800, y: 940, type: 'robot' },
            { x: 1060, y: 880, type: 'bat' },
            
            // 第3区：中等
            { x: 1200, y: 850, type: 'bat' },
            { x: 1440, y: 790, type: 'robot' },
            
            // 第4区：较多
            { x: 1570, y: 760, type: 'robot' },
            { x: 1790, y: 700, type: 'bat' },
            
            // 第5区：密集
            { x: 1910, y: 670, type: 'bat' },
            { x: 2110, y: 610, type: 'robot' },
            
            // 空中巡逻（减少）
            { x: 900, y: 800, type: 'bat' },
            { x: 1700, y: 600, type: 'bat' }
          ],
          
          collectibles: [
            { x: 350, y: 1020, type: 'coin', value: 10 },
            { x: 500, y: 990, type: 'coin', value: 10 },
            { x: 800, y: 930, type: 'gem', value: 20 },
            { x: 1060, y: 870, type: 'gem', value: 20 },
            { x: 1320, y: 810, type: 'gem', value: 20 },
            { x: 1630, y: 720, type: 'gem', value: 30 },
            { x: 2250, y: 570, type: 'key', value: 1 }
          ],
          
          goal: { x: 2300, y: 570 }
        },
        questions: [
          {
            id: 'q5_2_1',
            type: 'choice',
            question: '在编程中，数组的索引从几开始？',
            options: ['0', '1', '-1', '任意数'],
            answer: '0',
            difficulty: 2,
            subject: 'programming'
          }
        ],
        rewards: { xp: 180, coins: 90 }
      },
      {
        id: 'level_5_3',
        name: '古塔：弹跳云梯',
        description: '【弹跳平台】踩上去会被弹飞！掌握弹跳力度到达塔顶！',
        story: '古塔内部有神奇的弹跳云梯，踩上去会被弹到空中！你必须掌握弹跳的力度和方向，利用弹跳在塔内飞跃，到达塔顶！',
        campaignMapData: {
          startPosition: { x: 100, y: 1100 },
          width: 1200,
          height: 1200,
          
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 1200, height: 20, type: 'ground' },
            
            // 起点平台
            { x: 100, y: 1080, width: 120, height: 20 },
            
            // 【核心玩法：弹跳平台！】
            // 第1层：低弹跳（弹跳力度：小）
            { x: 300, y: 1050, width: 100, height: 20, bouncy: true, bounceForce: 300 },
            { x: 500, y: 1000, width: 100, height: 20, bouncy: true, bounceForce: 300 },
            { x: 700, y: 950, width: 100, height: 20, bouncy: true, bounceForce: 300 },
            
            // 第2层：中弹跳（弹跳力度：中）
            { x: 250, y: 900, width: 90, height: 20, bouncy: true, bounceForce: 400 },
            { x: 450, y: 850, width: 90, height: 20, bouncy: true, bounceForce: 400 },
            { x: 650, y: 800, width: 90, height: 20, bouncy: true, bounceForce: 400 },
            { x: 850, y: 750, width: 90, height: 20, bouncy: true, bounceForce: 400 },
            
            // 第3层：高弹跳（弹跳力度：大）
            { x: 350, y: 700, width: 80, height: 20, bouncy: true, bounceForce: 500 },
            { x: 550, y: 650, width: 80, height: 20, bouncy: true, bounceForce: 500 },
            { x: 750, y: 600, width: 80, height: 20, bouncy: true, bounceForce: 500 },
            
            // 第4层：超高弹跳（弹跳力度：超大）
            { x: 400, y: 550, width: 70, height: 20, bouncy: true, bounceForce: 600 },
            { x: 600, y: 500, width: 70, height: 20, bouncy: true, bounceForce: 600 },
            { x: 800, y: 450, width: 70, height: 20, bouncy: true, bounceForce: 600 },
            
            // 第5层：极限弹跳（弹跳力度：极大）
            { x: 500, y: 400, width: 60, height: 20, bouncy: true, bounceForce: 700 },
            { x: 700, y: 350, width: 60, height: 20, bouncy: true, bounceForce: 700 },
            
            // 休息平台（不弹跳，安全区）
            { x: 900, y: 900, width: 120, height: 20 },
            { x: 950, y: 700, width: 120, height: 20 },
            { x: 900, y: 500, width: 120, height: 20 },
            
            // 塔顶终点（不弹跳）
            { x: 500, y: 250, width: 200, height: 20 }
          ],
          
          // 辅助垂直移动平台（少量）
          movingPlatforms: [
            { startX: 200, startY: 1000, endX: 200, endY: 900, width: 80, speed: 2.0 },
            { startX: 1000, startY: 800, endX: 1000, endY: 700, width: 80, speed: 2.5 }
          ],
          
          enemies: [
            // 第1层
            { x: 350, y: 1030, type: 'basic' },
            { x: 550, y: 980, type: 'basic' },
            { x: 750, y: 930, type: 'bat' },
            
            // 第2层
            { x: 300, y: 880, type: 'bat' },
            { x: 500, y: 830, type: 'robot' },
            { x: 700, y: 780, type: 'bat' },
            { x: 900, y: 730, type: 'robot' },
            
            // 第3层
            { x: 400, y: 680, type: 'bat' },
            { x: 600, y: 630, type: 'robot' },
            { x: 800, y: 580, type: 'bat' },
            
            // 第4层
            { x: 450, y: 530, type: 'robot' },
            { x: 650, y: 480, type: 'bat' },
            { x: 850, y: 430, type: 'robot' },
            
            // 第5层
            { x: 550, y: 380, type: 'bat' },
            { x: 750, y: 330, type: 'robot' },
            
            // 塔顶
            { x: 600, y: 230, type: 'robot' }
          ],
          
          collectibles: [
            { x: 350, y: 1020, type: 'coin', value: 10 },
            { x: 550, y: 970, type: 'coin', value: 10 },
            { x: 500, y: 820, type: 'gem', value: 20 },
            { x: 850, y: 720, type: 'gem', value: 20 },
            { x: 600, y: 620, type: 'gem', value: 20 },
            { x: 800, y: 420, type: 'gem', value: 30 },
            { x: 700, y: 320, type: 'gem', value: 30 },
            { x: 600, y: 220, type: 'key', value: 1 }
          ],
          
          goal: { x: 600, y: 220 }
        },
        questions: [
          {
            id: 'q5_3_1',
            type: 'math',
            question: '一个正方形的周长是20cm，它的边长是多少？',
            answer: '5',
            difficulty: 2,
            subject: 'math'
          }
        ],
        rewards: { xp: 200, coins: 100 }
      },
      {
        id: 'level_5_4',
        name: '巨人挑战：重力迷宫',
        description: '【巨大体型+重力翻转】你变成了巨人！在重力翻转区域中艰难前进！',
        story: '古镇的时空魔法让你变成了巨人！体型巨大让操作变得困难，而且某些区域的重力会反转！你必须小心翼翼地穿越这些危险区域，到达终点！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 3000,
          height: 1200,
          
          // 🔥 v2.1.12: 简化玩法 - 玩家初始很大（操作难度高）+ 重力反转
          playerScale: 2.0,  // 玩家初始大小2倍，操作难度高
          
          // 【核心玩法：重力翻转区域】
          gravityZones: [
            { x: 800, y: 800, width: 250, height: 200, gravityMultiplier: -1 },   // 第1个翻转区
            { x: 1400, y: 700, width: 250, height: 200, gravityMultiplier: -1 },  // 第2个翻转区
            { x: 2000, y: 600, width: 250, height: 200, gravityMultiplier: -1 }   // 第3个翻转区
          ],
          
          platforms: [
            // 地面
            { x: 0, y: 1150, width: 3000, height: 20, type: 'ground' },
            
            // 起点平台
            { x: 100, y: 1080, width: 150, height: 20 },
            
            // 第1段：通往第1道门
            { x: 300, y: 1050, width: 100, height: 20 },
            { x: 450, y: 1020, width: 100, height: 20 },
            { x: 600, y: 1000, width: 120, height: 20 },  // 第1道门前
            
            // 第2段：重力翻转区
            { x: 750, y: 970, width: 80, height: 20 },
            { x: 900, y: 940, width: 80, height: 20, bouncy: true, bounceForce: 400 },  // 弹跳平台
            { x: 1050, y: 920, width: 100, height: 20 },
            { x: 1200, y: 900, width: 120, height: 20 },  // 第2道门前
            
            // 第3段：缩小挑战
            { x: 1350, y: 870, width: 70, height: 20 },
            { x: 1500, y: 840, width: 70, height: 20, bouncy: true, bounceForce: 500 },
            { x: 1650, y: 820, width: 90, height: 20 },
            { x: 1800, y: 800, width: 120, height: 20 },  // 第3道门前
            
            // 第4段：终极挑战
            { x: 1950, y: 770, width: 60, height: 20 },
            { x: 2100, y: 740, width: 60, height: 20, bouncy: true, bounceForce: 600 },
            { x: 2250, y: 720, width: 80, height: 20 },
            { x: 2400, y: 700, width: 120, height: 20 },  // 第4道门前
            
            // 终点平台
            { x: 2600, y: 650, width: 200, height: 20 }
          ],
          
          movingPlatforms: [
            { startX: 500, startY: 1020, endX: 650, endY: 1020, width: 80, speed: 3.0 },
            { startX: 1100, startY: 920, endX: 1250, endY: 920, width: 70, speed: 3.5 },
            { startX: 1700, startY: 820, endX: 1850, endY: 820, width: 60, speed: 4.0 }
          ],
          
          enemies: [
            { x: 350, y: 1020, type: 'slime' },
            { x: 500, y: 1000, type: 'bat' },
            { x: 700, y: 950, type: 'robot' },
            { x: 850, y: 930, type: 'slime' },
            { x: 1000, y: 900, type: 'bat' },
            { x: 1150, y: 870, type: 'robot' },
            { x: 1300, y: 850, type: 'slime' },
            { x: 1450, y: 820, type: 'bat' },
            { x: 1600, y: 800, type: 'robot' },
            { x: 1750, y: 770, type: 'slime' },
            { x: 1900, y: 750, type: 'bat' },
            { x: 2050, y: 720, type: 'robot' },
            { x: 2200, y: 700, type: 'slime' },
            { x: 2350, y: 670, type: 'bat' },
            { x: 2500, y: 650, type: 'robot' },
            { x: 2650, y: 620, type: 'slime' },
            { x: 2800, y: 600, type: 'bat' }
          ],
          
          collectibles: [
            { x: 350, y: 1020, type: 'coin', value: 10 },
            { x: 750, y: 950, type: 'coin', value: 10 },
            { x: 1150, y: 880, type: 'gem', value: 20 },
            { x: 1650, y: 800, type: 'gem', value: 20 },
            { x: 2250, y: 700, type: 'gem', value: 30 },
            { x: 2700, y: 630, type: 'key', value: 1 }
          ],
          
          goal: { x: 2750, y: 630 }
        },
        questions: [
          {
            id: 'q5_4_1',
            type: 'choice',
            question: '快速回答！时间在流逝！1 + 1 在二进制中等于？',
            options: ['2', '10', '11', '0'],
            answer: '10',
            difficulty: 1,
            subject: 'programming',
            explanation: '答对了！获得5秒加速！'
          },
          {
            id: 'q5_4_2',
            type: 'choice',
            question: '时间紧迫！为什么程序员总是分不清万圣节和圣诞节？',
            options: ['因为 Oct 31 = Dec 25', '因为都放假', '因为都吃糖', '因为都有礼物'],
            answer: '因为 Oct 31 = Dec 25',
            difficulty: 2,
            subject: 'general',
            explanation: '八进制的31等于十进制的25！获得5秒加速！'
          },
          {
            id: 'q5_4_3',
            type: 'choice',
            question: '抓紧时间！时间复杂度 O(n²) 表示什么？',
            options: ['平方级增长', '线性增长', '对数增长', '常数增长'],
            answer: '平方级增长',
            difficulty: 3,
            subject: 'programming',
            explanation: '正确！获得5秒加速！'
          },
          {
            id: 'q5_4_4',
            type: 'choice',
            question: '最后一题！图灵测试是用来测试什么的？',
            options: ['机器是否具有智能', '程序是否有Bug', '代码是否优雅', '电脑速度'],
            answer: '机器是否具有智能',
            difficulty: 3,
            subject: 'general',
            explanation: '完美！获得最后5秒加速！冲向终点！'
          }
        ],
        rewards: { xp: 300, coins: 150 }
      },
      {
        id: 'level_5_5',
        name: '时空守护者：终极对决',
        description: '【时间操控Boss】击败能操控时间的守护者！',
        story: '古镇的时空裂缝核心，时空守护者现身了！他能加速自己、减速你、甚至倒流时间！你必须利用战役中学到的所有技能：在他变大时躲避，在他缩小时攻击，利用弹跳平台和重力翻转来对抗他的时间魔法！',
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',
          hp: 6,  // Boss血量6点（对应6个阶段）
          
          // 【核心机制：时间操控】
          timeAbilities: {
            selfAccelerate: { duration: 5000, speedMultiplier: 2.0 },      // 自我加速
            playerSlow: { duration: 5000, speedMultiplier: 0.5 },          // 减速玩家
            timeRewind: { duration: 3000, rewindSeconds: 3 },              // 时间倒流
            timePause: { duration: 2000, pauseRadius: 200 }                // 时间暂停（范围内）
          },
          
          // 【6个阶段，每个阶段都有独特的时间能力】
          phases: [
            {
              hp: 6,
              name: '正常时间',
              attacks: ['charge', 'projectile'],
              attackInterval: 3000,
              moveSpeed: 100,
              timeAbility: null  // 第1阶段：无特殊能力
            },
            {
              hp: 5,
              name: '时间加速',
              attacks: ['charge', 'projectile', 'dash'],
              attackInterval: 2500,
              moveSpeed: 150,
              timeAbility: 'selfAccelerate',  // 第2阶段：自我加速
              abilityInterval: 8000
            },
            {
              hp: 4,
              name: '时间减速',
              attacks: ['charge', 'projectile', 'dash'],
              attackInterval: 2500,
              moveSpeed: 120,
              timeAbility: 'playerSlow',  // 第3阶段：减速玩家
              abilityInterval: 10000,
              summonMinions: true  // 开始召唤小怪
            },
            {
              hp: 3,
              name: '时间倒流',
              attacks: ['charge', 'projectile', 'dash', 'jump'],
              attackInterval: 2000,
              moveSpeed: 130,
              timeAbility: 'timeRewind',  // 第4阶段：时间倒流
              abilityInterval: 12000,
              summonMinions: true
            },
            {
              hp: 2,
              name: '时间暂停',
              attacks: ['charge', 'projectile', 'dash', 'jump', 'aoe'],
              attackInterval: 1800,
              moveSpeed: 140,
              timeAbility: 'timePause',  // 第5阶段：时间暂停
              abilityInterval: 10000,
              summonMinions: true
            },
            {
              hp: 1,
              name: '时空崩塌',
              attacks: ['charge', 'projectile', 'dash', 'jump', 'aoe', 'laser'],
              attackInterval: 1500,
              moveSpeed: 160,
              timeAbility: 'all',  // 第6阶段：所有能力随机使用
              abilityInterval: 6000,
              summonMinions: true,
              berserk: true  // 狂暴状态
            }
          ],
          
          // 【特殊机制：时间碎片】
          // Boss受伤时会掉落时间碎片，拾取后获得临时能力
          timeShards: {
            dropChance: 0.5,  // 50%掉落概率
            types: [
              { type: 'speed', effect: 'speedBoost', duration: 5000 },      // 加速碎片
              { type: 'shield', effect: 'invincible', duration: 3000 },     // 护盾碎片
              { type: 'power', effect: 'doubleDamage', duration: 5000 }     // 力量碎片
            ]
          },
          
          weakPoint: { x: 0, y: -20, width: 40, height: 40 },  // 头顶弱点
          defeatCondition: 'hybrid',
          questionsRequired: 3,  // 需要答对3道题
          
          // 【问答触发条件】
          questionTriggers: [
            { hp: 4, message: '时空守护者的力量减弱了！回答问题削弱他！' },
            { hp: 2, message: '时空守护者陷入混乱！抓住机会答题！' },
            { hp: 1, message: '最后一击！回答终极问题击败他！' }
          ]
        },
        campaignMapData: {
          startPosition: { x: 600, y: 700 },  // 玩家起始位置（中央）
          width: 2000,   // 🔥 地图扩大，给Boss更多活动空间
          height: 1100,  // 🔥 增加高度
          
          // 【融合战役5所有机制】
          // 1. 玩家会随时间变化（前期变大，后期变小）
          playerTimeEffect: {
            enabled: true,
            phase1: { duration: 15000, effect: 'grow', rate: 0.1, maxScale: 2.0 },    // 前15秒变大
            phase2: { duration: 30000, effect: 'shrink', rate: 0.05, minScale: 0.5 }  // 后30秒变小
          },
          
          // 2. 重力翻转区域（Boss技能触发）🔥 v2.1.12修复
          gravityZones: [
            { x: 300, y: 500, width: 300, height: 250, gravityMultiplier: -1, trigger: 'boss_hp_3' },
            { x: 1400, y: 500, width: 300, height: 250, gravityMultiplier: -1, trigger: 'boss_hp_3' }
          ],
          
          platforms: [
            // 地面（中央竞技场 - 超宽）
            { x: 0, y: 1050, width: 2000, height: 20, type: 'ground' },
            
            // 左侧平台（简化）
            { x: 150, y: 920, width: 200, height: 20 },
            { x: 100, y: 750, width: 180, height: 20, bouncy: true, bounceForce: 500 },
            
            // 右侧平台（简化）
            { x: 1650, y: 920, width: 200, height: 20 },
            { x: 1720, y: 750, width: 180, height: 20, bouncy: true, bounceForce: 500 },
            
            // 中央Boss战斗区（宽敞开阔）
            { x: 600, y: 900, width: 250, height: 20 },    // 左跳板
            { x: 1150, y: 900, width: 250, height: 20 },   // 右跳板
            { x: 800, y: 720, width: 400, height: 20 },    // Boss主平台（超大）
            
            // 顶层平台（终点）
            { x: 900, y: 520, width: 200, height: 20 },
            { x: 900, y: 350, width: 200, height: 20 }
          ],
          
          // 移动平台（简化）
          movingPlatforms: [
            { startX: 400, startY: 820, endX: 700, endY: 820, width: 120, speed: 1.5 },
            { startX: 1300, startY: 820, endX: 1600, endY: 820, width: 120, speed: 1.5 }
          ],
          
          enemies: [
            // Boss（时空守护者）
            { x: 1000, y: 690, type: 'boss' }
            // 小怪由Boss召唤，不预设
          ],
          
          collectibles: [
            // 恢复道具
            { x: 200, y: 890, type: 'coin', value: 10 },
            { x: 1750, y: 890, type: 'coin', value: 10 },
            { x: 700, y: 870, type: 'gem', value: 20 },
            { x: 1300, y: 870, type: 'gem', value: 20 },
            { x: 1000, y: 320, type: 'gem', value: 30 }
          ],
          
          goal: { x: 1000, y: 320 }  // 击败Boss后到达终点
        },
        questions: [
          {
            id: 'q5_5_1',
            type: 'choice',
            question: '【时空守护者的力量减弱了！】如果时间加速2倍，原本10秒的过程需要多少秒？',
            options: ['5秒', '10秒', '20秒', '15秒'],
            answer: '5秒',
            difficulty: 3,
            subject: 'math',
            explanation: '时间加速2倍，过程缩短一半！守护者的时间加速被破解了！'
          },
          {
            id: 'q5_5_2',
            type: 'choice',
            question: '【时空守护者陷入混乱！】在编程中，时间复杂度O(log n)表示什么？',
            options: ['对数时间', '线性时间', '平方时间', '常数时间'],
            answer: '对数时间',
            difficulty: 3,
            subject: 'programming',
            explanation: '对数时间！守护者的时间倒流能力被削弱了！'
          },
          {
            id: 'q5_5_3',
            type: 'choice',
            question: '【最后一击！】爱因斯坦的相对论告诉我们，当速度接近光速时，时间会？',
            options: ['变慢', '变快', '停止', '倒流'],
            answer: '变慢',
            difficulty: 3,
            subject: 'general',
            explanation: '时间膨胀效应！时空守护者被击败了！你掌握了时间的真谛！'
          }
        ],
        rewards: { xp: 400, coins: 200, skills: ['time_mastery'], title: '时空掌控者' }
      }
    ],
    unlockRequirement: 'campaign_4', // 🔥 v2.1.11: 修复！战役5需要完成战役4才能解锁
    rewards: { xp: 1200, coins: 600, title: '风暴征服者' }
  },

  // 战役6：长江大桥冒险
  {
    id: 'campaign_6',
    name: '长江大桥冒险',
    description: '在长江大桥上挑战极限',
    location: '长江大桥',
    theme: '现代工程',
    story: '长江大桥是连接两岸的重要通道，但最近出现了神秘的能量波动。你需要在桥上、桥下探索，最终掌握传送能力。',
    levels: [
      {
        id: 'level_6_1',
        name: '桥头堡 - 强风试炼',
        description: '在间歇性强风中精准跳跃 - 环境挑战',
        story: '长江大桥的桥头堡区域风力强劲，强风每隔几秒就会吹来。你需要掌握风的节奏，在风停时跳跃，或利用风力跳得更远！',
        campaignMapData: {
          startPosition: { x: 100, y: 550 },
          width: 3400,
          height: 700,
          
          // 【核心玩法：强风力系统】地面强推，跳跃减弱85%
          windZones: [
            {
              x: 400, y: 0, width: 350, height: 700,
              windForce: 800,        // 强风力（跳跃时减弱到15%）
              direction: 'right',
              interval: 1000,
              duration: 500,
              warningTime: 0
            },
            {
              x: 900, y: 0, width: 450, height: 700,
              windForce: 800,        // 强风力
              direction: 'left',
              interval: 1100,
              duration: 500,
              warningTime: 0
            },
            {
              x: 1800, y: 0, width: 500, height: 700,
              windForce: 1000,       // 更强风力
              direction: 'right',
              interval: 1200,
              duration: 500,
              warningTime: 0
            },
            {
              x: 2400, y: 0, width: 600, height: 700,
              windForce: 1000,       // 更强风力
              direction: 'left',
              interval: 1300,
              duration: 500,
              warningTime: 0
            }
          ],
          platforms: [
            // 地面（桥面）
            { x: 0, y: 650, width: 3400, height: 20, type: 'ground' },
            
            // 【第一区：起点区】安全区域，学习基础跳跃
            { x: 100, y: 580, width: 150, height: 20 },
            { x: 280, y: 530, width: 100, height: 20 },
            { x: 350, y: 480, width: 80, height: 20 },
            
            // 【第二区：风区1】向右风，需要逆风跳跃或利用风力
            // 平台间距较大，需要利用风力跳得更远
            { x: 480, y: 450, width: 80, height: 20 },
            { x: 600, y: 400, width: 80, height: 20 },
            { x: 720, y: 350, width: 80, height: 20 },  // 最高点，需要风力辅助
            
            // 【第三区：安全区】休息平台
            { x: 820, y: 500, width: 120, height: 20 },
            
            // 【第四区：风区2】向左风，需要控制跳跃方向
            // 平台间距适中，但风会推回来
            { x: 980, y: 450, width: 80, height: 20 },
            { x: 1100, y: 400, width: 80, height: 20 },
            { x: 1220, y: 350, width: 80, height: 20 },
            { x: 1340, y: 400, width: 80, height: 20 },  // 下降
            
            // 【第五区：桥塔区】垂直挑战，无风
            { x: 1450, y: 550, width: 120, height: 20 },
            { x: 1480, y: 470, width: 80, height: 20 },
            { x: 1510, y: 390, width: 60, height: 20 },
            { x: 1540, y: 310, width: 50, height: 20 },
            
            // 【第六区：第二个风区组合】
            { x: 1620, y: 450, width: 150, height: 20 },
            { x: 1800, y: 500, width: 100, height: 20 },
            { x: 1950, y: 450, width: 80, height: 20 },
            { x: 2100, y: 400, width: 80, height: 20 },
            { x: 2250, y: 350, width: 80, height: 20 },
            
            // 【第七区：最后冲刺】
            { x: 2400, y: 500, width: 120, height: 20 },
            { x: 2550, y: 450, width: 100, height: 20 },
            { x: 2700, y: 400, width: 100, height: 20 },
            { x: 2850, y: 450, width: 100, height: 20 },
            { x: 3000, y: 500, width: 120, height: 20 },
            
            // 【第八区：终点】
            { x: 3200, y: 450, width: 200, height: 20 },
            
            // 【隐藏平台】挑战奖励
            { x: 660, y: 280, width: 60, height: 20 },  // 风区1最高点
            { x: 1160, y: 270, width: 60, height: 20 },  // 风区2最高点
            { x: 2150, y: 250, width: 60, height: 20 }  // 第二组风区最高点
          ],
          enemies: [
            // 起点区守卫
            { x: 280, y: 510, type: 'slime' },
            { x: 350, y: 460, type: 'slime' },
            
            // 风区1巡逻者（在风中飞行）
            { x: 480, y: 430, type: 'bat' },
            { x: 600, y: 380, type: 'bat' },
            { x: 720, y: 330, type: 'bat' },
            
            // 安全区守卫
            { x: 820, y: 480, type: 'robot' },
            
            // 风区2巡逻者
            { x: 980, y: 430, type: 'bat' },
            { x: 1100, y: 380, type: 'bat' },
            { x: 1220, y: 330, type: 'bat' },
            
            // 桥塔守护者
            { x: 1450, y: 530, type: 'robot' },
            { x: 1480, y: 450, type: 'bat' },
            { x: 1510, y: 370, type: 'robot' },
            
            // 第二组风区守卫
            { x: 1800, y: 480, type: 'slime' },
            { x: 1950, y: 430, type: 'bat' },
            { x: 2100, y: 380, type: 'bat' },
            { x: 2250, y: 330, type: 'bat' },
            
            // 最后冲刺区守卫
            { x: 2400, y: 480, type: 'robot' },
            { x: 2550, y: 430, type: 'bat' },
            { x: 2700, y: 380, type: 'robot' },
            { x: 2850, y: 430, type: 'bat' },
            { x: 3000, y: 480, type: 'robot' },
            
            // 终点守卫
            { x: 3200, y: 430, type: 'robot' },
            { x: 3300, y: 430, type: 'robot' }
          ],
          collectibles: [
            // 起点区引导
            { x: 100, y: 550, type: 'coin', value: 5 },
            { x: 280, y: 500, type: 'coin', value: 5 },
            { x: 350, y: 450, type: 'coin', value: 5 },
            
            // 风区1奖励（需要利用风力）
            { x: 480, y: 420, type: 'coin', value: 5 },
            { x: 600, y: 370, type: 'gem', value: 20 },
            { x: 720, y: 320, type: 'gem', value: 20 },
            
            // 安全区
            { x: 820, y: 470, type: 'coin', value: 10 },
            
            // 风区2奖励（需要控制方向）
            { x: 980, y: 420, type: 'coin', value: 5 },
            { x: 1100, y: 370, type: 'gem', value: 20 },
            { x: 1220, y: 320, type: 'gem', value: 20 },
            { x: 1340, y: 370, type: 'gem', value: 20 },
            
            // 桥塔奖励
            { x: 1450, y: 520, type: 'coin', value: 10 },
            { x: 1480, y: 440, type: 'gem', value: 30 },
            { x: 1510, y: 360, type: 'gem', value: 30 },
            { x: 1540, y: 280, type: 'gem', value: 30 },
            
            // 第二组风区奖励
            { x: 1800, y: 470, type: 'coin', value: 10 },
            { x: 1950, y: 420, type: 'gem', value: 20 },
            { x: 2100, y: 370, type: 'gem', value: 30 },
            { x: 2250, y: 320, type: 'gem', value: 30 },
            
            // 最后冲刺奖励
            { x: 2400, y: 470, type: 'coin', value: 15 },
            { x: 2550, y: 420, type: 'gem', value: 30 },
            { x: 2700, y: 370, type: 'gem', value: 40 },
            { x: 2850, y: 420, type: 'gem', value: 40 },
            { x: 3000, y: 470, type: 'gem', value: 50 },
            
            // 终点奖励
            { x: 3200, y: 420, type: 'gem', value: 100 },
            { x: 3300, y: 420, type: 'key', value: 200 },
            
            // 隐藏奖励（最高点）
            { x: 660, y: 250, type: 'key', value: 100 },  // 风区1最高点
            { x: 1160, y: 240, type: 'key', value: 100 },  // 风区2最高点
            { x: 2150, y: 220, type: 'key', value: 150 }  // 第二组风区最高点
          ],
          goal: { x: 3250, y: 420 }
        },
        objectives: [
          {
            type: 'reach',
            target: 'goal',
            description: '到达终点'
          }
        ],
        questions: [
          {
            id: 'q6_1_1',
            type: 'choice',
            question: '【强风试炼】风速20m/s，风压是多少帕斯卡？（提示：风压=0.5×密度×速度²，空气密度1.2kg/m³）',
            options: ['120帕', '240帕', '360帕', '480帕'],
            answer: '240帕',
            difficulty: 3,
            subject: 'math',
            explanation: '风压 = 0.5 × 1.2 × 20² = 0.5 × 1.2 × 400 = 240帕！你掌握了风的力量！'
          },
          {
            id: 'q6_1_2',
            type: 'choice',
            question: '【桥梁知识】长江大桥主要承受哪些力？',
            options: ['拉力和压力', '只有压力', '只有拉力', '扭力和剪力'],
            answer: '拉力和压力',
            difficulty: 2,
            subject: 'general',
            explanation: '桥梁的缆索承受拉力，桥墩承受压力！工程学的智慧！'
          },
          {
            id: 'q6_1_3',
            type: 'choice',
            question: '【趣味问答】如果风把你的帽子吹走了，你应该？',
            options: ['追着风跑', '等风停再捡', '用代码召回帽子', '让帽子自己飞回来'],
            answer: '等风停再捡',
            difficulty: 1,
            subject: 'general',
            explanation: '聪明！等风停是最安全的选择！就像在游戏中等风停再跳跃一样！'
          }
        ],
        rewards: { xp: 200, coins: 100 }
      },
      {
        id: 'level_6_2',
        name: '风暴追逐',
        description: '追逐者 + 强风 + 崩塌平台 - 极限逃生',
        story: '桥面上出现了神秘的追击者！强风呼啸，平台随时崩塌，你必须快速奔跑，利用风力和跳跃技巧逃离追捕！',
        campaignMapData: {
          startPosition: { x: 100, y: 1800 },
          width: 7200,  // 3倍（2400 → 7200）
          height: 2100, // 3倍（700 → 2100）
          
          // 【追逐者配置】
          chaser: {
            startX: -200,
            startY: 1800,
            speed: 150,  // 追逐速度
            damage: 20,  // 接触伤害
            warningDistance: 300  // 警告距离
          },
          
          // 【风区配置】强风力（跳跃时减弱85%）
          windZones: [
            // 第一组风区：向右推（辅助风区）
            { x: 800, y: 0, width: 600, height: 2100, windForce: 1200, direction: 'right' },
            
            // 第二组风区：向左推（逆风）
            { x: 2000, y: 0, width: 900, height: 2100, windForce: 1500, direction: 'left' },
            
            // 第三组风区：向左推
            { x: 3400, y: 0, width: 1000, height: 2100, windForce: 1800, direction: 'left' },
            
            // 第四组风区：向左推
            { x: 4800, y: 0, width: 1000, height: 2100, windForce: 2000, direction: 'left' },
            
            // 第五组风区：向左推（最强）
            { x: 6000, y: 0, width: 1000, height: 2100, windForce: 2200, direction: 'left' }
          ],
          platforms: [
            // 【起点平台】玩家出生点（唯一的地面平台）
            { x: 100, y: 1900, width: 120, height: 20, type: 'ground' },
            
            // 【第一区：起跳平台】0-700
            { x: 300, y: 1850, width: 100, height: 20 },
            { x: 500, y: 1800, width: 100, height: 20 },
            { x: 700, y: 1750, width: 80, height: 20 },
            
            // 【第二区：风区1（向右辅助）】800-1400 - 只有移动平台（窄平台）
            { x: 900, y: 1700, width: 70, height: 20, type: 'moving', movePath: [{x: 900, y: 1700}, {x: 900, y: 1400}], moveSpeed: 60 },
            { x: 1200, y: 1600, width: 70, height: 20, type: 'moving', movePath: [{x: 1200, y: 1600}, {x: 1200, y: 1300}], moveSpeed: 65 },
            
            // 【第三区：过渡区】1500-1900
            { x: 1600, y: 1800, width: 100, height: 20 },
            { x: 1850, y: 1750, width: 80, height: 20 },
            
            // 【第四区：风区2（强逆风）】2000-2900 - 只有移动平台（窄平台）
            { x: 2100, y: 1700, width: 65, height: 20, type: 'moving', movePath: [{x: 2100, y: 1700}, {x: 2100, y: 1400}], moveSpeed: 50 },
            { x: 2400, y: 1650, width: 65, height: 20, type: 'moving', movePath: [{x: 2400, y: 1650}, {x: 2400, y: 1350}], moveSpeed: 50 },
            { x: 2700, y: 1700, width: 65, height: 20, type: 'moving', movePath: [{x: 2700, y: 1700}, {x: 2700, y: 1400}], moveSpeed: 55 },
            
            // 【第五区：过渡区】3000-3300
            { x: 3100, y: 1800, width: 90, height: 20 },
            
            // 【第六区：风区3（更强逆风）】3400-4400 - 只有移动平台（窄平台）
            { x: 3500, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 3500, y: 1700}, {x: 3500, y: 1350}], moveSpeed: 45 },
            { x: 3850, y: 1650, width: 60, height: 20, type: 'moving', movePath: [{x: 3850, y: 1650}, {x: 3850, y: 1300}], moveSpeed: 45 },
            { x: 4200, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 4200, y: 1700}, {x: 4200, y: 1350}], moveSpeed: 50 },
            
            // 【第七区：过渡区】4500-4700
            { x: 4600, y: 1800, width: 80, height: 20 },
            
            // 【第八区：风区4（极强逆风）】4800-5800 - 只有移动平台（窄平台）
            { x: 4900, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 4900, y: 1700}, {x: 4900, y: 1300}], moveSpeed: 40 },
            { x: 5250, y: 1650, width: 60, height: 20, type: 'moving', movePath: [{x: 5250, y: 1650}, {x: 5250, y: 1250}], moveSpeed: 40 },
            { x: 5600, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 5600, y: 1700}, {x: 5600, y: 1300}], moveSpeed: 45 },
            
            // 【第九区：风区5（最强逆风）】6000-7000 - 只有移动平台（窄平台）
            { x: 6100, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 6100, y: 1700}, {x: 6100, y: 1250}], moveSpeed: 40 },
            { x: 6450, y: 1650, width: 60, height: 20, type: 'moving', movePath: [{x: 6450, y: 1650}, {x: 6450, y: 1200}], moveSpeed: 40 },
            { x: 6800, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 6800, y: 1700}, {x: 6800, y: 1250}], moveSpeed: 45 },
            
            // 【第十区：终点】7000-7200
            { x: 7050, y: 1750, width: 150, height: 20 }
          ],
          enemies: [
            // 第一区：起点守卫
            { x: 300, y: 1730, type: 'slime' },
            { x: 500, y: 1630, type: 'slime' },
            
            // 第二区：风区1 - 大量敌人 + 炮塔
            { x: 900, y: 1780, type: 'turret' },      // 炮塔1：固定位置，全域攻击
            { x: 1000, y: 1680, type: 'bat' },
            { x: 1150, y: 1600, type: 'bat' },
            { x: 1300, y: 1480, type: 'bat' },
            { x: 1450, y: 1550, type: 'robot' },
            { x: 1600, y: 1580, type: 'bat' },
            { x: 1750, y: 1680, type: 'robot' },
            { x: 1850, y: 1900, type: 'turret' },     // 炮塔2
            
            // 第三区：安全区守卫
            { x: 2000, y: 1780, type: 'robot' },
            { x: 2250, y: 1680, type: 'slime' },
            
            // 第四区：风区2（逆风） - 更多敌人 + 炮塔
            { x: 2600, y: 1900, type: 'turret' },     // 炮塔3
            { x: 2700, y: 1630, type: 'bat' },
            { x: 2850, y: 1550, type: 'bat' },
            { x: 3000, y: 1450, type: 'robot' },
            { x: 3150, y: 1380, type: 'bat' },
            { x: 3300, y: 1530, type: 'robot' },
            { x: 3450, y: 1630, type: 'bat' },
            { x: 3600, y: 1650, type: 'bat' },
            { x: 3750, y: 1900, type: 'turret' },     // 炮塔4
            
            // 第五区：高台守卫
            { x: 4000, y: 1780, type: 'robot' },
            { x: 4100, y: 1630, type: 'robot' },
            { x: 4300, y: 1480, type: 'bat' },
            
            // 第六区：交叉风区 - 极限挑战 + 炮塔
            { x: 4450, y: 1900, type: 'turret' },     // 炮塔5
            { x: 4550, y: 1380, type: 'bat' },
            { x: 4650, y: 1280, type: 'robot' },
            { x: 4750, y: 1200, type: 'bat' },
            { x: 4550, y: 1680, type: 'bat' },
            { x: 4650, y: 1580, type: 'robot' },
            { x: 4750, y: 1480, type: 'bat' },
            { x: 4850, y: 1900, type: 'turret' },     // 炮塔6
            
            // 第七区：快速通道 + 炮塔
            { x: 5100, y: 1780, type: 'robot' },
            { x: 5250, y: 1680, type: 'bat' },
            { x: 5400, y: 1900, type: 'turret' },     // 炮塔7
            { x: 5500, y: 1580, type: 'robot' },
            
            // 第八区：最后冲刺 - 密集敌人 + 炮塔
            { x: 5900, y: 1900, type: 'turret' },     // 炮塔8
            { x: 6000, y: 1680, type: 'bat' },
            { x: 6150, y: 1630, type: 'robot' },
            { x: 6300, y: 1500, type: 'bat' },
            { x: 6450, y: 1480, type: 'robot' },
            { x: 6600, y: 1580, type: 'bat' },
            { x: 6750, y: 1900, type: 'turret' },     // 炮塔9
            { x: 6850, y: 1680, type: 'robot' },
            
            // 终点守卫
            { x: 7000, y: 1630, type: 'robot' },
            { x: 7100, y: 1630, type: 'robot' }
          ],
          collectibles: [
            // 起点引导
            { x: 100, y: 1820, type: 'coin', value: 5 },
            { x: 300, y: 1720, type: 'coin', value: 5 },
            { x: 500, y: 1620, type: 'coin', value: 5 },
            
            // 风区1奖励
            { x: 1000, y: 1670, type: 'gem', value: 20 },
            { x: 1400, y: 1470, type: 'gem', value: 30 },
            { x: 1800, y: 1670, type: 'gem', value: 20 },
            
            // 安全区奖励
            { x: 2000, y: 1770, type: 'coin', value: 10 },
            { x: 2250, y: 1670, type: 'gem', value: 30 },
            
            // 风区2奖励
            { x: 2700, y: 1620, type: 'gem', value: 20 },
            { x: 3100, y: 1420, type: 'gem', value: 40 },
            { x: 3500, y: 1620, type: 'gem', value: 30 },
            
            // 高台奖励
            { x: 4100, y: 1620, type: 'gem', value: 40 },
            { x: 4300, y: 1470, type: 'gem', value: 50 },
            
            // 交叉风区奖励
            { x: 4650, y: 1270, type: 'key', value: 100 },
            { x: 4650, y: 1570, type: 'key', value: 100 },
            
            // 快速通道奖励
            { x: 5200, y: 1670, type: 'gem', value: 30 },
            { x: 5400, y: 1570, type: 'gem', value: 40 },
            
            // 最后冲刺奖励
            { x: 6000, y: 1670, type: 'gem', value: 50 },
            { x: 6400, y: 1470, type: 'gem', value: 60 },
            { x: 6800, y: 1670, type: 'gem', value: 50 },
            
            // 终点奖励
            { x: 7000, y: 1620, type: 'key', value: 200 }
          ],
          goal: { x: 7100, y: 1620 }
        },
        objectives: [
          {
            type: 'reach',
            target: 'goal',
            description: '逃离追逐者，到达终点'
          },
          {
            type: 'survive',
            description: '不被追逐者抓住'
          }
        ],
        questions: [
          {
            id: 'q6_2_1',
            type: 'choice',
            question: '【崩塌平台】平台承重极限是100kg，你60kg，背包20kg，还能拿多少kg物品？',
            options: ['10kg', '20kg', '30kg', '40kg'],
            answer: '20kg',
            difficulty: 2,
            subject: 'math',
            explanation: '100 - 60 - 20 = 20kg！超重平台会崩塌！'
          },
          {
            id: 'q6_2_2',
            type: 'choice',
            question: '【追逐策略】在追逐战中，最重要的是什么？',
            options: ['保持速度向前', '收集所有道具', '击败所有敌人', '原地等待'],
            answer: '保持速度向前',
            difficulty: 2,
            subject: 'logic',
            explanation: '追逐战的核心是速度！停下来就会被追上！'
          },
          {
            id: 'q6_2_3',
            type: 'choice',
            question: '【风力利用】如何利用风力逃离追逐者？',
            options: ['顺风加速', '逆风减速', '无视风力', '等风停'],
            answer: '顺风加速',
            difficulty: 2,
            subject: 'general',
            explanation: '聪明！利用顺风可以跑得更快，逃离追逐者！'
          }
        ],
        rewards: { xp: 300, coins: 150 }
      },
      {
        id: 'level_6_3',
        name: '风暴深渊',
        description: '追逐者 + 炮塔 + 极限风力 - 终极逃生',
        story: '追逐者加快了速度！炮塔的追踪弹从四面八方袭来！风力更加狂暴！这是最后的考验，你必须用尽全力才能逃出生天！',
        campaignMapData: {
          startPosition: { x: 100, y: 1800 },
          width: 8000,  // 比6-2更大（7200 → 8000）
          height: 2100,
          
          // 【追逐者配置】速度更快！
          chaser: {
            startX: -200,
            startY: 1800,
            speed: 180,  // 比6-2更快（150 → 180）
            damage: 25,  // 伤害更高（20 → 25）
            warningDistance: 350  // 警告距离更远
          },
          
          // 【风区配置】强风力（跳跃时减弱85%）
          windZones: [
            // 第一组：向右辅助
            { x: 800, y: 0, width: 500, height: 2100, windForce: 1300, direction: 'right' },
            
            // 第二组：向左阻力
            { x: 1800, y: 0, width: 800, height: 2100, windForce: 1600, direction: 'left' },
            
            // 第三组：向左阻力
            { x: 3000, y: 0, width: 900, height: 2100, windForce: 1900, direction: 'left' },
            
            // 第四组：向左阻力
            { x: 4300, y: 0, width: 1000, height: 2100, windForce: 2100, direction: 'left' },
            
            // 第五组：向左阻力
            { x: 5700, y: 0, width: 1000, height: 2100, windForce: 2300, direction: 'left' },
            
            // 第六组：向左阻力
            { x: 7000, y: 0, width: 800, height: 2100, windForce: 2400, direction: 'left' }
          ],
          platforms: [
            // 【起点平台】唯一的地面
            { x: 100, y: 1900, width: 100, height: 20, type: 'ground' },
            
            // 【第一区：起跳区】0-700
            { x: 250, y: 1850, width: 80, height: 20 },
            { x: 450, y: 1800, width: 80, height: 20 },
            { x: 650, y: 1750, width: 70, height: 20 },
            
            // 【第二区：风区1（向右辅助）】800-1300 - 移动平台
            { x: 850, y: 1700, width: 60, height: 20, type: 'moving', movePath: [{x: 850, y: 1700}, {x: 850, y: 1350}], moveSpeed: 70 },
            { x: 1100, y: 1650, width: 60, height: 20, type: 'moving', movePath: [{x: 1100, y: 1650}, {x: 1100, y: 1300}], moveSpeed: 75 },
            
            // 【第三区：过渡区】1400-1700
            { x: 1500, y: 1800, width: 80, height: 20 },
            
            // 【第四区：风区2（强逆风）】1800-2600 - 移动平台
            { x: 1900, y: 1700, width: 55, height: 20, type: 'moving', movePath: [{x: 1900, y: 1700}, {x: 1900, y: 1350}], moveSpeed: 55 },
            { x: 2150, y: 1650, width: 55, height: 20, type: 'moving', movePath: [{x: 2150, y: 1650}, {x: 2150, y: 1300}], moveSpeed: 55 },
            { x: 2400, y: 1700, width: 55, height: 20, type: 'moving', movePath: [{x: 2400, y: 1700}, {x: 2400, y: 1350}], moveSpeed: 60 },
            
            // 【第五区：过渡区】2700-2900
            { x: 2800, y: 1800, width: 70, height: 20 },
            
            // 【第六区：风区3（更强逆风）】3000-3900 - 移动平台
            { x: 3100, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 3100, y: 1700}, {x: 3100, y: 1300}], moveSpeed: 50 },
            { x: 3400, y: 1650, width: 50, height: 20, type: 'moving', movePath: [{x: 3400, y: 1650}, {x: 3400, y: 1250}], moveSpeed: 50 },
            { x: 3700, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 3700, y: 1700}, {x: 3700, y: 1300}], moveSpeed: 55 },
            
            // 【第七区：过渡区】4000-4200
            { x: 4100, y: 1800, width: 70, height: 20 },
            
            // 【第八区：风区4（极强逆风）】4300-5300 - 移动平台
            { x: 4400, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 4400, y: 1700}, {x: 4400, y: 1250}], moveSpeed: 45 },
            { x: 4750, y: 1650, width: 50, height: 20, type: 'moving', movePath: [{x: 4750, y: 1650}, {x: 4750, y: 1200}], moveSpeed: 45 },
            { x: 5100, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 5100, y: 1700}, {x: 5100, y: 1250}], moveSpeed: 50 },
            
            // 【第九区：过渡区】5400-5600
            { x: 5500, y: 1800, width: 70, height: 20 },
            
            // 【第十区：风区5（最强逆风）】5700-6700 - 移动平台
            { x: 5800, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 5800, y: 1700}, {x: 5800, y: 1200}], moveSpeed: 40 },
            { x: 6150, y: 1650, width: 50, height: 20, type: 'moving', movePath: [{x: 6150, y: 1650}, {x: 6150, y: 1150}], moveSpeed: 40 },
            { x: 6500, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 6500, y: 1700}, {x: 6500, y: 1200}], moveSpeed: 45 },
            
            // 【第十一区：风区6（终极逆风）】7000-7800 - 移动平台
            { x: 7100, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 7100, y: 1700}, {x: 7100, y: 1150}], moveSpeed: 40 },
            { x: 7400, y: 1650, width: 50, height: 20, type: 'moving', movePath: [{x: 7400, y: 1650}, {x: 7400, y: 1100}], moveSpeed: 40 },
            { x: 7700, y: 1700, width: 50, height: 20, type: 'moving', movePath: [{x: 7700, y: 1700}, {x: 7700, y: 1150}], moveSpeed: 45 },
            
            // 【第十二区：终点】7900-8000
            { x: 7900, y: 1750, width: 100, height: 20 }
          ],
          enemies: [
            // 第一区：起点守卫
            { x: 250, y: 1730, type: 'slime' },
            { x: 450, y: 1680, type: 'slime' },
            
            // 第二区：风区1 - 炮塔 + 敌人
            { x: 900, y: 1780, type: 'turret' },
            { x: 1000, y: 1680, type: 'bat' },
            { x: 1200, y: 1600, type: 'bat' },
            
            // 第四区：风区2 - 炮塔 + 敌人
            { x: 1950, y: 1780, type: 'turret' },
            { x: 2100, y: 1680, type: 'bat' },
            { x: 2300, y: 1650, type: 'robot' },
            { x: 2500, y: 1680, type: 'bat' },
            
            // 第六区：风区3 - 炮塔 + 敌人
            { x: 3150, y: 1780, type: 'turret' },
            { x: 3300, y: 1680, type: 'bat' },
            { x: 3500, y: 1650, type: 'robot' },
            { x: 3700, y: 1680, type: 'bat' },
            { x: 3850, y: 1780, type: 'turret' },
            
            // 第八区：风区4 - 炮塔 + 敌人
            { x: 4450, y: 1780, type: 'turret' },
            { x: 4600, y: 1680, type: 'bat' },
            { x: 4850, y: 1650, type: 'robot' },
            { x: 5050, y: 1680, type: 'bat' },
            { x: 5250, y: 1780, type: 'turret' },
            
            // 第十区：风区5 - 炮塔 + 敌人
            { x: 5850, y: 1780, type: 'turret' },
            { x: 6000, y: 1680, type: 'bat' },
            { x: 6200, y: 1650, type: 'robot' },
            { x: 6450, y: 1680, type: 'bat' },
            { x: 6650, y: 1780, type: 'turret' },
            
            // 第十一区：风区6 - 炮塔 + 敌人（最强）
            { x: 7150, y: 1780, type: 'turret' },
            { x: 7300, y: 1680, type: 'bat' },
            { x: 7450, y: 1650, type: 'robot' },
            { x: 7650, y: 1680, type: 'bat' },
            { x: 7750, y: 1780, type: 'turret' }
          ],
          collectibles: [
            // 起点区金币
            { x: 250, y: 1820, type: 'coin' },
            { x: 450, y: 1770, type: 'coin' },
            
            // 风区内宝石（高难度收集）
            { x: 1100, y: 1500, type: 'gem' },
            { x: 2400, y: 1450, type: 'gem' },
            { x: 3700, y: 1450, type: 'gem' },
            { x: 5100, y: 1400, type: 'gem' },
            { x: 6500, y: 1400, type: 'gem' },
            { x: 7700, y: 1350, type: 'gem' }
          ],
          goal: { x: 7950, y: 1720 }
        },
        objectives: [
          { type: 'reach', description: '逃离风暴深渊' }
        ],
        questions: [
          {
            id: 'q6_3_1',
            type: 'choice',
            question: '【追踪弹逃避】炮塔的追踪弹如何躲避？',
            options: ['直线跑', '之字型移动', '停下来', '向后跑'],
            answer: '之字型移动',
            difficulty: 2,
            subject: 'general',
            explanation: '之字型移动可以让追踪弹不断调整方向，最终耗尽时间！'
          },
          {
            id: 'q6_3_2',
            type: 'choice',
            question: '【极限风力】如何在2400风力的逆风中前进？',
            options: ['持续跳跃', '贴地前进', '等风停', '向后跑'],
            answer: '持续跳跃',
            difficulty: 3,
            subject: 'general',
            explanation: '持续跳跃可以减少在地面受风力影响的时间，利用空中的微弱推力前进！'
          },
          {
            id: 'q6_3_3',
            type: 'choice',
            question: '【追逐者对抗】追逐者速度180，如何逃脱？',
            options: ['利用顺风加速', '躲在平台下', '攻击追逐者', '停下来'],
            answer: '利用顺风加速',
            difficulty: 2,
            subject: 'general',
            explanation: '唯一的向右风区是你的救命稻草！利用顺风可以暂时拉开距离！'
          }
        ],
        rewards: { xp: 400, coins: 200 }
      },
      {
        id: 'level_6_4',
        name: '螺旋上升',
        description: '垂直攀登 + 旋转风场 + 双追逐者 - 极限挑战',
        story: '风暴在桥塔内形成了螺旋上升的气流！两个追逐者从上下夹击！炮塔的追踪弹在狭窄空间中无处可躲！你必须向上攀登2000米才能逃出生天！',
        campaignMapData: {
          startPosition: { x: 400, y: 1950 },
          width: 900,   // 窄地图（横向压缩）
          height: 2100, // 高地图（垂直攀登）
          
          // 【双追逐者配置】上下夹击！
          chasers: [
            {
              startX: 400,
              startY: 2100,  // 从下方追
              speed: 150,
              damage: 20,
              warningDistance: 300
            },
            {
              startX: 400,
              startY: -100,  // 从上方追（向下移动）
              speed: 80,     // 较慢，给玩家喘息空间
              damage: 30,
              warningDistance: 400,
              moveDown: true // 标记为向下移动的追逐者
            }
          ],
          
          // 【螺旋风场】强风力（跳跃时减弱85%）
          windZones: [
            // 起点区（1900-2100）：无风区，安全起跳
            
            // 第1层：向右风
            { x: 0, y: 1700, width: 900, height: 200, windForce: 1200, direction: 'right' },
            
            // 第2层：向左风
            { x: 0, y: 1400, width: 900, height: 300, windForce: 1500, direction: 'left' },
            
            // 第3层：向右风
            { x: 0, y: 1100, width: 900, height: 300, windForce: 1800, direction: 'right' },
            
            // 第4层：向左风
            { x: 0, y: 800, width: 900, height: 300, windForce: 2000, direction: 'left' },
            
            // 第5层：向右风
            { x: 0, y: 500, width: 900, height: 300, windForce: 2200, direction: 'right' },
            
            // 第6层：向左风
            { x: 0, y: 200, width: 900, height: 300, windForce: 2400, direction: 'left' },
            
            // 第7层：向上风
            { x: 0, y: 0, width: 900, height: 200, windForce: 1500, direction: 'up' }
          ],
          
          platforms: [
            // 【起点平台】
            { x: 350, y: 2000, width: 100, height: 20, type: 'ground' },
            
            // 【第1层：向右风区】1800-2100（起跳）
            { x: 200, y: 1950, width: 80, height: 20 },
            { x: 100, y: 1900, width: 70, height: 20 },
            { x: 250, y: 1850, width: 70, height: 20 },
            
            // 【第2层：向左风区】1500-1800（移动平台）
            { x: 700, y: 1750, width: 60, height: 20, type: 'moving', movePath: [{x: 700, y: 1750}, {x: 200, y: 1750}], moveSpeed: 50 },
            { x: 150, y: 1650, width: 60, height: 20 },
            { x: 650, y: 1600, width: 60, height: 20, type: 'moving', movePath: [{x: 650, y: 1600}, {x: 150, y: 1600}], moveSpeed: 55 },
            
            // 【第3层：向右风区】1200-1500（移动平台）
            { x: 200, y: 1450, width: 60, height: 20, type: 'moving', movePath: [{x: 200, y: 1450}, {x: 700, y: 1450}], moveSpeed: 50 },
            { x: 750, y: 1350, width: 60, height: 20 },
            { x: 250, y: 1300, width: 60, height: 20, type: 'moving', movePath: [{x: 250, y: 1300}, {x: 750, y: 1300}], moveSpeed: 55 },
            
            // 【第4层：向左风区】900-1200（移动平台）
            { x: 700, y: 1150, width: 60, height: 20, type: 'moving', movePath: [{x: 700, y: 1150}, {x: 200, y: 1150}], moveSpeed: 50 },
            { x: 150, y: 1050, width: 60, height: 20 },
            { x: 650, y: 1000, width: 60, height: 20, type: 'moving', movePath: [{x: 650, y: 1000}, {x: 150, y: 1000}], moveSpeed: 55 },
            
            // 【第5层：向右风区】600-900（移动平台）
            { x: 200, y: 850, width: 60, height: 20, type: 'moving', movePath: [{x: 200, y: 850}, {x: 700, y: 850}], moveSpeed: 45 },
            { x: 750, y: 750, width: 60, height: 20 },
            { x: 250, y: 700, width: 60, height: 20, type: 'moving', movePath: [{x: 250, y: 700}, {x: 750, y: 700}], moveSpeed: 50 },
            
            // 【第6层：向左风区】300-600（移动平台）
            { x: 700, y: 550, width: 60, height: 20, type: 'moving', movePath: [{x: 700, y: 550}, {x: 200, y: 550}], moveSpeed: 45 },
            { x: 150, y: 450, width: 60, height: 20 },
            { x: 650, y: 400, width: 60, height: 20, type: 'moving', movePath: [{x: 650, y: 400}, {x: 150, y: 400}], moveSpeed: 50 },
            
            // 【第7层：向上风区】0-300（终点冲刺）
            { x: 400, y: 250, width: 80, height: 20 },
            { x: 300, y: 150, width: 80, height: 20 },
            { x: 450, y: 100, width: 100, height: 20 }
          ],
          enemies: [
            // 第1层敌人
            { x: 200, y: 1930, type: 'slime' },
            { x: 250, y: 1830, type: 'slime' },
            
            // 第2层敌人 + 炮塔
            { x: 400, y: 1730, type: 'turret' },
            { x: 150, y: 1630, type: 'bat' },
            { x: 500, y: 1580, type: 'bat' },
            
            // 第3层敌人 + 炮塔
            { x: 450, y: 1430, type: 'turret' },
            { x: 750, y: 1330, type: 'robot' },
            { x: 250, y: 1280, type: 'bat' },
            
            // 第4层敌人 + 炮塔
            { x: 400, y: 1130, type: 'turret' },
            { x: 150, y: 1030, type: 'bat' },
            { x: 500, y: 980, type: 'robot' },
            
            // 第5层敌人 + 炮塔
            { x: 450, y: 830, type: 'turret' },
            { x: 750, y: 730, type: 'bat' },
            { x: 250, y: 680, type: 'robot' },
            
            // 第6层敌人 + 炮塔
            { x: 400, y: 530, type: 'turret' },
            { x: 150, y: 430, type: 'bat' },
            { x: 500, y: 380, type: 'robot' },
            
            // 第7层敌人（终点）
            { x: 400, y: 230, type: 'turret' },
            { x: 300, y: 130, type: 'bat' },
            { x: 450, y: 80, type: 'bat' }
          ],
          collectibles: [
            // 起点金币
            { x: 200, y: 1920, type: 'coin' },
            
            // 各层宝石（高难度收集）
            { x: 450, y: 1750, type: 'gem' },
            { x: 450, y: 1450, type: 'gem' },
            { x: 450, y: 1150, type: 'gem' },
            { x: 450, y: 850, type: 'gem' },
            { x: 450, y: 550, type: 'gem' },
            { x: 450, y: 250, type: 'gem' }
          ],
          goal: { x: 450, y: 70 }
        },
        objectives: [
          { type: 'reach', description: '向上攀登2000米逃出桥塔' }
        ],
        questions: [
          {
            id: 'q6_4_1',
            type: 'choice',
            question: '【螺旋风场】如何利用旋转风场向上攀登？',
            options: ['顺风跳跃', '逆风跳跃', '等风停', '向下跳'],
            answer: '顺风跳跃',
            difficulty: 2,
            subject: 'general',
            explanation: '利用顺风可以跳得更远，逆风时要小心被吹回！'
          },
          {
            id: 'q6_4_2',
            type: 'choice',
            question: '【双追逐者】上下夹击时如何逃脱？',
            options: ['快速向上', '停在中间', '向下跑', '左右躲避'],
            answer: '快速向上',
            difficulty: 3,
            subject: 'general',
            explanation: '下方追逐者速度更快，必须快速向上才能逃脱夹击！'
          },
          {
            id: 'q6_4_3',
            type: 'choice',
            question: '【狭窄空间】在900px宽的空间中如何躲避炮塔？',
            options: ['利用移动平台', '站着不动', '跳到边缘', '攻击炮塔'],
            answer: '利用移动平台',
            difficulty: 2,
            subject: 'general',
            explanation: '移动平台可以帮你躲避追踪弹，同时向上攀登！'
          }
        ],
        rewards: { xp: 500, coins: 250 }
      },
      {
        id: 'level_6_5',
        name: '终极对决：桥塔守护者',
        description: 'Boss + 风力 + 炮塔 + 移动平台 - 终极挑战！',
        story: '桥塔顶部，终极Boss「桥塔守护者」在等待你！它控制着狂暴的风场，发射无数追踪弹，召唤小怪攻击你！你必须在移动平台上跳跃，躲避攻击，击败Boss才能通关！',
        campaignMapData: {
          startPosition: { x: 800, y: 2650 },
          width: 1600,  // 🔥 扩大地图宽度（原1000→1600）
          height: 2800, // 🔥 扩大地图高度（原2100→2800）
          
          // 🔥 风力系统（螺旋风场，适配新地图）
          windZones: [
            // 第1层：向右风
            { x: 0, y: 2300, width: 1600, height: 300, windForce: 800, direction: 'right' },
            // 第2层：向左风
            { x: 0, y: 1800, width: 1600, height: 400, windForce: 1000, direction: 'left' },
            // 第3层：向右风
            { x: 0, y: 1200, width: 1600, height: 500, windForce: 1200, direction: 'right' },
            // 第4层：向左风（Boss区）
            { x: 0, y: 400, width: 1600, height: 700, windForce: 1500, direction: 'left' }
          ],
          
          platforms: [
            // 【起点平台】宽大安全
            { x: 600, y: 2700, width: 400, height: 20, type: 'ground' },
            
            // 【第1层】（2400-2550）
            { x: 200, y: 2550, width: 200, height: 20 },
            { x: 1200, y: 2550, width: 200, height: 20 },
            { x: 600, y: 2400, width: 200, height: 20 },
            
            // 【第2层】（2100-2250）
            { x: 300, y: 2250, width: 180, height: 20 },
            { x: 1100, y: 2250, width: 180, height: 20 },
            { x: 700, y: 2100, width: 200, height: 20 },
            
            // 【第3层】（1800-1950）
            { x: 200, y: 1950, width: 200, height: 20 },
            { x: 1200, y: 1950, width: 200, height: 20 },
            { x: 650, y: 1800, width: 200, height: 20 },
            
            // 【第4层】（1500-1650）
            { x: 300, y: 1650, width: 180, height: 20 },
            { x: 1100, y: 1650, width: 180, height: 20 },
            { x: 700, y: 1500, width: 200, height: 20 },
            
            // 【第5层】（1200-1350）过渡到Boss区
            { x: 200, y: 1350, width: 200, height: 20 },
            { x: 1200, y: 1350, width: 200, height: 20 },
            { x: 650, y: 1200, width: 200, height: 20 },
            
            // 【Boss战斗区】（600-1000）宽敞空间
            { x: 150, y: 1000, width: 250, height: 20 },
            { x: 1200, y: 1000, width: 250, height: 20 },
            { x: 650, y: 800, width: 300, height: 20 },  // 中央大平台
            { x: 300, y: 600, width: 200, height: 20 },
            { x: 1100, y: 600, width: 200, height: 20 },
            { x: 650, y: 400, width: 300, height: 20 },  // Boss平台
            { x: 650, y: 200, width: 300, height: 20 }   // 终点平台
          ],
          enemies: [
            // 【炮塔守卫】分布在各层
            { x: 300, y: 2530, type: 'turret' },
            { x: 1300, y: 2530, type: 'turret' },
            { x: 800, y: 2080, type: 'turret' },
            { x: 750, y: 1480, type: 'turret' },
            
            // 【普通敌人】
            { x: 400, y: 2530, type: 'bat' },
            { x: 1200, y: 2230, type: 'bat' },
            { x: 400, y: 1930, type: 'robot' },
            { x: 1200, y: 1330, type: 'bat' },
            
            // 【Boss】在宽敞区域活动
            { x: 800, y: 380, type: 'boss' }  // 终极Boss
          ],
          collectibles: [
            // 起点金币
            { x: 800, y: 2670, type: 'coin' },
            
            // 各层宝石
            { x: 700, y: 2380, type: 'gem' },
            { x: 800, y: 2080, type: 'gem' },
            { x: 750, y: 1780, type: 'gem' },
            { x: 800, y: 1480, type: 'gem' },
            { x: 800, y: 780, type: 'gem' }
          ],
          goal: { x: 800, y: 150 }  // 终点在Boss区上方
        },
        bossConfig: {
          visualTheme: 'default',
          type: 'hybrid',
          hp: 8,  // Boss总血量8点
          phases: [
            {
              hp: 8,
              attacks: ['charge', 'projectile'],  // 第1阶段：冲锋+投射
              attackInterval: 2400,
              moveSpeed: 90
            },
            {
              hp: 6,
              attacks: ['charge', 'projectile', 'dash'],  // 第2阶段：增加冲刺
              attackInterval: 2100,
              moveSpeed: 105
            },
            {
              hp: 4,
              attacks: ['charge', 'projectile', 'dash', 'aoe'],  // 第3阶段：范围攻击
              attackInterval: 1900,
              moveSpeed: 120,
              summonMinions: true  // 开始召唤小怪
            },
            {
              hp: 2,
              attacks: ['charge', 'projectile', 'dash', 'aoe', 'jump'],  // 第4阶段：跳跃+狂暴
              attackInterval: 1600,
              moveSpeed: 140,
              summonMinions: true
            }
          ],
          weakPoint: { x: 0, y: -30, width: 40, height: 20 },  // 头顶弱点
          defeatCondition: 'hybrid',
          questionsRequired: 3
        },
        questions: [
          {
            id: 'q6_5_1',
            type: 'choice',
            question: '【趣味问答】如果风暴之眼和钢铁巨塔打架，谁会赢？',
            options: ['风暴之眼（会飞）', '钢铁巨塔（火力强）', '打成平手', '玩家渔翁得利'],
            answer: '玩家渔翁得利',
            difficulty: 1,
            subject: 'general',
            explanation: '哈哈！让他们互相打，我们坐收渔翁之利！'
          },
          {
            id: 'q6_5_2',
            type: 'code',
            question: '写一个函数判断玩家是否在风区内：function inWindZone(x, y, zone) { ... }',
            answer: 'function inWindZone(x, y, zone) { return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height; }',
            difficulty: 2,
            subject: 'programming',
            explanation: '判断点是否在矩形区域内，需要检查x和y坐标是否都在范围内！'
          },
          {
            id: 'q6_5_3',
            type: 'choice',
            question: '【Boss战策略】面对双Boss时最重要的是？',
            options: ['先击败一个', '保持移动', '利用风力', '以上都是'],
            answer: '以上都是',
            difficulty: 2,
            subject: 'general',
            explanation: '双Boss战需要综合运用所有技巧：集中火力、保持移动、利用风力！'
          }
        ],
        rewards: { xp: 600, coins: 300, skills: ['windControl', 'shield'] }
      }
    ],
    unlockRequirement: 'campaign_5',
    rewards: { xp: 1200, coins: 600, title: '风暴征服者' }
  }
  
  // 战役7-10已移至 campaigns-advanced.ts
];

// 🔥 合并所有战役（战役1-10）
export const allCampaigns = [...campaigns, ...advancedCampaigns];

// 获取所有战役（包含高级战役7-10）
export function getAllCampaigns(): Campaign[] {
  return allCampaigns;
}

// 根据ID获取战役
export function getCampaignById(id: string): Campaign | undefined {
  return allCampaigns.find(campaign => campaign.id === id);
}

// 获取已解锁的战役
export function getUnlockedCampaigns(completedCampaigns: string[]): Campaign[] {
  return allCampaigns.filter((campaign) => (
    !campaign.unlockRequirement || completedCampaigns.includes(campaign.unlockRequirement)
  ));
}
