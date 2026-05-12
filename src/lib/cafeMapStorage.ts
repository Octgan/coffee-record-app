import type { StoredBrewLog } from "./brewLogStorage";

export const CAFE_MAP_STORAGE_KEY = "coffee-cafe-map-logs";

export const CAFE_MAP_STORAGE_UPDATED_EVENT = "coffee-cafe-map-updated";

export const DEFAULT_CAFE_PHOTO_URL =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80";

/** 現在は localStorage。バックエンドと連携する場合も、取得は常にログインユーザー本人の行のみに限定してください。 */
export function persistCafeRecords(records: CafeRecord[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CAFE_MAP_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CAFE_MAP_STORAGE_UPDATED_EVENT));
}

export type CafeRecord = {
  id: number;
  /** 抽出記録（StoredBrewLog.id）と紐づく場合。保存・更新で同期する */
  brewLogId?: number;
  cafeName: string;
  lat: number;
  lng: number;
  date: string;
  rating: number;
  bean: string;
  note: string;
  foodPairing?: string;
  photoUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 旧データ（isPublic / authorNickname 等）を捨てて正規化する */
export function coerceCafeRecord(raw: unknown): CafeRecord | null {
  if (!isRecord(raw) || typeof raw.id !== "number" || Number.isNaN(raw.id)) {
    return null;
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  let rating = Number(raw.rating);
  if (!Number.isFinite(rating)) {
    rating = 4;
  }
  rating = Math.min(5, Math.max(1, Math.round(rating)));

  const brewLogId = Number(raw.brewLogId);
  const brewLogIdNorm =
    Number.isFinite(brewLogId) && !Number.isNaN(brewLogId) ? brewLogId : undefined;

  return {
    id: raw.id,
    ...(brewLogIdNorm !== undefined ? { brewLogId: brewLogIdNorm } : {}),
    cafeName: typeof raw.cafeName === "string" && raw.cafeName.trim() !== "" ? raw.cafeName : "名称未設定",
    lat,
    lng,
    date: typeof raw.date === "string" ? raw.date : String(raw.date ?? ""),
    rating,
    bean: typeof raw.bean === "string" ? raw.bean : "未入力",
    note: typeof raw.note === "string" ? raw.note : "",
    foodPairing:
      typeof raw.foodPairing === "string" && raw.foodPairing.trim() !== ""
        ? raw.foodPairing
        : undefined,
    photoUrl:
      typeof raw.photoUrl === "string" && raw.photoUrl.trim() !== ""
        ? raw.photoUrl
        : DEFAULT_CAFE_PHOTO_URL
  };
}

export function coerceCafeRecords(raw: unknown): CafeRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(coerceCafeRecord).filter((r): r is CafeRecord => r !== null);
}

/**
 * 抽出記録を保存したあと、同じ位置・店名でカフェマップのピンを1件にまとめる（brewLogId で突合）。
 */
export function upsertCafeRecordForBrewLog(log: StoredBrewLog) {
  if (typeof window === "undefined") {
    return;
  }
  const lat = log.cafeLat;
  const lng = log.cafeLng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  let records: CafeRecord[] = [];
  const rawStored = localStorage.getItem(CAFE_MAP_STORAGE_KEY);
  if (rawStored) {
    try {
      records = coerceCafeRecords(JSON.parse(rawStored) as unknown);
    } catch {
      records = [];
    }
  }

  const cafeName =
    log.roastery.trim() !== "" && log.roastery !== "未入力" ? log.roastery.trim() : "名称未設定のスポット";
  const beanLabel =
    log.beanName.trim() !== "" && log.beanName !== "未入力" ? log.beanName : "未入力";
  const noteParts = [log.memo?.trim(), log.aftertaste?.trim()].filter(Boolean) as string[];
  const photo = log.brewPhotoUrl?.trim() || DEFAULT_CAFE_PHOTO_URL;

  const idx = records.findIndex((r) => r.brewLogId === log.id);
  const entry: CafeRecord = {
    id: idx >= 0 ? records[idx]!.id : Date.now(),
    brewLogId: log.id,
    cafeName,
    lat,
    lng,
    date: log.date,
    rating: Math.min(5, Math.max(1, Math.round(log.overallRating))),
    bean: beanLabel,
    note: noteParts.join("\n"),
    foodPairing: log.foodPairing?.trim() || undefined,
    photoUrl: photo
  };

  const next =
    idx >= 0 ? records.map((r, i) => (i === idx ? entry : r)) : [entry, ...records];

  persistCafeRecords(next);
}

export const SAMPLE_CAFE_RECORDS: CafeRecord[] = [
  {
    id: 1,
    cafeName: "Amber Roastery Tokyo",
    lat: 35.6826,
    lng: 139.7671,
    date: "2026-04-10",
    rating: 5,
    bean: "エチオピア イルガチェフェ",
    note: "シトラス感が綺麗で、余韻が長い。",
    foodPairing: "レモンケーキ",
    photoUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 2,
    cafeName: "Night Owl Coffee",
    lat: 35.6769,
    lng: 139.7632,
    date: "2026-04-14",
    rating: 4,
    bean: "ブラジル / コロンビア ブレンド",
    note: "ダークチョコとナッツのバランスが良い。",
    foodPairing: "チョコブラウニー",
    photoUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: 3,
    cafeName: "Harbor Drip Lab",
    lat: 35.6707,
    lng: 139.7717,
    date: "2026-04-18",
    rating: 5,
    bean: "ケニア AA",
    note: "明るい酸味と華やかなアロマ。",
    foodPairing: "バタークッキー",
    photoUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80"
  }
];
