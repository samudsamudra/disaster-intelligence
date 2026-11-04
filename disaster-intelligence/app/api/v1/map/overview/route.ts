import { unstable_rethrow } from "next/navigation";

import { getMapOverview } from "@/app/_lib/api/map";
import { apiError, apiSuccess } from "@/app/_lib/api/response";

export async function GET() {
  try {
    const overview = await getMapOverview();
    return apiSuccess(overview, { generatedAt: new Date().toISOString(), dataFreshness: overview.freshness });
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof Error && error.message === "DATABASE_URL is not configured.") {
      return apiError("SERVICE_UNAVAILABLE", "Map data is not configured.", 503);
    }

    console.error("Map overview request failed", error);
    return apiError("INTERNAL_ERROR", "Unable to retrieve map overview.", 500);
  }
}
