'use client';

import React from 'react';

interface OrientationLockProps {
  requireLandscape?: boolean;
  children: React.ReactNode;
}

/**
 * 横屏锁定组件 - 直接显示内容
 */
export default function OrientationLock({ children }: OrientationLockProps) {
  return <>{children}</>;
}

export { OrientationLock };
