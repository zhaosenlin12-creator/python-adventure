'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type TimeOfDay = 'morning' | 'day' | 'dusk' | 'night';

interface CozyRoomBackgroundProps {
  scene: 'living' | 'garden';
  children?: React.ReactNode;
}

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
        night: 'bg-slate-800'
      },
      floorColor: {
        morning: 'from-amber-100 to-orange-100',
        day: 'from-amber-200 to-orange-200',
        dusk: 'from-orange-200 to-amber-300',
        night: 'from-slate-700 to-slate-800'
      },
      lightOverlay: {
        morning: 'bg-blue-200/10',
        day: 'bg-yellow-200/5',
        dusk: 'bg-orange-500/20',
        night: 'bg-blue-900/40'
      }
    },
    garden: {
      // 庭院配置稍后完善
      skyColor: {
        morning: 'from-blue-300 via-blue-200 to-orange-200',
        day: 'from-sky-400 via-sky-200 to-green-100',
        dusk: 'from-indigo-400 via-purple-300 to-orange-300',
        night: 'from-slate-900 via-slate-800 to-slate-900'
      }
    }
  };

  // 渲染客厅
  if (scene === 'living') {
    return (
      <div className={`relative w-full h-full overflow-hidden transition-colors duration-[2000ms] ${sceneConfig.living.wallColor[timeOfDay]}`}>
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

        {/* D. 装饰画（右墙高处） */}
        <div className="absolute top-[22%] right-[20%] pointer-events-none z-[2]">
          <div className="w-20 h-16 rounded-sm border-2 border-amber-800/20 overflow-hidden" style={{
            background: 'linear-gradient(135deg, #dce8d0 0%, #a8c896 40%, #7ba668 70%, #8bc078 100%)',
            boxShadow: '2px 3px 8px rgba(0,0,0,0.15)'
          }}>
            {/* 小山 */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%]" style={{
              background: 'linear-gradient(to bottom, transparent, rgba(100,160,80,0.5))'
            }} />
            {/* 小太阳 */}
            <div className="absolute top-2 right-3 w-3 h-3 rounded-full bg-yellow-200/60" />
          </div>
          {/* 挂钩 */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-700/30" />
        </div>

        {/* E. 小装饰画2（左窗下方） */}
        <div className="absolute top-[45%] left-[6%] pointer-events-none z-[2]">
          <div className="w-14 h-14 rounded-sm border-2 border-amber-700/15 overflow-hidden" style={{
            background: 'linear-gradient(to bottom, #fceabb 0%, #f8b500 100%)',
            boxShadow: '1px 2px 6px rgba(0,0,0,0.12)'
          }}>
            <div className="absolute bottom-1 left-1 right-1 h-[40%] bg-amber-600/20 rounded-t" />
          </div>
        </div>

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

  // 渲染庭院 - 丰富场景
  return (
    <div className={`relative w-full h-full overflow-hidden transition-colors duration-[2000ms] bg-gradient-to-b ${sceneConfig.garden.skyColor[timeOfDay]}`}>
      
      {/* 远山层叠 */}
      <div className="absolute bottom-[28%] left-0 right-0 h-[30%] pointer-events-none">
        {/* 远山1 */}
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          <path d="M0 200 L0 120 Q100 60 200 100 Q300 40 400 80 Q500 30 600 90 Q700 50 800 100 L800 200Z" fill="rgba(40,80,30,0.25)" />
          <path d="M0 200 L0 140 Q150 80 280 120 Q400 70 520 110 Q650 65 800 120 L800 200Z" fill="rgba(50,100,40,0.3)" />
        </svg>
      </div>
      
      {/* 草地 + 纹理 */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] transition-colors duration-[2000ms]">
        <div className="w-full h-full" style={{
          background: `linear-gradient(to bottom, 
            ${timeOfDay === 'night' ? '#1a3a15' : '#4ade50'} 0%, 
            ${timeOfDay === 'night' ? '#0f2a0d' : '#22863a'} 50%, 
            ${timeOfDay === 'night' ? '#0a1f08' : '#166534'} 100%)`
        }} />
        {/* 草地纹理 */}
        <div className="absolute inset-0" style={{
          opacity: 0.15,
          backgroundImage: `
            radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            radial-gradient(rgba(200,255,200,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '14px 14px, 10px 10px',
          backgroundPosition: '0 0, 7px 7px'
        }} />
        {/* 草地上边缘柔化 */}
        <div className="absolute top-0 left-0 right-0 h-4" style={{
          background: 'linear-gradient(to bottom, rgba(100,200,80,0.3), transparent)'
        }} />
      </div>
      
      {/* 石板小路 */}
      <div className="absolute bottom-[5%] left-[40%] w-[20%] h-[22%] pointer-events-none z-[1]">
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

      {/* 花丛（左下） */}
      <div className="absolute bottom-[25%] left-[5%] pointer-events-none z-[2]">
        <div className="relative w-28 h-16">
          {/* 叶子层 */}
          <div className="absolute bottom-0 left-2 w-24 h-8 rounded-[50%]" style={{
            background: 'radial-gradient(ellipse, rgba(34,139,34,0.6) 0%, rgba(34,139,34,0.2) 70%, transparent 100%)'
          }} />
          {/* 花朵 */}
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

      {/* 花丛（右下） */}
      <div className="absolute bottom-[27%] right-[8%] pointer-events-none z-[2]">
        <div className="relative w-24 h-14">
          <div className="absolute bottom-0 left-2 w-20 h-7 rounded-[50%]" style={{
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

      {/* 木栅栏（底部边界） */}
      <div className="absolute bottom-[28%] left-0 right-0 h-10 pointer-events-none z-[3] flex items-end">
        <div className="w-full flex justify-between px-2" style={{ gap: '12px' }}>
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
        {/* 栅栏横梁 */}
        <div className="absolute bottom-[40%] left-0 right-0 h-[3px]" style={{
          background: `rgba(120,80,30,${timeOfDay === 'night' ? 0.25 : 0.4})`
        }} />
        <div className="absolute bottom-[70%] left-0 right-0 h-[3px]" style={{
          background: `rgba(120,80,30,${timeOfDay === 'night' ? 0.2 : 0.35})`
        }} />
      </div>

      {/* 大树（右侧） */}
      <div className="absolute bottom-[28%] right-[4%] pointer-events-none z-[4]">
        {/* 树干 */}
        <div className="w-8 h-28 mx-auto rounded-md" style={{
          background: `linear-gradient(90deg, rgba(100,65,25,${timeOfDay === 'night' ? 0.4 : 0.65}), rgba(120,80,35,${timeOfDay === 'night' ? 0.35 : 0.55}), rgba(100,65,25,${timeOfDay === 'night' ? 0.4 : 0.65}))`,
        }} />
        {/* 树冠 */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-24 rounded-full" style={{
            background: `radial-gradient(ellipse at 40% 40%, rgba(60,160,60,${timeOfDay === 'night' ? 0.35 : 0.6}) 0%, rgba(30,120,30,${timeOfDay === 'night' ? 0.3 : 0.5}) 50%, rgba(20,80,20,${timeOfDay === 'night' ? 0.2 : 0.35}) 100%)`
          }} />
          <div className="absolute top-2 left-4 w-24 h-16 rounded-full" style={{
            background: `radial-gradient(ellipse, rgba(80,180,80,${timeOfDay === 'night' ? 0.2 : 0.35}) 0%, transparent 70%)`
          }} />
        </div>
      </div>

      {/* 可爱小屋（左侧，栅栏后方） */}
      <div className="absolute pointer-events-none z-[2]" style={{ left: '3%', bottom: '28%' }}>
        <div className="relative" style={{ width: '130px', height: '120px' }}>
          {/* 烟囱 */}
          <div className="absolute" style={{
            right: '22px', top: '0', width: '12px', height: '28px',
            background: `linear-gradient(90deg, ${timeOfDay === 'night' ? '#5A3D2B' : '#8B6843'}, ${timeOfDay === 'night' ? '#6B4A35' : '#A0784F'})`,
            borderRadius: '2px 2px 0 0'
          }} />
          {/* 夜晚烟囱冒烟 */}
          {timeOfDay === 'night' && (
            <>
              <motion.div
                className="absolute w-3 h-3 rounded-full bg-gray-400/30"
                style={{ right: '23px', top: '-6px' }}
                animate={{ y: [0, -15], opacity: [0.3, 0], scale: [0.5, 1.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute w-2.5 h-2.5 rounded-full bg-gray-300/20"
                style={{ right: '26px', top: '-4px' }}
                animate={{ y: [0, -18], opacity: [0.2, 0], scale: [0.4, 1.1] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
              />
            </>
          )}
          {/* 屋顶 */}
          <svg className="absolute w-full" style={{ top: '16px', height: '42px' }} viewBox="0 0 130 42" preserveAspectRatio="none">
            <polygon points="2,42 65,2 128,42" fill={timeOfDay === 'night' ? '#5C3322' : '#B85C38'} />
            <polygon points="8,42 65,6 122,42" fill={timeOfDay === 'night' ? '#6B3D2E' : '#CD6B45'} />
          </svg>
          {/* 墙体 */}
          <div className="absolute left-[10px] right-[10px] bottom-0 rounded-b-sm" style={{
            top: '52px',
            background: timeOfDay === 'night'
              ? 'linear-gradient(to bottom, #4A3B28, #3D3020)'
              : 'linear-gradient(to bottom, #F5E6C8, #E8D5AA)',
            border: `1px solid ${timeOfDay === 'night' ? 'rgba(60,45,25,0.5)' : 'rgba(180,150,100,0.5)'}`
          }}>
            {/* 门 */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
              width: '24px', height: '36px',
              background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843',
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${timeOfDay === 'night' ? '#3A200A' : '#6B4F30'}`,
              borderBottom: 'none'
            }}>
              <div className="absolute right-[5px] top-[55%] w-[3px] h-[3px] rounded-full bg-yellow-600" />
            </div>
            {/* 左窗 */}
            <div className="absolute top-[8px] left-[10px]" style={{
              width: '20px', height: '18px',
              background: timeOfDay === 'night' ? 'rgba(255,200,100,0.3)' : 'rgba(135,206,250,0.5)',
              border: `2px solid ${timeOfDay === 'night' ? '#4A2E15' : '#8B6843'}`,
              borderRadius: '2px',
              boxShadow: timeOfDay === 'night' ? '0 0 8px rgba(255,200,100,0.25)' : 'none'
            }}>
              <div className="absolute top-1/2 left-0 right-0 h-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
            </div>
            {/* 右窗 */}
            <div className="absolute top-[8px] right-[10px]" style={{
              width: '20px', height: '18px',
              background: timeOfDay === 'night' ? 'rgba(255,200,100,0.3)' : 'rgba(135,206,250,0.5)',
              border: `2px solid ${timeOfDay === 'night' ? '#4A2E15' : '#8B6843'}`,
              borderRadius: '2px',
              boxShadow: timeOfDay === 'night' ? '0 0 8px rgba(255,200,100,0.25)' : 'none'
            }}>
              <div className="absolute top-1/2 left-0 right-0 h-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px]" style={{ background: timeOfDay === 'night' ? '#4A2E15' : '#8B6843' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 田地土壤（草地区域，与 FarmGrid 格子坐标对齐） */}
      <div className="absolute pointer-events-none z-[1]" style={{ left: '3%', bottom: '8%', width: '38%', height: '16%' }}>
        <div className="relative w-full h-full grid grid-cols-4 grid-rows-2 gap-[3px] p-[2px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-sm" style={{
              background: timeOfDay === 'night'
                ? 'linear-gradient(to bottom, rgba(60,40,20,0.5), rgba(45,30,15,0.6))'
                : 'linear-gradient(to bottom, rgba(120,80,40,0.45), rgba(90,60,30,0.55))',
              border: `1px solid ${timeOfDay === 'night' ? 'rgba(80,55,30,0.3)' : 'rgba(100,70,35,0.3)'}`,
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)'
            }}>
              <div className="w-full h-full" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${timeOfDay === 'night' ? 'rgba(40,25,10,0.2)' : 'rgba(80,50,20,0.15)'} 3px, ${timeOfDay === 'night' ? 'rgba(40,25,10,0.2)' : 'rgba(80,50,20,0.15)'} 4px)`
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* 蝴蝶动画（白天/黄昏） */}
      {(timeOfDay === 'day' || timeOfDay === 'morning') && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {[{ x: 30, y: 35, d: 12, c: '#F472B6' }, { x: 65, y: 25, d: 16, c: '#A78BFA' }, { x: 50, y: 40, d: 20, c: '#FDE047' }].map((b, i) => (
            <motion.div
              key={i}
              className="absolute text-lg"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              animate={{
                x: [0, 30, -20, 10, 0],
                y: [0, -15, -5, -20, 0],
                rotate: [0, 10, -10, 5, 0]
              }}
              transition={{ duration: b.d, repeat: Infinity, ease: 'easeInOut', delay: i * 3 }}
            >
              🦋
            </motion.div>
          ))}
        </div>
      )}

      {/* 萤火虫（夜晚） */}
      {timeOfDay === 'night' && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${15 + Math.random() * 55}%`,
                background: '#fef08a',
                boxShadow: '0 0 6px 2px rgba(254,240,138,0.6)'
              }}
              animate={{
                opacity: [0, 0.8, 0.3, 0.9, 0],
                x: [0, (Math.random() - 0.5) * 40],
                y: [0, (Math.random() - 0.5) * 30]
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      )}
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
      
      {/* 氛围滤镜 */}
      <div className={`absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-[2000ms] z-50 ${sceneConfig.living.lightOverlay[timeOfDay]}`} />
    </div>
  );
}

// 窗外景色组件
function WindowView({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const bgColors = {
    morning: 'bg-sky-200',
    day: 'bg-sky-400',
    dusk: 'bg-orange-300',
    night: 'bg-slate-900'
  };

  return (
    <div className={`w-full h-full transition-colors duration-[3000ms] ${bgColors[timeOfDay]} relative`}>
      {/* 太阳/月亮 */}
      <motion.div 
        className="absolute w-12 h-12 rounded-full"
        animate={{
          top: timeOfDay === 'day' ? '10%' : timeOfDay === 'dusk' ? '60%' : '80%',
          left: timeOfDay === 'morning' ? '20%' : timeOfDay === 'day' ? '50%' : '80%',
          backgroundColor: timeOfDay === 'night' ? '#fcd34d' : '#fef3c7', // 月亮黄 vs 太阳黄
          boxShadow: timeOfDay === 'night' ? '0 0 10px #fcd34d' : '0 0 20px #fef3c7'
        }}
        transition={{ duration: 2 }}
      />
      
      {/* 云朵 */}
      <motion.div 
        className="absolute top-10 left-0 text-white opacity-80 text-4xl"
        animate={{ x: [0, 100, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        ☁️
      </motion.div>
      
      {/* 星星 (仅夜晚) */}
      {timeOfDay === 'night' && (
        <>
          <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-12 left-24 w-1 h-1 bg-white rounded-full animate-pulse delay-75" />
          <div className="absolute top-8 left-40 w-1 h-1 bg-white rounded-full animate-pulse delay-150" />
        </>
      )}
    </div>
  );
}

// 漂浮尘埃组件
function FloatingDust() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-40"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            y: [null, Math.random() * -20 - 10], // 向上漂浮
            x: [null, (Math.random() - 0.5) * 20], // 左右摆动
            opacity: [0.4, 0, 0.4]
          }}
          transition={{
            duration: 5 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5
          }}
        />
      ))}
    </div>
  );
}
