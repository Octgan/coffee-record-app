export type DripPourStep = {
  id: string;
  label: string;
  waterGrams: number;
  durationSec: number;
};

export type DripTimerRecipe = {
  steps: DripPourStep[];
};

export const DRIP_TIMER_RECIPE_STORAGE_KEY = "coffee-drip-timer-recipe";
export const DRIP_TIMER_RESULT_STORAGE_KEY = "coffee-drip-timer-result";

export type DripTimerResult = {
  totalBrewTimeSec: number;
  returnPath: string;
};

/** ドリップタイマーを使う抽出方法 */
export const BREW_METHODS_WITH_DRIP_TIMER = [
  "ハンドドリップ",
  "ネルドリップ",
  "エアロプレス"
] as const;

export function supportsDripTimer(method: string): boolean {
  return (BREW_METHODS_WITH_DRIP_TIMER as readonly string[]).includes(method);
}

export const DEFAULT_DRIP_RECIPE: DripTimerRecipe = {
  steps: [
    { id: "bloom", label: "蒸らし（ブルーム）", waterGrams: 40, durationSec: 30 },
    { id: "pour-1", label: "1投目", waterGrams: 90, durationSec: 30 },
    { id: "pour-2", label: "2投目", waterGrams: 180, durationSec: 60 },
    { id: "pour-3", label: "3投目", waterGrams: 270, durationSec: 45 }
  ]
};

export function formatTimerClock(totalMs: number): string {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatStepRemaining(remainingMs: number): string {
  const sec = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${sec}秒`;
}

export function recipeTotalDurationSec(recipe: DripTimerRecipe): number {
  return recipe.steps.reduce((sum, step) => sum + Math.max(0, step.durationSec), 0);
}

export function recipeTotalWaterGrams(recipe: DripTimerRecipe): number {
  if (recipe.steps.length === 0) {
    return 0;
  }
  return Math.max(...recipe.steps.map((s) => s.waterGrams));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceStep(raw: unknown, index: number): DripPourStep | null {
  if (!isRecord(raw)) {
    return null;
  }
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const waterGrams = Number(raw.waterGrams);
  const durationSec = Number(raw.durationSec);
  if (!label || !Number.isFinite(waterGrams) || !Number.isFinite(durationSec)) {
    return null;
  }
  return {
    id: typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : `step-${index}`,
    label,
    waterGrams: Math.max(0, Math.round(waterGrams)),
    durationSec: Math.max(1, Math.round(durationSec))
  };
}

export function coerceDripTimerRecipe(raw: unknown): DripTimerRecipe {
  if (!isRecord(raw) || !Array.isArray(raw.steps)) {
    return DEFAULT_DRIP_RECIPE;
  }
  const steps = raw.steps
    .map((entry, index) => coerceStep(entry, index))
    .filter((s): s is DripPourStep => s !== null);
  return steps.length > 0 ? { steps } : DEFAULT_DRIP_RECIPE;
}

export function loadDripTimerRecipe(): DripTimerRecipe {
  if (typeof window === "undefined") {
    return DEFAULT_DRIP_RECIPE;
  }
  try {
    const raw = sessionStorage.getItem(DRIP_TIMER_RECIPE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DRIP_RECIPE;
    }
    return coerceDripTimerRecipe(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_DRIP_RECIPE;
  }
}

export function saveDripTimerRecipe(recipe: DripTimerRecipe): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(DRIP_TIMER_RECIPE_STORAGE_KEY, JSON.stringify(recipe));
}

export function saveDripTimerResult(result: DripTimerResult): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(DRIP_TIMER_RESULT_STORAGE_KEY, JSON.stringify(result));
}

export function consumeDripTimerResult(): DripTimerResult | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(DRIP_TIMER_RESULT_STORAGE_KEY);
    sessionStorage.removeItem(DRIP_TIMER_RESULT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const totalBrewTimeSec = Number(parsed.totalBrewTimeSec);
    const returnPath =
      typeof parsed.returnPath === "string" && parsed.returnPath.startsWith("/")
        ? parsed.returnPath
        : "/brew/new";
    if (!Number.isFinite(totalBrewTimeSec) || totalBrewTimeSec < 0) {
      return null;
    }
    return { totalBrewTimeSec: Math.round(totalBrewTimeSec), returnPath };
  } catch {
    return null;
  }
}
