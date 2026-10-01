// 🚂🚂🚂 战役10：宜昌东站时空列车大冒险 - 列车追逐版 v4.0 🚂🚂🚂
// 核心玩法：玩家必须追赶移动的列车，被迫离开后快速追回
// 每个关卡都有独特的挑战机制，让玩家体验紧张刺激的追车感
// 🔥 v4.0 刺激追逐版：强制离车 + 快速追回

import { Campaign } from './campaigns';

// 列车配置
export const trainConfig = {
  level1Speed: 5,     // 关卡1：入门
  level2Speed: 5,     // 关卡2：追踪列车
  level3Speed: 6,     // 关卡3：时空隧道
  level4Speed: 6,     // 关卡4：终极追逐（降速，原来8太快）
  level5Speed: 5,     // Boss关
  trainWidth: 270,
  trainHeight: 30,
  triggerOnPlayerLand: true
};

// 新年主题配色
export const newYearColors = {
  red: 0xe8363b,
  gold: 0xffd700,
  darkRed: 0x8b0000,
  pink: 0xff69b4
};

export const campaign10: Campaign = {
  id: 'campaign_10',
  name: '宜昌东站时空列车',
  description: '追逐移动列车，体验刺激的追车冒险！',
  location: '宜昌东站',
  theme: '列车追逐 + 新年庆典',
  story: '新年前夕，宜昌东站的时空列车失控了！你必须跳上列车，但沿途的各种机关会把你甩下车！错过列车就意味着失败！准备好迎接最刺激的追车冒险了吗？',
  unlockRequirement: 'campaign_9',  // 🔥 需要完成战役9才能解锁
  rewards: {
    xp: 5000,
    coins: 2000,
    skills: ['time_shield'],
    title: '时空列车大师'
  },
  levels: [

    // ========================================
    // 关卡1：新手列车 - 到站障碍 + 激光网 + 传送门 🚂
    // 核心机制：列车到站时有障碍墙挡住，必须跳上去绕过
    // 沿途有激光网需要躲避，传送门帮助快速追回
    // ========================================
    {
      id: 'level_10_1',
      name: '新手列车',
      description: '到站障碍挡路！激光网拦截！传送门逃生！',
      story: '🚂 欢迎乘坐时空列车！\n\n💡 新手教程：\n1️⃣ 列车到站时有障碍墙，必须跳上去绕过！\n2️⃣ 红色激光网会造成伤害，跳过或蹲下！\n3️⃣ 蓝色传送门帮你快速追回列车！\n4️⃣ 列车不等人，抓紧时间！',
      campaignMapData: {
        startPosition: { x: 100, y: 1100 },
        width: 8000,
        height: 1400,
        platforms: [
          // 🔥 只有起点和终点有地面平台，中间全靠移动列车！
          { x: 0, y: 1150, width: 300, type: 'ground' },  // 起点
          // 第一站：障碍墙区域（空中平台，用于绕过障碍）
          { x: 1200, y: 900, width: 150 },  // 绕过障碍的上方平台
          { x: 1400, y: 750, width: 150 },
          { x: 1600, y: 900, width: 150 },
          // 第二站：激光网区域（空中平台）
          { x: 2700, y: 850, width: 120 },  // 躲避激光的平台
          { x: 2900, y: 700, width: 120 },
          { x: 3100, y: 850, width: 120 },
          // 第三站：传送门区域（空中平台）
          { x: 3800, y: 900, width: 100 },  // 传送门入口平台
          { x: 4500, y: 700, width: 150 },  // 传送门出口平台
          { x: 4700, y: 850, width: 150 },
          // 第四站：综合挑战（空中平台）
          { x: 5300, y: 900, width: 100 },
          { x: 5500, y: 700, width: 100 },
          { x: 5700, y: 500, width: 100 },
          { x: 5900, y: 700, width: 100 },
          { x: 6100, y: 900, width: 100 },
          // 终点
          { x: 7400, y: 1150, width: 600, type: 'ground' }
        ],
        autoMovingPlatforms: [
          { startX: 350, y: 1100, endX: 7300, width: 270, speed: 5, triggerOnPlayerLand: true }
        ],
        // 到站障碍墙（竖着的刺墙，挡住列车上的玩家）
        traps: [
          // 第一站障碍墙
          { x: 1150, y: 1000, type: 'spike', damage: 25, pattern: 'static' },
          { x: 1150, y: 1050, type: 'spike', damage: 25, pattern: 'static' },
          { x: 1150, y: 1100, type: 'spike', damage: 25, pattern: 'static' },
          // 第二站障碍墙
          { x: 2450, y: 950, type: 'spike', damage: 28, pattern: 'static' },
          { x: 2450, y: 1000, type: 'spike', damage: 28, pattern: 'static' },
          { x: 2450, y: 1050, type: 'spike', damage: 28, pattern: 'static' },
          { x: 2450, y: 1100, type: 'spike', damage: 28, pattern: 'static' },
          // 第三站障碍墙
          { x: 3950, y: 900, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3950, y: 950, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3950, y: 1000, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3950, y: 1050, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3950, y: 1100, type: 'spike', damage: 30, pattern: 'static' },
          // 第四站障碍墙
          { x: 5450, y: 850, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 900, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 950, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1000, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1050, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1100, type: 'spike', damage: 32, pattern: 'static' }
        ],
        // 激光网区域
        laserZones: [
          { x: 2600, y: 950, width: 400, height: 30, damage: 20, color: 0xff0000, pattern: 'horizontal' },
          { x: 3200, y: 800, width: 300, height: 30, damage: 22, color: 0xff0000, pattern: 'horizontal' },
          { x: 5600, y: 600, width: 200, height: 30, damage: 25, color: 0xff0000, pattern: 'horizontal' }
        ],
        // 传送门
        portals: [
          { id: 'portal_1a', x: 3850, y: 850, color: 'blue', linkedTo: 'portal_1b' },
          { id: 'portal_1b', x: 4550, y: 650, color: 'orange', linkedTo: 'portal_1a' },
          { id: 'portal_2a', x: 5750, y: 450, color: 'green', linkedTo: 'portal_2b' },
          { id: 'portal_2b', x: 6200, y: 850, color: 'purple', linkedTo: 'portal_2a' }
        ],
        windZones: [
          // 帮助跳上障碍墙的上升风
          { x: 1100, y: 700, width: 100, height: 500, direction: 'up', windForce: 18 },
          { x: 2400, y: 600, width: 100, height: 600, direction: 'up', windForce: 20 },
          { x: 3900, y: 500, width: 100, height: 700, direction: 'up', windForce: 22 },
          { x: 5400, y: 400, width: 100, height: 800, direction: 'up', windForce: 24 },
          // 🔥 增加逆风挑战区域（把玩家吹离列车）
          { x: 1500, y: 900, width: 200, height: 300, direction: 'left', windForce: 15 },
          { x: 2800, y: 850, width: 200, height: 350, direction: 'left', windForce: 18 },
          { x: 4300, y: 800, width: 200, height: 400, direction: 'left', windForce: 20 },
          // 帮助追回列车的顺风
          { x: 1700, y: 800, width: 300, height: 400, direction: 'right', windForce: 16 },
          { x: 3200, y: 700, width: 300, height: 500, direction: 'right', windForce: 18 },
          { x: 4800, y: 600, width: 300, height: 600, direction: 'right', windForce: 20 },
          { x: 6200, y: 700, width: 300, height: 500, direction: 'right', windForce: 18 }
        ],
        enemies: [
          { x: 1450, y: 700, type: 'bat' },
          { x: 2800, y: 800, type: 'bat' },
          { x: 4600, y: 650, type: 'robot' },
          { x: 5800, y: 650, type: 'bat' },
          { x: 6800, y: 1100, type: 'turret' }
        ],
        collectibles: [
          { x: 1500, y: 850, type: 'gem', value: 40 },
          { x: 2950, y: 650, type: 'gem', value: 50 },
          { x: 4650, y: 800, type: 'gem', value: 60 },
          { x: 5600, y: 450, type: 'gem', value: 80 },
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一站
          { x: 1300, y: 850, type: 'health_pack', value: 28 },
          { x: 1350, y: 850, type: 'health_pack', value: 28 },
          // 第二站
          { x: 3000, y: 800, type: 'health_pack', value: 30 },
          { x: 3050, y: 800, type: 'health_pack', value: 30 },
          // 第三站
          { x: 5000, y: 650, type: 'health_pack', value: 32 },
          { x: 5050, y: 650, type: 'health_pack', value: 32 },
          // 额外血包
          { x: 2200, y: 850, type: 'health_pack', value: 28 },
          { x: 4000, y: 750, type: 'health_pack', value: 30 },
          { x: 6000, y: 600, type: 'health_pack', value: 32 },
          { x: 6800, y: 1050, type: 'health_pack', value: 35 }
        ],
        goal: { x: 7600, y: 1120 }
      },
      objectives: [{ type: 'reach', target: 'goal', description: '穿越到站障碍到达终点' }],
      questions: [
        { id: 'q10_1_1', type: 'choice', question: '火车到站时为什么要减速？🚂', options: ['省油', '安全停靠', '好看', '没有原因'], answer: '安全停靠', difficulty: 1, subject: 'science', explanation: '火车到站必须减速才能安全停靠，让乘客上下车！' }
      ],
      rewards: { xp: 400, coins: 200 }
    },

    // ========================================
    // 关卡2：追踪列车 - 追踪怪物 + 爆炸陷阱 + 传送带 🎯
    // 核心机制：有追踪怪物一直追着玩家发射散弹
    // 沿途有爆炸陷阱和传送带，必须边躲边追列车
    // ========================================
    {
      id: 'level_10_2',
      name: '追踪列车',
      description: '追踪怪物紧追不舍！爆炸陷阱遍地！传送带加速！',
      story: '🎯 危险！追踪怪物出现！\n\n⚠️ 生存法则：\n1️⃣ 红色追踪怪会一直追着你发射散弹！\n2️⃣ 地面有定时爆炸陷阱，看到红光快跑！\n3️⃣ 蓝色传送带帮你加速追回列车！\n4️⃣ 绿色传送带会把你推回去，小心！',
      campaignMapData: {
        startPosition: { x: 100, y: 1100 },
        width: 10000,
        height: 1400,
        platforms: [
          // 🔥 只有起点和终点有地面平台，中间全靠移动列车！
          { x: 0, y: 1150, width: 300, type: 'ground' },  // 起点
          // 第一区：空中躲避平台
          { x: 800, y: 900, width: 150 },
          { x: 1100, y: 750, width: 150 },
          { x: 1400, y: 600, width: 150 },
          { x: 1700, y: 750, width: 150 },
          { x: 2000, y: 900, width: 150 },
          // 第二区：空中平台
          { x: 2800, y: 900, width: 120 },
          { x: 3100, y: 750, width: 120 },
          { x: 3400, y: 600, width: 120 },
          { x: 3700, y: 750, width: 120 },
          { x: 4000, y: 900, width: 120 },
          // 第三区：空中平台
          { x: 4700, y: 850, width: 100 },
          { x: 5000, y: 700, width: 100 },
          { x: 5300, y: 550, width: 100 },
          { x: 5600, y: 400, width: 100 },
          { x: 5900, y: 550, width: 100 },
          { x: 6200, y: 700, width: 100 },
          // 第四区：空中平台
          { x: 7200, y: 850, width: 100 },
          { x: 7500, y: 700, width: 100 },
          { x: 7800, y: 550, width: 100 },
          { x: 8100, y: 700, width: 100 },
          { x: 8400, y: 850, width: 100 },
          // 终点
          { x: 9400, y: 1150, width: 600, type: 'ground' }
        ],
        autoMovingPlatforms: [
          { startX: 350, y: 1100, endX: 9300, width: 270, speed: 5, triggerOnPlayerLand: true }
        ],
        // 爆炸陷阱
        explosionTraps: [
          // 第一区
          { x: 700, y: 1120, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3000, pattern: 'periodic' },
          { x: 1100, y: 1120, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3000, pattern: 'periodic' },
          { x: 1600, y: 1120, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3000, pattern: 'periodic' },
          { x: 2000, y: 1120, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3000, pattern: 'periodic' },
          // 第二区（密集）
          { x: 2900, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 3100, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 3300, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 3500, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 3700, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 3900, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 4100, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          // 第三区
          { x: 4700, y: 1120, type: 'explosion', damage: 32, blastRadius: 115, warningTime: 1100, cooldownTime: 2300, pattern: 'periodic' },
          { x: 5000, y: 1120, type: 'explosion', damage: 32, blastRadius: 115, warningTime: 1100, cooldownTime: 2300, pattern: 'periodic' },
          { x: 5400, y: 1120, type: 'explosion', damage: 32, blastRadius: 115, warningTime: 1100, cooldownTime: 2300, pattern: 'periodic' },
          { x: 5800, y: 1120, type: 'explosion', damage: 32, blastRadius: 115, warningTime: 1100, cooldownTime: 2300, pattern: 'periodic' },
          { x: 6200, y: 1120, type: 'explosion', damage: 32, blastRadius: 115, warningTime: 1100, cooldownTime: 2300, pattern: 'periodic' },
          // 第四区
          { x: 7000, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 7300, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 7600, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 7900, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 8200, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' }
        ],
        traps: [
          // 空中陷阱
          { x: 1000, y: 700, type: 'spike', damage: 22, pattern: 'static' },
          { x: 3150, y: 550, type: 'spike', damage: 25, pattern: 'static' },
          { x: 5050, y: 500, type: 'spike', damage: 28, pattern: 'static' },
          { x: 7550, y: 500, type: 'spike', damage: 30, pattern: 'static' }
        ],
        windZones: [
          // 上升风帮助躲避
          { x: 800, y: 600, width: 100, height: 600, direction: 'up', windForce: 20 },
          { x: 3200, y: 500, width: 100, height: 700, direction: 'up', windForce: 22 },
          { x: 5350, y: 400, width: 100, height: 800, direction: 'up', windForce: 24 },
          { x: 7550, y: 400, width: 100, height: 800, direction: 'up', windForce: 24 },
          // 🔥 逆风挑战区域（把玩家吹离列车）
          { x: 1500, y: 900, width: 250, height: 300, direction: 'left', windForce: 18 },
          { x: 3800, y: 850, width: 250, height: 350, direction: 'left', windForce: 20 },
          { x: 6000, y: 800, width: 250, height: 400, direction: 'left', windForce: 22 },
          // 追回列车的顺风
          { x: 2100, y: 800, width: 300, height: 400, direction: 'right', windForce: 18 },
          { x: 4200, y: 700, width: 300, height: 500, direction: 'right', windForce: 20 },
          { x: 6300, y: 700, width: 300, height: 500, direction: 'right', windForce: 20 },
          { x: 8600, y: 800, width: 300, height: 400, direction: 'right', windForce: 18 }
        ],
        // 追踪怪物（会一直追着玩家发射散弹）
        enemies: [
          // 追踪怪物
          { x: 500, y: 800, type: 'turret' },
          { x: 2600, y: 800, type: 'turret' },
          { x: 4500, y: 700, type: 'turret' },
          { x: 6800, y: 700, type: 'turret' },
          // 普通敌人
          { x: 1300, y: 550, type: 'bat' },
          { x: 3450, y: 700, type: 'turret' },
          { x: 5650, y: 500, type: 'robot' },
          { x: 7850, y: 650, type: 'turret' }
        ],
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一区
          { x: 1050, y: 700, type: 'health_pack', value: 30 },
          { x: 1100, y: 700, type: 'health_pack', value: 30 },
          // 第二区
          { x: 3150, y: 550, type: 'health_pack', value: 32 },
          { x: 3200, y: 550, type: 'health_pack', value: 32 },
          // 第三区
          { x: 5350, y: 350, type: 'health_pack', value: 35 },
          { x: 5400, y: 350, type: 'health_pack', value: 35 },
          // 第四区
          { x: 7850, y: 500, type: 'health_pack', value: 40 },
          { x: 7900, y: 500, type: 'health_pack', value: 40 },
          // 额外血包
          { x: 2100, y: 650, type: 'health_pack', value: 30 },
          { x: 4250, y: 450, type: 'health_pack', value: 32 },
          { x: 6600, y: 400, type: 'health_pack', value: 35 },
          { x: 8800, y: 600, type: 'health_pack', value: 40 },
          { x: 750, y: 850, type: 'gem', value: 50 },
          { x: 3450, y: 700, type: 'gem', value: 70 },
          { x: 5950, y: 650, type: 'gem', value: 90 },
          { x: 8150, y: 800, type: 'gem', value: 110 }
        ],
        goal: { x: 9600, y: 1120 }
      },
      objectives: [{ type: 'reach', target: 'goal', description: '躲避追踪怪物追回列车' }],
      questions: [
        { id: 'q10_2_1', type: 'choice', question: '传送带是利用什么原理工作的？🔧', options: ['魔法', '摩擦力', '重力', '磁力'], answer: '摩擦力', difficulty: 2, subject: 'science', explanation: '传送带利用摩擦力带动物体移动，是工厂常用的运输设备！' }
      ],
      rewards: { xp: 500, coins: 250 }
    },

    // ========================================
    // 关卡3：时空隧道 - 到站障碍 + 重力翻转 + 激光网 + 强逆风 🔄
    // 🔥 v4.1 重新设计：不能站着不动过关！
    // 核心机制：每个站点都有障碍墙强制离车，重力翻转+激光网+强逆风
    // ========================================
    {
      id: 'level_10_3',
      name: '时空隧道',
      description: '到站障碍！重力翻转！激光拦截！强逆风挑战！',
      story: '🔄 时空隧道异常！\n\n⚠️ 生存法则：\n1️⃣ 每个站点都有障碍墙，必须跳上去绕过！\n2️⃣ 紫色区域翻转重力，你会飞到天花板！\n3️⃣ 红色激光网会造成伤害，跳过或蹲下！\n4️⃣ 强逆风会把你吹离列车，快速追回！',
      campaignMapData: {
        startPosition: { x: 100, y: 1100 },
        width: 12000,
        height: 1500,
        platforms: [
          { x: 0, y: 1150, width: 300, type: 'ground' },
          // 🔥 只有起点和终点有地面平台，中间全靠移动列车！
          // 第一站：空中平台（绕过障碍）
          { x: 1200, y: 900, width: 150 },
          { x: 1400, y: 700, width: 150 },
          // 重力翻转区天花板
          { x: 1700, y: 200, width: 200 },
          { x: 2000, y: 200, width: 200 },
          { x: 2300, y: 200, width: 200 },
          // 回归平台
          { x: 2600, y: 450, width: 150 },
          { x: 2600, y: 700, width: 150 },
          { x: 2600, y: 950, width: 150 },
          // 第二站：空中平台
          { x: 3500, y: 900, width: 150 },
          { x: 3700, y: 700, width: 150 },
          { x: 3900, y: 500, width: 150 },
          { x: 4100, y: 700, width: 150 },
          { x: 4300, y: 900, width: 150 },
          // 第三站：空中平台
          { x: 5200, y: 900, width: 150 },
          { x: 5400, y: 700, width: 150 },
          // 天花板区域（有毒气）
          { x: 5700, y: 200, width: 200 },
          { x: 6000, y: 200, width: 200 },
          { x: 6300, y: 200, width: 200 },
          { x: 6600, y: 200, width: 150 },
          // 回归平台
          { x: 6900, y: 400, width: 150 },
          { x: 6900, y: 650, width: 150 },
          { x: 6900, y: 900, width: 150 },
          // 第四站：空中平台
          { x: 7800, y: 900, width: 120 },
          { x: 8000, y: 700, width: 120 },
          { x: 8200, y: 500, width: 120 },
          { x: 8400, y: 300, width: 150 },
          // 天花板区域
          { x: 8700, y: 200, width: 200 },
          { x: 9000, y: 200, width: 200 },
          { x: 9300, y: 200, width: 200 },
          { x: 9600, y: 200, width: 200 },
          // 最终回归
          { x: 9900, y: 400, width: 150 },
          { x: 9900, y: 650, width: 150 },
          { x: 9900, y: 900, width: 150 },
          // 终点
          { x: 11400, y: 1150, width: 600, type: 'ground' }
        ],
        autoMovingPlatforms: [
          { startX: 350, y: 1100, endX: 11300, width: 270, speed: 6, triggerOnPlayerLand: true }
        ],
        // 🔥 到站障碍墙（强制离车）
        traps: [
          // 第一站障碍墙
          { x: 1150, y: 950, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1000, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1050, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1100, type: 'spike', damage: 28, pattern: 'static' },
          // 第二站障碍墙
          { x: 3450, y: 900, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3450, y: 950, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3450, y: 1000, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3450, y: 1050, type: 'spike', damage: 30, pattern: 'static' },
          { x: 3450, y: 1100, type: 'spike', damage: 30, pattern: 'static' },
          // 第三站障碍墙
          { x: 5150, y: 850, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5150, y: 900, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5150, y: 950, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5150, y: 1000, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5150, y: 1050, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5150, y: 1100, type: 'spike', damage: 32, pattern: 'static' },
          // 第四站障碍墙
          { x: 7750, y: 800, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 850, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 900, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 950, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 1000, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 1050, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7750, y: 1100, type: 'spike', damage: 35, pattern: 'static' },
          // 天花板陷阱
          { x: 1900, y: 250, type: 'spike', damage: 25, pattern: 'static' },
          { x: 2200, y: 250, type: 'spike', damage: 25, pattern: 'static' },
          { x: 5900, y: 250, type: 'spike', damage: 28, pattern: 'static' },
          { x: 6200, y: 250, type: 'spike', damage: 28, pattern: 'static' },
          { x: 8900, y: 250, type: 'spike', damage: 30, pattern: 'static' },
          { x: 9200, y: 250, type: 'spike', damage: 30, pattern: 'static' },
          { x: 9500, y: 250, type: 'spike', damage: 30, pattern: 'static' }
        ],
        // 🔥 激光网区域
        laserZones: [
          { x: 3600, y: 800, width: 400, height: 30, damage: 25, color: 0xff0000, pattern: 'horizontal' },
          { x: 4000, y: 600, width: 300, height: 30, damage: 28, color: 0xff0000, pattern: 'horizontal' },
          { x: 8100, y: 600, width: 350, height: 30, damage: 30, color: 0xff0000, pattern: 'horizontal' },
          { x: 10500, y: 800, width: 400, height: 30, damage: 32, color: 0xff0000, pattern: 'horizontal' }
        ],
        // 重力翻转区域
        gravityZones: [
          // 第一翻转区
          { x: 1600, y: 400, width: 200, height: 800, gravityDirection: 'up', color: 0x9932cc },
          // 第一回归区
          { x: 2550, y: 250, width: 150, height: 500, gravityDirection: 'down', color: 0x32cd32 },
          // 第三区翻转
          { x: 5600, y: 400, width: 200, height: 800, gravityDirection: 'up', color: 0x9932cc },
          // 第三回归区
          { x: 6850, y: 200, width: 150, height: 500, gravityDirection: 'down', color: 0x32cd32 },
          // 第四区翻转
          { x: 8600, y: 400, width: 200, height: 800, gravityDirection: 'up', color: 0x9932cc },
          // 最终回归区
          { x: 9850, y: 200, width: 150, height: 500, gravityDirection: 'down', color: 0x32cd32 }
        ],
        // 毒气区域
        chemicalZones: [
          // 第三区天花板毒气
          { x: 5650, y: 100, width: 1000, height: 200, type: 'poison', damage: 8, color: 0x9932cc },
          // 第四区天花板毒气
          { x: 8650, y: 100, width: 1000, height: 200, type: 'poison', damage: 10, color: 0x9932cc },
          // 治疗区
          { x: 2700, y: 950, width: 200, height: 200, type: 'heal', healAmount: 20, color: 0x00ff00 },
          { x: 4600, y: 950, width: 200, height: 200, type: 'heal', healAmount: 22, color: 0x00ff00 },
          { x: 7200, y: 950, width: 200, height: 200, type: 'heal', healAmount: 25, color: 0x00ff00 },
          { x: 10800, y: 950, width: 200, height: 200, type: 'heal', healAmount: 30, color: 0x00ff00 }
        ],
        // 传送门
        portals: [
          // 第一区传送门（帮助追回列车）
          { id: 'portal_1a', x: 1450, y: 650, color: 'blue', linkedTo: 'portal_1b' },
          { id: 'portal_1b', x: 2650, y: 900, color: 'orange', linkedTo: 'portal_1a' },
          // 第三区传送门（天花板逃生）
          { id: 'portal_2a', x: 6650, y: 150, color: 'green', linkedTo: 'portal_2b' },
          { id: 'portal_2b', x: 6950, y: 600, color: 'purple', linkedTo: 'portal_2a' },
          // 第四区传送门
          { id: 'portal_3a', x: 8450, y: 250, color: 'blue', linkedTo: 'portal_3b' },
          { id: 'portal_3b', x: 9950, y: 600, color: 'orange', linkedTo: 'portal_3a' }
        ],
        windZones: [
          // 🔥 强逆风区域（把玩家吹离列车，增加难度）
          { x: 1300, y: 800, width: 300, height: 400, direction: 'left', windForce: 25 },
          { x: 3600, y: 750, width: 350, height: 450, direction: 'left', windForce: 28 },
          { x: 5300, y: 700, width: 400, height: 500, direction: 'left', windForce: 30 },
          { x: 7900, y: 650, width: 400, height: 550, direction: 'left', windForce: 32 },
          // 天花板横向风（帮助移动）
          { x: 1800, y: 100, width: 600, height: 200, direction: 'right', windForce: 15 },
          { x: 5800, y: 100, width: 800, height: 200, direction: 'right', windForce: 18 },
          { x: 8800, y: 100, width: 800, height: 200, direction: 'right', windForce: 20 },
          // 上升风帮助跳上障碍墙
          { x: 1100, y: 600, width: 100, height: 600, direction: 'up', windForce: 22 },
          { x: 3400, y: 550, width: 100, height: 650, direction: 'up', windForce: 24 },
          { x: 5100, y: 500, width: 100, height: 700, direction: 'up', windForce: 26 },
          { x: 7700, y: 450, width: 100, height: 750, direction: 'up', windForce: 28 },
          // 追回列车的顺风
          { x: 2700, y: 700, width: 350, height: 500, direction: 'right', windForce: 22 },
          { x: 4700, y: 750, width: 350, height: 450, direction: 'right', windForce: 24 },
          { x: 7300, y: 700, width: 350, height: 500, direction: 'right', windForce: 26 },
          { x: 10000, y: 650, width: 400, height: 550, direction: 'right', windForce: 28 }
        ],
        enemies: [
          // 追踪炮塔（增加压力）
          { x: 2000, y: 800, type: 'turret' },
          { x: 4200, y: 750, type: 'turret' },
          { x: 6500, y: 700, type: 'turret' },
          { x: 9000, y: 750, type: 'turret' },
          // 天花板敌人
          { x: 1850, y: 150, type: 'bat' },
          { x: 2150, y: 150, type: 'bat' },
          { x: 5850, y: 150, type: 'robot' },
          { x: 6150, y: 150, type: 'bat' },
          { x: 8850, y: 150, type: 'turret' },
          { x: 9150, y: 150, type: 'robot' },
          { x: 9450, y: 150, type: 'bat' }
        ],
        collectibles: [
          // 天花板收集品
          { x: 1750, y: 150, type: 'gem', value: 70 },
          { x: 2050, y: 150, type: 'gem', value: 70 },
          { x: 5950, y: 150, type: 'gem', value: 90 },
          { x: 6250, y: 150, type: 'gem', value: 90 },
          { x: 8950, y: 150, type: 'gem', value: 110 },
          { x: 9250, y: 150, type: 'gem', value: 110 },
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一站
          { x: 1250, y: 850, type: 'health_pack', value: 35 },
          { x: 1300, y: 850, type: 'health_pack', value: 35 },
          // 第二站
          { x: 3550, y: 850, type: 'health_pack', value: 38 },
          { x: 3600, y: 850, type: 'health_pack', value: 38 },
          // 第三站
          { x: 5250, y: 850, type: 'health_pack', value: 40 },
          { x: 5300, y: 850, type: 'health_pack', value: 40 },
          // 第四站
          { x: 7850, y: 850, type: 'health_pack', value: 45 },
          { x: 7900, y: 850, type: 'health_pack', value: 45 },
          // 回归区
          { x: 9950, y: 600, type: 'health_pack', value: 48 },
          { x: 10000, y: 600, type: 'health_pack', value: 48 },
          // 额外血包
          { x: 2400, y: 850, type: 'health_pack', value: 35 },
          { x: 4400, y: 850, type: 'health_pack', value: 38 },
          { x: 6550, y: 850, type: 'health_pack', value: 40 },
          { x: 8900, y: 850, type: 'health_pack', value: 45 },
          { x: 10800, y: 700, type: 'health_pack', value: 48 }
        ],
        goal: { x: 11600, y: 1120 }
      },
      objectives: [{ type: 'reach', target: 'goal', description: '穿越时空隧道追回列车' }],
      questions: [
        { id: 'q10_3_1', type: 'choice', question: '毒气为什么危险？☠️', options: ['太臭了', '会让人窒息或中毒', '颜色难看', '声音太大'], answer: '会让人窒息或中毒', difficulty: 2, subject: 'science', explanation: '毒气会伤害呼吸系统，严重时会导致窒息或中毒，所以要快速逃离！' }
      ],
      rewards: { xp: 600, coins: 300 }
    },

    // ========================================
    // 关卡4：终极追逐 - 全玩法综合挑战 🔥
    // 核心机制：到站障碍 + 激光网 + 传送门 + 爆炸陷阱 + 追踪怪物
    // 所有玩法组合在一起，终极考验！
    // ========================================
    {
      id: 'level_10_4',
      name: '终极追逐',
      description: '全玩法综合！到站障碍+激光网+传送门+爆炸+追踪怪！',
      story: '🔥 终极追逐开始！\n\n⚡ 综合挑战：\n1️⃣ 到站有障碍墙，必须跳上去绕过！\n2️⃣ 激光网拦截，跳过或蹲下！\n3️⃣ 传送门帮你穿越危险区！\n4️⃣ 爆炸陷阱遍地，看到红光快跑！\n5️⃣ 追踪怪物紧追不舍！',
      campaignMapData: {
        startPosition: { x: 100, y: 1100 },
        width: 14000,
        height: 1500,
        platforms: [
          // 🔥 只有起点和终点有地面平台，中间全靠移动列车！
          { x: 0, y: 1150, width: 300, type: 'ground' },  // 起点
          // 第一站：空中平台
          { x: 1200, y: 900, width: 150 },
          { x: 1400, y: 750, width: 150 },
          { x: 1600, y: 600, width: 150 },
          { x: 1800, y: 750, width: 150 },
          { x: 2000, y: 900, width: 150 },
          // 第二站：空中平台
          { x: 2600, y: 900, width: 120 },
          { x: 2800, y: 700, width: 150 },  // 传送门入口
          { x: 3400, y: 800, width: 150 },  // 传送门出口
          { x: 3600, y: 950, width: 150 },
          // 第三区：空中平台
          { x: 4100, y: 900, width: 100 },
          { x: 4400, y: 750, width: 100 },
          { x: 4700, y: 600, width: 100 },
          { x: 5000, y: 750, width: 100 },
          // 第四区：空中平台
          { x: 5900, y: 850, width: 100 },
          { x: 6200, y: 700, width: 100 },
          { x: 6500, y: 550, width: 100 },
          { x: 6800, y: 700, width: 100 },
          { x: 7100, y: 850, width: 100 },
          // 第五区：天花板（重力翻转）
          { x: 8200, y: 200, width: 200 },
          { x: 8500, y: 200, width: 200 },
          { x: 8800, y: 200, width: 200 },
          { x: 9100, y: 200, width: 200 },
          // 回归平台
          { x: 9400, y: 450, width: 150 },
          { x: 9400, y: 700, width: 150 },
          { x: 9400, y: 950, width: 150 },
          // 第六区：空中平台
          { x: 10000, y: 900, width: 100 },
          { x: 10200, y: 700, width: 150 },  // 传送门
          { x: 10800, y: 600, width: 150 },  // 传送门出口
          { x: 11000, y: 800, width: 150 },
          { x: 11200, y: 950, width: 150 },
          // 终点
          { x: 13400, y: 1150, width: 600, type: 'ground' }
        ],
        autoMovingPlatforms: [
          { startX: 350, y: 1100, endX: 13300, width: 270, speed: 6, triggerOnPlayerLand: true }
        ],
        // 到站障碍墙
        traps: [
          // 第一站障碍墙
          { x: 1150, y: 950, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1000, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1050, type: 'spike', damage: 28, pattern: 'static' },
          { x: 1150, y: 1100, type: 'spike', damage: 28, pattern: 'static' },
          // 第二站障碍墙
          { x: 2750, y: 900, type: 'spike', damage: 30, pattern: 'static' },
          { x: 2750, y: 950, type: 'spike', damage: 30, pattern: 'static' },
          { x: 2750, y: 1000, type: 'spike', damage: 30, pattern: 'static' },
          { x: 2750, y: 1050, type: 'spike', damage: 30, pattern: 'static' },
          { x: 2750, y: 1100, type: 'spike', damage: 30, pattern: 'static' },
          // 第三站障碍墙
          { x: 5450, y: 850, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 900, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 950, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1000, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1050, type: 'spike', damage: 32, pattern: 'static' },
          { x: 5450, y: 1100, type: 'spike', damage: 32, pattern: 'static' },
          // 第四站障碍墙
          { x: 7850, y: 800, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 850, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 900, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 950, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 1000, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 1050, type: 'spike', damage: 35, pattern: 'static' },
          { x: 7850, y: 1100, type: 'spike', damage: 35, pattern: 'static' },
          // 第五站障碍墙
          { x: 10150, y: 750, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 800, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 850, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 900, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 950, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 1000, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 1050, type: 'spike', damage: 38, pattern: 'static' },
          { x: 10150, y: 1100, type: 'spike', damage: 38, pattern: 'static' },
          // 天花板陷阱
          { x: 8400, y: 250, type: 'spike', damage: 30, pattern: 'static' },
          { x: 8700, y: 250, type: 'spike', damage: 30, pattern: 'static' },
          { x: 9000, y: 250, type: 'spike', damage: 30, pattern: 'static' }
        ],
        // 激光网
        laserZones: [
          { x: 1700, y: 850, width: 300, height: 30, damage: 25, color: 0xff0000, pattern: 'horizontal' },
          { x: 4300, y: 850, width: 400, height: 30, damage: 28, color: 0xff0000, pattern: 'horizontal' },
          { x: 6400, y: 650, width: 300, height: 30, damage: 30, color: 0xff0000, pattern: 'horizontal' },
          { x: 11700, y: 950, width: 400, height: 30, damage: 32, color: 0xff0000, pattern: 'horizontal' }
        ],
        // 爆炸陷阱
        explosionTraps: [
          { x: 4000, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 4300, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 4600, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 4900, y: 1120, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2500, pattern: 'periodic' },
          { x: 11600, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 11900, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' },
          { x: 12300, y: 1120, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2000, pattern: 'periodic' }
        ],
        // 传送门
        portals: [
          { id: 'portal_1a', x: 2850, y: 650, color: 'blue', linkedTo: 'portal_1b' },
          { id: 'portal_1b', x: 3450, y: 750, color: 'orange', linkedTo: 'portal_1a' },
          { id: 'portal_2a', x: 10250, y: 650, color: 'green', linkedTo: 'portal_2b' },
          { id: 'portal_2b', x: 10850, y: 550, color: 'purple', linkedTo: 'portal_2a' }
        ],
        // 重力翻转区域
        gravityZones: [
          { x: 8100, y: 400, width: 200, height: 800, gravityDirection: 'up', color: 0x9932cc },
          { x: 9350, y: 250, width: 150, height: 500, gravityDirection: 'down', color: 0x32cd32 }
        ],
        // 毒气区域
        chemicalZones: [
          { x: 8150, y: 100, width: 1100, height: 200, type: 'poison', damage: 7, color: 0x9932cc },
          { x: 3800, y: 950, width: 200, height: 200, type: 'heal', healAmount: 18, color: 0x00ff00 },
          { x: 7600, y: 950, width: 200, height: 200, type: 'heal', healAmount: 20, color: 0x00ff00 },
          { x: 9900, y: 950, width: 200, height: 200, type: 'heal', healAmount: 22, color: 0x00ff00 },
          { x: 13000, y: 950, width: 200, height: 200, type: 'heal', healAmount: 25, color: 0x00ff00 }
        ],
        windZones: [
          // 帮助跳上障碍墙
          { x: 1100, y: 600, width: 100, height: 600, direction: 'up', windForce: 16 },
          { x: 2700, y: 500, width: 100, height: 700, direction: 'up', windForce: 18 },
          { x: 5400, y: 400, width: 100, height: 800, direction: 'up', windForce: 20 },
          { x: 7800, y: 300, width: 100, height: 900, direction: 'up', windForce: 22 },
          { x: 10100, y: 200, width: 100, height: 1000, direction: 'up', windForce: 24 },
          // 天花板横向风
          { x: 8300, y: 100, width: 1000, height: 200, direction: 'right', windForce: 14 },
          // 追回列车顺风
          { x: 2100, y: 800, width: 300, height: 400, direction: 'right', windForce: 12 },
          { x: 5200, y: 700, width: 300, height: 500, direction: 'right', windForce: 14 },
          { x: 7400, y: 800, width: 300, height: 400, direction: 'right', windForce: 14 },
          { x: 9500, y: 700, width: 300, height: 500, direction: 'right', windForce: 16 },
          { x: 12800, y: 800, width: 300, height: 400, direction: 'right', windForce: 14 }
        ],
        // 追踪怪物 + 普通敌人
        enemies: [
          // 追踪怪物
          { x: 5800, y: 750, type: 'turret' },
          { x: 11400, y: 800, type: 'turret' },
          // 普通敌人
          { x: 1500, y: 700, type: 'bat' },
          { x: 3500, y: 750, type: 'turret' },
          { x: 4500, y: 700, type: 'robot' },
          { x: 6300, y: 650, type: 'bat' },
          { x: 6900, y: 800, type: 'turret' },
          { x: 8500, y: 150, type: 'bat' },
          { x: 8900, y: 150, type: 'robot' },
          { x: 10900, y: 750, type: 'turret' },
          { x: 12500, y: 1100, type: 'robot' }
        ],
        collectibles: [
          { x: 1700, y: 550, type: 'gem', value: 70 },
          { x: 3500, y: 750, type: 'gem', value: 80 },
          { x: 4800, y: 550, type: 'gem', value: 90 },
          { x: 6600, y: 500, type: 'gem', value: 100 },
          { x: 8600, y: 150, type: 'gem', value: 110 },
          { x: 10900, y: 550, type: 'gem', value: 120 },
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一站
          { x: 1300, y: 850, type: 'health_pack', value: 32 },
          { x: 1350, y: 850, type: 'health_pack', value: 32 },
          // 第二站
          { x: 4200, y: 850, type: 'health_pack', value: 38 },
          { x: 4250, y: 850, type: 'health_pack', value: 38 },
          // 第三站
          { x: 6100, y: 800, type: 'health_pack', value: 40 },
          { x: 6150, y: 800, type: 'health_pack', value: 40 },
          // 第四站（天花板区）
          { x: 9450, y: 400, type: 'health_pack', value: 45 },
          { x: 9500, y: 400, type: 'health_pack', value: 45 },
          // 终点前
          { x: 11100, y: 750, type: 'health_pack', value: 48 },
          { x: 11150, y: 750, type: 'health_pack', value: 48 },
          // 额外血包
          { x: 2500, y: 850, type: 'health_pack', value: 32 },
          { x: 5300, y: 800, type: 'health_pack', value: 38 },
          { x: 7500, y: 750, type: 'health_pack', value: 40 },
          { x: 10500, y: 500, type: 'health_pack', value: 45 },
          { x: 12500, y: 850, type: 'health_pack', value: 48 }
        ],
        goal: { x: 13600, y: 1120 }
      },
      objectives: [{ type: 'reach', target: 'goal', description: '利用分身吸引敌人后追回列车' }],
      questions: [
        { id: 'q10_4_1', type: 'choice', question: '影子是怎么形成的？👥', options: ['魔法', '光被物体挡住', '空气变化', '温度变化'], answer: '光被物体挡住', difficulty: 2, subject: 'science', explanation: '当光被物体挡住时，物体后面就会形成影子！' }
      ],
      rewards: { xp: 700, coins: 350 }
    },

    // ========================================
    // 关卡5：终极Boss战 - 三Boss协同竞技场决战 👹👹👹
    // 🔥🔥🔥 v6.0 竞技场Boss战：智能AI + 协同攻击 + 特效技能
    // 
    // 🎯 Boss设计理念（参考洛克人、空洞骑士、茶杯头）：
    // 1. 每个Boss有独特的攻击模式和技能
    // 2. Boss之间会协同配合攻击（夹击、连招）
    // 3. 当同伴血量低时会触发狂暴/保护模式
    // 4. 智能AI：追逐→停下攻击→再追逐
    //
    // 🔥 检票长（近战型）：闸门冲击、票据风暴、定身术
    // 🔥 站台长（召唤型）：列车冲撞、站台震荡、磁力推拉
    // 🔥 列车长（控制型）：时空裂隙、时间冻结、传送打击
    // ========================================
    {
      id: 'level_10_5',
      name: '终极Boss战',
      description: '三Boss协同决战！智能AI + 特效技能！',
      story: '👹 宜昌东站的三位守护者同时出现！\n\n⚔️ 终极决战：\n🎫 检票长：近战猛攻，定身控制！\n🚉 站台长：召唤列车，磁力推拉！\n🚂 列车长：时空操控，传送打击！\n\n⚠️ 他们会协同配合，保护受伤的同伴！\n🏆 击败全部三位Boss，成为时空列车大师！',
      campaignMapData: {
        startPosition: { x: 1000, y: 650 },
        width: 2400,
        height: 900,
        // 🔥🔥🔥 竞技场式地图设计 - 封闭空间决战
        platforms: [
          // 主战斗平台（大型地面）
          { x: 0, y: 800, width: 2400, type: 'ground' },
          // 左侧高台（躲避+攻击位）
          { x: 80, y: 600, width: 200 },
          { x: 100, y: 400, width: 180 },
          // 中央高台（核心战斗区）
          { x: 1050, y: 550, width: 300 },
          { x: 1100, y: 350, width: 200 },
          // 右侧高台（躲避+攻击位）
          { x: 2120, y: 600, width: 200 },
          { x: 2140, y: 400, width: 180 },
          // 中间跳跃平台（机动性）
          { x: 500, y: 650, width: 150 },
          { x: 750, y: 500, width: 120 },
          { x: 1550, y: 500, width: 120 },
          { x: 1750, y: 650, width: 150 },
          // 顶部平台（紧急躲避）
          { x: 400, y: 280, width: 150 },
          { x: 1850, y: 280, width: 150 },
          // 中央顶部（最高点）
          { x: 1100, y: 180, width: 200 }
        ],
        // 🔥🔥🔥 竞技场Boss战 - 无移动平台，纯战斗
        autoMovingPlatforms: [],
        // 🔥 竞技场陷阱（边缘区域）
        traps: [
          // 左边缘陷阱
          { x: 30, y: 770, type: 'spike', damage: 20, pattern: 'static' },
          { x: 30, y: 730, type: 'spike', damage: 20, pattern: 'static' },
          // 右边缘陷阱
          { x: 2370, y: 770, type: 'spike', damage: 20, pattern: 'static' },
          { x: 2370, y: 730, type: 'spike', damage: 20, pattern: 'static' }
        ],
        // 🔥 竞技场爆炸陷阱（中央区域，增加紧张感）
        explosionTraps: [
          { x: 600, y: 770, type: 'explosion', damage: 25, blastRadius: 80, warningTime: 1500, cooldownTime: 5000, pattern: 'periodic' },
          { x: 1200, y: 770, type: 'explosion', damage: 25, blastRadius: 80, warningTime: 1500, cooldownTime: 5000, pattern: 'periodic' },
          { x: 1800, y: 770, type: 'explosion', damage: 25, blastRadius: 80, warningTime: 1500, cooldownTime: 5000, pattern: 'periodic' }
        ],
        // 🔥 竞技场风力区域（帮助躲避Boss）
        windZones: [
          // 左侧上升风（帮助跳上高台）
          { x: 50, y: 400, width: 100, height: 450, direction: 'up', windForce: 22 },
          // 右侧上升风
          { x: 2250, y: 400, width: 100, height: 450, direction: 'up', windForce: 22 },
          // 中央上升风
          { x: 1150, y: 300, width: 100, height: 550, direction: 'up', windForce: 20 }
        ],
        // 🔥 时间减速区域（战术躲避用）
        timeZones: [
          { x: 1050, y: 200, width: 300, height: 200, slowFactor: 0.6, color: 0x00bfff }
        ],
        // 🔥🔥🔥 三个Boss敌人 - 竞技场边缘，给玩家充足准备时间！
        // 玩家初始位置在(1000, 650)，Boss在两侧和顶部，距离足够远
        enemies: [
          // 检票长（近战型）- 最左边角落，离玩家约900像素
          { x: 100, y: 700, type: 'boss', bossId: 'ticket_master', bossIndex: 1 },
          // 站台长（召唤型）- 最右边角落，离玩家约1300像素
          { x: 2300, y: 700, type: 'boss', bossId: 'platform_master', bossIndex: 2 },
          // 列车长（控制型）- 顶部中央高台，需要玩家跳上去
          { x: 1200, y: 150, type: 'boss', bossId: 'conductor', bossIndex: 3 }
        ],
        // 🔥 竞技场收集品（血包为主，帮助生存）- 数量翻倍
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - Boss战需要更多血包
          // 四角血包（每个位置2个）
          { x: 150, y: 550, type: 'health_pack', value: 45 },
          { x: 200, y: 550, type: 'health_pack', value: 45 },
          { x: 2250, y: 550, type: 'health_pack', value: 45 },
          { x: 2200, y: 550, type: 'health_pack', value: 45 },
          { x: 150, y: 350, type: 'health_pack', value: 48 },
          { x: 200, y: 350, type: 'health_pack', value: 48 },
          { x: 2250, y: 350, type: 'health_pack', value: 48 },
          { x: 2200, y: 350, type: 'health_pack', value: 48 },
          // 中央高台血包
          { x: 1200, y: 300, type: 'health_pack', value: 55 },
          { x: 1250, y: 300, type: 'health_pack', value: 55 },
          { x: 1200, y: 130, type: 'health_pack', value: 60 },
          { x: 1150, y: 130, type: 'health_pack', value: 60 },
          // 跳跃平台血包
          { x: 550, y: 600, type: 'health_pack', value: 40 },
          { x: 600, y: 600, type: 'health_pack', value: 40 },
          { x: 1850, y: 600, type: 'health_pack', value: 40 },
          { x: 1800, y: 600, type: 'health_pack', value: 40 },
          // 额外血包（中间区域）
          { x: 800, y: 450, type: 'health_pack', value: 50 },
          { x: 850, y: 450, type: 'health_pack', value: 50 },
          { x: 1600, y: 450, type: 'health_pack', value: 50 },
          { x: 1550, y: 450, type: 'health_pack', value: 50 },
          // 底部血包
          { x: 700, y: 750, type: 'health_pack', value: 38 },
          { x: 1700, y: 750, type: 'health_pack', value: 38 },
          // 宝石（击败Boss后的奖励位置）
          { x: 450, y: 230, type: 'gem', value: 100 },
          { x: 1950, y: 230, type: 'gem', value: 100 },
          { x: 1200, y: 130, type: 'gem', value: 200 }
        ],
        // 🔥 终点在中央（击败所有Boss后开启）
        goal: { x: 1200, y: 770 },

        // 🔥🔥🔥 三Boss竞技场配置 - 智能AI + 协同攻击
        // 参考洛克人、空洞骑士、茶杯头的Boss设计
        // 核心机制：追逐→停下攻击→再追逐，Boss之间协同配合
        bossConfig: {
          visualTheme: 'default',
          mode: 'triple_boss_arena',  // 三Boss竞技场模式
          requireAllDefeated: true,   // 需要击败所有Boss才能通关
          cooperativeAI: true,        // Boss之间协同配合
          protectWoundedAlly: true,   // 保护受伤的同伴
          enrageOnAllyDefeat: true,   // 同伴被击败时狂暴
          
          // 🔥 检票长（近战型Boss）- 红色
          boss1: {
            id: 'ticket_master',
            name: '检票长',
            title: '闸门守护者',
            hp: 400,
            color: 0xe8363b,
            size: { width: 70, height: 90 },
            position: { x: 300, y: 700 },
            aiType: 'aggressive_melee',  // 激进近战型
            chaseSpeed: 100,
            attackRange: 120,
            attacks: [
              { name: '闸门冲击', damage: 28, cooldown: 2000, type: 'melee_charge', range: 150 },
              { name: '票据风暴', damage: 18, cooldown: 2500, type: 'projectile_spread', count: 5, range: 400 },
              { name: '定身术', damage: 0, cooldown: 8000, type: 'stun', duration: 1500, range: 300 }
            ],
            phases: [
              { hpThreshold: 100, attackSpeed: 1.0, moveSpeed: 100, behavior: 'chase_attack' },
              { hpThreshold: 50, attackSpeed: 1.3, moveSpeed: 130, behavior: 'aggressive' },
              { hpThreshold: 25, attackSpeed: 1.6, moveSpeed: 160, behavior: 'berserk', unlockSkill: '连续冲击' }
            ],
            cooperativeSkills: ['夹击配合', '掩护撤退'],
            defeatReward: { hp: 40, coins: 80 }
          },
          
          // 🔥 站台长（召唤型Boss）- 金色
          boss2: {
            id: 'platform_master',
            name: '站台长',
            title: '列车召唤师',
            hp: 500,
            color: 0xffd700,
            size: { width: 80, height: 100 },
            position: { x: 2100, y: 700 },
            aiType: 'summoner_ranged',  // 召唤远程型
            chaseSpeed: 80,
            attackRange: 500,
            keepDistance: 250,  // 保持距离
            attacks: [
              { name: '列车冲撞', damage: 35, cooldown: 4000, type: 'summon_train', range: 800 },
              { name: '站台震荡', damage: 22, cooldown: 2500, type: 'ground_pound', radius: 200 },
              { name: '磁力推拉', damage: 15, cooldown: 5000, type: 'magnetic_pull', range: 400, pullForce: 300 }
            ],
            phases: [
              { hpThreshold: 100, attackSpeed: 1.0, moveSpeed: 80, behavior: 'keep_distance' },
              { hpThreshold: 60, attackSpeed: 1.2, moveSpeed: 100, behavior: 'tactical', unlockSkill: '双列车' },
              { hpThreshold: 30, attackSpeed: 1.5, moveSpeed: 120, behavior: 'aggressive', unlockSkill: '磁力风暴' }
            ],
            cooperativeSkills: ['列车夹击', '磁力配合'],
            defeatReward: { hp: 50, coins: 120 }
          },
          
          // 🔥 列车长（控制型Boss）- 紫色
          boss3: {
            id: 'conductor',
            name: '列车长',
            title: '时空操控者',
            hp: 600,
            color: 0x9932cc,
            size: { width: 90, height: 110 },
            position: { x: 1200, y: 450 },
            aiType: 'controller_teleport',  // 控制传送型
            chaseSpeed: 90,
            attackRange: 600,
            canTeleport: true,
            attacks: [
              { name: '时空裂隙', damage: 32, cooldown: 3000, type: 'time_rift', range: 500, duration: 3000 },
              { name: '时间冻结', damage: 0, cooldown: 10000, type: 'time_freeze', duration: 2000, range: 400 },
              { name: '传送打击', damage: 40, cooldown: 4000, type: 'teleport_strike', range: 800 },
              { name: '列车幻影', damage: 25, cooldown: 5000, type: 'phantom_train', count: 3, range: 600 }
            ],
            phases: [
              { hpThreshold: 100, attackSpeed: 1.0, moveSpeed: 90, behavior: 'tactical_teleport' },
              { hpThreshold: 70, attackSpeed: 1.2, moveSpeed: 110, behavior: 'aggressive_teleport', unlockSkill: '连续传送' },
              { hpThreshold: 40, attackSpeed: 1.4, moveSpeed: 130, behavior: 'berserk_teleport', unlockSkill: '时空风暴' },
              { hpThreshold: 15, attackSpeed: 1.8, moveSpeed: 180, behavior: 'final_stand', enraged: true, unlockSkill: '终极时停' }
            ],
            cooperativeSkills: ['时空配合', '传送救援', '终极合体技'],
            defeatReward: { hp: 80, coins: 200, skill: 'time_shield' }
          },
          
          // 🔥 协同攻击配置
          cooperativeAttacks: [
            { 
              name: '三方夹击', 
              trigger: 'player_cornered',  // 玩家被逼到角落时触发
              participants: ['ticket_master', 'platform_master', 'conductor'],
              damage: 50,
              cooldown: 15000
            },
            {
              name: '时空列车',
              trigger: 'hp_sync',  // 三个Boss血量同步低于50%时触发
              participants: ['platform_master', 'conductor'],
              damage: 60,
              cooldown: 20000
            }
          ],
          
          // 🔥 保护机制
          protectionMechanic: {
            triggerHpPercent: 25,  // 同伴血量低于25%时触发保护
            protectorBuff: { defense: 1.5, speed: 1.3 },  // 保护者获得增益
            protectedBuff: { regen: 5 },  // 被保护者缓慢回血
            duration: 5000
          }
        }
      },
      objectives: [
        { type: 'defeat', target: 'ticket_master', description: '🎫 击败检票长' },
        { type: 'defeat', target: 'platform_master', description: '🚉 击败站台长' },
        { type: 'defeat', target: 'conductor', description: '🚂 击败列车长' },
        { type: 'reach', target: 'goal', description: '🏆 到达终点，成为时空列车大师！' }
      ],
      questions: [
        { id: 'q10_5_1', type: 'choice', question: '列车长的主要职责是什么？🚂', options: ['开火车', '管理列车运行和乘客安全', '卖票', '打扫卫生'], answer: '管理列车运行和乘客安全', difficulty: 3, subject: 'general', explanation: '列车长负责整列火车的运行管理和乘客安全！' },
        { id: 'q10_5_2', type: 'choice', question: '宜昌东站连接哪条重要铁路？🛤️', options: ['京广铁路', '沪汉蓉铁路', '京沪铁路', '陇海铁路'], answer: '沪汉蓉铁路', difficulty: 3, subject: 'general', explanation: '宜昌东站是沪汉蓉铁路上的重要车站！' }
      ],
      rewards: { xp: 1500, coins: 800, skill: 'time_shield' }
    }

  ]
};

// 导出技能配置
export const campaign10Skills = {
  time_shield: {
    id: 'time_shield',
    name: '时空护盾',
    description: '激活时空护盾，短暂免疫所有伤害',
    icon: '🛡️⏰',
    cooldown: 30000,
    duration: 3000,
    effect: 'invincibility',
    unlockCondition: '击败列车长获得'
  }
};

// 导出Boss配置
export const campaign10Bosses = {
  ticketMaster: {
    name: '检票长',
    title: '闸门守护者',
    description: '控制着车站所有闸门的神秘人物',
    color: 0xe8363b,
    size: { width: 70, height: 90 }
  },
  platformMaster: {
    name: '站台长',
    title: '列车召唤师',
    description: '能够召唤列车进行攻击的强大敌人',
    color: 0xffd700,
    size: { width: 80, height: 100 }
  },
  conductor: {
    name: '列车长',
    title: '时空操控者',
    description: '掌握时空之力的终极Boss',
    color: 0x9932cc,
    size: { width: 90, height: 110 }
  }
};

export default campaign10;
