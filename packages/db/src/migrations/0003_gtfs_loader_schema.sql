CREATE TABLE "gtfs"."stop_patterns" (
	"pattern_id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"direction_id" integer,
	"headsign" text,
	"stop_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gtfs"."pattern_stops" (
	"pattern_id" text NOT NULL,
	"stop_sequence" integer NOT NULL,
	"stop_id" text NOT NULL,
	CONSTRAINT "pattern_stops_pattern_id_stop_sequence_pk" PRIMARY KEY("pattern_id","stop_sequence")
);
--> statement-breakpoint
DROP TABLE IF EXISTS "gtfs"."departures";
--> statement-breakpoint
CREATE TABLE "gtfs"."departures" (
	"service_date" date NOT NULL,
	"stop_id" text NOT NULL,
	"route_id" text NOT NULL,
	"trip_id" text NOT NULL,
	"pattern_id" text NOT NULL,
	"service_id" text NOT NULL,
	"direction_id" integer,
	"headsign" text,
	"stop_sequence" integer NOT NULL,
	"scheduled_arrival_seconds" integer NOT NULL,
	"scheduled_departure_seconds" integer NOT NULL,
	"arrival_at" timestamp with time zone NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"route_short_name" text NOT NULL,
	"route_long_name" text NOT NULL,
	"route_type" integer NOT NULL,
	"route_color" text NOT NULL,
	"route_text_color" text NOT NULL,
	CONSTRAINT "departures_service_date_trip_id_stop_sequence_pk" PRIMARY KEY("service_date","trip_id","stop_sequence")
);
--> statement-breakpoint
ALTER TABLE "gtfs"."stop_times" RENAME COLUMN "arrival_seconds" TO "arrival_time";
--> statement-breakpoint
ALTER TABLE "gtfs"."stop_times" RENAME COLUMN "departure_seconds" TO "departure_time";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."stops_geom_gix";
--> statement-breakpoint
ALTER TABLE "gtfs"."stops" DROP COLUMN "stop_geom";
--> statement-breakpoint
ALTER TABLE "gtfs"."stops" ADD COLUMN "geom" geometry(point) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)) STORED;
--> statement-breakpoint
ALTER TABLE "gtfs"."shapes" ADD COLUMN "geom" geometry(point) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(shape_pt_lon, shape_pt_lat), 4326)) STORED;
--> statement-breakpoint
ALTER TABLE "gtfs"."trips" ADD COLUMN "pattern_id" text;
--> statement-breakpoint
ALTER TABLE "gtfs"."agency" ALTER COLUMN "agency_id" SET DEFAULT 'default';
--> statement-breakpoint
UPDATE "gtfs"."routes"
SET "route_color" = '#FFFFFF'
WHERE "route_color" IS NULL OR "route_color" = '';
--> statement-breakpoint
UPDATE "gtfs"."routes"
SET "route_text_color" = '#000000'
WHERE "route_text_color" IS NULL OR "route_text_color" = '';
--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ALTER COLUMN "route_color" SET DEFAULT '#FFFFFF';
--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ALTER COLUMN "route_color" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ALTER COLUMN "route_text_color" SET DEFAULT '#000000';
--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ALTER COLUMN "route_text_color" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "gtfs"."transfers" ALTER COLUMN "transfer_type" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "gtfs"."transfers" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."routes_agency_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."service_days_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."stop_times_stop_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."stops_parent_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."transfers_from_stop_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."transfers_to_stop_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."trips_route_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."trips_service_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "gtfs"."trips_shape_idx";
--> statement-breakpoint
CREATE INDEX "gtfs_pattern_stops_stop_id_idx" ON "gtfs"."pattern_stops" USING btree ("stop_id");
--> statement-breakpoint
CREATE INDEX "gtfs_stop_patterns_route_id_idx" ON "gtfs"."stop_patterns" USING btree ("route_id");
--> statement-breakpoint
CREATE INDEX "gtfs_departures_stop_departure_idx" ON "gtfs"."departures" USING btree ("stop_id","departure_at");
--> statement-breakpoint
CREATE INDEX "gtfs_routes_agency_id_idx" ON "gtfs"."routes" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX "gtfs_service_days_service_date_idx" ON "gtfs"."service_days" USING btree ("service_date");
--> statement-breakpoint
CREATE INDEX "gtfs_shapes_geom_idx" ON "gtfs"."shapes" USING gist ("geom");
--> statement-breakpoint
CREATE INDEX "gtfs_stop_times_stop_id_idx" ON "gtfs"."stop_times" USING btree ("stop_id");
--> statement-breakpoint
CREATE INDEX "gtfs_stops_parent_station_idx" ON "gtfs"."stops" USING btree ("parent_station");
--> statement-breakpoint
CREATE INDEX "gtfs_stops_geom_idx" ON "gtfs"."stops" USING gist ("geom");
--> statement-breakpoint
CREATE INDEX "gtfs_transfers_from_stop_id_idx" ON "gtfs"."transfers" USING btree ("from_stop_id");
--> statement-breakpoint
CREATE INDEX "gtfs_trips_route_id_idx" ON "gtfs"."trips" USING btree ("route_id");
--> statement-breakpoint
CREATE INDEX "gtfs_trips_service_id_idx" ON "gtfs"."trips" USING btree ("service_id");
--> statement-breakpoint
CREATE INDEX "gtfs_trips_shape_id_idx" ON "gtfs"."trips" USING btree ("shape_id");
--> statement-breakpoint
CREATE INDEX "gtfs_trips_pattern_id_idx" ON "gtfs"."trips" USING btree ("pattern_id");
