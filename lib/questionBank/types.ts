/**
 * 题库类型定义
 */

import { AgeGroup } from '@/types/ageGroup';

// 题目类型
export type QuestionType = 'choice' | 'fill' | 'code';

// 学科类型
export type Subject = 
  | 'programming'  // 编程
  | 'math'         // 数学
  | 'chinese'      // 语文
  | 'english'      // 英语
  | 'science'      // 科学/物理/化学
  | 'fun';         // 趣味/搞笑

// 难度等级
export type Difficulty = 1 | 2 | 3;  // 1=简单, 2=中等, 3=困难

// 题目结构
export interface Question {
  id: string;
  type: QuestionType;
  subject: Subject;
  difficulty: Difficulty;
  question: string;
  options?: string[];
  answer: string | string[];
  explanation?: string;
  tags?: string[];
}

// 题库配置
export interface QuestionBankConfig {
  ageGroup: AgeGroup;
  totalQuestions: number;
  distribution: {
    programming: number;
    math: number;
    chinese: number;
    english: number;
    science: number;
    fun: number;
  };
}

// 各年龄段题库配置
export const QUESTION_BANK_CONFIG: Record<AgeGroup, QuestionBankConfig> = {
  'primary-lower': {
    ageGroup: 'primary-lower',
    totalQuestions: 200,
    distribution: {
      programming: 60,
      math: 50,
      chinese: 30,
      english: 30,
      science: 20,
      fun: 10,
    },
  },
  'primary-upper': {
    ageGroup: 'primary-upper',
    totalQuestions: 200,
    distribution: {
      programming: 60,
      math: 50,
      chinese: 30,
      english: 30,
      science: 20,
      fun: 10,
    },
  },
  'junior-high': {
    ageGroup: 'junior-high',
    totalQuestions: 200,
    distribution: {
      programming: 60,
      math: 50,
      chinese: 20,
      english: 30,
      science: 30,  // 物理+化学
      fun: 10,
    },
  },
};
