import type { TypedSupabaseClient } from "@/lib/data/brewLogsDb";
import type { CafeRecordRow, Database } from "@/lib/database.types";
import { DEFAULT_CAFE_PHOTO_URL, type CafeRecord } from "@/lib/cafeMapStorage";
import type { StoredBrewLog } from "@/lib/brewLogStorage";

/** カフェ記録の更新後にカレンダー等が再取得するための同一タブ用イベント */
export const CAFE_RECORDS_UPDATED_EVENT = "coffee-cafe-records-updated";

type CafeRow = CafeRecordRow;

export function cafeRowToRecord(row: CafeRow): CafeRecord {
  return {
    id: Number(row.id),
    ...(row.brew_log_id != null ? { brewLogId: Number(row.brew_log_id) } : {}),
    cafeName: row.cafe_name,
    lat: row.lat,
    lng: row.lng,
    date: row.date,
    rating: row.rating,
    bean: row.bean,
    note: row.note,
    foodPairing: row.food_pairing ?? undefined,
    photoUrl: row.photo_url
  };
}

function recordToInsert(r: CafeRecord, userId: string): Database["public"]["Tables"]["cafe_records"]["Insert"] {
  return {
    user_id: userId,
    id: r.id,
    brew_log_id: r.brewLogId ?? null,
    cafe_name: r.cafeName,
    lat: r.lat,
    lng: r.lng,
    date: r.date,
    rating: r.rating,
    bean: r.bean,
    note: r.note,
    food_pairing: r.foodPairing ?? null,
    photo_url: r.photoUrl
  };
}

export async function fetchCafeRecords(client: TypedSupabaseClient): Promise<CafeRecord[]> {
  const { data, error } = await client
    .from("cafe_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as CafeRow[]).map(cafeRowToRecord);
}

export async function syncCafeRecordsForUser(
  client: TypedSupabaseClient,
  userId: string,
  records: CafeRecord[]
): Promise<void> {
  const { error: delErr } = await client.from("cafe_records").delete().eq("user_id", userId);
  if (delErr) {
    throw delErr;
  }
  if (records.length === 0) {
    return;
  }
  const rows = records.map((r) => recordToInsert(r, userId));
  const { error: insErr } = await client.from("cafe_records").insert(rows);
  if (insErr) {
    throw insErr;
  }
}

/** 抽出記録保存後にカフェピンを同期（座標がある場合のみ） */
export async function upsertCafeRecordForBrewLogRemote(
  client: TypedSupabaseClient,
  userId: string,
  log: StoredBrewLog
): Promise<void> {
  const lat = log.cafeLat;
  const lng = log.cafeLng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const records = await fetchCafeRecords(client);
  const cafeName =
    log.roastery.trim() !== "" && log.roastery !== "未入力" ? log.roastery.trim() : "名称未設定のスポット";
  const beanLabel =
    log.beanName.trim() !== "" && log.beanName !== "未入力" ? log.beanName.trim() : "未入力";
  const noteParts = [log.memo?.trim(), log.aftertaste?.trim()].filter(Boolean) as string[];
  const photo = log.brewPhotoUrl?.trim() || DEFAULT_CAFE_PHOTO_URL;

  const idx = records.findIndex((r) => r.brewLogId === log.id);
  const nextId = records.length > 0 ? Math.max(...records.map((r) => r.id)) + 1 : 1;
  const entry: CafeRecord = {
    id: idx >= 0 ? records[idx]!.id : nextId,
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

  const next = idx >= 0 ? records.map((r, i) => (i === idx ? entry : r)) : [entry, ...records];
  await syncCafeRecordsForUser(client, userId, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CAFE_RECORDS_UPDATED_EVENT));
  }
}
