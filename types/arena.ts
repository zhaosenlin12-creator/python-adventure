// Arena Challenge Types
export type ChallengeType = 'time' | 'efficiency' | 'survival';

export interface ArenaChallenge {
    id: string;
    type: ChallengeType;
    title: string;
    description: string;
    timeLimit: number; // seconds
    codeTemplate: string;
    expectedOutput: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
}

export interface ArenaScore {
    challengeId: string;
    timeUsed: number;
    codeLength: number;
    points: number;
    timestamp: number;
}

// Predefined challenges
export const ARENA_CHALLENGES: ArenaChallenge[] = [
    {
        id: 'draw_001',
        type: 'time',
        title: '画正方形',
        description: '使用循环打印一个5x5的正方形（用*表示）',
        timeLimit: 45,
        codeTemplate: '# 画一个5x5的正方形\n# 提示：使用两层循环，外层控制行，内层控制列\nfor i in range(5):\n    # 你的代码：打印一行5个星号\n    pass\n',
        expectedOutput: '*****\n*****\n*****\n*****\n*****',
        difficulty: 'easy',
        points: 100
    },
    {
        id: 'sum_001',
        type: 'efficiency',
        title: '计算总和',
        description: '计算1到10的总和（结果应该是55）',
        timeLimit: 45,
        codeTemplate: '# 计算1到10的总和\n# 提示：可以使用 for 循环累加，或使用 sum(range(1, 11))\ntotal = 0\n# 你的代码\n\nprint(total)\n',
        expectedOutput: '55',
        difficulty: 'medium',
        points: 200
    },
    {
        id: 'max_001',
        type: 'survival',
        title: '找最大值',
        description: '找出列表中的最大值',
        timeLimit: 60,
        codeTemplate: '# 找出列表中的最大值\nnumbers = [3, 7, 2, 9, 1, 5]\n# 提示：可以使用 max() 函数，或用循环比较\n# 你的代码\n\nprint(result)\n',
        expectedOutput: '9',
        difficulty: 'hard',
        points: 300
    }
];
