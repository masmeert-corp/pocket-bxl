import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Effect, Option } from "effect";

import {
  GtfsEmptyFileError,
  GtfsMissingFileError,
  decodeCsvTable,
  gtfsDateToIsoString,
  gtfsTimeToSeconds,
} from "#/gtfs/parse";
import { Agency, Route, Stop, StopTime } from "#/schemas/gtfs";

describe("gtfsTimeToSeconds", () => {
  it("converts midnight", () => assert.equal(gtfsTimeToSeconds("00:00:00"), 0));
  it("converts a normal morning time", () => assert.equal(gtfsTimeToSeconds("08:30:00"), 30600));
  it("handles past-midnight values (>24h)", () =>
    assert.equal(gtfsTimeToSeconds("25:30:00"), 91800));
  it("handles exactly 24h", () => assert.equal(gtfsTimeToSeconds("24:00:00"), 86400));
});

describe("gtfsDateToIsoString", () => {
  it("converts a January date", () => assert.equal(gtfsDateToIsoString("20260101"), "2026-01-01"));
  it("converts a year-end date", () => assert.equal(gtfsDateToIsoString("20261231"), "2026-12-31"));
});

describe("decodeCsvTable / agency", () => {
  const csv =
    "agency_id,agency_name,agency_url,agency_timezone\n" +
    "STIB,STIB-MIVB,https://stib.be,Europe/Brussels\n";

  it("decodes present rows", async () => {
    const rows = await Effect.runPromise(decodeCsvTable("agency.txt", Agency, csv));
    assert.equal(rows.length, 1);
    assert.equal(Option.getOrNull(rows[0]!.agency_id), "STIB");
  });

  it("treats omitted optional columns as Option.none", async () => {
    const rows = await Effect.runPromise(decodeCsvTable("agency.txt", Agency, csv));
    assert.ok(Option.isNone(rows[0]!.agency_lang));
    assert.ok(Option.isNone(rows[0]!.agency_phone));
  });

  it("yields no rows for an empty string", async () => {
    const rows = await Effect.runPromise(decodeCsvTable("agency.txt", Agency, ""));
    assert.equal(rows.length, 0);
  });
});

describe("decodeCsvTable / stops", () => {
  it("preserves quoted commas in field values", async () => {
    const csv =
      "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\n" +
      '"1","De Brouckère, centre",50.85,4.35,0,\n';
    const rows = await Effect.runPromise(decodeCsvTable("stops.txt", Stop, csv));
    assert.equal(rows[0]!.stop_name, "De Brouckère, centre");
  });
});

describe("decodeCsvTable / routes", () => {
  it("maps GTFS route_type codes to readable values", async () => {
    const csv =
      "route_id,route_short_name,route_long_name,route_type,route_color,route_text_color\n" +
      "1,1,Line One,3,,\n";
    const rows = await Effect.runPromise(decodeCsvTable("routes.txt", Route, csv));
    assert.equal(rows[0]!.route_type, "bus");
  });

  it("applies GTFS color defaults when the cell is empty", async () => {
    const csv =
      "route_id,route_short_name,route_long_name,route_type,route_color,route_text_color\n" +
      "1,1,Line One,1,,\n";
    const rows = await Effect.runPromise(decodeCsvTable("routes.txt", Route, csv));
    assert.equal(rows[0]!.route_color, "#FFFFFF");
    assert.equal(rows[0]!.route_text_color, "#000000");
  });
});

describe("decodeCsvTable / stop_times", () => {
  it("keeps times as raw strings and applies numeric defaults for omitted columns", async () => {
    const csv =
      "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n" + "T1,25:30:00,25:30:00,1,1\n";
    const rows = await Effect.runPromise(decodeCsvTable("stop_times.txt", StopTime, csv));
    const st = rows[0]!;
    // Times stay as strings here, gtfsTimeToSeconds converts them at load.
    assert.equal(st.arrival_time, "25:30:00");
    assert.equal(st.pickup_type, 0);
    assert.equal(st.drop_off_type, 0);
    assert.equal(st.timepoint, 1);
  });
});

describe("GtfsMissingFileError", () => {
  it("is constructible and tagged correctly", () => {
    const err = new GtfsMissingFileError({ file: "agency.txt" });
    assert.equal(err._tag, "GtfsMissingFileError");
    assert.equal(err.file, "agency.txt");
  });
});

describe("GtfsEmptyFileError", () => {
  it("is constructible and tagged correctly", () => {
    const err = new GtfsEmptyFileError({ file: "stops.txt" });
    assert.equal(err._tag, "GtfsEmptyFileError");
    assert.equal(err.file, "stops.txt");
  });
});
