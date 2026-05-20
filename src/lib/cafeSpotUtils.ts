import type { CafeRecord } from "@/lib/cafeMapStorage";

/** 同一カフェ（位置＋店名）の訪問ランク */
export type VisitRank = "none" | "silver" | "gold";

export type CafeSpot = {
  spotKey: string;
  cafeName: string;
  lat: number;
  lng: number;
  /** 訪問日の新しい順 */
  visits: CafeRecord[];
  visitCount: number;
  rank: VisitRank;
};

const SPOT_COORD_DECIMALS = 4;

/** 地図上で1ピンにまとめるキー（緯度経度＋店名） */
export function getCafeSpotKey(record: CafeRecord): string {
  const lat = record.lat.toFixed(SPOT_COORD_DECIMALS);
  const lng = record.lng.toFixed(SPOT_COORD_DECIMALS);
  const name = record.cafeName.trim().toLowerCase().replace(/\s+/g, " ");
  return `${lat}|${lng}|${name}`;
}

export function getVisitRank(visitCount: number): VisitRank {
  if (visitCount >= 10) {
    return "gold";
  }
  if (visitCount >= 5) {
    return "silver";
  }
  return "none";
}

export function visitRankBadgeLabel(rank: VisitRank): string | null {
  switch (rank) {
    case "gold":
      return "🥇 ゴールド常連";
    case "silver":
      return "🥈 シルバー常連";
    default:
      return null;
  }
}

export function visitRankShortLabel(rank: VisitRank): string | null {
  switch (rank) {
    case "gold":
      return "🥇 ゴールド";
    case "silver":
      return "🥈 シルバー";
    default:
      return null;
  }
}

function compareVisitsNewestFirst(a: CafeRecord, b: CafeRecord): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) {
    return byDate;
  }
  return b.id - a.id;
}

/** フラットな記録一覧を地図用スポットへ集約 */
export function groupRecordsIntoSpots(records: CafeRecord[]): CafeSpot[] {
  const byKey = new Map<string, CafeRecord[]>();

  for (const record of records) {
    const key = getCafeSpotKey(record);
    const list = byKey.get(key);
    if (list) {
      list.push(record);
    } else {
      byKey.set(key, [record]);
    }
  }

  return Array.from(byKey.entries()).map(([spotKey, visits]) => {
    const sorted = [...visits].sort(compareVisitsNewestFirst);
    const primary = sorted[0]!;
    const visitCount = sorted.length;
    return {
      spotKey,
      cafeName: primary.cafeName,
      lat: primary.lat,
      lng: primary.lng,
      visits: sorted,
      visitCount,
      rank: getVisitRank(visitCount)
    };
  });
}

export function findSpotByKey(spots: CafeSpot[], spotKey: string): CafeSpot | null {
  return spots.find((s) => s.spotKey === spotKey) ?? null;
}
