import { EXTRA_LEVELS } from "@/lib/learningExtraLevels";
import { getLearningChapter, getLearningSubjectResources } from "@/lib/learningHub";
import { extractLearningGuideHints } from "@/lib/learningLevelSupport";

describe("learning content audit", () => {
    test("ships a complete five-level pack for every expanded chapter", () => {
        const byChapter = new Map<number, typeof EXTRA_LEVELS>();

        for (const level of EXTRA_LEVELS) {
            const current = byChapter.get(level.chapter) ?? [];
            current.push(level);
            byChapter.set(level.chapter, current);
        }

        for (const [chapterId, chapterLevels] of byChapter) {
            const chapter = getLearningChapter(chapterId);

            expect(chapter).toBeTruthy();
            expect(chapterLevels).toHaveLength(chapter?.levelCount ?? 5);
            expect(chapterLevels.filter((level) => level.type === "boss")).toHaveLength(1);
        }
    });

    test("keeps every level teachable and judgeable", () => {
        for (const level of EXTRA_LEVELS) {
            expect(extractLearningGuideHints(level.initialCode).length).toBeGreaterThan(0);

            if (level.runtime === "python") {
                expect(Boolean(level.expectedOutput) || Boolean(level.validationKeyword)).toBe(true);
            } else {
                expect((level.requiredSnippets?.length ?? 0) > 0 || Boolean(level.validationKeyword)).toBe(true);
            }
        }
    });

    test("provides study resources for every learning subject", () => {
        const subjectIds = new Set(
            EXTRA_LEVELS
                .map((level) => getLearningChapter(level.chapter)?.subjectId)
                .filter((subjectId): subjectId is NonNullable<typeof subjectId> => Boolean(subjectId)),
        );

        for (const subjectId of subjectIds) {
            expect(getLearningSubjectResources(subjectId).length).toBeGreaterThanOrEqual(3);
        }
    });
});
