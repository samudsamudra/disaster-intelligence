import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/db";

import type { DisasterType, MapEventsQuery } from "./validation";

type EventRow = {
  id: string;
  type: DisasterType;
  title: string;
  severity: "low" | "moderate" | "high" | "critical";
  status: "active" | "monitoring" | "resolved";
  occurred_at: string | Date;
  reported_at: string | Date | null;
  source_updated_at: string | Date | null;
  source_name: string | null;
  source_provider: string | null;
  geometry: { type: "Point"; coordinates: [number, number] };
};

type OverviewRow = {
  total: number | string;
  active: number | string;
  monitoring: number | string;
  resolved: number | string;
  latest_event_at: string | Date | null;
  latest_source_updated_at: string | Date | null;
};

type TypeCountRow = { type: DisasterType; count: number | string };
type SourceRow = { name: string; provider: string; latest_event_at: string | Date | null };

function toIsoString(value: string | Date | null) {
  if (value === null) return null;
  return new Date(value).toISOString();
}

export async function getMapEvents(query: MapEventsQuery) {
  const conditions = [sql`event.location is not null`];

  if (query.types.length > 0) {
    conditions.push(sql`event.type in (${sql.join(query.types.map((type) => sql`${type}`), sql`, `)})`);
  }
  if (query.from) conditions.push(sql`event.occurred_at >= ${query.from}`);
  if (query.to) conditions.push(sql`event.occurred_at <= ${query.to}`);
  if (query.bbox) {
    const [west, south, east, north] = query.bbox;
    conditions.push(sql`ST_Intersects(event.location, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)::geography)`);
  }

  const rows = await getDb().execute<EventRow>(sql`
    select
      event.id,
      event.type,
      event.title,
      event.severity,
      event.status,
      event.occurred_at,
      event.reported_at,
      event.source_updated_at,
      source.name as source_name,
      source.provider as source_provider,
      ST_AsGeoJSON(event.location::geometry)::json as geometry
    from disaster_events as event
    left join data_sources as source on source.id = event.data_source_id
    where ${sql.join(conditions, sql` and `)}
    order by event.occurred_at desc, event.id asc
    limit ${query.limit} offset ${query.offset}
  `);

  return rows.map((row) => ({
    type: "Feature" as const,
    id: row.id,
    geometry: row.geometry,
    properties: {
      id: row.id,
      type: row.type,
      title: row.title,
      severity: row.severity,
      status: row.status,
      occurredAt: toIsoString(row.occurred_at),
      reportedAt: toIsoString(row.reported_at),
      source: row.source_name && row.source_provider ? { name: row.source_name, provider: row.source_provider } : null,
      sourceUpdatedAt: toIsoString(row.source_updated_at),
    },
  }));
}

export async function getMapOverview() {
  const database = getDb();
  const [totals, byType, sources] = await Promise.all([
    database.execute<OverviewRow>(sql`
      select
        count(*) as total,
        count(*) filter (where status = 'active') as active,
        count(*) filter (where status = 'monitoring') as monitoring,
        count(*) filter (where status = 'resolved') as resolved,
        max(occurred_at) as latest_event_at,
        max(source_updated_at) as latest_source_updated_at
      from disaster_events
    `),
    database.execute<TypeCountRow>(sql`
      select type, count(*) as count
      from disaster_events
      group by type
      order by type asc
    `),
    database.execute<SourceRow>(sql`
      select source.name, source.provider, max(event.occurred_at) as latest_event_at
      from data_sources as source
      inner join disaster_events as event on event.data_source_id = source.id
      group by source.id, source.name, source.provider
      order by source.provider asc, source.name asc
    `),
  ]);

  const summary = totals[0] ?? { total: 0, active: 0, monitoring: 0, resolved: 0, latest_event_at: null, latest_source_updated_at: null };
  return {
    events: {
      total: Number(summary.total),
      byStatus: {
        active: Number(summary.active),
        monitoring: Number(summary.monitoring),
        resolved: Number(summary.resolved),
      },
      byType: Object.fromEntries(byType.map((row) => [row.type, Number(row.count)])),
    },
    sources: sources.map((source) => ({
      name: source.name,
      provider: source.provider,
      latestEventAt: toIsoString(source.latest_event_at),
    })),
    freshness: {
      latestEventAt: toIsoString(summary.latest_event_at),
      latestSourceUpdatedAt: toIsoString(summary.latest_source_updated_at),
      hasData: Number(summary.total) > 0,
    },
  };
}
