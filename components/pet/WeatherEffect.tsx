'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'night' | 'sunset';

interface WeatherEffectProps {
  weather?: WeatherType;
  autoChange?: boolean;  // 是否自动根据时间变化
  className?: string;
}

/**
 * 🌤️ 动态天气系统组件
 * 根据天气类型显示不同的视觉效果
 */
export default function WeatherEffect({ 
  weather: propWeather, 
  autoChange = true,
  className = ''
}: WeatherEffectProps) {
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(propWeather || 'sunny');

  // 根据真实时间自动切换天气
  useEffect(() => {
    if (propWeather) {
      setCurrentWeather(propWeather);
      return;
    }

    if (!autoChange) return;

    const updateWeatherByTime = () => {
      const hour = new Date().getHours();
      
      if (hour >= 6 && hour < 8) {
        setCurrentWeather('sunset'); // 日出
      } else if (hour >= 8 && hour < 17) {
        // 白天随机天气
        const weathers: WeatherType[] = ['sunny', 'sunny', 'sunny', 'cloudy'];
        setCurrentWeather(weathers[Math.floor(Math.random() * weathers.length)]);
      } else if (hour >= 17 && hour < 19) {
        setCurrentWeather('sunset'); // 日落
      } else {
        setCurrentWeather('night'); // 夜晚
      }
    };

    updateWeatherByTime();
    const interval = setInterval(updateWeatherByTime, 60000); // 每分钟检查一次
    
    return () => clearInterval(interval);
  }, [propWeather, autoChange]);

  // 背景渐变
  const backgroundGradient = useMemo(() => {
    switch (currentWeather) {
      case 'sunny':
        return 'from-sky-400 via-sky-300 to-cyan-200';
      case 'cloudy':
        return 'from-gray-400 via-gray-300 to-gray-200';
      case 'rainy':
        return 'from-slate-600 via-slate-500 to-slate-400';
      case 'snowy':
        return 'from-blue-200 via-white to-blue-100';
      case 'night':
        return 'from-slate-900 via-indigo-900 to-slate-800';
      case 'sunset':
        return 'from-orange-400 via-pink-400 to-purple-500';
      default:
        return 'from-sky-400 via-sky-300 to-cyan-200';
    }
  }, [currentWeather]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* 背景渐变层 */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-b ${backgroundGradient}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1 }}
      />

      {/* 晴天效果 - 太阳 */}
      <AnimatePresence>
        {currentWeather === 'sunny' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-12 right-16"
          >
            <motion.div
              className="text-7xl"
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                scale: { duration: 3, repeat: Infinity }
              }}
            >
              ☀️
            </motion.div>
            {/* 光芒效果 */}
            <motion.div
              className="absolute inset-0 bg-yellow-300/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 多云效果 - 云朵 */}
      <AnimatePresence>
        {(currentWeather === 'cloudy' || currentWeather === 'rainy') && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`cloud-${i}`}
                className="absolute text-5xl"
                initial={{ x: -100, opacity: 0 }}
                animate={{ 
                  x: ['100vw', '-100px'],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{ 
                  duration: 30 + i * 10,
                  repeat: Infinity,
                  delay: i * 5
                }}
                style={{ top: `${10 + i * 8}%` }}
              >
                ☁️
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* 下雨效果 */}
      <AnimatePresence>
        {currentWeather === 'rainy' && (
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={`rain-${i}`}
                className="absolute w-0.5 h-4 bg-blue-400/60 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: -20
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  opacity: [0, 1, 1, 0]
                }}
                transition={{
                  duration: 0.8 + Math.random() * 0.4,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 下雪效果 */}
      <AnimatePresence>
        {currentWeather === 'snowy' && (
          <div className="absolute inset-0">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={`snow-${i}`}
                className="absolute text-xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: -30
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, Math.sin(i) * 50, 0],
                  rotate: 360,
                  opacity: [0, 1, 1, 0]
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 4
                }}
              >
                ❄️
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 夜晚效果 - 星星和月亮 */}
      <AnimatePresence>
        {currentWeather === 'night' && (
          <>
            {/* 月亮 */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-12 right-20"
            >
              <motion.div
                className="text-6xl"
                animate={{ 
                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🌙
              </motion.div>
              {/* 月光效果 */}
              <motion.div
                className="absolute inset-0 bg-blue-200/10 rounded-full blur-3xl scale-150"
              />
            </motion.div>

            {/* 星星 */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute text-sm"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${5 + Math.random() * 40}%`
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              >
                ⭐
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* 日出/日落效果 */}
      <AnimatePresence>
        {currentWeather === 'sunset' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 left-1/4"
            >
              <motion.div
                className="text-8xl"
                animate={{ 
                  y: [0, -10, 0],
                  filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)']
                }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                🌅
              </motion.div>
            </motion.div>

            {/* 彩霞效果 */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-orange-500/30 via-pink-500/20 to-transparent"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </>
        )}
      </AnimatePresence>

      {/* 天气指示器 */}
      <div className="absolute bottom-4 right-4 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm flex items-center gap-2">
        <span>
          {currentWeather === 'sunny' && '☀️'}
          {currentWeather === 'cloudy' && '⛅'}
          {currentWeather === 'rainy' && '🌧️'}
          {currentWeather === 'snowy' && '❄️'}
          {currentWeather === 'night' && '🌙'}
          {currentWeather === 'sunset' && '🌅'}
        </span>
        <span className="text-xs">
          {currentWeather === 'sunny' && '晴天'}
          {currentWeather === 'cloudy' && '多云'}
          {currentWeather === 'rainy' && '雨天'}
          {currentWeather === 'snowy' && '雪天'}
          {currentWeather === 'night' && '夜晚'}
          {currentWeather === 'sunset' && '黄昏'}
        </span>
      </div>
    </div>
  );
}
