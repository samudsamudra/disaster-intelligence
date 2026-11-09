import { getLocationName } from "@/app/_lib/api/location-name";
import { apiError, apiSuccess } from "@/app/_lib/api/response";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return apiError("BAD_REQUEST", "Koordinat tidak valid.", 400); }
  if (!payload || typeof payload !== "object") return apiError("BAD_REQUEST", "Koordinat tidak valid.", 400);
  const { lat, lon } = payload as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return apiError("BAD_REQUEST", "Koordinat tidak valid.", 400);
  try {
    const result = await getLocationName(lat, lon);
    if (!result) return apiError("SERVICE_UNAVAILABLE", "Nama wilayah tidak ditemukan untuk lokasi ini.", 404);
    return apiSuccess(result);
  } catch {
    return apiError("SERVICE_UNAVAILABLE", "Nama wilayah belum dapat diperbarui.", 502);
  }
}
