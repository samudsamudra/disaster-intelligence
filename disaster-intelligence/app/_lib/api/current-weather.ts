import "server-only";

export type WeatherForecast = {
  datetime: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedMs: number | null;
  windGustMs: number | null;
  weatherCode: number | null;
  rainMm: number | null;
  rainProbabilityPercent: number | null;
};
export type WeatherData = {
  status: "available" | "empty" | "error";
  source: "Open-Meteo";
  fetchedAt: string | null;
  location: { latitude: number; longitude: number; timezone: string } ;
  current: WeatherForecast | null;
  forecasts: WeatherForecast[];
  rainfall24h: { start: string; end: string; accumulationMm: number | null; probabilityMaxPercent: number | null; completeHours: number };
  daily: { date: string; precipitationMm: number | null; probabilityMaxPercent: number | null }[];
  cache: "miss" | "hit" | "stale";
  stale: boolean;
  error: string | null;
};
const cache = new Map<string, { expires: number; value: WeatherData }>();
const numeric = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const timestamp = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
type Hourly = { time?: number[]; temperature_2m?: (number | null)[]; relative_humidity_2m?: (number | null)[]; wind_speed_10m?: (number | null)[]; wind_gusts_10m?: (number | null)[]; weather_code?: (number | null)[]; precipitation?: (number | null)[]; precipitation_probability?: (number | null)[] };
type Payload = { timezone?: string; current?: { time?: number; temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number; wind_gusts_10m?: number; weather_code?: number }; hourly?: Hourly; daily?: { time?: number[]; precipitation_sum?: (number | null)[]; precipitation_probability_max?: (number | null)[] } };

export function parseOpenMeteo(payload: Payload, lat: number, lon: number, now = Date.now()): WeatherData {
  const start = Math.ceil(now / 3600000) * 3600000;
  const end = start + 24 * 3600000;
  const forecasts = (payload.hourly?.time ?? []).flatMap((time, index) => {
    const datetime = timestamp(time);
    return datetime ? [{ datetime, temperatureC: numeric(payload.hourly?.temperature_2m?.[index]), humidityPercent: numeric(payload.hourly?.relative_humidity_2m?.[index]), windSpeedMs: numeric(payload.hourly?.wind_speed_10m?.[index]), windGustMs: numeric(payload.hourly?.wind_gusts_10m?.[index]), weatherCode: numeric(payload.hourly?.weather_code?.[index]), rainMm: numeric(payload.hourly?.precipitation?.[index]), rainProbabilityPercent: numeric(payload.hourly?.precipitation_probability?.[index]) }] : [];
  });
  if (!forecasts.length || new Set(forecasts.map(item => item.datetime)).size !== forecasts.length) throw new Error("Open-Meteo: deret waktu tidak valid.");
  const window = forecasts.filter(item => Date.parse(item.datetime) > start && Date.parse(item.datetime) <= end);
  const completeHours = window.filter(item => item.rainMm != null).length;
  const probability = window.map(item => item.rainProbabilityPercent);
  const currentTime = timestamp(payload.current?.time);
  const current = currentTime ? { datetime: currentTime, temperatureC: numeric(payload.current?.temperature_2m), humidityPercent: numeric(payload.current?.relative_humidity_2m), windSpeedMs: numeric(payload.current?.wind_speed_10m), windGustMs: numeric(payload.current?.wind_gusts_10m), weatherCode: numeric(payload.current?.weather_code), rainMm: null, rainProbabilityPercent: null } : null;
  return { status: "available", source: "Open-Meteo", fetchedAt: new Date(now).toISOString(), location: { latitude: lat, longitude: lon, timezone: payload.timezone ?? "UTC" }, current, forecasts,
    rainfall24h: { start: new Date(start).toISOString(), end: new Date(end).toISOString(), accumulationMm: window.length === 24 && completeHours === 24 ? window.reduce((total, item) => total + item.rainMm!, 0) : null, probabilityMaxPercent: probability.length === 24 && probability.every(value => value != null) ? Math.max(...probability as number[]) : null, completeHours },
    daily: (payload.daily?.time ?? []).flatMap((time, index) => { const date = timestamp(time); return date ? [{ date, precipitationMm: numeric(payload.daily?.precipitation_sum?.[index]), probabilityMaxPercent: numeric(payload.daily?.precipitation_probability_max?.[index]) }] : []; }),
    cache: "miss", stale: !currentTime || now - Date.parse(currentTime) > 90 * 60000, error: null };
}

export async function getOpenMeteoWeather(lat: number, lon: number, days: number): Promise<WeatherData> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}:${days}`;
  const previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return { ...previous.value, cache: "hit" };
  try {
    const fields = "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code";
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${fields}&hourly=${fields},precipitation,precipitation_probability&daily=precipitation_sum,precipitation_probability_max&wind_speed_unit=ms&timeformat=unixtime&timezone=auto&forecast_days=${Math.max(2, days)}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    console.info(`[climate weather] ${JSON.stringify({ source: "Open-Meteo", http: response.status })}`);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}.`);
    const value = parseOpenMeteo(await response.json(), lat, lon);
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 5 * 60000 });
    return value;
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("Open-Meteo") ? error.message : "Open-Meteo gagal dihubungi atau format respons tidak valid.";
    if (previous && Date.now() - Date.parse(previous.value.fetchedAt!) < 6 * 3600000) return { ...previous.value, cache: "stale", stale: true, error: message };
    const start = Math.ceil(Date.now() / 3600000) * 3600000;
    return { status: "error", source: "Open-Meteo", fetchedAt: null, location: { latitude: lat, longitude: lon, timezone: "UTC" }, current: null, forecasts: [], daily: [], rainfall24h: { start: new Date(start).toISOString(), end: new Date(start + 86400000).toISOString(), accumulationMm: null, probabilityMaxPercent: null, completeHours: 0 }, cache: "miss", stale: false, error: message };
  }
}

