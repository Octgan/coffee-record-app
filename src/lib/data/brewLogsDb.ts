import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrewLogRow, Database, Json } from "@/lib/database.types";
import type { StoredBrewLog } from "@/lib/brewLogStorage";

export type TypedSupabaseClient = SupabaseClient<Database>;

type BrewRow = BrewLogRow;

export function brewRowToStoredLog(row: BrewRow): StoredBrewLog {
  const flavorsRaw = row.flavors;
  const flavors = Array.isArray(flavorsRaw)
    ? flavorsRaw.filter((item): item is string => typeof item === "string")
    : [];

  let origins: StoredBrewLog["origins"];
  if (Array.isArray(row.origins)) {
    const mapped = row.origins
      .filter((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry))
      .map((entry) => {
        const o = entry as Record<string, unknown>;
        return {
          country: typeof o.country === "string" ? o.country : "",
          ratio: typeof o.ratio === "string" ? o.ratio : String(o.ratio ?? "")
        };
      })
      .filter((o) => o.country.trim() !== "");
    origins = mapped.length > 0 ? mapped : undefined;
  }

  return {
    id: Number(row.id),
    date: row.date,
    beanName: row.bean_name,
    origins,
    originCountry: row.origin_country,
    method: row.method,
    equipmentName: row.equipment_name ?? undefined,
    roastLevel: row.roast_level,
    roastery: row.roastery,
    overallRating: row.overall_rating,
    foodPairing: row.food_pairing ?? undefined,
    filterRinse: row.filter_rinse,
    rdtDone: row.rdt_done,
    flavors,
    aftertaste: row.aftertaste,
    memo: row.memo,
    ...(row.cafe_lat != null && row.cafe_lng != null
      ? { cafeLat: row.cafe_lat, cafeLng: row.cafe_lng }
      : {}),
    ...(row.brew_photo_url ? { brewPhotoUrl: row.brew_photo_url } : {}),
    ...(typeof row.water_temp_c === "number" && !Number.isNaN(row.water_temp_c)
      ? { waterTempC: row.water_temp_c }
      : {}),
    ...(typeof row.bloom_time_sec === "number" && !Number.isNaN(row.bloom_time_sec)
      ? { bloomTimeSec: row.bloom_time_sec }
      : {}),
    ...(row.coffee_maker_course != null && String(row.coffee_maker_course).trim() !== ""
      ? { coffeeMakerCourse: String(row.coffee_maker_course).trim() }
      : {}),
    ...(row.steep_time_memo != null && String(row.steep_time_memo).trim() !== ""
      ? { steepTimeMemo: String(row.steep_time_memo).trim() }
      : {}),
    ...(row.grind_size != null && String(row.grind_size).trim() !== ""
      ? { grindSize: String(row.grind_size).trim() }
      : {})
  };
}

function storedLogToInsert(log: StoredBrewLog, userId: string): Database["public"]["Tables"]["brew_logs"]["Insert"] {
  return {
    user_id: userId,
    date: log.date,
    bean_name: log.beanName,
    origins: (log.origins ?? null) as Json,
    origin_country: log.originCountry,
    method: log.method,
    equipment_name: log.equipmentName ?? null,
    roast_level: log.roastLevel,
    roastery: log.roastery,
    overall_rating: log.overallRating,
    food_pairing: log.foodPairing ?? null,
    filter_rinse: log.filterRinse,
    rdt_done: log.rdtDone,
    flavors: log.flavors as Json,
    aftertaste: log.aftertaste,
    memo: log.memo,
    cafe_lat: log.cafeLat ?? null,
    cafe_lng: log.cafeLng ?? null,
    brew_photo_url: log.brewPhotoUrl ?? null,
    water_temp_c: log.waterTempC ?? null,
    bloom_time_sec: log.bloomTimeSec ?? null,
    coffee_maker_course: log.coffeeMakerCourse ?? null,
    steep_time_memo: log.steepTimeMemo ?? null,
    grind_size: log.grindSize ?? null
  };
}

export async function fetchBrewLogs(client: TypedSupabaseClient): Promise<StoredBrewLog[]> {
  const { data, error } = await client
    .from("brew_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as BrewRow[]).map(brewRowToStoredLog);
}

export async function insertBrewLog(
  client: TypedSupabaseClient,
  userId: string,
  log: StoredBrewLog
): Promise<StoredBrewLog> {
  const insert = storedLogToInsert(log, userId);

  const { data, error } = await client.from("brew_logs").insert(insert).select("*").single();
  if (error) {
    throw error;
  }
  return brewRowToStoredLog(data as BrewRow);
}

export async function updateBrewLog(
  client: TypedSupabaseClient,
  _userId: string,
  log: StoredBrewLog
): Promise<StoredBrewLog> {
  const { data, error } = await client
    .from("brew_logs")
    .update({
      date: log.date,
      bean_name: log.beanName,
      origins: (log.origins ?? null) as Json,
      origin_country: log.originCountry,
      method: log.method,
      equipment_name: log.equipmentName ?? null,
      roast_level: log.roastLevel,
      roastery: log.roastery,
      overall_rating: log.overallRating,
      food_pairing: log.foodPairing ?? null,
      filter_rinse: log.filterRinse,
      rdt_done: log.rdtDone,
      flavors: log.flavors as Json,
      aftertaste: log.aftertaste,
      memo: log.memo,
      cafe_lat: log.cafeLat ?? null,
      cafe_lng: log.cafeLng ?? null,
      brew_photo_url: log.brewPhotoUrl ?? null,
      water_temp_c: log.waterTempC ?? null,
      bloom_time_sec: log.bloomTimeSec ?? null,
      coffee_maker_course: log.coffeeMakerCourse ?? null,
      steep_time_memo: log.steepTimeMemo ?? null,
      grind_size: log.grindSize ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", log.id)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return brewRowToStoredLog(data as BrewRow);
}

export async function deleteBrewLog(client: TypedSupabaseClient, brewLogId: number): Promise<void> {
  const { error } = await client.from("brew_logs").delete().eq("id", brewLogId);
  if (error) {
    throw error;
  }
}
