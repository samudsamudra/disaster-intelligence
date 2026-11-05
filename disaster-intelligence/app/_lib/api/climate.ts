import "server-only";
export type { WeatherData } from "./current-weather";
export type Hotspot = { latitude: number; longitude: number; acquiredAt: string; confidence: string | null; satellite: string | null; instrument: string | null; sensor: string; frp: number | null };
export const FIRMS_SENSORS = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"] as const;
export type FirmsSensor = typeof FIRMS_SENSORS[number];
export type HotspotData = {
  status: "available" | "empty" | "error" | "not_configured";
  source: "NASA FIRMS"; sensor: string; bbox: string; confidenceFilter: "all";
  fetchedAt: string | null; latestAcquiredAt: string | null; detections: Hotspot[];
  period: { start: string; end: string; timezone: "UTC" };
  cache: "miss" | "hit"; error: string | null;
};
const bbox = "95,-11,141,6";
const cache = new Map<string, { expires: number; value: HotspotData }>();
function csvRecords(csv: string) {
  const records: string[][] = [];
  let record: string[] = [], field = "", quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { record.push(field.trim()); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index++;
      record.push(field.trim());
      if (record.some(value => value)) records.push(record);
      record = []; field = "";
    } else field += character;
  }
  if (quoted) throw new Error("NASA FIRMS: CSV memiliki kutip tidak tertutup.");
  record.push(field.trim());
  if (record.some(value => value)) records.push(record);
  return records;
}
export function parseFirmsCsv(csv: string, sensor: string, start: number, end: number): Hotspot[] {
  const [headers, ...records] = csvRecords(csv);
  if (!headers || !["latitude", "longitude", "acq_date", "acq_time", "confidence", "satellite"].every(key => headers.includes(key))) throw new Error("NASA FIRMS: respons bukan CSV deteksi valid; periksa key/kuota.");
  return records.map(fields => {
    if (fields.length !== headers.length) throw new Error("NASA FIRMS: jumlah kolom CSV tidak valid.");
    const row = Object.fromEntries(headers.map((key, index) => [key, fields[index]]));
    const latitude = row.latitude ? Number(row.latitude) : NaN;
    const longitude = row.longitude ? Number(row.longitude) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -11 || latitude > 6 || longitude < 95 || longitude > 141) throw new Error("NASA FIRMS: koordinat di luar bbox atau tidak valid.");
    const time = row.acq_time.padStart(4, "0");
    const acquiredAt = `${row.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    const epoch = Date.parse(acquiredAt);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.acq_date) || !/^\d{4}$/.test(time) || Number(time.slice(0, 2)) > 23 || Number(time.slice(2)) > 59 || !Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 10) !== row.acq_date || epoch < start || epoch >= end) throw new Error("NASA FIRMS: waktu di luar periode atau tidak valid.");
    return { latitude, longitude, acquiredAt, confidence: row.confidence || null, satellite: row.satellite || null, instrument: row.instrument || null, sensor, frp: row.frp && Number.isFinite(Number(row.frp)) ? Number(row.frp) : null };
  });
}
async function request(url: string, endpoint: string) {
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    console.info(`[climate FIRMS upstream] ${JSON.stringify({ endpoint, http: response.status, contentType: response.headers.get("content-type"), bytes: new TextEncoder().encode(body).length, durationMs: Date.now() - started })}`);
    if (!response.ok) throw new Error(`NASA FIRMS: ${endpoint} HTTP ${response.status}.`);
    return body;
  } catch (error) {
    if (error instanceof Error && /^NASA FIRMS:/.test(error.message)) throw error;
    throw new Error("NASA FIRMS: jaringan gagal atau batas waktu terlampaui.");
  }
}
export async function getNasaHotspots(days: number, sensor: FirmsSensor = "VIIRS_NOAA20_NRT"): Promise<HotspotData> {
  const today = new Date().toISOString().slice(0, 10);
  const end = Date.parse(today) + 86400000;
  const start = end - days * 86400000;
  const base: HotspotData = { status: "error", source: "NASA FIRMS", sensor, bbox, confidenceFilter: "all", fetchedAt: null, latestAcquiredAt: null, detections: [], period: { start: new Date(start).toISOString(), end: new Date(end).toISOString(), timezone: "UTC" }, cache: "miss", error: null };
  const mapKey = process.env.NASA_FIRMS_MAP_KEY?.trim();
  if (!mapKey) return { ...base, status: "not_configured", error: "Atur NASA_FIRMS_MAP_KEY hanya pada .env.local server, lalu mulai ulang server." };
  const cacheKey = `${sensor}:${days}:${today}`;
  const previous = cache.get(cacheKey);
  if (previous && previous.expires > Date.now()) return { ...previous.value, cache: "hit" };
  try {
    const validation = JSON.parse(await request(`https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=${encodeURIComponent(mapKey)}`, "key-status"));
    if (!Number.isFinite(validation.transaction_limit) || !Number.isFinite(validation.current_transactions) || validation.current_transactions >= validation.transaction_limit) throw new Error("NASA FIRMS: status key/kuota tidak valid atau kuota habis.");
    const detections: Hotspot[] = [];
    for (let offset = 0; offset < days; offset += 5) {
      const count = Math.min(5, days - offset);
      const chunkStart = start + offset * 86400000;
      const chunkEnd = chunkStart + count * 86400000;
      const date = new Date(chunkStart).toISOString().slice(0, 10);
      const csv = await request(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${sensor}/${bbox}/${count}/${date}`, "area-csv");
      const parsed = parseFirmsCsv(csv, sensor, chunkStart, chunkEnd);
      console.info(`[climate FIRMS parse] ${JSON.stringify({ sensor, date, days: count, rows: parsed.length, confidenceFilter: "all", bbox })}`);
      detections.push(...parsed);
    }
    detections.sort((first, second) => second.acquiredAt.localeCompare(first.acquiredAt));
    const value: HotspotData = { ...base, status: detections.length ? "available" : "empty", detections, fetchedAt: new Date().toISOString(), latestAcquiredAt: detections[0]?.acquiredAt ?? null, error: detections.length ? null : "CSV valid tanpa deteksi pada periode ini. Coba 3 hari; data satelit dapat terlambat. SNPP tidak digunakan sebagai sensor default." };
    cache.set(cacheKey, { value, expires: Date.now() + 5 * 60000 });
    return value;
  } catch (error) {
    const value: HotspotData = { ...base, error: error instanceof Error && error.message.startsWith("NASA FIRMS:") ? error.message : "NASA FIRMS: format respons upstream tidak valid." };
    cache.set(cacheKey, { value, expires: Date.now() + 30000 });
    return value;
  }
}


