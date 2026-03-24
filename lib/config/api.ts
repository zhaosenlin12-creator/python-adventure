/**
 * API配置
 * 自动检测环境并使用正确的API地址
 */

/**
 * 判断是否为生产环境
 */
function isProduction(): boolean {
    if (typeof window === 'undefined') {
        return process.env.NODE_ENV === 'production';
    }
    
    const hostname = window.location.hostname;
    // 生产环境域名列表
    const productionHosts = ['game.codebn.cn', 'codebn.cn'];
    
    return productionHosts.some(h => hostname === h || hostname.endsWith('.' + h));
}

/**
 * 获取API基础URL
 * 根据当前访问的域名自动判断：
 * - game.codebn.cn: 生产环境，通过Nginx代理
 * - localhost/其他: 开发环境，直接访问后端端口
 */
export function getApiBaseUrl(): string {
    // SSR环境 - 返回相对路径
    if (typeof window === 'undefined') {
        return '/api/v1';
    }
    
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // 生产环境：通过Nginx代理，不需要端口
    if (isProduction()) {
        return `${protocol}//${hostname}/api/v1`;
    }
    
    // 开发环境：直接访问后端端口
    return `${protocol}//${hostname}:8000/api/v1`;
}

/**
 * 获取WebSocket URL
 */
export function getWebSocketUrl(path: string): string {
    if (typeof window === 'undefined') {
        return `ws://localhost:8000${path}`;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    
    // 生产环境：通过Nginx代理
    if (isProduction()) {
        return `${protocol}//${hostname}${path}`;
    }
    
    // 开发环境：直接访问后端端口
    return `${protocol}//${hostname}:8000${path}`;
}

// 导出常量（兼容旧代码）
export const API_BASE_URL = getApiBaseUrl();
