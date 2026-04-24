import { getRandomQuestions } from '@/lib/questionBank/index';
import type { AgeGroup } from '@/types/ageGroup';
import type { BattleRoyaleQuizQuestion } from '@/types/pvp-br';

function shuffleOptions<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildQuizQuestion(question: ReturnType<typeof getRandomQuestions>[number]): BattleRoyaleQuizQuestion {
  if (!question.options?.length) {
    return {
      id: question.id,
      question: question.question,
      options: question.options,
      answer: question.answer,
      subject: question.subject,
      type: question.type === 'choice' ? 'choice' : 'fill',
    };
  }

  const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
  const normalizedAnswers = answers.map((item) => normalizeText(item));
  const taggedOptions = question.options.map((option, index) => {
    const optionLabel = String.fromCharCode(65 + index);
    const normalizedOption = normalizeText(option);
    const isCorrect = normalizedAnswers.some(
      (answer) => answer === normalizedOption || answer === normalizeText(optionLabel),
    );

    return {
      option,
      isCorrect,
    };
  });
  const shuffledOptions = shuffleOptions(taggedOptions);
  const correctOptions = shuffledOptions.filter((item) => item.isCorrect).map((item) => item.option);

  return {
    id: question.id,
    question: question.question,
    options: shuffledOptions.map((item) => item.option),
    answer: Array.isArray(question.answer) ? (correctOptions.length ? correctOptions : question.answer) : (correctOptions[0] ?? question.answer),
    subject: question.subject,
    type: question.type === 'choice' ? 'choice' : 'fill',
  };
}

export function buildBattleRoyaleQuiz(ageGroup: AgeGroup = 'primary-upper', count = 3): BattleRoyaleQuizQuestion[] {
  return getRandomQuestions(ageGroup, count).map((question) => buildQuizQuestion(question));
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
