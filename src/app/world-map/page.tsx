"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { COFFEE_ORIGINS } from "@/lib/coffeeOrigins";
import {
  BREW_LOGS_UPDATED_EVENT,
  getLogOriginCountries,
  logMatchesCountryKey,
  normalizeMapCountryName,
  type StoredBrewLog
} from "@/lib/brewLogStorage";
import { fetchBrewLogs } from "@/lib/data/brewLogsDb";
import { fetchOriginExtras } from "@/lib/data/originExtrasDb";
import { createClient } from "@/lib/supabase/client";

const geographyUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMapPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<StoredBrewLog[]>([]);
  const [visitedOrigins, setVisitedOrigins] = useState<string[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      try {
        const [parsedLogs, extras] = await Promise.all([
          fetchBrewLogs(supabase),
          fetchOriginExtras(supabase)
        ]);
        if (cancelled) {
          return;
        }
        setLogs(parsedLogs);
        const originFromLogs = parsedLogs.flatMap((log) => getLogOriginCountries(log));
        setVisitedOrigins(Array.from(new Set([...originFromLogs, ...extras])));
      } catch {
        if (!cancelled) {
          setLogs([]);
          setVisitedOrigins([]);
        }
      }
    };

    void load();

    const onBrewLogsUpdated = () => {
      void load();
    };
    window.addEventListener(BREW_LOGS_UPDATED_EVENT, onBrewLogsUpdated);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const channel = supabase
      .channel("brew_logs_world_map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brew_logs" },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener(BREW_LOGS_UPDATED_EVENT, onBrewLogsUpdated);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, []);

  const visitedSet = useMemo(
    () => new Set(visitedOrigins.map((item) => normalizeMapCountryName(item))),
    [visitedOrigins]
  );

  const visitedLabels = useMemo(
    () =>
      COFFEE_ORIGINS.filter((item) => visitedOrigins.includes(item.value)).map(
        (item) => item.label
      ),
    [visitedOrigins]
  );
  const logsByCountry = useMemo(() => {
    const map = new Map<string, StoredBrewLog[]>();
    logs.forEach((log) => {
      getLogOriginCountries(log).forEach((country) => {
        const key = normalizeMapCountryName(country);
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, log]);
      });
    });
    return map;
  }, [logs]);
  const selectedCountryKey = selectedCountry
    ? normalizeMapCountryName(selectedCountry)
    : "";
  const selectedCountryLogs = selectedCountry
    ? logsByCountry.get(selectedCountryKey) ?? []
    : [];

  const handleCountryClick = (rawName: string) => {
    const key = normalizeMapCountryName(rawName);
    setSelectedCountry(rawName);
    const matches = logs.filter((log) => logMatchesCountryKey(log, key));
    if (matches.length > 0) {
      router.push(`/journal?country=${encodeURIComponent(key)}`);
    }
  };

  return (
    <main className="min-h-screen w-full px-4 py-4 sm:px-6 sm:py-6">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 rounded-3xl border border-amber-900/15 bg-white/85 p-4 shadow-xl shadow-amber-950/10 backdrop-blur-sm sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-950 sm:text-4xl">
            World Map Collection
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-700" />
            記録済み産地
          </div>
          <div className="flex items-center gap-2 text-amber-900/70">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-100" />
            未記録
          </div>
        </div>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          <div className="relative flex min-h-[min(68vh,720px)] w-full items-center justify-center overflow-hidden rounded-2xl border border-amber-200 bg-[#f6efe4] p-2 sm:p-4 [&_.rsm-svg]:h-auto [&_.rsm-svg]:max-h-[min(72vh,760px)] [&_.rsm-svg]:w-full">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 175 }}
              className="max-w-full"
            >
              <Geographies geography={geographyUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const rawName =
                      String(geo.properties.name ?? geo.properties.NAME ?? "").trim();
                    const isVisited = visitedSet.has(normalizeMapCountryName(rawName));
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredCountry(rawName)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        onClick={() => handleCountryClick(rawName)}
                        style={{
                          default: {
                            fill: isVisited ? "#7a4b2a" : "#e9dbc7",
                            stroke: "#9b7a60",
                            strokeWidth: 0.6,
                            outline: "none",
                            cursor: "pointer"
                          },
                          hover: {
                            fill: isVisited ? "#965a32" : "#d8c4aa",
                            stroke: "#8f6a4d",
                            strokeWidth: 0.7,
                            outline: "none"
                          },
                          pressed: {
                            fill: isVisited ? "#6a4024" : "#d8c4aa",
                            outline: "none"
                          }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {hoveredCountry && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-amber-50 shadow-lg">
                {hoveredCountry}
              </div>
            )}
          </div>

          <aside className="max-h-[min(68vh,720px)] overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-amber-900">
              {selectedCountry ? `${selectedCountry} の抽出履歴` : "国をタップして確認"}
            </h2>
            <p className="mt-2 text-sm text-amber-900/70">
              記録がある国は下のボタンからマイ・ノートを開けます。
            </p>

            {selectedCountry && (
              <div className="mt-4 space-y-3">
                {selectedCountryLogs.length > 0 ? (
                  <>
                    <p className="text-sm text-amber-900">
                      この国に関連する記録が{" "}
                      <span className="font-bold">{selectedCountryLogs.length}</span>{" "}
                      件あります。
                    </p>
                    <Link
                      href={`/journal?country=${encodeURIComponent(selectedCountryKey)}`}
                      className="block w-full rounded-xl bg-amber-700 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-800"
                    >
                      マイ・ノートで開く
                    </Link>
                  </>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-white p-4 text-sm text-amber-900">
                    <p className="font-medium leading-relaxed">
                      まだ記録がありません。新しく記録しますか？
                    </p>
                    <Link
                      href="/brew/new"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
                    >
                      抽出を記録する
                    </Link>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-amber-900">記録済みの産地</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {visitedLabels.length > 0 ? (
              visitedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-amber-200 px-3 py-1 text-sm font-semibold text-amber-900"
                >
                  {label}
                </span>
              ))
            ) : (
              <p className="text-sm text-amber-900/70">
                まだ記録がありません。抽出ログを保存して最初の1カ国を塗ってみましょう。
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
