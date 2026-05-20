import { Suspense } from "react";
import DripTimerClient from "@/components/DripTimerClient";

export default function DripTimerPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-amber-800">
          タイマーを読み込んでいます…
        </main>
      }
    >
      <DripTimerClient />
    </Suspense>
  );
}
