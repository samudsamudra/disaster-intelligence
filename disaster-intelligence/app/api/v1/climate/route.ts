import { getOpenMeteoWeather } from "@/app/_lib/api/current-weather";
import { FIRMS_SENSORS, getNasaHotspots, type FirmsSensor } from "@/app/_lib/api/climate";
import { apiError, apiSuccess } from "@/app/_lib/api/response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("adm4")) return apiError("BAD_REQUEST", "Cuaca Open-Meteo menggunakan lat dan lon; kode adm4 tidak lagi digunakan pada endpoint climate.", 400);
  const days = Number(url.searchParams.get("days") ?? "3");
  const sensor = url.searchParams.get("sensor") ?? "VIIRS_NOAA20_NRT";
  if (![1, 2, 3, 5, 7, 10].includes(days)) return apiError("BAD_REQUEST", "Periode harus 1, 2, 3, 5, 7, atau 10 hari.", 400);
  if (!FIRMS_SENSORS.includes(sensor as FirmsSensor)) return apiError("BAD_REQUEST", "Sensor VIIRS tidak didukung.", 400);
  const hasCoordinates = url.searchParams.has("lat") || url.searchParams.has("lon");
  const lat = hasCoordinates ? Number(url.searchParams.get("lat")) : -6.176384;
  const lon = hasCoordinates ? Number(url.searchParams.get("lon")) : 106.826707;
  if (hasCoordinates && (!url.searchParams.get("lat")?.trim() || !url.searchParams.get("lon")?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)) return apiError("BAD_REQUEST", "Koordinat tidak valid.", 400);
  const [weather, hotspots] = await Promise.all([getOpenMeteoWeather(lat, lon, days), getNasaHotspots(days, sensor as FirmsSensor)]);
  const availableCount = [weather.status === "available", hotspots.status === "available" || hotspots.status === "empty"].filter(Boolean).length;
  return apiSuccess({ weather, hotspots, locationSelection: { note: hasCoordinates ? "Cuaca pada koordinat pilihan/perangkat. Hotspot mencakup bbox Indonesia, bukan radius perangkat." : "Lokasi contoh Gambir, Jakarta; belum menggunakan lokasi perangkat." }, availability: { status: availableCount === 2 ? "available" : availableCount ? "partial" : "unavailable" } }, { generatedAt: new Date().toISOString() });
}

