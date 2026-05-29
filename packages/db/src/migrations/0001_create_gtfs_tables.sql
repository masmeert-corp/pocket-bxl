CREATE SCHEMA "gtfs";
--> statement-breakpoint
CREATE TABLE "gtfs"."agency" (
	"agency_id" text PRIMARY KEY NOT NULL,
	"agency_name" text NOT NULL,
	"agency_url" text NOT NULL,
	"agency_timezone" text NOT NULL,
	"agency_lang" text,
	"agency_phone" text
);
--> statement-breakpoint
CREATE TABLE "gtfs"."calendar" (
	"service_id" text PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"monday" boolean NOT NULL,
	"tuesday" boolean NOT NULL,
	"wednesday" boolean NOT NULL,
	"thursday" boolean NOT NULL,
	"friday" boolean NOT NULL,
	"saturday" boolean NOT NULL,
	"sunday" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gtfs"."calendar_dates" (
	"service_id" text NOT NULL,
	"date" date NOT NULL,
	"exception_type" integer NOT NULL,
	CONSTRAINT "calendar_dates_service_id_date_pk" PRIMARY KEY("service_id","date")
);
--> statement-breakpoint
CREATE TABLE "gtfs"."departures" (
	"service_date" date NOT NULL,
	"stop_id" text NOT NULL,
	"route_id" text NOT NULL,
	"trip_id" text NOT NULL,
	"stop_sequence" integer NOT NULL,
	"arrival_seconds" integer NOT NULL,
	"departure_seconds" integer NOT NULL,
	"arrival_at" timestamp with time zone NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"trip_headsign" text,
	"route_short_name" text NOT NULL,
	"direction_id" integer,
	CONSTRAINT "departures_trip_id_service_date_stop_sequence_pk" PRIMARY KEY("trip_id","service_date","stop_sequence")
);
--> statement-breakpoint
CREATE TABLE "gtfs"."routes" (
	"route_id" text PRIMARY KEY NOT NULL,
	"route_short_name" text NOT NULL,
	"route_long_name" text NOT NULL,
	"route_type" integer NOT NULL,
	"agency_id" text,
	"route_desc" text,
	"route_url" text,
	"route_color" text,
	"route_text_color" text
);
--> statement-breakpoint
CREATE TABLE "gtfs"."service_days" (
	"service_id" text NOT NULL,
	"service_date" date NOT NULL,
	CONSTRAINT "service_days_service_id_service_date_pk" PRIMARY KEY("service_id","service_date")
);
--> statement-breakpoint
CREATE TABLE "gtfs"."shapes" (
	"shape_id" text NOT NULL,
	"shape_pt_sequence" integer NOT NULL,
	"shape_pt_lat" double precision NOT NULL,
	"shape_pt_lon" double precision NOT NULL,
	"shape_dist_traveled" double precision,
	CONSTRAINT "shapes_shape_id_shape_pt_sequence_pk" PRIMARY KEY("shape_id","shape_pt_sequence")
);
--> statement-breakpoint
CREATE TABLE "gtfs"."stop_times" (
	"trip_id" text NOT NULL,
	"stop_sequence" integer NOT NULL,
	"arrival_seconds" integer NOT NULL,
	"departure_seconds" integer NOT NULL,
	"stop_id" text NOT NULL,
	"pickup_type" integer DEFAULT 0 NOT NULL,
	"drop_off_type" integer DEFAULT 0 NOT NULL,
	"timepoint" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stop_times_trip_id_stop_sequence_pk" PRIMARY KEY("trip_id","stop_sequence")
);
--> statement-breakpoint
CREATE TABLE "gtfs"."stops" (
	"stop_id" text PRIMARY KEY NOT NULL,
	"stop_name" text NOT NULL,
	"stop_lat" double precision NOT NULL,
	"stop_lon" double precision NOT NULL,
	"stop_geom" geometry(point) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)) STORED,
	"stop_code" text,
	"stop_desc" text,
	"zone_id" text,
	"stop_url" text,
	"location_type" integer DEFAULT 0 NOT NULL,
	"parent_station" text
);
--> statement-breakpoint
CREATE TABLE "gtfs"."transfers" (
	"from_stop_id" text NOT NULL,
	"to_stop_id" text NOT NULL,
	"transfer_type" integer NOT NULL,
	"from_route_id" text,
	"to_route_id" text,
	"from_trip_id" text,
	"to_trip_id" text,
	"min_transfer_time" integer
);
--> statement-breakpoint
CREATE TABLE "gtfs"."trips" (
	"trip_id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"service_id" text NOT NULL,
	"trip_headsign" text,
	"direction_id" integer,
	"block_id" text,
	"shape_id" text
);
--> statement-breakpoint
CREATE INDEX "departures_stop_departure_idx" ON "gtfs"."departures" USING btree ("stop_id","departure_at");--> statement-breakpoint
CREATE INDEX "departures_route_departure_idx" ON "gtfs"."departures" USING btree ("route_id","departure_at");--> statement-breakpoint
CREATE INDEX "routes_agency_idx" ON "gtfs"."routes" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "service_days_date_idx" ON "gtfs"."service_days" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "stop_times_stop_idx" ON "gtfs"."stop_times" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX "stops_geom_gix" ON "gtfs"."stops" USING gist ("stop_geom");--> statement-breakpoint
CREATE INDEX "stops_parent_idx" ON "gtfs"."stops" USING btree ("parent_station");--> statement-breakpoint
CREATE INDEX "transfers_from_stop_idx" ON "gtfs"."transfers" USING btree ("from_stop_id");--> statement-breakpoint
CREATE INDEX "transfers_to_stop_idx" ON "gtfs"."transfers" USING btree ("to_stop_id");--> statement-breakpoint
CREATE INDEX "trips_route_idx" ON "gtfs"."trips" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "trips_service_idx" ON "gtfs"."trips" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "trips_shape_idx" ON "gtfs"."trips" USING btree ("shape_id");