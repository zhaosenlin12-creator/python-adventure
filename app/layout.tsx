import type { Metadata, Viewport } from "next";
import "./globals.css";
// 生产环境日志控制 - 必须最早导入
import "@/lib/logger";
// 全局错误边界
import ErrorBoundary from "@/components/common/ErrorBoundary";


export const metadata: Metadata = {
  title: "Python Adventure",
  description: "Learn Python in a Pixel Art World",
  // 苹果设备配置
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Python Adventure',
  },
};

export const viewport: Viewport = {
  // 移动端viewport配置 - 允许用户缩放和滑动
  width: 'device-width',
  initialScale: 0.5,
  minimumScale: 0.3,
  maximumScale: 3,
  userScalable: true,
  viewportFit: 'cover',
  // 主题色
  themeColor: '#1a1a2e',
};

import { I18nProvider } from "@/lib/i18n";
import StoreInitializer from "@/components/StoreInitializer";
import GlobalChat from "@/components/chat/GlobalChat";
import PetMainPanel from "@/components/pet/PetMainPanel";
import PetStatusToast from "@/components/pet/PetStatusToast";
import InteractionEffectToast from "@/components/pet/InteractionEffectToast";
import FoodRewardToast from "@/components/ui/FoodRewardToast";
import CoinRewardToast from "@/components/ui/CoinRewardToast";
import ErrorToast from "@/components/ui/ErrorToast";
import DailyCheckIn from "@/components/pet/DailyCheckIn";
import AchievementPanel from "@/components/pet/AchievementPanel";
// Temporarily disabled MonacoPreloader to fix loading issue
// import MonacoPreloader from "@/components/game/MonacoPreloader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {/* <MonacoPreloader /> */}
        <StoreInitializer />
        <I18nProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <GlobalChat />
          <PetMainPanel />
          <PetStatusToast />
          <InteractionEffectToast />
          <FoodRewardToast />
          <CoinRewardToast />
          <ErrorToast />
          <DailyCheckIn />
          <AchievementPanel />
        </I18nProvider>
      </body>
    </html>
  );
}

