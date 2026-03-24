/**
 * PVP 答题轮题库
 * 包含多种类型的趣味题目：编程、逻辑推理、幽默搞笑、数学、常识
 * 
 * v2.3.0 更新：题库从80道扩充到160道
 * - 编程题：50道
 * - 逻辑推理：40道
 * - 幽默搞笑：40道
 * - 数学题：15道
 * - 常识题：15道
 */

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    answer: string;
    category: 'programming' | 'logic' | 'humor' | 'math' | 'general';
    difficulty: 'easy' | 'medium' | 'hard';
}

// 💻 编程题 (50道)
const PROGRAMMING_QUESTIONS: QuizQuestion[] = [
    // 基础题 (20道)
    { id: 'p1', question: '在 Python 中，print() 函数用于什么？', options: ['输出内容', '输入内容', '定义变量', '循环'], answer: '输出内容', category: 'programming', difficulty: 'easy' },
    { id: 'p2', question: 'Python 中的列表用什么符号表示？', options: ['[]', '{}', '()', '<>'], answer: '[]', category: 'programming', difficulty: 'easy' },
    { id: 'p3', question: 'for 循环用于什么？', options: ['重复执行代码', '条件判断', '定义函数', '导入模块'], answer: '重复执行代码', category: 'programming', difficulty: 'easy' },
    { id: 'p4', question: 'if 语句用于什么？', options: ['条件判断', '循环', '定义类', '异常处理'], answer: '条件判断', category: 'programming', difficulty: 'easy' },
    { id: 'p5', question: 'len() 函数返回什么？', options: ['长度', '类型', '最大值', '最小值'], answer: '长度', category: 'programming', difficulty: 'easy' },
    { id: 'p6', question: 'Python 中注释用什么符号？', options: ['#', '//', '/*', '--'], answer: '#', category: 'programming', difficulty: 'easy' },
    { id: 'p7', question: 'range(5) 生成多少个数？', options: ['4', '5', '6', '0'], answer: '5', category: 'programming', difficulty: 'easy' },
    { id: 'p8', question: 'def 关键字用于什么？', options: ['定义函数', '定义变量', '定义类', '导入模块'], answer: '定义函数', category: 'programming', difficulty: 'easy' },
    { id: 'p9', question: 'True 和 False 是什么类型？', options: ['布尔', '字符串', '整数', '列表'], answer: '布尔', category: 'programming', difficulty: 'easy' },
    { id: 'p10', question: 'Python 中字典用什么符号表示？', options: ['{}', '[]', '()', '<>'], answer: '{}', category: 'programming', difficulty: 'easy' },
    { id: 'p11', question: '"Hello" + "World" 的结果是？', options: ['HelloWorld', 'Hello World', '错误', '11'], answer: 'HelloWorld', category: 'programming', difficulty: 'medium' },
    { id: 'p12', question: 'list.append() 方法做什么？', options: ['添加元素到末尾', '删除元素', '排序', '反转'], answer: '添加元素到末尾', category: 'programming', difficulty: 'medium' },
    { id: 'p13', question: 'Python 中 // 运算符表示？', options: ['整除', '除法', '注释', '幂运算'], answer: '整除', category: 'programming', difficulty: 'medium' },
    { id: 'p14', question: 'while True 会发生什么？', options: ['无限循环', '执行一次', '报错', '什么都不做'], answer: '无限循环', category: 'programming', difficulty: 'medium' },
    { id: 'p15', question: 'str(123) 的结果是？', options: ['"123"', '123', '[1,2,3]', '错误'], answer: '"123"', category: 'programming', difficulty: 'medium' },
    { id: 'p16', question: 'Python 中 None 表示什么？', options: ['空值', '零', '假', '错误'], answer: '空值', category: 'programming', difficulty: 'medium' },
    { id: 'p17', question: 'try-except 用于什么？', options: ['异常处理', '循环', '条件判断', '定义函数'], answer: '异常处理', category: 'programming', difficulty: 'medium' },
    { id: 'p18', question: '[1,2,3][1] 的结果是？', options: ['2', '1', '3', '[2]'], answer: '2', category: 'programming', difficulty: 'medium' },
    { id: 'p19', question: 'import 关键字用于什么？', options: ['导入模块', '导出模块', '定义类', '定义函数'], answer: '导入模块', category: 'programming', difficulty: 'easy' },
    { id: 'p20', question: '"abc".upper() 的结果是？', options: ['ABC', 'abc', 'Abc', '错误'], answer: 'ABC', category: 'programming', difficulty: 'easy' },
    
    // 新增编程题 (30道)
    { id: 'p21', question: 'Python 中 input() 函数返回什么类型？', options: ['字符串', '整数', '列表', '布尔'], answer: '字符串', category: 'programming', difficulty: 'easy' },
    { id: 'p22', question: '3 ** 2 的结果是？', options: ['9', '6', '5', '8'], answer: '9', category: 'programming', difficulty: 'easy' },
    { id: 'p23', question: 'break 语句用于什么？', options: ['跳出循环', '跳过本次循环', '结束程序', '暂停程序'], answer: '跳出循环', category: 'programming', difficulty: 'easy' },
    { id: 'p24', question: 'continue 语句用于什么？', options: ['跳过本次循环', '跳出循环', '结束程序', '暂停程序'], answer: '跳过本次循环', category: 'programming', difficulty: 'easy' },
    { id: 'p25', question: 'type(123) 返回什么？', options: ['int', 'str', 'float', 'bool'], answer: 'int', category: 'programming', difficulty: 'easy' },
    { id: 'p26', question: '"hello"[0] 的结果是？', options: ['h', 'e', 'hello', '错误'], answer: 'h', category: 'programming', difficulty: 'easy' },
    { id: 'p27', question: 'Python 中 and 是什么运算符？', options: ['逻辑与', '逻辑或', '逻辑非', '位运算'], answer: '逻辑与', category: 'programming', difficulty: 'easy' },
    { id: 'p28', question: 'Python 中 or 是什么运算符？', options: ['逻辑或', '逻辑与', '逻辑非', '位运算'], answer: '逻辑或', category: 'programming', difficulty: 'easy' },
    { id: 'p29', question: 'not True 的结果是？', options: ['False', 'True', '0', '1'], answer: 'False', category: 'programming', difficulty: 'easy' },
    { id: 'p30', question: '10 % 3 的结果是？', options: ['1', '3', '0', '10'], answer: '1', category: 'programming', difficulty: 'easy' },
    { id: 'p31', question: 'list.pop() 方法做什么？', options: ['删除并返回最后一个元素', '添加元素', '排序', '清空列表'], answer: '删除并返回最后一个元素', category: 'programming', difficulty: 'medium' },
    { id: 'p32', question: 'list.sort() 方法做什么？', options: ['排序列表', '反转列表', '复制列表', '清空列表'], answer: '排序列表', category: 'programming', difficulty: 'medium' },
    { id: 'p33', question: '"hello".replace("l", "x") 的结果是？', options: ['hexxo', 'hexlo', 'hello', 'heox'], answer: 'hexxo', category: 'programming', difficulty: 'medium' },
    { id: 'p34', question: '"a,b,c".split(",") 的结果是？', options: ["['a','b','c']", "'a,b,c'", "('a','b','c')", '错误'], answer: "['a','b','c']", category: 'programming', difficulty: 'medium' },
    { id: 'p35', question: 'int("42") 的结果是？', options: ['42', '"42"', '错误', '4.2'], answer: '42', category: 'programming', difficulty: 'easy' },
    { id: 'p36', question: 'float("3.14") 的结果是？', options: ['3.14', '"3.14"', '3', '错误'], answer: '3.14', category: 'programming', difficulty: 'easy' },
    { id: 'p37', question: 'max([1,5,3]) 的结果是？', options: ['5', '1', '3', '9'], answer: '5', category: 'programming', difficulty: 'easy' },
    { id: 'p38', question: 'min([1,5,3]) 的结果是？', options: ['1', '5', '3', '0'], answer: '1', category: 'programming', difficulty: 'easy' },
    { id: 'p39', question: 'sum([1,2,3]) 的结果是？', options: ['6', '123', '3', '1'], answer: '6', category: 'programming', difficulty: 'easy' },
    { id: 'p40', question: 'abs(-5) 的结果是？', options: ['5', '-5', '0', '错误'], answer: '5', category: 'programming', difficulty: 'easy' },
    { id: 'p41', question: 'round(3.7) 的结果是？', options: ['4', '3', '3.7', '错误'], answer: '4', category: 'programming', difficulty: 'easy' },
    { id: 'p42', question: '"hello".find("l") 的结果是？', options: ['2', '3', '1', '-1'], answer: '2', category: 'programming', difficulty: 'medium' },
    { id: 'p43', question: '"hello".count("l") 的结果是？', options: ['2', '1', '3', '0'], answer: '2', category: 'programming', difficulty: 'medium' },
    { id: 'p44', question: 'class 关键字用于什么？', options: ['定义类', '定义函数', '定义变量', '导入模块'], answer: '定义类', category: 'programming', difficulty: 'medium' },
    { id: 'p45', question: 'return 语句用于什么？', options: ['返回函数结果', '结束程序', '跳出循环', '打印输出'], answer: '返回函数结果', category: 'programming', difficulty: 'easy' },
    { id: 'p46', question: 'Python 中 == 和 = 的区别是？', options: ['比较和赋值', '都是比较', '都是赋值', '没有区别'], answer: '比较和赋值', category: 'programming', difficulty: 'easy' },
    { id: 'p47', question: '[1,2] + [3,4] 的结果是？', options: ['[1,2,3,4]', '[4,6]', '错误', '10'], answer: '[1,2,3,4]', category: 'programming', difficulty: 'medium' },
    { id: 'p48', question: '"hello" * 2 的结果是？', options: ['hellohello', 'hello2', '错误', 'hheelllloo'], answer: 'hellohello', category: 'programming', difficulty: 'medium' },
    { id: 'p49', question: '5 in [1,3,5,7] 的结果是？', options: ['True', 'False', '5', '错误'], answer: 'True', category: 'programming', difficulty: 'easy' },
    { id: 'p50', question: 'sorted([3,1,2]) 的结果是？', options: ['[1,2,3]', '[3,2,1]', '[3,1,2]', '错误'], answer: '[1,2,3]', category: 'programming', difficulty: 'medium' },
];

// 🧠 逻辑推理题 (40道)
const LOGIC_QUESTIONS: QuizQuestion[] = [
    // 原有题目 (15道)
    { id: 'l1', question: '如果所有的猫都是动物，所有的动物都会呼吸，那么所有的猫都会？', options: ['呼吸', '飞翔', '游泳', '说话'], answer: '呼吸', category: 'logic', difficulty: 'easy' },
    { id: 'l2', question: '1, 2, 4, 8, 16, ? 下一个数是？', options: ['32', '24', '20', '18'], answer: '32', category: 'logic', difficulty: 'easy' },
    { id: 'l3', question: '如果今天是星期三，那么后天是？', options: ['星期五', '星期四', '星期六', '星期日'], answer: '星期五', category: 'logic', difficulty: 'easy' },
    { id: 'l4', question: '小明比小红高，小红比小刚高，谁最矮？', options: ['小刚', '小明', '小红', '一样高'], answer: '小刚', category: 'logic', difficulty: 'easy' },
    { id: 'l5', question: '2, 3, 5, 7, 11, ? 下一个质数是？', options: ['13', '12', '14', '15'], answer: '13', category: 'logic', difficulty: 'medium' },
    { id: 'l6', question: '一个房间有4个角，每个角有1只猫，每只猫前面有3只猫，共有几只猫？', options: ['4只', '16只', '12只', '8只'], answer: '4只', category: 'logic', difficulty: 'medium' },
    { id: 'l7', question: '如果 A=1, B=2, C=3，那么 CAB = ?', options: ['312', '123', '321', '213'], answer: '312', category: 'logic', difficulty: 'easy' },
    { id: 'l8', question: '一只蜗牛爬10米高的墙，白天爬3米，晚上滑2米，几天能爬到顶？', options: ['8天', '10天', '7天', '9天'], answer: '8天', category: 'logic', difficulty: 'hard' },
    { id: 'l9', question: '1, 1, 2, 3, 5, 8, ? 下一个斐波那契数是？', options: ['13', '11', '12', '10'], answer: '13', category: 'logic', difficulty: 'medium' },
    { id: 'l10', question: '三个开关控制三盏灯，只能进房间一次，如何确定对应关系？', options: ['开一个等一会再关', '同时开三个', '一个一个试', '无法确定'], answer: '开一个等一会再关', category: 'logic', difficulty: 'hard' },
    { id: 'l11', question: '100个人排队，从1开始报数，报到3的倍数出列，最后剩下几人？', options: ['66人', '67人', '33人', '34人'], answer: '66人', category: 'logic', difficulty: 'hard' },
    { id: 'l12', question: '一个数的3倍加5等于20，这个数是？', options: ['5', '6', '7', '8'], answer: '5', category: 'logic', difficulty: 'easy' },
    { id: 'l13', question: '镜子里看到的时钟显示3:00，实际时间是？', options: ['9:00', '3:00', '6:00', '12:00'], answer: '9:00', category: 'logic', difficulty: 'medium' },
    { id: 'l14', question: '一打铅笔是多少支？', options: ['12支', '10支', '6支', '24支'], answer: '12支', category: 'logic', difficulty: 'easy' },
    { id: 'l15', question: '如果5个机器5分钟做5个零件，100个机器做100个零件要多久？', options: ['5分钟', '100分钟', '20分钟', '1分钟'], answer: '5分钟', category: 'logic', difficulty: 'hard' },
    
    // 新增逻辑题 (25道)
    { id: 'l16', question: '2, 6, 12, 20, 30, ? 下一个数是？', options: ['42', '40', '36', '44'], answer: '42', category: 'logic', difficulty: 'medium' },
    { id: 'l17', question: '如果昨天是星期六，那么明天是？', options: ['星期一', '星期日', '星期二', '星期六'], answer: '星期一', category: 'logic', difficulty: 'easy' },
    { id: 'l18', question: '小华有5个苹果，给了小明2个，又买了3个，现在有几个？', options: ['6个', '5个', '8个', '10个'], answer: '6个', category: 'logic', difficulty: 'easy' },
    { id: 'l19', question: '1, 4, 9, 16, 25, ? 下一个数是？', options: ['36', '30', '35', '49'], answer: '36', category: 'logic', difficulty: 'easy' },
    { id: 'l20', question: '一个正方形有几条边？', options: ['4条', '3条', '5条', '6条'], answer: '4条', category: 'logic', difficulty: 'easy' },
    { id: 'l21', question: '如果所有的鸟都会飞，企鹅是鸟，那么企鹅会飞吗？', options: ['这个推理有问题', '会飞', '不会飞', '不确定'], answer: '这个推理有问题', category: 'logic', difficulty: 'medium' },
    { id: 'l22', question: '3, 6, 9, 12, 15, ? 下一个数是？', options: ['18', '17', '19', '21'], answer: '18', category: 'logic', difficulty: 'easy' },
    { id: 'l23', question: '一个三角形有几个角？', options: ['3个', '4个', '2个', '5个'], answer: '3个', category: 'logic', difficulty: 'easy' },
    { id: 'l24', question: '10, 20, 30, 40, ? 下一个数是？', options: ['50', '45', '60', '100'], answer: '50', category: 'logic', difficulty: 'easy' },
    { id: 'l25', question: '如果A比B大，B比C大，C比D大，谁最小？', options: ['D', 'A', 'B', 'C'], answer: 'D', category: 'logic', difficulty: 'easy' },
    { id: 'l26', question: '一周有几天？', options: ['7天', '5天', '6天', '10天'], answer: '7天', category: 'logic', difficulty: 'easy' },
    { id: 'l27', question: '一年有几个月？', options: ['12个', '10个', '11个', '13个'], answer: '12个', category: 'logic', difficulty: 'easy' },
    { id: 'l28', question: '100-50+25 等于？', options: ['75', '25', '50', '100'], answer: '75', category: 'logic', difficulty: 'easy' },
    { id: 'l29', question: '如果今天是1月31日，明天是几月几日？', options: ['2月1日', '1月32日', '2月2日', '1月30日'], answer: '2月1日', category: 'logic', difficulty: 'easy' },
    { id: 'l30', question: '一个六边形有几条边？', options: ['6条', '5条', '7条', '8条'], answer: '6条', category: 'logic', difficulty: 'easy' },
    { id: 'l31', question: '2+2×2 等于？', options: ['6', '8', '4', '16'], answer: '6', category: 'logic', difficulty: 'medium' },
    { id: 'l32', question: '一个圆有几条边？', options: ['0条', '1条', '无数条', '2条'], answer: '0条', category: 'logic', difficulty: 'medium' },
    { id: 'l33', question: '如果A=B，B=C，那么A和C的关系是？', options: ['A=C', 'A>C', 'A<C', '不确定'], answer: 'A=C', category: 'logic', difficulty: 'easy' },
    { id: 'l34', question: '1, 3, 5, 7, 9, ? 下一个奇数是？', options: ['11', '10', '12', '13'], answer: '11', category: 'logic', difficulty: 'easy' },
    { id: 'l35', question: '2, 4, 6, 8, 10, ? 下一个偶数是？', options: ['12', '11', '13', '14'], answer: '12', category: 'logic', difficulty: 'easy' },
    { id: 'l36', question: '一个长方形有几个直角？', options: ['4个', '2个', '3个', '0个'], answer: '4个', category: 'logic', difficulty: 'easy' },
    { id: 'l37', question: '如果今天是周末，那么今天可能是？', options: ['周六或周日', '周一', '周五', '周三'], answer: '周六或周日', category: 'logic', difficulty: 'easy' },
    { id: 'l38', question: '一天有多少小时？', options: ['24小时', '12小时', '48小时', '36小时'], answer: '24小时', category: 'logic', difficulty: 'easy' },
    { id: 'l39', question: '一小时有多少分钟？', options: ['60分钟', '100分钟', '30分钟', '120分钟'], answer: '60分钟', category: 'logic', difficulty: 'easy' },
    { id: 'l40', question: '一分钟有多少秒？', options: ['60秒', '100秒', '30秒', '120秒'], answer: '60秒', category: 'logic', difficulty: 'easy' },
];


// 😄 幽默搞笑题 (40道)
const HUMOR_QUESTIONS: QuizQuestion[] = [
    // 原有题目 (15道)
    { id: 'h1', question: '什么东西越洗越脏？', options: ['水', '肥皂', '毛巾', '手'], answer: '水', category: 'humor', difficulty: 'easy' },
    { id: 'h2', question: '什么动物最容易摔倒？', options: ['狐狸（脚滑）', '猫', '狗', '兔子'], answer: '狐狸（脚滑）', category: 'humor', difficulty: 'easy' },
    { id: 'h3', question: '程序员最怕什么？', options: ['改需求', '加班', '写文档', '开会'], answer: '改需求', category: 'humor', difficulty: 'easy' },
    { id: 'h4', question: '为什么程序员分不清万圣节和圣诞节？', options: ['Oct 31 = Dec 25', '都放假', '都有礼物', '都要加班'], answer: 'Oct 31 = Dec 25', category: 'humor', difficulty: 'medium' },
    { id: 'h5', question: '什么东西有头无脚？', options: ['蒜', '蛇', '鱼', '虫'], answer: '蒜', category: 'humor', difficulty: 'easy' },
    { id: 'h6', question: '世界上最长的单词是什么？', options: ['smiles（两个s之间隔一英里）', 'internationalization', 'supercalifragilistic', 'pneumonoultramicroscopic'], answer: 'smiles（两个s之间隔一英里）', category: 'humor', difficulty: 'medium' },
    { id: 'h7', question: '什么东西天天来，却从不进门？', options: ['太阳', '风', '雨', '邮递员'], answer: '太阳', category: 'humor', difficulty: 'easy' },
    { id: 'h8', question: '程序员的三大谎言之一是？', options: ['这段代码很简单', '明天就能完成', '我测试过了', '以上都是'], answer: '以上都是', category: 'humor', difficulty: 'easy' },
    { id: 'h9', question: '什么东西越热越爱出来？', options: ['汗', '太阳', '冰淇淋', '空调'], answer: '汗', category: 'humor', difficulty: 'easy' },
    { id: 'h10', question: '为什么 Java 程序员戴眼镜？', options: ['因为他们看不见 C#', '代码太多', '屏幕太亮', '遗传'], answer: '因为他们看不见 C#', category: 'humor', difficulty: 'medium' },
    { id: 'h11', question: '什么东西有脚却不能走？', options: ['桌子', '蛇', '鱼', '蜗牛'], answer: '桌子', category: 'humor', difficulty: 'easy' },
    { id: 'h12', question: '程序员最喜欢的饮料是？', options: ['Java咖啡', '可乐', '茶', '水'], answer: 'Java咖啡', category: 'humor', difficulty: 'easy' },
    { id: 'h13', question: '什么东西有嘴不能说话？', options: ['茶壶', '鱼', '婴儿', '哑巴'], answer: '茶壶', category: 'humor', difficulty: 'easy' },
    { id: 'h14', question: 'Bug 的最佳藏身之处是？', options: ['你刚写的代码里', '别人的代码里', '测试环境', '文档里'], answer: '你刚写的代码里', category: 'humor', difficulty: 'easy' },
    { id: 'h15', question: '什么东西有眼睛却看不见？', options: ['针', '土豆', '台风', '以上都是'], answer: '以上都是', category: 'humor', difficulty: 'medium' },
    
    // 新增幽默题 (25道)
    { id: 'h16', question: '什么东西有牙却不能咬？', options: ['锯子', '老虎', '鲨鱼', '狗'], answer: '锯子', category: 'humor', difficulty: 'easy' },
    { id: 'h17', question: '什么东西有手却不能抓？', options: ['时钟', '猴子', '人', '机器人'], answer: '时钟', category: 'humor', difficulty: 'easy' },
    { id: 'h18', question: '程序员为什么喜欢黑暗模式？', options: ['因为Bug怕光', '省电', '好看', '习惯了'], answer: '因为Bug怕光', category: 'humor', difficulty: 'easy' },
    { id: 'h19', question: '什么东西有腿却不能跑？', options: ['椅子', '马', '狗', '人'], answer: '椅子', category: 'humor', difficulty: 'easy' },
    { id: 'h20', question: '为什么程序员总是分不清左右？', options: ['因为他们只看0和1', '太忙了', '不重要', '眼睛不好'], answer: '因为他们只看0和1', category: 'humor', difficulty: 'medium' },
    { id: 'h21', question: '什么东西有耳朵却听不见？', options: ['茶杯', '兔子', '狗', '人'], answer: '茶杯', category: 'humor', difficulty: 'easy' },
    { id: 'h22', question: '程序员最讨厌的数字是？', options: ['404', '666', '888', '520'], answer: '404', category: 'humor', difficulty: 'easy' },
    { id: 'h23', question: '什么东西有舌头却不能说话？', options: ['鞋子', '蛇', '狗', '鹦鹉'], answer: '鞋子', category: 'humor', difficulty: 'easy' },
    { id: 'h24', question: '为什么程序员不喜欢户外？', options: ['因为有太多Bug', '太阳太大', '没有WiFi', '太累了'], answer: '因为有太多Bug', category: 'humor', difficulty: 'easy' },
    { id: 'h25', question: '什么东西有头有尾却没有身体？', options: ['硬币', '蛇', '鱼', '虫'], answer: '硬币', category: 'humor', difficulty: 'easy' },
    { id: 'h26', question: '程序员的女朋友叫什么？', options: ['Bug（因为总是找不到）', '代码', '电脑', '键盘'], answer: 'Bug（因为总是找不到）', category: 'humor', difficulty: 'medium' },
    { id: 'h27', question: '什么东西有皮却不能穿？', options: ['香蕉', '牛', '羊', '猪'], answer: '香蕉', category: 'humor', difficulty: 'easy' },
    { id: 'h28', question: '为什么程序员喜欢用深色主题？', options: ['因为光明会吸引Bug', '省电', '好看', '习惯'], answer: '因为光明会吸引Bug', category: 'humor', difficulty: 'easy' },
    { id: 'h29', question: '什么东西有骨头却不能动？', options: ['伞', '狗', '鱼', '鸟'], answer: '伞', category: 'humor', difficulty: 'easy' },
    { id: 'h30', question: '程序员最喜欢的节日是？', options: ['1024程序员节', '春节', '国庆节', '中秋节'], answer: '1024程序员节', category: 'humor', difficulty: 'easy' },
    { id: 'h31', question: '什么东西有心却不能跳？', options: ['扑克牌', '人', '动物', '机器人'], answer: '扑克牌', category: 'humor', difficulty: 'easy' },
    { id: 'h32', question: '为什么程序员总是很冷静？', options: ['因为他们有很多try-catch', '性格好', '习惯了', '不在乎'], answer: '因为他们有很多try-catch', category: 'humor', difficulty: 'medium' },
    { id: 'h33', question: '什么东西有翅膀却不能飞？', options: ['电风扇', '鸟', '飞机', '蝴蝶'], answer: '电风扇', category: 'humor', difficulty: 'easy' },
    { id: 'h34', question: '程序员最怕听到的话是？', options: ['这个需求很简单', '加班', '开会', '写文档'], answer: '这个需求很简单', category: 'humor', difficulty: 'easy' },
    { id: 'h35', question: '什么东西有门却进不去？', options: ['冰箱', '房子', '学校', '公司'], answer: '冰箱', category: 'humor', difficulty: 'easy' },
    { id: 'h36', question: '为什么程序员喜欢喝咖啡？', options: ['因为Java需要它', '提神', '好喝', '习惯'], answer: '因为Java需要它', category: 'humor', difficulty: 'easy' },
    { id: 'h37', question: '什么东西有窗户却看不到外面？', options: ['Windows系统', '房子', '汽车', '飞机'], answer: 'Windows系统', category: 'humor', difficulty: 'medium' },
    { id: 'h38', question: '程序员最喜欢的动物是？', options: ['Python蟒蛇', '猫', '狗', '兔子'], answer: 'Python蟒蛇', category: 'humor', difficulty: 'easy' },
    { id: 'h39', question: '什么东西有根却不能种？', options: ['头发', '树', '花', '草'], answer: '头发', category: 'humor', difficulty: 'easy' },
    { id: 'h40', question: '为什么程序员不喜欢自然？', options: ['因为它有太多Bug', '太热', '太冷', '没有WiFi'], answer: '因为它有太多Bug', category: 'humor', difficulty: 'easy' },
];

// 🔢 数学题 (15道)
const MATH_QUESTIONS: QuizQuestion[] = [
    { id: 'm1', question: '1 + 1 等于多少？', options: ['2', '1', '3', '11'], answer: '2', category: 'math', difficulty: 'easy' },
    { id: 'm2', question: '10 × 10 等于多少？', options: ['100', '20', '1000', '10'], answer: '100', category: 'math', difficulty: 'easy' },
    { id: 'm3', question: '144 的平方根是？', options: ['12', '14', '11', '13'], answer: '12', category: 'math', difficulty: 'medium' },
    { id: 'm4', question: '2 的 10 次方是？', options: ['1024', '1000', '512', '2048'], answer: '1024', category: 'math', difficulty: 'medium' },
    { id: 'm5', question: '圆周率 π 约等于？', options: ['3.14', '3.41', '2.14', '4.14'], answer: '3.14', category: 'math', difficulty: 'easy' },
    { id: 'm6', question: '一个三角形内角和是多少度？', options: ['180度', '360度', '90度', '270度'], answer: '180度', category: 'math', difficulty: 'easy' },
    { id: 'm7', question: '15% 等于多少？', options: ['0.15', '1.5', '15', '0.015'], answer: '0.15', category: 'math', difficulty: 'easy' },
    { id: 'm8', question: '1/4 + 1/4 等于？', options: ['1/2', '2/4', '1/8', '2/8'], answer: '1/2', category: 'math', difficulty: 'easy' },
    { id: 'm9', question: '一打等于多少？', options: ['12', '10', '6', '24'], answer: '12', category: 'math', difficulty: 'easy' },
    { id: 'm10', question: '5! (5的阶乘) 等于？', options: ['120', '25', '60', '720'], answer: '120', category: 'math', difficulty: 'medium' },
    { id: 'm11', question: '二进制 1010 等于十进制多少？', options: ['10', '1010', '5', '20'], answer: '10', category: 'math', difficulty: 'medium' },
    { id: 'm12', question: '一个正方形有几条对角线？', options: ['2条', '4条', '1条', '6条'], answer: '2条', category: 'math', difficulty: 'easy' },
    { id: 'm13', question: '0.1 + 0.2 在计算机中等于？', options: ['0.30000000000000004', '0.3', '0.30', '0.29'], answer: '0.30000000000000004', category: 'math', difficulty: 'hard' },
    { id: 'm14', question: '1GB 等于多少 MB？', options: ['1024', '1000', '512', '2048'], answer: '1024', category: 'math', difficulty: 'easy' },
    { id: 'm15', question: '十六进制 FF 等于十进制多少？', options: ['255', '256', '15', '16'], answer: '255', category: 'math', difficulty: 'medium' },
];

// 📚 常识题 (15道)
const GENERAL_QUESTIONS: QuizQuestion[] = [
    { id: 'g1', question: 'Python 是以什么动物命名的？', options: ['蟒蛇', '蜥蜴', '鳄鱼', '乌龟'], answer: '蟒蛇', category: 'general', difficulty: 'easy' },
    { id: 'g2', question: 'GitHub 的吉祥物叫什么？', options: ['Octocat', 'Gitcat', 'Hubcat', 'Codedog'], answer: 'Octocat', category: 'general', difficulty: 'easy' },
    { id: 'g3', question: 'Linux 的吉祥物是什么动物？', options: ['企鹅', '狐狸', '猫', '狗'], answer: '企鹅', category: 'general', difficulty: 'easy' },
    { id: 'g4', question: 'HTTP 状态码 404 表示什么？', options: ['未找到', '服务器错误', '成功', '重定向'], answer: '未找到', category: 'general', difficulty: 'easy' },
    { id: 'g5', question: 'CPU 的中文名称是？', options: ['中央处理器', '内存', '硬盘', '显卡'], answer: '中央处理器', category: 'general', difficulty: 'easy' },
    { id: 'g6', question: 'HTML 是什么的缩写？', options: ['超文本标记语言', '高级文本语言', '超链接语言', '网页语言'], answer: '超文本标记语言', category: 'general', difficulty: 'easy' },
    { id: 'g7', question: '世界上第一个程序员是谁？', options: ['Ada Lovelace', 'Alan Turing', 'Bill Gates', 'Steve Jobs'], answer: 'Ada Lovelace', category: 'general', difficulty: 'medium' },
    { id: 'g8', question: 'USB 是什么的缩写？', options: ['通用串行总线', '通用存储设备', '通用系统备份', '通用软件包'], answer: '通用串行总线', category: 'general', difficulty: 'medium' },
    { id: 'g9', question: 'WiFi 中的 Fi 代表什么？', options: ['Fidelity', 'Fire', 'File', '没有特定含义'], answer: '没有特定含义', category: 'general', difficulty: 'hard' },
    { id: 'g10', question: 'JavaScript 和 Java 是什么关系？', options: ['没有关系', '同一语言', 'JS是Java的简化版', 'Java是JS的升级版'], answer: '没有关系', category: 'general', difficulty: 'easy' },
    { id: 'g11', question: 'HTTP 状态码 200 表示什么？', options: ['成功', '重定向', '客户端错误', '服务器错误'], answer: '成功', category: 'general', difficulty: 'easy' },
    { id: 'g12', question: 'RAM 是什么类型的存储？', options: ['随机存取内存', '只读内存', '硬盘', '闪存'], answer: '随机存取内存', category: 'general', difficulty: 'easy' },
    { id: 'g13', question: 'SQL 是什么的缩写？', options: ['结构化查询语言', '简单查询语言', '标准查询语言', '系统查询语言'], answer: '结构化查询语言', category: 'general', difficulty: 'easy' },
    { id: 'g14', question: 'API 是什么的缩写？', options: ['应用程序接口', '自动程序接口', '高级程序接口', '应用协议接口'], answer: '应用程序接口', category: 'general', difficulty: 'easy' },
    { id: 'g15', question: 'Git 是谁创建的？', options: ['Linus Torvalds', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'], answer: 'Linus Torvalds', category: 'general', difficulty: 'medium' },
];

// 合并所有题目
export const ALL_QUIZ_QUESTIONS: QuizQuestion[] = [
    ...PROGRAMMING_QUESTIONS,
    ...LOGIC_QUESTIONS,
    ...HUMOR_QUESTIONS,
    ...MATH_QUESTIONS,
    ...GENERAL_QUESTIONS,
];

/**
 * 获取类别的中文名称和图标
 */
export function getCategoryInfo(category: QuizQuestion['category']): { name: string; icon: string } {
    switch (category) {
        case 'programming': return { name: '编程', icon: '💻' };
        case 'logic': return { name: '逻辑', icon: '🧠' };
        case 'humor': return { name: '幽默', icon: '😄' };
        case 'math': return { name: '数学', icon: '🔢' };
        case 'general': return { name: '常识', icon: '📚' };
        default: return { name: '未知', icon: '❓' };
    }
}

/**
 * 随机打乱数组
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * 获取平衡的随机题目（每个类别尽量均匀）
 * @param count 题目数量，默认10道
 * @returns 随机选择的题目数组
 */
export function getBalancedRandomQuestions(count: number = 10): QuizQuestion[] {
    const categories: QuizQuestion['category'][] = ['programming', 'logic', 'humor', 'math', 'general'];
    const questionsPerCategory = Math.ceil(count / categories.length);
    
    const selectedQuestions: QuizQuestion[] = [];
    
    // 从每个类别随机选择题目
    for (const category of categories) {
        const categoryQuestions = ALL_QUIZ_QUESTIONS.filter(q => q.category === category);
        const shuffled = shuffleArray(categoryQuestions);
        selectedQuestions.push(...shuffled.slice(0, questionsPerCategory));
    }
    
    // 打乱顺序并截取指定数量
    return shuffleArray(selectedQuestions).slice(0, count);
}

/**
 * 获取完全随机的题目
 * @param count 题目数量，默认10道
 * @returns 随机选择的题目数组
 */
export function getRandomQuestions(count: number = 10): QuizQuestion[] {
    const shuffled = shuffleArray(ALL_QUIZ_QUESTIONS);
    return shuffled.slice(0, count);
}

/**
 * 获取题库统计信息
 */
export function getQuizBankStats(): { total: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    for (const q of ALL_QUIZ_QUESTIONS) {
        byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    }
    return {
        total: ALL_QUIZ_QUESTIONS.length,
        byCategory
    };
}
