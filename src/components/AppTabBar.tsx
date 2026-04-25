"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    match: (path) => path === "/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
        <path d="M3 10.5 12 3l9 7.5" strokeWidth="1.8" />
        <path d="M6.5 9.5V21h11V9.5" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    href: "/brew/new",
    label: "記録する",
    match: (path) => path.startsWith("/brew"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
        <path d="M12 5v14M5 12h14" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    href: "/history",
    label: "カレンダー",
    match: (path) => path.startsWith("/history"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" strokeWidth="1.8" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 9h17" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    href: "/world-map",
    label: "世界地図",
    match: (path) => path.startsWith("/world-map"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
        <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    href: "/cafe-map",
    label: "カフェマップ",
    match: (path) => path.startsWith("/cafe-map"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
        <path d="M12 21s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10Z" strokeWidth="1.8" />
        <circle cx="12" cy="11" r="2.2" strokeWidth="1.8" />
      </svg>
    )
  }
];

export default function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-900/15 bg-white/90 backdrop-blur">
      <ul className="mx-auto grid max-w-5xl grid-cols-5">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition ${
                  isActive
                    ? "text-amber-700"
                    : "text-amber-900/65 hover:bg-amber-100/60 hover:text-amber-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
