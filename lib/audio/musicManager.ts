import { useSoundStore } from '@/store/soundStore';

// 🎵 BGM 类型定义
export type BGMType = 'main' | 'battle' | 'boss' | 'pvp' | 'victory' | 'arena' | 'home';

// BGM 配置 - 使用本地音效文件
const BGM_CONFIG: Record<BGMType, { path: string; volume: number }> = {
    main: { path: '/sounds/bgm_main.mp3', volume: 0.15 },      // 主界面/开放世界
    battle: { path: '/sounds/bgm_battle.wav', volume: 0.18 },  // 战役模式
    boss: { path: '/sounds/bgm_boss.wav', volume: 0.20 },      // Boss战
    pvp: { path: '/sounds/bgm_pvp.mp3', volume: 0.18 },        // PVP对战
    victory: { path: '/sounds/bgm_victory.wav', volume: 0.25 }, // 胜利
    arena: { path: '/sounds/bgm_battle.wav', volume: 0.18 },   // 竞技场
    home: { path: '/sounds/home_bgm.mp3', volume: 0.20 }       // 宠物小屋
};

// 🎵 统一的音乐管理器 - 全局单例
// 解决多个背景音乐重叠播放的问题
class MusicManager {
    private audio: HTMLAudioElement | null = null;
    private isPlaying = false;
    private initialized = false;
    private currentBGM: BGMType = 'main';
    private fadeInterval: NodeJS.Timeout | null = null;
    private lockedBGM: BGMType | null = null;

    async initialize() {
        if (typeof window === 'undefined') return;
        
        if (this.initialized && this.audio) {
            return;
        }
        
        try {
            if (this.audio) {
                this.audio.pause();
                this.audio.src = '';
                this.audio = null;
            }
            
            this.audio = new Audio();
            this.audio.src = BGM_CONFIG.main.path;
            this.audio.loop = true;
            this.audio.volume = BGM_CONFIG.main.volume;
            this.audio.load();
            this.initialized = true;
            this.currentBGM = 'main';
        } catch (error) {
            // 初始化失败
        }
    }

    async play() {
        if (!this.audio || !this.initialized) {
            await this.initialize();
            if (!this.audio) return;
        }

        const { isMuted } = useSoundStore.getState();
        if (isMuted) return;
        
        if (this.isPlaying && !this.audio.paused) {
            return;
        }

        try {
            await this.audio.play();
            this.isPlaying = true;
        } catch {
            // 播放失败
        }
    }

    // 🔥 切换 BGM（带淡入淡出效果）
    async switchBGM(type: BGMType, fadeOut = true) {
        if (typeof window === 'undefined') return;

        // 如果被锁定，拒绝切换到其他BGM
        if (this.lockedBGM && type !== this.lockedBGM) {
            return;
        }
        
        // 如果是同一个 BGM 且正在播放，不切换
        // 但如果没有在播放，则尝试启动
        if (type === this.currentBGM) {
            if (this.isPlaying && this.audio && !this.audio.paused) {
                return;
            }
            // 同类型BGM但未播放，继续执行以重新启动
        }
        
        const { isMuted } = useSoundStore.getState();
        if (isMuted) {
            this.currentBGM = type;
            return;
        }
        
        // 清除之前的淡出定时器
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        
        // 淡出当前音乐
        if (fadeOut && this.audio && this.isPlaying) {
            await this.fadeOutCurrent();
        } else if (this.audio) {
            this.audio.pause();
        }
        
        // 切换到新 BGM
        this.currentBGM = type;
        const config = BGM_CONFIG[type];
        
        if (!this.audio) {
            this.audio = new Audio();
        }
        
        this.audio.src = config.path;
        this.audio.loop = type !== 'victory'; // 胜利音乐不循环
        this.audio.volume = 0; // 从 0 开始淡入
        this.audio.load();
        
        try {
            await this.audio.play();
            this.isPlaying = true;
            // 淡入
            await this.fadeIn(config.volume);
        } catch {
            // 切换BGM失败
        }
    }
    
    // 淡出当前音乐
    private fadeOutCurrent(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.audio) {
                resolve();
                return;
            }
            
            const startVolume = this.audio.volume;
            const steps = 10;
            const stepTime = 30; // 300ms 淡出
            let step = 0;
            
            this.fadeInterval = setInterval(() => {
                step++;
                if (this.audio) {
                    this.audio.volume = Math.max(0, startVolume * (1 - step / steps));
                }
                
                if (step >= steps) {
                    if (this.fadeInterval) {
                        clearInterval(this.fadeInterval);
                        this.fadeInterval = null;
                    }
                    if (this.audio) {
                        this.audio.pause();
                        this.audio.currentTime = 0;
                    }
                    this.isPlaying = false;
                    resolve();
                }
            }, stepTime);
        });
    }
    
    // 淡入新音乐
    private fadeIn(targetVolume: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.audio) {
                resolve();
                return;
            }
            
            const steps = 10;
            const stepTime = 50; // 500ms 淡入
            let step = 0;
            
            this.fadeInterval = setInterval(() => {
                step++;
                if (this.audio) {
                    this.audio.volume = Math.min(targetVolume, targetVolume * (step / steps));
                }
                
                if (step >= steps) {
                    if (this.fadeInterval) {
                        clearInterval(this.fadeInterval);
                        this.fadeInterval = null;
                    }
                    resolve();
                }
            }, stepTime);
        });
    }

    stop() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        this.isPlaying = false;
    }
    
    pause() {
        if (this.audio) {
            this.audio.pause();
        }
        this.isPlaying = false;
    }
    
    resume() {
        if (!this.audio) return;
        
        const { isMuted } = useSoundStore.getState();
        if (isMuted) return;
        
        this.audio.play().then(() => {
            this.isPlaying = true;
        }).catch(() => {});
    }

    setVolume(volume: number) {
        if (this.audio) {
            const config = BGM_CONFIG[this.currentBGM];
            this.audio.volume = Math.max(0, Math.min(1, volume * config.volume * 2));
        }
    }

    toggleMute() {
        const { isMuted } = useSoundStore.getState();
        if (isMuted) {
            this.stop();
        } else if (!this.isPlaying) {
            this.play();
        }
    }
    
    getIsPlaying(): boolean {
        return this.isPlaying && this.audio !== null && !this.audio.paused;
    }
    
    getCurrentBGM(): BGMType {
        return this.currentBGM;
    }

    // 🔒 锁定BGM，防止被其他模块切换
    lockBGM(type: BGMType) {
        this.lockedBGM = type;
        this.switchBGM(type);
    }

    // 🔓 解锁BGM
    unlockBGM(type?: BGMType) {
        if (!type || this.lockedBGM === type) {
            this.lockedBGM = null;
        }
    }
}

// 全局单例
export const musicManager = new MusicManager();
