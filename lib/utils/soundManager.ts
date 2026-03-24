/**
 * 🔊 音效管理器
 * 统一管理游戏中的所有音效播放
 */

// 音效类型定义
export type SoundEffect = 
  // 宠物音效
  | 'pet_eat'
  | 'pet_happy'
  | 'pet_sad'
  | 'pet_walk'
  // 互动音效
  | 'button_click'
  | 'button_hover'
  | 'collect_coin'
  | 'collect_gem'
  // 家园音效
  | 'decoration_place'
  // 进化/孵化音效
  | 'evolution_shine'
  | 'level_complete'
  // 成功/失败音效
  | 'answer_correct'
  | 'answer_wrong'
  // 背景音乐
  | 'home_bgm';

// 音效配置
const SOUND_CONFIG: Record<SoundEffect, { path: string; volume?: number }> = {
  // 宠物音效
  pet_eat: { path: '/sounds/pet_eat.wav', volume: 0.6 },
  pet_happy: { path: '/sounds/pet_happy.wav', volume: 0.5 },
  pet_sad: { path: '/sounds/pet_sad.wav', volume: 0.5 },
  pet_walk: { path: '/sounds/pet_walk.wav', volume: 0.3 },
  
  // 互动音效
  button_click: { path: '/sounds/button_click.wav', volume: 0.4 },
  button_hover: { path: '/sounds/button_hover.wav', volume: 0.2 },
  collect_coin: { path: '/sounds/collect_coin.wav', volume: 0.5 },
  collect_gem: { path: '/sounds/collect_gem.wav', volume: 0.5 },
  
  // 家园音效
  decoration_place: { path: '/sounds/decoration_place.wav', volume: 0.5 },
  
  // 进化/孵化音效
  evolution_shine: { path: '/sounds/evolution_shine.wav', volume: 0.6 },
  level_complete: { path: '/sounds/level_complete.wav', volume: 0.6 },
  
  // 成功/失败音效
  answer_correct: { path: '/sounds/answer_correct.wav', volume: 0.5 },
  answer_wrong: { path: '/sounds/answer_wrong.wav', volume: 0.5 },
  
  // 背景音乐
  home_bgm: { path: '/sounds/home_bgm.mp3', volume: 0.3 },
};

// 音效缓存
const audioCache = new Map<SoundEffect, HTMLAudioElement>();

// 背景音乐实例
let bgmInstance: HTMLAudioElement | null = null;

/**
 * 播放音效
 * @param sound 音效类型
 * @param options 播放选项
 */
export function playSound(
  sound: SoundEffect,
  options?: {
    volume?: number;
    loop?: boolean;
    onEnd?: () => void;
  }
): void {
  try {
    const config = SOUND_CONFIG[sound];
    if (!config) {
      console.warn(`Sound effect not found: ${sound}`);
      return;
    }
    
    // 从缓存获取或创建新的音频实例
    let audio = audioCache.get(sound);
    if (!audio) {
      audio = new Audio(config.path);
      audioCache.set(sound, audio);
    }
    
    // 设置音量
    audio.volume = options?.volume ?? config.volume ?? 0.5;
    
    // 设置循环
    audio.loop = options?.loop ?? false;
    
    // 设置结束回调
    if (options?.onEnd) {
      audio.onended = options.onEnd;
    }
    
    // 重置播放位置并播放
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn(`Failed to play sound: ${sound}`, err);
    });
  } catch (error) {
    console.error(`Error playing sound: ${sound}`, error);
  }
}

/**
 * 停止音效
 * @param sound 音效类型
 */
export function stopSound(sound: SoundEffect): void {
  try {
    const audio = audioCache.get(sound);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch (error) {
    console.error(`Error stopping sound: ${sound}`, error);
  }
}

/**
 * 播放背景音乐
 * @param sound 音乐类型
 * @param options 播放选项
 */
export function playBGM(
  sound: SoundEffect,
  options?: {
    volume?: number;
    fadeIn?: boolean;
  }
): void {
  try {
    // 停止当前背景音乐
    if (bgmInstance) {
      stopBGM();
    }
    
    const config = SOUND_CONFIG[sound];
    if (!config) {
      console.warn(`BGM not found: ${sound}`);
      return;
    }
    
    // 创建新的背景音乐实例
    bgmInstance = new Audio(config.path);
    bgmInstance.loop = true;
    bgmInstance.volume = options?.volume ?? config.volume ?? 0.3;
    
    // 淡入效果
    if (options?.fadeIn) {
      bgmInstance.volume = 0;
      bgmInstance.play().catch(err => {
        console.warn(`Failed to play BGM: ${sound}`, err);
      });
      
      // 渐进增加音量
      const targetVolume = options?.volume ?? config.volume ?? 0.3;
      const fadeStep = targetVolume / 20; // 20步淡入
      const fadeInterval = setInterval(() => {
        if (bgmInstance && bgmInstance.volume < targetVolume) {
          bgmInstance.volume = Math.min(bgmInstance.volume + fadeStep, targetVolume);
        } else {
          clearInterval(fadeInterval);
        }
      }, 100);
    } else {
      bgmInstance.play().catch(err => {
        console.warn(`Failed to play BGM: ${sound}`, err);
      });
    }
  } catch (error) {
    console.error(`Error playing BGM: ${sound}`, error);
  }
}

/**
 * 停止背景音乐
 * @param fadeOut 是否淡出
 */
export function stopBGM(fadeOut: boolean = false): void {
  try {
    if (!bgmInstance) return;
    
    if (fadeOut) {
      // 淡出效果
      const fadeStep = bgmInstance.volume / 20; // 20步淡出
      const fadeInterval = setInterval(() => {
        if (bgmInstance && bgmInstance.volume > 0) {
          bgmInstance.volume = Math.max(bgmInstance.volume - fadeStep, 0);
        } else {
          clearInterval(fadeInterval);
          if (bgmInstance) {
            bgmInstance.pause();
            bgmInstance.currentTime = 0;
            bgmInstance = null;
          }
        }
      }, 100);
    } else {
      bgmInstance.pause();
      bgmInstance.currentTime = 0;
      bgmInstance = null;
    }
  } catch (error) {
    console.error('Error stopping BGM', error);
  }
}

/**
 * 设置背景音乐音量
 * @param volume 音量 (0-1)
 */
export function setBGMVolume(volume: number): void {
  if (bgmInstance) {
    bgmInstance.volume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * 预加载音效
 * @param sounds 要预加载的音效列表
 */
export function preloadSounds(sounds: SoundEffect[]): void {
  sounds.forEach(sound => {
    const config = SOUND_CONFIG[sound];
    if (config && !audioCache.has(sound)) {
      const audio = new Audio(config.path);
      audio.preload = 'auto';
      audioCache.set(sound, audio);
    }
  });
}

/**
 * 清理音效缓存
 */
export function clearSoundCache(): void {
  audioCache.forEach(audio => {
    audio.pause();
    audio.src = '';
  });
  audioCache.clear();
  
  if (bgmInstance) {
    bgmInstance.pause();
    bgmInstance.src = '';
    bgmInstance = null;
  }
}
