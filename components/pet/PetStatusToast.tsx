'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore } from '@/store/petStore';
import { PetStatus, STATUS_TEXT } from '@/types/pet';

interface StatusNotification {
  id: number;
  oldStatus: PetStatus;
  newStatus: PetStatus;
  petName: string;
}

/**
 * 🔔 宠物状态变化Toast通知
 * 当宠物状态从健康变为疲惫/昏迷时显示醒目提醒
 */
export default function PetStatusToast() {
  const { currentPet } = usePetStore();
  const [notifications, setNotifications] = useState<StatusNotification[]>([]);
  const prevStatusRef = useRef<PetStatus | null>(null);
  
  // 监听宠物状态变化
  useEffect(() => {
    if (!currentPet) {
      prevStatusRef.current = null;
      return;
    }
    
    const currentStatus = currentPet.status;
    const prevStatus = prevStatusRef.current;
    
    // 首次加载不触发通知
    if (prevStatus === null) {
      prevStatusRef.current = currentStatus;
      return;
    }
    
    // 状态发生变化
    if (prevStatus !== currentStatus) {
      // 只在状态变差时通知（normal → tired → coma）
      const statusPriority: Record<PetStatus, number> = {
        normal: 0,
        egg: 0,
        tired: 1,
        coma: 2
      };
      
      if (statusPriority[currentStatus] > statusPriority[prevStatus]) {
        const notification: StatusNotification = {
          id: Date.now(),
          oldStatus: prevStatus,
          newStatus: currentStatus,
          petName: currentPet.name
        };
        
        setNotifications(prev => [...prev, notification]);
        
        // 5秒后自动移除
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      }
      
      prevStatusRef.current = currentStatus;
    }
  }, [currentPet?.status, currentPet?.name]);
  
  const getStatusConfig = (status: PetStatus) => {
    switch (status) {
      case 'tired':
        return {
          icon: '😴',
          color: 'from-yellow-600 to-orange-600',
          borderColor: 'border-yellow-500',
          message: '有点累了，记得多陪陪它哦！'
        };
      case 'coma':
        return {
          icon: '🚨',
          color: 'from-red-600 to-red-800',
          borderColor: 'border-red-500',
          message: '陷入昏迷了！快去答题营救它！'
        };
      default:
        return {
          icon: '💚',
          color: 'from-green-600 to-green-800',
          borderColor: 'border-green-500',
          message: '状态良好！'
        };
    }
  };
  
  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-3">
      <AnimatePresence>
        {notifications.map(notification => {
          const config = getStatusConfig(notification.newStatus);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`
                bg-gradient-to-r ${config.color} 
                border-2 ${config.borderColor}
                rounded-lg shadow-2xl p-4 max-w-sm
                cursor-pointer
              `}
              onClick={() => dismissNotification(notification.id)}
            >
              <div className="flex items-start gap-3">
                <motion.div 
                  className="text-4xl"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: notification.newStatus === 'coma' ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ 
                    duration: 0.5, 
                    repeat: notification.newStatus === 'coma' ? Infinity : 0 
                  }}
                >
                  {config.icon}
                </motion.div>
                
                <div className="flex-1">
                  <div className="font-bold text-white text-lg mb-1">
                    {notification.petName} {STATUS_TEXT[notification.newStatus]}！
                  </div>
                  <div className="text-white/90 text-sm">
                    {config.message}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                  }}
                  className="text-white/70 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* 进度条 - 倒计时 */}
              <motion.div
                className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-slate-800"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
