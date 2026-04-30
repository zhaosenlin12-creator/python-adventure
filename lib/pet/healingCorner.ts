export type HealingMoodId =
  | 'tense'
  | 'busy'
  | 'quiet'
  | 'steady'
  | 'frustrated'
  | 'tired'
  | 'proud';

export type HealingActivityId = 'breathe' | 'ground' | 'release' | 'courage' | 'focus' | 'chat';

export interface HealingMoodOption {
  id: HealingMoodId;
  label: string;
  hint: string;
  recommended: HealingActivityId;
  tone: 'settle' | 'focus' | 'recover' | 'grow';
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

export interface FocusStep {
  id: string;
  title: string;
  hint: string;
  action: string;
}

export interface CourageCard {
  id: string;
  title: string;
  message: string;
  action: string;
  tag: 'try' | 'calm' | 'help' | 'rest' | 'plan' | 'celebrate';
}

export const HEALING_MOOD_OPTIONS: HealingMoodOption[] = [
  {
    id: 'tense',
    label: '有点紧',
    hint: '先把呼吸慢下来，让身体知道现在是安全的。',
    recommended: 'breathe',
    tone: 'settle',
  },
  {
    id: 'busy',
    label: '脑袋满',
    hint: '先把注意力拉回现在，再决定下一步。',
    recommended: 'ground',
    tone: 'focus',
  },
  {
    id: 'quiet',
    label: '想安静',
    hint: '用一小会安静，把心慢慢放平。',
    recommended: 'breathe',
    tone: 'settle',
  },
  {
    id: 'steady',
    label: '还不错',
    hint: '抽一张鼓劲卡，带着稳定感继续挑战。',
    recommended: 'courage',
    tone: 'grow',
  },
  {
    id: 'frustrated',
    label: '有点卡',
    hint: '先把卡住的点说清楚，再切成一个能做的小动作。',
    recommended: 'release',
    tone: 'recover',
  },
  {
    id: 'tired',
    label: '有点累',
    hint: '先降低负荷，用短步骤把能量接回来。',
    recommended: 'focus',
    tone: 'recover',
  },
  {
    id: 'proud',
    label: '做得棒',
    hint: '把刚刚做对的地方记下来，它会变成下一次的底气。',
    recommended: 'courage',
    tone: 'grow',
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
    label: '停一停',
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
    hint: '听听现在的 2 个声音，不用评价它们。',
  },
  {
    id: 'move',
    title: '动 1 次',
    hint: '转转肩，或者慢慢伸一个懒腰。',
  },
];

export const HEALING_FOCUS_STEPS: FocusStep[] = [
  {
    id: 'name',
    title: '命名任务',
    hint: '把现在真正要做的事说成一句话。',
    action: '我现在只要完成这一小步。',
  },
  {
    id: 'shrink',
    title: '缩小范围',
    hint: '把任务切到 3 分钟内能开始的版本。',
    action: '先做最小的一块，不追求一次做完。',
  },
  {
    id: 'start',
    title: '启动动作',
    hint: '选一个身体能立刻执行的动作。',
    action: '打开题目、写第一行、或先读一遍要求。',
  },
];

export const COURAGE_CARDS: CourageCard[] = [
  {
    id: 'small-step',
    title: '先完成一小步',
    message: '把眼前这一小步做好，也是在向前走。',
    action: '先解决一个最小问题，再继续。',
    tag: 'try',
  },
  {
    id: 'try-once',
    title: '不会也能先试',
    message: '先动手试一次，答案会慢慢清楚。',
    action: '先写第一行，再回头检查。',
    tag: 'try',
  },
  {
    id: 'slow-down',
    title: '紧张时先变慢',
    message: '节奏慢一点，脑子会更稳，手也会更稳。',
    action: '先做一轮呼吸，再继续操作。',
    tag: 'calm',
  },
  {
    id: 'ask-for-help',
    title: '求助不是退步',
    message: '卡住时愿意提问，本身就是一种进步。',
    action: '记下不会的点，再去问老师或同学。',
    tag: 'help',
  },
  {
    id: 'rest-then-go',
    title: '停一下也算策略',
    message: '短暂停一下，是为了走得更远。',
    action: '离开屏幕半分钟，再回来。',
    tag: 'rest',
  },
  {
    id: 'make-a-plan',
    title: '把难题变成路线',
    message: '难题不是一堵墙，它可以被拆成几块台阶。',
    action: '写下第一步、第二步和需要求助的点。',
    tag: 'plan',
  },
  {
    id: 'notice-win',
    title: '记住刚刚的成功',
    message: '你刚刚做对的地方，值得被看见。',
    action: '说出一个今天比昨天更好的动作。',
    tag: 'celebrate',
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
