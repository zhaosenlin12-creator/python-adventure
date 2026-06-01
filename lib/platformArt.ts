export type PlatformThemeId =
  | 'default'
  | 'campaign_12'
  | 'campaign_13'
  | 'campaign_14'
  | 'campaign_15'
  | 'campaign_16';

export interface PlatformArtPack {
  player: {
    texture: string;
    displaySize: number;
    collisionSize: number;
  };
  enemies: Record<string, string>;
  items: {
    coin: string;
    dashStar: string;
  };
  goal: {
    texture: string;
  };
  background: {
    layers: string[];
  };
  specialPlatforms: {
    groundFill: number;
    groundEdge: number;
    platformFill: number;
    platformEdge: number;
    movingFill: number;
    movingEdge: number;
  };
}

export interface PlatformShellTheme {
  chromeClassName: string;
  panelClassName: string;
  accentClassName: string;
}

export const PLATFORM_THEME_IDS: readonly PlatformThemeId[] = [
  'default',
  'campaign_12',
  'campaign_13',
  'campaign_14',
  'campaign_15',
  'campaign_16',
] as const;

const GLOBAL_PLAYER_TEXTURE = '/assets/campaign-platform/characters/hero-maple-student.svg';
const GLOBAL_COIN_TEXTURE = '/assets/campaign-platform/items/coin-sun.svg';
const GLOBAL_DASH_STAR_TEXTURE = '/assets/campaign-platform/items/dash-star-bloom.svg';
const GLOBAL_GOAL_TEXTURE = '/assets/campaign-platform/items/goal-flower-flag.svg';

const DEFAULT_ART_PACK: PlatformArtPack = {
  player: {
    texture: GLOBAL_PLAYER_TEXTURE,
    displaySize: 44,
    collisionSize: 54,
  },
  enemies: {
    patrol: '/assets/campaign-platform/characters/enemy-valley-scout.svg',
  },
  items: {
    coin: GLOBAL_COIN_TEXTURE,
    dashStar: GLOBAL_DASH_STAR_TEXTURE,
  },
  goal: {
    texture: GLOBAL_GOAL_TEXTURE,
  },
  background: {
    layers: [],
  },
  specialPlatforms: {
    groundFill: 0x6f5b40,
    groundEdge: 0xb58b52,
    platformFill: 0x5aa16a,
    platformEdge: 0xc5f1bf,
    movingFill: 0xf59e0b,
    movingEdge: 0xfff0b3,
  },
};

const THEME_ART_PACKS: Record<PlatformThemeId, PlatformArtPack> = {
  default: DEFAULT_ART_PACK,
  campaign_12: {
    ...DEFAULT_ART_PACK,
    background: {
      layers: [
        '/assets/campaign-platform/backgrounds/campaign12-sky.svg',
        '/assets/campaign-platform/backgrounds/campaign12-mid.svg',
        '/assets/campaign-platform/backgrounds/campaign12-fore.svg',
      ],
    },
    enemies: {
      patrol: '/assets/campaign-platform/characters/enemy-valley-scout.svg',
    },
    specialPlatforms: {
      groundFill: 0x66513d,
      groundEdge: 0xe8c67f,
      platformFill: 0x5b9364,
      platformEdge: 0xd9f4c9,
      movingFill: 0xd79246,
      movingEdge: 0xffefb5,
    },
  },
  campaign_13: {
    ...DEFAULT_ART_PACK,
    enemies: {
      patrol: '/assets/campaign-platform/characters/enemy-mirror-sentry.svg',
    },
    specialPlatforms: {
      groundFill: 0x403c64,
      groundEdge: 0xc8c4ff,
      platformFill: 0x6673ca,
      platformEdge: 0xe0e6ff,
      movingFill: 0xa277ff,
      movingEdge: 0xf4e7ff,
    },
  },
  campaign_14: {
    ...DEFAULT_ART_PACK,
    enemies: {
      patrol: '/assets/campaign-platform/characters/enemy-wind-drummer.svg',
    },
    specialPlatforms: {
      groundFill: 0x75634a,
      groundEdge: 0xf5d57d,
      platformFill: 0x77a061,
      platformEdge: 0xedf9c8,
      movingFill: 0xe1944c,
      movingEdge: 0xfff2be,
    },
  },
  campaign_15: {
    ...DEFAULT_ART_PACK,
    enemies: {
      patrol: '/assets/campaign-platform/characters/enemy-workshop-proctor.svg',
    },
    specialPlatforms: {
      groundFill: 0x67493a,
      groundEdge: 0xe8bb80,
      platformFill: 0x7f8f5f,
      platformEdge: 0xf1f0d2,
      movingFill: 0xd4843d,
      movingEdge: 0xfff0be,
    },
  },
  campaign_16: {
    ...DEFAULT_ART_PACK,
    enemies: {
      patrol: '/assets/campaign-platform/characters/enemy-dam-warden.svg',
    },
    specialPlatforms: {
      groundFill: 0x4b5860,
      groundEdge: 0xc9dfeb,
      platformFill: 0x688897,
      platformEdge: 0xf0fbff,
      movingFill: 0x7aa5b6,
      movingEdge: 0xf6feff,
    },
  },
};

const SHELL_THEMES: Record<PlatformThemeId, PlatformShellTheme> = {
  default: {
    chromeClassName: 'from-slate-900 via-slate-800 to-slate-950 border-emerald-300/20',
    panelClassName: 'border-sky-200/15 bg-slate-950/70 shadow-[0_18px_42px_rgba(8,15,30,0.35)]',
    accentClassName: 'text-emerald-300',
  },
  campaign_12: {
    chromeClassName: 'from-emerald-950 via-cyan-950 to-slate-950 border-emerald-300/20',
    panelClassName: 'border-sky-300/20 bg-slate-950/72 shadow-[0_22px_50px_rgba(7,31,44,0.4)]',
    accentClassName: 'text-emerald-300',
  },
  campaign_13: {
    chromeClassName: 'from-indigo-950 via-violet-950 to-slate-950 border-violet-300/22',
    panelClassName: 'border-sky-200/15 bg-slate-950/72 shadow-[0_22px_50px_rgba(26,18,52,0.42)]',
    accentClassName: 'text-violet-200',
  },
  campaign_14: {
    chromeClassName: 'from-teal-950 via-amber-950 to-slate-950 border-amber-300/24',
    panelClassName: 'border-emerald-200/14 bg-slate-950/72 shadow-[0_22px_50px_rgba(38,30,16,0.42)]',
    accentClassName: 'text-amber-200',
  },
  campaign_15: {
    chromeClassName: 'from-stone-950 via-orange-950 to-slate-950 border-orange-300/22',
    panelClassName: 'border-amber-200/18 bg-slate-950/74 shadow-[0_22px_50px_rgba(39,24,16,0.44)]',
    accentClassName: 'text-orange-200',
  },
  campaign_16: {
    chromeClassName: 'from-slate-950 via-sky-950 to-slate-900 border-cyan-200/20',
    panelClassName: 'border-slate-200/18 bg-slate-950/74 shadow-[0_22px_50px_rgba(15,28,38,0.44)]',
    accentClassName: 'text-cyan-100',
  },
};

export function getPlatformCampaignThemeId(levelId: string | null | undefined): PlatformThemeId {
  const normalized = levelId ?? '';

  if (normalized === 'campaign_12') return 'campaign_12';
  if (normalized === 'campaign_13') return 'campaign_13';
  if (normalized === 'campaign_14') return 'campaign_14';
  if (normalized === 'campaign_15') return 'campaign_15';
  if (normalized === 'campaign_16') return 'campaign_16';

  if (/^level_12_/.test(normalized)) return 'campaign_12';
  if (/^level_13_/.test(normalized)) return 'campaign_13';
  if (/^level_14_/.test(normalized)) return 'campaign_14';
  if (/^level_15_/.test(normalized)) return 'campaign_15';
  if (/^level_16_/.test(normalized)) return 'campaign_16';

  return 'default';
}

export function getPlatformArtPack(themeId: PlatformThemeId): PlatformArtPack {
  return THEME_ART_PACKS[themeId] || DEFAULT_ART_PACK;
}

export function getPlatformShellTheme(themeId: PlatformThemeId): PlatformShellTheme {
  return SHELL_THEMES[themeId] || SHELL_THEMES.default;
}
