import { supportsBrewDoseRatio } from "@/lib/brewDoseRatio";

export const BREW_LOG_STORAGE_KEY = "coffee-brew-logs";

/** 同一タブ内でもリストを再同期するためのカスタムイベント（storage イベントは別タブのみ発火） */
export const BREW_LOGS_UPDATED_EVENT = "coffee-brew-logs-updated";

export type StoredBrewLog = {
  id: number;
  date: string;
  beanName: string;
  origins?: {
    country: string;
    ratio: string;
  }[];
  originCountry: string;
  method: string;
  equipmentName?: string;
  roastLevel: string;
  roastery: string;
  overallRating: number;
  foodPairing?: string;
  filterRinse?: boolean;
  rdtDone?: boolean;
  flavors: string[];
  aftertaste: string;
  memo: string;
  /** カフェマップから記録したときの緯度（保存時にマップピンと同期） */
  cafeLat?: number;
  /** カフェマップから記録したときの経度 */
  cafeLng?: number;
  /** 抽出記録用の写真（data URL 可）。カフェマップのピン写真にも流用 */
  brewPhotoUrl?: string;
  /** お湯の温度（°C）。プロモード・該当抽出のみ。コーヒーメーカー時は保存時 0 */
  waterTempC?: number;
  /** 蒸らし時間（秒）。コーヒーメーカー時は保存時 0 */
  bloomTimeSec?: number;
  /** コーヒーメーカーのコース/モード（マイルド等）。該当方法以外は未使用 */
  coffeeMakerCourse?: string | null;
  /** カッピング等: 注湯からブレイクまでの時間など（自由記述） */
  steepTimeMemo?: string | null;
  /** 挽き目（プロモードの選択値） */
  grindSize?: string | null;
  /** ハンドドリップ時のペーパーフィルター（形状・素材など） */
  paperFilter?: string | null;
  /** 使用した水（水道水・軟水など。全抽出方法共通） */
  waterType?: string | null;
  /** ドリップタイマー等で計測したトータル抽出時間（秒） */
  totalBrewTimeSec?: number;
  /** コーヒー豆の量（g）。ハンドドリップ等 */
  coffeeDoseG?: number;
  /** 抽出比率（1:N の N。例: 15 → 1:15） */
  brewRatio?: number;
  /** 総湯量（ml） */
  totalWaterMl?: number;
};

export const BREW_METHOD_HAND_DRIP = "ハンドドリップ";
export const COFFEE_BREW_METHOD_MAKER = "コーヒーメーカー";
export const BREW_METHOD_CUPPING = "カッピング";

/** DB・カレンダー用に YYYY-MM-DD に揃える */
export function normalizeBrewDate(date: unknown): string {
  const raw = String(date ?? "").trim();
  const isoPrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) {
    return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function finiteSmallInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(Math.min(32767, Math.max(-32768, value)));
}

function finitePositiveDoseG(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

function finitePositiveBrewRatio(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

function finitePositiveWaterMl(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value);
}

/**
 * Supabase 保存前に必須項目・抽出方法別のデフォルトを揃える。
 * カッピングで非表示の蒸らし時間なども DB 制約を満たす値にする。
 */
export function normalizeBrewLogForDatabase(log: StoredBrewLog): StoredBrewLog {
  const method = String(log.method ?? "ハンドドリップ").trim() || "ハンドドリップ";
  const isCoffeeMaker = method === COFFEE_BREW_METHOD_MAKER;
  const isCupping = method === BREW_METHOD_CUPPING;
  const isHandDrip = method === BREW_METHOD_HAND_DRIP;

  const origins =
    log.origins && log.origins.length > 0
      ? log.origins
          .map((entry) => ({
            country: String(entry.country ?? "").trim(),
            ratio: String(entry.ratio ?? "").trim()
          }))
          .filter((entry) => entry.country !== "")
      : undefined;

  const fallbackCountry =
    origins?.[0]?.country ||
    (typeof log.originCountry === "string" && log.originCountry.trim() !== ""
      ? log.originCountry.trim()
      : "Unknown");

  let waterTempC = finiteSmallInt(log.waterTempC);
  let bloomTimeSec = finiteSmallInt(log.bloomTimeSec);
  let coffeeMakerCourse =
    log.coffeeMakerCourse != null && String(log.coffeeMakerCourse).trim() !== ""
      ? String(log.coffeeMakerCourse).trim()
      : null;
  let steepTimeMemo =
    log.steepTimeMemo != null && String(log.steepTimeMemo).trim() !== ""
      ? String(log.steepTimeMemo).trim()
      : null;
  const grindSize =
    log.grindSize != null && String(log.grindSize).trim() !== ""
      ? String(log.grindSize).trim()
      : null;

  let equipmentName = log.equipmentName?.trim() || undefined;

  if (isCoffeeMaker) {
    waterTempC = 0;
    bloomTimeSec = 0;
    steepTimeMemo = null;
  } else if (isCupping) {
    bloomTimeSec = 0;
    coffeeMakerCourse = null;
    equipmentName = equipmentName || "カッピングボウル";
  } else {
    coffeeMakerCourse = null;
    steepTimeMemo = null;
  }

  const paperFilter =
    isHandDrip && log.paperFilter != null && String(log.paperFilter).trim() !== ""
      ? String(log.paperFilter).trim()
      : null;
  const waterType =
    log.waterType != null && String(log.waterType).trim() !== ""
      ? String(log.waterType).trim()
      : null;
  const totalBrewTimeSec = finiteSmallInt(log.totalBrewTimeSec);
  const doseEnabled = supportsBrewDoseRatio(method);
  const coffeeDoseG = doseEnabled ? finitePositiveDoseG(log.coffeeDoseG) : null;
  const brewRatio = doseEnabled ? finitePositiveBrewRatio(log.brewRatio) : null;
  const totalWaterMl = doseEnabled ? finitePositiveWaterMl(log.totalWaterMl) : null;

  const cafeLat = Number(log.cafeLat);
  const cafeLng = Number(log.cafeLng);
  const logBase = { ...log };
  delete logBase.paperFilter;
  delete logBase.waterType;
  delete logBase.totalBrewTimeSec;
  delete logBase.coffeeDoseG;
  delete logBase.brewRatio;
  delete logBase.totalWaterMl;

  return {
    ...logBase,
    date: normalizeBrewDate(log.date),
    beanName: log.beanName?.trim() || "未入力",
    origins: origins && origins.length > 0 ? origins : undefined,
    originCountry: fallbackCountry,
    method,
    equipmentName,
    roastLevel: log.roastLevel?.trim() || "中煎り",
    roastery: log.roastery?.trim() || "未入力",
    overallRating: Math.min(5, Math.max(1, Math.round(Number(log.overallRating) || 4))),
    foodPairing: log.foodPairing?.trim() || undefined,
    filterRinse: Boolean(log.filterRinse),
    rdtDone: Boolean(log.rdtDone),
    flavors: Array.isArray(log.flavors) ? log.flavors : [],
    aftertaste: log.aftertaste?.trim() ?? "",
    memo: log.memo?.trim() ?? "",
    ...(Number.isFinite(cafeLat) && Number.isFinite(cafeLng) ? { cafeLat, cafeLng } : {}),
    ...(log.brewPhotoUrl?.trim() ? { brewPhotoUrl: log.brewPhotoUrl.trim() } : {}),
    ...(waterTempC !== null ? { waterTempC } : {}),
    ...(bloomTimeSec !== null ? { bloomTimeSec } : {}),
    ...(coffeeMakerCourse !== null ? { coffeeMakerCourse } : {}),
    ...(steepTimeMemo !== null ? { steepTimeMemo } : {}),
    ...(grindSize !== null ? { grindSize } : {}),
    ...(paperFilter !== null ? { paperFilter } : {}),
    ...(waterType !== null ? { waterType } : {}),
    ...(totalBrewTimeSec !== null ? { totalBrewTimeSec } : {}),
    ...(coffeeDoseG !== null ? { coffeeDoseG } : {}),
    ...(brewRatio !== null ? { brewRatio } : {}),
    ...(totalWaterMl !== null ? { totalWaterMl } : {})
  };
}

export function formatBrewSaveError(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [record.message, record.details, record.hint].filter(
      (part): part is string => typeof part === "string" && part.trim() !== ""
    );
    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "不明なエラーが発生しました。";
}

export function normalizeMapCountryName(name: unknown) {
  return String(name ?? "").trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** localStorage 等の不完全な JSON でも落ちないよう正規化する */
export function coerceStoredBrewLog(raw: unknown): StoredBrewLog | null {
  if (!isRecord(raw) || typeof raw.id !== "number" || Number.isNaN(raw.id)) {
    return null;
  }

  const flavorsRaw = raw.flavors;
  const flavors = Array.isArray(flavorsRaw)
    ? flavorsRaw.filter((item): item is string => typeof item === "string")
    : [];

  let overallRating = Number(raw.overallRating);
  if (!Number.isFinite(overallRating)) {
    overallRating = 4;
  }
  overallRating = Math.min(5, Math.max(1, Math.round(overallRating)));

  const originCountry =
    typeof raw.originCountry === "string" && raw.originCountry.trim() !== ""
      ? raw.originCountry
      : "Unknown";

  let origins: StoredBrewLog["origins"] = undefined;
  if (Array.isArray(raw.origins) && raw.origins.length > 0) {
    const mapped = raw.origins
      .filter((entry): entry is Record<string, unknown> => isRecord(entry))
      .map((entry) => ({
        country: typeof entry.country === "string" ? entry.country : "",
        ratio: typeof entry.ratio === "string" ? entry.ratio : String(entry.ratio ?? "")
      }))
      .filter((entry) => entry.country.trim() !== "");
    origins = mapped.length > 0 ? mapped : undefined;
  }

  const cafeLat = Number(raw.cafeLat);
  const cafeLng = Number(raw.cafeLng);
  const brewPhotoUrl =
    typeof raw.brewPhotoUrl === "string" && raw.brewPhotoUrl.trim() !== ""
      ? raw.brewPhotoUrl.trim()
      : undefined;

  const waterTempRaw = Number(raw.waterTempC);
  const bloomRaw = Number(raw.bloomTimeSec);
  const coffeeMakerCourse =
    typeof raw.coffeeMakerCourse === "string" && raw.coffeeMakerCourse.trim() !== ""
      ? raw.coffeeMakerCourse.trim()
      : undefined;

  const steepTimeMemo =
    typeof raw.steepTimeMemo === "string" && raw.steepTimeMemo.trim() !== ""
      ? raw.steepTimeMemo.trim()
      : undefined;
  const grindSize =
    typeof raw.grindSize === "string" && raw.grindSize.trim() !== ""
      ? raw.grindSize.trim()
      : undefined;
  const paperFilter =
    typeof raw.paperFilter === "string" && raw.paperFilter.trim() !== ""
      ? raw.paperFilter.trim()
      : undefined;
  const waterType =
    typeof raw.waterType === "string" && raw.waterType.trim() !== ""
      ? raw.waterType.trim()
      : undefined;
  const totalBrewRaw = Number(raw.totalBrewTimeSec);
  const coffeeDoseRaw = Number(raw.coffeeDoseG);
  const brewRatioRaw = Number(raw.brewRatio);
  const totalWaterRaw = Number(raw.totalWaterMl);

  return {
    id: raw.id,
    date: typeof raw.date === "string" ? raw.date : String(raw.date ?? ""),
    beanName: typeof raw.beanName === "string" ? raw.beanName : "未入力",
    origins,
    originCountry,
    method: typeof raw.method === "string" ? raw.method : "ハンドドリップ",
    equipmentName: typeof raw.equipmentName === "string" ? raw.equipmentName : undefined,
    roastLevel: typeof raw.roastLevel === "string" ? raw.roastLevel : "中煎り",
    roastery: typeof raw.roastery === "string" ? raw.roastery : "未入力",
    overallRating,
    foodPairing: typeof raw.foodPairing === "string" ? raw.foodPairing : undefined,
    filterRinse: Boolean(raw.filterRinse),
    rdtDone: Boolean(raw.rdtDone),
    flavors,
    aftertaste: typeof raw.aftertaste === "string" ? raw.aftertaste : "",
    memo: typeof raw.memo === "string" ? raw.memo : "",
    ...(Number.isFinite(cafeLat) && Number.isFinite(cafeLng) ? { cafeLat, cafeLng } : {}),
    ...(brewPhotoUrl ? { brewPhotoUrl } : {}),
    ...(Number.isFinite(waterTempRaw) && !Number.isNaN(waterTempRaw)
      ? { waterTempC: Math.round(waterTempRaw) }
      : {}),
    ...(Number.isFinite(bloomRaw) && !Number.isNaN(bloomRaw)
      ? { bloomTimeSec: Math.round(bloomRaw) }
      : {}),
    ...(coffeeMakerCourse ? { coffeeMakerCourse } : {}),
    ...(steepTimeMemo ? { steepTimeMemo } : {}),
    ...(grindSize ? { grindSize } : {}),
    ...(paperFilter ? { paperFilter } : {}),
    ...(waterType ? { waterType } : {}),
    ...(Number.isFinite(totalBrewRaw) && !Number.isNaN(totalBrewRaw)
      ? { totalBrewTimeSec: Math.round(totalBrewRaw) }
      : {}),
    ...(Number.isFinite(coffeeDoseRaw) && coffeeDoseRaw > 0
      ? { coffeeDoseG: Math.round(coffeeDoseRaw * 10) / 10 }
      : {}),
    ...(Number.isFinite(brewRatioRaw) && brewRatioRaw > 0
      ? { brewRatio: Math.round(brewRatioRaw * 10) / 10 }
      : {}),
    ...(Number.isFinite(totalWaterRaw) && totalWaterRaw > 0
      ? { totalWaterMl: Math.round(totalWaterRaw) }
      : {})
  };
}

export function getLogOriginCountries(log: StoredBrewLog): string[] {
  if (log.origins && log.origins.length > 0) {
    const fromOrigins = log.origins
      .map((origin) => origin.country)
      .filter((country) => typeof country === "string" && country.trim() !== "");
    if (fromOrigins.length > 0) {
      return fromOrigins;
    }
  }
  if (typeof log.originCountry === "string" && log.originCountry.trim() !== "") {
    return [log.originCountry];
  }
  return [];
}

export function logMatchesCountryKey(log: StoredBrewLog, countryKey: string) {
  const key = normalizeMapCountryName(countryKey);
  return getLogOriginCountries(log).some(
    (country) => normalizeMapCountryName(country) === key
  );
}

/** ジャーナルなど一覧の1ページあたり件数 */
export const BREW_LOG_JOURNAL_PAGE_SIZE = 10;

/**
 * ソート・フィルタ済みの配列から、UI に載せる1ページ分だけを切り出す。
 * localStorage では生 JSON の読み込みは避けられないが、描画件数を抑えてパフォーマンスを保つ。
 * Supabase 等へ移行する場合は、同じ page / pageSize で `.range(offset, offset+limit-1)` と
 * 別途 `count` を取得し、ここはサーバー結果をそのまま渡す形に置き換える。
 */
export function sliceLogsPage<T>(
  sortedLogs: T[],
  page: number,
  pageSize: number
): { pageSlice: T[]; total: number; totalPages: number; clampedPage: number } {
  const total = sortedLogs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return {
    pageSlice: sortedLogs.slice(start, start + pageSize),
    total,
    totalPages,
    clampedPage
  };
}

/** ブラウザ上で履歴一覧と同じ集合を得る（未保存時はサンプルを返す） */
export function loadBrewLogsFromStorage(): StoredBrewLog[] {
  if (typeof window === "undefined") {
    return [...SAMPLE_BREW_LOGS];
  }
  const raw = localStorage.getItem(BREW_LOG_STORAGE_KEY);
  if (!raw) {
    return [...SAMPLE_BREW_LOGS];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [...SAMPLE_BREW_LOGS];
    }
    const coerced = parsed
      .map((entry) => coerceStoredBrewLog(entry))
      .filter((entry): entry is StoredBrewLog => entry !== null);
    return coerced.length > 0 ? coerced : [...SAMPLE_BREW_LOGS];
  } catch {
    return [...SAMPLE_BREW_LOGS];
  }
}

export function persistBrewLogs(logs: StoredBrewLog[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(BREW_LOG_STORAGE_KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event(BREW_LOGS_UPDATED_EVENT));
}

export const SAMPLE_BREW_LOGS: StoredBrewLog[] = [
  {
    id: 1,
    date: "2026-04-06",
    beanName: "エチオピア イルガチェフェ",
    origins: [{ country: "Ethiopia", ratio: "100" }],
    originCountry: "Ethiopia",
    method: "ハンドドリップ",
    equipmentName: "Hario V60 / Fellow Stagg EKG",
    roastLevel: "浅煎り",
    roastery: "Local Roaster",
    overallRating: 4,
    foodPairing: "スコーン",
    filterRinse: true,
    rdtDone: true,
    flavors: ["Berry", "Jasmine"],
    aftertaste: "紅茶のような余韻",
    memo: "華やかな酸味。"
  },
  {
    id: 2,
    date: "2026-04-12",
    beanName: "ブラジル セラード",
    origins: [
      { country: "Brazil", ratio: "70" },
      { country: "Colombia", ratio: "30" }
    ],
    originCountry: "Brazil",
    method: "エスプレッソ",
    equipmentName: "La Marzocco Linea Mini",
    roastLevel: "中深煎り",
    roastery: "COFFEE ROASTER TOKYO",
    overallRating: 5,
    foodPairing: "チョコ",
    filterRinse: false,
    rdtDone: false,
    flavors: ["Dark Chocolate", "Nutty"],
    aftertaste: "甘い余韻",
    memo: "抽出量36gで安定。"
  },
  {
    id: 3,
    date: "2026-04-21",
    beanName: "コロンビア ウィラ",
    origins: [{ country: "Colombia", ratio: "100" }],
    originCountry: "Colombia",
    method: "コールドブリュー",
    equipmentName: "Toddy Cold Brew System",
    roastLevel: "中煎り",
    roastery: "Beans Market",
    overallRating: 4,
    foodPairing: "チーズケーキ",
    filterRinse: false,
    rdtDone: true,
    flavors: ["Citrus Fruit", "Honey"],
    aftertaste: "すっきり",
    memo: "12時間抽出。"
  }
];
