'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type TimeOfDay = 'morning' | 'day' | 'dusk' | 'night';

interface CozyRoomBackgroundProps {
  scene: 'living' | 'garden';
  children?: React.ReactNode;
}

const WINDOW_CLOUDS = [
  { top: '12%', left: '-8%', width: 94, height: 30, duration: 24, opacity: 0.68 },
  { top: '28%', left: '22%', width: 74, height: 24, duration: 20, opacity: 0.54 },
];

const GARDEN_CLOUDS = [
  { top: '10%', left: '-6%', width: 160, height: 42, duration: 42, opacity: 0.32 },
  { top: '18%', left: '18%', width: 118, height: 34, duration: 36, opacity: 0.28 },
  { top: '13%', left: '56%', width: 138, height: 38, duration: 40, opacity: 0.26 },
];

const GARDEN_BUTTERFLIES = [
  { x: 28, y: 34, duration: 12, color: 'rgba(251,113,133,0.82)' },
  { x: 63, y: 26, duration: 16, color: 'rgba(167,139,250,0.8)' },
  { x: 48, y: 38, duration: 18, color: 'rgba(250,204,21,0.78)' },
];

const GARDEN_FIREFLIES = [
  { left: '12%', top: '22%', x: [0, 10, -6, 0], y: [0, -12, -4, 0], duration: 5.2, delay: 0.3 },
  { left: '22%', top: '30%', x: [0, -8, 12, 0], y: [0, -10, -16, 0], duration: 6.4, delay: 1.1 },
  { left: '33%', top: '18%', x: [0, 14, -9, 0], y: [0, -8, -12, 0], duration: 5.8, delay: 2.2 },
  { left: '43%', top: '34%', x: [0, -12, 8, 0], y: [0, -14, -5, 0], duration: 6.8, delay: 0.8 },
  { left: '51%', top: '26%', x: [0, 9, -7, 0], y: [0, -11, -15, 0], duration: 5.6, delay: 1.7 },
  { left: '58%', top: '20%', x: [0, -10, 14, 0], y: [0, -9, -13, 0], duration: 6.1, delay: 2.7 },
  { left: '65%', top: '31%', x: [0, 12, -10, 0], y: [0, -15, -6, 0], duration: 7.1, delay: 1.4 },
  { left: '73%', top: '24%', x: [0, -11, 9, 0], y: [0, -10, -14, 0], duration: 6.3, delay: 3.1 },
  { left: '80%', top: '19%', x: [0, 8, -5, 0], y: [0, -13, -8, 0], duration: 5.4, delay: 0.5 },
  { left: '18%', top: '42%', x: [0, 7, -10, 0], y: [0, -7, -12, 0], duration: 6.7, delay: 2.4 },
];

const FLOATING_DUST_PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  x: `${6 + (index * 5.2) % 88}%`,
  y: `${12 + (index * 7.4) % 74}%`,
  scale: 0.45 + (index % 5) * 0.14,
  driftX: ((index % 6) - 2.5) * 5,
  driftY: -12 - (index % 4) * 4,
  duration: 6 + (index % 6) * 1.4,
  delay: index * 0.28,
}));

const LIVING_WALL_PANELS = [
  { left: '5%', width: '24%', opacity: 0.5 },
  { left: '37%', width: '26%', opacity: 0.34 },
  { left: '68%', width: '22%', opacity: 0.42 },
];

const LIVING_MOBILE_STARS = [
  { left: '0%', top: '0%', size: 12, delay: 0 },
  { left: '24%', top: '14%', size: 10, delay: 0.2 },
  { left: '52%', top: '6%', size: 14, delay: 0.45 },
  { left: '74%', top: '18%', size: 9, delay: 0.7 },
];

const GARDEN_STEPPING_STONES = [
  { left: '26%', width: 48, height: 18, rotate: -8 },
  { left: '37%', width: 54, height: 20, rotate: 4 },
  { left: '49%', width: 62, height: 22, rotate: -5 },
  { left: '63%', width: 52, height: 18, rotate: 7 },
];

const GARDEN_LANTERNS = [
  { right: '10%', top: '18%', glow: 'rgba(253,224,71,0.3)', delay: 0.1 },
  { right: '18%', top: '24%', glow: 'rgba(125,211,252,0.24)', delay: 0.4 },
  { right: '4%', top: '28%', glow: 'rgba(251,191,36,0.24)', delay: 0.8 },
];

/**
 * 🏠 舒适房间背景组件
 * 包含：
 * 1. 透视感房间结构（墙壁、地板、踢脚线）
 * 2. 动态窗户（根据时间变化风景）
 * 3. 实时光影系统（根据时间改变室内色调）
 * 4. 粒子氛围层
 */
export default function CozyRoomBackground({ scene, children }: CozyRoomBackgroundProps) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  
  // 根据时间获取配置
  useEffect(() => {
    const updateTime = () => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 11) setTimeOfDay('morning');
      else if (hour >= 11 && hour < 17) setTimeOfDay('day');
      else if (hour >= 17 && hour < 20) setTimeOfDay('dusk');
      else setTimeOfDay('night');
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000); // 每分钟更新
    return () => clearInterval(timer);
  }, []);
  
  // 场景配置映射
  const sceneConfig = {
    living: {
      wallColor: {
        morning: 'bg-orange-50',
        day: 'bg-amber-50',
        dusk: 'bg-orange-100',
        night: 'bg-[#d9c7d0]'
      },
      floorColor: {
        morning: 'from-amber-100 to-orange-100',
        day: 'from-amber-200 to-orange-200',
        dusk: 'from-orange-200 to-amber-300',
        night: 'from-[#c49b8e] to-[#a9879c]'
      },
      lightOverlay: {
        morning: 'bg-blue-200/10',
        day: 'bg-yellow-200/5',
        dusk: 'bg-orange-500/20',
        night: 'bg-[#6e7caf]/14'
      }
    },
    garden: {
      skyColor: {
        morning: 'from-sky-300 via-sky-200 to-orange-100',
        day: 'from-sky-400 via-sky-200 to-emerald-50',
        dusk: 'from-indigo-400 via-violet-300 to-orange-200',
        night: 'from-[#7187bd] via-[#9cb6d2] to-[#e3b49c]'
      },
      lightOverlay: {
        morning: 'bg-amber-200/8',
        day: 'bg-emerald-200/6',
        dusk: 'bg-orange-500/16',
        night: 'bg-[#5c6ca0]/10',
      }
    }
  };

  // 渲染客厅
  if (scene === 'living') {
    return (
      <div className={`relative w-full h-full overflow-hidden transition-colors duration-[2000ms] ${sceneConfig.living.wallColor[timeOfDay]}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-100"
          style={{
            backgroundImage: "url('/assets/pet-home/living-room-bg.png')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,235,0.06),rgba(255,219,180,0.08))]" />
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.12]">
        {/* 1. 墙纸纹理 - 精致菱形格纹 */}
        <div className="absolute inset-0" style={{
          opacity: timeOfDay === 'night' ? 0.04 : 0.06,
          backgroundImage: `
            linear-gradient(45deg, rgba(160,120,60,0.5) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(160,120,60,0.5) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(160,120,60,0.5) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(160,120,60,0.5) 75%)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
        }} />
        
        {/* 1b. 天花角线 */}
        <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-[2]"
             style={{
               background: 'linear-gradient(to bottom, rgba(180,160,120,0.3) 0%, rgba(180,160,120,0.12) 40%, transparent 100%)',
               borderBottom: '2px solid rgba(160,140,100,0.15)'
             }} />
        <div className="absolute top-6 left-0 right-0 h-3 pointer-events-none z-[2]"
             style={{ background: 'linear-gradient(to bottom, rgba(180,160,120,0.08), transparent)' }} />

        {/* 1c. 墙面微妙暖色渐变（从上到下越暖） */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,240,210,0.08) 50%, rgba(255,220,180,0.12) 70%)'
        }} />

        {/* 1d. 墙面分区与拱形壁板，让空间更像真实小屋而不是单张平墙 */}
        <div className="absolute inset-x-[4%] top-[10%] bottom-[31%] pointer-events-none z-[1]">
          {LIVING_WALL_PANELS.map((panel, index) => (
            <div
              key={`living-panel-${index}`}
              className="absolute bottom-0 top-0 rounded-t-[999px] rounded-b-[28px] border border-white/10"
              style={{
                left: panel.left,
                width: panel.width,
                opacity: panel.opacity,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,239,213,0.05) 42%, rgba(131,96,58,0.08) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 24px rgba(94,59,28,0.05)',
              }}
            >
              <div className="absolute inset-[12px] rounded-t-[999px] rounded-b-[20px] border border-white/8" />
            </div>
          ))}
        </div>

        {/* 2. 木纹地板 (30% 高度) */}
        <div className={`absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b ${sceneConfig.living.floorColor[timeOfDay]} transition-colors duration-[2000ms]`}>
          {/* 木地板纹理 - 更逼真 */}
          <div className="w-full h-full" style={{
            opacity: 0.18,
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent 0, transparent 46px, rgba(120,75,30,0.4) 46px, rgba(120,75,30,0.4) 48px, transparent 48px, transparent 50px),
              repeating-linear-gradient(0deg, transparent 0, transparent 6px, rgba(140,95,40,0.06) 6px, rgba(140,95,40,0.06) 7px)
            `,
            transform: 'perspective(600px) rotateX(55deg) scaleY(2.2)',
            transformOrigin: 'top'
          }} />
          {/* 地板漫反射高光 */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-[2000ms] ${
            timeOfDay === 'night' ? 'opacity-0' : 'opacity-100'
          }`} style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)'
          }} />
        </div>
        
        {/* 3. 踢脚线 - 木纹质感 */}
        <div className="absolute bottom-[30%] left-0 right-0 h-6 pointer-events-none z-[2]">
          <div className="w-full h-full bg-gradient-to-b from-amber-800/30 to-amber-900/20" />
          <div className="absolute top-0 w-full h-[2px] bg-amber-700/25" />
          <div className="absolute top-[3px] w-full h-[1px] bg-amber-600/10" />
          <div className="absolute bottom-0 w-full h-[1px] bg-amber-900/30" />
        </div>
        
        {/* ═══ 内置氛围元素 ═══ */}
        
        {/* A. 地毯 - 更丰富的波斯风图案 */}
        <div className="absolute bottom-[6%] left-[22%] w-[56%] h-[16%] rounded-[50%] pointer-events-none z-[1]">
          <div className="w-full h-full rounded-[50%]" style={{
            background: 'radial-gradient(ellipse, rgba(160,60,30,0.22) 0%, rgba(180,90,40,0.16) 30%, rgba(180,90,40,0.08) 55%, transparent 75%)',
            border: '2px solid rgba(180,90,40,0.08)'
          }} />
          {/* 地毯内圈花纹 */}
          <div className="absolute inset-[15%] rounded-[50%]" style={{
            border: '1px solid rgba(200,150,80,0.12)'
          }} />
          <div className="absolute inset-[30%] rounded-[50%]" style={{
            border: '1px solid rgba(200,150,80,0.08)'
          }} />
        </div>

        {/* B. 壁灯（右上） + 光晕 */}
        <div className="absolute top-[16%] right-[7%] pointer-events-none z-[3]">
          <div className="w-3 h-8 bg-amber-800/35 rounded-sm mx-auto" />
          <div className="w-14 h-12 -mt-1 mx-auto" style={{
            background: 'linear-gradient(to bottom, rgba(255,248,220,0.35), rgba(255,240,200,0.15))',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            borderRadius: '0 0 6px 6px'
          }} />
          <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none transition-opacity duration-[2000ms] ${
            timeOfDay === 'night' ? 'opacity-40' : 'opacity-12'
          }`} style={{ background: 'radial-gradient(circle, rgba(255,245,190,0.5) 0%, rgba(255,245,190,0.15) 35%, transparent 65%)' }} />
        </div>

        {/* C. 壁灯（左上，窗户旁） */}
        <div className="absolute top-[16%] left-[calc(10%+200px)] pointer-events-none z-[3]">
          <div className="w-3 h-6 bg-amber-800/30 rounded-sm mx-auto" />
          <div className="w-10 h-9 -mt-1 mx-auto" style={{
            background: 'linear-gradient(to bottom, rgba(255,248,220,0.3), rgba(255,240,200,0.1))',
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            borderRadius: '0 0 4px 4px'
          }} />
          <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none transition-opacity duration-[2000ms] ${
            timeOfDay === 'night' ? 'opacity-30' : 'opacity-8'
          }`} style={{ background: 'radial-gradient(circle, rgba(255,245,190,0.4) 0%, transparent 60%)' }} />
        </div>

        {/* D. Layered mood board, replacing the flat wall tile */}
        <motion.div
          className="absolute top-[20%] right-[18%] pointer-events-none z-[2]"
          animate={{ y: [0, -2.5, 0], rotate: [-0.8, 0.6, -0.8] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="relative h-[118px] w-[128px] rounded-[28px] border border-amber-100/20"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,253,245,0.2) 0%, rgba(255,240,214,0.08) 28%, rgba(116,81,50,0.1) 100%)',
              boxShadow: '0 16px 30px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            <div className="absolute left-1/2 top-[10px] h-[14px] w-[78px] -translate-x-1/2 rounded-full bg-amber-950/10 blur-sm" />
            <div className="absolute left-1/2 top-[6px] h-[10px] w-[72px] -translate-x-1/2 rounded-full bg-amber-100/28" />
            <div className="absolute left-[14px] top-[18px] h-[62px] w-[82px] rounded-[20px] border border-white/55 bg-[linear-gradient(160deg,rgba(232,250,236,0.95),rgba(159,213,185,0.88)_56%,rgba(104,164,123,0.92))] shadow-[0_12px_22px_rgba(15,23,42,0.12)]">
              <div className="absolute inset-x-[10px] top-[9px] h-[16px] rounded-full bg-white/24 blur-sm" />
              <div className="absolute bottom-[16px] left-[10px] right-[12px] h-[22px] rounded-[16px] bg-emerald-900/18" />
              <div className="absolute bottom-[17px] left-[12px] h-[28px] w-[48px] rounded-[20px] bg-emerald-300/24" />
              <div className="absolute bottom-[18px] right-[14px] h-[24px] w-[32px] rounded-[20px] bg-sky-200/24" />
              <div className="absolute left-[16px] top-[26px] h-[16px] w-[16px] rounded-full bg-white/76 shadow-[0_6px_12px_rgba(255,255,255,0.2)]" />
              <div className="absolute right-[12px] top-[18px] h-[8px] w-[8px] rounded-full bg-amber-100/85" />
            </div>
            <div className="absolute right-[14px] top-[32px] h-[34px] w-[26px] rounded-[16px] border border-amber-100/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,246,230,0.88))] shadow-[0_10px_16px_rgba(15,23,42,0.1)]">
              <div className="absolute left-[6px] top-[8px] h-[3px] w-[12px] rounded-full bg-rose-300/90" />
              <div className="absolute left-[6px] top-[14px] h-[3px] w-[10px] rounded-full bg-sky-300/85" />
              <div className="absolute left-[8px] top-[20px] h-[8px] w-[8px] rounded-full bg-amber-300/85" />
            </div>
            <div className="absolute left-[94px] top-[18px] h-[8px] w-[8px] rounded-full bg-amber-200/90 shadow-[0_0_12px_rgba(253,224,71,0.35)]" />
            <div className="absolute left-[102px] top-[28px] h-[5px] w-[5px] rounded-full bg-rose-200/85" />
            <div className="absolute left-[100px] top-[38px] h-[12px] w-[2px] rounded-full bg-amber-100/40" />
          </div>
        </motion.div>

        {/* E. Window-side keepsake badge, replacing the flat orange square */}
        <motion.div
          className="absolute top-[43%] left-[5.2%] pointer-events-none z-[2]"
          animate={{ y: [0, -1.5, 0], rotate: [-1.4, 0.5, -1.4] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative h-[78px] w-[88px]">
            <div
              className="absolute left-[6px] top-[8px] h-[56px] w-[66px] rounded-[22px] border border-amber-100/35"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,244,216,0.96) 0%, rgba(255,208,112,0.92) 56%, rgba(226,146,44,0.96) 100%)',
                boxShadow: '0 12px 22px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              <div className="absolute inset-x-[10px] top-[10px] h-[14px] rounded-full bg-white/34 blur-sm" />
              <div className="absolute left-[16px] top-[14px] h-[18px] w-[18px] rounded-full bg-white/72" />
              <div className="absolute left-[22px] top-[20px] h-[6px] w-[6px] rounded-full bg-amber-300/90" />
              <div className="absolute right-[14px] top-[18px] h-[10px] w-[10px] rounded-full bg-rose-200/82" />
              <div className="absolute bottom-[13px] left-[12px] h-[16px] w-[42px] rounded-[12px] bg-amber-900/14" />
              <div className="absolute bottom-[16px] left-[18px] h-[10px] w-[28px] rounded-full bg-white/26" />
            </div>
            <div className="absolute left-[24px] top-0 h-[10px] w-[22px] rounded-full bg-amber-900/16" />
            <div className="absolute left-[12px] bottom-[6px] h-[14px] w-[16px] rounded-[4px_4px_12px_12px] bg-fuchsia-300/72" />
            <div className="absolute left-[28px] bottom-[4px] h-[18px] w-[18px] rounded-[4px_4px_14px_14px] bg-sky-300/72" />
            <div className="absolute left-[46px] bottom-[7px] h-[13px] w-[16px] rounded-[4px_4px_12px_12px] bg-amber-200/88" />
          </div>
        </motion.div>

        {/* F. 窗台小盆栽 */}
        <div className="absolute pointer-events-none z-[3]" style={{ top: 'calc(15% + 210px)', left: 'calc(10% + 30px)' }}>
          <div className="w-6 h-5 bg-amber-700/40 rounded-b-md mx-auto" />
          <div className="w-8 h-3 bg-amber-800/30 rounded-t-sm -mt-1 mx-auto" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="w-3 h-5 bg-green-500/50 rounded-full" />
            <div className="w-4 h-4 bg-green-400/40 rounded-full -mt-3 -ml-1" />
            <div className="w-3 h-4 bg-green-600/45 rounded-full -mt-3 ml-2" />
          </div>
        </div>

        {/* G. 窗台小盆栽2 */}
        <div className="absolute pointer-events-none z-[3]" style={{ top: 'calc(15% + 210px)', left: 'calc(10% + 100px)' }}>
          <div className="w-5 h-4 bg-red-800/30 rounded-b-md mx-auto" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="w-2 h-6 bg-green-500/40 rounded-full" />
            <div className="absolute -top-1 left-0 w-3 h-3 bg-pink-400/50 rounded-full" />
          </div>
        </div>

        {/* 4. 窗户 (核心光源) - 更精致 */}
        <div className="absolute top-[15%] left-[10%] w-[160px] h-[220px] rounded-t-full overflow-hidden z-[2]" style={{
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <WindowView timeOfDay={timeOfDay} />
          {/* 窗框 - 厚实木框 */}
          <div className="absolute inset-0 pointer-events-none" style={{
            border: '8px solid white',
            borderRadius: '80px 80px 0 0',
            boxShadow: 'inset 0 0 0 2px rgba(200,180,140,0.3)'
          }} />
          {/* 十字窗棂 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[6px] h-full bg-white" style={{ boxShadow: '1px 0 2px rgba(0,0,0,0.1)' }} />
          <div className="absolute top-[42%] left-0 w-full h-[6px] bg-white" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
          {/* 窗台 */}
          <div className="absolute -bottom-1 -left-3 -right-3 h-7 bg-white rounded-sm" style={{
            boxShadow: '0 3px 8px rgba(0,0,0,0.15)'
          }} />
        </div>
        
        {/* 5. 窗帘 - 更有质感 */}
        <div className="absolute top-[11%] left-[6%] w-[20px] h-[260px] pointer-events-none z-[3]">
          <div className="w-full h-full rounded-b-lg" style={{
            background: 'linear-gradient(90deg, rgba(200,170,120,0.35), rgba(220,190,140,0.5), rgba(200,170,120,0.35))',
            boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
          }} />
          {/* 窗帘褶皱 */}
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(0deg, transparent 0, transparent 12px, rgba(0,0,0,0.03) 12px, rgba(0,0,0,0.03) 14px)',
          }} />
        </div>
        <div className="absolute top-[11%] pointer-events-none z-[3]" style={{ left: 'calc(10% + 164px)' }}>
          <div className="w-[20px] h-[260px] rounded-b-lg" style={{
            background: 'linear-gradient(90deg, rgba(200,170,120,0.35), rgba(220,190,140,0.5), rgba(200,170,120,0.35))',
            boxShadow: '-2px 0 4px rgba(0,0,0,0.05)'
          }} />
        </div>
        {/* 窗帘杆 */}
        <div className="absolute top-[11%] left-[5%] pointer-events-none z-[4]" style={{ width: 'calc(10% + 184px - 5%)' }}>
          <div className="w-full h-[4px] bg-amber-800/20 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-800/25" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-800/25" />
        </div>
        
        {/* 6. 窗户投射光 (Light Beam) - 更自然 */}
        <div className={`absolute top-[15%] left-[10%] w-[200px] h-[600px] pointer-events-none transition-opacity duration-[2000ms] z-[1]
          ${timeOfDay === 'night' ? 'opacity-10' : timeOfDay === 'dusk' ? 'opacity-40' : 'opacity-50'}
          `}
          style={{ 
            background: 'linear-gradient(140deg, rgba(255,255,240,0.35) 0%, rgba(255,255,220,0.1) 40%, transparent 65%)',
            transform: 'skewX(-18deg)',
            transformOrigin: 'top left',
            filter: 'blur(12px)'
          }}
        />

        {/* H. 地板暖色反光（靠近窗户一侧） */}
        <div className={`absolute bottom-0 left-[8%] w-[35%] h-[20%] pointer-events-none z-[1] transition-opacity duration-[2000ms] ${
          timeOfDay === 'night' ? 'opacity-0' : 'opacity-100'
        }`} style={{
          background: 'radial-gradient(ellipse at top, rgba(255,250,220,0.12) 0%, transparent 70%)'
        }} />

        {/* I. 阅读角矮柜 */}
        <div className="absolute bottom-[31%] right-[13%] z-[2] pointer-events-none">
          <div className="relative h-[102px] w-[160px]">
            <div className="absolute inset-x-0 bottom-0 h-[62px] rounded-[18px]" style={{
              background: 'linear-gradient(180deg, rgba(110,76,40,0.76) 0%, rgba(72,48,24,0.88) 100%)',
              boxShadow: '0 14px 26px rgba(15,23,42,0.12)',
            }} />
            <div className="absolute inset-x-[10px] bottom-[48px] h-[18px] rounded-[12px] bg-amber-100/18" />
            <div className="absolute left-[18px] bottom-[20px] h-[28px] w-[48px] rounded-[10px] bg-amber-950/22" />
            <div className="absolute right-[18px] bottom-[20px] h-[28px] w-[48px] rounded-[10px] bg-amber-950/22" />
            <div className="absolute left-[22px] top-[12px] h-[28px] w-[16px] rounded-sm bg-emerald-300/32" />
            <div className="absolute left-[42px] top-[10px] h-[30px] w-[14px] rounded-sm bg-sky-300/30" />
            <div className="absolute left-[60px] top-[15px] h-[25px] w-[18px] rounded-sm bg-rose-300/30" />
            <div className="absolute right-[24px] top-[8px] h-[18px] w-[18px] rounded-full bg-amber-100/36" />
          </div>
        </div>

        {/* J. 吊灯暖光 */}
        <div className="absolute left-1/2 top-[5%] z-[3] -translate-x-1/2 pointer-events-none">
          <div className="mx-auto h-[34px] w-[4px] rounded-full bg-amber-900/24" />
          <div className="mx-auto h-[18px] w-[68px] rounded-b-[999px] rounded-t-[10px]" style={{
            background: 'linear-gradient(180deg, rgba(248,214,146,0.8) 0%, rgba(145,99,54,0.72) 100%)',
          }} />
          <div className={`absolute left-1/2 top-[10px] -translate-x-1/2 rounded-full transition-opacity duration-[2000ms] ${
            timeOfDay === 'night' ? 'opacity-85' : 'opacity-45'
          }`} style={{
            width: '240px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(255,234,178,0.28) 0%, rgba(255,219,146,0.12) 38%, transparent 72%)',
          }} />
        </div>

        {/* K. 壁炉光影感 */}
        <div className="absolute bottom-[31%] left-[42%] z-[1] pointer-events-none">
          <div className="relative h-[120px] w-[120px]">
            <div className="absolute inset-x-[18px] bottom-0 h-[86px] rounded-t-[26px] border border-white/8 bg-slate-100/10" />
            <div className="absolute inset-x-[32px] bottom-[18px] h-[44px] rounded-[18px] bg-amber-900/18" />
            <div className={`absolute inset-x-[30px] bottom-[22px] h-[34px] rounded-[18px] transition-opacity duration-[2000ms] ${
              timeOfDay === 'night' ? 'opacity-100' : 'opacity-55'
            }`} style={{
              background: 'radial-gradient(circle at 50% 70%, rgba(251,146,60,0.42) 0%, rgba(245,158,11,0.22) 38%, transparent 78%)',
            }} />
          </div>
        </div>

        {/* L. 星星挂饰，增强可爱感和空间纵深 */}
        <div className="absolute left-[52%] top-[11%] z-[3] pointer-events-none">
          <div className="absolute left-[6px] top-0 h-10 w-px bg-white/18" />
          {LIVING_MOBILE_STARS.map((star, index) => (
            <motion.div
              key={`mobile-star-${index}`}
              className="absolute"
              style={{ left: star.left, top: star.top }}
              animate={{ y: [0, 6, 0], rotate: [-6, 4, -6] }}
              transition={{ duration: 4 + index * 0.5, repeat: Infinity, ease: 'easeInOut', delay: star.delay }}
            >
              <div className="mx-auto h-5 w-px bg-white/22" />
              <div
                className="rounded-full border border-white/22 bg-white/10 shadow-[0_0_18px_rgba(255,244,194,0.18)]"
                style={{ width: `${star.size}px`, height: `${star.size}px` }}
              />
            </motion.div>
          ))}
        </div>

        {/* M. 宠物互动舞台，强化中心焦点和立体落脚点 */}
        <div className="absolute bottom-[8%] left-1/2 z-[2] h-[20%] w-[42%] -translate-x-1/2 pointer-events-none">
          <div className="absolute inset-x-[3%] bottom-[8%] h-[54%] rounded-[50%]" style={{
            background: 'radial-gradient(ellipse, rgba(255,214,153,0.2) 0%, rgba(210,141,78,0.1) 32%, rgba(15,23,42,0.04) 72%, transparent 100%)',
            boxShadow: '0 18px 34px rgba(15,23,42,0.12)',
          }} />
          <div className="absolute inset-x-[10%] bottom-[18%] h-[32%] rounded-[50%] border border-white/10" style={{
            background: 'radial-gradient(ellipse, rgba(255,248,220,0.12) 0%, rgba(255,232,198,0.05) 55%, transparent 100%)'
          }} />
          <div className="absolute left-1/2 top-[28%] h-[42%] w-[32%] -translate-x-1/2 rounded-[50%] border border-amber-100/10" />
          <div className="absolute left-1/2 top-[40%] h-[16%] w-[12%] -translate-x-1/2 rounded-[50%] bg-amber-100/10" />
        </div>

        {/* N. 靠窗抱枕角，让左侧不再空，增加宠物小窝的陪伴感 */}
        <div className="absolute bottom-[12%] left-[7%] z-[2] h-[20%] w-[22%] pointer-events-none">
          <div className="absolute bottom-[10%] left-[6%] h-[34%] w-[62%] rounded-[40px] bg-rose-200/16 shadow-[0_18px_28px_rgba(15,23,42,0.12)]" />
          <div className="absolute bottom-[16%] left-[28%] h-[28%] w-[34%] rounded-[26px] bg-sky-200/16" />
          <div className="absolute bottom-[24%] left-[48%] h-[22%] w-[22%] rounded-[999px] bg-amber-100/20" />
          <div className="absolute bottom-[20%] left-[12%] h-[16%] w-[18%] rounded-[999px] bg-white/12" />
          <div className="absolute bottom-[26%] left-[50%] h-[22%] w-[14%] rounded-[18px_18px_14px_14px] bg-amber-950/18" />
        </div>

        {/* O. 右侧拱形陈列架，用来承托装饰和灯光，减少空洞感 */}
        <div className="absolute bottom-[31%] right-[6%] z-[2] h-[34%] w-[18%] pointer-events-none">
          <div className="absolute inset-x-[16%] top-0 bottom-[10%] rounded-t-[999px] rounded-b-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(111,78,47,0.08))] shadow-[0_14px_28px_rgba(15,23,42,0.12)]" />
          <div className="absolute inset-x-[24%] top-[10%] h-[4px] rounded-full bg-amber-50/28" />
          <div className="absolute inset-x-[22%] top-[24%] h-[7px] rounded-full bg-amber-900/30" />
          <div className="absolute inset-x-[22%] top-[46%] h-[7px] rounded-full bg-amber-900/30" />
          <div className="absolute left-[28%] top-[16%] h-[18px] w-[18px] rounded-full bg-emerald-200/20 shadow-[0_0_18px_rgba(74,222,128,0.16)]" />
          <div className="absolute left-[48%] top-[13%] h-[34px] w-[10px] rounded-full bg-emerald-500/28" />
          <div className="absolute left-[44%] top-[28%] h-[22px] w-[26px] rounded-[14px] bg-sky-200/14" />
          <div className="absolute left-[31%] top-[43%] h-[24px] w-[32px] rounded-[16px] bg-rose-200/16" />
          <div className="absolute left-[55%] top-[42%] h-[18px] w-[18px] rounded-full bg-amber-100/20" />
        </div>
        </div>

        {/* 7. 内容层 (家具、宠物等) */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
        
        {/* 8. 全局光照滤镜 (氛围感) */}
        <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-[2000ms] z-50 ${sceneConfig.living.lightOverlay[timeOfDay]}`} />
        
        {/* 8b. 夜间额外暖色滤镜 */}
        {timeOfDay === 'night' && (
          <div className="absolute inset-0 pointer-events-none z-50" style={{
            background: 'radial-gradient(ellipse at 90% 20%, rgba(255,200,100,0.06) 0%, transparent 50%)'
          }} />
        )}
        
        {/* 9. 室内尘埃粒子 */}
        <FloatingDust />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden transition-colors duration-[2000ms] bg-gradient-to-b ${sceneConfig.garden.skyColor[timeOfDay]}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-100"
        style={{
          backgroundImage: "url('/assets/pet-home/garden-bg.png')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(224,242,254,0.04),rgba(22,101,52,0.06))]" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.14]">
      <div
        className="absolute inset-x-0 top-0 h-[38%] pointer-events-none"
        style={{
          background:
            timeOfDay === 'night'
              ? 'radial-gradient(circle at 72% 16%, rgba(148,163,184,0.18) 0%, transparent 34%), linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.08) 42%, transparent 100%)'
              : 'radial-gradient(circle at 74% 14%, rgba(255,244,194,0.42) 0%, rgba(255,239,210,0.16) 22%, transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 32%, transparent 100%)',
        }}
      />

      <div className="absolute inset-x-0 top-[8%] h-[16%] pointer-events-none z-[1] overflow-hidden">
        {GARDEN_CLOUDS.map((cloud, index) => (
          <motion.div
            key={`garden-cloud-${index}`}
            className="absolute rounded-[999px] blur-sm"
            style={{
              top: cloud.top,
              left: cloud.left,
              width: cloud.width,
              height: cloud.height,
              opacity: timeOfDay === 'night' ? cloud.opacity * 0.38 : cloud.opacity,
              background:
                timeOfDay === 'night'
                  ? 'linear-gradient(180deg, rgba(203,213,225,0.18), rgba(148,163,184,0.04))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.18))',
              boxShadow: timeOfDay === 'night' ? '0 0 28px rgba(148,163,184,0.08)' : '0 10px 28px rgba(255,255,255,0.16)',
            }}
            animate={{ x: ['0%', '6%', '0%'], opacity: [cloud.opacity * 0.92, cloud.opacity, cloud.opacity * 0.88] }}
            transition={{ duration: cloud.duration, repeat: Infinity, ease: 'easeInOut', delay: index * 2.4 }}
          />
        ))}
      </div>

      <div className="absolute bottom-[27%] left-0 right-0 h-[32%] pointer-events-none z-[1]">
        <svg className="absolute bottom-0 h-full w-full" viewBox="0 0 800 220" preserveAspectRatio="none">
          <path
            d="M0 220 L0 132 Q78 88 154 110 Q242 64 332 96 Q420 40 520 86 Q610 56 700 104 Q754 90 800 114 L800 220Z"
            fill={timeOfDay === 'night' ? 'rgba(44,72,58,0.34)' : 'rgba(129,152,122,0.46)'}
          />
          <path
            d="M0 220 L0 156 Q90 120 178 136 Q268 98 362 126 Q470 90 566 126 Q684 96 800 140 L800 220Z"
            fill={timeOfDay === 'night' ? 'rgba(50,89,64,0.42)' : 'rgba(113,144,95,0.62)'}
          />
          <path
            d="M0 220 L0 176 Q110 150 214 162 Q314 134 420 154 Q548 128 650 154 Q738 136 800 160 L800 220Z"
            fill={timeOfDay === 'night' ? 'rgba(28,64,39,0.62)' : 'rgba(82,122,61,0.82)'}
          />
        </svg>
        <div
          className="absolute inset-x-0 bottom-[18%] h-[18%] blur-2xl"
          style={{
            background:
              timeOfDay === 'night'
                ? 'linear-gradient(180deg, rgba(125,211,252,0.05), transparent)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)',
          }}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[31%] transition-colors duration-[2000ms]">
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(to bottom, ${timeOfDay === 'night' ? '#17321a' : '#6f9650'} 0%, ${timeOfDay === 'night' ? '#102411' : '#4f7b39'} 52%, ${timeOfDay === 'night' ? '#0b160c' : '#2e4f22'} 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.12,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(rgba(180,220,170,0.12) 1px, transparent 1px), linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 22%, transparent 56%)',
            backgroundSize: '14px 14px, 10px 10px, 100% 100%',
            backgroundPosition: '0 0, 7px 7px, 0 0',
          }}
        />
        <div
          className="absolute inset-x-0 top-[5%] h-[12%]"
          style={{
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(66,98,51,0.26), transparent)'
              : 'linear-gradient(180deg, rgba(229,244,211,0.22), transparent)',
          }}
        />
        <div
          className="absolute inset-x-0 top-[28%] h-[16%]"
          style={{
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(20,46,24,0.18), transparent)'
              : 'linear-gradient(180deg, rgba(94,132,68,0.2), transparent)',
          }}
        />
      </div>

      <div className="absolute bottom-[28%] left-0 right-0 h-[8%] pointer-events-none z-[2]">
        <div
          className="absolute inset-x-[2%] bottom-0 h-[72%] rounded-[999px]"
          style={{
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(27,53,30,0.86), rgba(11,26,14,0.94))'
              : 'linear-gradient(180deg, rgba(70,112,56,0.78), rgba(38,79,32,0.9))',
            boxShadow: '0 12px 26px rgba(15,23,42,0.14)',
          }}
        />
      </div>

      <div className="absolute bottom-[20.8%] left-[5%] right-[4%] h-[7.4%] pointer-events-none z-[1]">
        <div
          className="absolute inset-0 rounded-[999px]"
          style={{
            background: timeOfDay === 'night'
              ? 'linear-gradient(180deg, rgba(88,58,28,0.4), rgba(46,28,12,0.64))'
              : 'linear-gradient(180deg, rgba(158,114,66,0.34), rgba(105,69,32,0.54))',
            boxShadow: 'inset 0 1px 0 rgba(255,232,196,0.12)',
          }}
        />
        <div className="absolute inset-x-[5%] top-[34%] h-[2px] rounded-full bg-white/10" />
      </div>

      <div className="absolute inset-0 pointer-events-none z-[1]">
        {Array.from({ length: 16 }).map((_, index) => (
          <motion.div
            key={`dew-${index}`}
            className="absolute rounded-full"
            style={{
              left: `${8 + (index * 6.3) % 84}%`,
              top: `${58 + (index % 5) * 6}%`,
              width: `${index % 3 === 0 ? 8 : 5}px`,
              height: `${index % 3 === 0 ? 8 : 5}px`,
              background: timeOfDay === 'night' ? 'rgba(224,242,254,0.18)' : 'rgba(255,255,255,0.22)',
              boxShadow: timeOfDay === 'night' ? '0 0 8px rgba(224,242,254,0.14)' : '0 0 8px rgba(255,255,255,0.16)',
            }}
            animate={{ opacity: [0.24, 0.62, 0.24], y: [0, -2, 0] }}
            transition={{ duration: 3 + (index % 4), repeat: Infinity, delay: index * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="absolute bottom-[5%] left-[40%] h-[22%] w-[20%] pointer-events-none z-[1]">
        {[0, 18, 38, 56, 75].map((top, i) => (
          <div key={i}
            className="absolute rounded-md"
            style={{
              top: `${top}%`,
              left: `${20 + (i % 2) * 20}%`,
              width: `${50 + (i % 3) * 8}%`,
              height: '16%',
              background: `rgba(${150 + i * 10}, ${140 + i * 8}, ${120 + i * 5}, ${timeOfDay === 'night' ? 0.2 : 0.35})`,
              borderRadius: '4px',
              border: `1px solid rgba(100,90,70,${timeOfDay === 'night' ? 0.1 : 0.15})`
            }}
          />
        ))}
      </div>

      <div className="absolute left-[49%] bottom-[31%] z-[3] pointer-events-none">
        <div className="relative h-[130px] w-[150px]">
          <div className="absolute left-[10px] right-[10px] top-[16px] h-[14px] rounded-[12px]" style={{
            background: 'linear-gradient(180deg, rgba(145,94,54,0.7) 0%, rgba(101,67,33,0.75) 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }} />
          <div className="absolute left-[22px] right-[22px] top-[2px] h-[26px] rounded-[18px]" style={{
            background: 'linear-gradient(180deg, rgba(244,205,154,0.72) 0%, rgba(180,117,69,0.82) 100%)',
          }} />
          <div className="absolute left-[18px] top-[20px] h-[74px] w-[8px] rounded-full bg-amber-900/45" />
          <div className="absolute right-[18px] top-[20px] h-[74px] w-[8px] rounded-full bg-amber-900/45" />
          <div className="absolute left-[36px] right-[36px] bottom-[16px] h-[12px] rounded-full bg-stone-200/25" />
          <div className="absolute left-[34px] right-[34px] bottom-[12px] h-[6px] rounded-full bg-stone-800/14 blur-[1px]" />
          <div className="absolute left-[8px] right-[8px] top-[28px] h-[42px] rounded-[18px]" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          }} />
        </div>
      </div>

      <div className="absolute right-[20%] bottom-[24%] z-[2] h-[80px] w-[160px] pointer-events-none">
        <div
          className="absolute inset-0 rounded-[56%_44%_58%_42%/50%_46%_54%_50%] border border-cyan-100/18"
          style={{
            background:
              timeOfDay === 'night'
                ? 'radial-gradient(ellipse at 50% 42%, rgba(56,189,248,0.18) 0%, rgba(21,94,117,0.28) 42%, rgba(12,22,39,0.14) 100%)'
                : 'radial-gradient(ellipse at 50% 38%, rgba(219,234,254,0.54) 0%, rgba(56,189,248,0.24) 42%, rgba(14,116,144,0.14) 100%)',
            boxShadow: 'inset 0 6px 18px rgba(255,255,255,0.1), 0 10px 18px rgba(15,23,42,0.1)',
          }}
        />
        <div className="absolute inset-[9%] rounded-[56%_44%_58%_42%/50%_46%_54%_50%] border border-white/10 bg-white/5" />
        <motion.div
          className="absolute left-[18%] top-[34%] h-[12px] w-[42px] rounded-full bg-white/15"
          animate={{ x: [0, 16, 0], opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute -left-[8px] bottom-[8px] h-[22px] w-[10px] rounded-full bg-emerald-900/30" />
        <div className="absolute -left-[2px] bottom-[12px] h-[20px] w-[8px] rounded-full bg-emerald-700/32" />
        <div className="absolute right-[8px] bottom-[6px] h-[18px] w-[8px] rounded-full bg-emerald-900/24" />
      </div>

      <div className="absolute bottom-[25%] left-[5%] pointer-events-none z-[2]">
        <div className="relative h-16 w-28">
          <div className="absolute bottom-0 left-2 h-8 w-24 rounded-[50%]" style={{
            background: 'radial-gradient(ellipse, rgba(34,139,34,0.6) 0%, rgba(34,139,34,0.2) 70%, transparent 100%)'
          }} />
          {[[8, 2, '#F472B6'], [20, 0, '#FB923C'], [32, 3, '#A78BFA'], [16, 6, '#F9A8D4'], [28, 1, '#FDE047']].map(([x, y, c], i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${x}px`, top: `${y}px`,
              width: '8px', height: '8px',
              background: c as string,
              opacity: 0.7,
              boxShadow: `0 0 4px ${c}`
            }} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-[20.6%] left-[20%] right-[12%] z-[2] h-[6.6%] pointer-events-none">
        {GARDEN_STEPPING_STONES.map((stone, index) => (
          <div
            key={`stone-${index}`}
            className="absolute rounded-[999px] border border-white/8"
            style={{
              left: stone.left,
              width: `${stone.width}px`,
              height: `${stone.height}px`,
              transform: `rotate(${stone.rotate}deg)`,
              background: timeOfDay === 'night'
                ? 'linear-gradient(180deg, rgba(71,85,105,0.52), rgba(30,41,59,0.8))'
                : 'linear-gradient(180deg, rgba(226,232,240,0.72), rgba(148,163,184,0.52))',
              boxShadow: '0 10px 18px rgba(15,23,42,0.1)',
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-[27%] right-[8%] pointer-events-none z-[2]">
        <div className="relative h-14 w-24">
          <div className="absolute bottom-0 left-2 h-7 w-20 rounded-[50%]" style={{
            background: 'radial-gradient(ellipse, rgba(22,120,22,0.55) 0%, rgba(22,120,22,0.15) 70%, transparent 100%)'
          }} />
          {[[6, 1, '#EC4899'], [16, 3, '#8B5CF6'], [26, 0, '#F59E0B'], [12, 5, '#EF4444']].map(([x, y, c], i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${x}px`, top: `${y}px`,
              width: '7px', height: '7px',
              background: c as string,
              opacity: 0.65
            }} />
          ))}
        </div>
      </div>

      <div className="absolute right-[3%] top-[16%] z-[3] pointer-events-none">
        <div className="absolute right-[22px] top-0 h-[96px] w-px bg-white/12" />
        {GARDEN_LANTERNS.map((lantern, index) => (
          <motion.div
            key={`garden-lantern-${index}`}
            className="absolute"
            style={{ right: lantern.right, top: lantern.top }}
            animate={{ y: [0, 5, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 4.4 + index * 0.6, repeat: Infinity, ease: 'easeInOut', delay: lantern.delay }}
          >
            <div className="mx-auto h-6 w-px bg-white/16" />
            <div className="relative h-7 w-6 rounded-[10px] border border-white/12 bg-slate-950/22">
              <div className="absolute inset-[3px] rounded-[8px]" style={{ background: lantern.glow }} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute bottom-[28%] left-0 right-0 z-[3] flex h-10 items-end pointer-events-none">
        <div className="flex w-full justify-between px-2" style={{ gap: '12px' }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="flex-shrink-0" style={{
              width: '6px',
              height: `${22 + (i % 2) * 8}px`,
              background: `linear-gradient(to bottom, rgba(139,90,43,${timeOfDay === 'night' ? 0.3 : 0.5}), rgba(100,65,25,${timeOfDay === 'night' ? 0.25 : 0.45}))`,
              borderRadius: '1px 1px 0 0',
              borderTop: `2px solid rgba(160,110,50,${timeOfDay === 'night' ? 0.2 : 0.3})`
            }} />
          ))}
        </div>
        <div className="absolute bottom-[40%] left-0 right-0 h-[3px]" style={{
          background: `rgba(120,80,30,${timeOfDay === 'night' ? 0.25 : 0.4})`
        }} />
        <div className="absolute bottom-[70%] left-0 right-0 h-[3px]" style={{
          background: `rgba(120,80,30,${timeOfDay === 'night' ? 0.2 : 0.35})`
        }} />
      </div>

      <div className="absolute bottom-[28%] right-[4%] pointer-events-none z-[4]">
        <div className="mx-auto h-28 w-8 rounded-md" style={{
          background: `linear-gradient(90deg, rgba(100,65,25,${timeOfDay === 'night' ? 0.4 : 0.65}), rgba(120,80,35,${timeOfDay === 'night' ? 0.35 : 0.55}), rgba(100,65,25,${timeOfDay === 'night' ? 0.4 : 0.65}))`,
        }} />
        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
          <div className="h-24 w-32 rounded-full" style={{
            background: `radial-gradient(ellipse at 40% 40%, rgba(60,160,60,${timeOfDay === 'night' ? 0.35 : 0.6}) 0%, rgba(30,120,30,${timeOfDay === 'night' ? 0.3 : 0.5}) 50%, rgba(20,80,20,${timeOfDay === 'night' ? 0.2 : 0.35}) 100%)`
          }} />
          <div className="absolute top-2 left-4 h-16 w-24 rounded-full" style={{
            background: `radial-gradient(ellipse, rgba(80,180,80,${timeOfDay === 'night' ? 0.2 : 0.35}) 0%, transparent 70%)`
          }} />
        </div>
      </div>

      <div className="absolute pointer-events-none z-[2]" style={{ left: '3%', bottom: '28%' }}>
        <div className="relative" style={{ width: '130px', height: '120px' }}>
          <div className="absolute" style={{
            right: '22px', top: '0', width: '12px', height: '28px',
            background: `linear-gradient(90deg, ${timeOfDay === 'night' ? '#5A3D2B' : '#8B6843'}, ${timeOfDay === 'night' ? '#6B4A35' : '#A0784F'})`,
            borderRadius: '2px 2px 0 0'
          }} />
          {timeOfDay === 'night' && (
            <>
              <motion.div
                className="absolute h-3 w-3 rounded-full bg-gray-400/30"
                style={{ right: '23px', top: '-6px' }}
                animate={{ y: [0, -15], opacity: [0.3, 0], scale: [0.5, 1.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute h-2.5 w-2.5 rounded-full bg-gray-300/20"
                style={{ right: '26px', top: '-4px' }}
                animate={{ y: [0, -18], opacity: [0.2, 0], scale: [0.4, 1.1] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
              />
            </>
          )}
          <svg className="absolute w-full" style={{ top: '16px', height: '42px' }} viewBox="0 0 130 42" preserveAspectRatio="none">
            <polygon points="2,42 65,2 128,42" fill={timeOfDay === 'night' ? '#5C3322' : '#B85C38'} />
            <polygon points="8,42 65,6 122,42" fill={timeOfDay === 'night' ? '#6B3D2E' : '#CD6B45'} />
          </svg>
          <div className="absolute bottom-0 left-[10px] right-[10px] rounded-b-sm" style={{
            top: '52px',
            background: timeOfDay === 'night'
              ? 'linear-gradient(to bottom, #4A3B28, #3D3020)'
              : 'linear-gradient(to bottom, #F5E6C8, #E8D5AA)',
            border: `1px solid ${timeOfDay === 'night' ? 'rgba(60,45,25,0.5)' : 'rgba(180,150,100,0.5)'}`
          }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
              width: '24px', height: '36px',
              background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843',
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${timeOfDay === 'night' ? '#3A200A' : '#6B4F30'}`,
              borderBottom: 'none'
            }}>
              <div className="absolute right-[5px] top-[55%] h-[3px] w-[3px] rounded-full bg-yellow-600" />
            </div>
            <div className="absolute top-[8px] left-[10px]" style={{
              width: '20px', height: '18px',
              background: timeOfDay === 'night' ? 'rgba(255,200,100,0.3)' : 'rgba(135,206,250,0.5)',
              border: `2px solid ${timeOfDay === 'night' ? '#4A2E15' : '#8B6843'}`,
              borderRadius: '2px',
              boxShadow: timeOfDay === 'night' ? '0 0 8px rgba(255,200,100,0.25)' : 'none'
            }}>
              <div className="absolute left-0 right-0 top-1/2 h-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
              <div className="absolute bottom-0 left-1/2 top-0 w-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
            </div>
            <div className="absolute right-[10px] top-[8px]" style={{
              width: '20px', height: '18px',
              background: timeOfDay === 'night' ? 'rgba(255,200,100,0.3)' : 'rgba(135,206,250,0.5)',
              border: `2px solid ${timeOfDay === 'night' ? '#4A2E15' : '#8B6843'}`,
              borderRadius: '2px',
              boxShadow: timeOfDay === 'night' ? '0 0 8px rgba(255,200,100,0.25)' : 'none'
            }}>
              <div className="absolute left-0 right-0 top-1/2 h-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
              <div className="absolute bottom-0 left-1/2 top-0 w-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute pointer-events-none z-[1]" style={{ left: '3%', bottom: '8%', width: '38%', height: '16%' }}>
        <div className="absolute -top-[10%] left-[4%] right-[6%] h-[14%] rounded-[18px] bg-amber-950/30 blur-lg" />
        <div
          className="absolute inset-x-[1%] bottom-0 top-[12%] rounded-[30px]"
          style={{
            background: 'linear-gradient(180deg, rgba(116,72,33,0.92), rgba(73,41,17,0.98))',
            boxShadow: '0 18px 30px rgba(15,23,42,0.16), inset 0 2px 0 rgba(255,230,194,0.12)',
          }}
        />
        <div
          className="absolute inset-x-[2.6%] top-[10%] h-[16%] rounded-[20px]"
          style={{
            background: 'linear-gradient(180deg, rgba(163,109,58,0.82), rgba(116,74,34,0.96))',
            boxShadow: '0 10px 20px rgba(15,23,42,0.12)',
          }}
        />
        <div className="relative h-full w-full rounded-[28px] border border-amber-950/22 p-[10px]">
          <div className="absolute inset-[8px] rounded-[24px] border border-amber-50/6" />
          <div
            className="absolute inset-x-[4%] bottom-[8%] top-[24%] rounded-[24px]"
            style={{
              background: 'linear-gradient(180deg, rgba(85,51,22,0.96), rgba(60,34,14,0.98))',
              boxShadow: 'inset 0 12px 18px rgba(255,219,168,0.05), inset 0 -12px 22px rgba(18,10,4,0.34)',
            }}
          />
          <div className="relative grid h-full w-full grid-cols-4 grid-rows-2 gap-[5px] pt-[20px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[14px]"
                style={{
                  background: timeOfDay === 'night'
                    ? 'radial-gradient(ellipse at 50% 28%, rgba(122,83,44,0.46), rgba(62,38,18,0.72) 58%, rgba(40,24,11,0.86) 100%)'
                    : 'radial-gradient(ellipse at 50% 28%, rgba(146,97,50,0.56), rgba(96,61,28,0.76) 58%, rgba(59,35,15,0.9) 100%)',
                  border: `1px solid ${timeOfDay === 'night' ? 'rgba(94,65,36,0.34)' : 'rgba(116,76,36,0.38)'}`,
                  boxShadow: 'inset 0 10px 14px rgba(255,221,178,0.04), inset 0 -10px 14px rgba(19,10,5,0.32)',
                }}
              >
                <div
                  className="h-full w-full rounded-[14px]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${timeOfDay === 'night' ? 'rgba(48,28,12,0.26)' : 'rgba(76,46,18,0.18)'} 3px, ${timeOfDay === 'night' ? 'rgba(48,28,12,0.26)' : 'rgba(76,46,18,0.18)'} 4px)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-[11%] bottom-[24%] z-[2] pointer-events-none">
        <div className="relative h-[122px] w-[144px]">
          <div className="absolute left-[14px] right-[14px] bottom-[18px] h-[58px] rounded-[24px] border border-amber-100/18 bg-[linear-gradient(180deg,rgba(255,250,234,0.2),rgba(118,84,46,0.18))] shadow-[0_18px_30px_rgba(15,23,42,0.14)]" />
          <div className="absolute left-[26px] right-[26px] bottom-[60px] h-[32px] rounded-t-[999px] rounded-b-[10px] bg-[linear-gradient(180deg,rgba(164,110,62,0.94),rgba(112,70,36,0.96))]" />
          <div className="absolute left-[34px] right-[34px] bottom-[78px] h-[12px] rounded-full bg-amber-200/24" />
          <div className="absolute left-[48px] bottom-[30px] h-[28px] w-[44px] rounded-[18px_18px_16px_16px] bg-amber-950/18" />
          <div className="absolute left-[62px] bottom-[44px] h-[12px] w-[16px] rounded-full bg-amber-100/16" />
          <div className="absolute left-[98px] bottom-[68px] h-[20px] w-[8px] rounded-full bg-amber-900/36" />
          <motion.div
            className="absolute left-[88px] bottom-[80px] flex gap-1"
            animate={{ y: [0, -2, 0], rotate: [-4, 3, -4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="h-[12px] w-[10px] rounded-[6px_6px_10px_10px] bg-rose-300/80" />
            <span className="h-[11px] w-[10px] rounded-[6px_6px_10px_10px] bg-amber-200/88" />
            <span className="h-[12px] w-[10px] rounded-[6px_6px_10px_10px] bg-sky-300/76" />
          </motion.div>
          <div className="absolute left-[16px] bottom-[10px] h-[10px] w-[112px] rounded-full bg-slate-950/16 blur-[5px]" />
          <div className="absolute left-[20px] bottom-[82px] h-[12px] w-[12px] rounded-full bg-lime-100/18" />
        </div>
      </div>

      <div className="absolute left-[38%] bottom-[26%] z-[3] pointer-events-none">
        <div className="relative h-[70px] w-[70px]">
          <div className="absolute bottom-[12px] left-[8px] h-[22px] w-[44px] rounded-[10px] bg-amber-900/28" />
          <div className="absolute bottom-[18px] left-[12px] h-[22px] w-[38px] rounded-[10px] bg-amber-700/34" />
          <div className="absolute bottom-[42px] left-[48px] h-[22px] w-[4px] rotate-[22deg] rounded-full bg-amber-900/40" />
          <div className="absolute bottom-[20px] left-[50px] h-[10px] w-[12px] rounded-[6px] bg-slate-200/26" />
          <div className="absolute bottom-[38px] left-[58px] h-[22px] w-[4px] -rotate-[18deg] rounded-full bg-amber-900/40" />
        </div>
      </div>

      {(timeOfDay === 'day' || timeOfDay === 'morning') && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {GARDEN_BUTTERFLIES.map((butterfly, index) => (
            <motion.div
              key={index}
              className="absolute"
              style={{ left: `${butterfly.x}%`, top: `${butterfly.y}%` }}
              animate={{
                x: [0, 24, -14, 8, 0],
                y: [0, -14, -6, -18, 0],
                rotate: [0, 8, -10, 5, 0]
              }}
              transition={{ duration: butterfly.duration, repeat: Infinity, ease: 'easeInOut', delay: index * 2.5 }}
            >
              <div className="relative h-4 w-5">
                <span className="absolute left-0 top-[2px] h-3 w-3 rounded-[90%_65%_85%_70%] -rotate-[18deg]" style={{ background: butterfly.color }} />
                <span className="absolute right-0 top-[2px] h-3 w-3 rounded-[65%_90%_70%_85%] rotate-[18deg]" style={{ background: butterfly.color }} />
                <span className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 rounded-full bg-slate-700/60" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {(timeOfDay === 'day' || timeOfDay === 'dusk') && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.div
              key={`petal-${index}`}
              className="absolute h-[8px] w-[12px] rounded-full"
              style={{
                left: `${12 + index * 10}%`,
                top: `${18 + (index % 4) * 8}%`,
                background: index % 2 === 0 ? 'rgba(253,164,175,0.52)' : 'rgba(254,240,138,0.46)',
                boxShadow: '0 0 8px rgba(255,255,255,0.12)',
              }}
              animate={{
                x: [0, 18, -10, 0],
                y: [0, 26, 48, 72],
                rotate: [0, 40, -25, 0],
                opacity: [0, 0.75, 0.55, 0],
              }}
              transition={{
                duration: 7 + index * 0.5,
                repeat: Infinity,
                delay: index * 0.6,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {timeOfDay === 'night' && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {GARDEN_FIREFLIES.map((firefly, index) => (
            <motion.div
              key={index}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                left: firefly.left,
                top: firefly.top,
                background: '#fef08a',
                boxShadow: '0 0 6px 2px rgba(254,240,138,0.6)'
              }}
              animate={{
                opacity: [0, 0.8, 0.3, 0.9, 0],
                x: firefly.x,
                y: firefly.y
              }}
              transition={{
                duration: firefly.duration,
                repeat: Infinity,
                delay: firefly.delay,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      )}
      
      <div className="absolute right-[11%] bottom-[22%] z-[2] h-[110px] w-[168px] pointer-events-none">
        <motion.div
          className="absolute inset-0 rounded-[42%_58%_48%_52%/48%_44%_56%_52%] border border-rose-100/18"
          style={{
            background:
              timeOfDay === 'night'
                ? 'linear-gradient(180deg, rgba(93,48,67,0.16), rgba(41,22,35,0.24))'
                : 'linear-gradient(180deg, rgba(255,233,241,0.28), rgba(255,203,223,0.14))',
            boxShadow: '0 16px 28px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute left-[18px] top-[24px] h-[24px] w-[46px] rounded-[18px] bg-rose-100/30" />
          <div className="absolute left-[54px] top-[18px] h-[18px] w-[18px] rounded-full bg-amber-100/34" />
          <div className="absolute right-[18px] top-[28px] h-[18px] w-[54px] rounded-[18px] bg-emerald-100/20" />
          <div className="absolute left-[22px] bottom-[24px] h-[20px] w-[24px] rounded-full bg-fuchsia-200/32" />
          <div className="absolute left-[46px] bottom-[20px] h-[26px] w-[70px] rounded-[20px] bg-white/12" />
          <div className="absolute right-[24px] bottom-[22px] h-[18px] w-[18px] rounded-full bg-amber-200/34" />
        </motion.div>
      </div>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
      
      <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-[2000ms] z-50 ${sceneConfig.garden.lightOverlay[timeOfDay]}`} />
    </div>
  );
}
function WindowView({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const bgColors = {
    morning: 'bg-sky-200',
    day: 'bg-sky-400',
    dusk: 'bg-orange-300',
    night: 'bg-[#7187bd]'
  };

  return (
    <div className={`w-full h-full transition-colors duration-[3000ms] ${bgColors[timeOfDay]} relative`}>
      <motion.div 
        className="absolute h-12 w-12 rounded-full"
        animate={{
          top: timeOfDay === 'day' ? '10%' : timeOfDay === 'dusk' ? '60%' : '80%',
          left: timeOfDay === 'morning' ? '20%' : timeOfDay === 'day' ? '50%' : '80%',
          backgroundColor: timeOfDay === 'night' ? '#fcd34d' : '#fef3c7',
          boxShadow: timeOfDay === 'night' ? '0 0 10px #fcd34d' : '0 0 20px #fef3c7'
        }}
        transition={{ duration: 2 }}
      />
      
      {WINDOW_CLOUDS.map((cloud, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{ top: cloud.top, left: cloud.left, opacity: cloud.opacity }}
          animate={{ x: [0, 110, 0] }}
          transition={{ duration: cloud.duration, repeat: Infinity, ease: 'linear' }}
        >
          <div className="relative" style={{ width: cloud.width, height: cloud.height }}>
            <span className="absolute bottom-0 left-[10%] h-[58%] w-[34%] rounded-full bg-white/72" />
            <span className="absolute left-[30%] top-0 h-[74%] w-[36%] rounded-full bg-white/78" />
            <span className="absolute bottom-[6%] right-[8%] h-[54%] w-[30%] rounded-full bg-white/68" />
            <span className="absolute inset-x-[14%] bottom-0 h-[40%] rounded-full bg-white/62 blur-[1px]" />
          </div>
        </motion.div>
      ))}
      
      {timeOfDay === 'night' && (
        <>
          <div className="absolute top-4 left-10 h-1 w-1 rounded-full bg-white animate-pulse" />
          <div className="absolute top-12 left-24 h-1 w-1 rounded-full bg-white animate-pulse delay-75" />
          <div className="absolute top-8 left-40 h-1 w-1 rounded-full bg-white animate-pulse delay-150" />
        </>
      )}
    </div>
  );
}

function FloatingDust() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {FLOATING_DUST_PARTICLES.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute h-1 w-1 rounded-full bg-white opacity-40"
          initial={{
            x: particle.x,
            y: particle.y,
            scale: particle.scale
          }}
          animate={{
            y: [particle.y, `calc(${particle.y} + ${particle.driftY}px)`],
            x: [particle.x, `calc(${particle.x} + ${particle.driftX}px)`],
            opacity: [0.38, 0.08, 0.32]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: particle.delay
          }}
        />
      ))}
    </div>
  );
}

