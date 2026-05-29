DROP INDEX IF EXISTS "gtfs"."stops_geom_gix";--> statement-breakpoint
ALTER TABLE "gtfs"."stops" DROP COLUMN "stop_geom";--> statement-breakpoint
ALTER TABLE "gtfs"."stops" ADD COLUMN "stop_geom" geometry(point) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)) STORED;--> statement-breakpoint
CREATE INDEX "stops_geom_gix" ON "gtfs"."stops" USING gist ("stop_geom");
