import { getLevelEditorLanguage, getLevelRuntime, validatePatternLevel } from "@/lib/learningValidation";
import type { Level } from "@/lib/levels";

const patternLevel: Level = {
  id: "react-501-test",
  chapter: 501,
  chapterTitle: "React State Lab",
  title: "Counter",
  description: "Increment the score.",
  x: 20,
  y: 20,
  reqLevel: 5,
  type: "lesson",
  runtime: "pattern",
  editorLanguage: "javascript",
  initialCode: "return <button onClick={() => setScore(score + ____)}>{score}</button>",
  requiredSnippets: ["setScore(score + 1)", "{score}"],
  simulatedOutput: ["score: 1"],
};

describe("learning validation", () => {
  test("rejects unfinished pattern answers", () => {
    const result = validatePatternLevel(patternLevel, patternLevel.initialCode);

    expect(result.success).toBe(false);
    expect(result.output[0]).toContain("先把空白占位补完整");
  });

  test("passes finished structural answers and returns simulated output", () => {
    const result = validatePatternLevel(
      patternLevel,
      'return <button onClick={() => setScore(score + 1)}>{score}</button>',
    );

    expect(result.success).toBe(true);
    expect(result.output).toEqual(["score: 1"]);
  });

  test("accepts equivalent quote styles after normalization", () => {
    const quoteLevel: Level = {
      ...patternLevel,
      requiredSnippets: ['emit("start")'],
      initialCode: "emit(____)",
    };

    const result = validatePatternLevel(quoteLevel, "emit('start')");

    expect(result.success).toBe(true);
    expect(result.missingSnippets).toEqual([]);
  });

  test("treats TODO markers as unfinished placeholders", () => {
    const result = validatePatternLevel(patternLevel, "TODO: fill later");

    expect(result.success).toBe(false);
    expect(result.output[0]).toContain("先把空白占位补完整");
  });

  test("derives runtime and editor defaults", () => {
    const pythonLevel: Level = {
      id: "python-17-test",
      chapter: 17,
      chapterTitle: "Image Workshop",
      title: "Pixel Grid",
      description: "Count pixels.",
      x: 20,
      y: 20,
      reqLevel: 17,
      type: "lesson",
      initialCode: "print(1)",
    };

    expect(getLevelRuntime(pythonLevel)).toBe("python");
    expect(getLevelEditorLanguage(pythonLevel)).toBe("python");
    expect(getLevelEditorLanguage(patternLevel)).toBe("javascript");
  });
});
