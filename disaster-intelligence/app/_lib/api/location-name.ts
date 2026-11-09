import "server-only";

type NominatimAddress = Record<string, unknown>;
type NominatimResponse = { address?: NominatimAddress };
type LocationName = { name: string; source: "OpenStreetMap" };

const cache = new Map<string, { expiresAt: number; value: LocationName | null }>();
const pending = new Map<string, Promise<LocationName | null>>();
let nextRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function placePart(address: NominatimAddress, keys: string[]) {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 100);
  }
  return null;
}

export async function getLocationName(lat: number, lon: number): Promise<LocationName | null> {
  // City-level lookup uses approximate coordinates; exact device coordinates stay on this server.
  const coarseLat = Number(lat.toFixed(2));
  const coarseLon = Number(lon.toFixed(2));
  const key = `${coarseLat},${coarseLon}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const existing = pending.get(key);
  if (existing) return existing;

  const request = queue.then(async () => {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + 1100;
    const url = new URL("reverse", process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org/");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("lat", String(coarseLat));
    url.searchParams.set("lon", String(coarseLon));
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PantauBencana/1.0 (https://github.com/samudsamudra/disaster-intelligence)",
        "Accept-Language": "id",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    const payload = await response.json() as NominatimResponse;
    const address = payload.address;
    if (!address || typeof address !== "object") return null;
    const locality = placePart(address, ["city", "town", "municipality", "county", "city_district", "village", "suburb"]);
    const region = placePart(address, ["state", "region"]);
    if (!locality && !region) return null;
    return { name: `Sekitar ${[locality, region && region !== locality ? region : null].filter(Boolean).join(", ")}`, source: "OpenStreetMap" } satisfies LocationName;
  }).then(value => {
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, value });
    return value;
  });
  queue = request.catch(() => {});
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}
