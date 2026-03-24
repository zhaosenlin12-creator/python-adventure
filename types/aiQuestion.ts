/**
 * AI智能题目生成 - 类型定义
 * 用于创意工坊的AI辅助出题功能
 */

// ==================== 年级分组 ====================

export type GradeGroup = 'primary_lower' | 'primary_upper' | 'junior_high';

export const GRADE_GROUPS: Record<GradeGroup, { label: string; grades: string }> = {
  primary_lower: { label: '小学低年级', grades: '1-3年级' },
  primary_upper: { label: '小学高年级', grades: '4-6年级' },
  junior_high: { label: '初中', grades: '7-9年级' },
};

// ==================== 科目配置 ====================

export type SubjectType = 
  | 'math'      // 数学
  | 'chinese'   // 语文
  | 'english'   // 英语
  | 'physics'   // 物理
  | 'chemistry' // 化学
  | 'python'    // Python编程
  | 'scratch'   // Scratch编程
  | 'logic'     // 趣味推理
  | 'history'   // 趣味历史
  | 'science';  // 科学常识

export interface SubjectInfo {
  id: SubjectType;
  label: string;
  icon: string;
  availableFor: GradeGroup[];
}

export const SUBJECTS: SubjectInfo[] = [
  { id: 'math', label: '数学', icon: '🔢', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
  { id: 'chinese', label: '语文', icon: '📖', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
  { id: 'english', label: '英语', icon: '🔤', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
  { id: 'physics', label: '物理', icon: '⚡', availableFor: ['junior_high'] },
  { id: 'chemistry', label: '化学', icon: '🧪', availableFor: ['junior_high'] },
  { id: 'python', label: 'Python', icon: '🐍', availableFor: ['primary_upper', 'junior_high'] },
  { id: 'scratch', label: 'Scratch', icon: '🧩', availableFor: ['primary_lower', 'primary_upper'] },
  { id: 'logic', label: '趣味推理', icon: '🧠', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
  { id: 'history', label: '趣味历史', icon: '🏛️', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
  { id: 'science', label: '科学常识', icon: '🔬', availableFor: ['primary_lower', 'primary_upper', 'junior_high'] },
];

// 根据年级获取可用科目
export function getAvailableSubjects(grade: GradeGroup): SubjectInfo[] {
  return SUBJECTS.filter(s => s.availableFor.includes(grade));
}

// ==================== 快捷模板 ====================

export interface QuickTemplate {
  id: string;
  name: string;
  icon: string;
  subjects: SubjectType[];
  difficulty: 1 | 2 | 3;
  count: number;
  extraPrompt?: string;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'oral_calc', name: '口算练习', icon: '🔢', subjects: ['math'], difficulty: 1, count: 10, extraPrompt: '简单的加减乘除口算题' },
  { id: 'idiom', name: '成语填空', icon: '📖', subjects: ['chinese'], difficulty: 2, count: 5, extraPrompt: '常见成语填空或选择' },
  { id: 'word_spell', name: '单词拼写', icon: '🔤', subjects: ['english'], difficulty: 1, count: 10, extraPrompt: '常见英语单词拼写或翻译' },
  { id: 'brain_teaser', name: '脑筋急转弯', icon: '🧠', subjects: ['logic'], difficulty: 1, count: 5, extraPrompt: '有趣的脑筋急转弯' },
  { id: 'history_fun', name: '历史趣闻', icon: '🏛️', subjects: ['history'], difficulty: 2, count: 5, extraPrompt: '有趣的历史故事和人物' },
];

// ==================== API请求/响应类型 ====================

export interface GenerateQuestionsRequest {
  grade: GradeGroup;
  subjects: SubjectType[];
  difficulty: 1 | 2 | 3;
  count: number;
  extraPrompt?: string;
}

export interface GeneratedQuestion {
  type: 'choice' | 'fill';
  subject: SubjectType;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export interface GenerateQuestionsResponse {
  success: boolean;
  questions: GeneratedQuestion[];
  message?: string;
}

// ==================== 组件状态类型 ====================

export interface AIGeneratorState {
  step: 'config' | 'loading' | 'result';
  grade: GradeGroup;
  selectedSubjects: SubjectType[];
  difficulty: 1 | 2 | 3;
  count: number;
  extraPrompt: string;
  generatedQuestions: GeneratedQuestion[];
  selectedQuestionIds: Set<number>;
  error: string | null;
}
