/**
 * PVP AI 配置和行为
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { Difficulty, AIOpponent, PlayerState } from '../types/pvp';

// ==================== AI 配置类型 ====================

export interface AIConfig {
    difficulty: Difficulty;
    reactionTime: number;      // 反应时间 (ms)
    accuracy: number;          // 准确率 (0-1)
    aggressiveness: number;    // 攻击性 (0-1)
    quizCorrectRate: number;   // 答题正确率 (0-1)
    codingSpeed: number;       // 编程速度倍率
    moveSpeed: number;         // 移动速度倍率
    jumpProbability: number;   // 跳跃概率 (0-1)
    attackRange: number;       // 攻击范围
    dodgeProbability: number;  // 躲避概率 (0-1)
}

export interface AIDecision {
    action: 'move_left' | 'move_right' | 'jump' | 'attack' | 'dodge' | 'idle';
    duration: number; // 动作持续时间 (ms)
}

// ==================== AI 难度配置 ====================

export const AI_CONFIGS: Record<Difficulty, AIConfig> = {
    easy: {
        difficulty: 'easy',
        reactionTime: 800,       // 极慢反应 (原600ms)
        accuracy: 0.30,          // 30% 准确率 (原50%)
        aggressiveness: 0.15,    // 极低攻击性 (原25%)
        quizCorrectRate: 0.20,   // 20% 答题正确率 (原40%)
        codingSpeed: 0.4,        // 极慢编程速度 (原0.6)
        moveSpeed: 0.60,         // 极慢移动 (原0.75)
        jumpProbability: 0.15,   // 极低跳跃概率 (原25%)
        attackRange: 50,         // 极短攻击范围 (原55)
        dodgeProbability: 0.10,  // 极低躲避概率 (原15%)
    },
    medium: {
        difficulty: 'medium',
        reactionTime: 400,       // 中等反应（原200ms）
        accuracy: 0.65,          // 65% 准确率（原85%）
        aggressiveness: 0.45,    // 中等攻击性（原70%）
        quizCorrectRate: 0.60,   // 60% 答题正确率（原80%）
        codingSpeed: 0.85,       // 中等编程速度（原1.2）
        moveSpeed: 0.9,          // 中等移动（原1.1）
        jumpProbability: 0.40,   // 中等跳跃概率（原60%）
        attackRange: 70,         // 中等攻击范围（原90）
        dodgeProbability: 0.35,  // 中等躲避概率（原55%）
    },
    hard: {
        difficulty: 'hard',
        reactionTime: 100,       // 极快反应（原150）
        accuracy: 0.95,          // 95% 准确率（原90%）
        aggressiveness: 0.85,    // 极高攻击性（原70%）
        quizCorrectRate: 0.92,   // 92% 答题正确率（原85%）
        codingSpeed: 1.6,        // 极快编程速度（原1.3）
        moveSpeed: 1.3,          // 极快移动（原1.2）
        jumpProbability: 0.75,   // 极高跳跃概率（原70%）
        attackRange: 110,        // 极长攻击范围（原100）
        dodgeProbability: 0.75,  // 极高躲避概率（原60%）
    },
};

// ==================== AI 名称和头像 ====================

const AI_NAMES: Record<Difficulty, string[]> = {
    easy: ['小白机器人', '新手助手', '练习伙伴'],
    medium: ['中级挑战者', '平衡战士', '稳健对手'],
    hard: ['终极AI', '代码大师', '无敌机器人'],
};

const AI_AVATARS: Record<Difficulty, string[]> = {
    easy: ['🤖', '🎮', '🎯'],
    medium: ['⚔️', '🛡️', '🎖️'],
    hard: ['👾', '🔥', '💀'],
};


// ==================== AI 工厂函数 ====================

/**
 * 获取 AI 配置
 */
export function getAIConfig(difficulty: Difficulty): AIConfig {
    return AI_CONFIGS[difficulty];
}

/**
 * 创建 AI 对手
 */
export function createAIOpponent(difficulty: Difficulty): AIOpponent {
    const names = AI_NAMES[difficulty];
    const avatars = AI_AVATARS[difficulty];

    const nameIndex = Math.floor(Math.random() * names.length);
    const avatarIndex = Math.floor(Math.random() * avatars.length);

    return {
        type: 'ai',
        id: `ai_${difficulty}_${Date.now()}`,
        difficulty,
        name: names[nameIndex],
        avatar: avatars[avatarIndex],
    };
}

/**
 * 验证 AI 配置是否符合难度要求
 */
export function isValidAIConfig(config: AIConfig): boolean {
    // 检查基本范围
    if (config.reactionTime < 0) return false;
    if (config.accuracy < 0 || config.accuracy > 1) return false;
    if (config.aggressiveness < 0 || config.aggressiveness > 1) return false;
    if (config.quizCorrectRate < 0 || config.quizCorrectRate > 1) return false;
    if (config.codingSpeed <= 0) return false;
    if (config.moveSpeed <= 0) return false;
    if (config.jumpProbability < 0 || config.jumpProbability > 1) return false;
    if (config.attackRange <= 0) return false;
    if (config.dodgeProbability < 0 || config.dodgeProbability > 1) return false;

    return true;
}

/**
 * 验证难度递进关系
 * Easy < Medium < Hard
 */
export function validateDifficultyProgression(): boolean {
    const easy = AI_CONFIGS.easy;
    const medium = AI_CONFIGS.medium;
    const hard = AI_CONFIGS.hard;

    // 反应时间应该递减 (越难越快)
    if (!(easy.reactionTime > medium.reactionTime && medium.reactionTime > hard.reactionTime)) {
        return false;
    }

    // 准确率应该递增
    if (!(easy.accuracy < medium.accuracy && medium.accuracy < hard.accuracy)) {
        return false;
    }

    // 攻击性应该递增
    if (!(easy.aggressiveness < medium.aggressiveness && medium.aggressiveness < hard.aggressiveness)) {
        return false;
    }

    // 答题正确率应该递增
    if (!(easy.quizCorrectRate < medium.quizCorrectRate && medium.quizCorrectRate < hard.quizCorrectRate)) {
        return false;
    }

    // 编程速度应该递增
    if (!(easy.codingSpeed < medium.codingSpeed && medium.codingSpeed < hard.codingSpeed)) {
        return false;
    }

    return true;
}

// ==================== AI 决策函数 ====================

/**
 * 计算与目标的距离
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * AI 决策：第一轮对战
 * 根据当前状态和对手位置做出决策
 */
export function makeBattleDecision(
    aiState: PlayerState,
    opponentState: PlayerState,
    config: AIConfig
): AIDecision {
    const distance = calculateDistance(aiState.x, aiState.y, opponentState.x, opponentState.y);
    const isOpponentOnRight = opponentState.x > aiState.x;

    // 随机因素（模拟人类不确定性）
    const randomFactor = Math.random();

    // 如果在攻击范围内且随机值小于攻击性，则攻击
    if (distance <= config.attackRange && randomFactor < config.aggressiveness) {
        return {
            action: 'attack',
            duration: 300,
        };
    }

    // 如果对手正在攻击且随机值小于躲避概率，则躲避
    if (opponentState.isAttacking && randomFactor < config.dodgeProbability) {
        return {
            action: 'dodge',
            duration: 200,
        };
    }

    // 如果距离较远，向对手移动
    if (distance > config.attackRange * 1.5) {
        // 随机跳跃
        if (randomFactor < config.jumpProbability) {
            return {
                action: 'jump',
                duration: 400,
            };
        }

        return {
            action: isOpponentOnRight ? 'move_right' : 'move_left',
            duration: 200,
        };
    }

    // 默认：保持距离或随机移动
    if (randomFactor < 0.3) {
        return {
            action: 'idle',
            duration: 100,
        };
    }

    return {
        action: isOpponentOnRight ? 'move_right' : 'move_left',
        duration: 150,
    };
}

/**
 * AI 决策：第二轮答题
 * 返回是否答对和用时
 */
export function makeQuizDecision(
    config: AIConfig,
    questionDifficulty: 'easy' | 'medium' | 'hard'
): { isCorrect: boolean; timeUsed: number } {
    // 根据题目难度调整正确率
    let adjustedCorrectRate = config.quizCorrectRate;
    if (questionDifficulty === 'hard') {
        adjustedCorrectRate *= 0.8; // 难题降低正确率
    } else if (questionDifficulty === 'easy') {
        adjustedCorrectRate = Math.min(1, adjustedCorrectRate * 1.1); // 简单题提高正确率
    }

    const isCorrect = Math.random() < adjustedCorrectRate;

    // 计算用时（反应时间 + 随机波动）
    const baseTime = config.reactionTime * 10; // 基础思考时间
    const randomVariation = Math.random() * 2000; // 0-2秒随机波动
    const timeUsed = baseTime + randomVariation;

    return { isCorrect, timeUsed };
}

/**
 * AI 决策：第三轮编程
 * 返回是否完成、用时和代码长度
 */
export function makeCodingDecision(
    config: AIConfig,
    taskDifficulty: 'easy' | 'medium' | 'hard',
    timeLimit: number
): { completed: boolean; timeUsed: number; codeLength: number } {
    // 根据任务难度调整完成概率
    let completionProbability = config.accuracy;
    if (taskDifficulty === 'hard') {
        completionProbability *= 0.7;
    } else if (taskDifficulty === 'easy') {
        completionProbability = Math.min(1, completionProbability * 1.2);
    }

    const completed = Math.random() < completionProbability;

    // 计算用时
    const baseTime = timeLimit * 0.5; // 基础时间为限时的一半
    const speedFactor = 1 / config.codingSpeed; // 速度越快，时间越短
    const randomVariation = Math.random() * timeLimit * 0.3; // 30% 随机波动
    let timeUsed = baseTime * speedFactor + randomVariation;

    // 如果未完成，用时为限时
    if (!completed) {
        timeUsed = timeLimit;
    } else {
        timeUsed = Math.min(timeUsed, timeLimit * 0.9); // 完成时最多用 90% 时间
    }

    // 代码长度（简单模拟）
    const baseCodeLength = 50;
    const codeLength = Math.floor(baseCodeLength + Math.random() * 100);

    return { completed, timeUsed, codeLength };
}

// ==================== 常量导出 ====================

export const DIFFICULTY_LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
