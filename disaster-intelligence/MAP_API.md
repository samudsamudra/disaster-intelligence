# Map API

The Map API is a server-side, read-only boundary over the canonical `disaster_events` table. It deliberately does not expose ingestion logs, provider payloads, base URLs, internal area boundaries, or raw event details. Route handlers use the server-only Drizzle connection, so existing database RLS remains in effect.

Every response uses this envelope:

```json
{
  "success": true,
  "data": {},
  "meta": { "generatedAt": "2026-11-03T00:00:00.000Z" }
}
```

Error responses set `success` to `false` and provide a stable error code and a safe message. The timestamp and all example payloads in this document are illustrative, not live data.

## `GET /api/v1/map/overview`

Returns aggregate event counts, participating source names/providers, and freshness metadata. With an empty database, all counts are zero, `sources` is empty, and `freshness.hasData` is `false`.

```bash
curl -sS http://localhost:3000/api/v1/map/overview
```

Illustrative response:

```json
{
  "success": true,
  "data": {
    "events": {
      "total": 2,
      "byStatus": { "active": 1, "monitoring": 1, "resolved": 0 },
      "byType": { "earthquake": 1, "flood": 1 }
    },
    "sources": [{ "name": "Illustrative feed", "provider": "Example", "latestEventAt": "2026-11-03T00:00:00.000Z" }],
    "freshness": { "latestEventAt": "2026-11-03T00:00:00.000Z", "latestSourceUpdatedAt": null, "hasData": true }
  },
  "meta": { "generatedAt": "2026-11-03T00:00:00.000Z" }
}
```

## `GET /api/v1/map/events`

Returns a GeoJSON `FeatureCollection` of only events that have a point location. The API exposes an allowlisted set of display fields; it never returns `details`, `sourcePayload`, `externalId`, or database foreign keys.

```bash
curl -sS "http://localhost:3000/api/v1/map/events?type=earthquake,flood&bbox=95,-11,141,6&from=2026-11-01T00:00:00Z&to=2026-11-03T23:59:59Z&limit=100&offset=0"
```

Query parameters:

| Parameter | Format | Default | Rules |
| --- | --- | --- | --- |
| `type` | repeated or comma-separated disaster type | all | One or more of `earthquake`, `flood`, `landslide`, `volcanic_eruption`, `wildfire`, `extreme_weather`, `tsunami`, `other`. |
| `bbox` | `west,south,east,north` | none | WGS 84 bounds, ordered and non-wrapping. |
| `from`, `to` | ISO 8601 date-time | none | `from` must not be after `to`. |
| `limit` | integer | `100` | `0`–`500`. |
| `offset` | integer | `0` | non-negative. |

Illustrative response:

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "id": "illustrative-event-id",
      "geometry": { "type": "Point", "coordinates": [106.8, -6.2] },
      "properties": {
        "id": "illustrative-event-id",
        "type": "flood",
        "title": "Illustrative event only",
        "severity": "high",
        "status": "active",
        "occurredAt": "2026-11-03T00:00:00.000Z",
        "reportedAt": null,
        "source": { "name": "Illustrative feed", "provider": "Example" },
        "sourceUpdatedAt": null
      }
    }]
  },
  "meta": { "generatedAt": "2026-11-03T00:00:00.000Z", "count": 1, "pagination": { "limit": 100, "offset": 0 } }
}
```

## Operational notes

- Database access makes these handlers run at request time; they also send `Cache-Control: no-store` to prioritize current operational data.
- A missing `DATABASE_URL` returns `503 SERVICE_UNAVAILABLE`; an empty database returns `200` with empty results. Neither condition produces demo data.
- Ingestion should normalize verified provider feeds into `data_sources` and `disaster_events`, set `source_updated_at` where available, and store raw payloads only in the existing private `source_payload` column.
