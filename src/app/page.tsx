"use client";

import Link from "next/link";

const primaryBtn =
  "flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-[#b0551a] px-5 py-4 text-center text-lg font-semibold leading-snug text-white shadow-md shadow-amber-950/15 transition hover:bg-[#964714] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:scale-[0.99] sm:min-h-[3.25rem] sm:text-base";

const secondaryOutlineBtn =
  "flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border-2 border-amber-700/80 bg-white/95 px-5 py-3.5 text-center text-base font-semibold leading-snug text-amber-950 shadow-sm transition hover:border-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:scale-[0.99] sm:text-[0.95rem]";

const secondarySoftBtn =
  "flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border border-amber-600/70 bg-amber-50/90 px-5 py-3.5 text-center text-base font-semibold leading-snug text-amber-950 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 active:scale-[0.99] sm:text-[0.95rem]";

export default function DashboardPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col justify-center bg-gradient-to-b from-amber-50/95 via-amber-50/60 to-amber-100/50 px-[2.5vw] py-10 sm:px-6 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(251,191,36,0.35),transparent)]"
      />

      <section className="relative z-[1] mx-auto w-full max-w-[95%] rounded-[1.75rem] border border-amber-900/12 bg-white/90 p-6 shadow-2xl shadow-amber-950/12 backdrop-blur-md sm:max-w-2xl sm:rounded-3xl sm:p-9 md:max-w-3xl md:p-10">
        <h1 className="text-center">
          <span className="block bg-gradient-to-br from-amber-950 via-amber-900 to-amber-800 bg-clip-text text-[clamp(1.85rem,7vw,3.25rem)] font-black leading-[1.08] tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Coffee Record
          </span>
          <span className="mt-1.5 block text-[clamp(0.95rem,3.8vw,1.35rem)] font-bold uppercase tracking-[0.2em] text-amber-800/85 sm:mt-2 sm:text-xl md:text-2xl">
            Dashboard
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center text-[0.95rem] leading-relaxed text-amber-900/85 sm:mt-5 sm:text-base">
          今日のコーヒー体験を記録して、お気に入りのカフェを見つけましょう。
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3.5 sm:mt-10 sm:grid-cols-2 sm:gap-4">
          <Link href="/brew/new" className={primaryBtn}>
            抽出を記録する
          </Link>
          <Link href="/cafe-map" className={primaryBtn}>
            Cafe map
          </Link>
        </div>

        <div className="mt-3.5 flex flex-col gap-3 sm:mt-4">
          <Link href="/history" className={secondarySoftBtn}>
            <span className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
              <span className="text-[1.05rem] font-bold sm:text-base">Brew calendar</span>
              <span className="text-xs font-medium text-amber-800/75 sm:text-sm">抽出履歴を月で見る</span>
            </span>
          </Link>
          <Link href="/journal" className={secondaryOutlineBtn}>
            <span className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
              <span className="text-[1.05rem] font-bold sm:text-base">My coffee note</span>
              <span className="text-xs font-medium text-amber-800/75 sm:text-sm">これまでの抽出を振り返る</span>
            </span>
          </Link>
          <Link href="/world-map" className={secondaryOutlineBtn}>
            <span className="flex items-center justify-center gap-2.5">
              <span aria-hidden className="text-xl sm:text-lg">
                🌍
              </span>
              <span className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
                <span className="text-[1.05rem] font-bold sm:text-base">World map</span>
                <span className="text-xs font-medium text-amber-800/75 sm:text-sm">産地コレクション</span>
              </span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
