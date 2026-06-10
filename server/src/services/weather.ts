import type { DailyForecast, WeatherSummary } from "../types.js";

/**
 * Open-Meteo client (PRD §7.1) with an in-memory TTL cache keyed by rounded
 * coordinates, an outbound timeout, and graceful degradation (PRD §11
 * "Weather API Downtime"): on failure we synthesize a seasonal fallback
 * forecast rather than erroring the whole plan.
 */

interface CacheEntry {
  expiresAt: number;
  value: WeatherSummary;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 5000;

function cacheKey(lat: number, lng: number): string {
  // ~11km grid: nearby users share an entry, slashing upstream calls.
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export async function getForecast(
  lat: number,
  lng: number,
  opts: { apiBase: string; cacheTtlSeconds: number; fetchImpl?: typeof fetch },
): Promise<WeatherSummary> {
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = new URL("/v1/forecast", opts.apiBase);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
  );
  url.searchParams.set("hourly", "soil_temperature_6cm");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`weather upstream ${res.status}`);
    const body = (await res.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        precipitation_probability_max: (number | null)[];
      };
      hourly?: { time: string[]; soil_temperature_6cm: (number | null)[] };
    };

    const soilByDate = new Map<string, number[]>();
    if (body.hourly) {
      body.hourly.time.forEach((t, i) => {
        const v = body.hourly!.soil_temperature_6cm[i];
        if (v == null) return;
        const date = t.slice(0, 10);
        const list = soilByDate.get(date) ?? [];
        list.push(v);
        soilByDate.set(date, list);
      });
    }

    const days: DailyForecast[] = body.daily.time.map((date, i) => {
      const soil = soilByDate.get(date);
      const soilAvgC = soil && soil.length ? soil.reduce((a, b) => a + b, 0) / soil.length : 13;
      return {
        date,
        tempMaxF: cToF(body.daily.temperature_2m_max[i] ?? 20),
        tempMinF: cToF(body.daily.temperature_2m_min[i] ?? 10),
        precipProbability: body.daily.precipitation_probability_max[i] ?? 0,
        precipInches: Math.round(((body.daily.precipitation_sum[i] ?? 0) / 25.4) * 100) / 100,
        soilTempF: cToF(soilAvgC),
      };
    });

    const value: WeatherSummary = {
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      days,
    };
    if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
    cache.set(key, { expiresAt: Date.now() + opts.cacheTtlSeconds * 1000, value });
    return value;
  } catch {
    // Serve stale cache if present, else a seasonal synthetic forecast.
    if (hit) return hit.value;
    return fallbackForecast(lat);
  }
}

export function fallbackForecast(lat: number, now: Date = new Date()): WeatherSummary {
  const month = now.getMonth(); // 0-11
  // Crude seasonal curve by latitude band; enough to keep PlanGen sensible offline.
  const seasonal = [35, 38, 48, 58, 68, 78, 84, 82, 74, 62, 50, 40][month] ?? 60;
  const latAdjust = (40 - lat) * 0.8;
  const high = Math.round(seasonal + latAdjust);
  const days: DailyForecast[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      tempMaxF: high,
      tempMinF: high - 18,
      precipProbability: 20,
      precipInches: 0.05,
      soilTempF: high - 12,
    };
  });
  return { source: "fallback", fetchedAt: now.toISOString(), days };
}

/** Test hook. */
export function clearWeatherCache(): void {
  cache.clear();
}
