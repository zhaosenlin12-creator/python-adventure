export type HealingMoodId = 'tense' | 'busy' | 'quiet' | 'steady';

export type HealingActivityId = 'breathe' | 'ground' | 'release' | 'courage' | 'chat';

export interface HealingMoodOption {
  id: HealingMoodId;
  label: string;
  hint: string;
  recommended: HealingActivityId;
}

export interface HealingBreathingStep {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
  scale: number;
}

export interface GroundingStep {
  id: string;
  title: string;
  hint: string;
}

export interface CourageCard {
  id: string;
  title: string;
  message: string;
  action: string;
}

export const HEALING_MOOD_OPTIONS: HealingMoodOption[] = [
  {
    id: 'tense',
    label: '有点紧',
    hint: '先把呼吸慢下来。',
    recommended: 'breathe',
  },
  {
    id: 'busy',
    label: '脑袋满',
    hint: '先把注意力拉回现在。',
    recommended: 'ground',
  },
  {
    id: 'quiet',
    label: '想安静',
    hint: '用一小会安静，把心慢慢放平。',
    recommended: 'breathe',
  },
  {
    id: 'steady',
    label: '还不错',
    hint: '抽一张鼓劲卡，再继续今天的挑战。',
    recommended: 'courage',
  },
];

export const HEALING_BREATHING_STEPS: HealingBreathingStep[] = [
  {
    id: 'inhale',
    label: '吸气',
    detail: '慢慢吸进来',
    durationMs: 2400,
    scale: 1,
  },
  {
    id: 'hold',
    label: '停一下',
    detail: '肩膀放松一点',
    durationMs: 1200,
    scale: 1.08,
  },
  {
    id: 'exhale',
    label: '呼气',
    detail: '慢慢呼出去',
    durationMs: 2600,
    scale: 0.9,
  },
];

export const HEALING_GROUNDING_STEPS: GroundingStep[] = [
  {
    id: 'see',
    title: '看 3 样',
    hint: '看看身边 3 个安静的小东西。',
  },
  {
    id: 'hear',
    title: '听 2 个',
    hint: '听听现在的 2 个声音，不用评价它。',
  },
  {
    id: 'move',
    title: '做 1 次',
    hint: '转转肩，或者慢慢伸个懒腰。',
  },
];

export const COURAGE_CARDS: CourageCard[] = [
  {
    id: 'small-step',
    title: '先完成一小步',
    message: '把眼前这一小步做好，也是在向前走。',
    action: '先解决一个最小问题，再继续。',
  },
  {
    id: 'try-once',
    title: '不会也能先试',
    message: '先动手试一次，答案会慢慢清楚。',
    action: '先写第一行，再回头检查。',
  },
  {
    id: 'slow-down',
    title: '紧张时先变慢',
    message: '节奏慢一点，脑子会更稳，手也会更稳。',
    action: '先做一轮呼吸，再继续操作。',
  },
  {
    id: 'ask-for-help',
    title: '求助不是退步',
    message: '卡住时愿意提问，本身就是一种进步。',
    action: '记下不会的点，再去问老师或同学。',
  },
  {
    id: 'rest-then-go',
    title: '停一下也算策略',
    message: '短暂停一下，是为了走得更远。',
    action: '离开屏幕半分钟，再回来。',
  },
];

export function getMoodOption(moodId: HealingMoodId): HealingMoodOption {
  return HEALING_MOOD_OPTIONS.find((item) => item.id === moodId) ?? HEALING_MOOD_OPTIONS[0];
}

export function getRecommendedActivity(moodId: HealingMoodId): HealingActivityId {
  return getMoodOption(moodId).recommended;
}

export function getCourageCard(index: number): CourageCard {
  const safeIndex = ((index % COURAGE_CARDS.length) + COURAGE_CARDS.length) % COURAGE_CARDS.length;
  return COURAGE_CARDS[safeIndex];
}
