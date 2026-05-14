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
  title: string;
  /** スマホで読みやすい短いブロックごとの段落（\n で行内改行可） */
  paragraphs: string[];
  imageSrc: string;
  imageAlt: string;
  /** 1枚目が失敗したときの代替 URL（任意） */
  imageSrcFallback?: string;
};

const SLIDES: TutorialSlide[] = [
  {
    title: "ようこそ、あなただけの記録帳へ",
    paragraphs: [
      "毎日の一杯を、もっと特別なものに。",
      "ここは、あなたが淹れたコーヒーの香りと\n記憶をそっと綴っておく場所です。"
    ],
    imageSrc:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
    imageAlt: "カップに注がれたコーヒーと穏やかなカフェの雰囲気",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "一杯の物語を残しましょう",
    paragraphs: [
      "豆の種類や淹れ方、その時の気分。",
      "自由に記録して、自分好みの\n「最高の一杯」を見つけてみてください。"
    ],
    imageSrc:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=900&q=80",
    imageAlt: "ハンドドリップでコーヒーを抽出しているイメージ",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "世界と街を、コーヒーで繋ぐ",
    paragraphs: [
      "訪れたカフェや、豆の産地を地図に。",
      "あなたのコーヒーライフが広がるほど、\n地図が鮮やかに彩られていきます。"
    ],
    imageSrc:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    imageAlt: "カフェの店内と、地図で旅するコーヒーのイメージ",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "それでは、コーヒーの旅をお楽しみください",
    paragraphs: [],
    imageSrc:
      "https://images.unsplash.com/photo-1447936433408-61ad784e2fc4?auto=format&fit=crop&w=900&q=80",
    imageAlt: "コーヒーを丁寧にハンドドリップで淹れる様子",
    imageSrcFallback:
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=900&q=80"
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
            transition: { delayChildren: 0.05, staggerChildren: 0.08 }
          }
        },
        tutorialLabel: {
          hidden: { opacity: 0 },
          visible: { opacity: 0.8, transition: softTween }
        },
        image: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        },
        title: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        },
        paragraph: {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: softTween }
        },
        cta: {
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
            delayChildren: 0.1,
            staggerChildren: 0.12
          }
        }
      },
      tutorialLabel: {
        hidden: {
          opacity: 0,
          y: 14,
          filter: "blur(5px)"
        },
        visible: {
          opacity: 0.8,
          y: 0,
          filter: "blur(0px)",
          transition: { ...SPRING, stiffness: 110, damping: 22 }
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
      title: {
        hidden: {
          opacity: 0,
          y: 22,
          filter: "blur(7px)",
          letterSpacing: "0.06em"
        },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          letterSpacing: "0.02em",
          transition: SPRING
        }
      },
      paragraph: {
        hidden: {
          opacity: 0,
          y: 18,
          filter: "blur(6px)"
        },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: SPRING
        }
      },
      cta: {
        hidden: {
          opacity: 0,
          y: 16,
          filter: "blur(5px)"
        },
        visible: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
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
  onComplete: () => void;
};

function TutorialStepMotion({
  slide,
  step,
  reduceMotion,
  variants,
  onComplete
}: TutorialStepMotionProps) {
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

  const showTutorialLabel = step >= 1 && step < SLIDES.length - 1;
  const isClosingSlide = step === SLIDES.length - 1;

  return (
    <div
      key={step}
      className="flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-1 py-2 sm:gap-5 sm:px-0"
    >
      <motion.div
        className="flex w-full flex-col items-center gap-4 sm:gap-5"
        initial="hidden"
        animate={showContent ? "visible" : "hidden"}
        variants={variants.container}
      >
        {showTutorialLabel && (
          <motion.p
            key={`tutorial-label-${step}`}
            variants={variants.tutorialLabel}
            className="w-full max-w-[min(100%,22rem)] text-center text-xs font-normal tracking-[0.2em] text-amber-400 sm:max-w-md"
            style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
          >
            Tutorial
          </motion.p>
        )}
        <motion.div
          variants={variants.image}
          className="relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-amber-200/25 sm:max-w-sm"
          style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
        >
          <img
            ref={imgRef}
            key={`${step}-${attempt}-${displaySrc.slice(0, 48)}`}
            src={displaySrc}
            alt={slide.imageAlt}
            className="h-full w-full max-w-full object-cover"
            decoding="async"
            loading="eager"
            fetchPriority="high"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
        </motion.div>

        <motion.h2
          id="onboarding-tutorial-heading"
          variants={variants.title}
          className={
            isClosingSlide
              ? "w-full max-w-[min(100%,24rem)] text-balance text-center text-[clamp(1.2rem,5.2vw,1.75rem)] font-semibold leading-relaxed tracking-normal text-amber-50 break-keep sm:max-w-lg sm:text-2xl"
              : "w-full max-w-[min(100%,22rem)] text-balance text-center text-[clamp(1.1rem,4.4vw,1.45rem)] font-semibold leading-relaxed tracking-normal text-amber-50 break-keep sm:max-w-md sm:text-xl"
          }
          style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
        >
          {slide.title}
        </motion.h2>
        {slide.paragraphs.map((block, index) => (
          <motion.p
            key={`${step}-p-${index}`}
            variants={variants.paragraph}
            className="w-full max-w-[min(100%,22rem)] text-balance whitespace-pre-line text-center text-[0.95rem] font-medium leading-loose text-amber-100/90 break-keep sm:max-w-md sm:text-base sm:leading-loose"
            style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
          >
            {block}
          </motion.p>
        ))}
        {isClosingSlide && (
          <motion.button
            type="button"
            variants={variants.cta}
            onClick={onComplete}
            className="mt-3 min-h-[48px] w-full max-w-[min(100%,20rem)] rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 px-6 text-sm font-bold text-amber-950 shadow-lg shadow-black/35 transition hover:from-amber-400 hover:to-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:max-w-xs"
            style={{ willChange: reduceMotion ? undefined : "opacity, transform, filter" }}
          >
            記録をはじめる
          </motion.button>
        )}
      </motion.div>
    </div>
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
      className="fixed inset-0 z-[220] flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col bg-gradient-to-b from-[#120805] via-[#1f130d] to-[#0f0805] text-amber-50/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tutorial-heading"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] bg-[radial-gradient(ellipse_75%_55%_at_50%_-5%,rgba(251,191,36,0.55),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-2 sm:px-8">
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <TutorialStepMotion
            slide={slide}
            step={step}
            reduceMotion={reduceMotion}
            variants={variants}
            onComplete={finish}
          />
        </div>

        <div className="mt-1 flex shrink-0 justify-center gap-2 pb-1 pt-2">
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

      <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-amber-900/35 bg-black/15 px-6 py-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-3 backdrop-blur-[2px] sm:px-8 sm:py-4">
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
              記録をはじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
