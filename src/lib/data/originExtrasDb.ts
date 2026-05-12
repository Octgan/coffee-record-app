import type { TypedSupabaseClient } from "@/lib/data/brewLogsDb";

export async function fetchOriginExtras(client: TypedSupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("user_origin_extras").select("country_value");
  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.country_value);
}

/** 産地キーをマージ（既存行はそのまま、新規のみ追加） */
export async function addOriginExtras(
  client: TypedSupabaseClient,
  userId: string,
  countryValues: string[]
): Promise<void> {
  const unique = Array.from(new Set(countryValues.filter((c) => c.trim() !== "")));
  if (unique.length === 0) {
    return;
  }
  const rows = unique.map((country_value) => ({ user_id: userId, country_value }));
  const { error } = await client.from("user_origin_extras").upsert(rows, {
    onConflict: "user_id,country_value"
  });
  if (error) {
    throw error;
  }
}
