import { parse as parseCsvSync } from "csv-parse/sync";
import { Data, Effect, Schema } from "effect";

export class GtfsParseError extends Data.TaggedError("GtfsParseError")<{
  readonly file: string;
  readonly cause: unknown;
}> {}

export class GtfsMissingFileError extends Data.TaggedError("GtfsMissingFileError")<{
  readonly file: string;
}> {}

export class GtfsEmptyFileError extends Data.TaggedError("GtfsEmptyFileError")<{
  readonly file: string;
}> {}

/**
 * Convert a GTFS HH:MM:SS time string to integer seconds since the start of
 * the service day. Values may exceed 86400 for trips running past midnight.
 */
export const gtfsTimeToSeconds = (s: string): number => {
  const parts = s.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const sec = Number(parts[2] ?? 0);
  return h * 3600 + m * 60 + sec;
};

/** Convert a GTFS YYYYMMDD date string to an ISO 8601 date string (YYYY-MM-DD). */
export const gtfsDateToIsoString = (s: string): string =>
  `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

/**
 * Parse a GTFS CSV string and decode all rows through `schema`.
 *
 * Columns absent from the file's header are filled with "" before decoding, so
 * a feed that omits an optional column still decodes correctly. An empty string
 * yields no rows.
 *
 * Used in tests; the production path uses the streaming `streamTable` in
 * load.ts instead.
 */
export const decodeCsvTable = <Fields extends Schema.Struct.Fields>(
  file: string,
  schema: Schema.Struct<Fields>,
  content: string,
) =>
  Effect.gen(function* () {
    const keys = Object.keys(schema.fields);
    const rows = yield* Effect.try({
      try: () =>
        parseCsvSync(content, {
          columns: true,
          skip_empty_lines: true,
          bom: true,
          relax_column_count: true,
        }) as ReadonlyArray<Record<string, string>>,
      catch: (cause) => new GtfsParseError({ file, cause }),
    });
    const normalized = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const key of keys) out[key] = row[key] ?? "";
      return out;
    });
    return yield* Schema.decodeUnknown(Schema.Array(schema))(normalized).pipe(
      Effect.mapError((cause) => new GtfsParseError({ file, cause })),
    );
  });
