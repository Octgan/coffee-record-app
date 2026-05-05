"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BREW_LOG_STORAGE_KEY,
  SAMPLE_BREW_LOGS,
  type StoredBrewLog
} from "@/lib/brewLogStorage";

function getOriginCount(log: StoredBrewLog) {
  if (log.origins && log.origins.length > 0) {
    return log.origins.map((origin) => origin.country);
  }
  return [log.originCountry];
}

function calcMaxConsecutiveDays(logs: StoredBrewLog[]) {
  const dates = Array.from(new Set(logs.map((log) => log.date))).sort();
  let max = 0;
  let current = 0;
  let prev: Date | null = null;
  dates.forEach((dateText) => {
    const date = new Date(`${dateText}T00:00:00`);
    if (!prev) {
      current = 1;
    } else {
      const diff = (date.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      current = diff === 1 ? current + 1 : 1;
    }
    max = Math.max(max, current);
    prev = date;
  });
  return max;
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<StoredBrewLog[]>(SAMPLE_BREW_LOGS);

  useEffect(() => {
    const raw = localStorage.getItem(BREW_LOG_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredBrewLog[];
      if (parsed.length > 0) {
        setLogs(parsed);
      }
    } catch {
      setLogs(SAMPLE_BREW_LOGS);
    }
  }, []);

  const milestone = useMemo(() => {
    const uniqueCountries = Array.from(new Set(logs.flatMap(getOriginCount))).length;
    const recordCount = logs.length;
    const streak = calcMaxConsecutiveDays(logs);
    const nextCountryGoal = 10;
    const countriesRemaining = Math.max(0, nextCountryGoal - uniqueCountries);

    const badges = [
      {
        id: "10-records",
        icon: "📘",
        label: "10回記録",
        unlocked: recordCount >= 10
      },
      {
        id: "3-countries",
        icon: "🌍",
        label: "3カ国の豆",
        unlocked: uniqueCountries >= 3
      },
      {
        id: "30-days",
        icon: "🔥",
        label: "1ヶ月継続",
        unlocked: streak >= 30
      }
    ];

    return { uniqueCountries, countriesRemaining, badges };
  }, [logs]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12">
      <section className="w-full rounded-3xl border border-amber-900/15 bg-white/85 p-8 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-10">
        <h1 className="text-center text-3xl font-bold text-amber-950 sm:text-4xl">
          Coffee Record Dashboard
        </h1>
        <p className="mt-3 text-center text-sm text-amber-900/80 sm:text-base">
          今日のコーヒー体験を記録して、お気に入りのカフェを見つけましょう。
        </p>
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-amber-900">コーヒー・マイルストーン</p>
          <p className="mt-1 text-sm text-amber-900/80">
            飲んだ豆の国数: {milestone.uniqueCountries}ヶ国
            {milestone.countriesRemaining > 0
              ? `（あと${milestone.countriesRemaining}つで「世界一周ビギナー」）`
              : "（世界一周ビギナー達成！）"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {milestone.badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  badge.unlocked
                    ? "border-amber-400 bg-white text-amber-900"
                    : "border-amber-200 bg-amber-100/60 text-amber-900/55"
                }`}
              >
                <span className="mr-1">{badge.icon}</span>
                {badge.label}
              </div>
            ))}
          </div>
        </section>

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
