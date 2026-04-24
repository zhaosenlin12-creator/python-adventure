export type ChallengeType = 'time' | 'efficiency' | 'survival';
export type ArenaDifficulty = 'easy' | 'medium' | 'hard';

export interface ArenaChallenge {
    id: string;
    type: ChallengeType;
    title: string;
    description: string;
    timeLimit: number;
    codeTemplate: string;
    expectedOutput: string;
    difficulty: ArenaDifficulty;
    points: number;
    knowledgePoint: string;
    usageHint: string;
}

export interface ArenaScore {
    challengeId: string;
    timeUsed: number;
    codeLength: number;
    points: number;
    timestamp: number;
}

type ArenaChallengeBase = Omit<ArenaChallenge, 'knowledgePoint' | 'usageHint'>;
type ArenaChallengeGuide = Pick<ArenaChallenge, 'knowledgePoint' | 'usageHint'>;

export const ARENA_DIFFICULTY_LABELS: Record<ArenaDifficulty, string> = {
    easy: '简单',
    medium: '进阶',
    hard: '挑战',
};

const ARENA_CHALLENGE_GUIDES: Record<string, ArenaChallengeGuide> = {
    arena_easy_print_greeting: {
        knowledgePoint: 'print 输出',
        usageHint: '打印文字时，用 print("内容") 把内容包起来。',
    },
    arena_easy_addition: {
        knowledgePoint: '加法运算',
        usageHint: '两个数字相加用 +，先算出结果再打印。',
    },
    arena_easy_variable_name: {
        knowledgePoint: '变量赋值',
        usageHint: '把文字放进变量时要用引号，再用 print(变量名) 输出。',
    },
    arena_easy_length: {
        knowledgePoint: 'len 长度函数',
        usageHint: 'len(内容) 可以得到字符串或列表有多少项。',
    },
    arena_easy_compare: {
        knowledgePoint: '比较运算符',
        usageHint: '判断左边是否大于右边时，用 >。',
    },
    arena_easy_first_item: {
        knowledgePoint: '列表下标',
        usageHint: '列表第一个元素的下标是 0，不是 1。',
    },
    arena_easy_loop_count: {
        knowledgePoint: 'range 循环次数',
        usageHint: 'range(3) 会依次得到 0、1、2。',
    },
    arena_easy_even_check: {
        knowledgePoint: '取余判断偶数',
        usageHint: '一个数 % 2 等于 0，说明它是偶数。',
    },
    arena_medium_sum_range: {
        knowledgePoint: 'range 终点规则',
        usageHint: 'range(1, 11) 才会包含 1 到 10，终点本身不会被取到。',
    },
    arena_medium_square_list: {
        knowledgePoint: '列表推导式',
        usageHint: '想得到 1 到 5 的平方，要让 range 的终点写到 6。',
    },
    arena_medium_sort_numbers: {
        knowledgePoint: 'sorted 排序',
        usageHint: 'sorted(列表) 会返回从小到大排好的新列表。',
    },
    arena_medium_filter_even: {
        knowledgePoint: '条件筛选',
        usageHint: '筛偶数还是看 x % 2 == 0。',
    },
    arena_medium_dict_get: {
        knowledgePoint: '字典取值方法',
        usageHint: '字典可以用 get("键名") 安全读取内容。',
    },
    arena_medium_join_words: {
        knowledgePoint: '字符串 join',
        usageHint: '" ".join(列表) 可以用空格把多个单词连成一句话。',
    },
    arena_medium_countdown: {
        knowledgePoint: '倒序 range',
        usageHint: '从 3 倒数到 1，步长要写 -1。',
    },
    arena_medium_max_minus_min: {
        knowledgePoint: 'max 与 min',
        usageHint: '最大值用 max，最小值用 min，极差就是两者相减。',
    },
    arena_hard_factorial: {
        knowledgePoint: '循环累乘',
        usageHint: '算 5 的阶乘时，要让循环取到 5，所以终点写 6。',
    },
    arena_hard_nested_sum: {
        knowledgePoint: '嵌套求和',
        usageHint: 'sum(每行的和) 可以把二维列表全部加起来。',
    },
    arena_hard_unique_sorted: {
        knowledgePoint: '去重后排序',
        usageHint: 'set 能去重，sorted 能把结果重新排好。',
    },
    arena_hard_word_count: {
        knowledgePoint: '列表 count',
        usageHint: '列表里统计某个值出现几次，用 count("内容")。',
    },
    arena_hard_conditional_sum: {
        knowledgePoint: '带条件的求和',
        usageHint: '只统计大于 3 的数字时，条件要写 x > 3。',
    },
    arena_hard_tuple_sort: {
        knowledgePoint: 'lambda 排序键',
        usageHint: '元组的第二项下标是 1，按分数排就取 item[1]。',
    },
    arena_hard_enumerate: {
        knowledgePoint: 'enumerate 编号',
        usageHint: '想让编号从 1 开始，start 就填 1。',
    },
    arena_hard_dict_comprehension: {
        knowledgePoint: '字典推导式',
        usageHint: '平方是 x ** 2，双星号表示乘方。',
    },
};

const ARENA_CHALLENGE_BASE: ArenaChallengeBase[] = [
    {
        id: 'arena_easy_print_greeting',
        type: 'time',
        title: '打印问候',
        description: '补全输出语句，打印 Hello Python。',
        timeLimit: 45,
        codeTemplate: '___("Hello Python")\n',
        expectedOutput: 'Hello Python',
        difficulty: 'easy',
        points: 100,
    },
    {
        id: 'arena_easy_addition',
        type: 'time',
        title: '简单加法',
        description: '补全运算符，输出 3 + 5 的结果。',
        timeLimit: 45,
        codeTemplate: 'result = 3 ___ 5\nprint(result)\n',
        expectedOutput: '8',
        difficulty: 'easy',
        points: 105,
    },
    {
        id: 'arena_easy_variable_name',
        type: 'time',
        title: '变量起名',
        description: '给 name 赋值 Python 并打印。',
        timeLimit: 50,
        codeTemplate: 'name = "___"\nprint(name)\n',
        expectedOutput: 'Python',
        difficulty: 'easy',
        points: 110,
    },
    {
        id: 'arena_easy_length',
        type: 'time',
        title: '字符长度',
        description: '补全函数名，输出 Learn 的长度。',
        timeLimit: 50,
        codeTemplate: 'word = "Learn"\ncount = ___(word)\nprint(count)\n',
        expectedOutput: '5',
        difficulty: 'easy',
        points: 110,
    },
    {
        id: 'arena_easy_compare',
        type: 'time',
        title: '真假判断',
        description: '补全比较符号，让结果变成 True。',
        timeLimit: 50,
        codeTemplate: 'result = 9 ___ 4\nprint(result)\n',
        expectedOutput: 'True',
        difficulty: 'easy',
        points: 115,
    },
    {
        id: 'arena_easy_first_item',
        type: 'time',
        title: '列表首项',
        description: '取出列表第一个元素并输出。',
        timeLimit: 55,
        codeTemplate: 'pets = ["猫咪", "小狗", "海豚"]\nprint(pets[___])\n',
        expectedOutput: '猫咪',
        difficulty: 'easy',
        points: 115,
    },
    {
        id: 'arena_easy_loop_count',
        type: 'time',
        title: '三次循环',
        description: '补全循环次数，输出 0、1、2。',
        timeLimit: 55,
        codeTemplate: 'for i in range(___):\n    print(i)\n',
        expectedOutput: '0\n1\n2',
        difficulty: 'easy',
        points: 120,
    },
    {
        id: 'arena_easy_even_check',
        type: 'time',
        title: '偶数判断',
        description: '补全取余符号，判断 8 是否是偶数。',
        timeLimit: 60,
        codeTemplate: 'num = 8\nprint(num ___ 2 == 0)\n',
        expectedOutput: 'True',
        difficulty: 'easy',
        points: 125,
    },
    {
        id: 'arena_medium_sum_range',
        type: 'efficiency',
        title: '范围求和',
        description: '补全终点，算出 1 到 10 的总和。',
        timeLimit: 65,
        codeTemplate: 'total = sum(range(1, ___))\nprint(total)\n',
        expectedOutput: '55',
        difficulty: 'medium',
        points: 180,
    },
    {
        id: 'arena_medium_square_list',
        type: 'efficiency',
        title: '平方列表',
        description: '补全终点，输出 1 到 5 的平方列表。',
        timeLimit: 70,
        codeTemplate: 'result = [x * x for x in range(1, ___)]\nprint(result)\n',
        expectedOutput: '[1, 4, 9, 16, 25]',
        difficulty: 'medium',
        points: 190,
    },
    {
        id: 'arena_medium_sort_numbers',
        type: 'efficiency',
        title: '排序冲刺',
        description: '补全函数名，把列表从小到大排序。',
        timeLimit: 70,
        codeTemplate: 'numbers = [9, 3, 7, 1, 5]\nresult = ___(numbers)\nprint(result)\n',
        expectedOutput: '[1, 3, 5, 7, 9]',
        difficulty: 'medium',
        points: 195,
    },
    {
        id: 'arena_medium_filter_even',
        type: 'efficiency',
        title: '偶数筛选',
        description: '补全条件，筛出所有偶数。',
        timeLimit: 75,
        codeTemplate: 'numbers = [1, 2, 3, 4, 5, 6]\nresult = [x for x in numbers if x ___ 2 == 0]\nprint(result)\n',
        expectedOutput: '[2, 4, 6]',
        difficulty: 'medium',
        points: 200,
    },
    {
        id: 'arena_medium_dict_get',
        type: 'efficiency',
        title: '字典取值',
        description: '补全方法名，读取字典里的 age。',
        timeLimit: 75,
        codeTemplate: 'person = {"name": "小智", "age": 12}\nprint(person.___("age"))\n',
        expectedOutput: '12',
        difficulty: 'medium',
        points: 205,
    },
    {
        id: 'arena_medium_join_words',
        type: 'efficiency',
        title: '拼接单词',
        description: '补全连接符，把三个词拼成一句话。',
        timeLimit: 80,
        codeTemplate: 'words = ["Code", "Adventure", "Club"]\nprint(" ___ ".join(words))\n',
        expectedOutput: 'Code Adventure Club',
        difficulty: 'medium',
        points: 210,
    },
    {
        id: 'arena_medium_countdown',
        type: 'efficiency',
        title: '倒数出发',
        description: '补全 range 参数，输出 3、2、1。',
        timeLimit: 80,
        codeTemplate: 'for i in range(3, 0, ___):\n    print(i)\n',
        expectedOutput: '3\n2\n1',
        difficulty: 'medium',
        points: 215,
    },
    {
        id: 'arena_medium_max_minus_min',
        type: 'efficiency',
        title: '极差计算',
        description: '补全函数名，输出最大值减最小值。',
        timeLimit: 85,
        codeTemplate: 'numbers = [4, 9, 2, 7]\nresult = ___(numbers) - min(numbers)\nprint(result)\n',
        expectedOutput: '7',
        difficulty: 'medium',
        points: 220,
    },
    {
        id: 'arena_hard_factorial',
        type: 'survival',
        title: '阶乘累计',
        description: '补全终点，算出 5 的阶乘。',
        timeLimit: 95,
        codeTemplate: 'result = 1\nfor i in range(1, ___):\n    result *= i\nprint(result)\n',
        expectedOutput: '120',
        difficulty: 'hard',
        points: 300,
    },
    {
        id: 'arena_hard_nested_sum',
        type: 'survival',
        title: '矩阵求和',
        description: '补全函数名，算出二维列表的总和。',
        timeLimit: 100,
        codeTemplate: 'matrix = [[1, 2], [3, 4], [5, 6]]\nresult = ___(sum(row) for row in matrix)\nprint(result)\n',
        expectedOutput: '21',
        difficulty: 'hard',
        points: 310,
    },
    {
        id: 'arena_hard_unique_sorted',
        type: 'survival',
        title: '去重排序',
        description: '补全函数名，输出去重后排序的列表。',
        timeLimit: 100,
        codeTemplate: 'numbers = [3, 1, 3, 2, 2, 5]\nresult = ___(set(numbers))\nprint(result)\n',
        expectedOutput: '[1, 2, 3, 5]',
        difficulty: 'hard',
        points: 320,
    },
    {
        id: 'arena_hard_word_count',
        type: 'survival',
        title: '词频统计',
        description: '补全方法名，统计 banana 出现次数。',
        timeLimit: 105,
        codeTemplate: 'words = ["apple", "banana", "apple", "banana", "banana"]\nprint(words.___("banana"))\n',
        expectedOutput: '3',
        difficulty: 'hard',
        points: 330,
    },
    {
        id: 'arena_hard_conditional_sum',
        type: 'survival',
        title: '条件求和',
        description: '补全条件，只统计大于 3 的数。',
        timeLimit: 105,
        codeTemplate: 'numbers = [1, 4, 6, 2, 5]\nresult = sum(x for x in numbers if x ___ 3)\nprint(result)\n',
        expectedOutput: '15',
        difficulty: 'hard',
        points: 340,
    },
    {
        id: 'arena_hard_tuple_sort',
        type: 'survival',
        title: '按分数排序',
        description: '补全索引，按第二项从小到大排序。',
        timeLimit: 110,
        codeTemplate: 'records = [("A", 92), ("B", 75), ("C", 88)]\nresult = sorted(records, key=lambda item: item[___])\nprint(result)\n',
        expectedOutput: "[('B', 75), ('C', 88), ('A', 92)]",
        difficulty: 'hard',
        points: 350,
    },
    {
        id: 'arena_hard_enumerate',
        type: 'survival',
        title: '编号输出',
        description: '补全起始编号，输出 1:猫、2:狗。',
        timeLimit: 110,
        codeTemplate: 'pets = ["猫", "狗"]\nfor index, pet in enumerate(pets, start=___):\n    print(f"{index}:{pet}")\n',
        expectedOutput: '1:猫\n2:狗',
        difficulty: 'hard',
        points: 360,
    },
    {
        id: 'arena_hard_dict_comprehension',
        type: 'survival',
        title: '平方字典',
        description: '补全表达式，生成 1 到 3 的平方字典。',
        timeLimit: 115,
        codeTemplate: 'result = {x: x ___ 2 for x in range(1, 4)}\nprint(result)\n',
        expectedOutput: '{1: 1, 2: 4, 3: 9}',
        difficulty: 'hard',
        points: 370,
    },
];

export const ARENA_CHALLENGES: ArenaChallenge[] = ARENA_CHALLENGE_BASE.map((challenge) => {
    const guide = ARENA_CHALLENGE_GUIDES[challenge.id];
    if (!guide) {
        throw new Error(`Missing arena guide config for ${challenge.id}`);
    }

    return {
        ...challenge,
        ...guide,
    };
});

export function buildArenaChallengeEditorTemplate(challenge: ArenaChallenge) {
    const commentLines = [
        `# 知识点：${challenge.knowledgePoint}`,
        `# 用法提示：${challenge.usageHint}`,
        '',
    ];

    return `${commentLines.join('\n')}${challenge.codeTemplate}`.trimEnd() + '\n';
}

export function getArenaChallengeById(challengeId: string) {
    return ARENA_CHALLENGES.find((challenge) => challenge.id === challengeId);
}

export function getArenaChallengesByDifficulty(difficulty: ArenaDifficulty) {
    return ARENA_CHALLENGES.filter((challenge) => challenge.difficulty === difficulty);
}
