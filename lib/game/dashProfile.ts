export interface DashProfile {
  speed: number;
  durationMs: number;
  cooldownSeconds: number;
}

export function getDashProfile(isQuantumDash: boolean, cooldownMultiplier = 1): DashProfile {
  const profile = isQuantumDash
    ? { speed: 680, durationMs: 280, cooldownSeconds: 0.75 }
    : { speed: 500, durationMs: 200, cooldownSeconds: 1 };

  return {
    ...profile,
    cooldownSeconds: Number((profile.cooldownSeconds * cooldownMultiplier).toFixed(3)),
  };
}

export function getDashDistance(profile: DashProfile): number {
  return profile.speed * (profile.durationMs / 1000);
}
