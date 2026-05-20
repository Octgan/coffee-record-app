"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { CafeRecord } from "@/lib/cafeMapStorage";
import {
  type CafeSpot,
  visitRankBadgeLabel,
  visitRankShortLabel
} from "@/lib/cafeSpotUtils";

type CafeMapSpotPanelProps = {
  spot: CafeSpot;
  onAddVisit: (spot: CafeSpot) => void;
  onEdit: (record: CafeRecord) => void;
  onDelete: (record: CafeRecord) => void;
  onClose?: () => void;
};

function VisitSlide({
  record,
  reduceMotion
}: {
  record: CafeRecord;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 24 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="space-y-3"
    >
      {record.photoUrl && (
        <motion.div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-amber-50 sm:aspect-[2/1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.photoUrl}
            alt={record.cafeName}
            className="h-full w-full object-cover"
          />
        </motion.div>
      )}

      <motion.div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-neutral-600">
        <time dateTime={record.date} className="font-medium text-neutral-800">
          {record.date}
        </time>
        <span className="text-amber-600" aria-label={`評価 ${record.rating} / 5`}>
          {"★".repeat(record.rating)}
          <span className="text-neutral-200">{"★".repeat(5 - record.rating)}</span>
        </span>
      </motion.div>

      {record.bean.trim() !== "" && record.bean !== "未入力" && (
        <p className="text-sm text-neutral-700">
          <span className="font-semibold text-neutral-800">ドリンク</span> {record.bean}
        </p>
      )}
      {record.foodPairing && (
        <p className="text-sm text-neutral-700">
          <span className="font-semibold text-neutral-800">お供</span> {record.foodPairing}
        </p>
      )}
      {record.note.trim() !== "" && (
        <p className="text-sm leading-relaxed text-neutral-600">
          <span className="font-semibold text-neutral-800">メモ</span>
          <br />
          {record.note}
        </p>
      )}
    </motion.div>
  );
}

export default function CafeMapSpotPanel({
  spot,
  onAddVisit,
  onEdit,
  onDelete,
  onClose
}: CafeMapSpotPanelProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [visitIndex, setVisitIndex] = useState(0);
  const rankLabel = visitRankBadgeLabel(spot.rank);
  const rankShort = visitRankShortLabel(spot.rank);
  const hasMultiple = spot.visitCount > 1;
  const activeRecord = spot.visits[visitIndex] ?? spot.visits[0];

  useEffect(() => {
    setVisitIndex(0);
  }, [spot.spotKey]);

  useEffect(() => {
    if (visitIndex >= spot.visits.length) {
      setVisitIndex(Math.max(0, spot.visits.length - 1));
    }
  }, [spot.visits.length, visitIndex]);

  const goPrev = () => setVisitIndex((i) => Math.max(0, i - 1));
  const goNext = () => setVisitIndex((i) => Math.min(spot.visits.length - 1, i + 1));

  return (
    <motion.article
      layout
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: 28, scale: 0.98, filter: "blur(8px)" }
      }
      animate={
        reduceMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      }
      exit={
        reduceMotion
          ? undefined
          : { opacity: 0, y: 16, scale: 0.99, filter: "blur(4px)" }
      }
      transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.75 }}
      className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-lg shadow-amber-950/8"
      aria-labelledby="cafe-spot-title"
    >
      <motion.div className="space-y-3 border-b border-neutral-100 bg-gradient-to-br from-amber-50/80 via-white to-white p-4 sm:p-5">
        <motion.div className="flex items-start justify-between gap-3">
          <motion.div className="min-w-0 space-y-2">
            <h2
              id="cafe-spot-title"
              className="text-lg font-bold leading-snug text-neutral-900 sm:text-xl"
            >
              {spot.cafeName}
            </h2>
            <motion.div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-950">
                通った回数：{spot.visitCount}回
              </span>
              {rankLabel && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                    spot.rank === "gold"
                      ? "bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 text-amber-950 ring-1 ring-amber-400/50"
                      : "bg-gradient-to-r from-neutral-200 via-slate-100 to-neutral-300 text-neutral-800 ring-1 ring-neutral-400/40"
                  }`}
                >
                  {rankLabel}
                </span>
              )}
            </motion.div>
          </motion.div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              閉じる
            </button>
          )}
        </motion.div>

        <button
          type="button"
          onClick={() => onAddVisit(spot)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
        >
          <span className="text-base leading-none" aria-hidden>
            ＋
          </span>
          新しい記録を追加
        </button>
      </motion.div>

      <motion.div className="p-4 sm:p-5">
        {hasMultiple && (
          <motion.div
            className="mb-3 flex items-center justify-between gap-2"
            aria-label="訪問記録の切り替え"
          >
            <button
              type="button"
              onClick={goPrev}
              disabled={visitIndex <= 0}
              className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="前の訪問"
            >
              ←
            </button>
            <motion.div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-800/70">
                訪問タイムライン
              </p>
              <motion.div className="flex flex-wrap justify-center gap-1">
                {spot.visits.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVisitIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === visitIndex
                        ? "w-6 bg-amber-600"
                        : "w-2 bg-amber-200 hover:bg-amber-400"
                    }`}
                    aria-label={`${v.date} の記録`}
                    aria-current={i === visitIndex ? "true" : undefined}
                  />
                ))}
              </motion.div>
            </motion.div>
            <span className="shrink-0 text-xs tabular-nums text-neutral-500">
              {visitIndex + 1} / {spot.visitCount}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={visitIndex >= spot.visits.length - 1}
              className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="次の訪問"
            >
              →
            </button>
          </motion.div>
        )}

        <motion.div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {activeRecord && (
              <VisitSlide key={activeRecord.id} record={activeRecord} reduceMotion={reduceMotion} />
            )}
          </AnimatePresence>
        </motion.div>

        {rankShort && hasMultiple && (
          <p className="mt-2 text-center text-[11px] text-amber-800/60">{rankShort} — ありがとうございます</p>
        )}

        {activeRecord && (
          <motion.div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={() => onEdit(activeRecord)}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
            >
              この記録を編集
            </button>
            <button
              type="button"
              onClick={() => onDelete(activeRecord)}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              削除
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.article>
  );
}
