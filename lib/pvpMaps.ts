/**
 * PVP 地图配置
 * Requirements: 8.1, 8.2, 8.4
 */

import { Difficulty, Position } from '../types/pvp';

// ==================== 地图类型定义 ====================

export interface PvpPlatform {
    x: number;
    y: number;
    width: number;
    height: number;
    type?: 'normal' | 'moving' | 'breakable' | 'ice';
    movePath?: Position[]; // 移动平台的路径
}

export interface PvpObstacle {
    x: number;
    y: number;
    type: 'spike' | 'fire' | 'pit' | 'laser';
    width: number;
    height: number;
    damage: number;
}

export interface PvpEnemy {
    x: number;
    y: number;
    type: 'slime' | 'bat' | 'robot';
    hp: number;
    damage: number;
    speed: number;
    patrolPath?: Position[];
}

export interface PvpMovingPlatform {
    x: number;
    y: number;
    width: number;
    height: number;
    movePath: Position[];
    speed: number;
}

export interface PvpMap {
    id: string;
    name: string;
    difficulty: Difficulty;
    width: number;
    height: number;
    platforms: PvpPlatform[];
    spawnPoints: {
        player1: Position;
        player2: Position;
    };
    enemies: PvpEnemy[];
    obstacles: PvpObstacle[];
    movingPlatforms?: PvpMovingPlatform[];
}


// ==================== 预设地图配置 ====================

export const PVP_MAPS: PvpMap[] = [
    // 地图 1: 平原竞技场 (简单)
    {
        id: 'arena_plains',
        name: '平原竞技场',
        difficulty: 'easy',
        width: 1600,
        height: 600,
        platforms: [
            // 地面
            { x: 0, y: 550, width: 1600, height: 50 },
            // 中间平台
            { x: 700, y: 400, width: 200, height: 20 },
            // 左侧平台
            { x: 200, y: 450, width: 150, height: 20 },
            { x: 100, y: 350, width: 120, height: 20 },
            // 右侧平台
            { x: 1250, y: 450, width: 150, height: 20 },
            { x: 1380, y: 350, width: 120, height: 20 },
        ],
        spawnPoints: {
            player1: { x: 100, y: 500 },
            player2: { x: 1500, y: 500 },
        },
        enemies: [
            { x: 800, y: 350, type: 'slime', hp: 20, damage: 5, speed: 40, patrolPath: [{ x: 700, y: 350 }, { x: 900, y: 350 }] },
        ],
        obstacles: [],
    },

    // 地图 2: 火焰熔炉 (中等)
    {
        id: 'arena_fire',
        name: '火焰熔炉',
        difficulty: 'medium',
        width: 1800,
        height: 600,
        platforms: [
            // 地面（有间隙）
            { x: 0, y: 550, width: 400, height: 50 },
            { x: 500, y: 550, width: 800, height: 50 },
            { x: 1400, y: 550, width: 400, height: 50 },
            // 上层平台
            { x: 300, y: 400, width: 200, height: 20 },
            { x: 800, y: 350, width: 200, height: 20 },
            { x: 1300, y: 400, width: 200, height: 20 },
            // 最高平台
            { x: 750, y: 200, width: 300, height: 20 },
        ],
        spawnPoints: {
            player1: { x: 100, y: 500 },
            player2: { x: 1700, y: 500 },
        },
        enemies: [
            { x: 600, y: 500, type: 'slime', hp: 25, damage: 8, speed: 50, patrolPath: [{ x: 500, y: 500 }, { x: 800, y: 500 }] },
            { x: 1100, y: 500, type: 'slime', hp: 25, damage: 8, speed: 50, patrolPath: [{ x: 1000, y: 500 }, { x: 1300, y: 500 }] },
        ],
        obstacles: [
            { x: 420, y: 520, type: 'fire', width: 60, height: 30, damage: 15 },
            { x: 1320, y: 520, type: 'fire', width: 60, height: 30, damage: 15 },
            { x: 850, y: 170, type: 'spike', width: 100, height: 30, damage: 20 },
        ],
    },

    // 地图 3: 冰霜峡谷 (中等)
    {
        id: 'arena_ice',
        name: '冰霜峡谷',
        difficulty: 'medium',
        width: 1800,
        height: 600,
        platforms: [
            // 地面
            { x: 0, y: 550, width: 1800, height: 50 },
            // 冰面平台（滑动效果）
            { x: 200, y: 450, width: 200, height: 20, type: 'ice' },
            { x: 500, y: 350, width: 200, height: 20, type: 'ice' },
            { x: 800, y: 250, width: 200, height: 20 },
            { x: 1100, y: 350, width: 200, height: 20, type: 'ice' },
            { x: 1400, y: 450, width: 200, height: 20, type: 'ice' },
        ],
        spawnPoints: {
            player1: { x: 100, y: 500 },
            player2: { x: 1700, y: 500 },
        },
        enemies: [
            { x: 400, y: 400, type: 'bat', hp: 15, damage: 10, speed: 80, patrolPath: [{ x: 300, y: 400 }, { x: 500, y: 300 }] },
            { x: 1400, y: 400, type: 'bat', hp: 15, damage: 10, speed: 80, patrolPath: [{ x: 1300, y: 400 }, { x: 1500, y: 300 }] },
        ],
        obstacles: [
            { x: 700, y: 520, type: 'spike', width: 80, height: 30, damage: 15 },
            { x: 1000, y: 520, type: 'spike', width: 80, height: 30, damage: 15 },
        ],
    },

    // 地图 4: 机械工厂 (困难)
    {
        id: 'arena_factory',
        name: '机械工厂',
        difficulty: 'hard',
        width: 2000,
        height: 600,
        platforms: [
            // 地面（多段）
            { x: 0, y: 550, width: 300, height: 50 },
            { x: 400, y: 550, width: 400, height: 50 },
            { x: 900, y: 550, width: 200, height: 50 },
            { x: 1200, y: 550, width: 400, height: 50 },
            { x: 1700, y: 550, width: 300, height: 50 },
            // 多层平台
            { x: 150, y: 450, width: 150, height: 20 },
            { x: 400, y: 350, width: 150, height: 20 },
            { x: 650, y: 250, width: 150, height: 20 },
            { x: 900, y: 350, width: 200, height: 20 },
            { x: 1200, y: 250, width: 150, height: 20 },
            { x: 1450, y: 350, width: 150, height: 20 },
            { x: 1700, y: 450, width: 150, height: 20 },
        ],
        spawnPoints: {
            player1: { x: 100, y: 500 },
            player2: { x: 1900, y: 500 },
        },
        enemies: [
            { x: 500, y: 500, type: 'robot', hp: 40, damage: 12, speed: 60, patrolPath: [{ x: 400, y: 500 }, { x: 700, y: 500 }] },
            { x: 1000, y: 500, type: 'robot', hp: 40, damage: 12, speed: 60, patrolPath: [{ x: 900, y: 500 }, { x: 1100, y: 500 }] },
            { x: 1400, y: 500, type: 'robot', hp: 40, damage: 12, speed: 60, patrolPath: [{ x: 1200, y: 500 }, { x: 1600, y: 500 }] },
        ],
        obstacles: [
            { x: 320, y: 520, type: 'laser', width: 60, height: 30, damage: 25 },
            { x: 820, y: 520, type: 'pit', width: 60, height: 30, damage: 50 },
            { x: 1120, y: 520, type: 'laser', width: 60, height: 30, damage: 25 },
            { x: 1620, y: 520, type: 'pit', width: 60, height: 30, damage: 50 },
        ],
        movingPlatforms: [
            { x: 300, y: 300, width: 100, height: 20, movePath: [{ x: 300, y: 300 }, { x: 300, y: 450 }], speed: 80 },
            { x: 1600, y: 300, width: 100, height: 20, movePath: [{ x: 1600, y: 300 }, { x: 1600, y: 450 }], speed: 80 },
        ],
    },

    // 地图 5: 天空之城 (困难)
    {
        id: 'arena_sky',
        name: '天空之城',
        difficulty: 'hard',
        width: 2000,
        height: 700,
        platforms: [
            // 起始平台
            { x: 0, y: 600, width: 250, height: 50 },
            { x: 1750, y: 600, width: 250, height: 50 },
            // 浮空平台
            { x: 300, y: 500, width: 150, height: 20 },
            { x: 500, y: 400, width: 150, height: 20 },
            { x: 750, y: 300, width: 200, height: 20 },
            { x: 1000, y: 200, width: 200, height: 20 },
            { x: 1250, y: 300, width: 200, height: 20 },
            { x: 1350, y: 400, width: 150, height: 20 },
            { x: 1550, y: 500, width: 150, height: 20 },
            // 中央大平台
            { x: 850, y: 450, width: 300, height: 20 },
        ],
        spawnPoints: {
            player1: { x: 100, y: 550 },
            player2: { x: 1900, y: 550 },
        },
        enemies: [
            { x: 600, y: 350, type: 'bat', hp: 20, damage: 12, speed: 100, patrolPath: [{ x: 500, y: 350 }, { x: 700, y: 250 }] },
            { x: 1000, y: 150, type: 'bat', hp: 20, damage: 12, speed: 100, patrolPath: [{ x: 900, y: 150 }, { x: 1100, y: 150 }] },
            { x: 1400, y: 350, type: 'bat', hp: 20, damage: 12, speed: 100, patrolPath: [{ x: 1300, y: 350 }, { x: 1500, y: 250 }] },
            { x: 950, y: 400, type: 'robot', hp: 50, damage: 15, speed: 50, patrolPath: [{ x: 850, y: 400 }, { x: 1100, y: 400 }] },
        ],
        obstacles: [
            { x: 350, y: 470, type: 'spike', width: 50, height: 30, damage: 20 },
            { x: 1600, y: 470, type: 'spike', width: 50, height: 30, damage: 20 },
            { x: 950, y: 420, type: 'fire', width: 100, height: 30, damage: 20 },
        ],
        movingPlatforms: [
            { x: 200, y: 400, width: 80, height: 20, movePath: [{ x: 200, y: 400 }, { x: 350, y: 500 }], speed: 60 },
            { x: 1700, y: 400, width: 80, height: 20, movePath: [{ x: 1700, y: 400 }, { x: 1550, y: 500 }], speed: 60 },
        ],
    },
];


// ==================== 工具函数 ====================

/**
 * 获取所有 PVP 地图
 */
export function getAllPvpMaps(): PvpMap[] {
    return PVP_MAPS;
}

/**
 * 根据 ID 获取地图
 */
export function getPvpMapById(id: string): PvpMap | undefined {
    return PVP_MAPS.find(map => map.id === id);
}

/**
 * 根据难度获取地图
 */
export function getPvpMapsByDifficulty(difficulty: Difficulty): PvpMap[] {
    return PVP_MAPS.filter(map => map.difficulty === difficulty);
}

/**
 * 随机选择一个地图
 */
export function getRandomPvpMap(): PvpMap {
    const index = Math.floor(Math.random() * PVP_MAPS.length);
    return PVP_MAPS[index];
}

/**
 * 计算两个出生点之间的距离
 */
export function calculateSpawnDistance(map: PvpMap): number {
    const { player1, player2 } = map.spawnPoints;
    const dx = player2.x - player1.x;
    const dy = player2.y - player1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 验证地图配置是否有效
 */
export function isValidPvpMap(map: PvpMap): boolean {
    // 检查基本属性
    if (!map.id || !map.name || !map.difficulty) return false;
    if (map.width <= 0 || map.height <= 0) return false;
    
    // 检查出生点
    if (!map.spawnPoints || !map.spawnPoints.player1 || !map.spawnPoints.player2) return false;
    
    // 检查出生点在地图范围内
    const { player1, player2 } = map.spawnPoints;
    if (player1.x < 0 || player1.x > map.width || player1.y < 0 || player1.y > map.height) return false;
    if (player2.x < 0 || player2.x > map.width || player2.y < 0 || player2.y > map.height) return false;
    
    // 检查出生点距离（至少相隔地图宽度的 50%）
    const minDistance = map.width * 0.5;
    if (calculateSpawnDistance(map) < minDistance) return false;
    
    // 检查平台数组
    if (!Array.isArray(map.platforms) || map.platforms.length === 0) return false;
    
    return true;
}

/**
 * 获取地图的敌人数量（根据难度）
 */
export function getEnemyCountByDifficulty(difficulty: Difficulty): { min: number; max: number } {
    switch (difficulty) {
        case 'easy':
            return { min: 0, max: 2 };
        case 'medium':
            return { min: 2, max: 4 };
        case 'hard':
            return { min: 3, max: 6 };
        default:
            return { min: 0, max: 2 };
    }
}

/**
 * 获取地图的障碍物数量（根据难度）
 */
export function getObstacleCountByDifficulty(difficulty: Difficulty): { min: number; max: number } {
    switch (difficulty) {
        case 'easy':
            return { min: 0, max: 1 };
        case 'medium':
            return { min: 1, max: 3 };
        case 'hard':
            return { min: 2, max: 5 };
        default:
            return { min: 0, max: 1 };
    }
}

// 最小出生点距离常量（地图宽度的百分比）
export const MIN_SPAWN_DISTANCE_RATIO = 0.5;

// 地图池最小数量
export const MIN_MAP_POOL_SIZE = 5;
