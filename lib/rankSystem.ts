// 🏆 段位系统 - 参考王者荣耀段位设计
// 根据经验值划分段位，每个段位有5个小段（星耀及以下）

export interface RankTier {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  bgColor: string;
  minScore: number;
  maxScore: number;
  divisions: number;  // 小段数量（5=V到I，1=无小段）
}

// 王者荣耀段位配置（从低到高）
// 🔥 经验值要求大幅提高，让升级更有挑战性
export const RANK_TIERS: RankTier[] = [
  {
    id: 'bronze',
    name: '倔强青铜',
    nameEn: 'Bronze',
    icon: '🥉',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/80',
    minScore: 0,
    maxScore: 999,        // 0-999 经验
    divisions: 3  // III, II, I
  },
  {
    id: 'silver',
    name: '秩序白银',
    nameEn: 'Silver',
    icon: '🥈',
    color: 'text-gray-300',
    bgColor: 'bg-gray-600/80',
    minScore: 1000,
    maxScore: 2999,       // 1000-2999 经验
    divisions: 3
  },
  {
    id: 'gold',
    name: '荣耀黄金',
    nameEn: 'Gold',
    icon: '🥇',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-700/80',
    minScore: 3000,
    maxScore: 5999,       // 3000-5999 经验
    divisions: 4  // IV, III, II, I
  },
  {
    id: 'platinum',
    name: '尊贵铂金',
    nameEn: 'Platinum',
    icon: '💎',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-800/80',
    minScore: 6000,
    maxScore: 9999,       // 6000-9999 经验
    divisions: 4
  },
  {
    id: 'emerald',
    name: '永恒钻石',
    nameEn: 'Diamond',
    icon: '💠',
    color: 'text-blue-300',
    bgColor: 'bg-blue-700/80',
    minScore: 10000,
    maxScore: 19999,      // 10000-19999 经验
    divisions: 5  // V, IV, III, II, I
  },
  {
    id: 'star',
    name: '至尊星耀',
    nameEn: 'Star',
    icon: '⭐',
    color: 'text-purple-300',
    bgColor: 'bg-purple-700/80',
    minScore: 20000,
    maxScore: 39999,      // 20000-39999 经验
    divisions: 5
  },
  {
    id: 'king',
    name: '最强王者',
    nameEn: 'King',
    icon: '👑',
    color: 'text-yellow-300',
    bgColor: 'bg-gradient-to-r from-yellow-600 to-orange-500',
    minScore: 40000,
    maxScore: 79999,      // 40000-79999 经验
    divisions: 1  // 王者无小段，显示星数
  },
  {
    id: 'glory_king',
    name: '荣耀王者',
    nameEn: 'Glory King',
    icon: '🏆',
    color: 'text-red-400',
    bgColor: 'bg-gradient-to-r from-red-600 to-orange-500',
    minScore: 80000,
    maxScore: 149999,     // 80000-149999 经验
    divisions: 1
  },
  {
    id: 'legend',
    name: '传奇王者',
    nameEn: 'Legend',
    icon: '🌟',
    color: 'text-pink-300',
    bgColor: 'bg-gradient-to-r from-pink-600 to-purple-600',
    minScore: 150000,
    maxScore: Infinity,   // 150000+ 经验
    divisions: 1
  }
];

// 段位信息接口
export interface RankInfo {
  tier: RankTier;
  division: number;  // 1-4，1是最高小段
  displayName: string;  // 如 "黄金 II"
  displayNameFull: string;  // 如 "黄金 II (2350分)"
  progress: number;  // 当前小段进度 0-100
  nextRankScore: number;  // 升到下一小段需要的分数
}

// 罗马数字转换
const toRoman = (num: number): string => {
  const romanNumerals: { [key: number]: string } = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V'
  };
  return romanNumerals[num] || '';
};

// 根据经验值获取段位信息
export function getRankInfo(score: number): RankInfo {
  // 找到对应的段位
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (score >= t.minScore && score <= t.maxScore) {
      tier = t;
      break;
    }
    if (score > t.maxScore) {
      tier = t;
    }
  }
  
  // 计算小段
  let division = 1;
  let progress = 0;
  let nextRankScore = tier.maxScore + 1;
  
  if (tier.divisions > 1) {
    const tierRange = tier.maxScore - tier.minScore + 1;
    const divisionRange = tierRange / tier.divisions;
    const scoreInTier = score - tier.minScore;
    
    // 小段从最高到最低（如V到I，或IV到I）
    division = tier.divisions - Math.floor(scoreInTier / divisionRange);
    if (division < 1) division = 1;
    if (division > tier.divisions) division = tier.divisions;
    
    // 计算当前小段进度
    const divisionStart = tier.minScore + (tier.divisions - division) * divisionRange;
    const divisionEnd = divisionStart + divisionRange;
    progress = Math.min(100, Math.floor(((score - divisionStart) / divisionRange) * 100));
    nextRankScore = Math.ceil(divisionEnd);
  } else {
    // 王者及以上段位 - 显示星数
    const tierIndex = RANK_TIERS.indexOf(tier);
    if (tierIndex < RANK_TIERS.length - 1) {
      nextRankScore = RANK_TIERS[tierIndex + 1].minScore;
      const tierRange = tier.maxScore - tier.minScore + 1;
      progress = Math.min(100, Math.floor(((score - tier.minScore) / tierRange) * 100));
    } else {
      // 传奇王者
      progress = 100;
      nextRankScore = score;
    }
    // 计算王者星数
    if (tier.id === 'king' || tier.id === 'glory_king' || tier.id === 'legend') {
      const starsPerTier = 50; // 每50经验一颗星
      division = Math.floor((score - tier.minScore) / starsPerTier) + 1;
    }
  }
  
  // 生成显示名称
  let displayName = tier.name;
  if (tier.divisions > 1) {
    displayName = `${tier.name} ${toRoman(division)}`;
  } else if (tier.id === 'king' || tier.id === 'glory_king' || tier.id === 'legend') {
    // 王者显示星数
    displayName = `${tier.name} ${division}星`;
  }
  const displayNameFull = `${displayName} (${score}经验)`;
  
  return {
    tier,
    division,
    displayName,
    displayNameFull,
    progress,
    nextRankScore
  };
}

// 获取段位徽章组件的样式
export function getRankBadgeStyle(tier: RankTier): string {
  return `${tier.bgColor} ${tier.color} px-2 py-1 rounded-lg text-xs font-bold`;
}

// 获取下一个段位
export function getNextRank(currentTier: RankTier): RankTier | null {
  const index = RANK_TIERS.indexOf(currentTier);
  if (index < RANK_TIERS.length - 1) {
    return RANK_TIERS[index + 1];
  }
  return null;
}

// 计算升段所需积分
export function getScoreToNextTier(score: number): number {
  const rankInfo = getRankInfo(score);
  return Math.max(0, rankInfo.nextRankScore - score);
}


// 🎮 奖励平衡配置
// 将所有奖励减少约 30-40%，让升级更有成就感
export const REWARD_BALANCE = {
  // XP 倍率（0.65 = 减少35%）
  xpMultiplier: 0.65,
  // 金币倍率（0.7 = 减少30%）
  coinsMultiplier: 0.7,
  // 积分倍率（0.6 = 减少40%）
  scoreMultiplier: 0.6
};

// 应用平衡后的奖励计算
export function balanceXP(amount: number): number {
  return Math.floor(amount * REWARD_BALANCE.xpMultiplier);
}

export function balanceCoins(amount: number): number {
  return Math.floor(amount * REWARD_BALANCE.coinsMultiplier);
}

export function balanceScore(amount: number): number {
  return Math.floor(amount * REWARD_BALANCE.scoreMultiplier);
}
