/**
 * 题库主索引
 * 按年龄段组织的题库系统
 */

import { AgeGroup } from '@/types/ageGroup';
import { Question, QUESTION_BANK_CONFIG } from './types';

// 导入各年龄段题库
import * as primaryLower from './primary-lower';
import * as primaryUpper from './primary-upper';
import * as juniorHigh from './junior-high';

// 题库映射
const questionBanks = {
  'primary-lower': primaryLower,
  'primary-upper': primaryUpper,
  'junior-high': juniorHigh,
};

/**
 * 获取指定年龄段的所有题目
 */
export function getAllQuestions(ageGroup: AgeGroup): Question[] {
  return questionBanks[ageGroup].allQuestions;
}

/**
 * 获取指定年龄段和学科的题目
 */
export function getQuestionsBySubject(ageGroup: AgeGroup, subject: string): Question[] {
  return questionBanks[ageGroup].getQuestionsBySubject(subject);
}

/**
 * 随机获取指定年龄段的题目
 */
export function getRandomQuestions(ageGroup: AgeGroup, count: number): Question[] {
  return questionBanks[ageGroup].getRandomQuestions(count);
}

/**
 * 获取指定年龄段的题库统计
 */
export function getStats(ageGroup: AgeGroup) {
  return questionBanks[ageGroup].stats;
}

/**
 * 获取题库配置
 */
export function getQuestionBankConfig(ageGroup: AgeGroup) {
  return QUESTION_BANK_CONFIG[ageGroup];
}

/**
 * 为关卡生成题目
 * @param ageGroup 年龄段
 * @param levelId 关卡ID
 * @param count 题目数量
 * @param difficulty 难度偏好 (1-3)
 */
export function generateQuestionsForLevel(
  ageGroup: AgeGroup,
  levelId: string,
  count: number = 5,
  difficulty?: number
): Question[] {
  const allQuestions = getAllQuestions(ageGroup);
  
  // 根据难度筛选
  let filtered = allQuestions;
  if (difficulty) {
    filtered = allQuestions.filter(q => q.difficulty <= difficulty);
  }
  
  // 随机打乱并选取
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 打乱选项顺序并更新正确答案
 * @param question 原始题目
 */
function shuffleOptions(question: Question): Question {
  if (!question.options || question.options.length === 0) {
    return question;
  }
  
  // 找到正确答案的内容
  const correctAnswer = question.answer;
  const correctContent = Array.isArray(correctAnswer) 
    ? correctAnswer[0] 
    : correctAnswer;
  
  // 创建选项和索引的映射
  const optionsWithIndex = question.options.map((opt, idx) => ({
    content: opt,
    originalIndex: idx,
    isCorrect: opt === correctContent || String.fromCharCode(65 + idx) === correctContent
  }));
  
  // 打乱选项
  const shuffled = [...optionsWithIndex].sort(() => Math.random() - 0.5);
  
  // 找到正确答案的新位置
  const newCorrectIndex = shuffled.findIndex(opt => opt.isCorrect);
  const newAnswer = newCorrectIndex >= 0 
    ? shuffled[newCorrectIndex].content  // 使用选项内容作为答案
    : correctContent;
  
  return {
    ...question,
    options: shuffled.map(opt => opt.content),
    answer: newAnswer
  };
}

/**
 * 按学科比例生成题目
 * @param ageGroup 年龄段
 * @param count 总题目数量
 */
export function generateBalancedQuestions(ageGroup: AgeGroup, count: number): Question[] {
  const config = QUESTION_BANK_CONFIG[ageGroup];
  const total = config.totalQuestions;
  const result: Question[] = [];
  
  // 按比例从各学科抽取
  const subjects = ['programming', 'math', 'chinese', 'english', 'science', 'fun'] as const;
  
  for (const subject of subjects) {
    const subjectCount = Math.round((config.distribution[subject] / total) * count);
    const subjectQuestions = getQuestionsBySubject(ageGroup, subject);
    const shuffled = [...subjectQuestions].sort(() => Math.random() - 0.5);
    result.push(...shuffled.slice(0, subjectCount));
  }
  
  // 打乱最终结果，并打乱每道题的选项
  return result
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(q => shuffleOptions(q));
}

// 导出类型
export type { Question } from './types';
export { QUESTION_BANK_CONFIG } from './types';
