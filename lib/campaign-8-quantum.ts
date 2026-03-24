// 🔥🔥🔥 战役8：量子实验室 - 传送门 + 化学反应 + 重力翻转 🔥🔥🔥
// 主题：宜昌高新区的量子实验室，探索微观世界的奥秘
// 特色玩法：传送门穿越、化学反应区域、重力翻转、分子收集
// Boss：化学博士 - 会释放毒气、酸液攻击、召唤分子怪

import { Campaign } from './campaigns';

export const campaign8: Campaign = {
  id: 'campaign_8',
  name: '量子实验室',
  description: '在宜昌高新区的量子实验室中，探索微观世界的奥秘',
  location: '宜昌高新区',
  theme: '量子科技',
  story: '宜昌高新区的量子实验室发生了意外！一位疯狂的化学博士正在进行危险的实验，导致实验室内出现了各种奇异现象：传送门、重力异常、化学反应区...你需要利用这些量子效应，穿越实验室，阻止博士的疯狂计划！',
  levels: [
    // ========================================
    // 关卡1：传送门初体验 🌀
    // ========================================
    {
      id: 'level_8_1',
      name: '传送门初体验',
      description: '学习使用传送门穿越障碍！',
      story: '欢迎来到量子实验室！🔬 这里有神奇的传送门技术。蓝色传送门和橙色传送门是一对，进入一个就会从另一个出来！💡提示：观察传送门的颜色配对，规划你的路线！必须使用传送门才能到达终点！',
      campaignMapData: {
        startPosition: { x: 100, y: 1050 },
        width: 7000,  // 🔥 放大到7000
        height: 1200, // 🔥 放大高度
        
        platforms: [
          // 起点区域
          { x: 0, y: 1100, width: 300, type: 'ground' },
          { x: 400, y: 1000, width: 120 },
          { x: 600, y: 900, width: 120 },
          
          // 第一个深坑区域（必须用传送门）
          { x: 900, y: 1100, width: 150, type: 'ground' },
          // 深坑... 无法跳过
          { x: 1600, y: 800, width: 180 },  // 传送门出口平台（高处）
          { x: 1850, y: 900, width: 150 },
          { x: 2100, y: 1000, width: 150 },
          
          // 第二个深坑区域
          { x: 2400, y: 1100, width: 200, type: 'ground' },
          // 深坑...
          { x: 3200, y: 600, width: 200 },  // 高处平台
          { x: 3500, y: 700, width: 150 },
          { x: 3750, y: 800, width: 150 },
          { x: 4000, y: 900, width: 150 },
          
          // 第三个深坑区域（连续传送）
          { x: 4300, y: 1100, width: 200, type: 'ground' },
          // 深坑...
          { x: 5000, y: 500, width: 180 },  // 很高的平台
          { x: 5300, y: 600, width: 150 },
          { x: 5550, y: 700, width: 150 },
          
          // 第四个深坑区域
          { x: 5850, y: 1100, width: 150, type: 'ground' },
          // 深坑...
          { x: 6400, y: 400, width: 200 },  // 最高平台
          { x: 6700, y: 500, width: 150 },
          
          // 终点区域
          { x: 6900, y: 1100, width: 200, type: 'ground' }
        ],
        
        // 🔥 核心玩法：传送门配对（必须使用才能过关）
        portals: [
          // 第一对传送门（跨越第一个深坑）
          { id: 'portal_1a', x: 950, y: 1050, color: 'blue', linkedTo: 'portal_1b' },
          { id: 'portal_1b', x: 1650, y: 750, color: 'orange', linkedTo: 'portal_1a' },
          
          // 第二对传送门（跨越第二个深坑）
          { id: 'portal_2a', x: 2500, y: 1050, color: 'blue', linkedTo: 'portal_2b' },
          { id: 'portal_2b', x: 3250, y: 550, color: 'orange', linkedTo: 'portal_2a' },
          
          // 第三对传送门（跨越第三个深坑）
          { id: 'portal_3a', x: 4400, y: 1050, color: 'green', linkedTo: 'portal_3b' },
          { id: 'portal_3b', x: 5050, y: 450, color: 'purple', linkedTo: 'portal_3a' },
          
          // 第四对传送门（跨越第四个深坑）
          { id: 'portal_4a', x: 5900, y: 1050, color: 'blue', linkedTo: 'portal_4b' },
          { id: 'portal_4b', x: 6450, y: 350, color: 'orange', linkedTo: 'portal_4a' }
        ],
        
        enemies: [
          { x: 500, y: 950, type: 'slime' },
          { x: 700, y: 850, type: 'bat' },
          { x: 1700, y: 750, type: 'bat' },
          { x: 1950, y: 850, type: 'slime' },
          { x: 3300, y: 550, type: 'bat' },
          { x: 3600, y: 650, type: 'robot' },
          { x: 5100, y: 450, type: 'bat' },
          { x: 5400, y: 550, type: 'robot' },
          { x: 6500, y: 350, type: 'robot' },
          { x: 6800, y: 450, type: 'turret' }
        ],
        
        collectibles: [
          { x: 500, y: 950, type: 'coin', value: 10 },
          { x: 1700, y: 700, type: 'gem', value: 30 },
          { x: 2000, y: 850, type: 'coin', value: 10 },
          { x: 3300, y: 500, type: 'gem', value: 40 },
          { x: 3850, y: 750, type: 'coin', value: 10 },
          { x: 5100, y: 400, type: 'gem', value: 50 },
          { x: 5650, y: 650, type: 'gem', value: 40 },
          { x: 6500, y: 300, type: 'gem', value: 60 },
          { x: 6950, y: 1050, type: 'gem', value: 50 }
        ],
        
        goal: { x: 6980, y: 1070 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '到达终点' }
      ],
      questions: [
        { 
          id: 'q8_1_1', 
          type: 'choice', 
          question: '【量子知识】量子传送的原理是什么？🔬', 
          options: ['把物体切碎传送', '量子纠缠态传递信息', '用激光发射', '魔法'], 
          answer: '量子纠缠态传递信息', 
          difficulty: 2, 
          subject: 'physics',
          explanation: '量子传送利用"量子纠缠"现象！两个纠缠的粒子无论相距多远，对其中一个的测量会瞬间影响另一个。这不是传送物质，而是传送量子态信息！就像游戏里的传送门，你的"状态"被传送了😄'
        },
        { 
          id: 'q8_1_2', 
          type: 'choice', 
          question: '【趣味问答】程序员进入传送门后会？😂', 
          options: ['变成两个自己（分身bug）', '正常传送', '蓝屏', '进入无限循环'], 
          answer: '变成两个自己（分身bug）', 
          difficulty: 1, 
          subject: 'general',
          explanation: '哈哈！程序员最怕的就是"复制bug"！进传送门可能会触发深拷贝，结果出来两个自己...一个写代码，一个改bug，完美！🤣'
        }
      ],
      rewards: { xp: 200, coins: 100 }
    },
    
    // ========================================
    // 关卡2：化学反应区 🧪 【全新设计】
    // ========================================
    {
      id: 'level_8_2',
      name: '化学反应区',
      description: '穿越各种化学反应区域，利用传送门逃离危险！',
      story: '【v3全新设计】实验室的化学区域失控了！🧪 你必须穿越酸液池和毒气区才能前进！💡玩法提示：1️⃣ 酸液上方有平台，快速跳过！2️⃣ 毒气中藏着传送门，找到它逃生！3️⃣ 捡到⭐冲刺星星可以快速冲刺！4️⃣ 绿色治疗区恢复HP！',
      campaignMapData: {
        startPosition: { x: 100, y: 550 },
        width: 6000,
        height: 800,
        
        platforms: [
          // ===== 第一区：起点 + 酸液跳跃 =====
          { x: 0, y: 600, width: 200, type: 'ground' },
          // 酸液上的小平台（必须快速跳过）
          { x: 300, y: 550, width: 80 },
          { x: 450, y: 500, width: 80 },
          { x: 600, y: 450, width: 80 },
          { x: 750, y: 500, width: 80 },
          { x: 900, y: 550, width: 80 },
          
          // ===== 第一个安全岛 + 治疗 =====
          { x: 1050, y: 600, width: 200, type: 'ground' },
          
          // ===== 第二区：毒气迷宫（找传送门）=====
          { x: 1350, y: 550, width: 100 },
          { x: 1500, y: 480, width: 100 },
          { x: 1350, y: 400, width: 100 },  // ⭐冲刺星星
          { x: 1550, y: 350, width: 100 },  // 🌀传送门A入口
          
          // ===== 第二个安全岛（传送门出口）=====
          { x: 1800, y: 600, width: 200, type: 'ground' },
          
          // ===== 第三区：酸液+毒气混合区 =====
          // 下层酸液平台
          { x: 2100, y: 550, width: 80 },
          { x: 2250, y: 500, width: 80 },
          // 上层毒气平台（有传送门）
          { x: 2400, y: 400, width: 100 },
          { x: 2600, y: 350, width: 100 },  // 🌀传送门B入口
          // 继续酸液平台
          { x: 2800, y: 500, width: 80 },
          { x: 2950, y: 550, width: 80 },
          
          // ===== 第三个安全岛 =====
          { x: 3100, y: 600, width: 250, type: 'ground' },
          
          // ===== 第四区：传送门迷宫 =====
          { x: 3450, y: 500, width: 100 },  // 🌀传送门C入口
          { x: 3650, y: 400, width: 100 },
          { x: 3850, y: 300, width: 100 },  // ⭐冲刺星星
          { x: 4050, y: 350, width: 100 },  // 🌀传送门D入口
          
          // ===== 第四个安全岛 =====
          { x: 4300, y: 600, width: 200, type: 'ground' },
          
          // ===== 第五区：最终挑战（酸液+毒气+移动平台）=====
          { x: 4600, y: 550, width: 80 },
          { x: 4750, y: 480, width: 80 },
          { x: 4900, y: 400, width: 80 },  // ⭐冲刺星星
          { x: 5100, y: 350, width: 100 },
          { x: 5300, y: 400, width: 80 },
          { x: 5450, y: 480, width: 80 },
          
          // ===== 终点 =====
          { x: 5650, y: 600, width: 250, type: 'ground' }
        ],
        
        // 🔥 移动平台
        movingPlatforms: [
          // 第五区的移动平台
          { startX: 5000, endX: 5200, startY: 300, endY: 300, width: 80, speed: 100 }
        ],
        
        // 🔥 化学区域
        chemicalZones: [
          // 第一区：酸液池
          { x: 200, y: 620, width: 850, height: 100, type: 'acid', damage: 15, color: 0xff4444 },
          // 第一安全岛治疗
          { x: 1050, y: 400, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第二区：毒气区
          { x: 1300, y: 250, width: 400, height: 400, type: 'poison', damage: 5, color: 0x9932cc },
          // 第二安全岛治疗
          { x: 1800, y: 400, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第三区：下层酸液 + 上层毒气
          { x: 2000, y: 620, width: 1100, height: 100, type: 'acid', damage: 18, color: 0xff4444 },
          { x: 2350, y: 250, width: 350, height: 200, type: 'poison', damage: 6, color: 0x9932cc },
          // 第三安全岛治疗
          { x: 3100, y: 400, width: 250, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第四区：毒气迷宫
          { x: 3400, y: 200, width: 800, height: 450, type: 'poison', damage: 5, color: 0x9932cc },
          // 第四安全岛治疗
          { x: 4300, y: 400, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第五区：酸液+毒气混合
          { x: 4500, y: 620, width: 1150, height: 100, type: 'acid', damage: 20, color: 0xff4444 },
          { x: 4850, y: 250, width: 400, height: 200, type: 'poison', damage: 6, color: 0x9932cc }
        ],
        
        // 🔥 传送门系统（核心玩法！）
        portals: [
          // 传送门A：毒气区逃生
          { id: 'portal_A1', x: 1600, y: 300, color: 'blue', linkedTo: 'portal_A2' },
          { id: 'portal_A2', x: 1900, y: 550, color: 'orange', linkedTo: 'portal_A1' },
          
          // 传送门B：混合区上层逃生
          { id: 'portal_B1', x: 2650, y: 300, color: 'green', linkedTo: 'portal_B2' },
          { id: 'portal_B2', x: 3200, y: 550, color: 'purple', linkedTo: 'portal_B1' },
          
          // 传送门C：迷宫入口（传送到高处）
          { id: 'portal_C1', x: 3500, y: 450, color: 'blue', linkedTo: 'portal_C2' },
          { id: 'portal_C2', x: 3900, y: 250, color: 'orange', linkedTo: 'portal_C1' },
          
          // 传送门D：迷宫出口
          { id: 'portal_D1', x: 4100, y: 300, color: 'green', linkedTo: 'portal_D2' },
          { id: 'portal_D2', x: 4400, y: 550, color: 'purple', linkedTo: 'portal_D1' }
        ],
        
        enemies: [
          // 第一区
          { x: 500, y: 400, type: 'bat' },
          { x: 800, y: 450, type: 'bat' },
          // 第二区
          { x: 1450, y: 430, type: 'bat' },
          // 第三区
          { x: 2300, y: 450, type: 'bat' },
          { x: 2500, y: 300, type: 'bat' },
          { x: 2900, y: 500, type: 'slime' },
          // 第四区
          { x: 3600, y: 350, type: 'bat' },
          { x: 3800, y: 250, type: 'robot' },
          // 第五区
          { x: 4700, y: 430, type: 'bat' },
          { x: 5000, y: 350, type: 'turret' },
          { x: 5350, y: 430, type: 'robot' }
        ],
        
        collectibles: [
          // 第一区
          { x: 450, y: 450, type: 'gem', value: 20 },
          { x: 750, y: 450, type: 'gem', value: 20 },
          // 第一安全岛
          { x: 1150, y: 550, type: 'coin', value: 10 },
          // 第二区 - 冲刺星星！
          { x: 1400, y: 350, type: 'dash_star', value: 50 },
          { x: 1550, y: 300, type: 'gem', value: 40 },
          // 第三区
          { x: 2200, y: 450, type: 'gem', value: 30 },
          { x: 2550, y: 300, type: 'gem', value: 40 },
          // 第三安全岛
          { x: 3200, y: 550, type: 'coin', value: 10 },
          // 第四区 - 冲刺星星！
          { x: 3900, y: 250, type: 'dash_star', value: 50 },
          { x: 3700, y: 350, type: 'gem', value: 40 },
          // 第四安全岛
          { x: 4400, y: 550, type: 'coin', value: 10 },
          // 第五区 - 冲刺星星！
          { x: 4950, y: 350, type: 'dash_star', value: 50 },
          { x: 5150, y: 300, type: 'gem', value: 50 },
          // 终点
          { x: 5750, y: 550, type: 'gem', value: 60 }
        ],
        
        goal: { x: 5800, y: 570 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '到达终点' }
      ],
      questions: [
        { 
          id: 'q8_2_1', 
          type: 'choice', 
          question: '【化学知识】酸和碱混合会发生什么反应？🧪', 
          options: ['爆炸', '中和反应生成盐和水', '变成黄金', '什么都不发生'], 
          answer: '中和反应生成盐和水', 
          difficulty: 2, 
          subject: 'chemistry',
          explanation: '酸+碱=盐+水，这就是中和反应！比如胃酸过多时吃的胃药（碱性）就是利用这个原理。游戏里的治疗区就像是"中和"了你身上的伤害😄'
        },
        { 
          id: 'q8_2_2', 
          type: 'choice', 
          question: '【编程思维】代码中的"毒气"是什么？💀', 
          options: ['内存泄漏', '语法错误', '注释太少', '变量名太长'], 
          answer: '内存泄漏', 
          difficulty: 2, 
          subject: 'programming',
          explanation: '内存泄漏就像毒气一样，慢慢侵蚀你的程序！它不会立即崩溃，但会越来越慢，最终耗尽所有资源。记得及时释放内存，就像快速穿过毒气区一样！🏃'
        }
      ],
      rewards: { xp: 250, coins: 120 }
    },

    // ========================================
    // 关卡3：重力翻转实验室 🔄 【全新设计】
    // ========================================
    {
      id: 'level_8_3',
      name: '重力翻转实验室',
      description: '在重力翻转区域中挑战你的空间感！结合毒气和传送门！',
      story: '【全新设计】量子实验室最疯狂的区域！🔄 紫色区域会翻转重力，你会"掉"到天花板上！💡玩法：1️⃣ 进入紫色区域重力翻转 2️⃣ 天花板有毒气，快速通过！3️⃣ 绿色治疗区恢复HP 4️⃣ 传送门帮你穿越危险区！',
      campaignMapData: {
        startPosition: { x: 100, y: 750 },
        width: 7000,
        height: 900,
        
        platforms: [
          // ===== 第一区：学习反重力 =====
          { x: 0, y: 800, width: 250, type: 'ground' },
          { x: 350, y: 800, width: 150, type: 'ground' },
          // 天花板平台（反重力后使用）
          { x: 350, y: 150, width: 150 },
          { x: 550, y: 150, width: 150 },
          // 回到地面
          { x: 750, y: 800, width: 150, type: 'ground' },
          
          // ===== 第一安全岛 + 治疗 =====
          { x: 1000, y: 800, width: 200, type: 'ground' },
          
          // ===== 第二区：反重力 + 毒气 =====
          { x: 1300, y: 800, width: 120, type: 'ground' },
          { x: 1500, y: 150, width: 120 },  // 天花板（毒气区）
          { x: 1700, y: 150, width: 120 },  // 天花板（毒气区）
          { x: 1900, y: 150, width: 120 },  // 传送门在这里
          { x: 2100, y: 800, width: 150, type: 'ground' },
          
          // ===== 第二安全岛 =====
          { x: 2350, y: 800, width: 200, type: 'ground' },
          
          // ===== 第三区：交替反重力 + 酸液 =====
          { x: 2650, y: 800, width: 100, type: 'ground' },
          { x: 2850, y: 150, width: 100 },
          { x: 3050, y: 800, width: 100, type: 'ground' },
          { x: 3250, y: 150, width: 100 },
          { x: 3450, y: 800, width: 100, type: 'ground' },
          
          // ===== 第三安全岛 =====
          { x: 3650, y: 800, width: 200, type: 'ground' },
          
          // ===== 第四区：反重力迷宫 + 传送门 =====
          { x: 3950, y: 800, width: 100, type: 'ground' },
          { x: 4150, y: 600, width: 100 },
          { x: 4350, y: 400, width: 100 },
          { x: 4550, y: 200, width: 100 },  // 传送门入口
          { x: 4750, y: 150, width: 100 },  // 天花板
          { x: 4950, y: 150, width: 100 },  // 天花板
          { x: 5150, y: 400, width: 100 },
          { x: 5350, y: 600, width: 100 },
          
          // ===== 第四安全岛 =====
          { x: 5550, y: 800, width: 200, type: 'ground' },
          
          // ===== 第五区：最终挑战（反重力+毒气+酸液）=====
          { x: 5850, y: 800, width: 80, type: 'ground' },
          { x: 6000, y: 150, width: 80 },  // 天花板毒气
          { x: 6150, y: 800, width: 80, type: 'ground' },
          { x: 6300, y: 150, width: 80 },  // 天花板毒气
          { x: 6450, y: 800, width: 80, type: 'ground' },
          { x: 6600, y: 500, width: 100 },  // 中间平台（冲刺星星）
          
          // ===== 终点 =====
          { x: 6800, y: 800, width: 200, type: 'ground' }
        ],
        
        // 🔥 重力翻转区域
        gravityZones: [
          // 第一区：学习区
          { x: 300, y: 200, width: 500, height: 550, gravityMultiplier: -1 },
          
          // 第二区：毒气天花板
          { x: 1250, y: 200, width: 750, height: 550, gravityMultiplier: -1 },
          
          // 第三区：交替翻转
          { x: 2600, y: 200, width: 300, height: 550, gravityMultiplier: -1 },
          { x: 3000, y: 200, width: 300, height: 550, gravityMultiplier: -1 },
          { x: 3400, y: 200, width: 300, height: 550, gravityMultiplier: -1 },
          
          // 第四区：迷宫上半部分
          { x: 4700, y: 100, width: 400, height: 350, gravityMultiplier: -1 },
          
          // 第五区：交替翻转
          { x: 5800, y: 200, width: 250, height: 550, gravityMultiplier: -1 },
          { x: 6100, y: 200, width: 250, height: 550, gravityMultiplier: -1 },
          { x: 6400, y: 200, width: 250, height: 550, gravityMultiplier: -1 }
        ],
        
        // 🔥 化学区域
        chemicalZones: [
          // 第一安全岛治疗
          { x: 1000, y: 600, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第二区：天花板毒气
          { x: 1450, y: 100, width: 600, height: 150, type: 'poison', damage: 6, color: 0x9932cc },
          
          // 第二安全岛治疗
          { x: 2350, y: 600, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第三区：地面酸液
          { x: 2550, y: 820, width: 1100, height: 100, type: 'acid', damage: 15, color: 0xff4444 },
          
          // 第三安全岛治疗
          { x: 3650, y: 600, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第四安全岛治疗
          { x: 5550, y: 600, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第五区：天花板毒气
          { x: 5950, y: 100, width: 500, height: 150, type: 'poison', damage: 7, color: 0x9932cc },
          
          // 第五区：地面酸液
          { x: 5800, y: 820, width: 700, height: 100, type: 'acid', damage: 18, color: 0xff4444 }
        ],
        
        // 🔥 传送门
        portals: [
          // 第二区：毒气天花板逃生
          { id: 'portal_A1', x: 1950, y: 100, color: 'blue', linkedTo: 'portal_A2' },
          { id: 'portal_A2', x: 2200, y: 750, color: 'orange', linkedTo: 'portal_A1' },
          
          // 第四区：迷宫传送
          { id: 'portal_B1', x: 4600, y: 150, color: 'green', linkedTo: 'portal_B2' },
          { id: 'portal_B2', x: 5000, y: 100, color: 'purple', linkedTo: 'portal_B1' },
          
          // 第四区：迷宫出口
          { id: 'portal_C1', x: 5200, y: 350, color: 'blue', linkedTo: 'portal_C2' },
          { id: 'portal_C2', x: 5650, y: 750, color: 'orange', linkedTo: 'portal_C1' }
        ],
        
        enemies: [
          // 第一区
          { x: 450, y: 100, type: 'bat' },
          { x: 650, y: 100, type: 'bat' },
          // 第二区
          { x: 1600, y: 100, type: 'bat' },
          { x: 1800, y: 100, type: 'bat' },
          // 第三区
          { x: 2750, y: 750, type: 'slime' },
          { x: 3150, y: 100, type: 'bat' },
          { x: 3350, y: 750, type: 'slime' },
          // 第四区
          { x: 4250, y: 550, type: 'bat' },
          { x: 4450, y: 350, type: 'robot' },
          { x: 4850, y: 100, type: 'bat' },
          { x: 5250, y: 350, type: 'robot' },
          // 第五区
          { x: 6100, y: 100, type: 'bat' },
          { x: 6350, y: 750, type: 'turret' },
          { x: 6550, y: 450, type: 'robot' }
        ],
        
        collectibles: [
          // 第一区
          { x: 450, y: 100, type: 'gem', value: 20 },
          { x: 650, y: 100, type: 'gem', value: 20 },
          // 第一安全岛
          { x: 1100, y: 750, type: 'coin', value: 10 },
          // 第二区 - 冲刺星星
          { x: 1700, y: 100, type: 'dash_star', value: 50 },
          { x: 1850, y: 100, type: 'gem', value: 30 },
          // 第二安全岛
          { x: 2450, y: 750, type: 'coin', value: 10 },
          // 第三区
          { x: 2900, y: 100, type: 'gem', value: 30 },
          { x: 3300, y: 100, type: 'gem', value: 30 },
          // 第三安全岛
          { x: 3750, y: 750, type: 'coin', value: 10 },
          // 第四区 - 冲刺星星
          { x: 4400, y: 350, type: 'dash_star', value: 50 },
          { x: 4800, y: 100, type: 'gem', value: 40 },
          { x: 5100, y: 350, type: 'gem', value: 40 },
          // 第四安全岛
          { x: 5650, y: 750, type: 'coin', value: 10 },
          // 第五区 - 冲刺星星
          { x: 6650, y: 450, type: 'dash_star', value: 50 },
          { x: 6050, y: 100, type: 'gem', value: 40 },
          { x: 6350, y: 100, type: 'gem', value: 40 },
          // 终点
          { x: 6900, y: 750, type: 'gem', value: 60 }
        ],
        
        goal: { x: 6950, y: 770 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '到达终点' }
      ],
      questions: [
        { 
          id: 'q8_3_1', 
          type: 'choice', 
          question: '【物理知识】如果地球重力突然翻转，会发生什么？🌍', 
          options: ['人会飞到太空', '人会掉到天花板', '什么都不会发生', '地球会爆炸'], 
          answer: '人会飞到太空', 
          difficulty: 3, 
          subject: 'physics',
          explanation: '如果重力翻转，我们会被"推"向太空！但别担心，游戏里有天花板接住你😄 真实世界中，重力是由质量产生的，不会突然翻转。不过在量子尺度上，确实有一些奇怪的现象...'
        },
        { 
          id: 'q8_3_2', 
          type: 'choice', 
          question: '【趣味问答】程序员遇到"重力翻转bug"会？🐛', 
          options: ['把显示器倒过来', '修改重力常量', '重启电脑', '提交bug报告然后下班'], 
          answer: '提交bug报告然后下班', 
          difficulty: 1, 
          subject: 'general',
          explanation: '哈哈！"这不是bug，这是feature！"程序员的经典名言。遇到重力翻转？那就是"创新的用户体验"！提交报告，让明天的自己来处理吧😂'
        }
      ],
      rewards: { xp: 300, coins: 150 }
    },
    
    // ========================================
    // 关卡4：分子迷宫 🔬 【全新设计 - 超大地图综合挑战】
    // ========================================
    {
      id: 'level_8_4',
      name: '分子迷宫',
      description: '终极挑战！结合传送门、毒气、酸液、重力翻转的超大迷宫！',
      story: '【终极挑战】你进入了量子实验室最深处的分子迷宫！🔬 这里汇集了所有量子效应：传送门、毒气、酸液、重力翻转！💡玩法：1️⃣ 紫色区域重力翻转（按下跳跃）2️⃣ 毒气/酸液中找传送门逃生 3️⃣ ⭐冲刺星星帮你穿越危险区 4️⃣ 绿色治疗区恢复HP！',
      campaignMapData: {
        startPosition: { x: 100, y: 950 },
        width: 8500,
        height: 1100,
        
        platforms: [
          // ===== 第一区：起点 + 酸液跳跃热身 =====
          { x: 0, y: 1000, width: 250, type: 'ground' },
          { x: 350, y: 950, width: 80 },
          { x: 500, y: 900, width: 80 },
          { x: 650, y: 850, width: 80 },
          { x: 800, y: 900, width: 80 },
          
          // ===== 第一安全岛 =====
          { x: 1000, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第二区：毒气迷宫 + 传送门 =====
          { x: 1300, y: 950, width: 100 },
          { x: 1500, y: 850, width: 100 },
          { x: 1700, y: 750, width: 100 },  // ⭐冲刺星星
          { x: 1900, y: 650, width: 100 },  // 🌀传送门A入口
          
          // ===== 第二安全岛（传送门出口）=====
          { x: 2150, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第三区：重力翻转区 =====
          { x: 2450, y: 1000, width: 100, type: 'ground' },
          // 天花板平台（反重力使用）
          { x: 2600, y: 200, width: 100 },
          { x: 2800, y: 200, width: 100 },
          { x: 3000, y: 200, width: 100 },  // ⭐冲刺星星
          // 回到地面
          { x: 3200, y: 1000, width: 100, type: 'ground' },
          
          // ===== 第三安全岛 =====
          { x: 3400, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第四区：酸液 + 毒气混合 + 传送门 =====
          // 下层酸液平台
          { x: 3700, y: 950, width: 80 },
          { x: 3850, y: 900, width: 80 },
          // 上层毒气平台
          { x: 4000, y: 700, width: 100 },
          { x: 4200, y: 600, width: 100 },  // 🌀传送门B入口
          // 继续酸液
          { x: 4400, y: 900, width: 80 },
          { x: 4550, y: 950, width: 80 },
          
          // ===== 第四安全岛 =====
          { x: 4750, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第五区：反重力 + 毒气天花板 =====
          { x: 5050, y: 1000, width: 100, type: 'ground' },
          // 天花板（有毒气）
          { x: 5200, y: 200, width: 100 },
          { x: 5400, y: 200, width: 100 },  // ⭐冲刺星星
          { x: 5600, y: 200, width: 100 },  // 🌀传送门C入口
          // 回到地面
          { x: 5800, y: 1000, width: 100, type: 'ground' },
          
          // ===== 第五安全岛 =====
          { x: 6000, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第六区：传送门迷宫 + 酸液地面 =====
          { x: 6300, y: 900, width: 100 },
          { x: 6500, y: 800, width: 100 },
          { x: 6700, y: 700, width: 100 },  // 🌀传送门D入口
          { x: 6900, y: 600, width: 100 },
          { x: 7100, y: 500, width: 100 },  // ⭐冲刺星星
          { x: 7300, y: 600, width: 100 },  // 🌀传送门E入口
          
          // ===== 第六安全岛 =====
          { x: 7550, y: 1000, width: 200, type: 'ground' },
          
          // ===== 第七区：最终挑战（反重力+毒气+酸液+传送门）=====
          { x: 7850, y: 1000, width: 80, type: 'ground' },
          // 天花板
          { x: 7950, y: 200, width: 80 },
          // 地面
          { x: 8050, y: 1000, width: 80, type: 'ground' },
          // 天花板
          { x: 8150, y: 200, width: 80 },  // ⭐冲刺星星
          
          // ===== 终点 =====
          { x: 8300, y: 1000, width: 200, type: 'ground' }
        ],
        
        // 🔥 移动平台
        movingPlatforms: [
          // 第四区移动平台
          { startX: 4100, endX: 4300, startY: 500, endY: 500, width: 80, speed: 100 },
          // 第六区移动平台
          { startX: 6800, endX: 7000, startY: 400, endY: 400, width: 80, speed: 120 }
        ],
        
        // 🔥 重力翻转区域
        gravityZones: [
          // 第三区：学习反重力
          { x: 2550, y: 250, width: 700, height: 700, gravityMultiplier: -1 },
          // 第五区：反重力+毒气
          { x: 5150, y: 250, width: 700, height: 700, gravityMultiplier: -1 },
          // 第七区：交替反重力
          { x: 7900, y: 250, width: 200, height: 700, gravityMultiplier: -1 },
          { x: 8100, y: 250, width: 200, height: 700, gravityMultiplier: -1 }
        ],
        
        // 🔥 化学区域
        chemicalZones: [
          // 第一区：酸液池
          { x: 250, y: 1020, width: 750, height: 80, type: 'acid', damage: 15, color: 0xff4444 },
          // 第一安全岛治疗
          { x: 1000, y: 800, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第二区：毒气区
          { x: 1250, y: 500, width: 700, height: 500, type: 'poison', damage: 5, color: 0x9932cc },
          // 第二安全岛治疗
          { x: 2150, y: 800, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第三安全岛治疗
          { x: 3400, y: 800, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第四区：下层酸液 + 上层毒气
          { x: 3600, y: 1020, width: 1150, height: 80, type: 'acid', damage: 18, color: 0xff4444 },
          { x: 3950, y: 450, width: 400, height: 300, type: 'poison', damage: 6, color: 0x9932cc },
          // 第四安全岛治疗
          { x: 4750, y: 800, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第五区：天花板毒气
          { x: 5150, y: 100, width: 700, height: 200, type: 'poison', damage: 6, color: 0x9932cc },
          // 第五安全岛治疗
          { x: 6000, y: 800, width: 200, height: 200, type: 'heal', healAmount: 15, color: 0x00ff00 },
          
          // 第六区：酸液地面
          { x: 6200, y: 1020, width: 1350, height: 80, type: 'acid', damage: 20, color: 0xff4444 },
          // 第六安全岛治疗
          { x: 7550, y: 800, width: 200, height: 200, type: 'heal', healAmount: 12, color: 0x00ff00 },
          
          // 第七区：天花板毒气 + 地面酸液
          { x: 7800, y: 100, width: 500, height: 200, type: 'poison', damage: 7, color: 0x9932cc },
          { x: 7800, y: 1020, width: 500, height: 80, type: 'acid', damage: 20, color: 0xff4444 }
        ],
        
        // 🔥 传送门系统
        portals: [
          // 传送门A：毒气区逃生
          { id: 'portal_A1', x: 1950, y: 600, color: 'blue', linkedTo: 'portal_A2' },
          { id: 'portal_A2', x: 2250, y: 950, color: 'orange', linkedTo: 'portal_A1' },
          
          // 传送门B：混合区逃生
          { id: 'portal_B1', x: 4250, y: 550, color: 'green', linkedTo: 'portal_B2' },
          { id: 'portal_B2', x: 4850, y: 950, color: 'purple', linkedTo: 'portal_B1' },
          
          // 传送门C：反重力毒气区逃生
          { id: 'portal_C1', x: 5650, y: 150, color: 'blue', linkedTo: 'portal_C2' },
          { id: 'portal_C2', x: 6100, y: 950, color: 'orange', linkedTo: 'portal_C1' },
          
          // 传送门D：迷宫中转
          { id: 'portal_D1', x: 6750, y: 650, color: 'green', linkedTo: 'portal_D2' },
          { id: 'portal_D2', x: 7000, y: 350, color: 'purple', linkedTo: 'portal_D1' },
          
          // 传送门E：迷宫出口
          { id: 'portal_E1', x: 7350, y: 550, color: 'blue', linkedTo: 'portal_E2' },
          { id: 'portal_E2', x: 7650, y: 950, color: 'orange', linkedTo: 'portal_E1' }
        ],
        
        enemies: [
          // 第一区
          { x: 500, y: 850, type: 'bat' },
          { x: 750, y: 850, type: 'bat' },
          // 第二区
          { x: 1450, y: 800, type: 'bat' },
          { x: 1650, y: 700, type: 'bat' },
          // 第三区
          { x: 2700, y: 150, type: 'bat' },
          { x: 2900, y: 150, type: 'bat' },
          // 第四区
          { x: 3800, y: 850, type: 'slime' },
          { x: 4100, y: 550, type: 'bat' },
          { x: 4500, y: 850, type: 'slime' },
          // 第五区
          { x: 5300, y: 150, type: 'bat' },
          { x: 5500, y: 150, type: 'bat' },
          // 第六区
          { x: 6400, y: 750, type: 'bat' },
          { x: 6600, y: 650, type: 'robot' },
          { x: 6800, y: 350, type: 'bat' },
          { x: 7000, y: 450, type: 'robot' },
          { x: 7200, y: 550, type: 'turret' },
          // 第七区
          { x: 8000, y: 150, type: 'bat' },
          { x: 8200, y: 150, type: 'robot' }
        ],
        
        collectibles: [
          // 第一区
          { x: 450, y: 850, type: 'gem', value: 20 },
          { x: 700, y: 800, type: 'gem', value: 20 },
          // 第一安全岛
          { x: 1100, y: 950, type: 'coin', value: 10 },
          // 第二区 - 冲刺星星！
          { x: 1750, y: 700, type: 'dash_star', value: 50 },
          { x: 1900, y: 600, type: 'gem', value: 30 },
          // 第二安全岛
          { x: 2250, y: 950, type: 'coin', value: 10 },
          // 第三区 - 冲刺星星！
          { x: 3050, y: 150, type: 'dash_star', value: 50 },
          { x: 2700, y: 150, type: 'gem', value: 30 },
          { x: 2900, y: 150, type: 'gem', value: 30 },
          // 第三安全岛
          { x: 3500, y: 950, type: 'coin', value: 10 },
          // 第四区
          { x: 3900, y: 850, type: 'gem', value: 30 },
          { x: 4150, y: 550, type: 'gem', value: 40 },
          // 第四安全岛
          { x: 4850, y: 950, type: 'coin', value: 10 },
          // 第五区 - 冲刺星星！
          { x: 5450, y: 150, type: 'dash_star', value: 50 },
          { x: 5300, y: 150, type: 'gem', value: 40 },
          // 第五安全岛
          { x: 6100, y: 950, type: 'coin', value: 10 },
          // 第六区 - 冲刺星星！
          { x: 7150, y: 450, type: 'dash_star', value: 50 },
          { x: 6600, y: 650, type: 'gem', value: 40 },
          { x: 6950, y: 550, type: 'gem', value: 40 },
          // 第六安全岛
          { x: 7650, y: 950, type: 'coin', value: 10 },
          // 第七区 - 冲刺星星！
          { x: 8200, y: 150, type: 'dash_star', value: 50 },
          { x: 8000, y: 150, type: 'gem', value: 50 },
          // 终点
          { x: 8400, y: 950, type: 'gem', value: 60 }
        ],
        
        goal: { x: 8450, y: 970 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '到达终点' }
      ],
      questions: [
        { 
          id: 'q8_4_1', 
          type: 'choice', 
          question: '【化学知识】水分子H₂O中，H和O的比例是？💧', 
          options: ['1:1', '2:1', '1:2', '3:1'], 
          answer: '2:1', 
          difficulty: 2, 
          subject: 'chemistry',
          explanation: '水分子H₂O由2个氢原子和1个氧原子组成，比例是2:1！这就是为什么游戏里要收集2个H和1个O才能合成水。化学式就像编程中的函数签名，参数数量和类型都要对！'
        },
        { 
          id: 'q8_4_2', 
          type: 'choice', 
          question: '【编程类比】如果原子是变量，那化学键是什么？🔗', 
          options: ['指针/引用', '注释', '空格', '分号'], 
          answer: '指针/引用', 
          difficulty: 3, 
          subject: 'programming',
          explanation: '化学键连接原子，就像指针/引用连接变量！它们都是"关系"的表示。共价键像是共享内存，离子键像是消息传递。分子结构就是数据结构！🧬'
        }
      ],
      rewards: { xp: 400, coins: 200 }
    },

    // ========================================
    // 关卡5：Boss战 - 量子双雄 🔬⚡ 【双Boss终极挑战】
    // ========================================
    {
      id: 'level_8_5',
      name: 'Boss：量子双雄',
      description: '击败两个Boss！先是分子怪博士，然后是量子核心！',
      story: '量子实验室的核心区域！🔬 疯狂的化学博士和他创造的量子核心正在等待你！第一个Boss"分子怪博士"会释放毒气和召唤分子怪。击败他后，真正的威胁"量子核心"才会现身！量子核心拥有传送门攻击、重力脉冲和激光扫射！💡提示：利用传送门躲避攻击，在治疗区恢复HP，捡到⭐冲刺星星可以快速逃离危险！',
      campaignMapData: {
        startPosition: { x: 150, y: 1100 },
        width: 3200,
        height: 1400,
        
        platforms: [
          // 地面
          { x: 0, y: 1350, width: 3200, type: 'ground' },
          
          // ===== 左侧区域 =====
          { x: 100, y: 1250, width: 200 },
          { x: 350, y: 1150, width: 180 },
          { x: 150, y: 1000, width: 150 },
          { x: 400, y: 900, width: 150 },
          
          // ===== 中央竞技场 =====
          { x: 700, y: 1100, width: 250 },
          { x: 1000, y: 1000, width: 350 },
          { x: 1400, y: 1000, width: 350 },
          { x: 1800, y: 1100, width: 250 },
          
          // ===== 右侧区域 =====
          { x: 2100, y: 1250, width: 200 },
          { x: 2350, y: 1150, width: 180 },
          { x: 2550, y: 1000, width: 150 },
          { x: 2800, y: 900, width: 150 },
          
          // ===== 高层平台 =====
          { x: 300, y: 750, width: 150 },
          { x: 550, y: 650, width: 200 },
          { x: 900, y: 600, width: 250 },
          { x: 1250, y: 550, width: 300 },  // 顶部中央
          { x: 1650, y: 600, width: 250 },
          { x: 2000, y: 650, width: 200 },
          { x: 2300, y: 750, width: 150 },
          
          // ===== 顶层小平台 =====
          { x: 1100, y: 400, width: 120 },
          { x: 1350, y: 350, width: 150 },  // 最高点
          { x: 1600, y: 400, width: 120 }
        ],
        
        // 移动平台
        movingPlatforms: [
          // 左侧垂直移动
          { startX: 250, endX: 250, startY: 1050, endY: 800, width: 100, speed: 70 },
          // 左中水平移动
          { startX: 600, endX: 850, startY: 850, endY: 850, width: 100, speed: 90 },
          // 右中水平移动
          { startX: 1850, endX: 2100, startY: 850, endY: 850, width: 100, speed: 90 },
          // 右侧垂直移动
          { startX: 2450, endX: 2450, startY: 1050, endY: 800, width: 100, speed: 70 },
          // 顶部水平移动
          { startX: 1200, endX: 1500, startY: 480, endY: 480, width: 80, speed: 100 }
        ],
        
        // 🔥 传送门（逃跑和战术用）
        portals: [
          // 左右快速传送
          { id: 'portal_1a', x: 200, y: 950, color: 'blue', linkedTo: 'portal_1b' },
          { id: 'portal_1b', x: 2900, y: 950, color: 'orange', linkedTo: 'portal_1a' },
          // 上下快速传送
          { id: 'portal_2a', x: 600, y: 600, color: 'green', linkedTo: 'portal_2b' },
          { id: 'portal_2b', x: 2100, y: 600, color: 'purple', linkedTo: 'portal_2a' },
          // 顶部传送
          { id: 'portal_3a', x: 1150, y: 350, color: 'blue', linkedTo: 'portal_3b' },
          { id: 'portal_3b', x: 1650, y: 350, color: 'orange', linkedTo: 'portal_3a' }
        ],
        
        // 🔥 v2.2.0: 移除治疗区，Boss战不再有无限回血
        // chemicalZones 已移除，改用血包收集物
        
        // 🔥 重力翻转区域（第二阶段Boss会激活更多）
        gravityZones: [
          // 顶部区域（战术用）
          { x: 1050, y: 300, width: 700, height: 250, gravityMultiplier: -1 }
        ],
        
        // 第一个Boss
        enemies: [
          { x: 1400, y: 900, type: 'boss' }
        ],
        
        collectibles: [
          { x: 200, y: 1200, type: 'coin', value: 10 },
          { x: 500, y: 1100, type: 'gem', value: 30 },
          { x: 1000, y: 550, type: 'gem', value: 50 },
          { x: 1400, y: 300, type: 'gem', value: 60 },
          { x: 1800, y: 550, type: 'gem', value: 50 },
          { x: 2200, y: 1100, type: 'gem', value: 30 },
          { x: 2700, y: 1200, type: 'coin', value: 10 },
          // 🔥 v2.2.0: 血包收集物（一次性，有限数量）- 数量翻倍，降低难度
          { x: 200, y: 1200, type: 'health_pack', value: 20 },   // 左侧血包
          { x: 2900, y: 1200, type: 'health_pack', value: 20 },  // 右侧血包
          { x: 1400, y: 500, type: 'health_pack', value: 15 },   // 顶部中央血包
          { x: 700, y: 850, type: 'health_pack', value: 12 },    // 左高层血包
          { x: 2100, y: 850, type: 'health_pack', value: 12 },   // 右高层血包
          // 🔥 新增血包（翻倍）
          { x: 400, y: 1200, type: 'health_pack', value: 18 },   // 左侧血包2
          { x: 2700, y: 1200, type: 'health_pack', value: 18 },  // 右侧血包2
          { x: 1100, y: 650, type: 'health_pack', value: 15 },   // 左中血包
          { x: 1700, y: 650, type: 'health_pack', value: 15 },   // 右中血包
          { x: 1400, y: 1100, type: 'health_pack', value: 12 },  // 中央地面血包
          // 🔥 冲刺星星（关键逃命道具！）
          { x: 400, y: 850, type: 'dash_star', value: 50 },
          { x: 2400, y: 850, type: 'dash_star', value: 50 },
          { x: 1400, y: 950, type: 'dash_star', value: 50 },  // 中央地面
          { x: 700, y: 1050, type: 'dash_star', value: 50 },  // 左中
          { x: 2000, y: 1050, type: 'dash_star', value: 50 }  // 右中
        ],
        
        goal: { x: 1400, y: 900 }
      },
      
      // 🔥🔥🔥 双Boss配置 🔥🔥🔥
      bossConfig: {
        type: 'dual',  // 双Boss模式
        
        // ===== 第一阶段Boss：分子怪博士 =====
        hp: 450,
        phases: [
          {
            hp: 450,
            attacks: ['projectile', 'poison_cloud'],
            attackInterval: 2500,
            moveSpeed: 100,
            summonMinions: false
          },
          {
            hp: 250,
            attacks: ['projectile', 'poison_cloud', 'summon'],
            attackInterval: 2000,
            moveSpeed: 130,
            summonMinions: true
          },
          {
            hp: 100,
            attacks: ['projectile', 'poison_cloud', 'acid_spray', 'summon'],
            attackInterval: 1500,
            moveSpeed: 160,
            summonMinions: true
          }
        ],
        specialAbilities: {
          poisonCloud: true,
          acidSpray: true,
          summonMolecules: true
        },
        
        // ===== 第二阶段Boss：量子核心 =====
        secondBoss: {
          name: '量子核心',
          hp: 700,
          spawnDelay: 2500,
          spawnPosition: { x: 1400, y: 400 },
          attacks: ['laser_continuous', 'portal_attack', 'gravity_pulse', 'projectile', 'stun'],
          attackInterval: 1800,
          moveSpeed: 160,
          specialAbilities: {
            continuousLaser: true,
            laserDuration: 3500,
            laserCooldown: 8000,  // 🔥 激光冷却从5秒增加到8秒
            portalAttack: true,
            portalDamage: 25,
            portalCooldown: 8000,
            gravityPulse: true,
            gravityDuration: 2000,
            gravityCooldown: 12000,
            stunPlayer: true,
            stunDuration: 1200,
            stunCooldown: 10000,
            smartAI: true,
            phaseEnhance: true
          },
          phases: [
            { hpPercent: 1.0, speedMultiplier: 1.0, attackCooldownMultiplier: 1.0, color: 0x00ffff },
            { hpPercent: 0.6, speedMultiplier: 1.3, attackCooldownMultiplier: 0.85, color: 0xff00ff },
            { hpPercent: 0.3, speedMultiplier: 1.6, attackCooldownMultiplier: 0.7, color: 0xff0000 }
          ]
        },
        
        defeatCondition: 'combat'
      },
      
      objectives: [
        { type: 'defeat', target: 'boss', description: '击败分子怪博士' },
        { type: 'defeat', target: 'boss2', description: '击败量子核心' }
      ],
      questions: [
        { 
          id: 'q8_5_1', 
          type: 'choice', 
          question: '【量子知识】量子纠缠的特点是什么？🔬', 
          options: ['粒子会物理连接', '测量一个粒子会瞬间影响另一个', '粒子会发光', '粒子会爆炸'], 
          answer: '测量一个粒子会瞬间影响另一个', 
          difficulty: 3, 
          subject: 'physics',
          explanation: '量子纠缠是量子力学中最神奇的现象！两个纠缠的粒子，无论相距多远，对其中一个的测量会瞬间影响另一个的状态。爱因斯坦称之为"幽灵般的超距作用"！'
        },
        { 
          id: 'q8_5_2', 
          type: 'choice', 
          question: '【趣味问答】量子计算机最擅长什么？💻', 
          options: ['玩游戏', '并行计算和破解密码', '上网冲浪', '播放视频'], 
          answer: '并行计算和破解密码', 
          difficulty: 2, 
          subject: 'programming',
          explanation: '量子计算机利用量子叠加态可以同时处理大量计算！它特别擅长因数分解（破解RSA加密）和搜索问题。不过目前还在发展中，暂时还不能用来玩游戏😄'
        }
      ],
      rewards: { xp: 700, coins: 350, skills: ['quantum_dash'] }
    }
  ],
  unlockRequirement: 'campaign_7',
  rewards: { xp: 1500, coins: 750, title: '量子大师' }
};

// 化学博士Boss的特殊技能配置
export const chemistBossSkills = {
  // 毒气云
  poisonCloud: {
    damage: 8,
    duration: 3000,
    radius: 150,
    cooldown: 8000,
    color: 0x9932cc
  },
  
  // 酸液喷射
  acidSpray: {
    damage: 20,
    range: 400,
    cooldown: 6000,
    color: 0x00ff00
  },
  
  // 分子分裂（创建分身）
  moleculeSplit: {
    cloneCount: 2,
    cloneHP: 50,
    cloneDamage: 5,
    cooldown: 15000
  },
  
  // 召唤分子怪
  summonMolecules: {
    count: 3,
    hp: 30,
    damage: 8,
    cooldown: 12000
  }
};

// 传送门配置
export const portalConfig = {
  activationRadius: 40,
  cooldown: 500,  // 传送冷却，防止连续传送
  colors: {
    blue: 0x0088ff,
    orange: 0xff8800,
    green: 0x00ff00,
    purple: 0x9900ff
  }
};

// 化学区域效果配置
export const chemicalZoneConfig = {
  acid: {
    damagePerSecond: 20,
    color: 0xff4444
  },
  poison: {
    damagePerSecond: 5,
    color: 0x9932cc
  },
  heal: {
    healPerSecond: 2,
    color: 0x00ff00
  },
  speed: {
    speedMultiplier: 1.5,
    color: 0x00bfff
  }
};

// 重力区域配置
export const gravityZoneConfig = {
  normalGravity: 1,
  invertedGravity: -1,
  transitionTime: 200  // 重力切换过渡时间
};
