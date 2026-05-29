import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

import { DepartureWindowDays } from "#/services/env";

export const materializeServiceDays = Effect.fn("materializeServiceDays")(function* (
  schema: string,
) {
  const sql = yield* SqlClient.SqlClient;
  const t = (table: string) => sql.unsafe(`${schema}.${table}`);

  yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`TRUNCATE ${t("service_days")}`;

      yield* sql`
        INSERT INTO ${t("service_days")} (service_id, service_date)
        SELECT c.service_id, g.d::date
        FROM ${t("calendar")} c
        CROSS JOIN LATERAL generate_series(c.start_date, c.end_date, INTERVAL '1 day') AS g(d)
        WHERE CASE EXTRACT(ISODOW FROM g.d)
                WHEN 1 THEN c.monday
                WHEN 2 THEN c.tuesday
                WHEN 3 THEN c.wednesday
                WHEN 4 THEN c.thursday
                WHEN 5 THEN c.friday
                WHEN 6 THEN c.saturday
                WHEN 7 THEN c.sunday
              END
        ON CONFLICT DO NOTHING
      `;

      yield* sql`
        INSERT INTO ${t("service_days")} (service_id, service_date)
        SELECT cd.service_id, cd.date
        FROM ${t("calendar_dates")} cd
        WHERE cd.exception_type = 1
        ON CONFLICT DO NOTHING
      `;

      yield* sql`
        DELETE FROM ${t("service_days")} sd
        USING ${t("calendar_dates")} cd
        WHERE cd.exception_type = 2
          AND sd.service_id = cd.service_id
          AND sd.service_date = cd.date
      `;
    }),
  );

  yield* Effect.log("Materialized gtfs.service_days");
});

export const materializeStopPatterns = Effect.fn("materializeStopPatterns")(function* (
  schema: string,
) {
  const sql = yield* SqlClient.SqlClient;
  const t = (table: string) => sql.unsafe(`${schema}.${table}`);

  yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`DELETE FROM ${t("pattern_stops")}`;
      yield* sql`UPDATE ${t("trips")} SET pattern_id = NULL`;
      yield* sql`DELETE FROM ${t("stop_patterns")}`;

      yield* sql`
        CREATE TEMP TABLE _trip_pattern ON COMMIT DROP AS
        SELECT
          st.trip_id,
          t.route_id,
          t.direction_id,
          t.trip_headsign,
          array_agg(st.stop_id ORDER BY st.stop_sequence) AS stop_ids,
          md5(
            t.route_id || '|' ||
            COALESCE(t.direction_id::text, '') || '|' ||
            string_agg(st.stop_id, '>' ORDER BY st.stop_sequence)
          ) AS pattern_id
        FROM ${t("stop_times")} st
        JOIN ${t("trips")} t ON t.trip_id = st.trip_id
        GROUP BY st.trip_id, t.route_id, t.direction_id, t.trip_headsign
      `;

      yield* sql`
        INSERT INTO ${t("stop_patterns")} (pattern_id, route_id, direction_id, headsign, stop_count)
        SELECT DISTINCT ON (pattern_id)
          pattern_id, route_id, direction_id, trip_headsign, array_length(stop_ids, 1)
        FROM _trip_pattern
        ORDER BY pattern_id
      `;

      yield* sql`
        INSERT INTO ${t("pattern_stops")} (pattern_id, stop_sequence, stop_id)
        SELECT p.pattern_id, u.ord - 1, u.stop_id
        FROM (
          SELECT DISTINCT ON (pattern_id) pattern_id, stop_ids
          FROM _trip_pattern
          ORDER BY pattern_id
        ) p
        CROSS JOIN LATERAL unnest(p.stop_ids) WITH ORDINALITY AS u(stop_id, ord)
      `;

      yield* sql`
        UPDATE ${t("trips")} t
        SET pattern_id = tp.pattern_id
        FROM _trip_pattern tp
        WHERE tp.trip_id = t.trip_id
      `;
    }),
  );

  yield* Effect.log("Materialized gtfs.stop_patterns");
});

export const materializeDepartures = Effect.fn("materializeDepartures")(function* (schema: string) {
  const sql = yield* SqlClient.SqlClient;
  const t = (table: string) => sql.unsafe(`${schema}.${table}`);
  const windowDays = yield* DepartureWindowDays;

  yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`TRUNCATE ${t("departures")}`;

      yield* sql`
        INSERT INTO ${t("departures")} (
          service_date, stop_id, route_id, trip_id, pattern_id, service_id,
          direction_id, headsign, stop_sequence,
          scheduled_arrival_seconds, scheduled_departure_seconds,
          arrival_at, departure_at,
          route_short_name, route_long_name, route_type,
          route_color, route_text_color
        )
        SELECT
          sd.service_date,
          st.stop_id,
          t.route_id,
          t.trip_id,
          t.pattern_id,
          t.service_id,
          t.direction_id,
          t.trip_headsign,
          st.stop_sequence,
          st.arrival_time,
          st.departure_time,
          (sd.service_date::timestamp + st.arrival_time * INTERVAL '1 second')
            AT TIME ZONE COALESCE(a.agency_timezone, da.agency_timezone),
          (sd.service_date::timestamp + st.departure_time * INTERVAL '1 second')
            AT TIME ZONE COALESCE(a.agency_timezone, da.agency_timezone),
          r.route_short_name,
          r.route_long_name,
          r.route_type,
          r.route_color,
          r.route_text_color
        FROM ${t("service_days")} sd
        JOIN ${t("trips")} t ON t.service_id = sd.service_id
        JOIN ${t("stop_times")} st ON st.trip_id = t.trip_id
        JOIN ${t("routes")} r ON r.route_id = t.route_id
        LEFT JOIN ${t("agency")} a ON a.agency_id = r.agency_id
        CROSS JOIN (
          SELECT agency_timezone FROM ${t("agency")} ORDER BY agency_id LIMIT 1
        ) da
        WHERE sd.service_date BETWEEN CURRENT_DATE
                                  AND CURRENT_DATE + ${windowDays}::integer
      `;
    }),
  );

  yield* Effect.log("Materialized gtfs.departures");
});
