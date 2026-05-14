"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BREW_LOGS_UPDATED_EVENT, type StoredBrewLog } from "@/lib/brewLogStorage";
import type { CafeRecord } from "@/lib/cafeMapStorage";
import { fetchBrewLogs } from "@/lib/data/brewLogsDb";
import { CAFE_RECORDS_UPDATED_EVENT, fetchCafeRecords } from "@/lib/data/cafeRecordsDb";
import { createClient } from "@/lib/supabase/client";

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
  emphasis = false,
  cafeTone = false
}: {
  kind: (typeof stampKinds)[number];
  seed: string;
  emphasis?: boolean;
  cafeTone?: boolean;
}) {
  const filterId = `rough-${seed}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={`h-full w-full ${
        cafeTone
          ? "text-rose-700/55"
          : emphasis
            ? "text-amber-800/70"
            : "text-amber-800/35"
      }`}
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

type DayActivity = { brews: StoredBrewLog[]; cafes: CafeRecord[] };

function buildActivityByDate(logs: StoredBrewLog[], cafes: CafeRecord[]): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const log of logs) {
    const cur = map.get(log.date) ?? { brews: [], cafes: [] };
    cur.brews.push(log);
    map.set(log.date, cur);
  }
  for (const c of cafes) {
    const d = String(c.date ?? "").trim();
    if (!d) {
      continue;
    }
    const cur = map.get(d) ?? { brews: [], cafes: [] };
    cur.cafes.push(c);
    map.set(d, cur);
  }
  for (const [, entry] of map) {
    const brewIds = new Set(entry.brews.map((b) => b.id));
    entry.cafes = entry.cafes.filter((c) => !(c.brewLogId != null && brewIds.has(c.brewLogId)));
  }
  return map;
}

function dayHasActivity(activity: DayActivity | undefined) {
  if (!activity) {
    return false;
  }
  return activity.brews.length > 0 || activity.cafes.length > 0;
}

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [logs, setLogs] = useState<StoredBrewLog[]>([]);
  const [cafes, setCafes] = useState<CafeRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const [brewList, cafeList] = await Promise.all([
          fetchBrewLogs(supabase),
          fetchCafeRecords(supabase)
        ]);
        setLogs(brewList);
        setCafes(cafeList);
      } catch {
        setLogs([]);
        setCafes([]);
      }
    };
    void load();
    const onBrewUpdated = () => void load();
    const onCafeUpdated = () => void load();
    window.addEventListener(BREW_LOGS_UPDATED_EVENT, onBrewUpdated);
    window.addEventListener(CAFE_RECORDS_UPDATED_EVENT, onCafeUpdated);
    return () => {
      window.removeEventListener(BREW_LOGS_UPDATED_EVENT, onBrewUpdated);
      window.removeEventListener(CAFE_RECORDS_UPDATED_EVENT, onCafeUpdated);
    };
  }, []);

  const activityByDate = useMemo(
    () => buildActivityByDate(logs, cafes),
    [logs, cafes]
  );

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
      { kindIndex: number; rotate: number; x: number; y: number; opacity: number; cafeTone: boolean }
    >();
    calendarDays.forEach((date) => {
      if (!date) {
        return;
      }
      const key = formatDateKey(date);
      const activity = activityByDate.get(key);
      if (!dayHasActivity(activity)) {
        return;
      }
      const bc = activity!.brews.length;
      const cc = activity!.cafes.length;
      const cafeOnly = bc === 0 && cc > 0;
      const seedBase = bc > 0 ? `${key}-brew` : `${key}-cafe`;
      const r1 = seededRandom(`${seedBase}-kind`);
      const r2 = seededRandom(`${seedBase}-rot`);
      const r3 = seededRandom(`${seedBase}-x`);
      const r4 = seededRandom(`${seedBase}-y`);
      const r5 = seededRandom(`${seedBase}-opacity`);
      const kindIndex = cafeOnly ? 1 : Math.floor(r1 * stampKinds.length);
      map.set(key, {
        kindIndex,
        rotate: -12 + r2 * 24,
        x: -4 + r3 * 8,
        y: -4 + r4 * 8,
        opacity: 0.38 + r5 * 0.28,
        cafeTone: cafeOnly
      });
    });
    return map;
  }, [calendarDays, activityByDate]);
  const pairingByDate = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (log.foodPairing && !map.has(log.date)) {
        map.set(log.date, pairingIcon(log.foodPairing));
      }
    });
    cafes.forEach((c) => {
      const d = String(c.date ?? "").trim();
      if (c.foodPairing && d && !map.has(d)) {
        map.set(d, pairingIcon(c.foodPairing));
      }
    });
    return map;
  }, [logs, cafes]);

  return (
    <main className="mx-auto w-full max-w-5xl px-2 py-3 sm:px-4 sm:py-5 md:px-6">
      <section className="rounded-2xl border border-amber-900/15 bg-white/90 p-3 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:rounded-3xl sm:p-5 md:p-6">
        <header className="border-b border-amber-200/60 pb-3 sm:pb-4">
          <h1 className="text-xl font-bold tracking-tight text-amber-950 sm:text-2xl">
            Coffee Calendar
          </h1>
          <p className="mt-0.5 text-xs text-amber-800/80 sm:text-sm">
            自宅での抽出記録とカフェ訪問を、月ごとに一覧できます
          </p>
        </header>

        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-2 shadow-inner shadow-amber-100/50 sm:mt-4 sm:p-4 md:p-5">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:gap-3">
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

          <div className="mb-3 grid grid-cols-2 gap-2 [grid-template-areas:'title_title'_'prev_next'] sm:mb-4 sm:grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)_minmax(5.5rem,auto)] sm:gap-3 sm:[grid-template-areas:'prev_title_next'] sm:items-center">
            <p className="[grid-area:title] text-center text-base font-bold tracking-tight text-amber-950 sm:text-lg md:text-xl">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              className="[grid-area:prev] min-h-12 rounded-xl border-2 border-amber-300/90 bg-white px-2 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] sm:min-h-0 sm:px-4 sm:py-2.5"
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
              className="[grid-area:next] min-h-12 rounded-xl border-2 border-amber-300/90 bg-white px-2 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98] sm:min-h-0 sm:px-4 sm:py-2.5"
            >
              次の月
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold tracking-tight text-amber-800/80 sm:gap-2 sm:text-xs sm:tracking-normal md:text-sm">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1 sm:py-1.5">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid w-full grid-cols-7 gap-1.5 sm:mt-2.5 sm:gap-2 md:gap-2.5">
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
              const activity = activityByDate.get(dateKey);
              const hasAct = dayHasActivity(activity);
              const brewCount = activity?.brews.length ?? 0;
              const cafeCount = activity?.cafes.length ?? 0;
              const stampMeta = stampByDate.get(dateKey);

              const cellClass = (() => {
                if (!hasAct) {
                  return "relative flex aspect-square min-h-[2.85rem] min-w-0 flex-col overflow-hidden rounded-xl border border-amber-200/90 bg-white/95 p-1.5 text-left text-amber-900/45 shadow-sm transition sm:min-h-0 sm:p-2";
                }
                if (brewCount > 0 && cafeCount > 0) {
                  return "relative flex aspect-square min-h-[2.85rem] min-w-0 flex-col overflow-hidden rounded-xl border border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-rose-100/90 p-1.5 text-left shadow-md shadow-amber-900/10 ring-2 ring-amber-400/35 ring-offset-0 ring-offset-transparent transition hover:from-amber-200 hover:via-amber-100 hover:to-rose-50 hover:ring-amber-500/45 active:scale-[0.98] sm:min-h-0 sm:p-2";
                }
                if (brewCount > 0) {
                  return "relative flex aspect-square min-h-[2.85rem] min-w-0 flex-col overflow-hidden rounded-xl border border-amber-500 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200/90 p-1.5 text-left shadow-md shadow-amber-900/10 ring-1 ring-amber-400/40 transition hover:from-amber-200 hover:via-amber-100 hover:to-amber-200 hover:ring-amber-500/50 active:scale-[0.98] sm:min-h-0 sm:p-2";
                }
                return "relative flex aspect-square min-h-[2.85rem] min-w-0 flex-col overflow-hidden rounded-xl border border-rose-400 bg-gradient-to-br from-rose-50 via-white to-rose-100/90 p-1.5 text-left shadow-md shadow-rose-900/10 ring-1 ring-rose-300/50 transition hover:from-rose-100 hover:via-rose-50/90 hover:to-rose-100 hover:ring-rose-400/60 active:scale-[0.98] sm:min-h-0 sm:p-2";
              })();

              const dayHref =
                brewCount > 0
                  ? `/journal?date=${encodeURIComponent(dateKey)}`
                  : "/cafe-map";

              const inner = (
                <>
                  <span
                    className={`relative z-20 shrink-0 text-sm font-bold tabular-nums sm:text-base ${
                      hasAct ? "text-amber-950" : "text-amber-800/50"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {hasAct && stampMeta && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center p-1 sm:p-1.5"
                        style={{
                          transform: `translate(${stampMeta.x}px, ${stampMeta.y}px) rotate(${stampMeta.rotate}deg)`,
                          opacity: stampMeta.opacity
                        }}
                      >
                        <div className="h-[76%] w-[76%] max-h-[5.25rem] max-w-[5.25rem] sm:h-[70%] sm:w-[70%] sm:max-h-[5.5rem] sm:max-w-[5.5rem]">
                          <StampIllustration
                            kind={stampKinds[stampMeta.kindIndex]}
                            seed={dateKey}
                            emphasis
                            cafeTone={stampMeta.cafeTone}
                          />
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1/2 z-20 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 sm:bottom-1.5">
                        {brewCount > 0 && (
                          <span className="rounded-full bg-amber-900 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-amber-50 shadow sm:text-[10px]">
                            自宅{brewCount}
                          </span>
                        )}
                        {cafeCount > 0 && (
                          <span className="rounded-full bg-rose-800 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-rose-50 shadow sm:text-[10px]">
                            カフェ{cafeCount}
                          </span>
                        )}
                      </div>
                      {pairingByDate.get(dateKey) && (
                        <span className="absolute right-0.5 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm shadow ring-1 ring-amber-200/80 sm:right-1 sm:top-1 sm:h-7 sm:w-7 sm:text-base">
                          {pairingByDate.get(dateKey)}
                        </span>
                      )}
                    </>
                  )}
                </>
              );

              return hasAct ? (
                <Link
                  key={dateKey}
                  href={dayHref}
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

          <p className="mt-2.5 text-[11px] leading-relaxed text-amber-900/75 sm:mt-3 sm:text-xs md:text-sm">
            <span className="font-semibold text-amber-900">琥珀</span>は自宅抽出、
            <span className="font-semibold text-rose-800">ローズ</span>
            はカフェ訪問の日。タップで抽出がある日は{" "}
            <span className="font-semibold text-amber-900">My coffee note</span>
            へ、カフェのみの日は <span className="font-semibold text-amber-900">カフェマップ</span> へ移動します。
          </p>
        </div>
      </section>
    </main>
  );
}
