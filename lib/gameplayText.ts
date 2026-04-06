export interface GameplayControlOptions {
  hasDoubleJump?: boolean;
  hasDash?: boolean;
  isQuantumDash?: boolean;
  hasGlide?: boolean;
  hasWallJump?: boolean;
  hasTimeSlow?: boolean;
  isTimeSlowActive?: boolean;
  hasShield?: boolean;
  isShieldActive?: boolean;
}

export type CampaignQuestionMode = 'challenge' | 'clear' | 'retry';

export const WORLD_BASE_CONTROLS = ['移动 A/D/方向键', '跳跃 W/↑', '互动 E/F'];
export const PLATFORM_BASE_CONTROLS = ['移动 A/D/方向键', '跳跃 W/↑', '攻击 X/G', '互动 E/F'];
export const PLATFORM_SKILL_CLUSTER = '技能 H/J/K';
export const ARENA_CONTROLS_HINT = '移动 A/D/方向键 | 靠近台座按 E/F';
export const CAMPAIGN_RETRY_RULE = '失败后答对 1 题，本关重开';

export const SKILL_SHORT_INSTRUCTIONS: Record<string, string> = {
  double_jump: '空中再按 W/↑',
  dash: '按 H 冲刺（SPACE 也可）',
  wall_jump: '贴墙按 W/↑',
  glide: '长按 W/↑',
  time_slow: '按 J 减速',
  chemical_shield: '按 K 开盾',
  quantum_dash: '按 H 量子冲刺（SPACE 也可）',
};

const getDashHint = (isQuantumDash = false) =>
  isQuantumDash ? 'H 量子冲刺' : 'H 冲刺';

const getTimeSlowHint = (active = false) => (active ? 'J 减速中' : 'J 时间减速');
const getShieldHint = (active = false) => (active ? 'K 护盾中' : 'K 护盾');

const buildAdvancedHints = (options: GameplayControlOptions) => {
  const hints: string[] = [];

  if (options.hasDoubleJump) hints.push('二段跳 再按 W/↑');
  if (options.hasDash) hints.push(getDashHint(options.isQuantumDash));
  if (options.hasGlide) hints.push('滑翔 长按 W/↑');
  if (options.hasWallJump) hints.push('墙跳 贴墙后按 W/↑');
  if (options.hasTimeSlow) hints.push(getTimeSlowHint(options.isTimeSlowActive));
  if (options.hasShield) hints.push(getShieldHint(options.isShieldActive));

  return hints;
};

const buildInlineControlsText = (baseLines: readonly string[], advancedHints: string[]) =>
  [...baseLines, ...advancedHints].join(' | ');

export const buildWorldControlsText = (options: GameplayControlOptions) => {
  const advancedHints = buildAdvancedHints(options);
  return buildInlineControlsText(WORLD_BASE_CONTROLS, advancedHints);
};

export const buildPlatformControlsText = (options: GameplayControlOptions) => {
  const advancedHints = buildAdvancedHints(options).map((hint) =>
    hint.replace('K 护盾中', 'K 护盾')
  );

  const lines = [...PLATFORM_BASE_CONTROLS];
  if (options.hasDash || options.hasTimeSlow || options.hasShield) {
    lines.push(PLATFORM_SKILL_CLUSTER);
  }

  return buildInlineControlsText(lines, advancedHints);
};

export const buildCampaignRuleText = (quizCount: number) => {
  if (quizCount > 1) {
    return `先完成目标，再答对 ${quizCount} 题过关`;
  }
  if (quizCount === 1) {
    return '先完成目标，再答对 1 题过关';
  }
  return '完成目标即可过关';
};

export const buildCampaignOverviewText = (quizCount: number) =>
  `过关：${buildCampaignRuleText(quizCount)}；失败：${CAMPAIGN_RETRY_RULE}`;

export const getCampaignQuestionCopy = (
  mode: CampaignQuestionMode,
  currentIndex = 0,
  totalQuestions = 1
) => {
  const isMultiStepClear = totalQuestions > 1;
  const hasNextQuestion = currentIndex + 1 < totalQuestions;

  if (mode === 'retry') {
    return {
      title: '重开答题',
      subtitle: CAMPAIGN_RETRY_RULE,
      successTitle: '准备重开',
      successBody: '答对了，本关马上重开。',
      wrongBody: '记住答案，再试一次。',
      timeoutBody: '时间到了，再试一次。',
    };
  }

  if (mode === 'clear') {
    return {
      title: isMultiStepClear ? `过关答题 ${currentIndex + 1}/${totalQuestions}` : '过关答题',
      subtitle: isMultiStepClear
        ? `完成目标后，答对全部 ${totalQuestions} 题才算过关`
        : '完成目标后，答对这题就过关',
      successTitle: hasNextQuestion ? '进入下一题' : '准备过关',
      successBody: hasNextQuestion ? '这一题通过了，继续下一题。' : '全部答对，开始结算奖励。',
      wrongBody: '答错会重开本关，再试一次。',
      timeoutBody: '时间到了，本关会重开。',
    };
  }

  return {
    title: '挑战答题',
    subtitle: '答对后继续前进',
    successTitle: '继续前进',
    successBody: '答对了，继续挑战。',
    wrongBody: '记住答案，再试一次。',
    timeoutBody: '时间到了，再试一次。',
  };
};

export const buildPlatformFooterHints = (
  options: GameplayControlOptions & { quizCount: number }
) => {
  const hints = ['移动 A/D/方向键'];
  hints.push('跳跃 W/↑');
  hints.push('攻击 X/G');

  if (options.hasDash || options.hasTimeSlow || options.hasShield) {
    hints.push(PLATFORM_SKILL_CLUSTER);
  }
  if (options.hasDash) {
    hints.push(getDashHint(options.isQuantumDash));
  }
  if (options.hasTimeSlow && options.hasShield) {
    hints.push('J 时间减速 / K 护盾');
  } else if (options.hasTimeSlow) {
    hints.push('J 时间减速');
  } else if (options.hasShield) {
    hints.push('K 护盾');
  }

  hints.push(buildCampaignRuleText(options.quizCount));
  return hints;
};
