"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12">
      <section className="w-full rounded-3xl border border-amber-900/15 bg-white/85 p-8 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-10">
        <h1 className="text-center text-3xl font-bold text-amber-950 sm:text-4xl">
          Coffee Record Dashboard
        </h1>
        <p className="mt-3 text-center text-sm text-amber-900/80 sm:text-base">
          今日のコーヒー体験を記録して、お気に入りのカフェを見つけましょう。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/brew/new"
            className="rounded-xl bg-[#b0551a] px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-[#964714] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            抽出を記録する
          </Link>
          <Link
            href="/cafe-map"
            className="flex items-center justify-center rounded-xl bg-[#b0551a] px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-[#964714] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            カフェマップ
          </Link>
        </div>
        <Link
          href="/history"
          className="mt-4 block rounded-xl border border-amber-700 bg-amber-50 px-4 py-3 text-center text-base font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        >
          抽出履歴カレンダーを見る
        </Link>
        <Link
          href="/journal"
          className="mt-3 block rounded-xl border border-amber-600 bg-white px-4 py-3 text-center text-base font-semibold text-amber-900 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        >
          マイ・ノート（全記録）
        </Link>
        <Link
          href="/world-map"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-700 bg-white px-4 py-3 text-center text-base font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        >
          <span aria-hidden>🌍</span>
          世界地図コレクションを見る
        </Link>
      </section>
    </main>
  );
}
