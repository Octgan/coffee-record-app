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
};

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
    ...(coffeeMakerCourse ? { coffeeMakerCourse } : {})
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
