/**
 * Phaser asset preloader.
 * Keeps shared bundles and a lightweight queue for scene-level loading.
 */

export type AssetType = 'image' | 'spritesheet' | 'audio' | 'json' | 'atlas';

export interface AssetConfig {
  key: string;
  type: AssetType;
  url: string;
  frameWidth?: number;
  frameHeight?: number;
  atlasURL?: string;
  priority?: number;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentAsset: string;
}

type ProgressCallback = (progress: PreloadProgress) => void;

const loadedAssets = new Set<string>();
let loadQueue: AssetConfig[] = [];
let isLoading = false;
let progressCallbacks: ProgressCallback[] = [];

export const ASSET_BUNDLES = {
  mainScene: [
    { key: 'player', type: 'spritesheet' as AssetType, url: '/assets/player.png', frameWidth: 32, frameHeight: 48, priority: 10 },
    { key: 'tiles', type: 'image' as AssetType, url: '/assets/tiles.png', priority: 9 },
    { key: 'background', type: 'image' as AssetType, url: '/assets/background.png', priority: 8 },
  ],

  platformCampaignBase: [
    { key: 'platform-player', type: 'image' as AssetType, url: '/assets/campaign-platform/characters/hero-maple-student.svg', priority: 10 },
    { key: 'platform-coin', type: 'image' as AssetType, url: '/assets/campaign-platform/items/coin-sun.svg', priority: 8 },
    { key: 'platform-dash-star', type: 'image' as AssetType, url: '/assets/campaign-platform/items/dash-star-bloom.svg', priority: 8 },
    { key: 'platform-goal-flag', type: 'image' as AssetType, url: '/assets/campaign-platform/items/goal-flower-flag.svg', priority: 9 },
  ],

  pvp: [
    { key: 'pvp-arena', type: 'image' as AssetType, url: '/assets/pvp/arena.png', priority: 10 },
    { key: 'effects', type: 'atlas' as AssetType, url: '/assets/pvp/effects.png', atlasURL: '/assets/pvp/effects.json', priority: 9 },
  ],

  pets: [
    { key: 'pet-egg', type: 'image' as AssetType, url: '/assets/pets/egg.svg', priority: 10 },
    { key: 'pet-code-kitty-stage-1', type: 'image' as AssetType, url: '/assets/pets/camp-remaster/british-shorthair/stage-1.png', priority: 8 },
  ],

  editor: [
    { key: 'editor-tools', type: 'image' as AssetType, url: '/assets/editor/tools.png', priority: 10 },
    { key: 'grid', type: 'image' as AssetType, url: '/assets/editor/grid.png', priority: 9 },
  ],

  audio: [
    { key: 'bgm', type: 'audio' as AssetType, url: '/assets/audio/bgm.mp3', priority: 5 },
    { key: 'jump', type: 'audio' as AssetType, url: '/assets/audio/jump.mp3', priority: 7 },
    { key: 'collect', type: 'audio' as AssetType, url: '/assets/audio/collect.mp3', priority: 7 },
  ],
} as const;

export function isAssetLoaded(key: string): boolean {
  return loadedAssets.has(key);
}

export function markAssetLoaded(key: string): void {
  loadedAssets.add(key);
}

export function queueAssets(assets: readonly AssetConfig[]): void {
  const newAssets = assets.filter((asset) => !loadedAssets.has(asset.key));
  newAssets.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  loadQueue.push(...newAssets);
}

export function queueBundle(bundleName: keyof typeof ASSET_BUNDLES): void {
  const bundle = ASSET_BUNDLES[bundleName];
  if (bundle) {
    queueAssets(bundle);
  }
}

export function onProgress(callback: ProgressCallback): () => void {
  progressCallbacks.push(callback);
  return () => {
    progressCallbacks = progressCallbacks.filter((existingCallback) => existingCallback !== callback);
  };
}

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
    const total = assetsToLoad.length;

    scene.load.on('progress', (value: number) => {
      const progress: PreloadProgress = {
        loaded: Math.floor(value * total),
        total,
        percent: Math.round(value * 100),
        currentAsset: assetsToLoad[Math.floor(value * total)]?.key || '',
      };
      progressCallbacks.forEach((callback) => callback(progress));
    });

    scene.load.on('filecomplete', (key: string) => {
      loadedAssets.add(key);
    });

    scene.load.on('complete', () => {
      isLoading = false;
      resolve();
    });

    assetsToLoad.forEach((asset) => {
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

export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map((url) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  }));

  await Promise.all(promises);
}

export function predictivePreload(currentRoute: string): void {
  const predictions: Record<string, (keyof typeof ASSET_BUNDLES)[]> = {
    '/': ['mainScene'],
    '/world': ['mainScene', 'pets'],
    '/pvp': ['pvp', 'mainScene'],
    '/editor': ['editor', 'mainScene'],
    '/pet': ['pets'],
    '/campaign': ['platformCampaignBase'],
  };

  const bundles = predictions[currentRoute] || [];
  bundles.forEach((bundle) => queueBundle(bundle));
}

export function clearLoadedCache(): void {
  loadedAssets.clear();
}

export function getLoadedAssets(): string[] {
  return Array.from(loadedAssets);
}

export function getLoadStats(): { loaded: number; queued: number } {
  return {
    loaded: loadedAssets.size,
    queued: loadQueue.length,
  };
}
