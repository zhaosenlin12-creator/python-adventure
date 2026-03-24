// 🔥 激光守卫Boss - 第二阶段Boss的技能和AI逻辑
// 用于战役7-5的第二个Boss

export interface LaserGuardState {
  isActive: boolean;
  hp: number;
  maxHP: number;
  phase: number;
  lastLaserTime: number;
  lastStunTime: number;
  lastChargeTime: number;
  isRetreating: boolean;
  retreatEndTime: number;
  laserActive: boolean;
  stunActive: boolean;
}

export const createLaserGuardState = (): LaserGuardState => ({
  isActive: false,
  hp: 600,
  maxHP: 600,
  phase: 1,
  lastLaserTime: 0,
  lastStunTime: 0,
  lastChargeTime: 0,
  isRetreating: false,
  retreatEndTime: 0,
  laserActive: false,
  stunActive: false,
});

// 激光守卫的技能配置
export const LASER_GUARD_CONFIG = {
  // 基础属性
  name: '⚡ 激光守卫',
  color: 0xff4500,
  size: 80,
  
  // 持续激光
  laser: {
    damage: 12,
    duration: 4000,
    cooldown: 6000,
    width: 6,
    length: 500,
    color: 0xff0000,
    warningColor: 0xffff00,
    warningDuration: 800,
  },
  
  // 定身技能
  stun: {
    duration: 1500,
    cooldown: 10000,
    range: 250,
    effectColor: 0x00ffff,
  },
  
  // 冲锋攻击
  charge: {
    speed: 400,
    damage: 30,
    cooldown: 8000,
    distance: 400,
  },
  
  // AI行为
  ai: {
    chaseRange: 600,
    attackRange: 400,
    retreatHPPercent: 0.25,
    aggressiveHPPercent: 0.6,
    baseSpeed: 140,
    retreatSpeed: 180,
  },
  
  // 阶段配置
  phases: [
    { hpPercent: 1.0, speedMultiplier: 1.0, attackCooldownMultiplier: 1.0 },
    { hpPercent: 0.6, speedMultiplier: 1.3, attackCooldownMultiplier: 0.8 },
    { hpPercent: 0.3, speedMultiplier: 1.6, attackCooldownMultiplier: 0.6 },
  ]
};

// 计算当前阶段
export const getLaserGuardPhase = (state: LaserGuardState): number => {
  const hpPercent = state.hp / state.maxHP;
  if (hpPercent <= 0.3) return 3;
  if (hpPercent <= 0.6) return 2;
  return 1;
};

// 获取阶段配置
export const getPhaseConfig = (phase: number) => {
  return LASER_GUARD_CONFIG.phases[phase - 1] || LASER_GUARD_CONFIG.phases[0];
};
