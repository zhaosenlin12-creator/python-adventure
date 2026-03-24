// 题库系统 - 支持随机选题和难度分类

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'choice' | 'fill' | 'code' | 'math' | 'logic' | 'brainteaser';
export type QuestionSubject = 'math' | 'programming' | 'logic' | 'general' | 'physics' | 'chemistry';

export interface QuestionData {
  id: string;
  type: QuestionType;
  subject: QuestionSubject;
  difficulty: QuestionDifficulty;
  question: string;
  options?: string[];
  answer: string | string[];
  explanation?: string;
  hint?: string;
}

// 数学题库
const mathQuestions: QuestionData[] = [
  // 简单
  {
    id: 'math_easy_1',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '3 + 5 = ?',
    options: ['6', '7', '8', '9'],
    answer: '8',
    explanation: '3加5等于8'
  },
  {
    id: 'math_easy_2',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '10 - 4 = ?',
    options: ['4', '5', '6', '7'],
    answer: '6',
    explanation: '10减4等于6'
  },
  {
    id: 'math_easy_3',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '2 × 6 = ?',
    options: ['10', '11', '12', '13'],
    answer: '12',
    explanation: '2乘以6等于12'
  },
  {
    id: 'math_easy_4',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '15 ÷ 3 = ?',
    options: ['3', '4', '5', '6'],
    answer: '5',
    explanation: '15除以3等于5'
  },
  {
    id: 'math_easy_5',
    type: 'fill',
    subject: 'math',
    difficulty: 'easy',
    question: '一个正方形有几条边？',
    answer: '4',
    explanation: '正方形有4条边'
  },
  {
    id: 'math_easy_6',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '🔢 7 + 8 = ?',
    options: ['13', '14', '15', '16'],
    answer: '15',
    explanation: '7加8等于15'
  },
  {
    id: 'math_easy_7',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '➗ 20 ÷ 4 = ?',
    options: ['4', '5', '6', '7'],
    answer: '5',
    explanation: '20除以4等于5'
  },
  {
    id: 'math_easy_8',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '✖️ 9 × 3 = ?',
    options: ['24', '25', '26', '27'],
    answer: '27',
    explanation: '9乘以3等于27'
  },
  {
    id: 'math_easy_9',
    type: 'choice',
    subject: 'math',
    difficulty: 'easy',
    question: '➖ 18 - 9 = ?',
    options: ['7', '8', '9', '10'],
    answer: '9',
    explanation: '18减9等于9'
  },
  {
    id: 'math_easy_10',
    type: 'fill',
    subject: 'math',
    difficulty: 'easy',
    question: '一个三角形有几个角？',
    answer: '3',
    explanation: '三角形有3个角'
  },
  
  // 中等
  {
    id: 'math_medium_1',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '如果 x + 5 = 12，那么 x = ?',
    options: ['5', '6', '7', '8'],
    answer: '7',
    explanation: 'x = 12 - 5 = 7'
  },
  {
    id: 'math_medium_2',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '一个长方形长8cm，宽5cm，周长是多少？',
    options: ['13cm', '26cm', '40cm', '52cm'],
    answer: '26cm',
    explanation: '周长 = 2×(长+宽) = 2×(8+5) = 26cm'
  },
  {
    id: 'math_medium_3',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '12 × 8 = ?',
    options: ['84', '88', '92', '96'],
    answer: '96',
    explanation: '12乘以8等于96'
  },
  {
    id: 'math_medium_4',
    type: 'fill',
    subject: 'math',
    difficulty: 'medium',
    question: '一个圆的半径是5cm，直径是多少cm？',
    answer: '10',
    explanation: '直径 = 2 × 半径 = 10cm'
  },
  {
    id: 'math_medium_5',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '100以内最大的质数是？',
    options: ['89', '91', '97', '99'],
    answer: '97',
    explanation: '97是100以内最大的质数'
  },
  {
    id: 'math_medium_6',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '📐 一个正方形边长5cm，面积是多少？',
    options: ['20cm²', '25cm²', '30cm²', '35cm²'],
    answer: '25cm²',
    explanation: '面积 = 边长² = 5² = 25cm²'
  },
  {
    id: 'math_medium_7',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '🎯 24的因数有多少个？',
    options: ['6个', '7个', '8个', '9个'],
    answer: '8个',
    explanation: '24的因数：1,2,3,4,6,8,12,24，共8个'
  },
  {
    id: 'math_medium_8',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '🔢 12和18的最大公约数是？',
    options: ['3', '4', '5', '6'],
    answer: '6',
    explanation: '12和18的最大公约数是6'
  },
  {
    id: 'math_medium_9',
    type: 'choice',
    subject: 'math',
    difficulty: 'medium',
    question: '➗ 0.5 + 0.3 = ?',
    options: ['0.7', '0.8', '0.9', '1.0'],
    answer: '0.8',
    explanation: '0.5加0.3等于0.8'
  },
  {
    id: 'math_medium_10',
    type: 'fill',
    subject: 'math',
    difficulty: 'medium',
    question: '一个圆的周长公式是？（用C、π、r表示）',
    answer: 'C=2πr',
    explanation: '圆的周长 = 2 × π × 半径'
  },
  
  // 困难
  {
    id: 'math_hard_1',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '如果 2x + 3 = 15，那么 x = ?',
    options: ['4', '5', '6', '7'],
    answer: '6',
    explanation: '2x = 15 - 3 = 12, x = 6'
  },
  {
    id: 'math_hard_2',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '一个数的3倍加上5等于26，这个数是？',
    options: ['5', '6', '7', '8'],
    answer: '7',
    explanation: '3x + 5 = 26, 3x = 21, x = 7'
  },
  {
    id: 'math_hard_3',
    type: 'fill',
    subject: 'math',
    difficulty: 'hard',
    question: '斐波那契数列：1, 1, 2, 3, 5, 8, 13, 21, 下一个数是？',
    answer: '34',
    explanation: '每个数是前两个数之和：21 + 13 = 34'
  },
  {
    id: 'math_hard_4',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '一个三角形的三个角度分别是60°、60°和多少度？',
    options: ['30°', '45°', '60°', '90°'],
    answer: '60°',
    explanation: '三角形内角和180°，180° - 60° - 60° = 60°，这是等边三角形'
  },
  {
    id: 'math_hard_5',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '如果一个数除以5余3，除以7余4，这个数最小是？',
    options: ['18', '23', '28', '33'],
    answer: '18',
    explanation: '通过中国剩余定理或枚举法，最小的数是18'
  },
  {
    id: 'math_hard_6',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '🎯 勾股定理：直角三角形两直角边为3和4，斜边长度是？',
    options: ['5', '6', '7', '8'],
    answer: '5',
    explanation: '勾股定理：3² + 4² = 5²，斜边=5'
  },
  {
    id: 'math_hard_7',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '📊 一个数的平方是144，这个数是？',
    options: ['±12', '12', '-12', '144'],
    answer: '±12',
    explanation: '12² = 144，(-12)² = 144'
  },
  {
    id: 'math_hard_8',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '🔢 等差数列：2, 5, 8, 11, ...，第10项是？',
    options: ['26', '27', '28', '29'],
    answer: '29',
    explanation: '首项2，公差3，第10项 = 2 + 9×3 = 29'
  },
  {
    id: 'math_hard_9',
    type: 'choice',
    subject: 'math',
    difficulty: 'hard',
    question: '🎲 抛一枚硬币3次，至少出现1次正面的概率是？',
    options: ['7/8', '1/2', '3/4', '1/8'],
    answer: '7/8',
    explanation: '至少1次正面 = 1 - 全是反面 = 1 - (1/2)³ = 7/8'
  },
  {
    id: 'math_hard_10',
    type: 'fill',
    subject: 'math',
    difficulty: 'hard',
    question: '圆的面积公式是？（用S、π、r表示）',
    answer: 'S=πr²',
    explanation: '圆的面积 = π × 半径²'
  }
];

// 物理题库
const physicsQuestions: QuestionData[] = [
  // 简单
  {
    id: 'physics_easy_1',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '⚡ 光的传播速度约为多少？',
    options: ['30万公里/秒', '3万公里/秒', '300公里/秒', '3公里/秒'],
    answer: '30万公里/秒',
    explanation: '光速约为3×10^8米/秒，即30万公里/秒'
  },
  {
    id: 'physics_easy_2',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🌍 地球的重力加速度约为多少？',
    options: ['9.8m/s²', '10m/s²', '8m/s²', '12m/s²'],
    answer: '9.8m/s²',
    explanation: '地球表面的重力加速度约为9.8m/s²'
  },
  {
    id: 'physics_easy_3',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🔊 声音在空气中的传播速度约为多少？',
    options: ['340m/s', '3400m/s', '34m/s', '3.4m/s'],
    answer: '340m/s',
    explanation: '声音在15℃空气中的传播速度约为340m/s'
  },
  {
    id: 'physics_easy_4',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🌡️ 水的沸点是多少摄氏度？',
    options: ['100℃', '0℃', '50℃', '200℃'],
    answer: '100℃',
    explanation: '在标准大气压下，水的沸点是100℃'
  },
  {
    id: 'physics_easy_5',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🧲 同名磁极会怎样？',
    options: ['相互排斥', '相互吸引', '没有作用', '相互旋转'],
    answer: '相互排斥',
    explanation: '同名磁极相互排斥，异名磁极相互吸引'
  },
  {
    id: 'physics_easy_6',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '❄️ 水的冰点是多少摄氏度？',
    options: ['0℃', '100℃', '-10℃', '10℃'],
    answer: '0℃',
    explanation: '在标准大气压下，水的冰点是0℃'
  },
  {
    id: 'physics_easy_7',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🌈 彩虹有几种颜色？',
    options: ['7种', '5种', '6种', '8种'],
    answer: '7种',
    explanation: '彩虹有红橙黄绿蓝靛紫7种颜色'
  },
  {
    id: 'physics_easy_8',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🔋 电池的正极和负极连接会怎样？',
    options: ['短路', '充电', '没反应', '发光'],
    answer: '短路',
    explanation: '正负极直接连接会造成短路，非常危险'
  },
  {
    id: 'physics_easy_9',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '🌙 月球上有没有空气？',
    options: ['没有', '有', '很少', '很多'],
    answer: '没有',
    explanation: '月球几乎没有大气层'
  },
  {
    id: 'physics_easy_10',
    type: 'choice',
    subject: 'physics',
    difficulty: 'easy',
    question: '☀️ 太阳是什么星？',
    options: ['恒星', '行星', '卫星', '彗星'],
    answer: '恒星',
    explanation: '太阳是一颗恒星，能自己发光发热'
  },
  
  // 中等
  {
    id: 'physics_medium_1',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '⚡ 欧姆定律的公式是？',
    options: ['U=IR', 'U=I/R', 'U=I+R', 'U=I-R'],
    answer: 'U=IR',
    explanation: '欧姆定律：电压=电流×电阻'
  },
  {
    id: 'physics_medium_2',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🎯 物体做匀速直线运动时，速度公式是？',
    options: ['v=s/t', 'v=s×t', 'v=t/s', 'v=s+t'],
    answer: 'v=s/t',
    explanation: '速度=路程÷时间'
  },
  {
    id: 'physics_medium_3',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '💡 串联电路的特点是？',
    options: ['电流处处相等', '电压处处相等', '电阻处处相等', '功率处处相等'],
    answer: '电流处处相等',
    explanation: '串联电路中，电流处处相等'
  },
  {
    id: 'physics_medium_4',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🌈 光的三原色是？',
    options: ['红绿蓝', '红黄蓝', '红绿黄', '蓝黄绿'],
    answer: '红绿蓝',
    explanation: '光的三原色是红、绿、蓝（RGB）'
  },
  {
    id: 'physics_medium_5',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '⚖️ 杠杆平衡条件是？',
    options: ['F1×L1=F2×L2', 'F1+L1=F2+L2', 'F1/L1=F2/L2', 'F1-L1=F2-L2'],
    answer: 'F1×L1=F2×L2',
    explanation: '杠杆平衡条件：动力×动力臂=阻力×阻力臂'
  },
  {
    id: 'physics_medium_6',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🔊 声音的传播需要什么？',
    options: ['介质', '真空', '光', '电'],
    answer: '介质',
    explanation: '声音需要通过介质（固体、液体或气体）传播，真空中无法传播'
  },
  {
    id: 'physics_medium_7',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🌡️ 温度计的工作原理是？',
    options: ['热胀冷缩', '电阻变化', '磁性变化', '颜色变化'],
    answer: '热胀冷缩',
    explanation: '液体温度计利用液体热胀冷缩的原理'
  },
  {
    id: 'physics_medium_8',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🔦 凸透镜可以用来做什么？',
    options: ['放大镜', '平面镜', '凹面镜', '棱镜'],
    answer: '放大镜',
    explanation: '凸透镜可以会聚光线，用作放大镜'
  },
  {
    id: 'physics_medium_9',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '⚡ 并联电路的特点是？',
    options: ['电压处处相等', '电流处处相等', '电阻处处相等', '功率处处相等'],
    answer: '电压处处相等',
    explanation: '并联电路中，各支路电压相等'
  },
  {
    id: 'physics_medium_10',
    type: 'choice',
    subject: 'physics',
    difficulty: 'medium',
    question: '🎵 声音的三要素是？',
    options: ['音调、响度、音色', '频率、振幅、波长', '高低、大小、快慢', '长短、粗细、厚薄'],
    answer: '音调、响度、音色',
    explanation: '声音的三要素：音调（高低）、响度（大小）、音色（品质）'
  },
  
  // 困难
  {
    id: 'physics_hard_1',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🚀 牛顿第二定律的公式是？',
    options: ['F=ma', 'F=m/a', 'F=m+a', 'F=a/m'],
    answer: 'F=ma',
    explanation: '牛顿第二定律：力=质量×加速度'
  },
  {
    id: 'physics_hard_2',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '⚡ 电功率的计算公式是？',
    options: ['P=UI', 'P=U/I', 'P=U+I', 'P=U-I'],
    answer: 'P=UI',
    explanation: '电功率=电压×电流'
  },
  {
    id: 'physics_hard_3',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🌊 波长、频率和波速的关系是？',
    options: ['v=λf', 'v=λ/f', 'v=λ+f', 'v=f/λ'],
    answer: 'v=λf',
    explanation: '波速=波长×频率'
  },
  {
    id: 'physics_hard_4',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🔬 动能的计算公式是？',
    options: ['Ek=½mv²', 'Ek=mv²', 'Ek=2mv²', 'Ek=mv'],
    answer: 'Ek=½mv²',
    explanation: '动能=½×质量×速度²'
  },
  {
    id: 'physics_hard_5',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🎯 重力势能的计算公式是？',
    options: ['Ep=mgh', 'Ep=mg/h', 'Ep=mh/g', 'Ep=gh/m'],
    answer: 'Ep=mgh',
    explanation: '重力势能=质量×重力加速度×高度'
  },
  {
    id: 'physics_hard_6',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🔬 密度的计算公式是？',
    options: ['ρ=m/V', 'ρ=m×V', 'ρ=V/m', 'ρ=m+V'],
    answer: 'ρ=m/V',
    explanation: '密度=质量÷体积'
  },
  {
    id: 'physics_hard_7',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '⚡ 焦耳定律的公式是？',
    options: ['Q=I²Rt', 'Q=IRt', 'Q=I²R/t', 'Q=IR/t'],
    answer: 'Q=I²Rt',
    explanation: '电热=电流²×电阻×时间'
  },
  {
    id: 'physics_hard_8',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🎯 压强的计算公式是？',
    options: ['p=F/S', 'p=F×S', 'p=S/F', 'p=F+S'],
    answer: 'p=F/S',
    explanation: '压强=压力÷受力面积'
  },
  {
    id: 'physics_hard_9',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🌊 浮力的计算公式是？',
    options: ['F浮=ρ液gV排', 'F浮=ρ液V排', 'F浮=mgV排', 'F浮=ρ液g'],
    answer: 'F浮=ρ液gV排',
    explanation: '浮力=液体密度×重力加速度×排开液体体积'
  },
  {
    id: 'physics_hard_10',
    type: 'choice',
    subject: 'physics',
    difficulty: 'hard',
    question: '🔭 光的折射定律是？',
    options: ['n1sinθ1=n2sinθ2', 'n1cosθ1=n2cosθ2', 'n1θ1=n2θ2', 'n1/θ1=n2/θ2'],
    answer: 'n1sinθ1=n2sinθ2',
    explanation: '斯涅尔定律：折射率×入射角正弦=折射率×折射角正弦'
  }
];

// 化学题库
const chemistryQuestions: QuestionData[] = [
  // 简单
  {
    id: 'chem_easy_1',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '💧 水的化学式是？',
    options: ['H₂O', 'CO₂', 'O₂', 'H₂'],
    answer: 'H₂O',
    explanation: '水由2个氢原子和1个氧原子组成'
  },
  {
    id: 'chem_easy_2',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🌬️ 空气中含量最多的气体是？',
    options: ['氮气', '氧气', '二氧化碳', '氢气'],
    answer: '氮气',
    explanation: '空气中氮气约占78%'
  },
  {
    id: 'chem_easy_3',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🧂 食盐的主要成分是？',
    options: ['氯化钠', '氯化钾', '碳酸钠', '硫酸钠'],
    answer: '氯化钠',
    explanation: '食盐的化学名称是氯化钠（NaCl）'
  },
  {
    id: 'chem_easy_4',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🔥 燃烧需要哪三个条件？',
    options: ['可燃物、氧气、达到着火点', '可燃物、水、温度', '氧气、水、温度', '可燃物、氮气、温度'],
    answer: '可燃物、氧气、达到着火点',
    explanation: '燃烧三要素：可燃物、氧气（或空气）、达到着火点'
  },
  {
    id: 'chem_easy_5',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🍋 柠檬汁是酸性还是碱性？',
    options: ['酸性', '碱性', '中性', '不确定'],
    answer: '酸性',
    explanation: '柠檬汁含有柠檬酸，呈酸性'
  },
  {
    id: 'chem_easy_6',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🌬️ 氧气约占空气的百分之多少？',
    options: ['21%', '78%', '50%', '10%'],
    answer: '21%',
    explanation: '空气中氧气约占21%'
  },
  {
    id: 'chem_easy_7',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🧪 铁生锈需要什么条件？',
    options: ['水和氧气', '只要水', '只要氧气', '只要温度'],
    answer: '水和氧气',
    explanation: '铁生锈需要水和氧气同时存在'
  },
  {
    id: 'chem_easy_8',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🍬 白糖的主要成分是？',
    options: ['蔗糖', '葡萄糖', '果糖', '淀粉'],
    answer: '蔗糖',
    explanation: '白糖的主要成分是蔗糖'
  },
  {
    id: 'chem_easy_9',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '🔥 灭火的方法不包括？',
    options: ['加热', '隔绝氧气', '降低温度', '移走可燃物'],
    answer: '加热',
    explanation: '灭火要破坏燃烧条件，加热会助燃'
  },
  {
    id: 'chem_easy_10',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'easy',
    question: '💎 钻石的主要成分是？',
    options: ['碳', '硅', '氧', '铁'],
    answer: '碳',
    explanation: '钻石是碳的一种同素异形体'
  },
  
  // 中等
  {
    id: 'chem_medium_1',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '⚗️ 二氧化碳的化学式是？',
    options: ['CO₂', 'CO', 'C₂O', 'O₂C'],
    answer: 'CO₂',
    explanation: '二氧化碳由1个碳原子和2个氧原子组成'
  },
  {
    id: 'chem_medium_2',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🧪 pH值小于7表示？',
    options: ['酸性', '碱性', '中性', '无法判断'],
    answer: '酸性',
    explanation: 'pH<7为酸性，pH=7为中性，pH>7为碱性'
  },
  {
    id: 'chem_medium_3',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🔬 原子的组成包括？',
    options: ['原子核和电子', '质子和中子', '中子和电子', '只有质子'],
    answer: '原子核和电子',
    explanation: '原子由原子核（质子+中子）和核外电子组成'
  },
  {
    id: 'chem_medium_4',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '💎 金刚石和石墨的组成元素是？',
    options: ['碳', '硅', '氧', '氮'],
    answer: '碳',
    explanation: '金刚石和石墨都是由碳元素组成的单质'
  },
  {
    id: 'chem_medium_5',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🌡️ 干冰是什么的固体形态？',
    options: ['二氧化碳', '水', '氮气', '氧气'],
    answer: '二氧化碳',
    explanation: '干冰是固态二氧化碳'
  },
  {
    id: 'chem_medium_6',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🧂 碳酸钠的俗名是？',
    options: ['纯碱/苏打', '小苏打', '烧碱', '石灰'],
    answer: '纯碱/苏打',
    explanation: '碳酸钠（Na₂CO₃）俗称纯碱、苏打'
  },
  {
    id: 'chem_medium_7',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🔬 一氧化碳的化学式是？',
    options: ['CO', 'CO₂', 'C₂O', 'O₂'],
    answer: 'CO',
    explanation: '一氧化碳由1个碳原子和1个氧原子组成'
  },
  {
    id: 'chem_medium_8',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🧪 酒精的化学名称是？',
    options: ['乙醇', '甲醇', '丙醇', '丁醇'],
    answer: '乙醇',
    explanation: '酒精的化学名称是乙醇（C₂H₅OH）'
  },
  {
    id: 'chem_medium_9',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🌊 海水晒盐主要得到什么？',
    options: ['氯化钠', '氯化钾', '硫酸钠', '碳酸钠'],
    answer: '氯化钠',
    explanation: '海水晒盐主要得到氯化钠（食盐）'
  },
  {
    id: 'chem_medium_10',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'medium',
    question: '🔥 天然气的主要成分是？',
    options: ['甲烷', '乙烷', '丙烷', '丁烷'],
    answer: '甲烷',
    explanation: '天然气的主要成分是甲烷（CH₄）'
  },
  
  // 困难
  {
    id: 'chem_hard_1',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '⚗️ 硫酸的化学式是？',
    options: ['H₂SO₄', 'HCl', 'HNO₃', 'H₃PO₄'],
    answer: 'H₂SO₄',
    explanation: '硫酸的化学式是H₂SO₄'
  },
  {
    id: 'chem_hard_2',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🧪 氢氧化钠的俗名是？',
    options: ['烧碱/火碱', '纯碱', '小苏打', '石灰'],
    answer: '烧碱/火碱',
    explanation: '氢氧化钠（NaOH）俗称烧碱、火碱、苛性钠'
  },
  {
    id: 'chem_hard_3',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🔬 元素周期表中，原子序数为1的元素是？',
    options: ['氢', '氦', '锂', '碳'],
    answer: '氢',
    explanation: '氢元素的原子序数为1，是最轻的元素'
  },
  {
    id: 'chem_hard_4',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '⚡ 电解水的化学方程式是？',
    options: ['2H₂O → 2H₂ + O₂', 'H₂O → H₂ + O₂', '2H₂O → H₂ + 2O₂', 'H₂O → 2H₂ + O₂'],
    answer: '2H₂O → 2H₂ + O₂',
    explanation: '电解水生成氢气和氧气，体积比为2:1'
  },
  {
    id: 'chem_hard_5',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🧬 DNA的中文名称是？',
    options: ['脱氧核糖核酸', '核糖核酸', '蛋白质', '氨基酸'],
    answer: '脱氧核糖核酸',
    explanation: 'DNA是脱氧核糖核酸的缩写'
  },
  {
    id: 'chem_hard_6',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🧪 盐酸的化学式是？',
    options: ['HCl', 'H₂SO₄', 'HNO₃', 'H₃PO₄'],
    answer: 'HCl',
    explanation: '盐酸是氯化氢的水溶液，化学式HCl'
  },
  {
    id: 'chem_hard_7',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🔬 碳酸氢钠的俗名是？',
    options: ['小苏打', '纯碱', '烧碱', '石灰'],
    answer: '小苏打',
    explanation: '碳酸氢钠（NaHCO₃）俗称小苏打'
  },
  {
    id: 'chem_hard_8',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '⚗️ 氢氧化钙的俗名是？',
    options: ['熟石灰/消石灰', '生石灰', '石灰石', '大理石'],
    answer: '熟石灰/消石灰',
    explanation: '氢氧化钙（Ca(OH)₂）俗称熟石灰、消石灰'
  },
  {
    id: 'chem_hard_9',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '🔥 氧化钙的俗名是？',
    options: ['生石灰', '熟石灰', '石灰石', '大理石'],
    answer: '生石灰',
    explanation: '氧化钙（CaO）俗称生石灰'
  },
  {
    id: 'chem_hard_10',
    type: 'choice',
    subject: 'chemistry',
    difficulty: 'hard',
    question: '💎 碳酸钙的天然存在形式不包括？',
    options: ['食盐', '石灰石', '大理石', '贝壳'],
    answer: '食盐',
    explanation: '碳酸钙（CaCO₃）存在于石灰石、大理石、贝壳中，食盐是氯化钠'
  }
];

// 编程题库（Python填空题）
const programmingQuestions: QuestionData[] = [
  // 简单 - Python填空题
  {
    id: 'prog_easy_1',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '🐍 给变量赋值：name = ___（填入"小明"，包含引号）',
    answer: '"小明"',
    explanation: 'Python中字符串需要用引号包围',
    hint: '字符串要用引号哦'
  },
  {
    id: 'prog_easy_2',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '🔢 输出变量：age = 10\n___(age)',
    answer: 'print',
    explanation: 'print()函数用于输出内容',
    hint: '使用print函数'
  },
  {
    id: 'prog_easy_3',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '➕ 计算：result = 5 ___ 3（填入加号）',
    answer: '+',
    explanation: '+号用于加法运算',
    hint: '加法用什么符号？'
  },
  {
    id: 'prog_easy_4',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '📝 创建列表：fruits = [___, "香蕉"]（填入"苹果"，包含引号）',
    answer: '"苹果"',
    explanation: '列表中的字符串元素需要引号',
    hint: '列表元素用逗号分隔'
  },
  {
    id: 'prog_easy_5',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '🔁 循环：for i in ___(5):\n    print(i)',
    answer: 'range',
    explanation: 'range()函数生成数字序列',
    hint: 'range函数生成序列'
  },
  {
    id: 'prog_easy_6',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '✖️ 乘法：result = 4 ___ 3',
    answer: '*',
    explanation: '*号用于乘法运算',
    hint: '乘法符号'
  },
  {
    id: 'prog_easy_7',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '📊 创建变量：score = ___（填入数字100）',
    answer: '100',
    explanation: '数字不需要引号',
    hint: '直接写数字'
  },
  {
    id: 'prog_easy_8',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '🎯 注释：___ 这是一行注释',
    answer: '#',
    explanation: 'Python用#号表示单行注释',
    hint: '井号'
  },
  {
    id: 'prog_easy_9',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '📚 获取输入：name = ___()',
    answer: 'input',
    explanation: 'input()函数获取用户输入',
    hint: '输入函数'
  },
  {
    id: 'prog_easy_10',
    type: 'fill',
    subject: 'programming',
    difficulty: 'easy',
    question: '🔢 除法：result = 10 ___ 2',
    answer: '/',
    explanation: '/号用于除法运算',
    hint: '除法符号'
  },
  
  // 中等 - Python填空题
  {
    id: 'prog_medium_1',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🔄 条件判断：if age ___ 18:\n    print("成年")',
    answer: '>=',
    explanation: '>=表示大于等于',
    hint: '大于等于用什么符号？'
  },
  {
    id: 'prog_medium_2',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '📚 访问列表：names = ["小明", "小红"]\nprint(names[___])  # 输出"小明"',
    answer: '0',
    explanation: '列表索引从0开始',
    hint: '第一个元素的索引是？'
  },
  {
    id: 'prog_medium_3',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🎯 定义函数：___ greet():\n    print("你好")',
    answer: 'def',
    explanation: 'def关键字用于定义函数',
    hint: '定义函数用什么关键字？'
  },
  {
    id: 'prog_medium_4',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🔢 字符串转整数：num = ___(___)\n# 将"123"转为整数',
    answer: ['int', '"123"'],
    explanation: 'int()函数将字符串转为整数',
    hint: '类型转换函数'
  },
  {
    id: 'prog_medium_5',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '📊 获取列表长度：nums = [1,2,3,4,5]\ncount = ___(nums)',
    answer: 'len',
    explanation: 'len()函数返回列表长度',
    hint: 'length的缩写'
  },
  {
    id: 'prog_medium_6',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🔄 while循环：i = 0\n___ i < 5:\n    print(i)\n    i += 1',
    answer: 'while',
    explanation: 'while关键字用于条件循环',
    hint: '当...的时候'
  },
  {
    id: 'prog_medium_7',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '📝 列表添加元素：fruits = ["苹果"]\nfruits.___("香蕉")',
    answer: 'append',
    explanation: 'append()方法在列表末尾添加元素',
    hint: '添加、追加'
  },
  {
    id: 'prog_medium_8',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🎯 else语句：if score >= 60:\n    print("及格")\n___:\n    print("不及格")',
    answer: 'else',
    explanation: 'else用于if的否则分支',
    hint: '否则'
  },
  {
    id: 'prog_medium_9',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '🔢 整数除法：result = 7 ___ 2  # 结果为3',
    answer: '//',
    explanation: '//是整数除法，只保留整数部分',
    hint: '两个斜杠'
  },
  {
    id: 'prog_medium_10',
    type: 'fill',
    subject: 'programming',
    difficulty: 'medium',
    question: '📚 字符串大写：text = "hello"\nresult = text.___()  # "HELLO"',
    answer: 'upper',
    explanation: 'upper()方法将字符串转为大写',
    hint: '大写、上'
  },
  
  // 困难 - Python填空题
  {
    id: 'prog_hard_1',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🌀 列表推导式：squares = [x___2 for x in range(5)]',
    answer: '**',
    explanation: '**表示幂运算',
    hint: 'Python中的幂运算符'
  },
  {
    id: 'prog_hard_2',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🎯 Lambda函数：add = lambda x, y: x ___ y',
    answer: '+',
    explanation: 'lambda创建匿名函数',
    hint: '返回两数之和'
  },
  {
    id: 'prog_hard_3',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '📦 字典操作：person = {"name": "小明"}\nage = person.___("age", 18)',
    answer: 'get',
    explanation: 'get()方法安全获取字典值，可设置默认值',
    hint: '获取字典值的方法'
  },
  {
    id: 'prog_hard_4',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🔄 异常处理：try:\n    x = 1/0\n___ ZeroDivisionError:\n    print("除零错误")',
    answer: 'except',
    explanation: 'except用于捕获异常',
    hint: '捕获异常的关键字'
  },
  {
    id: 'prog_hard_5',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🎨 类定义：___ Student:\n    def __init__(self, name):\n        self.name = name',
    answer: 'class',
    explanation: 'class关键字定义类',
    hint: '定义类的关键字'
  },
  {
    id: 'prog_hard_6',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🔢 取余运算：result = 10 ___ 3  # 结果为1',
    answer: '%',
    explanation: '%是取余运算符，10除以3余1',
    hint: '百分号'
  },
  {
    id: 'prog_hard_7',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '📚 导入模块：___ math\nresult = math.sqrt(16)',
    answer: 'import',
    explanation: 'import关键字用于导入模块',
    hint: '导入'
  },
  {
    id: 'prog_hard_8',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🎯 返回值：def add(a, b):\n    ___ a + b',
    answer: 'return',
    explanation: 'return关键字返回函数结果',
    hint: '返回'
  },
  {
    id: 'prog_hard_9',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '🔄 列表切片：nums = [0,1,2,3,4]\nresult = nums[1:___]  # [1,2,3]',
    answer: '4',
    explanation: '切片[1:4]取索引1到3的元素',
    hint: '不包含结束索引'
  },
  {
    id: 'prog_hard_10',
    type: 'fill',
    subject: 'programming',
    difficulty: 'hard',
    question: '📦 字典创建：student = {"name": "小明", "age": ___}  # 年龄18',
    answer: '18',
    explanation: '字典的值可以是数字',
    hint: '直接写数字'
  }
];

// 逻辑题库
const logicQuestions: QuestionData[] = [
  // 简单
  {
    id: 'logic_easy_1',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '如果A大于B，B大于C，那么A和C的关系是？',
    options: ['A大于C', 'A小于C', 'A等于C', '无法确定'],
    answer: 'A大于C',
    explanation: '传递性：A > B > C，所以A > C'
  },
  {
    id: 'logic_easy_2',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '所有的猫都是动物，小花是猫，所以小花是？',
    options: ['动物', '植物', '人', '无法确定'],
    answer: '动物',
    explanation: '三段论推理：所有猫是动物，小花是猫，所以小花是动物'
  },
  {
    id: 'logic_easy_3',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '如果今天是星期一，那么明天是星期几？',
    options: ['星期二', '星期三', '星期日', '星期一'],
    answer: '星期二',
    explanation: '星期一的下一天是星期二'
  },
  {
    id: 'logic_easy_4',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '红灯停，绿灯行。现在是红灯，应该？',
    options: ['停', '行', '加速', '倒车'],
    answer: '停',
    explanation: '交通规则：红灯停'
  },
  {
    id: 'logic_easy_5',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '一年有几个季节？',
    options: ['4个', '3个', '5个', '12个'],
    answer: '4个',
    explanation: '一年有春夏秋冬四个季节'
  },
  
  // 中等
  {
    id: 'logic_medium_1',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '如果A为真且B为真，A && B的结果是？',
    options: ['真', '假', '不确定', '错误'],
    answer: '真',
    explanation: 'AND运算：两个都为真时结果才为真'
  },
  {
    id: 'logic_medium_2',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '小明比小红高，小红比小刚高，谁最矮？',
    options: ['小刚', '小红', '小明', '一样高'],
    answer: '小刚',
    explanation: '小明 > 小红 > 小刚，所以小刚最矮'
  },
  {
    id: 'logic_medium_3',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '三个开关控制三盏灯，你在另一个房间，只能进去一次，如何确定哪个开关控制哪盏灯？',
    options: ['打开一个开关等一会，关掉后打开另一个，进去看', '随机猜', '同时打开所有开关', '无法确定'],
    answer: '打开一个开关等一会，关掉后打开另一个，进去看',
    explanation: '利用灯泡的热量：开一会的灯泡会发热，当前开着的灯会亮，剩下的是第三个开关'
  },
  {
    id: 'logic_medium_4',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '有5个海盗分100颗宝石，从最凶的开始提方案，超过半数同意就通过，否则提议者被扔下海。第一个海盗应该提什么方案？',
    options: ['97,0,1,0,2', '100,0,0,0,0', '50,50,0,0,0', '20,20,20,20,20'],
    answer: '97,0,1,0,2',
    explanation: '逆向推理：第一个海盗只需要3票（包括自己），给第3和第5个海盗各1-2颗即可'
  },
  {
    id: 'logic_medium_5',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '一个人说"我在说谎"，这句话是真是假？',
    options: ['悖论，无法判断', '真', '假', '有时真有时假'],
    answer: '悖论，无法判断',
    explanation: '这是著名的"说谎者悖论"，如果是真的则是假的，如果是假的则是真的'
  },
  
  // 困难
  {
    id: 'logic_hard_1',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '有3个箱子，一个装金子，一个装银子，一个装铜。标签都贴错了。你只能从一个箱子取一个物品，如何确定所有箱子的内容？',
    options: ['从标着"金银混合"的箱子取', '从标着"金"的箱子取', '从标着"银"的箱子取', '无法确定'],
    answer: '从标着"金银混合"的箱子取',
    explanation: '因为所有标签都错了，从"混合"箱取出的一定是纯的，由此可推出其他箱子'
  },
  {
    id: 'logic_hard_2',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '有12个球，其中一个重量不同，用天平最少称几次能找出来？',
    options: ['3次', '2次', '4次', '5次'],
    answer: '3次',
    explanation: '分组称重法：第一次4:4:4，第二次缩小范围，第三次确定'
  },
  {
    id: 'logic_hard_3',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '蒙提霍尔问题：三扇门后一扇有奖，你选一扇后主持人打开另一扇没奖的门，此时换门中奖概率是？',
    options: ['2/3', '1/2', '1/3', '1'],
    answer: '2/3',
    explanation: '换门策略：你最初选错的概率是2/3，此时换门必中奖'
  },
  {
    id: 'logic_hard_4',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '有100个囚犯和100个箱子，每个箱子里有一个囚犯的名字。每人最多打开50个箱子找自己的名字。如何让所有人都找到的概率最大？',
    options: ['循环策略：从自己编号的箱子开始，按箱内编号继续', '随机打开50个', '前50个', '后50个'],
    answer: '循环策略：从自己编号的箱子开始，按箱内编号继续',
    explanation: '循环策略成功率约31%，远高于随机的0.5^100'
  },
  {
    id: 'logic_hard_5',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '有两个绳子，每个烧完需要1小时，但燃烧速度不均匀。如何测量45分钟？',
    options: ['同时点燃绳1两端和绳2一端，绳1烧完后点燃绳2另一端', '点燃一根的中间', '用一根半', '无法测量'],
    answer: '同时点燃绳1两端和绳2一端，绳1烧完后点燃绳2另一端',
    explanation: '绳1两端烧需30分钟，此时绳2剩30分钟，两端烧需15分钟，共45分钟'
  },
  
  // 新增逻辑题
  {
    id: 'logic_easy_6',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '🎂 小明今年8岁，他的姐姐比他大3岁，姐姐今年几岁？',
    options: ['11岁', '10岁', '12岁', '9岁'],
    answer: '11岁',
    explanation: '8 + 3 = 11岁'
  },
  {
    id: 'logic_easy_7',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '🍎 篮子里有5个苹果，拿走2个，还剩几个？',
    options: ['3个', '2个', '5个', '0个'],
    answer: '3个',
    explanation: '5 - 2 = 3个'
  },
  {
    id: 'logic_easy_8',
    type: 'choice',
    subject: 'logic',
    difficulty: 'easy',
    question: '🚶 小明向东走5步，再向西走3步，他离起点几步？',
    options: ['2步', '5步', '3步', '8步'],
    answer: '2步',
    explanation: '向东5步，向西3步，净位移是东边2步'
  },
  {
    id: 'logic_medium_6',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '🚗 一辆车从A地到B地，去时速度60km/h，回来速度40km/h，平均速度是多少？',
    options: ['48km/h', '50km/h', '45km/h', '55km/h'],
    answer: '48km/h',
    explanation: '平均速度 = 2 / (1/60 + 1/40) = 48km/h，不是简单的(60+40)/2'
  },
  {
    id: 'logic_medium_7',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '🎯 5个人排队，小明不在第一个也不在最后一个，他可能在第几个位置？',
    options: ['第2、3、4个', '第1、2、3个', '第3、4、5个', '第1、5个'],
    answer: '第2、3、4个',
    explanation: '排除第1和第5个位置，剩下2、3、4'
  },
  {
    id: 'logic_medium_8',
    type: 'choice',
    subject: 'logic',
    difficulty: 'medium',
    question: '🎁 三个盒子，一个装金币，一个装银币，一个装铜币。每个盒子的标签都贴错了。你只能从一个盒子取一个硬币，如何确定所有盒子？',
    options: ['从标着"金银混合"的盒子取', '从标着"金"的盒子取', '从标着"银"的盒子取', '无法确定'],
    answer: '从标着"金银混合"的盒子取',
    explanation: '因为所有标签都错了，从"混合"标签的盒子取出的一定是纯的，由此推出其他'
  },
  {
    id: 'logic_hard_6',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '🔢 有1000瓶药，其中1瓶有毒。用小白鼠测试，毒药1小时后发作。最少需要几只小白鼠才能在1小时内找出毒药？',
    options: ['10只', '100只', '500只', '1000只'],
    answer: '10只',
    explanation: '用二进制编码：2^10=1024，10只老鼠可以表示1024种状态'
  },
  {
    id: 'logic_hard_7',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '🎲 抛两个骰子，点数之和为7的概率是多少？',
    options: ['1/6', '1/12', '1/9', '1/8'],
    answer: '1/6',
    explanation: '和为7的组合有6种：(1,6)(2,5)(3,4)(4,3)(5,2)(6,1)，总共36种，概率=6/36=1/6'
  },
  {
    id: 'logic_hard_8',
    type: 'choice',
    subject: 'logic',
    difficulty: 'hard',
    question: '🏃 100米赛跑，小明超过第二名，他现在是第几名？',
    options: ['第二名', '第一名', '第三名', '无法确定'],
    answer: '第二名',
    explanation: '超过第二名，就变成第二名，不是第一名'
  }
];

// 脑筋急转弯题库（幽默搞笑）
const brainteaserQuestions: QuestionData[] = [
  // 简单
  {
    id: 'brain_easy_1',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '😂 什么东西越洗越脏？',
    options: ['水', '肥皂', '衣服', '手'],
    answer: '水',
    explanation: '水用来洗东西，洗的东西越多，水就越脏'
  },
  {
    id: 'brain_easy_2',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '⚽ 什么门永远关不上？',
    options: ['球门', '木门', '铁门', '玻璃门'],
    answer: '球门',
    explanation: '球门没有门扇，永远是开着的'
  },
  {
    id: 'brain_easy_3',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '🌀 什么车没有轮子？',
    options: ['风车', '汽车', '自行车', '火车'],
    answer: '风车',
    explanation: '风车是用来发电或磨面的，没有轮子'
  },
  {
    id: 'brain_easy_4',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '🐔 什么蛋不能吃？',
    options: ['笨蛋', '鸡蛋', '鸭蛋', '鹅蛋'],
    answer: '笨蛋',
    explanation: '笨蛋是骂人的话，不是真的蛋'
  },
  {
    id: 'brain_easy_5',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '🌊 什么海不能游泳？',
    options: ['人海', '大海', '东海', '南海'],
    answer: '人海',
    explanation: '人海指人很多，不是真的海'
  },
  {
    id: 'brain_easy_6',
    type: 'choice',
    subject: 'general',
    difficulty: 'easy',
    question: '📚 什么书买不到？',
    options: ['秘书', '课本', '小说', '字典'],
    answer: '秘书',
    explanation: '秘书是职业，不是书'
  },
  
  // 中等
  {
    id: 'brain_medium_1',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🔨 什么东西有头无脚？',
    options: ['钉子', '桌子', '椅子', '床'],
    answer: '钉子',
    explanation: '钉子有钉头但没有脚'
  },
  {
    id: 'brain_medium_2',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '📖 什么书没有字？',
    options: ['天书', '漫画书', '字典', '课本'],
    answer: '天书',
    explanation: '天书指看不懂的书，或指天空这本"书"'
  },
  {
    id: 'brain_medium_3',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🤔 为什么好马不吃回头草？',
    options: ['后面的草被吃光了', '草不好吃', '马不饿', '马很骄傲'],
    answer: '后面的草被吃光了',
    explanation: '因为马一直往前走，后面的草都被吃完了'
  },
  {
    id: 'brain_medium_4',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🐘 大象的左耳朵像什么？',
    options: ['右耳朵', '扇子', '叶子', '翅膀'],
    answer: '右耳朵',
    explanation: '大象的左耳朵最像它的右耳朵'
  },
  {
    id: 'brain_medium_5',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🎯 什么东西天气越热，它爬得越高？',
    options: ['温度计', '太阳', '飞机', '热气球'],
    answer: '温度计',
    explanation: '温度计的水银柱随温度升高而上升'
  },
  {
    id: 'brain_medium_6',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '😄 什么动物最容易摔倒？',
    options: ['狡猾的狐狸（狡猾=脚滑）', '笨重的大象', '灵活的猴子', '稳重的乌龟'],
    answer: '狡猾的狐狸（狡猾=脚滑）',
    explanation: '狡猾谐音"脚滑"，所以容易摔倒'
  },
  {
    id: 'brain_medium_7',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🐷 什么动物最爱问"为什么"？',
    options: ['猪（猪=诸=诸多问题）', '猴子', '狗', '猫'],
    answer: '猪（猪=诸=诸多问题）',
    explanation: '猪谐音"诸"，诸多问题'
  },
  {
    id: 'brain_medium_8',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🦆 什么鸭子用两只脚走路？',
    options: ['所有的鸭子', '只有公鸭', '只有母鸭', '小鸭子'],
    answer: '所有的鸭子',
    explanation: '所有鸭子都是用两只脚走路的'
  },
  {
    id: 'brain_medium_9',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🌙 什么时候太阳会从西边出来？',
    options: ['发誓的时候', '永远不会', '日食时', '晚上'],
    answer: '发誓的时候',
    explanation: '人们发誓时常说"太阳从西边出来我就..."'
  },
  {
    id: 'brain_medium_10',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🎨 什么笔不能写字？',
    options: ['山水画的笔触', '钢笔', '铅笔', '毛笔'],
    answer: '山水画的笔触',
    explanation: '山水画中的"笔"指笔触、笔法，不是真的笔'
  },
  {
    id: 'brain_medium_11',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🏃 什么人跑得最快？',
    options: ['说谎的人（说曹操曹操到）', '运动员', '警察', '小偷'],
    answer: '说谎的人（说曹操曹操到）',
    explanation: '说谎的人"跑"得快，话还没说完就跑了'
  },
  {
    id: 'brain_medium_12',
    type: 'choice',
    subject: 'general',
    difficulty: 'medium',
    question: '🍌 什么水果最忙？',
    options: ['芒果（忙果）', '苹果', '香蕉', '橙子'],
    answer: '芒果（忙果）',
    explanation: '芒果谐音"忙果"，最忙的水果'
  },
  
  // 困难
  {
    id: 'brain_hard_1',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🤪 有一个人头戴安全帽，上面绑着一把扇子，左手拿着电风扇，右手拿着水壶，脚穿溜冰鞋，请问他要去哪里？',
    options: ['精神病院', '游乐场', '商店', '家'],
    answer: '精神病院',
    explanation: '这是脑筋急转弯，装备如此奇怪的人可能需要去精神病院'
  },
  {
    id: 'brain_hard_2',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🎭 什么东西你有，别人也有，但是你用不着，别人却经常用？',
    options: ['名字', '衣服', '手机', '钱包'],
    answer: '名字',
    explanation: '你的名字是别人叫你时用的，你自己很少用'
  },
  {
    id: 'brain_hard_3',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🔍 什么东西放在桌子上，你看得见摸不着？',
    options: ['影子', '水', '书', '笔'],
    answer: '影子',
    explanation: '影子可以看见但摸不到'
  },
  {
    id: 'brain_hard_4',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '💻 程序员最讨厌的四个字是什么？',
    options: ['需求变更', '加班加点', '工资太低', '没有女友'],
    answer: '需求变更',
    explanation: '程序员最怕客户突然改需求，之前的代码都白写了'
  },
  {
    id: 'brain_hard_5',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🐛 为什么程序员总是分不清万圣节和圣诞节？',
    options: ['因为 Oct 31 = Dec 25（八进制31=十进制25）', '因为都放假', '因为都有礼物', '因为都很开心'],
    answer: '因为 Oct 31 = Dec 25（八进制31=十进制25）',
    explanation: '这是程序员的冷笑话：八进制的31等于十进制的25'
  },
  {
    id: 'brain_hard_6',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '😂 为什么Python程序员喜欢用Mac？',
    options: ['因为Mac自带Python', '因为Mac好看', '因为Mac贵', '因为Mac快'],
    answer: '因为Mac自带Python',
    explanation: 'macOS系统预装了Python，开箱即用'
  },
  {
    id: 'brain_hard_7',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🎯 什么东西越多越便宜，越少越贵？',
    options: ['知识（知识越多越谦虚）', '钱', '时间', '朋友'],
    answer: '知识（知识越多越谦虚）',
    explanation: '知识越多的人越谦虚（便宜），知识越少越骄傲（贵）'
  },
  {
    id: 'brain_hard_8',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🤔 什么东西有五个头，但人不觉得奇怪？',
    options: ['手和脚（五个手指/脚趾）', '五个人', '五头蛇', '五头龙'],
    answer: '手和脚（五个手指/脚趾）',
    explanation: '手指和脚趾的"头"，每个人都有'
  },
  {
    id: 'brain_hard_9',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🎨 什么东西越洗越小？',
    options: ['肥皂', '衣服', '碗', '手'],
    answer: '肥皂',
    explanation: '肥皂用水洗会越来越小'
  },
  {
    id: 'brain_hard_10',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🌟 什么星星看不见？',
    options: ['电影明星', '北极星', '流星', '恒星'],
    answer: '电影明星',
    explanation: '电影明星是人，不是天上的星星'
  },
  {
    id: 'brain_hard_11',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🎓 在乐启享学编程，最开心的是什么？',
    options: ['代码运行成功的那一刻', '下课', '考试', '作业'],
    answer: '代码运行成功的那一刻',
    explanation: '在乐启享学编程，看到自己写的代码成功运行是最有成就感的时刻！'
  },
  {
    id: 'brain_hard_12',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '💡 程序员的三大美德是什么？',
    options: ['懒惰、急躁、傲慢', '勤奋、耐心、谦虚', '聪明、努力、坚持', '创新、合作、分享'],
    answer: '懒惰、急躁、傲慢',
    explanation: 'Larry Wall提出：懒惰让你写工具，急躁让你优化，傲慢让你写好代码'
  },
  {
    id: 'brain_hard_13',
    type: 'choice',
    subject: 'general',
    difficulty: 'hard',
    question: '🎮 为什么程序员喜欢玩游戏？',
    options: ['因为游戏有明确的规则和反馈', '因为游戏好玩', '因为游戏便宜', '因为游戏简单'],
    answer: '因为游戏有明确的规则和反馈',
    explanation: '程序员喜欢游戏的逻辑性和即时反馈，就像调试代码一样'
  }
];

// 合并所有题库
export const allQuestions: QuestionData[] = [
  ...mathQuestions,
  ...physicsQuestions,
  ...chemistryQuestions,
  ...programmingQuestions,
  ...logicQuestions,
  ...brainteaserQuestions
];

// 按难度分类
export const questionsByDifficulty = {
  easy: allQuestions.filter(q => q.difficulty === 'easy'),
  medium: allQuestions.filter(q => q.difficulty === 'medium'),
  hard: allQuestions.filter(q => q.difficulty === 'hard')
};

// 按学科分类
export const questionsBySubject = {
  math: allQuestions.filter(q => q.subject === 'math'),
  physics: allQuestions.filter(q => q.subject === 'physics'),
  chemistry: allQuestions.filter(q => q.subject === 'chemistry'),
  programming: allQuestions.filter(q => q.subject === 'programming'),
  logic: allQuestions.filter(q => q.subject === 'logic'),
  general: allQuestions.filter(q => q.subject === 'general')
};

// 随机选择题目
export function getRandomQuestions(
  count: number,
  difficulty?: QuestionDifficulty,
  subject?: QuestionSubject
): QuestionData[] {
  let pool = allQuestions;
  
  // 按难度筛选
  if (difficulty) {
    pool = pool.filter(q => q.difficulty === difficulty);
  }
  
  // 按学科筛选
  if (subject) {
    pool = pool.filter(q => q.subject === subject);
  }
  
  // 随机打乱
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  
  // 返回指定数量
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 获取混合难度的题目（按比例）
export function getMixedDifficultyQuestions(
  count: number,
  easyRatio: number = 0.4,
  mediumRatio: number = 0.4,
  hardRatio: number = 0.2,
  subject?: QuestionSubject
): QuestionData[] {
  const easyCount = Math.floor(count * easyRatio);
  const mediumCount = Math.floor(count * mediumRatio);
  const hardCount = count - easyCount - mediumCount;
  
  const easy = getRandomQuestions(easyCount, 'easy', subject);
  const medium = getRandomQuestions(mediumCount, 'medium', subject);
  const hard = getRandomQuestions(hardCount, 'hard', subject);
  
  // 合并并随机打乱
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}

// 根据关卡推荐题目
export function getQuestionsForLevel(levelNumber: number, count: number = 3): QuestionData[] {
  if (levelNumber <= 2) {
    // 前两关：简单题为主
    return getMixedDifficultyQuestions(count, 0.8, 0.2, 0);
  } else if (levelNumber <= 4) {
    // 3-4关：简单+中等
    return getMixedDifficultyQuestions(count, 0.4, 0.5, 0.1);
  } else {
    // 5关及以后：混合难度
    return getMixedDifficultyQuestions(count, 0.3, 0.4, 0.3);
  }
}
