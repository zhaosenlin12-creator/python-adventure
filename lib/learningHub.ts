export type LearningCategoryId = "backend" | "frontend" | "database" | "security";

export type LearningSubjectId =
  | "python"
  | "cpp"
  | "java"
  | "go"
  | "web-foundations"
  | "vue"
  | "react"
  | "database"
  | "cyber-security"
  | "ai-programming"
  | "ai-education";

export type LearningIconKey =
  | "backend"
  | "frontend"
  | "database"
  | "security"
  | "python"
  | "cpp"
  | "java"
  | "go"
  | "web-foundations"
  | "vue"
  | "react"
  | "cyber-security"
  | "ai-programming"
  | "ai-education"
  | "basics"
  | "logic"
  | "functions"
  | "data"
  | "loops"
  | "library"
  | "oop"
  | "challenge"
  | "files"
  | "shield"
  | "strings"
  | "lists"
  | "algorithm"
  | "project"
  | "network"
  | "analytics"
  | "image"
  | "audio"
  | "crypto"
  | "ai"
  | "space3d"
  | "game"
  | "prompt"
  | "verify"
  | "learning"
  | "html"
  | "css"
  | "javascript"
  | "mysql"
  | "query"
  | "safety"
  | "kali";

import { STAGE_TWO_LEARNING_CHAPTERS } from "./learningHubStageTwo";

export interface LearningCategory {
  id: LearningCategoryId;
  order: number;
  title: string;
  titleCN: string;
  subtitle: string;
  subtitleCN: string;
  icon: LearningIconKey;
  subjectIds: LearningSubjectId[];
  cardClass: string;
  accentClass: string;
}

export interface LearningSubject {
  id: LearningSubjectId;
  categoryId: LearningCategoryId;
  order: number;
  title: string;
  titleCN: string;
  subtitle: string;
  subtitleCN: string;
  icon: LearningIconKey;
  requiredLevel: number;
  featuredTags: string[];
  featuredTagsCN: string[];
  recommendedAge: string;
  recommendedAgeCN: string;
  cardClass: string;
  accentClass: string;
}

export interface LearningChapter {
  id: number;
  subjectId: LearningSubjectId;
  order: number;
  title: string;
  titleCN: string;
  description: string;
  descriptionCN: string;
  icon: LearningIconKey;
  levelCount: number;
  requiredLevel: number;
  focus: string;
  focusCN: string;
}

export interface LearningResource {
  label: string;
  labelCN: string;
  url: string;
}

function category(
  id: LearningCategoryId,
  order: number,
  title: string,
  titleCN: string,
  subtitle: string,
  subtitleCN: string,
  icon: LearningIconKey,
  subjectIds: LearningSubjectId[],
  cardClass: string,
  accentClass: string,
): LearningCategory {
  return {
    id,
    order,
    title,
    titleCN,
    subtitle,
    subtitleCN,
    icon,
    subjectIds,
    cardClass,
    accentClass,
  };
}

function subject(
  id: LearningSubjectId,
  categoryId: LearningCategoryId,
  order: number,
  title: string,
  titleCN: string,
  subtitle: string,
  subtitleCN: string,
  icon: LearningIconKey,
  requiredLevel: number,
  featuredTags: string[],
  featuredTagsCN: string[],
  recommendedAge: string,
  recommendedAgeCN: string,
  cardClass: string,
  accentClass: string,
): LearningSubject {
  return {
    id,
    categoryId,
    order,
    title,
    titleCN,
    subtitle,
    subtitleCN,
    icon,
    requiredLevel,
    featuredTags,
    featuredTagsCN,
    recommendedAge,
    recommendedAgeCN,
    cardClass,
    accentClass,
  };
}

function resource(label: string, labelCN: string, url: string): LearningResource {
  return {
    label,
    labelCN,
    url,
  };
}

function chapter(
  id: number,
  subjectId: LearningSubjectId,
  order: number,
  title: string,
  titleCN: string,
  description: string,
  descriptionCN: string,
  icon: LearningIconKey,
  levelCount: number,
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
    levelCount,
    requiredLevel,
    focus,
    focusCN,
  };
}

const MOJIBAKE_MARKERS = [
  "锛",
  "銆",
  "鈥",
  "馃",
  "鉁",
  "鈫",
  "",
  "",
  "",
  "",
  "�",
];

export function isLikelyCorruptedText(value?: string | null) {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (MOJIBAKE_MARKERS.some((marker) => trimmed.includes(marker))) {
    return true;
  }

  const suspicious = trimmed.match(/[鍏鍒鍓鍔妗寮寰嶅悗瀹炴垬缁绔閫夋嫨鏁版嵁鏌ヨ]/g);
  return Boolean(suspicious && suspicious.length >= Math.max(4, Math.floor(trimmed.length * 0.45)));
}

export function getLearningCopy(language: "cn" | "en", chinese: string | undefined, english: string) {
  if (language === "cn" && chinese && !isLikelyCorruptedText(chinese)) {
    return chinese;
  }

  return english;
}

function extractKnowledgeLine(line: string, prefix: string, suffix = "") {
  if (!line.startsWith(prefix)) {
    return null;
  }

  return line
    .slice(prefix.length)
    .replace(suffix, "")
    .trim();
}

export function extractKnowledgeHint(initialCode: string) {
  const firstLines = initialCode.split("\n").slice(0, 4);
  const commentPatterns: Array<[prefix: string, suffix?: string]> = [
    ["# 知识点："],
    ["# 知识点:"],
    ["// 知识点："],
    ["// 知识点:"],
    ["-- 知识点："],
    ["-- 知识点:"],
    ["<!-- 知识点：", "-->"],
    ["<!-- 知识点:", "-->"],
    ["# Knowledge:"],
    ["// Knowledge:"],
    ["-- Knowledge:"],
    ["<!-- Knowledge:", "-->"],
  ];

  for (const rawLine of firstLines) {
    const line = rawLine.trim();

    for (const [prefix, suffix] of commentPatterns) {
      const hint = extractKnowledgeLine(line, prefix, suffix);
      if (hint) {
        return hint;
      }
    }
  }

  return null;
}

const LEARNING_SUBJECT_RESOURCES: Partial<Record<LearningSubjectId, LearningResource[]>> = {
  python: [
    resource("Python Tutorial", "Python 官方教程", "https://docs.python.org/3/tutorial/"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  cpp: [
    resource("C++ Get Started", "C++ 官方入门", "https://isocpp.org/get-started"),
    resource("Python Tutor C++", "C++ 可视化练习", "https://pythontutor.com/cpp.html"),
  ],
  java: [
    resource("Dev Java Learn", "Java 官方学习", "https://dev.java/learn/"),
    resource("Python Tutor Java", "Java 可视化练习", "https://pythontutor.com/java.html"),
  ],
  go: [
    resource("A Tour of Go", "Go 官方导览", "https://go.dev/tour/"),
    resource("Go Getting Started", "Go 官方入门", "https://go.dev/doc/tutorial/getting-started"),
  ],
  "web-foundations": [
    resource("MDN Learn Web Dev", "MDN 学习路径", "https://developer.mozilla.org/en-US/docs/Learn_web_development"),
    resource("MDN Playground", "MDN 在线演练", "https://developer.mozilla.org/en-US/play"),
  ],
  vue: [
    resource("Vue Tutorial", "Vue 官方教程", "https://vuejs.org/tutorial/"),
    resource("Vue Playground", "Vue 在线演练", "https://play.vuejs.org/"),
  ],
  react: [
    resource("React Learn", "React 官方学习", "https://react.dev/learn"),
    resource("React Tutorial", "React 互动教程", "https://react.dev/learn/tutorial-tic-tac-toe"),
  ],
  database: [
    resource("MySQL Tutorial", "MySQL 官方教程", "https://dev.mysql.com/doc/refman/8.4/en/tutorial.html"),
    resource("SQLBolt", "SQL 在线练习", "https://sqlbolt.com/"),
  ],
  "cyber-security": [
    resource("Web Security Academy", "Web 安全学院", "https://portswigger.net/web-security/all-labs"),
    resource("OWASP Juice Shop", "Juice Shop 靶场", "https://demo.owasp-juice.shop/#/"),
  ],
  "ai-programming": [
    resource("OpenAI Prompting Guide", "OpenAI 提示指南", "https://developers.openai.com/api/docs/guides/prompting"),
    resource("OpenAI Academy", "OpenAI 学习站", "https://academy.openai.com/"),
  ],
  "ai-education": [
    resource("Code.org AI", "AI 教育学习站", "https://code.org/en-US/artificial-intelligence"),
    resource("OpenAI Academy", "OpenAI 学习站", "https://academy.openai.com/"),
  ],
};

const LEARNING_SUBJECT_RESOURCE_OVERRIDES: Partial<Record<LearningSubjectId, LearningResource[]>> = {
  python: [
    resource("Python Tutorial", "官方教程", "https://docs.python.org/3/tutorial/"),
    resource("Getting Started", "入门路径", "https://www.python.org/about/gettingstarted/"),
    resource("Built-in Functions", "函数手册", "https://docs.python.org/3/library/functions.html"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  cpp: [
    resource("ISO C++ Start", "官方入门", "https://isocpp.org/get-started"),
    resource("Learn C++", "系统学习", "https://www.learncpp.com/"),
    resource("Compiler Explorer", "在线编译", "https://godbolt.org/"),
    resource("C++ Visualizer", "代码可视化", "https://pythontutor.com/cpp.html"),
  ],
  java: [
    resource("Dev Java Learn", "官方学习", "https://dev.java/learn/"),
    resource("Classes & Objects", "类与对象", "https://dev.java/learn/classes-objects/"),
    resource("Java Visualizer", "代码可视化", "https://pythontutor.com/java.html"),
  ],
  go: [
    resource("A Tour of Go", "官方导览", "https://go.dev/tour/"),
    resource("Getting Started", "快速上手", "https://go.dev/doc/tutorial/getting-started"),
    resource("Go Playground", "在线运行", "https://go.dev/play/"),
    resource("Effective Go", "实践风格", "https://go.dev/doc/effective_go"),
  ],
  "web-foundations": [
    resource("MDN Learn", "MDN 路线", "https://developer.mozilla.org/en-US/docs/Learn_web_development"),
    resource("HTML Core", "HTML 基础", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"),
    resource("CSS Core", "CSS 基础", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics"),
    resource("JavaScript Core", "JS 基础", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting"),
    resource("MDN Playground", "在线演练", "https://developer.mozilla.org/en-US/play"),
  ],
  vue: [
    resource("Vue Tutorial", "官方教程", "https://vuejs.org/tutorial/"),
    resource("Vue Guide", "核心指南", "https://vuejs.org/guide/introduction.html"),
    resource("Vue Playground", "在线演练", "https://play.vuejs.org/"),
  ],
  react: [
    resource("React Learn", "官方学习", "https://react.dev/learn"),
    resource("Describing UI", "界面基础", "https://react.dev/learn/describing-the-ui"),
    resource("Tic-Tac-Toe", "互动实战", "https://react.dev/learn/tutorial-tic-tac-toe"),
  ],
  database: [
    resource("MySQL Tutorial", "MySQL 教程", "https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/tutorial.html"),
    resource("SQLBolt", "SQL 练习", "https://sqlbolt.com/"),
    resource("DB Fiddle", "在线实验", "https://www.db-fiddle.com/"),
  ],
  "cyber-security": [
    resource("Security Academy", "安全学院", "https://portswigger.net/web-security"),
    resource("OWASP Top 10", "OWASP Top 10", "https://owasp.org/www-project-top-ten/"),
    resource("Juice Shop Demo", "靶场体验", "https://demo.owasp-juice.shop/#/"),
    resource("Kali Docs", "Kali 文档", "https://www.kali.org/docs/"),
  ],
  "ai-programming": [
    resource("OpenAI Academy", "AI 协作学习", "https://academy.openai.com/"),
    resource("Learn Prompting", "提示工程", "https://learnprompting.org/"),
    resource("Kaggle ML Intro", "机器学习入门", "https://www.kaggle.com/learn/intro-to-machine-learning"),
  ],
  "ai-education": [
    resource("Code.org AI", "AI 认识入口", "https://code.org/en-US/artificial-intelligence"),
    resource("AI Foundations", "AI 课程资源", "https://code.org/en-US/curriculum/artificial-intelligence-foundations"),
    resource("TeachAI Toolkit", "教学工具包", "https://teachai.org/toolkit"),
  ],
};

const LEARNING_CHAPTER_RESOURCES: Partial<Record<number, LearningResource[]>> = {
  1: [
    resource("Python Intro", "官方入门", "https://docs.python.org/3/tutorial/introduction.html"),
    resource("print Docs", "print 文档", "https://docs.python.org/3/library/functions.html#print"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  2: [
    resource("Control Flow", "流程控制", "https://docs.python.org/3/tutorial/controlflow.html"),
    resource("Boolean Type", "布尔类型", "https://docs.python.org/3/library/stdtypes.html#boolean-type-bool"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  3: [
    resource("Defining Functions", "函数教程", "https://docs.python.org/3/tutorial/controlflow.html#defining-functions"),
    resource("Built-in Functions", "常用函数", "https://docs.python.org/3/library/functions.html"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  4: [
    resource("Data Structures", "数据结构", "https://docs.python.org/3/tutorial/datastructures.html"),
    resource("Dict Docs", "字典手册", "https://docs.python.org/3/library/stdtypes.html#mapping-types-dict"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  5: [
    resource("For Statements", "for 循环", "https://docs.python.org/3/tutorial/controlflow.html#for-statements"),
    resource("Loop Control", "循环控制", "https://docs.python.org/3/tutorial/controlflow.html#break-and-continue-statements"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  6: [
    resource("Modules", "模块教程", "https://docs.python.org/3/tutorial/modules.html"),
    resource("math Module", "math 模块", "https://docs.python.org/3/library/math.html"),
    resource("random Module", "random 模块", "https://docs.python.org/3/library/random.html"),
  ],
  7: [
    resource("Classes", "类教程", "https://docs.python.org/3/tutorial/classes.html"),
    resource("Instance Variables", "对象属性", "https://docs.python.org/3/tutorial/classes.html#class-and-instance-variables"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  8: [
    resource("Stdlib Tour", "标准库", "https://docs.python.org/3/tutorial/stdlib.html"),
    resource("PEP 8", "代码风格", "https://peps.python.org/pep-0008/"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  9: [
    resource("File IO", "文件读写", "https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files"),
    resource("pathlib", "路径处理", "https://docs.python.org/3/library/pathlib.html"),
    resource("csv", "CSV 手册", "https://docs.python.org/3/library/csv.html"),
  ],
  10: [
    resource("Errors & Exceptions", "异常教程", "https://docs.python.org/3/tutorial/errors.html"),
    resource("Exception Types", "异常类型", "https://docs.python.org/3/library/exceptions.html"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  11: [
    resource("String Type", "字符串", "https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str"),
    resource("string Module", "string 模块", "https://docs.python.org/3/library/string.html"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  12: [
    resource("List Comprehension", "列表推导", "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions"),
    resource("Lists Guide", "列表手册", "https://docs.python.org/3/tutorial/datastructures.html"),
    resource("Python Tutor", "代码可视化", "https://pythontutor.com/visualize.html#mode=edit"),
  ],
  13: [
    resource("Sorting HOWTO", "排序 HOWTO", "https://docs.python.org/3/howto/sorting.html"),
    resource("sorted()", "sorted 手册", "https://docs.python.org/3/library/functions.html#sorted"),
    resource("bisect", "二分查找", "https://docs.python.org/3/library/bisect.html"),
  ],
  14: [
    resource("Stdlib Tour", "标准库", "https://docs.python.org/3/tutorial/stdlib.html"),
    resource("venv", "项目环境", "https://docs.python.org/3/library/venv.html"),
    resource("PEP 8", "代码风格", "https://peps.python.org/pep-0008/"),
  ],
  15: [
    resource("urllib", "网络请求", "https://docs.python.org/3/library/urllib.request.html"),
    resource("JSON", "JSON 数据", "https://docs.python.org/3/library/json.html"),
    resource("HTTPBin", "接口练习", "https://httpbin.org/"),
  ],
  16: [
    resource("Pandas Intro", "Pandas 入门", "https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html"),
    resource("csv", "CSV 手册", "https://docs.python.org/3/library/csv.html"),
    resource("statistics", "统计基础", "https://docs.python.org/3/library/statistics.html"),
  ],
  17: [
    resource("Pillow Tutorial", "Pillow 教程", "https://pillow.readthedocs.io/en/stable/handbook/tutorial.html"),
    resource("Image API", "图像 API", "https://pillow.readthedocs.io/en/stable/reference/Image.html"),
    resource("ImageOps", "图像变换", "https://pillow.readthedocs.io/en/stable/reference/ImageOps.html"),
  ],
  18: [
    resource("wave", "音频读写", "https://docs.python.org/3/library/wave.html"),
    resource("librosa", "音频分析", "https://librosa.org/doc/main/index.html"),
    resource("array", "采样数组", "https://docs.python.org/3/library/array.html"),
  ],
  19: [
    resource("hashlib", "哈希基础", "https://docs.python.org/3/library/hashlib.html"),
    resource("secrets", "安全随机", "https://docs.python.org/3/library/secrets.html"),
    resource("Fernet", "对称加密", "https://cryptography.io/en/latest/fernet/"),
  ],
  20: [
    resource("ML Intro", "机器学习入门", "https://www.kaggle.com/learn/intro-to-machine-learning"),
    resource("scikit-learn", "实战上手", "https://scikit-learn.org/stable/getting_started.html"),
    resource("AI Ethics", "AI 伦理", "https://www.kaggle.com/learn/intro-to-ai-ethics"),
  ],
  21: [
    resource("VPython Docs", "VPython 文档", "https://vpython.org/contents/docs/index.html"),
    resource("Vector Basics", "向量基础", "https://vpython.org/contents/docs/vector.html"),
    resource("GlowScript Demo", "3D 示例", "https://www.glowscript.org/#/user/GlowScriptDemos/folder/Examples/program/Bounce-VPython"),
  ],
  22: [
    resource("Pygame Docs", "Pygame 文档", "https://www.pygame.org/docs/"),
    resource("Pygame Intro", "Pygame 入门", "https://pygame.readthedocs.io/en/latest/1_intro/intro.html"),
    resource("Pygame Tutorials", "游戏教程", "https://www.pygame.org/wiki/tutorials"),
  ],
};

export const LEARNING_CATEGORIES: LearningCategory[] = [
  category(
    "backend",
    1,
    "Backend Development",
    "后端开发",
    "Start with Python, then grow into services, tools, and AI-ready workflows.",
    "先把 Python 学扎实，再逐步扩展到服务、工具、工程协作和 AI 应用。",
    "backend",
    ["python", "go", "java", "cpp", "ai-programming", "ai-education"],
    "from-sky-600 via-cyan-600 to-blue-700",
    "border-cyan-300/40 text-cyan-100",
  ),
  category(
    "frontend",
    2,
    "Frontend Development",
    "前端开发",
    "Cover HTML, CSS, JavaScript, then move into Vue and React interaction design.",
    "先掌握 HTML、CSS、JavaScript，再进入 Vue 和 React 的组件交互。",
    "frontend",
    ["web-foundations", "vue", "react"],
    "from-emerald-600 via-teal-600 to-cyan-700",
    "border-emerald-300/40 text-emerald-100",
  ),
  category(
    "database",
    3,
    "Database Systems",
    "数据库系统",
    "Learn MySQL thinking, table design, and practical query habits.",
    "学习 MySQL 思维、表结构设计和常用查询方法。",
    "database",
    ["database"],
    "from-amber-600 via-orange-600 to-red-700",
    "border-orange-200/45 text-orange-50",
  ),
  category(
    "security",
    4,
    "Cyber Security",
    "网络安全",
    "Build safe habits, understand defense basics, and use Kali in a lab mindset.",
    "建立安全习惯，理解防护基础，并在实验室规则内认识 Kali。",
    "security",
    ["cyber-security"],
    "from-violet-600 via-fuchsia-600 to-pink-700",
    "border-violet-200/45 text-violet-50",
  ),
];

export const LEARNING_SUBJECTS: LearningSubject[] = [
  subject(
    "python",
    "backend",
    1,
    "Python Academy",
    "Python 学院",
    "Build tools, APIs, automation, games, and creative ideas with real code.",
    "从脚本到接口、从自动化到创意项目，用 Python 打好编程主线能力。",
    "python",
    1,
    ["Core", "Automation", "Projects", "AI"],
    ["基础", "自动化", "项目", "AI"],
    "Primary Upper to Junior High",
    "小学高年级到初中",
    "from-sky-600 via-cyan-600 to-blue-700",
    "border-cyan-300/40 text-cyan-100",
  ),
  subject(
    "go",
    "backend",
    2,
    "Go Harbor",
    "Go 云港",
    "Practice concise syntax, teamwork logic, and modern service thinking.",
    "体验简洁语法、任务协作和现代服务思维。",
    "go",
    6,
    ["Simple", "Concurrent", "Cloud"],
    ["简洁", "并发", "云端"],
    "Junior High",
    "初中优先",
    "from-cyan-600 via-sky-600 to-blue-700",
    "border-sky-200/45 text-sky-50",
  ),
  subject(
    "java",
    "backend",
    3,
    "Java City",
    "Java 工程城",
    "Meet objects, classes, and the mindset of larger projects.",
    "认识类、对象和更完整的项目结构。",
    "java",
    5,
    ["Objects", "Engineering", "Projects"],
    ["对象", "工程", "项目"],
    "Junior High",
    "初中优先",
    "from-amber-600 via-orange-600 to-red-700",
    "border-orange-200/45 text-orange-50",
  ),
  subject(
    "cpp",
    "backend",
    4,
    "C++ Forge",
    "C++ 工程工坊",
    "Learn structure, efficiency, and code close to the machine.",
    "理解结构、效率和更贴近底层的编程思维。",
    "cpp",
    4,
    ["Logic", "Performance", "Structure"],
    ["逻辑", "性能", "结构"],
    "Junior High",
    "初中优先",
    "from-slate-600 via-zinc-600 to-stone-700",
    "border-slate-300/40 text-slate-100",
  ),
  subject(
    "ai-programming",
    "backend",
    5,
    "AI Coding Institute",
    "AI 编程研究所",
    "Learn how to define tasks, verify outputs, and build safe AI workflows.",
    "学会把需求说清、把结果验真、把任务拆成稳定流程，用 AI 解决真实问题。",
    "ai-programming",
    3,
    ["Prompting", "Workflow", "Verification"],
    ["任务定义", "工作流", "验证"],
    "Primary Upper to Junior High",
    "小学高年级到初中",
    "from-fuchsia-600 via-pink-600 to-rose-700",
    "border-pink-200/45 text-pink-50",
  ),
  subject(
    "ai-education",
    "backend",
    6,
    "AI Learning Hall",
    "AI 学习馆",
    "Build AI literacy, judgment, and study habits that keep humans thinking.",
    "建立 AI 素养、判断力和学习习惯，让 AI 帮你成长，而不是替你思考。",
    "ai-education",
    2,
    ["Literacy", "Judgment", "Study Habits"],
    ["素养", "判断", "学习习惯"],
    "Primary Upper to Junior High",
    "小学高年级到初中",
    "from-violet-600 via-purple-600 to-indigo-700",
    "border-violet-200/45 text-violet-50",
  ),
  subject(
    "web-foundations",
    "frontend",
    1,
    "Web Foundations",
    "前端三件套",
    "Start from HTML, CSS, and JavaScript to learn structure, style, and interaction.",
    "先掌握 HTML、CSS、JavaScript 各自解决什么问题，再进入更完整的前端框架。",
    "web-foundations",
    2,
    ["Structure", "Style", "Interaction"],
    ["结构", "样式", "交互"],
    "Primary Upper to Junior High",
    "小学高年级到初中",
    "from-teal-600 via-emerald-600 to-green-700",
    "border-emerald-200/45 text-emerald-50",
  ),
  subject(
    "vue",
    "frontend",
    2,
    "Vue Canvas",
    "Vue 交互工坊",
    "Make pages and components with light, visual front-end thinking.",
    "从页面到组件，体验轻巧直观的前端创作方式。",
    "vue",
    4,
    ["UI", "Components", "Interaction"],
    ["界面", "组件", "交互"],
    "Primary Upper to Junior High",
    "小学高年级到初中",
    "from-emerald-600 via-green-600 to-teal-700",
    "border-emerald-200/45 text-emerald-50",
  ),
  subject(
    "react",
    "frontend",
    3,
    "React Lab",
    "React 实验室",
    "Discover components, state, and responsive modern interfaces.",
    "认识组件、状态和现代界面的交互方式。",
    "react",
    5,
    ["State", "Components", "Modern UI"],
    ["状态", "组件", "现代界面"],
    "Junior High",
    "初中优先",
    "from-cyan-600 via-blue-600 to-indigo-700",
    "border-cyan-200/45 text-cyan-50",
  ),
  subject(
    "database",
    "database",
    1,
    "Database Lab",
    "数据库实验室",
    "Learn MySQL tables, relations, and the habit of asking data precise questions.",
    "学习 MySQL 表结构、关系设计和查询思维，理解数据库是怎样稳定管理信息的。",
    "database",
    4,
    ["MySQL", "Schema", "Queries"],
    ["MySQL", "表设计", "查询"],
    "Junior High",
    "初中优先",
    "from-orange-600 via-amber-600 to-yellow-700",
    "border-amber-200/45 text-amber-50",
  ),
  subject(
    "cyber-security",
    "security",
    1,
    "Cyber Security",
    "网络安全实验室",
    "Build safe habits, defense basics, and clear lab boundaries before touching tools.",
    "先建立安全边界和防护思维，再在合法实验环境里认识工具与排查方法。",
    "cyber-security",
    5,
    ["Defense", "Labs", "Awareness"],
    ["防护", "实验室", "安全意识"],
    "Junior High",
    "初中优先",
    "from-violet-600 via-fuchsia-600 to-pink-700",
    "border-violet-200/45 text-violet-50",
  ),
];

export const LEARNING_CHAPTERS: LearningChapter[] = [
  chapter(1, "python", 1, "Python Basics", "Python 基础", "Variables, print, and simple math.", "变量、输出和简单运算。", "basics", 5, 1, "Write your first working code.", "写出第一段能运行的代码。"),
  chapter(2, "python", 2, "Simple Logic", "简单逻辑", "If/else, choices, and branching logic.", "条件判断、选择和分支逻辑。", "logic", 5, 2, "Let code learn how to choose.", "让程序学会判断和选择。"),
  chapter(3, "python", 3, "Functions", "函数工坊", "Define, call, and reuse your own tools.", "定义、调用并复用自己的代码工具。", "functions", 5, 3, "Turn repeated moves into tools.", "把重复动作变成可复用工具。"),
  chapter(4, "python", 4, "Data Structures", "数据结构", "Use lists and dictionaries to organize data.", "用列表和字典整理信息。", "data", 5, 4, "Store information in the right shape.", "把信息放进合适的数据结构。"),
  chapter(5, "python", 5, "Advanced Loops", "循环进阶", "Control repeated work with smarter loops.", "用更灵活的循环控制重复任务。", "loops", 5, 5, "Master pace and repetition.", "掌握循环节奏和重复控制。"),
  chapter(6, "python", 6, "Modules & Libs", "模块与工具库", "Use ready-made modules like math and random.", "学会用现成模块解决问题。", "library", 5, 6, "Learn to borrow powerful tools.", "学会借助成熟工具提效。"),
  chapter(7, "python", 7, "Object Oriented", "面向对象", "Meet classes, objects, and methods.", "认识类、对象和方法。", "oop", 5, 7, "Describe the world with objects.", "学会用对象表达真实世界。"),
  chapter(8, "python", 8, "The Final Code", "综合试炼", "Mix debugging, logic, and algorithms together.", "综合使用调试、逻辑和算法能力。", "challenge", 5, 8, "Solve bigger problems in one go.", "用综合能力解决更完整的问题。"),
  chapter(9, "python", 9, "File Master", "文件大师", "Read, write, and manage files.", "读写文件，让程序记住信息。", "files", 5, 9, "Make code remember and record.", "让程序会保存与读取结果。"),
  chapter(10, "python", 10, "Error Shield", "异常护盾", "Use try/except to handle mistakes calmly.", "用异常处理稳住出错场景。", "shield", 5, 10, "Turn crashes into recoveries.", "让程序遇错也能继续前进。"),
  chapter(11, "python", 11, "String Wizard", "字符串魔法", "Slice, format, and transform text.", "切片、格式化和处理文本。", "strings", 5, 11, "Handle words with precision.", "更准确地处理文字信息。"),
  chapter(12, "python", 12, "List Master", "列表进阶", "Comprehensions and richer list operations.", "列表推导式与更高效的列表操作。", "lists", 5, 12, "Process collections more efficiently.", "让批量处理更快更清晰。"),
  chapter(13, "python", 13, "Algorithm Lab", "算法实验室", "Sorting, searching, and recursive thinking.", "排序、查找和递归思维。", "algorithm", 5, 13, "Train structured problem solving.", "训练结构化解决问题的能力。"),
  chapter(14, "python", 14, "Project Arena", "项目竞技场", "Combine skills into small but complete projects.", "把学过的能力组合成完整小项目。", "project", 5, 14, "From exercises to real projects.", "从练习走向真正的小项目。"),
  chapter(15, "python", 15, "Network Explorer", "网络探索者", "Work with HTTP, JSON, and online data.", "认识 HTTP、JSON 和网络数据。", "network", 5, 15, "Connect your code to the web.", "让代码和真实网络世界连起来。"),
  chapter(16, "python", 16, "Data Analyst", "数据分析师", "Read tables, group data, and spot patterns.", "读取表格、整理数据并发现规律。", "analytics", 5, 16, "See patterns hidden in data.", "学会从数据中发现规律。"),
  chapter(17, "python", 17, "Image Workshop", "图像工坊", "Pixels, colors, and visual effects built from numeric grids.", "把图像看成像素矩阵，理解颜色数字和基础视觉效果。", "image", 5, 17, "Treat pictures as rows, columns, and color values.", "把图片看成按行列存放的颜色数据。"),
  chapter(18, "python", 18, "Audio Lab", "音频实验室", "Samples, beats, and sound logic arranged over time.", "把声音看成按时间排列的采样数据，理解节拍和混音。", "audio", 5, 18, "Understand sound as a time sequence of samples.", "把声音理解成随时间变化的一串采样值。"),
  chapter(19, "python", 19, "Crypto Vault", "密码金库", "Encoding, shifting, and simple encryption ideas for protecting data.", "从编码、位移到基础加密，理解信息为什么能被保护。", "crypto", 5, 19, "Separate readable data, encoded data, and secret data.", "区分明文、编码和加密，理解数据保护思路。"),
  chapter(20, "python", 20, "AI Training Camp", "AI 训练营", "Rules, data, scores, and tiny models behind smart systems.", "从规则、特征到评分与数据，理解智能系统如何做出选择。", "ai", 5, 20, "See how data and rules turn into machine decisions.", "理解数据、规则和评分怎样变成机器判断。"),
  chapter(21, "python", 21, "3D Space", "3D 空间站", "Coordinates, vectors, and movement in simple 3D worlds.", "用坐标、向量和距离理解基础三维空间逻辑。", "space3d", 5, 21, "Use coordinates and vectors to describe movement precisely.", "学会用坐标和向量精确描述位置与移动。"),
  chapter(22, "python", 22, "Game Dev Workshop", "游戏开发工坊", "Players, rules, collisions, feedback, and complete game loops.", "从角色状态、规则判定到碰撞反馈，理解游戏是怎样被组织起来的。", "game", 5, 22, "Design systems that make challenge, feedback, and fun work together.", "用系统思维把挑战、反馈和乐趣组织在一起。"),
  chapter(101, "cpp", 1, "C++ Kickoff", "C++ 启航", "Output, variables, loops, and structured code.", "输出、变量、循环和结构化代码。", "cpp", 5, 4, "Meet fast and rigorous coding style.", "认识高效而严谨的代码风格。"),
  chapter(102, "cpp", 2, "STL Starter", "STL 起步", "Use vectors, strings, and simple algorithms.", "认识 vector、string 和常用算法。", "cpp", 5, 5, "Store and process data with C++ tools.", "学会用 C++ 工具管理数据。"),
  chapter(103, "cpp", 3, "Memory & References", "引用与内存视角", "References, arrays, and how data is stored and accessed.", "认识引用、数组和数据在内存中的基本形态。", "cpp", 5, 6, "First separate values, references, and memory positions.", "先分清值、引用和数据位置，再谈效率与修改。"),
  chapter(104, "cpp", 4, "Class Systems", "类设计工坊", "Use classes, constructors, and containers to build small systems.", "用类、构造函数和容器搭起清晰的小型系统。", "cpp", 5, 7, "Good class design makes data and behavior clearer together.", "好的类设计要让数据与行为一起变清楚。"),
  chapter(201, "java", 1, "Java Object Town", "Java 对象城", "Classes, objects, methods, and organized design.", "类、对象、方法和更有条理的设计方式。", "java", 5, 5, "Build with objects and order.", "用对象和规则搭建系统。"),
  chapter(202, "java", 2, "Java Class Workshop", "Java 类工坊", "Practice constructors, lists, and small class teamwork.", "练习构造方法、列表和小型类协作。", "java", 5, 6, "Make several classes work together.", "让多个类一起完成任务。"),
  chapter(203, "java", 3, "Inheritance Route", "继承与接口", "Use inheritance and interfaces to organize common behavior.", "用继承和接口表达角色共性与变化。", "java", 5, 7, "Find common behavior first, then separate the changing parts.", "先找到共性，再拆出变化点。"),
  chapter(204, "java", 4, "Collections Project", "集合项目工坊", "Combine classes and collections into a mini project flow.", "把类和集合组合成一个完整的小型项目流程。", "java", 5, 8, "Engineering code is not one class, but many objects working together.", "工程代码不是单个类，而是一组协作对象。"),
  chapter(301, "go", 1, "Go Startup Port", "Go 协作港", "Simple syntax, goroutines, and task teamwork.", "简洁语法、协程和任务协作。", "go", 5, 6, "Start thinking in coordinated tasks.", "开始理解并发与分工协作。"),
  chapter(302, "go", 2, "Go Concurrency Dock", "Go 并发码头", "Channels, workers, and lightweight service flow.", "认识通道、工作协程和轻量服务流程。", "go", 5, 7, "Pass tasks clearly between workers.", "学会让任务在线程间有序流动。"),
  chapter(303, "go", 3, "Struct & Interface Bay", "结构体与接口港", "Model data with structs and define behaviors with interfaces.", "用结构体描述数据，用接口抽象行为。", "go", 5, 8, "Describe the model clearly before connecting the functions.", "先把数据模型说明白，再让函数围绕模型协作。"),
  chapter(304, "go", 4, "Service Flow Dock", "服务流程码头", "Handle requests, JSON, and lightweight backend service flow.", "练习请求、JSON 和轻量后端服务流程。", "go", 5, 9, "Backend work is a clean chain of input, process, and output.", "服务端开发的核心是输入、处理、输出这条清晰链路。"),
  chapter(401, "vue", 1, "Vue Component Canvas", "Vue 组件画布", "Templates, bindings, and page building.", "模板、绑定和组件页面搭建。", "vue", 5, 4, "Assemble interfaces from reusable parts.", "学会用组件拼出完整界面。"),
  chapter(402, "vue", 2, "Vue Interaction Lab", "Vue 交互实验室", "Practice props, events, and controlled input.", "练习 props、事件和受控输入。", "vue", 5, 5, "Pass data clearly across components.", "让数据在组件之间清楚流动。"),
  chapter(403, "vue", 3, "Reactive State Studio", "响应式状态工坊", "Use reactive data, computed values, and watchers with clear roles.", "理解响应式数据、计算属性和侦听各自解决什么问题。", "vue", 5, 6, "Many UI changes should be derived from state instead of rewritten by hand.", "不是所有变化都要手写更新，很多界面可以从状态自动推导。"),
  chapter(404, "vue", 4, "Component Collaboration", "组件协作实验室", "Build reusable UI flows with forms, props, emits, and shared state.", "用表单、props、emits 组成可复用的交互流程。", "vue", 5, 7, "Clear components say who sends data, who emits events, and who owns state.", "组件协作要明确谁传数据、谁发事件、谁管理状态。"),
  chapter(501, "react", 1, "React State Lab", "React 状态实验室", "Components, state, events, and dynamic UI.", "组件、状态、事件和动态界面。", "react", 5, 5, "Make interfaces respond to actions.", "让界面对用户动作做出反应。"),
  chapter(502, "react", 2, "React Hooks Lab", "React Hooks 工坊", "Use hooks to read input, derive state, and update lists.", "用 hooks 读取输入、计算状态并更新列表。", "react", 5, 6, "Use hooks to keep UI and data together.", "学会用 hooks 维护界面与数据。"),
  chapter(503, "react", 3, "Effect & Data Flow", "副作用与数据流", "Use effects carefully and keep state updates predictable.", "理解副作用触发时机，让状态流动保持可预测。", "react", 5, 7, "First separate render results from side effects, then React becomes steadier.", "先分清渲染结果和副作用，再写更稳的 React 代码。"),
  chapter(504, "react", 4, "UI Composition Lab", "界面组合工坊", "Compose small components into searchable, interactive views.", "把多个小组件组合成可搜索、可筛选的界面。", "react", 5, 8, "Complex views stay readable when components stay small and data flows one way.", "复杂界面要靠拆组件和单向数据流保持清晰。"),
  chapter(601, "ai-programming", 1, "Prompt Quest", "提问与协作", "Define the goal, audience, constraints, and output before asking AI to help.", "先把目标、对象、限制和输出格式说清楚，再让 AI 帮你做事。", "prompt", 5, 3, "A clear task definition is the first step of good AI teamwork.", "先把任务定义清楚，AI 协作才会稳定。"),
  chapter(602, "ai-programming", 2, "Verify the Machine", "验证与修正", "Check facts, compare with notes, and fix wrong parts before using AI output.", "先核查事实、对照笔记、修正错点，再把 AI 结果真正拿来使用。", "verify", 5, 4, "AI answers are drafts until you verify them.", "AI 给出的只是草稿，验证后才能变成答案。"),
  chapter(603, "ai-programming", 3, "Workflow Builder", "流程拆解工坊", "Break big work into plan, deliverables, tests, and revision loops.", "把大任务拆成计划、交付物、测试和修正闭环，用流程保证质量。", "ai", 5, 5, "Stable AI work needs a full loop, not one lucky prompt.", "稳定的 AI 协作靠完整流程，不靠一次碰运气。"),
  chapter(604, "ai-programming", 4, "Context Engineering", "上下文设计", "Provide files, limits, and examples so AI can stay on the real task.", "学会给 AI 提供上下文、限制和示例，让它少跑偏。", "ai", 5, 6, "AI 不只听一句话，它还依赖上下文质量。", "AI 不只听一句话，它还依赖上下文质量。"),
  chapter(605, "ai-programming", 5, "Evaluation Loop", "评测与自动化", "Use rubrics, cases, and revision loops to judge AI output quality.", "用评分标准、测试用例和循环修正来评估 AI 结果。", "verify", 5, 7, "Using AI well means knowing how to score and improve the result.", "会用 AI 的关键，不是只会生成，而是会评测。"),
  chapter(701, "ai-education", 1, "Meet AI", "认识 AI", "Understand what AI is, where it helps, and why it can still be wrong.", "弄清 AI 是什么、适合帮什么，以及它为什么仍然可能出错。", "learning", 5, 2, "Know the strengths and limits before depending on the tool.", "先看清优势和边界，再决定怎样使用这个工具。"),
  chapter(702, "ai-education", 2, "Learn with AI", "用 AI 学习", "Use AI to plan, summarise, and review while keeping human judgment.", "让 AI 帮你做计划、总结和复盘，但真正的判断与练习仍然在自己。", "learning", 5, 3, "AI should support your study process, not replace it.", "AI 应该帮助学习流程，而不是代替学习过程。"),
  chapter(703, "ai-education", 3, "AI Study Coach", "AI 学习教练", "Turn AI into a study coach for self-check, reflection, and better questions.", "把 AI 用成自测、反思和改进提问的学习教练，而不是答案机器。", "learning", 5, 4, "The best AI study habit ends with your own reflection.", "最好的 AI 学习习惯，最后一定要回到自己的反思。"),
  chapter(704, "ai-education", 4, "AI Ethics & Privacy", "AI 伦理与隐私", "Learn fairness, privacy, and boundaries in real learning scenarios.", "在真实学习场景中理解公平、隐私和使用边界。", "learning", 5, 5, "Using AI responsibly means following rules, respecting boundaries, and owning your choices.", "会用 AI 也要会守规则、守边界、守责任。"),
  chapter(705, "ai-education", 5, "Inquiry Project Lab", "探究项目工坊", "Turn AI into a helper for research, projects, and presentation preparation.", "让 AI 成为探究、项目和表达准备的助手。", "learning", 5, 6, "AI can help organise ideas and extend research, but your conclusion still needs your own thinking.", "AI 适合帮你整理与拓展，但结论和表达仍要自己完成。"),
  chapter(801, "web-foundations", 1, "HTML Start", "HTML 页面起步", "Use semantic tags to define page structure and content meaning.", "用语义化标签搭出页面结构，并说明每块内容各自承担什么角色。", "html", 5, 2, "HTML solves structure first, not decoration.", "HTML 先解决结构问题，再谈好看。"),
  chapter(802, "web-foundations", 2, "CSS Style Studio", "CSS 样式工坊", "Control color, spacing, layout, and visual hierarchy with CSS.", "用 CSS 管理颜色、间距、布局和视觉层级，让页面更清楚更好读。", "css", 5, 3, "CSS makes information easier to read and compare.", "CSS 的核心作用是让信息更清楚、更有层次。"),
  chapter(803, "web-foundations", 3, "JavaScript Motion Lab", "JavaScript 动作实验室", "Add logic, interaction, and state changes so pages react to users.", "用 JavaScript 给页面加逻辑、交互和状态变化，让网页真正动起来。", "javascript", 5, 4, "JavaScript handles behaviour and response, not just animation.", "JavaScript 解决的是行为与响应，不只是做动画。"),
  chapter(804, "web-foundations", 4, "Forms & DOM Lab", "表单与 DOM 实验室", "Handle inputs, validation, and DOM updates with JavaScript.", "用 JavaScript 处理输入、校验和 DOM 更新。", "javascript", 5, 5, "Web interaction starts with reading input and updating the page at the right time.", "网页交互的核心是读懂用户输入并及时更新界面。"),
  chapter(805, "web-foundations", 5, "Responsive Design Deck", "响应式设计甲板", "Use layout rules to fit phones, tablets, and desktops.", "用布局规则适配手机、平板和桌面屏幕。", "css", 5, 6, "Responsive design means layouts adapt themselves to space.", "响应式不是单独做手机版，而是让布局自己适应空间。"),
  chapter(901, "database", 1, "MySQL Table Base", "MySQL 表结构基础", "Learn rows, columns, keys, and how schema design keeps data organized.", "认识行、列、主键和表关系，理解为什么表结构能让数据长期保持清楚。", "mysql", 5, 4, "Good tables keep data stable before any query begins.", "真正稳定的数据，先靠表设计，再靠查询。"),
  chapter(902, "database", 2, "Query Workshop", "查询工坊", "Practice filtering, sorting, grouping, and joins to answer real questions.", "练习筛选、排序、统计和连接，让数据库回答真实业务问题。", "query", 5, 5, "A query is a question to data, so ask it precisely.", "查询本质上是在向数据发问，问题要问得准。"),
  chapter(903, "database", 3, "Relational Design", "关系设计工坊", "Use foreign keys and joins to connect data safely.", "用外键和表关系把数据安全地连接起来。", "database", 5, 6, "The power of relational databases comes from clear links between tables.", "关系型数据库的力量来自表之间的明确连接。"),
  chapter(904, "database", 4, "Index & Safety Lab", "索引与安全实验室", "Understand indexes, transactions, and update safety.", "理解索引、事务和更新安全，避免把数据改乱。", "query", 5, 7, "A strong database does not only query fast, it also updates safely.", "数据库不只会查得快，还要改得稳、回得去。"),
  chapter(1001, "cyber-security", 1, "Security Basics", "安全基础", "Build safe passwords, permissions, backups, and defense awareness.", "建立密码、权限、备份和基础防护意识，从习惯层先把风险降下来。", "safety", 5, 5, "Most security starts with habits and boundaries.", "很多安全问题，先靠习惯和边界意识解决。"),
  chapter(1002, "cyber-security", 2, "Kali Lab Basics", "Kali 实验室基础", "Use Kali in a legal lab context and learn safe inspection commands.", "在合法实验室环境下认识 Kali 和安全排查命令，先学规则再学工具。", "kali", 5, 6, "Tools matter only after you understand the lab boundary.", "先明白实验边界，工具才有正确用法。"),
  chapter(1003, "cyber-security", 3, "Web Defense Basics", "Web 防护基础", "Recognize auth risks, unsafe input, and common web defense ideas.", "认识认证风险、危险输入和常见 Web 防护方式。", "safety", 5, 7, "Protection starts by knowing where common attacks come from.", "先知道常见攻击从哪里来，防护才不会只靠运气。"),
  chapter(1004, "cyber-security", 4, "Monitoring & Response", "监控与响应工坊", "Read logs, track events, and respond in the right order.", "学会看日志、追踪事件，并按正确顺序进行响应。", "kali", 5, 8, "Real security includes finding, recording, and responding, not only prevention.", "真正的安全不仅是预防，还包括发现、记录和响应。"),
  ...STAGE_TWO_LEARNING_CHAPTERS,
];

export function getLearningCategories() {
  return [...LEARNING_CATEGORIES].sort((left, right) => left.order - right.order);
}

export function getLearningCategory(categoryId: LearningCategoryId) {
  return LEARNING_CATEGORIES.find((categoryItem) => categoryItem.id === categoryId);
}

export function getLearningSubject(subjectId: LearningSubjectId) {
  return LEARNING_SUBJECTS.find((subjectItem) => subjectItem.id === subjectId);
}

export function getLearningSubjectResources(subjectId: LearningSubjectId) {
  return [...(LEARNING_SUBJECT_RESOURCE_OVERRIDES[subjectId] ?? LEARNING_SUBJECT_RESOURCES[subjectId] ?? [])];
}

export function getLearningResourcesForChapter(chapterId: number) {
  const chapter = getLearningChapter(chapterId);

  if (!chapter) {
    return [];
  }

  const chapterResources = LEARNING_CHAPTER_RESOURCES[chapterId] ?? [];
  const subjectResources = getLearningSubjectResources(chapter.subjectId);
  const mergedResources = [...chapterResources];

  for (const resourceItem of subjectResources) {
    if (!mergedResources.some((existing) => existing.url === resourceItem.url)) {
      mergedResources.push(resourceItem);
    }
  }

  return mergedResources.slice(0, 4);
}

export function getLearningSubjectsForCategory(categoryId: LearningCategoryId) {
  return LEARNING_SUBJECTS.filter((subjectItem) => subjectItem.categoryId === categoryId).sort(
    (left, right) => left.order - right.order,
  );
}

export function getLearningChaptersForSubject(subjectId: LearningSubjectId) {
  return LEARNING_CHAPTERS.filter((chapterItem) => chapterItem.subjectId === subjectId).sort(
    (left, right) => left.order - right.order,
  );
}

export function getLearningChapter(chapterId: number) {
  return LEARNING_CHAPTERS.find((chapterItem) => chapterItem.id === chapterId);
}

export function getLearningSubjectChapterCount(subjectId: LearningSubjectId) {
  return LEARNING_CHAPTERS.filter((chapterItem) => chapterItem.subjectId === subjectId).length;
}

export function getLearningCategorySubjectCount(categoryId: LearningCategoryId) {
  return LEARNING_SUBJECTS.filter((subjectItem) => subjectItem.categoryId === categoryId).length;
}
