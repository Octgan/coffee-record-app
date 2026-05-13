"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  isOnboardingTutorialDone,
  setOnboardingTutorialDone
} from "@/lib/onboardingTutorialStorage";

const SLIDES = [
  "ようこそ！あなただけのコーヒー記録帳へ。日々の美味しい一杯を残しましょう。",
  "抽出記録：豆の量や温度を細かくメモして、最高のレシピを見つけましょう。",
  "カフェマップ：訪れたお気に入りのカフェを地図にピン留め。あなただけの地図を作れます。"
] as const;

type OnboardingTutorialProps = {
  userId: string;
};

export default function OnboardingTutorial({ userId }: OnboardingTutorialProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) {
      return;
    }
    if (isOnboardingTutorialDone(userId)) {
      return;
    }
    setOpen(true);
    setStep(0);
  }, [mounted, userId]);

  const finish = useCallback(() => {
    setOnboardingTutorialDone(userId);
    setOpen(false);
  }, [userId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col bg-gradient-to-b from-[#140a06] via-[#23160d] to-[#120805] text-amber-50/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tutorial-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(251,191,36,0.9),transparent)]" />

      <div className="relative flex min-h-0 flex-1 flex-col px-6 pt-[max(1.75rem,env(safe-area-inset-top))] pb-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-amber-500/90">
          {step + 1} / {SLIDES.length}
        </p>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p
            aria-hidden
            className="mb-6 text-5xl drop-shadow-lg sm:text-6xl"
          >
            ☕
          </p>
          <h2
            id="onboarding-tutorial-heading"
            className="max-w-lg text-[clamp(1.05rem,4.2vw,1.35rem)] font-semibold leading-relaxed text-amber-50 sm:text-xl"
          >
            {SLIDES[step]}
          </h2>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`ステップ ${i + 1}`}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === step ? "w-8 bg-amber-400" : "w-2.5 bg-amber-700/80 hover:bg-amber-600"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-amber-900/40 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={finish}
          className="min-h-[44px] rounded-xl px-4 text-sm font-semibold text-amber-200/90 underline-offset-4 transition hover:text-amber-50 hover:underline"
        >
          スキップ
        </button>
        <div className="flex flex-1 justify-end gap-2 sm:flex-initial">
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))}
              className="min-h-[44px] min-w-[7rem] rounded-xl bg-amber-600 px-5 text-sm font-bold text-amber-950 shadow-lg shadow-black/30 transition hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              次へ
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="min-h-[44px] min-w-[7rem] rounded-xl bg-amber-600 px-5 text-sm font-bold text-amber-950 shadow-lg shadow-black/30 transition hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
