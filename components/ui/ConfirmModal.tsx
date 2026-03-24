'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/utils/soundManager';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: 'danger' | 'success' | 'warning' | 'info';
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 🎮 统一确认弹窗组件 - 像素风格
 * 替代浏览器原生 confirm() 对话框
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  confirmType = 'danger',
  icon,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  
  const confirmColors = {
    danger: 'bg-red-600 hover:bg-red-500 border-red-400',
    success: 'bg-green-600 hover:bg-green-500 border-green-400',
    warning: 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400',
    info: 'bg-blue-600 hover:bg-blue-500 border-blue-400'
  };
  
  const handleConfirm = () => {
    playSound('button_click');
    onConfirm();
  };
  
  const handleCancel = () => {
    playSound('button_click');
    onCancel();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            className="relative bg-slate-800 backdrop-blur-md rounded-2xl border-2 border-slate-700 shadow-lg max-w-sm w-full mx-4 overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* 顶部装饰条 */}
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-teal-400 to-blue-400" />
            
            {/* 内容区域 */}
            <div className="p-6">
              {/* 图标和标题 */}
              <div className="flex items-center gap-3 mb-4">
                {icon && (
                  <motion.div
                    className="text-4xl"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, -5, 5, 0]
                    }}
                    transition={{ 
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  >
                    {icon}
                  </motion.div>
                )}
                <h3 className="text-xl font-bold text-white">
                  {title}
                </h3>
              </div>
              
              {/* 消息内容 */}
              <p className="text-slate-300 mb-6 leading-relaxed">
                {message}
              </p>
              
              {/* 按钮组 */}
              <div className="flex gap-3">
                <motion.button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold border-2 border-slate-300 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {cancelText}
                </motion.button>
                
                <motion.button
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-bold border-2 transition-colors ${confirmColors[confirmType]}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {confirmText}
                </motion.button>
              </div>
            </div>
            
            {/* 底部装饰 */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-50" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
