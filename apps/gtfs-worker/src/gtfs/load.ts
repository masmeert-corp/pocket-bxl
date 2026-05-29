import { SqlClient } from "@effect/sql";
import { parse as createParser } from "csv-parse";
import { Effect, Option, Schema } from "effect";

import { makeGtfsSchema } from "@pocket-bxl/db/schema/gtfs";
import {
  GtfsEmptyFileError,
  GtfsMissingFileError,
  GtfsParseError,
  gtfsDateToIsoString,
  gtfsTimeToSeconds,
} from "#/gtfs/parse";
import {
  materializeDepartures,
  materializeServiceDays,
  materializeStopPatterns,
} from "#/gtfs/materialize";
import { openFeedZip } from "#/gtfs/zip";
import type { FeedStream } from "#/gtfs/download";
import type { ZipAccessor } from "#/gtfs/zip";
import {
  Agency,
  Calendar,
  CalendarDate,
  Route,
  Shape,
  Stop,
  StopTime,
  Transfer,
  Trip,
} from "#/schemas/gtfs";
import { DrizzleService } from "#/services/drizzle";

const BATCH_SIZE = 250;
const STAGING_SCHEMA = "gtfs_next";
const LIVE_SCHEMA = "gtfs";

type ZipEntry = ReturnType<ZipAccessor["entry"]>;

type DbErrorLike = {
  readonly message?: unknown;
  readonly code?: unknown;
  readonly detail?: unknown;
  readonly hint?: unknown;
  readonly schema?: unknown;
  readonly table?: unknown;
  readonly column?: unknown;
  readonly dataType?: unknown;
  readonly constraint?: unknown;
  readonly cause?: unknown;
};

class GtfsLoadBatchError extends Error {
  readonly file: string;
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly sample: unknown;
  readonly db: Record<string, unknown>;

  constructor(args: {
    readonly file: string;
    readonly rowStart: number;
    readonly rowEnd: number;
    readonly sample: unknown;
    readonly cause: unknown;
  }) {
    const db = summarizeDbError(args.cause);
    super(
      `Failed loading ${args.file} rows ${args.rowStart}-${args.rowEnd}: ${String(
        db.message ?? "database insert failed",
      )}`,
    );
    this.name = "GtfsLoadBatchError";
    this.file = args.file;
    this.rowStart = args.rowStart;
    this.rowEnd = args.rowEnd;
    this.sample = args.sample;
    this.db = db;
  }
}

const summarizeDbError = (cause: unknown): Record<string, unknown> => {
  const db = (typeof cause === "object" && cause !== null ? cause : {}) as DbErrorLike;
  const nested = (typeof db.cause === "object" && db.cause !== null ? db.cause : {}) as DbErrorLike;

  return {
    message: db.message ?? nested.message,
    code: db.code ?? nested.code,
    detail: db.detail ?? nested.detail,
    hint: db.hint ?? nested.hint,
    schema: db.schema ?? nested.schema,
    table: db.table ?? nested.table,
    column: db.column ?? nested.column,
    dataType: db.dataType ?? nested.dataType,
    constraint: db.constraint ?? nested.constraint,
  };
};

const insertBatch = async <TInsert>(
  file: string,
  batch: readonly TInsert[],
  rowStart: number,
  insert: (batch: TInsert[]) => Promise<unknown>,
) => {
  try {
    await insert([...batch]);
  } catch (cause) {
    throw new GtfsLoadBatchError({
      file,
      rowStart,
      rowEnd: rowStart + batch.length - 1,
      sample: batch.slice(0, 3),
      cause,
    });
  }
};

const streamTable = <TInsert>(
  file: string,
  required: boolean,
  entry: ZipEntry,
  keys: readonly string[],
  decodeRecord: (record: Record<string, string>) => TInsert,
  insert: (batch: TInsert[]) => Promise<unknown>,
): Effect.Effect<number, GtfsParseError | GtfsMissingFileError> =>
  Effect.tryPromise({
    try: async () => {
      if (!entry) {
        if (required) throw new GtfsMissingFileError({ file });
        return 0;
      }

      const parser = createParser({
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
      });
      entry.stream().pipe(parser);

      let batch: TInsert[] = [];
      let count = 0;
      let batchStartRow = 1;

      for await (const raw of parser) {
        const record: Record<string, string> = {};
        for (const key of keys) record[key] = (raw as Record<string, string>)[key] ?? "";
        batch.push(decodeRecord(record));
        count++;
        if (batch.length >= BATCH_SIZE) {
          await insertBatch(file, batch, batchStartRow, insert);
          batch = [];
          batchStartRow = count + 1;
        }
      }
      if (batch.length > 0) await insertBatch(file, batch, batchStartRow, insert);
      return count;
    },
    catch: (cause) =>
      cause instanceof GtfsMissingFileError ? cause : new GtfsParseError({ file, cause }),
  });

// ---- Per-table schema decoders + DB shape mappers -------------------------

const decodeAgency = Schema.decodeUnknownSync(Agency);
const toAgencyInsert = (a: Schema.Schema.Type<typeof Agency>) => ({
  agency_id: Option.getOrElse(a.agency_id, () => "default"),
  agency_name: a.agency_name,
  agency_url: a.agency_url,
  agency_timezone: a.agency_timezone,
  agency_lang: Option.getOrNull(a.agency_lang),
  agency_phone: Option.getOrNull(a.agency_phone),
});

const decodeCalendar = Schema.decodeUnknownSync(Calendar);
const toCalendarInsert = (c: Schema.Schema.Type<typeof Calendar>) => ({
  service_id: c.service_id,
  start_date: gtfsDateToIsoString(c.start_date),
  end_date: gtfsDateToIsoString(c.end_date),
  monday: c.monday !== 0,
  tuesday: c.tuesday !== 0,
  wednesday: c.wednesday !== 0,
  thursday: c.thursday !== 0,
  friday: c.friday !== 0,
  saturday: c.saturday !== 0,
  sunday: c.sunday !== 0,
});

const decodeCalendarDate = Schema.decodeUnknownSync(CalendarDate);
const toCalendarDateInsert = (cd: Schema.Schema.Type<typeof CalendarDate>) => ({
  service_id: cd.service_id,
  date: gtfsDateToIsoString(cd.date),
  exception_type: cd.exception_type,
});

const decodeStop = Schema.decodeUnknownSync(Stop);
const toStopInsert = (s: Schema.Schema.Type<typeof Stop>) => ({
  stop_id: s.stop_id,
  stop_name: s.stop_name,
  stop_lat: s.stop_lat,
  stop_lon: s.stop_lon,
  stop_code: Option.getOrNull(s.stop_code),
  stop_desc: Option.getOrNull(s.stop_desc),
  zone_id: Option.getOrNull(s.zone_id),
  stop_url: Option.getOrNull(s.stop_url),
  location_type: s.location_type,
  parent_station: Option.getOrNull(s.parent_station),
});

const decodeRoute = Schema.decodeUnknownSync(Route);
const toRouteInsert = (r: Schema.Schema.Type<typeof Route>) => ({
  route_id: r.route_id,
  agency_id: Option.getOrNull(r.agency_id),
  route_short_name: r.route_short_name,
  route_long_name: r.route_long_name,
  route_type: r.route_type,
  route_desc: Option.getOrNull(r.route_desc),
  route_url: Option.getOrNull(r.route_url),
  route_color: r.route_color,
  route_text_color: r.route_text_color,
});

const decodeTrip = Schema.decodeUnknownSync(Trip);
const toTripInsert = (tr: Schema.Schema.Type<typeof Trip>) => ({
  trip_id: tr.trip_id,
  route_id: tr.route_id,
  service_id: tr.service_id,
  trip_headsign: Option.getOrNull(tr.trip_headsign),
  direction_id: Option.getOrNull(tr.direction_id),
  block_id: Option.getOrNull(tr.block_id),
  shape_id: Option.getOrNull(tr.shape_id),
});

const decodeStopTime = Schema.decodeUnknownSync(StopTime);
const toStopTimeInsert = (st: Schema.Schema.Type<typeof StopTime>) => ({
  trip_id: st.trip_id,
  arrival_time: gtfsTimeToSeconds(st.arrival_time),
  departure_time: gtfsTimeToSeconds(st.departure_time),
  stop_id: st.stop_id,
  stop_sequence: st.stop_sequence,
  pickup_type: st.pickup_type,
  drop_off_type: st.drop_off_type,
  timepoint: st.timepoint,
});

const decodeShape = Schema.decodeUnknownSync(Shape);
const toShapeInsert = (s: Schema.Schema.Type<typeof Shape>) => ({
  shape_id: s.shape_id,
  shape_pt_lat: s.shape_pt_lat,
  shape_pt_lon: s.shape_pt_lon,
  shape_pt_sequence: s.shape_pt_sequence,
  shape_dist_traveled: Option.getOrNull(s.shape_dist_traveled),
});

const decodeTransfer = Schema.decodeUnknownSync(Transfer);
const toTransferInsert = (tr: Schema.Schema.Type<typeof Transfer>) => ({
  from_stop_id: tr.from_stop_id,
  to_stop_id: tr.to_stop_id,
  transfer_type: tr.transfer_type,
  from_route_id: Option.getOrNull(tr.from_route_id),
  to_route_id: Option.getOrNull(tr.to_route_id),
  from_trip_id: Option.getOrNull(tr.from_trip_id),
  to_trip_id: Option.getOrNull(tr.to_trip_id),
  min_transfer_time: Option.getOrNull(tr.min_transfer_time),
});

// ---- Keys (used for missing-column normalization) -------------------------

const agencyKeys = Object.keys(Agency.fields);
const calendarKeys = Object.keys(Calendar.fields);
const calendarDateKeys = Object.keys(CalendarDate.fields);
const stopKeys = Object.keys(Stop.fields);
const routeKeys = Object.keys(Route.fields);
const tripKeys = Object.keys(Trip.fields);
const stopTimeKeys = Object.keys(StopTime.fields);
const shapeKeys = Object.keys(Shape.fields);
const transferKeys = Object.keys(Transfer.fields);

// ---- Staging schema setup -------------------------------------------------

/**
 * Create a fresh gtfs_next schema by cloning the structure of every live
 * gtfs table. Any leftover gtfs_next or gtfs_old schemas from a previous
 * failed run are dropped first so each load starts clean.
 */
const setupStagingSchema = Effect.fn("setupStagingSchema")(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`DROP SCHEMA IF EXISTS gtfs_next CASCADE`;
  yield* sql`DROP SCHEMA IF EXISTS gtfs_old CASCADE`;
  yield* sql`CREATE SCHEMA gtfs_next`;

  const tables = [
    "agency",
    "calendar",
    "calendar_dates",
    "service_days",
    "shapes",
    "stops",
    "routes",
    "stop_patterns",
    "pattern_stops",
    "trips",
    "stop_times",
    "transfers",
    "departures",
  ] as const;

  for (const table of tables) {
    // LIKE copies column defs, defaults, generated expressions, check
    // constraints, and indexes. GTFS tables intentionally do not carry FKs:
    // the feed is the authoritative input and this loader swaps whole schemas.
    yield* sql`
      CREATE UNLOGGED TABLE ${sql.unsafe(`gtfs_next.${table}`)}
        (LIKE ${sql.unsafe(`gtfs.${table}`)}
          INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS INCLUDING INDEXES)
    `;
  }

  yield* Effect.log("Created gtfs_next staging schema");
});

// ---- Atomic schema swap ---------------------------------------------------

/**
 * Rename gtfs → gtfs_old, gtfs_next → gtfs in a single transaction so
 * readers never see a gap. Drops gtfs_old afterwards.
 */
const swapSchemas = Effect.fn("swapSchemas")(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql`ALTER SCHEMA ${sql.unsafe(LIVE_SCHEMA)} RENAME TO gtfs_old`;
      yield* sql`ALTER SCHEMA ${sql.unsafe(STAGING_SCHEMA)} RENAME TO ${sql.unsafe(LIVE_SCHEMA)}`;
    }),
  );

  yield* sql`DROP SCHEMA gtfs_old CASCADE`;
  yield* Effect.log("Swapped gtfs_next → gtfs");
});

// ---- Main load function ---------------------------------------------------

/**
 * Stream the GTFS feed into the database and rebuild all derived tables.
 *
 * Data is loaded into a fresh gtfs_next staging schema, then swapped
 * atomically into the live gtfs schema so API readers never see a partial
 * or empty dataset. The previous live schema is dropped after the swap.
 */
export const loadFeed = Effect.fn("loadFeed")(function* (source: FeedStream) {
  const zip = yield* openFeedZip(source);
  const db = yield* DrizzleService;
  const sql = yield* SqlClient.SqlClient;

  yield* setupStagingSchema();

  // Use staging schema table objects for all Drizzle inserts so they
  // target gtfs_next rather than the live gtfs schema.
  const st = makeGtfsSchema(STAGING_SCHEMA);
  const t = (table: string) => sql.unsafe(`${STAGING_SCHEMA}.${table}`);

  const load = <TInsert>(
    file: string,
    required: boolean,
    keys: readonly string[],
    decodeRecord: (record: Record<string, string>) => TInsert,
    insert: (batch: TInsert[]) => Promise<unknown>,
  ) =>
    streamTable(file, required, zip.entry(file), keys, decodeRecord, insert).pipe(
      Effect.tap((rows) =>
        required && rows === 0
          ? Effect.fail(new GtfsEmptyFileError({ file }))
          : Effect.log(`Loaded ${rows} rows from ${file}`),
      ),
    );

  let totalRows = 0;

  totalRows += yield* load(
    "agency.txt",
    true,
    agencyKeys,
    (r) => toAgencyInsert(decodeAgency(r)),
    (b) => db.insert(st.agency).values(b),
  );
  const calendarRows = yield* load(
    "calendar.txt",
    false,
    calendarKeys,
    (r) => toCalendarInsert(decodeCalendar(r)),
    (b) => db.insert(st.calendar).values(b),
  );
  totalRows += calendarRows;

  const calendarDateRows = yield* load(
    "calendar_dates.txt",
    false,
    calendarDateKeys,
    (r) => toCalendarDateInsert(decodeCalendarDate(r)),
    (b) => db.insert(st.calendarDates).values(b),
  );
  totalRows += calendarDateRows;

  if (calendarRows + calendarDateRows === 0) {
    yield* Effect.fail(new GtfsEmptyFileError({ file: "calendar.txt/calendar_dates.txt" }));
  }

  // Synthesize calendar rows for services defined only in calendar_dates.
  yield* sql`
    INSERT INTO ${t("calendar")} (
      service_id, start_date, end_date,
      monday, tuesday, wednesday, thursday, friday, saturday, sunday
    )
    SELECT cd.service_id, MIN(cd.date), MAX(cd.date),
      false, false, false, false, false, false, false
    FROM ${t("calendar_dates")} cd
    WHERE NOT EXISTS (
      SELECT 1 FROM ${t("calendar")} c WHERE c.service_id = cd.service_id
    )
    GROUP BY cd.service_id
  `;

  totalRows += yield* load(
    "stops.txt",
    true,
    stopKeys,
    (r) => toStopInsert(decodeStop(r)),
    (b) => db.insert(st.stops).values(b),
  );
  totalRows += yield* load(
    "routes.txt",
    true,
    routeKeys,
    (r) => toRouteInsert(decodeRoute(r)),
    (b) => db.insert(st.routes).values(b),
  );
  totalRows += yield* load(
    "trips.txt",
    true,
    tripKeys,
    (r) => toTripInsert(decodeTrip(r)),
    (b) => db.insert(st.trips).values(b),
  );
  totalRows += yield* load(
    "stop_times.txt",
    true,
    stopTimeKeys,
    (r) => toStopTimeInsert(decodeStopTime(r)),
    (b) => db.insert(st.stopTimes).values(b),
  );
  totalRows += yield* load(
    "shapes.txt",
    false,
    shapeKeys,
    (r) => toShapeInsert(decodeShape(r)),
    (b) => db.insert(st.shapes).values(b),
  );
  totalRows += yield* load(
    "transfers.txt",
    false,
    transferKeys,
    (r) => toTransferInsert(decodeTransfer(r)),
    (b) => db.insert(st.transfers).values(b),
  );

  yield* Effect.log(`Loaded ${totalRows} total rows; rebuilding derived tables`);

  yield* materializeStopPatterns(STAGING_SCHEMA);
  yield* materializeServiceDays(STAGING_SCHEMA);
  yield* materializeDepartures(STAGING_SCHEMA);

  yield* swapSchemas();
});
