import type { Metadata } from "next";
import "./globals.css";
import AppTabBar from "@/components/AppTabBar";

export const metadata: Metadata = {
  title: "Coffee Record",
  description: "Daily coffee brewing records and cafe map.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  }
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        <div className="pb-20">{children}</div>
        <AppTabBar />
      </body>
    </html>
  );
}
