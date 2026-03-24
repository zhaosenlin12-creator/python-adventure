/**
 * 设备配置
 * 根据设备类型提供不同的游戏配置参数
 */

import { getDeviceType } from '@/hooks/useDeviceType';
import { DEVICE_CONFIG } from '@/lib/constants/breakpoints';

export interface GameDeviceConfig {
  maxEnemies: number;
  particleMultiplier: number;
  uiScale: number;
  touchEnabled: boolean;
  targetFPS: number;
  enableShadows: boolean;
  enableParticles: boolean;
  maxParticlesPerEmitter: number;
}

/**
 * 获取当前设备的游戏配置
 */
export function getGameDeviceConfig(): GameDeviceConfig {
  const deviceInfo = getDeviceType();
  const baseConfig = DEVICE_CONFIG[deviceInfo.type];
  
  return {
    ...baseConfig,
    targetFPS: deviceInfo.type === 'mobile' ? 30 : 60,
    enableShadows: deviceInfo.type === 'pc',
    enableParticles: true,
    maxParticlesPerEmitter: deviceInfo.type === 'mobile' ? 20 : deviceInfo.type === 'tablet' ? 35 : 50,
  };
}

/**
 * 获取粒子数量（根据设备类型调整）
 */
export function getParticleCount(baseCount: number): number {
  const config = getGameDeviceConfig();
  return Math.floor(baseCount * config.particleMultiplier);
}

/**
 * 获取最大敌人数量
 */
export function getMaxEnemies(): number {
  const config = getGameDeviceConfig();
  return config.maxEnemies;
}

/**
 * 检查是否应该启用某个视觉效果
 */
export function shouldEnableEffect(effectType: 'shadow' | 'particle' | 'glow'): boolean {
  const config = getGameDeviceConfig();
  
  switch (effectType) {
    case 'shadow':
      return config.enableShadows;
    case 'particle':
      return config.enableParticles;
    case 'glow':
      return config.particleMultiplier >= 0.7;
    default:
      return true;
  }
}

/**
 * 单例缓存
 */
let cachedConfig: GameDeviceConfig | null = null;

export function getCachedDeviceConfig(): GameDeviceConfig {
  if (!cachedConfig) {
    cachedConfig = getGameDeviceConfig();
  }
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

export default {
  getGameDeviceConfig,
  getParticleCount,
  getMaxEnemies,
  shouldEnableEffect,
  getCachedDeviceConfig,
  clearConfigCache,
};
