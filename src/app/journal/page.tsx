import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalClient } from "./JournalClient";
import { journalShell } from "./shell";

/** useSearchParams 利用時の静的生成エラー / 500 を避ける */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My coffee note",
  description: "これまでの抽出記録を振り返るマイ・ノート。"
};

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <main className={`${journalShell} flex items-center justify-center px-4`}>
          <p className="text-sm font-medium text-amber-200/80">読み込み中…</p>
        </main>
      }
    >
      <JournalClient />
    </Suspense>
  );
}
