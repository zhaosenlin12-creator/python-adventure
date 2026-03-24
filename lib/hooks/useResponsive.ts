/**
 * 📱 响应式布局Hook
 * 提供屏幕尺寸和设备类型检测
 */

import { useState, useEffect, useMemo } from 'react';

// 断点定义
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

interface WindowSize {
  width: number;
  height: number;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  breakpoint: Breakpoint;
  pixelRatio: number;
}

/**
 * 获取窗口尺寸
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * 获取当前断点
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowSize();

  return useMemo(() => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, [width]);
}

/**
 * 检查是否至少是某个断点
 */
export function useBreakpointAtLeast(breakpoint: Breakpoint): boolean {
  const { width } = useWindowSize();
  return width >= BREAKPOINTS[breakpoint];
}

/**
 * 检查是否最多是某个断点
 */
export function useBreakpointAtMost(breakpoint: Breakpoint): boolean {
  const { width } = useWindowSize();
  const breakpointValue = BREAKPOINTS[breakpoint];
  
  // 获取下一个断点的值作为上限
  const breakpointKeys = Object.keys(BREAKPOINTS) as Breakpoint[];
  const currentIndex = breakpointKeys.indexOf(breakpoint);
  const nextBreakpoint = breakpointKeys[currentIndex + 1];
  const nextValue = nextBreakpoint ? BREAKPOINTS[nextBreakpoint] : Infinity;
  
  return width < nextValue;
}

/**
 * 获取设备信息
 */
export function useDeviceInfo(): DeviceInfo {
  const { width, height } = useWindowSize();
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const isTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );

    const isMobile = width < BREAKPOINTS.md;
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    const isDesktop = width >= BREAKPOINTS.lg;
    const orientation = height > width ? 'portrait' : 'landscape';
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      orientation,
      breakpoint,
      pixelRatio,
    };
  }, [width, height, breakpoint]);
}

/**
 * 根据断点选择值
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    // 按断点从大到小查找
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    // 从当前断点开始向下查找
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp]!;
      }
    }

    return defaultValue;
  }, [breakpoint, values, defaultValue]);
}

/**
 * 检查屏幕方向
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const { width, height } = useWindowSize();
  return height > width ? 'portrait' : 'landscape';
}

/**
 * 检测是否是移动设备（基于User Agent）
 */
export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos'];
    setIsMobile(mobileKeywords.some(keyword => userAgent.includes(keyword)));
  }, []);

  return isMobile;
}

/**
 * 媒体查询Hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * 安全区域Hook (iOS刘海屏等)
 */
export function useSafeArea(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    
    const update = () => {
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10),
      });
    };

    update();
    window.addEventListener('resize', update);
    
    return () => window.removeEventListener('resize', update);
  }, []);

  return safeArea;
}

/**
 * 游戏画布尺寸计算
 */
export function useGameCanvasSize(
  baseWidth: number = 1920,
  baseHeight: number = 1080,
  maxScale: number = 2
): { width: number; height: number; scale: number } {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  return useMemo(() => {
    const aspectRatio = baseWidth / baseHeight;
    const windowAspectRatio = windowWidth / windowHeight;

    let width: number;
    let height: number;
    let scale: number;

    if (windowAspectRatio > aspectRatio) {
      // 窗口更宽，以高度为基准
      height = windowHeight;
      width = height * aspectRatio;
      scale = height / baseHeight;
    } else {
      // 窗口更高，以宽度为基准
      width = windowWidth;
      height = width / aspectRatio;
      scale = width / baseWidth;
    }

    // 限制最大缩放
    if (scale > maxScale) {
      scale = maxScale;
      width = baseWidth * scale;
      height = baseHeight * scale;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
      scale,
    };
  }, [windowWidth, windowHeight, baseWidth, baseHeight, maxScale]);
}

/**
 * 检测是否是PWA模式
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsPWA(isStandalone || isIOSStandalone);
  }, []);

  return isPWA;
}
