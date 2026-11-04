import { sql } from "drizzle-orm";
import {
  boolean,
  type AnyPgColumn,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const point = customType<{ data: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

const area = customType<{ data: string }>({
  dataType() {
    return "geography(Geometry,4326)";
  },
});

export const disasterType = pgEnum("disaster_type", [
  "earthquake",
  "flood",
  "landslide",
  "volcanic_eruption",
  "wildfire",
  "extreme_weather",
  "tsunami",
  "other",
]);

export const severity = pgEnum("severity", ["low", "moderate", "high", "critical"]);
export const eventStatus = pgEnum("event_status", ["active", "monitoring", "resolved"]);
export const ingestionStatus = pgEnum("ingestion_status", ["running", "succeeded", "failed"]);

export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 128 }).notNull(),
    baseUrl: text("base_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("data_sources_provider_name_key").on(table.provider, table.name)],
);

export const adminAreas = pgTable(
  "admin_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    level: integer("level").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => adminAreas.id, { onDelete: "restrict" }),
    boundary: area("boundary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_areas_parent_id_idx").on(table.parentId),
    index("admin_areas_boundary_gix").using("gist", table.boundary),
  ],
);

export const disasterEvents = pgTable(
  "disaster_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, { onDelete: "restrict" }),
    externalId: varchar("external_id", { length: 256 }),
    type: disasterType("type").notNull(),
    title: text("title").notNull(),
    severity: severity("severity").notNull().default("moderate"),
    status: eventStatus("status").notNull().default("active"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    location: point("location"),
    adminAreaId: uuid("admin_area_id").references(() => adminAreas.id, { onDelete: "set null" }),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    sourcePayload: jsonb("source_payload").notNull().default(sql`'{}'::jsonb`),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("disaster_events_source_external_key")
      .on(table.dataSourceId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("disaster_events_occurred_at_idx").on(table.occurredAt),
    index("disaster_events_type_status_idx").on(table.type, table.status),
    index("disaster_events_data_source_id_idx").on(table.dataSourceId),
    index("disaster_events_admin_area_id_idx").on(table.adminAreaId),
    index("disaster_events_location_gix").using("gist", table.location),
  ],
);

export const officialAlerts = pgTable(
  "official_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    disasterEventId: uuid("disaster_event_id").references(() => disasterEvents.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, { onDelete: "restrict" }),
    externalId: varchar("external_id", { length: 256 }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: severity("severity").notNull().default("moderate"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    sourcePayload: jsonb("source_payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("official_alerts_source_external_key")
      .on(table.dataSourceId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("official_alerts_disaster_event_id_idx").on(table.disasterEventId),
    index("official_alerts_data_source_id_idx").on(table.dataSourceId),
    index("official_alerts_issued_at_idx").on(table.issuedAt),
  ],
);

export const earthquakeEvents = pgTable(
  "earthquake_events",
  {
    disasterEventId: uuid("disaster_event_id")
      .primaryKey()
      .references(() => disasterEvents.id, { onDelete: "cascade" }),
    magnitude: real("magnitude").notNull(),
    depthKm: real("depth_km"),
    feltIntensity: varchar("felt_intensity", { length: 32 }),
    tsunamiPotential: boolean("tsunami_potential").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("earthquake_events_magnitude_idx").on(table.magnitude)],
);

export const weatherObservations = pgTable(
  "weather_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "restrict" }),
    adminAreaId: uuid("admin_area_id").references(() => adminAreas.id, { onDelete: "set null" }),
    location: point("location"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    measurements: jsonb("measurements").notNull().default(sql`'{}'::jsonb`),
    sourcePayload: jsonb("source_payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("weather_observations_source_observed_at_idx").on(table.dataSourceId, table.observedAt),
    index("weather_observations_admin_area_id_idx").on(table.adminAreaId),
    index("weather_observations_location_gix").using("gist", table.location),
  ],
);

export const hotspotEvents = pgTable(
  "hotspot_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    disasterEventId: uuid("disaster_event_id").references(() => disasterEvents.id, { onDelete: "set null" }),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "restrict" }),
    externalId: varchar("external_id", { length: 256 }),
    location: point("location").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    confidence: real("confidence"),
    sourcePayload: jsonb("source_payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("hotspot_events_source_external_key")
      .on(table.dataSourceId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("hotspot_events_disaster_event_id_idx").on(table.disasterEventId),
    index("hotspot_events_data_source_id_idx").on(table.dataSourceId),
    index("hotspot_events_detected_at_idx").on(table.detectedAt),
    index("hotspot_events_location_gix").using("gist", table.location),
  ],
);

export const hazardZones = pgTable(
  "hazard_zones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, { onDelete: "restrict" }),
    type: disasterType("type").notNull(),
    name: text("name").notNull(),
    severity: severity("severity").notNull().default("moderate"),
    boundary: area("boundary").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    sourcePayload: jsonb("source_payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("hazard_zones_type_severity_idx").on(table.type, table.severity),
    index("hazard_zones_data_source_id_idx").on(table.dataSourceId),
    index("hazard_zones_boundary_gix").using("gist", table.boundary),
  ],
);

export const dataIngestionLogs = pgTable(
  "data_ingestion_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dataSourceId: uuid("data_source_id").notNull().references(() => dataSources.id, { onDelete: "restrict" }),
    jobName: varchar("job_name", { length: 128 }).notNull(),
    status: ingestionStatus("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    recordsRead: integer("records_read").notNull().default(0),
    recordsCreated: integer("records_created").notNull().default(0),
    recordsUpdated: integer("records_updated").notNull().default(0),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("data_ingestion_logs_source_started_at_idx").on(table.dataSourceId, table.startedAt),
    index("data_ingestion_logs_status_started_at_idx").on(table.status, table.startedAt),
  ],
);
