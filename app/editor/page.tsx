"use client";

/**
 * 创意工坊编辑器页面
 * Requirements: 1.2 - 创意工坊入口和编辑器界面
 * 
 * 使用动态导入禁用SSR，因为Phaser需要window对象
 */

import dynamic from "next/dynamic";

// 动态导入编辑器内容组件，禁用SSR
const EditorPageContent = dynamic(
  () => import("@/components/editor/EditorPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1e3e] to-[#0a0e27] flex items-center justify-center">
        <div className="text-blue-400 font-pixel text-xl animate-pulse">
          加载编辑器中...
        </div>
      </div>
    ),
  }
);

export default function EditorPage() {
  return <EditorPageContent />;
}
