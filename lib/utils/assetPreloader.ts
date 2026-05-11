/**
 * 🎮 Phaser资源预加载管理器
 * 支持资源优先级、并行加载、进度追踪
 */

export type AssetType = 'image' | 'spritesheet' | 'audio' | 'json' | 'atlas';

export interface AssetConfig {
  key: string;
  type: AssetType;
  url: string;
  // Spritesheet specific
  frameWidth?: number;
  frameHeight?: number;
  // Atlas specific
  atlasURL?: string;
  // Priority (higher = load first)
  priority?: number;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentAsset: string;
}

type ProgressCallback = (progress: PreloadProgress) => void;

// 已加载资源缓存
const loadedAssets = new Set<string>();

// 加载队列
let loadQueue: AssetConfig[] = [];
let isLoading = false;
let progressCallbacks: ProgressCallback[] = [];

// 常用资源包定义
export const ASSET_BUNDLES = {
  // 主场景基础资源
  mainScene: [
    { key: 'player', type: 'spritesheet' as AssetType, url: '/assets/player.png', frameWidth: 32, frameHeight: 48, priority: 10 },
    { key: 'tiles', type: 'image' as AssetType, url: '/assets/tiles.png', priority: 9 },
    { key: 'background', type: 'image' as AssetType, url: '/assets/background.png', priority: 8 },
  ],
  
  // PvP对战资源
  pvp: [
    { key: 'pvp-arena', type: 'image' as AssetType, url: '/assets/pvp/arena.png', priority: 10 },
    { key: 'effects', type: 'atlas' as AssetType, url: '/assets/pvp/effects.png', atlasURL: '/assets/pvp/effects.json', priority: 9 },
  ],
  
  // 宠物系统资源
  pets: [
    // 使用当前仓库真实存在的宠物资源，避免预加载阶段产生 404
    { key: 'pet-egg', type: 'image' as AssetType, url: '/assets/pets/egg.svg', priority: 10 },
    { key: 'pet-code-kitty-stage-1', type: 'image' as AssetType, url: '/assets/pets/camp-remaster/british-shorthair/stage-1.png', priority: 8 },
  ],
  
  // 编辑器资源
  editor: [
    { key: 'editor-tools', type: 'image' as AssetType, url: '/assets/editor/tools.png', priority: 10 },
    { key: 'grid', type: 'image' as AssetType, url: '/assets/editor/grid.png', priority: 9 },
  ],
  
  // 音效
  audio: [
    { key: 'bgm', type: 'audio' as AssetType, url: '/assets/audio/bgm.mp3', priority: 5 },
    { key: 'jump', type: 'audio' as AssetType, url: '/assets/audio/jump.mp3', priority: 7 },
    { key: 'collect', type: 'audio' as AssetType, url: '/assets/audio/collect.mp3', priority: 7 },
  ],
};

/**
 * 检查资源是否已加载
 */
export function isAssetLoaded(key: string): boolean {
  return loadedAssets.has(key);
}

/**
 * 标记资源为已加载
 */
export function markAssetLoaded(key: string): void {
  loadedAssets.add(key);
}

/**
 * 将资源加入预加载队列
 */
export function queueAssets(assets: AssetConfig[]): void {
  // 过滤已加载的资源
  const newAssets = assets.filter(a => !loadedAssets.has(a.key));
  
  // 按优先级排序后加入队列
  newAssets.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  loadQueue.push(...newAssets);
}

/**
 * 预加载资源包
 */
export function queueBundle(bundleName: keyof typeof ASSET_BUNDLES): void {
  const bundle = ASSET_BUNDLES[bundleName];
  if (bundle) {
    queueAssets(bundle);
  }
}

/**
 * 订阅加载进度
 */
export function onProgress(callback: ProgressCallback): () => void {
  progressCallbacks.push(callback);
  return () => {
    progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * 在Phaser场景中执行预加载
 */
export function executePreload(scene: Phaser.Scene): Promise<void> {
  if (loadQueue.length === 0) {
    return Promise.resolve();
  }
  
  if (isLoading) {
    console.warn('[AssetPreloader] Already loading');
    return Promise.resolve();
  }
  
  isLoading = true;
  const assetsToLoad = [...loadQueue];
  loadQueue = [];
  
  return new Promise((resolve) => {
    let loaded = 0;
    const total = assetsToLoad.length;
    
    // 设置进度监听
    scene.load.on('progress', (value: number) => {
      const progress: PreloadProgress = {
        loaded: Math.floor(value * total),
        total,
        percent: Math.round(value * 100),
        currentAsset: assetsToLoad[Math.floor(value * total)]?.key || '',
      };
      progressCallbacks.forEach(cb => cb(progress));
    });
    
    scene.load.on('filecomplete', (key: string) => {
      loadedAssets.add(key);
      loaded++;
    });
    
    scene.load.on('complete', () => {
      isLoading = false;
      resolve();
    });
    
    // 加载资源
    assetsToLoad.forEach(asset => {
      switch (asset.type) {
        case 'image':
          scene.load.image(asset.key, asset.url);
          break;
          
        case 'spritesheet':
          scene.load.spritesheet(asset.key, asset.url, {
            frameWidth: asset.frameWidth || 32,
            frameHeight: asset.frameHeight || 32,
          });
          break;
          
        case 'audio':
          scene.load.audio(asset.key, asset.url);
          break;
          
        case 'json':
          scene.load.json(asset.key, asset.url);
          break;
          
        case 'atlas':
          if (asset.atlasURL) {
            scene.load.atlas(asset.key, asset.url, asset.atlasURL);
          }
          break;
      }
    });
    
    scene.load.start();
  });
}

/**
 * 使用fetch API预加载图片（用于非Phaser场景）
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // 静默失败
      img.src = url;
    });
  });
  
  await Promise.all(promises);
}

/**
 * 根据当前路由预测并预加载资源
 */
export function predictivePreload(currentRoute: string): void {
  // 基于当前路由预测下一步可能需要的资源
  const predictions: Record<string, (keyof typeof ASSET_BUNDLES)[]> = {
    '/': ['mainScene'],
    '/world': ['mainScene', 'pets'],
    '/pvp': ['pvp', 'mainScene'],
    '/editor': ['editor', 'mainScene'],
    '/pet': ['pets'],
  };
  
  const bundles = predictions[currentRoute] || [];
  bundles.forEach(bundle => queueBundle(bundle));
}

/**
 * 清除加载缓存（用于内存管理）
 */
export function clearLoadedCache(): void {
  loadedAssets.clear();
}

/**
 * 获取已加载资源列表
 */
export function getLoadedAssets(): string[] {
  return Array.from(loadedAssets);
}

/**
 * 获取加载统计
 */
export function getLoadStats(): { loaded: number; queued: number } {
  return {
    loaded: loadedAssets.size,
    queued: loadQueue.length,
  };
}
