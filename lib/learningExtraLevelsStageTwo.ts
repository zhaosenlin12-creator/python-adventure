import type { Level } from "./levels";

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

function lesson(
    slug: string,
    title: string,
    titleCN: string,
    description: string,
    descriptionCN: string,
    initialCode: string,
    requiredSnippets: string[],
    simulatedOutput: string[],
    enemyName: string,
    knowledgeHintCN?: string,
): LevelTemplate {
    return {
        slug,
        title,
        titleCN,
        description,
        descriptionCN,
        initialCode,
        requiredSnippets,
        simulatedOutput,
        enemyName,
        knowledgeHintCN,
    };
}

function pack(
    chapterId: number,
    editorLanguage: EditorLanguage,
    enemyAvatar: string,
    templates: LevelTemplate[],
    runtime: Runtime = "pattern",
): ChapterPack {
    return {
        chapterId,
        runtime,
        editorLanguage,
        enemyAvatar,
        templates,
    };
}

export const STAGE_TWO_PACKS: ChapterPack[] = [
    pack(105, "cpp", "C++", [
        lesson(
            "sum-loop",
            "Sum Loop",
            "循环求和",
            "Finish the loop boundary so every score is added once.",
            "补全循环边界，让每个分数都被加一次。",
            `// Knowledge: algorithms begin with clear loop ranges
int total = 0;
for (int i = 0; i < scores.____(); i++) {
  total += scores[i];
}`,
            ["scores.size()"],
            ["sum complete"],
            "Loop Beetle",
        ),
        lesson(
            "max-score",
            "Max Score",
            "最大分数",
            "Use std::max to keep the best score.",
            "用 std::max 保留当前最高分。",
            `// Knowledge: update one clear best value while scanning
int best = 0;
for (int score : scores) {
  best = std::____(best, score);
}`,
            ["std::max(best, score)"],
            ["best score updated"],
            "Peak Lynx",
        ),
        lesson(
            "sort-asc",
            "Sort Ascending",
            "升序排序",
            "Sort the vector from small to large.",
            "把向量从小到大排序。",
            `// Knowledge: standard algorithms save you from rewriting common steps
std::vector<int> nums = {6, 2, 4};
std::sort(nums.begin(), nums.____());`,
            ["nums.end()"],
            ["2 4 6"],
            "Sort Moth",
        ),
        lesson(
            "binary-search",
            "Binary Search",
            "二分查找",
            "Search for 7 in the sorted vector.",
            "在已排序向量里查找数字 7。",
            `// Knowledge: some algorithms expect sorted input first
bool found = std::binary_search(nums.begin(), nums.end(), ____);`,
            ["7"],
            ["found = true"],
            "Search Hawk",
        ),
        lesson(
            "boss-lower-bound",
            "Boss Lower Bound",
            "定位下界 Boss",
            "Use lower_bound to find where 7 should appear.",
            "用 lower_bound 找到 7 应该出现的位置。",
            `// Knowledge: stronger algorithms answer more than just yes or no
auto it = std::lower_bound(nums.begin(), nums.end(), ____);`,
            ["7"],
            ["iterator points to 7"],
            "Algorithm Titan",
        ),
    ]),
    pack(106, "cpp", "C++", [
        lesson(
            "typename-template",
            "Template Header",
            "模板头部",
            "Write the template header for a generic function.",
            "写出泛型函数需要的模板头部。",
            `// Knowledge: templates reuse one pattern across many types
____
T firstItem(const std::vector<T>& items) {
  return items[0];
}`,
            ["template <typename T>"],
            ["generic header ready"],
            "Template Finch",
        ),
        lesson(
            "pair-first",
            "Pair First",
            "读取 pair 首项",
            "Read the reward name from the pair.",
            "从 pair 中读取奖励名称。",
            `// Knowledge: pair stores two related values together
std::pair<std::string, int> reward = {"gem", 8};
std::cout << reward.____;`,
            ["reward.first"],
            ["gem"],
            "Pair Rabbit",
        ),
        lesson(
            "auto-loop",
            "Auto Loop",
            "auto 遍历",
            "Use auto in the range loop header.",
            "在范围循环里用 auto 简化类型。",
            `// Knowledge: auto keeps code lighter when the type is already obvious
for (const ____& name : names) {
  std::cout << name;
}`,
            ["auto"],
            ["names printed"],
            "Auto Sparrow",
        ),
        lesson(
            "swap-values",
            "Swap Values",
            "交换变量",
            "Use the standard swap helper.",
            "使用标准库的交换工具。",
            `// Knowledge: generic helpers often already exist in the standard library
int a = 3;
int b = 8;
std::____(a, b);`,
            ["swap(a, b)"],
            ["a=8, b=3"],
            "Tool Fox",
        ),
        lesson(
            "boss-generic-call",
            "Boss Generic Call",
            "泛型调用 Boss",
            "Call the generic helper with a vector of words.",
            "用单词向量调用这个泛型工具函数。",
            `// Knowledge: after defining a pattern, use it on real data
std::vector<std::string> words = {"code", "quest"};
std::cout << firstItem(____);`,
            ["words"],
            ["code"],
            "Template Titan",
        ),
    ]),
    pack(107, "cpp", "C++", [
        lesson(
            "const-ref",
            "Const Reference",
            "常量引用",
            "Mark the parameter as a const reference.",
            "把参数声明成常量引用。",
            `// Knowledge: const references avoid copies and protect data
void showName(____ std::string& name) {
  std::cout << name;
}`,
            ["const"],
            ["safe parameter ready"],
            "Guard Finch",
        ),
        lesson(
            "null-check",
            "Null Check",
            "空指针检查",
            "Check that ptr is not null before reading it.",
            "读取前先判断 ptr 不是空指针。",
            `// Knowledge: unsafe pointers must be checked before use
if (ptr ____ nullptr) {
  std::cout << *ptr;
}`,
            ["!= nullptr"],
            ["pointer safe"],
            "Null Crab",
        ),
        lesson(
            "empty-guard",
            "Empty Guard",
            "空容器保护",
            "Check whether the vector is empty.",
            "先判断向量是不是空的。",
            `// Knowledge: boundary checks often start with the empty case
if (names.____()) {
  return;
}`,
            ["empty()"],
            ["empty case handled"],
            "Boundary Beetle",
        ),
        lesson(
            "index-guard",
            "Index Guard",
            "下标边界",
            "Keep the read only when the index stays inside the vector size.",
            "只有下标在范围内时才读取向量内容。",
            `// Knowledge: good boundary logic protects both low and high edges
if (index >= 0 && index < nums.____()) {
  std::cout << nums[index];
}`,
            ["nums.size()"],
            ["index safe"],
            "Range Lynx",
        ),
        lesson(
            "boss-at-read",
            "Boss Safe Read",
            "安全读取 Boss",
            "Use at to read the second item more safely.",
            "用 at 更安全地读取第二个元素。",
            `// Knowledge: some APIs make out-of-range mistakes easier to notice
std::cout << names.____(1);`,
            ["at(1)"],
            ["safe read ready"],
            "Safety Titan",
        ),
    ]),
    pack(108, "cpp", "C++", [
        lesson(
            "struct-hp",
            "Struct HP",
            "结构体生命值",
            "Declare the hp field inside the Player struct.",
            "在 Player 结构体里声明 hp 字段。",
            `// Knowledge: system design starts with a clear data model
struct Player {
  std::string name;
  int ____;
};`,
            ["hp"],
            ["field ready"],
            "Model Ant",
        ),
        lesson(
            "player-ctor",
            "Player Constructor",
            "玩家构造器",
            "Pass hp into the initializer list.",
            "把 hp 放进初始化列表。",
            `// Knowledge: constructors connect incoming values with stable object state
Player(std::string name, int hp) : name(name), hp(____) {}`,
            ["hp"],
            ["constructor linked"],
            "Ctor Hare",
        ),
        lesson(
            "team-push",
            "Push Player",
            "加入队伍",
            "Push one Player into the team vector.",
            "把一个 Player 加进队伍向量。",
            `// Knowledge: projects are built from many small objects working together
team.push_back(Player("Luna", ____));`,
            ["100"],
            ["player added"],
            "Team Yak",
        ),
        lesson(
            "alive-count",
            "Alive Count",
            "存活计数",
            "Increase alive only when hp is above zero.",
            "只有 hp 大于 0 时才增加存活数。",
            `// Knowledge: project logic often means counting with one clear condition
for (const auto& player : team) {
  if (player.hp > ____ ) {
    alive++;
  }
}`,
            ["0"],
            ["alive count updated"],
            "Arena Raven",
        ),
        lesson(
            "boss-find-player",
            "Boss Find Player",
            "查找玩家 Boss",
            "Use find_if to locate Luna by name.",
            "用 find_if 按名字找到 Luna。",
            `// Knowledge: system code gets easier when you search by clear rules
auto it = std::find_if(team.begin(), team.end(), [](const Player& player) {
  return player.name == "____";
});`,
            ["Luna"],
            ["player found"],
            "Project Titan",
        ),
    ]),
    pack(205, "java", "Java", [
        lesson(
            "new-file",
            "New File",
            "创建文件对象",
            "Create a File object for notes.txt.",
            "为 notes.txt 创建一个 File 对象。",
            `// Knowledge: file work starts by modelling the file path clearly
File file = new File(____);`,
            ['"notes.txt"'],
            ["file ready"],
            "File Finch",
        ),
        lesson(
            "open-try",
            "Open Try",
            "开始 try 块",
            "Start a try block before reading the file.",
            "读取文件前先开启 try 块。",
            `// Knowledge: risky operations should live inside a safe error boundary
____ {
  String text = Files.readString(path);
}`,
            ["try"],
            ["try block opened"],
            "Try Beetle",
        ),
        lesson(
            "catch-io",
            "Catch IO",
            "捕获 IO 异常",
            "Catch IOException when file reading fails.",
            "文件读取失败时捕获 IOException。",
            `// Knowledge: exceptions name what kind of failure happened
catch (____ e) {
  System.out.println("read failed");
}`,
            ["IOException"],
            ["IOException handled"],
            "Catch Moth",
        ),
        lesson(
            "read-string",
            "Read String",
            "读取文本",
            "Use Files.readString on the path.",
            "对 path 使用 Files.readString。",
            `// Knowledge: use library helpers to keep file code short and readable
String text = Files.____(path);`,
            ["readString(path)"],
            ["text loaded"],
            "Read Lynx",
        ),
        lesson(
            "boss-parse-number",
            "Boss Parse Number",
            "解析数字 Boss",
            "Parse the number from text inside the safe block.",
            "在安全代码块中把 text 解析成数字。",
            `// Knowledge: safe programs prepare for parse errors too
int level = Integer.____(text);`,
            ["parseInt(text)"],
            ["level parsed"],
            "Exception Titan",
        ),
    ]),
    pack(206, "java", "Java", [
        lesson(
            "list-string",
            "String List",
            "字符串列表",
            "Declare a list that stores String values.",
            "声明一个存放 String 的列表。",
            `// Knowledge: generics keep collection contents explicit
List<____> names = new ArrayList<>();`,
            ["String"],
            ["list ready"],
            "Generic Finch",
        ),
        lesson(
            "map-score",
            "Score Map",
            "分数映射",
            "Declare a map from String to Integer.",
            "声明从 String 到 Integer 的映射。",
            `// Knowledge: type-safe maps make key-value data easier to trust
Map<String, ____> scores = new HashMap<>();`,
            ["Integer"],
            ["map ready"],
            "Map Lynx",
        ),
        lesson(
            "generic-method",
            "Generic Method",
            "泛型方法",
            "Write the type parameter for this helper method.",
            "给这个工具方法写出类型参数。",
            `// Knowledge: generic methods keep one rule usable for many data types
public static <____> T first(List<T> items) {
  return items.get(0);
}`,
            ["T"],
            ["generic method ready"],
            "Method Hare",
        ),
        lesson(
            "queue-offer",
            "Queue Offer",
            "队列加入",
            "Offer one task into the queue.",
            "把一个任务放进队列。",
            `// Knowledge: different collections solve different flow problems
Queue<String> queue = new LinkedList<>();
queue.____("task-1");`,
            ['offer("task-1")'],
            ["task queued"],
            "Queue Otter",
        ),
        lesson(
            "boss-set-unique",
            "Boss Unique Set",
            "去重集合 Boss",
            "Create a set for unique tag names.",
            "创建一个存放唯一标签的集合。",
            `// Knowledge: sets are useful when duplicates should disappear
Set<String> tags = new ____<>();`,
            ["HashSet"],
            ["unique tag set ready"],
            "Generic Titan",
        ),
    ]),
    pack(207, "java", "Java", [
        lesson(
            "stream-start",
            "Start Stream",
            "开始 Stream",
            "Begin the stream pipeline from scores.",
            "从 scores 开始这条 Stream 流。",
            `// Knowledge: stream pipelines read best as one stage at a time
var result = scores.____()
  .filter(score -> score >= 60);`,
            ["stream()"],
            ["pipeline started"],
            "Stream Finch",
        ),
        lesson(
            "filter-pass",
            "Filter Pass",
            "筛选及格",
            "Keep only scores that are at least 60.",
            "只保留大于等于 60 的分数。",
            `// Knowledge: filter removes data that does not match one rule
scores.stream().____(score -> score >= 60);`,
            ["filter(score -> score >= 60)"],
            ["passing scores kept"],
            "Filter Moth",
        ),
        lesson(
            "map-length",
            "Map Length",
            "映射长度",
            "Map each name to its length.",
            "把每个名字映射成长度。",
            `// Knowledge: map transforms each item into a new form
names.stream().____(String::length);`,
            ["map(String::length)"],
            ["name lengths ready"],
            "Map Fox",
        ),
        lesson(
            "collect-list",
            "Collect List",
            "收集列表",
            "Collect the filtered names into a list.",
            "把筛选后的名字收集成列表。",
            `// Knowledge: collect ends the pipeline by choosing the final result shape
names.stream().filter(name -> name.startsWith("L")).collect(____);`,
            ["Collectors.toList()"],
            ["list collected"],
            "Collect Hare",
        ),
        lesson(
            "boss-sum-stream",
            "Boss Sum Stream",
            "求和流 Boss",
            "Use mapToInt and sum to add the values.",
            "用 mapToInt 和 sum 完成求和。",
            `// Knowledge: some pipelines end in one summarized value
int total = scores.stream().mapToInt(Integer::intValue).____();`,
            ["sum()"],
            ["total ready"],
            "Stream Titan",
        ),
    ]),
    pack(208, "java", "Java", [
        lesson(
            "service-field",
            "Service Field",
            "服务字段",
            "Declare the final service field.",
            "声明这个 final 服务字段。",
            `// Knowledge: projects stay readable when each role has its own object
private final ScoreService ____;`,
            ["service"],
            ["service field ready"],
            "Field Beetle",
        ),
        lesson(
            "wire-service",
            "Wire Service",
            "连接服务",
            "Assign the service inside the constructor.",
            "在构造函数里把 service 连接起来。",
            `// Knowledge: constructors connect project parts together
public ScoreController(ScoreService service) {
  this.service = ____;
}`,
            ["service"],
            ["service wired"],
            "Wire Fox",
        ),
        lesson(
            "call-summary",
            "Call Summary",
            "调用汇总",
            "Call the service to load the score summary.",
            "调用服务加载分数摘要。",
            `// Knowledge: controllers ask services for work instead of doing everything themselves
ScoreSummary summary = service.____();`,
            ["loadSummary()"],
            ["summary loaded"],
            "Call Hare",
        ),
        lesson(
            "new-response",
            "New Response",
            "创建响应对象",
            "Create one response object with label and total.",
            "创建一个带标签和总分的响应对象。",
            `// Knowledge: response objects keep returned data structured
ScoreResponse body = new ScoreResponse("ok", ____);`,
            ["summary.total()"],
            ["response ready"],
            "Response Raven",
        ),
        lesson(
            "boss-return-body",
            "Boss Return Body",
            "返回结果 Boss",
            "Return the response body from the controller method.",
            "从控制器方法里返回响应对象。",
            `// Knowledge: project flow ends by returning one clear result
____ body;`,
            ["return"],
            ["body returned"],
            "Service Titan",
        ),
    ]),
    pack(305, "go", "Go", [
        lesson(
            "if-err",
            "If Err",
            "判断错误",
            "Check err before continuing.",
            "继续前先判断 err。",
            `// Knowledge: Go keeps errors visible in the main flow
if ____ != nil {
    return err
}`,
            ["err"],
            ["error path handled"],
            "Err Finch",
        ),
        lesson(
            "return-err",
            "Return Err",
            "返回错误",
            "Return the error with the zero value.",
            "和零值一起返回错误。",
            `// Knowledge: functions should expose failure as clearly as success
if err != nil {
    return 0, ____
}`,
            ["err"],
            ["error returned"],
            "Return Moth",
        ),
        lesson(
            "new-error",
            "New Error",
            "创建错误",
            "Create a new error for empty input.",
            "为输入为空创建一个新错误。",
            `// Knowledge: clear error messages help the caller react correctly
return errors.____("empty input")`,
            ['New("empty input")'],
            ["empty input error"],
            "Error Crab",
        ),
        lesson(
            "wrap-error",
            "Wrap Error",
            "包装错误",
            "Wrap the lower error with more context.",
            "给底层错误补上更多上下文。",
            `// Knowledge: wrapped errors explain where a failure came from
return fmt.____("load config: %w", err)`,
            ['Errorf("load config: %w", err)'],
            ["wrapped error ready"],
            "Wrap Lynx",
        ),
        lesson(
            "boss-parse-check",
            "Boss Parse Check",
            "解析保护 Boss",
            "Return early when parsing fails.",
            "解析失败时立刻返回。",
            `// Knowledge: error checks belong right next to risky operations
value, err := strconv.Atoi(text)
if ____ != nil {
    return 0, err
}`,
            ["err"],
            ["parse guarded"],
            "Error Titan",
        ),
    ]),
    pack(306, "go", "Go", [
        lesson(
            "test-header",
            "Test Header",
            "测试函数头",
            "Write the test function header.",
            "写出测试函数头。",
            `// Knowledge: tests describe one expectation in executable form
func ____ (t *testing.T) {
}`,
            ["TestAdd"],
            ["test header ready"],
            "Test Finch",
        ),
        lesson(
            "got-value",
            "Got Value",
            "保存结果",
            "Store the Add result into got.",
            "把 Add 的结果保存到 got。",
            `// Knowledge: tests compare a real result with an expected one
____ := Add(1, 2)`,
            ["got"],
            ["got saved"],
            "Value Hare",
        ),
        lesson(
            "if-got",
            "Check Result",
            "检查结果",
            "Compare got with 3.",
            "把 got 和 3 进行比较。",
            `// Knowledge: every test should say what exact value it expects
if got ____ 3 {
    t.Fatal("wrong answer")
}`,
            ["!= 3"],
            ["comparison added"],
            "Check Moth",
        ),
        lesson(
            "fatal-msg",
            "Fatal Message",
            "失败信息",
            "Use Fatalf to print the unexpected result.",
            "用 Fatalf 输出错误结果。",
            `// Knowledge: good tests explain what failed, not only that it failed
t.____("want 3, got %d", got)`,
            ['Fatalf("want 3, got %d", got)'],
            ["failure message ready"],
            "Fail Raven",
        ),
        lesson(
            "boss-table-tests",
            "Boss Table Tests",
            "表格测试 Boss",
            "Start the tests slice for a table test.",
            "为表格测试写出 tests 切片开头。",
            `// Knowledge: table tests help one rule cover many cases cleanly
____ := []struct {
    a int
    b int
    want int
}{}`,
            ["tests"],
            ["table test ready"],
            "Test Titan",
        ),
    ]),
    pack(307, "go", "Go", [
        lesson(
            "package-name",
            "Package Name",
            "包名",
            "Set the package name to scoreboard.",
            "把包名设置为 scoreboard。",
            `// Knowledge: package names describe one clear module boundary
package ____`,
            ["scoreboard"],
            ["package set"],
            "Package Finch",
        ),
        lesson(
            "export-type",
            "Export Type",
            "导出类型",
            "Name the type so other packages can use it.",
            "给类型起一个能被外部使用的名字。",
            `// Knowledge: exported names begin with a capital letter
type ____ struct {
    Name string
}`,
            ["ScoreCard"],
            ["type exported"],
            "Export Hare",
        ),
        lesson(
            "new-board",
            "New Board",
            "创建看板",
            "Write the exported constructor name.",
            "写出这个导出构造函数名字。",
            `// Knowledge: exported constructors give other packages a safe entry point
func ____() *Board {
    return &Board{}
}`,
            ["NewBoard"],
            ["constructor exported"],
            "Board Otter",
        ),
        lesson(
            "method-add",
            "Add Method",
            "新增方法",
            "Use the board receiver in the Add method.",
            "在 Add 方法里使用 board 接收者。",
            `// Knowledge: methods show which object owns the behaviour
func (b *Board) Add(name string) {
    b.items = append(b.items, name)
}`,
            ["(b *Board)"],
            ["method receiver ready"],
            "Method Fox",
        ),
        lesson(
            "boss-import-package",
            "Boss Import Package",
            "导入包 Boss",
            "Import the scoreboard package into main.",
            "在 main 中导入 scoreboard 包。",
            `// Knowledge: package boundaries become real when another file imports them
import "____"`,
            ["scoreboard"],
            ["package imported"],
            "Package Titan",
        ),
    ]),
    pack(308, "go", "Go", [
        lesson(
            "go-worker",
            "Run Worker",
            "启动协程工人",
            "Start the worker as a goroutine.",
            "把 worker 作为 goroutine 启动。",
            `// Knowledge: concurrency begins by running independent work in parallel
____ worker(jobs, results)`,
            ["go"],
            ["worker started"],
            "Worker Finch",
        ),
        lesson(
            "send-job",
            "Send Job",
            "发送任务",
            "Send one quest into jobs.",
            "把一个 quest 发送到 jobs 通道。",
            `// Knowledge: channels move tasks between concurrent parts
jobs <- "____"`,
            ["quest-1"],
            ["job sent"],
            "Channel Hare",
        ),
        lesson(
            "read-result",
            "Read Result",
            "读取结果",
            "Read one value from results.",
            "从 results 读取一个值。",
            `// Knowledge: receiving finishes one step of the task flow
result := <-____`,
            ["results"],
            ["result received"],
            "Result Moth",
        ),
        lesson(
            "summary-route",
            "Summary Route",
            "汇总路由",
            "Bind summaryHandler to /summary.",
            "把 summaryHandler 绑定到 /summary。",
            `// Knowledge: service projects connect routes to one handler per job
http.HandleFunc("/summary", ____)`,
            ["summaryHandler"],
            ["route bound"],
            "Route Raven",
        ),
        lesson(
            "boss-wait-group",
            "Boss Wait Group",
            "等待组 Boss",
            "Wait for all worker tasks to finish.",
            "等待所有 worker 任务完成。",
            `// Knowledge: concurrency still needs one clear finish line
wg.____()`,
            ["Wait"],
            ["workers joined"],
            "Concurrency Titan",
        ),
    ]),
    pack(405, "javascript", "Vue", [
        lesson(
            "history-mode",
            "History Mode",
            "历史模式",
            "Use createWebHistory in the router config.",
            "在路由配置里使用 createWebHistory。",
            `<!-- Knowledge: routed apps begin by choosing one navigation mode -->
const router = createRouter({
  history: ____(),
  routes,
})`,
            ["createWebHistory"],
            ["history mode ready"],
            "Route Finch",
        ),
        lesson(
            "route-record",
            "Route Record",
            "路由记录",
            "Set the path to /quests.",
            "把路径设置成 /quests。",
            `<!-- Knowledge: each route record maps one path to one page -->
{ path: "____", component: QuestPage }`,
            ["/quests"],
            ["route record ready"],
            "Path Hare",
        ),
        lesson(
            "router-link",
            "Router Link",
            "路由链接",
            "Link to the quests page.",
            "链接到 quests 页面。",
            `<!-- Knowledge: RouterLink keeps navigation inside the app -->
<RouterLink to="____">Quests</RouterLink>`,
            ["/quests"],
            ["link ready"],
            "Link Moth",
        ),
        lesson(
            "router-view",
            "Router View",
            "页面出口",
            "Render the page outlet.",
            "渲染页面出口组件。",
            `<!-- Knowledge: one routed layout needs one place for page content -->
<____ />`,
            ["RouterView"],
            ["page outlet ready"],
            "View Raven",
        ),
        lesson(
            "boss-route-param",
            "Boss Route Param",
            "路由参数 Boss",
            "Read the id route param.",
            "读取 id 这个路由参数。",
            `<!-- Knowledge: route params let one page adapt to many records -->
const route = useRoute()
const questId = route.params.____`,
            ["id"],
            ["route param ready"],
            "Router Titan",
        ),
    ]),
    pack(406, "javascript", "Vue", [
        lesson(
            "define-store",
            "Define Store",
            "定义仓库",
            "Write the store name quest.",
            "写出这个 store 的名字 quest。",
            `<!-- Knowledge: shared state starts from one named store -->
export const useQuestStore = defineStore("____", () => {
  return {}
})`,
            ["quest"],
            ["store defined"],
            "Store Finch",
        ),
        lesson(
            "quests-ref",
            "Quests Ref",
            "任务状态",
            "Create the quests ref array.",
            "创建 quests 这个 ref 数组。",
            `<!-- Knowledge: shared collections often live in one reactive array -->
const quests = ref(____)`,
            ["[]"],
            ["quests state ready"],
            "State Hare",
        ),
        lesson(
            "push-quest",
            "Push Quest",
            "加入任务",
            "Push the quest into the shared array.",
            "把 quest 加进共享数组。",
            `<!-- Knowledge: store actions are the safe place to change shared state -->
function addQuest(quest) {
  quests.value.____(quest)
}`,
            ["push"],
            ["quest pushed"],
            "Action Moth",
        ),
        lesson(
            "done-count",
            "Done Count",
            "完成数量",
            "Count the finished quests with computed.",
            "用 computed 统计已完成任务数。",
            `<!-- Knowledge: derived shared values should be computed, not copied -->
const doneCount = computed(() => quests.value.filter((quest) => quest.done).____)`,
            ["length"],
            ["done count ready"],
            "Count Raven",
        ),
        lesson(
            "boss-use-store",
            "Boss Use Store",
            "使用仓库 Boss",
            "Create the store instance inside the component.",
            "在组件里创建这个 store 实例。",
            `<!-- Knowledge: components read shared state through one store entry -->
const questStore = ____()`,
            ["useQuestStore"],
            ["store instance ready"],
            "Store Titan",
        ),
    ]),
    pack(407, "javascript", "Vue", [
        lesson(
            "loading-ref",
            "Loading Ref",
            "加载状态",
            "Create the loading ref.",
            "创建 loading 这个 ref。",
            `<!-- Knowledge: async pages should name the waiting state clearly -->
const loading = ref(____)`,
            ["false"],
            ["loading ref ready"],
            "Loading Finch",
        ),
        lesson(
            "fetch-data",
            "Fetch Data",
            "请求数据",
            "Fetch quests from the API route.",
            "从 API 路由请求 quests 数据。",
            `<!-- Knowledge: async data starts from one clear request -->
const response = await fetch("____")`,
            ["/api/quests"],
            ["request sent"],
            "Fetch Hare",
        ),
        lesson(
            "json-read",
            "Read JSON",
            "读取 JSON",
            "Read the JSON body from the response.",
            "从 response 中读取 JSON 数据。",
            `<!-- Knowledge: fetched data must be decoded before the page can use it -->
const data = await response.____()`,
            ["json"],
            ["json decoded"],
            "JSON Moth",
        ),
        lesson(
            "mounted-load",
            "Load On Mounted",
            "挂载时加载",
            "Call loadQuests in onMounted.",
            "在 onMounted 里调用 loadQuests。",
            `<!-- Knowledge: page data often loads when the component first appears -->
onMounted(____)`,
            ["loadQuests"],
            ["mounted hook ready"],
            "Mounted Raven",
        ),
        lesson(
            "boss-error-state",
            "Boss Error State",
            "错误状态 Boss",
            "Set the error message when loading fails.",
            "加载失败时设置错误信息。",
            `<!-- Knowledge: useful pages explain failure instead of silently stopping -->
catch (error) {
  errorMessage.value = "____"
}`,
            ["加载失败"],
            ["error state ready"],
            "Async Titan",
        ),
    ]),
    pack(408, "javascript", "Vue", [
        lesson(
            "card-loop",
            "Card Loop",
            "卡片循环",
            "Render every card with v-for.",
            "用 v-for 渲染每张卡片。",
            `<!-- Knowledge: dashboards often repeat one card pattern over shared data -->
<StatCard v-for="card in ____" :key="card.id" :label="card.label" />`,
            ["cards"],
            ["cards rendered"],
            "Card Finch",
        ),
        lesson(
            "bind-key",
            "Bind Key",
            "绑定 key",
            "Use card.id as the key.",
            "把 card.id 作为 key。",
            `<!-- Knowledge: stable keys keep list updates predictable -->
<StatCard v-for="card in cards" :key="card.____" />`,
            ["id"],
            ["key bound"],
            "Key Hare",
        ),
        lesson(
            "child-prop",
            "Child Prop",
            "子组件属性",
            "Pass total into the SummaryCard prop.",
            "把 total 传进 SummaryCard 的属性。",
            `<!-- Knowledge: dashboards stay readable when data is passed down clearly -->
<SummaryCard :total="____" />`,
            ["total"],
            ["prop passed"],
            "Prop Moth",
        ),
        lesson(
            "refresh-event",
            "Refresh Event",
            "刷新事件",
            "Listen for the refresh event.",
            "监听 refresh 事件。",
            `<!-- Knowledge: child actions should report upward through explicit events -->
<FilterBar @refresh="____" />`,
            ["loadDashboard"],
            ["refresh wired"],
            "Event Raven",
        ),
        lesson(
            "boss-filtered-cards",
            "Boss Filtered Cards",
            "筛选卡片 Boss",
            "Compute the visible cards by keyword.",
            "按 keyword 计算当前可见卡片。",
            `<!-- Knowledge: project dashboards work best when filtered views are derived, not duplicated -->
const visibleCards = computed(() => cards.value.filter((card) => card.title.includes(____.value)))`,
            ["keyword"],
            ["filtered cards ready"],
            "Dashboard Titan",
        ),
    ]),
    pack(505, "javascript", "React", [
        lesson(
            "name-state",
            "Name State",
            "名字状态",
            "Create state for the name field.",
            "为名字输入框创建状态。",
            `// Knowledge: controlled forms start from explicit state
const [name, setName] = useState(____)`,
            ['""'],
            ["name state ready"],
            "Form Finch",
        ),
        lesson(
            "bind-value",
            "Bind Value",
            "绑定值",
            "Bind the input value to name.",
            "把输入框的 value 绑定到 name。",
            `// Knowledge: the UI should read from the same state it updates
<input value={____} onChange={(event) => setName(event.target.value)} />`,
            ["name"],
            ["input bound"],
            "Value Hare",
        ),
        lesson(
            "change-handler",
            "Change Handler",
            "更新处理",
            "Read the current text from the event target.",
            "从事件对象里读取当前文本。",
            `// Knowledge: controlled inputs mirror one event value back into state
onChange={(event) => setName(event.target.____)}`,
            ["value"],
            ["handler ready"],
            "Change Moth",
        ),
        lesson(
            "prevent-submit",
            "Prevent Submit",
            "阻止提交",
            "Prevent the browser default submit action.",
            "阻止浏览器默认提交行为。",
            `// Knowledge: custom form flows usually keep the page in place
function handleSubmit(event) {
  event.____()
}`,
            ["preventDefault"],
            ["submit guarded"],
            "Submit Raven",
        ),
        lesson(
            "boss-validation",
            "Boss Validation",
            "表单校验 Boss",
            "Return the message when the name is empty.",
            "当名字为空时返回提示信息。",
            `// Knowledge: clear form feedback tells the user exactly what is missing
const message = name.trim() === "" ? "____" : ""`,
            ["请输入名字"],
            ["validation ready"],
            "Form Titan",
        ),
    ]),
    pack(506, "javascript", "React", [
        lesson(
            "load-effect",
            "Load Effect",
            "加载副作用",
            "Run loadQuests when the page first opens.",
            "页面首次打开时运行 loadQuests。",
            `// Knowledge: one effect can describe one page entry action
useEffect(() => {
  loadQuests()
}, [____])`,
            [""],
            ["effect ready"],
            "Effect Finch",
        ),
        lesson(
            "set-loading",
            "Set Loading",
            "设置加载态",
            "Set loading to true before the request.",
            "请求前把 loading 设为 true。",
            `// Knowledge: async views should mark waiting immediately
setLoading(____)`,
            ["true"],
            ["loading started"],
            "Loading Hare",
        ),
        lesson(
            "read-response-json",
            "Read Response JSON",
            "读取响应 JSON",
            "Decode the response body as JSON.",
            "把响应体解析成 JSON。",
            `// Knowledge: fetched data must be decoded before state can use it
const data = await response.____()`,
            ["json"],
            ["json decoded"],
            "Fetch Moth",
        ),
        lesson(
            "set-error",
            "Set Error",
            "设置错误",
            "Store the loading error message.",
            "保存加载失败提示。",
            `// Knowledge: failure UI needs its own explicit state too
setError("____")`,
            ["加载失败"],
            ["error saved"],
            "Error Raven",
        ),
        lesson(
            "boss-retry",
            "Boss Retry",
            "重试按钮 Boss",
            "Retry by calling loadQuests from the button.",
            "点击按钮时再次调用 loadQuests。",
            `// Knowledge: async pages feel stronger when users can try again
<button onClick={____}>Retry</button>`,
            ["loadQuests"],
            ["retry button ready"],
            "Fetch Titan",
        ),
    ]),
    pack(507, "javascript", "React", [
        lesson(
            "link-quests",
            "Link Quests",
            "链接到任务页",
            "Create a link to /quests.",
            "创建一个指向 /quests 的链接。",
            `// Knowledge: routed apps navigate by links instead of full page reloads
<Link to="____">Quests</Link>`,
            ["/quests"],
            ["link ready"],
            "Link Finch",
        ),
        lesson(
            "use-params",
            "Use Params",
            "读取参数",
            "Read the id route param.",
            "读取路由参数 id。",
            `// Knowledge: route params let one page handle many records
const { ____ } = useParams()`,
            ["id"],
            ["param ready"],
            "Param Hare",
        ),
        lesson(
            "render-outlet",
            "Render Outlet",
            "渲染出口",
            "Render the nested page outlet.",
            "渲染嵌套路由出口。",
            `// Knowledge: nested layouts need one outlet for their child pages
return <____ />`,
            ["Outlet"],
            ["outlet ready"],
            "Outlet Moth",
        ),
        lesson(
            "use-navigate",
            "Use Navigate",
            "使用跳转",
            "Create the navigate helper.",
            "创建 navigate 跳转方法。",
            `// Knowledge: some page actions need code-driven navigation
const navigate = ____()`,
            ["useNavigate"],
            ["navigate ready"],
            "Navigate Raven",
        ),
        lesson(
            "boss-go-home",
            "Boss Go Home",
            "返回首页 Boss",
            "Navigate back to /quests from the button.",
            "点击按钮时跳回 /quests。",
            `// Knowledge: route actions should still be explicit and easy to follow
<button onClick={() => navigate("____")}>Back</button>`,
            ["/quests"],
            ["back button ready"],
            "Router Titan",
        ),
    ]),
    pack(508, "javascript", "React", [
        lesson(
            "deferred-keyword",
            "Deferred Keyword",
            "延后关键词",
            "Create a deferred keyword from keyword.",
            "基于 keyword 创建一个延后值。",
            `// Knowledge: not every update needs to block the main interaction
const deferredKeyword = useDeferredValue(____)`,
            ["keyword"],
            ["deferred keyword ready"],
            "Smooth Finch",
        ),
        lesson(
            "start-transition",
            "Start Transition",
            "过渡更新",
            "Wrap the keyword update in startTransition.",
            "用 startTransition 包住关键词更新。",
            `// Knowledge: some updates can wait a little to keep typing smooth
startTransition(() => setKeyword(____))`,
            ["value"],
            ["transition ready"],
            "Transition Hare",
        ),
        lesson(
            "filter-deferred",
            "Filter Deferred",
            "用延后值筛选",
            "Filter quests with deferredKeyword.",
            "用 deferredKeyword 来筛选 quests。",
            `// Knowledge: filtering from deferred state can reduce visible lag
const visible = quests.filter((quest) => quest.name.includes(____))`,
            ["deferredKeyword"],
            ["filtered list ready"],
            "Filter Moth",
        ),
        lesson(
            "item-key",
            "Item Key",
            "列表 key",
            "Use item id as the stable key.",
            "把项目 id 作为稳定 key。",
            `// Knowledge: smooth large lists depend on stable row identity
itemKey={(index, data) => data[index].____}`,
            ["id"],
            ["item key ready"],
            "Key Raven",
        ),
        lesson(
            "boss-item-count",
            "Boss Item Count",
            "列表数量 Boss",
            "Set the list itemCount from visible.length.",
            "把列表 itemCount 设为 visible.length。",
            `// Knowledge: virtual lists still depend on exact counts and clear data flow
<FixedSizeList itemCount={____} itemSize={48} />`,
            ["visible.length"],
            ["virtual list ready"],
            "Smooth Titan",
        ),
    ]),
    pack(606, "prompt", "AI", [
        lesson(
            "allowed-tools",
            "Allowed Tools",
            "允许工具",
            "List the tools AI is allowed to use for this task.",
            "列出这次任务允许 AI 使用的工具。",
            `# Knowledge: a safe AI task says what tools are allowed before work starts
Allowed tools:
- ____
- browser`,
            ["- terminal"],
            ["tool list ready"],
            "Tool Finch",
        ),
        lesson(
            "terminal-job",
            "Terminal Job",
            "终端职责",
            "Tell AI what the terminal should be used for.",
            "说明终端应该负责什么工作。",
            `# Knowledge: tool choice should match the job, not happen by habit
Use terminal for: ____`,
            ["run tests"],
            ["terminal role defined"],
            "Scope Hare",
        ),
        lesson(
            "browser-job",
            "Browser Job",
            "浏览器职责",
            "Tell AI what the browser should verify.",
            "说明浏览器要验证什么内容。",
            `# Knowledge: browser tools are useful when layout and interaction matter
Use browser for: ____`,
            ["check page layout"],
            ["browser role defined"],
            "Vision Moth",
        ),
        lesson(
            "edit-scope",
            "Edit Scope",
            "修改范围",
            "Limit the edits to frontend files.",
            "把修改范围限制在前端文件里。",
            `# Knowledge: scope limits stop AI from wandering into risky areas
Edit scope: ____ only`,
            ["frontend files"],
            ["edit scope limited"],
            "Boundary Raven",
        ),
        lesson(
            "boss-tool-summary",
            "Boss Tool Summary",
            "工具总结 Boss",
            "Ask AI to summarize evidence after using tools.",
            "要求 AI 用完工具后总结证据。",
            `# Knowledge: tool use only helps when the result is turned back into evidence
After tools run:
- cite evidence
- ____`,
            ["- explain next step"],
            ["tool summary ready"],
            "Tool Titan",
        ),
    ]),
    pack(607, "prompt", "AI", [
        lesson(
            "source-file",
            "Source File",
            "来源文件",
            "Point AI to README.md as one source.",
            "把 README.md 指给 AI 当作一个来源。",
            `# Knowledge: evidence-based AI work starts from named sources
Source 1: ____`,
            ["README.md"],
            ["source named"],
            "Evidence Finch",
        ),
        lesson(
            "quote-fact",
            "Quote Fact",
            "引用事实",
            "Ask for one short quoted fact.",
            "要求给出一条简短引用事实。",
            `# Knowledge: evidence should include a short quote, not only a claim
Need:
- one short ____
- one explanation`,
            ["quote"],
            ["quote requested"],
            "Quote Hare",
        ),
        lesson(
            "mark-inference",
            "Mark Inference",
            "标记推断",
            "Label the guessed part as inference.",
            "把推测部分明确标为 inference。",
            `# Knowledge: strong answers separate evidence from inference
Inference: ____`,
            ["say this is only a guess"],
            ["inference separated"],
            "Inference Moth",
        ),
        lesson(
            "cross-check",
            "Cross Check",
            "交叉核查",
            "Add one cross-check step with tests.",
            "补上一条用测试交叉核查的步骤。",
            `# Knowledge: one source is better than none, but two checks are safer
Cross-check with: ____`,
            ["tests"],
            ["cross-check added"],
            "Check Raven",
        ),
        lesson(
            "boss-evidence-table",
            "Boss Evidence Table",
            "证据表 Boss",
            "Finish the final answer format with an evidence row.",
            "用一行 evidence 补全最终回答格式。",
            `# Knowledge: final reports should show evidence, inference, and next action
Final answer:
- evidence
- inference
- ____`,
            ["next action"],
            ["evidence table ready"],
            "Evidence Titan",
        ),
    ]),
    pack(608, "prompt", "AI", [
        lesson(
            "main-task",
            "Main Task",
            "主任务",
            "Write the main task at the top of the workflow.",
            "在工作流顶部写清主任务。",
            `# Knowledge: multi-agent work still starts from one shared goal
Main task: ____`,
            ["build the chapter dashboard"],
            ["main task ready"],
            "Agent Finch",
        ),
        lesson(
            "worker-a",
            "Worker A",
            "分工 A",
            "Assign Worker A the frontend files.",
            "把前端文件分给 Worker A。",
            `# Knowledge: delegation works best when ownership is explicit
Worker A owns: ____`,
            ["frontend files"],
            ["worker A scoped"],
            "Owner Hare",
        ),
        lesson(
            "worker-b",
            "Worker B",
            "分工 B",
            "Assign Worker B the tests.",
            "把测试任务分给 Worker B。",
            `# Knowledge: side tasks should move in parallel without overlapping writes
Worker B owns: ____`,
            ["tests"],
            ["worker B scoped"],
            "Split Moth",
        ),
        lesson(
            "integration-check",
            "Integration Check",
            "整合检查",
            "Add one integration step after both workers finish.",
            "在两位 worker 完成后补一条整合步骤。",
            `# Knowledge: parallel work still needs one explicit merge checkpoint
Integration check: ____`,
            ["run tests and review changes"],
            ["integration step ready"],
            "Merge Raven",
        ),
        lesson(
            "boss-stop-rule",
            "Boss Stop Rule",
            "停止规则 Boss",
            "Add one rule for when the workflow must stop and escalate.",
            "补一条必须停止并升级处理的规则。",
            `# Knowledge: safe AI workflows know when not to continue
Stop if: ____`,
            ["results conflict or evidence is missing"],
            ["stop rule ready"],
            "Agent Titan",
        ),
    ]),
    pack(706, "prompt", "Coach", [
        lesson(
            "label-ai-media",
            "Label AI Media",
            "标记 AI 内容",
            "Mark the image as AI-generated.",
            "把图片标记为 AI 生成。",
            `# Knowledge: media literacy starts with knowing how the content was made
Label: ____`,
            ["AI-generated image"],
            ["media labeled"],
            "Media Finch",
        ),
        lesson(
            "source-date",
            "Source Date",
            "查看日期",
            "Add a step to check the source date.",
            "补上一条检查来源日期的步骤。",
            `# Knowledge: newer sources are not always better, but date always matters
Check: ____`,
            ["source date"],
            ["date check added"],
            "Date Hare",
        ),
        lesson(
            "creator-question",
            "Creator Question",
            "追问作者",
            "Ask who created the content.",
            "追问这段内容是谁制作的。",
            `# Knowledge: trust changes when you know the maker and the channel
Ask: ____`,
            ["who created this"],
            ["creator question ready"],
            "Source Moth",
        ),
        lesson(
            "compare-notes",
            "Compare Notes",
            "对照笔记",
            "Compare the claim with class notes.",
            "把这个说法和课堂笔记对照。",
            `# Knowledge: class notes are a useful anchor when online content feels uncertain
Cross-check with: ____`,
            ["class notes"],
            ["notes comparison ready"],
            "Compare Raven",
        ),
        lesson(
            "boss-confidence",
            "Boss Confidence",
            "可信判断 Boss",
            "State whether the claim is trusted or needs more checking.",
            "说明这个说法是可信还是还要继续核查。",
            `# Knowledge: media literacy ends in a judgment, not only a question list
Conclusion: ____`,
            ["needs more checking"],
            ["confidence judgment ready"],
            "Media Titan",
        ),
    ]),
    pack(707, "prompt", "Coach", [
        lesson(
            "role-researcher",
            "Research Role",
            "研究角色",
            "Assign one person as the researcher.",
            "指定一位同学负责资料查找。",
            `# Knowledge: group projects get smoother when roles are named early
Role 1: ____`,
            ["researcher"],
            ["research role ready"],
            "Role Finch",
        ),
        lesson(
            "role-writer",
            "Writer Role",
            "写作角色",
            "Assign one person as the writer.",
            "指定一位同学负责整理文字。",
            `# Knowledge: shared work stays clearer when each person owns one output
Role 2: ____`,
            ["writer"],
            ["writer role ready"],
            "Role Hare",
        ),
        lesson(
            "ai-helper-boundary",
            "AI Helper Boundary",
            "AI 辅助边界",
            "Limit AI to brainstorming support.",
            "把 AI 限定在头脑风暴辅助范围内。",
            `# Knowledge: AI should support the team, not replace the team
AI helper only does: ____`,
            ["brainstorm"],
            ["AI boundary ready"],
            "Boundary Moth",
        ),
        lesson(
            "peer-check",
            "Peer Check",
            "同伴核查",
            "Add one peer fact-check step.",
            "补上一条同伴事实核查步骤。",
            `# Knowledge: teamwork gets stronger when classmates check each other
Peer check: ____`,
            ["verify facts"],
            ["peer check ready"],
            "Peer Raven",
        ),
        lesson(
            "boss-final-slide",
            "Boss Final Slide",
            "最终页 Boss",
            "Make the final slide show each member's section.",
            "让最终展示页写清每位成员负责的部分。",
            `# Knowledge: clear ownership protects fairness in group work
Final slide: ____`,
            ["each member signs one section"],
            ["final slide ready"],
            "Team Titan",
        ),
    ]),
    pack(708, "prompt", "Coach", [
        lesson(
            "brainstorm-three",
            "Three Ideas",
            "三个点子",
            "Ask AI for three starting ideas.",
            "让 AI 给出三个起步点子。",
            `# Knowledge: brainstorming is useful when you still choose and refine the idea yourself
Need: ____ ideas`,
            ["3"],
            ["three ideas requested"],
            "Idea Finch",
        ),
        lesson(
            "rewrite-own-voice",
            "Own Voice",
            "改成自己的话",
            "Rewrite the draft in your own words.",
            "把草稿改写成自己的表达。",
            `# Knowledge: reflection grows when you restate the idea in your own voice
Rewrite it in: ____`,
            ["my own words"],
            ["voice rewrite ready"],
            "Voice Hare",
        ),
        lesson(
            "add-example",
            "Add Example",
            "加入例子",
            "Add one personal example.",
            "补上一个自己的例子。",
            `# Knowledge: personal examples prove that you truly understood the idea
Add: one ____ example`,
            ["personal"],
            ["example added"],
            "Example Moth",
        ),
        lesson(
            "reflection-question",
            "Reflection Question",
            "反思问题",
            "End with one reflection question.",
            "最后加入一个反思问题。",
            `# Knowledge: good learning sessions end by turning back to your own thinking
End with: one ____ question`,
            ["reflection"],
            ["reflection question ready"],
            "Reflect Raven",
        ),
        lesson(
            "boss-final-voice",
            "Boss Final Voice",
            "最终表达 Boss",
            "Finish with a sentence that sounds like you, not the tool.",
            "用一句真正像你自己的话来收尾。",
            `# Knowledge: AI can help the draft, but the final voice should still be yours
Final line: ____`,
            ["this is the solution I believe fits our class"],
            ["final voice ready"],
            "Creative Titan",
        ),
    ]),
    pack(806, "html", "Web", [
        lesson(
            "image-alt",
            "Image Alt",
            "图片替代文本",
            "Add alt text for the quest image.",
            "给任务图片补上替代文本。",
            `<!-- Knowledge: accessibility starts by explaining important images -->
<img src="/quest.png" alt="____" />`,
            ["quest map"],
            ["alt text ready"],
            "Access Finch",
        ),
        lesson(
            "label-for",
            "Label For",
            "标签关联",
            "Connect the label to the name input.",
            "把 label 和 name 输入框关联起来。",
            `<!-- Knowledge: labels help both users and assistive tools understand inputs -->
<label for="____">Name</label>`,
            ["name"],
            ["label linked"],
            "Label Hare",
        ),
        lesson(
            "input-id",
            "Input Id",
            "输入框 id",
            "Give the input the matching id.",
            "给输入框加上对应的 id。",
            `<!-- Knowledge: form labels and inputs should point to each other -->
<input id="____" />`,
            ["name"],
            ["input id ready"],
            "Input Moth",
        ),
        lesson(
            "aria-live",
            "Aria Live",
            "提示区域",
            "Use aria-live for the status area.",
            "给状态区域加上 aria-live。",
            `<!-- Knowledge: dynamic messages should be announced clearly -->
<p aria-live="____">Saved</p>`,
            ["polite"],
            ["aria-live ready"],
            "Status Raven",
        ),
        lesson(
            "boss-skip-link",
            "Boss Skip Link",
            "跳转链接 Boss",
            "Add a skip link to the main content.",
            "补一个跳到正文的链接。",
            `<!-- Knowledge: keyboard users should be able to skip repeated navigation -->
<a class="skip-link" href="____">Skip to content</a>`,
            ["#main"],
            ["skip link ready"],
            "Access Titan",
        ),
    ]),
    pack(807, "javascript", "Web", [
        lesson(
            "fetch-quests",
            "Fetch Quests",
            "请求任务数据",
            "Fetch the quests data from the API.",
            "从 API 请求任务数据。",
            `// Knowledge: data-driven pages begin with one clear request
const response = await fetch("____")`,
            ["/api/quests"],
            ["request sent"],
            "Fetch Finch",
        ),
        lesson(
            "throw-on-fail",
            "Throw On Fail",
            "失败时抛错",
            "Throw an error when the response is not ok.",
            "当 response 不成功时抛出错误。",
            `// Knowledge: handling errors is easier when failure is explicit
if (!response.ok) {
  throw new Error("____")
}`,
            ["load failed"],
            ["error throw ready"],
            "Throw Hare",
        ),
        lesson(
            "loading-true",
            "Loading True",
            "开启加载态",
            "Set loading to true before fetching.",
            "请求前把 loading 设为 true。",
            `// Knowledge: the page should tell users it is working
loading = ____`,
            ["true"],
            ["loading set"],
            "Load Moth",
        ),
        lesson(
            "map-items",
            "Map Items",
            "映射列表",
            "Render the quests with map.",
            "用 map 渲染 quests 列表。",
            `// Knowledge: fetched lists still need stable rendering rules
quests.map((quest) => <li key={quest.id}>{quest.____}</li>)`,
            ["title"],
            ["quest list rendered"],
            "List Raven",
        ),
        lesson(
            "boss-refresh",
            "Boss Refresh",
            "刷新按钮 Boss",
            "Reload data from the refresh button.",
            "点击刷新按钮重新加载数据。",
            `// Knowledge: useful data pages let users recover from stale or failed results
<button onClick={____}>Refresh</button>`,
            ["loadQuests"],
            ["refresh ready"],
            "Fetch Titan",
        ),
    ]),
    pack(808, "html", "Web", [
        lesson(
            "site-skeleton",
            "Site Skeleton",
            "网站骨架",
            "Use semantic tags for the page shell.",
            "用语义化标签搭建页面骨架。",
            `<!-- Knowledge: complete sites still begin from clear semantic structure -->
<header></header>
<____></____>
<footer></footer>`,
            ["main"],
            ["site skeleton ready"],
            "Shell Finch",
        ),
        lesson(
            "nav-link",
            "Nav Link",
            "导航链接",
            "Link the nav item to the quests section.",
            "把导航项链接到 quests 区域。",
            `<!-- Knowledge: small sites should still make navigation obvious -->
<a href="____">Quests</a>`,
            ["#quests"],
            ["nav link ready"],
            "Nav Hare",
        ),
        lesson(
            "search-input",
            "Search Input",
            "搜索框",
            "Add the search placeholder.",
            "给搜索框添加占位提示。",
            `<!-- Knowledge: mini products feel more useful when users can search quickly -->
<input placeholder="____" />`,
            ["搜索章节"],
            ["search input ready"],
            "Search Moth",
        ),
        lesson(
            "grid-class",
            "Grid Class",
            "网格容器",
            "Use the chapter-grid class for the card section.",
            "给卡片区域使用 chapter-grid 类名。",
            `<!-- Knowledge: project pages stay tidy when repeated content uses one shared layout class -->
<section class="____"></section>`,
            ["chapter-grid"],
            ["grid class ready"],
            "Grid Raven",
        ),
        lesson(
            "boss-theme-button",
            "Boss Theme Button",
            "主题切换 Boss",
            "Use button type to avoid accidental form submit.",
            "设置 button type，避免误触发表单提交。",
            `<!-- Knowledge: small interface details affect how safe and clear the whole page feels -->
<button type="____">Theme</button>`,
            ["button"],
            ["theme button ready"],
            "Site Titan",
        ),
    ]),
    pack(905, "sql", "MySQL", [
        lesson(
            "count-orders",
            "Count Orders",
            "统计订单数",
            "Count how many orders are stored in the table.",
            "统计 orders 表里一共有多少条订单。",
            `-- Knowledge: aggregate queries turn scattered rows into a readable summary
SELECT ____(*)
FROM orders;`,
            ["COUNT"],
            ["Order count ready."],
            "Count Finch",
        ),
        lesson(
            "avg-score",
            "Average Score",
            "计算平均分",
            "Use AVG to calculate the class average score.",
            "用 AVG 计算班级平均分。",
            `-- Knowledge: averages help you describe the overall level instead of one row
SELECT ____ (score)
FROM exams;`,
            ["AVG"],
            ["Average score ready."],
            "Average Hare",
        ),
        lesson(
            "group-city",
            "Group By City",
            "按城市分组",
            "Group users by city before counting them.",
            "先按城市分组，再统计每个城市的人数。",
            `-- Knowledge: GROUP BY answers 'how many per category'
SELECT city, COUNT(*)
FROM users
GROUP BY ____;`,
            ["city"],
            ["Grouped city summary ready."],
            "Group Raven",
        ),
        lesson(
            "having-pass",
            "Having Filter",
            "聚合结果筛选",
            "Keep only classes whose average score is at least 90.",
            "只保留平均分达到 90 分的班级。",
            `-- Knowledge: HAVING filters after grouping and aggregation
SELECT class_id, AVG(score)
FROM exams
GROUP BY class_id
HAVING AVG(score) >= ____;`,
            ["90"],
            ["High-score classes kept."],
            "Filter Lynx",
        ),
        lesson(
            "boss-month-report",
            "Boss Monthly Report",
            "月度报表 Boss",
            "Finish the grouped monthly sales report.",
            "补全按月份统计销售额的报表。",
            `-- Knowledge: good reports group, summarize, and then sort the result
SELECT month, SUM(amount) AS total_amount
FROM sales
GROUP BY month
ORDER BY ____ DESC;`,
            ["total_amount"],
            ["Monthly report completed."],
            "Report Titan",
        ),
    ]),
    pack(906, "sql", "MySQL", [
        lesson(
            "split-school",
            "Split School Table",
            "拆分学校表",
            "Move school names into a separate schools table.",
            "把学校名称拆到单独的 schools 表里。",
            `-- Knowledge: normalization reduces repeated data before it becomes messy
CREATE TABLE schools (
  id INT PRIMARY KEY,
  ____ VARCHAR(60)
);`,
            ["name"],
            ["Schools table ready."],
            "Schema Finch",
        ),
        lesson(
            "student-school-id",
            "Use School Id",
            "改用学校编号",
            "Store school_id in students instead of repeating school names.",
            "在 students 表里保存 school_id，而不是重复写学校名。",
            `-- Knowledge: stable schemas store keys once and reuse them everywhere else
ALTER TABLE students
ADD COLUMN ____ INT;`,
            ["school_id"],
            ["school_id column added."],
            "Key Hare",
        ),
        lesson(
            "create-foreign-key",
            "Create Foreign Key",
            "创建外键",
            "Link students.school_id to schools.id.",
            "把 students.school_id 关联到 schools.id。",
            `-- Knowledge: foreign keys protect the relationship between tables
ALTER TABLE students
ADD CONSTRAINT fk_students_school
FOREIGN KEY (school_id) REFERENCES schools(____);`,
            ["id"],
            ["Foreign key linked."],
            "Link Raven",
        ),
        lesson(
            "bridge-enrollments",
            "Bridge Table",
            "中间表设计",
            "Create the middle table for student-course enrollment.",
            "为学生选课关系创建中间表。",
            `-- Knowledge: many-to-many relations usually need one bridge table
CREATE TABLE enrollments (
  student_id INT,
  ____ INT
);`,
            ["course_id"],
            ["Bridge table ready."],
            "Bridge Fox",
        ),
        lesson(
            "boss-order-normalize",
            "Boss Normalize Order",
            "订单规范化 Boss",
            "Keep one order row and move item details into order_items.",
            "保留订单主表，并把商品明细拆到 order_items。",
            `-- Knowledge: one table should describe one main thing, not every repeated detail
CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT,
  product_id INT,
  ____ INT
);`,
            ["quantity"],
            ["Order schema normalized."],
            "Schema Titan",
        ),
    ]),
    pack(907, "sql", "MySQL", [
        lesson(
            "explain-select",
            "Explain Query",
            "查看执行计划",
            "Add EXPLAIN before the query to inspect its path.",
            "在查询前加上 EXPLAIN 查看执行路径。",
            `-- Knowledge: tuning starts by seeing how the database plans to read data
____ SELECT * FROM students WHERE class_id = 3;`,
            ["EXPLAIN"],
            ["Query plan opened."],
            "Plan Finch",
        ),
        lesson(
            "index-class-id",
            "Index Class Id",
            "为班级建索引",
            "Create an index for the class_id filter.",
            "给 class_id 这个常用筛选列建立索引。",
            `-- Knowledge: indexes should match the columns you really filter on
CREATE INDEX idx_students_class ON students(____);`,
            ["class_id"],
            ["class_id index created."],
            "Index Hare",
        ),
        lesson(
            "composite-index",
            "Composite Index",
            "联合索引",
            "Create one index for class_id and status together.",
            "为 class_id 和 status 一起建立联合索引。",
            `-- Knowledge: one composite index can support one common filter path
CREATE INDEX idx_students_class_status
ON students(class_id, ____);`,
            ["status"],
            ["Composite index ready."],
            "Composite Raven",
        ),
        lesson(
            "where-before-order",
            "Filter First",
            "先筛选再排序",
            "Write the WHERE clause before ORDER BY.",
            "在 ORDER BY 前先写 WHERE 条件。",
            `-- Knowledge: good query structure makes intent clearer before optimization
SELECT *
FROM students
____ class_id = 3
ORDER BY created_at DESC;`,
            ["WHERE"],
            ["Query order corrected."],
            "Order Lynx",
        ),
        lesson(
            "boss-limit-result",
            "Boss Limit Result",
            "限制结果 Boss",
            "Keep only the newest 20 rows after sorting.",
            "排序后只保留最新的 20 条结果。",
            `-- Knowledge: limit can reduce useless work when users only need the top slice
SELECT *
FROM logs
ORDER BY created_at DESC
____ 20;`,
            ["LIMIT"],
            ["Top result slice ready."],
            "Tuning Titan",
        ),
    ]),
    pack(908, "sql", "MySQL", [
        lesson(
            "dump-database",
            "Dump Database",
            "导出数据库",
            "Use mysqldump to export game_data.",
            "使用 mysqldump 导出 game_data 数据库。",
            `-- Knowledge: backup matters before trouble happens
mysqldump game_data > ____`,
            ["game_data.sql"],
            ["Database dump command ready."],
            "Backup Finch",
        ),
        lesson(
            "restore-database",
            "Restore Database",
            "恢复数据库",
            "Restore game_data from a SQL dump file.",
            "从 SQL 导出文件恢复 game_data。",
            `-- Knowledge: every backup plan should include one tested restore path
mysql game_data < ____`,
            ["game_data.sql"],
            ["Restore command ready."],
            "Restore Hare",
        ),
        lesson(
            "name-backup",
            "Backup Naming",
            "备份命名",
            "Add the date to the backup filename.",
            "在备份文件名里带上日期。",
            `-- Knowledge: clear names make backups easier to find under pressure
backup_2026_04_16.____`,
            ["sql"],
            ["Backup filename normalized."],
            "Archive Raven",
        ),
        lesson(
            "rollback-note",
            "Rollback Note",
            "回滚说明",
            "Write the step that checks the backup before restore.",
            "补上恢复前先检查备份可用性的步骤。",
            `-- Knowledge: recovery is safer when verification comes before restore
Recovery checklist:
1. locate backup
2. verify backup
3. ____`,
            ["restore into test database first"],
            ["Recovery checklist improved."],
            "Checklist Fox",
        ),
        lesson(
            "boss-recovery-plan",
            "Boss Recovery Plan",
            "恢复预案 Boss",
            "Finish the last step after restore succeeds.",
            "补全恢复成功后的最后一步。",
            `-- Knowledge: a complete recovery plan ends by confirming service health
Recovery plan:
1. stop writes
2. restore backup
3. verify data
4. ____`,
            ["resume service carefully"],
            ["Recovery plan completed."],
            "Recovery Titan",
        ),
    ]),
    pack(1005, "prompt", "Shield", [
        lesson(
            "strong-password",
            "Strong Password Rule",
            "强密码规则",
            "Add one clear password rule to the login policy.",
            "给登录规则补上一条清晰的密码要求。",
            `# Knowledge: account safety starts with clear login habits
Login policy:
- use unique passwords
- ____`,
            ["- require long passwords"],
            ["Password rule added."],
            "Password Finch",
        ),
        lesson(
            "two-factor",
            "Two-Factor Step",
            "双重验证步骤",
            "Add a 2FA step after password verification.",
            "在密码验证后补上双重验证步骤。",
            `# Knowledge: a second check helps when one secret is leaked
Login flow:
1. verify password
2. ____`,
            ["check 2FA code"],
            ["2FA step added."],
            "Shield Hare",
        ),
        lesson(
            "session-expire",
            "Session Expire",
            "会话过期",
            "Add one rule for idle session timeout.",
            "补上一条会话空闲超时规则。",
            `# Knowledge: safe accounts also need session boundaries after login
Session rule:
If idle too long, ____`,
            ["expire the session"],
            ["Session timeout rule ready."],
            "Session Raven",
        ),
        lesson(
            "token-rotate",
            "Rotate Token",
            "轮换令牌",
            "Add one step to rotate refresh tokens after reuse risk.",
            "补上一条刷新令牌轮换规则。",
            `# Knowledge: tokens should be replaced before old ones become a long-term risk
Token safety:
- short access token
- ____`,
            ["- rotate refresh tokens"],
            ["Token rotation added."],
            "Token Fox",
        ),
        lesson(
            "boss-revoke-device",
            "Boss Revoke Device",
            "撤销设备 Boss",
            "Finish the response for a leaked account session.",
            "补全账号会话泄露后的处理动作。",
            `# Knowledge: when an account is at risk, response must be fast and specific
If a session is leaked:
1. alert user
2. reset password
3. ____`,
            ["revoke other active sessions"],
            ["Leak response completed."],
            "Account Titan",
        ),
    ]),
    pack(1006, "bash", "SOC", [
        lesson(
            "curl-header",
            "Curl Header",
            "查看响应头",
            "Use curl to read only the response headers.",
            "使用 curl 只查看响应头。",
            `curl -I ____`,
            ["https://example.com"],
            ["Response headers requested."],
            "Header Finch",
        ),
        lesson(
            "trace-request-id",
            "Trace Request Id",
            "追踪请求编号",
            "Search the log for one request id.",
            "在日志里搜索指定的请求编号。",
            `grep "____" access.log`,
            ["req-1024"],
            ["Request id traced."],
            "Trace Hare",
        ),
        lesson(
            "show-status",
            "Show Status",
            "查看状态码",
            "Print the HTTP status code with curl.",
            "用 curl 输出 HTTP 状态码。",
            `curl -o /dev/null -s -w "%{http_code}" ____`,
            ["https://example.com/health"],
            ["Status code printed."],
            "Status Raven",
        ),
        lesson(
            "dns-lookup",
            "DNS Lookup",
            "DNS 查询",
            "Use nslookup to check the API domain.",
            "使用 nslookup 检查 API 域名解析。",
            `nslookup ____`,
            ["api.example.com"],
            ["DNS lookup ready."],
            "Lookup Fox",
        ),
        lesson(
            "boss-save-trace",
            "Boss Save Trace",
            "保存追踪 Boss",
            "Save the network trace result into one file.",
            "把网络追踪结果保存到文件里。",
            `curl -I https://example.com > ____`,
            ["trace.txt"],
            ["Trace file saved."],
            "Traffic Titan",
        ),
    ]),
    pack(1007, "prompt", "Shield", [
        lesson(
            "mark-severity",
            "Mark Severity",
            "标记严重级别",
            "Label the incident as high severity.",
            "把这次事件标记为高优先级。",
            `# Knowledge: incident work begins by classifying impact clearly
Severity: ____`,
            ["high"],
            ["Severity labeled."],
            "Alert Finch",
        ),
        lesson(
            "contain-first",
            "Contain First",
            "先做遏制",
            "Add the first containment action.",
            "补上第一步遏制动作。",
            `# Knowledge: response order matters when risk is still spreading
Incident steps:
1. ____`,
            ["isolate the affected service"],
            ["Containment step added."],
            "Contain Hare",
        ),
        lesson(
            "preserve-evidence",
            "Preserve Evidence",
            "保留证据",
            "Add the evidence preservation step.",
            "补上保留证据的步骤。",
            `# Knowledge: without evidence, later analysis becomes guesswork
Incident steps:
1. isolate the affected service
2. ____`,
            ["save logs and snapshots"],
            ["Evidence step added."],
            "Evidence Raven",
        ),
        lesson(
            "notify-owner",
            "Notify Owner",
            "通知负责人",
            "Add one escalation step for the owner team.",
            "补上一条通知负责人团队的升级步骤。",
            `# Knowledge: incidents should move to the right people quickly
Incident steps:
1. isolate the affected service
2. save logs and snapshots
3. ____`,
            ["notify the owner team"],
            ["Escalation step ready."],
            "Notify Fox",
        ),
        lesson(
            "boss-close-incident",
            "Boss Close Incident",
            "事件收口 Boss",
            "Finish the last step after the fix is deployed.",
            "补全修复上线后的最后一步。",
            `# Knowledge: incidents end with review, not only with a patch
Incident steps:
1. isolate the affected service
2. save logs and snapshots
3. notify the owner team
4. patch the issue
5. ____`,
            ["review root cause and prevention"],
            ["Incident playbook completed."],
            "Response Titan",
        ),
    ]),
    pack(1008, "prompt", "SOC", [
        lesson(
            "collect-log-window",
            "Collect Log Window",
            "收集日志时间窗",
            "Write the log time window for the audit.",
            "写出这次审计的日志时间范围。",
            `# Knowledge: audits need clear scope before conclusions
Audit window: ____`,
            ["2026-04-16 08:00 to 10:00"],
            ["Audit window defined."],
            "Audit Finch",
        ),
        lesson(
            "list-controls",
            "List Controls",
            "列出防护项",
            "Add one more security control into the checklist.",
            "在检查清单里再补一项安全控制。",
            `# Knowledge: audits compare reality against explicit controls
Checklist:
- login protection
- backup status
- ____`,
            ["- access logging"],
            ["Security control added."],
            "Control Hare",
        ),
        lesson(
            "evidence-line",
            "Evidence Line",
            "记录证据",
            "Add one evidence row to the audit note.",
            "给审计记录补上一条证据。",
            `# Knowledge: an audit claim should point to concrete evidence
Evidence:
- screenshot of dashboard
- ____`,
            ["- log snippet with request id"],
            ["Evidence row added."],
            "Proof Raven",
        ),
        lesson(
            "risk-priority",
            "Risk Priority",
            "风险优先级",
            "Mark the most urgent risk as P1.",
            "把最紧急的风险标记为 P1。",
            `# Knowledge: audits become actionable when problems are ranked
Top risk priority: ____`,
            ["P1"],
            ["Risk priority marked."],
            "Priority Fox",
        ),
        lesson(
            "boss-audit-close",
            "Boss Audit Close",
            "审计收口 Boss",
            "Finish the last action after writing conclusions.",
            "补全写完审计结论后的最后动作。",
            `# Knowledge: a strong audit finishes with the next fix owner and action
Audit close:
1. summarize findings
2. attach evidence
3. assign owner
4. ____`,
            ["set the next remediation deadline"],
            ["Audit close completed."],
            "Audit Titan",
        ),
    ]),
];
