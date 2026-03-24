'use client';

import { useEffect, useRef, useState } from 'react';

interface AmbientSoundsProps {
  scene: 'living' | 'garden';
  enabled?: boolean;
  volume?: number;
}

/**
 * 🎵 环境音效组件
 * 播放治愈的背景环境音
 */
export default function AmbientSounds({ 
  scene, 
  enabled = true, 
  volume = 0.3 
}: AmbientSoundsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 不同场景的音效URL（使用免费音效）
  const soundUrls = {
    living: '/sounds/ambient/cozy-room.mp3',
    garden: '/sounds/ambient/nature-birds.mp3'
  };
  
  useEffect(() => {
    if (!enabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }
    
    // 创建音频元素
    const audio = new Audio(soundUrls[scene]);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
    
    // 尝试播放（需要用户交互后才能自动播放）
    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        // 自动播放被阻止，等待用户交互
        console.log('[AmbientSounds] Autoplay blocked, waiting for interaction');
        
        const handleInteraction = () => {
          audio.play().then(() => setIsPlaying(true)).catch(() => {});
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('touchstart', handleInteraction);
        };
        
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
      }
    };
    
    playAudio();
    
    return () => {
      audio.pause();
      audio.src = '';
      setIsPlaying(false);
    };
  }, [scene, enabled, volume]);
  
  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  return null; // 纯逻辑组件，不渲染UI
}

/**
 * 🔊 音效控制按钮组件
 */
export function AmbientSoundToggle({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean; 
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg
        ${enabled 
          ? 'bg-green-500 hover:bg-green-600 text-white' 
          : 'bg-slate-600 hover:bg-slate-500 text-gray-300'
        }
      `}
      title={enabled ? '关闭环境音' : '开启环境音'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
