/**
 * PVP 编程轮题库
 * 包含多种难度的编程挑战
 */

export interface CodingTask {
    id: string;
    title: string;
    description: string;
    template: string;
    expectedOutput: string;
    hints: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    category: 'math' | 'string' | 'list' | 'logic';
    // 用于简化验证的关键词
    validationKeywords: string[];
}

// 简单难度题目
const EASY_TASKS: CodingTask[] = [
    {
        id: 'sum_1_to_n',
        title: '计算 1 到 N 的和',
        description: '编写程序计算从 1 到 N 的所有整数之和。\n\n输入：N = 10\n期望输出：55',
        template: '# 计算 1 到 N 的和\nN = 10\n\n# 在下面编写你的代码\ntotal = 0\n\n# 提示：使用 for 循环或 sum() 函数\n\nprint(total)',
        expectedOutput: '55',
        hints: ['使用 for 循环', '或者 sum(range(1, N+1))'],
        difficulty: 'easy',
        category: 'math',
        validationKeywords: ['sum(range(1, N+1))', 'sum(range(1, 11))', 'total +=', 'total = 55', 'N * (N + 1) // 2']
    },
    {
        id: 'hello_world',
        title: '打印问候语',
        description: '编写程序打印 "Hello, World!"\n\n期望输出：Hello, World!',
        template: '# 打印问候语\n\n# 在下面编写你的代码\n\n',
        expectedOutput: 'Hello, World!',
        hints: ['使用 print() 函数'],
        difficulty: 'easy',
        category: 'string',
        validationKeywords: ['print("Hello, World!")', "print('Hello, World!')"]
    },
    {
        id: 'multiply_two',
        title: '两数相乘',
        description: '计算 a 和 b 的乘积。\n\n输入：a = 7, b = 8\n期望输出：56',
        template: '# 两数相乘\na = 7\nb = 8\n\n# 在下面编写你的代码\nresult = 0\n\nprint(result)',
        expectedOutput: '56',
        hints: ['使用 * 运算符'],
        difficulty: 'easy',
        category: 'math',
        validationKeywords: ['a * b', 'result = 56', '7 * 8']
    },
    {
        id: 'even_odd',
        title: '判断奇偶',
        description: '判断数字 n 是奇数还是偶数。\n\n输入：n = 42\n期望输出：偶数',
        template: '# 判断奇偶\nn = 42\n\n# 在下面编写你的代码\n# 如果是偶数打印"偶数"，否则打印"奇数"\n\n',
        expectedOutput: '偶数',
        hints: ['使用 % 取余运算符', 'n % 2 == 0 表示偶数'],
        difficulty: 'easy',
        category: 'logic',
        validationKeywords: ['n % 2 == 0', 'print("偶数")', "print('偶数')"]
    },
    {
        id: 'max_of_three',
        title: '三数最大值',
        description: '找出三个数中的最大值。\n\n输入：a = 5, b = 12, c = 8\n期望输出：12',
        template: '# 三数最大值\na = 5\nb = 12\nc = 8\n\n# 在下面编写你的代码\nresult = 0\n\nprint(result)',
        expectedOutput: '12',
        hints: ['使用 max() 函数', '或者用 if 语句比较'],
        difficulty: 'easy',
        category: 'math',
        validationKeywords: ['max(a, b, c)', 'max(5, 12, 8)', 'result = 12']
    },
];

// 中等难度题目
const MEDIUM_TASKS: CodingTask[] = [
    {
        id: 'factorial',
        title: '计算阶乘',
        description: '计算 n 的阶乘 (n!)。\n\n输入：n = 5\n期望输出：120\n\n提示：5! = 5 × 4 × 3 × 2 × 1 = 120',
        template: '# 计算阶乘\nn = 5\n\n# 在下面编写你的代码\nresult = 1\n\nprint(result)',
        expectedOutput: '120',
        hints: ['使用 for 循环', '或者 math.factorial()'],
        difficulty: 'medium',
        category: 'math',
        validationKeywords: ['result *= i', 'math.factorial', 'result = 120', 'for i in range']
    },
    {
        id: 'reverse_string',
        title: '反转字符串',
        description: '将字符串反转。\n\n输入：s = "hello"\n期望输出：olleh',
        template: '# 反转字符串\ns = "hello"\n\n# 在下面编写你的代码\nresult = ""\n\nprint(result)',
        expectedOutput: 'olleh',
        hints: ['使用切片 [::-1]', '或者循环'],
        difficulty: 'medium',
        category: 'string',
        validationKeywords: ['s[::-1]', '[::-1]', 'reversed(', 'result = "olleh"']
    },
    {
        id: 'count_vowels',
        title: '统计元音字母',
        description: '统计字符串中元音字母(a,e,i,o,u)的数量。\n\n输入：s = "hello world"\n期望输出：3',
        template: '# 统计元音字母\ns = "hello world"\n\n# 在下面编写你的代码\ncount = 0\n\nprint(count)',
        expectedOutput: '3',
        hints: ['遍历字符串', '检查每个字符是否在 "aeiou" 中'],
        difficulty: 'medium',
        category: 'string',
        validationKeywords: ['in "aeiou"', "in 'aeiou'", 'count = 3', 'vowels']
    },
    {
        id: 'sum_list',
        title: '列表求和',
        description: '计算列表中所有数字的和。\n\n输入：nums = [1, 2, 3, 4, 5]\n期望输出：15',
        template: '# 列表求和\nnums = [1, 2, 3, 4, 5]\n\n# 在下面编写你的代码\ntotal = 0\n\nprint(total)',
        expectedOutput: '15',
        hints: ['使用 sum() 函数', '或者 for 循环'],
        difficulty: 'medium',
        category: 'list',
        validationKeywords: ['sum(nums)', 'total = 15', 'for n in nums', 'total +=']
    },
    {
        id: 'fibonacci',
        title: '斐波那契数',
        description: '计算第 n 个斐波那契数。\n\n输入：n = 10\n期望输出：55\n\n提示：1, 1, 2, 3, 5, 8, 13, 21, 34, 55...',
        template: '# 斐波那契数\nn = 10\n\n# 在下面编写你的代码\n# F(1)=1, F(2)=1, F(n)=F(n-1)+F(n-2)\n\nresult = 0\n\nprint(result)',
        expectedOutput: '55',
        hints: ['使用循环', '保存前两个数'],
        difficulty: 'medium',
        category: 'math',
        validationKeywords: ['result = 55', 'a, b = b, a + b', 'fib']
    },
];

// 困难难度题目
const HARD_TASKS: CodingTask[] = [
    {
        id: 'prime_check',
        title: '判断质数',
        description: '判断数字 n 是否为质数。\n\n输入：n = 17\n期望输出：True',
        template: '# 判断质数\nn = 17\n\n# 在下面编写你的代码\nis_prime = False\n\nprint(is_prime)',
        expectedOutput: 'True',
        hints: ['质数只能被1和自身整除', '检查 2 到 sqrt(n) 的因子'],
        difficulty: 'hard',
        category: 'math',
        validationKeywords: ['is_prime = True', 'print(True)', 'n % i == 0']
    },
    {
        id: 'palindrome',
        title: '回文判断',
        description: '判断字符串是否为回文（正读反读都一样）。\n\n输入：s = "level"\n期望输出：True',
        template: '# 回文判断\ns = "level"\n\n# 在下面编写你的代码\nis_palindrome = False\n\nprint(is_palindrome)',
        expectedOutput: 'True',
        hints: ['比较原字符串和反转后的字符串'],
        difficulty: 'hard',
        category: 'string',
        validationKeywords: ['s == s[::-1]', 'is_palindrome = True', 'print(True)']
    },
    {
        id: 'list_unique',
        title: '去除重复元素',
        description: '去除列表中的重复元素并排序。\n\n输入：nums = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]\n期望输出：[1, 2, 3, 4, 5, 6, 9]',
        template: '# 去除重复元素\nnums = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]\n\n# 在下面编写你的代码\nresult = []\n\nprint(result)',
        expectedOutput: '[1, 2, 3, 4, 5, 6, 9]',
        hints: ['使用 set() 去重', '使用 sorted() 排序'],
        difficulty: 'hard',
        category: 'list',
        validationKeywords: ['sorted(set(', 'list(set(', '[1, 2, 3, 4, 5, 6, 9]']
    },
];

// 合并所有题目
export const ALL_CODING_TASKS: CodingTask[] = [
    ...EASY_TASKS,
    ...MEDIUM_TASKS,
    ...HARD_TASKS,
];

/**
 * 随机选择一道编程题
 * @param difficulty 可选的难度筛选
 * @returns 随机选择的编程题
 */
export function getRandomCodingTask(difficulty?: 'easy' | 'medium' | 'hard'): CodingTask {
    let tasks = ALL_CODING_TASKS;
    
    if (difficulty) {
        tasks = tasks.filter(t => t.difficulty === difficulty);
    }
    
    const randomIndex = Math.floor(Math.random() * tasks.length);
    return tasks[randomIndex];
}

/**
 * 验证代码是否正确（简化版）
 * @param code 用户代码
 * @param task 编程任务
 * @returns 是否正确
 */
export function validateCode(code: string, task: CodingTask): { isCorrect: boolean; output: string } {
    // 检查是否包含正确的解法关键词
    const hasValidSolution = task.validationKeywords.some(keyword => 
        code.includes(keyword)
    );
    
    if (hasValidSolution) {
        return { isCorrect: true, output: task.expectedOutput };
    }
    
    // 检查是否有基本的代码结构
    if (code.includes('print(') && code.length > task.template.length + 10) {
        // 有一定的代码修改，给予部分分数的机会
        return { isCorrect: false, output: '输出不正确，请检查你的代码逻辑' };
    }
    
    return { isCorrect: false, output: '请完成代码编写' };
}
