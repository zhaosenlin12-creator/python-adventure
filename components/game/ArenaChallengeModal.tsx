'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Clock, Code, Trophy } from 'lucide-react';
import { ArenaChallenge } from '@/types/arena';
import usePyodide from '@/hooks/usePyodide';

const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log.bind(console) : () => {};

interface ArenaChallengeModalProps {
    challenge: ArenaChallenge | null;
    onClose: () => void;
    onComplete: (timeUsed: number, codeLength: number) => void;
    onFail?: () => void;
}

// 填空题挑战定义 - 扩充到25道题目
const FILL_IN_CHALLENGES: Record<string, {
    title: string;
    description: string;
    codeTemplate: string;
    expectedOutput: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    timeLimit: number;
}> = {
    // ===== 简单题 (10道) =====
    'easy_001': {
        title: '打印问候',
        description: '使用print函数打印"Hello"',
        codeTemplate: `# 知识点：print() 函数
# 格式：print("要打印的内容")

___("Hello")`,
        expectedOutput: 'Hello',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_002': {
        title: '简单加法',
        description: '计算 3 + 5 的结果并打印',
        codeTemplate: `# 知识点：加法运算
# 格式：a + b

result = 3 ___ 5
print(result)`,
        expectedOutput: '8',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_003': {
        title: '变量赋值',
        description: '给变量name赋值"Python"并打印',
        codeTemplate: `# 知识点：变量赋值
# 格式：变量名 = 值

name = "___"
print(name)`,
        expectedOutput: 'Python',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_004': {
        title: '简单乘法',
        description: '计算 4 × 6 的结果并打印',
        codeTemplate: `# 知识点：乘法运算
# 格式：a * b

result = 4 ___ 6
print(result)`,
        expectedOutput: '24',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_005': {
        title: '打印数字',
        description: '打印数字 100',
        codeTemplate: `# 知识点：print() 可以打印数字
# 格式：print(数字)

print(___)`,
        expectedOutput: '100',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_006': {
        title: '字符串长度',
        description: '计算字符串"Hello"的长度',
        codeTemplate: `# 知识点：len() 函数
# 格式：len(字符串)

text = "Hello"
length = ___(text)
print(length)`,
        expectedOutput: '5',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_007': {
        title: '简单减法',
        description: '计算 10 - 3 的结果',
        codeTemplate: `# 知识点：减法运算
# 格式：a - b

result = 10 ___ 3
print(result)`,
        expectedOutput: '7',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_008': {
        title: '类型转换',
        description: '将字符串"42"转换为整数并打印',
        codeTemplate: `# 知识点：int() 函数
# 格式：int(字符串)

num = ___("42")
print(num)`,
        expectedOutput: '42',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_009': {
        title: '布尔值',
        description: '打印 5 > 3 的结果',
        codeTemplate: `# 知识点：比较运算
# 格式：a > b 返回 True 或 False

result = 5 ___ 3
print(result)`,
        expectedOutput: 'True',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    'easy_010': {
        title: '简单除法',
        description: '计算 20 ÷ 4 的结果（整数除法）',
        codeTemplate: `# 知识点：整数除法
# 格式：a // b

result = 20 ___ 4
print(result)`,
        expectedOutput: '5',
        difficulty: 'easy',
        points: 100,
        timeLimit: 60
    },
    
    // ===== 中等题 (10道) =====
    'medium_001': {
        title: '画正方形',
        description: '使用循环打印一个5x5的正方形（用*表示）',
        codeTemplate: `# 知识点：for 循环
# 格式：for i in range(次数):

for i in range(___):
    print("*****")`,
        expectedOutput: '*****\n*****\n*****\n*****\n*****',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_002': {
        title: '计算总和',
        description: '计算1到10的总和（结果应该是55）',
        codeTemplate: `# 知识点：sum() 和 range()
# range(1, 11) 生成 1,2,3...10

total = sum(range(1, ___))
print(total)`,
        expectedOutput: '55',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_003': {
        title: '找最大值',
        description: '找出列表中的最大值',
        codeTemplate: `# 知识点：max() 函数
# max(列表) 返回最大值

numbers = [3, 7, 2, 9, 1, 5]
result = ___(numbers)
print(result)`,
        expectedOutput: '9',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_004': {
        title: '列表长度',
        description: '计算列表的元素个数',
        codeTemplate: `# 知识点：len() 函数
# len(列表) 返回元素个数

fruits = ["苹果", "香蕉", "橙子", "葡萄"]
count = ___(fruits)
print(count)`,
        expectedOutput: '4',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_005': {
        title: '字符串拼接',
        description: '拼接两个字符串',
        codeTemplate: `# 知识点：字符串拼接
# 格式：字符串1 + 字符串2

a = "Hello"
b = "World"
result = a ___ b
print(result)`,
        expectedOutput: 'HelloWorld',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_006': {
        title: '取余运算',
        description: '计算 17 除以 5 的余数',
        codeTemplate: `# 知识点：取余运算
# 格式：a % b

result = 17 ___ 5
print(result)`,
        expectedOutput: '2',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_007': {
        title: '列表求和',
        description: '计算列表所有元素的和',
        codeTemplate: `# 知识点：sum() 函数
# sum(列表) 返回所有元素的和

numbers = [10, 20, 30, 40]
total = ___(numbers)
print(total)`,
        expectedOutput: '100',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_008': {
        title: '找最小值',
        description: '找出列表中的最小值',
        codeTemplate: `# 知识点：min() 函数
# min(列表) 返回最小值

numbers = [8, 3, 6, 1, 9]
result = ___(numbers)
print(result)`,
        expectedOutput: '1',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_009': {
        title: '幂运算',
        description: '计算 2 的 10 次方',
        codeTemplate: `# 知识点：幂运算
# 格式：a ** b

result = 2 ___ 10
print(result)`,
        expectedOutput: '1024',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    'medium_010': {
        title: '列表排序',
        description: '对列表进行排序并打印',
        codeTemplate: `# 知识点：sorted() 函数
# sorted(列表) 返回排序后的新列表

numbers = [3, 1, 4, 1, 5, 9, 2, 6]
result = ___(numbers)
print(result)`,
        expectedOutput: '[1, 1, 2, 3, 4, 5, 6, 9]',
        difficulty: 'medium',
        points: 200,
        timeLimit: 60
    },
    
    // ===== 困难题 (5道) =====
    'hard_001': {
        title: '列表推导式',
        description: '生成1到5的平方列表 [1, 4, 9, 16, 25]',
        codeTemplate: `# 知识点：列表推导式
# 格式：[表达式 for 变量 in 范围]

squares = [x**2 for x in range(1, ___)]
print(squares)`,
        expectedOutput: '[1, 4, 9, 16, 25]',
        difficulty: 'hard',
        points: 300,
        timeLimit: 90
    },
    'hard_002': {
        title: '条件过滤',
        description: '筛选出列表中的偶数',
        codeTemplate: `# 知识点：列表推导式 + 条件
# 格式：[x for x in 列表 if 条件]

numbers = [1, 2, 3, 4, 5, 6, 7, 8]
evens = [x for x in numbers if x ___ 2 == 0]
print(evens)`,
        expectedOutput: '[2, 4, 6, 8]',
        difficulty: 'hard',
        points: 300,
        timeLimit: 90
    },
    'hard_003': {
        title: '字典操作',
        description: '获取字典中的值',
        codeTemplate: `# 知识点：字典取值
# 格式：字典.get(键, 默认值)

person = {"name": "小明", "age": 18}
age = person.___("age", 0)
print(age)`,
        expectedOutput: '18',
        difficulty: 'hard',
        points: 300,
        timeLimit: 90
    },
    'hard_004': {
        title: '字符串反转',
        description: '反转字符串"Python"',
        codeTemplate: `# 知识点：字符串切片
# 格式：字符串[::-1] 反转

text = "Python"
result = text[::___]
print(result)`,
        expectedOutput: 'nohtyP',
        difficulty: 'hard',
        points: 300,
        timeLimit: 90
    },
    'hard_005': {
        title: '计算阶乘',
        description: '计算5的阶乘（5! = 120）',
        codeTemplate: `# 知识点：循环累乘
# 5! = 1 × 2 × 3 × 4 × 5

result = 1
for i in range(1, ___):
    result = result * i
print(result)`,
        expectedOutput: '120',
        difficulty: 'hard',
        points: 300,
        timeLimit: 90
    }
};

// 随机获取一道题目
function getRandomChallenge(): string {
    const keys = Object.keys(FILL_IN_CHALLENGES);
    return keys[Math.floor(Math.random() * keys.length)];
}

export default function ArenaChallengeModal({ challenge, onClose, onComplete, onFail }: ArenaChallengeModalProps) {
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // 使用 Pyodide hook
    const { isReady, runCode: runPyodide, output: pyodideOutput } = usePyodide();

    // 存储当前随机选中的题目ID
    const [currentChallengeId, setCurrentChallengeId] = useState<string>('');
    
    useEffect(() => {
        if (challenge) {
            hasEndedRef.current = false;
            
            // 通知游戏禁用按键
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('modal-opened'));
            }

            // 随机选择一道题目
            const randomId = getRandomChallenge();
            setCurrentChallengeId(randomId);
            
            // 使用随机选中的填空题模板
            const fillInChallenge = FILL_IN_CHALLENGES[randomId];
            const initialCode = fillInChallenge?.codeTemplate || challenge.codeTemplate;

            setCode(initialCode);
            setOutput('');
            setTimeRemaining(fillInChallenge?.timeLimit || challenge.timeLimit);

            // Timer
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        if (!hasEndedRef.current) {
                            hasEndedRef.current = true;
                            // 先触发 modal-closed 事件
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('modal-closed'));
                            }
                            onFail?.();
                        }
                        setTimeout(() => onClose(), 0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('modal-closed'));
                }
            };
        }
    }, [challenge]);

    // 监听 Pyodide 输出变化
    useEffect(() => {
        if (pyodideOutput && pyodideOutput.length > 0 && isRunning) {
            const resultText = pyodideOutput.join('\n');
            checkResult(resultText);
        }
    }, [pyodideOutput]);

    if (!challenge) return null;
    
    // 使用随机选中的题目
    const fillInChallenge = FILL_IN_CHALLENGES[currentChallengeId] || FILL_IN_CHALLENGES[getRandomChallenge()];

    const checkResult = (resultText: string) => {
        const expectedOutput = fillInChallenge.expectedOutput;
        
        // 标准化输出进行比较
        const normalizedResult = resultText.trim().replace(/\r\n/g, '\n');
        const normalizedExpected = expectedOutput.trim().replace(/\r\n/g, '\n');
        
        debugLog('[ArenaChallengeModal] Result:', normalizedResult);
        debugLog('[ArenaChallengeModal] Expected:', normalizedExpected);
        
        const success = normalizedResult === normalizedExpected;
        
        if (success) {
            // 停止计时器
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            hasEndedRef.current = true;

            const timeUsed = (fillInChallenge.timeLimit || challenge.timeLimit) - timeRemaining;
            const codeLength = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).length;

            setOutput(resultText + '\n\n✅ 挑战成功！正在计算奖励...');
            setIsRunning(false);

            setTimeout(() => {
                // 先触发 modal-closed 事件，确保游戏恢复按键控制
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('modal-closed'));
                }
                
                // 然后通知完成
                onComplete(timeUsed, codeLength);
                
                // 最后关闭模态框（onComplete 内部会关闭）
            }, 500);
        } else {
            setOutput(resultText + '\n\n❌ 输出不正确，请检查代码！\n期望输出: ' + expectedOutput);
            setIsRunning(false);
        }
    };

    const handleRunCode = async () => {
        debugLog('[ArenaChallengeModal] handleRunCode called');
        
        // 检查是否还有未填写的空
        if (code.includes('___')) {
            setOutput('错误: 请先填写所有的空（将 ___ 替换为正确的值）');
            return;
        }

        setIsRunning(true);
        setOutput('正在运行代码...');

        if (isReady) {
            // 使用真实的 Pyodide 执行
            await runPyodide(code);
        } else {
            // Pyodide 未加载，使用简化验证
            setOutput('Python 环境加载中，请稍候...');
            setIsRunning(false);
        }
    };

    // 阻止按键事件冒泡到游戏
    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
    };

    const handleKeyUp = (e: React.KeyboardEvent) => {
        e.stopPropagation();
    };

    const difficultyColor = fillInChallenge.difficulty === 'easy' ? 'text-green-500'
        : fillInChallenge.difficulty === 'medium' ? 'text-yellow-500'
            : 'text-red-500';

    return (
        <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
        >
            <div className="bg-slate-800 backdrop-blur-md rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-300" />
                        <div>
                            <h2 className="text-xl font-bold text-white">{fillInChallenge.title}</h2>
                            <p className={`text-sm ${difficultyColor} font-semibold`}>
                                {fillInChallenge.difficulty.toUpperCase()} - {fillInChallenge.points}分
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-red-600/80 px-4 py-2 rounded-lg">
                            <Clock className="w-5 h-5 text-white" />
                            <span className="text-white font-bold text-lg">
                                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-2 rounded transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Description */}
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded p-4 mb-4">
                        <h3 className="text-cyan-400 font-semibold mb-2">📋 挑战目标</h3>
                        <p className="text-gray-300">{fillInChallenge.description}</p>
                    </div>

                    {/* Code Editor */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                代码编辑器
                            </h3>
                            <div className="h-64 border border-gray-600 rounded-lg overflow-hidden bg-gray-900">
                                <textarea
                                    ref={textareaRef}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onKeyUp={handleKeyUp}
                                    onKeyPress={(e) => e.stopPropagation()}
                                    className="w-full h-full bg-transparent text-green-400 font-mono text-sm p-4 resize-none outline-none"
                                    spellCheck={false}
                                    autoFocus
                                />
                            </div>
                            <p className="text-gray-500 text-xs mt-2">
                                💡 将 ___ 替换为正确的值来完成代码
                            </p>
                        </div>

                        {/* Output */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">📤 运行结果</h3>
                            <div className="h-64 bg-gray-900 border border-gray-600 rounded-lg p-4 font-mono text-sm overflow-y-auto">
                                <pre className={`whitespace-pre-wrap ${
                                    output.includes('✅') ? 'text-green-400' :
                                    output.includes('❌') || output.includes('Error') ? 'text-red-400' :
                                    'text-gray-300'
                                }`}>
                                    {output || '点击"运行代码"查看结果...'}
                                </pre>
                            </div>
                            <div className="mt-2 text-gray-500 text-xs">
                                期望输出: <code className="text-cyan-400">{fillInChallenge.expectedOutput.replace(/\n/g, '\\n')}</code>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm">
                            {!isReady ? '⏳ Python 环境加载中...' : '✅ Python 环境已就绪'}
                        </div>
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning || !isReady}
                            className="bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-500 text-white px-8 py-3 rounded-lg font-bold text-lg transition shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRunning ? '⏳ 运行中...' : '▶ 运行代码'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
