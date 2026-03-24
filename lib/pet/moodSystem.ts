/**
 * 🎭 宠物情绪状态机
 * 
 * 根据用户行为事件自动触发宠物情绪变化，支持：
 * - 优先级覆盖（高优先级事件覆盖低优先级）
 * - 定时自动回归 normal
 * - 闲置检测（长时间无互动触发 curious/tired）
 * - 与 petStore 解耦，通过回调通知
 */

import { PetMood } from '@/types/pet';

// 重新导出供外部使用
export type { PetMood };

export interface MoodTrigger {
  event: string;
  mood: PetMood;
  duration: number;   // 持续时间(ms)，0 = 永久直到下一个事件
  priority: number;   // 优先级 (1-10)，高优先级覆盖低优先级
}

/**
 * 预定义的情绪触发规则
 */
export const MOOD_TRIGGERS: MoodTrigger[] = [
  // 高优先级 - 关键游戏事件
  { event: 'level_complete',       mood: 'excited',  duration: 5000,  priority: 10 },
  { event: 'evolution_complete',   mood: 'excited',  duration: 8000,  priority: 10 },
  { event: 'level_failed',        mood: 'sad',      duration: 4000,  priority: 9 },
  { event: 'pet_rescued',         mood: 'happy',    duration: 5000,  priority: 9 },

  // 中优先级 - 互动事件
  { event: 'pet_pat',             mood: 'happy',    duration: 4000,  priority: 7 },
  { event: 'pet_play',            mood: 'playing',  duration: 5000,  priority: 7 },
  { event: 'pet_talk',            mood: 'happy',    duration: 4000,  priority: 7 },
  { event: 'pet_train',           mood: 'excited',  duration: 3000,  priority: 7 },
  { event: 'pet_feed',            mood: 'eating',   duration: 3000,  priority: 7 },
  { event: 'pet_interact',        mood: 'happy',    duration: 4000,  priority: 7 },

  // 低优先级 - 获得奖励
  { event: 'reward_received',     mood: 'happy',    duration: 3000,  priority: 5 },
  { event: 'coin_earned',         mood: 'happy',    duration: 2000,  priority: 4 },

  // 状态变化
  { event: 'hp_low',              mood: 'tired',    duration: 0,     priority: 6 },
  { event: 'hp_critical',         mood: 'coma',     duration: 0,     priority: 8 },

  // 闲置检测 (由外部定时器触发)
  { event: 'idle_5min',           mood: 'curious',  duration: 6000,  priority: 2 },
  { event: 'idle_30min',          mood: 'tired',    duration: 0,     priority: 3 },
  { event: 'idle_sleep',          mood: 'sleeping', duration: 0,     priority: 3 },

  // 场景变化
  { event: 'enter_pet_home',      mood: 'happy',    duration: 3000,  priority: 4 },
  { event: 'start_coding',        mood: 'normal',   duration: 0,     priority: 2 },
];

export class PetMoodSystem {
  private currentMood: PetMood = 'normal';
  private currentPriority: number = 0;
  private moodTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInteractionTime: number = Date.now();
  private onMoodChange?: (mood: PetMood) => void;
  private destroyed = false;

  // 闲置检测阈值
  private readonly IDLE_CURIOUS_MS = 5 * 60 * 1000;   // 5分钟
  private readonly IDLE_TIRED_MS = 30 * 60 * 1000;     // 30分钟
  private readonly IDLE_SLEEP_MS = 60 * 60 * 1000;     // 1小时
  private readonly IDLE_CHECK_INTERVAL = 60 * 1000;     // 每分钟检查一次

  constructor(onMoodChange?: (mood: PetMood) => void) {
    this.onMoodChange = onMoodChange;
    this.startIdleDetection();
  }

  /**
   * 触发情绪事件
   */
  triggerMood(eventName: string) {
    if (this.destroyed) return;

    const trigger = MOOD_TRIGGERS.find(t => t.event === eventName);
    if (!trigger) {
      console.warn(`[MoodSystem] Unknown event: ${String(eventName).slice(0, 50)}`);
      return;
    }

    // 更新最后互动时间（非闲置事件）
    if (!eventName.startsWith('idle_')) {
      this.lastInteractionTime = Date.now();
    }

    // 优先级检查：只有更高或相同优先级才能覆盖
    if (trigger.priority < this.currentPriority && this.currentMood !== 'normal') {
      return;
    }

    // 清除之前的定时器
    if (this.moodTimer) {
      clearTimeout(this.moodTimer);
      this.moodTimer = null;
    }

    // 设置新心情
    this.currentMood = trigger.mood;
    this.currentPriority = trigger.priority;
    this.onMoodChange?.(trigger.mood);

    // 如果有持续时间，定时恢复 normal
    if (trigger.duration > 0) {
      this.moodTimer = setTimeout(() => {
        if (this.destroyed) return;
        this.currentMood = 'normal';
        this.currentPriority = 0;
        this.onMoodChange?.('normal');
      }, trigger.duration);
    }
  }

  /**
   * 直接设置情绪（绕过优先级检查）
   */
  setMood(mood: PetMood, duration: number = 0) {
    if (this.destroyed) return;

    if (this.moodTimer) {
      clearTimeout(this.moodTimer);
      this.moodTimer = null;
    }

    this.currentMood = mood;
    this.currentPriority = 0;
    this.onMoodChange?.(mood);

    if (duration > 0) {
      this.moodTimer = setTimeout(() => {
        if (this.destroyed) return;
        this.currentMood = 'normal';
        this.currentPriority = 0;
        this.onMoodChange?.('normal');
      }, duration);
    }
  }

  /**
   * 获取当前情绪
   */
  getCurrentMood(): PetMood {
    return this.currentMood;
  }

  /**
   * 启动闲置检测
   */
  private startIdleDetection() {
    this.idleTimer = setInterval(() => {
      if (this.destroyed) return;

      const idleTime = Date.now() - this.lastInteractionTime;

      if (idleTime >= this.IDLE_SLEEP_MS) {
        this.triggerMood('idle_sleep');
      } else if (idleTime >= this.IDLE_TIRED_MS) {
        this.triggerMood('idle_30min');
      } else if (idleTime >= this.IDLE_CURIOUS_MS) {
        this.triggerMood('idle_5min');
      }
    }, this.IDLE_CHECK_INTERVAL);
  }

  /**
   * 记录用户活动（重置闲置计时器）
   */
  recordActivity() {
    this.lastInteractionTime = Date.now();
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.destroyed = true;
    if (this.moodTimer) {
      clearTimeout(this.moodTimer);
      this.moodTimer = null;
    }
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
