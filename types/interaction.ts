/**
 * 宠物互动系统类型定义
 */

export type InteractionType = 'pat' | 'play' | 'talk' | 'train' | 'read' | 'paint' | 'chat' | 'bath';

export interface InteractionEffect {
  happiness?: number;      // 快乐值变化
  intimacy?: number;       // 亲密度变化
  energy?: number;         // 活力变化
  exp?: number;            // 经验值变化
  attributes?: {
    intelligence?: number;  // 智力变化
    creativity?: number;    // 创造力变化
    persistence?: number;   // 毅力变化
  };
}

export interface InteractionConfig {
  id: InteractionType;
  name: string;
  icon: string;
  cooldown: number;        // 冷却时间（秒）
  description: string;
  effects: InteractionEffect;
  animation?: string;      // 动画名称
  sound?: string;          // 音效文件
  dialogues?: string[];    // 随机对话
}

export interface InteractionLog {
  id: number;
  petId: number;
  interactionType: InteractionType;
  timestamp: string;
  effects: InteractionEffect;
}

// 互动冷却状态
export interface InteractionCooldown {
  interactionId: InteractionType;
  lastUsedAt: number;      // 上次使用时间戳
  cooldownEndsAt: number;  // 冷却结束时间戳
}

// 互动配置常量
export const INTERACTION_CONFIGS: Record<InteractionType, InteractionConfig> = {
  pat: {
    id: 'pat',
    name: '抚摸',
    icon: '👋',
    cooldown: 30,
    description: '轻轻抚摸宠物的头，它会很开心哦！',
    effects: {
      happiness: 5,
      intimacy: 3
    },
    sound: 'collect_gem.wav',
    dialogues: [
      '好舒服呀~ ❤️',
      '再摸摸我！😊',
      '我最喜欢你了！💕',
      '嘿嘿，好痒~ 😆',
      '继续继续！🥰'
    ]
  },
  
  play: {
    id: 'play',
    name: '玩耍',
    icon: '⚽',
    cooldown: 300,
    description: '和宠物玩游戏，增加快乐值和活力',
    effects: {
      happiness: 15,
      intimacy: 5,
      energy: 10,
      exp: 10,
      attributes: {
        persistence: 2
      }
    },
    sound: 'level_complete.wav',
    dialogues: [
      '太好玩了！🎉',
      '我们再玩一次吧！😄',
      '你真厉害！👏',
      '这个游戏好有趣！🎮',
      '我赢了！耶！🏆'
    ]
  },
  
  talk: {
    id: 'talk',
    name: '交流',
    icon: '💬',
    cooldown: 60,
    description: '和宠物聊聊天，增进感情',
    effects: {
      happiness: 8,
      intimacy: 5
    },
    sound: 'question_show.wav',
    dialogues: [
      '今天过得怎么样？😊',
      '我有好多话想跟你说！💭',
      '你知道吗？我今天学会了新技能！✨',
      '谢谢你一直陪着我！❤️',
      '我们是最好的朋友！🤝',
      '你今天看起来很开心呢！😄',
      '我想和你一起去冒险！🗺️'
    ]
  },
  
  train: {
    id: 'train',
    name: '训练',
    icon: '🎯',
    cooldown: 600,
    description: '训练宠物，提升各项属性',
    effects: {
      happiness: 10,
      intimacy: 8,
      exp: 20,
      attributes: {
        intelligence: 3,
        creativity: 2,
        persistence: 3
      }
    },
    sound: 'player_attack.wav',
    dialogues: [
      '我变强了！💪',
      '训练好累，但是很有成就感！😤',
      '我一定会更努力的！🔥',
      '感觉自己进步了！📈',
      '谢谢你教我这些！🙏',
      '我要成为最强的！⚡'
    ]
  },

  read: {
    id: 'read',
    name: '读书',
    icon: '📚',
    cooldown: 600,
    description: '一起读书，提升智力和经验',
    effects: {
      happiness: 10,
      intimacy: 8,
      exp: 20,
      attributes: {
        intelligence: 5
      }
    },
    sound: 'question_show.wav',
    dialogues: [
      '知识就是力量！📖',
      '学到了新东西！✨',
      '我喜欢读书！🤓',
      '继续学习吧！📚'
    ]
  },

  paint: {
    id: 'paint',
    name: '画画',
    icon: '🎨',
    cooldown: 600,
    description: '一起画画，提升创造力和经验',
    effects: {
      happiness: 12,
      intimacy: 8,
      exp: 20,
      attributes: {
        creativity: 5
      }
    },
    sound: 'level_complete.wav',
    dialogues: [
      '灵感爆发！🎨',
      '我的作品如何？🖼️',
      '画画真开心！😊',
      '一起创作吧！✨'
    ]
  },

  chat: {
    id: 'chat',
    name: '聊天',
    icon: '🗨️',
    cooldown: 60,
    description: '轻松聊天，增进感情',
    effects: {
      happiness: 8,
      intimacy: 5
    },
    sound: 'question_show.wav',
    dialogues: [
      '聊聊天真好～💬',
      '我有好多故事！📣',
      '你的想法很棒！👍',
      '继续聊吧！😊'
    ]
  },

  bath: {
    id: 'bath',
    name: '洗澡',
    icon: '🛁',
    cooldown: 3600,
    description: '洗个澡，干净又开心',
    effects: {
      happiness: 20,
      intimacy: 10,
      exp: 15
    },
    sound: 'pet_happy.wav',
    dialogues: [
      '洗完好清爽！🚿',
      '我香香的～🫧',
      '谢谢你帮我洗澡！😊'
    ]
  }
};

// 导出别名以保持向后兼容
export const INTERACTIONS = INTERACTION_CONFIGS;
