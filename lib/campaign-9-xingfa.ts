// 🔥🔥🔥 战役9：兴发集团化工冒险 - 超大规模重制版 🔥🔥🔥
// 主题：宜昌猇亭兴发集团，探索绿色化工与环保科技
// 特色玩法：传送带平台、定时爆炸陷阱、污染/净化区域、风力区域、酸液喷射怪
// Boss：双Boss战 - 酸液博士 + 气体博士
// 🔥 v4.0 超大规模版：每关15000+宽度，极限难度，创新玩法组合

import { Campaign } from './campaigns';

// 传送带平台接口
export interface ConveyorPlatform {
  x: number;
  y: number;
  width: number;
  height?: number;
  conveyorSpeed: number;
  conveyorDirection: 'left' | 'right';
}

// 爆炸陷阱接口
export interface ExplosionTrap {
  x: number;
  y: number;
  type: 'explosion';
  damage: number;
  blastRadius: number;
  warningTime: number;
  cooldownTime: number;
  pattern: 'periodic';
}

// 风力区域接口
export interface WindZone {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'up' | 'down' | 'left' | 'right';
  windForce: number;
}

// 双Boss配置接口
export interface DualBossConfig {
  type: 'dual';
  phase1Boss: {
    name: string;
    hp: number;
    attacks: string[];
    attackInterval: number;
    moveSpeed: number;
  };
  phase2Boss: {
    name: string;
    hp: number;
    attacks: string[];
    attackInterval: number;
    moveSpeed: number;
  };
  combinedAttack: {
    name: string;
    triggerCondition: string;
    damage: number;
    areaSize: { width: number; height: number };
  };
  enrageOnSingleDefeat: boolean;
  defeatCondition: 'combat' | 'quiz' | 'hybrid';
  requireBothDefeated: boolean;
}

// 配置常量
export const conveyorConfig = {
  minSpeed: 50,
  maxSpeed: 350,
  defaultSpeed: 100,
  colors: { left: 0xff4444, right: 0x4444ff }
};

export const windZoneConfig = {
  minForce: 1,
  maxForce: 16,
  colors: { up: 0x00bfff, down: 0xff6600, left: 0x00ff00, right: 0xffff00 }
};

export const explosionTrapConfig = {
  defaultDamage: 30,
  defaultBlastRadius: 110,
  defaultWarningTime: 1200,
  defaultCooldownTime: 2800,
  warningColor: 0xff0000
};

export const campaign9: Campaign = {
  id: 'campaign_9',
  name: '兴发集团化工冒险',
  description: '在兴发集团探索绿色化工与环保科技，击败双Boss获得化学护盾技能',
  location: '兴发集团',
  theme: '绿色化工与环保科技',
  story: '兴发集团是宜昌猇亭的大型化工企业，也是中国磷化工行业的龙头企业。一天，实验室发生了意外事故，两位疯狂的科学家——酸液博士和气体博士——控制了整个工厂！他们释放了大量有毒物质，威胁着整个猇亭地区的安全。你需要穿越传送带迷宫、躲避定时爆炸、净化污染区域，最终击败这对邪恶的双Boss，拯救兴发集团！',
  levels: [

    // ========================================
    // 关卡1：化工厂逆流长征 🏭💨💥🧪
    // 规模：15000 x 1200 超大地图
    // 玩法：逆向传送带 + 爆炸陷阱 + 酸液喷射怪 + 风力区 + 毒气区
    // ========================================
    {
      id: 'level_9_1',
      name: '化工厂逆流长征',
      description: '⚠️超长关卡！在15000米的传送带上逆流前进！',
      story: '化工厂的主传送带完全失控！🏭 整条15公里的传送带都在把你往回推！沿途布满爆炸陷阱、酸液喷射器和毒气区！💡提示：1️⃣ 传送带速度会越来越快！2️⃣ 酸液喷射怪会定期发射酸液！3️⃣ 风力区是你的救命稻草！4️⃣ 毒气区会持续掉血，快速通过！',
      campaignMapData: {
        startPosition: { x: 150, y: 1000 },
        width: 15000,
        height: 1200,
        
        platforms: [
          // 起点
          { x: 0, y: 1050, width: 300, type: 'ground' },
          
          // ===== 第一区(0-3000)：入门传送带 速度150 =====
          { x: 300, y: 1050, width: 2700, conveyorSpeed: 150, conveyorDirection: 'left' },
          { x: 600, y: 950, width: 100 },
          { x: 900, y: 850, width: 80 },
          { x: 1200, y: 800, width: 100 },
          { x: 1500, y: 850, width: 80 },
          { x: 1800, y: 900, width: 100 },
          { x: 2100, y: 850, width: 80 },
          { x: 2400, y: 800, width: 100 },
          { x: 2700, y: 900, width: 80 },
          
          // 第一安全岛
          { x: 3000, y: 1050, width: 200, type: 'ground' },
          
          // ===== 第二区(3200-6500)：加速传送带 速度200 =====
          { x: 3200, y: 1050, width: 3300, conveyorSpeed: 200, conveyorDirection: 'left' },
          { x: 3500, y: 920, width: 70 },
          { x: 3850, y: 820, width: 70 },
          { x: 4200, y: 750, width: 80 },
          { x: 4550, y: 700, width: 70 },
          { x: 4900, y: 750, width: 80 },
          { x: 5250, y: 820, width: 70 },
          { x: 5600, y: 880, width: 70 },
          { x: 5950, y: 820, width: 80 },
          { x: 6200, y: 900, width: 70 },
          
          // 第二安全岛
          { x: 6500, y: 1050, width: 200, type: 'ground' },
          
          // ===== 第三区(6700-10500)：高速传送带 速度260 =====
          { x: 6700, y: 1050, width: 3800, conveyorSpeed: 260, conveyorDirection: 'left' },
          { x: 7000, y: 900, width: 60 },
          { x: 7400, y: 800, width: 60 },
          { x: 7800, y: 700, width: 70 },
          { x: 8200, y: 650, width: 60 },
          { x: 8600, y: 700, width: 70 },
          { x: 9000, y: 750, width: 60 },
          { x: 9400, y: 800, width: 70 },
          { x: 9800, y: 850, width: 60 },
          { x: 10200, y: 920, width: 70 },
          
          // 第三安全岛
          { x: 10500, y: 1050, width: 200, type: 'ground' },
          
          // ===== 第四区(10700-14500)：极速传送带 速度320 =====
          { x: 10700, y: 1050, width: 3800, conveyorSpeed: 320, conveyorDirection: 'left' },
          { x: 11000, y: 880, width: 50 },
          { x: 11400, y: 780, width: 50 },
          { x: 11800, y: 680, width: 60 },
          { x: 12200, y: 620, width: 50 },
          { x: 12600, y: 680, width: 60 },
          { x: 13000, y: 750, width: 50 },
          { x: 13400, y: 820, width: 60 },
          { x: 13800, y: 880, width: 50 },
          { x: 14200, y: 950, width: 60 },
          
          // 终点
          { x: 14500, y: 1050, width: 500, type: 'ground' }
        ],
        
        explosionTraps: [
          // 第一区
          { x: 500, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 800, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 1100, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 1400, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 1700, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 2000, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 2300, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 2600, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          { x: 2900, y: 1020, type: 'explosion', damage: 25, blastRadius: 100, warningTime: 1400, cooldownTime: 3200, pattern: 'periodic' },
          // 第二区
          { x: 3400, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 3700, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 4000, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 4300, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 4600, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 4900, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 5200, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 5500, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 5800, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 6100, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 6350, y: 1020, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          // 第三区
          { x: 6900, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 7200, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 7500, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 7800, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8100, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8400, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8700, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 9000, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 9300, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 9600, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 9900, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 10200, y: 1020, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          // 第四区
          { x: 10900, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11200, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11500, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11800, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 12100, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 12400, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 12700, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 13000, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 13300, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 13600, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 13900, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' },
          { x: 14200, y: 1020, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 900, cooldownTime: 2200, pattern: 'periodic' }
        ],
        
        chemicalZones: [
          // 酸液坑
          { x: 700, y: 1070, width: 150, height: 80, type: 'acid', damage: 30, color: 0xff4444 },
          { x: 1300, y: 1070, width: 150, height: 80, type: 'acid', damage: 30, color: 0xff4444 },
          { x: 1900, y: 1070, width: 150, height: 80, type: 'acid', damage: 30, color: 0xff4444 },
          { x: 2500, y: 1070, width: 150, height: 80, type: 'acid', damage: 30, color: 0xff4444 },
          { x: 3600, y: 1070, width: 180, height: 80, type: 'acid', damage: 35, color: 0xff4444 },
          { x: 4400, y: 1070, width: 180, height: 80, type: 'acid', damage: 35, color: 0xff4444 },
          { x: 5200, y: 1070, width: 180, height: 80, type: 'acid', damage: 35, color: 0xff4444 },
          { x: 6000, y: 1070, width: 180, height: 80, type: 'acid', damage: 35, color: 0xff4444 },
          // 毒气区
          { x: 7100, y: 500, width: 800, height: 600, type: 'poison', damage: 8, color: 0x9932cc },
          { x: 8500, y: 450, width: 800, height: 650, type: 'poison', damage: 8, color: 0x9932cc },
          { x: 9800, y: 500, width: 700, height: 600, type: 'poison', damage: 8, color: 0x9932cc },
          // 第四区
          { x: 11100, y: 1070, width: 200, height: 80, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 12000, y: 1070, width: 200, height: 80, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 12900, y: 1070, width: 200, height: 80, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 13700, y: 1070, width: 200, height: 80, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 11500, y: 400, width: 1000, height: 500, type: 'poison', damage: 10, color: 0x9932cc },
          { x: 13200, y: 400, width: 800, height: 500, type: 'poison', damage: 10, color: 0x9932cc }
        ],
        
        windZones: [
          // 第一区
          { x: 800, y: 600, width: 150, height: 500, direction: 'up', windForce: 10 },
          { x: 1600, y: 550, width: 150, height: 550, direction: 'up', windForce: 10 },
          { x: 2400, y: 600, width: 150, height: 500, direction: 'up', windForce: 10 },
          // 第二区
          { x: 3700, y: 500, width: 150, height: 600, direction: 'up', windForce: 12 },
          { x: 4700, y: 450, width: 150, height: 650, direction: 'up', windForce: 12 },
          { x: 5700, y: 500, width: 150, height: 600, direction: 'up', windForce: 12 },
          // 第三区
          { x: 7300, y: 400, width: 150, height: 700, direction: 'up', windForce: 14 },
          { x: 8300, y: 350, width: 150, height: 750, direction: 'up', windForce: 14 },
          { x: 9300, y: 400, width: 150, height: 700, direction: 'up', windForce: 14 },
          { x: 10100, y: 450, width: 150, height: 650, direction: 'up', windForce: 14 },
          // 第四区
          { x: 11200, y: 300, width: 150, height: 800, direction: 'up', windForce: 16 },
          { x: 12200, y: 250, width: 150, height: 850, direction: 'up', windForce: 16 },
          { x: 13200, y: 300, width: 150, height: 800, direction: 'up', windForce: 16 },
          { x: 14000, y: 350, width: 150, height: 750, direction: 'up', windForce: 16 }
        ],
        
        enemies: [
          // 第一区
          { x: 600, y: 900, type: 'bat' },
          { x: 1200, y: 750, type: 'bat' },
          { x: 1800, y: 850, type: 'acid_turret' },
          { x: 2400, y: 750, type: 'bat' },
          // 第二区
          { x: 3400, y: 870, type: 'acid_turret' },
          { x: 4000, y: 700, type: 'bat' },
          { x: 4600, y: 650, type: 'acid_turret' },
          { x: 5200, y: 770, type: 'bat' },
          { x: 5800, y: 830, type: 'acid_turret' },
          { x: 6300, y: 850, type: 'robot' },
          // 第三区
          { x: 7000, y: 850, type: 'acid_turret' },
          { x: 7600, y: 750, type: 'bat' },
          { x: 8200, y: 600, type: 'acid_turret' },
          { x: 8800, y: 700, type: 'bat' },
          { x: 9400, y: 750, type: 'acid_turret' },
          { x: 10000, y: 800, type: 'robot' },
          // 第四区
          { x: 10900, y: 830, type: 'acid_turret' },
          { x: 11500, y: 730, type: 'acid_turret' },
          { x: 12100, y: 630, type: 'turret' },
          { x: 12700, y: 700, type: 'acid_turret' },
          { x: 13300, y: 770, type: 'acid_turret' },
          { x: 13900, y: 830, type: 'turret' }
        ],
        
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一安全岛（x:3000）
          { x: 1500, y: 900, type: 'health_pack', value: 20 },
          { x: 1550, y: 900, type: 'health_pack', value: 20 },
          // 第一安全岛后
          { x: 3050, y: 1000, type: 'health_pack', value: 22 },
          { x: 3100, y: 1000, type: 'health_pack', value: 22 },
          // 第二区中段
          { x: 5000, y: 900, type: 'health_pack', value: 22 },
          { x: 5050, y: 900, type: 'health_pack', value: 22 },
          // 第二安全岛（x:6500）
          { x: 6550, y: 1000, type: 'health_pack', value: 24 },
          { x: 6600, y: 1000, type: 'health_pack', value: 24 },
          // 第三区中段
          { x: 8500, y: 850, type: 'health_pack', value: 24 },
          { x: 8550, y: 850, type: 'health_pack', value: 24 },
          // 第三安全岛（x:10500）
          { x: 10550, y: 1000, type: 'health_pack', value: 26 },
          { x: 10600, y: 1000, type: 'health_pack', value: 26 },
          // 第四区中段
          { x: 12000, y: 900, type: 'health_pack', value: 28 },
          { x: 12050, y: 900, type: 'health_pack', value: 28 },
          // 终点前
          { x: 14000, y: 900, type: 'health_pack', value: 30 },
          { x: 14050, y: 900, type: 'health_pack', value: 30 },
          // 冲刺星星
          { x: 1000, y: 750, type: 'dash_star', value: 50 },
          { x: 2700, y: 850, type: 'dash_star', value: 50 },
          { x: 4550, y: 650, type: 'dash_star', value: 50 },
          { x: 6200, y: 850, type: 'dash_star', value: 50 },
          { x: 8200, y: 600, type: 'dash_star', value: 50 },
          { x: 10200, y: 870, type: 'dash_star', value: 50 },
          { x: 12200, y: 570, type: 'dash_star', value: 50 },
          { x: 14200, y: 900, type: 'dash_star', value: 50 },
          // 宝石
          { x: 900, y: 800, type: 'gem', value: 30 },
          { x: 1500, y: 800, type: 'gem', value: 30 },
          { x: 2100, y: 800, type: 'gem', value: 30 },
          { x: 3850, y: 770, type: 'gem', value: 40 },
          { x: 4900, y: 700, type: 'gem', value: 40 },
          { x: 5950, y: 770, type: 'gem', value: 40 },
          { x: 7400, y: 750, type: 'gem', value: 50 },
          { x: 8600, y: 650, type: 'gem', value: 50 },
          { x: 9800, y: 800, type: 'gem', value: 50 },
          { x: 11400, y: 730, type: 'gem', value: 60 },
          { x: 12600, y: 630, type: 'gem', value: 60 },
          { x: 13800, y: 830, type: 'gem', value: 70 }
        ],
        
        goal: { x: 14700, y: 1020 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '完成15公里逆流长征' }
      ],
      questions: [
        {
          id: 'q9_1_1',
          type: 'choice',
          question: '【化工知识】传送带在化工厂中主要用于什么？🏭',
          options: ['运输原料和产品', '发电', '净化空气', '加热物料'],
          answer: '运输原料和产品',
          difficulty: 1,
          subject: 'general',
          explanation: '传送带是化工厂中最常见的物料运输设备！'
        },
        {
          id: 'q9_1_2',
          type: 'choice',
          question: '【安全知识】在传送带附近工作时，最重要的安全措施是？⚠️',
          options: ['戴安全帽', '不要触碰运转中的传送带', '穿拖鞋', '大声说话'],
          answer: '不要触碰运转中的传送带',
          difficulty: 1,
          subject: 'safety',
          explanation: '运转中的传送带非常危险！衣物、头发或手指可能被卷入。'
        }
      ],
      rewards: { xp: 400, coins: 200 }
    },

    // ========================================
    // 关卡2：化学反应地狱走廊 💥🧪🌬️
    // 规模：16000 x 1000 超大地图
    // 玩法：密集毒气+酸液+爆炸+传送带+风力逃生
    // ========================================
    {
      id: 'level_9_2',
      name: '化学反应地狱走廊',
      description: '⚠️极限挑战！穿越16公里的化学反应地狱！',
      story: '进入化学反应走廊！🧪 这里是化工厂最危险的区域！毒气弥漫、酸液横流、反应釜随时爆炸！💡提示：1️⃣ 紫色毒气区会持续掉血！2️⃣ 红色酸液池伤害极高！3️⃣ 蓝色风力区是逃生关键！4️⃣ 爆炸前有红色警报！5️⃣ 酸液喷射怪无处不在！',
      campaignMapData: {
        startPosition: { x: 150, y: 800 },
        width: 16000,
        height: 1000,
        
        platforms: [
          // 起点
          { x: 0, y: 850, width: 250, type: 'ground' },
          
          // ===== 第一区(0-4000)：毒气走廊 =====
          { x: 350, y: 800, width: 100, conveyorSpeed: 120, conveyorDirection: 'left' },
          { x: 550, y: 720, width: 80 },
          { x: 750, y: 650, width: 80, conveyorSpeed: 120, conveyorDirection: 'right' },
          { x: 950, y: 580, width: 80 },
          { x: 1150, y: 520, width: 80, conveyorSpeed: 140, conveyorDirection: 'left' },
          { x: 1350, y: 600, width: 80 },
          { x: 1550, y: 680, width: 80, conveyorSpeed: 140, conveyorDirection: 'right' },
          { x: 1750, y: 750, width: 100 },
          { x: 2000, y: 800, width: 150, type: 'ground' },
          { x: 2250, y: 720, width: 80, conveyorSpeed: 160, conveyorDirection: 'left' },
          { x: 2450, y: 640, width: 80 },
          { x: 2650, y: 560, width: 80, conveyorSpeed: 160, conveyorDirection: 'right' },
          { x: 2850, y: 500, width: 80 },
          { x: 3050, y: 560, width: 80, conveyorSpeed: 180, conveyorDirection: 'left' },
          { x: 3250, y: 640, width: 80 },
          { x: 3450, y: 720, width: 80 },
          { x: 3700, y: 800, width: 150, type: 'ground' },
          
          // ===== 第二区(4000-8000)：酸液地狱 =====
          { x: 3950, y: 850, width: 4050, conveyorSpeed: 200, conveyorDirection: 'left' },
          { x: 4200, y: 750, width: 70 },
          { x: 4500, y: 680, width: 70 },
          { x: 4800, y: 620, width: 70 },
          { x: 5100, y: 680, width: 70 },
          { x: 5400, y: 750, width: 70 },
          { x: 5700, y: 680, width: 70 },
          { x: 6000, y: 620, width: 70 },
          { x: 6300, y: 680, width: 70 },
          { x: 6600, y: 750, width: 70 },
          { x: 6900, y: 680, width: 70 },
          { x: 7200, y: 620, width: 70 },
          { x: 7500, y: 700, width: 70 },
          { x: 7800, y: 800, width: 150, type: 'ground' },
          
          // ===== 第三区(8000-12000)：混合地狱 =====
          { x: 8050, y: 850, width: 3950, conveyorSpeed: 250, conveyorDirection: 'left' },
          { x: 8300, y: 720, width: 60 },
          { x: 8600, y: 620, width: 60 },
          { x: 8900, y: 520, width: 60 },
          { x: 9200, y: 450, width: 60 },
          { x: 9500, y: 520, width: 60 },
          { x: 9800, y: 600, width: 60 },
          { x: 10100, y: 520, width: 60 },
          { x: 10400, y: 450, width: 60 },
          { x: 10700, y: 520, width: 60 },
          { x: 11000, y: 620, width: 60 },
          { x: 11300, y: 720, width: 60 },
          { x: 11600, y: 800, width: 150, type: 'ground' },
          
          // ===== 第四区(12000-16000)：终极挑战 =====
          { x: 11850, y: 850, width: 3650, conveyorSpeed: 300, conveyorDirection: 'left' },
          { x: 12100, y: 700, width: 50 },
          { x: 12400, y: 580, width: 50 },
          { x: 12700, y: 480, width: 50 },
          { x: 13000, y: 400, width: 50 },
          { x: 13300, y: 480, width: 50 },
          { x: 13600, y: 580, width: 50 },
          { x: 13900, y: 480, width: 50 },
          { x: 14200, y: 400, width: 50 },
          { x: 14500, y: 500, width: 50 },
          { x: 14800, y: 620, width: 50 },
          { x: 15100, y: 750, width: 60 },
          
          // 终点
          { x: 15500, y: 850, width: 500, type: 'ground' }
        ],
        
        explosionTraps: [
          // 第一区
          { x: 450, y: 770, type: 'explosion', damage: 28, blastRadius: 100, warningTime: 1300, cooldownTime: 3000, pattern: 'periodic' },
          { x: 850, y: 620, type: 'explosion', damage: 28, blastRadius: 100, warningTime: 1300, cooldownTime: 3000, pattern: 'periodic' },
          { x: 1250, y: 490, type: 'explosion', damage: 28, blastRadius: 100, warningTime: 1300, cooldownTime: 3000, pattern: 'periodic' },
          { x: 1650, y: 650, type: 'explosion', damage: 28, blastRadius: 100, warningTime: 1300, cooldownTime: 3000, pattern: 'periodic' },
          { x: 2350, y: 690, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 2750, y: 530, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 3150, y: 610, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 3550, y: 690, type: 'explosion', damage: 30, blastRadius: 110, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          // 第二区
          { x: 4100, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 4400, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 4700, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 5000, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 5300, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 5600, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 5900, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 6200, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 6500, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 6800, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 7100, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 7400, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          { x: 7700, y: 820, type: 'explosion', damage: 32, blastRadius: 110, warningTime: 1100, cooldownTime: 2600, pattern: 'periodic' },
          // 第三区
          { x: 8200, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 8500, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 8800, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 9100, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 9400, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 9700, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 10000, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 10300, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 10600, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 10900, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 11200, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          { x: 11500, y: 820, type: 'explosion', damage: 35, blastRadius: 120, warningTime: 1000, cooldownTime: 2400, pattern: 'periodic' },
          // 第四区
          { x: 12000, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 12300, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 12600, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 12900, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 13200, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 13500, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 13800, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 14100, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 14400, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 14700, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 15000, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' },
          { x: 15300, y: 820, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 850, cooldownTime: 2000, pattern: 'periodic' }
        ],
        
        chemicalZones: [
          // 第一区：毒气走廊
          { x: 300, y: 350, width: 1500, height: 500, type: 'poison', damage: 7, color: 0x9932cc },
          { x: 2200, y: 300, width: 1500, height: 550, type: 'poison', damage: 8, color: 0x9932cc },
          // 第二区：酸液地狱
          { x: 4050, y: 870, width: 3700, height: 150, type: 'acid', damage: 50, color: 0xff0000 },
          { x: 4300, y: 500, width: 600, height: 300, type: 'poison', damage: 9, color: 0x9932cc },
          { x: 5500, y: 450, width: 600, height: 350, type: 'poison', damage: 9, color: 0x9932cc },
          { x: 6700, y: 500, width: 600, height: 300, type: 'poison', damage: 9, color: 0x9932cc },
          // 第三区：混合地狱
          { x: 8100, y: 870, width: 3500, height: 150, type: 'acid', damage: 60, color: 0xff0000 },
          { x: 8400, y: 250, width: 1200, height: 400, type: 'poison', damage: 10, color: 0x9932cc },
          { x: 10000, y: 250, width: 1200, height: 400, type: 'poison', damage: 10, color: 0x9932cc },
          // 第四区：终极地狱
          { x: 11900, y: 870, width: 3600, height: 150, type: 'acid', damage: 80, color: 0xff0000 },
          { x: 12200, y: 200, width: 1500, height: 350, type: 'poison', damage: 12, color: 0x9932cc },
          { x: 14000, y: 200, width: 1200, height: 400, type: 'poison', damage: 12, color: 0x9932cc }
        ],
        
        windZones: [
          // 第一区
          { x: 650, y: 300, width: 150, height: 550, direction: 'up', windForce: 10 },
          { x: 1050, y: 250, width: 150, height: 600, direction: 'up', windForce: 11 },
          { x: 1450, y: 300, width: 150, height: 550, direction: 'up', windForce: 10 },
          { x: 2550, y: 250, width: 150, height: 600, direction: 'up', windForce: 12 },
          { x: 2950, y: 200, width: 150, height: 650, direction: 'up', windForce: 12 },
          { x: 3350, y: 250, width: 150, height: 600, direction: 'up', windForce: 11 },
          // 第二区
          { x: 4400, y: 300, width: 150, height: 600, direction: 'up', windForce: 13 },
          { x: 5000, y: 250, width: 150, height: 650, direction: 'up', windForce: 13 },
          { x: 5600, y: 300, width: 150, height: 600, direction: 'up', windForce: 14 },
          { x: 6200, y: 250, width: 150, height: 650, direction: 'up', windForce: 14 },
          { x: 6800, y: 300, width: 150, height: 600, direction: 'up', windForce: 13 },
          { x: 7400, y: 350, width: 150, height: 550, direction: 'up', windForce: 13 },
          // 第三区
          { x: 8500, y: 200, width: 150, height: 700, direction: 'up', windForce: 15 },
          { x: 9100, y: 150, width: 150, height: 750, direction: 'up', windForce: 15 },
          { x: 9700, y: 200, width: 150, height: 700, direction: 'up', windForce: 15 },
          { x: 10300, y: 150, width: 150, height: 750, direction: 'up', windForce: 15 },
          { x: 10900, y: 200, width: 150, height: 700, direction: 'up', windForce: 14 },
          // 第四区
          { x: 12300, y: 150, width: 150, height: 750, direction: 'up', windForce: 16 },
          { x: 12900, y: 100, width: 150, height: 800, direction: 'up', windForce: 16 },
          { x: 13500, y: 150, width: 150, height: 750, direction: 'up', windForce: 16 },
          { x: 14100, y: 100, width: 150, height: 800, direction: 'up', windForce: 16 },
          { x: 14700, y: 150, width: 150, height: 750, direction: 'up', windForce: 15 }
        ],
        
        enemies: [
          // 第一区
          { x: 450, y: 750, type: 'acid_turret' },
          { x: 850, y: 600, type: 'bat' },
          { x: 1250, y: 470, type: 'acid_turret' },
          { x: 1650, y: 630, type: 'bat' },
          { x: 2350, y: 670, type: 'acid_turret' },
          { x: 2750, y: 510, type: 'bat' },
          { x: 3150, y: 590, type: 'acid_turret' },
          { x: 3550, y: 670, type: 'robot' },
          // 第二区
          { x: 4300, y: 700, type: 'acid_turret' },
          { x: 4700, y: 630, type: 'acid_turret' },
          { x: 5200, y: 630, type: 'bat' },
          { x: 5600, y: 630, type: 'acid_turret' },
          { x: 6100, y: 630, type: 'bat' },
          { x: 6500, y: 700, type: 'acid_turret' },
          { x: 7000, y: 630, type: 'robot' },
          { x: 7400, y: 650, type: 'acid_turret' },
          // 第三区
          { x: 8400, y: 670, type: 'acid_turret' },
          { x: 8800, y: 570, type: 'acid_turret' },
          { x: 9300, y: 470, type: 'turret' },
          { x: 9700, y: 550, type: 'acid_turret' },
          { x: 10200, y: 470, type: 'acid_turret' },
          { x: 10600, y: 470, type: 'robot' },
          { x: 11100, y: 570, type: 'acid_turret' },
          // 第四区
          { x: 12200, y: 650, type: 'acid_turret' },
          { x: 12600, y: 530, type: 'acid_turret' },
          { x: 13100, y: 430, type: 'turret' },
          { x: 13500, y: 530, type: 'acid_turret' },
          { x: 14000, y: 430, type: 'acid_turret' },
          { x: 14400, y: 350, type: 'robot' },
          { x: 14900, y: 570, type: 'acid_turret' }
        ],
        
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包，避开毒气区域
          // 第一区安全岛（x:2000, y:800 地面平台）
          { x: 2050, y: 750, type: 'health_pack', value: 20 },
          { x: 2100, y: 750, type: 'health_pack', value: 20 },
          // 第一区安全岛2（x:3700, y:800 地面平台）
          { x: 3750, y: 750, type: 'health_pack', value: 22 },
          { x: 3800, y: 750, type: 'health_pack', value: 22 },
          // 第二区中段（避开毒气区，放在平台上）
          { x: 5400, y: 700, type: 'health_pack', value: 22 },
          { x: 5450, y: 700, type: 'health_pack', value: 22 },
          // 第二区后段（避开毒气区）
          { x: 7500, y: 650, type: 'health_pack', value: 24 },
          { x: 7550, y: 650, type: 'health_pack', value: 24 },
          // 第二区安全岛（x:7800, y:800 地面平台）
          { x: 7850, y: 750, type: 'health_pack', value: 25 },
          { x: 7900, y: 750, type: 'health_pack', value: 25 },
          // 第三区前段（避开毒气区8400-9600）
          { x: 8300, y: 680, type: 'health_pack', value: 25 },
          { x: 8350, y: 680, type: 'health_pack', value: 25 },
          // 第三区中段（避开毒气区）
          { x: 9800, y: 560, type: 'health_pack', value: 26 },
          { x: 9850, y: 560, type: 'health_pack', value: 26 },
          // 第三区安全岛（x:11600, y:800 地面平台）
          { x: 11650, y: 750, type: 'health_pack', value: 28 },
          { x: 11700, y: 750, type: 'health_pack', value: 28 },
          // 第四区前段（避开毒气区12200-13700）
          { x: 12100, y: 660, type: 'health_pack', value: 28 },
          { x: 12150, y: 660, type: 'health_pack', value: 28 },
          // 第四区中段（避开毒气区）
          { x: 13800, y: 540, type: 'health_pack', value: 30 },
          { x: 13850, y: 540, type: 'health_pack', value: 30 },
          // 第四区后段（终点前）
          { x: 15200, y: 700, type: 'health_pack', value: 32 },
          { x: 15250, y: 700, type: 'health_pack', value: 32 },
          // 冲刺星星
          { x: 1050, y: 470, type: 'dash_star', value: 50 },
          { x: 2850, y: 450, type: 'dash_star', value: 50 },
          { x: 5100, y: 630, type: 'dash_star', value: 50 },
          { x: 7200, y: 570, type: 'dash_star', value: 50 },
          { x: 9200, y: 400, type: 'dash_star', value: 50 },
          { x: 11000, y: 570, type: 'dash_star', value: 50 },
          { x: 13000, y: 350, type: 'dash_star', value: 50 },
          { x: 15100, y: 700, type: 'dash_star', value: 50 },
          // 宝石
          { x: 750, y: 600, type: 'gem', value: 30 },
          { x: 1350, y: 550, type: 'gem', value: 35 },
          { x: 2650, y: 510, type: 'gem', value: 40 },
          { x: 4500, y: 630, type: 'gem', value: 45 },
          { x: 5700, y: 630, type: 'gem', value: 45 },
          { x: 6900, y: 630, type: 'gem', value: 50 },
          { x: 8600, y: 570, type: 'gem', value: 55 },
          { x: 9800, y: 550, type: 'gem', value: 55 },
          { x: 10700, y: 470, type: 'gem', value: 60 },
          { x: 12700, y: 430, type: 'gem', value: 65 },
          { x: 13900, y: 430, type: 'gem', value: 70 },
          { x: 14800, y: 570, type: 'gem', value: 75 }
        ],
        
        goal: { x: 15700, y: 820 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '穿越16公里化学反应地狱' }
      ],
      questions: [
        {
          id: 'q9_2_1',
          type: 'choice',
          question: '【化学安全】化学反应釜爆炸的主要原因是什么？💥',
          options: ['温度或压力失控', '颜色太鲜艳', '声音太大', '形状不对'],
          answer: '温度或压力失控',
          difficulty: 2,
          subject: 'chemistry',
          explanation: '化学反应釜爆炸通常是因为温度或压力超出安全范围！'
        },
        {
          id: 'q9_2_2',
          type: 'choice',
          question: '【安全知识】发现化学品泄漏时，第一步应该做什么？🚨',
          options: ['用手去堵', '立即撤离并报警', '拍照发朋友圈', '继续工作'],
          answer: '立即撤离并报警',
          difficulty: 1,
          subject: 'safety',
          explanation: '发现化学品泄漏时，最重要的是保护自己！立即撤离危险区域。'
        }
      ],
      rewards: { xp: 450, coins: 220 }
    },

    // ========================================
    // 关卡3：死亡储罐巨塔 🏗️⬆️🧪💀
    // 规模：2000 x 4000 超高垂直地图
    // 玩法：极限垂直攀爬 + 密集酸液喷射 + 高速移动平台 + 超强风区
    // ========================================
    {
      id: 'level_9_3',
      name: '死亡储罐巨塔',
      description: '⚠️极限挑战！攀爬4000米死亡储罐塔，一失足成千古恨！',
      story: '警告！这是兴发集团最危险的区域！💀 储罐塔高达4000米，平台极小且不稳定，酸液喷射怪密布四周！风力区会把你吹到天上，然后快速坠落！💡提示：1️⃣ 平台很小，精准落地！2️⃣ 酸液喷射无处不在！3️⃣ 风力会把你吹很高，找好落点！4️⃣ 掉到底部酸液池=秒杀！5️⃣ 血包极少，珍惜每一滴血！',
      campaignMapData: {
        startPosition: { x: 300, y: 3850 },
        width: 2000,
        height: 4000,
        
        platforms: [
          // 底部起点
          { x: 150, y: 3900, width: 300, type: 'ground' },
          
          // ===== 第一层(3900-3200)：入门攀爬 =====
          { x: 600, y: 3800, width: 80 },
          { x: 300, y: 3700, width: 70 },
          { x: 800, y: 3600, width: 70 },
          { x: 450, y: 3500, width: 80 },
          { x: 1000, y: 3400, width: 70 },
          { x: 650, y: 3300, width: 70 },
          { x: 200, y: 3200, width: 100, type: 'ground' },
          
          // ===== 第二层(3200-2400)：酸液地狱 =====
          { x: 500, y: 3100, width: 60 },
          { x: 900, y: 3000, width: 60 },
          { x: 300, y: 2900, width: 60 },
          { x: 700, y: 2800, width: 60 },
          { x: 1100, y: 2700, width: 60 },
          { x: 500, y: 2600, width: 60 },
          { x: 900, y: 2500, width: 60 },
          { x: 1300, y: 2400, width: 100, type: 'ground' },
          
          // ===== 第三层(2400-1600)：风暴区 =====
          { x: 1000, y: 2300, width: 50 },
          { x: 600, y: 2200, width: 50 },
          { x: 200, y: 2100, width: 50 },
          { x: 800, y: 2000, width: 50 },
          { x: 400, y: 1900, width: 50 },
          { x: 1200, y: 1800, width: 50 },
          { x: 700, y: 1700, width: 50 },
          { x: 300, y: 1600, width: 100, type: 'ground' },
          
          // ===== 第四层(1600-800)：混合地狱 =====
          { x: 700, y: 1500, width: 45 },
          { x: 1100, y: 1400, width: 45 },
          { x: 500, y: 1300, width: 45 },
          { x: 900, y: 1200, width: 45 },
          { x: 300, y: 1100, width: 45 },
          { x: 1300, y: 1000, width: 45 },
          { x: 800, y: 900, width: 45 },
          { x: 1500, y: 800, width: 100, type: 'ground' },
          
          // ===== 第五层(800-0)：终极挑战 =====
          { x: 1200, y: 700, width: 40 },
          { x: 600, y: 600, width: 40 },
          { x: 1000, y: 500, width: 40 },
          { x: 400, y: 400, width: 40 },
          { x: 1400, y: 300, width: 40 },
          { x: 800, y: 200, width: 40 },
          { x: 200, y: 100, width: 40 },
          
          // 终点
          { x: 600, y: 50, width: 200, type: 'ground' }
        ],
        
        movingPlatforms: [
          // 第一层
          { startX: 400, endX: 700, startY: 3650, endY: 3650, width: 60, speed: 150 },
          // 第二层
          { startX: 600, endX: 600, startY: 3050, endY: 2750, width: 50, speed: 180 },
          { startX: 1000, endX: 1000, startY: 2850, endY: 2550, width: 50, speed: 200 },
          { startX: 400, endX: 800, startY: 2650, endY: 2650, width: 50, speed: 220 },
          // 第三层
          { startX: 500, endX: 900, startY: 2150, endY: 2150, width: 45, speed: 250 },
          { startX: 1000, endX: 1000, startY: 1950, endY: 1650, width: 45, speed: 200 },
          { startX: 200, endX: 600, startY: 1750, endY: 1750, width: 45, speed: 260 },
          // 第四层
          { startX: 900, endX: 900, startY: 1450, endY: 1150, width: 40, speed: 220 },
          { startX: 400, endX: 800, startY: 1250, endY: 1250, width: 40, speed: 280 },
          { startX: 1100, endX: 1100, startY: 1050, endY: 850, width: 40, speed: 240 },
          // 第五层
          { startX: 800, endX: 1200, startY: 650, endY: 650, width: 35, speed: 300 },
          { startX: 500, endX: 500, startY: 550, endY: 350, width: 35, speed: 260 },
          { startX: 1000, endX: 600, startY: 250, endY: 250, width: 35, speed: 320 },
          { startX: 300, endX: 700, startY: 120, endY: 120, width: 35, speed: 280 }
        ],
        
        enemies: [
          // 第一层
          { x: 100, y: 3750, type: 'acid_turret' },
          { x: 1100, y: 3650, type: 'acid_turret' },
          { x: 100, y: 3550, type: 'bat' },
          { x: 1200, y: 3450, type: 'acid_turret' },
          { x: 100, y: 3350, type: 'acid_turret' },
          // 第二层
          { x: 100, y: 3050, type: 'acid_turret' },
          { x: 1200, y: 2950, type: 'acid_turret' },
          { x: 100, y: 2850, type: 'acid_turret' },
          { x: 1300, y: 2750, type: 'acid_turret' },
          { x: 100, y: 2650, type: 'acid_turret' },
          { x: 1200, y: 2550, type: 'acid_turret' },
          { x: 600, y: 2900, type: 'bat' },
          { x: 800, y: 2700, type: 'bat' },
          // 第三层
          { x: 100, y: 2250, type: 'acid_turret' },
          { x: 1400, y: 2150, type: 'acid_turret' },
          { x: 100, y: 2050, type: 'acid_turret' },
          { x: 1400, y: 1950, type: 'acid_turret' },
          { x: 100, y: 1850, type: 'acid_turret' },
          { x: 1400, y: 1750, type: 'acid_turret' },
          { x: 500, y: 2100, type: 'robot' },
          { x: 900, y: 1900, type: 'bat' },
          // 第四层
          { x: 100, y: 1450, type: 'acid_turret' },
          { x: 1500, y: 1350, type: 'acid_turret' },
          { x: 100, y: 1250, type: 'acid_turret' },
          { x: 1500, y: 1150, type: 'acid_turret' },
          { x: 100, y: 1050, type: 'acid_turret' },
          { x: 1500, y: 950, type: 'acid_turret' },
          { x: 700, y: 1300, type: 'turret' },
          { x: 1100, y: 1100, type: 'robot' },
          // 第五层
          { x: 100, y: 650, type: 'acid_turret' },
          { x: 1600, y: 550, type: 'acid_turret' },
          { x: 100, y: 450, type: 'acid_turret' },
          { x: 1600, y: 350, type: 'acid_turret' },
          { x: 100, y: 250, type: 'acid_turret' },
          { x: 1600, y: 150, type: 'acid_turret' },
          { x: 900, y: 500, type: 'turret' },
          { x: 500, y: 300, type: 'robot' }
        ],
        
        chemicalZones: [
          // 底部酸液池（秒杀！）
          { x: 0, y: 3950, width: 2000, height: 100, type: 'acid', damage: 100, color: 0xff0000 },
          // 第一层酸液陷阱
          { x: 0, y: 3650, width: 100, height: 60, type: 'acid', damage: 35, color: 0xff4444 },
          { x: 1100, y: 3500, width: 100, height: 60, type: 'acid', damage: 35, color: 0xff4444 },
          // 第二层
          { x: 0, y: 2950, width: 100, height: 60, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 1200, y: 2750, width: 100, height: 60, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 0, y: 2550, width: 100, height: 60, type: 'acid', damage: 40, color: 0xff4444 },
          // 第三层
          { x: 0, y: 2150, width: 100, height: 60, type: 'acid', damage: 45, color: 0xff4444 },
          { x: 1400, y: 1950, width: 100, height: 60, type: 'acid', damage: 45, color: 0xff4444 },
          { x: 0, y: 1750, width: 100, height: 60, type: 'acid', damage: 45, color: 0xff4444 },
          // 第四层
          { x: 0, y: 1350, width: 100, height: 60, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 1500, y: 1150, width: 100, height: 60, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 0, y: 950, width: 100, height: 60, type: 'acid', damage: 50, color: 0xff4444 },
          // 第五层
          { x: 0, y: 550, width: 100, height: 60, type: 'acid', damage: 55, color: 0xff4444 },
          { x: 1600, y: 350, width: 100, height: 60, type: 'acid', damage: 55, color: 0xff4444 },
          { x: 0, y: 150, width: 100, height: 60, type: 'acid', damage: 55, color: 0xff4444 },
          // 毒气区
          { x: 0, y: 2800, width: 200, height: 400, type: 'poison', damage: 10, color: 0x9932cc },
          { x: 1300, y: 2600, width: 200, height: 400, type: 'poison', damage: 10, color: 0x9932cc },
          { x: 0, y: 2000, width: 200, height: 400, type: 'poison', damage: 12, color: 0x9932cc },
          { x: 1400, y: 1800, width: 200, height: 400, type: 'poison', damage: 12, color: 0x9932cc },
          { x: 0, y: 1200, width: 200, height: 400, type: 'poison', damage: 14, color: 0x9932cc },
          { x: 1500, y: 1000, width: 200, height: 400, type: 'poison', damage: 14, color: 0x9932cc },
          { x: 0, y: 400, width: 200, height: 400, type: 'poison', damage: 16, color: 0x9932cc },
          { x: 1600, y: 200, width: 200, height: 400, type: 'poison', damage: 16, color: 0x9932cc }
        ],
        
        windZones: [
          // 第一层
          { x: 850, y: 3500, width: 120, height: 500, direction: 'up', windForce: 12 },
          // 第二层
          { x: 350, y: 2700, width: 120, height: 600, direction: 'up', windForce: 14 },
          { x: 1050, y: 2500, width: 120, height: 500, direction: 'up', windForce: 14 },
          // 第三层（超强风！）
          { x: 650, y: 1900, width: 150, height: 700, direction: 'up', windForce: 16 },
          { x: 1150, y: 1700, width: 150, height: 600, direction: 'up', windForce: 16 },
          { x: 250, y: 1600, width: 120, height: 500, direction: 'up', windForce: 15 },
          // 第四层
          { x: 550, y: 1100, width: 150, height: 600, direction: 'up', windForce: 16 },
          { x: 1250, y: 900, width: 150, height: 500, direction: 'up', windForce: 16 },
          // 第五层（极限风力！）
          { x: 750, y: 400, width: 180, height: 700, direction: 'up', windForce: 18 },
          { x: 350, y: 200, width: 150, height: 500, direction: 'up', windForce: 17 },
          { x: 1150, y: 100, width: 150, height: 400, direction: 'up', windForce: 17 }
        ],
        
        explosionTraps: [
          // 第一层
          { x: 500, y: 3770, type: 'explosion', damage: 30, blastRadius: 90, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 900, y: 3570, type: 'explosion', damage: 30, blastRadius: 90, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 350, y: 3370, type: 'explosion', damage: 30, blastRadius: 90, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          // 第二层
          { x: 400, y: 3070, type: 'explosion', damage: 35, blastRadius: 100, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 800, y: 2870, type: 'explosion', damage: 35, blastRadius: 100, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 600, y: 2670, type: 'explosion', damage: 35, blastRadius: 100, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 1000, y: 2470, type: 'explosion', damage: 35, blastRadius: 100, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          // 第三层
          { x: 700, y: 2270, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 300, y: 2070, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 1100, y: 1870, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 500, y: 1670, type: 'explosion', damage: 40, blastRadius: 100, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          // 第四层
          { x: 800, y: 1470, type: 'explosion', damage: 45, blastRadius: 110, warningTime: 900, cooldownTime: 2000, pattern: 'periodic' },
          { x: 400, y: 1270, type: 'explosion', damage: 45, blastRadius: 110, warningTime: 900, cooldownTime: 2000, pattern: 'periodic' },
          { x: 1200, y: 1070, type: 'explosion', damage: 45, blastRadius: 110, warningTime: 900, cooldownTime: 2000, pattern: 'periodic' },
          { x: 600, y: 870, type: 'explosion', damage: 45, blastRadius: 110, warningTime: 900, cooldownTime: 2000, pattern: 'periodic' },
          // 第五层
          { x: 1000, y: 670, type: 'explosion', damage: 50, blastRadius: 120, warningTime: 800, cooldownTime: 1800, pattern: 'periodic' },
          { x: 500, y: 470, type: 'explosion', damage: 50, blastRadius: 120, warningTime: 800, cooldownTime: 1800, pattern: 'periodic' },
          { x: 1200, y: 270, type: 'explosion', damage: 50, blastRadius: 120, warningTime: 800, cooldownTime: 1800, pattern: 'periodic' },
          { x: 400, y: 70, type: 'explosion', damage: 50, blastRadius: 120, warningTime: 800, cooldownTime: 1800, pattern: 'periodic' }
        ],
        
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一层
          { x: 250, y: 3150, type: 'health_pack', value: 18 },
          { x: 300, y: 3150, type: 'health_pack', value: 18 },
          // 第二层
          { x: 800, y: 2750, type: 'health_pack', value: 20 },
          { x: 850, y: 2750, type: 'health_pack', value: 20 },
          // 第三层
          { x: 1350, y: 2350, type: 'health_pack', value: 22 },
          { x: 1400, y: 2350, type: 'health_pack', value: 22 },
          // 第四层
          { x: 600, y: 1900, type: 'health_pack', value: 22 },
          { x: 650, y: 1900, type: 'health_pack', value: 22 },
          // 第五层
          { x: 350, y: 1550, type: 'health_pack', value: 24 },
          { x: 400, y: 1550, type: 'health_pack', value: 24 },
          // 顶层
          { x: 1000, y: 750, type: 'health_pack', value: 26 },
          { x: 1050, y: 750, type: 'health_pack', value: 26 },
          // 额外血包
          { x: 500, y: 3350, type: 'health_pack', value: 18 },
          { x: 1100, y: 2950, type: 'health_pack', value: 20 },
          { x: 400, y: 2550, type: 'health_pack', value: 22 },
          { x: 900, y: 2100, type: 'health_pack', value: 22 },
          { x: 700, y: 1350, type: 'health_pack', value: 24 },
          { x: 500, y: 550, type: 'health_pack', value: 26 },
          // 冲刺星星
          { x: 550, y: 3450, type: 'dash_star', value: 50 },
          { x: 800, y: 2750, type: 'dash_star', value: 50 },
          { x: 500, y: 2050, type: 'dash_star', value: 50 },
          { x: 1000, y: 1350, type: 'dash_star', value: 50 },
          { x: 700, y: 550, type: 'dash_star', value: 50 },
          // 宝石
          { x: 700, y: 3550, type: 'gem', value: 40 },
          { x: 350, y: 3250, type: 'gem', value: 45 },
          { x: 600, y: 2850, type: 'gem', value: 50 },
          { x: 1000, y: 2650, type: 'gem', value: 55 },
          { x: 700, y: 2150, type: 'gem', value: 60 },
          { x: 300, y: 1850, type: 'gem', value: 65 },
          { x: 800, y: 1450, type: 'gem', value: 70 },
          { x: 1200, y: 1050, type: 'gem', value: 75 },
          { x: 900, y: 650, type: 'gem', value: 80 },
          { x: 500, y: 350, type: 'gem', value: 90 },
          { x: 700, y: 100, type: 'gem', value: 100 }
        ],
        
        goal: { x: 680, y: 20 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '征服4000米死亡储罐巨塔！' }
      ],
      questions: [
        {
          id: 'q9_3_1',
          type: 'choice',
          question: '【化工知识】化工储罐通常用什么材料制造？🏗️',
          options: ['木头', '不锈钢或特种合金', '塑料', '玻璃'],
          answer: '不锈钢或特种合金',
          difficulty: 2,
          subject: 'chemistry',
          explanation: '化工储罐需要耐腐蚀、耐高压，通常使用不锈钢或特种合金制造。'
        },
        {
          id: 'q9_3_2',
          type: 'choice',
          question: '【安全知识】化工储罐为什么要定期检查？🔍',
          options: ['为了好看', '防止腐蚀泄漏造成事故', '节省成本', '增加产量'],
          answer: '防止腐蚀泄漏造成事故',
          difficulty: 2,
          subject: 'safety',
          explanation: '储罐长期存储化学品会产生腐蚀，定期检查可以及早发现问题，防止泄漏事故。'
        }
      ],
      rewards: { xp: 550, coins: 280 }
    },

    // ========================================
    // 关卡4：风暴走廊极限挑战 🌬️💨🔥
    // 规模：18000 x 1500 超大地图
    // 玩法：极端风力 + 传送带 + 爆炸 + 酸液 + 移动平台
    // ========================================
    {
      id: 'level_9_4',
      name: '风暴走廊极限挑战',
      description: '⚠️终极挑战！穿越18公里的风暴走廊！',
      story: '来到兴发集团的风暴走廊！🌬️ 这里有最强劲的风力区域！向上风会把你吹到天上看不到地面，然后快速坠落！💡提示：1️⃣ 风力极强，会把你吹很高！2️⃣ 离开风区后会快速下落，找好落点！3️⃣ 传送带和爆炸陷阱无处不在！4️⃣ 酸液池伤害极高！5️⃣ 这是Boss前的最后考验！',
      campaignMapData: {
        startPosition: { x: 150, y: 1300 },
        width: 18000,
        height: 1500,
        
        platforms: [
          // 起点
          { x: 0, y: 1350, width: 300, type: 'ground' },
          
          // ===== 第一区(0-4500)：风暴入门 =====
          { x: 400, y: 1250, width: 100 },
          { x: 700, y: 1150, width: 80 },
          { x: 1000, y: 1050, width: 80 },
          { x: 1300, y: 950, width: 80 },
          { x: 1600, y: 850, width: 80 },
          { x: 1900, y: 750, width: 80 },
          { x: 2200, y: 650, width: 80 },
          { x: 2500, y: 550, width: 80 },
          { x: 2800, y: 450, width: 80 },
          { x: 3100, y: 550, width: 80 },
          { x: 3400, y: 650, width: 80 },
          { x: 3700, y: 750, width: 80 },
          { x: 4000, y: 850, width: 80 },
          { x: 4300, y: 1350, width: 200, type: 'ground' },
          
          // ===== 第二区(4500-9000)：传送带风暴 =====
          { x: 4600, y: 1350, width: 4400, conveyorSpeed: 220, conveyorDirection: 'left' },
          { x: 4900, y: 1200, width: 70 },
          { x: 5300, y: 1050, width: 70 },
          { x: 5700, y: 900, width: 70 },
          { x: 6100, y: 750, width: 70 },
          { x: 6500, y: 600, width: 70 },
          { x: 6900, y: 450, width: 70 },
          { x: 7300, y: 350, width: 70 },
          { x: 7700, y: 450, width: 70 },
          { x: 8100, y: 600, width: 70 },
          { x: 8500, y: 800, width: 70 },
          { x: 8900, y: 1350, width: 200, type: 'ground' },
          
          // ===== 第三区(9100-13500)：混合地狱 =====
          { x: 9200, y: 1350, width: 4300, conveyorSpeed: 280, conveyorDirection: 'left' },
          { x: 9500, y: 1150, width: 60 },
          { x: 9900, y: 950, width: 60 },
          { x: 10300, y: 750, width: 60 },
          { x: 10700, y: 550, width: 60 },
          { x: 11100, y: 400, width: 60 },
          { x: 11500, y: 300, width: 60 },
          { x: 11900, y: 400, width: 60 },
          { x: 12300, y: 550, width: 60 },
          { x: 12700, y: 750, width: 60 },
          { x: 13100, y: 1000, width: 60 },
          { x: 13400, y: 1350, width: 200, type: 'ground' },
          
          // ===== 第四区(13600-18000)：终极风暴 =====
          { x: 13700, y: 1350, width: 4000, conveyorSpeed: 340, conveyorDirection: 'left' },
          { x: 14000, y: 1100, width: 50 },
          { x: 14400, y: 850, width: 50 },
          { x: 14800, y: 600, width: 50 },
          { x: 15200, y: 400, width: 50 },
          { x: 15600, y: 250, width: 50 },
          { x: 16000, y: 150, width: 50 },
          { x: 16400, y: 250, width: 50 },
          { x: 16800, y: 400, width: 50 },
          { x: 17200, y: 600, width: 50 },
          
          // 终点
          { x: 17500, y: 1350, width: 500, type: 'ground' }
        ],
        
        movingPlatforms: [
          // 第一区
          { startX: 1500, endX: 1500, startY: 900, endY: 500, width: 60, speed: 180 },
          { startX: 2400, endX: 2400, startY: 600, endY: 300, width: 60, speed: 200 },
          { startX: 3300, endX: 3300, startY: 700, endY: 400, width: 60, speed: 180 },
          // 第二区
          { startX: 5500, endX: 5500, startY: 1000, endY: 600, width: 55, speed: 220 },
          { startX: 6300, endX: 6300, startY: 700, endY: 350, width: 55, speed: 240 },
          { startX: 7100, endX: 7100, startY: 500, endY: 250, width: 55, speed: 220 },
          { startX: 7900, endX: 7900, startY: 500, endY: 300, width: 55, speed: 240 },
          // 第三区
          { startX: 10100, endX: 10100, startY: 850, endY: 450, width: 50, speed: 260 },
          { startX: 10900, endX: 10900, startY: 500, endY: 250, width: 50, speed: 280 },
          { startX: 11700, endX: 11700, startY: 350, endY: 200, width: 50, speed: 260 },
          { startX: 12500, endX: 12500, startY: 600, endY: 350, width: 50, speed: 280 },
          // 第四区
          { startX: 14600, endX: 14600, startY: 750, endY: 350, width: 45, speed: 300 },
          { startX: 15400, endX: 15400, startY: 350, endY: 150, width: 45, speed: 320 },
          { startX: 16200, endX: 16200, startY: 200, endY: 100, width: 45, speed: 300 },
          { startX: 17000, endX: 17000, startY: 450, endY: 250, width: 45, speed: 320 }
        ],
        
        windZones: [
          // 第一区（强风）
          { x: 600, y: 400, width: 200, height: 1000, direction: 'up', windForce: 14 },
          { x: 1200, y: 300, width: 200, height: 1100, direction: 'up', windForce: 15 },
          { x: 1800, y: 200, width: 200, height: 1200, direction: 'up', windForce: 15 },
          { x: 2400, y: 150, width: 200, height: 1250, direction: 'up', windForce: 16 },
          { x: 3000, y: 200, width: 200, height: 1200, direction: 'up', windForce: 15 },
          { x: 3600, y: 300, width: 200, height: 1100, direction: 'up', windForce: 14 },
          // 第二区（超强风）
          { x: 5100, y: 200, width: 200, height: 1200, direction: 'up', windForce: 16 },
          { x: 5900, y: 150, width: 200, height: 1250, direction: 'up', windForce: 17 },
          { x: 6700, y: 100, width: 200, height: 1300, direction: 'up', windForce: 17 },
          { x: 7500, y: 100, width: 200, height: 1300, direction: 'up', windForce: 17 },
          { x: 8300, y: 150, width: 200, height: 1250, direction: 'up', windForce: 16 },
          // 第三区（极强风）
          { x: 9700, y: 100, width: 200, height: 1300, direction: 'up', windForce: 17 },
          { x: 10500, y: 50, width: 200, height: 1350, direction: 'up', windForce: 18 },
          { x: 11300, y: 50, width: 200, height: 1350, direction: 'up', windForce: 18 },
          { x: 12100, y: 50, width: 200, height: 1350, direction: 'up', windForce: 18 },
          { x: 12900, y: 100, width: 200, height: 1300, direction: 'up', windForce: 17 },
          // 第四区（终极风暴！）
          { x: 14200, y: 50, width: 250, height: 1350, direction: 'up', windForce: 18 },
          { x: 15000, y: 0, width: 250, height: 1400, direction: 'up', windForce: 19 },
          { x: 15800, y: 0, width: 250, height: 1400, direction: 'up', windForce: 19 },
          { x: 16600, y: 0, width: 250, height: 1400, direction: 'up', windForce: 19 },
          { x: 17200, y: 50, width: 200, height: 1350, direction: 'up', windForce: 18 }
        ],
        
        explosionTraps: [
          // 第一区
          { x: 500, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 900, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 1400, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 2000, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 2600, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 3200, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          { x: 3800, y: 1320, type: 'explosion', damage: 30, blastRadius: 100, warningTime: 1200, cooldownTime: 2800, pattern: 'periodic' },
          // 第二区
          { x: 4800, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 5200, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 5600, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 6000, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 6400, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 6800, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 7200, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 7600, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8000, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8400, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          { x: 8800, y: 1320, type: 'explosion', damage: 35, blastRadius: 110, warningTime: 1100, cooldownTime: 2500, pattern: 'periodic' },
          // 第三区
          { x: 9400, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 9800, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 10200, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 10600, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11000, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11400, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 11800, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 12200, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 12600, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          { x: 13000, y: 1320, type: 'explosion', damage: 40, blastRadius: 120, warningTime: 1000, cooldownTime: 2200, pattern: 'periodic' },
          // 第四区
          { x: 13900, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 14300, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 14700, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 15100, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 15500, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 15900, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 16300, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 16700, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' },
          { x: 17100, y: 1320, type: 'explosion', damage: 45, blastRadius: 100, warningTime: 850, cooldownTime: 1800, pattern: 'periodic' }
        ],
        
        chemicalZones: [
          // 第一区酸液
          { x: 800, y: 1370, width: 200, height: 150, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 1700, y: 1370, width: 200, height: 150, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 2600, y: 1370, width: 200, height: 150, type: 'acid', damage: 40, color: 0xff4444 },
          { x: 3500, y: 1370, width: 200, height: 150, type: 'acid', damage: 40, color: 0xff4444 },
          // 第二区酸液
          { x: 5000, y: 1370, width: 250, height: 150, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 5800, y: 1370, width: 250, height: 150, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 6600, y: 1370, width: 250, height: 150, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 7400, y: 1370, width: 250, height: 150, type: 'acid', damage: 50, color: 0xff4444 },
          { x: 8200, y: 1370, width: 250, height: 150, type: 'acid', damage: 50, color: 0xff4444 },
          // 第三区酸液
          { x: 9600, y: 1370, width: 300, height: 150, type: 'acid', damage: 60, color: 0xff4444 },
          { x: 10400, y: 1370, width: 300, height: 150, type: 'acid', damage: 60, color: 0xff4444 },
          { x: 11200, y: 1370, width: 300, height: 150, type: 'acid', damage: 60, color: 0xff4444 },
          { x: 12000, y: 1370, width: 300, height: 150, type: 'acid', damage: 60, color: 0xff4444 },
          { x: 12800, y: 1370, width: 300, height: 150, type: 'acid', damage: 60, color: 0xff4444 },
          // 第四区酸液（致命）
          { x: 14100, y: 1370, width: 350, height: 150, type: 'acid', damage: 80, color: 0xff0000 },
          { x: 14900, y: 1370, width: 350, height: 150, type: 'acid', damage: 80, color: 0xff0000 },
          { x: 15700, y: 1370, width: 350, height: 150, type: 'acid', damage: 80, color: 0xff0000 },
          { x: 16500, y: 1370, width: 350, height: 150, type: 'acid', damage: 80, color: 0xff0000 },
          // 毒气区（缩小范围，降低伤害，增加安全通道）
          { x: 1000, y: 200, width: 600, height: 300, type: 'poison', damage: 5, color: 0x9932cc },
          { x: 2800, y: 150, width: 600, height: 350, type: 'poison', damage: 5, color: 0x9932cc },
          { x: 5400, y: 100, width: 700, height: 400, type: 'poison', damage: 6, color: 0x9932cc },
          { x: 7200, y: 100, width: 700, height: 400, type: 'poison', damage: 6, color: 0x9932cc },
          { x: 10000, y: 50, width: 800, height: 400, type: 'poison', damage: 7, color: 0x9932cc },
          { x: 12400, y: 50, width: 700, height: 400, type: 'poison', damage: 7, color: 0x9932cc },
          // 🔥 第四区毒气区大幅缩小，降低伤害，留出安全通道
          { x: 14800, y: 50, width: 500, height: 350, type: 'poison', damage: 8, color: 0x9932cc },
          { x: 16600, y: 50, width: 400, height: 350, type: 'poison', damage: 8, color: 0x9932cc }
        ],
        
        enemies: [
          // 第一区
          { x: 500, y: 1200, type: 'bat' },
          { x: 1100, y: 1000, type: 'acid_turret' },
          { x: 1700, y: 800, type: 'bat' },
          { x: 2300, y: 600, type: 'acid_turret' },
          { x: 2900, y: 500, type: 'bat' },
          { x: 3500, y: 700, type: 'acid_turret' },
          { x: 4100, y: 800, type: 'robot' },
          // 第二区
          { x: 5000, y: 1150, type: 'acid_turret' },
          { x: 5600, y: 950, type: 'bat' },
          { x: 6200, y: 800, type: 'acid_turret' },
          { x: 6800, y: 650, type: 'bat' },
          { x: 7400, y: 400, type: 'acid_turret' },
          { x: 8000, y: 500, type: 'turret' },
          { x: 8600, y: 750, type: 'robot' },
          // 第三区
          { x: 9600, y: 1100, type: 'acid_turret' },
          { x: 10200, y: 900, type: 'acid_turret' },
          { x: 10800, y: 700, type: 'turret' },
          { x: 11400, y: 450, type: 'acid_turret' },
          { x: 12000, y: 350, type: 'acid_turret' },
          { x: 12600, y: 500, type: 'robot' },
          { x: 13200, y: 950, type: 'turret' },
          // 第四区
          { x: 14100, y: 1050, type: 'acid_turret' },
          { x: 14700, y: 800, type: 'acid_turret' },
          { x: 15300, y: 550, type: 'turret' },
          { x: 15900, y: 350, type: 'acid_turret' },
          { x: 16500, y: 200, type: 'acid_turret' },
          { x: 17100, y: 350, type: 'robot' }
        ],
        
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - 每个位置附近都有2个血包
          // 第一区
          { x: 2200, y: 1000, type: 'health_pack', value: 20 },
          { x: 2250, y: 1000, type: 'health_pack', value: 20 },
          // 第一区后段
          { x: 4350, y: 1300, type: 'health_pack', value: 22 },
          { x: 4400, y: 1300, type: 'health_pack', value: 22 },
          // 第二区
          { x: 6500, y: 900, type: 'health_pack', value: 22 },
          { x: 6550, y: 900, type: 'health_pack', value: 22 },
          // 第二区后段
          { x: 8950, y: 1300, type: 'health_pack', value: 24 },
          { x: 9000, y: 1300, type: 'health_pack', value: 24 },
          // 第三区
          { x: 11500, y: 800, type: 'health_pack', value: 24 },
          { x: 11550, y: 800, type: 'health_pack', value: 24 },
          // 第三区后段
          { x: 13450, y: 1300, type: 'health_pack', value: 26 },
          { x: 13500, y: 1300, type: 'health_pack', value: 26 },
          // 额外血包
          { x: 3200, y: 1100, type: 'health_pack', value: 20 },
          { x: 5400, y: 1000, type: 'health_pack', value: 22 },
          { x: 7700, y: 1200, type: 'health_pack', value: 22 },
          { x: 10200, y: 1000, type: 'health_pack', value: 24 },
          { x: 12500, y: 1100, type: 'health_pack', value: 24 },
          { x: 15500, y: 1000, type: 'health_pack', value: 28 },
          // 冲刺星星
          { x: 1200, y: 900, type: 'dash_star', value: 50 },
          { x: 2500, y: 500, type: 'dash_star', value: 50 },
          { x: 3800, y: 700, type: 'dash_star', value: 50 },
          { x: 5800, y: 850, type: 'dash_star', value: 50 },
          { x: 7000, y: 400, type: 'dash_star', value: 50 },
          { x: 8600, y: 750, type: 'dash_star', value: 50 },
          { x: 10400, y: 700, type: 'dash_star', value: 50 },
          { x: 11600, y: 350, type: 'dash_star', value: 50 },
          { x: 13000, y: 950, type: 'dash_star', value: 50 },
          { x: 15000, y: 350, type: 'dash_star', value: 50 },
          { x: 16200, y: 200, type: 'dash_star', value: 50 },
          // 宝石
          { x: 800, y: 1100, type: 'gem', value: 35 },
          { x: 1500, y: 800, type: 'gem', value: 40 },
          { x: 2200, y: 600, type: 'gem', value: 45 },
          { x: 3000, y: 500, type: 'gem', value: 50 },
          { x: 5200, y: 1000, type: 'gem', value: 50 },
          { x: 6400, y: 700, type: 'gem', value: 55 },
          { x: 7600, y: 400, type: 'gem', value: 60 },
          { x: 9800, y: 900, type: 'gem', value: 60 },
          { x: 11000, y: 500, type: 'gem', value: 65 },
          { x: 12400, y: 500, type: 'gem', value: 70 },
          { x: 14500, y: 750, type: 'gem', value: 75 },
          { x: 15700, y: 300, type: 'gem', value: 80 },
          { x: 16900, y: 350, type: 'gem', value: 90 }
        ],
        
        goal: { x: 17700, y: 1320 }
      },
      objectives: [
        { type: 'reach', target: 'goal', description: '穿越18公里风暴走廊' }
      ],
      questions: [
        {
          id: 'q9_4_1',
          type: 'choice',
          question: '【物理知识】风力对物体的作用力与什么成正比？🌬️',
          options: ['物体颜色', '风速的平方', '物体温度', '时间'],
          answer: '风速的平方',
          difficulty: 2,
          subject: 'physics',
          explanation: '风力与风速的平方成正比！'
        },
        {
          id: 'q9_4_2',
          type: 'choice',
          question: '【工业知识】化工厂的储罐通常用什么材料制造？🏭',
          options: ['木头', '纸板', '钢铁或特种合金', '塑料'],
          answer: '钢铁或特种合金',
          difficulty: 2,
          subject: 'chemistry',
          explanation: '化工储罐需要承受高压、耐腐蚀，通常使用钢铁或特种合金制造。'
        }
      ],
      rewards: { xp: 600, coins: 300 }
    },

    // ========================================
    // 关卡5：双Boss战 - 酸液博士 & 气体博士 ⚗️💨
    // 🔥 必须击败两个Boss才算胜利
    // ========================================
    {
      id: 'level_9_5',
      name: 'Boss：酸液博士 & 气体博士',
      description: '击败双Boss！必须同时击败两位疯狂科学家才能获胜！',
      story: '终于来到兴发集团的核心实验室！⚗️💨 两位疯狂的科学家正在等待你：酸液博士会在地面创造酸液池，气体博士会在空中释放毒气云！当两人同时攻击时，会触发"化学反应"造成大范围伤害！💡提示：1️⃣ 躲避地面酸液和空中毒气 2️⃣ 必须击败两个Boss才能获胜！3️⃣ 当一个Boss被击败后，另一个会狂暴！4️⃣ 血包数量有限，谨慎使用！',
      campaignMapData: {
        startPosition: { x: 150, y: 1100 },
        width: 2800,
        height: 1400,
        
        platforms: [
          { x: 0, y: 1350, width: 2800, type: 'ground' },
          { x: 100, y: 1250, width: 150 },
          { x: 300, y: 1150, width: 120 },
          { x: 150, y: 1000, width: 120 },
          { x: 350, y: 900, width: 120 },
          { x: 550, y: 1100, width: 200 },
          { x: 800, y: 1000, width: 250 },
          { x: 1100, y: 1000, width: 250 },
          { x: 1400, y: 1000, width: 250 },
          { x: 1700, y: 1100, width: 200 },
          { x: 1950, y: 1250, width: 150 },
          { x: 2150, y: 1150, width: 120 },
          { x: 2350, y: 1000, width: 120 },
          { x: 2550, y: 900, width: 120 },
          { x: 250, y: 750, width: 120 },
          { x: 480, y: 650, width: 150 },
          { x: 700, y: 600, width: 180 },
          { x: 950, y: 550, width: 200 },
          { x: 1200, y: 550, width: 200 },
          { x: 1450, y: 600, width: 180 },
          { x: 1670, y: 650, width: 150 },
          { x: 1900, y: 750, width: 120 },
          { x: 850, y: 450, width: 100 },
          { x: 1050, y: 400, width: 120 },
          { x: 1250, y: 450, width: 100 }
        ],
        
        movingPlatforms: [
          { startX: 200, endX: 200, startY: 1050, endY: 800, width: 80, speed: 70 },
          { startX: 500, endX: 700, startY: 850, endY: 850, width: 80, speed: 90 },
          { startX: 1550, endX: 1750, startY: 850, endY: 850, width: 80, speed: 90 },
          { startX: 2250, endX: 2250, startY: 1050, endY: 800, width: 80, speed: 70 },
          { startX: 950, endX: 1200, startY: 500, endY: 500, width: 70, speed: 100 }
        ],
        
        enemies: [
          { x: 750, y: 900, type: 'boss' },
          { x: 1550, y: 900, type: 'boss' }
        ],
        
        collectibles: [
          // 🔥🔥🔥 血包大幅增加 - Boss战需要更多血包
          // 左侧区域
          { x: 180, y: 1200, type: 'health_pack', value: 25 },
          { x: 230, y: 1200, type: 'health_pack', value: 25 },
          // 右侧区域
          { x: 2400, y: 1100, type: 'health_pack', value: 25 },
          { x: 2350, y: 1100, type: 'health_pack', value: 25 },
          // 中央高台
          { x: 1125, y: 350, type: 'health_pack', value: 20 },
          { x: 1175, y: 350, type: 'health_pack', value: 20 },
          // 左侧平台
          { x: 600, y: 1050, type: 'health_pack', value: 18 },
          { x: 650, y: 1050, type: 'health_pack', value: 18 },
          // 右侧平台
          { x: 1750, y: 1050, type: 'health_pack', value: 18 },
          { x: 1700, y: 1050, type: 'health_pack', value: 18 },
          // 额外血包
          { x: 400, y: 1200, type: 'health_pack', value: 22 },
          { x: 2200, y: 1200, type: 'health_pack', value: 22 },
          { x: 900, y: 500, type: 'health_pack', value: 20 },
          { x: 1350, y: 500, type: 'health_pack', value: 20 },
          { x: 1125, y: 1100, type: 'health_pack', value: 18 },
          { x: 400, y: 1100, type: 'gem', value: 30 },
          { x: 800, y: 550, type: 'gem', value: 50 },
          { x: 1125, y: 500, type: 'gem', value: 70 },
          { x: 1450, y: 550, type: 'gem', value: 50 },
          { x: 2000, y: 1200, type: 'gem', value: 30 },
          { x: 350, y: 850, type: 'dash_star', value: 50 },
          { x: 2100, y: 850, type: 'dash_star', value: 50 },
          { x: 1125, y: 950, type: 'dash_star', value: 50 },
          { x: 600, y: 1050, type: 'dash_star', value: 50 },
          { x: 1750, y: 1050, type: 'dash_star', value: 50 }
        ],
        
        goal: { x: 1125, y: 900 }
      },
      
      bossConfig: {
        type: 'dual',
        requireBothDefeated: true,
        
        phase1Boss: {
          name: '酸液博士',
          hp: 450,
          attacks: ['acid_pool', 'acid_spray'],
          attackInterval: 2200,
          moveSpeed: 110,
          specialAbilities: {
            acidPool: { damage: 18, duration: 4500, radius: 130, cooldown: 5500, color: 0xff4444 },
            acidSpray: { damage: 28, range: 380, cooldown: 4500, color: 0x00ff00 }
          }
        },
        
        phase2Boss: {
          name: '气体博士',
          hp: 450,
          attacks: ['poison_cloud', 'gas_burst'],
          attackInterval: 2200,
          moveSpeed: 120,
          specialAbilities: {
            poisonCloud: { damage: 10, duration: 5500, radius: 160, cooldown: 6500, color: 0x9932cc },
            gasBurst: { damage: 22, range: 320, cooldown: 4000, color: 0x9932cc }
          }
        },
        
        combinedAttack: {
          name: '化学反应',
          triggerCondition: 'both_alive',
          damage: 45,
          areaSize: { width: 450, height: 350 },
          cooldown: 12000,
          color: 0xff00ff
        },
        
        enrageOnSingleDefeat: true,
        enrageMultiplier: 1.6,
        defeatCondition: 'combat',
        
        phases: [
          { hp: 900, attacks: ['acid_pool', 'poison_cloud'], attackInterval: 2200, moveSpeed: 110, summonMinions: false },
          { hp: 600, attacks: ['acid_pool', 'acid_spray', 'poison_cloud', 'gas_burst'], attackInterval: 1800, moveSpeed: 130, summonMinions: false },
          { hp: 300, attacks: ['acid_pool', 'acid_spray', 'poison_cloud', 'gas_burst', 'chemical_reaction'], attackInterval: 1400, moveSpeed: 150, summonMinions: true }
        ]
      },
      
      objectives: [
        { type: 'defeat', target: 'boss1', description: '击败酸液博士' },
        { type: 'defeat', target: 'boss2', description: '击败气体博士' }
      ],
      questions: [
        {
          id: 'q9_5_1',
          type: 'choice',
          question: '【化学知识】酸和碱混合会发生什么反应？⚗️',
          options: ['爆炸', '中和反应生成盐和水', '变成黄金', '什么都不发生'],
          answer: '中和反应生成盐和水',
          difficulty: 2,
          subject: 'chemistry',
          explanation: '酸+碱=盐+水，这就是中和反应！'
        },
        {
          id: 'q9_5_2',
          type: 'choice',
          question: '【安全知识】遇到有毒气体泄漏时，应该往哪个方向逃跑？💨',
          options: ['顺风方向', '逆风方向', '原地不动', '往下跑'],
          answer: '逆风方向',
          difficulty: 2,
          subject: 'safety',
          explanation: '有毒气体会随风飘散，所以要往逆风方向逃跑。'
        },
        {
          id: 'q9_5_3',
          type: 'choice',
          question: '【化工知识】兴发集团是中国哪个行业的龙头企业？🏭',
          options: ['钢铁行业', '磷化工行业', '汽车行业', '食品行业'],
          answer: '磷化工行业',
          difficulty: 1,
          subject: 'general',
          explanation: '兴发集团是中国磷化工行业的龙头企业，位于宜昌猇亭。'
        }
      ],
      rewards: { xp: 800, coins: 400, skills: ['chemical_shield'] }
    }
  ],
  unlockRequirement: 'campaign_8',
  rewards: { xp: 2800, coins: 1400, skills: ['chemical_shield'], title: '化工大师' }
};


// Boss技能配置
export const acidBossSkills = {
  acidPool: { damage: 18, duration: 4500, radius: 130, cooldown: 5500, color: 0xff4444 },
  acidSpray: { damage: 28, range: 380, cooldown: 4500, color: 0x00ff00 }
};

export const gasBossSkills = {
  poisonCloud: { damage: 10, duration: 5500, radius: 160, cooldown: 6500, color: 0x9932cc },
  gasBurst: { damage: 22, range: 320, cooldown: 4000, color: 0x9932cc }
};

export const combinedAttackConfig = {
  name: '化学反应',
  damage: 45,
  areaSize: { width: 450, height: 350 },
  cooldown: 12000,
  color: 0xff00ff,
  warningTime: 2000
};
