/**
 * 年龄分组类型定义
 * 用于战役模式的年龄段分组
 */

export type AgeGroup = 'primary-lower' | 'primary-upper' | 'junior-high';

export interface AgeGroupInfo {
  id: AgeGroup;
  name: string;
  nameEn: string;
  gradeRange: string;
  ageRange: string;
  description: string;
  icon: string;
  color: string;
  bgGradient: string;
  programmingFocus: string[];
  subjectFocus: string[];
}

export const AGE_GROUPS: AgeGroupInfo[] = [
  {
    id: 'primary-lower',
    name: '低年级组',
    nameEn: 'Primary Lower',
    gradeRange: '1-3年级',
    ageRange: '6-9岁',
    description: '适合小学1-3年级学生，以图形化编程和趣味题目为主',
    icon: '🌟',
    color: 'green',
    bgGradient: 'from-green-500 to-emerald-600',
    programmingFocus: ['Scratch', '乐高机器人', '图形化编程'],
    subjectFocus: ['基础数学', '趣味语文', '简单英语'],
  },
  {
    id: 'primary-upper',
    name: '高年级组',
    nameEn: 'Primary Upper',
    gradeRange: '4-6年级',
    ageRange: '9-12岁',
    description: '适合小学4-6年级学生，开始接触Python入门',
    icon: '🚀',
    color: 'blue',
    bgGradient: 'from-blue-500 to-indigo-600',
    programmingFocus: ['Scratch进阶', 'Python入门', '算法思维'],
    subjectFocus: ['数学应用', '语文阅读', '英语语法', '科学常识'],
  },
  {
    id: 'junior-high',
    name: '初中组',
    nameEn: 'Junior High',
    gradeRange: '7-9年级',
    ageRange: '12-15岁',
    description: '适合初中学生，以Python编程和学科知识为主',
    icon: '💡',
    color: 'purple',
    bgGradient: 'from-purple-500 to-pink-600',
    programmingFocus: ['Python', '算法基础', '数据结构入门'],
    subjectFocus: ['数学', '物理', '化学', '英语', '语文'],
  },
];

export function getAgeGroupInfo(id: AgeGroup): AgeGroupInfo | undefined {
  return AGE_GROUPS.find(g => g.id === id);
}

// 便捷的年龄段信息映射
export const AGE_GROUP_INFO: Record<AgeGroup, {
  name: string;
  gradeRange: string;
  ageRange: string;
  description: string;
  subjects: string[];
}> = {
  'primary-lower': {
    name: '低年级组',
    gradeRange: '1-3年级',
    ageRange: '6-9岁',
    description: '图形化编程和趣味题目',
    subjects: ['Scratch', '乐高', '数学', '语文', '英语', '科学'],
  },
  'primary-upper': {
    name: '高年级组',
    gradeRange: '4-6年级',
    ageRange: '9-12岁',
    description: 'Python入门和进阶思维',
    subjects: ['Scratch进阶', 'Python', '数学', '语文', '英语', '科学'],
  },
  'junior-high': {
    name: '初中组',
    gradeRange: '7-9年级',
    ageRange: '12-15岁',
    description: 'Python编程和算法基础',
    subjects: ['Python', '算法', '数学', '物理', '化学', '英语'],
  },
};
