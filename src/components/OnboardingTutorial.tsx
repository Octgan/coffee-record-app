"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  isOnboardingTutorialDone,
  setOnboardingTutorialDone
} from "@/lib/onboardingTutorialStorage";

/** 最終フォールバック（外部 URL がすべて失敗したときのみ）。オフラインでも表示されます。 */
const TUTORIAL_ILLUSTRATION_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img">
  <defs>
    <linearGradient id="bg" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#3d2914"/>
      <stop offset="100%" stop-color="#1a0f0a"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" rx="28" fill="url(#bg)"/>
  <g fill="none" stroke="#e7c08c" stroke-width="9" stroke-linecap="round" opacity="0.85">
    <path d="M170 330 Q320 150 470 330"/>
  </g>
  <circle cx="320" cy="200" r="16" fill="#f59e0b" stroke="#fde68a" stroke-width="4"/>
  <g transform="translate(232 268)">
    <path d="M88 0 L168 0 L160 96 Q128 118 88 118 Q48 118 16 96 Z" fill="#78350f" stroke="#d4a574" stroke-width="4"/>
    <ellipse cx="88" cy="0" rx="88" ry="15" fill="#a16207"/>
    <path d="M52 28 Q88 6 124 28" stroke="#fde68a" stroke-width="6" stroke-linecap="round" fill="none"/>
  </g>
  <text x="320" y="430" text-anchor="middle" fill="#fcd34d" font-size="20" font-family="system-ui,sans-serif">Coffee</text>
</svg>`
)}`;

type TutorialSlide = {
  kicker: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  /** 1枚目が失敗したときの代替 URL（任意） */
  imageSrcFallback?: string;
};

const SLIDES: TutorialSlide[] = [
  {
    kicker: "はじめに",
    text: "ようこそ！あなただけのコーヒー記録帳へ。日々の美味しい一杯を残しましょう。",
    imageSrc:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    imageAlt: "カップに注がれたコーヒーと穏やかなカフェの雰囲気",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80"
  },
  {
    kicker: "抽出記録",
    text: "抽出記録：豆の量や温度を細かくメモして、最高のレシピを見つけましょう。",
    imageSrc:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=900&q=80",
    imageAlt: "ハンドドリップでコーヒーを抽出しているイメージ",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80"
  },
  {
    kicker: "カフェマップ",
    text: "カフェマップ：訪れたお気に入りのカフェを地図にピン留め。あなただけの地図を作れます。",
    imageSrc:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    imageAlt: "カフェの店内の雰囲気",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80"
  }
];

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export type OnboardingTutorialProps = {
  userId: string;
  replay?: boolean;
  onReplayClose?: () => void;
};

function useTutorialVariants(reduceMotion: boolean) {
  return useMemo(() => {
    const ease = [0.22, 1, 0.36, 1] as const;
    const softTween = { duration: 0.28, ease };
    if (reduceMotion) {
      return {
        container: {
          hidden: {},
          visible: {
            transition: { delayChildren: 0.06, staggerChildren: 0.06 }
          }
        },
        image: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        },
        kicker: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        },
        body: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        }
      };
    }
    return {
      container: {
        hidden: {},
        visible: {
          transition: {
            delayChildren: 0.2,
            staggerChildren: 0.14
          }
        }
      },
      image: {
        hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: SPRING
        }
      },
      kicker: {
        hidden: {
          opacity: 0,
          y: 18,
          filter: "blur(6px)",
          letterSpacing: "0.32em"
        },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          letterSpacing: "0.2em",
          transition: SPRING
        }
      },
      body: {
        hidden: {
          opacity: 0,
          y: 22,
          filter: "blur(7px)",
          letterSpacing: "0.1em"
        },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          letterSpacing: "0.02em",
          transition: SPRING
        }
      }
    };
  }, [reduceMotion]);
}

function buildSourceChain(slide: TutorialSlide): string[] {
  const chain = [slide.imageSrc];
  if (slide.imageSrcFallback) {
    chain.push(slide.imageSrcFallback);
  }
  chain.push(TUTORIAL_ILLUSTRATION_DATA_URI);
  return chain;
}

type TutorialStepMotionProps = {
  slide: TutorialSlide;
  step: number;
  reduceMotion: boolean;
  variants: ReturnType<typeof useTutorialVariants>;
};

function TutorialStepMotion({ slide, step, reduceMotion, variants }: TutorialStepMotionProps) {
  const sources = useMemo(() => buildSourceChain(slide), [slide]);
  const [attempt, setAttempt] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const displaySrc = sources[Math.min(attempt, sources.length - 1)]!;

  useEffect(() => {
    setAttempt(0);
    setImageReady(false);
  }, [step]);

  useEffect(() => {
    if (reduceMotion) {
      setImageReady(true);
      return;
    }
    const el = imgRef.current;
    if (el?.complete && el.naturalHeight > 0) {
      setImageReady(true);
    }
  }, [step, displaySrc, reduceMotion]);

  const showContent = reduceMotion || imageReady;

  const handleImageError = useCallback(() => {
    setImageReady(false);
    setAttempt((a) => {
      if (a >= sources.length - 1) {
        queueMicrotask(() => setImageReady(true));
        return a;
      }
      return a + 1;
    });
  }, [sources.length]);

  const handleImageLoad = useCallback(() => {
    setImageReady(true);
  }, []);

  return (
    <motion.div
      key={step}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-4 sm:gap-8"
      initial="hidden"
      animate={showContent ? "visible" : "hidden"}
      variants={variants.container}
    >
      <motion.div
        variants={variants.image}
        className="relative w-full max-w-[min(100%,20rem)] shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-amber-200/25 sm:max-w-xs"
        style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
      >
        <img
          ref={imgRef}
          key={`${step}-${attempt}-${displaySrc.slice(0, 48)}`}
          src={displaySrc}
          alt={slide.imageAlt}
          className="aspect-[4/3] h-auto w-full object-cover"
          decoding="async"
          loading="eager"
          fetchPriority="high"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
      </motion.div>

      <motion.p
        variants={variants.kicker}
        className="max-w-md text-center text-xs font-semibold text-amber-400/95"
        style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
      >
        {slide.kicker}
      </motion.p>
      <motion.h2
        id="onboarding-tutorial-heading"
        variants={variants.body}
        className="mt-2 max-w-md text-center text-[clamp(1.05rem,4vw,1.3rem)] font-semibold leading-relaxed text-amber-50 sm:text-lg"
        style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
      >
        {slide.text}
      </motion.h2>
    </motion.div>
  );
}

export default function OnboardingTutorial({
  userId,
  replay = false,
  onReplayClose
}: OnboardingTutorialProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const variants = useTutorialVariants(reduceMotion);
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

  /** チュートリアル表示中に先読みして、ステップ切替時の失敗を減らす */
  useEffect(() => {
    if (!open) {
      return;
    }
    for (const s of SLIDES) {
      for (const url of buildSourceChain(s)) {
        if (url.startsWith("data:")) {
          continue;
        }
        const img = new Image();
        img.src = url;
      }
    }
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

        <TutorialStepMotion slide={slide} step={step} reduceMotion={reduceMotion} variants={variants} />

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
