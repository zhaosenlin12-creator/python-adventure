import {
  codeResearchLevels,
  compileCodeResearchCommands,
  getCodeResearchGoalStatuses,
  getCodeResearchPythonStage,
  getCodeResearchTutorialStatuses,
  getCodeResearchTutorialSteps,
  mergeCodeResearchProgressRecord,
  simulateCodeResearchLevel,
} from "@/lib/codeResearch";

describe("code research runtime", () => {
  it("parses movement, collection, interaction, scan, wait, and repeat blocks", () => {
    const result = compileCodeResearchCommands(`hero.scan()
repeat(2) {
  hero.moveRight()
}
hero.collect()
hero.attack()
hero.openDoor()
hero.buildBridge("right")
hero.stepOnSwitch()
hero.wait()`);

    expect(result.error).toBeUndefined();
    expect(result.commands.map((command) => command.type)).toEqual([
      "scan",
      "move",
      "move",
      "collect",
      "attack",
      "openDoor",
      "buildBridge",
      "stepOnSwitch",
      "wait",
    ]);
  });

  it("parses python-style for/if/def blocks and snake_case hero commands", () => {
    const result = compileCodeResearchCommands(`steps = 2
def go_right():
    for _ in range(steps):
        hero.move_right()

if True:
    go_right()
else:
    hero.wait_turn()

print("ready")`);

    expect(result.error).toBeUndefined();
    expect(result.commands.map((command) => command.type)).toEqual(["move", "move", "say"]);
  });

  it("supports python-style if/else with boolean variables", () => {
    const result = compileCodeResearchCommands(`has_key = False
if has_key:
    hero.open_door()
else:
    hero.move_left()`);

    expect(result.error).toBeUndefined();
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({ type: "move", direction: "left" });
  });

  it("supports python-style and/or logical conditions", () => {
    const andResult = compileCodeResearchCommands(`has_key = True
threat_level = 2
if has_key and threat_level > 1:
    hero.open_door()
else:
    hero.wait_turn()`);

    expect(andResult.error).toBeUndefined();
    expect(andResult.commands).toHaveLength(1);
    expect(andResult.commands[0]).toMatchObject({ type: "openDoor" });

    const orResult = compileCodeResearchCommands(`has_key = False
fallback = True
if has_key or fallback:
    hero.say("go")
else:
    hero.wait_turn()`);

    expect(orResult.error).toBeUndefined();
    expect(orResult.commands).toHaveLength(1);
    expect(orResult.commands[0]).toMatchObject({ type: "say" });
  });

  it("supports python-style if/elif/else chains", () => {
    const result = compileCodeResearchCommands(`risk = 2
if risk > 3:
    hero.wait_turn()
elif risk >= 2:
    hero.open_door()
else:
    hero.move_left()`);

    expect(result.error).toBeUndefined();
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]).toMatchObject({ type: "openDoor" });
  });

  it("supports arithmetic expressions for assignment, condition, and range", () => {
    const arithmeticResult = compileCodeResearchCommands(`steps = 8 // 4
bonus = 5 % 3
total = steps + bonus
if total == 4:
    hero.open_door()
else:
    hero.wait_turn()`);

    expect(arithmeticResult.error).toBeUndefined();
    expect(arithmeticResult.commands).toHaveLength(1);
    expect(arithmeticResult.commands[0]).toMatchObject({ type: "openDoor" });

    const rangeResult = compileCodeResearchCommands(`for _ in range(6 // 3):
    hero.move_right()`);

    expect(rangeResult.error).toBeUndefined();
    expect(rangeResult.commands.map((command) => command.type)).toEqual(["move", "move"]);
  });

  it("solves every bundled level with its sample solution", () => {
    for (const level of codeResearchLevels) {
      const result = simulateCodeResearchLevel(level, level.solution);

      if (!result.success) {
        throw new Error(`Level ${level.id} sample solution failed: ${result.failedReason ?? "unknown reason"}`);
      }
      expect(result.success).toBe(true);
      expect(result.stars).toBeGreaterThan(0);
      expect(result.frames.length).toBeGreaterThan(1);
      expect(result.goalStatuses.every((goal) => goal.completed)).toBe(true);
    }
  });

  it("marks tutorial steps completed for every bundled level under sample solution", () => {
    for (const level of codeResearchLevels) {
      const solved = simulateCodeResearchLevel(level, level.solution);
      if (!solved.success) {
        throw new Error(`Level ${level.id} tutorial baseline failed: ${solved.failedReason ?? "unknown reason"}`);
      }
      expect(solved.success).toBe(true);
      const finalState = solved.frames[solved.frames.length - 1].state;
      const tutorialStatuses = getCodeResearchTutorialStatuses(level, level.solution, finalState);
      expect(tutorialStatuses.every((step) => step.completed)).toBe(true);
    }
  });

  it("ships every bundled level with student-facing briefing steps", () => {
    for (const level of codeResearchLevels) {
      expect(level.briefing.length).toBeGreaterThanOrEqual(3);
      expect(level.briefing.every((step) => step.trim().length > 8)).toBe(true);
    }
  });

  it("keeps advanced stages focused on Python constructs", () => {
    const advancedLevels = codeResearchLevels.slice(28);
    const tutorialSnippets = advancedLevels
      .flatMap((level) => level.tutorialSteps ?? [])
      .flatMap((step) => step.requiredSnippets ?? [])
      .map((item) => item.snippet)
      .join("\n");
    const solutionCorpus = advancedLevels.map((level) => level.solution).join("\n");
    const corpus = `${solutionCorpus}\n${tutorialSnippets}`;

    expect(corpus).toContain("def ");
    expect(corpus).toContain("for _ in range");
    expect(corpus).toContain("if ");
    expect(corpus).toContain("else:");
    expect(corpus).toContain("elif ");
    expect(corpus).toContain("print(");
    expect(corpus).toContain("not False");
    expect(corpus).toContain(" and threat_level > 1");
    expect(corpus).toContain(" or fallback");
    expect(corpus).toContain("//");
    expect(corpus).toContain("%");
  });

  it("keeps chapter 5-6 Python stage progression explicit and ordered", () => {
    const stageLevelIds = [
      "ruins-branch-33",
      "temple-final-34",
      "ruins-bool-35",
      "temple-pipeline-36",
      "river-decision-37",
      "temple-overclock-38",
      "river-threshold-39",
      "ruins-signal-function-40",
      "temple-loop-guard-41",
      "temple-vector-route-42",
      "ruins-comparator-43",
      "temple-harmony-44",
    ];

    const stageEntries = stageLevelIds.map((levelId) => getCodeResearchPythonStage(levelId));

    expect(stageEntries.every((entry) => entry !== null)).toBe(true);
    expect(stageEntries.map((entry) => entry!.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(stageEntries[0]!.focus).toContain("function");
    expect(stageEntries[2]!.focus).toContain("not");
    expect(stageEntries[6]!.focus).toContain("if/elif/else");
    expect(stageEntries[11]!.focus).toContain("and-condition");
    expect(getCodeResearchPythonStage("shadow-cell-1")).toBeNull();
  });

  it("tracks incomplete goals when a required objective is skipped", () => {
    const level = codeResearchLevels[0];
    const result = simulateCodeResearchLevel(level, `hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`);

    expect(result.success).toBe(false);
    expect(result.failedReason).toContain("还没有收集");
    expect(result.goalStatuses.some((goal) => !goal.completed)).toBe(true);
  });

  it("returns helpful coaching for a locked door", () => {
    const level = codeResearchLevels.find((candidate) => candidate.id === "locked-gate-4");
    expect(level).toBeDefined();

    const result = simulateCodeResearchLevel(level!, `hero.moveRight()
hero.moveRight()
hero.moveRight()`);

    expect(result.success).toBe(false);
    expect(result.failedReason).toContain("青铜门");
    expect(result.coaching).toContain("门");
  });

  it("reports goal status from runtime state", () => {
    const level = codeResearchLevels[0];
    const state = {
      hero: { ...level.exit },
      collectedItemIds: ["spark"],
      defeatedEnemyIds: [],
      openedDoorIds: [],
      builtBridgeIds: [],
      activatedSwitchIds: [],
      scanned: false,
      saidMessages: [],
      message: "",
      messageTone: "success" as const,
      step: 7,
    };

    expect(getCodeResearchGoalStatuses(level, state).every((goal) => goal.completed)).toBe(true);
  });

  it("tracks tutorial draft and run progress for the first level", () => {
    const level = codeResearchLevels[0];
    const partialState = {
      hero: { x: 2, y: 2 },
      collectedItemIds: [],
      defeatedEnemyIds: [],
      openedDoorIds: [],
      builtBridgeIds: [],
      activatedSwitchIds: [],
      scanned: false,
      saidMessages: [],
      message: "",
      messageTone: "info" as const,
      step: 2,
    };
    const partialCode = `hero.moveRight()
hero.moveRight()
hero.collect()`;

    const partialStatuses = getCodeResearchTutorialStatuses(level, partialCode, partialState);
    expect(partialStatuses[0].draftComplete).toBe(true);
    expect(partialStatuses[0].runComplete).toBe(true);
    expect(partialStatuses[0].completed).toBe(true);
    expect(partialStatuses[1].draftComplete).toBe(true);
    expect(partialStatuses[1].runComplete).toBe(false);
    expect(partialStatuses[1].completed).toBe(false);

    const solved = simulateCodeResearchLevel(level, level.solution);
    const solvedStatuses = getCodeResearchTutorialStatuses(
      level,
      level.solution,
      solved.frames[solved.frames.length - 1].state,
    );
    expect(solvedStatuses.every((step) => step.completed)).toBe(true);
  });

  it("accepts snake_case student code for tutorial snippet checks", () => {
    const level = codeResearchLevels[0];
    const partialState = {
      hero: { x: 2, y: 2 },
      collectedItemIds: [],
      defeatedEnemyIds: [],
      openedDoorIds: [],
      builtBridgeIds: [],
      activatedSwitchIds: [],
      scanned: false,
      saidMessages: [],
      message: "",
      messageTone: "info" as const,
      step: 2,
    };
    const partialCode = `hero.move_right()
hero.move_right()
hero.collect()`;

    const statuses = getCodeResearchTutorialStatuses(level, partialCode, partialState);
    expect(statuses[0].draftComplete).toBe(true);
    expect(statuses[1].draftComplete).toBe(true);
  });

  it("treats legacy repeat syntax as valid for python tutorial snippets", () => {
    const level = codeResearchLevels.find((candidate) => candidate.id === "echo-loop-3");
    expect(level).toBeDefined();

    const legacyCode = `repeat(4) {
  hero.moveRight()
}
hero.collect()
repeat(4) {
  hero.moveRight()
}`;

    const solved = simulateCodeResearchLevel(level!, legacyCode);
    expect(solved.success).toBe(true);
    const finalState = solved.frames[solved.frames.length - 1].state;
    const statuses = getCodeResearchTutorialStatuses(level!, legacyCode, finalState);
    expect(statuses.every((step) => step.completed)).toBe(true);
  });

  it("falls back to briefing-based tutorial steps when a level has no custom tutorial script", () => {
    const baseLevel = codeResearchLevels[0];
    const levelWithoutTutorial = {
      ...baseLevel,
      tutorialSteps: undefined,
    };

    const steps = getCodeResearchTutorialSteps(levelWithoutTutorial);
    expect(steps).toHaveLength(levelWithoutTutorial.briefing.length);
    expect(steps[0].title).toContain("步骤");
    expect(steps[0].instruction).toBe(levelWithoutTutorial.briefing[0]);
  });

  it("rejects unknown commands instead of executing arbitrary code", () => {
    const result = simulateCodeResearchLevel(codeResearchLevels[0], "window.alert('x')");

    expect(result.success).toBe(false);
    expect(result.failedReason).toContain("无法识别命令");
  });
  it("preserves the best stars and best steps across worse replays", () => {
    const firstClear = mergeCodeResearchProgressRecord(undefined, {
      completed: true,
      stars: 3,
      bestSteps: 7,
      completedAt: "2026-05-09T09:00:00.000Z",
    });
    const worseReplay = mergeCodeResearchProgressRecord(firstClear, {
      completed: true,
      stars: 1,
      bestSteps: 13,
      completedAt: "2026-05-09T09:05:00.000Z",
    });

    expect(worseReplay).toBeDefined();
    expect(worseReplay?.stars).toBe(3);
    expect(worseReplay?.bestSteps).toBe(7);
    expect(worseReplay?.completedAt).toBe("2026-05-09T09:05:00.000Z");
  });
});
