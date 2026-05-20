import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrewLogRow, Database, Json } from "@/lib/database.types";
import { normalizeBrewLogForDatabase, type StoredBrewLog } from "@/lib/brewLogStorage";

export type TypedSupabaseClient = SupabaseClient<Database>;

type BrewRow = BrewLogRow;
type BrewInsert = Database["public"]["Tables"]["brew_logs"]["Insert"];
type BrewUpdate = Database["public"]["Tables"]["brew_logs"]["Update"];

const OPTIONAL_MIGRATION_COLUMNS = [
  "water_temp_c",
  "bloom_time_sec",
  "coffee_maker_course",
  "steep_time_memo",
  "grind_size",
  "paper_filter",
  "water_type",
  "total_brew_time_sec",
  "coffee_dose_g",
  "brew_ratio",
  "total_water_ml"
] as const;

function isSchemaColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string; message?: string };
  if (record.code === "PGRST204") {
    return true;
  }
  const message = String(record.message ?? "").toLowerCase();
  return (
    message.includes("column") &&
    (message.includes("schema cache") || message.includes("could not find"))
  );
}

function withoutOptionalMigrationColumns<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const key of OPTIONAL_MIGRATION_COLUMNS) {
    delete copy[key];
  }
  return copy;
}

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
      : {}),
    ...(row.paper_filter != null && String(row.paper_filter).trim() !== ""
      ? { paperFilter: String(row.paper_filter).trim() }
      : {}),
    ...(row.water_type != null && String(row.water_type).trim() !== ""
      ? { waterType: String(row.water_type).trim() }
      : {}),
    ...(typeof row.total_brew_time_sec === "number" && !Number.isNaN(row.total_brew_time_sec)
      ? { totalBrewTimeSec: row.total_brew_time_sec }
      : {}),
    ...(typeof row.coffee_dose_g === "number" && !Number.isNaN(row.coffee_dose_g) && row.coffee_dose_g > 0
      ? { coffeeDoseG: row.coffee_dose_g }
      : {}),
    ...(typeof row.brew_ratio === "number" && !Number.isNaN(row.brew_ratio) && row.brew_ratio > 0
      ? { brewRatio: row.brew_ratio }
      : {}),
    ...(typeof row.total_water_ml === "number" &&
    !Number.isNaN(row.total_water_ml) &&
    row.total_water_ml > 0
      ? { totalWaterMl: row.total_water_ml }
      : {})
  };
}

function storedLogToInsert(log: StoredBrewLog, userId: string): BrewInsert {
  const normalized = normalizeBrewLogForDatabase(log);

  return {
    user_id: userId,
    date: normalized.date,
    bean_name: normalized.beanName,
    origins:
      normalized.origins && normalized.origins.length > 0
        ? (normalized.origins as Json)
        : null,
    origin_country: normalized.originCountry,
    method: normalized.method,
    equipment_name: normalized.equipmentName?.trim() || null,
    roast_level: normalized.roastLevel,
    roastery: normalized.roastery,
    overall_rating: normalized.overallRating,
    food_pairing: normalized.foodPairing?.trim() || null,
    filter_rinse: normalized.filterRinse ?? false,
    rdt_done: normalized.rdtDone ?? false,
    flavors: (normalized.flavors ?? []) as Json,
    aftertaste: normalized.aftertaste ?? "",
    memo: normalized.memo ?? "",
    cafe_lat: normalized.cafeLat ?? null,
    cafe_lng: normalized.cafeLng ?? null,
    brew_photo_url: normalized.brewPhotoUrl?.trim() || null,
    water_temp_c:
      typeof normalized.waterTempC === "number" && Number.isFinite(normalized.waterTempC)
        ? normalized.waterTempC
        : null,
    bloom_time_sec:
      typeof normalized.bloomTimeSec === "number" && Number.isFinite(normalized.bloomTimeSec)
        ? normalized.bloomTimeSec
        : null,
    coffee_maker_course: normalized.coffeeMakerCourse ?? null,
    steep_time_memo: normalized.steepTimeMemo ?? null,
    grind_size: normalized.grindSize ?? null,
    paper_filter: normalized.paperFilter ?? null,
    water_type: normalized.waterType ?? null,
    total_brew_time_sec:
      typeof normalized.totalBrewTimeSec === "number" && Number.isFinite(normalized.totalBrewTimeSec)
        ? normalized.totalBrewTimeSec
        : null,
    coffee_dose_g:
      typeof normalized.coffeeDoseG === "number" && Number.isFinite(normalized.coffeeDoseG)
        ? normalized.coffeeDoseG
        : null,
    brew_ratio:
      typeof normalized.brewRatio === "number" && Number.isFinite(normalized.brewRatio)
        ? normalized.brewRatio
        : null,
    total_water_ml:
      typeof normalized.totalWaterMl === "number" && Number.isFinite(normalized.totalWaterMl)
        ? normalized.totalWaterMl
        : null
  };
}

async function runBrewInsert(
  client: TypedSupabaseClient,
  insert: BrewInsert
): Promise<BrewRow> {
  const { data, error } = await client.from("brew_logs").insert(insert).select("*").single();
  if (!error) {
    return data as BrewRow;
  }
  if (!isSchemaColumnError(error)) {
    throw error;
  }
  const legacy = withoutOptionalMigrationColumns(insert);
  const { data: legacyData, error: legacyError } = await client
    .from("brew_logs")
    .insert(legacy)
    .select("*")
    .single();
  if (legacyError) {
    throw legacyError;
  }
  return legacyData as BrewRow;
}

async function runBrewUpdate(
  client: TypedSupabaseClient,
  logId: number,
  patch: BrewUpdate
): Promise<BrewRow> {
  const { data, error } = await client
    .from("brew_logs")
    .update(patch)
    .eq("id", logId)
    .select("*")
    .single();
  if (!error) {
    return data as BrewRow;
  }
  if (!isSchemaColumnError(error)) {
    throw error;
  }
  const legacyPatch = withoutOptionalMigrationColumns(patch as Record<string, unknown>) as BrewUpdate;
  const { data: legacyData, error: legacyError } = await client
    .from("brew_logs")
    .update(legacyPatch)
    .eq("id", logId)
    .select("*")
    .single();
  if (legacyError) {
    throw legacyError;
  }
  return legacyData as BrewRow;
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
  const row = await runBrewInsert(client, insert);
  return brewRowToStoredLog(row);
}

export async function updateBrewLog(
  client: TypedSupabaseClient,
  _userId: string,
  log: StoredBrewLog
): Promise<StoredBrewLog> {
  const normalized = normalizeBrewLogForDatabase(log);
  const patch: BrewUpdate = {
    date: normalized.date,
    bean_name: normalized.beanName,
    origins:
      normalized.origins && normalized.origins.length > 0
        ? (normalized.origins as Json)
        : null,
    origin_country: normalized.originCountry,
    method: normalized.method,
    equipment_name: normalized.equipmentName?.trim() || null,
    roast_level: normalized.roastLevel,
    roastery: normalized.roastery,
    overall_rating: normalized.overallRating,
    food_pairing: normalized.foodPairing?.trim() || null,
    filter_rinse: normalized.filterRinse ?? false,
    rdt_done: normalized.rdtDone ?? false,
    flavors: (normalized.flavors ?? []) as Json,
    aftertaste: normalized.aftertaste ?? "",
    memo: normalized.memo ?? "",
    cafe_lat: normalized.cafeLat ?? null,
    cafe_lng: normalized.cafeLng ?? null,
    brew_photo_url: normalized.brewPhotoUrl?.trim() || null,
    water_temp_c:
      typeof normalized.waterTempC === "number" && Number.isFinite(normalized.waterTempC)
        ? normalized.waterTempC
        : null,
    bloom_time_sec:
      typeof normalized.bloomTimeSec === "number" && Number.isFinite(normalized.bloomTimeSec)
        ? normalized.bloomTimeSec
        : null,
    coffee_maker_course: normalized.coffeeMakerCourse ?? null,
    steep_time_memo: normalized.steepTimeMemo ?? null,
    grind_size: normalized.grindSize ?? null,
    paper_filter: normalized.paperFilter ?? null,
    water_type: normalized.waterType ?? null,
    total_brew_time_sec:
      typeof normalized.totalBrewTimeSec === "number" && Number.isFinite(normalized.totalBrewTimeSec)
        ? normalized.totalBrewTimeSec
        : null,
    coffee_dose_g:
      typeof normalized.coffeeDoseG === "number" && Number.isFinite(normalized.coffeeDoseG)
        ? normalized.coffeeDoseG
        : null,
    brew_ratio:
      typeof normalized.brewRatio === "number" && Number.isFinite(normalized.brewRatio)
        ? normalized.brewRatio
        : null,
    total_water_ml:
      typeof normalized.totalWaterMl === "number" && Number.isFinite(normalized.totalWaterMl)
        ? normalized.totalWaterMl
        : null,
    updated_at: new Date().toISOString()
  };

  const row = await runBrewUpdate(client, log.id, patch);
  return brewRowToStoredLog(row);
}

export async function deleteBrewLog(client: TypedSupabaseClient, brewLogId: number): Promise<void> {
  const { error } = await client.from("brew_logs").delete().eq("id", brewLogId);
  if (error) {
    throw error;
  }
}
