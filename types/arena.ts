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
        id: 'print_001',
        type: 'time',
        title: '打印问候',
        description: '补全代码，输出 Hello Python',
        timeLimit: 45,
        codeTemplate: '# 输出 Hello Python\ntext = "Hello Python"\nprint(text)\n',
        expectedOutput: 'Hello Python',
        difficulty: 'easy',
        points: 100
    },
    {
        id: 'loop_001',
        type: 'time',
        title: '循环倒数',
        description: '打印 3, 2, 1 三行数字，练习最基础的循环节奏',
        timeLimit: 50,
        codeTemplate: '# 使用循环打印倒数\nfor i in range(3, 0, -1):\n    print(i)\n',
        expectedOutput: '3\n2\n1',
        difficulty: 'easy',
        points: 120
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
        id: 'string_001',
        type: 'efficiency',
        title: '拼接口号',
        description: '把 Code 和 Adventure 拼接后输出，练习字符串处理',
        timeLimit: 55,
        codeTemplate: '# 拼接字符串\nleft = "Code"\nright = "Adventure"\nresult = left + right\nprint(result)\n',
        expectedOutput: 'CodeAdventure',
        difficulty: 'medium',
        points: 200
    },
    {
        id: 'sort_001',
        type: 'efficiency',
        title: '排序冲刺',
        description: '把列表从小到大排序并输出，适合练习常用内置函数',
        timeLimit: 60,
        codeTemplate: '# 对列表排序\nnumbers = [9, 3, 7, 1, 5]\nresult = sorted(numbers)\nprint(result)\n',
        expectedOutput: '[1, 3, 5, 7, 9]',
        difficulty: 'medium',
        points: 220
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
    },
    {
        id: 'list_001',
        type: 'survival',
        title: '平方清单',
        description: '生成 1 到 5 的平方列表，考验列表表达式和输出格式',
        timeLimit: 75,
        codeTemplate: '# 生成平方列表\nresult = [x * x for x in range(1, 6)]\nprint(result)\n',
        expectedOutput: '[1, 4, 9, 16, 25]',
        difficulty: 'hard',
        points: 320
    },
    {
        id: 'filter_001',
        type: 'survival',
        title: '偶数筛选',
        description: '从列表中筛选出所有偶数，适合后期高压答题',
        timeLimit: 80,
        codeTemplate: '# 筛选偶数\nnumbers = [1, 2, 3, 4, 5, 6, 7, 8]\nresult = [x for x in numbers if x % 2 == 0]\nprint(result)\n',
        expectedOutput: '[2, 4, 6, 8]',
        difficulty: 'hard',
        points: 340
    }
];
