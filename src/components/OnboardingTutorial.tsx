"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  isOnboardingTutorialDone,
  setOnboardingTutorialDone
} from "@/lib/onboardingTutorialStorage";

const SLIDES = [
  {
    kicker: "はじめに",
    text: "ようこそ！あなただけのコーヒー記録帳へ。日々の美味しい一杯を残しましょう。",
    imageSrc:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    imageAlt: "カップに注がれたコーヒーと穏やかなカフェの雰囲気"
  },
  {
    kicker: "抽出記録",
    text: "抽出記録：豆の量や温度を細かくメモして、最高のレシピを見つけましょう。",
    imageSrc:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=900&q=80",
    imageAlt: "ハンドドリップでコーヒーを抽出しているイメージ"
  },
  {
    kicker: "カフェマップ",
    text: "カフェマップ：訪れたお気に入りのカフェを地図にピン留め。あなただけの地図を作れます。",
    imageSrc:
      "https://images.unsplash.com/photo-1524661135-423995f22d0f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "卓上の地図とコンパス——旅するようにカフェを巡るイメージ"
  }
] as const;

export type OnboardingTutorialProps = {
  userId: string;
  /** ヘルプから再表示するとき true（完了フラグは参照しない） */
  replay?: boolean;
  onReplayClose?: () => void;
};

export default function OnboardingTutorial({
  userId,
  replay = false,
  onReplayClose
}: OnboardingTutorialProps) {
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
    if (replay) {
      setOpen(true);
      setStep(0);
      return;
    }
    if (isOnboardingTutorialDone(userId)) {
      return;
    }
    setOpen(true);
    setStep(0);
  }, [mounted, userId, replay]);

  const finish = useCallback(() => {
    setOnboardingTutorialDone(userId);
    setOpen(false);
    onReplayClose?.();
  }, [userId, onReplayClose]);

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
  const slide = SLIDES[step];

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col bg-gradient-to-b from-[#120805] via-[#1f130d] to-[#0f0805] text-amber-50/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tutorial-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] bg-[radial-gradient(ellipse_75%_55%_at_50%_-5%,rgba(251,191,36,0.55),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />

      <div className="relative flex min-h-0 flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 sm:px-8">
        <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-amber-400/90">
          {step + 1} / {SLIDES.length}
        </p>

        <div
          key={step}
          className="motion-reduce:animate-none motion-reduce:transform-none motion-reduce:opacity-100 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-4 animate-tutorial-rise sm:gap-8"
        >
          <div className="relative w-full max-w-[min(100%,20rem)] shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-amber-200/25 sm:max-w-xs">
            <img
              src={slide.imageSrc}
              alt={slide.imageAlt}
              className="aspect-[4/3] h-auto w-full object-cover"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
          </div>

          <div className="max-w-md text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-400/95">{slide.kicker}</p>
            <h2
              id="onboarding-tutorial-heading"
              className="mt-2 text-[clamp(1.05rem,4vw,1.3rem)] font-semibold leading-relaxed text-amber-50 sm:text-lg"
            >
              {slide.text}
            </h2>
          </div>
        </div>

        <div className="mt-2 flex justify-center gap-2 pb-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`ステップ ${i + 1}`}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-amber-400 shadow-sm shadow-amber-900/40" : "w-2 bg-amber-800/90 hover:bg-amber-600"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-amber-900/35 bg-black/15 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:px-8">
        <button
          type="button"
          onClick={finish}
          className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-amber-200/95 underline-offset-4 transition hover:text-amber-50 hover:underline"
        >
          スキップ
        </button>
        <div className="flex flex-1 justify-end gap-2 sm:flex-initial">
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))}
              className="min-h-[44px] min-w-[7.5rem] rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 px-5 text-sm font-bold text-amber-950 shadow-lg shadow-black/35 transition hover:from-amber-400 hover:to-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              次へ
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="min-h-[44px] min-w-[7.5rem] rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 px-5 text-sm font-bold text-amber-950 shadow-lg shadow-black/35 transition hover:from-amber-400 hover:to-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
