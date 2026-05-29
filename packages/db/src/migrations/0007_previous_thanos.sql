ALTER TABLE "gtfs"."departures" ALTER COLUMN "route_type" SET DATA TYPE text USING CASE "route_type"
	WHEN 0 THEN 'tram'
	WHEN 1 THEN 'subway'
	WHEN 2 THEN 'rail'
	WHEN 3 THEN 'bus'
	WHEN 4 THEN 'ferry'
	WHEN 5 THEN 'cable_tram'
	WHEN 6 THEN 'aerial_lift'
	WHEN 7 THEN 'funicular'
	WHEN 11 THEN 'trolleybus'
	WHEN 12 THEN 'monorail'
END;--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ALTER COLUMN "route_type" SET DATA TYPE text USING CASE "route_type"
	WHEN 0 THEN 'tram'
	WHEN 1 THEN 'subway'
	WHEN 2 THEN 'rail'
	WHEN 3 THEN 'bus'
	WHEN 4 THEN 'ferry'
	WHEN 5 THEN 'cable_tram'
	WHEN 6 THEN 'aerial_lift'
	WHEN 7 THEN 'funicular'
	WHEN 11 THEN 'trolleybus'
	WHEN 12 THEN 'monorail'
END;--> statement-breakpoint
ALTER TABLE "gtfs"."departures" ADD CONSTRAINT "gtfs_departures_route_type_check" CHECK ("route_type" IN ('tram', 'subway', 'rail', 'bus', 'ferry', 'cable_tram', 'aerial_lift', 'funicular', 'trolleybus', 'monorail'));--> statement-breakpoint
ALTER TABLE "gtfs"."routes" ADD CONSTRAINT "gtfs_routes_route_type_check" CHECK ("route_type" IN ('tram', 'subway', 'rail', 'bus', 'ferry', 'cable_tram', 'aerial_lift', 'funicular', 'trolleybus', 'monorail'));
