"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadBrewLogsFromStorage, SAMPLE_BREW_LOGS, type StoredBrewLog } from "@/lib/brewLogStorage";

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const monthOptions = [
  { value: 0, label: "1月" },
  { value: 1, label: "2月" },
  { value: 2, label: "3月" },
  { value: 3, label: "4月" },
  { value: 4, label: "5月" },
  { value: 5, label: "6月" },
  { value: 6, label: "7月" },
  { value: 7, label: "8月" },
  { value: 8, label: "9月" },
  { value: 9, label: "10月" },
  { value: 10, label: "11月" },
  { value: 11, label: "12月" }
];
const stampKinds = ["bean", "mug", "dripper", "pot"] as const;

function StampIllustration({
  kind,
  seed,
  emphasis = false
}: {
  kind: (typeof stampKinds)[number];
  seed: string;
  emphasis?: boolean;
}) {
  const filterId = `rough-${seed}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={`h-full w-full ${emphasis ? "text-amber-800/70" : "text-amber-800/35"}`}
    >
      <defs>
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={Math.abs(seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0))}
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.7" />
        </filter>
      </defs>
      <g
        filter={`url(#${filterId})`}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "bean" && (
          <>
            <ellipse cx="60" cy="62" rx="26" ry="34" />
            <path d="M54 35c9 10 9 40 0 54" />
          </>
        )}
        {kind === "mug" && (
          <>
            <rect x="26" y="42" width="50" height="38" rx="9" />
            <path d="M76 52h16a9 9 0 0 1 0 18H76" />
            <path d="M36 86h46" />
          </>
        )}
        {kind === "dripper" && (
          <>
            <path d="M24 34h72l-13 34H37L24 34Z" />
            <path d="M60 68v26" />
            <path d="M44 94h32" />
          </>
        )}
        {kind === "pot" && (
          <>
            <path d="M34 34h40v26a20 20 0 0 1-40 0V34Z" />
            <path d="M74 42h14a8 8 0 0 1 0 16H74" />
            <path d="M34 86h46" />
          </>
        )}
      </g>
    </svg>
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
function pairingIcon(pairing: string) {
  if (pairing.includes("ケーキ")) return "🍰";
  if (pairing.includes("スコーン")) return "🥐";
  if (pairing.includes("チョコ")) return "🍫";
  if (pairing.includes("クッキー")) return "🍪";
  return "🍽️";
}

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [logs, setLogs] = useState<StoredBrewLog[]>(() => [...SAMPLE_BREW_LOGS]);

  useEffect(() => {
    setLogs(loadBrewLogsFromStorage());
  }, []);

  const logsByDate = useMemo(() => {
    const map = new Map<string, StoredBrewLog[]>();
    for (const log of logs) {
      const existing = map.get(log.date) ?? [];
      map.set(log.date, [...existing, log]);
    }
    return map;
  }, [logs]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const leadingEmptyCells = firstDay.getDay();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < leadingEmptyCells; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [currentMonth]);

  const monthLabel = `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`;
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, index) => currentYear - 10 + index);
  }, []);
  const stampByDate = useMemo(() => {
    const map = new Map<
      string,
      { kindIndex: number; rotate: number; x: number; y: number; opacity: number }
    >();
    calendarDays.forEach((date) => {
      if (!date) {
        return;
      }
      const key = formatDateKey(date);
      if (logsByDate.has(key)) {
        const r1 = seededRandom(`${key}-kind`);
        const r2 = seededRandom(`${key}-rot`);
        const r3 = seededRandom(`${key}-x`);
        const r4 = seededRandom(`${key}-y`);
        const r5 = seededRandom(`${key}-opacity`);
        map.set(key, {
          kindIndex: Math.floor(r1 * stampKinds.length),
          rotate: -12 + r2 * 24,
          x: -4 + r3 * 8,
          y: -4 + r4 * 8,
          opacity: 0.38 + r5 * 0.28
        });
      }
    });
    return map;
  }, [calendarDays, logsByDate]);
  const pairingByDate = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (log.foodPairing && !map.has(log.date)) {
        map.set(log.date, pairingIcon(log.foodPairing));
      }
    });
    return map;
  }, [logs]);

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10 md:py-14">
      <section className="rounded-2xl border border-amber-900/15 bg-white/90 p-4 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:rounded-3xl sm:p-7 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">抽出履歴</p>
            <h1 className="mt-1 text-3xl font-bold text-amber-950 sm:text-4xl">
              Brew History Calendar
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/journal"
              className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              マイ・ノート
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              ダッシュボードへ戻る
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-3 shadow-inner shadow-amber-100/50 sm:mt-8 sm:p-5">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-amber-900">
              Year
              <select
                value={currentMonth.getFullYear()}
                onChange={(event) =>
                  setCurrentMonth(
                    new Date(Number(event.target.value), currentMonth.getMonth(), 1)
                  )
                }
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-amber-900">
              Month
              <select
                value={currentMonth.getMonth()}
                onChange={(event) =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), Number(event.target.value), 1)
                  )
                }
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 [grid-template-areas:'title_title'_'prev_next'] sm:mb-5 sm:grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)_minmax(5.5rem,auto)] sm:gap-3 sm:[grid-template-areas:'prev_title_next'] sm:items-center">
            <p className="[grid-area:title] text-center text-lg font-bold tracking-tight text-amber-950 sm:text-xl">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              className="[grid-area:prev] min-h-11 rounded-xl border-2 border-amber-300/90 bg-white px-2 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] sm:min-h-0 sm:px-4 sm:py-2.5"
            >
              前の月
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
              className="[grid-area:next] min-h-11 rounded-xl border-2 border-amber-300/90 bg-white px-2 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] sm:min-h-0 sm:px-4 sm:py-2.5"
            >
              次の月
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-tight text-amber-800/75 sm:gap-2 sm:text-xs sm:tracking-normal">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-0.5 sm:py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-1.5 grid w-full grid-cols-7 gap-1 sm:mt-2 sm:gap-2">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square min-h-0 rounded-xl bg-transparent"
                  />
                );
              }

              const dateKey = formatDateKey(date);
              const hasLogs = logsByDate.has(dateKey);

              const cellClass = `relative flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-1 text-left transition sm:p-1.5 ${
                hasLogs
                  ? "border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200/90 shadow-md shadow-amber-900/10 ring-1 ring-amber-400/40 hover:from-amber-200 hover:via-amber-100 hover:to-amber-200 hover:ring-amber-500/50 active:scale-[0.98]"
                  : "border-amber-200/90 bg-white/95 text-amber-900/45 shadow-sm"
              }`;

              const inner = (
                <>
                  <span
                    className={`relative z-20 shrink-0 text-xs font-bold tabular-nums sm:text-sm ${
                      hasLogs ? "text-amber-950" : "text-amber-800/50"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {hasLogs && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-1 sm:p-1.5"
                        style={{
                          transform: `translate(${stampByDate.get(dateKey)?.x ?? 0}px, ${stampByDate.get(dateKey)?.y ?? 0}px) rotate(${stampByDate.get(dateKey)?.rotate ?? 0}deg)`,
                          opacity: stampByDate.get(dateKey)?.opacity ?? 0.55
                        }}
                      >
                        <div className="h-[72%] w-[72%] max-h-[4.5rem] max-w-[4.5rem] sm:h-[68%] sm:w-[68%]">
                          <StampIllustration
                            kind={stampKinds[stampByDate.get(dateKey)?.kindIndex ?? 0]}
                            seed={dateKey}
                            emphasis
                          />
                        </div>
                      </div>
                      <span className="absolute bottom-1 left-1/2 z-20 -translate-x-1/2 rounded-full bg-amber-900 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-amber-50 shadow sm:bottom-1.5 sm:px-2 sm:text-[10px]">
                        {logsByDate.get(dateKey)?.length}件
                      </span>
                      {pairingByDate.get(dateKey) && (
                        <span className="absolute right-0.5 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm shadow ring-1 ring-amber-200/80 sm:right-1 sm:top-1 sm:h-7 sm:w-7 sm:text-base">
                          {pairingByDate.get(dateKey)}
                        </span>
                      )}
                    </>
                  )}
                </>
              );

              return hasLogs ? (
                <Link
                  key={dateKey}
                  href={`/journal?date=${encodeURIComponent(dateKey)}`}
                  prefetch
                  className={`${cellClass} min-w-0 cursor-pointer`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={dateKey} className={`${cellClass} min-w-0`}>
                  {inner}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-amber-900/75 sm:mt-4 sm:text-sm">
            記録がある日付は濃い背景 + スタンプで表示されます。タップすると「マイ・ノート」でその日の記録を開きます。
          </p>
        </div>
      </section>
    </main>
  );
}
