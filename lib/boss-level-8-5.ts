// 🔥🔥🔥 战役8-5 双Boss关卡配置 🔥🔥🔥
// 第一阶段：小Boss "分子怪博士" - 召唤分子怪 + 毒气攻击
// 第二阶段：大Boss "量子核心" - 传送门攻击 + 重力翻转 + 激光

import { CampaignLevel } from './campaigns';

// 8-5 双Boss关卡配置
export const level_8_5_config: CampaignLevel = {
  id: 'level_8_5',
  name: 'Boss：量子双雄',
  description: '击败两个Boss！先是分子怪博士，然后是量子核心！',
  story: '量子实验室的核心区域！🔬 疯狂的化学博士和他创造的量子核心正在等待你！第一个Boss"分子怪博士"会释放毒气和召唤分子怪。击败他后，真正的威胁"量子核心"才会现身！量子核心拥有传送门攻击、重力翻转和激光扫射！💡提示：利用传送门躲避攻击，在治疗区恢复HP！',
  campaignMapData: {
    startPosition: { x: 150, y: 1100 },
    width: 3200,
    height: 1400,
    
    platforms: [
      // 地面
      { x: 0, y: 1350, width: 3200, type: 'ground' },
      
      // ===== 左侧区域 =====
      { x: 100, y: 1250, width: 200 },
      { x: 350, y: 1150, width: 180 },
      { x: 150, y: 1000, width: 150 },
      { x: 400, y: 900, width: 150 },
      
      // ===== 中央竞技场 =====
      { x: 700, y: 1100, width: 250 },
      { x: 1000, y: 1000, width: 350 },
      { x: 1400, y: 1000, width: 350 },
      { x: 1800, y: 1100, width: 250 },
      
      // ===== 右侧区域 =====
      { x: 2100, y: 1250, width: 200 },
      { x: 2350, y: 1150, width: 180 },
      { x: 2550, y: 1000, width: 150 },
      { x: 2800, y: 900, width: 150 },
      
      // ===== 高层平台 =====
      { x: 300, y: 750, width: 150 },
      { x: 550, y: 650, width: 200 },
      { x: 900, y: 600, width: 250 },
      { x: 1250, y: 550, width: 300 },  // 顶部中央
      { x: 1650, y: 600, width: 250 },
      { x: 2000, y: 650, width: 200 },
      { x: 2300, y: 750, width: 150 },
      
      // ===== 顶层小平台 =====
      { x: 1100, y: 400, width: 120 },
      { x: 1350, y: 350, width: 150 },  // 最高点
      { x: 1600, y: 400, width: 120 }
    ],
    
    // 移动平台
    movingPlatforms: [
      // 左侧垂直移动
      { startX: 250, endX: 250, startY: 1050, endY: 800, width: 100, speed: 70 },
      // 左中水平移动
      { startX: 600, endX: 850, startY: 850, endY: 850, width: 100, speed: 90 },
      // 右中水平移动
      { startX: 1850, endX: 2100, startY: 850, endY: 850, width: 100, speed: 90 },
      // 右侧垂直移动
      { startX: 2450, endX: 2450, startY: 1050, endY: 800, width: 100, speed: 70 },
      // 顶部水平移动
      { startX: 1200, endX: 1500, startY: 480, endY: 480, width: 80, speed: 100 }
    ],
    
    // 🔥 传送门（逃跑和战术用）
    portals: [
      // 左右快速传送
      { id: 'portal_1a', x: 200, y: 950, color: 'blue', linkedTo: 'portal_1b' },
      { id: 'portal_1b', x: 2900, y: 950, color: 'orange', linkedTo: 'portal_1a' },
      // 上下快速传送
      { id: 'portal_2a', x: 600, y: 600, color: 'green', linkedTo: 'portal_2b' },
      { id: 'portal_2b', x: 2100, y: 600, color: 'purple', linkedTo: 'portal_2a' },
      // 顶部传送
      { id: 'portal_3a', x: 1150, y: 350, color: 'blue', linkedTo: 'portal_3b' },
      { id: 'portal_3b', x: 1650, y: 350, color: 'orange', linkedTo: 'portal_3a' }
    ],
    
    // 🔥 化学区域
    chemicalZones: [
      // 治疗区（左右两侧 - 重要！）
      { x: 100, y: 1050, width: 200, height: 200, type: 'heal', healAmount: 5, color: 0x00ff00 },
      { x: 2900, y: 1050, width: 200, height: 200, type: 'heal', healAmount: 5, color: 0x00ff00 },
      // 中央加速区
      { x: 1200, y: 800, width: 400, height: 200, type: 'speed', speedBoost: 1.4, color: 0x00bfff }
    ],
    
    // 🔥 重力翻转区域（第二阶段Boss会激活更多）
    gravityZones: [
      // 顶部区域（战术用）
      { x: 1050, y: 300, width: 700, height: 250, gravityMultiplier: -1 }
    ],
    
    // 第一个Boss
    enemies: [
      { x: 1400, y: 900, type: 'boss' }
    ],
    
    collectibles: [
      { x: 200, y: 1200, type: 'coin', value: 10 },
      { x: 500, y: 1100, type: 'gem', value: 30 },
      { x: 1000, y: 550, type: 'gem', value: 50 },
      { x: 1400, y: 300, type: 'gem', value: 60 },
      { x: 1800, y: 550, type: 'gem', value: 50 },
      { x: 2200, y: 1100, type: 'gem', value: 30 },
      { x: 2700, y: 1200, type: 'coin', value: 10 },
      // 冲刺星星（关键道具！）
      { x: 400, y: 850, type: 'dash_star', value: 50 },
      { x: 2400, y: 850, type: 'dash_star', value: 50 }
    ],
    
    goal: { x: 1400, y: 900 }
  },
  
  // 🔥🔥🔥 双Boss配置 🔥🔥🔥
  bossConfig: {
    type: 'dual',  // 双Boss模式
    
    // ===== 第一阶段Boss：分子怪博士 =====
    hp: 450,  // 第一个Boss血量
    phases: [
      {
        hp: 450,
        attacks: ['projectile', 'poison_cloud'],
        attackInterval: 2500,
        moveSpeed: 100,
        summonMinions: false
      },
      {
        hp: 250,
        attacks: ['projectile', 'poison_cloud', 'summon'],
        attackInterval: 2000,
        moveSpeed: 130,
        summonMinions: true
      },
      {
        hp: 100,
        attacks: ['projectile', 'poison_cloud', 'acid_spray', 'summon'],
        attackInterval: 1500,
        moveSpeed: 160,
        summonMinions: true
      }
    ],
    specialAbilities: {
      poisonCloud: true,
      acidSpray: true,
      summonMolecules: true
    },
    
    // ===== 第二阶段Boss：量子核心 =====
    secondBoss: {
      name: '量子核心',
      hp: 700,
      spawnDelay: 2500,  // 第一个Boss死后2.5秒出现
      spawnPosition: { x: 1400, y: 400 },
      attacks: ['laser_continuous', 'portal_attack', 'gravity_pulse', 'projectile', 'stun'],
      attackInterval: 1800,
      moveSpeed: 160,
      specialAbilities: {
        // 持续激光攻击
        continuousLaser: true,
        laserDuration: 3500,
        laserCooldown: 5000,
        // 传送门攻击（在玩家附近生成传送门陷阱）
        portalAttack: true,
        portalDamage: 25,
        portalCooldown: 8000,
        // 重力脉冲（短暂翻转玩家重力）
        gravityPulse: true,
        gravityDuration: 2000,
        gravityCooldown: 12000,
        // 定身技能
        stunPlayer: true,
        stunDuration: 1200,
        stunCooldown: 10000,
        // 智能AI
        smartAI: true,
        // 阶段强化
        phaseEnhance: true
      },
      // 量子核心的阶段配置
      phases: [
        { hpPercent: 1.0, speedMultiplier: 1.0, attackCooldownMultiplier: 1.0, color: 0x00ffff },
        { hpPercent: 0.6, speedMultiplier: 1.3, attackCooldownMultiplier: 0.85, color: 0xff00ff },
        { hpPercent: 0.3, speedMultiplier: 1.6, attackCooldownMultiplier: 0.7, color: 0xff0000 }
      ]
    },
    
    defeatCondition: 'combat'
  },
  
  objectives: [
    { type: 'defeat', target: 'boss', description: '击败分子怪博士' },
    { type: 'defeat', target: 'boss2', description: '击败量子核心' }
  ],
  
  questions: [
    { 
      id: 'q8_5_1', 
      type: 'choice', 
      question: '【量子知识】量子纠缠的特点是什么？🔬', 
      options: ['粒子会物理连接', '测量一个粒子会瞬间影响另一个', '粒子会发光', '粒子会爆炸'], 
      answer: '测量一个粒子会瞬间影响另一个', 
      difficulty: 3, 
      subject: 'physics',
      explanation: '量子纠缠是量子力学中最神奇的现象！两个纠缠的粒子，无论相距多远，对其中一个的测量会瞬间影响另一个的状态。爱因斯坦称之为"幽灵般的超距作用"！'
    },
    { 
      id: 'q8_5_2', 
      type: 'choice', 
      question: '【趣味问答】量子计算机最擅长什么？💻', 
      options: ['玩游戏', '并行计算和破解密码', '上网冲浪', '播放视频'], 
      answer: '并行计算和破解密码', 
      difficulty: 2, 
      subject: 'programming',
      explanation: '量子计算机利用量子叠加态可以同时处理大量计算！它特别擅长因数分解（破解RSA加密）和搜索问题。不过目前还在发展中，暂时还不能用来玩游戏😄'
    }
  ],
  
  rewards: { xp: 700, coins: 350, skills: ['quantum_dash'] }
};

// 🔥 分子怪博士的技能配置
export const moleculeDoctorSkills = {
  // 毒气云
  poisonCloud: {
    damage: 8,
    duration: 3500,
    radius: 180,
    cooldown: 7000,
    color: 0x9932cc,
    warningTime: 600
  },
  
  // 酸液喷射
  acidSpray: {
    damage: 22,
    range: 350,
    cooldown: 5000,
    color: 0x00ff00,
    spreadAngle: 30
  },
  
  // 召唤分子怪
  summonMolecules: {
    count: 3,
    hp: 35,
    damage: 10,
    cooldown: 10000,
    spawnRadius: 200
  }
};

// 🔥 量子核心的技能配置
export const quantumCoreSkills = {
  // 持续激光攻击
  continuousLaser: {
    damage: 14,
    tickInterval: 180,
    duration: 3500,
    width: 10,
    color: 0x00ffff,
    warningColor: 0xffff00,
    warningDuration: 700,
    rotationSpeed: 0.8  // 激光会旋转！
  },
  
  // 传送门攻击（在玩家位置生成传送门陷阱）
  portalAttack: {
    damage: 25,
    portalDuration: 2000,
    cooldown: 8000,
    warningTime: 800,
    portalColor: 0xff00ff,
    pullStrength: 200  // 传送门会吸引玩家
  },
  
  // 重力脉冲（翻转玩家重力）
  gravityPulse: {
    duration: 2000,
    cooldown: 12000,
    range: 500,
    effectColor: 0x9900ff,
    warningTime: 500
  },
  
  // 定身技能
  stunAbility: {
    duration: 1200,
    cooldown: 10000,
    range: 280,
    effectColor: 0x00ffff
  },
  
  // 智能AI配置
  smartAI: {
    chaseRange: 700,
    retreatHP: 0.25,
    aggressiveHP: 0.65,
    dodgeChance: 0.45,
    teleportChance: 0.2  // 20%概率传送躲避攻击
  },
  
  // 阶段配置
  phases: [
    { 
      hpPercent: 1.0, 
      speedMultiplier: 1.0, 
      attackCooldownMultiplier: 1.0,
      color: 0x00ffff,
      abilities: ['laser', 'projectile']
    },
    { 
      hpPercent: 0.6, 
      speedMultiplier: 1.3, 
      attackCooldownMultiplier: 0.85,
      color: 0xff00ff,
      abilities: ['laser', 'projectile', 'portal_attack', 'stun']
    },
    { 
      hpPercent: 0.3, 
      speedMultiplier: 1.6, 
      attackCooldownMultiplier: 0.7,
      color: 0xff0000,
      abilities: ['laser', 'projectile', 'portal_attack', 'gravity_pulse', 'stun']
    }
  ]
};

// 🔥 量子核心状态接口
export interface QuantumCoreState {
  isActive: boolean;
  hp: number;
  maxHP: number;
  phase: number;
  lastLaserTime: number;
  lastPortalTime: number;
  lastGravityTime: number;
  lastStunTime: number;
  laserActive: boolean;
  laserAngle: number;
  portalTrapActive: boolean;
  gravityPulseActive: boolean;
}

// 创建量子核心初始状态
export const createQuantumCoreState = (): QuantumCoreState => ({
  isActive: false,
  hp: 700,
  maxHP: 700,
  phase: 1,
  lastLaserTime: 0,
  lastPortalTime: 0,
  lastGravityTime: 0,
  lastStunTime: 0,
  laserActive: false,
  laserAngle: 0,
  portalTrapActive: false,
  gravityPulseActive: false
});

// 计算量子核心当前阶段
export const getQuantumCorePhase = (state: QuantumCoreState): number => {
  const hpPercent = state.hp / state.maxHP;
  if (hpPercent <= 0.3) return 3;
  if (hpPercent <= 0.6) return 2;
  return 1;
};
