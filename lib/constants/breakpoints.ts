/**
 * 响应式断点常量
 * 用于移动端适配的屏幕尺寸判断
 */

// 断点值（像素）
export const BREAKPOINTS = {
  // 手机：小于768px
  MOBILE_MAX: 767,
  // 平板：768px - 1024px
  TABLET_MIN: 768,
  TABLET_MAX: 1024,
  // 桌面：大于1024px
  DESKTOP_MIN: 1025,
} as const;

// 最小支持屏幕宽度（iPhone SE）
export const MIN_SUPPORTED_WIDTH = 375;

// 触控目标最小尺寸（Apple HIG推荐）
export const MIN_TOUCH_TARGET = 44;

// 设备配置
export const DEVICE_CONFIG = {
  pc: {
    maxEnemies: 12,
    particleMultiplier: 1.0,
    uiScale: 1.0,
    touchEnabled: false,
  },
  tablet: {
    maxEnemies: 10,
    particleMultiplier: 0.7,
    uiScale: 1.1,
    touchEnabled: true,
  },
  mobile: {
    maxEnemies: 8,
    particleMultiplier: 0.5,
    uiScale: 1.2,
    touchEnabled: true,
  },
} as const;

// CSS媒体查询字符串
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.MOBILE_MAX}px)`,
  tablet: `(min-width: ${BREAKPOINTS.TABLET_MIN}px) and (max-width: ${BREAKPOINTS.TABLET_MAX}px)`,
  desktop: `(min-width: ${BREAKPOINTS.DESKTOP_MIN}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',
} as const;

// Tailwind CSS断点类名前缀
export const TAILWIND_BREAKPOINTS = {
  sm: 640,   // 小屏手机
  md: 768,   // 平板
  lg: 1024,  // 小桌面
  xl: 1280,  // 桌面
  '2xl': 1536, // 大桌面
} as const;

/**
 * 判断当前屏幕宽度属于哪个断点
 */
export function getBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= BREAKPOINTS.MOBILE_MAX) return 'mobile';
  if (width <= BREAKPOINTS.TABLET_MAX) return 'tablet';
  return 'desktop';
}

/**
 * 判断是否为移动端断点
 */
export function isMobileBreakpoint(width: number): boolean {
  return width <= BREAKPOINTS.MOBILE_MAX;
}

/**
 * 判断是否为平板断点
 */
export function isTabletBreakpoint(width: number): boolean {
  return width >= BREAKPOINTS.TABLET_MIN && width <= BREAKPOINTS.TABLET_MAX;
}

/**
 * 判断是否为桌面断点
 */
export function isDesktopBreakpoint(width: number): boolean {
  return width >= BREAKPOINTS.DESKTOP_MIN;
}

export default BREAKPOINTS;
