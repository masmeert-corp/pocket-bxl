import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  geometry,
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const routeTypeValues = [
  "tram",
  "subway",
  "rail",
  "bus",
  "ferry",
  "cable_tram",
  "aerial_lift",
  "funicular",
  "trolleybus",
  "monorail",
] as const;

export type RouteType = (typeof routeTypeValues)[number];

export const routeTypeByGtfsCode: Readonly<Record<number, RouteType>> = {
  0: "tram",
  1: "subway",
  2: "rail",
  3: "bus",
  4: "ferry",
  5: "cable_tram",
  6: "aerial_lift",
  7: "funicular",
  11: "trolleybus",
  12: "monorail",
};

export const gtfsCodeByRouteType: Readonly<Record<RouteType, number>> = {
  tram: 0,
  subway: 1,
  rail: 2,
  bus: 3,
  ferry: 4,
  cable_tram: 5,
  aerial_lift: 6,
  funicular: 7,
  trolleybus: 11,
  monorail: 12,
};

export const routeTypeFromGtfsCode = (code: number): RouteType => {
  const routeType = routeTypeByGtfsCode[Math.trunc(code)];
  if (!routeType) throw new RangeError(`Unsupported GTFS route_type: ${code}`);
  return routeType;
};

const routeTypeCheckSql = () =>
  sql.raw(`"route_type" IN (${routeTypeValues.map((value) => `'${value}'`).join(", ")})`);

export const makeGtfsSchema = (schemaName: string) => {
  const s = pgSchema(schemaName);

  const agency = s.table("agency", {
    agency_id: text().primaryKey().default("default"),
    agency_name: text().notNull(),
    agency_url: text().notNull(),
    agency_timezone: text().notNull(),
    agency_lang: text(),
    agency_phone: text(),
  });

  const calendar = s.table("calendar", {
    service_id: text().primaryKey(),
    start_date: date().notNull(),
    end_date: date().notNull(),
    monday: boolean().notNull(),
    tuesday: boolean().notNull(),
    wednesday: boolean().notNull(),
    thursday: boolean().notNull(),
    friday: boolean().notNull(),
    saturday: boolean().notNull(),
    sunday: boolean().notNull(),
  });

  const calendarDates = s.table(
    "calendar_dates",
    {
      service_id: text().notNull(),
      date: date().notNull(),
      exception_type: integer().notNull(),
    },
    (t) => [primaryKey({ columns: [t.service_id, t.date] })],
  );

  const serviceDays = s.table(
    "service_days",
    {
      service_id: text().notNull(),
      service_date: date().notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.service_id, t.service_date] }),
      index(`${schemaName}_service_days_service_date_idx`).on(t.service_date),
    ],
  );

  const shapes = s.table(
    "shapes",
    {
      shape_id: text().notNull(),
      shape_pt_lat: doublePrecision().notNull(),
      shape_pt_lon: doublePrecision().notNull(),
      shape_pt_sequence: integer().notNull(),
      shape_dist_traveled: doublePrecision(),
      geom: geometry({ type: "point", mode: "xy", srid: 4326 }).generatedAlwaysAs(
        sql`ST_SetSRID(ST_MakePoint(shape_pt_lon, shape_pt_lat), 4326)`,
      ),
    },
    (t) => [
      primaryKey({ columns: [t.shape_id, t.shape_pt_sequence] }),
      index(`${schemaName}_shapes_geom_idx`).using("gist", t.geom),
    ],
  );

  const stops = s.table(
    "stops",
    {
      stop_id: text().primaryKey(),
      stop_name: text().notNull(),
      stop_lat: doublePrecision().notNull(),
      stop_lon: doublePrecision().notNull(),
      geom: geometry({ type: "point", mode: "xy", srid: 4326 }).generatedAlwaysAs(
        sql`ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326)`,
      ),
      stop_code: text(),
      stop_desc: text(),
      zone_id: text(),
      stop_url: text(),
      location_type: integer().notNull().default(0),
      parent_station: text(),
    },
    (t) => [
      index(`${schemaName}_stops_parent_station_idx`).on(t.parent_station),
      index(`${schemaName}_stops_geom_idx`).using("gist", t.geom),
    ],
  );

  const routes = s.table(
    "routes",
    {
      route_id: text().primaryKey(),
      agency_id: text(),
      route_short_name: text().notNull(),
      route_long_name: text().notNull(),
      route_type: text().$type<RouteType>().notNull(),
      route_desc: text(),
      route_url: text(),
      route_color: text().notNull().default("#FFFFFF"),
      route_text_color: text().notNull().default("#000000"),
    },
    (t) => [
      index(`${schemaName}_routes_agency_id_idx`).on(t.agency_id),
      check(`${schemaName}_routes_route_type_check`, routeTypeCheckSql()),
    ],
  );

  const stopPatterns = s.table(
    "stop_patterns",
    {
      pattern_id: text().primaryKey(),
      route_id: text().notNull(),
      direction_id: integer(),
      headsign: text(),
      stop_count: integer().notNull(),
    },
    (t) => [index(`${schemaName}_stop_patterns_route_id_idx`).on(t.route_id)],
  );

  const patternStops = s.table(
    "pattern_stops",
    {
      pattern_id: text().notNull(),
      stop_sequence: integer().notNull(),
      stop_id: text().notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.pattern_id, t.stop_sequence] }),
      index(`${schemaName}_pattern_stops_stop_id_idx`).on(t.stop_id),
    ],
  );

  const trips = s.table(
    "trips",
    {
      trip_id: text().primaryKey(),
      route_id: text().notNull(),
      service_id: text().notNull(),
      trip_headsign: text(),
      direction_id: integer(),
      block_id: text(),
      shape_id: text(),
      pattern_id: text(),
    },
    (t) => [
      index(`${schemaName}_trips_route_id_idx`).on(t.route_id),
      index(`${schemaName}_trips_service_id_idx`).on(t.service_id),
      index(`${schemaName}_trips_shape_id_idx`).on(t.shape_id),
      index(`${schemaName}_trips_pattern_id_idx`).on(t.pattern_id),
      index(`${schemaName}_trips_pattern_shape_id_idx`)
        .on(t.pattern_id, t.shape_id)
        .where(sql`${t.shape_id} IS NOT NULL`),
    ],
  );

  const stopTimes = s.table(
    "stop_times",
    {
      trip_id: text().notNull(),
      arrival_time: integer().notNull(),
      departure_time: integer().notNull(),
      stop_id: text().notNull(),
      stop_sequence: integer().notNull(),
      pickup_type: integer().notNull().default(0),
      drop_off_type: integer().notNull().default(0),
      timepoint: integer().notNull().default(1),
    },
    (t) => [
      primaryKey({ columns: [t.trip_id, t.stop_sequence] }),
      index(`${schemaName}_stop_times_stop_id_idx`).on(t.stop_id),
    ],
  );

  const transfers = s.table(
    "transfers",
    {
      id: serial().primaryKey(),
      from_stop_id: text().notNull(),
      to_stop_id: text().notNull(),
      transfer_type: integer().notNull().default(0),
      from_route_id: text(),
      to_route_id: text(),
      from_trip_id: text(),
      to_trip_id: text(),
      min_transfer_time: integer(),
    },
    (t) => [index(`${schemaName}_transfers_from_stop_id_idx`).on(t.from_stop_id)],
  );

  const departures = s.table(
    "departures",
    {
      service_date: date().notNull(),
      stop_id: text().notNull(),
      route_id: text().notNull(),
      trip_id: text().notNull(),
      pattern_id: text().notNull(),
      service_id: text().notNull(),
      direction_id: integer(),
      headsign: text(),
      stop_sequence: integer().notNull(),
      scheduled_arrival_seconds: integer().notNull(),
      scheduled_departure_seconds: integer().notNull(),
      arrival_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
      departure_at: timestamp({ withTimezone: true, mode: "date" }).notNull(),
      route_short_name: text().notNull(),
      route_long_name: text().notNull(),
      route_type: text().$type<RouteType>().notNull(),
      route_color: text().notNull(),
      route_text_color: text().notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.service_date, t.trip_id, t.stop_sequence] }),
      index(`${schemaName}_departures_stop_departure_idx`).on(t.stop_id, t.departure_at),
      check(`${schemaName}_departures_route_type_check`, routeTypeCheckSql()),
    ],
  );

  return {
    agency,
    calendar,
    calendarDates,
    serviceDays,
    shapes,
    stops,
    routes,
    stopPatterns,
    patternStops,
    trips,
    stopTimes,
    transfers,
    departures,
  };
};

// Named exports from the live schema — used by drizzle-kit migrations and
// by code that doesn't need to target a dynamic schema.
export const {
  agency,
  calendar,
  calendarDates,
  serviceDays,
  shapes,
  stops,
  routes,
  stopPatterns,
  patternStops,
  trips,
  stopTimes,
  transfers,
  departures,
} = makeGtfsSchema("gtfs");
