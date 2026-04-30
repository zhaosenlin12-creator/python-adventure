import type { Campaign, CampaignLevel, ChemicalZone, Trap } from './campaigns';
import { gem, healthPack, expandingHazard, gearChaser, movingSpike } from './campaign-door-helpers';

type DoorCampaignId =
  | 'campaign_11'
  | 'campaign_12'
  | 'campaign_13'
  | 'campaign_14'
  | 'campaign_15'
  | 'campaign_16';

type DoorPolishProfile = {
  speedColor: number;
  healColor: number;
  dangerColor: number;
  secondaryDangerColor: number;
  gearTheme: 'storm' | 'forge' | 'bronze';
  pulseTheme: 'pulse' | 'frost' | 'alert';
  spikeTheme: 'void' | 'storm' | 'steel';
  enemyWave: string[];
  bossVisuals: [string, string];
  comboName: string;
  comboColor: number;
  rewardTitle: string;
};

type DoorEnemy = {
  x: number;
  y: number;
  type: string;
  bossId?: string;
  bossIndex?: number;
  polishId?: string;
  [key: string]: any;
};

const DOOR_CAMPAIGN_IDS: DoorCampaignId[] = [
  'campaign_11',
  'campaign_12',
  'campaign_13',
  'campaign_14',
  'campaign_15',
  'campaign_16',
];

const POLISH_PROFILES: Record<DoorCampaignId, DoorPolishProfile> = {
  campaign_11: {
    speedColor: 0x6ee7f9,
    healColor: 0xa7f3d0,
    dangerColor: 0x7c3aed,
    secondaryDangerColor: 0x38bdf8,
    gearTheme: 'storm',
    pulseTheme: 'pulse',
    spikeTheme: 'void',
    enemyWave: ['bat', 'robot', 'turret'],
    bossVisuals: ['default', 'echo'],
    comboName: '幻门回声共振',
    comboColor: 0x8b5cf6,
    rewardTitle: '幻门识破印记',
  },
  campaign_12: {
    speedColor: 0x22d3ee,
    healColor: 0x93c5fd,
    dangerColor: 0x0ea5e9,
    secondaryDangerColor: 0x06b6d4,
    gearTheme: 'storm',
    pulseTheme: 'frost',
    spikeTheme: 'storm',
    enemyWave: ['bat', 'acid_turret', 'robot'],
    bossVisuals: ['default', 'current'],
    comboName: '坠流回升合击',
    comboColor: 0x38bdf8,
    rewardTitle: '车涧回升徽章',
  },
  campaign_13: {
    speedColor: 0xa5b4fc,
    healColor: 0xc4b5fd,
    dangerColor: 0x818cf8,
    secondaryDangerColor: 0xf0abfc,
    gearTheme: 'storm',
    pulseTheme: 'pulse',
    spikeTheme: 'void',
    enemyWave: ['bat', 'turret', 'robot'],
    bossVisuals: ['mirror_left', 'mirror_right'],
    comboName: '镜廊双折射',
    comboColor: 0xa78bfa,
    rewardTitle: '镜门换位纹章',
  },
  campaign_14: {
    speedColor: 0xfbbf24,
    healColor: 0x86efac,
    dangerColor: 0xf97316,
    secondaryDangerColor: 0x67e8f9,
    gearTheme: 'storm',
    pulseTheme: 'alert',
    spikeTheme: 'storm',
    enemyWave: ['bat', 'robot', 'turret'],
    bossVisuals: ['wind_guard', 'beat_guard'],
    comboName: '风拍同频压制',
    comboColor: 0xf59e0b,
    rewardTitle: '听风节拍勋章',
  },
  campaign_15: {
    speedColor: 0xf59e0b,
    healColor: 0xfde68a,
    dangerColor: 0xef4444,
    secondaryDangerColor: 0xf97316,
    gearTheme: 'forge',
    pulseTheme: 'alert',
    spikeTheme: 'steel',
    enemyWave: ['robot', 'turret', 'acid_turret'],
    bossVisuals: ['forge_scribe', 'shift_judge'],
    comboName: '工坊判题连铸',
    comboColor: 0xf97316,
    rewardTitle: '机关工坊通行章',
  },
  campaign_16: {
    speedColor: 0xe0f2fe,
    healColor: 0xbae6fd,
    dangerColor: 0x64748b,
    secondaryDangerColor: 0xf59e0b,
    gearTheme: 'forge',
    pulseTheme: 'frost',
    spikeTheme: 'void',
    enemyWave: ['robot', 'bat', 'turret', 'acid_turret'],
    bossVisuals: ['gate_commander', 'gate_core'],
    comboName: '终门校验矩阵',
    comboColor: 0xfbbf24,
    rewardTitle: '三峰终测核心',
  },
};

const SUPPORTED_DUAL_BOSS_ATTACKS = new Set([
  'acid_pool',
  'acid_spray',
  'poison_cloud',
  'gas_burst',
  'projectile',
  'projectile_spread',
  'summon',
]);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const withPolishId = <T extends object>(items: T[] | undefined, item: T & { polishId?: string }): T[] => {
  const list = (items ?? []) as Array<T & { polishId?: string }>;
  if (item.polishId && list.some((existing) => existing.polishId === item.polishId)) {
    return list;
  }
  return [...list, item] as T[];
};

const pickPlatformAnchor = (level: CampaignLevel, ratio: number) => {
  const mapData = level.campaignMapData;
  const platforms = (mapData?.platforms ?? [])
    .filter((platform) => platform.width >= 120 && platform.y > 80)
    .sort((left, right) => left.x - right.x);

  if (platforms.length === 0) {
    const width = mapData?.width ?? Math.max(mapData?.goal?.x ?? 3000, 3000);
    const height = mapData?.height ?? 1800;
    return {
      x: clamp(width * ratio, 260, Math.max(300, width - 260)),
      y: clamp(height * 0.62, 220, Math.max(260, height - 180)),
      width: 180,
    };
  }

  const index = clamp(Math.floor(platforms.length * ratio), 0, platforms.length - 1);
  const platform = platforms[index];
  return {
    x: platform.x + platform.width / 2,
    y: platform.y - 34,
    width: platform.width,
  };
};

const buildChemicalZone = (
  level: CampaignLevel,
  campaignId: DoorCampaignId,
  levelNumber: number,
  type: ChemicalZone['type'],
  ratio: number,
  yOffset: number,
  profile: DoorPolishProfile,
): ChemicalZone & { polishId: string; label?: string } => {
  const anchor = pickPlatformAnchor(level, ratio);
  const width = type === 'heal' ? 150 : 190;
  const height = type === 'heal' ? 48 : 58;
  const color =
    type === 'heal'
      ? profile.healColor
      : type === 'speed'
        ? profile.speedColor
        : type === 'acid'
          ? profile.dangerColor
          : profile.secondaryDangerColor;

  return {
    x: Math.round(anchor.x - width / 2),
    y: Math.round(anchor.y + yOffset),
    width,
    height,
    type,
    damage: type === 'acid' || type === 'poison' ? 10 + levelNumber : undefined,
    healAmount: type === 'heal' ? 10 + levelNumber * 2 : undefined,
    speedBoost: type === 'speed' ? 1.16 + levelNumber * 0.01 : undefined,
    color,
    label: `${campaignId}_${levelNumber}_${type}`,
    polishId: `${campaignId}_${level.id}_${type}_${ratio}`,
  };
};

const buildEnemy = (
  level: CampaignLevel,
  campaignId: DoorCampaignId,
  levelNumber: number,
  profile: DoorPolishProfile,
  ratio: number,
  slot: number,
) => {
  const anchor = pickPlatformAnchor(level, ratio);
  const enemyType = profile.enemyWave[(levelNumber + slot) % profile.enemyWave.length];

  return {
    x: Math.round(anchor.x),
    y: Math.round(anchor.y - 18),
    type: enemyType,
    patrolDistance: enemyType === 'turret' || enemyType === 'acid_turret' ? 0 : 150 + levelNumber * 12,
    moveSpeed: enemyType === 'bat' ? 112 + levelNumber * 8 : 86 + levelNumber * 6,
    hp: enemyType === 'robot' ? 2 + Math.floor(levelNumber / 2) : 1 + Math.floor(levelNumber / 3),
    polishId: `${campaignId}_${level.id}_enemy_${slot}`,
  };
};

const buildTrap = (
  level: CampaignLevel,
  campaignId: DoorCampaignId,
  levelNumber: number,
  profile: DoorPolishProfile,
  slot: number,
): Trap & { polishId: string } => {
  const anchor = pickPlatformAnchor(level, slot === 1 ? 0.42 : 0.72);
  const polishId = `${campaignId}_${level.id}_trap_${slot}`;

  if (slot === 1) {
    return gearChaser(Math.round(anchor.x), Math.round(anchor.y - 12), {
      damage: 14 + levelNumber * 2,
      radius: 16,
      triggerRadius: 150 + levelNumber * 10,
      speed: 145 + levelNumber * 12,
      activeDuration: 2350 + levelNumber * 90,
      cooldown: 2100,
      visualTheme: profile.gearTheme,
      polishId,
    }) as Trap & { polishId: string };
  }

  if (levelNumber % 2 === 0) {
    return movingSpike(Math.round(anchor.x), Math.round(anchor.y), {
      axis: levelNumber % 4 === 0 ? 'y' : 'x',
      moveDistance: 150 + levelNumber * 16,
      speed: 115 + levelNumber * 8,
      damage: 14 + levelNumber * 2,
      visualTheme: profile.spikeTheme,
      polishId,
    }) as Trap & { polishId: string };
  }

  return expandingHazard(Math.round(anchor.x), Math.round(anchor.y), {
    damage: 16 + levelNumber * 2,
    maxRadius: 48 + levelNumber * 5,
    triggerRadius: 140 + levelNumber * 12,
    growDuration: 540,
    activeDuration: 1300 + levelNumber * 60,
    visualTheme: profile.pulseTheme,
    polishId,
  }) as Trap & { polishId: string };
};

const mergeSupportedAttacks = (existing: string[] | undefined, additions: string[]) => {
  const merged = [...(existing ?? []), ...additions].filter((attack) => SUPPORTED_DUAL_BOSS_ATTACKS.has(attack));
  return Array.from(new Set(merged));
};

const enhanceBossConfig = (
  level: CampaignLevel,
  campaignId: DoorCampaignId,
  profile: DoorPolishProfile,
  levelNumber: number,
) => {
  if (!level.bossConfig || level.bossConfig.type !== 'dual') {
    return;
  }

  const bossConfig = level.bossConfig;
  bossConfig.requireBothDefeated = true;
  bossConfig.enrageOnSingleDefeat = true;
  bossConfig.enrageMultiplier = Math.max(bossConfig.enrageMultiplier ?? 1.35, 1.42);
  bossConfig.defeatCondition = bossConfig.defeatCondition ?? 'combat';
  bossConfig.defeatReward = {
    title: profile.rewardTitle,
    xp: 620 + levelNumber * 90,
    coins: 260 + levelNumber * 40,
    cosmetic: `${campaignId}_elite_aura`,
  };
  bossConfig.arenaProfile = {
    polishTier: 'enterprise-door-v2',
    readability: 'telegraphed_hazard_rings',
    studentHook: 'dual_pattern_recognition',
    recoveryWindows: 3,
  };

  bossConfig.phase1Boss = {
    ...(bossConfig.phase1Boss ?? {}),
    hp: Math.max(bossConfig.phase1Boss?.hp ?? 0, 360 + levelNumber * 16),
    attacks: mergeSupportedAttacks(bossConfig.phase1Boss?.attacks, ['projectile', 'projectile_spread', 'acid_pool']),
    attackInterval: Math.min(bossConfig.phase1Boss?.attackInterval ?? 2300, 2250),
    moveSpeed: Math.max(bossConfig.phase1Boss?.moveSpeed ?? 0, 108 + levelNumber * 4),
    visualTheme: profile.bossVisuals[0],
    size: Math.max(bossConfig.phase1Boss?.size ?? 0, 86 + levelNumber),
    specialAbilities: {
      ...(bossConfig.phase1Boss?.specialAbilities ?? {}),
      telegraphMs: 720,
      recoveryWindowMs: 520,
    },
  };

  bossConfig.phase2Boss = {
    ...(bossConfig.phase2Boss ?? {}),
    hp: Math.max(bossConfig.phase2Boss?.hp ?? 0, 380 + levelNumber * 18),
    attacks: mergeSupportedAttacks(bossConfig.phase2Boss?.attacks, ['projectile', 'poison_cloud', 'summon']),
    attackInterval: Math.min(bossConfig.phase2Boss?.attackInterval ?? 2300, 2200),
    moveSpeed: Math.max(bossConfig.phase2Boss?.moveSpeed ?? 0, 112 + levelNumber * 5),
    visualTheme: profile.bossVisuals[1],
    size: Math.max(bossConfig.phase2Boss?.size ?? 0, 90 + levelNumber),
    specialAbilities: {
      ...(bossConfig.phase2Boss?.specialAbilities ?? {}),
      summonCap: 3,
      telegraphMs: 760,
      recoveryWindowMs: 560,
    },
  };

  bossConfig.combinedAttack = {
    ...(bossConfig.combinedAttack ?? {}),
    name: bossConfig.combinedAttack?.name ?? profile.comboName,
    triggerCondition: bossConfig.combinedAttack?.triggerCondition ?? 'both_alive',
    damage: Math.max(bossConfig.combinedAttack?.damage ?? 0, 36 + levelNumber * 2),
    areaSize: bossConfig.combinedAttack?.areaSize ?? { width: 420, height: 300 },
    cooldown: Math.max(bossConfig.combinedAttack?.cooldown ?? 0, 9800),
    color: bossConfig.combinedAttack?.color ?? profile.comboColor,
    telegraphMs: bossConfig.combinedAttack?.telegraphMs ?? 900,
  };

  const mapData = level.campaignMapData;
  if (!mapData) {
    return;
  }

  const bossCount = (mapData.enemies ?? []).filter((enemy: any) => enemy.type === 'boss').length;
  if (bossCount < 2) {
    mapData.enemies = mapData.enemies ?? [];
    for (let bossIndex = bossCount + 1; bossIndex <= 2; bossIndex += 1) {
      const anchor = pickPlatformAnchor(level, bossIndex === 1 ? 0.36 : 0.68);
      const bossEnemy: DoorEnemy = {
        x: Math.round(anchor.x),
        y: Math.round(anchor.y - 22),
        type: 'boss',
        bossIndex,
        polishId: `${campaignId}_${level.id}_boss_${bossIndex}`,
      };
      mapData.enemies = withPolishId<DoorEnemy>(mapData.enemies as DoorEnemy[], bossEnemy);
    }
  }
};

const enhanceLevel = (level: CampaignLevel, campaignId: DoorCampaignId, index: number) => {
  const mapData = level.campaignMapData;
  if (!mapData) {
    return;
  }

  const levelNumber = index + 1;
  const profile = POLISH_PROFILES[campaignId];
  mapData.polishTier = 'enterprise-door-v2';
  mapData.pacingTags = Array.from(
    new Set([...(mapData.pacingTags ?? []), 'readable_hazard', 'student_hook', 'boss_ready']),
  );

  mapData.chemicalZones = withPolishId(
    mapData.chemicalZones,
    buildChemicalZone(level, campaignId, levelNumber, 'speed', 0.32, -22, profile),
  );
  mapData.chemicalZones = withPolishId(
    mapData.chemicalZones,
    buildChemicalZone(level, campaignId, levelNumber, 'heal', 0.68, -28, profile),
  );

  if (level.bossConfig) {
    mapData.chemicalZones = withPolishId(
      mapData.chemicalZones,
      buildChemicalZone(level, campaignId, levelNumber, 'acid', 0.44, -12, profile),
    );
    mapData.chemicalZones = withPolishId(
      mapData.chemicalZones,
      buildChemicalZone(level, campaignId, levelNumber, 'poison', 0.58, -12, profile),
    );
  }

  mapData.traps = withPolishId(mapData.traps, buildTrap(level, campaignId, levelNumber, profile, 1));
  mapData.traps = withPolishId(mapData.traps, buildTrap(level, campaignId, levelNumber, profile, 2));

  mapData.enemies = withPolishId(mapData.enemies, buildEnemy(level, campaignId, levelNumber, profile, 0.38, 1));
  mapData.enemies = withPolishId(mapData.enemies, buildEnemy(level, campaignId, levelNumber, profile, 0.78, 2));

  const gemAnchor = pickPlatformAnchor(level, 0.52);
  mapData.collectibles = withPolishId(mapData.collectibles, {
    ...gem(Math.round(gemAnchor.x), Math.round(gemAnchor.y - 18), 24 + levelNumber * 3),
    polishId: `${campaignId}_${level.id}_polish_gem`,
  });

  const healAnchor = pickPlatformAnchor(level, 0.24);
  mapData.collectibles = withPolishId(mapData.collectibles, {
    ...healthPack(Math.round(healAnchor.x), Math.round(healAnchor.y - 16), 16 + levelNumber * 2),
    polishId: `${campaignId}_${level.id}_polish_health`,
  });

  enhanceBossConfig(level, campaignId, profile, levelNumber);
};

export function applyDoorCampaignPolish<T extends Campaign>(campaigns: T[]): T[] {
  for (const campaign of campaigns) {
    if (!DOOR_CAMPAIGN_IDS.includes(campaign.id as DoorCampaignId)) {
      continue;
    }

    const campaignId = campaign.id as DoorCampaignId;
    const polishedCampaign = campaign as Campaign & {
      polishTier?: string;
      designPillars?: string[];
    };
    polishedCampaign.polishTier = 'enterprise-door-v2';
    polishedCampaign.designPillars = [
      'clear_telegraphing',
      'pattern_recognition',
      'student_appeal',
      'boss_mechanic_escalation',
    ];
    campaign.levels.forEach((level, index) => enhanceLevel(level, campaignId, index));
  }

  return campaigns;
}
