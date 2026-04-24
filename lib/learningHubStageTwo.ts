import type { LearningChapter, LearningIconKey, LearningSubjectId } from "./learningHub";

function chapter(
    id: number,
    subjectId: LearningSubjectId,
    order: number,
    title: string,
    titleCN: string,
    description: string,
    descriptionCN: string,
    icon: LearningIconKey,
    requiredLevel: number,
    focus: string,
    focusCN: string,
): LearningChapter {
    return {
        id,
        subjectId,
        order,
        title,
        titleCN,
        description,
        descriptionCN,
        icon,
        levelCount: 5,
        requiredLevel,
        focus,
        focusCN,
    };
}

export const STAGE_TWO_LEARNING_CHAPTERS: LearningChapter[] = [
    chapter(105, "cpp", 5, "Algorithm Forge", "算法锻造坊", "Practice iteration, sorting, and step-by-step algorithm thinking in C++.", "在 C++ 里继续练习循环、排序和分步算法思维。", "algorithm", 8, "Algorithms become easier when each step has one clear job.", "算法题先拆步骤，再考虑速度和技巧。"),
    chapter(106, "cpp", 6, "Template Toolbox", "模板工具箱", "Use templates, pairs, and generic tools to reduce repeated code.", "用模板、pair 和泛型工具减少重复代码。", "library", 9, "Generic tools are useful when the pattern stays the same but the data changes.", "当规律不变、数据在变时，就该想到泛型工具。"),
    chapter(107, "cpp", 7, "Safety & Boundaries", "边界与安全实验室", "Strengthen const thinking, null checks, and boundary-safe code habits.", "强化 const 思维、空指针判断和边界安全习惯。", "shield", 10, "Fast code still needs guardrails, or one mistake can break the whole run.", "再快的代码也要守边界，不然一个小错就会放大。"),
    chapter(108, "cpp", 8, "System Project Arena", "系统整合竞技场", "Combine data models, algorithms, and reusable classes into one mini system.", "把数据模型、算法和类协作组合成一个完整小系统。", "project", 11, "The final step is not one trick, but how pieces work together.", "真正进阶不是多会一个技巧，而是能把模块组织起来。"),

    chapter(205, "java", 5, "Exception & File Lab", "异常与文件工坊", "Handle file input and runtime errors with calmer, safer Java code.", "用更稳的 Java 代码处理文件输入和运行时异常。", "shield", 9, "Good programs do not only run when everything is perfect.", "真正可靠的程序，要能处理不完美的输入。"),
    chapter(206, "java", 6, "Generics Workshop", "泛型与集合工坊", "Use generics and richer collections to organize larger data sets.", "用泛型和更丰富的集合管理更大的数据集。", "data", 10, "A strong type system helps you catch confusion before runtime.", "类型系统越清楚，运行前就能挡住越多混乱。"),
    chapter(207, "java", 7, "Stream Thinking", "Stream 数据流", "Use stream pipelines to filter, map, and summarize collections clearly.", "用 Stream 流式处理更清楚地筛选、转换和统计集合。", "analytics", 11, "Data flow code reads better when each stage has one purpose.", "流式处理最重要的是每一步只做一件事。"),
    chapter(208, "java", 8, "Service Project Studio", "服务项目工作室", "Combine controller, service, and data objects into a small Java project flow.", "把控制层、服务层和数据对象组合成一个完整小项目。", "project", 12, "Project code becomes clear when responsibility is split by role.", "工程代码要按职责拆分，读起来才不会乱。"),

    chapter(305, "go", 5, "Error Handling Deck", "错误处理甲板", "Learn Go's explicit error style and build steadier service logic.", "理解 Go 显式错误处理风格，写出更稳的服务逻辑。", "shield", 10, "In Go, errors are part of the main path, not an afterthought.", "在 Go 里，错误处理不是补丁，而是主流程的一部分。"),
    chapter(306, "go", 6, "Testing Harbor", "测试港口", "Use test files and simple checks to keep Go functions trustworthy.", "用测试文件和简单断言让 Go 函数更值得信赖。", "verify", 11, "If a function matters, it should be easy to verify.", "重要函数不能只靠感觉对，要能被快速验证。"),
    chapter(307, "go", 7, "Package Design Bay", "包设计海湾", "Group related structs and functions into clearer packages and exports.", "把相关结构体和函数组织成更清晰的包与导出接口。", "library", 12, "Package boundaries decide whether a project grows cleanly or not.", "项目能不能越做越清楚，很大程度取决于包边界。"),
    chapter(308, "go", 8, "Concurrent Service Arena", "并发服务竞技场", "Combine handlers, workers, and tests into a lightweight Go service project.", "把处理器、工作协程和测试组合成一个轻量 Go 服务项目。", "project", 13, "Concurrency only helps when data flow and ownership stay clear.", "并发不是越多越好，关键是任务流和责任归属清楚。"),

    chapter(405, "vue", 5, "Router Journey", "路由与页面旅程", "Use routes, links, and page containers to build multi-page Vue apps.", "用路由、链接和页面容器搭起多页面 Vue 应用。", "network", 8, "A routed app still needs clear page roles and navigation paths.", "页面多了以后，更要先想清路径和页面职责。"),
    chapter(406, "vue", 6, "Store State Dock", "状态仓库码头", "Manage shared state with a simple store mindset instead of prop drilling everywhere.", "用状态仓库思维管理共享状态，而不是层层传 props。", "data", 9, "Shared state should have one clear owner, not many scattered copies.", "共享状态最好只有一个明确来源，别到处复制。"),
    chapter(407, "vue", 7, "Async Data Studio", "异步数据工坊", "Handle loading, errors, and fetched data in a more complete Vue page flow.", "在 Vue 页面里更完整地处理加载、报错和异步数据。", "verify", 10, "A usable page is not only about data arriving, but also about waiting and failure states.", "好页面不只会显示成功结果，也要处理等待和失败。"),
    chapter(408, "vue", 8, "Dashboard Project Lab", "看板项目实验室", "Combine routing, store state, and async data into a polished dashboard.", "把路由、共享状态和异步数据组合成完整看板项目。", "project", 11, "The real challenge is keeping many moving parts readable together.", "真正的项目难点，是多个部分一起动时还能保持清楚。"),

    chapter(505, "react", 5, "Form State Studio", "表单状态工坊", "Build clearer forms with controlled inputs, validation, and submit flow.", "用受控输入、校验和提交流程搭出更清楚的 React 表单。", "data", 9, "Form UX improves when every input has one obvious source of truth.", "表单越清楚，越要保证每个输入只有一个真实来源。"),
    chapter(506, "react", 6, "Async Fetch Dock", "异步请求码头", "Handle loading, fetched data, retries, and errors in React views.", "在 React 视图里处理加载、取数、重试和错误状态。", "network", 10, "Async UI becomes stable when state names match what the user sees.", "异步界面要稳定，状态命名就得和用户看到的一致。"),
    chapter(507, "react", 7, "Page Routing Lab", "页面路由实验室", "Connect routes, params, and nested pages into a larger React app shell.", "把路由、参数和嵌套页面连接成更完整的 React 应用。", "project", 11, "Page structure is easier to debug when layout and content stay separated.", "布局和内容职责分开后，页面结构才更容易维护。"),
    chapter(508, "react", 8, "Smooth UI Workshop", "流畅界面工坊", "Use deferred updates and cleaner list rendering to keep interaction smooth.", "用延后更新和更清楚的列表渲染保持界面流畅。", "challenge", 12, "Smoothness comes from choosing what must update now and what can wait.", "流畅感来自先分清哪些更新要立刻做，哪些可以稍后做。"),

    chapter(606, "ai-programming", 6, "Tool Use Basics", "工具调用基础", "Guide AI to use the right tool, at the right time, for the right scope.", "学会让 AI 在合适的时候使用合适工具，并守住范围。", "prompt", 8, "A good AI request says not only what to do, but also which tools are allowed.", "高质量 AI 请求不只说目标，还要说能用什么工具。"),
    chapter(607, "ai-programming", 7, "Evidence Retrieval", "检索与证据链", "Pull facts from files and docs, then separate evidence from guesses.", "从文件和文档里拉取事实，再把证据和猜测区分开。", "verify", 9, "Strong AI answers show where the conclusion came from.", "靠谱的 AI 结果，要能说明结论是从哪里来的。"),
    chapter(608, "ai-programming", 8, "Agent Workflow Lab", "Agent 协作工坊", "Turn planning, delegation, review, and integration into one agent workflow.", "把规划、分工、复核和整合连成一个完整 Agent 工作流。", "project", 10, "Using AI deeply means designing the whole workflow, not only writing one prompt.", "真正会用 AI，不是只会提问，而是会设计整条协作流程。"),

    chapter(706, "ai-education", 6, "Media Literacy Deck", "媒体素养甲板", "Judge AI-generated media, sources, and confidence with calmer critical thinking.", "更冷静地判断 AI 生成内容、来源和可信度。", "learning", 7, "Modern literacy includes noticing who made the content and how trustworthy it is.", "今天的信息素养，包含看懂内容是谁生成的、值不值得信。"),
    chapter(707, "ai-education", 7, "Team Project Studio", "协作项目工坊", "Use AI as a helper in group projects without losing roles and ownership.", "在小组项目里把 AI 当助手用，但不丢掉分工和责任。", "project", 8, "Good teamwork still needs human roles, even when AI joins the process.", "AI 进来以后，小组分工反而要更清楚。"),
    chapter(708, "ai-education", 8, "Creative Reflection Lab", "创作反思实验室", "Use AI for brainstorming and rehearsal while keeping your own voice in the final work.", "用 AI 帮助头脑风暴和演练，同时保留自己的表达与观点。", "challenge", 9, "AI can support creativity, but your final voice should still sound like you.", "AI 可以帮你拓展创意，但最后的表达还是要像你自己。"),

    chapter(806, "web-foundations", 6, "Accessibility Basics", "可访问性基础", "Make pages easier to use with labels, alt text, and keyboard-friendly structure.", "用标签、替代文本和键盘友好结构让页面更容易使用。", "html", 7, "A good web page should work for more people, not only for one screen and one user.", "好网页不只给一种用户看，还要让更多人都能顺利使用。"),
    chapter(807, "web-foundations", 7, "Data Fetch Studio", "数据请求工坊", "Connect the page with fetched data and handle loading and error states clearly.", "让页面连上数据请求，并清楚处理加载和错误状态。", "network", 8, "Fetching data changes the whole page flow, not only one line of code.", "接上数据请求后，变化的不只是代码，而是整条页面流程。"),
    chapter(808, "web-foundations", 8, "Mini Site Project", "迷你网站项目", "Combine structure, style, scripts, and data into one small website project.", "把结构、样式、脚本和数据组合成一个完整小网站。", "project", 9, "When a site feels coherent, HTML, CSS, and JS are cooperating well.", "一个网站看起来完整，靠的是结构、样式和脚本配合得顺。"),

    chapter(905, "database", 5, "Aggregate Analysis", "统计聚合工坊", "Use COUNT, AVG, and grouped analysis to answer bigger data questions.", "用 COUNT、AVG 和分组统计回答更完整的数据问题。", "analytics", 8, "Database value grows when raw rows become usable summaries.", "数据库真正有价值，是把零散数据变成可读结论。"),
    chapter(906, "database", 6, "Schema Design Studio", "结构规范化工坊", "Split repeated data into cleaner tables so schema stays stable longer.", "把重复数据拆成更清楚的表结构，让模型更稳。", "data", 9, "Table design should remove repetition before the mess grows bigger.", "表设计越早拆清重复，后面越不容易越改越乱。"),
    chapter(907, "database", 7, "Query Tuning Lab", "查询优化实验室", "Read simple query plans and design indexes that match real filter paths.", "阅读基础查询计划，并为真实筛选路径设计索引。", "query", 10, "Optimization starts by matching the query path, not by adding indexes everywhere.", "优化不是盲目加索引，而是先看查询到底怎么走。"),
    chapter(908, "database", 8, "Backup Recovery Arena", "备份恢复竞技场", "Learn dump, restore, and recovery thinking so data problems stay recoverable.", "学习导出、恢复和回滚思维，让数据问题还有补救机会。", "files", 11, "Safe databases are not only well designed, but also recoverable after mistakes.", "数据库安全不只靠设计好，还靠出事后能恢复。"),

    chapter(1005, "cyber-security", 5, "Account Defense Lab", "账号防护工坊", "Strengthen login safety with session rules, 2FA awareness, and token thinking.", "通过会话规则、双重验证意识和令牌思维加强账号安全。", "shield", 9, "Account safety depends on both password habits and session control.", "账号安全不只看密码，还看会话是不是管得住。"),
    chapter(1006, "cyber-security", 6, "Traffic Trace Dock", "请求追踪码头", "Trace requests, headers, and service responses with safer network inspection habits.", "用更安全的方式追踪请求、响应头和服务返回。", "network", 10, "To defend a system, you first need to see how requests move through it.", "要保护系统，先得看清请求是怎么流动的。"),
    chapter(1007, "cyber-security", 7, "Incident Playbook", "应急预案工坊", "Turn detection, reporting, and escalation into a repeatable incident routine.", "把发现、上报和升级处理组织成可重复执行的应急流程。", "challenge", 11, "In security, the order of response often matters as much as the tool.", "安全响应里，处理顺序往往和工具本身一样重要。"),
    chapter(1008, "cyber-security", 8, "Secure Audit Arena", "安全审计竞技场", "Combine logs, rules, and evidence collection into a full audit checkpoint.", "把日志、规则和证据收集组合成一次完整安全审计。", "project", 12, "A useful audit ends with evidence, conclusions, and the next action.", "一次有价值的审计，最后要留下证据、结论和下一步动作。"),
];
