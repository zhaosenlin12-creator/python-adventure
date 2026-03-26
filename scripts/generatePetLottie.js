/**
 * 🎨 宠物 Lottie 动画批量生成器
 * 
 * 为 7 种宠物 × 12 种情绪状态生成真实可渲染的 Lottie JSON 动画
 * 每种宠物有独特配色和特征，每种情绪有独特动画效果
 * 
 * 用法: node scripts/generatePetLottie.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 配置
// ============================================================

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'pets', 'lottie');
const CANVAS_SIZE = 256;
const CENTER = CANVAS_SIZE / 2;
const FRAME_RATE = 30;

// ============================================================
// 宠物视觉设计
// ============================================================

const PET_DESIGNS = {
  code_kitty: {
    name: '代码喵喵',
    bodyColor: [1, 0.624, 0.263],      // 橘色
    bodySize: [90, 80],
    eyeColor: [0.2, 0.6, 0.2],         // 绿瞳
    features: 'cat',
    accentColor: [1, 0.85, 0.4],       // 浅黄
  },
  algo_bunny: {
    name: '银霜灵猫',
    bodyColor: [0.73, 0.78, 0.86],     // 银灰
    bodySize: [86, 82],
    eyeColor: [0.38, 0.64, 0.92],      // 冰蓝瞳
    features: 'cat',
    accentColor: [0.9, 0.95, 1],       // 亮银白
  },
  shiba_debugger: {
    name: '忠犬柴柴',
    bodyColor: [1, 0.72, 0.3],         // 柴犬色
    bodySize: [88, 82],
    eyeColor: [0.3, 0.2, 0.1],         // 棕瞳
    features: 'dog',
    accentColor: [1, 0.95, 0.85],      // 奶白
  },
  bit_bot: {
    name: '比特机器人',
    bodyColor: [0.13, 0.85, 1],        // 青色
    bodySize: [85, 90],
    eyeColor: [0, 1, 0.8],             // 霓虹绿
    features: 'robot',
    accentColor: [0.2, 0.3, 0.5],      // 深蓝灰
  },
  data_sprite: {
    name: '数据精灵',
    bodyColor: [0.58, 0.88, 0.83],     // 薄荷
    bodySize: [75, 75],
    eyeColor: [0.4, 0.9, 1],           // 天蓝
    features: 'sprite',
    accentColor: [0.8, 1, 0.95],       // 淡绿
  },
  ava_ai: {
    name: 'AI助手Ava',
    bodyColor: [0.65, 0.55, 0.98],     // 紫色
    bodySize: [80, 80],
    eyeColor: [1, 0.8, 0.2],           // 金瞳
    features: 'ai',
    accentColor: [0.85, 0.75, 1],      // 淡紫
  },
  code_dragon: {
    name: '幻想龙宝',
    bodyColor: [0.96, 0.62, 0.04],     // 金色
    bodySize: [95, 88],
    eyeColor: [1, 0.2, 0.1],           // 红瞳
    features: 'dragon',
    accentColor: [1, 0.85, 0.2],       // 亮金
  },
};

const MOODS = [
  'normal', 'happy', 'excited', 'sad', 'tired', 'curious',
  'eating', 'coma', 'playing', 'sleeping', 'walking', 'question'
];

// ============================================================
// Lottie JSON 构建工具
// ============================================================

/** 静态属性 */
function staticVal(val) {
  return { a: 0, k: val };
}

/** 关键帧动画属性 */
function animatedVal(keyframes) {
  const kf = keyframes.map((f, i) => {
    const obj = { t: f.t, s: f.s };
    if (i < keyframes.length - 1) {
      obj.i = { x: [0.42], y: [1] };
      obj.o = { x: [0.58], y: [0] };
    }
    return obj;
  });
  return { a: 1, k: kf };
}

/** 多维关键帧（position等） */
function animatedMulti(keyframes) {
  const kf = keyframes.map((f, i) => {
    const obj = { t: f.t, s: f.s };
    if (i < keyframes.length - 1) {
      obj.i = { x: f.s.map(() => 0.42), y: f.s.map(() => 1) };
      obj.o = { x: f.s.map(() => 0.58), y: f.s.map(() => 0) };
    }
    return obj;
  });
  return { a: 1, k: kf };
}

/** 创建椭圆形状 */
function ellipseShape(cx, cy, rx, ry, fillColor, fillOpacity = 100) {
  return {
    ty: 'gr',
    it: [
      { ty: 'el', p: staticVal([cx, cy]), s: staticVal([rx * 2, ry * 2]) },
      { ty: 'fl', c: staticVal([...fillColor, 1]), o: staticVal(fillOpacity) },
      shapeTr()
    ]
  };
}

/** 创建矩形 */
function rectShape(cx, cy, w, h, fillColor, r = 0) {
  return {
    ty: 'gr',
    it: [
      { ty: 'rc', p: staticVal([cx, cy]), s: staticVal([w, h]), r: staticVal(r) },
      { ty: 'fl', c: staticVal([...fillColor, 1]), o: staticVal(100) },
      shapeTr()
    ]
  };
}

/** 创建三角形 (path) */
function triangleShape(x1, y1, x2, y2, x3, y3, fillColor) {
  return {
    ty: 'gr',
    it: [
      {
        ty: 'sh',
        ks: staticVal({
          c: true,
          v: [[x1, y1], [x2, y2], [x3, y3]],
          i: [[0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0]]
        })
      },
      { ty: 'fl', c: staticVal([...fillColor, 1]), o: staticVal(100) },
      shapeTr()
    ]
  };
}

/** 默认形状变换 */
function shapeTr() {
  return {
    ty: 'tr',
    p: staticVal([0, 0]),
    a: staticVal([0, 0]),
    s: staticVal([100, 100]),
    r: staticVal(0),
    o: staticVal(100)
  };
}

/** 创建图层 */
function shapeLayer(name, shapes, transform = {}) {
  const dur = transform.duration || 60;
  return {
    ty: 4,
    nm: name,
    ip: 0,
    op: dur,
    st: 0,
    ks: {
      o: transform.opacity || staticVal(100),
      r: transform.rotation || staticVal(0),
      p: transform.position || staticVal([CENTER, CENTER, 0]),
      a: staticVal([0, 0, 0]),
      s: transform.scale || staticVal([100, 100, 100])
    },
    shapes: shapes
  };
}

/** 创建完整 Lottie JSON */
function lottieWrapper(layers, duration = 60) {
  return {
    v: '5.7.4',
    fr: FRAME_RATE,
    ip: 0,
    op: duration,
    w: CANVAS_SIZE,
    h: CANVAS_SIZE,
    nm: 'pet_animation',
    ddd: 0,
    assets: [],
    layers: layers
  };
}

// ============================================================
// 宠物特征生成
// ============================================================

function buildPetShapes(design) {
  const shapes = [];
  const [bw, bh] = design.bodySize;
  const bc = design.bodyColor;
  const ac = design.accentColor;
  const ec = design.eyeColor;

  // 身体
  shapes.push(ellipseShape(0, 10, bw / 2, bh / 2, bc));

  // 肚皮（浅色）
  shapes.push(ellipseShape(0, 18, bw * 0.32, bh * 0.35, ac));

  // 特征
  switch (design.features) {
    case 'cat':
      // 猫耳
      shapes.push(triangleShape(-28, -35, -18, -60, -8, -35, bc));
      shapes.push(triangleShape(8, -35, 18, -60, 28, -35, bc));
      // 内耳
      shapes.push(triangleShape(-24, -38, -18, -54, -12, -38, [1, 0.7, 0.7]));
      shapes.push(triangleShape(12, -38, 18, -54, 24, -38, [1, 0.7, 0.7]));
      // 胡须
      shapes.push(rectShape(-35, 8, 18, 1.5, [0.3, 0.3, 0.3]));
      shapes.push(rectShape(-33, 14, 16, 1.5, [0.3, 0.3, 0.3]));
      shapes.push(rectShape(35, 8, 18, 1.5, [0.3, 0.3, 0.3]));
      shapes.push(rectShape(33, 14, 16, 1.5, [0.3, 0.3, 0.3]));
      // 鼻子
      shapes.push(ellipseShape(0, 5, 4, 3, [1, 0.5, 0.5]));
      break;

    case 'bunny':
      // 长耳朵
      shapes.push(ellipseShape(-14, -58, 10, 30, bc));
      shapes.push(ellipseShape(14, -58, 10, 30, bc));
      shapes.push(ellipseShape(-14, -58, 6, 24, [1, 0.75, 0.8]));
      shapes.push(ellipseShape(14, -58, 6, 24, [1, 0.75, 0.8]));
      // 小鼻子
      shapes.push(ellipseShape(0, 5, 4, 3, [1, 0.6, 0.65]));
      // 兔尾
      shapes.push(ellipseShape(0, 52, 10, 10, ac));
      break;

    case 'dog':
      // 柴犬耳（三角下垂）
      shapes.push(triangleShape(-30, -30, -22, -55, -10, -30, bc));
      shapes.push(triangleShape(10, -30, 22, -55, 30, -30, bc));
      // 脸部白色区域
      shapes.push(ellipseShape(0, 8, 22, 20, ac));
      // 鼻子
      shapes.push(ellipseShape(0, 2, 5, 4, [0.2, 0.15, 0.1]));
      // 嘴巴
      shapes.push(rectShape(0, 10, 1.5, 8, [0.3, 0.2, 0.15]));
      break;

    case 'robot':
      // 身体改为矩形
      shapes.length = 0;
      shapes.push(rectShape(0, 10, bw, bh, bc, 12));
      // LED屏幕（脸）
      shapes.push(rectShape(0, 5, bw * 0.7, bh * 0.5, [0.05, 0.1, 0.2], 8));
      // 天线
      shapes.push(rectShape(0, -48, 3, 20, [0.5, 0.5, 0.6]));
      shapes.push(ellipseShape(0, -60, 5, 5, [1, 0.3, 0.3]));
      // 螺丝
      shapes.push(ellipseShape(-30, -20, 4, 4, [0.7, 0.7, 0.8]));
      shapes.push(ellipseShape(30, -20, 4, 4, [0.7, 0.7, 0.8]));
      break;

    case 'sprite':
      // 全身发光球体
      shapes.length = 0;
      shapes.push(ellipseShape(0, 0, 42, 42, bc));
      shapes.push(ellipseShape(0, 0, 55, 55, design.accentColor, 25));  // 外光晕
      shapes.push(ellipseShape(0, -5, 30, 30, ac, 60));  // 内光
      // 小翅膀
      shapes.push(ellipseShape(-38, -8, 15, 8, ac, 70));
      shapes.push(ellipseShape(38, -8, 15, 8, ac, 70));
      break;

    case 'ai':
      // 球形身体
      shapes.length = 0;
      shapes.push(ellipseShape(0, 0, 45, 45, bc));
      // 光环
      shapes.push(ellipseShape(0, 0, 52, 52, ac, 30));
      // 中心眼（旋转全息）
      shapes.push(ellipseShape(0, -5, 15, 15, [1, 1, 1], 90));
      shapes.push(ellipseShape(0, -5, 8, 8, ec));
      // 数据流装饰线
      shapes.push(rectShape(-25, 20, 50, 2, ac, 0));
      shapes.push(rectShape(-20, 26, 40, 2, ac, 0));
      break;

    case 'dragon':
      // 龙身体
      shapes.push(ellipseShape(0, 10, bw / 2, bh / 2, bc));
      // 小翅膀
      shapes.push(triangleShape(-48, -10, -70, -35, -35, -25, ac));
      shapes.push(triangleShape(48, -10, 70, -35, 35, -25, ac));
      // 龙角
      shapes.push(triangleShape(-18, -38, -12, -58, -6, -38, ac));
      shapes.push(triangleShape(6, -38, 12, -58, 18, -38, ac));
      // 鼻烟
      shapes.push(ellipseShape(-10, 0, 3, 2, [1, 0.5, 0.2]));
      shapes.push(ellipseShape(10, 0, 3, 2, [1, 0.5, 0.2]));
      // 肚皮
      shapes.push(ellipseShape(0, 22, 25, 22, ac));
      break;
  }

  // 通用眼睛（robot和ai已经有自己的眼睛设计）
  if (!['robot', 'ai', 'sprite'].includes(design.features)) {
    // 眼白
    shapes.push(ellipseShape(-14, -8, 9, 10, [1, 1, 1]));
    shapes.push(ellipseShape(14, -8, 9, 10, [1, 1, 1]));
    // 瞳孔
    shapes.push(ellipseShape(-14, -7, 5, 6, ec));
    shapes.push(ellipseShape(14, -7, 5, 6, ec));
    // 高光
    shapes.push(ellipseShape(-11, -10, 2.5, 2.5, [1, 1, 1]));
    shapes.push(ellipseShape(17, -10, 2.5, 2.5, [1, 1, 1]));
  }

  // robot 的 LED 眼睛
  if (design.features === 'robot') {
    shapes.push(ellipseShape(-12, 0, 7, 7, ec));
    shapes.push(ellipseShape(12, 0, 7, 7, ec));
    // LED嘴
    shapes.push(rectShape(0, 14, 20, 3, ec, 2));
  }

  // sprite 的眼睛
  if (design.features === 'sprite') {
    shapes.push(ellipseShape(-10, -5, 6, 7, [1, 1, 1]));
    shapes.push(ellipseShape(10, -5, 6, 7, [1, 1, 1]));
    shapes.push(ellipseShape(-10, -4, 3.5, 4, ec));
    shapes.push(ellipseShape(10, -4, 3.5, 4, ec));
  }

  return shapes;
}

// ============================================================
// 表情变化层（眼睛/嘴巴覆盖）
// ============================================================

function buildExpressionShapes(mood, design) {
  const shapes = [];
  const ec = design.eyeColor;
  const isSpecial = ['robot', 'ai', 'sprite'].includes(design.features);

  switch (mood) {
    case 'happy':
    case 'excited':
      if (!isSpecial) {
        // 开心眯眼 - 用弯月形替代圆眼
        shapes.push(rectShape(-14, -8, 14, 3, ec, 7));
        shapes.push(rectShape(14, -8, 14, 3, ec, 7));
      }
      // 腮红
      shapes.push(ellipseShape(-22, 5, 7, 5, [1, 0.5, 0.5], 50));
      shapes.push(ellipseShape(22, 5, 7, 5, [1, 0.5, 0.5], 50));
      break;

    case 'sad':
      // 泪滴
      shapes.push(ellipseShape(-20, 5, 3, 5, [0.5, 0.7, 1], 80));
      shapes.push(ellipseShape(20, 5, 3, 5, [0.5, 0.7, 1], 80));
      break;

    case 'tired':
    case 'sleeping':
      if (!isSpecial) {
        // 闭眼线
        shapes.push(rectShape(-14, -6, 12, 2, [0.3, 0.3, 0.3], 5));
        shapes.push(rectShape(14, -6, 12, 2, [0.3, 0.3, 0.3], 5));
      }
      break;

    case 'curious':
    case 'question':
      // 一大一小眼
      if (!isSpecial) {
        shapes.push(ellipseShape(-14, -8, 10, 11, [1, 1, 1]));
        shapes.push(ellipseShape(-14, -7, 6, 7, ec));
      }
      break;

    case 'eating':
      // 嘴巴张开
      shapes.push(ellipseShape(0, 12, 8, 10, [0.9, 0.3, 0.3]));
      shapes.push(ellipseShape(0, 9, 6, 4, [1, 1, 1], 80));
      break;

    case 'coma':
      // X眼
      if (!isSpecial) {
        shapes.push(rectShape(-16, -10, 10, 2, [0.4, 0.4, 0.4], 0));
        shapes.push(rectShape(-12, -6, 10, 2, [0.4, 0.4, 0.4], 0));
        shapes.push(rectShape(12, -10, 10, 2, [0.4, 0.4, 0.4], 0));
        shapes.push(rectShape(16, -6, 10, 2, [0.4, 0.4, 0.4], 0));
      }
      break;

    case 'playing':
      // 星星眼
      shapes.push(ellipseShape(-22, 5, 5, 5, [1, 0.85, 0], 70));
      shapes.push(ellipseShape(22, 5, 5, 5, [1, 0.85, 0], 70));
      break;
  }

  return shapes;
}

// ============================================================
// 情绪特效层
// ============================================================

function buildEffectShapes(mood) {
  const shapes = [];

  switch (mood) {
    case 'happy':
      // 音符
      shapes.push(ellipseShape(40, -45, 5, 5, [1, 0.8, 0.2]));
      shapes.push(rectShape(44, -52, 2, 12, [1, 0.8, 0.2]));
      break;

    case 'excited':
      // 星星爆炸
      shapes.push(ellipseShape(-40, -40, 4, 4, [1, 0.9, 0.1]));
      shapes.push(ellipseShape(42, -35, 3, 3, [1, 0.7, 0.3]));
      shapes.push(ellipseShape(35, -50, 5, 5, [1, 0.85, 0.2]));
      shapes.push(ellipseShape(-35, -48, 3.5, 3.5, [1, 0.95, 0.4]));
      break;

    case 'sleeping':
      // ZZZ
      shapes.push(rectShape(32, -40, 12, 1.5, [0.7, 0.8, 1]));
      shapes.push(rectShape(30, -44, 8, 1.5, [0.7, 0.8, 1]));
      shapes.push(rectShape(35, -36, 8, 1.5, [0.7, 0.8, 1]));
      break;

    case 'question':
      // 问号
      shapes.push(ellipseShape(30, -50, 8, 8, [1, 0.9, 0.3]));
      shapes.push(rectShape(30, -50, 10, 10, [1, 0.9, 0.3], 10));  // ? body approx
      shapes.push(ellipseShape(30, -38, 2.5, 2.5, [1, 0.9, 0.3])); // ? dot
      break;

    case 'eating':
      // 食物碎屑
      shapes.push(ellipseShape(-20, 25, 3, 3, [0.9, 0.7, 0.3]));
      shapes.push(ellipseShape(18, 28, 2, 2, [0.85, 0.6, 0.25]));
      shapes.push(ellipseShape(5, 30, 2.5, 2.5, [0.95, 0.75, 0.35]));
      break;

    case 'coma':
      // 灵魂出窍
      shapes.push(ellipseShape(25, -55, 10, 12, [0.9, 0.9, 1], 40));
      break;

    case 'sad':
      // 乌云
      shapes.push(ellipseShape(0, -55, 20, 10, [0.5, 0.5, 0.6], 50));
      shapes.push(ellipseShape(-10, -58, 10, 8, [0.5, 0.5, 0.6], 50));
      shapes.push(ellipseShape(12, -57, 12, 9, [0.5, 0.5, 0.6], 50));
      break;

    case 'playing':
      // 彩色粒子
      shapes.push(ellipseShape(-42, -30, 4, 4, [1, 0.3, 0.3]));
      shapes.push(ellipseShape(44, -25, 3.5, 3.5, [0.3, 0.8, 1]));
      shapes.push(ellipseShape(0, -55, 3, 3, [0.3, 1, 0.5]));
      shapes.push(ellipseShape(-30, -50, 3, 3, [1, 1, 0.3]));
      break;
  }

  return shapes;
}

// ============================================================
// 情绪动画参数
// ============================================================

function getMoodAnimation(mood) {
  const dur = 60; // 2 秒循环

  switch (mood) {
    case 'normal':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 30, s: [101, 99, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 30, s: [CENTER, CENTER - 2, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ])
        },
        expression: {},
        effects: {
          opacity: staticVal(0)
        }
      };

    case 'happy':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 10, s: [103, 97, 100] },
            { t: 20, s: [98, 104, 100] },
            { t: 30, s: [103, 97, 100] },
            { t: 40, s: [98, 104, 100] },
            { t: 50, s: [103, 97, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 15, s: [CENTER, CENTER - 12, 0] },
            { t: 30, s: [CENTER, CENTER, 0] },
            { t: 45, s: [CENTER, CENTER - 10, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ])
        },
        expression: {},
        effects: {
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 30, s: [CENTER, CENTER - 5, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ])
        }
      };

    case 'excited':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 5, s: [108, 92, 100] },
            { t: 10, s: [92, 108, 100] },
            { t: 15, s: [108, 92, 100] },
            { t: 20, s: [92, 108, 100] },
            { t: 25, s: [108, 92, 100] },
            { t: 30, s: [92, 108, 100] },
            { t: 35, s: [108, 92, 100] },
            { t: 40, s: [92, 108, 100] },
            { t: 45, s: [108, 92, 100] },
            { t: 50, s: [92, 108, 100] },
            { t: 55, s: [105, 95, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 8, s: [CENTER - 3, CENTER - 18, 0] },
            { t: 16, s: [CENTER + 3, CENTER, 0] },
            { t: 24, s: [CENTER - 3, CENTER - 18, 0] },
            { t: 32, s: [CENTER + 3, CENTER, 0] },
            { t: 40, s: [CENTER - 3, CENTER - 15, 0] },
            { t: 48, s: [CENTER + 2, CENTER, 0] },
            { t: 56, s: [CENTER, CENTER - 8, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ]),
          rotation: animatedVal([
            { t: 0, s: [0] },
            { t: 15, s: [5] },
            { t: 30, s: [-5] },
            { t: 45, s: [5] },
            { t: 60, s: [0] }
          ])
        },
        expression: {},
        effects: {
          scale: animatedMulti([
            { t: 0, s: [80, 80, 100] },
            { t: 30, s: [120, 120, 100] },
            { t: 60, s: [80, 80, 100] }
          ]),
          opacity: animatedVal([
            { t: 0, s: [100] },
            { t: 30, s: [40] },
            { t: 60, s: [100] }
          ])
        }
      };

    case 'sad':
      return {
        duration: 90,
        body: {
          scale: staticVal([98, 98, 100]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER + 5, 0] },
            { t: 45, s: [CENTER - 2, CENTER + 8, 0] },
            { t: 90, s: [CENTER, CENTER + 5, 0] }
          ]),
          rotation: animatedVal([
            { t: 0, s: [-3] },
            { t: 45, s: [3] },
            { t: 90, s: [-3] }
          ])
        },
        expression: {},
        effects: {
          opacity: animatedVal([
            { t: 0, s: [60] },
            { t: 45, s: [90] },
            { t: 90, s: [60] }
          ])
        }
      };

    case 'tired':
      return {
        duration: 90,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 98, 100] },
            { t: 45, s: [99, 100, 100] },
            { t: 90, s: [100, 98, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER + 3, 0] },
            { t: 45, s: [CENTER, CENTER + 6, 0] },
            { t: 90, s: [CENTER, CENTER + 3, 0] }
          ])
        },
        expression: {},
        effects: { opacity: staticVal(0) }
      };

    case 'curious':
      return {
        duration: dur,
        body: {
          scale: staticVal([100, 100, 100]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 20, s: [CENTER + 8, CENTER - 5, 0] },
            { t: 40, s: [CENTER - 5, CENTER - 3, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ]),
          rotation: animatedVal([
            { t: 0, s: [0] },
            { t: 20, s: [12] },
            { t: 40, s: [-8] },
            { t: 60, s: [0] }
          ])
        },
        expression: {},
        effects: { opacity: staticVal(0) }
      };

    case 'eating':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 8, s: [103, 97, 100] },
            { t: 16, s: [100, 100, 100] },
            { t: 24, s: [103, 97, 100] },
            { t: 32, s: [100, 100, 100] },
            { t: 40, s: [102, 98, 100] },
            { t: 48, s: [100, 100, 100] },
            { t: 56, s: [101, 100, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 8, s: [CENTER, CENTER + 3, 0] },
            { t: 16, s: [CENTER, CENTER, 0] },
            { t: 24, s: [CENTER, CENTER + 3, 0] },
            { t: 32, s: [CENTER, CENTER, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ])
        },
        expression: {},
        effects: {
          opacity: animatedVal([
            { t: 0, s: [100] },
            { t: 30, s: [60] },
            { t: 60, s: [100] }
          ])
        }
      };

    case 'coma':
      return {
        duration: 90,
        body: {
          scale: staticVal([95, 95, 100]),
          position: staticVal([CENTER, CENTER + 10, 0]),
          rotation: staticVal(8)
        },
        expression: {},
        effects: {
          opacity: animatedVal([
            { t: 0, s: [30] },
            { t: 45, s: [60] },
            { t: 90, s: [30] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 45, s: [CENTER + 5, CENTER - 25, 0] },
            { t: 90, s: [CENTER, CENTER, 0] }
          ])
        }
      };

    case 'playing':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 10, s: [105, 95, 100] },
            { t: 20, s: [95, 105, 100] },
            { t: 30, s: [105, 95, 100] },
            { t: 40, s: [95, 105, 100] },
            { t: 50, s: [102, 98, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER, 0] },
            { t: 15, s: [CENTER + 10, CENTER - 15, 0] },
            { t: 30, s: [CENTER - 10, CENTER, 0] },
            { t: 45, s: [CENTER + 8, CENTER - 12, 0] },
            { t: 60, s: [CENTER, CENTER, 0] }
          ]),
          rotation: animatedVal([
            { t: 0, s: [0] },
            { t: 15, s: [10] },
            { t: 30, s: [-10] },
            { t: 45, s: [8] },
            { t: 60, s: [0] }
          ])
        },
        expression: {},
        effects: {
          scale: animatedMulti([
            { t: 0, s: [60, 60, 100] },
            { t: 30, s: [130, 130, 100] },
            { t: 60, s: [60, 60, 100] }
          ]),
          opacity: animatedVal([
            { t: 0, s: [100] },
            { t: 30, s: [30] },
            { t: 60, s: [100] }
          ])
        }
      };

    case 'sleeping':
      return {
        duration: 90,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 98, 100] },
            { t: 45, s: [98, 101, 100] },
            { t: 90, s: [100, 98, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER, CENTER + 5, 0] },
            { t: 45, s: [CENTER, CENTER + 8, 0] },
            { t: 90, s: [CENTER, CENTER + 5, 0] }
          ]),
          rotation: staticVal(5)
        },
        expression: {},
        effects: {
          opacity: animatedVal([
            { t: 0, s: [60] },
            { t: 30, s: [100] },
            { t: 60, s: [60] },
            { t: 90, s: [60] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER + 20, CENTER - 20, 0] },
            { t: 45, s: [CENTER + 25, CENTER - 40, 0] },
            { t: 90, s: [CENTER + 20, CENTER - 20, 0] }
          ])
        }
      };

    case 'walking':
      return {
        duration: dur,
        body: {
          scale: animatedMulti([
            { t: 0, s: [100, 100, 100] },
            { t: 8, s: [101, 99, 100] },
            { t: 16, s: [100, 101, 100] },
            { t: 24, s: [101, 99, 100] },
            { t: 32, s: [100, 101, 100] },
            { t: 40, s: [101, 99, 100] },
            { t: 48, s: [100, 101, 100] },
            { t: 56, s: [101, 99, 100] },
            { t: 60, s: [100, 100, 100] }
          ]),
          position: animatedMulti([
            { t: 0, s: [CENTER - 15, CENTER, 0] },
            { t: 8, s: [CENTER - 10, CENTER - 4, 0] },
            { t: 16, s: [CENTER - 5, CENTER, 0] },
            { t: 24, s: [CENTER, CENTER - 4, 0] },
            { t: 32, s: [CENTER + 5, CENTER, 0] },
            { t: 40, s: [CENTER + 10, CENTER - 4, 0] },
            { t: 48, s: [CENTER + 15, CENTER, 0] },
            { t: 54, s: [CENTER + 10, CENTER - 2, 0] },
            { t: 60, s: [CENTER - 15, CENTER, 0] }
          ])
        },
        expression: {},
        effects: { opacity: staticVal(0) }
      };

    case 'question':
      return {
        duration: dur,
        body: {
          scale: staticVal([100, 100, 100]),
          position: staticVal([CENTER, CENTER, 0]),
          rotation: animatedVal([
            { t: 0, s: [0] },
            { t: 15, s: [8] },
            { t: 30, s: [-8] },
            { t: 45, s: [5] },
            { t: 60, s: [0] }
          ])
        },
        expression: {},
        effects: {
          scale: animatedMulti([
            { t: 0, s: [80, 80, 100] },
            { t: 15, s: [110, 110, 100] },
            { t: 30, s: [90, 90, 100] },
            { t: 45, s: [105, 105, 100] },
            { t: 60, s: [80, 80, 100] }
          ])
        }
      };

    default:
      return getMoodAnimation('normal');
  }
}

// ============================================================
// 主生成函数
// ============================================================

function generatePetLottie(petType, mood) {
  const design = PET_DESIGNS[petType];
  if (!design) throw new Error(`Unknown pet type: ${petType}`);

  const anim = getMoodAnimation(mood);
  const dur = anim.duration || 60;

  // 层1: 特效（最底层）
  const effectShapes = buildEffectShapes(mood);
  const effectLayer = shapeLayer('effects', effectShapes, {
    duration: dur,
    opacity: anim.effects?.opacity || staticVal(100),
    position: anim.effects?.position || staticVal([CENTER, CENTER, 0]),
    scale: anim.effects?.scale || staticVal([100, 100, 100])
  });

  // 层2: 宠物身体
  const petShapes = buildPetShapes(design);
  const bodyLayer = shapeLayer('body', petShapes, {
    duration: dur,
    position: anim.body?.position || staticVal([CENTER, CENTER, 0]),
    scale: anim.body?.scale || staticVal([100, 100, 100]),
    rotation: anim.body?.rotation || staticVal(0)
  });

  // 层3: 表情覆盖层
  const expressionShapes = buildExpressionShapes(mood, design);
  const expressionLayer = shapeLayer('expression', expressionShapes, {
    duration: dur,
    position: anim.body?.position || staticVal([CENTER, CENTER, 0]),
    scale: anim.body?.scale || staticVal([100, 100, 100]),
    rotation: anim.body?.rotation || staticVal(0)
  });

  const layers = [];
  if (expressionShapes.length > 0) layers.push(expressionLayer);
  layers.push(bodyLayer);
  if (effectShapes.length > 0) layers.push(effectLayer);

  return lottieWrapper(layers, dur);
}

// ============================================================
// 批量输出
// ============================================================

function main() {
  let totalFiles = 0;
  let totalBytes = 0;

  const petTypes = Object.keys(PET_DESIGNS);

  for (const petType of petTypes) {
    const petDir = path.join(OUTPUT_DIR, petType);
    if (!fs.existsSync(petDir)) {
      fs.mkdirSync(petDir, { recursive: true });
    }

    for (const mood of MOODS) {
      const lottie = generatePetLottie(petType, mood);
      const json = JSON.stringify(lottie);
      const filePath = path.join(petDir, `${mood}.json`);
      
      fs.writeFileSync(filePath, json);
      totalFiles++;
      totalBytes += Buffer.byteLength(json);

      // 进度
      process.stdout.write(`\r  ✨ ${petType}/${mood}.json (${(Buffer.byteLength(json) / 1024).toFixed(1)}KB)`);
    }
    console.log(`\n  ✅ ${PET_DESIGNS[petType].name} - 12 个动画完成`);
  }

  console.log(`\n🎉 全部完成！`);
  console.log(`   📁 文件数: ${totalFiles}`);
  console.log(`   💾 总大小: ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`   📂 输出目录: ${OUTPUT_DIR}`);
}

main();
