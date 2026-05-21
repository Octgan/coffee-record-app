import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppTabBar from "@/components/AppTabBar";

/** 明るい背景とステータスバー周りのテーマを揃える（暖かい紙色） */
const APP_THEME_COLOR = "#f5f1eb";

export const metadata: Metadata = {
  title: "Coffee Record",
  description: "Daily coffee brewing records and cafe map.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  },
  appleWebApp: {
    capable: true,
    title: "Coffee Record",
    /** 明るい画面向け：時計・電波などを黒系で表示（白背景でも視認できる） */
    statusBarStyle: "default"
  }
};

/** iOS の入力フォーカス時ズームは viewport 制限ではなく入力 16px（globals.css）で防止 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_THEME_COLOR
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" className="min-h-[100dvh] bg-[#faf8f5]">
      <body className="min-h-[100dvh] bg-gradient-to-b from-[#faf8f5] via-[#f5f1eb] to-[#ede4d9] antialiased">
        <div className="min-h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
        <AppTabBar />
      </body>
    </html>
  );
}
