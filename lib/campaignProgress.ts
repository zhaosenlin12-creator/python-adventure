type AgeGroupProgressRecord = {
  completed?: string[];
  levels?: string[];
} | null | undefined;

interface ResolveCampaignProgressParams {
  activeAgeGroup?: string | null;
  ageProgress?: AgeGroupProgressRecord;
  completedCampaigns?: string[];
  completedCampaignLevels?: string[];
}

const SCOPE_SEPARATOR = ':';

function mergeCompatibleProgressIds(
  scopedIds: string[] = [],
  storedIds: string[] = [],
  activeAgeGroup?: string | null,
): string[] {
  const merged = new Set<string>();

  scopedIds.forEach((id) => {
    if (id) {
      merged.add(id);
    }
  });

  storedIds.forEach((rawId) => {
    if (!rawId) {
      return;
    }

    const separatorIndex = rawId.indexOf(SCOPE_SEPARATOR);
    if (separatorIndex === -1) {
      merged.add(rawId);
      return;
    }

    const scope = rawId.slice(0, separatorIndex);
    const id = rawId.slice(separatorIndex + 1);

    if (!id) {
      return;
    }

    if (!activeAgeGroup || scope === activeAgeGroup) {
      merged.add(id);
    }
  });

  return Array.from(merged);
}

export function resolveCompatibleCampaignProgress({
  activeAgeGroup,
  ageProgress,
  completedCampaigns = [],
  completedCampaignLevels = [],
}: ResolveCampaignProgressParams) {
  return {
    completedCampaignIds: mergeCompatibleProgressIds(
      ageProgress?.completed,
      completedCampaigns,
      activeAgeGroup,
    ),
    completedLevelIds: mergeCompatibleProgressIds(
      ageProgress?.levels,
      completedCampaignLevels,
      activeAgeGroup,
    ),
  };
}
