import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mergeCodeResearchProgressRecord, type CodeResearchProgressRecord } from "@/lib/codeResearch";

const emptyProgress: Record<string, CodeResearchProgressRecord> = {};

interface CodeResearchState {
  progressByUser: Record<string, Record<string, CodeResearchProgressRecord>>;
  completeLevel: (userId: string | number, levelId: string, stars: number, steps: number) => void;
  setUserProgress: (
    userId: string | number,
    records: Record<string, CodeResearchProgressRecord>,
    mode?: "replace" | "mergeBest",
  ) => void;
  getUserProgress: (userId: string | number | null | undefined) => Record<string, CodeResearchProgressRecord>;
  resetUserProgress: (userId: string | number) => void;
}

function normalizeUserId(userId: string | number | null | undefined) {
  return userId == null ? "guest" : String(userId);
}

export const useCodeResearchStore = create<CodeResearchState>()(
  persist(
    (set, get) => ({
      progressByUser: {},

      completeLevel: (userId, levelId, stars, steps) => {
        const key = normalizeUserId(userId);
        const current = get().progressByUser[key]?.[levelId];

        if (current?.completed && current.stars >= stars && current.bestSteps <= steps) {
          return;
        }

        const mergedRecord = mergeCodeResearchProgressRecord(current, {
          completed: true,
          stars,
          bestSteps: steps,
          completedAt: new Date().toISOString(),
        });
        if (!mergedRecord) return;

        set((state) => ({
          progressByUser: {
            ...state.progressByUser,
            [key]: {
              ...(state.progressByUser[key] ?? {}),
              [levelId]: mergedRecord,
            },
          },
        }));
      },

      setUserProgress: (userId, records, mode = "mergeBest") => {
        const key = normalizeUserId(userId);
        set((state) => {
          if (mode === "replace") {
            return {
              progressByUser: {
                ...state.progressByUser,
                [key]: { ...records },
              },
            };
          }

          const current = state.progressByUser[key] ?? {};
          const merged: Record<string, CodeResearchProgressRecord> = { ...current };

          for (const [levelId, next] of Object.entries(records)) {
            const prev = merged[levelId];
            if (!prev) {
              merged[levelId] = next;
              continue;
            }
            const mergedRecord = mergeCodeResearchProgressRecord(prev, next);
            if (mergedRecord) {
              merged[levelId] = mergedRecord;
            }
          }

          return {
            progressByUser: {
              ...state.progressByUser,
              [key]: merged,
            },
          };
        });
      },

      getUserProgress: (userId) => {
        const key = normalizeUserId(userId);
        return get().progressByUser[key] ?? emptyProgress;
      },

      resetUserProgress: (userId) => {
        const key = normalizeUserId(userId);
        set((state) => {
          const next = { ...state.progressByUser };
          delete next[key];
          return { progressByUser: next };
        });
      },
    }),
    {
      name: "code-research-progress",
      version: 1,
    },
  ),
);
