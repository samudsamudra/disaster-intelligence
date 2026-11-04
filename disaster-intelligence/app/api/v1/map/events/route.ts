import type { NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";

import { getMapEvents } from "@/app/_lib/api/map";
import { apiError, apiSuccess } from "@/app/_lib/api/response";
import { parseMapEventsQuery, QueryValidationError } from "@/app/_lib/api/validation";

export async function GET(request: NextRequest) {
  try {
    const query = parseMapEventsQuery(request.nextUrl.searchParams);
    const features = await getMapEvents(query);

    return apiSuccess(
      { type: "FeatureCollection", features },
      {
        generatedAt: new Date().toISOString(),
        count: features.length,
        pagination: { limit: query.limit, offset: query.offset },
        dataFreshness: {
          scope: "returned_features",
          latestSourceUpdatedAt: features.reduce<string | null>((latest, feature) => {
            const value = feature.properties.sourceUpdatedAt;
            return value && (!latest || value > latest) ? value : latest;
          }, null),
        },
      },
    );
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof QueryValidationError) {
      return apiError("BAD_REQUEST", error.message, 400, error.details);
    }
    if (error instanceof Error && error.message === "DATABASE_URL is not configured.") {
      return apiError("SERVICE_UNAVAILABLE", "Map data is not configured.", 503);
    }

    console.error("Map events request failed", error);
    return apiError("INTERNAL_ERROR", "Unable to retrieve map events.", 500);
  }
}
