/**
 * 👆 手势处理Hook
 * 提供移动端手势识别
 */

import { useRef, useCallback, useEffect } from 'react';

export interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isMultiTouch: boolean;
  initialDistance?: number;
}

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  config: GestureConfig
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinchIn,
    onPinchOut,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = config;

  const touchState = useRef<TouchState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef<number>(0);
  const lastTapPosition = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    clearLongPressTimer();

    const touch = e.touches[0];
    const isMultiTouch = e.touches.length > 1;

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isMultiTouch,
      initialDistance: isMultiTouch && e.touches.length >= 2
        ? getDistance(e.touches[0], e.touches[1])
        : undefined,
    };

    // 长按检测
    if (onLongPress && !isMultiTouch) {
      longPressTimer.current = setTimeout(() => {
        if (touchState.current) {
          onLongPress(touchState.current.startX, touchState.current.startY);
          touchState.current = null;
        }
      }, longPressDelay);
    }
  }, [clearLongPressTimer, getDistance, longPressDelay, onLongPress]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;

    // 多点触控 - 捏合检测
    if (e.touches.length >= 2 && touchState.current.initialDistance !== undefined) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const distanceChange = currentDistance - touchState.current.initialDistance;

      if (Math.abs(distanceChange) > 50) {
        if (distanceChange > 0 && onPinchOut) {
          onPinchOut();
        } else if (distanceChange < 0 && onPinchIn) {
          onPinchIn();
        }
        touchState.current = null;
      }
      return;
    }

    // 移动时清除长按计时器
    const touch = e.touches[0];
    const dx = touch.clientX - touchState.current.startX;
    const dy = touch.clientY - touchState.current.startY;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPressTimer();
    }
  }, [clearLongPressTimer, getDistance, onPinchIn, onPinchOut]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    clearLongPressTimer();

    if (!touchState.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchState.current.startX;
    const dy = touch.clientY - touchState.current.startY;
    const elapsed = Date.now() - touchState.current.startTime;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // 滑动检测
    if (elapsed < 300 && (absX > swipeThreshold || absY > swipeThreshold)) {
      if (absX > absY) {
        // 水平滑动
        if (dx > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // 垂直滑动
        if (dy > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (dy < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
    // 点击检测
    else if (absX < 10 && absY < 10 && elapsed < 300) {
      const currentTime = Date.now();
      const x = touch.clientX;
      const y = touch.clientY;

      // 双击检测
      if (
        onDoubleTap &&
        lastTapPosition.current &&
        currentTime - lastTapTime.current < doubleTapDelay &&
        Math.abs(x - lastTapPosition.current.x) < 30 &&
        Math.abs(y - lastTapPosition.current.y) < 30
      ) {
        onDoubleTap(x, y);
        lastTapPosition.current = null;
        lastTapTime.current = 0;
      } else {
        // 单击
        if (onTap) {
          onTap(x, y);
        }
        lastTapTime.current = currentTime;
        lastTapPosition.current = { x, y };
      }
    }

    touchState.current = null;
  }, [
    clearLongPressTimer,
    swipeThreshold,
    doubleTapDelay,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
  ]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', clearLongPressTimer);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', clearLongPressTimer);
      clearLongPressTimer();
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);
}

/**
 * 简化的滑动Hook
 */
export function useSwipe(
  ref: React.RefObject<HTMLElement>,
  callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  },
  threshold = 50
) {
  useGestures(ref, { ...callbacks, swipeThreshold: threshold });
}

/**
 * 检测是否支持触摸
 */
export function useTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 触觉反馈（震动）
 */
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(40),
    pattern: (pattern: number[]) => vibrate(pattern),
  };
}

/**
 * 阻止默认触摸行为（防止页面滚动）
 */
export function usePreventTouchDefault(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    element.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      element.removeEventListener('touchmove', preventScroll);
    };
  }, [ref]);
}
