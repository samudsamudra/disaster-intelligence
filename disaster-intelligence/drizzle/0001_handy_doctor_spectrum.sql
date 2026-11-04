CREATE INDEX "disaster_events_data_source_id_idx" ON "disaster_events" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "hazard_zones_data_source_id_idx" ON "hazard_zones" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "hotspot_events_data_source_id_idx" ON "hotspot_events" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "official_alerts_data_source_id_idx" ON "official_alerts" USING btree ("data_source_id");