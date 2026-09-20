import { eq, inArray } from "drizzle-orm";
import { systemSettings } from "@solar/database/schema";
import { getDb } from "@/db";
import { SETTINGS_CATALOG, SETTINGS_KEYS } from "./catalog";

const DEFAULTS = Object.fromEntries(
  SETTINGS_CATALOG.map((s) => [s.key, s.value]),
) as Record<string, string>;

let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

export function invalidateSettingsCache() {
  cache = null;
  cacheLoadedAt = 0;
}

async function loadCache(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;

  const map = new Map<string, string>(Object.entries(DEFAULTS));
  try {
    const db = getDb();
    const rows = await db.select().from(systemSettings);
    for (const row of rows) {
      map.set(row.key, row.value);
    }
  } catch {
    // Fall back to defaults when DB unavailable (unit tests / boot).
  }
  cache = map;
  cacheLoadedAt = now;
  return map;
}

export async function getSetting(
  key: string,
  fallback?: string,
): Promise<string> {
  const map = await loadCache();
  if (map.has(key)) return map.get(key)!;
  if (fallback !== undefined) return fallback;
  if (key in DEFAULTS) return DEFAULTS[key]!;
  return "";
}

export async function getSettingNumber(
  key: string,
  fallback: number,
): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getSettingBool(
  key: string,
  fallback: boolean,
): Promise<boolean> {
  const raw = (await getSetting(key, fallback ? "true" : "false")).toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return fallback;
}

export async function listSettings(): Promise<
  { key: string; value: string; group: string }[]
> {
  const map = await loadCache();
  return SETTINGS_CATALOG.map((s) => ({
    key: s.key,
    value: map.get(s.key) ?? s.value,
    group: s.group,
  }));
}

export async function updateSettingsValues(
  updates: Record<string, string>,
): Promise<{ key: string; value: string }[]> {
  const allowed = new Set(SETTINGS_KEYS);
  const entries = Object.entries(updates).filter(([k]) => allowed.has(k));
  if (entries.length === 0) return [];

  const db = getDb();
  const now = new Date();
  for (const [key, value] of entries) {
    await db
      .insert(systemSettings)
      .values({ key, value: String(value), updatedAt: now })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: String(value), updatedAt: now },
      });
  }
  invalidateSettingsCache();

  const keys = entries.map(([k]) => k);
  const rows = await db
    .select()
    .from(systemSettings)
    .where(inArray(systemSettings.key, keys));
  return rows.map((r) => ({ key: r.key, value: r.value }));
}

export async function getSettingRow(key: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return row ?? null;
}

export { SETTINGS_KEYS, SETTINGS_CATALOG };
