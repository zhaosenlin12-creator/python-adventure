import { extractKnowledgeHint, getLearningChapter, isLikelyCorruptedText } from "./learningHub";
import { STAGE_TWO_PACKS } from "./learningExtraLevelsStageTwo";
import type { BattleConfig, Level } from "./levels";

type EditorLanguage = NonNullable<Level["editorLanguage"]>;
type Runtime = NonNullable<Level["runtime"]>;

interface LevelTemplate {
    slug: string;
    title: string;
    titleCN?: string;
    description: string;
    descriptionCN?: string;
    knowledgeHintCN?: string;
    type?: Level["type"];
    initialCode: string;
    expectedOutput?: string;
    validationKeyword?: string;
    requiredSnippets?: string[];
    simulatedOutput?: string[];
    enemyName: string;
}

interface ChapterPack {
    chapterId: number;
    runtime: Runtime;
    editorLanguage: EditorLanguage;
    enemyAvatar: string;
    templates: LevelTemplate[];
}

const MAP_POINTS = [
    { x: 20, y: 20 },
    { x: 35, y: 30 },
    { x: 50, y: 40 },
    { x: 65, y: 50 },
    { x: 80, y: 60 },
];

function buildBattle(enemyName: string, enemyAvatar: string, type: Level["type"], index: number): BattleConfig {
    const isBoss = type === "boss";
    return {
        enemyName,
        enemyAvatar,
        enemyHp: isBoss ? 110 : 70 + index * 6,
        enemyMaxHp: isBoss ? 110 : 70 + index * 6,
        enemyAttack: isBoss ? 30 : 22 + index,
        playerHp: isBoss ? 150 : 120 + index * 5,
        playerMaxHp: isBoss ? 150 : 120 + index * 5,
    };
}

function normalizeKnowledgeHint(knowledgeHint?: string) {
    return knowledgeHint?.trim().replace(/[。.]$/, "");
}

function renderKnowledgeComment(editorLanguage: EditorLanguage, knowledgeHint: string) {
    switch (editorLanguage) {
        case "cpp":
        case "java":
        case "javascript":
            return `// 知识点：${knowledgeHint}`;
        case "html":
            return `<!-- 知识点：${knowledgeHint} -->`;
        case "sql":
            return `-- 知识点：${knowledgeHint}`;
        case "bash":
        case "prompt":
        case "python":
        default:
            return `# 知识点：${knowledgeHint}`;
    }
}

function localizeKnowledgeComment(initialCode: string, knowledgeHint: string | undefined, editorLanguage: EditorLanguage) {
    const normalizedHint = normalizeKnowledgeHint(knowledgeHint);

    if (!normalizedHint) {
        return initialCode;
    }

    if (initialCode.startsWith("# Knowledge:")) {
        return initialCode.replace(/^# Knowledge:.*$/m, `# 知识点：${normalizedHint}`);
    }

    if (initialCode.startsWith("// Knowledge:")) {
        return initialCode.replace(/^\/\/ Knowledge:.*$/m, `// 知识点：${normalizedHint}`);
    }

    if (initialCode.startsWith("<!-- Knowledge:")) {
        return initialCode.replace(/^<!-- Knowledge:.*?-->$/m, `<!-- 知识点：${normalizedHint} -->`);
    }

    return `${renderKnowledgeComment(editorLanguage, normalizedHint)}\n${initialCode}`;
}

function buildChapterLevels(pack: ChapterPack): Level[] {
    const chapter = getLearningChapter(pack.chapterId);

    if (!chapter) {
        throw new Error(`Missing learning chapter metadata for ${pack.chapterId}`);
    }

    return pack.templates.map((template, index) => {
        const type = template.type ?? (index === pack.templates.length - 1 ? "boss" : index >= 3 ? "battle" : "lesson");
        const point = MAP_POINTS[index] ?? MAP_POINTS[MAP_POINTS.length - 1];
        const reqLevel = chapter.requiredLevel + (type === "boss" ? 1 : 0);
        const chapterKnowledgeHint =
            chapter.focusCN && !isLikelyCorruptedText(chapter.focusCN) ? chapter.focusCN : undefined;
        const templateKnowledgeHint = template.knowledgeHintCN ?? extractKnowledgeHint(template.initialCode) ?? chapterKnowledgeHint ?? template.descriptionCN;

        return {
            id: `${chapter.subjectId}-${chapter.id}-${template.slug}`,
            chapter: chapter.id,
            chapterTitle: chapter.title,
            chapterTitleCN: isLikelyCorruptedText(chapter.titleCN) ? undefined : chapter.titleCN,
            title: template.title,
            titleCN: template.titleCN && !isLikelyCorruptedText(template.titleCN) ? template.titleCN : undefined,
            description: template.description,
            descriptionCN: template.descriptionCN && !isLikelyCorruptedText(template.descriptionCN) ? template.descriptionCN : undefined,
            x: point.x,
            y: point.y,
            reqLevel,
            type,
            initialCode: localizeKnowledgeComment(
                template.initialCode,
                templateKnowledgeHint,
                pack.editorLanguage,
            ),
            runtime: pack.runtime,
            editorLanguage: pack.editorLanguage,
            expectedOutput: template.expectedOutput,
            validationKeyword: template.validationKeyword,
            requiredSnippets: template.requiredSnippets,
            simulatedOutput: template.simulatedOutput,
            battle: buildBattle(template.enemyName, pack.enemyAvatar, type, index),
        };
    });
}

const EXTRA_CHAPTER_PACKS: ChapterPack[] = [
    {
        chapterId: 17,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🖼️",
        templates: [
            {
                slug: "pixel-grid",
                title: "Pixel Grid",
                titleCN: "像素网格",
                description: "Count how many pixels are in the first row.",
                descriptionCN: "统计第一行有多少个像素。",
                initialCode: `# Knowledge: nested image rows
pixels = [[1, 2, 3], [4, 5, 6]]
print(len(pixels[____]))`,
                expectedOutput: "3",
                enemyName: "Pixel Bug",
            },
            {
                slug: "red-average",
                title: "Red Average",
                titleCN: "红色平均值",
                description: "Compute the average red value.",
                descriptionCN: "计算红色通道的平均值。",
                initialCode: `# Knowledge: average of a list
reds = [120, 150, 180]
avg_red = sum(reds) // len(____)
print(avg_red)`,
                expectedOutput: "150",
                enemyName: "Color Sprite",
            },
            {
                slug: "mirror-row",
                title: "Mirror Row",
                titleCN: "镜像一行",
                description: "Reverse the row to simulate a mirror effect.",
                descriptionCN: "反转这一行，模拟镜像效果。",
                initialCode: `# Knowledge: reverse a row
row = [1, 2, 3]
print(list(reversed(____)))`,
                expectedOutput: "[3, 2, 1]",
                enemyName: "Mirror Bat",
            },
            {
                slug: "clamp-brightness",
                title: "Clamp Brightness",
                titleCN: "限制亮度",
                description: "Keep brightness under the safe cap.",
                descriptionCN: "把亮度限制在安全范围内。",
                initialCode: `# Knowledge: min keeps values inside a cap
brightness = 310
safe_value = min(brightness, ____)
print(safe_value)`,
                expectedOutput: "255",
                enemyName: "Flash Moth",
            },
            {
                slug: "boss-color-mix",
                title: "Boss Color Mix",
                titleCN: "终极配色",
                description: "Mix the red and blue channels to power up the final spell.",
                descriptionCN: "把红色和蓝色通道相加，释放最终法术。",
                initialCode: `# Knowledge: combine color channels
color = {"r": 120, "g": 60, "b": 80}
print(color["r"] + color["____"])`,
                expectedOutput: "200",
                enemyName: "Palette Dragon",
            },
        ],
    },
    {
        chapterId: 18,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🎵",
        templates: [
            {
                slug: "peak-sample",
                title: "Peak Sample",
                titleCN: "最大采样",
                description: "Find the loudest sample.",
                descriptionCN: "找出最大的采样值。",
                initialCode: `# Knowledge: max sample
samples = [2, 5, 3, 4]
print(max(____))`,
                expectedOutput: "5",
                enemyName: "Wave Imp",
            },
            {
                slug: "volume-boost",
                title: "Volume Boost",
                titleCN: "音量放大",
                description: "Double every sample in the sound clip.",
                descriptionCN: "把每个采样值都放大两倍。",
                initialCode: `# Knowledge: list comprehension
samples = [1, 2, 3]
boosted = [s * ____ for s in samples]
print(boosted)`,
                expectedOutput: "[2, 4, 6]",
                enemyName: "Beat Hopper",
            },
            {
                slug: "beat-counter",
                title: "Beat Counter",
                titleCN: "节拍计数",
                description: "Count how many strong beats appear.",
                descriptionCN: "统计强拍出现了多少次。",
                initialCode: `# Knowledge: count in a list
beats = ["boom", "tap", "boom", "boom"]
print(beats.count(____))`,
                expectedOutput: "3",
                enemyName: "Drum Blob",
            },
            {
                slug: "echo-maker",
                title: "Echo Maker",
                titleCN: "回声制造机",
                description: "Repeat the sound once to build an echo.",
                descriptionCN: "把声音重复一次，做出回声。",
                initialCode: `# Knowledge: repeat with strings
sound = "la"
print(sound + "____" + sound)`,
                expectedOutput: "la-la",
                enemyName: "Echo Fox",
            },
            {
                slug: "boss-track-mix",
                title: "Boss Track Mix",
                titleCN: "终极混音",
                description: "Average two tracks to unlock the boss room.",
                descriptionCN: "计算两条音轨的平均值，打开 Boss 房间。",
                initialCode: `# Knowledge: average two tracks
left = [4, 6, 8]
right = [2, 4, 6]
result = (sum(left) + sum(right)) // ____
print(result)`,
                expectedOutput: "5",
                enemyName: "Sound Guardian",
            },
        ],
    },
    {
        chapterId: 19,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🔐",
        templates: [
            {
                slug: "letter-shift",
                title: "Letter Shift",
                titleCN: "字母位移",
                description: "Shift the letter A forward by 2.",
                descriptionCN: "把字母 A 向后移动 2 位。",
                initialCode: `# Knowledge: ord and chr
print(chr(ord("A") + ____))`,
                expectedOutput: "C",
                enemyName: "Cipher Ant",
            },
            {
                slug: "reverse-secret",
                title: "Reverse Secret",
                titleCN: "反向密语",
                description: "Reverse the secret word.",
                descriptionCN: "把密语反转过来。",
                initialCode: `# Knowledge: slice reverse
secret = "code"
print(secret[____])`,
                expectedOutput: "edoc",
                enemyName: "Backmask Bird",
            },
            {
                slug: "pin-check",
                title: "Pin Check",
                titleCN: "口令检查",
                description: "Open the vault only when the PIN matches.",
                descriptionCN: "只有口令一致时才能打开保险库。",
                initialCode: `# Knowledge: if check
saved_pin = 2468
input_pin = 2468
if input_pin == ____:
    print("OPEN")`,
                expectedOutput: "OPEN",
                enemyName: "Vault Mite",
            },
            {
                slug: "mask-tail",
                title: "Mask Tail",
                titleCN: "尾号遮罩",
                description: "Only show the last two digits.",
                descriptionCN: "只显示后两位数字。",
                initialCode: `# Knowledge: string slices
pin = "1234"
print("**" + pin[____])`,
                expectedOutput: "**34",
                enemyName: "Mask Crab",
            },
            {
                slug: "boss-xor-gate",
                title: "Boss XOR Gate",
                titleCN: "终极异或门",
                description: "Make the logic gate return True.",
                descriptionCN: "让逻辑门输出 True。",
                initialCode: `# Knowledge: xor with booleans
a = True
b = False
print((a and not b) or (not a and ____))`,
                expectedOutput: "True",
                enemyName: "Gate Keeper",
            },
        ],
    },
    {
        chapterId: 20,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🤖",
        templates: [
            {
                slug: "keyword-count",
                title: "Keyword Count",
                titleCN: "关键词统计",
                description: "Count how many times AI sees the word data.",
                descriptionCN: "统计单词 data 出现了多少次。",
                initialCode: `# Knowledge: count keywords
words = ["data", "model", "data", "robot"]
print(words.count(____))`,
                expectedOutput: "2",
                enemyName: "Data Scout",
            },
            {
                slug: "grade-label",
                title: "Grade Label",
                titleCN: "等级标签",
                description: "Label a high score as A.",
                descriptionCN: "把高分标记为 A。",
                initialCode: `# Knowledge: rule based labels
score = 95
if score >= ____:
    print("A")`,
                expectedOutput: "A",
                enemyName: "Rule Hopper",
            },
            {
                slug: "best-score",
                title: "Best Score",
                titleCN: "最佳分数",
                description: "Find the highest confidence score.",
                descriptionCN: "找出最高置信分数。",
                initialCode: `# Knowledge: max choice
scores = [88, 92, 85]
print(max(____))`,
                expectedOutput: "92",
                enemyName: "Rank Sprite",
            },
            {
                slug: "label-data",
                title: "Label Data",
                titleCN: "数据打标",
                description: "Read the label from the data card.",
                descriptionCN: "从数据卡中读取标签。",
                initialCode: `# Knowledge: read structured data
sample = {"image": "cat.png", "label": "cat"}
print(sample["____"])`,
                expectedOutput: "cat",
                enemyName: "Label Bot",
            },
            {
                slug: "boss-recommender",
                title: "Boss Recommender",
                titleCN: "终极推荐器",
                description: "Pick the item with the highest score.",
                descriptionCN: "选出得分最高的项目。",
                initialCode: `# Knowledge: best value by key
choices = {"robot": 9, "drone": 7, "puzzle": 8}
best = max(choices, key=choices.get)
print(____)`,
                expectedOutput: "robot",
                enemyName: "Model Captain",
            },
        ],
    },
    {
        chapterId: 21,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🧊",
        templates: [
            {
                slug: "point-z",
                title: "Point Z",
                titleCN: "读取 Z 轴",
                description: "Read the z value from a 3D point.",
                descriptionCN: "读取三维坐标里的 z 值。",
                initialCode: `# Knowledge: tuple indexes
point = (3, 4, 9)
print(point[____])`,
                expectedOutput: "9",
                enemyName: "Cube Scout",
            },
            {
                slug: "move-x",
                title: "Move X",
                titleCN: "X 轴移动",
                description: "Move the point 3 steps on x.",
                descriptionCN: "让点在 x 轴上前进 3 格。",
                initialCode: `# Knowledge: create a moved point
point = (2, 2, 1)
new_point = (point[0] + ____, point[1], point[2])
print(new_point)`,
                expectedOutput: "(5, 2, 1)",
                enemyName: "Axis Bee",
            },
            {
                slug: "distance-square",
                title: "Distance Square",
                titleCN: "距离平方",
                description: "Compute the squared distance from the origin.",
                descriptionCN: "计算点到原点的距离平方。",
                initialCode: `# Knowledge: dx*dx + dy*dy + dz*dz
point = (1, 2, 3)
result = point[0]**2 + point[1]**2 + point[2]**____
print(result)`,
                expectedOutput: "14",
                enemyName: "Grid Hopper",
            },
            {
                slug: "inside-box",
                title: "Inside Box",
                titleCN: "进入立方体",
                description: "Check whether the point stays inside the box.",
                descriptionCN: "判断点是否还在立方体范围内。",
                initialCode: `# Knowledge: range checks
x, y, z = 4, 7, 2
if 0 <= x <= 10 and 0 <= y <= 10 and 0 <= z <= ____:
    print("INSIDE")`,
                expectedOutput: "INSIDE",
                enemyName: "Box Watcher",
            },
            {
                slug: "boss-vector-add",
                title: "Boss Vector Add",
                titleCN: "终极向量相加",
                description: "Add two vectors together.",
                descriptionCN: "把两个向量相加。",
                initialCode: `# Knowledge: add vectors component by component
a = (1, 2, 3)
b = (4, 5, 6)
result = (a[0] + b[0], a[1] + b[1], a[2] + ____)
print(result)`,
                expectedOutput: "(5, 7, 9)",
                enemyName: "Space Warden",
            },
        ],
    },
    {
        chapterId: 22,
        runtime: "python",
        editorLanguage: "python",
        enemyAvatar: "🎮",
        templates: [
            {
                slug: "score-boost",
                title: "Score Boost",
                titleCN: "分数提升",
                description: "Add 10 points to the score.",
                descriptionCN: "给分数增加 10 点。",
                initialCode: `# Knowledge: update a score
score = 20
score += ____
print(score)`,
                expectedOutput: "30",
                enemyName: "Score Sprite",
            },
            {
                slug: "collision-check",
                title: "Collision Check",
                titleCN: "碰撞检测",
                description: "Check whether two positions match.",
                descriptionCN: "判断两个位置是否发生碰撞。",
                initialCode: `# Knowledge: compare positions
player = (4, 5)
coin = (4, 5)
print(player == ____)`,
                expectedOutput: "True",
                enemyName: "Collider",
            },
            {
                slug: "life-warning",
                title: "Life Warning",
                titleCN: "生命提醒",
                description: "Show game over when hp reaches zero.",
                descriptionCN: "当生命值归零时显示游戏结束。",
                initialCode: `# Knowledge: zero health check
hp = 0
if hp <= ____:
    print("GAME OVER")`,
                expectedOutput: "GAME OVER",
                enemyName: "Life Leech",
            },
            {
                slug: "inventory-add",
                title: "Inventory Add",
                titleCN: "背包新增",
                description: "Add the gem to the inventory.",
                descriptionCN: "把宝石加入背包。",
                initialCode: `# Knowledge: append item
inventory = ["key", "map"]
inventory.append("____")
print(inventory)`,
                expectedOutput: "['key', 'map', 'gem']",
                enemyName: "Bag Mimic",
            },
            {
                slug: "boss-stage-clear",
                title: "Boss Stage Clear",
                titleCN: "终极清场",
                description: "Count how many enemies were defeated.",
                descriptionCN: "统计一共击败了多少个敌人。",
                initialCode: `# Knowledge: sum a result list
defeated = [1, 1, 1]
print(sum(____))`,
                expectedOutput: "3",
                enemyName: "Arena Master",
            },
        ],
    },
    {
        chapterId: 101,
        runtime: "pattern",
        editorLanguage: "cpp",
        enemyAvatar: "⚙️",
        templates: [
            {
                slug: "hello-cpp",
                title: "Hello C++",
                titleCN: "你好 C++",
                description: "Fill the missing text so C++ says hello.",
                descriptionCN: "补全内容，让 C++ 打出问候。",
                initialCode: `// Knowledge: output with std::cout
#include <iostream>
int main() {
    std::cout << "____";
    return 0;
}`,
                requiredSnippets: ['std::cout << "Hello C++";'],
                simulatedOutput: ["Hello C++"],
                enemyName: "Gear Bug",
            },
            {
                slug: "score-variable",
                title: "Score Variable",
                titleCN: "分数变量",
                description: "Store the score and print it.",
                descriptionCN: "把分数存进变量并输出。",
                initialCode: `// Knowledge: int variables
#include <iostream>
int main() {
    int score = ____;
    std::cout << score;
    return 0;
}`,
                requiredSnippets: ["int score = 100;", "std::cout << score;"],
                simulatedOutput: ["100"],
                enemyName: "Iron Mite",
            },
            {
                slug: "energy-check",
                title: "Energy Check",
                titleCN: "能量判断",
                description: "Use if to print Attack.",
                descriptionCN: "用 if 输出 Attack。",
                initialCode: `// Knowledge: if statements
#include <iostream>
int main() {
    int energy = 80;
    if (energy > ____) {
        std::cout << "Attack";
    }
    return 0;
}`,
                requiredSnippets: ["if (energy > 50)", 'std::cout << "Attack";'],
                simulatedOutput: ["Attack"],
                enemyName: "Steam Scout",
            },
            {
                slug: "loop-count",
                title: "Loop Count",
                titleCN: "循环计数",
                description: "Loop three times.",
                descriptionCN: "循环执行三次。",
                initialCode: `// Knowledge: for loops
#include <iostream>
int main() {
    for (int i = 0; i < ____; i++) {
        std::cout << i << " ";
    }
    return 0;
}`,
                requiredSnippets: ["for (int i = 0; i < 3; i++)"],
                simulatedOutput: ["0 1 2"],
                enemyName: "Loop Wrench",
            },
            {
                slug: "boss-boost",
                title: "Boss Boost",
                titleCN: "终极加成",
                description: "Complete the function and print the boosted hp.",
                descriptionCN: "补完整个函数，输出加成后的生命值。",
                initialCode: `// Knowledge: functions in C++
#include <iostream>
int boost(int hp) {
    return hp + ____;
}
int main() {
    std::cout << boost(80);
    return 0;
}`,
                requiredSnippets: ["int boost(int hp)", "return hp + 20;", "std::cout << boost(80);"],
                simulatedOutput: ["100"],
                enemyName: "Forge Titan",
            },
        ],
    },
    {
        chapterId: 201,
        runtime: "pattern",
        editorLanguage: "java",
        enemyAvatar: "☕",
        templates: [
            {
                slug: "hello-java",
                title: "Hello Java",
                titleCN: "你好 Java",
                description: "Print the Java greeting.",
                descriptionCN: "打印 Java 的问候语。",
                initialCode: `// Knowledge: System.out.println
public class Main {
    public static void main(String[] args) {
        System.out.println("____");
    }
}`,
                requiredSnippets: ['System.out.println("Hello Java");'],
                simulatedOutput: ["Hello Java"],
                enemyName: "Object Bee",
            },
            {
                slug: "level-variable",
                title: "Level Variable",
                titleCN: "等级变量",
                description: "Create a level variable and print it.",
                descriptionCN: "创建等级变量并输出。",
                initialCode: `// Knowledge: int values
public class Main {
    public static void main(String[] args) {
        int level = ____;
        System.out.println(level);
    }
}`,
                requiredSnippets: ["int level = 7;", "System.out.println(level);"],
                simulatedOutput: ["7"],
                enemyName: "Bean Hopper",
            },
            {
                slug: "grade-check",
                title: "Grade Check",
                titleCN: "成绩判断",
                description: "Print A when the score is high enough.",
                descriptionCN: "当分数够高时输出 A。",
                initialCode: `// Knowledge: if in Java
public class Main {
    public static void main(String[] args) {
        int score = 96;
        if (score >= ____) {
            System.out.println("A");
        }
    }
}`,
                requiredSnippets: ["if (score >= 90)", 'System.out.println("A");'],
                simulatedOutput: ["A"],
                enemyName: "Grade Sprite",
            },
            {
                slug: "pet-method",
                title: "Pet Method",
                titleCN: "宠物方法",
                description: "Return a greeting from the method.",
                descriptionCN: "让方法返回一句问候。",
                initialCode: `// Knowledge: methods inside classes
class Pet {
    String speak() {
        return "____";
    }
}
public class Main {
    public static void main(String[] args) {
        System.out.println(new Pet().speak());
    }
}`,
                requiredSnippets: ['String speak()', 'return "Hi";', "new Pet().speak()"],
                simulatedOutput: ["Hi"],
                enemyName: "Method Drake",
            },
            {
                slug: "boss-robot",
                title: "Boss Robot",
                titleCN: "终极机器人",
                description: "Create the robot and print its power.",
                descriptionCN: "创建机器人并输出它的能量。",
                initialCode: `// Knowledge: objects and fields
class Robot {
    int power = ____;
}
public class Main {
    public static void main(String[] args) {
        Robot r = new Robot();
        System.out.println(r.power);
    }
}`,
                requiredSnippets: ["int power = 120;", "Robot r = new Robot();", "System.out.println(r.power);"],
                simulatedOutput: ["120"],
                enemyName: "Class Colossus",
            },
        ],
    },
    {
        chapterId: 301,
        runtime: "pattern",
        editorLanguage: "go",
        enemyAvatar: "🌀",
        templates: [
            {
                slug: "hello-go",
                title: "Hello Go",
                titleCN: "你好 Go",
                description: "Make Go print a greeting.",
                descriptionCN: "让 Go 输出一句问候。",
                initialCode: `// Knowledge: fmt.Println
package main
import "fmt"
func main() {
    fmt.Println("____")
}`,
                requiredSnippets: ['fmt.Println("Hello Go")'],
                simulatedOutput: ["Hello Go"],
                enemyName: "Harbor Imp",
            },
            {
                slug: "score-short",
                title: "Short Declare",
                titleCN: "短变量声明",
                description: "Use := to store a score.",
                descriptionCN: "用 := 保存一个分数。",
                initialCode: `// Knowledge: := short declaration
package main
import "fmt"
func main() {
    score := ____
    fmt.Println(score)
}`,
                requiredSnippets: ["score := 8", "fmt.Println(score)"],
                simulatedOutput: ["8"],
                enemyName: "Dock Sprite",
            },
            {
                slug: "energy-if",
                title: "Energy If",
                titleCN: "能量判断",
                description: "Print Ready when energy is above 60.",
                descriptionCN: "当能量大于 60 时输出 Ready。",
                initialCode: `// Knowledge: if in Go
package main
import "fmt"
func main() {
    energy := 75
    if energy > ____ {
        fmt.Println("Ready")
    }
}`,
                requiredSnippets: ["if energy > 60", 'fmt.Println("Ready")'],
                simulatedOutput: ["Ready"],
                enemyName: "Mist Sailor",
            },
            {
                slug: "loop-three",
                title: "Loop Three",
                titleCN: "三次循环",
                description: "Loop from 0 to 2.",
                descriptionCN: "循环输出 0 到 2。",
                initialCode: `// Knowledge: for in Go
package main
import "fmt"
func main() {
    for i := 0; i < ____; i++ {
        fmt.Println(i)
    }
}`,
                requiredSnippets: ["for i := 0; i < 3; i++"],
                simulatedOutput: ["0", "1", "2"],
                enemyName: "Loop Gull",
            },
            {
                slug: "boss-bonus",
                title: "Boss Bonus",
                titleCN: "终极加分",
                description: "Finish the function and print the new score.",
                descriptionCN: "补完整个函数，输出新的分数。",
                initialCode: `// Knowledge: functions in Go
package main
import "fmt"
func bonus(points int) int {
    return points + ____
}
func main() {
    fmt.Println(bonus(10))
}`,
                requiredSnippets: ["func bonus(points int) int", "return points + 5", "fmt.Println(bonus(10))"],
                simulatedOutput: ["15"],
                enemyName: "Port Captain",
            },
        ],
    },
    {
        chapterId: 401,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "🖌️",
        templates: [
            {
                slug: "title-bind",
                title: "Title Bind",
                titleCN: "标题绑定",
                description: "Bind the title into the template.",
                descriptionCN: "把标题绑定到模板里。",
                initialCode: `<!-- Knowledge: template interpolation -->
<template>
  <h1>{{ ____ }}</h1>
</template>

<script setup>
const title = "Vue Hero"
</script>`,
                requiredSnippets: ["{{ title }}", 'const title = "Vue Hero"'],
                simulatedOutput: ["Vue Hero"],
                enemyName: "Canvas Bug",
            },
            {
                slug: "ref-counter",
                title: "Ref Counter",
                titleCN: "响应计数",
                description: "Create a reactive count value.",
                descriptionCN: "创建一个响应式 count。",
                initialCode: `<!-- Knowledge: ref -->
<script setup>
import { ref } from "vue"
const count = ref(____)
</script>

<template>
  <p>{{ count }}</p>
</template>`,
                requiredSnippets: ['import { ref } from "vue"', "const count = ref(1)", "{{ count }}"],
                simulatedOutput: ["1"],
                enemyName: "Ref Wisp",
            },
            {
                slug: "list-loop",
                title: "List Loop",
                titleCN: "列表循环",
                description: "Render every badge in the list.",
                descriptionCN: "把每个徽章都渲染出来。",
                initialCode: `<!-- Knowledge: v-for -->
<script setup>
const badges = ["logic", "code"]
</script>

<template>
  <li v-for="badge in ____" :key="badge">{{ badge }}</li>
</template>`,
                requiredSnippets: ['v-for="badge in badges"', ':key="badge"'],
                simulatedOutput: ["logic", "code"],
                enemyName: "Loop Painter",
            },
            {
                slug: "ready-guard",
                title: "Ready Guard",
                titleCN: "条件显示",
                description: "Only show the message when ready is true.",
                descriptionCN: "只有 ready 为 true 时才显示提示。",
                initialCode: `<!-- Knowledge: v-if -->
<script setup>
const ready = true
</script>

<template>
  <p v-____="ready">Ready</p>
</template>`,
                requiredSnippets: ['v-if="ready"', ">Ready<"],
                simulatedOutput: ["Ready"],
                enemyName: "Guard Brush",
            },
            {
                slug: "boss-click",
                title: "Boss Click",
                titleCN: "终极点击",
                description: "Wire the button so it adds one point.",
                descriptionCN: "让按钮点击后分数加一。",
                initialCode: `<!-- Knowledge: click handlers -->
<script setup>
import { ref } from "vue"
const score = ref(0)
</script>

<template>
  <button @click="score++">{{ score }}</button>
</template>`,
                requiredSnippets: ['const score = ref(0)', '@click="score++"', "{{ score }}"],
                simulatedOutput: ["score: 1"],
                enemyName: "Canvas Titan",
            },
        ],
    },
    {
        chapterId: 501,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "⚛️",
        templates: [
            {
                slug: "title-component",
                title: "Title Component",
                titleCN: "标题组件",
                description: "Return a title from the component.",
                descriptionCN: "让组件返回一个标题。",
                initialCode: `// Knowledge: JSX return
export default function TitleCard() {
  return <h1>____</h1>
}`,
                requiredSnippets: ["return <h1>React Hero</h1>"],
                simulatedOutput: ["React Hero"],
                enemyName: "State Spark",
            },
            {
                slug: "state-counter",
                title: "State Counter",
                titleCN: "状态计数",
                description: "Create a state value for count.",
                descriptionCN: "创建一个 count 状态值。",
                initialCode: `// Knowledge: useState
import { useState } from "react"

export default function Counter() {
  const [count, setCount] = useState(____)
  return <p>{count}</p>
}`,
                requiredSnippets: ['import { useState } from "react"', "const [count, setCount] = useState(0)"],
                simulatedOutput: ["0"],
                enemyName: "Counter Mote",
            },
            {
                slug: "badge-map",
                title: "Badge Map",
                titleCN: "徽章映射",
                description: "Render badges with map.",
                descriptionCN: "用 map 把徽章渲染出来。",
                initialCode: `// Knowledge: map in JSX
const badges = ["logic", "focus"]
export default function Badges() {
  return <ul>{badges.map((badge) => <li key={badge}>{badge}</li>)}</ul>
}`,
                requiredSnippets: ["badges.map", "<li key={badge}>{badge}</li>"],
                simulatedOutput: ["logic", "focus"],
                enemyName: "Map Orb",
            },
            {
                slug: "ready-panel",
                title: "Ready Panel",
                titleCN: "条件面板",
                description: "Show Ready only when the flag is true.",
                descriptionCN: "只有条件为真时才显示 Ready。",
                initialCode: `// Knowledge: conditional render
const ready = true
export default function Panel() {
  return <div>{ready ? "____" : "Wait"}</div>
}`,
                requiredSnippets: ['ready ? "Ready" : "Wait"'],
                simulatedOutput: ["Ready"],
                enemyName: "Branch Bolt",
            },
            {
                slug: "boss-score-click",
                title: "Boss Score Click",
                titleCN: "终极点击加分",
                description: "Increase the score when the button is clicked.",
                descriptionCN: "点击按钮时让分数加一。",
                initialCode: `// Knowledge: event handlers
import { useState } from "react"
export default function ScoreButton() {
  const [score, setScore] = useState(0)
  return <button onClick={() => setScore(score + ____)}>{score}</button>
}`,
                requiredSnippets: ["setScore(score + 1)", "{score}"],
                simulatedOutput: ["score: 1"],
                enemyName: "React Core",
            },
        ],
    },
    {
        chapterId: 601,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "✨",
        templates: [
            {
                slug: "goal-audience",
                title: "Goal and Audience",
                titleCN: "目标与对象",
                description: "Write a clear goal and audience for the AI.",
                descriptionCN: "为 AI 写清楚目标和对象。",
                knowledgeHintCN: "先讲清任务目标、服务对象和输出格式，AI 才更容易答准",
                initialCode: `# Knowledge: a good prompt starts with a clear goal
Goal: ____
Audience: grade 5 student
Need: one simple example
Output format: 3 bullet points`,
                requiredSnippets: ["Goal: explain loops", "Audience: grade 5 student", "Output format: 3 bullet points"],
                simulatedOutput: ["AI is ready to explain loops in 3 bullet points."],
                enemyName: "Prompt Shade",
            },
            {
                slug: "add-constraints",
                title: "Add Constraints",
                titleCN: "补充限制",
                description: "Tell the AI how short and clear the answer should be.",
                descriptionCN: "告诉 AI 回答要多短、多清楚。",
                knowledgeHintCN: "限制长度、语气和禁区，能缩小答案范围并减少跑偏",
                initialCode: `# Knowledge: constraints shape better answers
Task: help me review fractions
Length: ____ lines
Tone: simple and friendly
Avoid: hard words`,
                requiredSnippets: ["Task: help me review fractions", "Length: 3 lines", "Tone: simple and friendly"],
                simulatedOutput: ["AI will answer in 3 short friendly lines."],
                enemyName: "Rule Flicker",
            },
            {
                slug: "steps-then-example",
                title: "Steps Then Example",
                titleCN: "先步骤后例子",
                description: "Ask for steps first, then one example.",
                descriptionCN: "先要步骤，再要一个例子。",
                knowledgeHintCN: "先看步骤再看例子，能先搭思路再学写法",
                initialCode: `# Knowledge: request answer structure
Task: teach me how to write a function
First: give ____ steps
Then: show one short example
Audience: beginner`,
                requiredSnippets: ["First: give 3 steps", "Then: show one short example", "Audience: beginner"],
                simulatedOutput: ["AI plan: 3 steps, then one short example."],
                enemyName: "Guide Wisplet",
            },
            {
                slug: "compare-plans",
                title: "Compare Plans",
                titleCN: "比较方案",
                description: "Ask AI to compare two ideas side by side.",
                descriptionCN: "让 AI 并排比较两个方案。",
                knowledgeHintCN: "做选择题时要把方案并排比较，标准越清楚越容易判断",
                initialCode: `# Knowledge: comparison prompts
Task: compare two study plans
Plan A: read then quiz
Plan B: quiz then read
Output format: ____ table
Need: one better choice with reason`,
                requiredSnippets: ["Task: compare two study plans", "Output format: 2-column table", "Need: one better choice with reason"],
                simulatedOutput: ["AI will compare Plan A and Plan B in a 2-column table."],
                enemyName: "Mirror Prompt",
            },
            {
                slug: "boss-safe-coding",
                title: "Boss Safe Coding Prompt",
                titleCN: "终极安全编程提示",
                description: "Write a prompt that asks for code plus an explanation and checks.",
                descriptionCN: "写一个提示，让 AI 给代码、解释和检查点。",
                knowledgeHintCN: "写编程提示时，最好同时要代码、解释和自检清单",
                initialCode: `# Knowledge: complete coding prompts
Task: write a Python loop example
Need code: yes
Need explanation: yes
Need self-check list: ____
Audience: beginner`,
                requiredSnippets: ["Task: write a Python loop example", "Need explanation: yes", "Need self-check list: 3 items"],
                simulatedOutput: ["AI will return code, explanation, and a 3-item self-check list."],
                enemyName: "Prompt Captain",
            },
        ],
    },
    {
        chapterId: 602,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "🔍",
        templates: [
            {
                slug: "fact-check",
                title: "Fact Check",
                titleCN: "事实核查",
                description: "Add a fact-check request before trusting the answer.",
                descriptionCN: "在相信答案前，先加上事实核查要求。",
                knowledgeHintCN: "AI 给出事实结论时，要先核查年份、数据和名词",
                initialCode: `# Knowledge: verification first
Answer to check: Python was created in 2015
Please verify: ____
If wrong: fix the date`,
                requiredSnippets: ["Please verify: find the real year", "If wrong: fix the date"],
                simulatedOutput: ["Check result: the year should be corrected before use."],
                enemyName: "Fact Owl",
            },
            {
                slug: "ask-for-source",
                title: "Ask for Source",
                titleCN: "要求来源",
                description: "Request a source or reason for the answer.",
                descriptionCN: "要求 AI 给出来源或理由。",
                knowledgeHintCN: "没有理由、例子或依据的答案，可信度通常不高",
                initialCode: `# Knowledge: do not accept empty claims
Question: Why is a loop useful?
Ask AI to include: ____
Keep it short: yes`,
                requiredSnippets: ["Ask AI to include: one reason and one example"],
                simulatedOutput: ["AI will include one reason and one example."],
                enemyName: "Source Sprite",
            },
            {
                slug: "compare-with-notes",
                title: "Compare with Notes",
                titleCN: "对照笔记",
                description: "Tell AI to compare its answer with your own notes.",
                descriptionCN: "让 AI 把答案和你的笔记进行对照。",
                knowledgeHintCN: "把 AI 答案和课堂笔记对照，最容易找出偏差",
                initialCode: `# Knowledge: compare with trusted notes
My notes: loops repeat actions
AI answer: loops are only for math
Task: ____
Output: one mismatch`,
                requiredSnippets: ["Task: compare the AI answer with my notes", "Output: one mismatch"],
                simulatedOutput: ["Mismatch found: loops are not only for math."],
                enemyName: "Mismatch Bat",
            },
            {
                slug: "revise-wrong-answer",
                title: "Revise Wrong Answer",
                titleCN: "修正错误答案",
                description: "Ask AI to fix the wrong part only.",
                descriptionCN: "要求 AI 只修正错误的部分。",
                knowledgeHintCN: "修错要先指出错点，只改错的部分更容易学会",
                initialCode: `# Knowledge: targeted revision
Wrong answer: a list starts at index 1
Task: fix only the ____ part
Then: show the correct statement`,
                requiredSnippets: ["Task: fix only the wrong part", "Then: show the correct statement"],
                simulatedOutput: ["Corrected: a list starts at index 0."],
                enemyName: "Revision Lynx",
            },
            {
                slug: "boss-safety-review",
                title: "Boss Safety Review",
                titleCN: "终极安全复核",
                description: "Create a full review checklist for AI answers.",
                descriptionCN: "为 AI 答案创建完整复核清单。",
                knowledgeHintCN: "AI 结果进入作业前，最好走完一轮核查清单",
                initialCode: `# Knowledge: safe AI workflow
Checklist item 1: ____
Checklist item 2: compare with notes
Checklist item 3: ask for one example
Checklist item 4: fix mistakes before using`,
                requiredSnippets: ["Checklist item 1: check facts"],
                simulatedOutput: ["Checklist ready: check facts, compare with notes, ask for an example, fix mistakes."],
                enemyName: "Audit Raven",
            },
        ],
    },
    {
        chapterId: 701,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "📚",
        templates: [
            {
                slug: "ai-good-at",
                title: "What AI Is Good At",
                titleCN: "AI 擅长什么",
                description: "Describe one thing AI is good at and one thing humans still must do.",
                descriptionCN: "写出 AI 擅长的一件事和人类仍要做的一件事。",
                knowledgeHintCN: "AI 擅长模式匹配和整理信息，但不等于真正理解问题",
                initialCode: `# Knowledge: know the strengths and limits
AI is good at: ____
Humans still need to: verify the result`,
                requiredSnippets: ["AI is good at: finding patterns", "Humans still need to: verify the result"],
                simulatedOutput: ["Good: AI can find patterns, but humans still verify the result."],
                enemyName: "Insight Owl",
            },
            {
                slug: "input-output",
                title: "Input and Output",
                titleCN: "输入与输出",
                description: "Show that AI takes input and returns output.",
                descriptionCN: "说明 AI 是如何接收输入并给出输出的。",
                knowledgeHintCN: "AI 的基础逻辑可以先理解成输入经过处理后得到输出",
                initialCode: `# Knowledge: AI works on input and output
Input: student question about loops
Output: ____`,
                requiredSnippets: ["Output: a short explanation with one example"],
                simulatedOutput: ["AI flow: input question -> short explanation with one example."],
                enemyName: "Signal Finch",
            },
            {
                slug: "hallucination-alert",
                title: "Hallucination Alert",
                titleCN: "幻觉提醒",
                description: "Write a reminder that AI can still be wrong.",
                descriptionCN: "写出提醒：AI 也可能出错。",
                knowledgeHintCN: "AI 可能生成看似合理却错误的内容，这就叫幻觉风险",
                initialCode: `# Knowledge: AI can make mistakes
Reminder: AI may be ____
Action: check another source`,
                requiredSnippets: ["Reminder: AI may be wrong", "Action: check another source"],
                simulatedOutput: ["Reminder saved: AI may be wrong, so check another source."],
                enemyName: "Fog Moth",
            },
            {
                slug: "privacy-guard",
                title: "Privacy Guard",
                titleCN: "隐私守护",
                description: "Write a rule about not sharing private information.",
                descriptionCN: "写出一条不泄露隐私信息的规则。",
                knowledgeHintCN: "密码、住址、电话等隐私信息，不要直接喂给 AI 工具",
                initialCode: `# Knowledge: keep private info safe
Rule: do not share my ____ with AI tools`,
                requiredSnippets: ["Rule: do not share my password with AI tools"],
                simulatedOutput: ["Safety rule saved: do not share your password with AI tools."],
                enemyName: "Lock Sparrow",
            },
            {
                slug: "boss-responsible-use",
                title: "Boss Responsible Use",
                titleCN: "终极负责使用",
                description: "Write a short pledge for using AI well.",
                descriptionCN: "写一段关于正确使用 AI 的小约定。",
                knowledgeHintCN: "会提问、会核查、会独立思考，才算真正会用 AI",
                initialCode: `# Knowledge: responsible AI use
I will ask clearly, verify answers, and ____ before I use them.`,
                requiredSnippets: ["I will ask clearly, verify answers, and think for myself before I use them."],
                simulatedOutput: ["Pledge ready: ask clearly, verify answers, and think for yourself."],
                enemyName: "Wisdom Keeper",
            },
        ],
    },
    {
        chapterId: 702,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "🧠",
        templates: [
            {
                slug: "study-plan",
                title: "Study Plan Prompt",
                titleCN: "学习计划提示",
                description: "Ask AI for a short study plan.",
                descriptionCN: "让 AI 生成一个简短学习计划。",
                knowledgeHintCN: "AI 适合帮你拆学习任务，但练习和理解还得自己完成",
                initialCode: `# Knowledge: use AI for planning
Task: make a 20-minute study plan for ____
Need: 3 steps
Tone: simple`,
                requiredSnippets: ["Task: make a 20-minute study plan for fractions", "Need: 3 steps"],
                simulatedOutput: ["AI will create a 20-minute fractions plan in 3 steps."],
                enemyName: "Plan Sprite",
            },
            {
                slug: "reading-summary",
                title: "Reading Summary",
                titleCN: "阅读总结",
                description: "Ask AI to summarize a reading in short bullets.",
                descriptionCN: "让 AI 用简短要点总结一篇阅读。",
                knowledgeHintCN: "好的总结要保留主线和关键细节，不能只剩空话",
                initialCode: `# Knowledge: summarise with structure
Task: summarise my reading notes
Length: ____ bullet points
Need: key idea + one detail`,
                requiredSnippets: ["Length: 3 bullet points", "Need: key idea + one detail"],
                simulatedOutput: ["AI summary ready in 3 bullet points."],
                enemyName: "Summary Finch",
            },
            {
                slug: "mistake-review",
                title: "Mistake Review",
                titleCN: "错题复盘",
                description: "Ask AI to help review one mistake.",
                descriptionCN: "让 AI 帮你复盘一道错题。",
                knowledgeHintCN: "复盘错题比直接看答案更能提升真正的理解",
                initialCode: `# Knowledge: review mistakes, not just answers
Question I missed: 6 x 7
Ask AI to explain: ____
Then: ask me one practice question`,
                requiredSnippets: ["Ask AI to explain: why my answer was wrong", "Then: ask me one practice question"],
                simulatedOutput: ["AI will explain the mistake and ask one follow-up question."],
                enemyName: "Review Pup",
            },
            {
                slug: "flashcard-maker",
                title: "Flashcard Maker",
                titleCN: "闪卡生成器",
                description: "Ask AI to turn notes into flashcards.",
                descriptionCN: "让 AI 把笔记变成闪卡。",
                knowledgeHintCN: "把笔记改成问答闪卡，更适合反复记忆和抽查",
                initialCode: `# Knowledge: convert notes into flashcards
Task: turn my notes about loops into ____ flashcards
Format: question / answer`,
                requiredSnippets: ["Task: turn my notes about loops into 4 flashcards", "Format: question / answer"],
                simulatedOutput: ["AI will create 4 loop flashcards in question/answer format."],
                enemyName: "Card Otter",
            },
            {
                slug: "boss-self-check",
                title: "Boss Self Check",
                titleCN: "终极自检",
                description: "Finish a full prompt for plan, answer, and self-check.",
                descriptionCN: "完成一条包含计划、答案和自检的完整提示。",
                knowledgeHintCN: "用 AI 学习也要留下自测环节，不然很难确认自己是否会了",
                initialCode: `# Knowledge: study with AI but keep thinking
Task: help me learn conditionals
Need plan: yes
Need answer: yes
Need self-check: ____
Audience: beginner`,
                requiredSnippets: ["Need self-check: 3 questions", "Audience: beginner"],
                simulatedOutput: ["AI will give a plan, an answer, and 3 self-check questions."],
                enemyName: "Mind Mentor",
            },
        ],
    },
    {
        chapterId: 801,
        runtime: "pattern",
        editorLanguage: "html",
        enemyAvatar: "🧱",
        templates: [
            {
                slug: "hero-header",
                title: "Hero Header",
                titleCN: "页头标题",
                description: "Build a clean page header with a title.",
                descriptionCN: "用 header 包住页面标题。",
                initialCode: `<____>\n  <h1>Code Camp</h1>\n</____>`,
                requiredSnippets: ["<header>", "<h1>Code Camp</h1>", "</header>"],
                simulatedOutput: ["Header ready: Code Camp"],
                enemyName: "Header Sprite",
            },
            {
                slug: "quest-list",
                title: "Quest List",
                titleCN: "学习清单",
                description: "Use a list to show three learning goals.",
                descriptionCN: "用列表列出三项学习目标。",
                initialCode: `<ul>\n  <____>HTML</____>\n  <li>CSS</li>\n  <li>JavaScript</li>\n</ul>`,
                requiredSnippets: ["<li>HTML</li>", "<li>CSS</li>", "<li>JavaScript</li>"],
                simulatedOutput: ["List ready: HTML / CSS / JavaScript"],
                enemyName: "List Slime",
            },
            {
                slug: "profile-card",
                title: "Profile Card",
                titleCN: "角色卡片",
                description: "Wrap a name and line of intro inside a section.",
                descriptionCN: "用 section 包住姓名和简介。",
                initialCode: `<____ class="card">\n  <h2>Luna</h2>\n  <p>Level 1 learner</p>\n</____>`,
                requiredSnippets: ['<section class="card">', "<h2>Luna</h2>", "<p>Level 1 learner</p>", "</section>"],
                simulatedOutput: ["Profile card complete."],
                enemyName: "Card Bug",
            },
            {
                slug: "nav-links",
                title: "Nav Links",
                titleCN: "导航链接",
                description: "Create a nav with two links.",
                descriptionCN: "补全一个包含两个链接的导航栏。",
                initialCode: `<nav>\n  <a href="#home">Home</a>\n  <____ href="#lessons">Lessons</____>\n</nav>`,
                requiredSnippets: ['<a href="#home">Home</a>', '<a href="#lessons">Lessons</a>'],
                simulatedOutput: ["Navigation linked: Home / Lessons"],
                enemyName: "Route Mite",
            },
            {
                slug: "boss-page-frame",
                title: "Boss Page Frame",
                titleCN: "页面骨架",
                description: "Complete a page with header, main, and footer.",
                descriptionCN: "补全由 header、main、footer 组成的页面骨架。",
                initialCode: `<header>Start</header>\n<____>\n  <article>Mission</article>\n</____>\n<footer>Finish</footer>`,
                requiredSnippets: ["<main>", "<article>Mission</article>", "</main>"],
                simulatedOutput: ["Semantic page frame complete."],
                enemyName: "Layout Guardian",
            },
        ],
    },
    {
        chapterId: 802,
        runtime: "pattern",
        editorLanguage: "css",
        enemyAvatar: "🎨",
        templates: [
            {
                slug: "title-color",
                title: "Title Color",
                titleCN: "标题颜色",
                description: "Give the title a bright blue color.",
                descriptionCN: "给标题加上清晰的蓝色。",
                initialCode: `.title {\n  color: ____;\n}`,
                requiredSnippets: ["color: #2563eb;"],
                simulatedOutput: ["Title style applied: blue"],
                enemyName: "Color Wisp",
            },
            {
                slug: "card-padding",
                title: "Card Padding",
                titleCN: "卡片留白",
                description: "Add comfortable inside spacing to the card.",
                descriptionCN: "给卡片增加舒适的内边距。",
                initialCode: `.card {\n  padding: ____;\n}`,
                requiredSnippets: ["padding: 16px;"],
                simulatedOutput: ["Card spacing improved."],
                enemyName: "Space Beetle",
            },
            {
                slug: "row-layout",
                title: "Row Layout",
                titleCN: "横向布局",
                description: "Place two blocks side by side with flex.",
                descriptionCN: "用 flex 让两个区域并排显示。",
                initialCode: `.toolbar {\n  display: ____;\n  gap: 12px;\n}`,
                requiredSnippets: ["display: flex;", "gap: 12px;"],
                simulatedOutput: ["Toolbar layout: flex row"],
                enemyName: "Flex Crab",
            },
            {
                slug: "hover-button",
                title: "Hover Button",
                titleCN: "悬停按钮",
                description: "Make the button grow slightly on hover.",
                descriptionCN: "让按钮悬停时轻微放大。",
                initialCode: `.start-btn:hover {\n  transform: ____;\n}`,
                requiredSnippets: ["transform: scale(1.05);"],
                simulatedOutput: ["Hover motion ready."],
                enemyName: "Motion Moth",
            },
            {
                slug: "boss-grid-panel",
                title: "Boss Grid Panel",
                titleCN: "网格面板",
                description: "Use grid to place four panels into two columns.",
                descriptionCN: "用 grid 把四个面板排成两列。",
                initialCode: `.dashboard {\n  display: grid;\n  grid-template-columns: ____;\n}`,
                requiredSnippets: ["display: grid;", "grid-template-columns: repeat(2, 1fr);"],
                simulatedOutput: ["Dashboard grid ready."],
                enemyName: "Grid Titan",
            },
        ],
    },
    {
        chapterId: 803,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "🎮",
        templates: [
            {
                slug: "click-signal",
                title: "Click Signal",
                titleCN: "点击监听",
                description: "Listen for a button click and show a message.",
                descriptionCN: "监听按钮点击并输出提示。",
                initialCode: `const button = document.querySelector(".start")\nbutton.____("click", () => {\n  console.log("Ready")\n})`,
                requiredSnippets: ['button.addEventListener("click"', 'console.log("Ready")'],
                simulatedOutput: ["Ready"],
                enemyName: "Click Spark",
            },
            {
                slug: "score-start",
                title: "Score Start",
                titleCN: "分数起步",
                description: "Create a score variable starting at zero.",
                descriptionCN: "创建一个从 0 开始的分数变量。",
                initialCode: `____ score = 0\nconsole.log(score)`,
                requiredSnippets: ["let score = 0", "console.log(score)"],
                simulatedOutput: ["0"],
                enemyName: "Score Seed",
            },
            {
                slug: "text-update",
                title: "Text Update",
                titleCN: "文本更新",
                description: "Change the label text to Ready.",
                descriptionCN: "把标签内容改成 Ready。",
                initialCode: `const label = document.querySelector(".status")\nlabel.textContent = ____`,
                requiredSnippets: ['label.textContent = "Ready"'],
                simulatedOutput: ["Ready"],
                enemyName: "Label Blink",
            },
            {
                slug: "toggle-panel",
                title: "Toggle Panel",
                titleCN: "切换面板",
                description: "Toggle the open class on a panel.",
                descriptionCN: "给面板切换 open 类名。",
                initialCode: `const panel = document.querySelector(".panel")\npanel.classList.____("open")`,
                requiredSnippets: ['panel.classList.toggle("open")'],
                simulatedOutput: ["panel: open"],
                enemyName: "Toggle Bat",
            },
            {
                slug: "boss-score-button",
                title: "Boss Score Button",
                titleCN: "分数按钮",
                description: "Increase the score by 1 when the button is clicked.",
                descriptionCN: "点击按钮时让分数加 1。",
                initialCode: `let score = 0\nbutton.addEventListener("click", () => {\n  score ____\n  console.log(score)\n})`,
                requiredSnippets: ["score += 1", "console.log(score)"],
                simulatedOutput: ["1"],
                enemyName: "Event Core",
            },
        ],
    },
    {
        chapterId: 901,
        runtime: "pattern",
        editorLanguage: "sql",
        enemyAvatar: "🗃️",
        templates: [
            {
                slug: "student-table",
                title: "Student Table",
                titleCN: "学生表",
                description: "Create a students table with id, name, and score.",
                descriptionCN: "创建一个包含 id、name、score 的 students 表。",
                initialCode: `CREATE TABLE students (\n  id INT ____ KEY,\n  name VARCHAR(50),\n  score INT\n);`,
                requiredSnippets: ["CREATE TABLE students", "id INT PRIMARY KEY", "name VARCHAR(50)", "score INT"],
                simulatedOutput: ["Table students created."],
                enemyName: "Schema Seed",
            },
            {
                slug: "age-not-null",
                title: "Age Not Null",
                titleCN: "年龄必填",
                description: "Add an age column that cannot be empty.",
                descriptionCN: "给 students 表补上不能为空的 age 字段。",
                initialCode: `ALTER TABLE students\nADD age INT ____;`,
                requiredSnippets: ["ADD age INT NOT NULL"],
                simulatedOutput: ["Column age added with NOT NULL."],
                enemyName: "Null Ghost",
            },
            {
                slug: "insert-luna",
                title: "Insert Luna",
                titleCN: "插入 Luna",
                description: "Insert one student record into the table.",
                descriptionCN: "向 students 表插入一条 Luna 的记录。",
                initialCode: `INSERT INTO students (id, name, score, age)\nVALUES (1, 'Luna', 88, ____);`,
                requiredSnippets: ["INSERT INTO students", "VALUES (1, 'Luna', 88, 12)"],
                simulatedOutput: ["1 row inserted."],
                enemyName: "Row Sprite",
            },
            {
                slug: "update-score",
                title: "Update Score",
                titleCN: "更新分数",
                description: "Set Luna's score to 95.",
                descriptionCN: "把 Luna 的 score 更新成 95。",
                initialCode: `UPDATE students\nSET score = ____\nWHERE id = 1;`,
                requiredSnippets: ["SET score = 95", "WHERE id = 1"],
                simulatedOutput: ["Score updated to 95."],
                enemyName: "Patch Worm",
            },
            {
                slug: "boss-course-table",
                title: "Boss Course Table",
                titleCN: "课程表",
                description: "Create a classes table with class id and title.",
                descriptionCN: "创建一个包含课程编号和标题的 classes 表。",
                initialCode: `CREATE TABLE classes (\n  id INT PRIMARY KEY,\n  title VARCHAR(60) ____\n);`,
                requiredSnippets: ["CREATE TABLE classes", "title VARCHAR(60) NOT NULL"],
                simulatedOutput: ["Table classes created."],
                enemyName: "Schema Guard",
            },
        ],
    },
    {
        chapterId: 902,
        runtime: "pattern",
        editorLanguage: "sql",
        enemyAvatar: "🔎",
        templates: [
            {
                slug: "select-all",
                title: "Select All",
                titleCN: "查询全部",
                description: "Select every column from students.",
                descriptionCN: "查询 students 表里的全部字段。",
                initialCode: `SELECT ____ FROM students;`,
                requiredSnippets: ["SELECT * FROM students;"],
                simulatedOutput: ["Returned all student columns."],
                enemyName: "Query Ant",
            },
            {
                slug: "filter-score",
                title: "Filter Score",
                titleCN: "筛选高分",
                description: "Find students whose score is at least 90.",
                descriptionCN: "筛选出 score 大于等于 90 的学生。",
                initialCode: `SELECT name FROM students\nWHERE score >= ____;`,
                requiredSnippets: ["WHERE score >= 90"],
                simulatedOutput: ["Filtered students with score 90 or above."],
                enemyName: "Filter Finch",
            },
            {
                slug: "sort-score",
                title: "Sort Score",
                titleCN: "分数排序",
                description: "Order the table from high score to low score.",
                descriptionCN: "把分数从高到低排序。",
                initialCode: `SELECT name, score FROM students\nORDER BY score ____;`,
                requiredSnippets: ["ORDER BY score DESC"],
                simulatedOutput: ["Sorted by score descending."],
                enemyName: "Sort Fox",
            },
            {
                slug: "count-students",
                title: "Count Students",
                titleCN: "统计人数",
                description: "Count how many student rows there are.",
                descriptionCN: "统计 students 表里共有多少条记录。",
                initialCode: `SELECT ____ FROM students;`,
                requiredSnippets: ["SELECT COUNT(*) FROM students;"],
                simulatedOutput: ["Counted all student rows."],
                enemyName: "Count Owl",
            },
            {
                slug: "boss-average-score",
                title: "Boss Average Score",
                titleCN: "平均分 Boss",
                description: "Calculate the average score of all students.",
                descriptionCN: "计算 students 表的平均分。",
                initialCode: `SELECT ____ FROM students;`,
                requiredSnippets: ["SELECT AVG(score) FROM students;"],
                simulatedOutput: ["Calculated the average score."],
                enemyName: "Average Hydra",
            },
        ],
    },
    {
        chapterId: 1001,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "🛡️",
        templates: [
            {
                slug: "strong-password",
                title: "Strong Password Plan",
                titleCN: "强密码方案",
                description: "Write a checklist for a strong password.",
                descriptionCN: "写出一份强密码清单。",
                initialCode: `Checklist:\n- length: ____\n- include numbers: yes\n- include symbols: yes`,
                requiredSnippets: ["length: 12+", "include numbers: yes", "include symbols: yes"],
                simulatedOutput: ["Strong password checklist ready."],
                enemyName: "Lock Seed",
            },
            {
                slug: "phishing-signs",
                title: "Phishing Signs",
                titleCN: "识别钓鱼信息",
                description: "List two warning signs of a phishing message.",
                descriptionCN: "列出两条钓鱼信息的危险信号。",
                initialCode: `Warning signs:\n1. ____\n2. strange link`,
                requiredSnippets: ["1. asks for password", "2. strange link"],
                simulatedOutput: ["Phishing warning signs listed."],
                enemyName: "Mail Trickster",
            },
            {
                slug: "least-privilege",
                title: "Least Privilege",
                titleCN: "最小权限",
                description: "Complete the rule of least privilege.",
                descriptionCN: "补全最小权限原则。",
                initialCode: `Rule: give each user only the ____ they need.`,
                requiredSnippets: ["only the access they need"],
                simulatedOutput: ["Least privilege principle complete."],
                enemyName: "Permission Imp",
            },
            {
                slug: "backup-rule",
                title: "Backup Rule",
                titleCN: "3-2-1 备份",
                description: "Fill in the 3-2-1 backup rule.",
                descriptionCN: "补全 3-2-1 备份规则。",
                initialCode: `Backup plan: 3 copies, 2 media types, 1 ____ copy.`,
                requiredSnippets: ["1 off-site copy"],
                simulatedOutput: ["3-2-1 backup rule remembered."],
                enemyName: "Backup Mole",
            },
            {
                slug: "boss-incident-note",
                title: "Boss Incident Note",
                titleCN: "事件处置卡",
                description: "Write a simple incident response checklist.",
                descriptionCN: "写出一份简单的安全事件处理清单。",
                initialCode: `Incident checklist:\n1. report to teacher/admin\n2. change password\n3. ____`,
                requiredSnippets: ["3. save evidence"],
                simulatedOutput: ["Incident checklist ready."],
                enemyName: "Safety Core",
            },
        ],
    },
    {
        chapterId: 1002,
        runtime: "pattern",
        editorLanguage: "bash",
        enemyAvatar: "🧪",
        templates: [
            {
                slug: "whoami-check",
                title: "Who Am I",
                titleCN: "查看当前用户",
                description: "Use a command to check the current user in the lab.",
                descriptionCN: "用命令查看当前实验用户。",
                initialCode: `____`,
                requiredSnippets: ["whoami"],
                simulatedOutput: ["Current user displayed."],
                enemyName: "Shell Scout",
            },
            {
                slug: "ip-check",
                title: "Check IP",
                titleCN: "查看网卡信息",
                description: "Display network interface information in Kali.",
                descriptionCN: "查看 Kali 里的网络接口信息。",
                initialCode: `____`,
                requiredSnippets: ["ip a"],
                simulatedOutput: ["Network interfaces displayed."],
                enemyName: "Interface Bat",
            },
            {
                slug: "lab-folder",
                title: "Lab Folder",
                titleCN: "创建实验记录夹",
                description: "Create a notes folder for your lab records.",
                descriptionCN: "创建一个保存实验记录的文件夹。",
                initialCode: `mkdir ____`,
                requiredSnippets: ["mkdir kali-notes"],
                simulatedOutput: ["Folder kali-notes created."],
                enemyName: "Folder Beetle",
            },
            {
                slug: "print-path",
                title: "Print Path",
                titleCN: "查看当前路径",
                description: "Show the current working directory.",
                descriptionCN: "显示当前所在目录。",
                initialCode: `____`,
                requiredSnippets: ["pwd"],
                simulatedOutput: ["Current working directory displayed."],
                enemyName: "Path Ghost",
            },
            {
                slug: "boss-tool-help",
                title: "Boss Tool Help",
                titleCN: "工具帮助",
                description: "Read the nmap manual before using the tool in a legal lab.",
                descriptionCN: "在合法实验室里使用工具前，先查看 nmap 的帮助文档。",
                initialCode: `____`,
                requiredSnippets: ["man nmap"],
                simulatedOutput: ["nmap manual opened."],
                enemyName: "Manual Keeper",
            },
        ],
    },
    {
        chapterId: 102,
        runtime: "pattern",
        editorLanguage: "cpp",
        enemyAvatar: "C++",
        templates: [
            {
                slug: "vector-size",
                title: "Vector Size",
                titleCN: "向量长度",
                description: "Read how many elements are in the vector.",
                descriptionCN: "读取 vector 里一共有多少个元素。",
                initialCode: `// Knowledge: std::vector size
#include <vector>
#include <iostream>
int main() {
  std::vector<int> nums = {1, 2, 3};
  std::cout << nums.____();
}`,
                requiredSnippets: ["nums.size()"],
                simulatedOutput: ["3"],
                enemyName: "Vector Scout",
            },
            {
                slug: "push-score",
                title: "Push Score",
                titleCN: "追加分数",
                description: "Add one more score into the vector.",
                descriptionCN: "向 vector 末尾再追加一个分数。",
                initialCode: `// Knowledge: push_back
std::vector<int> scores = {88, 91};
scores.____(95);`,
                requiredSnippets: ["scores.push_back(95)"],
                simulatedOutput: ["scores: 88, 91, 95"],
                enemyName: "Score Hopper",
            },
            {
                slug: "string-length",
                title: "String Length",
                titleCN: "字符串长度",
                description: "Read the length of the word code.",
                descriptionCN: "读取单词 code 的长度。",
                initialCode: `// Knowledge: std::string size
std::string word = "code";
std::cout << word.____();`,
                requiredSnippets: ["word.size()"],
                simulatedOutput: ["4"],
                enemyName: "String Lynx",
            },
            {
                slug: "sort-list",
                title: "Sort List",
                titleCN: "列表排序",
                description: "Sort the numbers from small to large.",
                descriptionCN: "把数字从小到大排序。",
                initialCode: `// Knowledge: std::sort
#include <algorithm>
std::vector<int> nums = {3, 1, 2};
std::____(nums.begin(), nums.end());`,
                requiredSnippets: ["std::sort(nums.begin(), nums.end())"],
                simulatedOutput: ["1 2 3"],
                enemyName: "Sort Beetle",
            },
            {
                slug: "boss-max-score",
                title: "Boss Max Score",
                titleCN: "最强分数",
                description: "Choose the larger score with std::max.",
                descriptionCN: "用 std::max 选出更大的分数。",
                initialCode: `// Knowledge: std::max
#include <algorithm>
int a = 95;
int b = 98;
std::cout << std::____(a, b);`,
                requiredSnippets: ["std::max(a, b)"],
                simulatedOutput: ["98"],
                enemyName: "STL Titan",
            },
        ],
    },
    {
        chapterId: 202,
        runtime: "pattern",
        editorLanguage: "java",
        enemyAvatar: "Java",
        templates: [
            {
                slug: "student-constructor",
                title: "Student Constructor",
                titleCN: "学生构造器",
                description: "Complete the constructor assignment.",
                descriptionCN: "完成构造函数里的赋值。",
                initialCode: `// Knowledge: constructor assignment
class Student {
  String name;
  Student(String name) {
    this.name = ____;
  }
}`,
                requiredSnippets: ["this.name = name;"],
                simulatedOutput: ["Student name saved."],
                enemyName: "Class Mite",
            },
            {
                slug: "arraylist-add",
                title: "ArrayList Add",
                titleCN: "列表新增",
                description: "Add Luna into the student list.",
                descriptionCN: "把 Luna 加入学生列表。",
                initialCode: `// Knowledge: ArrayList add
import java.util.ArrayList;
ArrayList<String> students = new ArrayList<>();
students.____("Luna");`,
                requiredSnippets: ['students.add("Luna")'],
                simulatedOutput: ["[Luna]"],
                enemyName: "List Sprite",
            },
            {
                slug: "getter-return",
                title: "Getter Return",
                titleCN: "返回字段",
                description: "Return the score field from the getter.",
                descriptionCN: "在 getter 中返回 score 字段。",
                initialCode: `// Knowledge: return a field
class ScoreCard {
  int score = 95;
  int getScore() {
    return ____;
  }
}`,
                requiredSnippets: ["return score;"],
                simulatedOutput: ["95"],
                enemyName: "Getter Bat",
            },
            {
                slug: "enhanced-loop",
                title: "Enhanced Loop",
                titleCN: "增强 for 循环",
                description: "Loop through each name in the class list.",
                descriptionCN: "遍历班级列表中的每个名字。",
                initialCode: `// Knowledge: enhanced for loop
for (String name : ____) {
  System.out.println(name);
}`,
                requiredSnippets: ["for (String name : students)"],
                simulatedOutput: ["Luna", "Kai"],
                enemyName: "Loop Drake",
            },
            {
                slug: "boss-student-object",
                title: "Boss Student Object",
                titleCN: "学生对象 Boss",
                description: "Create one Student object with name and score.",
                descriptionCN: "创建一个带姓名和分数的 Student 对象。",
                initialCode: `// Knowledge: create an object
Student hero = new Student("Luna", ____);
System.out.println(hero.score);`,
                requiredSnippets: ['new Student("Luna", 98)'],
                simulatedOutput: ["98"],
                enemyName: "Object Titan",
            },
        ],
    },
    {
        chapterId: 302,
        runtime: "pattern",
        editorLanguage: "go",
        enemyAvatar: "Go",
        templates: [
            {
                slug: "make-channel",
                title: "Make Channel",
                titleCN: "创建通道",
                description: "Create a string channel for jobs.",
                descriptionCN: "为任务创建一个字符串通道。",
                initialCode: `// Knowledge: make channel
jobs := make(____ string)`,
                requiredSnippets: ["make(chan string)"],
                simulatedOutput: ["channel ready"],
                enemyName: "Channel Imp",
            },
            {
                slug: "send-job",
                title: "Send Job",
                titleCN: "发送任务",
                description: "Send the task into the jobs channel.",
                descriptionCN: "把任务发送到 jobs 通道里。",
                initialCode: `// Knowledge: send into channel
jobs := make(chan string)
jobs ____ "task-1"`,
                requiredSnippets: ['jobs <- "task-1"'],
                simulatedOutput: ["task sent"],
                enemyName: "Dispatch Bug",
            },
            {
                slug: "receive-job",
                title: "Receive Job",
                titleCN: "接收任务",
                description: "Read one value from the jobs channel.",
                descriptionCN: "从 jobs 通道读取一个值。",
                initialCode: `// Knowledge: receive from channel
job := ____jobs
fmt.Println(job)`,
                requiredSnippets: ["job := <-jobs"],
                simulatedOutput: ["task-1"],
                enemyName: "Receiver Fox",
            },
            {
                slug: "go-worker",
                title: "Go Worker",
                titleCN: "协程工人",
                description: "Start the worker as a goroutine.",
                descriptionCN: "用 goroutine 启动 worker。",
                initialCode: `// Knowledge: goroutine
func worker() {}
____ worker()`,
                requiredSnippets: ["go worker()"],
                simulatedOutput: ["worker started"],
                enemyName: "Worker Hawk",
            },
            {
                slug: "boss-waitgroup",
                title: "Boss WaitGroup",
                titleCN: "等待组 Boss",
                description: "Add one task into the WaitGroup before running.",
                descriptionCN: "在运行前向 WaitGroup 增加一个任务。",
                initialCode: `// Knowledge: WaitGroup add
var wg sync.WaitGroup
wg.____(1)`,
                requiredSnippets: ["wg.Add(1)"],
                simulatedOutput: ["wait group: 1"],
                enemyName: "Dock Captain",
            },
        ],
    },
    {
        chapterId: 402,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "Vue",
        templates: [
            {
                slug: "define-props",
                title: "Define Props",
                titleCN: "定义 Props",
                description: "Define a title prop in script setup.",
                descriptionCN: "在 script setup 里定义 title 这个 prop。",
                initialCode: `<!-- Knowledge: defineProps -->
<script setup>
const props = ____({
  title: String,
})
</script>`,
                requiredSnippets: ["defineProps({", "title: String"],
                simulatedOutput: ["title prop ready"],
                enemyName: "Prop Finch",
            },
            {
                slug: "show-prop",
                title: "Show Prop",
                titleCN: "显示 Props",
                description: "Render the title prop in the template.",
                descriptionCN: "在模板中渲染 title 这个 prop。",
                initialCode: `<!-- Knowledge: props in template -->
<template>
  <h2>{{ props.____ }}</h2>
</template>`,
                requiredSnippets: ["{{ props.title }}"],
                simulatedOutput: ["Quest Board"],
                enemyName: "Template Glow",
            },
            {
                slug: "emit-click",
                title: "Emit Click",
                titleCN: "触发事件",
                description: "Emit a start event from the button.",
                descriptionCN: "点击按钮时发出 start 事件。",
                initialCode: `<!-- Knowledge: defineEmits -->
<script setup>
const emit = defineEmits(["start"])
</script>

<template>
  <button @click="emit('____')">Start</button>
</template>`,
                requiredSnippets: [`emit('start')`],
                simulatedOutput: ["start event emitted"],
                enemyName: "Signal Pika",
            },
            {
                slug: "input-model",
                title: "Input Model",
                titleCN: "输入绑定",
                description: "Bind the name input with v-model.",
                descriptionCN: "用 v-model 绑定 name 输入框。",
                initialCode: `<!-- Knowledge: v-model -->
<template>
  <input v-____="name" />
</template>`,
                requiredSnippets: ['v-model="name"'],
                simulatedOutput: ["input bound to name"],
                enemyName: "Model Sprite",
            },
            {
                slug: "boss-computed-label",
                title: "Boss Computed Label",
                titleCN: "计算标签 Boss",
                description: "Return a computed label based on count.",
                descriptionCN: "根据 count 返回一个计算属性标签。",
                initialCode: `<!-- Knowledge: computed -->
<script setup>
import { computed, ref } from "vue"
const count = ref(3)
const label = computed(() => "Score: " + count.____)
</script>`,
                requiredSnippets: ["count.value"],
                simulatedOutput: ["Score: 3"],
                enemyName: "Vue Titan",
            },
        ],
    },
    {
        chapterId: 502,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "React",
        templates: [
            {
                slug: "input-state",
                title: "Input State",
                titleCN: "输入状态",
                description: "Create state for the player name.",
                descriptionCN: "为玩家名字创建一个状态值。",
                initialCode: `// Knowledge: useState for input
import { useState } from "react"

export default function NameBox() {
  const [name, setName] = useState(____)
  return <p>{name}</p>
}`,
                requiredSnippets: ['useState("Luna")'],
                simulatedOutput: ["Luna"],
                enemyName: "Hook Seed",
            },
            {
                slug: "input-change",
                title: "Input Change",
                titleCN: "输入更新",
                description: "Update the value from the input event.",
                descriptionCN: "从输入事件中更新当前值。",
                initialCode: `// Knowledge: onChange event
<input value={name} onChange={(event) => setName(event.target.____)} />`,
                requiredSnippets: ["event.target.value"],
                simulatedOutput: ["name updated"],
                enemyName: "Input Bat",
            },
            {
                slug: "derived-total",
                title: "Derived Total",
                titleCN: "派生总分",
                description: "Show the total score from two values.",
                descriptionCN: "用两个值计算并显示总分。",
                initialCode: `// Knowledge: derive UI from state
const total = attack + ____
return <p>{total}</p>`,
                requiredSnippets: ["attack + defense"],
                simulatedOutput: ["12"],
                enemyName: "Total Mite",
            },
            {
                slug: "list-filter",
                title: "List Filter",
                titleCN: "列表筛选",
                description: "Keep only the active quests.",
                descriptionCN: "只保留激活中的任务。",
                initialCode: `// Knowledge: filter before render
const active = quests.filter((quest) => quest.____)
return <ul>{active.map((quest) => <li key={quest.id}>{quest.name}</li>)}</ul>`,
                requiredSnippets: ["quest.active"],
                simulatedOutput: ["Quest A", "Quest C"],
                enemyName: "Filter Shade",
            },
            {
                slug: "boss-toggle-view",
                title: "Boss Toggle View",
                titleCN: "视图切换 Boss",
                description: "Switch the panel between open and closed.",
                descriptionCN: "在打开和关闭状态之间切换面板。",
                initialCode: `// Knowledge: boolean state toggle
const [open, setOpen] = useState(false)
return <button onClick={() => setOpen(!____)}>{open ? "Open" : "Closed"}</button>`,
                requiredSnippets: ["setOpen(!open)"],
                simulatedOutput: ["Open"],
                enemyName: "Hooks Titan",
            },
        ],
    },
    {
        chapterId: 603,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "AI",
        templates: [
            {
                slug: "split-task",
                title: "Split the Task",
                titleCN: "拆分任务",
                description: "Break the coding mission into three short steps.",
                descriptionCN: "把编程任务拆成三个短步骤。",
                knowledgeHintCN: "大任务先拆成可执行的小步骤，AI 才更容易配合",
                initialCode: `# Knowledge: split big work into steps
Task: build a quiz page
Step 1: ____
Step 2: add question card
Step 3: test the submit button`,
                requiredSnippets: ["Step 1: plan layout", "Step 2: add question card", "Step 3: test the submit button"],
                simulatedOutput: ["Task split into 3 clear steps."],
                enemyName: "Planner Shade",
            },
            {
                slug: "define-output",
                title: "Define Output",
                titleCN: "定义交付物",
                description: "Tell AI exactly what the answer should include.",
                descriptionCN: "明确告诉 AI 最终答案必须包含什么。",
                knowledgeHintCN: "先写清交付物，AI 才知道要答到什么程度",
                initialCode: `# Knowledge: define deliverables
Goal: explain SQL joins
Answer must include:
1. meaning
2. ____
3. one student example`,
                requiredSnippets: ["2. syntax"],
                simulatedOutput: ["Deliverables locked: meaning, syntax, example."],
                enemyName: "Format Sprite",
            },
            {
                slug: "checklist-before-send",
                title: "Checklist Before Send",
                titleCN: "提交前检查",
                description: "Add one check item for correctness before using AI output.",
                descriptionCN: "在使用 AI 结果前加入一条正确性检查。",
                knowledgeHintCN: "交付前一定要有核查步骤，不能直接照搬 AI 结果",
                initialCode: `# Knowledge: verify before trust
Checklist:
- compare with class notes
- ____`,
                requiredSnippets: ["- run the code"],
                simulatedOutput: ["Verification checklist ready."],
                enemyName: "Check Wisp",
            },
            {
                slug: "error-report",
                title: "Error Report",
                titleCN: "错误报告",
                description: "Describe the bug with input, output, and expected result.",
                descriptionCN: "用输入、现象和期望结果来描述 bug。",
                knowledgeHintCN: "好 bug 报告要写清输入、现象和期望结果",
                initialCode: `# Knowledge: useful bug reports are concrete
Input: score = 0
Output: page stays blank
Expected: ____`,
                requiredSnippets: ["Expected: show score 0"],
                simulatedOutput: ["Bug report is specific and actionable."],
                enemyName: "Debug Raven",
            },
            {
                slug: "boss-review-loop",
                title: "Boss Review Loop",
                titleCN: "工作流闭环 Boss",
                description: "Complete a safe AI work loop with plan, build, test, and fix.",
                descriptionCN: "完成计划、构建、测试、修正的安全 AI 工作闭环。",
                knowledgeHintCN: "稳定的 AI 工作需要计划、构建、测试、修正的完整闭环",
                initialCode: `# Knowledge: a safe workflow has a full loop
1. plan
2. build
3. ____
4. fix`,
                requiredSnippets: ["3. test"],
                simulatedOutput: ["Plan -> build -> test -> fix loop complete."],
                enemyName: "Workflow Titan",
            },
        ],
    },
    {
        chapterId: 703,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "Coach",
        templates: [
            {
                slug: "review-mistake",
                title: "Review One Mistake",
                titleCN: "复盘一道错题",
                description: "Ask AI to explain one mistake instead of giving all answers.",
                descriptionCN: "让 AI 只解释一道错题，而不是直接给全部答案。",
                knowledgeHintCN: "让 AI 解释错因，比直接抄答案更有效",
                initialCode: `# Knowledge: review mistakes, not just answers
Please explain this one mistake:
Question: for loop
My answer: while
Need: ____`,
                requiredSnippets: ["Need: tell me why it is wrong"],
                simulatedOutput: ["AI will explain one mistake clearly."],
                enemyName: "Review Finch",
            },
            {
                slug: "study-plan",
                title: "Study Plan",
                titleCN: "学习计划",
                description: "Build a short study plan for tonight.",
                descriptionCN: "为今晚安排一份简短学习计划。",
                knowledgeHintCN: "学习计划要写清时间、步骤和练习量，才容易执行",
                initialCode: `# Knowledge: use AI to organise study
Goal: review Python lists
Time: 30 minutes
Plan:
1. warm-up
2. ____`,
                requiredSnippets: ["2. do 3 list questions"],
                simulatedOutput: ["30-minute study plan ready."],
                enemyName: "Plan Sprite",
            },
            {
                slug: "flashcard-prompt",
                title: "Flashcard Prompt",
                titleCN: "闪卡提示",
                description: "Ask AI to turn notes into flashcards.",
                descriptionCN: "让 AI 把笔记整理成闪卡。",
                knowledgeHintCN: "闪卡要短、准、可抽查，适合做记忆回顾",
                initialCode: `# Knowledge: convert notes into flashcards
Please turn these notes into ____ flashcards for me.`,
                requiredSnippets: ["5 flashcards"],
                simulatedOutput: ["5 flashcards prepared."],
                enemyName: "Card Bug",
            },
            {
                slug: "privacy-guard",
                title: "Privacy Guard",
                titleCN: "隐私守护",
                description: "Tell AI not to use your private account details.",
                descriptionCN: "告诉 AI 不要使用你的私人账号信息。",
                knowledgeHintCN: "学习求助时也要守住账号和个人信息边界",
                initialCode: `# Knowledge: keep private info out
Do not use:
- password
- phone number
- ____`,
                requiredSnippets: ["- home address"],
                simulatedOutput: ["Private data boundary set."],
                enemyName: "Shield Rabbit",
            },
            {
                slug: "boss-self-check",
                title: "Boss Self Check",
                titleCN: "自检 Boss",
                description: "End the study session with one self-check question.",
                descriptionCN: "在总结结束后，要求一题自测问题。",
                knowledgeHintCN: "最好的 AI 学习回合，最后一定会逼自己回想和作答",
                initialCode: `# Knowledge: AI should support reflection
After the summary, ask me ____ self-check question.`,
                requiredSnippets: ["one"],
                simulatedOutput: ["Session ends with one self-check question."],
                enemyName: "Coach Titan",
            },
        ],
    },
];

const ADVANCED_EXPANSION_PACKS: ChapterPack[] = [
    {
        chapterId: 103,
        runtime: "pattern",
        editorLanguage: "cpp",
        enemyAvatar: "C++",
        templates: [
            {
                slug: "ref-alias",
                title: "Reference Alias",
                titleCN: "引用别名",
                description: "Bind alias to score with a reference.",
                descriptionCN: "用引用把 alias 绑定到 score。",
                initialCode: `// Knowledge: reference alias
int score = 95;
int& alias = ____;
std::cout << alias;`,
                requiredSnippets: ["int& alias = score;"],
                simulatedOutput: ["95"],
                enemyName: "Alias Fox",
            },
            {
                slug: "array-first",
                title: "Array Start",
                titleCN: "数组起点",
                description: "Read the first value from the array.",
                descriptionCN: "读取数组里的第一个值。",
                initialCode: `// Knowledge: array index starts at 0
int nums[3] = {7, 9, 11};
std::cout << nums[____];`,
                requiredSnippets: ["nums[0]"],
                simulatedOutput: ["7"],
                enemyName: "Array Mole",
            },
            {
                slug: "pointer-read",
                title: "Pointer Read",
                titleCN: "指针取值",
                description: "Read the value pointed to by ptr.",
                descriptionCN: "读取指针 ptr 指向的值。",
                initialCode: `// Knowledge: dereference a pointer
int hp = 120;
int* ptr = &hp;
std::cout << ____;`,
                requiredSnippets: ["*ptr"],
                simulatedOutput: ["120"],
                enemyName: "Pointer Beetle",
            },
            {
                slug: "boost-by-ref",
                title: "Boost by Ref",
                titleCN: "引用增幅",
                description: "Call the function so it changes power directly.",
                descriptionCN: "调用函数，让它直接修改 power。",
                initialCode: `// Knowledge: pass by reference
void boost(int& power) {
  power += 5;
}

int power = 80;
____;
std::cout << power;`,
                requiredSnippets: ["boost(power);"],
                simulatedOutput: ["85"],
                enemyName: "Ref Sprite",
            },
            {
                slug: "boss-range-ref",
                title: "Boss Range Ref",
                titleCN: "范围引用 Boss",
                description: "Use a reference in the loop so each hp can change.",
                descriptionCN: "在循环里使用引用，这样每个 hp 都能被真正修改。",
                initialCode: `// Knowledge: use references when mutating a container
#include <vector>
#include <iostream>
int main() {
  std::vector<int> team = {70, 75};
  for (int____ hp : team) {
    hp += 10;
  }
  std::cout << team[1];
}`,
                requiredSnippets: ["for (int& hp : team)"],
                simulatedOutput: ["85"],
                enemyName: "Memory Titan",
            },
        ],
    },
    {
        chapterId: 104,
        runtime: "pattern",
        editorLanguage: "cpp",
        enemyAvatar: "C++",
        templates: [
            {
                slug: "class-field",
                title: "Class Field",
                titleCN: "类字段",
                description: "Save the pet name into the object field.",
                descriptionCN: "把宠物名字存进对象字段。",
                initialCode: `// Knowledge: object fields store state
class Pet {
public:
  std::string name;
};

Pet pet;
pet.____ = "Milo";`,
                requiredSnippets: ['pet.name = "Milo"'],
                simulatedOutput: ["name saved"],
                enemyName: "Field Rabbit",
            },
            {
                slug: "constructor-name",
                title: "Constructor Init",
                titleCN: "构造初始化",
                description: "Use the parameter to initialize the name field.",
                descriptionCN: "用参数初始化 name 字段。",
                initialCode: `// Knowledge: initializer lists connect data with construction
class Hero {
public:
  std::string name;
  Hero(std::string name) : name(____) {}
};`,
                requiredSnippets: [": name(name)"],
                simulatedOutput: ["constructor ready"],
                enemyName: "Ctor Finch",
            },
            {
                slug: "method-call",
                title: "Method Call",
                titleCN: "方法调用",
                description: "Call the open method on the door object.",
                descriptionCN: "在 door 对象上调用 open 方法。",
                initialCode: `// Knowledge: methods are actions owned by objects
class Door {
public:
  void open() {
    std::cout << "OPEN";
  }
};

Door door;
____;`,
                requiredSnippets: ["door.open();"],
                simulatedOutput: ["OPEN"],
                enemyName: "Method Hawk",
            },
            {
                slug: "vector-objects",
                title: "Object List",
                titleCN: "对象列表",
                description: "Push one new name into the team vector.",
                descriptionCN: "向 team 这个 vector 里加入一个新名字。",
                initialCode: `// Knowledge: containers can store many related values
#include <vector>
#include <string>
std::vector<std::string> team;
team.____("Luna");`,
                requiredSnippets: ['team.push_back("Luna")'],
                simulatedOutput: ["team size: 1"],
                enemyName: "Vector Yak",
            },
            {
                slug: "boss-score-card",
                title: "Boss Score Card",
                titleCN: "分数卡 Boss",
                description: "Read the score from the first object in the vector.",
                descriptionCN: "读取 vector 中第一个对象的 score。",
                initialCode: `// Knowledge: objects plus containers form tiny systems
#include <vector>
#include <iostream>
class ScoreCard {
public:
  int score;
  ScoreCard(int score) : score(score) {}
};

std::vector<ScoreCard> cards;
cards.push_back(ScoreCard(98));
std::cout << cards[0].____;`,
                requiredSnippets: ["cards[0].score"],
                simulatedOutput: ["98"],
                enemyName: "Class Titan",
            },
        ],
    },
    {
        chapterId: 203,
        runtime: "pattern",
        editorLanguage: "java",
        enemyAvatar: "Java",
        templates: [
            {
                slug: "extends-hero",
                title: "Extends Hero",
                titleCN: "继承英雄类",
                description: "Let Wizard inherit from Hero.",
                descriptionCN: "让 Wizard 继承 Hero。",
                initialCode: `// Knowledge: extends reuses common structure
class Hero {}
class Wizard ____ Hero {}`,
                requiredSnippets: ["extends Hero"],
                simulatedOutput: ["Wizard is a Hero."],
                enemyName: "Heritage Imp",
            },
            {
                slug: "override-move",
                title: "Override Move",
                titleCN: "重写方法",
                description: "Mark the move method as an override.",
                descriptionCN: "给 move 方法加上重写标记。",
                initialCode: `// Knowledge: override shows you are replacing parent behaviour
class Hero {
  void move() {}
}

class Wizard extends Hero {
  @____
  void move() {
    System.out.println("glide");
  }
}`,
                requiredSnippets: ["@Override"],
                simulatedOutput: ["override ready"],
                enemyName: "Method Imp",
            },
            {
                slug: "implements-runner",
                title: "Implements Runner",
                titleCN: "实现接口",
                description: "Let Bot implement the Runnable interface.",
                descriptionCN: "让 Bot 实现 Runnable 接口。",
                initialCode: `// Knowledge: interfaces describe behaviour contracts
class Bot ____ Runnable {
  public void run() {
    System.out.println("run");
  }
}`,
                requiredSnippets: ["implements Runnable"],
                simulatedOutput: ["Bot can run."],
                enemyName: "Interface Lynx",
            },
            {
                slug: "polymorphic-hero",
                title: "Polymorphic Hero",
                titleCN: "多态英雄",
                description: "Create a Wizard object through a Hero reference.",
                descriptionCN: "通过 Hero 引用创建 Wizard 对象。",
                initialCode: `// Knowledge: parent references can point to child objects
Hero hero = ____;
hero.move();`,
                requiredSnippets: ["new Wizard()"],
                simulatedOutput: ["Wizard moves."],
                enemyName: "Poly Raven",
            },
            {
                slug: "boss-skill-interface",
                title: "Boss Skill Interface",
                titleCN: "技能接口 Boss",
                description: "Create one FireSkill object through the Skill interface.",
                descriptionCN: "通过 Skill 接口创建一个 FireSkill 对象。",
                initialCode: `// Knowledge: interfaces let different objects share one entry point
interface Skill {
  void cast();
}

class FireSkill implements Skill {
  public void cast() {
    System.out.println("fire");
  }
}

Skill skill = ____;`,
                requiredSnippets: ["new FireSkill()"],
                simulatedOutput: ["fire"],
                enemyName: "Interface Titan",
            },
        ],
    },
    {
        chapterId: 204,
        runtime: "pattern",
        editorLanguage: "java",
        enemyAvatar: "Java",
        templates: [
            {
                slug: "hashmap-put",
                title: "HashMap Put",
                titleCN: "存入映射",
                description: "Put Luna and her score into the map.",
                descriptionCN: "把 Luna 和她的分数放进映射里。",
                initialCode: `// Knowledge: maps connect keys with values
import java.util.HashMap;
HashMap<String, Integer> scores = new HashMap<>();
scores.____("Luna", 98);`,
                requiredSnippets: ['scores.put("Luna", 98)'],
                simulatedOutput: ["Luna=98"],
                enemyName: "Map Sprite",
            },
            {
                slug: "hashmap-get",
                title: "HashMap Get",
                titleCN: "读取映射",
                description: "Read Luna's score from the map.",
                descriptionCN: "从映射中读取 Luna 的分数。",
                initialCode: `// Knowledge: get reads a value by key
int score = scores.____("Luna");
System.out.println(score);`,
                requiredSnippets: ['scores.get("Luna")'],
                simulatedOutput: ["98"],
                enemyName: "Key Finch",
            },
            {
                slug: "entry-loop",
                title: "Entry Loop",
                titleCN: "遍历键值对",
                description: "Loop through each entry in the map.",
                descriptionCN: "遍历映射中的每一组键值对。",
                initialCode: `// Knowledge: entrySet lets you read key and value together
for (Map.Entry<String, Integer> entry : scores.____()) {
  System.out.println(entry.getKey());
}`,
                requiredSnippets: ["scores.entrySet()"],
                simulatedOutput: ["Luna", "Kai"],
                enemyName: "Entry Mole",
            },
            {
                slug: "student-list",
                title: "Student List",
                titleCN: "学生列表",
                description: "Add one Student object into the team list.",
                descriptionCN: "把一个 Student 对象加入 team 列表。",
                initialCode: `// Knowledge: lists can hold many objects in a project flow
import java.util.ArrayList;
ArrayList<Student> team = new ArrayList<>();
team.____(new Student("Kai", 90));`,
                requiredSnippets: ['team.add(new Student("Kai", 90))'],
                simulatedOutput: ["team size: 1"],
                enemyName: "Roster Bat",
            },
            {
                slug: "boss-project-map",
                title: "Boss Project Map",
                titleCN: "项目映射 Boss",
                description: "Add one task into the backend project list.",
                descriptionCN: "把一个任务加入 backend 项目的列表。",
                initialCode: `// Knowledge: project data often means nested collections
import java.util.ArrayList;
import java.util.HashMap;
HashMap<String, ArrayList<String>> project = new HashMap<>();
project.put("backend", new ArrayList<>());
project.____.add("login");`,
                requiredSnippets: ['project.get("backend").add("login")'],
                simulatedOutput: ["backend -> login"],
                enemyName: "Collection Titan",
            },
        ],
    },
    {
        chapterId: 303,
        runtime: "pattern",
        editorLanguage: "go",
        enemyAvatar: "Go",
        templates: [
            {
                slug: "struct-field",
                title: "Struct Field",
                titleCN: "结构体字段",
                description: "Declare the Name field as a string.",
                descriptionCN: "把 Name 字段声明为字符串。",
                initialCode: `// Knowledge: structs describe the shape of data
type Player struct {
    Name ____
}`,
                requiredSnippets: ["Name string"],
                simulatedOutput: ["struct field ready"],
                enemyName: "Struct Ant",
            },
            {
                slug: "create-player",
                title: "Create Player",
                titleCN: "创建玩家",
                description: "Create a Player value with name and score.",
                descriptionCN: "创建一个带名字和分数的 Player 值。",
                initialCode: `// Knowledge: struct literals build clear data objects
hero := ____`,
                requiredSnippets: ['Player{Name: "Luna", Score: 95}'],
                simulatedOutput: ["{Luna 95}"],
                enemyName: "Literal Fox",
            },
            {
                slug: "method-name",
                title: "Method Receiver",
                titleCN: "方法接收者",
                description: "Return the Name field from the receiver.",
                descriptionCN: "从接收者里返回 Name 字段。",
                initialCode: `// Knowledge: methods attach behaviour to data
type Player struct {
    Name string
}

func (p Player) Label() string {
    return p.____
}`,
                requiredSnippets: ["p.Name"],
                simulatedOutput: ["Luna"],
                enemyName: "Receiver Yak",
            },
            {
                slug: "interface-value",
                title: "Interface Value",
                titleCN: "接口赋值",
                description: "Store the Drone object into the Runner interface.",
                descriptionCN: "把 Drone 对象存进 Runner 接口变量。",
                initialCode: `// Knowledge: interfaces point to values with matching behaviour
type Runner interface {
    Run()
}

type Drone struct{}

func (Drone) Run() {}

hero := Drone{}
var runner Runner = ____`,
                requiredSnippets: ["hero"],
                simulatedOutput: ["runner ready"],
                enemyName: "Interface Gull",
            },
            {
                slug: "boss-labeler",
                title: "Boss Labeler",
                titleCN: "标签接口 Boss",
                description: "Call the shared Label method through the interface.",
                descriptionCN: "通过接口调用统一的 Label 方法。",
                initialCode: `// Knowledge: interfaces unify different models behind one action
type Labeler interface {
    Label() string
}

func printLabel(card Labeler) {
    fmt.Println(card.____())
}`,
                requiredSnippets: ["card.Label()"],
                simulatedOutput: ["label printed"],
                enemyName: "Model Titan",
            },
        ],
    },
    {
        chapterId: 304,
        runtime: "pattern",
        editorLanguage: "go",
        enemyAvatar: "Go",
        templates: [
            {
                slug: "json-tag",
                title: "JSON Tag",
                titleCN: "JSON 标签",
                description: "Give the Name field the correct JSON key.",
                descriptionCN: "给 Name 字段写上正确的 JSON 键名。",
                initialCode: "type LoginRequest struct {\n    Name string `json:\"____\"`\n}",
                requiredSnippets: ['json:"name"'],
                simulatedOutput: ['{"name":"Luna"}'],
                enemyName: "Tag Mite",
            },
            {
                slug: "marshal-score",
                title: "Marshal Data",
                titleCN: "编码数据",
                description: "Marshal the score value into JSON.",
                descriptionCN: "把 score 编码成 JSON。",
                initialCode: `// Knowledge: marshal turns data into bytes for transfer
score := map[string]int{"hp": 95}
data, _ := json.____(score)`,
                requiredSnippets: ["json.Marshal(score)"],
                simulatedOutput: ['{"hp":95}'],
                enemyName: "JSON Sprite",
            },
            {
                slug: "route-handler",
                title: "Route Handler",
                titleCN: "路由处理器",
                description: "Bind the ping handler to the route.",
                descriptionCN: "把 ping 处理器绑定到路由上。",
                initialCode: `// Knowledge: routes connect URLs to handler functions
http.HandleFunc("/ping", ____)`,
                requiredSnippets: ["ping"],
                simulatedOutput: ["/ping ready"],
                enemyName: "Route Finch",
            },
            {
                slug: "decode-body",
                title: "Decode Body",
                titleCN: "解析请求体",
                description: "Decode the request body into req.",
                descriptionCN: "把请求体解析到 req 中。",
                initialCode: `// Knowledge: decode input before using it
var req LoginRequest
json.NewDecoder(r.Body).Decode(&____)`,
                requiredSnippets: ["req"],
                simulatedOutput: ["request decoded"],
                enemyName: "Body Crab",
            },
            {
                slug: "boss-write-json",
                title: "Boss Write JSON",
                titleCN: "返回 JSON Boss",
                description: "Write the encoded JSON back to the client.",
                descriptionCN: "把编码后的 JSON 写回给客户端。",
                initialCode: `// Knowledge: a response ends by writing bytes back out
w.Header().Set("Content-Type", "application/json")
w.Write(____)`,
                requiredSnippets: ["data"],
                simulatedOutput: ["response sent"],
                enemyName: "Service Titan",
            },
        ],
    },
    {
        chapterId: 403,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "Vue",
        templates: [
            {
                slug: "ref-counter",
                title: "Ref Counter",
                titleCN: "Ref 计数器",
                description: "Create a reactive counter with ref.",
                descriptionCN: "用 ref 创建一个响应式计数器。",
                initialCode: `<!-- Knowledge: ref wraps simple reactive values -->
<script setup>
import { ref } from "vue"
const count = ____
</script>`,
                requiredSnippets: ["ref(0)"],
                simulatedOutput: ["count ready"],
                enemyName: "Ref Pika",
            },
            {
                slug: "computed-rank",
                title: "Computed Rank",
                titleCN: "计算等级",
                description: "Use score.value inside the computed result.",
                descriptionCN: "在计算属性中使用 score.value。",
                initialCode: `<!-- Knowledge: computed derives UI from state -->
<script setup>
import { computed, ref } from "vue"
const score = ref(92)
const rank = computed(() => score.____ >= 90 ? "A" : "B")
</script>`,
                requiredSnippets: ["score.value"],
                simulatedOutput: ["A"],
                enemyName: "Rank Sprite",
            },
            {
                slug: "watch-score",
                title: "Watch Score",
                titleCN: "侦听分数",
                description: "Watch the score ref so status can react.",
                descriptionCN: "侦听 score 这个 ref，让状态跟着变化。",
                initialCode: `<!-- Knowledge: watch reacts to state changes -->
<script setup>
import { ref, watch } from "vue"
const score = ref(40)
const status = ref("retry")

watch(____, (value) => {
  status.value = value >= 60 ? "pass" : "retry"
})
</script>`,
                requiredSnippets: ["score"],
                simulatedOutput: ["watch connected"],
                enemyName: "Watch Fox",
            },
            {
                slug: "reactive-form",
                title: "Reactive Form",
                titleCN: "响应式表单",
                description: "Create a reactive form object with name and level.",
                descriptionCN: "创建一个带 name 和 level 的响应式表单对象。",
                initialCode: `<!-- Knowledge: reactive is useful for grouped state -->
<script setup>
import { reactive } from "vue"
const form = ____({
  name: "",
  level: 1,
})
</script>`,
                requiredSnippets: ["reactive({"],
                simulatedOutput: ["form ready"],
                enemyName: "Form Hare",
            },
            {
                slug: "boss-computed-summary",
                title: "Boss Computed Summary",
                titleCN: "摘要计算 Boss",
                description: "Use the level field to finish the computed summary.",
                descriptionCN: "使用 level 字段完成这个计算摘要。",
                initialCode: `<!-- Knowledge: computed keeps display text synced with state -->
<script setup>
import { computed, reactive } from "vue"
const form = reactive({ name: "Luna", level: 3 })
const summary = computed(() => form.name + " Lv." + form.____)
</script>`,
                requiredSnippets: ["form.level"],
                simulatedOutput: ["Luna Lv.3"],
                enemyName: "Reactive Titan",
            },
        ],
    },
    {
        chapterId: 404,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "Vue",
        templates: [
            {
                slug: "props-quests",
                title: "Quest Props",
                titleCN: "任务 Props",
                description: "Declare quests as an Array prop.",
                descriptionCN: "把 quests 声明成 Array 类型的 prop。",
                initialCode: `<!-- Knowledge: props describe data that comes from the parent -->
<script setup>
const props = defineProps({
  quests: ____,
})
</script>`,
                requiredSnippets: ["Array"],
                simulatedOutput: ["quests prop ready"],
                enemyName: "Prop Scout",
            },
            {
                slug: "emit-select",
                title: "Emit Select",
                titleCN: "发出选择事件",
                description: "Declare one select event for the component.",
                descriptionCN: "为组件声明一个 select 事件。",
                initialCode: `<!-- Knowledge: emits send events upward -->
<script setup>
const emit = defineEmits(["____"])
</script>`,
                requiredSnippets: ["select"],
                simulatedOutput: ["select event ready"],
                enemyName: "Signal Mouse",
            },
            {
                slug: "bind-quest-list",
                title: "Bind Quest List",
                titleCN: "绑定任务列表",
                description: "Pass questList into the child component.",
                descriptionCN: "把 questList 传给子组件。",
                initialCode: `<!-- Knowledge: parent components pass state down as props -->
<template>
  <QuestBoard :quests="____" />
</template>`,
                requiredSnippets: ["questList"],
                simulatedOutput: ["child received quest list"],
                enemyName: "Bind Finch",
            },
            {
                slug: "emit-quest-id",
                title: "Emit Quest Id",
                titleCN: "发送任务编号",
                description: "Emit the current quest id when the button is clicked.",
                descriptionCN: "点击按钮时发出当前任务的编号。",
                initialCode: `<!-- Knowledge: payloads let children report useful details -->
<template>
  <button @click="emit('select', quest.____)">Pick</button>
</template>`,
                requiredSnippets: ["quest.id"],
                simulatedOutput: ["quest id emitted"],
                enemyName: "Payload Otter",
            },
            {
                slug: "boss-model-bridge",
                title: "Boss Model Bridge",
                titleCN: "双向绑定 Boss",
                description: "Connect keyword to the child filter component with model events.",
                descriptionCN: "通过 model 事件把 keyword 连接到子组件。",
                initialCode: `<!-- Knowledge: component collaboration needs a clear data and event bridge -->
<template>
  <QuestFilter
    :model-value="keyword"
    @update:modelValue="____"
  />
</template>`,
                requiredSnippets: ["keyword = $event"],
                simulatedOutput: ["keyword synced"],
                enemyName: "Vue Titan",
            },
        ],
    },
    {
        chapterId: 503,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "React",
        templates: [
            {
                slug: "title-effect",
                title: "Title Effect",
                titleCN: "标题副作用",
                description: "Use title in the effect dependency list.",
                descriptionCN: "把 title 放进副作用依赖列表。",
                initialCode: `// Knowledge: effect dependencies describe when side effects rerun
useEffect(() => {
  document.title = title
}, [____])`,
                requiredSnippets: ["[title]"],
                simulatedOutput: ["document title synced"],
                enemyName: "Effect Imp",
            },
            {
                slug: "cleanup-timer",
                title: "Cleanup Timer",
                titleCN: "清理计时器",
                description: "Clear the interval in the cleanup function.",
                descriptionCN: "在清理函数里清除这个定时器。",
                initialCode: `// Knowledge: cleanup prevents old side effects from leaking
useEffect(() => {
  const timerId = setInterval(tick, 1000)
  return () => clearInterval(____)
}, [])`,
                requiredSnippets: ["timerId"],
                simulatedOutput: ["timer cleaned"],
                enemyName: "Timer Moth",
            },
            {
                slug: "loading-start",
                title: "Start Loading",
                titleCN: "开始加载",
                description: "Set loading to true before the request begins.",
                descriptionCN: "在请求开始前把 loading 设为 true。",
                initialCode: `// Knowledge: predictable data flow starts with clear loading state
useEffect(() => {
  setLoading(____)
  fetchLessons()
}, [])`,
                requiredSnippets: ["true"],
                simulatedOutput: ["loading started"],
                enemyName: "Loading Finch",
            },
            {
                slug: "room-dependency",
                title: "Room Dependency",
                titleCN: "房间依赖",
                description: "Use roomId as the effect dependency.",
                descriptionCN: "把 roomId 作为副作用依赖。",
                initialCode: `// Knowledge: effects should react to the state they depend on
useEffect(() => {
  loadRoom(roomId)
}, [____])`,
                requiredSnippets: ["roomId"],
                simulatedOutput: ["room reload ready"],
                enemyName: "Flow Raven",
            },
            {
                slug: "boss-resize-cleanup",
                title: "Boss Resize Cleanup",
                titleCN: "监听清理 Boss",
                description: "Remove the resize listener with the same handler.",
                descriptionCN: "用同一个处理函数移除 resize 监听。",
                initialCode: `// Knowledge: add and remove the same side effect pair
useEffect(() => {
  window.addEventListener("resize", handleResize)
  return () => window.removeEventListener("resize", ____)
}, [])`,
                requiredSnippets: ["handleResize"],
                simulatedOutput: ["resize listener cleaned"],
                enemyName: "Data Titan",
            },
        ],
    },
    {
        chapterId: 504,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "React",
        templates: [
            {
                slug: "stat-props",
                title: "Stat Props",
                titleCN: "属性拆解",
                description: "Read value from the component props.",
                descriptionCN: "从组件属性中读取 value。",
                initialCode: `// Knowledge: small components become clear through focused props
function StatCard({ label, ____ }) {
  return <p>{value}</p>
}`,
                requiredSnippets: ["value"],
                simulatedOutput: ["prop ready"],
                enemyName: "Prop Seed",
            },
            {
                slug: "select-callback",
                title: "Select Callback",
                titleCN: "选择回调",
                description: "Pass the selected id setter into QuestRow.",
                descriptionCN: "把选中编号的 setter 传给 QuestRow。",
                initialCode: `// Knowledge: callback props let child actions affect parent state
<QuestRow quest={quest} onSelect={____} />`,
                requiredSnippets: ["setSelectedId"],
                simulatedOutput: ["callback wired"],
                enemyName: "Callback Hare",
            },
            {
                slug: "filter-keyword",
                title: "Filter Keyword",
                titleCN: "关键词筛选",
                description: "Filter quests using the keyword state.",
                descriptionCN: "用 keyword 状态筛选 quests。",
                initialCode: `// Knowledge: derive filtered views before rendering
const visible = quests.filter((quest) => quest.name.includes(____))`,
                requiredSnippets: ["keyword"],
                simulatedOutput: ["filtered list ready"],
                enemyName: "Filter Finch",
            },
            {
                slug: "empty-state",
                title: "Empty State",
                titleCN: "空状态",
                description: "Show EmptyState when no quest is selected.",
                descriptionCN: "没有选中任务时显示 EmptyState。",
                initialCode: `// Knowledge: clear fallback UI keeps interfaces readable
return selectedQuest ? <QuestDetail quest={selectedQuest} /> : ____`,
                requiredSnippets: ["<EmptyState />"],
                simulatedOutput: ["empty state ready"],
                enemyName: "State Fox",
            },
            {
                slug: "boss-skills-tab",
                title: "Boss Skills Tab",
                titleCN: "技能页签 Boss",
                description: "Switch the tab to skills when the button is clicked.",
                descriptionCN: "点击按钮时切换到 skills 页签。",
                initialCode: `// Knowledge: UI composition stays clear when one state controls one view
<button onClick={() => setTab("____")}>Skills</button>`,
                requiredSnippets: ["skills"],
                simulatedOutput: ["skills tab open"],
                enemyName: "Compose Titan",
            },
        ],
    },
    {
        chapterId: 604,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "AI",
        templates: [
            {
                slug: "attach-files",
                title: "Attach Files",
                titleCN: "补齐上下文文件",
                description: "Add one more relevant file to the request context.",
                descriptionCN: "给请求上下文再补一个相关文件。",
                initialCode: `# Knowledge: AI works better when it sees the right files
Task: fix the login page
Context files:
- LoginForm.tsx
- ____`,
                requiredSnippets: ["- auth.ts"],
                simulatedOutput: ["Context now includes the auth file."],
                enemyName: "Context Finch",
            },
            {
                slug: "set-output-format",
                title: "Set Output Format",
                titleCN: "约定输出格式",
                description: "Add one more required section to the answer format.",
                descriptionCN: "给回答格式再补一个必须输出的部分。",
                initialCode: `# Knowledge: output format keeps answers stable
Output format:
1. summary
2. changed files
3. ____`,
                requiredSnippets: ["3. test plan"],
                simulatedOutput: ["Answer format locked."],
                enemyName: "Format Wisp",
            },
            {
                slug: "limit-edit-scope",
                title: "Limit Edit Scope",
                titleCN: "限制修改范围",
                description: "Add a scope rule so AI only edits frontend files.",
                descriptionCN: "增加一个范围规则，让 AI 只改前端文件。",
                initialCode: `# Knowledge: constraints reduce risky overreach
Constraints:
- do not touch database
- keep Chinese copy short
- ____`,
                requiredSnippets: ["- only edit frontend files"],
                simulatedOutput: ["Edit boundary added."],
                enemyName: "Boundary Mole",
            },
            {
                slug: "add-example",
                title: "Add Example",
                titleCN: "补一个示例",
                description: "Add one example format so AI can imitate it.",
                descriptionCN: "补一个示例格式，让 AI 可以照着做。",
                initialCode: `# Knowledge: examples show the level of detail you want
Examples:
- issue: button overlaps avatar
- fix: move it into the top toolbar
- ____`,
                requiredSnippets: ["- test: verify mobile width still fits"],
                simulatedOutput: ["Example pattern added."],
                enemyName: "Example Bat",
            },
            {
                slug: "boss-full-context",
                title: "Boss Full Context",
                titleCN: "完整上下文 Boss",
                description: "Add the missing examples requirement into the request brief.",
                descriptionCN: "把缺失的示例要求补进这份请求说明。",
                initialCode: `# Knowledge: the best AI brief includes goal, users, files, constraints, and examples
Goal: add search to the chapter list
Users: students on tablets
Files: LearningMap.tsx, SearchBar.tsx
Constraints: keep layout stable
Output: patch + test note
____`,
                requiredSnippets: ["Examples: one success case and one empty-state case"],
                simulatedOutput: ["Brief upgraded with full context."],
                enemyName: "Context Titan",
            },
        ],
    },
    {
        chapterId: 605,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "AI",
        templates: [
            {
                slug: "rubric-axis",
                title: "Rubric Axis",
                titleCN: "评分维度",
                description: "Add one more rubric line for safety.",
                descriptionCN: "给评分标准再加一条关于安全的维度。",
                initialCode: `# Knowledge: rubrics make evaluation concrete
Rubric:
- correctness
- clarity
- ____`,
                requiredSnippets: ["- safety"],
                simulatedOutput: ["Rubric now has three dimensions."],
                enemyName: "Rubric Bug",
            },
            {
                slug: "edge-case",
                title: "Edge Case",
                titleCN: "边界用例",
                description: "Complete the expected result for an empty list case.",
                descriptionCN: "补全空列表这个边界用例的期望结果。",
                initialCode: `# Knowledge: tests need edge cases, not just happy paths
Case 1:
Input: empty list
____`,
                requiredSnippets: ["Expected: return []"],
                simulatedOutput: ["Edge case defined."],
                enemyName: "Case Finch",
            },
            {
                slug: "mark-failure",
                title: "Mark Failure",
                titleCN: "标记失败点",
                description: "Add one failed edge case item into the review.",
                descriptionCN: "在复查中补一条失败的边界用例项。",
                initialCode: `# Knowledge: evaluation should record what failed, not just what passed
Result check:
- passed output
- ____`,
                requiredSnippets: ["- failed edge case"],
                simulatedOutput: ["Failure note added."],
                enemyName: "Review Mouse",
            },
            {
                slug: "revise-and-retest",
                title: "Revise and Retest",
                titleCN: "修正后重测",
                description: "Finish the loop after fixing the prompt.",
                descriptionCN: "在修正提示后，把循环补完整。",
                initialCode: `# Knowledge: improvement only counts if you test again
If one case fails:
1. note the bug
2. fix the prompt
3. ____`,
                requiredSnippets: ["3. run the case again"],
                simulatedOutput: ["Revision loop completed."],
                enemyName: "Retest Hare",
            },
            {
                slug: "boss-eval-loop",
                title: "Boss Eval Loop",
                titleCN: "评测闭环 Boss",
                description: "Finish the last step of the evaluation loop.",
                descriptionCN: "补上评测闭环的最后一步。",
                initialCode: `# Knowledge: strong AI work keeps the loop running until the result is stable
Loop:
1. write rubric
2. run cases
3. score result
4. revise
5. ____`,
                requiredSnippets: ["5. retest"],
                simulatedOutput: ["Evaluation loop complete."],
                enemyName: "Judge Titan",
            },
        ],
    },
    {
        chapterId: 704,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "Coach",
        templates: [
            {
                slug: "private-info",
                title: "Private Info",
                titleCN: "隐私信息",
                description: "Add one more piece of private data that should never be uploaded.",
                descriptionCN: "再补一条绝不能上传的隐私信息。",
                initialCode: `# Knowledge: privacy protection starts with knowing what must stay private
Never upload:
- password
- student ID
- ____`,
                requiredSnippets: ["- home address"],
                simulatedOutput: ["Privacy boundary strengthened."],
                enemyName: "Privacy Finch",
            },
            {
                slug: "ai-disclosure",
                title: "AI Disclosure",
                titleCN: "说明 AI 使用",
                description: "State one honest use of AI in the homework note.",
                descriptionCN: "在作业说明里写出一项真实的 AI 使用方式。",
                initialCode: `# Knowledge: honest disclosure builds trust and fairness
Homework note:
I used AI for ____, then I finished the final answer myself.`,
                requiredSnippets: ["brainstorming"],
                simulatedOutput: ["AI use disclosed clearly."],
                enemyName: "Fairness Sprite",
            },
            {
                slug: "multiple-viewpoints",
                title: "Multiple Viewpoints",
                titleCN: "多角度思考",
                description: "Ask AI to show two viewpoints before giving advice.",
                descriptionCN: "要求 AI 在给建议前先展示两个视角。",
                initialCode: `# Knowledge: fairness improves when we compare more than one angle
Ask AI:
"Please show ____ viewpoints before giving advice."`,
                requiredSnippets: ["two"],
                simulatedOutput: ["Request now asks for multiple viewpoints."],
                enemyName: "Balance Bat",
            },
            {
                slug: "mark-assistance",
                title: "Mark Assistance",
                titleCN: "标记辅助来源",
                description: "Add one more check item before sharing work.",
                descriptionCN: "在分享作品前再补一条检查项。",
                initialCode: `# Knowledge: responsible use needs privacy checks and clear disclosure
Before sharing:
- check facts
- remove private info
- ____`,
                requiredSnippets: ["- mark AI assistance clearly"],
                simulatedOutput: ["Sharing checklist improved."],
                enemyName: "Boundary Hare",
            },
            {
                slug: "boss-safe-rules",
                title: "Boss Safe Rules",
                titleCN: "安全守则 Boss",
                description: "Finish the class AI rules with one final fact-check step.",
                descriptionCN: "用最后一条事实核查规则补全班级 AI 守则。",
                initialCode: `# Knowledge: good AI rules protect both learning and trust
Class AI rules:
1. protect privacy
2. cite assistance
3. think independently
4. ____`,
                requiredSnippets: ["4. verify important facts"],
                simulatedOutput: ["Class AI rules completed."],
                enemyName: "Ethics Titan",
            },
        ],
    },
    {
        chapterId: 705,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "Coach",
        templates: [
            {
                slug: "research-question",
                title: "Research Question",
                titleCN: "研究问题",
                description: "Add one concrete technology to the project question.",
                descriptionCN: "给项目问题补一个具体技术方向。",
                initialCode: `# Knowledge: good inquiry starts with a clear and researchable question
Project question:
How can ____ reduce water waste at school?`,
                requiredSnippets: ["sensors"],
                simulatedOutput: ["Research question focused."],
                enemyName: "Question Fox",
            },
            {
                slug: "search-keywords",
                title: "Search Keywords",
                titleCN: "搜索关键词",
                description: "Add one more useful search keyword.",
                descriptionCN: "补一个更有用的搜索关键词。",
                initialCode: `# Knowledge: better keywords lead to better sources
Search keywords:
- school garden
- water use
- ____`,
                requiredSnippets: ["- soil moisture"],
                simulatedOutput: ["Keyword set improved."],
                enemyName: "Keyword Finch",
            },
            {
                slug: "outline-evidence",
                title: "Outline Evidence",
                titleCN: "提纲证据",
                description: "Add one evidence section into the project outline.",
                descriptionCN: "在项目提纲里补上证据部分。",
                initialCode: `# Knowledge: inquiry projects need structure, not just ideas
Outline:
1. problem
2. method
3. ____`,
                requiredSnippets: ["3. evidence"],
                simulatedOutput: ["Outline now includes evidence."],
                enemyName: "Outline Mouse",
            },
            {
                slug: "source-compare",
                title: "Source Compare",
                titleCN: "比较资料",
                description: "Add a next step after comparing two sources.",
                descriptionCN: "在比较两份资料后补一个下一步动作。",
                initialCode: `# Knowledge: research gets stronger when you compare sources and then verify
Compare:
- source A says one method is cheaper
- source B says one method saves more water
My next step: ____`,
                requiredSnippets: ["check which evidence is newer"],
                simulatedOutput: ["Comparison leads to a verification step."],
                enemyName: "Compare Raven",
            },
            {
                slug: "boss-project-checklist",
                title: "Boss Project Checklist",
                titleCN: "项目清单 Boss",
                description: "Finish the presentation checklist with your own conclusion.",
                descriptionCN: "用自己的结论补全展示清单。",
                initialCode: `# Knowledge: AI can support inquiry, but the final conclusion must stay yours
Presentation checklist:
- one question
- three pieces of evidence
- one chart
- ____`,
                requiredSnippets: ["- my own conclusion"],
                simulatedOutput: ["Presentation checklist completed."],
                enemyName: "Inquiry Titan",
            },
        ],
    },
    {
        chapterId: 804,
        runtime: "pattern",
        editorLanguage: "javascript",
        enemyAvatar: "Web",
        templates: [
            {
                slug: "query-input",
                title: "Query Input",
                titleCN: "选中输入框",
                description: "Select the input element by its id.",
                descriptionCN: "通过 id 选中这个输入框元素。",
                initialCode: `// Knowledge: DOM work begins by selecting the right element
const nameInput = document.querySelector("____")`,
                requiredSnippets: ['"#name"'],
                simulatedOutput: ["input selected"],
                enemyName: "DOM Finch",
            },
            {
                slug: "read-value",
                title: "Read Value",
                titleCN: "读取输入值",
                description: "Read the current value from the input.",
                descriptionCN: "读取输入框当前的值。",
                initialCode: `// Knowledge: user input usually comes from the value property
const name = nameInput.____`,
                requiredSnippets: ["value"],
                simulatedOutput: ["Luna"],
                enemyName: "Value Mole",
            },
            {
                slug: "set-text",
                title: "Set Text",
                titleCN: "更新文本",
                description: "Write Ready into the result area.",
                descriptionCN: "把 Ready 写进结果区域。",
                initialCode: `// Knowledge: textContent updates plain text in the page
result.textContent = ____`,
                requiredSnippets: ['"Ready"'],
                simulatedOutput: ["Ready"],
                enemyName: "Result Hare",
            },
            {
                slug: "prevent-submit",
                title: "Prevent Submit",
                titleCN: "阻止提交",
                description: "Stop the form from reloading the page.",
                descriptionCN: "阻止表单提交时刷新页面。",
                initialCode: `// Knowledge: preventDefault keeps custom form logic on the page
form.addEventListener("submit", (event) => {
  event.____()
})`,
                requiredSnippets: ["preventDefault"],
                simulatedOutput: ["default submit blocked"],
                enemyName: "Form Crab",
            },
            {
                slug: "boss-disable-button",
                title: "Boss Disable Button",
                titleCN: "禁用按钮 Boss",
                description: "Disable the button when the name is empty.",
                descriptionCN: "名字为空时禁用按钮。",
                initialCode: `// Knowledge: validation often drives button state
startButton.disabled = nameInput.value.trim() === ____`,
                requiredSnippets: ['""'],
                simulatedOutput: ["button disabled until input is filled"],
                enemyName: "DOM Titan",
            },
        ],
    },
    {
        chapterId: 805,
        runtime: "pattern",
        editorLanguage: "html",
        enemyAvatar: "Web",
        templates: [
            {
                slug: "media-query",
                title: "Media Query",
                titleCN: "媒体查询",
                description: "Use 768px as the mobile breakpoint.",
                descriptionCN: "使用 768px 作为移动端断点。",
                initialCode: `<!-- Knowledge: media queries let layout react to screen width -->
<style>
@media (max-width: ____) {
  .board {
    grid-template-columns: 1fr;
  }
}
</style>`,
                requiredSnippets: ["768px"],
                simulatedOutput: ["mobile rule added"],
                enemyName: "Screen Finch",
            },
            {
                slug: "flex-wrap",
                title: "Flex Wrap",
                titleCN: "弹性换行",
                description: "Allow toolbar items to wrap onto a new line.",
                descriptionCN: "让工具栏项目可以自动换行。",
                initialCode: `<!-- Knowledge: wrapping prevents controls from overflowing -->
<style>
.toolbar {
  display: flex;
  ____: wrap;
}
</style>`,
                requiredSnippets: ["flex-wrap"],
                simulatedOutput: ["toolbar can wrap"],
                enemyName: "Wrap Mouse",
            },
            {
                slug: "image-scale",
                title: "Scale Image",
                titleCN: "图片自适应",
                description: "Keep the image inside the card width.",
                descriptionCN: "让图片始终待在卡片宽度范围内。",
                initialCode: `<!-- Knowledge: flexible media should scale with its container -->
<style>
.hero img {
  max-width: ____;
  height: auto;
}
</style>`,
                requiredSnippets: ["100%"],
                simulatedOutput: ["image scales with the card"],
                enemyName: "Scale Rabbit",
            },
            {
                slug: "auto-fit-grid",
                title: "Auto Fit Grid",
                titleCN: "自动适配网格",
                description: "Use auto-fit so cards fill the available space.",
                descriptionCN: "使用 auto-fit，让卡片自动填满可用空间。",
                initialCode: `<!-- Knowledge: auto-fit helps grids adapt without many manual breakpoints -->
<style>
.cards {
  display: grid;
  grid-template-columns: repeat(____, minmax(180px, 1fr));
}
</style>`,
                requiredSnippets: ["auto-fit"],
                simulatedOutput: ["cards grid adapts to width"],
                enemyName: "Grid Otter",
            },
            {
                slug: "boss-minmax-card",
                title: "Boss Minmax Card",
                titleCN: "卡片宽度 Boss",
                description: "Set the minimum card width to 220px in the responsive grid.",
                descriptionCN: "把响应式网格里的最小卡片宽度设为 220px。",
                initialCode: `<!-- Knowledge: minmax keeps cards readable while the grid stays flexible -->
<style>
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(____, 1fr));
}
</style>`,
                requiredSnippets: ["220px"],
                simulatedOutput: ["chapter grid stays readable"],
                enemyName: "Responsive Titan",
            },
        ],
    },
    {
        chapterId: 903,
        runtime: "pattern",
        editorLanguage: "sql",
        enemyAvatar: "MySQL",
        templates: [
            {
                slug: "foreign-key",
                title: "Foreign Key",
                titleCN: "外键关联",
                description: "Link student_id to the students table.",
                descriptionCN: "把 student_id 关联到 students 表。",
                initialCode: `-- Knowledge: foreign keys protect the relationship between tables
CREATE TABLE scores (
  id INT PRIMARY KEY,
  student_id INT,
  FOREIGN KEY (student_id) REFERENCES students(____)
);`,
                requiredSnippets: ["id"],
                simulatedOutput: ["Foreign key created."],
                enemyName: "Key Mole",
            },
            {
                slug: "join-score",
                title: "Join Score",
                titleCN: "连接分数表",
                description: "Use the student_id field to join scores to students.",
                descriptionCN: "使用 student_id 字段把 scores 连接到 students。",
                initialCode: `-- Knowledge: joins connect related rows across tables
SELECT students.name, scores.score
FROM students
JOIN scores ON students.id = scores.____;`,
                requiredSnippets: ["student_id"],
                simulatedOutput: ["Joined names with scores."],
                enemyName: "Join Finch",
            },
            {
                slug: "left-join-class",
                title: "Left Join Class",
                titleCN: "左连接班级",
                description: "Keep all students even if some have no class row yet.",
                descriptionCN: "即使有学生暂时没有班级记录，也要把他们保留下来。",
                initialCode: `-- Knowledge: left join keeps the rows on the left table
SELECT students.name, classes.title
FROM students
____ JOIN classes ON students.class_id = classes.id;`,
                requiredSnippets: ["LEFT"],
                simulatedOutput: ["All students kept in the result."],
                enemyName: "Class Hare",
            },
            {
                slug: "group-by-class",
                title: "Group by Class",
                titleCN: "按班级统计",
                description: "Group the student count by class_id.",
                descriptionCN: "按 class_id 统计学生数量。",
                initialCode: `-- Knowledge: group by collects rows that share one key
SELECT class_id, COUNT(*)
FROM students
GROUP BY ____;`,
                requiredSnippets: ["class_id"],
                simulatedOutput: ["Student counts grouped by class."],
                enemyName: "Count Raven",
            },
            {
                slug: "boss-three-table-join",
                title: "Boss Three Table Join",
                titleCN: "三表连接 Boss",
                description: "Finish the join from enrollments to courses.",
                descriptionCN: "补全 enrollments 到 courses 的连接。",
                initialCode: `-- Knowledge: many-to-many data often needs a middle table plus two joins
SELECT students.name, courses.title
FROM enrollments
JOIN students ON enrollments.student_id = students.id
JOIN courses ON enrollments.course_id = courses.____;`,
                requiredSnippets: ["id"],
                simulatedOutput: ["Three-table relation connected."],
                enemyName: "Relation Titan",
            },
        ],
    },
    {
        chapterId: 904,
        runtime: "pattern",
        editorLanguage: "sql",
        enemyAvatar: "MySQL",
        templates: [
            {
                slug: "create-index",
                title: "Create Index",
                titleCN: "创建索引",
                description: "Create an index on the student name column.",
                descriptionCN: "给学生姓名这一列创建索引。",
                initialCode: `-- Knowledge: indexes speed up lookups on the columns you search often
CREATE INDEX idx_students_name ON students(____);`,
                requiredSnippets: ["name"],
                simulatedOutput: ["Index created."],
                enemyName: "Index Fox",
            },
            {
                slug: "start-transaction",
                title: "Start Transaction",
                titleCN: "开始事务",
                description: "Start a transaction before the batch update.",
                descriptionCN: "在批量更新前先开启事务。",
                initialCode: `-- Knowledge: transactions protect multi-step changes
____ TRANSACTION;`,
                requiredSnippets: ["START"],
                simulatedOutput: ["Transaction started."],
                enemyName: "Txn Finch",
            },
            {
                slug: "safe-update-where",
                title: "Safe Update",
                titleCN: "安全更新",
                description: "Use the id condition so only one row is updated.",
                descriptionCN: "使用 id 条件，让更新只影响一行。",
                initialCode: `-- Knowledge: every update should know exactly which rows it touches
UPDATE students
SET level = 2
WHERE ____ = 7;`,
                requiredSnippets: ["id"],
                simulatedOutput: ["One row targeted safely."],
                enemyName: "Guard Hare",
            },
            {
                slug: "rollback-change",
                title: "Rollback Change",
                titleCN: "回滚修改",
                description: "Undo the transaction when the result looks wrong.",
                descriptionCN: "当结果不对时撤销这次事务。",
                initialCode: `-- Knowledge: rollback gives you a safe way back
____;`,
                requiredSnippets: ["ROLLBACK"],
                simulatedOutput: ["Changes rolled back."],
                enemyName: "Undo Raven",
            },
            {
                slug: "boss-commit-batch",
                title: "Boss Commit Batch",
                titleCN: "提交事务 Boss",
                description: "Commit the transaction after checking the batch update.",
                descriptionCN: "检查批量更新后提交事务。",
                initialCode: `-- Knowledge: commit only after you know the whole transaction is correct
____;`,
                requiredSnippets: ["COMMIT"],
                simulatedOutput: ["Transaction committed."],
                enemyName: "Safety Titan",
            },
        ],
    },
    {
        chapterId: 1003,
        runtime: "pattern",
        editorLanguage: "prompt",
        enemyAvatar: "Shield",
        templates: [
            {
                slug: "expire-tokens",
                title: "Expire Tokens",
                titleCN: "令牌过期",
                description: "Add one more auth rule for old tokens.",
                descriptionCN: "给认证规则再补一条旧令牌处理方式。",
                initialCode: `# Knowledge: access control needs both login checks and session boundaries
Web defense checklist:
- require login
- verify permission
- ____`,
                requiredSnippets: ["- expire old tokens"],
                simulatedOutput: ["Auth checklist strengthened."],
                enemyName: "Token Finch",
            },
            {
                slug: "parameterized-query",
                title: "Parameterized Query",
                titleCN: "参数化查询",
                description: "Use the safer query style for user input.",
                descriptionCN: "对用户输入使用更安全的查询方式。",
                initialCode: `# Knowledge: SQL safety starts by separating data from query structure
Login rule:
Use ____ queries, never build SQL with raw input.`,
                requiredSnippets: ["parameterized"],
                simulatedOutput: ["SQL rule is now safer."],
                enemyName: "Query Mole",
            },
            {
                slug: "escape-html",
                title: "Escape HTML",
                titleCN: "转义 HTML",
                description: "Escape the right thing before rendering comments.",
                descriptionCN: "在渲染评论前先转义正确的内容。",
                initialCode: `# Knowledge: output safety matters as much as input safety
Comment rule:
Escape ____ before rendering user text.`,
                requiredSnippets: ["HTML"],
                simulatedOutput: ["Rendering rule updated."],
                enemyName: "Escape Bat",
            },
            {
                slug: "slow-down-login",
                title: "Slow Down Login",
                titleCN: "限制暴力尝试",
                description: "Add one response for too many failed logins.",
                descriptionCN: "给登录失败过多的情况补一条处理方式。",
                initialCode: `# Knowledge: rate limits buy time against repeated abuse
Protection:
After too many failed logins, ____ the request.`,
                requiredSnippets: ["slow down"],
                simulatedOutput: ["Rate-limit rule added."],
                enemyName: "Throttle Hare",
            },
            {
                slug: "boss-patch-weak-point",
                title: "Boss Patch Weak Point",
                titleCN: "修补漏洞 Boss",
                description: "Finish the last step of a good defense response.",
                descriptionCN: "补全一次良好防护响应的最后一步。",
                initialCode: `# Knowledge: incident response must end with a real fix
Incident response:
1. block abuse
2. keep logs
3. notify owner
4. ____`,
                requiredSnippets: ["4. patch the weak point"],
                simulatedOutput: ["Defense response completed."],
                enemyName: "Shield Titan",
            },
        ],
    },
    {
        chapterId: 1004,
        runtime: "pattern",
        editorLanguage: "bash",
        enemyAvatar: "SOC",
        templates: [
            {
                slug: "tail-log",
                title: "Tail Log",
                titleCN: "查看日志尾部",
                description: "Show the last 50 lines of the app log.",
                descriptionCN: "查看应用日志最后 50 行。",
                initialCode: `tail -n ____ app.log`,
                requiredSnippets: ["50"],
                simulatedOutput: ["Last 50 log lines displayed."],
                enemyName: "Tail Finch",
            },
            {
                slug: "grep-error",
                title: "Grep Error",
                titleCN: "筛出错误行",
                description: "Search the log for ERROR lines with line numbers.",
                descriptionCN: "带上行号筛出日志里的 ERROR 行。",
                initialCode: `grep -n "____" app.log`,
                requiredSnippets: ["ERROR"],
                simulatedOutput: ["Error lines found."],
                enemyName: "Grep Mole",
            },
            {
                slug: "service-journal",
                title: "Service Journal",
                titleCN: "查看服务日志",
                description: "Read the latest 100 lines for game-backend.",
                descriptionCN: "查看 game-backend 最近 100 行日志。",
                initialCode: `journalctl -u ____ -n 100`,
                requiredSnippets: ["game-backend"],
                simulatedOutput: ["Service journal opened."],
                enemyName: "Journal Hare",
            },
            {
                slug: "copy-evidence",
                title: "Copy Evidence",
                titleCN: "复制证据日志",
                description: "Copy app.log into an incident evidence file.",
                descriptionCN: "把 app.log 复制成一份事故证据文件。",
                initialCode: `cp app.log ____`,
                requiredSnippets: ["incident-app.log"],
                simulatedOutput: ["Evidence file copied."],
                enemyName: "Copy Raven",
            },
            {
                slug: "boss-pack-logs",
                title: "Boss Pack Logs",
                titleCN: "打包日志 Boss",
                description: "Pack the logs folder into one incident archive.",
                descriptionCN: "把 logs 文件夹打包成一份事故归档。",
                initialCode: `tar -czf ____ logs/`,
                requiredSnippets: ["incident-pack.tar.gz"],
                simulatedOutput: ["Incident archive created."],
                enemyName: "Response Titan",
            },
        ],
    },
];

export const EXTRA_LEVELS: Level[] = [...EXTRA_CHAPTER_PACKS, ...ADVANCED_EXPANSION_PACKS, ...STAGE_TWO_PACKS].flatMap(
    buildChapterLevels,
);
