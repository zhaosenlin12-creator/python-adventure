import { getRandomQuestions } from '@/lib/questionBank/index';
import type { AgeGroup } from '@/types/ageGroup';
import type { BattleRoyaleQuizQuestion } from '@/types/pvp-br';

export function buildBattleRoyaleQuiz(ageGroup: AgeGroup = 'primary-upper', count = 3): BattleRoyaleQuizQuestion[] {
  return getRandomQuestions(ageGroup, count).map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    answer: question.answer,
    subject: question.subject,
    type: question.type === 'choice' ? 'choice' : 'fill',
  }));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？,.!?]/g, '')
    .trim();
}

export function isBattleRoyaleQuizAnswerCorrect(
  question: BattleRoyaleQuizQuestion,
  answer: string,
): boolean {
  const normalized = normalizeText(answer);
  if (Array.isArray(question.answer)) {
    return question.answer.some((item) => normalizeText(item) === normalized);
  }
  return normalizeText(question.answer) === normalized;
}

export function evaluateBattleRoyaleQuiz(
  questions: BattleRoyaleQuizQuestion[],
  answers: string[],
): boolean {
  if (questions.length !== answers.length) {
    return false;
  }
  return questions.every((question, index) => isBattleRoyaleQuizAnswerCorrect(question, answers[index] ?? ''));
}
