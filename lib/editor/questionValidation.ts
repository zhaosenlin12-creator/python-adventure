/**
 * 题目验证逻辑
 * Requirements: 8.3, 8.4, 8.5
 * 
 * 验证规则:
 * - 所有题目类型都需要题目文本和答案
 * - 选择题需要2-4个选项，且选项内容不能为空
 * - 选择题答案必须是有效的选项 (A, B, C, D)
 */

import { CustomQuestion, QuestionType } from "@/types/editor";

// ==================== 类型定义 ====================

/** 题目验证结果 */
export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
}

/** 部分题目数据 (用于验证) */
export type PartialQuestion = Partial<CustomQuestion>;

// ==================== 常量 ====================

/** 选择题选项数量限制 */
export const CHOICE_OPTIONS_LIMITS = {
  min: 2,
  max: 4,
} as const;

/** 有效的选择题答案 */
export const VALID_CHOICE_ANSWERS = ["A", "B", "C", "D"] as const;

// ==================== 验证函数 ====================

/**
 * 验证题目文本是否有效
 * @param questionText 题目文本
 * @returns 是否有效
 */
export function isValidQuestionText(questionText: string | undefined): boolean {
  return typeof questionText === "string" && questionText.trim().length > 0;
}

/**
 * 验证答案是否有效 (非空)
 * @param answer 答案
 * @returns 是否有效
 */
export function isValidAnswer(answer: string | string[] | undefined): boolean {
  if (!answer) return false;
  
  if (Array.isArray(answer)) {
    return answer.length > 0 && answer.some(a => a.trim().length > 0);
  }
  
  return typeof answer === "string" && answer.trim().length > 0;
}

/**
 * 验证选择题选项数量是否有效 (2-4个)
 * @param count 选项数量
 * @returns 是否有效
 */
export function isValidChoiceOptionsCount(count: number): boolean {
  return count >= CHOICE_OPTIONS_LIMITS.min && count <= CHOICE_OPTIONS_LIMITS.max;
}

/**
 * 验证选择题选项内容是否有效 (不为空)
 * @param options 选项数组
 * @returns 是否有效
 */
export function areValidChoiceOptions(options: string[] | undefined): boolean {
  if (!options || !Array.isArray(options)) return false;
  if (!isValidChoiceOptionsCount(options.length)) return false;
  
  // 所有选项都不能为空
  return options.every(opt => typeof opt === "string" && opt.trim().length > 0);
}

/**
 * 验证选择题答案是否在有效选项范围内
 * @param answer 答案
 * @param optionsCount 选项数量
 * @returns 是否有效
 */
export function isValidChoiceAnswer(answer: string | undefined, optionsCount: number): boolean {
  if (!answer || typeof answer !== "string") return false;
  
  const validAnswers = VALID_CHOICE_ANSWERS.slice(0, optionsCount);
  return validAnswers.includes(answer as typeof VALID_CHOICE_ANSWERS[number]);
}

/**
 * 验证题目数据是否完整有效
 * Requirements: 8.3, 8.4, 8.5
 * 
 * @param question 题目数据
 * @returns 验证结果
 */
export function validateQuestion(question: PartialQuestion): QuestionValidationResult {
  const errors: string[] = [];

  // 验证题目文本 (所有类型都需要)
  if (!isValidQuestionText(question.question)) {
    errors.push("请输入题目内容");
  }

  // 验证答案 (所有类型都需要)
  if (!isValidAnswer(question.answer)) {
    errors.push("请设置正确答案");
  }

  // 选择题特定验证
  if (question.type === "choice") {
    const options = question.options;
    
    // 验证选项数量 (2-4个)
    if (!options || options.length < CHOICE_OPTIONS_LIMITS.min) {
      errors.push(`选择题至少需要${CHOICE_OPTIONS_LIMITS.min}个选项`);
    } else if (options.length > CHOICE_OPTIONS_LIMITS.max) {
      errors.push(`选择题最多${CHOICE_OPTIONS_LIMITS.max}个选项`);
    } else {
      // 验证选项内容不为空
      const hasEmptyOptions = options.some(opt => !opt || opt.trim() === "");
      if (hasEmptyOptions) {
        errors.push("选项内容不能为空");
      }
      
      // 验证答案是否在选项中
      if (question.answer && typeof question.answer === "string") {
        if (!isValidChoiceAnswer(question.answer, options.length)) {
          errors.push("正确答案必须是有效的选项");
        }
      }
    }
  }

  // 填空题特定验证
  if (question.type === "fill") {
    if (question.answer && typeof question.answer === "string" && question.answer.trim() === "") {
      errors.push("填空题答案不能为空");
    }
  }

  // 数学题特定验证
  if (question.type === "math") {
    if (question.answer && typeof question.answer === "string" && question.answer.trim() === "") {
      errors.push("数学题答案不能为空");
    }
  }

  // 逻辑题特定验证
  if (question.type === "logic") {
    if (question.answer && typeof question.answer === "string" && question.answer.trim() === "") {
      errors.push("逻辑题答案不能为空");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证完整的题目对象 (用于保存前验证)
 * @param question 完整题目对象
 * @returns 验证结果
 */
export function validateCompleteQuestion(question: CustomQuestion): QuestionValidationResult {
  const baseResult = validateQuestion(question);
  const errors = [...baseResult.errors];

  // 验证ID
  if (!question.id || question.id.trim() === "") {
    errors.push("题目ID不能为空");
  }

  // 验证难度
  if (![1, 2, 3].includes(question.difficulty)) {
    errors.push("难度等级必须是1、2或3");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 批量验证题目
 * @param questions 题目数组
 * @returns 验证结果数组
 */
export function validateQuestions(questions: CustomQuestion[]): {
  allValid: boolean;
  results: { index: number; question: CustomQuestion; result: QuestionValidationResult }[];
} {
  const results = questions.map((question, index) => ({
    index,
    question,
    result: validateCompleteQuestion(question),
  }));

  return {
    allValid: results.every(r => r.result.valid),
    results,
  };
}
