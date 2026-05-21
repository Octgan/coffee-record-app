"use client";

import { useCallback, useRef } from "react";
import NumericFieldInput from "@/components/NumericFieldInput";
import {
  formatBrewRatioLabel,
  RATIO_PRESETS,
  ratioFromDose,
  roundDoseG,
  roundRatio,
  roundWaterMl,
  waterFromDose,
  doseFromWater,
  type BrewDoseRatioValues
} from "@/lib/brewDoseRatio";

type DoseDriver = "bean" | "ratio" | "water";

type BrewDoseRatioPanelProps = {
  values: BrewDoseRatioValues;
  onChange: (values: BrewDoseRatioValues) => void;
  disabled?: boolean;
  /** アコーディオン内：外枠・見出しを省略 */
  embedded?: boolean;
};

const fieldClassName =
  "rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-base tabular-nums text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60";

export default function BrewDoseRatioPanel({
  values,
  onChange,
  disabled = false,
  embedded = false
}: BrewDoseRatioPanelProps) {
  const lastDriver = useRef<DoseDriver>("bean");

  const sync = useCallback(
    (next: BrewDoseRatioValues, driver: DoseDriver) => {
      lastDriver.current = driver;
      const bean = next.coffeeDoseG;
      const ratio = next.brewRatio > 0 ? next.brewRatio : 15;
      const water = next.totalWaterMl;

      if (driver === "bean" || driver === "ratio") {
        if (bean > 0 && ratio > 0) {
          onChange({
            coffeeDoseG: bean,
            brewRatio: ratio,
            totalWaterMl: waterFromDose(bean, ratio)
          });
          return;
        }
      }

      if (driver === "water") {
        if (water > 0 && bean > 0) {
          onChange({
            coffeeDoseG: bean,
            brewRatio: ratioFromDose(bean, water),
            totalWaterMl: water
          });
          return;
        }
        if (water > 0 && ratio > 0) {
          onChange({
            coffeeDoseG: doseFromWater(water, ratio),
            brewRatio: ratio,
            totalWaterMl: water
          });
          return;
        }
      }

      onChange({
        coffeeDoseG: bean,
        brewRatio: ratio,
        totalWaterMl: water
      });
    },
    [onChange]
  );

  const setBean = (coffeeDoseG: number) => {
    sync(
      {
        coffeeDoseG: coffeeDoseG > 0 ? roundDoseG(coffeeDoseG) : 0,
        brewRatio: values.brewRatio,
        totalWaterMl: values.totalWaterMl
      },
      "bean"
    );
  };

  const setRatio = (ratio: number) => {
    const r = roundRatio(ratio);
    sync(
      {
        coffeeDoseG: values.coffeeDoseG,
        brewRatio: r,
        totalWaterMl: values.totalWaterMl
      },
      "ratio"
    );
  };

  const setWater = (totalWaterMl: number) => {
    sync(
      {
        coffeeDoseG: values.coffeeDoseG,
        brewRatio: values.brewRatio,
        totalWaterMl: totalWaterMl > 0 ? roundWaterMl(totalWaterMl) : 0
      },
      "water"
    );
  };

  const ratioLabel =
    values.brewRatio > 0 ? formatBrewRatioLabel(values.brewRatio) : "1:15";
  const hasSummary =
    values.coffeeDoseG > 0 && values.brewRatio > 0 && values.totalWaterMl > 0;

  const header = embedded ? null : (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-amber-950">スマート湯量 &amp; レシオ</h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-900/75">
          豆量・比率・湯量が連動します。ここで決めた湯量はドリップタイマーの各投にも反映されます。
        </p>
      </div>
      <span className="rounded-full bg-amber-800 px-3 py-1 text-sm font-bold tabular-nums text-white shadow-sm">
        {ratioLabel}
      </span>
    </div>
  );

  const body = (
    <>
      {header}

      <div className={`grid gap-4 sm:grid-cols-3 ${embedded ? "mt-0" : "mt-4"}`}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          コーヒー豆の量 (g)
          <NumericFieldInput
            value={values.coffeeDoseG}
            onChange={setBean}
            disabled={disabled}
            allowDecimal
            placeholder="15"
            className={fieldClassName}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          <span>抽出の比率</span>
          <div className="flex items-baseline gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
            <span className="text-lg font-bold tabular-nums text-amber-950">{ratioLabel}</span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          お湯の量 (ml)
          <NumericFieldInput
            value={values.totalWaterMl}
            onChange={setWater}
            disabled={disabled}
            allowDecimal={false}
            inputMode="numeric"
            placeholder="225"
            className={fieldClassName}
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-amber-800/80">よく使う比率</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RATIO_PRESETS.map((preset) => {
            const active = values.brewRatio === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => setRatio(preset)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-amber-800 text-white shadow-md"
                    : "border border-amber-300/90 bg-white text-amber-900 hover:border-amber-500 hover:bg-amber-50"
                }`}
              >
                1:{preset}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-100 bg-white/90 px-3 py-3">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-amber-800">
          <span>比率を微調整</span>
          <span className="tabular-nums">{ratioLabel}</span>
        </div>
        <input
          type="range"
          min={12}
          max={20}
          step={0.5}
          disabled={disabled}
          value={values.brewRatio > 0 ? values.brewRatio : 15}
          onChange={(e) => setRatio(Number(e.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-100 accent-amber-700 disabled:opacity-50"
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-amber-800/60">
          <span>1:12</span>
          <span>1:20</span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-amber-900/70">
        {hasSummary ? (
          <>
            {values.coffeeDoseG}g × {formatBrewRatioLabel(values.brewRatio)} ≒{" "}
            <span className="font-semibold text-amber-950">{values.totalWaterMl} ml</span>
          </>
        ) : (
          <span className="text-amber-800/65">豆量・湯量を入力すると計算結果が表示されます</span>
        )}
      </p>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <section className="rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-amber-50/40 p-4 shadow-sm sm:p-5">
      {body}
    </section>
  );
}
