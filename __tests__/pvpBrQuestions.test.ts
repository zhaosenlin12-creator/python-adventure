import { buildBattleRoyaleQuiz, evaluateBattleRoyaleQuiz } from '@/lib/pvpBrQuestions';
import { getRandomQuestions } from '@/lib/questionBank/index';

jest.mock('@/lib/questionBank/index', () => ({
  getRandomQuestions: jest.fn(),
}));

const mockedGetRandomQuestions = getRandomQuestions as jest.MockedFunction<typeof getRandomQuestions>;

describe('battle royale revive quiz', () => {
  afterEach(() => {
    mockedGetRandomQuestions.mockReset();
    jest.restoreAllMocks();
  });

  test('shuffles choice options and keeps the correct content answer', () => {
    mockedGetRandomQuestions.mockReturnValue([
      {
        id: 'quiz-1',
        type: 'choice',
        subject: 'programming',
        difficulty: 1,
        question: 'Python 输出函数是什么？',
        options: ['print', 'input', 'if', 'for'],
        answer: 'print',
      },
    ]);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const [quiz] = buildBattleRoyaleQuiz('primary-upper', 1);

    expect(quiz.options).toEqual(['input', 'if', 'for', 'print']);
    expect(quiz.answer).toBe('print');
    expect(evaluateBattleRoyaleQuiz([quiz], ['print'])).toBe(true);
    expect(evaluateBattleRoyaleQuiz([quiz], ['input'])).toBe(false);
  });

  test('does not keep the first option fixed as the correct answer for letter choices', () => {
    mockedGetRandomQuestions.mockReturnValue([
      {
        id: 'quiz-2',
        type: 'choice',
        subject: 'english',
        difficulty: 1,
        question: 'ABC 歌的第一个字母是什么？',
        options: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
    ]);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const [quiz] = buildBattleRoyaleQuiz('primary-lower', 1);

    expect(quiz.options).toEqual(['B', 'C', 'D', 'A']);
    expect(quiz.answer).toBe('A');
    expect(quiz.options?.[0]).not.toBe(quiz.answer);
    expect(evaluateBattleRoyaleQuiz([quiz], ['A'])).toBe(true);
    expect(evaluateBattleRoyaleQuiz([quiz], ['B'])).toBe(false);
  });
});
