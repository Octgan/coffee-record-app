import {
  DEFAULT_DRIP_RECIPE,
  recipeTotalWaterGrams,
  type DripTimerRecipe
} from "@/lib/dripTimerRecipe";

/** ドリップタイマーと同じ抽出方法で湯量・レシオ入力を表示 */
export const BREW_METHODS_WITH_DOSE_RATIO = [
  "ハンドドリップ",
  "ネルドリップ",
  "エアロプレス"
] as const;

export const RATIO_PRESETS = [14, 15, 16, 17, 18] as const;

export const DEFAULT_COFFEE_DOSE_G = 15;
export const DEFAULT_BREW_RATIO = 15;

export type BrewDoseRatioValues = {
  coffeeDoseG: number;
  brewRatio: number;
  totalWaterMl: number;
};

export function supportsBrewDoseRatio(method: string): boolean {
  return (BREW_METHODS_WITH_DOSE_RATIO as readonly string[]).includes(method);
}

export function formatBrewRatioLabel(ratio: number): string {
  const r = roundRatio(ratio);
  return Number.isInteger(r) ? `1:${r}` : `1:${r.toFixed(1)}`;
}

export function roundDoseG(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundRatio(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundWaterMl(value: number): number {
  return Math.max(0, Math.round(value));
}

export function waterFromDose(coffeeDoseG: number, brewRatio: number): number {
  if (coffeeDoseG <= 0 || brewRatio <= 0) {
    return 0;
  }
  return roundWaterMl(coffeeDoseG * brewRatio);
}

export function ratioFromDose(coffeeDoseG: number, totalWaterMl: number): number {
  if (coffeeDoseG <= 0 || totalWaterMl <= 0) {
    return DEFAULT_BREW_RATIO;
  }
  return roundRatio(totalWaterMl / coffeeDoseG);
}

export function doseFromWater(totalWaterMl: number, brewRatio: number): number {
  if (totalWaterMl <= 0 || brewRatio <= 0) {
    return 0;
  }
  return roundDoseG(totalWaterMl / brewRatio);
}

export function defaultBrewDoseRatioValues(): BrewDoseRatioValues {
  const coffeeDoseG = DEFAULT_COFFEE_DOSE_G;
  const brewRatio = DEFAULT_BREW_RATIO;
  return {
    coffeeDoseG,
    brewRatio,
    totalWaterMl: waterFromDose(coffeeDoseG, brewRatio)
  };
}

export function parseDoseInput(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function scaleRecipeToTotalWater(
  recipe: DripTimerRecipe,
  targetTotalMl: number
): DripTimerRecipe {
  const baseTotal = recipeTotalWaterGrams(recipe);
  if (baseTotal <= 0 || targetTotalMl <= 0) {
    return recipe;
  }
  const factor = targetTotalMl / baseTotal;
  return {
    steps: recipe.steps.map((step) => ({
      ...step,
      waterGrams: Math.max(0, Math.round(step.waterGrams * factor))
    }))
  };
}

/** 豆量・比率・総湯量からタイマー用レシピ（各投の湯量）を生成 */
export function buildTimerRecipeFromDose(
  values: BrewDoseRatioValues,
  template: DripTimerRecipe = DEFAULT_DRIP_RECIPE
): DripTimerRecipe {
  const total =
    values.totalWaterMl > 0
      ? values.totalWaterMl
      : waterFromDose(values.coffeeDoseG, values.brewRatio);
  if (total <= 0) {
    return template;
  }
  return scaleRecipeToTotalWater(template, total);
}
