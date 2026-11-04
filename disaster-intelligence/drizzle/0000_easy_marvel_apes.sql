CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."disaster_type" AS ENUM('earthquake', 'flood', 'landslide', 'volcanic_eruption', 'wildfire', 'extreme_weather', 'tsunami', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('active', 'monitoring', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'moderate', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "admin_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(256) NOT NULL,
	"level" integer NOT NULL,
	"parent_id" uuid,
	"boundary" geography(Geometry,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_areas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "data_ingestion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"job_name" varchar(128) NOT NULL,
	"status" "ingestion_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"records_read" integer DEFAULT 0 NOT NULL,
	"records_created" integer DEFAULT 0 NOT NULL,
	"records_updated" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"provider" varchar(128) NOT NULL,
	"base_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disaster_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid,
	"external_id" varchar(256),
	"type" "disaster_type" NOT NULL,
	"title" text NOT NULL,
	"severity" "severity" DEFAULT 'moderate' NOT NULL,
	"status" "event_status" DEFAULT 'active' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reported_at" timestamp with time zone,
	"location" geography(Point,4326),
	"admin_area_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earthquake_events" (
	"disaster_event_id" uuid PRIMARY KEY NOT NULL,
	"magnitude" real NOT NULL,
	"depth_km" real,
	"felt_intensity" varchar(32),
	"tsunami_potential" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hazard_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid,
	"type" "disaster_type" NOT NULL,
	"name" text NOT NULL,
	"severity" "severity" DEFAULT 'moderate' NOT NULL,
	"boundary" geography(Geometry,4326) NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotspot_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disaster_event_id" uuid,
	"data_source_id" uuid NOT NULL,
	"external_id" varchar(256),
	"location" geography(Point,4326) NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"confidence" real,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disaster_event_id" uuid,
	"data_source_id" uuid,
	"external_id" varchar(256),
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" "severity" DEFAULT 'moderate' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"admin_area_id" uuid,
	"location" geography(Point,4326),
	"observed_at" timestamp with time zone NOT NULL,
	"measurements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_areas" ADD CONSTRAINT "admin_areas_parent_id_admin_areas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admin_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_ingestion_logs" ADD CONSTRAINT "data_ingestion_logs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_admin_area_id_admin_areas_id_fk" FOREIGN KEY ("admin_area_id") REFERENCES "public"."admin_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earthquake_events" ADD CONSTRAINT "earthquake_events_disaster_event_id_disaster_events_id_fk" FOREIGN KEY ("disaster_event_id") REFERENCES "public"."disaster_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard_zones" ADD CONSTRAINT "hazard_zones_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_events" ADD CONSTRAINT "hotspot_events_disaster_event_id_disaster_events_id_fk" FOREIGN KEY ("disaster_event_id") REFERENCES "public"."disaster_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_events" ADD CONSTRAINT "hotspot_events_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_alerts" ADD CONSTRAINT "official_alerts_disaster_event_id_disaster_events_id_fk" FOREIGN KEY ("disaster_event_id") REFERENCES "public"."disaster_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_alerts" ADD CONSTRAINT "official_alerts_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_observations" ADD CONSTRAINT "weather_observations_admin_area_id_admin_areas_id_fk" FOREIGN KEY ("admin_area_id") REFERENCES "public"."admin_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_areas_parent_id_idx" ON "admin_areas" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "admin_areas_boundary_gix" ON "admin_areas" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "data_ingestion_logs_source_started_at_idx" ON "data_ingestion_logs" USING btree ("data_source_id","started_at");--> statement-breakpoint
CREATE INDEX "data_ingestion_logs_status_started_at_idx" ON "data_ingestion_logs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "data_sources_provider_name_key" ON "data_sources" USING btree ("provider","name");--> statement-breakpoint
CREATE UNIQUE INDEX "disaster_events_source_external_key" ON "disaster_events" USING btree ("data_source_id","external_id") WHERE "disaster_events"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "disaster_events_occurred_at_idx" ON "disaster_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "disaster_events_type_status_idx" ON "disaster_events" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "disaster_events_admin_area_id_idx" ON "disaster_events" USING btree ("admin_area_id");--> statement-breakpoint
CREATE INDEX "disaster_events_location_gix" ON "disaster_events" USING gist ("location");--> statement-breakpoint
CREATE INDEX "earthquake_events_magnitude_idx" ON "earthquake_events" USING btree ("magnitude");--> statement-breakpoint
CREATE INDEX "hazard_zones_type_severity_idx" ON "hazard_zones" USING btree ("type","severity");--> statement-breakpoint
CREATE INDEX "hazard_zones_boundary_gix" ON "hazard_zones" USING gist ("boundary");--> statement-breakpoint
CREATE UNIQUE INDEX "hotspot_events_source_external_key" ON "hotspot_events" USING btree ("data_source_id","external_id") WHERE "hotspot_events"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "hotspot_events_disaster_event_id_idx" ON "hotspot_events" USING btree ("disaster_event_id");--> statement-breakpoint
CREATE INDEX "hotspot_events_detected_at_idx" ON "hotspot_events" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "hotspot_events_location_gix" ON "hotspot_events" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "official_alerts_source_external_key" ON "official_alerts" USING btree ("data_source_id","external_id") WHERE "official_alerts"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "official_alerts_disaster_event_id_idx" ON "official_alerts" USING btree ("disaster_event_id");--> statement-breakpoint
CREATE INDEX "official_alerts_issued_at_idx" ON "official_alerts" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX "weather_observations_source_observed_at_idx" ON "weather_observations" USING btree ("data_source_id","observed_at");--> statement-breakpoint
CREATE INDEX "weather_observations_admin_area_id_idx" ON "weather_observations" USING btree ("admin_area_id");--> statement-breakpoint
CREATE INDEX "weather_observations_location_gix" ON "weather_observations" USING gist ("location");--> statement-breakpoint
ALTER TABLE "admin_areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data_ingestion_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "disaster_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "earthquake_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hazard_zones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hotspot_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "official_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "weather_observations" ENABLE ROW LEVEL SECURITY;
