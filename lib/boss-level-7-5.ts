// 🔥 战役7-5 双Boss关卡配置
// 第一阶段：小Boss "美食大厨"
// 第二阶段：大Boss "激光守卫" - 持续激光攻击 + 定身技能

import { CampaignLevel } from './campaigns';

// 7-5 双Boss关卡配置
export const level_7_5_config: CampaignLevel = {
  id: 'level_7_5',
  name: 'Boss：工业双雄',
  description: '击败两个Boss！先是美食大厨，然后是激光守卫！',
  story: '工业园区的核心区域！💻 这里有两个失控的AI守护者。第一个是"美食大厨"，击败它后，真正的威胁"激光守卫"才会现身！激光守卫拥有持续激光攻击和定身技能，小心应对！',
  campaignMapData: {
    startPosition: { x: 150, y: 1100 },
    width: 2800,  // 加大地图
    height: 1400,
    
    platforms: [
      { x: 0, y: 1350, width: 2800, type: 'ground' },
      // 左侧区域
      { x: 100, y: 1280, width: 200 },
      { x: 350, y: 1200, width: 180 },
      { x: 580, y: 1120, width: 160 },
      // 中央竞技场
      { x: 850, y: 1050, width: 300 },
      { x: 1200, y: 980, width: 400 },  // 中央大平台
      { x: 1650, y: 1050, width: 300 },
      // 右侧区域
      { x: 2000, y: 1120, width: 160 },
      { x: 2200, y: 1200, width: 180 },
      { x: 2450, y: 1280, width: 200 },
      // 高层平台
      { x: 400, y: 900, width: 150 },
      { x: 700, y: 800, width: 200 },
      { x: 1100, y: 750, width: 300 },  // 顶部中央
      { x: 1500, y: 800, width: 200 },
      { x: 1900, y: 900, width: 150 },
    ],
    
    // 移动平台
    movingPlatforms: [
      { startX: 300, endX: 300, startY: 1000, endY: 800, width: 80, speed: 60 },
      { startX: 600, endX: 800, startY: 950, endY: 950, width: 100, speed: 80 },
      { startX: 1800, endX: 2000, startY: 950, endY: 950, width: 100, speed: 80 },
      { startX: 2200, endX: 2200, startY: 1000, endY: 800, width: 80, speed: 60 },
    ],
    
    // 激光陷阱（第二阶段会激活更多）
    traps: [
      { x: 500, y: 1100, type: 'electric', damage: 25, pattern: 'periodic' },
      { x: 1000, y: 900, type: 'electric', damage: 25, pattern: 'periodic' },
      { x: 1500, y: 900, type: 'electric', damage: 25, pattern: 'periodic' },
      { x: 2000, y: 1100, type: 'electric', damage: 25, pattern: 'periodic' },
    ],
    
    // 第一个Boss
    enemies: [
      { x: 1400, y: 900, type: 'boss' }
    ],
    
    collectibles: [
      { x: 200, y: 1250, type: 'coin', value: 10 },
      { x: 500, y: 1080, type: 'gem', value: 30 },
      { x: 1200, y: 700, type: 'gem', value: 50 },
      { x: 1900, y: 1080, type: 'gem', value: 30 },
      { x: 2400, y: 1250, type: 'coin', value: 10 },
      // 🔥 v2.2.0: 血包收集物（一次性，有限数量）
      { x: 200, y: 1230, type: 'health_pack', value: 20 },   // 左侧血包
      { x: 2600, y: 1230, type: 'health_pack', value: 20 },  // 右侧血包
      { x: 1200, y: 920, type: 'health_pack', value: 15 },   // 中央平台血包
      { x: 500, y: 850, type: 'health_pack', value: 12 },    // 左高层血包
      { x: 1900, y: 850, type: 'health_pack', value: 12 },   // 右高层血包
      // 冲刺星星（逃命道具）
      { x: 350, y: 1150, type: 'dash_star', value: 50 },
      { x: 2250, y: 1150, type: 'dash_star', value: 50 },
      { x: 1200, y: 700, type: 'dash_star', value: 50 },
    ],
    
    // 🔥 v2.2.0: 移除治疗区，Boss战不再有无限回血
    // chemicalZones 已移除
    
    goal: { x: 1400, y: 900 }
  },
  // 双Boss配置
  bossConfig: {
    visualTheme: 'default',
          type: 'dual',  // 双Boss模式
    hp: 400,  // 第一个Boss的HP
    // 第一阶段Boss
    phase1Boss: {
      name: '美食大厨',
      hp: 400,
      attacks: ['projectile', 'summon'],
      attackInterval: 2500,
      moveSpeed: 120,
    },
    // 第二阶段Boss（击败第一个后出现）- 使用 secondBoss 字段名匹配 PlatformGameScene
    secondBoss: {
      name: '激光守卫',
      hp: 600,
      spawnDelay: 2000,  // 第一个Boss被击败后2秒生成
      spawnPosition: { x: 1400, y: 800 },  // 生成位置
      attacks: ['laser_continuous', 'stun', 'charge', 'projectile'],
      attackInterval: 2000,
      moveSpeed: 150,
      specialAbilities: {
        continuousLaser: true,      // 持续激光攻击
        stunPlayer: true,           // 定身玩家1-2秒
        smartAI: true,              // 智能AI（追击+逃跑）
        laserDuration: 4000,        // 激光持续4秒
        stunDuration: 1500,         // 定身1.5秒
        laserCooldown: 8000,        // 激光冷却8秒
        stunCooldown: 12000,        // 定身冷却12秒
      }
    },
    // 保留 phase2Boss 作为别名（兼容性）
    phase2Boss: {
      name: '激光守卫',
      hp: 600,
      attacks: ['laser_continuous', 'stun', 'charge', 'projectile'],
      attackInterval: 2000,
      moveSpeed: 150,
      specialAbilities: {
        continuousLaser: true,
        stunPlayer: true,
        smartAI: true,
        laserDuration: 4000,
        stunDuration: 1500,
      }
    },
    defeatCondition: 'combat'
  },
  objectives: [
    { type: 'defeat', target: 'boss', description: '击败美食大厨' },
    { type: 'defeat', target: 'boss2', description: '击败激光守卫' }
  ],
  questions: [
    { 
      id: 'q7_5_1', 
      type: 'choice', 
      question: '【AI知识】如何防止AI失控？', 
      options: ['设置安全约束', '给AI装炸弹', '不开发AI', '祈祷'], 
      answer: '设置安全约束', 
      difficulty: 3, 
      subject: 'logic',
      explanation: 'AI安全的关键是设置合理的约束和监控机制！'
    },
    { 
      id: 'q7_5_2', 
      type: 'choice', 
      question: '【趣味问答】打败AI后，程序员会说？😎', 
      options: ['我才是真正的智能', '重启大法好', '下次记得备份', '终于可以下班了'], 
      answer: '终于可以下班了', 
      difficulty: 1, 
      subject: 'general',
      explanation: '哈哈！程序员的终极目标：下班！😄'
    }
  ],
  rewards: { xp: 600, coins: 300, skills: ['time_slow'] }
};

// 激光守卫Boss的特殊技能配置
export const laserGuardSkills = {
  // 持续激光攻击
  continuousLaser: {
    damage: 15,           // 每次伤害
    tickInterval: 200,    // 伤害间隔(ms)
    duration: 4000,       // 持续时间
    width: 8,             // 激光宽度
    color: 0xff0000,      // 红色激光
    warningTime: 500,     // 预警时间
  },
  
  // 定身技能
  stunAbility: {
    duration: 1500,       // 定身1.5秒
    cooldown: 8000,       // 8秒冷却
    range: 300,           // 范围
    effectColor: 0x00ffff, // 青色效果
  },
  
  // 智能AI配置
  smartAI: {
    chaseRange: 600,      // 追击范围
    retreatHP: 0.3,       // 30%血量以下开始撤退
    aggressiveHP: 0.7,    // 70%血量以上主动进攻
    dodgeChance: 0.4,     // 40%闪避概率
  }
};
