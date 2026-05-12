"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COFFEE_ORIGINS } from "@/lib/coffeeOrigins";
import {
  BREW_LOG_JOURNAL_PAGE_SIZE,
  BREW_LOGS_UPDATED_EVENT,
  logMatchesCountryKey,
  normalizeMapCountryName,
  sliceLogsPage,
  type StoredBrewLog
} from "@/lib/brewLogStorage";
import { deleteBrewLog, fetchBrewLogs } from "@/lib/data/brewLogsDb";
import { createClient } from "@/lib/supabase/client";
import { journalShell } from "./shell";

type JournalSortKey = "dateDesc" | "dateAsc" | "ratingDesc" | "ratingAsc";

const JOURNAL_SORT_OPTIONS: { value: JournalSortKey; label: string }[] = [
  { value: "dateDesc", label: "日付が新しい順" },
  { value: "dateAsc", label: "日付が古い順" },
  { value: "ratingDesc", label: "評価が高い順" },
  { value: "ratingAsc", label: "評価が低い順" }
];

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

/** 豆名・店名（焙煎所名など）・器具名・メモから部分一致（スペース区切りはすべて一致） */
function logMatchesJournalSearch(log: StoredBrewLog, rawQuery: string): boolean {
  const normalized = rawQuery.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const haystack = [log.beanName, log.roastery, log.equipmentName ?? "", log.memo]
    .join(" ")
    .toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function groupLogsByDate(logs: StoredBrewLog[], dateKeyOrder: "desc" | "asc") {
  const map = new Map<string, StoredBrewLog[]>();
  for (const log of logs) {
    const existing = map.get(log.date) ?? [];
    map.set(log.date, [...existing, log]);
  }
  const dates = Array.from(map.keys()).sort((a, b) =>
    dateKeyOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
  );
  return dates.map((date) => ({ date, items: map.get(date) ?? [] }));
}

function sortLogs(list: StoredBrewLog[], sortKey: JournalSortKey): StoredBrewLog[] {
  const next = [...list];
  next.sort((a, b) => {
    switch (sortKey) {
      case "dateDesc":
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.id - a.id;
      case "dateAsc":
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.id - b.id;
      case "ratingDesc":
        if (b.overallRating !== a.overallRating) {
          return b.overallRating - a.overallRating;
        }
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.id - a.id;
      case "ratingAsc":
        if (a.overallRating !== b.overallRating) {
          return a.overallRating - b.overallRating;
        }
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.id - a.id;
      default:
        return 0;
    }
  });
  return next;
}

type LogEntryArticleProps = {
  log: StoredBrewLog;
  onDelete: (log: StoredBrewLog) => void;
  deleteDisabled?: boolean;
};

function LogEntryArticle({ log, onDelete, deleteDisabled }: LogEntryArticleProps) {
  const flavors = log.flavors ?? [];
  const { filled, empty } = clampRatingStars(log.overallRating);
  return (
    <article
      id={`journal-log-${log.id}`}
      className="scroll-mt-32 rounded-2xl border border-amber-200/90 bg-gradient-to-b from-white to-amber-50/40 p-6 shadow-md shadow-amber-950/5 sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-lg font-bold leading-snug text-amber-950 sm:text-xl">{log.beanName}</p>
          {log.brewPhotoUrl && (
            <div className="mt-2 overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/40">
              <img
                src={log.brewPhotoUrl}
                alt=""
                className="max-h-56 w-full object-cover sm:max-h-64"
              />
            </div>
          )}
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
            onClick={() => onDelete(log)}
            disabled={deleteDisabled}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
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
            <span className="font-semibold text-amber-900">アフターテイスト</span>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">メモ</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-[1.75] text-amber-950/95">
              {log.memo}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

export function JournalClient() {
  const searchParams = useSearchParams();
  const searchSignature = searchParams.toString();
  const dateFilter = searchParams.get("date");
  const countryKeyRaw = searchParams.get("country");

  const [logs, setLogs] = useState<StoredBrewLog[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<JournalSortKey>("dateDesc");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const skipScrollTopOnPaginationMount = useRef(true);

  const refreshFromStorage = useCallback(async () => {
    try {
      const supabase = createClient();
      const list = await fetchBrewLogs(supabase);
      setLogs(list);
    } catch {
      setLogs([]);
    }
  }, []);

  /** URL・ページ・検索・並び替えのたびに再読込（他画面での保存と常に整合） */
  useEffect(() => {
    void refreshFromStorage();
  }, [searchSignature, currentPage, searchQuery, sortKey, refreshFromStorage]);

  useEffect(() => {
    const onUpdated = () => void refreshFromStorage();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        void refreshFromStorage();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshFromStorage();
      }
    };
    window.addEventListener(BREW_LOGS_UPDATED_EVENT, onUpdated);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(BREW_LOGS_UPDATED_EVENT, onUpdated);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshFromStorage]);

  const filteredLogs = useMemo(() => {
    if (!logs) {
      return [];
    }
    let list = [...logs];
    if (countryKeyRaw) {
      const key = normalizeMapCountryName(countryKeyRaw);
      list = list.filter((log) => logMatchesCountryKey(log, key));
    }
    if (dateFilter) {
      list = list.filter((log) => log.date === dateFilter);
    }
    list = list.filter((log) => logMatchesJournalSearch(log, searchQuery));
    return sortLogs(list, sortKey);
  }, [logs, countryKeyRaw, dateFilter, searchQuery, sortKey]);

  const logsReady = logs !== null;

  const { pageSlice, totalPages, total, clampedPage } = useMemo(
    () => sliceLogsPage(filteredLogs, currentPage, BREW_LOG_JOURNAL_PAGE_SIZE),
    [filteredLogs, currentPage]
  );

  const isRatingSort = sortKey === "ratingDesc" || sortKey === "ratingAsc";
  const logsByDate = useMemo(() => {
    if (sortKey === "ratingDesc" || sortKey === "ratingAsc") {
      return [];
    }
    const dateOrder = sortKey === "dateAsc" ? "asc" : "desc";
    return groupLogsByDate(pageSlice, dateOrder);
  }, [pageSlice, sortKey]);

  useEffect(() => {
    if (clampedPage !== currentPage) {
      setCurrentPage(clampedPage);
    }
  }, [clampedPage, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [countryKeyRaw, dateFilter, searchQuery, sortKey]);

  useEffect(() => {
    if (skipScrollTopOnPaginationMount.current) {
      skipScrollTopOnPaginationMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (logs === null || typeof window === "undefined") {
      return;
    }
    const country = countryKeyRaw?.trim();
    const date = dateFilter?.trim();
    if (!country && !date) {
      return;
    }
    if (currentPage !== 1) {
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
  }, [logs, countryKeyRaw, dateFilter, filteredLogs, currentPage]);

  const handleDelete = async (log: StoredBrewLog) => {
    if (deletingId !== null) {
      return;
    }
    const ok = window.confirm(
      `「${log.beanName}」（${log.date}）の記録を削除しますか？\nこの操作は取り消せません。`
    );
    if (!ok) {
      return;
    }
    setDeletingId(log.id);
    try {
      const supabase = createClient();
      await deleteBrewLog(supabase, log.id);
      window.dispatchEvent(new Event(BREW_LOGS_UPDATED_EVENT));
      await refreshFromStorage();
    } catch {
      window.alert("削除に失敗しました。通信状況を確認してからもう一度お試しください。");
      await refreshFromStorage();
    } finally {
      setDeletingId(null);
    }
  };

  const resetLocalFilters = () => {
    setSearchQuery("");
    setSortKey("dateDesc");
  };

  const countryLabel =
    countryKeyRaw &&
    COFFEE_ORIGINS.find(
      (o) => normalizeMapCountryName(o.value) === normalizeMapCountryName(countryKeyRaw)
    )?.label;

  const hasUrlFilter = Boolean(countryKeyRaw || dateFilter);
  const hasSearchOrSort =
    searchQuery.trim() !== "" || sortKey !== "dateDesc";
  const showResetLink = hasUrlFilter || hasSearchOrSort;

  const emptyMessageTitle = (() => {
    if (!logs || logs.length === 0) {
      return "まだ記録がありません。";
    }
    if (filteredLogs.length === 0) {
      if (searchQuery.trim()) {
        return "検索や絞り込みに一致する記録はありません。";
      }
      if (hasUrlFilter) {
        return "この条件に合う記録はありません。";
      }
      return "表示できる記録がありません。";
    }
    return "";
  })();

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
          <h1 className="text-center text-3xl font-bold tracking-tight text-amber-50 sm:text-4xl">
            My coffee note
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
            {showResetLink && (
              <Link
                href="/journal"
                onClick={resetLocalFilters}
                className="rounded-xl border border-amber-600/50 bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-500 hover:bg-amber-900/50 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:ring-offset-2 focus:ring-offset-stone-900"
              >
                条件をリセット
              </Link>
            )}
          </div>
        </header>

        {hasUrlFilter && (
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
                日付 <span className="font-semibold text-amber-50">{dateFilter}</span>
              </p>
            )}
          </div>
        )}

        {logsReady && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="豆名・店名・メモで検索…"
              autoComplete="off"
              aria-label="キーワードで検索（豆名・店名・メモ）"
              className="min-h-12 w-full flex-1 rounded-xl border border-amber-700/40 bg-stone-900/60 px-4 py-3 text-sm text-amber-50 placeholder:text-amber-200/40 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 sm:min-w-0"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as JournalSortKey)}
              aria-label="並び替え"
              className="min-h-12 w-full cursor-pointer rounded-xl border border-amber-700/40 bg-stone-900/60 px-4 py-3 text-sm font-medium text-amber-50 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 sm:w-52 sm:flex-none sm:shrink-0"
            >
              {JOURNAL_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-stone-900 text-amber-50">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {!logsReady ? (
          <div className="mt-12 rounded-3xl border border-amber-800/30 bg-stone-900/40 px-8 py-16 text-center shadow-lg backdrop-blur-sm">
            <p className="text-sm font-medium text-amber-200/90">読み込み中…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-amber-700/35 bg-stone-900/40 px-8 py-16 text-center shadow-lg backdrop-blur-sm">
            <p className="text-lg font-semibold text-amber-50">{emptyMessageTitle}</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-amber-200/70">
              {logs.length === 0
                ? "一杯ずつ綴ると、ここにあなただけのコーヒー日記が増えていきます。"
                : "検索ワードを変えるか、条件をリセットしてみてください。"}
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
            {totalPages > 1 && (
              <p className="text-center text-sm text-amber-200/85">
                全 <span className="font-semibold text-amber-100">{total}</span> 件中、
                <span className="font-semibold text-amber-50">
                  {(currentPage - 1) * BREW_LOG_JOURNAL_PAGE_SIZE + 1}–
                  {Math.min(currentPage * BREW_LOG_JOURNAL_PAGE_SIZE, total)}
                </span>{" "}
                件を表示
              </p>
            )}

            {isRatingSort ? (
              <ul className="flex list-none flex-col gap-7 sm:gap-8">
                {pageSlice.map((log) => (
                  <li key={log.id}>
                    <LogEntryArticle
                      log={log}
                      onDelete={handleDelete}
                      deleteDisabled={deletingId !== null}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              logsByDate.map(({ date, items }) => (
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
                    {items.map((log) => (
                      <li key={log.id}>
                        <LogEntryArticle
                          log={log}
                          onDelete={handleDelete}
                          deleteDisabled={deletingId !== null}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}

            {totalPages > 1 && (
              <nav
                className="mt-12 border-t border-amber-800/30 pt-10"
                aria-label="ページ送り"
              >
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || deletingId !== null}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="min-h-12 w-full rounded-xl border border-amber-600/50 bg-amber-950/50 px-5 py-3.5 text-sm font-semibold leading-snug text-amber-100 shadow-sm transition hover:border-amber-500 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-[11rem] sm:w-auto"
                  >
                    前へ <span className="text-xs font-normal text-amber-200/75">(Previous)</span>
                  </button>
                  <p className="text-center text-sm font-semibold tabular-nums text-amber-100 sm:px-2">
                    <span className="text-amber-200/80">Page </span>
                    {currentPage}
                    <span className="text-amber-200/80"> / </span>
                    {totalPages}
                  </p>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages || deletingId !== null}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-12 w-full rounded-xl border border-amber-600/50 bg-amber-950/50 px-5 py-3.5 text-sm font-semibold leading-snug text-amber-100 shadow-sm transition hover:border-amber-500 hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-[11rem] sm:w-auto"
                  >
                    次へ <span className="text-xs font-normal text-amber-200/75">(Next)</span>
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
