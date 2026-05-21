"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NumericFieldInput from "@/components/NumericFieldInput";
import {
  DEFAULT_DRIP_RECIPE,
  formatStepRemaining,
  formatTimerClock,
  loadDripTimerRecipe,
  recipeTotalDurationSec,
  recipeTotalWaterGrams,
  saveDripTimerRecipe,
  saveDripTimerResult,
  type DripPourStep,
  type DripTimerRecipe
} from "@/lib/dripTimerRecipe";

const RING_SIZE = 220;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type TimerPhase = "idle" | "running" | "paused" | "finished";

function stepProgress(stepElapsedMs: number, durationSec: number): number {
  if (durationSec <= 0) {
    return 1;
  }
  return Math.min(1, stepElapsedMs / (durationSec * 1000));
}

function CircularGauge({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = RING_CIRCUMFERENCE * (1 - clamped);
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="mx-auto drop-shadow-sm"
      aria-hidden
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE}
        className="text-amber-100"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        className="text-amber-600 transition-[stroke-dashoffset] duration-150 ease-linear"
        style={{
          strokeDasharray: RING_CIRCUMFERENCE,
          strokeDashoffset: offset,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%"
        }}
      />
    </svg>
  );
}

export default function DripTimerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = searchParams.get("return")?.startsWith("/")
    ? searchParams.get("return")!
    : "/brew/new";

  const [recipe, setRecipe] = useState<DripTimerRecipe>(DEFAULT_DRIP_RECIPE);
  const [showRecipeEdit, setShowRecipeEdit] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [stepElapsedMs, setStepElapsedMs] = useState(0);

  const lastTickRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRecipe(loadDripTimerRecipe());
  }, []);

  const currentStep = recipe.steps[stepIndex] ?? null;
  const allStepsDone = recipe.steps.length > 0 && stepIndex >= recipe.steps.length;
  const isFinished = phase === "finished" || allStepsDone;

  const stepDurationMs = (currentStep?.durationSec ?? 0) * 1000;
  const stepRemainingMs = Math.max(0, stepDurationMs - stepElapsedMs);
  const currentStepProgress = currentStep ? stepProgress(stepElapsedMs, currentStep.durationSec) : 0;

  const overallProgress = useMemo(() => {
    const total = recipeTotalDurationSec(recipe);
    if (total <= 0) {
      return 0;
    }
    const completedDur = recipe.steps
      .slice(0, stepIndex)
      .reduce((s, st) => s + st.durationSec, 0);
    const currentPart = currentStep ? (stepElapsedMs / 1000) * (currentStep.durationSec > 0 ? 1 : 0) : 0;
    return Math.min(1, (completedDur + currentPart) / total);
  }, [recipe, stepIndex, stepElapsedMs, currentStep]);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  const advanceStep = useCallback(() => {
    setStepIndex((idx) => {
      const step = recipe.steps[idx];
      if (step) {
        setCompletedStepIds((ids) => new Set(ids).add(step.id));
      }
      const nextIndex = idx + 1;
      if (nextIndex >= recipe.steps.length) {
        setPhase("finished");
        clearIntervalRef();
        return idx;
      }
      setStepElapsedMs(0);
      return nextIndex;
    });
  }, [recipe.steps, clearIntervalRef]);

  useEffect(() => {
    if (phase !== "running" || isFinished) {
      return;
    }
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      const delta = now - last;
      lastTickRef.current = now;

      setTotalElapsedMs((t) => t + delta);
      setStepElapsedMs((s) => {
        const next = s + delta;
        const step = recipe.steps[stepIndex];
        if (step && next >= step.durationSec * 1000) {
          setTimeout(() => advanceStep(), 0);
          return step.durationSec * 1000;
        }
        return next;
      });
    }, 100);

    return () => clearIntervalRef();
  }, [phase, isFinished, stepIndex, recipe.steps, advanceStep, clearIntervalRef]);

  const handleStart = () => {
    if (isFinished) {
      return;
    }
    if (recipe.steps.length === 0) {
      return;
    }
    lastTickRef.current = performance.now();
    setPhase("running");
  };

  const handlePause = () => {
    clearIntervalRef();
    setPhase("paused");
  };

  const handleReset = () => {
    clearIntervalRef();
    setPhase("idle");
    setStepIndex(0);
    setStepElapsedMs(0);
    setTotalElapsedMs(0);
    setCompletedStepIds(new Set());
  };

  const handleNextStep = () => {
    if (stepIndex < recipe.steps.length) {
      advanceStep();
    }
  };

  const handleApplyToRecord = () => {
    const totalSec = Math.max(1, Math.round(totalElapsedMs / 1000));
    saveDripTimerResult({ totalBrewTimeSec: totalSec, returnPath });
    router.push(returnPath);
  };

  const persistRecipe = (next: DripTimerRecipe) => {
    setRecipe(next);
    saveDripTimerRecipe(next);
  };

  const updateStep = (index: number, patch: Partial<DripPourStep>) => {
    persistRecipe({
      steps: recipe.steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
    });
  };

  const totalWater = recipeTotalWaterGrams(recipe);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 pb-8 sm:py-8">
      <section className="rounded-3xl border border-amber-900/12 bg-white/92 p-5 shadow-xl shadow-amber-950/8 backdrop-blur-sm sm:p-7">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/80">
              Brew Timer
            </p>
            <h1 className="mt-1 text-2xl font-bold text-amber-950 sm:text-3xl">ドリップタイマー</h1>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/75">
              レシピに沿って注ぐタイミングをナビ。計測した時間は抽出記録へそのまま渡せます。
            </p>
          </div>          <Link
            href={returnPath}
            className="shrink-0 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            記録へ
          </Link>
        </header>

        <details
          className="mt-5 rounded-2xl border border-amber-200/90 bg-amber-50/40"
          open={showRecipeEdit}
          onToggle={(e) => setShowRecipeEdit(e.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-amber-900">
            レシピを編集（湯量・各段階の秒数）
          </summary>
          <div className="space-y-3 border-t border-amber-200/60 px-4 pb-4 pt-2">
            {recipe.steps.map((step, index) => (
              <div
                key={step.id}
                className="grid gap-2 rounded-xl border border-amber-100 bg-white/90 p-3 sm:grid-cols-[1fr_5rem_5rem]"
              >
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(index, { label: e.target.value })}
                  className="rounded-lg border border-amber-200 px-2.5 py-2 text-base text-amber-950"
                  disabled={phase === "running"}
                />
                <label className="flex flex-col gap-0.5 text-[10px] font-medium text-amber-800">
                  湯量 g
                  <NumericFieldInput
                    value={step.waterGrams}
                    onChange={(n) => updateStep(index, { waterGrams: n })}
                    allowDecimal={false}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={phase === "running"}
                    className="rounded-lg border border-amber-200 px-2.5 py-2 text-base tabular-nums text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-medium text-amber-800">
                  秒
                  <NumericFieldInput
                    value={step.durationSec}
                    onChange={(n) =>
                      updateStep(index, { durationSec: n > 0 ? Math.round(n) : 0 })
                    }
                    allowDecimal={false}
                    inputMode="numeric"
                    placeholder="30"
                    disabled={phase === "running"}
                    className="rounded-lg border border-amber-200 px-2.5 py-2 text-base tabular-nums text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                  />
                </label>
              </div>            ))}
            <p className="text-xs text-amber-800/70">
              目安合計: 約 {recipeTotalDurationSec(recipe)} 秒 / 最大湯量 {totalWater}g
            </p>
          </div>        </details>

        <div className="relative mt-8 flex flex-col items-center">
          <div className="relative">
            <CircularGauge progress={isFinished ? 1 : currentStepProgress} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-800/60">
                {isFinished ? "完了" : currentStep?.label ?? "準備"}
              </p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight text-amber-950">
                {isFinished ? formatTimerClock(totalElapsedMs) : formatStepRemaining(stepRemainingMs)}
              </p>
              {!isFinished && currentStep && (
                <p className="mt-2 text-sm text-amber-900/80">
                  目標 <span className="font-semibold">{currentStep.waterGrams}g</span>
                  <span className="mx-1.5 text-amber-700/40">·</span>
                  {currentStep.durationSec}秒
                </p>
              )}
              <p className="mt-1 text-xs text-amber-800/55">
                トータル {formatTimerClock(totalElapsedMs)}
              </p>
            </div>          </div>          <div className="mt-6 w-full rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3 text-center">
            <p className="text-xs font-medium text-amber-800/70">ナビゲーション</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-amber-950">
              {isFinished
                ? `抽出完了 — 合計 ${formatTimerClock(totalElapsedMs)}（${Math.round(totalElapsedMs / 1000)}秒）`
                : currentStep
                  ? `${currentStep.label} — あと ${formatStepRemaining(stepRemainingMs)} / 目標 ${currentStep.waterGrams}g`
                  : "スタートでタイマーを開始してください"}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700 transition-all duration-150 ease-linear"
                style={{ width: `${(isFinished ? 1 : overallProgress) * 100}%` }}
              />
            </div>          </div>        </div>        <ul className="mt-8 space-y-2" aria-label="抽出ステップ">
          {recipe.steps.map((step, index) => {
            const done = completedStepIds.has(step.id) || index < stepIndex || isFinished;
            const active = index === stepIndex && !isFinished;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-amber-400 bg-amber-50 shadow-sm"
                    : done
                      ? "border-amber-200/60 bg-white/80 text-amber-900/70"
                      : "border-amber-100/80 bg-white/60 text-amber-900/50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-amber-700 text-white"
                      : active
                        ? "bg-amber-200 text-amber-950 ring-2 ring-amber-500/40"
                        : "bg-amber-100 text-amber-800/50"
                  }`}
                  aria-hidden
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium">{step.label}</span>
                <span className="shrink-0 tabular-nums text-xs text-amber-800/75">
                  {step.waterGrams}g / {step.durationSec}s
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {phase === "running" ? (
            <button
              type="button"
              onClick={handlePause}
              className="min-w-[7rem] rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-900"
            >
              ストップ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={isFinished || recipe.steps.length === 0}
              className="min-w-[7rem] rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-800 disabled:opacity-50"
            >
              {phase === "paused" ? "再開" : "スタート"}
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="min-w-[7rem] rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-50"
          >
            リセット
          </button>
          {!isFinished && phase !== "idle" && (
            <button
              type="button"
              onClick={handleNextStep}
              className="min-w-[7rem] rounded-xl border border-amber-400 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
            >
              次の段階
            </button>
          )}
        </div>        <button
          type="button"
          onClick={handleApplyToRecord}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-600/30 bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/15 transition hover:from-amber-800 hover:to-amber-900"
        >
          記録に反映して戻る
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">
            {formatTimerClock(totalElapsedMs)}
          </span>
        </button>
      </section>
    </main>
  );
}
