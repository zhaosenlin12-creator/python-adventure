'use client';

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  type: 'pc' | 'tablet' | 'mobile';
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
}

// 断点常量
const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1024;

/**
 * 检测设备类型的Hook
 * 基于触控能力和屏幕尺寸判断设备类型
 * PC端窗口缩小不会改变设备类型判断
 */
export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // SSR安全的初始值
    if (typeof window === 'undefined') {
      return {
        type: 'pc',
        isTouchDevice: false,
        screenWidth: 1920,
        screenHeight: 1080,
        isLandscape: true,
      };
    }
    return getDeviceInfo();
  });

  useEffect(() => {
    // 客户端初始化
    setDeviceInfo(getDeviceInfo());

    // 监听屏幕方向变化（仅更新方向，不改变设备类型）
    const handleOrientationChange = () => {
      setDeviceInfo(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        isLandscape: window.innerWidth > window.innerHeight,
      }));
    };

    // 监听resize（仅更新尺寸信息，设备类型保持不变）
    const handleResize = () => {
      setDeviceInfo(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        isLandscape: window.innerWidth > window.innerHeight,
      }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceInfo;
}

/**
 * 获取设备信息
 * 设备类型判断基于初始加载时的触控能力和屏幕尺寸
 */
function getDeviceInfo(): DeviceInfo {
  const isTouchDevice = detectTouchCapability();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isLandscape = screenWidth > screenHeight;
  
  // 设备类型判断：优先基于触控能力
  let type: 'pc' | 'tablet' | 'mobile';
  
  if (!isTouchDevice) {
    // 无触控能力 = PC
    type = 'pc';
  } else {
    // 有触控能力，根据屏幕尺寸区分手机和平板
    // 使用较大的尺寸值来判断（考虑横竖屏）
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);
    
    if (minDimension <= MOBILE_MAX_WIDTH) {
      type = 'mobile';
    } else if (minDimension <= TABLET_MAX_WIDTH) {
      type = 'tablet';
    } else {
      // 大屏触控设备（如触控显示器）视为PC
      type = 'pc';
    }
  }

  return {
    type,
    isTouchDevice,
    screenWidth,
    screenHeight,
    isLandscape,
  };
}

/**
 * 检测触控能力
 */
function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints for older IE/Edge
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * 非Hook版本，用于非React环境
 */
export function getDeviceType(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      type: 'pc',
      isTouchDevice: false,
      screenWidth: 1920,
      screenHeight: 1080,
      isLandscape: true,
    };
  }
  return getDeviceInfo();
}

/**
 * 简单判断是否为移动设备
 */
export function isMobileDevice(): boolean {
  const info = getDeviceType();
  return info.type === 'mobile' || info.type === 'tablet';
}

/**
 * 简单判断是否为触控设备
 */
export function isTouchEnabled(): boolean {
  return detectTouchCapability();
}

export default useDeviceType;
