import { EXTRA_LEVELS } from "@/lib/learningExtraLevels";

describe("learning extra levels", () => {
    test("adds launch-ready levels for every new chapter", () => {
        expect(EXTRA_LEVELS).toHaveLength(430);

        const chapterIds = new Set(EXTRA_LEVELS.map((level) => level.chapter));
        expect(Array.from(chapterIds).sort((a, b) => a - b)).toEqual([
            17, 18, 19, 20, 21, 22,
            101, 102, 103, 104, 105, 106, 107, 108,
            201, 202, 203, 204, 205, 206, 207, 208,
            301, 302, 303, 304, 305, 306, 307, 308,
            401, 402, 403, 404, 405, 406, 407, 408,
            501, 502, 503, 504, 505, 506, 507, 508,
            601, 602, 603, 604, 605, 606, 607, 608,
            701, 702, 703, 704, 705, 706, 707, 708,
            801, 802, 803, 804, 805, 806, 807, 808,
            901, 902, 903, 904, 905, 906, 907, 908,
            1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008,
        ]);
    });

    test("keeps specialty tracks structural across new stage-two chapters", () => {
        const pythonLevel = EXTRA_LEVELS.find((level) => level.chapter === 17);
        const cppLevel = EXTRA_LEVELS.find((level) => level.chapter === 103);
        const reactLevel = EXTRA_LEVELS.find((level) => level.chapter === 503);
        const htmlLevel = EXTRA_LEVELS.find((level) => level.chapter === 805);
        const sqlLevel = EXTRA_LEVELS.find((level) => level.chapter === 904);
        const bashLevel = EXTRA_LEVELS.find((level) => level.chapter === 1004);
        const stageTwoSqlLevel = EXTRA_LEVELS.find((level) => level.chapter === 907);
        const stageTwoPromptLevel = EXTRA_LEVELS.find((level) => level.chapter === 1008);

        expect(pythonLevel?.runtime).toBe("python");
        expect(pythonLevel?.expectedOutput).toBeTruthy();

        expect(cppLevel?.editorLanguage).toBe("cpp");
        expect(cppLevel?.requiredSnippets?.length).toBeGreaterThan(0);

        expect(reactLevel?.runtime).toBe("pattern");
        expect(reactLevel?.requiredSnippets?.length).toBeGreaterThan(0);
        expect(reactLevel?.simulatedOutput?.length).toBeGreaterThan(0);

        expect(htmlLevel?.editorLanguage).toBe("html");
        expect(sqlLevel?.editorLanguage).toBe("sql");
        expect(bashLevel?.editorLanguage).toBe("bash");
        expect(stageTwoSqlLevel?.editorLanguage).toBe("sql");
        expect(stageTwoPromptLevel?.editorLanguage).toBe("prompt");
    });

    test("localizes generated knowledge comments into Chinese for old and new chapters", () => {
        const aiPromptLevel = EXTRA_LEVELS.find((level) => level.chapter === 601 && level.id.includes("goal-audience"));
        const aiWorkflowBoss = EXTRA_LEVELS.find((level) => level.chapter === 603 && level.id.includes("boss-review-loop"));
        const goLevel = EXTRA_LEVELS.find((level) => level.chapter === 301 && level.id.includes("hello-go"));
        const databaseLevel = EXTRA_LEVELS.find((level) => level.chapter === 901 && level.id.includes("student-table"));
        const securityLevel = EXTRA_LEVELS.find((level) => level.chapter === 1002 && level.id.includes("boss-tool-help"));
        const cppLevel = EXTRA_LEVELS.find((level) => level.chapter === 103 && level.id.includes("ref-alias"));
        const aiEthicsLevel = EXTRA_LEVELS.find((level) => level.chapter === 704 && level.id.includes("private-info"));
        const domLevel = EXTRA_LEVELS.find((level) => level.chapter === 804 && level.id.includes("query-input"));
        const aggregateLevel = EXTRA_LEVELS.find((level) => level.chapter === 905 && level.id.includes("count-orders"));
        const auditLevel = EXTRA_LEVELS.find((level) => level.chapter === 1008 && level.id.includes("collect-log-window"));

        expect(aiPromptLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(aiWorkflowBoss?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(goLevel?.initialCode.split("\n")[0]).toContain("fmt.Println");
        expect(databaseLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(securityLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(cppLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(aiEthicsLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(domLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(aggregateLevel?.initialCode.split("\n")[0]).toContain("知识点：");
        expect(auditLevel?.initialCode.split("\n")[0]).toContain("知识点：");
    });
});
