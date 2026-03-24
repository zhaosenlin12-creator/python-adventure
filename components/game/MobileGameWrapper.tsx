'use client';

import React from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';
import VirtualController from './VirtualController';

interface MobileGameWrapperProps {
  children: React.ReactNode;
  showController?: boolean;
}

/**
 * 移动端游戏包装器
 * 根据设备类型条件渲染虚拟控制器
 * PC端完全不渲染控制器
 */
export default function MobileGameWrapper({ 
  children, 
  showController = true 
}: MobileGameWrapperProps) {
  const { type, isTouchDevice } = useDeviceType();
  
  // 🔥 改进检测逻辑：支持真实移动设备和DevTools模拟
  // 检测User-Agent中的移动设备标识
  const isMobileUA = typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // PC端不显示虚拟控制器，但移动设备UA或触控设备显示
  const shouldShowController = showController && (isTouchDevice || isMobileUA) && type !== 'pc';

  return (
    <div className="relative w-full h-full">
      {children}
      {shouldShowController && (
        <VirtualController 
          visible={true} 
          opacity={type === 'mobile' ? 0.7 : 0.6} 
        />
      )}
    </div>
  );
}

export { MobileGameWrapper };
