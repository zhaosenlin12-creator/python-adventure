/**
 * PVP 评分计算模块
 * Requirements: 5.1, 5.3, 5.4
 */

import { 
    RoundScores, 
    TotalScoreResult, 
    SCORE_WEIGHTS,
    BattleRoundResult,
    QuizRoundResult,
    CodingRoundResult,
} from '../types/pvp';

// ==================== 第一轮：对战评分 ====================

/**
 * 计算对战轮分数
 * 基于剩余 HP 百分比和造成伤害
 */
export function calculateBattleScore(
    hp: number,
    maxHp: number,
    damageDealt: number,
    isWinner: boolean
): number {
    const hpPercentage = hp / maxHp;
    const hpScore = hpPercentage * 50; // HP 占 50 分
    const damageScore = Math.min(damageDealt / 2, 30); // 伤害占最多 30 分
    const winBonus = isWinner ? 20 : 0; // 胜利奖励 20 分
    
    return Math.round(hpScore + damageScore + winBonus);
}

/**
 * 处理对战轮结果
 */
export function processBattleRound(result: BattleRoundResult): { player1: number; player2: number } {
    const player1Score = calculateBattleScore(
        result.player1HP,
        100,
        result.damageDealt.player1,
        result.winnerId === 'player1' || (result.winnerId === null && result.player1HP > result.player2HP)
    );
    
    const player2Score = calculateBattleScore(
        result.player2HP,
        100,
        result.damageDealt.player2,
        result.winnerId === 'player2' || (result.winnerId === null && result.player2HP > result.player1HP)
    );
    
    return { player1: player1Score, player2: player2Score };
}

// ==================== 第二轮：答题评分 ====================

/**
 * 计算答题轮分数
 * 基于正确数量和平均用时
 */
export function calculateQuizScore(
    correctCount: number,
    totalQuestions: number,
    avgTimeMs: number
): number {
    const correctScore = (correctCount / totalQuestions) * 70; // 正确率占 70 分
    
    // 速度奖励：平均用时越短，奖励越高（最多 30 分）
    const maxTimeMs = 30000; // 30 秒为基准
    const speedBonus = Math.max(0, (1 - avgTimeMs / maxTimeMs)) * 30;
    
    return Math.round(correctScore + speedBonus);
}

/**
 * 处理答题轮结果
 */
export function processQuizRound(result: QuizRoundResult): { player1: number; player2: number } {
    const player1Score = calculateQuizScore(result.player1Correct, 10, result.player1AvgTime);
    const player2Score = calculateQuizScore(result.player2Correct, 10, result.player2AvgTime);
    
    return { player1: player1Score, player2: player2Score };
}

// ==================== 第三轮：编程评分 ====================

/**
 * 计算编程轮分数
 * 基于完成状态、用时和代码效率
 */
export function calculateCodingScore(
    completed: boolean,
    timeUsedMs: number,
    timeLimitMs: number,
    codeLength: number
): number {
    if (!completed) {
        // 未完成：根据用时给部分分
        return Math.round((1 - timeUsedMs / timeLimitMs) * 20);
    }
    
    // 完成奖励 50 分
    const completionScore = 50;
    
    // 速度奖励：用时越短，奖励越高（最多 30 分）
    const speedBonus = Math.max(0, (1 - timeUsedMs / timeLimitMs)) * 30;
    
    // 代码效率奖励：代码越短，奖励越高（最多 20 分）
    const maxCodeLength = 200;
    const efficiencyBonus = Math.max(0, (1 - codeLength / maxCodeLength)) * 20;
    
    return Math.round(completionScore + speedBonus + efficiencyBonus);
}

/**
 * 处理编程轮结果
 */
export function processCodingRound(
    result: CodingRoundResult,
    timeLimitMs: number = 300000
): { player1: number; player2: number } {
    const player1Score = calculateCodingScore(
        result.player1Completed,
        result.player1Time,
        timeLimitMs,
        100 // 默认代码长度
    );
    
    const player2Score = calculateCodingScore(
        result.player2Completed,
        result.player2Time,
        timeLimitMs,
        100
    );
    
    return { player1: player1Score, player2: player2Score };
}

// ==================== 总分计算 ====================

/**
 * 计算总分
 * 权重: 对战 30%, 答题 30%, 编程 40%
 */
export function calculateTotalScore(roundScores: RoundScores): TotalScoreResult {
    const battle = roundScores.battle || { player1: 0, player2: 0 };
    const quiz = roundScores.quiz || { player1: 0, player2: 0 };
    const coding = roundScores.coding || { player1: 0, player2: 0 };
    
    const player1Total = 
        battle.player1 * SCORE_WEIGHTS.battle +
        quiz.player1 * SCORE_WEIGHTS.quiz +
        coding.player1 * SCORE_WEIGHTS.coding;
    
    const player2Total = 
        battle.player2 * SCORE_WEIGHTS.battle +
        quiz.player2 * SCORE_WEIGHTS.quiz +
        coding.player2 * SCORE_WEIGHTS.coding;
    
    let winnerId: string | null = null;
    if (player1Total > player2Total) {
        winnerId = 'player1';
    } else if (player2Total > player1Total) {
        winnerId = 'player2';
    }
    // 相等则为平局，winnerId 保持 null
    
    return {
        player1Total: Math.round(player1Total * 100) / 100,
        player2Total: Math.round(player2Total * 100) / 100,
        winnerId,
        breakdown: {
            battle: { ...battle, weight: SCORE_WEIGHTS.battle },
            quiz: { ...quiz, weight: SCORE_WEIGHTS.quiz },
            coding: { ...coding, weight: SCORE_WEIGHTS.coding },
        },
    };
}

/**
 * 计算奖励
 */
export function calculateRewards(
    isWinner: boolean,
    totalScore: number
): { xp: number; coins: number } {
    const baseXp = 50;
    const baseCoins = 20;
    
    const scoreMultiplier = totalScore / 100;
    const winMultiplier = isWinner ? 2 : 1;
    
    return {
        xp: Math.round(baseXp * scoreMultiplier * winMultiplier),
        coins: Math.round(baseCoins * scoreMultiplier * winMultiplier),
    };
}
