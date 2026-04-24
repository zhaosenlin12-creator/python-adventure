import type { PlatformData, Trap } from './campaigns';

type Range = [number, number];

const inRanges = (value: number, ranges: Range[]) =>
  ranges.some(([min, max]) => value >= min && value <= max);

export const coin = (x: number, y: number, value = 10) => ({ x, y, type: 'coin', value });
export const gem = (x: number, y: number, value = 20) => ({ x, y, type: 'gem', value });
export const healthPack = (x: number, y: number, value = 30) => ({ x, y, type: 'health_pack', value });
export const gearChaser = (
  x: number,
  y: number,
  overrides: Partial<Trap> = {},
): Trap => ({
  x,
  y,
  type: 'gear_chaser',
  damage: 20,
  radius: 18,
  triggerRadius: 170,
  speed: 170,
  activeDuration: 2800,
  cooldown: 2200,
  visualTheme: 'bronze',
  ...overrides,
});

export const expandingHazard = (
  x: number,
  y: number,
  overrides: Partial<Trap> = {},
): Trap => ({
  x,
  y,
  type: 'expanding_hazard',
  damage: 22,
  radius: 14,
  maxRadius: 54,
  triggerRadius: 150,
  growDuration: 520,
  activeDuration: 1500,
  cooldown: 2200,
  visualTheme: 'alert',
  ...overrides,
});

export const movingSpike = (
  x: number,
  y: number,
  overrides: Partial<Trap> = {},
): Trap => ({
  x,
  y,
  type: 'moving_spike',
  damage: 18,
  width: 54,
  height: 28,
  axis: 'x',
  speed: 120,
  moveDistance: 180,
  visualTheme: 'steel',
  ...overrides,
});

export function rowPlatforms(params: {
  startX: number;
  y: number;
  count: number;
  dx: number;
  width: number;
  extras?: Partial<PlatformData>;
  every?: (index: number) => Partial<PlatformData>;
}): PlatformData[] {
  const { startX, y, count, dx, width, extras = {}, every } = params;
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * dx,
    y,
    width,
    ...extras,
    ...(every ? every(index) : {}),
  }));
}

export function stairs(params: {
  startX: number;
  startY: number;
  count: number;
  dx: number;
  dy: number;
  width: number;
  widthStep?: number;
  extras?: Partial<PlatformData>;
  every?: (index: number) => Partial<PlatformData>;
}): PlatformData[] {
  const {
    startX,
    startY,
    count,
    dx,
    dy,
    width,
    widthStep = 0,
    extras = {},
    every,
  } = params;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * dx,
    y: startY + index * dy,
    width: Math.max(60, width + index * widthStep),
    ...extras,
    ...(every ? every(index) : {}),
  }));
}

export function disappearingStairs(params: {
  startX: number;
  startY: number;
  count: number;
  dx: number;
  dy: number;
  width: number;
  widthStep?: number;
  disappearTime?: number;
  disappearStep?: number;
}): PlatformData[] {
  const {
    startX,
    startY,
    count,
    dx,
    dy,
    width,
    widthStep = 0,
    disappearTime = 260,
    disappearStep = 40,
  } = params;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * dx,
    y: startY + index * dy,
    width: Math.max(60, width + index * widthStep),
    disappearTime: disappearTime + index * disappearStep,
  }));
}

export function verticalHazards(params: {
  x: number;
  yStart: number;
  yEnd: number;
  type: Trap['type'];
  damage?: number;
  pattern?: Trap['pattern'];
  step?: number;
  gaps?: Range[];
}): Trap[] {
  const {
    x,
    yStart,
    yEnd,
    type,
    damage = 20,
    pattern = 'static',
    step = 40,
    gaps = [],
  } = params;

  const traps: Trap[] = [];
  for (let y = yStart; y <= yEnd; y += step) {
    if (!inRanges(y, gaps)) {
      traps.push({ x, y, type, damage, pattern });
    }
  }
  return traps;
}

export function horizontalHazards(params: {
  xStart: number;
  xEnd: number;
  y: number;
  type: Trap['type'];
  damage?: number;
  pattern?: Trap['pattern'];
  step?: number;
  gaps?: Range[];
}): Trap[] {
  const {
    xStart,
    xEnd,
    y,
    type,
    damage = 20,
    pattern = 'static',
    step = 40,
    gaps = [],
  } = params;

  const traps: Trap[] = [];
  for (let x = xStart; x <= xEnd; x += step) {
    if (!inRanges(x, gaps)) {
      traps.push({ x, y, type, damage, pattern });
    }
  }
  return traps;
}
