// 🔥🔥🔥 高级战役配置（战役7-10）🔥🔥🔥
// 战役7：工业园区突破 - 激光陷阱 + 时间减速
// 战役8：量子实验室 - 传送门 + 化学反应 + 重力翻转
// 战役9：兴发集团化工冒险 - 传送带 + 爆炸陷阱 + 污染区域 + 风力区域 + 双Boss
// 战役10：终极挑战 - 所有技能综合运用

import { Campaign } from './campaigns';
import { campaign8 } from './campaign-8-quantum';
import { campaign9 } from './campaign-9-xingfa';
import { campaign10 } from './campaign-10-yichangdong';
import { campaign11 } from './campaign-11-huanmen';
import { campaign12 } from './campaign-12-zhuimen';
import { campaign13 } from './campaign-13-jingmen';
import { campaign14 } from './campaign-14-jiepai';
import { campaign15 } from './campaign-15-gongfang';
import { campaign16 } from './campaign-16-zhongmen';

export const advancedCampaigns: Campaign[] = [
  // ========================================
  // 战役7：工业园区突破 🏭
  // ========================================
  {
    id: 'campaign_7',
    name: '工业园区突破',
    description: '在猇亭工业园突破激光防御，掌握时间减速技能',
    location: '猇亭工业园',
    theme: '工业科技',
    story: '猇亭工业园是宜昌高科技产业聚集地，但园区的AI防御系统突然失控！激光陷阱、机械臂、传送带...你需要利用时间减速区域，突破重重机关，找出失控的原因。',
    levels: [
      // 关卡1：激光电梯挑战 🔴⚡
      {
        id: 'level_7_1',
        name: '激光电梯挑战',
        description: '乘坐移动平台，穿越激光墙的缺口！',
        story: '工业园区的激光防御系统启动了！巨大的激光墙不断扫描，只有在缺口出现时才能通过。利用上下移动的电梯平台，把握时机跳跃！💡提示：观察激光墙的开关规律！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 5200,  // 优化后的地图宽度
          height: 1200,
          
          platforms: [
            // 移除底部长平台，只保留起点
            { x: 50, y: 1080, width: 200 },
            
            // 终点平台
            { x: 5100, y: 1080, width: 150 }
          ],
          
          // 🔥 核心玩法：上下移动的小平台（优化后减少数量，提升性能）
          autoMovingPlatforms: [
            // 起点区域
            { startX: 300, y: 1050, endX: 300, endY: 750, width: 100, speed: 1.5 },
            { startX: 500, y: 950, endX: 500, endY: 650, width: 100, speed: 1.6 },
            { startX: 700, y: 1000, endX: 700, endY: 700, width: 100, speed: 1.7 },
            // 第1道激光墙后
            { startX: 1000, y: 1050, endX: 1000, endY: 750, width: 100, speed: 1.6 },
            { startX: 1200, y: 900, endX: 1200, endY: 600, width: 100, speed: 1.7 },
            { startX: 1400, y: 1000, endX: 1400, endY: 700, width: 100, speed: 1.5 },
            // 第2道激光墙后
            { startX: 1900, y: 950, endX: 1900, endY: 650, width: 100, speed: 1.8 },
            { startX: 2100, y: 1050, endX: 2100, endY: 750, width: 100, speed: 1.7 },
            { startX: 2300, y: 900, endX: 2300, endY: 600, width: 100, speed: 1.6 },
            // 第3道激光墙后
            { startX: 2800, y: 1000, endX: 2800, endY: 700, width: 100, speed: 1.9 },
            { startX: 3000, y: 950, endX: 3000, endY: 650, width: 100, speed: 1.8 },
            { startX: 3200, y: 1050, endX: 3200, endY: 750, width: 100, speed: 1.7 },
            // 第4道激光墙后
            { startX: 3700, y: 900, endX: 3700, endY: 600, width: 100, speed: 2.0 },
            { startX: 3900, y: 1000, endX: 3900, endY: 700, width: 100, speed: 1.9 },
            { startX: 4100, y: 950, endX: 4100, endY: 650, width: 100, speed: 1.8 },
            // 第5道激光墙后
            { startX: 4600, y: 1050, endX: 4600, endY: 750, width: 100, speed: 2.0 },
            { startX: 4800, y: 900, endX: 4800, endY: 600, width: 100, speed: 1.9 },
            { startX: 5000, y: 1000, endX: 5000, endY: 700, width: 100, speed: 1.8 }
          ],
          
          // 🔥 创新玩法：激光墙（优化后减少数量）
          traps: [
            // 第1道激光墙（x: 800，缺口在 y: 800-920）
            { x: 800, y: 100, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 200, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 800, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 800, y: 1140, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第2道激光墙（x: 1700，缺口在 y: 700-820）
            { x: 1700, y: 100, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 200, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 700-820
            { x: 1700, y: 840, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1700, y: 1140, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第3道激光墙（x: 2600，缺口在 y: 800-920）
            { x: 2600, y: 100, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 200, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 2600, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2600, y: 1140, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第4道激光墙（x: 3500，缺口在 y: 700-820）
            { x: 3500, y: 100, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 200, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 700-820
            { x: 3500, y: 840, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3500, y: 1140, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第5道激光墙（x: 4400，缺口在 y: 800-920）
            { x: 4400, y: 100, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 200, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 4400, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 1140, type: 'electric', damage: 25, pattern: 'periodic' }
          ],
          
          // 🔥 敌人（优化后减少数量）
          enemies: [
            { x: 500, y: 850, type: 'bat' },
            { x: 1250, y: 800, type: 'bat' },
            { x: 2050, y: 850, type: 'bat' },
            { x: 2900, y: 800, type: 'bat' },
            { x: 3800, y: 850, type: 'bat' },
            { x: 4650, y: 800, type: 'bat' }
          ],
          
          collectibles: [
            { x: 400, y: 900, type: 'coin', value: 10 },
            { x: 1150, y: 800, type: 'gem', value: 30 },
            { x: 2000, y: 850, type: 'gem', value: 30 },
            { x: 2850, y: 800, type: 'gem', value: 30 },
            { x: 3750, y: 850, type: 'gem', value: 50 },
            { x: 4700, y: 800, type: 'gem', value: 50 }
          ],
          
          goal: { x: 5050, y: 1050 }
        },
        objectives: [
          { type: 'reach', target: 'goal', description: '到达终点' }
        ],
        questions: [
          { 
            id: 'q7_1_1', 
            type: 'choice', 
            question: '【工业知识】激光陷阱的工作原理是？\n💡提示：激光是一种特殊的光', 
            options: ['光电感应', '热感应', '声波感应', '磁感应'], 
            answer: '光电感应', 
            difficulty: 2, 
            subject: 'logic',
            explanation: '激光陷阱利用光电感应原理：当激光束被遮挡时，光电传感器检测到光强变化，触发警报！这就是为什么你不能碰到激光。'
          },
          { 
            id: 'q7_1_2', 
            type: 'choice', 
            question: '【趣味问答】程序员遇到激光陷阱会？😂', 
            options: ['写代码破解', '直接冲过去debug', '利用减速区慢慢走', '回家重启人生'], 
            answer: '利用减速区慢慢走', 
            difficulty: 1, 
            subject: 'general',
            explanation: '聪明的程序员知道：有bug就要找解决方案！时间减速区就是你的"调试工具"，慢慢走才能避免"运行时错误"（被激光打）😄'
          }
        ],
        rewards: { xp: 200, coins: 100 }
      },
      
      // 关卡2：激光迷宫跑酷 🏃‍♂️⚡
      {
        id: 'level_7_2',
        name: '激光迷宫跑酷',
        description: '在狭窄的通道中快速奔跑，躲避激光网格！',
        story: '警报！激光防御系统进入"迷宫模式"！整个车间变成了激光网格，你需要在狭窄的通道中快速奔跑。上下左右都是激光，一不小心就会被击中！💡提示：保持冷静，观察激光的闪烁规律，找到安全通道！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 4500,
          height: 1200,
          
          platforms: [
            // 🔥 起点平台
            { x: 50, y: 1080, width: 200 },
            
            // 🔥 第1段：固定平台区域
            { x: 350, y: 1000, width: 120 },
            { x: 520, y: 950, width: 120 },
            { x: 690, y: 900, width: 120 },
            
            // 🔥 第2段：移动平台区域（这里没有固定平台）
            // （移动平台在autoMovingPlatforms中定义）
            
            // 🔥 第3段：固定平台区域
            { x: 1500, y: 950, width: 120 },
            { x: 1670, y: 900, width: 120 },
            { x: 1840, y: 950, width: 120 },
            
            // 🔥 第4段：移动平台区域（这里没有固定平台）
            
            // 🔥 第5段：固定平台区域
            { x: 2650, y: 1000, width: 120 },
            { x: 2820, y: 950, width: 120 },
            { x: 2990, y: 900, width: 120 },
            
            // 🔥 第6段：移动平台区域（这里没有固定平台）
            
            // 🔥 第7段：固定平台区域
            { x: 3800, y: 950, width: 120 },
            { x: 3970, y: 900, width: 120 },
            { x: 4140, y: 950, width: 120 },
            
            // 终点平台
            { x: 4350, y: 1000, width: 150 }
          ],
          
          // 🔥 创新：上下移动的平台（与固定平台交替出现）
          autoMovingPlatforms: [
            // 第2段：移动平台区域（x: 850-1400）
            { startX: 900, y: 1050, endX: 900, endY: 850, width: 100, speed: 1.5 },
            { startX: 1050, y: 950, endX: 1050, endY: 750, width: 100, speed: 1.6 },
            { startX: 1200, y: 1000, endX: 1200, endY: 800, width: 100, speed: 1.7 },
            { startX: 1350, y: 1050, endX: 1350, endY: 850, width: 100, speed: 1.6 },
            
            // 第4段：移动平台区域（x: 2000-2550）
            { startX: 2050, y: 1000, endX: 2050, endY: 800, width: 100, speed: 1.7 },
            { startX: 2200, y: 1050, endX: 2200, endY: 850, width: 100, speed: 1.8 },
            { startX: 2350, y: 950, endX: 2350, endY: 750, width: 100, speed: 1.6 },
            { startX: 2500, y: 1000, endX: 2500, endY: 800, width: 100, speed: 1.7 },
            
            // 第6段：移动平台区域（x: 3150-3700）
            { startX: 3200, y: 1050, endX: 3200, endY: 850, width: 100, speed: 1.8 },
            { startX: 3350, y: 1000, endX: 3350, endY: 800, width: 100, speed: 1.9 },
            { startX: 3500, y: 950, endX: 3500, endY: 750, width: 100, speed: 1.7 },
            { startX: 3650, y: 1000, endX: 3650, endY: 800, width: 100, speed: 1.8 }
          ],
          
          // 🔥 激光墙（在移动平台区域，增加难度）
          traps: [
            // 第2段移动平台区域的激光墙
            { x: 1100, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1100, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1100, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1100, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1100, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 1100, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1100, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第4段移动平台区域的激光墙
            { x: 2250, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2250, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2250, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2250, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2250, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 2250, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2250, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第6段移动平台区域的激光墙
            { x: 3400, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3400, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3400, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3400, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3400, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 3400, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3400, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' }
          ],
          
          enemies: [
            { x: 520, y: 920, type: 'bat' },
            { x: 1200, y: 970, type: 'bat' },
            { x: 1670, y: 870, type: 'bat' },
            { x: 2350, y: 920, type: 'bat' },
            { x: 2820, y: 920, type: 'bat' },
            { x: 3500, y: 920, type: 'bat' }
          ],
          
          collectibles: [
            { x: 520, y: 900, type: 'coin', value: 10 },
            { x: 1200, y: 850, type: 'gem', value: 30 },
            { x: 1670, y: 850, type: 'gem', value: 30 },
            { x: 2350, y: 800, type: 'gem', value: 50 },
            { x: 2820, y: 900, type: 'gem', value: 30 },
            { x: 3500, y: 800, type: 'gem', value: 50 }
          ],
          
          goal: { x: 4400, y: 1050 }
        },
        objectives: [
          { type: 'reach', target: 'goal', description: '到达终点' }
        ],
        questions: [
          { 
            id: 'q7_2_1', 
            type: 'choice', 
            question: '【跑酷技巧】在激光迷宫中，什么是最重要的？', 
            options: ['速度越快越好', '观察激光规律再行动', '闭着眼睛冲', '站着不动'], 
            answer: '观察激光规律再行动', 
            difficulty: 2, 
            subject: 'general',
            explanation: '跑酷不是盲目冲刺！就像写代码前要先理解需求一样，通过激光迷宫前要先观察激光的闪烁规律，找到安全的时机和路线。欲速则不达！'
          },
          { 
            id: 'q7_2_2', 
            type: 'choice', 
            question: '【空间思维】多层平台系统最考验什么能力？', 
            options: ['跑得快', '跳得高', '空间感和路线规划', '运气好'], 
            answer: '空间感和路线规划', 
            difficulty: 2, 
            subject: 'general',
            explanation: '在三层平台间跳跃，需要良好的空间感和路线规划能力！这就像程序设计中的"架构思维"——要从整体把握系统结构，规划最优路径。上中下三层就像代码的不同模块，要合理调度才能高效通关！'
          }
        ],
        rewards: { xp: 250, coins: 120 }
      },
      
      // 关卡3：激光交叉火力 🔥⚡
      {
        id: 'level_7_3',
        name: '激光交叉火力',
        description: '同时躲避垂直和水平激光的交叉攻击！',
        story: '警报升级！工业园启动了"交叉防御模式"！垂直激光墙和水平激光网同时启动，形成立体防御网。你需要在上下移动的平台上，同时躲避两个方向的激光！💡提示：这是7-1和7-2的终极结合，需要精确的时机把握！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 5000,
          height: 1200,
          
          platforms: [
            // 起点
            { x: 50, y: 1080, width: 200 },
            
            // 🔥 第1段：固定平台 + 水平激光
            { x: 350, y: 1000, width: 120 },
            { x: 520, y: 950, width: 120 },
            
            // 🔥 第2段：垂直移动平台 + 垂直激光墙
            // （平台在autoMovingPlatforms中）
            
            // 🔥 第3段：固定平台 + 水平激光
            { x: 1650, y: 1000, width: 120 },
            { x: 1820, y: 950, width: 120 },
            
            // 🔥 第4段：垂直移动平台 + 垂直激光墙
            
            // 🔥 第5段：固定平台 + 水平激光
            { x: 2950, y: 1000, width: 120 },
            { x: 3120, y: 950, width: 120 },
            
            // 🔥 第6段：垂直移动平台 + 垂直激光墙
            
            // 🔥 第7段：固定平台 + 水平激光
            { x: 4250, y: 1000, width: 120 },
            { x: 4420, y: 950, width: 120 },
            
            // 终点
            { x: 4700, y: 1000, width: 200 }
          ],
          
          // 🔥 结合7-1：垂直移动平台（上下移动）
          autoMovingPlatforms: [
            // 第2段：垂直移动平台区域
            { startX: 800, y: 1050, endX: 800, endY: 850, width: 100, speed: 1.5 },
            { startX: 950, y: 950, endX: 950, endY: 750, width: 100, speed: 1.6 },
            { startX: 1100, y: 1000, endX: 1100, endY: 800, width: 100, speed: 1.7 },
            { startX: 1250, y: 1050, endX: 1250, endY: 850, width: 100, speed: 1.6 },
            { startX: 1400, y: 950, endX: 1400, endY: 750, width: 100, speed: 1.5 },
            
            // 第4段：垂直移动平台区域
            { startX: 2100, y: 1000, endX: 2100, endY: 800, width: 100, speed: 1.7 },
            { startX: 2250, y: 1050, endX: 2250, endY: 850, width: 100, speed: 1.8 },
            { startX: 2400, y: 950, endX: 2400, endY: 750, width: 100, speed: 1.6 },
            { startX: 2550, y: 1000, endX: 2550, endY: 800, width: 100, speed: 1.7 },
            { startX: 2700, y: 1050, endX: 2700, endY: 850, width: 100, speed: 1.8 },
            
            // 第6段：垂直移动平台区域
            { startX: 3400, y: 1050, endX: 3400, endY: 850, width: 100, speed: 1.8 },
            { startX: 3550, y: 1000, endX: 3550, endY: 800, width: 100, speed: 1.9 },
            { startX: 3700, y: 950, endX: 3700, endY: 750, width: 100, speed: 1.7 },
            { startX: 3850, y: 1000, endX: 3850, endY: 800, width: 100, speed: 1.8 },
            { startX: 4000, y: 1050, endX: 4000, endY: 850, width: 100, speed: 1.9 }
          ],
          
          // 🔥 创新：垂直激光墙 + 水平激光网 交叉攻击
          traps: [
            // 第1段：水平激光（需要跳跃躲避）
            { x: 400, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 500, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 600, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第2段：垂直激光墙（在移动平台区域）
            { x: 1000, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1000, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1000, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1000, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1000, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            // 缺口 800-920
            { x: 1000, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1000, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第3段：水平激光
            { x: 1700, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1800, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1900, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第4段：垂直激光墙
            { x: 2300, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第5段：水平激光
            { x: 3000, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3100, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3200, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第6段：垂直激光墙
            { x: 3600, y: 300, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 400, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 500, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 600, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 700, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 940, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 3600, y: 1040, type: 'electric', damage: 25, pattern: 'periodic' },
            
            // 第7段：水平激光
            { x: 4300, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4400, y: 950, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 4500, y: 950, type: 'electric', damage: 25, pattern: 'periodic' }
          ],
          
          enemies: [
            { x: 520, y: 920, type: 'bat' },
            { x: 1100, y: 970, type: 'bat' },
            { x: 1820, y: 920, type: 'bat' },
            { x: 2400, y: 920, type: 'bat' },
            { x: 3120, y: 920, type: 'bat' },
            { x: 3700, y: 920, type: 'bat' },
            { x: 4420, y: 920, type: 'bat' }
          ],
          
          collectibles: [
            { x: 520, y: 900, type: 'coin', value: 10 },
            { x: 1100, y: 850, type: 'gem', value: 30 },
            { x: 1820, y: 900, type: 'gem', value: 30 },
            { x: 2400, y: 850, type: 'gem', value: 50 },
            { x: 3120, y: 900, type: 'gem', value: 30 },
            { x: 3700, y: 850, type: 'gem', value: 50 },
            { x: 4420, y: 900, type: 'gem', value: 50 }
          ],
          
          goal: { x: 4750, y: 970 }
        },
        objectives: [
          { type: 'reach', target: 'goal', description: '到达终点' }
        ],
        questions: [
          { 
            id: 'q7_3_1', 
            type: 'choice', 
            question: '【编程思维】程序员面对交叉激光时的第一反应？😱', 
            options: ['写个AI自动躲避', '找bug在哪', '同时观察两个方向', '重启激光系统'], 
            answer: '同时观察两个方向', 
            difficulty: 3, 
            subject: 'general',
            explanation: '虽然程序员很想写个AI来自动躲避😂，但现实是：要同时处理多个问题！就像同时修bug、优化性能、写文档...这就是"多线程思维"！不过别真的多线程，人脑会死机的🤯'
          },
          { 
            id: 'q7_3_2', 
            type: 'choice', 
            question: '【算法优化】两个4秒周期的激光交叉，最佳通过时机是？', 
            options: ['随机尝试直到成功', '找到两个激光都隐藏的时刻', '等到明天激光没电', '喊"bug"让激光消失'], 
            answer: '找到两个激光都隐藏的时刻', 
            difficulty: 3, 
            subject: 'logic',
            explanation: '这就是"时间复杂度优化"！两个4秒周期的激光，每8秒会同时隐藏一次。找到这个"最大公约数"就能安全通过！编程也一样，找到规律才能写出O(1)的代码，而不是O(n²)的暴力尝试😅'
          }
        ],
        rewards: { xp: 300, coins: 150 }
      },
      
      // 关卡4：激光地狱模式 💀⚡
      {
        id: 'level_7_4',
        name: '激光地狱模式',
        description: '终极挑战：水平移动平台 + 交叉激光网！',
        story: '这是最终考验！工业园的防御系统进入“地狱模式”！平台不仅会上下移动，还会左右移动！垂直激光墙、水平激光网、移动激光会同时启动。你需要在移动平台上躲避来自四面八方的激光！💡提示：这是 7-1、7-2、7-3 的终极融合，只有真正的大师才能通过！',
        campaignMapData: {
          startPosition: { x: 100, y: 1050 },
          width: 5500,
          height: 1200,
          
          platforms: [
            // 起点
            { x: 50, y: 1080, width: 200 },
            
            // 🔥 第1段：固定平台 + 水平激光
            { x: 350, y: 1000, width: 120 },
            { x: 520, y: 950, width: 120 },
            
            // 🔥 第2段：垂直移动平台 + 垂直激光墙
            
            // 🔥 第3段：固定平台 + 水平激光
            { x: 1650, y: 1000, width: 120 },
            { x: 1820, y: 950, width: 120 },
            
            // 🔥 第4段：水平移动平台（新增！） + 垂直激光墙
            
            // 🔥 第5段：固定平台 + 水平激光
            { x: 3150, y: 1000, width: 120 },
            { x: 3320, y: 950, width: 120 },
            
            // 🔥 第6段：垂直+水平移动平台（终极挑战！） + 交叉激光
            
            // 🔥 第7段：固定平台 + 水平激光
            { x: 4850, y: 1000, width: 120 },
            { x: 5020, y: 950, width: 120 },
            
            // 终点
            { x: 5300, y: 1000, width: 200 }
          ],
          
          // 🔥 终极挑战：垂直移动 + 水平移动平台
          autoMovingPlatforms: [
            // 第2段：垂直移动平台
            { startX: 800, y: 1050, endX: 800, endY: 850, width: 100, speed: 1.5 },
            { startX: 950, y: 950, endX: 950, endY: 750, width: 100, speed: 1.6 },
            { startX: 1100, y: 1000, endX: 1100, endY: 800, width: 100, speed: 1.7 },
            { startX: 1250, y: 1050, endX: 1250, endY: 850, width: 100, speed: 1.6 },
            { startX: 1400, y: 950, endX: 1400, endY: 750, width: 100, speed: 1.5 },
            
            // 第4段：水平移动平台（创新！）
            { startX: 2000, endX: 2200, y: 1000, width: 100, speed: 1.5 },
            { startX: 2250, endX: 2450, y: 950, width: 100, speed: 1.6 },
            { startX: 2500, endX: 2700, y: 1000, width: 100, speed: 1.7 },
            { startX: 2750, endX: 2950, y: 950, width: 100, speed: 1.6 },
            
            // 第6段：垂直+水平移动平台（终极挑战！）
            { startX: 3600, endX: 3750, y: 1050, endY: 900, width: 100, speed: 1.8 },
            { startX: 3800, endX: 3950, y: 1000, endY: 850, width: 100, speed: 1.9 },
            { startX: 4000, endX: 4150, y: 950, endY: 800, width: 100, speed: 1.7 },
            { startX: 4200, endX: 4350, y: 1000, endY: 850, width: 100, speed: 1.8 },
            { startX: 4400, endX: 4550, y: 1050, endY: 900, width: 100, speed: 1.9 },
            { startX: 4600, endX: 4750, y: 1000, endY: 850, width: 100, speed: 2.0 }
          ],
          
          // 🔥 终极挑战：垂直+水平+移动激光
          traps: [
            // 第1段：水平激光
            { x: 400, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 500, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 600, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第2段：垂直激光墙
            { x: 1000, y: 300, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 400, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 500, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 600, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 700, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 940, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1000, y: 1040, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第3段：水平激光
            { x: 1700, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1800, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1900, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第4段：垂直激光墙（在水平移动平台区域）
            { x: 2400, y: 300, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 400, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 500, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 600, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 700, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 940, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 2400, y: 1040, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第5段：水平激光
            { x: 3200, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3300, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3400, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第6段：交叉激光网（终极挑战！）
            // 垂直激光墙1
            { x: 3900, y: 300, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 400, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 500, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 600, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 700, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 940, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 3900, y: 1040, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 垂直激光墙2
            { x: 4300, y: 300, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 400, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 500, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 600, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 700, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 940, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4300, y: 1040, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 水平激光网
            { x: 4000, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4100, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4200, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4400, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4500, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 4600, y: 900, type: 'electric', damage: 30, pattern: 'periodic' },
            
            // 第7段：水平激光
            { x: 4900, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 5000, y: 950, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 5100, y: 950, type: 'electric', damage: 30, pattern: 'periodic' }
          ],
          
          enemies: [
            { x: 520, y: 920, type: 'bat' },
            { x: 1100, y: 970, type: 'bat' },
            { x: 1820, y: 920, type: 'bat' },
            { x: 2400, y: 920, type: 'robot' },
            { x: 3320, y: 920, type: 'bat' },
            { x: 4100, y: 920, type: 'robot' },
            { x: 4600, y: 920, type: 'robot' },
            { x: 5020, y: 920, type: 'bat' }
          ],
          
          collectibles: [
            { x: 520, y: 900, type: 'coin', value: 10 },
            { x: 1100, y: 850, type: 'gem', value: 30 },
            { x: 1820, y: 900, type: 'gem', value: 30 },
            { x: 2400, y: 900, type: 'gem', value: 50 },
            { x: 3320, y: 900, type: 'gem', value: 30 },
            { x: 4100, y: 850, type: 'gem', value: 50 },
            { x: 4600, y: 850, type: 'gem', value: 50 },
            { x: 5020, y: 900, type: 'gem', value: 100 }
          ],
          
          goal: { x: 5350, y: 970 }
        },
        objectives: [
          { type: 'reach', target: 'goal', description: '到达终点' }
        ],
        questions: [
          { 
            id: 'q7_4_1', 
            type: 'choice', 
            question: '【终极挑战】平台同时上下左右移动，程序员会想到什么？🤯', 
            options: ['二维数组遍历', '递归调用', '死循环', '直接放弃'], 
            answer: '二维数组遍历', 
            difficulty: 3, 
            subject: 'logic',
            explanation: '这就是"二维坐标系"！平台的x和y同时变化，就像遍历二维数组：for(x) { for(y) { ... } }。不过别真的写死循环，不然平台会飞出宇宙😂'
          },
          { 
            id: 'q7_4_2', 
            type: 'choice', 
            question: '【搞笑问答】面对激光地狱模式，程序员的终极解决方案是？😱', 
            options: ['Ctrl+Z撤销', 'Alt+F4退出', '找到激光的同步规律', '喊"这不是bug是特性"'], 
            answer: '找到激光的同步规律', 
            difficulty: 3, 
            subject: 'general',
            explanation: '虽然很想按Ctrl+Z回到没有激光的时代😭，但现实是：要找规律！垂直激光、水平激光、移动平台都有周期，找到它们的"最小公倍数"就能通过。这就是算法的力量！不过如果实在过不去，喊"这不是bug是特性"也许能骗过激光🤣'
          }
        ],
        rewards: { xp: 400, coins: 200 }
      },
      
      // 关卡5：双Boss战 - 美食大厨 + 激光守卫
      {
        id: 'level_7_5',
        name: 'Boss：工业双雄',
        description: '击败两个Boss！先是美食大厨，然后是激光守卫！',
        story: '工业园区的核心区域！💻 这里有两个失控的AI守护者。第一个是"美食大厨"🍳，击败它后，真正的威胁"激光守卫"⚡才会现身！激光守卫拥有持续激光攻击和定身技能，它会主动追击你，也会在危险时撤退，小心应对！',
        campaignMapData: {
          startPosition: { x: 150, y: 1200 },
          width: 2800,  // 加大地图
          height: 1500,
          
          platforms: [
            { x: 0, y: 1450, width: 2800, type: 'ground' },
            // 左侧阶梯
            { x: 100, y: 1380, width: 200 },
            { x: 350, y: 1300, width: 180 },
            { x: 580, y: 1220, width: 160 },
            // 中央竞技场 - 多层平台
            { x: 800, y: 1150, width: 250 },
            { x: 1100, y: 1080, width: 300 },
            { x: 1450, y: 1080, width: 300 },
            { x: 1800, y: 1150, width: 250 },
            // 右侧阶梯
            { x: 2050, y: 1220, width: 160 },
            { x: 2280, y: 1300, width: 180 },
            { x: 2530, y: 1380, width: 200 },
            // 高层平台（Boss战斗区）
            { x: 400, y: 950, width: 180 },
            { x: 700, y: 850, width: 220 },
            { x: 1050, y: 780, width: 350 },  // 中央高台
            { x: 1500, y: 780, width: 350 },  // 中央高台2
            { x: 1900, y: 850, width: 220 },
            { x: 2200, y: 950, width: 180 },
            // 顶层平台
            { x: 900, y: 600, width: 200 },
            { x: 1250, y: 550, width: 300 },  // 最高点
            { x: 1650, y: 600, width: 200 }
          ],
          
          // 移动平台
          movingPlatforms: [
            { startX: 250, endX: 250, startY: 1100, endY: 900, width: 100, speed: 70 },
            { startX: 600, endX: 900, startY: 1000, endY: 1000, width: 120, speed: 90 },
            { startX: 1900, endX: 2200, startY: 1000, endY: 1000, width: 120, speed: 90 },
            { startX: 2500, endX: 2500, startY: 1100, endY: 900, width: 100, speed: 70 },
            // 高层移动平台
            { startX: 550, endX: 550, startY: 750, endY: 600, width: 80, speed: 60 },
            { startX: 2100, endX: 2100, startY: 750, endY: 600, width: 80, speed: 60 }
          ],
          
          // 激光陷阱
          traps: [
            { x: 500, y: 1180, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 950, y: 1000, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 1400, y: 700, type: 'electric', damage: 30, pattern: 'periodic' },
            { x: 1850, y: 1000, type: 'electric', damage: 25, pattern: 'periodic' },
            { x: 2300, y: 1180, type: 'electric', damage: 25, pattern: 'periodic' }
          ],
          
          // 第一个Boss（美食大厨）
          enemies: [
            { x: 1400, y: 700, type: 'boss' }
          ],
          
          collectibles: [
            { x: 200, y: 1350, type: 'coin', value: 10 },
            { x: 500, y: 1180, type: 'gem', value: 30 },
            { x: 900, y: 800, type: 'gem', value: 40 },
            { x: 1400, y: 500, type: 'gem', value: 50 },
            { x: 1900, y: 800, type: 'gem', value: 40 },
            { x: 2300, y: 1180, type: 'gem', value: 30 },
            { x: 2600, y: 1350, type: 'coin', value: 10 },
            // 🔥 冲刺星星（逃命用！）
            { x: 400, y: 1100, type: 'dash_star', value: 50 },
            { x: 1400, y: 950, type: 'dash_star', value: 50 },
            { x: 2400, y: 1100, type: 'dash_star', value: 50 },
            { x: 800, y: 750, type: 'dash_star', value: 50 },
            { x: 2000, y: 750, type: 'dash_star', value: 50 }
          ],
          
          // 🔥 v2.1.13: 添加治疗区域（降低Boss战难度）
          chemicalZones: [
            // 左侧安全区 - 治疗
            { x: 100, y: 1200, width: 180, height: 200, type: 'heal', healAmount: 8, color: 0x00ff00 },
            // 右侧安全区 - 治疗
            { x: 2520, y: 1200, width: 180, height: 200, type: 'heal', healAmount: 8, color: 0x00ff00 }
          ],
          
          goal: { x: 1400, y: 750 }
        },
        // 🔥 双Boss配置
        bossConfig: {
          type: 'dual',  // 双Boss模式标记
          // 第一阶段：美食大厨
          hp: 400,
          phases: [
            {
              hp: 400,
              attacks: ['projectile', 'summon'],
              attackInterval: 2500,
              moveSpeed: 130,
              summonMinions: true
            },
            {
              hp: 200,
              attacks: ['projectile', 'summon', 'charge'],
              attackInterval: 2000,
              moveSpeed: 160,
              summonMinions: true
            }
          ],
          // 第二阶段Boss配置（击败第一个后触发）
          secondBoss: {
            name: '激光守卫',
            hp: 600,
            spawnDelay: 2000,  // 2秒后出现
            spawnPosition: { x: 1400, y: 500 },
            attacks: ['laser_continuous', 'stun', 'charge', 'projectile'],
            specialAbilities: {
              continuousLaser: true,
              laserDuration: 2500,   // 🔥 激光持续时间缩短到2.5秒
              laserCooldown: 10000,  // 🔥 激光冷却10秒
              stunPlayer: true,
              stunDuration: 1200,    // 🔥 定身时间从1.5秒减少到1.2秒
              stunCooldown: 14000,   // 🔥 定身冷却从10秒增加到14秒
              smartAI: true,
              retreatWhenLowHP: true
            },
            phases: [
              { hp: 600, moveSpeed: 150, attackInterval: 2500 },
              { hp: 350, moveSpeed: 180, attackInterval: 2000 },
              { hp: 150, moveSpeed: 220, attackInterval: 1500 }
            ]
          },
          defeatCondition: 'combat'
        },
        objectives: [
          { type: 'defeat', target: 'boss', description: '击败美食大厨' },
          { type: 'defeat', target: 'boss2', description: '击败激光守卫' }
        ],
        questions: [
          { 
            id: 'q7_5_1', 
            type: 'choice', 
            question: '【AI知识】如何防止AI失控？', 
            options: ['设置安全约束', '给AI装炸弹', '不开发AI', '祈祷'], 
            answer: '设置安全约束', 
            difficulty: 3, 
            subject: 'logic',
            explanation: 'AI安全的关键是设置合理的约束和监控机制！比如设定目标函数时要考虑副作用，建立人类监督机制，确保AI行为可解释。'
          },
          { 
            id: 'q7_5_2', 
            type: 'choice', 
            question: '【趣味问答】打败AI后，程序员会说？😎', 
            options: ['我才是真正的智能', '重启大法好', '下次记得备份', '终于可以下班了'], 
            answer: '终于可以下班了', 
            difficulty: 1, 
            subject: 'general',
            explanation: '哈哈！程序员的终极目标：下班！😄 修好bug、打败AI，一切都是为了这个神圣的时刻。不过明天还得继续修bug...'
          }
        ],
        rewards: { xp: 500, coins: 250, skills: ['time_slow'] }
      }
    ],
    unlockRequirement: 'campaign_6',
    rewards: { xp: 1000, coins: 500, title: '工业大师' }
  },
  // 🔥 战役8从独立文件导入
  campaign8,
  // 🔥 战役9从独立文件导入
  campaign9,
  // 🔥 战役10：宜昌东站时空列车大冒险
  campaign10,
  campaign11,
  campaign12,
  campaign13,
  campaign14,
  campaign15,
  campaign16
];
