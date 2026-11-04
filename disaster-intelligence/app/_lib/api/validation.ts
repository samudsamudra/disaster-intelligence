const DISASTER_TYPES = [
  "earthquake",
  "flood",
  "landslide",
  "volcanic_eruption",
  "wildfire",
  "extreme_weather",
  "tsunami",
  "other",
] as const;

export type DisasterType = (typeof DISASTER_TYPES)[number];

export type MapEventsQuery = {
  types: DisasterType[];
  bbox?: [number, number, number, number];
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
};

export class QueryValidationError extends Error {
  constructor(readonly details: Record<string, string>) {
    super("Invalid query parameters.");
  }
}

function parseIsoDate(value: string | null, key: "from" | "to") {
  if (value === null) return undefined;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new QueryValidationError({ [key]: "Must be an ISO 8601 date-time." });
  }

  return new Date(timestamp);
}

function parseInteger(value: string | null, key: "limit" | "offset", fallback: number, maximum?: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new QueryValidationError({ [key]: "Must be a non-negative integer." });
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (maximum !== undefined && parsed > maximum)) {
    throw new QueryValidationError({ [key]: `Must be at most ${maximum}.` });
  }

  return parsed;
}

function parseBbox(value: string | null) {
  if (value === null) return undefined;

  const coordinates = value.split(",").map(Number);
  if (coordinates.length !== 4 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new QueryValidationError({ bbox: "Must be west,south,east,north using finite numbers." });
  }

  const [west, south, east, north] = coordinates;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new QueryValidationError({ bbox: "Must be ordered west,south,east,north within WGS 84 bounds." });
  }

  return [west, south, east, north] as [number, number, number, number];
}

export function parseMapEventsQuery(searchParams: URLSearchParams): MapEventsQuery {
  const typeValues = searchParams.getAll("type");
  const types = typeValues.flatMap((value) => value.split(",")).filter(Boolean);
  const invalidType = types.find((type) => !DISASTER_TYPES.includes(type as DisasterType));
  if (invalidType) {
    throw new QueryValidationError({ type: `Unsupported event type: ${invalidType}.` });
  }

  const from = parseIsoDate(searchParams.get("from"), "from");
  const to = parseIsoDate(searchParams.get("to"), "to");
  if (from && to && from > to) {
    throw new QueryValidationError({ timeRange: "from must be earlier than or equal to to." });
  }

  return {
    types: [...new Set(types)] as DisasterType[],
    bbox: parseBbox(searchParams.get("bbox")),
    from,
    to,
    limit: parseInteger(searchParams.get("limit"), "limit", 100, 500),
    offset: parseInteger(searchParams.get("offset"), "offset", 0),
  };
}
