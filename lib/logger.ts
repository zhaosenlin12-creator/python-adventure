/**
 * 生产环境日志控制 v5.0
 * 在生产环境中完全禁用所有 console 输出
 * 并捕获未处理的错误，上报到后端监控系统
 * 
 * 更新日志:
 * v5.0 - 集成错误监控系统，错误上报到后端
 * v4.0 - 添加全局错误捕获，完全静默生产环境
 * v3.0 - 增强 console.error 过滤
 * v2.0 - 添加定期检查和恢复功能
 * v1.0 - 基础生产环境禁用
 */

import { initErrorMonitor } from '@/lib/services/errorMonitor';

// 立即执行：在生产环境中禁用 console
if (typeof window !== 'undefined') {
  // 检测是否为生产环境
  const checkIsProduction = () => {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' && 
           hostname !== '127.0.0.1' && 
           !hostname.startsWith('192.168.') &&
           !hostname.startsWith('10.') &&
           hostname !== '';
  };
  
  // 标记是否已初始化
  let isInitialized = false;
  
  // 保存原始方法（用于调试恢复）
  const originalConsole = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    trace: console.trace.bind(console),
    dir: console.dir.bind(console),
    table: console.table.bind(console),
    error: console.error.bind(console),
  };
  
  // 空函数
  const noop = () => {};
  
  const initConsoleControl = () => {
    if (isInitialized) return;
    
    const isProduction = checkIsProduction();
    
    if (isProduction) {
      isInitialized = true;
      
      // 初始化错误监控系统（上报到后端）
      initErrorMonitor();
      
      // 禁用所有 console 方法（包括 error）
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      console.trace = noop;
      console.dir = noop;
      console.table = noop;
      console.error = noop;
      
      // 捕获未处理的 Promise 错误
      window.addEventListener('unhandledrejection', (event) => {
        event.preventDefault();
        // 静默处理，不输出任何信息
      });
      
      // 捕获未处理的 JS 错误
      window.addEventListener('error', (event) => {
        // 阻止错误显示在控制台
        event.preventDefault();
        // 静默处理
        return true;
      }, true);
      
      // 提供恢复方法（调试用）- 在控制台输入 __restoreConsole() 可恢复
      (window as unknown as Record<string, unknown>).__restoreConsole = () => {
        console.log = originalConsole.log;
        console.debug = originalConsole.debug;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.trace = originalConsole.trace;
        console.dir = originalConsole.dir;
        console.table = originalConsole.table;
        console.error = originalConsole.error;
        originalConsole.log('[Console] Restored for debugging');
      };
      
      // 定期检查并重新禁用（防止第三方库恢复console）
      setInterval(() => {
        if (console.log !== noop) {
          console.log = noop;
          console.debug = noop;
          console.info = noop;
          console.warn = noop;
          console.error = noop;
        }
      }, 3000);
    }
  };
  
  // 立即执行
  initConsoleControl();
  
  // DOM 加载完成后再执行一次
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsoleControl);
  }
  
  // window.onload 后再执行一次，确保覆盖所有延迟加载的脚本
  window.addEventListener('load', () => {
    setTimeout(initConsoleControl, 100);
  });
}

const isDev = typeof window !== 'undefined' 
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  }
};

export default logger;
