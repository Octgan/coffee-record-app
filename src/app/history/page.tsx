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
function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function calendarCellClass(hasAct: boolean, brewCount: number, cafeCount: number) {
  const base =
    "relative flex aspect-square min-h-[3.35rem] min-w-0 flex-col rounded-lg border p-1.5 transition sm:min-h-[3.5rem] sm:rounded-xl sm:p-2";
  if (!hasAct) {
    return `${base} border-amber-200/70 bg-white/95 text-amber-900/40 shadow-sm`;
  }
  if (brewCount > 0 && cafeCount > 0) {
    return `${base} border-amber-300/80 bg-gradient-to-br from-amber-50/95 via-white to-rose-50/95 text-amber-950 shadow-sm active:scale-[0.98]`;
  }
  if (brewCount > 0) {
    return `${base} border-amber-300/70 bg-amber-50/90 text-amber-950 shadow-sm active:scale-[0.98]`;
  }
  return `${base} border-rose-200/80 bg-rose-50/85 text-amber-950 shadow-sm active:scale-[0.98]`;
}

function CalendarDayContent({
  day,
  hasAct,
  brewCount,
  cafeCount,
  pairingEmoji
}: {
  day: number;
  hasAct: boolean;
  brewCount: number;
  cafeCount: number;
  pairingEmoji?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-1">
        <span
          className={`shrink-0 text-[13px] font-light tabular-nums leading-none sm:text-sm ${
            hasAct ? "text-amber-950" : "text-amber-800/45"
          }`}
        >
          {day}
        </span>
        {hasAct && (
          <div
            className="flex shrink-0 items-center gap-0.5 pt-0.5"
            aria-label={
              brewCount > 0 && cafeCount > 0
                ? `自宅抽出${brewCount}件、カフェ${cafeCount}件`
                : brewCount > 0
                  ? `自宅抽出${brewCount}件`
                  : `カフェ訪問${cafeCount}件`
            }
          >
            {brewCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-sm ring-1 ring-amber-600/20" />
            )}
            {cafeCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm ring-1 ring-rose-600/20" />
            )}
          </div>
        )}
      </div>
      {pairingEmoji && (
        <span className="mt-auto self-end text-[10px] leading-none opacity-90 sm:text-[11px]" aria-hidden>
          {pairingEmoji}
        </span>
      )}
      {hasAct && (
        <div className="mt-1 hidden flex-wrap gap-0.5 sm:flex">
          {brewCount > 0 && (
            <span className="rounded bg-amber-100/90 px-1 py-px text-[9px] font-medium tabular-nums text-amber-900/80">
              自宅{brewCount}
            </span>
          )}
          {cafeCount > 0 && (
            <span className="rounded bg-rose-100/90 px-1 py-px text-[9px] font-medium tabular-nums text-rose-900/80">
              カフェ{cafeCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
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
    <main className="mx-auto w-full max-w-5xl px-1 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-28 md:px-6">
      <section className="rounded-2xl border border-amber-900/15 bg-white/90 p-2 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:rounded-3xl sm:p-5 md:p-6">
        <header className="border-b border-amber-200/60 pb-3 sm:pb-4">
          <h1 className="text-xl font-bold tracking-tight text-amber-950 sm:text-2xl">
            Coffee Calendar
          </h1>
          <p className="mt-0.5 text-xs text-amber-800/80 sm:text-sm">
            自宅での抽出記録とカフェ訪問を、月ごとに一覧できます
          </p>
        </header>

        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-1.5 shadow-inner shadow-amber-100/50 sm:mt-4 sm:p-4 md:p-5">
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
                className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-base text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-base text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
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

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium tracking-tight text-amber-800/75 sm:gap-2.5 sm:text-xs md:text-sm">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-0.5 sm:py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-1.5 grid w-full grid-cols-7 gap-2 sm:mt-2 sm:gap-2.5 md:gap-3">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square min-h-[3.35rem] min-w-0 sm:min-h-[3.5rem]"
                    aria-hidden
                  />
                );
              }

              const dateKey = formatDateKey(date);
              const activity = activityByDate.get(dateKey);
              const hasAct = dayHasActivity(activity);
              const brewCount = activity?.brews.length ?? 0;
              const cafeCount = activity?.cafes.length ?? 0;
              const cellClass = calendarCellClass(hasAct, brewCount, cafeCount);
              const dayHref =
                brewCount > 0
                  ? `/journal?date=${encodeURIComponent(dateKey)}`
                  : "/cafe-map";
              const content = (
                <CalendarDayContent
                  day={date.getDate()}
                  hasAct={hasAct}
                  brewCount={brewCount}
                  cafeCount={cafeCount}
                  pairingEmoji={pairingByDate.get(dateKey)}
                />
              );

              return hasAct ? (
                <Link
                  key={dateKey}
                  href={dayHref}
                  prefetch
                  className={`${cellClass} min-w-0 cursor-pointer`}
                >
                  {content}
                </Link>
              ) : (
                <div key={dateKey} className={`${cellClass} min-w-0`}>
                  {content}
                </div>
              );
            })}
          </div>

          <p className="mt-5 border-t border-amber-200/50 pt-3 text-[10px] leading-relaxed text-amber-900/60 sm:mt-6 sm:text-[11px]">
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
