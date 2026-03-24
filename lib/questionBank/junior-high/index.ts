/**
 * 初中组题库索引
 * 总计：300道题
 */

import { Question } from '../types';
import { programmingQuestions } from './programming';
import { mathQuestions } from './math';
import { chineseQuestions } from './chinese';
import { englishQuestions } from './english';
import { scienceQuestions } from './science';
import { funQuestions } from './fun';

// 导出所有题目
export const allQuestions: Question[] = [
  ...programmingQuestions,
  ...mathQuestions,
  ...chineseQuestions,
  ...englishQuestions,
  ...scienceQuestions,
  ...funQuestions,
];

// 按学科导出
export {
  programmingQuestions,
  mathQuestions,
  chineseQuestions,
  englishQuestions,
  scienceQuestions,
  funQuestions,
};

// 获取指定学科的题目
export function getQuestionsBySubject(subject: string): Question[] {
  return allQuestions.filter(q => q.subject === subject);
}

// 随机获取指定数量的题目
export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 题库统计（初中组科学包含物理+化学）
export const stats = {
  total: 300,
  programming: 90,
  math: 75,
  chinese: 45,
  english: 45,
  science: 30,  // 物理+化学
  fun: 15,
};
