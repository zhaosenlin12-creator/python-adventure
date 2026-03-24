/**
 * 📊 游戏数据分析系统
 * 追踪玩家行为、游戏难度和留存指标
 */

// ============ 事件类型定义 ============

export type EventCategory = 
  | 'game'      // 游戏事件
  | 'ui'        // UI交互
  | 'auth'      // 认证相关
  | 'social'    // 社交功能
  | 'purchase'  // 购买/消费
  | 'error';    // 错误事件

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventsCount: number;
  levelsPlayed: string[];
  levelCompletions: number;
  levelFailures: number;
  coinsEarned: number;
  coinsSpent: number;
}

export interface LevelMetrics {
  levelId: string;
  attempts: number;
  completions: number;
  failures: number;
  avgCompletionTime: number;
  avgScore: number;
  firstAttemptSuccess: number;
  dropOffRate: number;
}

// ============ 会话管理 ============

let currentSession: SessionData | null = null;
const events: AnalyticsEvent[] = [];
const MAX_EVENTS = 1000;

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 开始新会话
 */
export function startSession(userId?: string): SessionData {
  currentSession = {
    id: generateSessionId(),
    startTime: Date.now(),
    eventsCount: 0,
    levelsPlayed: [],
    levelCompletions: 0,
    levelFailures: 0,
    coinsEarned: 0,
    coinsSpent: 0,
  };
  
  trackEvent({
    category: 'game',
    action: 'session_start',
    metadata: { userId },
  });
  
  return currentSession;
}

/**
 * 结束会话
 */
export function endSession(): SessionData | null {
  if (!currentSession) return null;
  
  currentSession.endTime = Date.now();
  currentSession.duration = currentSession.endTime - currentSession.startTime;
  
  trackEvent({
    category: 'game',
    action: 'session_end',
    value: currentSession.duration,
    metadata: {
      eventsCount: currentSession.eventsCount,
      levelCompletions: currentSession.levelCompletions,
    },
  });
  
  const session = { ...currentSession };
  currentSession = null;
  
  return session;
}

/**
 * 获取当前会话
 */
export function getCurrentSession(): SessionData | null {
  return currentSession;
}

// ============ 事件追踪 ============

/**
 * 追踪事件
 */
export function trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'sessionId'>): void {
  if (!currentSession) {
    startSession();
  }
  
  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: Date.now(),
    sessionId: currentSession!.id,
  };
  
  events.unshift(fullEvent);
  
  if (events.length > MAX_EVENTS) {
    events.pop();
  }
  
  currentSession!.eventsCount++;
  
  // 开发环境打印
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Analytics]', fullEvent.category, fullEvent.action, fullEvent.label || '', fullEvent.value || '');
  }
}

// ============ 游戏事件追踪 ============

/**
 * 追踪关卡开始
 */
export function trackLevelStart(levelId: string, metadata?: Record<string, any>): void {
  if (currentSession && !currentSession.levelsPlayed.includes(levelId)) {
    currentSession.levelsPlayed.push(levelId);
  }
  
  trackEvent({
    category: 'game',
    action: 'level_start',
    label: levelId,
    metadata,
  });
}

/**
 * 追踪关卡完成
 */
export function trackLevelComplete(
  levelId: string,
  score: number,
  timeSpent: number,
  metadata?: Record<string, any>
): void {
  if (currentSession) {
    currentSession.levelCompletions++;
  }
  
  trackEvent({
    category: 'game',
    action: 'level_complete',
    label: levelId,
    value: score,
    metadata: {
      ...metadata,
      timeSpent,
    },
  });
}

/**
 * 追踪关卡失败
 */
export function trackLevelFail(
  levelId: string,
  reason: string,
  timeSpent: number,
  metadata?: Record<string, any>
): void {
  if (currentSession) {
    currentSession.levelFailures++;
  }
  
  trackEvent({
    category: 'game',
    action: 'level_fail',
    label: levelId,
    metadata: {
      ...metadata,
      reason,
      timeSpent,
    },
  });
}

/**
 * 追踪金币获得
 */
export function trackCoinsEarned(amount: number, source: string): void {
  if (currentSession) {
    currentSession.coinsEarned += amount;
  }
  
  trackEvent({
    category: 'purchase',
    action: 'coins_earned',
    label: source,
    value: amount,
  });
}

/**
 * 追踪金币消费
 */
export function trackCoinsSpent(amount: number, item: string): void {
  if (currentSession) {
    currentSession.coinsSpent += amount;
  }
  
  trackEvent({
    category: 'purchase',
    action: 'coins_spent',
    label: item,
    value: amount,
  });
}

/**
 * 追踪成就解锁
 */
export function trackAchievement(achievementId: string, name: string): void {
  trackEvent({
    category: 'game',
    action: 'achievement_unlock',
    label: achievementId,
    metadata: { name },
  });
}

/**
 * 追踪PvP战斗
 */
export function trackPvpMatch(
  result: 'win' | 'lose' | 'draw',
  opponentType: 'player' | 'ai',
  metadata?: Record<string, any>
): void {
  trackEvent({
    category: 'game',
    action: 'pvp_match',
    label: result,
    metadata: {
      ...metadata,
      opponentType,
    },
  });
}

// ============ UI事件追踪 ============

/**
 * 追踪页面访问
 */
export function trackPageView(pageName: string): void {
  trackEvent({
    category: 'ui',
    action: 'page_view',
    label: pageName,
  });
}

/**
 * 追踪按钮点击
 */
export function trackButtonClick(buttonName: string, context?: string): void {
  trackEvent({
    category: 'ui',
    action: 'button_click',
    label: buttonName,
    metadata: context ? { context } : undefined,
  });
}

/**
 * 追踪功能使用
 */
export function trackFeatureUse(featureName: string, metadata?: Record<string, any>): void {
  trackEvent({
    category: 'ui',
    action: 'feature_use',
    label: featureName,
    metadata,
  });
}

// ============ 数据分析 ============

/**
 * 获取关卡难度分析
 */
export function getLevelDifficultyAnalysis(): Map<string, LevelMetrics> {
  const levelMetrics = new Map<string, LevelMetrics>();
  
  // 收集关卡数据
  const levelData: Record<string, {
    attempts: number;
    completions: number;
    failures: number;
    completionTimes: number[];
    scores: number[];
  }> = {};
  
  for (const event of events) {
    if (event.category !== 'game') continue;
    
    const levelId = event.label;
    if (!levelId) continue;
    
    if (!levelData[levelId]) {
      levelData[levelId] = {
        attempts: 0,
        completions: 0,
        failures: 0,
        completionTimes: [],
        scores: [],
      };
    }
    
    const data = levelData[levelId];
    
    if (event.action === 'level_start') {
      data.attempts++;
    } else if (event.action === 'level_complete') {
      data.completions++;
      if (event.metadata?.timeSpent) {
        data.completionTimes.push(event.metadata.timeSpent);
      }
      if (event.value) {
        data.scores.push(event.value);
      }
    } else if (event.action === 'level_fail') {
      data.failures++;
    }
  }
  
  // 计算指标
  for (const [levelId, data] of Object.entries(levelData)) {
    const avgCompletionTime = data.completionTimes.length > 0
      ? data.completionTimes.reduce((a, b) => a + b, 0) / data.completionTimes.length
      : 0;
    
    const avgScore = data.scores.length > 0
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;
    
    const dropOffRate = data.attempts > 0
      ? (data.attempts - data.completions) / data.attempts
      : 0;
    
    levelMetrics.set(levelId, {
      levelId,
      attempts: data.attempts,
      completions: data.completions,
      failures: data.failures,
      avgCompletionTime,
      avgScore,
      firstAttemptSuccess: 0, // 需要更复杂的跟踪
      dropOffRate,
    });
  }
  
  return levelMetrics;
}

/**
 * 获取留存指标
 */
export function getRetentionMetrics(): {
  sessionCount: number;
  avgSessionDuration: number;
  avgEventsPerSession: number;
  completionRate: number;
} {
  const sessionEvents = events.filter(e => 
    e.action === 'session_start' || e.action === 'session_end'
  );
  
  const sessionCount = sessionEvents.filter(e => e.action === 'session_start').length;
  const sessionEnds = sessionEvents.filter(e => e.action === 'session_end');
  
  const avgSessionDuration = sessionEnds.length > 0
    ? sessionEnds.reduce((sum, e) => sum + (e.value || 0), 0) / sessionEnds.length
    : 0;
  
  const avgEventsPerSession = sessionCount > 0
    ? events.length / sessionCount
    : 0;
  
  const levelCompletes = events.filter(e => e.action === 'level_complete').length;
  const levelStarts = events.filter(e => e.action === 'level_start').length;
  const completionRate = levelStarts > 0 ? levelCompletes / levelStarts : 0;
  
  return {
    sessionCount,
    avgSessionDuration,
    avgEventsPerSession,
    completionRate,
  };
}

/**
 * 获取事件统计
 */
export function getEventStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const event of events) {
    const key = `${event.category}:${event.action}`;
    stats[key] = (stats[key] || 0) + 1;
  }
  
  return stats;
}

/**
 * 导出分析数据
 */
export function exportAnalyticsData(): string {
  return JSON.stringify({
    session: currentSession,
    events: events.slice(0, 100),
    levelMetrics: Object.fromEntries(getLevelDifficultyAnalysis()),
    retention: getRetentionMetrics(),
    eventStats: getEventStats(),
  }, null, 2);
}

/**
 * 清除分析数据
 */
export function clearAnalyticsData(): void {
  events.length = 0;
}

// ============ 页面可见性追踪 ============

if (typeof window !== 'undefined') {
  // 页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackEvent({
        category: 'ui',
        action: 'page_hidden',
      });
    } else {
      trackEvent({
        category: 'ui',
        action: 'page_visible',
      });
    }
  });
  
  // 页面关闭前保存会话
  window.addEventListener('beforeunload', () => {
    endSession();
  });
}
