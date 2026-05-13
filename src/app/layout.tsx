import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppTabBar from "@/components/AppTabBar";

/** ステータスバー・テーマカラーと揃える濃い茶（ブラウザ UI との馴染み用） */
const APP_CHROME_COLOR = "#1a100c";

export const metadata: Metadata = {
  title: "Coffee Record",
  description: "Daily coffee brewing records and cafe map.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  },
  appleWebApp: {
    capable: true,
    title: "Coffee Record",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_CHROME_COLOR
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" className="min-h-[100dvh] bg-[#1a100c]">
      <body className="min-h-[100dvh] bg-[#1a100c] antialiased">
        <div className="min-h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
        <AppTabBar />
      </body>
    </html>
  );
}
