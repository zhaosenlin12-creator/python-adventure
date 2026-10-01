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
    danger: 'bg-[#e98e7f] hover:bg-[#dc776b] border-[#d98a7c]',
    success: 'bg-[#78b892] hover:bg-[#65a47d] border-[#72a98a]',
    warning: 'bg-[#e8b95f] hover:bg-[#dca84a] border-[#d5a650]',
    info: 'bg-[#78b7c5] hover:bg-[#66a7b6] border-[#72aab8]'
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
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-[#5b4034]/28 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-[26px] border border-[#dec7a5] bg-[linear-gradient(155deg,#fffaf0,#f4e6d2)] shadow-[0_28px_70px_rgba(91,59,35,0.24)] backdrop-blur-md"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* 顶部装饰条 */}
            <div className="h-1.5 bg-gradient-to-r from-[#e6ad58] via-[#78b892] to-[#78b7c5]" />
            
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
                <h3 className="text-xl font-black text-[#5c4537]">
                  {title}
                </h3>
              </div>
              
              {/* 消息内容 */}
              <p className="mb-6 leading-relaxed text-[#866b58]">
                {message}
              </p>
              
              {/* 按钮组 */}
              <div className="flex gap-3">
                <motion.button
                  onClick={handleCancel}
                  className="flex-1 rounded-xl border border-[#ead8bd] bg-[#fffaf0] px-4 py-3 font-bold text-[#725645] transition-colors hover:bg-white"
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#9acdb5] to-transparent opacity-70" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
