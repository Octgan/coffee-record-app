"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CafeRecord } from "@/lib/cafeMapStorage";

type CafeMapDetailCardProps = {
  record: CafeRecord;
  onEdit: (record: CafeRecord) => void;
  onDelete: (record: CafeRecord) => void;
  onClose?: () => void;
};

export default function CafeMapDetailCard({
  record,
  onEdit,
  onDelete,
  onClose
}: CafeMapDetailCardProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.article
      key={record.id}
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
      aria-labelledby="cafe-detail-title"
    >
      {record.photoUrl && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={{ delay: 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[16/9] w-full overflow-hidden bg-amber-50 sm:aspect-[2/1]"
        >
          <img
            src={record.photoUrl}
            alt={record.cafeName}
            className="h-full w-full object-cover"
          />
        </motion.div>
      )}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 26 }}
        className="space-y-3 p-4 sm:p-5"
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.3 }}
          className="flex items-start justify-between gap-3"
        >
          <div className="min-w-0 space-y-1">
            <h2
              id="cafe-detail-title"
              className="text-lg font-bold leading-snug text-neutral-900 sm:text-xl"
            >
              {record.cafeName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-neutral-600">
              <time dateTime={record.date}>{record.date}</time>
              <span className="text-amber-600" aria-label={`評価 ${record.rating} / 5`}>
                {"★".repeat(record.rating)}
                <span className="text-neutral-200">{"★".repeat(5 - record.rating)}</span>
              </span>
            </div>
          </div>
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

        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
          >
            編集
          </button>
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            削除
          </button>
        </div>
      </motion.div>
    </motion.article>
  );
}
