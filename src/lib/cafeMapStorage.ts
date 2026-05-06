export const CAFE_MAP_STORAGE_KEY = "coffee-cafe-map-logs";

/** 現在は localStorage。バックエンドと連携する場合も、取得は常にログインユーザー本人の行のみに限定してください。 */
export function persistCafeRecords(records: CafeRecord[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CAFE_MAP_STORAGE_KEY, JSON.stringify(records));
}

export type CafeRecord = {
  id: number;
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

  return {
    id: raw.id,
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
        : "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80"
  };
}

export function coerceCafeRecords(raw: unknown): CafeRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(coerceCafeRecord).filter((r): r is CafeRecord => r !== null);
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
