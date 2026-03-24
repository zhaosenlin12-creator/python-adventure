// 平台闯关游戏的关卡配置

export interface PlatformLevel {
    id: number;
    title: string;
    description: string;
    story: string; // 剧情文本
    difficulty: 'easy' | 'medium' | 'hard';
    
    // 关卡目标
    objectives: {
        type: 'reach' | 'collect' | 'defeat' | 'survive';
        description: string;
        target?: number; // 目标数量
    }[];
    
    // 地图配置
    map: {
        width: number;
        height: number;
        platforms: Platform[];
        obstacles: Obstacle[];
        enemies: Enemy[];
        collectibles: Collectible[];
        goalPosition: { x: number; y: number };
    };
    
    // 通关答题
    quiz: Quiz;
    
    // 奖励
    rewards: {
        exp: number;
        coins: number;
        items?: string[];
    };
}

export interface Platform {
    x: number;
    y: number;
    width: number;
    height: number;
    type?: 'normal' | 'moving' | 'breakable' | 'ice';
    movePath?: { x: number; y: number }[]; // 移动平台的路径
}

export interface Obstacle {
    x: number;
    y: number;
    type: 'spike' | 'fire' | 'pit' | 'laser';
    width: number;
    height: number;
    damage: number;
}

export interface Enemy {
    x: number;
    y: number;
    type: 'slime' | 'bat' | 'robot' | 'boss';
    hp: number;
    damage: number;
    speed: number;
    patrolPath?: { x: number; y: number }[];
}

export interface Collectible {
    x: number;
    y: number;
    type: 'coin' | 'gem' | 'key' | 'clue';
    value: number;
}

export interface Quiz {
    type: 'math' | 'coding' | 'logic';
    question: string;
    options?: string[]; // 选择题选项
    answer: string; // 正确答案
    hint?: string;
    timeLimit?: number; // 秒
}

// 关卡数据
export const PLATFORM_LEVELS: PlatformLevel[] = [
    {
        id: 1,
        title: '第一步',
        description: '学习基础移动和跳跃',
        story: '欢迎来到代码世界！这里的一切都由代码构成。你需要学会如何在这个世界中移动。',
        difficulty: 'easy',
        objectives: [
            {
                type: 'reach',
                description: '到达终点'
            }
        ],
        map: {
            width: 1200,
            height: 600,
            platforms: [
                { x: 0, y: 550, width: 1200, height: 50 }, // 地面
                { x: 200, y: 450, width: 150, height: 20 },
                { x: 450, y: 350, width: 150, height: 20 },
                { x: 700, y: 250, width: 150, height: 20 },
                { x: 950, y: 350, width: 150, height: 20 }
            ],
            obstacles: [],
            enemies: [],
            collectibles: [
                { x: 250, y: 420, type: 'coin', value: 10 },
                { x: 500, y: 320, type: 'coin', value: 10 },
                { x: 750, y: 220, type: 'coin', value: 10 }
            ],
            goalPosition: { x: 1000, y: 300 }
        },
        quiz: {
            type: 'math',
            question: '在编程中，1 + 1 等于多少？',
            options: ['1', '2', '11', '10'],
            answer: '2',
            hint: '这是最基础的数学运算'
        },
        rewards: {
            exp: 50,
            coins: 30
        }
    },
    {
        id: 2,
        title: '危险的道路',
        description: '学会躲避障碍物',
        story: '前方的道路充满了危险，小心那些尖刺！',
        difficulty: 'easy',
        objectives: [
            {
                type: 'reach',
                description: '安全到达终点'
            }
        ],
        map: {
            width: 1500,
            height: 600,
            platforms: [
                { x: 0, y: 550, width: 1500, height: 50 },
                { x: 200, y: 450, width: 200, height: 20 },
                { x: 500, y: 350, width: 200, height: 20 },
                { x: 800, y: 450, width: 200, height: 20 },
                { x: 1100, y: 350, width: 200, height: 20 }
            ],
            obstacles: [
                { x: 300, y: 520, type: 'spike', width: 40, height: 30, damage: 20 },
                { x: 600, y: 320, type: 'spike', width: 40, height: 30, damage: 20 },
                { x: 900, y: 420, type: 'spike', width: 40, height: 30, damage: 20 }
            ],
            enemies: [],
            collectibles: [
                { x: 300, y: 420, type: 'coin', value: 10 },
                { x: 600, y: 320, type: 'coin', value: 10 },
                { x: 900, y: 420, type: 'coin', value: 10 },
                { x: 1200, y: 320, type: 'gem', value: 50 }
            ],
            goalPosition: { x: 1250, y: 300 }
        },
        quiz: {
            type: 'coding',
            question: '在Python中，如何输出"Hello World"？',
            options: [
                'print("Hello World")',
                'echo "Hello World"',
                'console.log("Hello World")',
                'System.out.println("Hello World")'
            ],
            answer: 'print("Hello World")',
            hint: 'Python使用print函数'
        },
        rewards: {
            exp: 80,
            coins: 50
        }
    },
    {
        id: 3,
        title: '史莱姆入侵',
        description: '击败敌人并收集线索',
        story: '这里被史莱姆占领了！击败它们并找到隐藏的线索。',
        difficulty: 'medium',
        objectives: [
            {
                type: 'defeat',
                description: '击败所有史莱姆',
                target: 3
            },
            {
                type: 'collect',
                description: '收集线索',
                target: 1
            }
        ],
        map: {
            width: 1800,
            height: 600,
            platforms: [
                { x: 0, y: 550, width: 1800, height: 50 },
                { x: 200, y: 450, width: 150, height: 20 },
                { x: 450, y: 350, width: 150, height: 20 },
                { x: 700, y: 450, width: 150, height: 20 },
                { x: 950, y: 350, width: 150, height: 20 },
                { x: 1200, y: 450, width: 150, height: 20 },
                { x: 1500, y: 350, width: 200, height: 20 }
            ],
            obstacles: [
                { x: 550, y: 520, type: 'spike', width: 40, height: 30, damage: 20 },
                { x: 1050, y: 520, type: 'spike', width: 40, height: 30, damage: 20 }
            ],
            enemies: [
                { x: 400, y: 500, type: 'slime', hp: 30, damage: 10, speed: 50, patrolPath: [{ x: 300, y: 500 }, { x: 500, y: 500 }] },
                { x: 800, y: 400, type: 'slime', hp: 30, damage: 10, speed: 50, patrolPath: [{ x: 700, y: 400 }, { x: 900, y: 400 }] },
                { x: 1300, y: 400, type: 'slime', hp: 30, damage: 10, speed: 50, patrolPath: [{ x: 1200, y: 400 }, { x: 1400, y: 400 }] }
            ],
            collectibles: [
                { x: 250, y: 420, type: 'coin', value: 10 },
                { x: 500, y: 320, type: 'coin', value: 10 },
                { x: 750, y: 420, type: 'coin', value: 10 },
                { x: 1000, y: 320, type: 'coin', value: 10 },
                { x: 1550, y: 320, type: 'clue', value: 1 }
            ],
            goalPosition: { x: 1600, y: 300 }
        },
        quiz: {
            type: 'coding',
            question: '以下哪个是Python中的循环语句？',
            options: ['for', 'if', 'def', 'import'],
            answer: 'for',
            hint: '用于重复执行代码块'
        },
        rewards: {
            exp: 120,
            coins: 80,
            items: ['线索碎片1']
        }
    },
    {
        id: 4,
        title: '移动平台挑战',
        description: '掌握时机跳跃',
        story: '这里的平台在不停移动，需要精准的时机才能通过。',
        difficulty: 'medium',
        objectives: [
            {
                type: 'reach',
                description: '到达终点'
            }
        ],
        map: {
            width: 2000,
            height: 600,
            platforms: [
                { x: 0, y: 550, width: 300, height: 50 },
                { x: 1700, y: 550, width: 300, height: 50 },
                // 移动平台
                { 
                    x: 400, 
                    y: 450, 
                    width: 120, 
                    height: 20, 
                    type: 'moving',
                    movePath: [{ x: 400, y: 450 }, { x: 600, y: 450 }]
                },
                { 
                    x: 700, 
                    y: 350, 
                    width: 120, 
                    height: 20, 
                    type: 'moving',
                    movePath: [{ x: 700, y: 350 }, { x: 900, y: 350 }]
                },
                { 
                    x: 1000, 
                    y: 450, 
                    width: 120, 
                    height: 20, 
                    type: 'moving',
                    movePath: [{ x: 1000, y: 450 }, { x: 1200, y: 450 }]
                },
                { 
                    x: 1300, 
                    y: 350, 
                    width: 120, 
                    height: 20, 
                    type: 'moving',
                    movePath: [{ x: 1300, y: 350 }, { x: 1500, y: 350 }]
                }
            ],
            obstacles: [
                { x: 350, y: 520, type: 'pit', width: 100, height: 30, damage: 50 },
                { x: 650, y: 520, type: 'pit', width: 100, height: 30, damage: 50 },
                { x: 950, y: 520, type: 'pit', width: 100, height: 30, damage: 50 },
                { x: 1250, y: 520, type: 'pit', width: 100, height: 30, damage: 50 }
            ],
            enemies: [],
            collectibles: [
                { x: 450, y: 420, type: 'coin', value: 10 },
                { x: 750, y: 320, type: 'coin', value: 10 },
                { x: 1050, y: 420, type: 'coin', value: 10 },
                { x: 1350, y: 320, type: 'gem', value: 50 }
            ],
            goalPosition: { x: 1850, y: 500 }
        },
        quiz: {
            type: 'math',
            question: '如果一个函数每次调用自己时参数减1，初始值为5，调用多少次后参数变为0？',
            options: ['4', '5', '6', '无限'],
            answer: '5',
            hint: '这是递归的概念，从5到0需要经过5次'
        },
        rewards: {
            exp: 150,
            coins: 100
        }
    },
    {
        id: 5,
        title: 'Boss战：机器守卫',
        description: '击败强大的机器守卫',
        story: '前方出现了一个强大的机器守卫，它保护着重要的数据核心。准备好战斗吧！',
        difficulty: 'hard',
        objectives: [
            {
                type: 'defeat',
                description: '击败机器守卫',
                target: 1
            }
        ],
        map: {
            width: 1400,
            height: 600,
            platforms: [
                { x: 0, y: 550, width: 1400, height: 50 },
                { x: 200, y: 400, width: 150, height: 20 },
                { x: 500, y: 300, width: 150, height: 20 },
                { x: 800, y: 400, width: 150, height: 20 },
                { x: 1050, y: 300, width: 150, height: 20 }
            ],
            obstacles: [
                { x: 100, y: 520, type: 'fire', width: 60, height: 30, damage: 30 },
                { x: 1240, y: 520, type: 'fire', width: 60, height: 30, damage: 30 }
            ],
            enemies: [
                { 
                    x: 700, 
                    y: 450, 
                    type: 'boss', 
                    hp: 150, 
                    damage: 25, 
                    speed: 80,
                    patrolPath: [{ x: 400, y: 450 }, { x: 1000, y: 450 }]
                }
            ],
            collectibles: [
                { x: 250, y: 370, type: 'coin', value: 20 },
                { x: 550, y: 270, type: 'coin', value: 20 },
                { x: 850, y: 370, type: 'coin', value: 20 },
                { x: 1100, y: 270, type: 'gem', value: 100 }
            ],
            goalPosition: { x: 1200, y: 500 }
        },
        quiz: {
            type: 'coding',
            question: '以下哪个算法的时间复杂度最优？',
            options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(2ⁿ)'],
            answer: 'O(n)',
            hint: '线性时间复杂度是最优的'
        },
        rewards: {
            exp: 300,
            coins: 200,
            items: ['数据核心', '线索碎片2']
        }
    }
];

// 获取关卡
export function getPlatformLevel(id: number): PlatformLevel | undefined {
    return PLATFORM_LEVELS.find(level => level.id === id);
}

// 获取所有关卡
export function getAllPlatformLevels(): PlatformLevel[] {
    return PLATFORM_LEVELS;
}
