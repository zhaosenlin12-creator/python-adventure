import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiBaseUrl } from '@/lib/config/api';

// 生产环境禁用调试日志
// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

interface User {
    id: number;
    username: string;
    email: string;
    level: number;
    experience: number;
    coins: number; // 💰 金币余额
}

interface PasswordResetResponse {
    message: string;
    default_password: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const error = await response.json();
        if (typeof error.detail === 'string' && error.detail.trim()) {
            return error.detail;
        }
        if (typeof error.message === 'string' && error.message.trim()) {
            return error.message;
        }
        return JSON.stringify(error.detail || error);
    } catch {
        return fallback || `HTTP ${response.status}`;
    }
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    // 🔒 同步状态
    syncStatus: 'synced' | 'pending' | 'failed' | 'token-expired';
    lastSyncError: string | null;

    // Actions
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    resetPassword: (username: string) => Promise<PasswordResetResponse>;
    logout: () => void;
    loadUserProfile: () => Promise<void>;
    clearError: () => void;
    // 🔒 Token 过期处理
    handleTokenExpired: () => void;
    setSyncStatus: (status: 'synced' | 'pending' | 'failed' | 'token-expired', error?: string) => void;
    // 🔒 Token 主动验证（页面加载时调用）
    validateToken: () => Promise<boolean>;
}

// 使用动态API地址，支持局域网访问
const getApiUrl = () => getApiBaseUrl();

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            // 🔒 同步状态
            syncStatus: 'synced' as const,
            lastSyncError: null,

            // 🔒 设置同步状态
            setSyncStatus: (status, error) => {
                set({ syncStatus: status, lastSyncError: error || null });
            },

            // 🔒 Token 过期处理 - 不中断游戏，只标记状态
            handleTokenExpired: () => {
                debugLog('[AuthStore] Token expired, marking status...');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    syncStatus: 'token-expired',
                    lastSyncError: '需要重新登录才能同步云端进度',
                });
            },

            login: async (username: string, password: string) => {
                debugLog('[AuthStore] Starting login...', { username });
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`${getApiUrl()}/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username,
                            password,
                        }),
                    });

                    debugLog('[AuthStore] Login response status:', response.status);

                    if (!response.ok) {
                        let errorMessage = 'Login failed';
                        try {
                            const error = await response.json();
                            console.error('[AuthStore] Login error:', error);
                            if (typeof error.detail === 'string') {
                                errorMessage = error.detail;
                            } else {
                                errorMessage = JSON.stringify(error.detail || error);
                            }
                        } catch {
                            errorMessage = `HTTP ${response.status}`;
                        }
                        throw new Error(errorMessage);
                    }

                    const data = await response.json();
                    debugLog('[AuthStore] Login successful:', data);

                    set({
                        token: data.access_token,
                        user: data.user,
                        isAuthenticated: true,
                        isLoading: false,
                        syncStatus: 'synced',
                        lastSyncError: null,
                    });

                    // Load game progress from cloud after successful login
                    try {
                        const { useGameStore } = await import('./gameStore');
                        await useGameStore.getState().loadFromCloud();
                        debugLog('[AuthStore] Game progress loaded from cloud');
                    } catch (error) {
                        console.error('[AuthStore] Failed to load game progress:', error);
                    }

                    // 🐾 Load pet status after successful login
                    try {
                        const { usePetStore } = await import('./petStore');
                        await usePetStore.getState().loadPets();
                        debugLog('[AuthStore] Pet status loaded');
                        
                        // Check if pet needs attention
                        const petState = usePetStore.getState();
                        if (petState.currentPet) {
                            const pet = petState.currentPet;
                            if (pet.status === 'coma') {
                                // Show notification for coma pet
                                console.warn('[AuthStore] 🚨 Your pet is in coma! Please rescue it by answering questions.');
                                // TODO: Show in-game notification
                            } else if (pet.status === 'tired') {
                                // Show notification for tired pet
                                console.warn('[AuthStore] 😴 Your pet is tired! Feed it soon to keep it healthy.');
                                // TODO: Show in-game notification
                            }
                        }
                    } catch (error) {
                        console.error('[AuthStore] Failed to load pet status:', error);
                    }
                } catch (error: unknown) {
                    console.error('[AuthStore] Login error:', error);
                    set({
                        error: error instanceof Error ? error.message : String(error),
                        isLoading: false,
                        isAuthenticated: false,
                    });
                    throw error;
                }
            },

            register: async (username: string, email: string, password: string) => {
                debugLog('[AuthStore] Starting registration...', { username, email });
                set({ isLoading: true, error: null });
                try {
                    const url = `${getApiUrl()}/auth/register`;
                    debugLog('[AuthStore] Fetching:', url);

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username,
                            email,
                            password,
                        }),
                    });

                    debugLog('[AuthStore] Response status:', response.status);
                    debugLog('[AuthStore] Response ok:', response.ok);

                    if (!response.ok) {
                        let errorMessage = 'Registration failed';
                        errorMessage = await readErrorMessage(response, errorMessage);
                        throw new Error(errorMessage);
                    }

                    const data = await response.json();
                    debugLog('[AuthStore] Registration successful:', data);
                    set({
                        isLoading: false,
                    });

                    // Auto-login after registration
                    debugLog('[AuthStore] Auto-logging in...');
                    await get().login(username, password);
                } catch (error: unknown) {
                    console.error('[AuthStore] Registration error:', error);
                    console.error('[AuthStore] Error message:', error instanceof Error ? error.message : String(error));
                    set({
                        error: error instanceof Error ? error.message : String(error),
                        isLoading: false,
                    });
                    throw error;
                }
            },

            resetPassword: async (username: string) => {
                const normalizedUsername = username.trim();
                if (!normalizedUsername) {
                    const message = '请先输入用户名，再重置密码。';
                    set({ error: message });
                    throw new Error(message);
                }

                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username: normalizedUsername }),
                    });

                    if (!response.ok) {
                        const errorMessage = await readErrorMessage(response, '重置密码失败');
                        throw new Error(errorMessage);
                    }

                    const payload = (await response.json()) as PasswordResetResponse;
                    set({ isLoading: false, error: null });
                    return payload;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    set({
                        error: message,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: () => {
                // 🔒 安全：调用后端登出接口使Token失效
                const { token } = get();
                if (token) {
                    // 异步调用，不阻塞UI
                    fetch(`${getApiUrl()}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }).catch(err => {
                        console.debug('[AuthStore] Logout API call failed (non-blocking):', err);
                    });
                }
                
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null,
                    syncStatus: 'synced',
                    lastSyncError: null,
                });
            },

            loadUserProfile: async () => {
                const { token } = get();
                if (!token) return;

                try {
                    const response = await fetch(`${getApiUrl()}/users/profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Failed to load profile');
                    }

                    const user = await response.json();
                    set({ user });
                } catch (error: unknown) {
                    console.error('Failed to load user profile:', error);
                    // If token is invalid, logout
                    get().logout();
                }
            },

            // 🔒 Token 主动验证 - 页面加载时调用，检查token是否仍然有效
            validateToken: async () => {
                const { token, isAuthenticated } = get();
                
                // 如果没有token或未登录，直接返回false
                if (!token || !isAuthenticated) {
                    return false;
                }

                try {
                    // 调用用户信息接口验证token
                    const response = await fetch(`${getApiUrl()}/users/profile`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    if (response.status === 401) {
                        // Token已过期，触发过期处理
                        debugLog('[AuthStore] Token validation failed - expired');
                        get().handleTokenExpired();
                        return false;
                    }

                    if (!response.ok) {
                        // 其他错误（如网络问题），不清除登录状态
                        debugLog('[AuthStore] Token validation failed - server error');
                        return false;
                    }

                    // Token有效，更新用户信息
                    const user = await response.json();
                    set({ user });
                    debugLog('[AuthStore] Token validated successfully');
                    return true;
                } catch (error) {
                    // 网络错误，不清除登录状态（可能是离线）
                    console.error('[AuthStore] Token validation error:', error);
                    return false;
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
