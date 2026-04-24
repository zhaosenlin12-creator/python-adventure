import {
  buildLearningAssistantContext,
  extractLearningGuideHints,
  getVisibleLearningGuideHints,
} from "@/lib/learningLevelSupport";
import { LEVELS } from "@/lib/levels";

describe("learning level support", () => {
  test("parses structured guide hints from header comments", () => {
    const hints = extractLearningGuideHints(
      "# Knowledge: list indexing\n# Format: items[0]\n# Tip: the first item starts at index 0\n\nitems = ['a']\nprint(items[0])",
    );

    expect(hints.map((hint) => hint.kind)).toEqual(["knowledge", "format", "tip"]);
    expect(hints[1]?.text).toBe("items[0]");
    expect(hints[2]?.text).toContain("first item");
  });

  test("limits visible code clues by chapter difficulty", () => {
    const earlyLevel = LEVELS.find((level) => level.id === "level-18");
    const lateLevel = LEVELS.find((level) => level.chapter === 606 && level.type === "lesson");

    expect(earlyLevel).toBeTruthy();
    expect(lateLevel).toBeTruthy();

    expect(getVisibleLearningGuideHints(earlyLevel!).length).toBeGreaterThanOrEqual(1);
    expect(getVisibleLearningGuideHints(earlyLevel!).length).toBeLessThanOrEqual(3);
    expect(getVisibleLearningGuideHints(lateLevel!).length).toBeLessThanOrEqual(1);
  });

  test("builds AI assistant context from the current level state", () => {
    const level = LEVELS.find((item) => item.id === "level-18");
    expect(level).toBeTruthy();

    const context = buildLearningAssistantContext({
      level: level!,
      code: 'stats = {"hp": 100, "atk": 10}\nprint(stats["hp"])',
      output: ["100"],
      language: "cn",
    });

    expect(context.levelId).toBe("level-18");
    expect(context.levelTitle).toBeTruthy();
    expect(context.chapterTitle).toBeTruthy();
    expect(context.consoleOutput).toEqual(["100"]);
    expect(context.validationMode).toBe("live-run");
  });
});
