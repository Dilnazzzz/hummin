/**
 * Geocoding with OpenStreetMap's Nominatim. Free, no key, 1 request/second,
 * identify yourself with a User-Agent. Fine for development and small launches;
 * swap for a paid provider when volume grows.
 */
const UA = "Hummin/0.1 (local events app; dev)";
const cache = new Map<string, GeoResult | null>();
let lastCall = 0;

export type GeoResult = { lat: number; lng: number; label: string };

async function throttle() {
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

type Bias = { lat: number; lng: number } | null | undefined;

/** Address or place name → coordinates. Returns null when nothing matches. */
export async function geocode(query: string, bias?: Bias): Promise<GeoResult | null> {
  const q = query.trim();
  if (!q) return null;
  const cacheKey = `${q}|${bias ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const params = new URLSearchParams({ q, format: "jsonv2", limit: "1", addressdetails: "0" });
  if (bias) {
    // Prefer results near the user without excluding others.
    const d = 0.5;
    params.set("viewbox", `${bias.lng - d},${bias.lat + d},${bias.lng + d},${bias.lat - d}`);
  }

  try {
    await throttle();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const hit = rows[0];
    const out = hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
    cache.set(cacheKey, out);
    return out;
  } catch (e) {
    console.warn("[geocode] failed:", (e as Error).message);
    return null;
  }
}

/** Coordinates → a short area name like "Menlo Park". */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "10" });
  try {
    await throttle();
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? null;
  } catch {
    return null;
  }
}

/** Miles between two points (haversine). */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
