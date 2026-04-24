import {
    extractKnowledgeHint,
    getLearningCategories,
    getLearningCategorySubjectCount,
    getLearningChapter,
    getLearningChaptersForSubject,
    getLearningResourcesForChapter,
    getLearningSubjectsForCategory,
    getLearningSubject,
    getLearningSubjectResources,
    getLearningSubjectChapterCount,
} from "@/lib/learningHub";

describe("learning hub metadata", () => {
    test("organizes the learning center into four major domains", () => {
        expect(getLearningCategories().map((category) => category.id)).toEqual([
            "backend",
            "frontend",
            "database",
            "security",
        ]);

        expect(getLearningCategorySubjectCount("backend")).toBe(6);
        expect(getLearningSubjectsForCategory("frontend").map((subject) => subject.id)).toEqual([
            "web-foundations",
            "vue",
            "react",
        ]);
    });

    test("keeps python foundations and adds specialty chapters", () => {
        expect(getLearningSubjectChapterCount("python")).toBe(22);
        expect(getLearningChapter(1)?.subjectId).toBe("python");
        expect(getLearningChapter(22)?.title).toBe("Game Dev Workshop");
    });

    test("provides eight chapters for every expanded non-python subject", () => {
        expect(getLearningSubject("cpp")?.title).toBe("C++ Forge");
        expect(getLearningSubjectChapterCount("cpp")).toBe(8);
        expect(getLearningSubjectChapterCount("java")).toBe(8);
        expect(getLearningSubjectChapterCount("go")).toBe(8);
        expect(getLearningSubjectChapterCount("vue")).toBe(8);
        expect(getLearningSubjectChapterCount("react")).toBe(8);
        expect(getLearningSubjectChapterCount("ai-programming")).toBe(8);
        expect(getLearningSubjectChapterCount("ai-education")).toBe(8);
        expect(getLearningSubjectChapterCount("web-foundations")).toBe(8);
        expect(getLearningSubjectChapterCount("database")).toBe(8);
        expect(getLearningSubjectChapterCount("cyber-security")).toBe(8);

        expect(getLearningChaptersForSubject("cpp").map((chapter) => chapter.id)).toEqual([101, 102, 103, 104, 105, 106, 107, 108]);
        expect(getLearningChaptersForSubject("java").map((chapter) => chapter.id)).toEqual([201, 202, 203, 204, 205, 206, 207, 208]);
        expect(getLearningChaptersForSubject("go").map((chapter) => chapter.id)).toEqual([301, 302, 303, 304, 305, 306, 307, 308]);
        expect(getLearningChaptersForSubject("vue").map((chapter) => chapter.id)).toEqual([401, 402, 403, 404, 405, 406, 407, 408]);
        expect(getLearningChaptersForSubject("react").map((chapter) => chapter.id)).toEqual([501, 502, 503, 504, 505, 506, 507, 508]);
        expect(getLearningChaptersForSubject("ai-programming").map((chapter) => chapter.id)).toEqual([
            601, 602, 603, 604, 605, 606, 607, 608,
        ]);
        expect(getLearningChaptersForSubject("ai-education").map((chapter) => chapter.id)).toEqual([
            701, 702, 703, 704, 705, 706, 707, 708,
        ]);
        expect(getLearningChaptersForSubject("web-foundations").map((chapter) => chapter.id)).toEqual([
            801, 802, 803, 804, 805, 806, 807, 808,
        ]);
        expect(getLearningChaptersForSubject("database").map((chapter) => chapter.id)).toEqual([
            901, 902, 903, 904, 905, 906, 907, 908,
        ]);
        expect(getLearningChaptersForSubject("cyber-security").map((chapter) => chapter.id)).toEqual([
            1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008,
        ]);
    });

    test("keeps localized copy and stage-two focus fields readable", () => {
        expect(getLearningSubject("ai-programming")?.subtitleCN).toBeTruthy();
        expect(getLearningSubject("web-foundations")?.subtitleCN).toBeTruthy();
        expect(getLearningSubject("database")?.subtitleCN).toBeTruthy();

        expect(getLearningChapter(20)?.focusCN).toBeTruthy();
        expect(getLearningChapter(603)?.focusCN).toBeTruthy();
        expect(getLearningChapter(901)?.focusCN).toBeTruthy();
        expect(getLearningChapter(908)?.focusCN).toBeTruthy();
        expect(getLearningChapter(1008)?.focusCN).toBeTruthy();

        expect(getLearningChapter(704)?.focus).toContain("following rules");
        expect(getLearningChapter(705)?.focus).toContain("organise ideas");
    });

    test("exposes subject resources for official learning and safe practice", () => {
        expect(getLearningSubjectResources("go")).toHaveLength(4);
        expect(getLearningSubjectResources("go").map((resource) => resource.url)).toEqual(expect.arrayContaining([
            "https://go.dev/tour/",
            "https://go.dev/doc/tutorial/getting-started",
            "https://go.dev/play/",
            "https://go.dev/doc/effective_go",
        ]));

        expect(getLearningSubjectResources("cyber-security")).toHaveLength(4);
        expect(getLearningSubjectResources("cyber-security").map((resource) => resource.url)).toEqual(expect.arrayContaining([
            "https://portswigger.net/web-security",
            "https://owasp.org/www-project-top-ten/",
            "https://demo.owasp-juice.shop/#/",
            "https://www.kali.org/docs/",
        ]));
    });

    test("prefers chapter-specific resources when a level needs more precise guidance", () => {
        expect(getLearningResourcesForChapter(1).map((resource) => resource.url)).toEqual(expect.arrayContaining([
            "https://docs.python.org/3/tutorial/introduction.html",
            "https://docs.python.org/3/library/functions.html#print",
            "https://pythontutor.com/visualize.html#mode=edit",
        ]));

        expect(getLearningResourcesForChapter(17).map((resource) => resource.url)).toEqual(expect.arrayContaining([
            "https://pillow.readthedocs.io/en/stable/handbook/tutorial.html",
            "https://pillow.readthedocs.io/en/stable/reference/Image.html",
            "https://pillow.readthedocs.io/en/stable/reference/ImageOps.html",
        ]));
    });

    test("extracts knowledge hints from Chinese and legacy comment formats", () => {
        expect(extractKnowledgeHint("# 知识点: 先把任务目标说清楚\nGoal: explain loops")).toBe("先把任务目标说清楚");
        expect(extractKnowledgeHint("# 知识点：先把任务目标说清楚\nGoal: explain loops")).toBe("先把任务目标说清楚");
        expect(extractKnowledgeHint("// 知识点：先理解状态如何驱动界面\nreturn <div />")).toBe("先理解状态如何驱动界面");
        expect(extractKnowledgeHint("-- 知识点：真正稳定的数据，先靠表设计，再靠查询\nSELECT * FROM students;")).toBe(
            "真正稳定的数据，先靠表设计，再靠查询",
        );
        expect(extractKnowledgeHint("<!-- Knowledge: semantic tags define structure -->\n<header></header>")).toBe(
            "semantic tags define structure",
        );
    });
});
