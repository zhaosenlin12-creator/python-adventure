// 技能系统配置

export interface Skill {
  id: string;
  name: string;
  nameCN: string;
  description: string;
  descriptionCN: string;
  icon: string;
  unlockCampaign: string; // 解锁该技能的战役ID
  type: 'movement' | 'combat' | 'utility';
  cooldown?: number; // 冷却时间（毫秒）
  energyCost?: number; // 能量消耗
  keyBinding?: string; // 快捷键
}

export const SKILLS: Record<string, Skill> = {
  // 基础技能
  double_jump: {
    id: 'double_jump',
    name: 'Double Jump',
    nameCN: '二段跳',
    description: 'Jump again while in the air',
    descriptionCN: '在空中可以再次跳跃',
    icon: '⬆️',
    unlockCampaign: 'campaign_1',
    type: 'movement',
    keyBinding: 'Space',
  },

  dash: {
    id: 'dash',
    name: 'Dash',
    nameCN: '冲刺',
    description: 'Quickly dash forward',
    descriptionCN: '快速向前冲刺一段距离',
    icon: '💨',
    unlockCampaign: 'campaign_1',
    type: 'movement',
    cooldown: 1000,
    keyBinding: 'Shift',
  },

  wall_jump: {
    id: 'wall_jump',
    name: 'Wall Jump',
    nameCN: '墙跳',
    description: 'Jump off walls',
    descriptionCN: '可以在墙壁上跳跃',
    icon: '🧱',
    unlockCampaign: 'campaign_2',
    type: 'movement',
  },

  // 进阶技能
  glide: {
    id: 'glide',
    name: 'Glide',
    nameCN: '滑翔',
    description: 'Hold jump to glide while falling',
    descriptionCN: '下落时按住跳跃键可以滑翔',
    icon: '🪂',
    unlockCampaign: 'campaign_3',
    type: 'movement',
  },

  ground_pound: {
    id: 'ground_pound',
    name: 'Ground Pound',
    nameCN: '地面猛击',
    description: 'Slam down from the air',
    descriptionCN: '在空中向下猛击，造成范围伤害',
    icon: '💥',
    unlockCampaign: 'campaign_4',
    type: 'combat',
    cooldown: 2000,
    keyBinding: 'S',
  },

  time_slow: {
    id: 'time_slow',
    name: 'Time Slow',
    nameCN: '时间减速',
    description: 'Slow down time briefly',
    descriptionCN: '短暂减缓时间流速',
    icon: '⏱️',
    unlockCampaign: 'campaign_5',
    type: 'utility',
    cooldown: 5000,
    energyCost: 30,
    keyBinding: 'Q',
  },

  // 高级技能
  teleport: {
    id: 'teleport',
    name: 'Teleport',
    nameCN: '传送',
    description: 'Instantly teleport to cursor position',
    descriptionCN: '瞬间移动到指定位置',
    icon: '✨',
    unlockCampaign: 'campaign_6',
    type: 'movement',
    cooldown: 3000,
    energyCost: 40,
    keyBinding: 'E',
  },

  clone: {
    id: 'clone',
    name: 'Clone',
    nameCN: '分身',
    description: 'Create a clone to help solve puzzles',
    descriptionCN: '创建一个分身协助解谜',
    icon: '👥',
    unlockCampaign: 'campaign_7',
    type: 'utility',
    cooldown: 10000,
    energyCost: 50,
    keyBinding: 'R',
  },

  gravity_flip: {
    id: 'gravity_flip',
    name: 'Gravity Flip',
    nameCN: '重力反转',
    description: 'Reverse gravity direction',
    descriptionCN: '反转重力方向',
    icon: '🔄',
    unlockCampaign: 'campaign_8',
    type: 'movement',
    cooldown: 4000,
    energyCost: 35,
    keyBinding: 'F',
  },

  // 战役9奖励技能
  chemical_shield: {
    id: 'chemical_shield',
    name: 'Chemical Shield',
    nameCN: '化学护盾',
    description: 'Create a protective shield that blocks chemical damage',
    descriptionCN: '创建化学护盾，短暂免疫酸液和毒气伤害',
    icon: '🛡️',
    unlockCampaign: 'campaign_9',
    type: 'utility',
    cooldown: 8000,
    energyCost: 45,
    keyBinding: 'G',
  },

  // 终极技能
  time_stop: {
    id: 'time_stop',
    name: 'Time Stop',
    nameCN: '时空停止',
    description: 'Completely stop time',
    descriptionCN: '完全停止时间',
    icon: '⏸️',
    unlockCampaign: 'campaign_10',
    type: 'utility',
    cooldown: 15000,
    energyCost: 80,
    keyBinding: 'T',
  },

  // 战役1奖励技能
  ancient_wisdom: {
    id: 'ancient_wisdom',
    name: 'Ancient Wisdom',
    nameCN: '古老智慧',
    description: 'Passive: +10% XP gain',
    descriptionCN: '被动：经验获取+10%',
    icon: '📜',
    unlockCampaign: 'campaign_1',
    type: 'utility',
  },

  // 战役2奖励技能
  school_star: {
    id: 'school_star',
    name: 'School Star',
    nameCN: '校园之星',
    description: 'Passive: +10% coins gain',
    descriptionCN: '被动：金币获取+10%',
    icon: '⭐',
    unlockCampaign: 'campaign_2',
    type: 'utility',
  },

  // 战役3奖励技能
  science_master: {
    id: 'science_master',
    name: 'Science Master',
    nameCN: '科学大师',
    description: 'Passive: Reduced skill cooldown',
    descriptionCN: '被动：技能冷却时间减少20%',
    icon: '🔬',
    unlockCampaign: 'campaign_3',
    type: 'utility',
  },

  // 战役4奖励技能
  academic_master: {
    id: 'academic_master',
    name: 'Academic Master',
    nameCN: '学术大师',
    description: 'Passive: +15% all stats',
    descriptionCN: '被动：所有属性+15%',
    icon: '🎓',
    unlockCampaign: 'campaign_4',
    type: 'utility',
  },
};

// 获取所有技能
export function getAllSkills(): Skill[] {
  return Object.values(SKILLS);
}

// 根据ID获取技能
export function getSkillById(id: string): Skill | undefined {
  return SKILLS[id];
}

// 获取已解锁的技能
export function getUnlockedSkills(completedCampaigns: string[], unlockedSkills: string[]): Skill[] {
  return getAllSkills().filter(skill => {
    // 检查战役是否完成
    const campaignCompleted = completedCampaigns.includes(skill.unlockCampaign);
    // 检查技能是否已解锁
    const skillUnlocked = unlockedSkills.includes(skill.id);
    return campaignCompleted || skillUnlocked;
  });
}

// 获取技能类型
export function getSkillsByType(type: Skill['type']): Skill[] {
  return getAllSkills().filter(skill => skill.type === type);
}

// 检查技能是否解锁
export function isSkillUnlocked(skillId: string, completedCampaigns: string[], unlockedSkills: string[]): boolean {
  const skill = getSkillById(skillId);
  if (!skill) return false;
  
  return completedCampaigns.includes(skill.unlockCampaign) || unlockedSkills.includes(skillId);
}

// 技能冷却管理器
export class SkillCooldownManager {
  private cooldowns: Map<string, number> = new Map();

  // 检查技能是否在冷却中
  isOnCooldown(skillId: string): boolean {
    const cooldownEnd = this.cooldowns.get(skillId);
    if (!cooldownEnd) return false;
    
    const now = Date.now();
    if (now >= cooldownEnd) {
      this.cooldowns.delete(skillId);
      return false;
    }
    return true;
  }

  // 获取剩余冷却时间
  getRemainingCooldown(skillId: string): number {
    const cooldownEnd = this.cooldowns.get(skillId);
    if (!cooldownEnd) return 0;
    
    const remaining = cooldownEnd - Date.now();
    return Math.max(0, remaining);
  }

  // 开始冷却
  startCooldown(skillId: string, duration: number): void {
    this.cooldowns.set(skillId, Date.now() + duration);
  }

  // 重置所有冷却
  resetAll(): void {
    this.cooldowns.clear();
  }

  // 重置特定技能冷却
  reset(skillId: string): void {
    this.cooldowns.delete(skillId);
  }
}

// 能量管理器
export class EnergyManager {
  private maxEnergy: number = 100;
  private currentEnergy: number = 100;
  private regenRate: number = 5; // 每秒恢复5点能量
  private lastUpdate: number = Date.now();

  constructor(maxEnergy: number = 100) {
    this.maxEnergy = maxEnergy;
    this.currentEnergy = maxEnergy;
  }

  // 更新能量（自动恢复）
  update(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // 转换为秒
    this.lastUpdate = now;

    // 自动恢复能量
    this.currentEnergy = Math.min(
      this.maxEnergy,
      this.currentEnergy + this.regenRate * deltaTime
    );
  }

  // 检查是否有足够能量
  hasEnergy(amount: number): boolean {
    return this.currentEnergy >= amount;
  }

  // 消耗能量
  consume(amount: number): boolean {
    if (!this.hasEnergy(amount)) return false;
    this.currentEnergy -= amount;
    return true;
  }

  // 获取当前能量
  getCurrent(): number {
    return this.currentEnergy;
  }

  // 获取最大能量
  getMax(): number {
    return this.maxEnergy;
  }

  // 获取能量百分比
  getPercentage(): number {
    return (this.currentEnergy / this.maxEnergy) * 100;
  }

  // 设置最大能量
  setMax(max: number): void {
    this.maxEnergy = max;
    this.currentEnergy = Math.min(this.currentEnergy, max);
  }

  // 恢复能量
  restore(amount: number): void {
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + amount);
  }

  // 完全恢复
  restoreFull(): void {
    this.currentEnergy = this.maxEnergy;
  }
}
