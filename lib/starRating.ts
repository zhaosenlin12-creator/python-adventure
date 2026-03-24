/**
 * 星级评价计算系统
 */

import { LevelResult } from '@/types/campaign';

// 生产环境禁用调试日志
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

/**
 * 计算关卡星级
 * @param result 关卡结果数据
 * @returns 星级（1-3）
 */
export function calculateStars(result: LevelResult): number {
    // 基础1星：完成关卡
    let stars = 1;
    
    // 计算各项指标完成度
    const questionsPercent = result.questionsTotal > 0 
        ? result.questionsCorrect / result.questionsTotal 
        : 1;
    
    const itemsPercent = result.itemsTotal > 0 
        ? result.itemsCollected / result.itemsTotal 
        : 1;
    
    const hpPercent = result.hpTotal > 0 
        ? result.hpRemaining / result.hpTotal 
        : 1;
    
    const enemiesPercent = result.enemiesTotal > 0 
        ? result.enemiesDefeated / result.enemiesTotal 
        : 1;
    
    // 第2星条件：满足以下任意2个条件
    const conditions = [
        questionsPercent === 1,      // 答题全对
        itemsPercent >= 0.8,         // 收集80%以上
        hpPercent >= 0.5,            // HP保持50%以上
        enemiesPercent === 1         // 击败所有敌人
    ];
    
    const metConditions = conditions.filter(c => c).length;
    
    if (metConditions >= 2) {
        stars = 2;
    }
    
    // 第3星条件：满足以下所有条件
    if (
        questionsPercent === 1 &&    // 答题全对
        itemsPercent === 1 &&        // 收集所有物品
        hpPercent === 1 &&           // 满血通关
        enemiesPercent === 1         // 击败所有敌人
    ) {
        stars = 3;
    }
    
    debugLog('[StarRating] 星级计算:', {
        questionsPercent,
        itemsPercent,
        hpPercent,
        enemiesPercent,
        metConditions,
        stars
    });
    
    return stars;
}

/**
 * 计算关卡总分
 * @param result 关卡结果数据
 * @param stars 星级
 * @returns 总分
 */
export function calculateScore(result: LevelResult, stars: number): number {
    let score = 0;
    
    // 基础分数
    score += result.questionsCorrect * 100;  // 每题100分
    score += result.itemsCollected * 10;     // 每个物品10分
    score += result.enemiesDefeated * 50;    // 每个敌人50分
    
    // 时间奖励（假设目标时间为300秒）
    const targetTime = 300;
    if (result.timeUsed < targetTime) {
        const timeBonus = Math.floor((targetTime - result.timeUsed) * 2);
        score += timeBonus;
    }
    
    // HP奖励
    const hpPercent = result.hpTotal > 0 ? result.hpRemaining / result.hpTotal : 0;
    score += Math.floor(hpPercent * 200);
    
    // 星级倍率
    const starMultiplier = [1, 1.5, 2][stars - 1] || 1;
    score = Math.floor(score * starMultiplier);
    
    return score;
}

/**
 * 获取星级评语
 * @param stars 星级
 * @returns 评语
 */
export function getStarComment(stars: number): string {
    switch (stars) {
        case 3:
            return '🎉 完美通关！你是真正的大师！';
        case 2:
            return '👍 表现优秀！继续加油！';
        case 1:
            return '✓ 通关成功！还有提升空间！';
        default:
            return '继续努力！';
    }
}

/**
 * 获取星级颜色
 * @param stars 星级
 * @returns CSS颜色类
 */
export function getStarColor(stars: number): string {
    switch (stars) {
        case 3:
            return 'text-yellow-400';
        case 2:
            return 'text-blue-400';
        case 1:
            return 'text-gray-400';
        default:
            return 'text-gray-600';
    }
}

/**
 * 检查是否达到完美通关
 * @param result 关卡结果数据
 * @returns 是否完美通关
 */
export function isPerfectClear(result: LevelResult): boolean {
    return (
        result.questionsCorrect === result.questionsTotal &&
        result.itemsCollected === result.itemsTotal &&
        result.hpRemaining === result.hpTotal &&
        result.enemiesDefeated === result.enemiesTotal
    );
}

/**
 * 获取改进建议
 * @param result 关卡结果数据
 * @returns 改进建议数组
 */
export function getImprovementSuggestions(result: LevelResult): string[] {
    const suggestions: string[] = [];
    
    const questionsPercent = result.questionsTotal > 0 
        ? result.questionsCorrect / result.questionsTotal 
        : 1;
    
    const itemsPercent = result.itemsTotal > 0 
        ? result.itemsCollected / result.itemsTotal 
        : 1;
    
    const hpPercent = result.hpTotal > 0 
        ? result.hpRemaining / result.hpTotal 
        : 1;
    
    const enemiesPercent = result.enemiesTotal > 0 
        ? result.enemiesDefeated / result.enemiesTotal 
        : 1;
    
    if (questionsPercent < 1) {
        suggestions.push('💡 多复习题目，提高答题正确率');
    }
    
    if (itemsPercent < 0.8) {
        suggestions.push('💡 注意收集地图上的所有物品');
    }
    
    if (hpPercent < 0.5) {
        suggestions.push('💡 小心躲避敌人，减少受伤');
    }
    
    if (enemiesPercent < 1) {
        suggestions.push('💡 尝试击败所有敌人获得更高分数');
    }
    
    if (suggestions.length === 0) {
        suggestions.push('🎉 你已经做得很完美了！');
    }
    
    return suggestions;
}
