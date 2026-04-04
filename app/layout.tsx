import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/lib/logger";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { I18nProvider } from "@/lib/i18n";
import StoreInitializer from "@/components/StoreInitializer";
import GlobalOverlayShell from "@/components/layout/GlobalOverlayShell";

export const metadata: Metadata = {
  title: "Python Adventure",
  description: "Learn Python in a Pixel Art World",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Python Adventure",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.5,
  minimumScale: 0.3,
  maximumScale: 3,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <StoreInitializer />
        <I18nProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
          <GlobalOverlayShell />
        </I18nProvider>
      </body>
    </html>
  );
}
