import { Option, Schema } from "effect";

/** GTFS CSV cells are always present; empty string means absent. */
export const GtfsOptionalString = Schema.transform(
  Schema.String,
  Schema.OptionFromSelf(Schema.String),
  {
    strict: true,
    decode: (s) => (s === "" ? Option.none() : Option.some(s)),
    encode: (o) => Option.getOrElse(o, () => ""),
  },
);

/** GTFS defaults location_type to 0 when omitted or blank. */
export const GtfsLocationType = Schema.transform(Schema.String, Schema.Number, {
  strict: true,
  decode: (s) => (s === "" ? 0 : Number(s)),
  encode: (n) => String(Math.trunc(n)),
});

export const GtfsOptionalNumber = Schema.transform(
  Schema.String,
  Schema.OptionFromSelf(Schema.Number),
  {
    strict: true,
    decode: (s) => (s === "" ? Option.none() : Option.some(Number(s))),
    encode: (o) => Option.match(o, { onNone: () => "", onSome: (n) => String(Math.trunc(n)) }),
  },
);

/** GTFS defaults timepoint to 1 (exact times) when omitted or blank. */
export const GtfsTimepoint = Schema.transform(Schema.String, Schema.Number, {
  strict: true,
  decode: (s) => (s === "" ? 1 : Number(s)),
  encode: (n) => String(Math.trunc(n)),
});

const HEX6 = /^[0-9A-Fa-f]{6}$/;

/**
 * Normalize a GTFS color into a '#RRGGBB' string. Feed values are bare 6-digit
 * hex, usually without a leading '#'. Empty or malformed cells fall back to
 * `fallback`, which carries the GTFS-spec default (white for backgrounds,
 * black for text), so the value is always renderable.
 */
export const GtfsColor = (fallback: string) =>
  Schema.transform(Schema.String, Schema.String, {
    strict: true,
    decode: (s) => {
      const hex = s.trim().replace(/^#/, "").toUpperCase();
      return HEX6.test(hex) ? `#${hex}` : fallback;
    },
    encode: (s) => s.replace(/^#/, ""),
  });

export const Agency = Schema.Struct({
  agency_name: Schema.String,
  agency_url: Schema.String,
  agency_timezone: Schema.String,
  agency_id: GtfsOptionalString,
  agency_lang: GtfsOptionalString,
  agency_phone: GtfsOptionalString,
});

export const Stop = Schema.Struct({
  stop_id: Schema.String,
  stop_name: Schema.String,
  stop_lat: Schema.NumberFromString,
  stop_lon: Schema.NumberFromString,
  stop_code: GtfsOptionalString,
  stop_desc: GtfsOptionalString,
  zone_id: GtfsOptionalString,
  stop_url: GtfsOptionalString,
  location_type: GtfsLocationType,
  parent_station: GtfsOptionalString,
});

export const Route = Schema.Struct({
  route_id: Schema.String,
  route_short_name: Schema.String,
  route_long_name: Schema.String,
  route_type: Schema.NumberFromString,
  agency_id: GtfsOptionalString,
  route_desc: GtfsOptionalString,
  route_url: GtfsOptionalString,
  route_color: GtfsColor("#FFFFFF"),
  route_text_color: GtfsColor("#000000"),
});

export const Trip = Schema.Struct({
  route_id: Schema.String,
  service_id: Schema.String,
  trip_id: Schema.String,
  trip_headsign: GtfsOptionalString,
  direction_id: GtfsOptionalNumber,
  block_id: GtfsOptionalString,
  shape_id: GtfsOptionalString,
});

export const StopTime = Schema.Struct({
  trip_id: Schema.String,
  arrival_time: Schema.String,
  departure_time: Schema.String,
  stop_id: Schema.String,
  stop_sequence: Schema.NumberFromString,
  pickup_type: GtfsLocationType,
  drop_off_type: GtfsLocationType,
  timepoint: GtfsTimepoint,
});

export const Calendar = Schema.Struct({
  service_id: Schema.String,
  start_date: Schema.String,
  end_date: Schema.String,
  monday: Schema.NumberFromString,
  tuesday: Schema.NumberFromString,
  wednesday: Schema.NumberFromString,
  thursday: Schema.NumberFromString,
  friday: Schema.NumberFromString,
  saturday: Schema.NumberFromString,
  sunday: Schema.NumberFromString,
});

/** calendar_dates.txt — service exceptions (1 = added on date, 2 = removed). */
export const CalendarDate = Schema.Struct({
  service_id: Schema.String,
  date: Schema.String,
  exception_type: Schema.NumberFromString,
});

export const Shape = Schema.Struct({
  shape_id: Schema.String,
  shape_pt_lat: Schema.NumberFromString,
  shape_pt_lon: Schema.NumberFromString,
  shape_pt_sequence: Schema.NumberFromString,
  shape_dist_traveled: GtfsOptionalNumber,
});

export const Transfer = Schema.Struct({
  from_stop_id: Schema.String,
  to_stop_id: Schema.String,
  transfer_type: GtfsLocationType,
  from_route_id: GtfsOptionalString,
  to_route_id: GtfsOptionalString,
  from_trip_id: GtfsOptionalString,
  to_trip_id: GtfsOptionalString,
  min_transfer_time: GtfsOptionalNumber,
});
