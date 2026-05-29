ALTER TABLE IF EXISTS "gtfs"."agency"
  ALTER COLUMN "agency_id" TYPE text USING "agency_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."calendar"
  ALTER COLUMN "service_id" TYPE text USING "service_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."calendar_dates"
  ALTER COLUMN "service_id" TYPE text USING "service_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."service_days"
  ALTER COLUMN "service_id" TYPE text USING "service_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."shapes"
  ALTER COLUMN "shape_id" TYPE text USING "shape_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."stops"
  ALTER COLUMN "stop_id" TYPE text USING "stop_id"::text,
  ALTER COLUMN "parent_station" TYPE text USING "parent_station"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."routes"
  ALTER COLUMN "route_id" TYPE text USING "route_id"::text,
  ALTER COLUMN "agency_id" TYPE text USING "agency_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."trips"
  ALTER COLUMN "trip_id" TYPE text USING "trip_id"::text,
  ALTER COLUMN "route_id" TYPE text USING "route_id"::text,
  ALTER COLUMN "service_id" TYPE text USING "service_id"::text,
  ALTER COLUMN "block_id" TYPE text USING "block_id"::text,
  ALTER COLUMN "shape_id" TYPE text USING "shape_id"::text,
  ALTER COLUMN "pattern_id" TYPE text USING "pattern_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."stop_times"
  ALTER COLUMN "trip_id" TYPE text USING "trip_id"::text,
  ALTER COLUMN "stop_id" TYPE text USING "stop_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."transfers"
  ALTER COLUMN "from_stop_id" TYPE text USING "from_stop_id"::text,
  ALTER COLUMN "to_stop_id" TYPE text USING "to_stop_id"::text,
  ALTER COLUMN "from_route_id" TYPE text USING "from_route_id"::text,
  ALTER COLUMN "to_route_id" TYPE text USING "to_route_id"::text,
  ALTER COLUMN "from_trip_id" TYPE text USING "from_trip_id"::text,
  ALTER COLUMN "to_trip_id" TYPE text USING "to_trip_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."stop_patterns"
  ALTER COLUMN "pattern_id" TYPE text USING "pattern_id"::text,
  ALTER COLUMN "route_id" TYPE text USING "route_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."pattern_stops"
  ALTER COLUMN "pattern_id" TYPE text USING "pattern_id"::text,
  ALTER COLUMN "stop_id" TYPE text USING "stop_id"::text;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gtfs"."departures"
  ALTER COLUMN "stop_id" TYPE text USING "stop_id"::text,
  ALTER COLUMN "route_id" TYPE text USING "route_id"::text,
  ALTER COLUMN "trip_id" TYPE text USING "trip_id"::text,
  ALTER COLUMN "pattern_id" TYPE text USING "pattern_id"::text,
  ALTER COLUMN "service_id" TYPE text USING "service_id"::text;
