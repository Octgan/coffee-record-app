"use client";

import { useCallback, useRef } from "react";
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
};

export default function BrewDoseRatioPanel({
  values,
  onChange,
  disabled = false
}: BrewDoseRatioPanelProps) {
  const lastDriver = useRef<DoseDriver>("bean");

  const sync = useCallback(
    (next: BrewDoseRatioValues, driver: DoseDriver) => {
      lastDriver.current = driver;
      const bean = next.coffeeDoseG;
      const ratio = next.brewRatio;
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

      onChange(next);
    },
    [onChange]
  );

  const setBean = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      return;
    }
    sync(
      {
        coffeeDoseG: roundDoseG(n),
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

  const setWater = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      return;
    }
    sync(
      {
        coffeeDoseG: values.coffeeDoseG,
        brewRatio: values.brewRatio,
        totalWaterMl: roundWaterMl(n)
      },
      "water"
    );
  };

  return (
    <section className="rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-amber-50/40 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-amber-950">スマート湯量 &amp; レシオ</h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/75">
            豆量・比率・湯量が連動します。ここで決めた湯量はドリップタイマーの各投にも反映されます。
          </p>
        </div>
        <span className="rounded-full bg-amber-800 px-3 py-1 text-sm font-bold tabular-nums text-white shadow-sm">
          {formatBrewRatioLabel(values.brewRatio)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          コーヒー豆の量 (g)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            disabled={disabled}
            value={values.coffeeDoseG > 0 ? values.coffeeDoseG : ""}
            onChange={(e) => setBean(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 tabular-nums text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            placeholder="15"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          <span>抽出の比率</span>
          <div className="flex items-baseline gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
            <span className="text-lg font-bold tabular-nums text-amber-950">
              {formatBrewRatioLabel(values.brewRatio)}
            </span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-amber-900">
          お湯の量 (ml)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={disabled}
            value={values.totalWaterMl > 0 ? values.totalWaterMl : ""}
            onChange={(e) => setWater(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 tabular-nums text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            placeholder="225"
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
          <span className="tabular-nums">{formatBrewRatioLabel(values.brewRatio)}</span>
        </div>
        <input
          type="range"
          min={12}
          max={20}
          step={0.5}
          disabled={disabled}
          value={values.brewRatio}
          onChange={(e) => setRatio(Number(e.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-100 accent-amber-700 disabled:opacity-50"
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-amber-800/60">
          <span>1:12</span>
          <span>1:20</span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-amber-900/70">
        {values.coffeeDoseG}g × {formatBrewRatioLabel(values.brewRatio)} ={" "}
        <span className="font-semibold text-amber-950">{values.totalWaterMl} ml</span>
      </p>
    </section>
  );
}
