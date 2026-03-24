import { create } from 'zustand';

// 只在真正的本地开发环境输出调试日志
const isLocalDev = typeof window !== 'undefined' 
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  : process.env.NODE_ENV === 'development';
const debugLog = isLocalDev ? console.log.bind(console) : () => {};

// 🎵 音效类型 - 不包含bgm，bgm由musicManager统一管理
type SoundType = 'click' | 'attack' | 'hit' | 'win' | 'lose' | 'run';

// 🔥 音效URL配置 - 使用本地文件，避免外部URL加载失败
const SOUND_URLS: Record<SoundType, string> = {
    // 音效（使用本地文件，更稳定可靠）
    click: '/sounds/button_click.wav',      // 按钮点击
    attack: '/sounds/player_attack.wav',    // 攻击
    hit: '/sounds/enemy_hit.wav',           // 击中
    win: '/sounds/level_complete.wav',      // 胜利
    lose: '/sounds/level_failed.wav',       // 失败
    run: '/sounds/player_jump.wav',         // 跑步/跳跃
};

interface AudioState {
    isMuted: boolean;
    isReady: boolean;
    audioElements: Record<string, HTMLAudioElement>;
    init: () => void;
    play: (type: SoundType) => void;
    stop: (type: SoundType) => void;
    toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
    isMuted: false,
    isReady: false,
    audioElements: {},

    init: () => {
        if (typeof window === 'undefined') return;
        if (get().isReady) return;

        debugLog("AudioStore: Initializing sound effects...");
        const elements: Record<string, HTMLAudioElement> = {};

        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.volume = 0.5;

            audio.onerror = () => {
                console.warn(`AudioStore: Failed to load ${key} (suppressed)`);
            };

            elements[key] = audio;
        });

        set({ audioElements: elements, isReady: true });
        debugLog("AudioStore: Sound effects ready");
    },

    play: (type: SoundType) => {
        const { isMuted, isReady, audioElements } = get();
        if (isMuted || !isReady) return;

        const audio = audioElements[type];
        if (!audio) return;

        // 重置播放位置
        audio.currentTime = 0;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // 忽略自动播放策略错误
            });
        }
    },

    stop: (type: SoundType) => {
        const { audioElements } = get();
        const audio = audioElements[type];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    },

    toggleMute: () => {
        const { isMuted } = get();
        set({ isMuted: !isMuted });
        // 注意：背景音乐的静音由 musicManager 处理
    }
}));
