"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { COFFEE_ORIGINS } from "@/lib/coffeeOrigins";
import {
  loadBrewLogsFromStorage,
  logMatchesCountryKey,
  normalizeMapCountryName,
  persistBrewLogs,
  type StoredBrewLog
} from "@/lib/brewLogStorage";
import { journalShell } from "./shell";

function formatOriginsLabel(log: StoredBrewLog) {
  const origins =
    log.origins && log.origins.length > 0
      ? log.origins.map((origin) => origin.country)
      : [log.originCountry];
  return origins
    .map(
      (country) => COFFEE_ORIGINS.find((item) => item.value === country)?.label ?? country
    )
    .join(" / ");
}

function pairingIcon(pairing: string) {
  if (pairing.includes("ケーキ")) return "🍰";
  if (pairing.includes("スコーン")) return "🥐";
  if (pairing.includes("チョコ")) return "🍫";
  if (pairing.includes("クッキー")) return "🍪";
  return "🍽️";
}

function clampRatingStars(rating: number | undefined) {
  const n = Math.round(Number(rating));
  if (!Number.isFinite(n)) {
    return { filled: 4, empty: 1 };
  }
  const filled = Math.min(5, Math.max(1, n));
  return { filled, empty: 5 - filled };
}

export function JournalClient() {
  const searchParams = useSearchParams();
  /** ReadonlyURLSearchParams の参照が毎レンダー変わる場合があるため、クエリ文字列で effect を安定化 */
  const searchSignature = searchParams.toString();
  const dateFilter = searchParams.get("date");
  const countryKeyRaw = searchParams.get("country");

  const [logs, setLogs] = useState<StoredBrewLog[] | null>(null);

  const reload = useCallback(() => {
    setLogs(loadBrewLogsFromStorage());
  }, []);

  useEffect(() => {
    reload();
  }, [searchSignature, reload]);

  const filteredLogs = useMemo(() => {
    if (!logs) {
      return [];
    }
    let list = [...logs].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });
    if (countryKeyRaw) {
      const key = normalizeMapCountryName(countryKeyRaw);
      list = list.filter((log) => logMatchesCountryKey(log, key));
    }
    if (dateFilter) {
      list = list.filter((log) => log.date === dateFilter);
    }
    return list;
  }, [logs, countryKeyRaw, dateFilter]);

  const logsReady = logs !== null;

  const logsByDate = useMemo(() => {
    const map = new Map<string, StoredBrewLog[]>();
    for (const log of filteredLogs) {
      const existing = map.get(log.date) ?? [];
      map.set(log.date, [...existing, log]);
    }
    const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return dates.map((date) => ({ date, items: map.get(date) ?? [] }));
  }, [filteredLogs]);

  useEffect(() => {
    if (logs === null || typeof window === "undefined") {
      return;
    }
    const country = countryKeyRaw?.trim();
    const date = dateFilter?.trim();
    if (!country && !date) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (country) {
        const first = filteredLogs[0];
        if (first) {
          document
            .getElementById(`journal-log-${first.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      if (date) {
        document
          .getElementById(`journal-day-${date}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [logs, countryKeyRaw, dateFilter, filteredLogs]);

  const handleDelete = (log: StoredBrewLog) => {
    const ok = window.confirm(
      `「${log.beanName}」（${log.date}）の記録を削除しますか？\nこの操作は取り消せません。`
    );
    if (!ok) {
      return;
    }
    const all = loadBrewLogsFromStorage();
    const next = all.filter((item) => item.id !== log.id);
    persistBrewLogs(next);
    reload();
  };

  const countryLabel =
    countryKeyRaw &&
    COFFEE_ORIGINS.find(
      (o) => normalizeMapCountryName(o.value) === normalizeMapCountryName(countryKeyRaw)
    )?.label;

  const hasActiveFilter = Boolean(countryKeyRaw || dateFilter);

  return (
    <main className={journalShell}>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23d4a574'%3E%3Ccircle cx='10' cy='12' r='1.2'/%3E%3Ccircle cx='44' cy='38' r='0.9'/%3E%3Ccircle cx='68' cy='14' r='1'/%3E%3Ccircle cx='28' cy='62' r='0.85'/%3E%3C/g%3E%3C/svg%3E")`
        }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="rounded-3xl border border-amber-900/25 bg-stone-900/50 p-8 shadow-xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <p className="text-center text-sm font-semibold tracking-wide text-amber-400/90">
            My Journal
          </p>
          <h1 className="mt-2 text-center text-3xl font-bold tracking-tight text-amber-50 sm:text-4xl">
            マイ・ノート
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-amber-200/75">
            これまでの抽出記録を、静かなカフェの一角でめくるノートのように振り返れます。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/brew/new"
              className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-950/30 transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-stone-900"
            >
              ＋ 新しく記録する
            </Link>
            {hasActiveFilter && (
              <Link
                href="/journal"
                className="rounded-xl border border-amber-600/50 bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-500 hover:bg-amber-900/50 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:ring-offset-2 focus:ring-offset-stone-900"
              >
                フィルターを解除
              </Link>
            )}
          </div>
        </header>

        {hasActiveFilter && (
          <div className="mt-8 rounded-2xl border border-amber-600/25 bg-amber-950/35 px-5 py-4 text-center text-sm leading-relaxed text-amber-100/95 shadow-inner backdrop-blur-sm">
            {countryKeyRaw && (
              <p>
                産地{" "}
                <span className="font-semibold text-amber-50">
                  {countryLabel ?? countryKeyRaw}
                </span>{" "}
                の記録を表示しています
              </p>
            )}
            {dateFilter && (
              <p className={countryKeyRaw ? "mt-2" : ""}>
                日付{" "}
                <span className="font-semibold text-amber-50">{dateFilter}</span>
              </p>
            )}
          </div>
        )}

        {!logsReady ? (
          <div className="mt-12 rounded-3xl border border-amber-800/30 bg-stone-900/40 px-8 py-16 text-center shadow-lg backdrop-blur-sm">
            <p className="text-sm font-medium text-amber-200/90">読み込み中…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-amber-700/35 bg-stone-900/40 px-8 py-16 text-center shadow-lg backdrop-blur-sm">
            <p className="text-lg font-semibold text-amber-50">
              {hasActiveFilter ? "この条件に合う記録はありません。" : "まだ記録がありません。"}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-amber-200/70">
              一杯ずつ綴ると、ここにあなただけのコーヒー日記が増えていきます。
            </p>
            <Link
              href="/brew/new"
              className="mt-8 inline-block rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-stone-900"
            >
              抽出を記録する
            </Link>
          </div>
        ) : (
          <div className="mt-12 space-y-12 sm:space-y-14">
            {logsByDate.map(({ date, items }) => (
              <section
                key={date}
                id={`journal-day-${date}`}
                className={`scroll-mt-28 rounded-3xl border border-amber-900/20 bg-white/90 p-6 shadow-xl shadow-amber-950/15 backdrop-blur-sm sm:p-9 ${
                  dateFilter === date
                    ? "ring-2 ring-amber-500/90 ring-offset-[6px] ring-offset-[#1c1612]"
                    : ""
                }`}
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-amber-200/90 pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800/70">
                      Entry date
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-amber-950 sm:text-3xl">{date}</h2>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                    {items.length} 件
                  </span>
                </div>

                <ul className="mt-8 flex list-none flex-col gap-7 sm:gap-8">
                  {items.map((log) => {
                    const flavors = log.flavors ?? [];
                    const { filled, empty } = clampRatingStars(log.overallRating);
                    return (
                      <li key={log.id}>
                        <article
                          id={`journal-log-${log.id}`}
                          className="scroll-mt-32 rounded-2xl border border-amber-200/90 bg-gradient-to-b from-white to-amber-50/40 p-6 shadow-md shadow-amber-950/5 sm:p-8"
                        >
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-lg font-bold leading-snug text-amber-950 sm:text-xl">
                                {log.beanName}
                              </p>
                              <p className="text-xs font-medium leading-relaxed text-amber-800/85 sm:text-sm">
                                {log.method} · {log.roastLevel} · {formatOriginsLabel(log)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                              <Link
                                href={`/brew/new?edit=${log.id}`}
                                className="rounded-lg border border-amber-600 bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                編集
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(log)}
                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                              >
                                削除
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 space-y-3 text-sm leading-relaxed text-amber-950/95">
                            <p>
                              <span className="font-semibold text-amber-900">評価</span>
                              <span className="mx-2 text-amber-800/50">·</span>
                              <span className="text-amber-800">
                                {"★".repeat(filled)}
                                <span className="text-amber-600/60">{"☆".repeat(empty)}</span>
                              </span>
                            </p>
                            {flavors.length > 0 && (
                              <p>
                                <span className="font-semibold text-amber-900">フレーバー</span>
                                <span className="mx-2 text-amber-800/50">·</span>
                                {flavors.join(", ")}
                              </p>
                            )}
                            {log.aftertaste && (
                              <p>
                                <span className="font-semibold text-amber-900">
                                  アフタータスト
                                </span>
                                <span className="mx-2 text-amber-800/50">·</span>
                                {log.aftertaste}
                              </p>
                            )}
                            {log.foodPairing && (
                              <p>
                                <span className="font-semibold text-amber-900">お供</span>
                                <span className="mx-2 text-amber-800/50">·</span>
                                <span className="inline-flex items-center gap-1.5">
                                  <span>{pairingIcon(log.foodPairing)}</span>
                                  {log.foodPairing}
                                </span>
                              </p>
                            )}
                            {log.memo && (
                              <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/50 px-5 py-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">
                                  メモ
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-[1.75] text-amber-950/95">
                                  {log.memo}
                                </p>
                              </div>
                            )}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
