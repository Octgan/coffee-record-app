"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const iconClass = "h-6 w-6 shrink-0";

const navItems: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    match: (path) => path === "/",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 9.5V21h11V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    href: "/brew/new",
    label: "記録",
    match: (path) => path.startsWith("/brew"),
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/journal",
    label: "My note",
    match: (path) => path.startsWith("/journal"),
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          d="M6 4h10a2 2 0 0 1 2 2v14l-4-2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/history",
    label: "Coffee Calendar",
    match: (path) => path.startsWith("/history"),
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" strokeLinecap="round" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 9h17" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/world-map",
    label: "世界地図",
    match: (path) => path.startsWith("/world-map"),
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" strokeLinecap="round" />
        <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/cafe-map",
    label: "カフェ",
    match: (path) => path.startsWith("/cafe-map"),
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          d="M12 21s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11" r="2.2" />
      </svg>
    )
  }
];

export default function AppTabBar() {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-900/20 bg-white/95 shadow-[0_-4px_24px_rgba(120,53,15,0.08)] backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
      <ul
        className="mx-auto grid w-full max-w-5xl min-w-0 px-1"
        style={{
          gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`
        }}
      >
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          return (
            <li key={item.href} className="flex min-w-0 justify-center">
              <Link
                href={item.href}
                className={`flex min-h-[3.5rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center transition sm:min-h-[3.25rem] sm:px-1 ${
                  isActive
                    ? "bg-amber-100 font-bold text-amber-900 shadow-inner ring-1 ring-amber-500/45"
                    : "text-amber-900/65 hover:bg-amber-50/90 hover:text-amber-900 active:bg-amber-100/50"
                }`}
              >
                <span
                  className={
                    isActive ? "text-amber-800" : "text-amber-700/90"
                  }
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span
                  className={`w-full max-w-full truncate px-0.5 text-[11px] leading-tight tracking-tight max-[380px]:text-[10px] sm:text-xs ${
                    isActive ? "font-bold text-amber-950" : "font-semibold text-amber-900/80"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
