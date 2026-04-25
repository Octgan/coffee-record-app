"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COFFEE_ORIGINS } from "@/lib/coffeeOrigins";
import {
  BREW_LOG_STORAGE_KEY,
  SAMPLE_BREW_LOGS,
  type StoredBrewLog
} from "@/lib/brewLogStorage";

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
  seed
}: {
  kind: (typeof stampKinds)[number];
  seed: string;
}) {
  const filterId = `rough-${seed}`;

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full text-amber-800/35">
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
function formatOriginsLabel(log: StoredBrewLog) {
  const origins =
    log.origins && log.origins.length > 0
      ? log.origins.map((origin) => origin.country)
      : [log.originCountry];
  const labels = origins.map(
    (country) => COFFEE_ORIGINS.find((item) => item.value === country)?.label ?? country
  );
  return labels.join(" / ");
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logs, setLogs] = useState<StoredBrewLog[]>(SAMPLE_BREW_LOGS);

  useEffect(() => {
    const storedRaw = localStorage.getItem(BREW_LOG_STORAGE_KEY);
    if (!storedRaw) {
      return;
    }
    try {
      const parsed = JSON.parse(storedRaw) as StoredBrewLog[];
      if (parsed.length > 0) {
        setLogs(parsed);
      }
    } catch {
      setLogs(SAMPLE_BREW_LOGS);
    }
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

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) ?? [] : [];
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
          rotate: -15 + r2 * 30,
          x: -6 + r3 * 12,
          y: -6 + r4 * 12,
          opacity: 0.22 + r5 * 0.18
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
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
      <section className="rounded-3xl border border-amber-900/15 bg-white/85 p-7 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">抽出履歴</p>
            <h1 className="mt-1 text-3xl font-bold text-amber-950 sm:text-4xl">
              Brew History Calendar
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            ダッシュボードへ戻る
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
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

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                )
              }
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
            >
              前の月
            </button>
            <p className="text-lg font-semibold text-amber-950">{monthLabel}</p>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                )
              }
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
            >
              次の月
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-amber-900/80 sm:text-sm">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-20 rounded-xl bg-transparent" />;
              }

              const dateKey = formatDateKey(date);
              const hasLogs = logsByDate.has(dateKey);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => hasLogs && setSelectedDate(dateKey)}
                  className={`relative h-20 rounded-xl border text-left transition ${
                    hasLogs
                      ? "border-amber-600 bg-amber-100 p-2 hover:bg-amber-200"
                      : "border-amber-200 bg-white p-2 text-amber-900/50"
                  }`}
                >
                  <span className="relative z-10 text-sm font-semibold">{date.getDate()}</span>
                  {hasLogs && (
                    <>
                      <div
                        className="absolute inset-1 z-0"
                        style={{
                          transform: `translate(${stampByDate.get(dateKey)?.x ?? 0}px, ${stampByDate.get(dateKey)?.y ?? 0}px) rotate(${stampByDate.get(dateKey)?.rotate ?? 0}deg)`,
                          opacity: stampByDate.get(dateKey)?.opacity ?? 0.28
                        }}
                      >
                        <StampIllustration
                          kind={stampKinds[stampByDate.get(dateKey)?.kindIndex ?? 0]}
                          seed={dateKey}
                        />
                      </div>
                      <span className="absolute bottom-2 right-2 z-10 rounded-full bg-amber-700 px-2 py-0.5 text-xs font-semibold text-white">
                        {logsByDate.get(dateKey)?.length}件
                      </span>
                      {pairingByDate.get(dateKey) && (
                        <span className="absolute right-2 top-2 z-10 text-sm">
                          {pairingByDate.get(dateKey)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-amber-900/80">
            記録がある日付は濃い背景 + スタンプで表示されます。クリックすると詳細を確認できます。
          </p>
        </div>
      </section>

      {selectedDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-amber-950/35 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-amber-900/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-950">{selectedDate} の抽出ログ</h2>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-md border border-amber-300 px-3 py-1 text-sm text-amber-900 transition hover:bg-amber-100"
              >
                閉じる
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
                >
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">豆:</span> {log.beanName}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">抽出方法:</span> {log.method}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">産地:</span>{" "}
                    {formatOriginsLabel(log)}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">テイスティング:</span>{" "}
                    {log.flavors.length > 0 ? log.flavors.join(", ") : "未入力"}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">アフタータスト:</span>{" "}
                    {log.aftertaste || "未入力"}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">メモ:</span> {log.memo}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">お供:</span>{" "}
                    {log.foodPairing ? `${pairingIcon(log.foodPairing)} ${log.foodPairing}` : "未入力"}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">使用器具:</span>{" "}
                    {log.equipmentName || "未入力"}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    <span className="font-semibold">工程:</span>{" "}
                    フィルターリンス {log.filterRinse ? "あり" : "なし"} / RDT{" "}
                    {log.rdtDone ? "おこなった" : "おこなっていない"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
